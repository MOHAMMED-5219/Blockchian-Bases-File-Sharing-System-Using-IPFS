import React from "react";

export default function WalletBar({ address, onConnect, isConnecting }) {
  return (
    <div className="walletBar">
      <div className="walletCopy">
        <span className="heroLabel">Workspace access</span>
        <strong>{address ? "Connected session" : "Connect your wallet to continue"}</strong>
        <p>{address ? "Ready to sign uploads and verify downloads." : "MetaMask is required to use this workspace."}</p>
      </div>

      <div className="walletLeft">
        {address ? (
          <span className="walletConnected">
            <span className="walletDot" aria-hidden="true" />
            <span className="addressPill" title={address}>
              {address}
            </span>
          </span>
        ) : (
          <span className="muted">Not connected</span>
        )}

        <button className="primary" onClick={onConnect} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : address ? "Reconnect" : "Connect wallet"}
        </button>
      </div>
    </div>
  );
}
