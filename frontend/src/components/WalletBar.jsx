import React from "react";

export default function WalletBar({ address, onConnect, isConnecting }) {
  return (
    <div className="walletBar">
      <div className="walletLeft">
        <button className="primary" onClick={onConnect} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>

        <div className="walletText">
          {address ? (
            <span className="walletConnected">
              Connected
              <span className="addressPill" title={address}>
                {address}
              </span>
            </span>
          ) : (
            <span className="muted">Not connected</span>
          )}
        </div>
      </div>
    </div>
  );
}
