import RNSBulkManagerABI from './abi.json';

export const RNS_BULK_MANAGER_ADDRESS = '0xbf1b2ca2cc17bd98679d584575d549c62b3214eb';

// Extract the abi array from the Hardhat artifact
export const RNS_BULK_MANAGER_ABI = RNSBulkManagerABI.abi || RNSBulkManagerABI;

const rnsBulkManagerConfig = {
  address: RNS_BULK_MANAGER_ADDRESS,
  abi: RNS_BULK_MANAGER_ABI,
};

export default rnsBulkManagerConfig;

