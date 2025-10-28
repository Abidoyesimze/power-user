// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IAddrResolver.sol";

/**
 * @title MockAddrResolver
 * @dev Mock implementation of address resolver for testing
 */
contract MockAddrResolver is IAddrResolver {
    mapping(bytes32 => address) private _addresses;
    mapping(bytes32 => mapping(uint256 => bytes)) private _coinAddresses;
    
    function addr(bytes32 node) external view override returns (address) {
        return _addresses[node];
    }
    
    function setAddr(bytes32 node, address addrValue) external override {
        _addresses[node] = addrValue;
    }
    
    function addr(bytes32 node, uint256 coinType) external view override returns (bytes memory) {
        return _coinAddresses[node][coinType];
    }
    
    function setAddr(bytes32 node, uint256 coinType, bytes memory a) external override {
        _coinAddresses[node][coinType] = a;
    }
}

