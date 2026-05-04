# DFSS — Decentralized File Sharing (Beginner)

Tech stack: React (Vite) + MetaMask + ethers.js + Solidity + Hardhat + IPFS (Pinata).

## 1) Prereqs

- Node.js (LTS recommended)
- MetaMask installed in your browser
- A Pinata account + a **Pinata JWT**

## 2) Setup

### A) Frontend env

Create `frontend/.env`:

```bash
VITE_PINATA_JWT=YOUR_PINATA_JWT
# optional
# VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs
```

### B) Install deps

At repo root:

```bash
npm install
```

Frontend deps were already installed during scaffolding, but if needed:

```bash
cd frontend
npm install
```

## 3) Run locally (Hardhat node + deploy)

Terminal 1:

```bash
npm run node
```

Terminal 2:

```bash
npm run compile
npm run deploy:localhost
```

The deploy script writes these files for the frontend:

- `frontend/src/utils/contractAddress.json`
- `frontend/src/utils/FileStorage.abi.json`

## 4) Start the React app

```bash
npm run dev
```

This works from the repo root (recommended). You can also run it from inside `frontend/`:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173, connect MetaMask to `Localhost 8545`, then upload a file.

## Notes

- This is a beginner demo: `getMyFiles()` loops through the full on-chain array, which is fine for small lists.
