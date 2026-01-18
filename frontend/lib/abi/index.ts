import RNSBulkManagerABI from './abi.json';

export const RNS_BULK_MANAGER_ADDRESS = '0xdbb6bcea1e9a701ac2692550a0ae0d18bb48e899';

// Extract the abi array from the Hardhat artifact
export const RNS_BULK_MANAGER_ABI = RNSBulkManagerABI.abi || RNSBulkManagerABI;

const rnsBulkManagerConfig = {
  address: RNS_BULK_MANAGER_ADDRESS,
  abi: RNS_BULK_MANAGER_ABI,
};

export default rnsBulkManagerConfig;

