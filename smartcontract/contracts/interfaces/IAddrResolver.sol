// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAddrResolver
 * @dev Interface for Address Resolver contract
 * Resolves domain names to blockchain addresses
 */
interface IAddrResolver {
    function addr(bytes32 node) external view returns (address);
    function setAddr(bytes32 node, address addrValue) external;
    
    // Multi-chain address resolution
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory);
    function setAddr(bytes32 node, uint256 coinType, bytes memory a) external;
}

