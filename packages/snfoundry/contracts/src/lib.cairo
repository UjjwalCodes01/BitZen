// BitZen Smart Contracts
pub mod AgentAccount;

#[cfg(test)]
pub mod MockERC20;

// Mock verifier - must be declared on-chain for ZKPassport to work in testnet
pub mod MockGaragaVerifier;
pub mod ServiceRegistry;

#[cfg(test)]
pub mod TestZKPassport;
pub mod ZKPassport;

