// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IFIFSRegistrar.sol";
import "./MockERC20.sol";

/**
 * @title MockFIFSRegistrar
 * @dev Mock implementation of FIFS Registrar for testing
 */
contract MockFIFSRegistrar is IFIFSRegistrar {
    MockERC20 public token;
    mapping(string => bool) public registered;
    
    constructor(address _token) {
        token = MockERC20(_token);
    }
    
    // Note: available() function removed from interface, but keeping for backward compatibility in tests
    function available(string memory name) external view returns (bool) {
        return !registered[name];
    }
    
    function price(string memory name, uint256 expires, uint256 duration) external view override returns (uint256) {
        // Price is 100 tokens per character per year
        // expires parameter is ignored in mock (used for new registrations with expires = 0)
        uint256 basePrice = 100 * (10**18);
        uint256 nameLength = bytes(name).length;
        return (basePrice * nameLength * duration) / 365 days;
    }
    
    function register(string memory name, address nameOwner, bytes32 secret, uint256 duration, address addr) external override {
        require(!registered[name], "Domain already registered");
        uint256 priceToPay = this.price(name, 0, duration);
        require(token.transferFrom(msg.sender, address(this), priceToPay), "Payment failed");
        registered[name] = true;
        // Note: addr parameter is for setting domain address, but mock doesn't implement that
    }
    
    // Commit-reveal functions (minimal implementation for testing)
    function commit(bytes32 commitment) external override {
        // Mock implementation - just accept the commitment
    }
    
    function canReveal(bytes32 commitment) external view override returns (bool) {
        // Mock implementation - always return true
        return true;
    }
    
    function makeCommitment(bytes32 label, address nameOwner, bytes32 secret) external view override returns (bytes32) {
        // Mock implementation - simple hash
        return keccak256(abi.encodePacked(label, nameOwner, secret));
    }
    
    function minCommitmentAge() external view override returns (uint256) {
        // Mock implementation - return 0 for testing
        return 0;
    }
}

