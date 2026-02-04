use contracts::ZKPassport::{IZKPassportDispatcher, IZKPassportDispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::{ContractAddress, contract_address_const};

fn deploy_zkpassport() -> (IZKPassportDispatcher, ContractAddress) {
    let admin: ContractAddress = contract_address_const::<0x123>();

    // Deploy mock Garaga verifier as a contract (not library)
    let mock_verifier_class = declare("MockGaragaVerifier").unwrap().contract_class();
    let (verifier_address, _) = mock_verifier_class.deploy(@array![]).unwrap();

    // Deploy TestZKPassport which uses contract calls instead of library calls
    let contract = declare("TestZKPassport").unwrap().contract_class();
    let mut calldata = array![admin.into(), verifier_address.into()];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    (IZKPassportDispatcher { contract_address }, admin)
}

#[test]
fn test_deployment_succeeds() {
    let (_dispatcher, _admin) = deploy_zkpassport();
    // If we got here, deployment succeeded
    assert(true, 'Deployment successful');
}

#[test]
fn test_register_agent() {
    let (dispatcher, admin) = deploy_zkpassport();
    start_cheat_caller_address(dispatcher.contract_address, admin);

    let agent_address: ContractAddress = contract_address_const::<0x789>();

    // Mock proof data - in production this would be real Garaga Groth16 proof
    let proof_data = array![
        0x1234, 0x5678, // proof_a (2 elements)
        0xabcd, 0xef01, 0x2345,
        0x6789, // proof_b (4 elements)
        0x9abc, 0xdef0 // proof_c (2 elements)
    ]
        .span();

    let public_inputs = array![0x111111].span();

    let success = dispatcher.register_agent(agent_address, proof_data, public_inputs);
    assert(success, 'Registration should succeed');

    stop_cheat_caller_address(dispatcher.contract_address);
}

#[test]
fn test_verify_agent() {
    let (dispatcher, admin) = deploy_zkpassport();
    start_cheat_caller_address(dispatcher.contract_address, admin);

    let agent_address: ContractAddress = contract_address_const::<0xabc>();
    let proof_data = array![0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8].span();
    let public_inputs = array![0x222222].span();

    dispatcher.register_agent(agent_address, proof_data, public_inputs);

    let is_verified = dispatcher.verify_agent(agent_address);
    assert(is_verified, 'Agent should be verified');

    stop_cheat_caller_address(dispatcher.contract_address);
}

#[test]
fn test_revoke_agent() {
    let (dispatcher, admin) = deploy_zkpassport();
    start_cheat_caller_address(dispatcher.contract_address, admin);

    let agent_address: ContractAddress = contract_address_const::<0xdef>();
    let proof_data = array![0xa, 0xb, 0xc, 0xd, 0xe, 0xf, 0x1, 0x2].span();
    let public_inputs = array![0x333333].span();

    dispatcher.register_agent(agent_address, proof_data, public_inputs);
    let success = dispatcher.revoke_agent(agent_address);
    assert(success, 'Revocation should succeed');

    let is_verified = dispatcher.verify_agent(agent_address);
    assert(!is_verified, 'Agent should not be verified');

    stop_cheat_caller_address(dispatcher.contract_address);
}

#[test]
fn test_get_agent_info() {
    let (dispatcher, admin) = deploy_zkpassport();
    start_cheat_caller_address(dispatcher.contract_address, admin);

    let agent_address: ContractAddress = contract_address_const::<0x999>();
    let proof_data = array![0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88].span();
    let public_inputs = array![0x444444].span();

    dispatcher.register_agent(agent_address, proof_data, public_inputs);

    let (is_verified, _registered_at, _proof_hash) = dispatcher.get_agent_info(agent_address);
    assert(is_verified, 'Should show as verified');

    stop_cheat_caller_address(dispatcher.contract_address);
}
