// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RNSBulkManager_ACTUALLY_FIXED.sol";

/**
 * @title RNSBulkManager_TEST_AMOUNTS
 * @dev Test version that allows overriding the amount sent to registrar
 * This is for testing what amounts the registrar actually accepts
 * 
 * WARNING: This is a TEST contract. Do not use in production!
 */
contract RNSBulkManager_TEST_AMOUNTS is RNSBulkManager {
    // Allow testing with custom amounts
    mapping(uint256 => uint256) public testAmounts; // request index -> custom amount
    
    constructor(
        address _rnsRegistry,
        address _rskOwner,
        address _addrResolver,
        address _fifsRegistrar,
        address _fifsAddrRegistrar,
        address _renewer,
        address _rifToken
    ) RNSBulkManager(
        _rnsRegistry,
        _rskOwner,
        _addrResolver,
        _fifsRegistrar,
        _fifsAddrRegistrar,
        _renewer,
        _rifToken
    ) {}
    
    /**
     * @dev Set test amount for a specific request index
     * This allows testing with different amounts
     */
    function setTestAmount(uint256 index, uint256 amount) external {
        testAmounts[index] = amount;
    }
    
    /**
     * @dev Override bulkRegister to use test amounts if set
     */
    function bulkRegister(RegistrationRequest[] calldata requests) 
        external 
        override
        returns (OperationResult[] memory results) 
    {
        require(requests.length > 0, "Empty request array");
        require(requests.length <= 50, "Too many requests (max 50)");
        
        results = new OperationResult[](requests.length);
        uint256 successCount = 0;
        uint256 totalCost = 0;
        
        // Pre-check availability and calculate cost
        for (uint256 i = 0; i < requests.length; i++) {
            bool available = isDomainAvailable(requests[i].name);
            
            if (!available) {
                results[i] = OperationResult(
                    false, 
                    i, 
                    "Domain already registered or unavailable"
                );
                emit OperationFailed(i, "Domain already registered or unavailable");
                continue;
            }
            
            // Use test amount if set, otherwise calculate normally
            uint256 cost;
            if (testAmounts[i] > 0) {
                cost = testAmounts[i]; // Use test amount
            } else {
                uint256 durationInYears = (requests[i].duration * 100) / 31536000;
                cost = (PRICE_PER_YEAR * durationInYears) / 100;
                if (cost < 1 * 10**16) {
                    cost = 1 * 10**16;
                }
            }
            
            totalCost += cost;
        }
        
        require(totalCost > 0, "No domains available for registration");
        
        // Transfer tokens to this contract
        require(
            rifToken.transferFrom(msg.sender, address(this), totalCost),
            "RIF token transfer failed"
        );
        
        // Verify we received the tokens
        uint256 contractBalance = rifToken.balanceOf(address(this));
        require(contractBalance >= totalCost, "Insufficient tokens received");
        
        // Process registrations
        for (uint256 i = 0; i < requests.length; i++) {
            if (!results[i].success && bytes(results[i].errorMessage).length > 0) {
                continue;
            }
            
            // Validate name length
            bytes memory nameBytes = bytes(requests[i].name);
            if (nameBytes.length < 5) {
                results[i] = OperationResult(false, i, "Domain name too short (minimum 5 characters required by registrar)");
                emit OperationFailed(i, "Short names not available");
                continue;
            }
            
            // Use test amount if set, otherwise calculate
            uint256 cost;
            if (testAmounts[i] > 0) {
                cost = testAmounts[i];
            } else {
                uint256 durationInYears = (requests[i].duration * 100) / 31536000;
                cost = (PRICE_PER_YEAR * durationInYears) / 100;
                if (cost < 1 * 10**16) {
                    cost = 1 * 10**16;
                }
            }
            
            // Verify we have enough balance
            if (rifToken.balanceOf(address(this)) < cost) {
                results[i] = OperationResult(false, i, "Not enough tokens in contract");
                emit OperationFailed(i, "Not enough tokens");
                continue;
            }
            
            // Encode registerData
            bytes memory registerData = abi.encodePacked(
                bytes4(0x5f7b99d5),
                requests[i].owner,
                requests[i].secret,
                requests[i].duration,
                requests[i].addr,
                requests[i].name
            );
            
            try rifToken677.transferAndCall(fifsAddrRegistrar, cost, registerData) {
                bytes32 label = keccak256(bytes(requests[i].name));
                bytes32 node = keccak256(abi.encodePacked(RSK_NODE, label));
                
                address currentResolver = rnsRegistry.resolver(node);
                if (currentResolver != address(0)) {
                    results[i] = OperationResult(true, i, "");
                    successCount++;
                } else {
                    results[i] = OperationResult(true, i, "Domain registered, resolver may not be set yet");
                    successCount++;
                }
            } catch Error(string memory reason) {
                results[i] = OperationResult(false, i, reason);
                emit OperationFailed(i, reason);
            } catch {
                results[i] = OperationResult(false, i, "Registration failed");
                emit OperationFailed(i, "Registration failed");
            }
        }
        
        emit BulkRegistration(msg.sender, successCount, totalCost);
        
        return results;
    }
}
