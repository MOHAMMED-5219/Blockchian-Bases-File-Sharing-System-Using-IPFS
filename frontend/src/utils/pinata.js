import axios from "axios";

const PINATA_PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

/**
 * Uploads a File object to IPFS through Pinata.
 * @param {File} file Browser File
 * @returns {Promise<{ cid: string }>} CID (IpfsHash)
 */
export async function uploadFileToIPFS(file) {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  if (!jwt) {
    throw new Error("Missing VITE_PINATA_JWT (see frontend/.env.example)");
  }
  if (!file) {
    throw new Error("No file selected");
  }

  const formData = new FormData();
  formData.append("file", file);

  // Optional metadata; keeps the original filename in Pinata.
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: file.name })
  );

  const res = await axios.post(PINATA_PIN_FILE_URL, formData, {
    maxBodyLength: Infinity,
    headers: {
      Authorization: `Bearer ${jwt}`,
      // Let the browser set the multipart boundary header
    },
  });

  const cid = res?.data?.IpfsHash;
  if (!cid) {
    throw new Error("Pinata upload succeeded but no CID returned");
  }

  return { cid };
}

export function getIpfsGatewayUrl(cid) {
  const gatewayBase = import.meta.env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";
  return `${gatewayBase}/${cid}`;
}
