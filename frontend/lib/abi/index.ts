import RNSBulkManagerABI from './abi.json';

export const RNS_BULK_MANAGER_ADDRESS = '0x1ed36feb312b9d464d95fc1bab4b286ddc793341';

// Extract the abi array from the Hardhat artifact
export const RNS_BULK_MANAGER_ABI = RNSBulkManagerABI.abi || RNSBulkManagerABI;

const rnsBulkManagerConfig = {
  address: RNS_BULK_MANAGER_ADDRESS,
  abi: RNS_BULK_MANAGER_ABI,
};

export default rnsBulkManagerConfig;

