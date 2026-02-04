// Mock Garaga Verifier for Testing
// This is a simplified version that always returns true for valid-looking inputs

#[starknet::interface]
pub trait IMockGaragaVerifier<TContractState> {
    fn verify_groth16_proof_bn254(
        self: @TContractState, proof_data: Span<felt252>, public_inputs: Span<felt252>,
    ) -> Span<felt252>;
}

#[starknet::contract]
mod MockGaragaVerifier {
    use super::IMockGaragaVerifier;

    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl MockGaragaVerifierImpl of IMockGaragaVerifier<ContractState> {
        fn verify_groth16_proof_bn254(
            self: @ContractState, proof_data: Span<felt252>, public_inputs: Span<felt252>,
        ) -> Span<felt252> {
            // Simple validation: proof should have at least 8 elements (a, b, c components)
            // and public inputs should exist
            let proof_len = proof_data.len();
            let inputs_len = public_inputs.len();

            // Basic sanity checks - return non-empty span if invalid
            if proof_len < 8 {
                return array![1].span(); // Non-empty = failure
            }

            if inputs_len == 0 {
                return array![1].span(); // Non-empty = failure
            }

            // For testing, we accept the proof as valid - return empty span
            array![].span()
        }
    }
}
