use starknet::{ContractAddress, contract_address_const};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_number_global};
use contracts::AgentAccount::{IAgentAccountDispatcher, IAgentAccountDispatcherTrait};

fn deploy_account() -> (IAgentAccountDispatcher, ContractAddress) {
    let owner: ContractAddress = contract_address_const::<0x123>();
    let contract = declare("AgentAccount").unwrap().contract_class();
    let mut calldata = array![owner.into()];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    (IAgentAccountDispatcher { contract_address }, owner)
}

#[test]
fn test_deployment_sets_owner() {
    let (dispatcher, owner) = deploy_account();
    let contract_owner = dispatcher.get_owner();
    assert(contract_owner == owner, 'Owner should match');
}

#[test]
fn test_account_is_active_by_default() {
    let (dispatcher, _owner) = deploy_account();
    let is_active = dispatcher.is_active();
    assert(is_active, 'Should be active by default');
}

#[test]
fn test_create_session_key() {
    let (dispatcher, owner) = deploy_account();
    start_cheat_block_number_global(100); // Set current block to 100
    start_cheat_caller_address(dispatcher.contract_address, owner);
    
    let session_key: felt252 = 0x456789abcdef;
    let expiration: u64 = 1000; // Expiration at block 1000 > current 100
    let max_spend: u256 = 1000000000000000000; // 1 ETH
    let allowed_methods = array!['transfer', 'approve'];
    
    let success = dispatcher.create_session(session_key, expiration, max_spend, allowed_methods);
    assert(success, 'Session creation should succeed');
    
    stop_cheat_caller_address(dispatcher.contract_address);
}

#[test]
fn test_revoke_session_key() {
    let (dispatcher, owner) = deploy_account();
    start_cheat_block_number_global(100); // Set current block to 100
    start_cheat_caller_address(dispatcher.contract_address, owner);
    
    let session_key: felt252 = 0xabc;
    let expiration: u64 = 1000; // Expiration at block 1000 > current 100
    let max_spend: u256 = 500000000000000000;
    let allowed_methods = array!['transfer'];
    
    dispatcher.create_session(session_key, expiration, max_spend, allowed_methods);
    let success = dispatcher.revoke_session(session_key);
    assert(success, 'Revocation should succeed');
    
    stop_cheat_caller_address(dispatcher.contract_address);
}

#[test]
fn test_set_spending_limit() {
    let (dispatcher, owner) = deploy_account();
    start_cheat_caller_address(dispatcher.contract_address, owner);
    
    let daily_limit: u256 = 10000000000000000000; // 10 ETH
    let tx_limit: u256 = 1000000000000000000;     // 1 ETH
    
    let success = dispatcher.set_spending_limit(daily_limit, tx_limit);
    assert(success, 'Setting limit should succeed');
    
    let (daily, tx) = dispatcher.get_spending_limit();
    assert(daily == daily_limit, 'Daily limit should match');
    assert(tx == tx_limit, 'TX limit should match');
    
    stop_cheat_caller_address(dispatcher.contract_address);
}

#[test]
fn test_kill_switch() {
    let (dispatcher, owner) = deploy_account();
    start_cheat_caller_address(dispatcher.contract_address, owner);
    
    assert(dispatcher.is_active(), 'Should be active initially');
    
    dispatcher.toggle_kill_switch();
    assert(!dispatcher.is_active(), 'Should be inactive');
    
    dispatcher.toggle_kill_switch();
    assert(dispatcher.is_active(), 'Should be active again');
    
    stop_cheat_caller_address(dispatcher.contract_address);
}
