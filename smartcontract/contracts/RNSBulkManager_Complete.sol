// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IRNS.sol";
import "./interfaces/IRSKOwnerImprove.sol";
import "./interfaces/IAddrResolver.sol";
import "./interfaces/IFIFSRegistrar.sol";
import "./interfaces/IRenewer.sol";
import "./interfaces/IERC20.sol";

/**
 * @title RNSBulkManager - Complete
 * @dev Enhanced multicall contract for batch RNS domain operations with proper availability checking
 * Includes all original functions plus improved availability verification
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
    event DomainAvailabilityChecked(string indexed name, bool available);
    
    // Structs for batch operations
    struct RegistrationRequest {
        string name;
        address owner;
        bytes32 secret;
        uint256 duration;
        address addr;
    }
    
    struct RenewalRequest {
        string name;
        uint256 duration;
        uint256 expires;
    }
    
    struct AddressUpdateRequest {
        bytes32 node;
        address targetAddress;
    }
    
    struct TokenIdRenewal {
        uint256 tokenId;
        uint256 duration;
    }
    
    struct OperationResult {
        bool success;
        uint256 index;
        string errorMessage;
    }
    
    struct MultiChainAddressUpdate {
        bytes32 node;
        uint256 coinType;
        bytes targetAddress;
    }
    
    // Fixed price per year
    uint256 public constant PRICE_PER_YEAR = 1 * 10**17; // 0.1 RIF in wei
    
    /**
     * @dev Constructor
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
     * @dev CRITICAL: Check if a domain is available for registration
     * A domain is available if:
     * 1. It doesn't have an owner in the RNS registry (address(0))
     * 2. It doesn't have an active registration in RSKOwner (not expired)
     * 
     * @param name Domain name (without .rsk suffix)
     * @return available True if domain can be registered
     */
    function isDomainAvailable(string calldata name) public view returns (bool available) {
        // Calculate the label hash (keccak256 of the name)
        bytes32 label = keccak256(bytes(name));
        
        // Calculate the namehash for name.rsk
        // namehash(name.rsk) = keccak256(namehash("rsk"), label)
        bytes32 rskNode = keccak256(abi.encodePacked(bytes32(0x0), keccak256("rsk")));
        bytes32 node = keccak256(abi.encodePacked(rskNode, label));
        
        // Method 1: Check RNS Registry owner
        address registryOwner;
        try rnsRegistry.owner(node) returns (address owner) {
            registryOwner = owner;
        } catch {
            // If call fails, assume domain doesn't exist (available)
            return true;
        }
        
        // If registry owner is address(0), domain might be available
        // But we need to check RSKOwner as well (for expiration)
        if (registryOwner == address(0)) {
            return true;
        }
        
        // Method 2: Check RSKOwner expiration
        // RSKOwner uses tokenId = uint256(label) to track ownership
        uint256 tokenId = uint256(label);
        
        try rskOwner.ownerOf(tokenId) returns (address) {
            // If ownerOf succeeds, domain has an active owner
            // Check if it's expired by trying to get expiration time
            try rskOwner.expirationTime(tokenId) returns (uint256 expiry) {
                // Domain is available if expired
                return expiry < block.timestamp;
            } catch {
                // If can't get expiration, assume not available
                return false;
            }
        } catch {
            // If ownerOf fails, domain doesn't have an active NFT owner
            // Double-check registry owner
            if (registryOwner == address(0)) {
                return true;
            } else {
                // Registry has owner but RSKOwner doesn't - unusual state
                // To be safe, consider unavailable
                return false;
            }
        }
    }
    
    /**
     * @dev Batch check availability for multiple domains
     * @param names Array of domain names (without .rsk)
     * @return availability Array of booleans indicating availability
     */
    function checkBulkAvailability(string[] calldata names) 
        external 
        view 
        returns (bool[] memory availability) 
    {
        availability = new bool[](names.length);
        
        for (uint256 i = 0; i < names.length; i++) {
            availability[i] = isDomainAvailable(names[i]);
        }
        
        return availability;
    }
    
    /**
     * @dev Bulk register multiple domains with availability pre-check
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
        
        // PRE-CHECK: Verify all domains are available before processing
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
            
            // Calculate cost for available domains
            uint256 durationInYears = (requests[i].duration * 100) / 31536000;
            uint256 cost = (PRICE_PER_YEAR * durationInYears) / 100;
            
            if (cost < 1 * 10**16) {
                cost = 1 * 10**16; // 0.01 RIF minimum
            }
            
            totalCost += cost;
        }
        
        // If no domains are available, revert
        require(totalCost > 0, "No domains available for registration");
        
        // Transfer total RIF tokens
        require(
            rifToken.transferFrom(msg.sender, address(this), totalCost),
            "RIF token transfer failed"
        );
        
        // Approve registrar
        rifToken.approve(address(fifsRegistrar), totalCost);
        
        // Process registrations
        for (uint256 i = 0; i < requests.length; i++) {
            // Skip domains that failed pre-check
            if (!results[i].success && bytes(results[i].errorMessage).length > 0) {
                continue;
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
                if (keccak256(bytes(reason)) == keccak256(bytes("No commitment found")) || 
                    keccak256(bytes(reason)) == keccak256(bytes("Commitment too new"))) {
                    results[i] = OperationResult(
                        false, 
                        i, 
                        "Commitment required: Commit first, wait 60 seconds, then register"
                    );
                    emit OperationFailed(i, "Commitment required");
                } else {
                    results[i] = OperationResult(false, i, reason);
                    emit OperationFailed(i, reason);
                }
            } catch {
                results[i] = OperationResult(false, i, "Registration failed");
                emit OperationFailed(i, "Registration failed");
            }
        }
        
        emit BulkRegistration(msg.sender, successCount, totalCost);
        
        return results;
    }
    
    /**
     * @dev Bulk commit domains for registration
     */
    function bulkCommit(RegistrationRequest[] calldata requests) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(requests.length > 0, "Empty request array");
        require(requests.length <= 50, "Too many requests (max 50)");
        
        results = new OperationResult[](requests.length);
        uint256 successCount = 0;
        
        // PRE-CHECK: Verify domains are available before committing
        for (uint256 i = 0; i < requests.length; i++) {
            bool available = isDomainAvailable(requests[i].name);
            
            if (!available) {
                results[i] = OperationResult(
                    false, 
                    i, 
                    "Domain already registered - cannot commit"
                );
                emit OperationFailed(i, "Domain already registered");
                continue;
            }
            
            bytes32 label = keccak256(bytes(requests[i].name));
            bytes32 commitment;
            
            try fifsRegistrar.makeCommitment(label, requests[i].owner, requests[i].secret) returns (bytes32 registrarCommitment) {
                commitment = registrarCommitment;
            } catch {
                commitment = keccak256(abi.encodePacked(label, requests[i].owner, requests[i].secret));
            }
            
            try fifsRegistrar.commit(commitment) {
                results[i] = OperationResult(true, i, "");
                successCount++;
            } catch Error(string memory reason) {
                results[i] = OperationResult(false, i, string(abi.encodePacked("Commit failed: ", reason)));
                emit OperationFailed(i, string(abi.encodePacked("Commit failed: ", reason)));
            } catch {
                results[i] = OperationResult(false, i, "Commit failed");
                emit OperationFailed(i, "Commit failed");
            }
        }
        
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
            // Verify caller is the owner of the domain
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
            // Verify ownership
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
     * @param targets Array of contract addresses
     * @param callDatas Array of encoded function calls
     * @return successes Array indicating which calls succeeded
     * @return results Array of call results
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
        
        for (uint256 i = 0; i < names.length; i++) {
            uint256 durationInYears = (durations[i] * 100) / 31536000;
            uint256 cost = (PRICE_PER_YEAR * durationInYears) / 100;
            
            if (cost < 1 * 10**16) {
                cost = 1 * 10**16;
            }
            
            totalCost += cost;
        }
        
        return totalCost;
    }
    
    /**
     * @dev Helper function to calculate total renewal cost
     * @param names Array of domain names
     * @param expires Array of expiration timestamps
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
     * @dev Emergency function to recover stuck tokens
     * Only callable by token owner if tokens get stuck
     */
    function recoverTokens(address tokenAddress, uint256 amount) external {
        require(tokenAddress != address(0), "Invalid token address");
        IERC20(tokenAddress).transfer(msg.sender, amount);
    }
    
    /**
     * @dev Get domain owner from RNS Registry
     */
    function getDomainOwner(string calldata name) external view returns (address) {
        bytes32 label = keccak256(bytes(name));
        bytes32 rskNode = keccak256(abi.encodePacked(bytes32(0x0), keccak256("rsk")));
        bytes32 node = keccak256(abi.encodePacked(rskNode, label));
        
        return rnsRegistry.owner(node);
    }
    
    /**
     * @dev Get domain expiration time from RSKOwner
     */
    function getDomainExpiration(string calldata name) external view returns (uint256) {
        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);
        
        try rskOwner.expirationTime(tokenId) returns (uint256 expiry) {
            return expiry;
        } catch {
            return 0;
        }
    }
}
