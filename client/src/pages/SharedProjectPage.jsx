/**
 * pages/SharedProjectPage.jsx
 * -----------------------------------------------------------------------
 * PLACEHOLDER - public read-only view for a shared project, loaded via
 * GET /share/:token (no auth required). Built alongside the share
 * feature (build order step 8).
 * -----------------------------------------------------------------------
 */
import { useParams } from "react-router-dom";

export default function SharedProjectPage() {
  const { token } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800">Shared Project</h1>
      <p className="text-slate-500">TODO: fetch /share/{token} and render read-only view.</p>
    </div>
  );
}
