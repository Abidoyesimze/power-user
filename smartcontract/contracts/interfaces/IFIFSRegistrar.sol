// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFIFSRegistrar
 * @dev Interface for First-In-First-Served Registrar
 * Handles domain registration with RIF token payments
 * Uses commit-reveal scheme for registration
 */
interface IFIFSRegistrar {
    // Registration function - requires commit-reveal scheme
    // addr parameter is the address to set for the domain after registration
    function register(string memory name, address nameOwner, bytes32 secret, uint256 duration, address addr) external;
    
    // Commit-reveal functions
    function commit(bytes32 commitment) external;
    function canReveal(bytes32 commitment) external view returns (bool);
    function makeCommitment(bytes32 label, address nameOwner, bytes32 secret) external view returns (bytes32);
    function minCommitmentAge() external view returns (uint256);
    
    // Price function - requires expires parameter (expiration timestamp)
    // For new registrations, use expires = 0
    function price(string memory name, uint256 expires, uint256 duration) external view returns (uint256);
    
    // Optional: available function may not exist on all implementations
    // function available(string memory name) external view returns (bool);
}

