// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRenewer.sol";
import "./MockERC20.sol";

/**
 * @title MockRenewer
 * @dev Mock implementation of Renewer for testing
 */
contract MockRenewer is IRenewer {
    MockERC20 public token;
    mapping(string => bool) public registered;
    
    constructor(address _token) {
        token = MockERC20(_token);
    }
    
    function renew(string memory name, uint256 duration) external override returns (uint256) {
        require(registered[name], "Domain not registered");
        uint256 priceToPay = this.price(name, 0, duration);
        require(token.transferFrom(msg.sender, address(this), priceToPay), "Payment failed");
        return 1;
    }
    
    function price(string memory name, uint256 expires, uint256 duration) external view override returns (uint256) {
        // Renewal price is 50 tokens per character per year
        // expires parameter is ignored in mock (can be 0 for testing)
        uint256 basePrice = 50 * (10**18);
        uint256 nameLength = bytes(name).length;
        return (basePrice * nameLength * duration) / 365 days;
    }
    
    // Helper function for testing
    function registerDirect(string memory name) external {
        registered[name] = true;
    }
}

