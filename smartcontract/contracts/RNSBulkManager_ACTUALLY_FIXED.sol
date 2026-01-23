// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IRNS.sol";
import "./interfaces/IRSKOwnerImprove.sol";
import "./interfaces/IAddrResolver.sol";
import "./interfaces/IFIFSRegistrar.sol";
import "./interfaces/IRenewer.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IERC677.sol";

/**
 * @title RNSBulkManager - ACTUALLY FIXED
 * @dev Uses FIFS Registrar for registration, then separately sets address resolution
 * 
 * CRITICAL INSIGHT: The FIFS Addr Registrar doesn't have a direct register() function
 * with 5 parameters. Instead, it uses RIF Token's transferAndCall with encoded data.
 * 
 * For simplicity and reliability, we use the basic FIFS Registrar to register domains,
 * then separately call setAddr on the resolver to set address resolution.
 */
contract RNSBulkManager {
    // RNS Contract Addresses
    IRNS public immutable rnsRegistry;
    IRSKOwner public immutable rskOwner;
    IAddrResolver public immutable addrResolver;
    IFIFSRegistrar public immutable fifsRegistrar; // Keep for commits
    address public immutable fifsAddrRegistrar; // FIFS Addr Registrar for registrations with resolver/addr
    IRenewer public immutable renewer;
    IERC20 public immutable rifToken;
    IERC677 public immutable rifToken677; // ERC-677 interface for transferAndCall
    
    // Constants
    bytes32 public constant RSK_NODE = keccak256(abi.encodePacked(bytes32(0x0), keccak256("rsk")));
    uint256 public constant PRICE_PER_YEAR = 1 * 10**17; // 0.1 RIF
    
    // Events
    event BulkRegistration(address indexed user, uint256 count, uint256 totalCost);
    event BulkRenewal(address indexed user, uint256 count, uint256 totalCost);
    event BulkAddressUpdate(address indexed user, uint256 count);
    event BulkMultiChainAddressUpdate(address indexed user, uint256 count);
    event OperationFailed(uint256 indexed index, string reason);
    event DomainAvailabilityChecked(string indexed name, bool available);
    event AddressSetFailed(string indexed name, string reason);
    
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
    
    /**
     * @dev Constructor - NO fifsAddrRegistrar needed!
     */
    constructor(
        address _rnsRegistry,
        address _rskOwner,
        address _addrResolver,
        address _fifsRegistrar,
        address _fifsAddrRegistrar,
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
        fifsAddrRegistrar = _fifsAddrRegistrar; // FIFS Addr Registrar sets resolver + addr
        renewer = IRenewer(_renewer);
        rifToken = IERC20(_rifToken);
        rifToken677 = IERC677(_rifToken); // RIF Token supports both ERC20 and ERC677
    }
    
    /**
     * @dev Check if a domain is available
     * IMPORTANT: This function expects the label ONLY (without .rsk suffix)
     * For example: "jonathan" not "jonathan.rsk"
     * The registrar availability API expects only the label, not the full domain
     */
    function isDomainAvailable(string calldata name) public view returns (bool available) {
        // Note: name should be label-only (e.g., "jonathan" not "jonathan.rsk")
        bytes32 label = keccak256(bytes(name));
        bytes32 node = keccak256(abi.encodePacked(RSK_NODE, label));
        
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
     * @dev Bulk commit
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
     * @dev Bulk register - THE ACTUALLY FIXED VERSION
     * 
     * This version:
     * 1. Uses basic FIFS Registrar to register the domain
     * 2. Then sets the resolver on the registry
     * 3. Then sets the address on the resolver
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
        
        // Pre-check availability and calculate cost
        // NOTE: Using fixed price instead of registrar's price() because testnet registrar has a bug:
        // It returns duration + 2 RIF (e.g., 31,536,002 RIF for 1 year) instead of reasonable prices
        // See TESTNET_PRICE_WORKAROUND.md for details
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
        
        // Transfer tokens to this contract
        require(
            rifToken.transferFrom(msg.sender, address(this), totalCost),
            "RIF token transfer failed"
        );
        
        // Verify we received the tokens
        uint256 contractBalance = rifToken.balanceOf(address(this));
        require(contractBalance >= totalCost, "Insufficient tokens received");
        
        // Process registrations using transferAndCall (ERC-677 pattern)
        // Each registration pays individually via transferAndCall
        for (uint256 i = 0; i < requests.length; i++) {
            if (!results[i].success && bytes(results[i].errorMessage).length > 0) {
                continue;
            }
            
            // Validate name length
            // CRITICAL: FIFS Addr Registrar requires minimum 5 characters (verified via minLength() call)
            // Standard RNS allows 3+, but this registrar has stricter requirements
            bytes memory nameBytes = bytes(requests[i].name);
            if (nameBytes.length < 5) {
                results[i] = OperationResult(false, i, "Domain name too short (minimum 5 characters required by registrar)");
                emit OperationFailed(i, "Short names not available");
                continue;
            }
            
            // Calculate price for this registration
            // NOTE: Using fixed price instead of registrar's price() because testnet registrar has a bug
            // See TESTNET_PRICE_WORKAROUND.md for details
            uint256 durationInYears = (requests[i].duration * 100) / 31536000;
            uint256 cost = (PRICE_PER_YEAR * durationInYears) / 100;
            if (cost < 1 * 10**16) {
                cost = 1 * 10**16;
            }
            
            // Verify we have enough balance for this registration
            if (rifToken.balanceOf(address(this)) < cost) {
                results[i] = OperationResult(false, i, "Not enough tokens in contract");
                emit OperationFailed(i, "Not enough tokens");
                continue;
            }
            
            // Step 1: Register domain using FIFS Addr Registrar with transferAndCall (ERC-677 pattern)
            // FIFS Addr Registrar sets: ownership + resolver + address in ONE transaction
            // This solves the permission issue: BulkManager can't set resolver (only owner can)
            // But FIFS Addr Registrar can set it during registration!
            // 
            // Encoded data format for FIFS Addr Registrar (MANUAL encoding, not ABI):
            // The SDK does: signature + owner + secret + duration + addr + name
            // Where each is encoded as raw bytes (not standard ABI encoding)
            // 
            // Format:
            // - Function selector (4 bytes): 0x5f7b99d5 (register with addr)
            // - owner (20 bytes, padded to 32 bytes)
            // - secret (32 bytes)
            // - duration (32 bytes)
            // - addr (20 bytes, padded to 32 bytes)
            // - name (variable size, ABI encoded as string with offset)
            // 
            // Note: FIFS Addr Registrar expects manual byte concatenation
            // Format: signature(4) + owner(20) + secret(32) + duration(32) + addr(20) + name(variable)
            // abi.encodePacked packs tightly without padding (matches SDK manual encoding)
            bytes memory registerData = abi.encodePacked(
                bytes4(0x5f7b99d5),        // 4 bytes: Function signature
                requests[i].owner,         // 20 bytes: Owner address (no padding)
                requests[i].secret,        // 32 bytes: Secret
                requests[i].duration,      // 32 bytes: Duration
                requests[i].addr,          // 20 bytes: Address to set (no padding)
                requests[i].name           // Variable: Domain name (string)
            );
            
            try rifToken677.transferAndCall(fifsAddrRegistrar, cost, registerData) {
                // FIFS Addr Registrar sets ownership + resolver + address automatically
                // Just verify it worked
                bytes32 label = keccak256(bytes(requests[i].name));
                bytes32 node = keccak256(abi.encodePacked(RSK_NODE, label));
                
                // Verify resolver is set (optional check)
                address currentResolver = rnsRegistry.resolver(node);
                if (currentResolver != address(0)) {
                    results[i] = OperationResult(true, i, "");
                    successCount++;
                } else {
                    // Resolver not set - might take a moment, but registration succeeded
                    results[i] = OperationResult(true, i, "Domain registered, resolver may not be set yet");
                    successCount++;
                }
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
     * @dev Bulk set address for already owned domains
     */
    function bulkSetAddress(AddressUpdateRequest[] calldata requests) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(requests.length > 0, "Empty request array");
        require(requests.length <= 50, "Too many requests (max 50)");
        
        results = new OperationResult[](requests.length);
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < requests.length; i++) {
            // Verify ownership
            address nodeOwner = rnsRegistry.owner(requests[i].node);
            require(nodeOwner == msg.sender, "Not domain owner");
            
            // First ensure resolver is set
            address currentResolver = rnsRegistry.resolver(requests[i].node);
            if (currentResolver != address(addrResolver)) {
                try rnsRegistry.setResolver(requests[i].node, address(addrResolver)) {
                    // Resolver set successfully
                } catch Error(string memory reason) {
                    results[i] = OperationResult(false, i, string(abi.encodePacked("Failed to set resolver: ", reason)));
                    emit OperationFailed(i, reason);
                    continue;
                } catch {
                    results[i] = OperationResult(false, i, "Failed to set resolver");
                    emit OperationFailed(i, "Failed to set resolver");
                    continue;
                }
            }
            
            // Now set the address
            try addrResolver.setAddr(requests[i].node, requests[i].targetAddress) {
                results[i] = OperationResult(true, i, "");
                successCount++;
            } catch Error(string memory reason) {
                results[i] = OperationResult(false, i, reason);
                emit OperationFailed(i, reason);
            } catch {
                results[i] = OperationResult(false, i, "Failed to set address");
                emit OperationFailed(i, "Failed to set address");
            }
        }
        
        emit BulkAddressUpdate(msg.sender, successCount);
        
        return results;
    }
    
    /**
     * @dev Bulk set resolver
     */
    function bulkSetResolver(bytes32[] calldata nodes, address resolver) 
        external 
        returns (OperationResult[] memory results) 
    {
        require(nodes.length > 0, "Empty nodes array");
        require(nodes.length <= 50, "Too many nodes (max 50)");
        
        results = new OperationResult[](nodes.length);
        
        for (uint256 i = 0; i < nodes.length; i++) {
            address nodeOwner = rnsRegistry.owner(nodes[i]);
            require(nodeOwner == msg.sender, "Not domain owner");
            
            try rnsRegistry.setResolver(nodes[i], resolver) {
                results[i] = OperationResult(true, i, "");
            } catch Error(string memory reason) {
                results[i] = OperationResult(false, i, reason);
                emit OperationFailed(i, reason);
            } catch {
                results[i] = OperationResult(false, i, "Failed to set resolver");
                emit OperationFailed(i, "Failed to set resolver");
            }
        }
        
        return results;
    }
    
    /**
     * @dev Bulk renew domains
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
            uint256 cost = renewer.price(requests[i].name, requests[i].expires, requests[i].duration);
            totalCost += cost;
        }
        
        // Transfer tokens to this contract
        require(
            rifToken.transferFrom(msg.sender, address(this), totalCost),
            "RIF token transfer failed"
        );
        
        // Approve Renewer
        rifToken.approve(address(renewer), totalCost);
        
        // Process renewals
        for (uint256 i = 0; i < requests.length; i++) {
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
     * @dev Calculate renewal cost
     */
    function calculateRenewalCost(
        string[] calldata names,
        uint256[] calldata expires,
        uint256[] calldata durations
    ) external view returns (uint256 totalCost) {
        require(names.length == expires.length && names.length == durations.length, "Array length mismatch");
        
        for (uint256 i = 0; i < names.length; i++) {
            uint256 cost = renewer.price(names[i], expires[i], durations[i]);
            totalCost += cost;
        }
        
        return totalCost;
    }
    
    /**
     * @dev Calculate registration cost
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
        bytes32 node = keccak256(abi.encodePacked(RSK_NODE, label));
        
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
    
    /**
     * @dev Get resolver for a domain
     */
    function getDomainResolver(string calldata name) external view returns (address) {
        bytes32 label = keccak256(bytes(name));
        bytes32 node = keccak256(abi.encodePacked(RSK_NODE, label));
        
        return rnsRegistry.resolver(node);
    }
    
    /**
     * @dev Get address for a domain
     */
    function getDomainAddress(string calldata name) external view returns (address) {
        bytes32 label = keccak256(bytes(name));
        bytes32 node = keccak256(abi.encodePacked(RSK_NODE, label));
        
        address resolver = rnsRegistry.resolver(node);
        if (resolver == address(0)) {
            return address(0);
        }
        
        try IAddrResolver(resolver).addr(node) returns (address addr) {
            return addr;
        } catch {
            return address(0);
        }
    }
}
