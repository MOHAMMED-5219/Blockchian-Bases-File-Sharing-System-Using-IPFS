import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  CircleAlert,
  ClipboardCopy,
  ClipboardPaste,
  Download,
  Eye,
  EyeOff,
  HardDriveUpload,
  History,
  Link2,
  Loader2,
  Lock,
  PanelsTopLeft,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCircle2,
  Wallet,
  FileText,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import "./App.css";

import { connectWallet, getEthereum, getFileStorageContract } from "./utils/web3";
import { uploadFileToIPFS, getIpfsGatewayUrl } from "./utils/pinata";
import { formatTimestamp, shortenAddress } from "./utils/format";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function shortCid(cid) {
  if (!cid) return "-";
  if (cid.length <= 18) return cid;
  return `${cid.slice(0, 8)}...${cid.slice(-6)}`;
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Badge({ children, tone = "slate" }) {
  const toneClasses = {
    slate: "badge-slate",
    green: "badge-green",
    cyan: "badge-cyan",
    amber: "badge-amber",
    red: "badge-red",
    purple: "badge-purple",
  };

  return <span className={cn("badge", toneClasses[tone])}>{children}</span>;
}

function Panel({ className = "", children }) {
  return (
    <motion.section whileHover={{ y: -3 }} transition={{ duration: 0.25, ease: "easeOut" }} className={cn("panel", className)}>
      {children}
    </motion.section>
  );
}

function ActionButton({ variant = "primary", className = "", children, ...props }) {
  const styles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn("btn", styles[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

function Input({ className = "", ...props }) {
  return <input {...props} className={cn("input", className)} />;
}

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="label">
      {children}
    </label>
  );
}

function Step({ number, title, description, active = false }) {
  return (
    <div className="stepRow">
      <div className={cn("stepNumber", active && "stepNumberActive")}>{number}</div>
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </div>
  );
}

function App() {
  const [address, setAddress] = useState("");
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [pin, setPin] = useState("");
  const [downloadCid, setDownloadCid] = useState("");
  const [downloadPin, setDownloadPin] = useState("");
  const [showDownloadPin, setShowDownloadPin] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedCid, setGeneratedCid] = useState("");
  const [recentFiles, setRecentFiles] = useState([]);
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [fileMeta, setFileMeta] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dfss-file-meta") || "{}");
    } catch {
      return {};
    }
  });

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const isReady = useMemo(() => Boolean(address && signer), [address, signer]);
  const selectedFilePreview = selectedFile
    ? { name: selectedFile.name, size: formatBytes(selectedFile.size), type: selectedFile.type || "Unknown type" }
    : null;

  useEffect(() => {
    localStorage.setItem("dfss-file-meta", JSON.stringify(fileMeta));
  }, [fileMeta]);

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return undefined;

    const handleAccountsChanged = (accounts) => {
      setAddress(accounts?.[0] || "");
      setSigner(null);
      setNotice("Wallet account changed. Reconnect to refresh the dashboard.");
    };

    const handleChainChanged = () => {
      setSigner(null);
      setNotice("Network changed. Reconnect to continue.");
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const resetMessages = useCallback(() => {
    setError("");
    setNotice("");
  }, []);

  const copyToClipboard = useCallback(async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}`);
    }
  }, []);

  const refreshFiles = useCallback(
    async (nextSigner = signer) => {
      if (!nextSigner) return;

      try {
        const contract = getFileStorageContract(nextSigner);
        const records = await contract.getMyFiles();

        const mapped = records
          .map((record) => {
            const meta = fileMeta?.[record.cid] || {};
            return {
              fileName: record.fileName,
              cid: record.cid,
              timestamp: Number(record.timestamp),
              size: meta.size || "-",
              status: "Stored",
            };
          })
          .sort((a, b) => b.timestamp - a.timestamp);

        setRecentFiles(mapped);
      } catch {
        // Keep the dashboard usable even if the contract read is temporarily unavailable.
      }
    },
    [fileMeta, signer],
  );

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    resetMessages();

    try {
      const { signer: nextSigner, address: nextAddress } = await connectWallet();
      setSigner(nextSigner);
      setAddress(nextAddress);
      toast.success("Wallet connected");
      await refreshFiles(nextSigner);
    } catch (e) {
      const message = e?.message || "Wallet connection failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsConnecting(false);
    }
  }, [refreshFiles, resetMessages]);

  const handleUpload = useCallback(async () => {
    resetMessages();

    if (!isReady) {
      const message = "Connect your wallet first.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!selectedFile) {
      const message = "Choose a file before uploading.";
      setError(message);
      toast.error(message);
      return;
    }

    if (pin.length !== 4) {
      const message = "Enter a valid 4-digit PIN.";
      setError(message);
      toast.error(message);
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const { cid } = await uploadFileToIPFS(selectedFile, (percent) => {
        setUploadProgress(Math.max(10, Math.min(percent, 96)));
      });

      setGeneratedCid(cid);
      setUploadProgress(100);
      setFileMeta((prev) => ({
        ...prev,
        [cid]: {
          size: formatBytes(selectedFile.size),
          fileName: selectedFile.name,
          timestamp: Math.floor(Date.now() / 1000),
        },
      }));
      setNotice(`File uploaded to IPFS. CID: ${cid}`);
      toast.success("File uploaded to IPFS");
    } catch (e) {
      const message = e?.message || "Upload failed";
      setError(message);
      setUploadProgress(0);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [isReady, pin, resetMessages, selectedFile]);

  const handleStoreOnChain = useCallback(async () => {
    resetMessages();

    if (!isReady) {
      const message = "Connect your wallet first.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!generatedCid || !selectedFile || pin.length !== 4) {
      const message = "Upload a file and set a 4-digit PIN first.";
      setError(message);
      toast.error(message);
      return;
    }

    setIsStoring(true);

    try {
      const contract = getFileStorageContract(signer);
      const tx = await contract.uploadFile(generatedCid, selectedFile.name, pin);
      setNotice("Transaction sent. Waiting for confirmation...");
      await tx.wait();

      const record = {
        fileName: selectedFile.name,
        cid: generatedCid,
        timestamp: Math.floor(Date.now() / 1000),
        size: formatBytes(selectedFile.size),
        status: "Stored",
      };

      setRecentFiles((prev) => [record, ...prev.filter((item) => item.cid !== record.cid)]);
      setDownloadHistory((prev) => [{ action: "Stored on-chain", ...record }, ...prev]);
      setNotice("CID stored on-chain successfully.");
      toast.success("CID stored on-chain");
      setSelectedFile(null);
      setGeneratedCid("");
      setUploadProgress(0);
      await refreshFiles();
    } catch (e) {
      const message = e?.message || "On-chain storage failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsStoring(false);
    }
  }, [generatedCid, isReady, pin, refreshFiles, selectedFile, signer]);

  const handleVerifyAndDownload = useCallback(async () => {
    resetMessages();

    if (!isReady) {
      const message = "Connect your wallet first.";
      setError(message);
      toast.error(message);
      return;
    }

    const cid = downloadCid.trim();
    const valuePin = downloadPin.trim();

    if (!cid || !valuePin) {
      const message = "Enter both CID and PIN.";
      setError(message);
      toast.error(message);
      return;
    }

    setIsVerifying(true);

    try {
      const contract = getFileStorageContract(signer);
      const ok = await contract.verifyFile(cid, valuePin);

      if (!ok) {
        let message = "Verification failed. Check the CID and PIN.";

        try {
          const myFiles = await contract.getMyFiles();
          const matched = myFiles.find((file) => file.cid === cid);

          if (!matched) {
            message = "CID not found in your wallet records. Upload and store the file on-chain first.";
          } else {
            message = "CID found, but the PIN is incorrect. Use the same 4-digit PIN used during upload.";
          }
        } catch {
          // Keep the default message if the helper check fails.
        }

        setError(message);
        toast.error(message);
        return;
      }

      setIsDownloading(true);
      const gatewayUrl = `${getIpfsGatewayUrl(cid)}?download=1`;

      try {
        const response = await fetch(gatewayUrl);
        if (!response.ok) throw new Error(`Gateway error: ${response.status}`);

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = cid;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        window.open(gatewayUrl, "_blank", "noopener,noreferrer");
      }

      setNotice("Access verified. Download started.");
      toast.success("Download unlocked");
      setDownloadHistory((prev) => [
        {
          action: "Verified download",
          fileName: recentFiles.find((item) => item.cid === cid)?.fileName || "Unknown file",
          cid,
          size: recentFiles.find((item) => item.cid === cid)?.size || "-",
          timestamp: Math.floor(Date.now() / 1000),
          status: "Verified",
        },
        ...prev,
      ]);
    } catch (e) {
      const rawMessage = e?.message || "Download verification failed";

      if (
        e?.code === "BAD_DATA" ||
        /could not decode result data/i.test(rawMessage) ||
        /value=\"0x\"/i.test(rawMessage)
      ) {
        const networkMessage =
          "Contract call failed. Connect MetaMask to the same network where the contract is deployed (Localhost 8545 for local dev), then retry.";
        setError(networkMessage);
        toast.error(networkMessage);
        return;
      }

      const message = rawMessage;
      setError(message);
      toast.error(message);
    } finally {
      setIsVerifying(false);
      setIsDownloading(false);
    }
  }, [downloadCid, downloadPin, isReady, recentFiles, resetMessages, signer]);

  const workspaceSteps = [
    { title: "CONNECT Wallet", description: "Open MetaMask and authorize the workspace.", active: isReady },
    { title: "STORE CID", description: "Upload to IPFS and persist the CID on-chain.", active: Boolean(generatedCid) },
    { title: "VERIFY PIN", description: "Check the CID and PIN before downloading.", active: Boolean(downloadCid && downloadPin) },
  ];

  return (
    <div className="workspace-shell">
      <Toaster richColors position="top-right" />

      <div className="mainShell">
        <header className="topbar">
          <div className="topbarLeft">
            <div className="topbarBrand">
              <div className="topbarMark">
                <PanelsTopLeft className="h-5 w-5" />
              </div>
              <div>
                <p className="topbarKicker">Secure Decentralized File Storage</p>
                <h2>Premium Web3 Dashboard</h2>
              </div>
            </div>
          </div>

          <div className="topbarRight desktopOnly">
            <div className="walletPill">
              <UserCircle2 className="h-4 w-4 text-cyan-300" />
              <span>{address ? shortenAddress(address) : "No wallet connected"}</span>
            </div>
            <Badge tone={isReady ? "green" : "amber"}>{isReady ? "Connected" : "Disconnected"}</Badge>
            <div className="avatarBubble">
              <Bell className="h-4 w-4 text-cyan-300" />
            </div>
          </div>

          <div className="topbarRight mobileOnly">
            <Badge tone={isReady ? "green" : "amber"}>{isReady ? "Connected" : "Disconnected"}</Badge>
          </div>
        </header>

        <main className="contentScroll contentScrollSolo">
          <div className="dashboardGrid dashboardGridSolo">
            <section className="leftColumn">
              <Panel className="heroPanel">
                <div className="heroGlow" />
                <div className="heroCopy">
                  <Badge tone="cyan">SECURE FILE WORKSPACE</Badge>
                  <h3>Manage files with wallet-verified access.</h3>
                  <p>Upload files to IPFS, store CID on blockchain, and verify downloads securely with PIN protection.</p>
                  <div className="chipRow">
                    {["Wallet auth", "IPFS storage", "On-chain record", "PIN protected"].map((chip) => (
                      <span key={chip} className="chip">
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className="heroActions">
                    <ActionButton onClick={() => document.getElementById("upload-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                      <Upload className="h-4 w-4" />
                      Upload Now
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={() => document.getElementById("download-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                      <ArrowRight className="h-4 w-4" />
                      Learn More
                    </ActionButton>
                  </div>
                </div>

              </Panel>

              {(error || notice) && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("statusBanner", error ? "statusError" : "statusSuccess")}
                >
                  {error ? <CircleAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  <p>{error || notice}</p>
                </motion.div>
              )}

              <Panel id="upload-card">
                <div className="panelHeader">
                  <div>
                    <p className="sectionLabel">Upload File</p>
                    <h3>Drag and drop your file</h3>
                    <p>Upload to IPFS with a glassmorphism drop zone, then store the CID on-chain.</p>
                  </div>
                  <Badge tone="purple">IPFS + ON-CHAIN</Badge>
                </div>

                <div className="dropZone">
                  <div className="dropZoneRow">
                    <div className="dropIcon">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <h4>Choose a file from your device</h4>
                      <p>Drop files here or select them using the sleek file picker.</p>
                    </div>
                  </div>

                  <label className="fileButton">
                    <input
                      type="file"
                      className="hiddenInput"
                      onChange={(event) => {
                        resetMessages();
                        setSelectedFile(event.target.files?.[0] || null);
                        setGeneratedCid("");
                        setUploadProgress(0);
                      }}
                    />
                    Choose File
                  </label>

                  <div className="selectedFileCard">
                    <div>
                      <p className="mutedLabel">Selected file</p>
                      <p className="selectedFileName">{selectedFilePreview ? selectedFilePreview.name : "No file selected"}</p>
                      <p className="selectedFileMeta">{selectedFilePreview ? `${selectedFilePreview.type} · ${selectedFilePreview.size}` : "Choose a file to preview it here."}</p>
                    </div>
                    <Badge tone={selectedFilePreview ? "green" : "slate"}>{selectedFilePreview ? "Ready" : "Empty"}</Badge>
                  </div>

                  <div className="progressBlock">
                    <div className="progressBar">
                      <span style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <div className="progressMeta">
                      <span>Upload progress</span>
                      <span>{uploadProgress}%</span>
                    </div>
                  </div>

                  <div className="actionRow">
                    <ActionButton variant="secondary" onClick={handleStoreOnChain} disabled={isStoring || !generatedCid || !isReady}>
                      {isStoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                      {isStoring ? "Uploading" : "Upload"}
                    </ActionButton>
                  </div>

                  {generatedCid ? (
                    <div className="cidCard">
                      <div>
                        <p className="mutedLabel">Generated CID</p>
                        <p className="cidText">{generatedCid}</p>
                      </div>
                      <ActionButton variant="ghost" className="px-3 py-2" onClick={() => copyToClipboard(generatedCid, "CID")}>
                        <ClipboardCopy className="h-4 w-4" />
                        Copy CID
                      </ActionButton>
                    </div>
                  ) : null}
                </div>
              </Panel>

              <Panel>
                <div className="panelHeader">
                  <div>
                    <p className="sectionLabel">Security PIN</p>
                    <h3>Protect uploads with a PIN</h3>
                    <p>Use a 4-digit PIN for secure upload and download verification.</p>
                  </div>
                  <Badge tone={pin.length === 4 ? "green" : "amber"}>{pin.length === 4 ? "Valid" : "Required"}</Badge>
                </div>

                <div className="pinBlock">
                  <Label htmlFor="pin">Enter 4-digit PIN</Label>
                  <div className="inputIconWrap">
                    <Lock className="inputIcon" />
                    <Input
                      id="pin"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="1234"
                      value={pin}
                      onChange={(event) => {
                        setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                        setNotice("");
                        setError("");
                      }}
                      className="monoInput"
                    />
                  </div>
                  <p className="helperText">This PIN is required before your CID can be verified and downloaded.</p>
                </div>
              </Panel>

              <Panel id="download-card">
                <div className="panelHeader">
                  <div>
                    <p className="sectionLabel">Download File</p>
                    <h3>Verify and download securely</h3>
                    <p>Use the CID and PIN together to unlock the file download.</p>
                  </div>
                  <Badge tone={downloadCid && downloadPin ? "green" : "slate"}>{downloadCid && downloadPin ? "Prepared" : "Waiting"}</Badge>
                </div>

                <div className="downloadGridInputs">
                  <div>
                    <Label htmlFor="download-cid">CID</Label>
                    <div className="inputGroup">
                      <Input
                        id="download-cid"
                        placeholder="Enter CID"
                        value={downloadCid}
                        onChange={(event) => {
                          setDownloadCid(event.target.value);
                          setNotice("");
                          setError("");
                        }}
                        className="monoInput withRightIcon"
                      />
                      <div className="inputActions">
                        <button type="button" className="smallIconButton" onClick={() => copyToClipboard(downloadCid, "CID")} aria-label="Copy CID">
                          <ClipboardCopy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="smallIconButton"
                          onClick={async () => {
                            try {
                              const value = await navigator.clipboard.readText();
                              setDownloadCid(value.trim());
                              toast.success("CID pasted");
                            } catch {
                              toast.error("Clipboard unavailable");
                            }
                          }}
                          aria-label="Paste CID"
                        >
                          <ClipboardPaste className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="download-pin">PIN</Label>
                    <div className="inputGroup">
                      <Input
                        id="download-pin"
                        type={showDownloadPin ? "text" : "password"}
                        placeholder="Enter PIN"
                        value={downloadPin}
                        onChange={(event) => {
                          setDownloadPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                          setNotice("");
                          setError("");
                        }}
                        className="monoInput withRightIcon"
                      />
                      <button
                        type="button"
                        className="smallIconButton rightToggle"
                        onClick={() => setShowDownloadPin((value) => !value)}
                        aria-label="Toggle PIN visibility"
                      >
                        {showDownloadPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="actionRow">
                  <ActionButton variant="secondary" onClick={handleVerifyAndDownload} disabled={isVerifying || !downloadCid || !downloadPin}>
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {isVerifying ? "Verifying" : "Verify and Download"}
                  </ActionButton>
                  <ActionButton onClick={handleVerifyAndDownload} disabled={isDownloading || !downloadCid || !downloadPin}>
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {isDownloading ? "Downloading" : "Download File"}
                  </ActionButton>
                </div>
              </Panel>

              <p className="tipText">Tip: connect MetaMask first, then upload, store the CID, and use the same PIN to verify downloads later.</p>
            </section>

            <aside className="rightColumn">
              <Panel>
                <p className="sectionLabel">Workspace Status</p>
                <div className="statusTitleRow">
                  <span className="statusDot" />
                  <h3>Ready for secure sharing</h3>
                </div>
                <p className="statusText">This dashboard is optimized for wallet-verified file storage, on-chain CID records, and secure PIN-protected downloads.</p>

                <div className="stepList">
                  {workspaceSteps.map((step, index) => (
                    <div key={step.title} className="stepWrap">
                      {index < workspaceSteps.length - 1 ? <div className="stepConnector" /> : null}
                      <div className={cn("stepNumberWrap", step.active && "stepNumberActive")}>{index + 1}</div>
                      <div className="stepTextWrap">
                        <p className={cn("stepTitle", step.active && "stepTitleActive")}>{step.title}</p>
                        <p className="stepDescription">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel>
                <p className="sectionLabel">Workspace Access</p>
                <h3>Connect your wallet to continue</h3>
                <p className="statusText">MetaMask is required before you can upload files, store CIDs on-chain, or download protected content.</p>

                <div className="miniCardGrid">
                  <div className="miniCard">
                    <p>Wallet</p>
                    <strong>{isReady ? shortenAddress(address) : "Not connected"}</strong>
                  </div>
                  <div className="miniCard">
                    <p>Upload</p>
                    <strong>{selectedFile ? selectedFile.name : "No file selected"}</strong>
                  </div>
                  <div className="miniCard">
                    <p>Download</p>
                    <strong>{downloadCid ? shortCid(downloadCid) : "No CID entered"}</strong>
                  </div>
                </div>

                <ActionButton className="fullButton" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  {isConnecting ? "Connecting Wallet" : "Connect Wallet"}
                </ActionButton>
                <p className="walletHint">MetaMask is required to unlock the workspace.</p>
              </Panel>

              <Panel>
                <p className="sectionLabel">How It Works</p>
                <h3>Two-step flow</h3>
                <div className="howItWorks">
                  <Step
                    number={1}
                    active
                    title="Connect wallet"
                    description="Open MetaMask to authorize secure uploads and link your account to the workspace."
                  />
                  <Step
                    number={2}
                    active
                    title="Upload and verify"
                    description="Upload to IPFS, store the CID on-chain, and verify the PIN before any download begins."
                  />
                </div>
              </Panel>

              <Panel>
                <p className="sectionLabel">Download History</p>
                <h3>Recent activity</h3>
                {downloadHistory.length ? (
                  <div className="historyList">
                    {downloadHistory.slice(0, 5).map((item) => (
                      <div key={`${item.action}-${item.timestamp}-${item.cid}`} className="historyItem">
                        <div>
                          <p className="tableStrong">{item.action}</p>
                          <p className="tableMuted">{item.fileName}</p>
                        </div>
                        <div className="historyRight">
                          <Badge tone="green">{item.status}</Badge>
                          <span>{formatTimestamp(item.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptyState compact">
                    <History className="h-8 w-8 text-cyan-300" />
                    <h4>No history yet</h4>
                    <p>Upload a file or verify a download to populate your activity feed.</p>
                  </div>
                )}
              </Panel>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;