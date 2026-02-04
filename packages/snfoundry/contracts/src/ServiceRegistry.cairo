// SPDX-License-Identifier: MIT
// BitZen ServiceRegistry: Auditor hub with staking mechanism for agent discovery

use starknet::ContractAddress;

#[starknet::interface]
pub trait IServiceRegistry<TContractState> {
    // Service registration
    fn register_service(
        ref self: TContractState,
        service_name: felt252,
        service_description: felt252,
        service_endpoint: felt252,
        stake_amount: u256,
    ) -> bool;

    // Auditor staking
    fn stake_as_auditor(ref self: TContractState, service_id: felt252, stake_amount: u256) -> bool;

    fn unstake(ref self: TContractState, service_id: felt252) -> bool;

    // Service discovery
    fn get_service(
        self: @TContractState, service_id: felt252,
    ) -> (ContractAddress, felt252, felt252, u256, u64, bool);

    fn search_services(self: @TContractState, category: felt252, min_stake: u256) -> Array<felt252>;

    // Reputation
    fn submit_review(
        ref self: TContractState, service_id: felt252, rating: u8, review_hash: felt252,
    ) -> bool;

    fn get_reputation(self: @TContractState, service_id: felt252) -> (u256, u64);

    // Admin functions
    fn slash_service(ref self: TContractState, service_id: felt252, reason: felt252) -> bool;
}

#[starknet::contract]
mod ServiceRegistry {
    use core::num::traits::Zero;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{get_block_number, get_caller_address, get_contract_address};
    use super::{ContractAddress, IServiceRegistry};

    #[derive(Drop, Copy, starknet::Store)]
    struct Service {
        provider: ContractAddress,
        name: felt252,
        description: felt252,
        endpoint: felt252,
        total_stake: u256,
        created_at: u64,
        is_active: bool,
        auditor_count: u32,
    }

    #[derive(Drop, Copy, starknet::Store)]
    struct AuditorStake {
        auditor: ContractAddress,
        amount: u256,
        staked_at: u64,
    }

    #[derive(Drop, Copy, starknet::Store)]
    struct Reputation {
        total_rating: u256,
        review_count: u64,
    }

    #[storage]
    struct Storage {
        admin: ContractAddress,
        stake_token: ContractAddress, // STRK token for staking
        min_stake_amount: u256,
        services: Map<felt252, Service>,
        auditor_stakes: Map<(felt252, ContractAddress), AuditorStake>,
        reputations: Map<felt252, Reputation>,
        service_categories: Map<felt252, felt252>, // service_id -> category
        category_services: Map<(felt252, u32), felt252>, // (category, index) -> service_id
        category_counts: Map<felt252, u32>,
        total_services: u32,
        slash_threshold: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ServiceRegistered: ServiceRegistered,
        AuditorStaked: AuditorStaked,
        AuditorUnstaked: AuditorUnstaked,
        ReviewSubmitted: ReviewSubmitted,
        ServiceSlashed: ServiceSlashed,
    }

