// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFIFSRegistrar
 * @dev Interface for First-In-First-Served Registrar
 * Handles domain registration with RIF token payments
 */
interface IFIFSRegistrar {
    function register(string memory name, address owner, bytes32 secret, uint256 duration) external;
    function available(string memory name) external view returns (bool);
    function price(string memory name, uint256 duration) external view returns (uint256);
}

