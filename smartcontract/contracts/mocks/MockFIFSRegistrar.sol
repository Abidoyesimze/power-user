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
    
    function available(string memory name) external view override returns (bool) {
        return !registered[name];
    }
    
    function price(string memory name, uint256 duration) external view override returns (uint256) {
        // Price is 100 tokens per character per year
        uint256 basePrice = 100 * (10**18);
        uint256 nameLength = bytes(name).length;
        return (basePrice * nameLength * duration) / 365 days;
    }
    
    function register(string memory name, address owner, bytes32 secret, uint256 duration) external override {
        require(this.available(name), "Domain already registered");
        uint256 priceToPay = this.price(name, duration);
        require(token.transferFrom(msg.sender, address(this), priceToPay), "Payment failed");
        registered[name] = true;
    }
}

