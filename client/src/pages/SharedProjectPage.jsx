/**
 * pages/SharedProjectPage.jsx
 * -----------------------------------------------------------------------
 * Public read-only view of a shared project, loaded via GET /share/:token.
 *
 * Deliberately requires no login. The route is outside ProtectedRoute, no
 * JWT is needed, and the endpoint returns only name, tool_type,
 * project_data and created_at - never user_id or project_id - so a link
 * reveals the work and nothing about the account that made it.
 *
 * All three tool types render here. Waveforms reuse the same
 * WaveformCanvas the editor uses, and logic circuits reuse
 * logicEvaluator, so a viewer sees exactly what the author saw rather
 * than a second implementation that might drift.
 *
 * There is no editing of any kind: no inputs, no save, no toggles. A
 * viewer who wants to change something is pointed at registering for
 * their own account.
 *
 * NOTE: styling is deliberately plain and matches the other pages. The
 * visual pass over the whole site comes after every tool works.
 * -----------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../api/client.js";
import WaveformCanvas, { formatTime } from "../components/WaveformCanvas.jsx";
import { generateSamples, rms, voltageRange } from "../utils/waveform.js";
import {
  generateTruthTable,
  toExpression,
  getOutputNodes,
} from "../utils/logicEvaluator.js";

const TOOL_LABELS = {
  ohm: "Ohm's Law Calculator",
  wave: "Waveform Visualizer",
  logic: "Logic Gate Sandbox",
};

function formatDate(timestamp) {
  if (!timestamp) return "unknown date";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "unknown date";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** A labelled value, used for every read-only readout on this page. */
function Readout({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
      <span className="block text-xs text-slate-500">{label}</span>
      <span className="text-lg font-bold text-blue-600">{value}</span>
    </div>
  );
}

