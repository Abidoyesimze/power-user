// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IRNS.sol";
import "./interfaces/IRSKOwnerImprove.sol";
import "./interfaces/IAddrResolver.sol";
import "./interfaces/IFIFSRegistrar.sol";
import "./interfaces/IFIFSAddrRegistrar.sol"; // NEW: Add this interface
import "./interfaces/IRenewer.sol";
import "./interfaces/IERC20.sol";

/**
 * @title RNSBulkManager - Fixed
 * @dev Uses FIFSAddrRegistrar to properly set resolver and address during registration
 */
contract RNSBulkManager {
    // RNS Contract Addresses
    IRNS public immutable rnsRegistry;
    IRSKOwner public immutable rskOwner;
    IAddrResolver public immutable addrResolver;
    IFIFSRegistrar public immutable fifsRegistrar; // For commits
    IFIFSAddrRegistrar public immutable fifsAddrRegistrar; // NEW: For registration with address
    IRenewer public immutable renewer;
    IERC20 public immutable rifToken;
    
    // Events
    event BulkRegistration(address indexed user, uint256 count, uint256 totalCost);
    event BulkRenewal(address indexed user, uint256 count, uint256 totalCost);
    event BulkAddressUpdate(address indexed user, uint256 count);
    event BulkMultiChainAddressUpdate(address indexed user, uint256 count);
    event OperationFailed(uint256 indexed index, string reason);
    event DomainAvailabilityChecked(string indexed name, bool available);
    
    // Structs
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
    
    uint256 public constant PRICE_PER_YEAR = 1 * 10**17; // 0.1 RIF
    
    /**
     * @dev Constructor
     * NOTE: _fifsAddrRegistrar parameter added
     */
    constructor(
        address _rnsRegistry,
        address _rskOwner,
        address _addrResolver,
        address _fifsRegistrar,
        address _fifsAddrRegistrar, // NEW: Add FIFSAddrRegistrar
        address _renewer,
        address _rifToken
    ) {
        require(_rnsRegistry != address(0), "Invalid RNS Registry");
        require(_rskOwner != address(0), "Invalid RSK Owner");
        require(_addrResolver != address(0), "Invalid Addr Resolver");
        require(_fifsRegistrar != address(0), "Invalid FIFS Registrar");
        require(_fifsAddrRegistrar != address(0), "Invalid FIFS Addr Registrar");
        require(_renewer != address(0), "Invalid Renewer");
        require(_rifToken != address(0), "Invalid RIF Token");
        
        rnsRegistry = IRNS(_rnsRegistry);
        rskOwner = IRSKOwner(_rskOwner);
        addrResolver = IAddrResolver(_addrResolver);
        fifsRegistrar = IFIFSRegistrar(_fifsRegistrar);
        fifsAddrRegistrar = IFIFSAddrRegistrar(_fifsAddrRegistrar); // NEW
        renewer = IRenewer(_renewer);
        rifToken = IERC20(_rifToken);
    }
    
    /**
     * @dev Check if a domain is available
     */
    function isDomainAvailable(string calldata name) public view returns (bool available) {
        bytes32 label = keccak256(bytes(name));
        bytes32 rskNode = keccak256(abi.encodePacked(bytes32(0x0), keccak256("rsk")));
        bytes32 node = keccak256(abi.encodePacked(rskNode, label));
        
        address registryOwner;
        try rnsRegistry.owner(node) returns (address owner) {
            registryOwner = owner;
        } catch {
            return true;
        }
        
        if (registryOwner == address(0)) {
            return true;
        }
        
        uint256 tokenId = uint256(label);
        
        try rskOwner.ownerOf(tokenId) returns (address) {
            try rskOwner.expirationTime(tokenId) returns (uint256 expiry) {
                return expiry < block.timestamp;
            } catch {
                return false;
            }
        } catch {
            if (registryOwner == address(0)) {
                return true;
            } else {
                return false;
            }
        }
    }
    
    /**
     * @dev Batch check availability
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
     * @dev Bulk register - FIXED to use FIFSAddrRegistrar
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
        
        // Pre-check availability
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
            
            uint256 durationInYears = (requests[i].duration * 100) / 31536000;
            uint256 cost = (PRICE_PER_YEAR * durationInYears) / 100;
            
            if (cost < 1 * 10**16) {
                cost = 1 * 10**16;
            }
            
            totalCost += cost;
        }
        
        require(totalCost > 0, "No domains available for registration");
        
        // Transfer tokens
        require(
            rifToken.transferFrom(msg.sender, address(this), totalCost),
            "RIF token transfer failed"
        );
        
        // IMPORTANT: Approve FIFSAddrRegistrar (not basic FIFS)
        rifToken.approve(address(fifsAddrRegistrar), totalCost);
        
        // Process registrations using FIFSAddrRegistrar
        for (uint256 i = 0; i < requests.length; i++) {
            if (!results[i].success && bytes(results[i].errorMessage).length > 0) {
                continue;
            }
            
            // FIXED: Use fifsAddrRegistrar instead of fifsRegistrar
            // This will set both the domain owner AND the address resolution
            try fifsAddrRegistrar.register(
                requests[i].name,
                requests[i].owner,
                requests[i].secret,
                requests[i].duration,
                requests[i].addr  // This address will be set in the resolver
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
     * @dev Bulk commit - uses basic FIFS registrar for commits
     */
    function bulkCommit(RegistrationRequest[] calldata requests) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(requests.length > 0, "Empty request array");
        require(requests.length <= 50, "Too many requests (max 50)");
        
        results = new OperationResult[](requests.length);
        uint256 successCount = 0;
        
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
            
            // Commit using basic FIFS registrar
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
    
    // ... (Keep all other functions: bulkRenew, bulkRenewByTokenId, bulkSetAddress, 
    // bulkSetResolver, bulkSetMultiChainAddress, multicall, verifyOwnership, 
    // calculateRegistrationCost, calculateRenewalCost, recoverTokens, etc.)
    // These remain unchanged from the complete version
    
    /**
     * @dev Helper function to calculate total cost for registrations
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
     * @dev Get domain owner from RNS Registry
     */
    function getDomainOwner(string calldata name) external view returns (address) {
        bytes32 label = keccak256(bytes(name));
        bytes32 rskNode = keccak256(abi.encodePacked(bytes32(0x0), keccak256("rsk")));
        bytes32 node = keccak256(abi.encodePacked(rskNode, label));
        
        return rnsRegistry.owner(node);
    }
    
    /**
     * @dev Get domain expiration time
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
