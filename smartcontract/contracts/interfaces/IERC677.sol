// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC677
 * @dev Interface for ERC-677 Token Standard (transferAndCall)
 */
interface IERC677 {
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool success);
}
