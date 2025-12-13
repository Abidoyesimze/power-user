import RNSBulkManagerABI from './abi.json';

export const RNS_BULK_MANAGER_ADDRESS = '0x6621e4f2fc0761ab31d1b89babef2be0a83901ab';

// Extract the abi array from the Hardhat artifact
export const RNS_BULK_MANAGER_ABI = RNSBulkManagerABI.abi || RNSBulkManagerABI;

const rnsBulkManagerConfig = {
  address: RNS_BULK_MANAGER_ADDRESS,
  abi: RNS_BULK_MANAGER_ABI,
};

export default rnsBulkManagerConfig;

