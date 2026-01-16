// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRSKOwnerImprove.sol";

/**
 * @title MockRSKOwner
 * @dev Mock implementation of RSK Owner for testing
 * Implements IRSKOwnerImprove interface with additional ERC721 functions
 */
contract MockRSKOwner is IRSKOwner {
    mapping(uint256 => address) private _owners;
    mapping(uint256 => uint256) private _expirations;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    
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
    
    function renew(uint256 tokenId, uint256 duration) external override {
        require(_owners[tokenId] == msg.sender, "Not the owner");
        _expirations[tokenId] = block.timestamp + duration;
    }
    
    function transferFrom(address from, address to, uint256 tokenId) external override {
        require(_owners[tokenId] == from || _tokenApprovals[tokenId] == msg.sender || _operatorApprovals[from][msg.sender], "Not authorized");
        _owners[tokenId] = to;
        delete _tokenApprovals[tokenId];
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external override {
        require(_owners[tokenId] == from, "Not the owner");
        _owners[tokenId] = to;
        delete _tokenApprovals[tokenId];
    }
    
    function approve(address to, uint256 tokenId) external override {
        require(_owners[tokenId] == msg.sender, "Not the owner");
        _tokenApprovals[tokenId] = to;
    }
    
    function getApproved(uint256 tokenId) external view override returns (address) {
        return _tokenApprovals[tokenId];
    }
    
    function setApprovalForAll(address operator, bool approved) external override {
        _operatorApprovals[msg.sender][operator] = approved;
    }
    
    function isApprovedForAll(address owner, address operator) external view override returns (bool) {
        return _operatorApprovals[owner][operator];
    }
    
    // Helper function for testing
    function createTokenDirect(address owner, uint256 duration) external returns (uint256) {
        tokenCounter++;
        _owners[tokenCounter] = owner;
        _expirations[tokenCounter] = block.timestamp + duration;
        return tokenCounter;
    }
}

