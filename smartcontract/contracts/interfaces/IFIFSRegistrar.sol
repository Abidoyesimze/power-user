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
    // VERIFIED: Basic FIFS Registrar has 4 parameters (NOT 5!)
    // Function selector: 0x2bfcc031
    // The addr parameter does NOT exist in Basic FIFS Registrar
    function register(string memory name, address nameOwner, bytes32 secret, uint256 duration) external;
    
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

