// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRSKOwner.sol";

/**
 * @title MockRSKOwner
 * @dev Mock implementation of RSK Owner for testing
 */
contract MockRSKOwner is IRSKOwner {
    mapping(uint256 => address) private _owners;
    mapping(uint256 => uint256) private _expirations;
    
    uint256 public tokenCounter;
    
    function ownerOf(uint256 tokenId) external view override returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _owners[tokenId];
    }
    
    function expirationTime(uint256 tokenId) external view override returns (uint256) {
        return _expirations[tokenId];
    }
    
    function available(uint256 tokenId) external view override returns (bool) {
        return _expirations[tokenId] == 0 || block.timestamp >= _expirations[tokenId];
    }
    
    function register(string memory name, address owner, bytes32 secret, uint256 duration) external override {
        tokenCounter++;
        _owners[tokenCounter] = owner;
        _expirations[tokenCounter] = block.timestamp + duration;
    }
    
    function renew(uint256 tokenId, uint256 duration) external override {
        require(_owners[tokenId] == msg.sender, "Not the owner");
        _expirations[tokenId] = block.timestamp + duration;
    }
    
    function transferFrom(address from, address to, uint256 tokenId) external override {
        require(_owners[tokenId] == from, "Not the owner");
        _owners[tokenId] = to;
    }
    
    function reclaim(uint256 tokenId, address newOwner) external override {
        require(_owners[tokenId] == msg.sender, "Not the owner");
        _owners[tokenId] = newOwner;
    }
    
    // Helper function for testing
    function createTokenDirect(address owner, uint256 duration) external returns (uint256) {
        tokenCounter++;
        _owners[tokenCounter] = owner;
        _expirations[tokenCounter] = block.timestamp + duration;
        return tokenCounter;
    }
}

