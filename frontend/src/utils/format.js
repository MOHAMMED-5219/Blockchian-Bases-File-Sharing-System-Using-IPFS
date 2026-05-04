export function formatTimestamp(secondsOrBigInt) {
  if (secondsOrBigInt === null || secondsOrBigInt === undefined) return "-";

  // ethers v6 may give bigint for uint256
  const seconds = typeof secondsOrBigInt === "bigint" ? Number(secondsOrBigInt) : Number(secondsOrBigInt);
  if (!Number.isFinite(seconds)) return "-";

  const date = new Date(seconds * 1000);
  return date.toLocaleString();
}

export function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
