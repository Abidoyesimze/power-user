import RNSBulkManagerABI from './abi.json';

export const RNS_BULK_MANAGER_ADDRESS = '0xdd190753dd92104de84555892344c05b9c009577';

// Extract the abi array from the Hardhat artifact
export const RNS_BULK_MANAGER_ABI = RNSBulkManagerABI.abi || RNSBulkManagerABI;

const rnsBulkManagerConfig = {
  address: RNS_BULK_MANAGER_ADDRESS,
  abi: RNS_BULK_MANAGER_ABI,
};

export default rnsBulkManagerConfig;

