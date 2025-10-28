// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRNS.sol";

/**
 * @title MockRNS
 * @dev Mock implementation of RNS registry for testing
 */
contract MockRNS is IRNS {
    mapping(bytes32 => address) private _owners;
    mapping(bytes32 => address) private _resolvers;
    mapping(bytes32 => uint64) private _ttls;
    
    function owner(bytes32 node) external view override returns (address) {
        return _owners[node];
    }
    
    function resolver(bytes32 node) external view override returns (address) {
        return _resolvers[node];
    }
    
    function ttl(bytes32 node) external view override returns (uint64) {
        return _ttls[node];
    }
    
    function setOwner(bytes32 node, address ownerAddress) external override {
        _owners[node] = ownerAddress;
    }
    
    function setSubnodeOwner(bytes32 node, bytes32 label, address ownerAddress) external override {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        _owners[subnode] = ownerAddress;
    }
    
    function setResolver(bytes32 node, address resolverAddress) external override {
        _resolvers[node] = resolverAddress;
    }
    
    function setTTL(bytes32 node, uint64 ttlValue) external override {
        _ttls[node] = ttlValue;
    }
    
    // Helper functions for testing
    function setOwnerDirect(bytes32 node, address ownerAddress) external {
        _owners[node] = ownerAddress;
    }
}

