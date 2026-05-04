import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

import WalletBar from "./components/WalletBar";
import FileUploader from "./components/FileUploader";

import {
  connectWallet,
  getEthereum,
  getFileStorageContract,
} from "./utils/web3";

import { uploadFileToIPFS } from "./utils/pinata";

function App() {
  const [address, setAddress] = useState("");
  const [signer, setSigner] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [pin, setPin] = useState("");

  const [downloadCid, setDownloadCid] = useState("");
  const [downloadPin, setDownloadPin] = useState("");

  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isReady = useMemo(() => Boolean(address && signer), [address, signer]);

  const onConnect = useCallback(async () => {
    setIsConnecting(true);
    setError("");
    setNotice("");

    try {
      const { provider, signer, address } = await connectWallet();
      setSigner(signer);
      setAddress(address);
    } catch (e) {
      setError(e?.message || "Wallet connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const onUpload = useCallback(async () => {
    setError("");
    setNotice("");

    if (!isReady) {
      setError("Connect your wallet first.");
      return;
    }
    if (!selectedFile) {
      setError("Select a file first.");
      return;
    }
    if (!pin) {
      setError("Enter PIN first.");
      return;
    }

    setIsUploading(true);

    try {
      const { cid } = await uploadFileToIPFS(selectedFile);
      const contract = getFileStorageContract(signer);

      const tx = await contract.uploadFile(cid, selectedFile.name, pin);
      setNotice("Transaction sent. Waiting for confirmation...");
      await tx.wait();

      setNotice(`Upload complete! CID: ${cid}`);
      setSelectedFile(null);
      setPin("");
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [isReady, selectedFile, signer, pin]);

  const handleDownload = useCallback(async () => {
    setError("");
    setNotice("");

    if (!isReady) {
      setError("Connect your wallet first.");
      return;
    }

    const cid = downloadCid.trim();
    const pinValue = downloadPin;

    if (!cid) {
      setError("Enter CID first.");
      return;
    }
    if (!pinValue) {
      setError("Enter PIN first.");
      return;
    }

    setIsDownloading(true);

    try {
      setNotice("Verifying CID + PIN...");

      const contract = getFileStorageContract(signer);
      const ok = await contract.verifyFile(cid, pinValue);

      if (!ok) {
        alert("Wrong CID or PIN");
        return;
      }

      setNotice("Downloading...");

      const gatewayBase =
        import.meta.env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";
      const rawUrl = `${gatewayBase}/${cid}`;
      const downloadUrl = `${rawUrl}?download=1`;

      try {
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`Gateway error: ${res.status}`);

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = cid;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);

        setNotice("Download started.");
      } catch {
        // Fallback if CORS/gateway blocks fetch: open gateway in a new tab.
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
        setNotice("Opened download link.");
      }
    } catch (e) {
      const msg = e?.message || "Download verification failed";

      if (
        e?.code === "BAD_DATA" ||
        /could not decode result data/i.test(msg) ||
        /value=\"0x\"/i.test(msg)
      ) {
        setError(
          "Contract call failed (likely wrong network/contract address). Connect MetaMask to the same network where you deployed the contract (Localhost 8545 for local dev), redeploy, then try again."
        );
        return;
      }

      setError(msg);
    } finally {
      setIsDownloading(false);
    }
  }, [isReady, downloadCid, downloadPin, signer]);

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts) => {
      const next = accounts?.[0] || "";
      setAddress(next);
      setSigner(null);
      setNotice("Account changed. Please reconnect.");
    };

    const handleChainChanged = () => {
      setSigner(null);
      setNotice("Network changed. Please reconnect.");
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return (
    <div className="page">
      <header className="header">
        <div className="titleBlock">
          <h1 className="pageTitle">Decentralized File Sharing</h1>
          <p className="muted">
            React + Pinata (IPFS) + Solidity + Hardhat + ethers + MetaMask
          </p>
        </div>
      </header>

      <WalletBar address={address} onConnect={onConnect} isConnecting={isConnecting} />

      {error || notice ? (
        <section className="statusStack" aria-live="polite">
          {error ? <div className="alert error">{error}</div> : null}
          {notice ? <div className="alert notice">{notice}</div> : null}
        </section>
      ) : null}

      <main className="contentGrid">
        <div className="stack">
          <FileUploader
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            onUpload={onUpload}
            isUploading={isUploading}
            walletReady={isReady}
            canUpload={Boolean(pin)}
          />

          <section className="card">
            <h2>Security PIN</h2>
            <p className="muted">
              Required for uploads. This demo stores the PIN on-chain — don’t reuse a real password.
            </p>
            <div className="row">
              <label className="field">
                <span className="label">PIN</span>
                <input
                  className="input"
                  type="password"
                  inputMode="numeric"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={isUploading}
                  autoComplete="off"
                />
              </label>
            </div>
          </section>

          <section className="card">
            <h2>Download File</h2>
            <p className="muted">Enter a CID + PIN to verify and download the file from IPFS.</p>

            <div className="row">
              <label className="field">
                <span className="label">CID</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Qm... / bafy..."
                  value={downloadCid}
                  onChange={(e) => setDownloadCid(e.target.value)}
                  disabled={isDownloading}
                  autoComplete="off"
                />
              </label>

              <label className="field">
                <span className="label">PIN</span>
                <input
                  className="input"
                  type="password"
                  inputMode="numeric"
                  placeholder="Enter PIN"
                  value={downloadPin}
                  onChange={(e) => setDownloadPin(e.target.value)}
                  disabled={isDownloading}
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="row">
              <button
                className="primary"
                onClick={handleDownload}
                disabled={isDownloading || !isReady || !downloadCid.trim() || !downloadPin}
              >
                {isDownloading ? "Downloading..." : "Download File"}
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="footer muted">
        <p>
          Tip: after deploying, the deploy script writes the contract address + ABI into
          <code> frontend/src/utils/</code>.
        </p>
      </footer>
    </div>
  );
}

export default App;