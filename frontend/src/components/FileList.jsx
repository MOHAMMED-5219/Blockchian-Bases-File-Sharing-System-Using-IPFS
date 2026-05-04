import React from "react";
import { getIpfsGatewayUrl } from "../utils/pinata";
import { formatTimestamp } from "../utils/format";

export default function FileList({ files, isLoading }) {
  return (
    <div className="card">
      <h2>Your uploaded files</h2>
      {isLoading ? (
        <p className="muted">Loading files...</p>
      ) : files.length === 0 ? (
        <p className="muted">No files uploaded yet.</p>
      ) : (
        <div className="table">
          <div className="tableHead">
            <div>Name</div>
            <div>Uploaded</div>
            <div>Actions</div>
          </div>
          {files.map((f, idx) => {
            const cid = f.cid;
            const url = getIpfsGatewayUrl(cid);
            return (
              <div key={`${cid}-${idx}`} className="tableRow">
                <div className="ellipsis" title={f.fileName}>
                  {f.fileName}
                  <div className="subtle ellipsis" title={cid}>
                    CID: {cid}
                  </div>
                </div>
                <div className="subtle">{formatTimestamp(f.timestamp)}</div>
                <div className="actions">
                  <a className="button" href={url} target="_blank" rel="noreferrer">
                    View/Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
