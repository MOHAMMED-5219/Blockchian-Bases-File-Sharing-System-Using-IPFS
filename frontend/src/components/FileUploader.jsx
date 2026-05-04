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
      <h2>Upload a file</h2>
      <p className="muted">Uploads go to IPFS via Pinata, then the CID is stored on-chain.</p>

      <div className="row">
        <input
          type="file"
          onChange={(e) => onSelectFile(e.target.files?.[0] || null)}
          disabled={isFilePickerDisabled}
        />
        <button
          className="primary"
          onClick={onUpload}
          disabled={isUploadDisabled}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <p className="muted">{helperText}</p>
    </div>
  );
}
