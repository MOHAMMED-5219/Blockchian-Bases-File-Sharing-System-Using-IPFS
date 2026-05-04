import { ethers } from "ethers";
import contractAddressJson from "./contractAddress.json";
import abi from "./FileStorage.abi.json";

export const FILE_STORAGE_ADDRESS = contractAddressJson?.FileStorage;
export const FILE_STORAGE_ABI = abi;

export function getEthereum() {
  return window.ethereum;
}

/**
 * Requests MetaMask connection and returns signer + address.
 */
export async function connectWallet() {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new Error("MetaMask not detected. Please install MetaMask.");
  }

  const provider = new ethers.BrowserProvider(ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { provider, signer, address };
}

export function getFileStorageContract(signerOrProvider) {
  if (!FILE_STORAGE_ADDRESS) {
    throw new Error(
      "Missing contract address. Deploy the contract to write frontend/src/utils/contractAddress.json"
    );
  }

  return new ethers.Contract(FILE_STORAGE_ADDRESS, FILE_STORAGE_ABI, signerOrProvider);
}
