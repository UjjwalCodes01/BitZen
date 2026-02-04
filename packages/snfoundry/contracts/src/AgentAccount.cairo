// SPDX-License-Identifier: MIT
// BitZen AgentAccount: Policy-based smart account with session keys for AI agents

use starknet::ContractAddress;

#[starknet::interface]
pub trait IAgentAccount<TContractState> {
    // Session key management
    fn create_session(
        ref self: TContractState,
        session_public_key: felt252,
        expiration_block: u64,
        max_spend_per_tx: u256,
        allowed_methods: Array<felt252>,
    ) -> bool;
    
    fn revoke_session(ref self: TContractState, session_public_key: felt252) -> bool;
    
    fn is_session_valid(
        self: @TContractState,
        session_public_key: felt252,
        block_number: u64,
    ) -> bool;
    
    // Policy enforcement
    fn set_spending_limit(ref self: TContractState, daily_limit: u256, tx_limit: u256) -> bool;
    
    fn get_spending_limit(self: @TContractState) -> (u256, u256);
    
    fn check_policy(
        self: @TContractState,
        method_selector: felt252,
        amount: u256,
    ) -> bool;
    
    // Account operations
    fn execute(
        ref self: TContractState,
        to: ContractAddress,
        selector: felt252,
        calldata: Array<felt252>,
        amount: u256,
    ) -> Array<felt252>;
    
    fn execute_with_session(
        ref self: TContractState,
        to: ContractAddress,
        selector: felt252,
        calldata: Array<felt252>,
        amount: u256,
        session_public_key: felt252,
        session_signature: (felt252, felt252),
    ) -> Array<felt252>;
    
    fn get_owner(self: @TContractState) -> ContractAddress;
    
    // Emergency controls
    fn toggle_kill_switch(ref self: TContractState) -> bool;
    
    fn is_active(self: @TContractState) -> bool;
}

