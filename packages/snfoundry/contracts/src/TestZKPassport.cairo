// Test-only version of ZKPassport that uses contract calls instead of library calls
#[starknet::contract]
mod TestZKPassport {
    use contracts::MockGaragaVerifier::{
        IMockGaragaVerifierDispatcher, IMockGaragaVerifierDispatcherTrait,
    };
    use core::num::traits::Zero;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ClassHash, ContractAddress, get_block_number, get_caller_address};

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
        verifier_address: ContractAddress,
        agents: Map<ContractAddress, AgentCredential>,
        total_agents: u64,
        proof_commitments: Map<felt252, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AgentRegistered: AgentRegistered,
        AgentRevoked: AgentRevoked,
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
    struct ProofVerified {
        #[key]
        agent_address: ContractAddress,
        proof_hash: felt252,
        verified_at: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, admin: ContractAddress, verifier_address: ContractAddress,
    ) {
        assert(!admin.is_zero(), 'Admin cannot be zero');
        assert(!verifier_address.is_zero(), 'Invalid verifier');

        self.admin.write(admin);
        self.verifier_address.write(verifier_address);
        self.total_agents.write(0);
    }

    #[abi(embed_v0)]
    impl TestZKPassportImpl of contracts::ZKPassport::IZKPassport<ContractState> {
        fn register_agent(
            ref self: ContractState,
            agent_address: ContractAddress,
            proof_data: Span<felt252>,
            public_inputs: Span<felt252>,
        ) -> bool {
            assert(!agent_address.is_zero(), 'Invalid agent address');

            let existing_agent = self.agents.entry(agent_address).read();
            assert(!existing_agent.is_verified, 'Agent already registered');

            let proof_hash = self._compute_proof_hash(proof_data, public_inputs);
            assert(!self.proof_commitments.entry(proof_hash).read(), 'Proof already used');

            let is_valid = self._verify_zk_proof_contract(proof_data, public_inputs);
            assert(is_valid, 'Invalid ZK proof');

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

            self.proof_commitments.entry(proof_hash).write(true);
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

            let mut agent = self.agents.entry(agent_address).read();
            assert(agent.is_verified, 'Agent not verified');

            agent.is_verified = false;
            self.agents.entry(agent_address).write(agent);

            let current_block = get_block_number();
            self.emit(AgentRevoked { agent_address, revoked_at: current_block });

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
            // Note: TestZKPassport uses contract address not class hash
            // This function matches interface but does nothing in tests
            true
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_only_admin(self: @ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Caller is not admin');
        }

        fn _verify_zk_proof_contract(
            self: @ContractState, proof_data: Span<felt252>, public_inputs: Span<felt252>,
        ) -> bool {
            let verifier_address = self.verifier_address.read();
            let verifier = IMockGaragaVerifierDispatcher { contract_address: verifier_address };

            let result = verifier.verify_groth16_proof_bn254(proof_data, public_inputs);
            result.len() == 0
        }

        fn _compute_proof_hash(
            self: @ContractState, proof_data: Span<felt252>, public_inputs: Span<felt252>,
        ) -> felt252 {
            let mut hash: felt252 = 0;

            let mut proof_span = proof_data;
            loop {
                match proof_span.pop_front() {
                    Option::Some(element) => { hash = hash + *element; },
                    Option::None => { break; },
                }
            }

            let mut inputs_span = public_inputs;
            loop {
                match inputs_span.pop_front() {
                    Option::Some(element) => { hash = hash + *element; },
                    Option::None => { break; },
                }
            }

            hash
        }
    }
}