    #[derive(Drop, starknet::Event)]
    struct ServiceRegistered {
        #[key]
        service_id: felt252,
        #[key]
        provider: ContractAddress,
        name: felt252,
        stake_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct AuditorStaked {
        #[key]
        service_id: felt252,
        #[key]
        auditor: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct AuditorUnstaked {
        #[key]
        service_id: felt252,
        #[key]
        auditor: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct ReviewSubmitted {
        #[key]
        service_id: felt252,
        #[key]
        reviewer: ContractAddress,
        rating: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct ServiceSlashed {
        #[key]
        service_id: felt252,
        slashed_amount: u256,
        reason: felt252,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        stake_token: ContractAddress,
        min_stake_amount: u256,
    ) {
        assert(!admin.is_zero(), 'Admin cannot be zero');
        assert(!stake_token.is_zero(), 'Token cannot be zero');

        // STRK Token Addresses:
        // Sepolia: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
        // Mainnet: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d

        self.admin.write(admin);
        self.stake_token.write(stake_token);
        self.min_stake_amount.write(min_stake_amount);
        self.total_services.write(0);
        self.slash_threshold.write(1000000000000000000_u256); // 1 STRK penalty
    }

    #[abi(embed_v0)]
    impl ServiceRegistryImpl of IServiceRegistry<ContractState> {
        fn register_service(
            ref self: ContractState,
            service_name: felt252,
            service_description: felt252,
            service_endpoint: felt252,
            stake_amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            assert(service_name != 0, 'Invalid service name');
            assert(stake_amount >= self.min_stake_amount.read(), 'Insufficient stake');

            // Generate service ID
            let service_id = self._generate_service_id(caller, service_name);

            // Check if service already exists
            let existing = self.services.entry(service_id).read();
            assert(existing.provider.is_zero(), 'Service already exists');

            // Transfer stake tokens
            let token = IERC20Dispatcher { contract_address: self.stake_token.read() };
            let success = token.transfer_from(caller, get_contract_address(), stake_amount);
            assert(success, 'Stake transfer failed');

            // Register service
            let current_block = get_block_number();
            self
                .services
                .entry(service_id)
                .write(
                    Service {
                        provider: caller,
                        name: service_name,
                        description: service_description,
                        endpoint: service_endpoint,
                        total_stake: stake_amount,
                        created_at: current_block,
                        is_active: true,
                        auditor_count: 0,
                    },
                );

            // Increment total services
            let total = self.total_services.read();
            self.total_services.write(total + 1);

            self
                .emit(
                    ServiceRegistered {
                        service_id, provider: caller, name: service_name, stake_amount,
                    },
                );

            true
        }

        fn stake_as_auditor(
            ref self: ContractState, service_id: felt252, stake_amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            let service = self.services.entry(service_id).read();

            assert(!service.provider.is_zero(), 'Service not found');
            assert(service.is_active, 'Service not active');
            assert(caller != service.provider, 'Cannot audit own service');
            assert(stake_amount >= self.min_stake_amount.read(), 'Insufficient stake');

            // Check if already staked
            let existing_stake = self.auditor_stakes.entry((service_id, caller)).read();
            assert(existing_stake.amount == 0, 'Already staked');

            // Transfer stake tokens
            let token = IERC20Dispatcher { contract_address: self.stake_token.read() };
            let success = token.transfer_from(caller, get_contract_address(), stake_amount);
            assert(success, 'Stake transfer failed');

            // Record stake
            self
                .auditor_stakes
                .entry((service_id, caller))
                .write(
                    AuditorStake {
                        auditor: caller, amount: stake_amount, staked_at: get_block_number(),
                    },
                );

            // Update service total stake - create new struct instance
            let updated_service = Service {
                provider: service.provider,
                name: service.name,
                description: service.description,
                endpoint: service.endpoint,
                total_stake: service.total_stake + stake_amount,
                created_at: service.created_at,
                is_active: service.is_active,
                auditor_count: service.auditor_count + 1,
            };
            self.services.entry(service_id).write(updated_service);

            self.emit(AuditorStaked { service_id, auditor: caller, amount: stake_amount });

            true
        }

        fn unstake(ref self: ContractState, service_id: felt252) -> bool {
            let caller = get_caller_address();
            let stake = self.auditor_stakes.entry((service_id, caller)).read();

            assert(stake.amount > 0, 'No stake found');

            // Transfer stake back
            let token = IERC20Dispatcher { contract_address: self.stake_token.read() };
            let success = token.transfer(caller, stake.amount);
            assert(success, 'Unstake transfer failed');

            // Remove stake
            self
                .auditor_stakes
                .entry((service_id, caller))
                .write(AuditorStake { auditor: caller.into(), amount: 0, staked_at: 0 });

            // Update service total stake - create new struct instance
            let service = self.services.entry(service_id).read();
            let updated_service = Service {
                provider: service.provider,
                name: service.name,
                description: service.description,
                endpoint: service.endpoint,
                total_stake: service.total_stake - stake.amount,
                created_at: service.created_at,
                is_active: service.is_active,
                auditor_count: service.auditor_count - 1,
            };
            self.services.entry(service_id).write(updated_service);

            self.emit(AuditorUnstaked { service_id, auditor: caller, amount: stake.amount });

            true
        }

        fn get_service(
            self: @ContractState, service_id: felt252,
        ) -> (ContractAddress, felt252, felt252, u256, u64, bool) {
            let service = self.services.entry(service_id).read();
            (
                service.provider,
                service.name,
                service.description,
                service.total_stake,
                service.created_at,
                service.is_active,
            )
        }

        fn search_services(
            self: @ContractState, category: felt252, min_stake: u256,
        ) -> Array<felt252> {
            let mut results: Array<felt252> = array![];
            let count = self.category_counts.entry(category).read();

            let mut i = 0;
            loop {
                if i >= count {
                    break;
                }

                let service_id = self.category_services.entry((category, i)).read();
                let service = self.services.entry(service_id).read();

                if service.is_active && service.total_stake >= min_stake {
                    results.append(service_id);
                }

                i += 1;
            }

            results
        }

        fn submit_review(
            ref self: ContractState, service_id: felt252, rating: u8, review_hash: felt252,
        ) -> bool {
            let caller = get_caller_address();
            let service = self.services.entry(service_id).read();

            assert(!service.provider.is_zero(), 'Service not found');
            assert(rating <= 5, 'Invalid rating');

            // Update reputation - create new struct instance
            let reputation = self.reputations.entry(service_id).read();
            let updated_reputation = Reputation {
                total_rating: reputation.total_rating + rating.into(),
                review_count: reputation.review_count + 1,
            };
            self.reputations.entry(service_id).write(updated_reputation);

            self.emit(ReviewSubmitted { service_id, reviewer: caller, rating });

            true
        }

        fn get_reputation(self: @ContractState, service_id: felt252) -> (u256, u64) {
            let reputation = self.reputations.entry(service_id).read();
            (reputation.total_rating, reputation.review_count)
        }

        fn slash_service(ref self: ContractState, service_id: felt252, reason: felt252) -> bool {
            self._assert_only_admin();

            let service = self.services.entry(service_id).read();
            assert(!service.provider.is_zero(), 'Service not found');

            let slash_amount = self.slash_threshold.read();
            assert(service.total_stake >= slash_amount, 'Insufficient stake to slash');

            // Create new struct instance
            let slashed_service = Service {
                provider: service.provider,
                name: service.name,
                description: service.description,
                endpoint: service.endpoint,
                total_stake: service.total_stake - slash_amount,
                created_at: service.created_at,
                is_active: service.is_active,
                auditor_count: service.auditor_count,
            };
            self.services.entry(service_id).write(slashed_service);

            self.emit(ServiceSlashed { service_id, slashed_amount: slash_amount, reason });

            true
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_only_admin(self: @ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Caller is not admin');
        }

        fn _generate_service_id(
            self: @ContractState, provider: ContractAddress, name: felt252,
        ) -> felt252 {
            // Simple service ID generation (provider + name)
            let provider_felt: felt252 = provider.into();
            provider_felt + name
        }
    }
}
