import React from "react";

export default function FileUploader({
  selectedFile,
  onSelectFile,
  onUpload,
  walletReady,
  canUpload,
  isUploading,
}) {
  const isFilePickerDisabled = !walletReady || isUploading;
  const isUploadDisabled = !walletReady || !canUpload || !selectedFile || isUploading;

  const helperText = !walletReady
    ? "Connect your wallet to start uploading."
    : !canUpload
      ? "Enter a PIN to enable uploads."
      : selectedFile
        ? `Selected: ${selectedFile.name}`
        : "Choose a file to upload.";

  return (
    <div className="card">
      <div className="panelHeader">
        <div>
          <h2>Upload file</h2>
          <p className="muted">Upload to IPFS with Pinata, then save the CID on-chain for later access.</p>
        </div>
        <span className="panelPill">IPFS + on-chain</span>
      </div>

      <div className="uploadZone">
        <div className="uploadHint">
          <span className="heroLabel">Selected file</span>
          <strong>{selectedFile ? selectedFile.name : "Choose a file from your device"}</strong>
          <p>{helperText}</p>
        </div>

        <div className="row uploadControls">
          <input
            type="file"
            onChange={(e) => onSelectFile(e.target.files?.[0] || null)}
            disabled={isFilePickerDisabled}
          />
          <button className="primary" onClick={onUpload} disabled={isUploadDisabled}>
            {isUploading ? "Uploading..." : "Upload file"}
          </button>
        </div>
      </div>
    </div>
  );
}