function OhmView({ data }) {
  const show = (v, unit) =>
    typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(4)} ${unit}` : "-";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Readout label="Voltage (V)" value={show(data.voltage, "V")} />
      <Readout label="Current (I)" value={show(data.current, "A")} />
      <Readout label="Resistance (R)" value={show(data.resistance, "Ω")} />
      <Readout label="Power (P)" value={show(data.power, "W")} />
    </div>
  );
}

function WaveView({ data }) {
  const frequency = Number(data.frequency) || 0;
  const cycles = Number(data.cycles) || 1;
  const sampleRate = Number(data.sampleRate) || 1000;
  // Same window the editor would show for these settings.
  const duration = frequency === 0 ? 1 : cycles / Math.abs(frequency);

  const signal = {
    type: data.type || "sine",
    amplitude: Number(data.amplitude) || 0,
    frequency,
    phase: Number(data.phase) || 0,
    offset: Number(data.offset) || 0,
  };

  const smooth = generateSamples({
    ...signal,
    duration,
    sampleRate: duration > 0 ? 1200 / duration : 1,
  });
  const range = voltageRange(smooth);

  return (
    <div>
      <div className="border border-slate-200 rounded-md bg-slate-50 p-2 mb-4">
        <WaveformCanvas {...signal} duration={duration} sampleRate={sampleRate} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Readout label="RMS" value={`${rms(smooth).toFixed(4)} V`} />
        <Readout label="Peak to peak" value={`${(range.max - range.min).toFixed(4)} V`} />
        <Readout
          label="Period"
          value={frequency === 0 ? "DC" : formatTime(1 / Math.abs(frequency))}
        />
      </div>

      <dl className="grid gap-2 sm:grid-cols-2 text-sm">
        <div className="flex justify-between border-b border-slate-100 py-1">
          <dt className="text-slate-500">Waveform</dt>
          <dd className="text-slate-800 capitalize">{signal.type}</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-1">
          <dt className="text-slate-500">Amplitude</dt>
          <dd className="text-slate-800">{signal.amplitude} V peak</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-1">
          <dt className="text-slate-500">Frequency</dt>
          <dd className="text-slate-800">{frequency} Hz</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-1">
          <dt className="text-slate-500">Phase</dt>
          <dd className="text-slate-800">{signal.phase}&deg;</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-1">
          <dt className="text-slate-500">DC offset</dt>
          <dd className="text-slate-800">{signal.offset} V</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-1">
          <dt className="text-slate-500">Sample rate</dt>
          <dd className="text-slate-800">{sampleRate} Hz</dd>
        </div>
      </dl>
    </div>
  );
}

function LogicView({ data }) {
  const circuit = {
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
  };

  // A saved circuit could still contain a loop, so every call that can
  // throw is guarded - a bad shared link should show a message, not a
  // blank page.
  let truthTable = null;
  let expressions = [];
  let problem = "";

  try {
    truthTable = generateTruthTable(circuit);
    expressions = getOutputNodes(circuit).map((out) => toExpression(circuit, out.id));
  } catch (err) {
    problem = err.message;
  }

  const gateCount = circuit.nodes.filter(
    (n) => n.type !== "INPUT" && n.type !== "OUTPUT"
  ).length;

  if (problem) {
    return (
      <div className="rounded-md bg-amber-50 border border-amber-300 p-3 text-sm text-amber-800">
        {problem}
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Readout label="Inputs" value={truthTable ? truthTable.inputs.length : 0} />
        <Readout label="Gates" value={gateCount} />
        <Readout label="Outputs" value={truthTable ? truthTable.outputs.length : 0} />
      </div>

      {expressions.length > 0 && (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-md p-3">
          <span className="block text-xs text-slate-500 mb-1">Boolean expression</span>
          {expressions.map((e, i) => (
            <code key={i} className="block text-sm text-slate-800">
              {e}
            </code>
          ))}
        </div>
      )}

      {truthTable && truthTable.outputs.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                {truthTable.inputs.map((label) => (
                  <th key={label} className="px-3 py-2 text-left font-semibold text-slate-700">
                    {label}
                  </th>
                ))}
                {truthTable.outputs.map((label) => (
                  <th key={label} className="px-3 py-2 text-left font-semibold text-blue-700">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {truthTable.rows.map((row, i) => (
                <tr key={i} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                  {row.inputs.map((bit, j) => (
                    <td key={j} className="px-3 py-1.5 font-mono text-slate-700">
                      {bit ? 1 : 0}
                    </td>
                  ))}
                  {row.outputs.map((bit, j) => (
                    <td key={j} className="px-3 py-1.5 font-mono font-semibold text-blue-700">
                      {bit ? 1 : 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SharedProjectPage() {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Source: React's official "Fetching data with Effects" pattern, which
   * uses a boolean flag (named `ignore` there) set to true in the Effect's
   * cleanup function - https://react.dev/reference/react/useEffect
   */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // client.js attaches a JWT when one is in localStorage, which is
        // harmless here: the share route ignores it entirely.
        const res = await client.get(`/share/${token}`);
        if (!cancelled) setProject(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.status === 404
              ? "This link is not valid. It may have been removed, or sharing may have been turned off for this project."
              : "Could not load this shared project."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <p className="text-slate-500">Loading shared project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Link not available</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link to="/" className="text-blue-600 hover:underline">
            Go to EERoom
          </Link>
        </div>
      </div>
    );
  }

  const data = project.project_data || {};

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
            Read only
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          {TOOL_LABELS[project.tool_type] || project.tool_type} &middot; shared{" "}
          {formatDate(project.created_at)}
        </p>

        {project.tool_type === "ohm" && <OhmView data={data} />}
        {project.tool_type === "wave" && <WaveView data={data} />}
        {project.tool_type === "logic" && <LogicView data={data} />}
        {!TOOL_LABELS[project.tool_type] && (
          <p className="text-slate-500">
            This project uses a tool this page does not know how to display.
          </p>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 text-sm text-slate-500">
          Built with EERoom, a free browser-based electrical engineering toolkit.{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Create an account
          </Link>{" "}
          to build your own.
        </div>
      </div>
    </div>
  );
}
