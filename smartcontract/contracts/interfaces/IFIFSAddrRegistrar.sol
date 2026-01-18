// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFIFSAddrRegistrar
 * @dev Interface for FIFS Addr Registrar
 * This registrar sets BOTH domain ownership AND address resolution in one transaction
 */
interface IFIFSAddrRegistrar {
    /**
     * @dev Register a domain and set its address resolution
     * @param name Domain name (without .rsk)
     * @param nameOwner Address that will own the domain
     * @param secret Secret from commitment
     * @param duration Registration duration in seconds
     * @param addr Address to set as resolution for this domain
     */
    function register(
        string calldata name,
        address nameOwner,
        bytes32 secret,
        uint256 duration,
        address addr
    ) external;
    
    /**
     * @dev Calculate price for a domain registration
     * @param name Domain name
     * @param duration Duration in seconds
     * @return price Price in RIF tokens (wei)
     */
    function price(
        string calldata name,
        uint256 duration
    ) external view returns (uint256);
    
    /**
     * @dev Create a commitment for registration
     * Note: Usually use the basic FIFS registrar for commits
     * @param label keccak256 of domain name
     * @param nameOwner Owner address
     * @param secret Random secret
     * @return commitment The commitment hash
     */
    function makeCommitment(
        bytes32 label,
        address nameOwner,
        bytes32 secret
    ) external pure returns (bytes32 commitment);
}
