/**
 * components/ShareButton.jsx
 * -----------------------------------------------------------------------
 * Turns a saved project into a public read-only link.
 *
 * Shared by all three tool pages rather than reimplemented in each, so
 * the button, the clipboard handling and the error cases behave the same
 * everywhere.
 *
 * Flow: POST /projects/:id/share returns a 64-character token, which is
 * combined with the current origin into a /share/<token> URL. That URL is
 * then both copied to the clipboard and displayed on screen.
 *
 * It is displayed rather than only copied on purpose. Clipboard writes
 * need a secure context and can be refused by the browser, so a copy
 * cannot be assumed to have worked. Showing the link means the feature
 * still works when the copy fails, which also matters for a screencast
 * where the viewer should be able to see the URL.
 * -----------------------------------------------------------------------
 */

import { useState } from "react";
import { shareProject } from "../api/projects.js";

export default function ShareButton({ projectId }) {
  const [shareUrl, setShareUrl] = useState("");
  const [status, setStatus] = useState(""); // "", "sharing", "copied", "manual", "error"
  const [error, setError] = useState("");

  async function handleShare() {
    setStatus("sharing");
    setError("");

    try {
      const { shareToken } = await shareProject(projectId);
      // Build the link against wherever the app is actually running, so
      // it works on localhost during development and on the deployed
      // domain in production without a second configuration value.
      const url = `${window.location.origin}/share/${shareToken}`;
      setShareUrl(url);

      try {
        // Writing to the clipboard requires a secure context and can be
        // refused with a NotAllowedError, so a failure here is expected
        // rather than exceptional - fall back to manual copying.
        // Source: MDN, Clipboard.writeText() -
        // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
        await navigator.clipboard.writeText(url);
        setStatus("copied");
      } catch {
        setStatus("manual");
      }
    } catch (err) {
      setStatus("error");
      setError(err.response?.data?.error || "Could not create a share link.");
    }
  }

  // Sharing needs a row in the database to attach the token to.
  if (!projectId) {
    return (
      <p className="text-xs text-ink-faint">
        Save this project to create a shareable link.
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={handleShare}
        disabled={status === "sharing"}
        className="px-3 py-1.5 text-sm rounded-md border border-rule-strong text-ink-muted hover:bg-raised disabled:opacity-50"
      >
        {status === "sharing" ? "Creating link..." : "Share read-only link"}
      </button>

      {status === "error" && <p className="mt-2 text-sm text-danger">{error}</p>}

      {shareUrl && (
        <div className="mt-3">
          <p className="text-xs text-ink-muted mb-1">
            {status === "copied"
              ? "Link copied to your clipboard. Anyone with it can view this project, read only."
              : "Copy this link. Anyone with it can view this project, read only."}
          </p>
          <input
            type="text"
            readOnly
            value={shareUrl}
            // Selecting the whole link on focus makes manual copying one
            // keystroke rather than a careful drag.
            onFocus={(e) => e.target.select()}
            className="w-full px-3 py-2 text-sm font-mono border border-rule-strong rounded-md bg-raised"
          />
        </div>
      )}
    </div>
  );
}
