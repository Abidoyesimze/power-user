// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRSKOwner
 * @dev Interface for RSK Owner contract (ERC-721 compliant)
 * Manages domain ownership and expiration for .rsk domains
 */
interface IRSKOwner {
    /**
     * @dev Returns the owner of the given tokenId (domain label hash)
     * Reverts if token doesn't exist or is expired
     */
    function ownerOf(uint256 tokenId) external view returns (address owner);
    
    /**
     * @dev Returns the expiration time of a domain
     * @param tokenId The token ID (keccak256 of domain label)
     * @return Expiration timestamp
     */
    function expirationTime(uint256 tokenId) external view returns (uint256);
    
    /**
     * @dev Check if a domain is available (not owned or expired)
     * @param tokenId The token ID to check
     * @return available True if domain can be registered
     */
    function available(uint256 tokenId) external view returns (bool available);
    
    /**
     * @dev Renew a domain by tokenId
     * @param tokenId The token ID to renew
     * @param duration Duration in seconds to extend
     */
    function renew(uint256 tokenId, uint256 duration) external;
    
    /**
     * @dev Transfer domain ownership
     */
    function transferFrom(address from, address to, uint256 tokenId) external;
    
    /**
     * @dev Safe transfer with data
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;
    
    /**
     * @dev Approve another address to transfer the domain
     */
    function approve(address to, uint256 tokenId) external;
    
    /**
     * @dev Get approved address for a domain
     */
    function getApproved(uint256 tokenId) external view returns (address operator);
    
    /**
     * @dev Set approval for all domains
     */
    function setApprovalForAll(address operator, bool approved) external;
    
    /**
     * @dev Check if operator is approved for all domains
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}
