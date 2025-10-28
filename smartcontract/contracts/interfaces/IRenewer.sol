// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRenewer
 * @dev Interface for Domain Renewer contract
 * Handles domain renewals with RIF token payments
 */
interface IRenewer {
    function renew(string memory name, uint256 duration) external returns (uint256);
    function price(string memory name, uint256 duration) external view returns (uint256);
}

