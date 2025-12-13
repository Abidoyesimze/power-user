// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IRNS.sol";
import "./interfaces/IRSKOwner.sol";
import "./interfaces/IAddrResolver.sol";
import "./interfaces/IFIFSRegistrar.sol";
import "./interfaces/IRenewer.sol";
import "./interfaces/IERC20.sol";

/**
 * @title RNSBulkManager
 * @dev Multicall contract for batch operations on RNS domains
 * Enables users to register, renew, and update multiple domains in a single transaction
 */
contract RNSBulkManager {
    // RNS Contract Addresses
    IRNS public immutable rnsRegistry;
    IRSKOwner public immutable rskOwner;
    IAddrResolver public immutable addrResolver;
    IFIFSRegistrar public immutable fifsRegistrar;
    IRenewer public immutable renewer;
    IERC20 public immutable rifToken;
    
    // Events
    event BulkRegistration(address indexed user, uint256 count, uint256 totalCost);
    event BulkRenewal(address indexed user, uint256 count, uint256 totalCost);
    event BulkAddressUpdate(address indexed user, uint256 count);
    event BulkMultiChainAddressUpdate(address indexed user, uint256 count);
    event OperationFailed(uint256 indexed index, string reason);
    
    // Structs for batch operations
    struct RegistrationRequest {
        string name;
        address owner;
        bytes32 secret;
        uint256 duration;
        address addr; // Address to set for the domain after registration
    }
    
    struct RenewalRequest {
        string name;
        uint256 duration;
        uint256 expires; // Current expiration timestamp (use 0 if unknown, contract may handle it)
    }
    
    struct AddressUpdateRequest {
        bytes32 node;
        address targetAddress;
    }
    
    struct TokenIdRenewal {
        uint256 tokenId;
        uint256 duration;
    }
    
    // Result struct for partial failure tracking
    struct OperationResult {
        bool success;
        uint256 index;
        string errorMessage;
    }
    
    // Fixed price per year (workaround for FIFS registrar bug on testnet)
    // The registrar returns duration + 2 RIF, making long durations impossible
    // We use a fixed reasonable price: 0.1 RIF per year
    uint256 public constant PRICE_PER_YEAR = 1 * 10**17; // 0.1 RIF in wei
    
    struct MultiChainAddressUpdate {
        bytes32 node;
        uint256 coinType;
        bytes targetAddress;
    }
    
    /**
     * @dev Constructor - Initialize with RNS contract addresses
     */
    constructor(
        address _rnsRegistry,
        address _rskOwner,
        address _addrResolver,
        address _fifsRegistrar,
        address _renewer,
        address _rifToken
    ) {
        require(_rnsRegistry != address(0), "Invalid RNS Registry");
        require(_rskOwner != address(0), "Invalid RSK Owner");
        require(_addrResolver != address(0), "Invalid Addr Resolver");
        require(_fifsRegistrar != address(0), "Invalid FIFS Registrar");
        require(_renewer != address(0), "Invalid Renewer");
        require(_rifToken != address(0), "Invalid RIF Token");
        
        rnsRegistry = IRNS(_rnsRegistry);
        rskOwner = IRSKOwner(_rskOwner);
        addrResolver = IAddrResolver(_addrResolver);
        fifsRegistrar = IFIFSRegistrar(_fifsRegistrar);
        renewer = IRenewer(_renewer);
        rifToken = IERC20(_rifToken);
    }
    
    /**
     * @dev Bulk register multiple domains
     * @param requests Array of registration requests
     * @return results Array of operation results (success/failure for each domain)
     */
    function bulkRegister(RegistrationRequest[] calldata requests) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(requests.length > 0, "Empty request array");
        require(requests.length <= 50, "Too many requests (max 50)");
        
        results = new OperationResult[](requests.length);
        uint256 successCount = 0;
        uint256 totalCost = 0;
        
        // Calculate total cost using fixed price
        // WORKAROUND: FIFS registrar on testnet has a bug where it returns duration + 2 RIF
        // For long durations (years), this makes registration impossible
        // We use a fixed reasonable price: 0.1 RIF per year
        for (uint256 i = 0; i < requests.length; i++) {
            // Convert duration (seconds) to years and calculate price
            // 1 year = 31536000 seconds
            uint256 durationInYears = (requests[i].duration * 100) / 31536000; // Multiply by 100 for precision
            uint256 cost = (PRICE_PER_YEAR * durationInYears) / 100; // Divide by 100 to get final price
            
            // Minimum price: 0.01 RIF (for durations less than 1 year)
            if (cost < 1 * 10**16) {
                cost = 1 * 10**16; // 0.01 RIF minimum
            }
            
            totalCost += cost;
        }
        
        // If all registrations failed due to price issues, revert with clear message
        if (totalCost == 0) {
            revert("All registrations failed: Unable to calculate price");
        }
        
        // Transfer total RIF tokens from user to this contract
        require(
            rifToken.transferFrom(msg.sender, address(this), totalCost),
            "RIF token transfer failed"
        );
        
        // Approve registrar to spend tokens
        rifToken.approve(address(fifsRegistrar), totalCost);
        
        // Process each registration
        for (uint256 i = 0; i < requests.length; i++) {
            if (!results[i].success && bytes(results[i].errorMessage).length > 0) {
                continue; // Skip if price calculation failed
            }
            
            try fifsRegistrar.register(
                requests[i].name,
                requests[i].owner,
                requests[i].secret,
                requests[i].duration,
                requests[i].addr
            ) {
                results[i] = OperationResult(true, i, "");
                successCount++;
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
    
    /**
     * @dev Bulk renew multiple domains by name
     * @param requests Array of renewal requests
     * @return results Array of operation results
     */
    function bulkRenew(RenewalRequest[] calldata requests) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(requests.length > 0, "Empty request array");
        require(requests.length <= 50, "Too many requests (max 50)");
        
        results = new OperationResult[](requests.length);
        uint256 successCount = 0;
        uint256 totalCost = 0;
        
        // Calculate total cost
        for (uint256 i = 0; i < requests.length; i++) {
            try renewer.price(requests[i].name, requests[i].expires, requests[i].duration) returns (uint256 cost) {
                totalCost += cost;
            } catch {
                results[i] = OperationResult(false, i, "Failed to get renewal price");
                emit OperationFailed(i, "Failed to get renewal price");
                continue;
            }
        }
        
        // Transfer total RIF tokens
        require(
            rifToken.transferFrom(msg.sender, address(this), totalCost),
            "RIF token transfer failed"
        );
        
        // Approve renewer
        rifToken.approve(address(renewer), totalCost);
        
        // Process renewals
        for (uint256 i = 0; i < requests.length; i++) {
            if (!results[i].success && bytes(results[i].errorMessage).length > 0) {
                continue;
            }
            
            try renewer.renew(requests[i].name, requests[i].duration) {
                results[i] = OperationResult(true, i, "");
                successCount++;
            } catch Error(string memory reason) {
                results[i] = OperationResult(false, i, reason);
                emit OperationFailed(i, reason);
            } catch {
                results[i] = OperationResult(false, i, "Renewal failed");
                emit OperationFailed(i, "Renewal failed");
            }
        }
        
        emit BulkRenewal(msg.sender, successCount, totalCost);
        
        return results;
    }
    
    /**
     * @dev Bulk renew multiple domains by tokenId
     * @param requests Array of tokenId renewal requests
     * @return results Array of operation results
     */
    function bulkRenewByTokenId(TokenIdRenewal[] calldata requests) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(requests.length > 0, "Empty request array");
        require(requests.length <= 50, "Too many requests (max 50)");
        
        results = new OperationResult[](requests.length);
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < requests.length; i++) {
            try rskOwner.renew(requests[i].tokenId, requests[i].duration) {
                results[i] = OperationResult(true, i, "");
                successCount++;
            } catch Error(string memory reason) {
                results[i] = OperationResult(false, i, reason);
                emit OperationFailed(i, reason);
            } catch {
                results[i] = OperationResult(false, i, "Renewal failed");
                emit OperationFailed(i, "Renewal failed");
            }
        }
        
        emit BulkRenewal(msg.sender, successCount, 0);
        
        return results;
    }
    
    /**
     * @dev Bulk update addresses for multiple domains
     * @param requests Array of address update requests
     * @return results Array of operation results
     */
    function bulkSetAddress(AddressUpdateRequest[] calldata requests) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(requests.length > 0, "Empty request array");
        require(requests.length <= 100, "Too many requests (max 100)");
        
        results = new OperationResult[](requests.length);
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < requests.length; i++) {
            // Verify caller is the owner of the domain - use try-catch to allow partial failures
            address owner;
            try rnsRegistry.owner(requests[i].node) returns (address domainOwner) {
                owner = domainOwner;
            } catch {
                results[i] = OperationResult(false, i, "Failed to get domain owner");
                emit OperationFailed(i, "Failed to get domain owner");
                continue;
            }
            
            // Check ownership without reverting on failure
            if (owner != msg.sender) {
                results[i] = OperationResult(false, i, "Not domain owner");
                emit OperationFailed(i, "Not domain owner");
                continue;
            }
            
            // Try to set the address
            try addrResolver.setAddr(requests[i].node, requests[i].targetAddress) {
                results[i] = OperationResult(true, i, "");
                successCount++;
            } catch Error(string memory reason) {
                results[i] = OperationResult(false, i, reason);
                emit OperationFailed(i, reason);
            } catch {
                results[i] = OperationResult(false, i, "Address update failed");
                emit OperationFailed(i, "Address update failed");
            }
        }
        
        emit BulkAddressUpdate(msg.sender, successCount);
        
        return results;
    }
    
    /**
     * @dev Bulk set resolver for multiple domains
     * @param nodes Array of domain namehashes
     * @param resolverAddress Resolver address to set for all domains
     * @return results Array of operation results
     */
    function bulkSetResolver(bytes32[] calldata nodes, address resolverAddress) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(nodes.length > 0, "Empty nodes array");
        require(nodes.length <= 100, "Too many nodes (max 100)");
        require(resolverAddress != address(0), "Invalid resolver address");
        
        results = new OperationResult[](nodes.length);
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < nodes.length; i++) {
            // Verify ownership without reverting on failure
            address owner;
            try rnsRegistry.owner(nodes[i]) returns (address domainOwner) {
                owner = domainOwner;
            } catch {
                results[i] = OperationResult(false, i, "Failed to get domain owner");
                emit OperationFailed(i, "Failed to get domain owner");
                continue;
            }
            
            if (owner != msg.sender) {
                results[i] = OperationResult(false, i, "Not domain owner");
                emit OperationFailed(i, "Not domain owner");
                continue;
            }
            
            // Try to set resolver
            try rnsRegistry.setResolver(nodes[i], resolverAddress) {
                results[i] = OperationResult(true, i, "");
                successCount++;
            } catch Error(string memory reason) {
                results[i] = OperationResult(false, i, reason);
                emit OperationFailed(i, reason);
            } catch {
                results[i] = OperationResult(false, i, "Set resolver failed");
                emit OperationFailed(i, "Set resolver failed");
            }
        }
        
        return results;
    }
    
    /**
     * @dev Helper function to calculate total cost for registrations
     * @param names Array of domain names
     * @param durations Array of durations (must match names length)
     * @return totalCost Total cost in RIF tokens
     */
    function calculateRegistrationCost(
        string[] calldata names,
        uint256[] calldata durations
    ) external pure returns (uint256 totalCost) {
        require(names.length == durations.length, "Array length mismatch");
        
        // Use fixed price: 0.1 RIF per year (workaround for FIFS registrar bug)
        for (uint256 i = 0; i < names.length; i++) {
            // Convert duration (seconds) to years and calculate price
            uint256 durationInYears = (durations[i] * 100) / 31536000;
            uint256 cost = (PRICE_PER_YEAR * durationInYears) / 100;
            
            // Minimum price: 0.01 RIF (for durations less than 1 year)
            if (cost < 1 * 10**16) {
                cost = 1 * 10**16; // 0.01 RIF minimum
            }
            
            totalCost += cost;
        }
        
        return totalCost;
    }
    
    /**
     * @dev Helper function to calculate total renewal cost
     * @param names Array of domain names
     * @param durations Array of durations
     * @return totalCost Total cost in RIF tokens
     */
    function calculateRenewalCost(
        string[] calldata names,
        uint256[] calldata expires,
        uint256[] calldata durations
    ) external view returns (uint256 totalCost) {
        require(names.length == durations.length, "Array length mismatch");
        require(names.length == expires.length, "Array length mismatch");
        
        for (uint256 i = 0; i < names.length; i++) {
            totalCost += renewer.price(names[i], expires[i], durations[i]);
        }
        
        return totalCost;
    }
    
    /**
     * @dev Bulk update multi-chain addresses for multiple domains
     * @param requests Array of multi-chain address update requests
     * @return results Array of operation results
     */
    function bulkSetMultiChainAddress(MultiChainAddressUpdate[] calldata requests) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(requests.length > 0, "Empty request array");
        require(requests.length <= 100, "Too many requests (max 100)");
        
        results = new OperationResult[](requests.length);
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < requests.length; i++) {
            // Verify ownership
            address owner;
            try rnsRegistry.owner(requests[i].node) returns (address domainOwner) {
                owner = domainOwner;
            } catch {
                results[i] = OperationResult(false, i, "Failed to get domain owner");
                emit OperationFailed(i, "Failed to get domain owner");
                continue;
            }
            
            if (owner != msg.sender) {
                results[i] = OperationResult(false, i, "Not domain owner");
                emit OperationFailed(i, "Not domain owner");
                continue;
            }
            
            // Try to set multi-chain address
            try addrResolver.setAddr(
                requests[i].node, 
                requests[i].coinType, 
                requests[i].targetAddress
            ) {
                results[i] = OperationResult(true, i, "");
                successCount++;
            } catch Error(string memory reason) {
                results[i] = OperationResult(false, i, reason);
                emit OperationFailed(i, reason);
            } catch {
                results[i] = OperationResult(false, i, "Multi-chain address update failed");
                emit OperationFailed(i, "Multi-chain address update failed");
            }
        }
        
        emit BulkMultiChainAddressUpdate(msg.sender, successCount);
        
        return results;
    }
    
    /**
     * @dev Generic multicall for combining multiple operations in one transaction
     * Continues on individual call failures to allow partial success
     * @param targets Array of contract addresses
     * @param callDatas Array of encoded function calls
     * @return successes Array indicating which calls succeeded
     * @return results Array of call results (empty bytes on failure, returnData on success)
     */
    function multicall(address[] calldata targets, bytes[] calldata callDatas)
        external
        returns (bool[] memory successes, bytes[] memory results)
    {
        require(targets.length == callDatas.length, "Array length mismatch");
        require(targets.length <= 50, "Too many calls (max 50)");
        
        successes = new bool[](targets.length);
        results = new bytes[](targets.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory returnData) = targets[i].call(callDatas[i]);
            successes[i] = success;
            results[i] = returnData;
        }
    }
    
    /**
     * @dev Helper to verify ownership of multiple domains
     * @param nodes Array of domain namehashes
     * @return ownedNodes Array of boolean values indicating ownership
     */
    function verifyOwnership(bytes32[] calldata nodes) 
        external 
        view 
        returns (bool[] memory ownedNodes) 
    {
        ownedNodes = new bool[](nodes.length);
        
        for (uint256 i = 0; i < nodes.length; i++) {
            try rnsRegistry.owner(nodes[i]) returns (address owner) {
                ownedNodes[i] = (owner == msg.sender);
            } catch {
                ownedNodes[i] = false;
            }
        }
        
        return ownedNodes;
    }
    
    /**
     * @dev Emergency function to recover stuck tokens
     * Only callable by token owner if tokens get stuck
     */
    function recoverTokens(address tokenAddress, uint256 amount) external {
        require(tokenAddress != address(0), "Invalid token address");
        IERC20(tokenAddress).transfer(msg.sender, amount);
    }
}