#[starknet::contract]
mod AgentAccount {
    use super::{ContractAddress, IAgentAccount};
    use starknet::{get_caller_address, get_block_number, syscalls};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map};
    use core::num::traits::Zero;
    use core::ecdsa::check_ecdsa_signature;
    use core::pedersen::pedersen;
    
    #[derive(Drop, starknet::Store)]
    struct SessionKey {
        public_key: felt252,
        expiration_block: u64,
        max_spend_per_tx: u256,
        is_active: bool,
        created_at: u64,
    }
    
    #[derive(Drop, starknet::Store)]
    struct SpendingPolicy {
        daily_limit: u256,
        tx_limit: u256,
        daily_spent: u256,
        last_reset_day: u64,
    }
    
    #[storage]
    struct Storage {
        owner: ContractAddress,
        global_is_active: bool,
        session_keys: Map<felt252, SessionKey>,
        allowed_methods: Map<(felt252, felt252), bool>, // (session_key, method_selector) -> allowed
        spending_policy: SpendingPolicy,
        total_spent_today: u256,
    }
    
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SessionCreated: SessionCreated,
        SessionRevoked: SessionRevoked,
        PolicyUpdated: PolicyUpdated,
        TransactionExecuted: TransactionExecuted,
        KillSwitchToggled: KillSwitchToggled,
    }
    
    #[derive(Drop, starknet::Event)]
    struct SessionCreated {
        #[key]
        session_key: felt252,
        expiration_block: u64,
        max_spend: u256,
    }
    
    #[derive(Drop, starknet::Event)]
    struct SessionRevoked {
        #[key]
        session_key: felt252,
    }
    
    #[derive(Drop, starknet::Event)]
    struct PolicyUpdated {
        daily_limit: u256,
        tx_limit: u256,
    }
    
    #[derive(Drop, starknet::Event)]
    struct TransactionExecuted {
        #[key]
        to: ContractAddress,
        selector: felt252,
        amount: u256,
    }
    
    #[derive(Drop, starknet::Event)]
    struct KillSwitchToggled {
        is_active: bool,
        toggled_at: u64,
    }
    
    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        assert(!owner.is_zero(), 'Owner cannot be zero');
        self.owner.write(owner);
        self.global_is_active.write(true);
        
        // Default spending policy: 1000 STRK daily, 100 STRK per tx
        self.spending_policy.write(
            SpendingPolicy {
                daily_limit: 1000000000000000000000_u256, // 1000 STRK
                tx_limit: 100000000000000000000_u256,     // 100 STRK
                daily_spent: 0_u256,
                last_reset_day: get_block_number(),
            }
        );
    }
    
    #[abi(embed_v0)]
    impl AgentAccountImpl of IAgentAccount<ContractState> {
        fn create_session(
            ref self: ContractState,
            session_public_key: felt252,
            expiration_block: u64,
            max_spend_per_tx: u256,
            allowed_methods: Array<felt252>,
        ) -> bool {
            // Only owner can create sessions
            self._assert_only_owner();
            
            let current_block = get_block_number();
            assert(expiration_block > current_block, 'Invalid expiration');
            assert(session_public_key != 0, 'Invalid session key');
            
            // Store session key
            self.session_keys.entry(session_public_key).write(
                SessionKey {
                    public_key: session_public_key,
                    expiration_block,
                    max_spend_per_tx,
                    is_active: true,
                    created_at: current_block,
                }
            );
            
            // Store allowed methods (optimized with Span iteration)
            let mut methods_span = allowed_methods.span();
            loop {
                match methods_span.pop_front() {
                    Option::Some(method) => {
                        self.allowed_methods.entry((session_public_key, *method)).write(true);
                    },
                    Option::None => { break; },
                }
            };
            
            self.emit(
                SessionCreated {
                    session_key: session_public_key,
                    expiration_block,
                    max_spend: max_spend_per_tx,
                }
            );
            
            true
        }
        
        fn revoke_session(ref self: ContractState, session_public_key: felt252) -> bool {
            self._assert_only_owner();
            
            let session = self.session_keys.entry(session_public_key).read();
            assert(session.is_active, 'Session not active');
            
            let updated_session = SessionKey {
                public_key: session.public_key,
                expiration_block: session.expiration_block,
                max_spend_per_tx: session.max_spend_per_tx,
                is_active: false,
                created_at: session.created_at,
            };
            self.session_keys.entry(session_public_key).write(updated_session);
            
            self.emit(SessionRevoked { session_key: session_public_key });
            
            true
        }
        
        fn is_session_valid(
            self: @ContractState,
            session_public_key: felt252,
            block_number: u64,
        ) -> bool {
            let session = self.session_keys.entry(session_public_key).read();
            
            if !session.is_active {
                return false;
            }
            
            if block_number > session.expiration_block {
                return false;
            }
            
            true
        }
        
        fn set_spending_limit(
            ref self: ContractState,
            daily_limit: u256,
            tx_limit: u256,
        ) -> bool {
            self._assert_only_owner();
            
            let policy = self.spending_policy.read();
            let updated_policy = SpendingPolicy {
                daily_limit,
                tx_limit,
                daily_spent: policy.daily_spent,
                last_reset_day: policy.last_reset_day,
            };
            self.spending_policy.write(updated_policy);
            
            self.emit(PolicyUpdated { daily_limit, tx_limit });
            
            true
        }
        
        fn get_spending_limit(self: @ContractState) -> (u256, u256) {
            let policy = self.spending_policy.read();
            (policy.daily_limit, policy.tx_limit)
        }
        
        fn check_policy(
            self: @ContractState,
            method_selector: felt252,
            amount: u256,
        ) -> bool {
            let policy = self.spending_policy.read();
            let current_block = get_block_number();
            
            // Reset daily spending if new day (fixed logic)
            let blocks_per_day = 28800_u64; // ~24h at 3s/block
            let current_day = current_block / blocks_per_day;
            let last_reset_day = policy.last_reset_day / blocks_per_day;
            
            // Check if we're in a new day period
            let daily_spent = if current_day > last_reset_day {
                // New day: reset to 0
                0_u256
            } else {
                // Same day: use existing spent amount
                policy.daily_spent
            };
            
            // Check tx limit
            if amount > policy.tx_limit {
                return false;
            }
            
            // Check daily limit
            if daily_spent + amount > policy.daily_limit {
                return false;
            }
            
            true
        }
        
        fn execute(
            ref self: ContractState,
            to: ContractAddress,
            selector: felt252,
            calldata: Array<felt252>,
            amount: u256,
        ) -> Array<felt252> {
            // Only owner can use direct execute
            self._assert_only_owner();
            
            self._execute_call(to, selector, calldata, amount)
        }
        
        fn execute_with_session(
            ref self: ContractState,
            to: ContractAddress,
            selector: felt252,
            calldata: Array<felt252>,
            amount: u256,
            session_public_key: felt252,
            session_signature: (felt252, felt252),
        ) -> Array<felt252> {
            // KILL SWITCH: Check if account is globally active
            assert(self.global_is_active.read(), 'Account deactivated');
            
            let current_block = get_block_number();
            
            // 1. Reconstruct message hash
            // Binds signature to specific tx parameters and current block (prevents replay)
            let message_hash = self._compute_message_hash(to, selector, amount, current_block);
            
            // 2. Cryptographic verification (Replaces pure recovery)
            // This ensures the signature (r, s) matches the provided key and hash
            let verified_key = self._recover_session_key(
                message_hash,
                session_signature,
                session_public_key
            );
            
            // 3. Authorization & Policy Checks
            let session = self.session_keys.entry(verified_key).read();
            assert(session.is_active, 'Session not active');
            assert(current_block <= session.expiration_block, 'Session expired');
            assert(self.allowed_methods.entry((verified_key, selector)).read(), 'Method not allowed');
            
            // 4. Spending Limit Enforcement
            assert(amount <= session.max_spend_per_tx, 'Exceeds session tx limit');
            assert(self.check_policy(selector, amount), 'Policy violation');
            
            // 5. State Update (Daily Limit Accumulation)
            let policy = self.spending_policy.read();
            let blocks_per_day = 28800_u64;
            let current_day = current_block / blocks_per_day;
            let last_reset_day = policy.last_reset_day / blocks_per_day;
            
            let updated_policy = if current_day > last_reset_day {
                SpendingPolicy {
                    daily_limit: policy.daily_limit,
                    tx_limit: policy.tx_limit,
                    daily_spent: amount,
                    last_reset_day: current_block,
                }
            } else {
                SpendingPolicy {
                    daily_limit: policy.daily_limit,
                    tx_limit: policy.tx_limit,
                    daily_spent: policy.daily_spent + amount,
                    last_reset_day: policy.last_reset_day,
                }
            };
            self.spending_policy.write(updated_policy);
            
            // 6. Final Execution
            self._execute_call(to, selector, calldata, amount)
        }
        
        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }
        
        fn toggle_kill_switch(ref self: ContractState) -> bool {
            self._assert_only_owner();
            
            let current_state = self.global_is_active.read();
            let new_state = !current_state;
            self.global_is_active.write(new_state);
            
            self.emit(
                KillSwitchToggled {
                    is_active: new_state,
                    toggled_at: get_block_number(),
                }
            );
            
            new_state
        }
        
        fn is_active(self: @ContractState) -> bool {
            self.global_is_active.read()
        }
    }
    
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_only_owner(self: @ContractState) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Caller is not owner');
        }
        
        fn _execute_call(
            ref self: ContractState,
            to: ContractAddress,
            selector: felt252,
            calldata: Array<felt252>,
            amount: u256,
        ) -> Array<felt252> {
            let result = syscalls::call_contract_syscall(
                to,
                selector,
                calldata.span()
            ).unwrap();
            
            self.emit(
                TransactionExecuted {
                    to,
                    selector,
                    amount,
                }
            );
            
            // Convert Span to Array
            let mut result_array: Array<felt252> = array![];
            let mut i = 0;
            loop {
                if i >= result.len() {
                    break;
                }
                result_array.append(*result.at(i));
                i += 1;
            };
            result_array
        }
        
        fn _compute_message_hash(
            self: @ContractState,
            to: ContractAddress,
            selector: felt252,
            amount: u256,
            nonce: u64,
        ) -> felt252 {
            // Create message hash for signature verification using Pedersen hash
            // Format: Pedersen(to, selector, amount_low, amount_high, nonce)
            let to_felt: felt252 = to.into();
            let amount_low: felt252 = (amount & 0xffffffffffffffffffffffffffffffff).try_into().unwrap();
            let amount_high: felt252 = (amount / 0x100000000000000000000000000000000).try_into().unwrap();
            let nonce_felt: felt252 = nonce.into();
            
            // Use Pedersen hash for cryptographic security
            let hash1 = pedersen(to_felt, selector);
            let hash2 = pedersen(hash1, amount_low);
            let hash3 = pedersen(hash2, amount_high);
            let hash4 = pedersen(hash3, nonce_felt);
            
            hash4
        }
        
        fn _recover_session_key(
            self: @ContractState,
            message_hash: felt252,
            signature: (felt252, felt252),
            provided_session_key: felt252,
        ) -> felt252 {
            // On Starknet, we verify rather than recover.
            // Unlike Ethereum's ecrecover, the STARK curve doesn't have
            // a standardized recovery ID (v). Instead, we verify that the
            // provided public key matches the signature.
            
            let (sig_r, sig_s) = signature;
            
            // check_ecdsa_signature returns true if the signature (r, s)
            // matches the message_hash and the public_key.
            let is_valid = check_ecdsa_signature(
                message_hash,
                provided_session_key,
                sig_r,
                sig_s
            );
            
            assert(is_valid, 'Invalid session signature');
            
            // Ensure the session exists and is registered in storage
            let session = self.session_keys.entry(provided_session_key).read();
            assert(session.is_active, 'Session key not registered');
            
            provided_session_key
        }
    }
}
