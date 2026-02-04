// Mock ERC20 Token for Testing
#[starknet::contract]
mod MockERC20 {
    use openzeppelin::token::erc20::interface::IERC20;
    use starknet::ContractAddress;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, initial_holder: ContractAddress) {
        // Give initial holder a large balance for testing
        self.balances.write(initial_holder, 1000000000000000000000); // 1000 tokens
    }

    #[abi(embed_v0)]
    impl MockERC20Impl of IERC20<ContractState> {
        fn total_supply(self: @ContractState) -> u256 {
            1000000000000000000000
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = starknet::get_caller_address();
            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');

            self.balances.write(sender, sender_balance - amount);
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = starknet::get_caller_address();
            let current_allowance = self.allowances.read((sender, caller));

            // Check allowance
            assert(current_allowance >= amount, 'Insufficient allowance');

            // Check balance
            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');

            // Update allowance
            self.allowances.write((sender, caller), current_allowance - amount);

            // Transfer
            self.balances.write(sender, sender_balance - amount);
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);

            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = starknet::get_caller_address();
            self.allowances.write((caller, spender), amount);
            true
        }
    }
}
