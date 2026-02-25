// SPDX-License-Identifier: MIT
// BitZen ZKPassport: Agent identity verification using Garaga ZK proofs

use starknet::{ClassHash, ContractAddress};

#[starknet::interface]
pub trait IZKPassport<TContractState> {
    // Register agent with ZK proof of identity
    fn register_agent(
        ref self: TContractState,
        agent_address: ContractAddress,
        proof_data: Span<felt252>,
        public_inputs: Span<felt252>,
    ) -> bool;

    // Verify agent's identity proof
    fn verify_agent(self: @TContractState, agent_address: ContractAddress) -> bool;

    // Revoke agent registration
    fn revoke_agent(ref self: TContractState, agent_address: ContractAddress) -> bool;

    // Get agent registration details
    fn get_agent_info(
        self: @TContractState, agent_address: ContractAddress,
    ) -> (bool, u64, felt252);

    // Update verifier address (admin only)
    fn update_verifier(ref self: TContractState, new_verifier: ClassHash) -> bool;
}

#[starknet::contract]
mod ZKPassport {
    use core::num::traits::Zero;
    use core::poseidon::poseidon_hash_span;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ClassHash, get_block_number, get_caller_address, syscalls};
    use super::{ContractAddress, IZKPassport};
    // Garaga's verify_groth16_proof_bn254 is called via library_call_syscall.
    // It returns Result<Span<u256>, felt252> serialized as:
    //   [0, len, u256s...] on success (Ok variant tag = 0)
    //   [1, error_felt252] on failure (Err variant tag = 1)

    #[derive(Drop, starknet::Store)]
    struct AgentCredential {
        agent_address: ContractAddress,
        is_verified: bool,
        registered_at: u64,
        proof_hash: felt252,
        last_verification: u64,
    }

    #[storage]
    struct Storage {
        admin: ContractAddress,
        verifier_class_hash: ClassHash,
        agents: Map<ContractAddress, AgentCredential>,
        total_agents: u64,
        proof_commitments: Map<felt252, bool> // Prevent proof replay
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AgentRegistered: AgentRegistered,
        AgentRevoked: AgentRevoked,
        VerifierUpdated: VerifierUpdated,
        ProofVerified: ProofVerified,
    }

    #[derive(Drop, starknet::Event)]
    struct AgentRegistered {
        #[key]
        agent_address: ContractAddress,
        registered_at: u64,
        proof_hash: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct AgentRevoked {
        #[key]
        agent_address: ContractAddress,
        revoked_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct VerifierUpdated {
        old_verifier: ClassHash,
        new_verifier: ClassHash,
    }

    #[derive(Drop, starknet::Event)]
    struct ProofVerified {
        #[key]
        agent_address: ContractAddress,
        proof_hash: felt252,
        verified_at: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress, verifier_class_hash: felt252) {
        assert(!admin.is_zero(), 'Admin cannot be zero');
        assert(verifier_class_hash != 0, 'Invalid verifier');

        self.admin.write(admin);
        self.verifier_class_hash.write(verifier_class_hash.try_into().unwrap());
        self.total_agents.write(0);
    }

    #[abi(embed_v0)]
    impl ZKPassportImpl of IZKPassport<ContractState> {
        fn register_agent(
            ref self: ContractState,
            agent_address: ContractAddress,
            proof_data: Span<felt252>,
            public_inputs: Span<felt252>,
        ) -> bool {
            assert(!agent_address.is_zero(), 'Invalid agent address');

            let existing_agent = self.agents.entry(agent_address).read();
            assert(!existing_agent.is_verified, 'Agent already registered');

            // Compute proof hash for replay protection
            let proof_hash = self._compute_proof_hash(proof_data, public_inputs);
            assert(!self.proof_commitments.entry(proof_hash).read(), 'Proof already used');

            // Verify ZK proof using Garaga
            let is_valid = self._verify_zk_proof(proof_data, public_inputs);
            assert(is_valid, 'Invalid ZK proof');

            // Register agent
            let current_block = get_block_number();
            self
                .agents
                .entry(agent_address)
                .write(
                    AgentCredential {
                        agent_address,
                        is_verified: true,
                        registered_at: current_block,
                        proof_hash,
                        last_verification: current_block,
                    },
                );

            // Mark proof as used
            self.proof_commitments.entry(proof_hash).write(true);

            // Increment total agents
            let total = self.total_agents.read();
            self.total_agents.write(total + 1);

            self.emit(AgentRegistered { agent_address, registered_at: current_block, proof_hash });

            self.emit(ProofVerified { agent_address, proof_hash, verified_at: current_block });

            true
        }

        fn verify_agent(self: @ContractState, agent_address: ContractAddress) -> bool {
            let agent = self.agents.entry(agent_address).read();
            agent.is_verified
        }

        fn revoke_agent(ref self: ContractState, agent_address: ContractAddress) -> bool {
            self._assert_only_admin();

            let agent = self.agents.entry(agent_address).read();
            assert(agent.is_verified, 'Agent not registered');

            // Create new struct instance instead of mutating
            let revoked_agent = AgentCredential {
                agent_address: agent.agent_address,
                is_verified: false,
                registered_at: agent.registered_at,
                proof_hash: agent.proof_hash,
                last_verification: agent.last_verification,
            };
            self.agents.entry(agent_address).write(revoked_agent);

            let total = self.total_agents.read();
            self.total_agents.write(total - 1);

            self.emit(AgentRevoked { agent_address, revoked_at: get_block_number() });

            true
        }

        fn get_agent_info(
            self: @ContractState, agent_address: ContractAddress,
        ) -> (bool, u64, felt252) {
            let agent = self.agents.entry(agent_address).read();
            (agent.is_verified, agent.registered_at, agent.proof_hash)
        }

        fn update_verifier(ref self: ContractState, new_verifier: ClassHash) -> bool {
            self._assert_only_admin();

            let old_verifier = self.verifier_class_hash.read();

            self.verifier_class_hash.write(new_verifier);

            self.emit(VerifierUpdated { old_verifier, new_verifier });

            true
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_only_admin(self: @ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Caller is not admin');
        }

        fn _verify_zk_proof(
            self: @ContractState, proof_data: Span<felt252>, public_inputs: Span<felt252>,
        ) -> bool {
            // Use Garaga's Groth16 verifier via library call.
            // proof_data is expected to be the full_proof_with_hints array generated
            // by `garaga calldata`. The garaga calldata already includes public inputs
            // internally, so we only pass proof_data to the verifier.
            let verifier_class_hash = self.verifier_class_hash.read();

            // The Garaga verifier takes a single Span<felt252> argument.
            // Cairo's entry point validates ALL calldata is consumed, so we must
            // send ONLY the proof_data (no trailing public_inputs).
            let mut calldata: Array<felt252> = array![];

            calldata.append(proof_data.len().into());
            let mut proof_span = proof_data;
            loop {
                match proof_span.pop_front() {
                    Option::Some(element) => { calldata.append(*element); },
                    Option::None => { break; },
                }
            }

            // library_call_syscall returns SysCallResult<Span<felt252>>.
            // The inner Span<felt252> is the ABI-serialised return of the callee.
            // Real Garaga verifier returns Result<Span<u256>, felt252>:
            //   Success: output[0] == 0  (Cairo enum variant tag for Ok)
            //   Failure: output[0] == 1  (Cairo enum variant tag for Err)
            let result = syscalls::library_call_syscall(
                verifier_class_hash, selector!("verify_groth16_proof_bn254"), calldata.span(),
            );

            match result {
                Result::Ok(output) => {
                    // output[0] == 0 => Result::Ok => proof valid
                    output.len() > 0 && *output.at(0) == 0
                },
                Result::Err(_) => false,
            }
        }

        fn _compute_proof_hash(
            self: @ContractState, proof_data: Span<felt252>, public_inputs: Span<felt252>,
        ) -> felt252 {
            // Compute Poseidon hash over proof_data + public_inputs for replay protection.
            // poseidon_hash_span is the standard Starknet Poseidon hasher.
            let mut elems: Array<felt252> = array![];

            let mut proof_span = proof_data;
            loop {
                match proof_span.pop_front() {
                    Option::Some(element) => { elems.append(*element); },
                    Option::None => { break; },
                }
            }

            let mut inputs_span = public_inputs;
            loop {
                match inputs_span.pop_front() {
                    Option::Some(element) => { elems.append(*element); },
                    Option::None => { break; },
                }
            }

            poseidon_hash_span(elems.span())
        }
    }
}
