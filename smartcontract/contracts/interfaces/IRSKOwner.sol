// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRSKOwner
 * @dev Interface for RSK Owner contract (ERC-721 domain ownership)
 * Manages domain ownership as NFTs with expiration dates
 */
interface IRSKOwner {
    function ownerOf(uint256 tokenId) external view returns (address);
    function expirationTime(uint256 tokenId) external view returns (uint256);
    function available(uint256 tokenId) external view returns (bool);
    
    function register(
        string memory name,
        address owner,
        bytes32 secret,
        uint256 duration
    ) external;
    
    function renew(uint256 tokenId, uint256 duration) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function reclaim(uint256 tokenId, address newOwner) external;
}

