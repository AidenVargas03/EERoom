/**
 * pages/WaveToolPage.jsx
 * -----------------------------------------------------------------------
 * Tool 2: Waveform Visualizer.
 *
 * All signal maths lives in utils/waveform.js so it can be unit tested
 * without rendering this component. This file is only controls, canvas
 * drawing and persistence.
 *
 * What it draws. Two traces on the same axes:
 *   - the blue curve: the signal sampled densely enough to look smooth,
 *     i.e. what the waveform actually is
 *   - the amber trace: the signal sampled at the user's chosen sample
 *     rate, i.e. what an instrument sampling that slowly would record
 *
 * At a healthy sample rate the amber trace sits on top of the blue one.
 * Drop the sample rate below twice the signal frequency and it visibly
 * departs, drawing a lower "ghost" frequency that is not in the signal.
 * That is aliasing, and being able to see it happen is the point of
 * putting sample rate in the user's hands rather than hiding it.
 *
 * Save/load works the same way as the Ohm tool: no query parameter means
 * a new project, ?project=<id> loads that row and Save updates it.
 *
 * NOTE: styling is deliberately plain and matches the other pages. The
 * visual pass over the whole site comes after every tool works.
 * -----------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
// useSearchParams reads and writes the query string the way useState reads
// and writes component state; its setter takes the same options object as
// navigate(), which is where { replace: true } below comes from.
// Source: React Router v6 useSearchParams docs -
// https://reactrouter.com/en/main/hooks/use-search-params
import { useNavigate, useSearchParams } from "react-router-dom";
import { createProject, getProject, updateProject } from "../api/projects.js";
import ShareButton from "../components/ShareButton.jsx";
import WaveformCanvas, { formatTime } from "../components/WaveformCanvas.jsx";
import {
  WAVEFORM_TYPES,
  generateSamples,
  isAliased,
  rms,
  voltageRange,
} from "../utils/waveform.js";

const DEFAULT_NAME = "Untitled Waveform Project";

/** Starting values, also used as the fallback when a field is left empty. */
const DEFAULTS = {
  type: "sine",
  amplitude: "5",
  frequency: "50",
  phase: "0",
  offset: "0",
  cycles: "3",
  // 1000 Hz against the default 50 Hz signal gives 20 samples per cycle:
  // comfortably above Nyquist, and sparse enough that the individual
  // sample points stay readable on the canvas.
  sampleRate: "1000",
};

/** How many points to use for the smooth reference curve. */
const SMOOTH_SAMPLE_COUNT = 1200;

/** Parse a control's string value, falling back when it is empty or junk. */
function num(value, fallback) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


export default function WaveToolPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projectId, setProjectId] = useState(searchParams.get("project"));
  const [projectName, setProjectName] = useState("");
  const [controls, setControls] = useState(DEFAULTS);

  const [loading, setLoading] = useState(Boolean(searchParams.get("project")));
  const [loadError, setLoadError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState("");

  function setControl(key, value) {
    setControls((prev) => ({ ...prev, [key]: value }));
  }

  /**
   * Load a saved project when the URL carries ?project=<id>.
   *
   * Source: React's official "Fetching data with Effects" pattern, which
   * uses a boolean flag (named `ignore` there) set to true in the Effect's
   * cleanup function - https://react.dev/reference/react/useEffect
   */
  useEffect(() => {
    const id = searchParams.get("project");
    if (!id) return;

    let cancelled = false;

    async function loadProject() {
      try {
        const project = await getProject(id);
        if (cancelled) return;

        if (project.tool_type !== "wave") {
          setLoadError("That project belongs to a different tool.");
          return;
        }

        setProjectName(project.name || "");
        const d = project.project_data || {};
        // Saved values are numbers; the controls are strings. Anything
        // missing from an older save falls back to its default.
        setControls({
          type: WAVEFORM_TYPES.includes(d.type) ? d.type : DEFAULTS.type,
          amplitude: d.amplitude == null ? DEFAULTS.amplitude : String(d.amplitude),
          frequency: d.frequency == null ? DEFAULTS.frequency : String(d.frequency),
          phase: d.phase == null ? DEFAULTS.phase : String(d.phase),
          offset: d.offset == null ? DEFAULTS.offset : String(d.offset),
          cycles: d.cycles == null ? DEFAULTS.cycles : String(d.cycles),
          sampleRate: d.sampleRate == null ? DEFAULTS.sampleRate : String(d.sampleRate),
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.error || "Could not load that project.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProject();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // ---- derive everything the canvas needs from the controls -------------
  const amplitude = num(controls.amplitude, 0);
  const frequency = num(controls.frequency, 0);
  const phase = num(controls.phase, 0);
  const offset = num(controls.offset, 0);
  const cycles = Math.max(num(controls.cycles, 1), 0.01);
  const sampleRate = Math.max(num(controls.sampleRate, 1), 1);

  // Showing a fixed number of cycles keeps the picture useful as frequency
  // changes. At 0 Hz there are no cycles to count, so fall back to 1 second.
  const duration = frequency === 0 ? 1 : cycles / Math.abs(frequency);

  const signal = { type: controls.type, amplitude, frequency, phase, offset };
  // Still derived here, because the readouts below need the samples even
  // though the drawing is now the canvas component's job.
  const smooth = generateSamples({
    ...signal,
    duration,
    sampleRate: duration > 0 ? 1200 / duration : 1,
  });
  const aliased = isAliased(frequency, sampleRate);
  const range = voltageRange(smooth);

  const signalRms = rms(smooth);
  const peakToPeak = range.max - range.min;

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");

    const nameToSave = projectName.trim() || DEFAULT_NAME;
    const projectData = {
      type: controls.type,
      amplitude,
      frequency,
      phase,
      offset,
      cycles,
      sampleRate,
    };

    try {
      if (projectId) {
        await updateProject(projectId, { name: nameToSave, project_data: projectData });
      } else {
        const created = await createProject(nameToSave, "wave", projectData);
        setProjectId(created.project_id);
        setSearchParams({ project: created.project_id }, { replace: true });
      }
      setProjectName(nameToSave);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err.response?.data?.error || "Failed to save project.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto bg-panel rounded-lg border border-rule p-8">
          <p className="text-ink-muted">Loading project...</p>
        </div>
      </div>
    );
  }

  const numberFields = [
    { key: "amplitude", label: "Amplitude (V peak)", step: "any" },
    { key: "frequency", label: "Frequency (Hz)", step: "any" },
    { key: "phase", label: "Phase (degrees)", step: "any" },
    { key: "offset", label: "DC offset (V)", step: "any" },
    { key: "cycles", label: "Cycles shown", step: "any" },
    { key: "sampleRate", label: "Sample rate (Hz)", step: "any" },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto bg-panel rounded-lg border border-rule p-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-ink-muted hover:underline mb-4"
        >
          &larr; Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-ink mb-2">Waveform Visualizer</h1>
        <p className="text-sm text-ink-muted mb-6">
          Blue is the signal. Amber is what your chosen sample rate would capture.
        </p>

        {loadError && (
          <div className="mb-4 rounded-md bg-danger-surface border border-danger p-3 text-sm text-danger">
            {loadError}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-ink mb-1">
            Project name
          </label>
          <input
            type="text"
            maxLength={100}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={DEFAULT_NAME}
            className="w-full px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-copper"
          />
        </div>

        <div className="mb-4">
          <span className="block text-sm font-medium text-ink mb-2">Waveform</span>
          <div className="flex flex-wrap gap-2">
            {WAVEFORM_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setControl("type", type)}
                className={
                  controls.type === type
                    ? "px-3 py-1.5 text-sm rounded-md bg-copper text-ground capitalize"
                    : "px-3 py-1.5 text-sm rounded-md border border-rule-strong text-ink-muted hover:bg-raised capitalize"
                }
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {numberFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-ink mb-1">
                {field.label}
              </label>
              <input
                type="number"
                step={field.step}
                value={controls[field.key]}
                onChange={(e) => setControl(field.key, e.target.value)}
                className="w-full px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-copper"
              />
            </div>
          ))}
        </div>

        {aliased && (
          <div className="mb-4 rounded-md bg-warning-surface border border-warning p-3 text-sm text-warning">
            <strong>Aliasing.</strong> A {Math.abs(frequency)} Hz signal needs a sample rate
            above {Math.abs(frequency) * 2} Hz to be captured correctly. At{" "}
            {sampleRate} Hz the red trace shows a lower frequency that is not in the
            signal. Raise the sample rate above {Math.abs(frequency) * 2} Hz to fix it.
          </div>
        )}

        <div className="border border-rule rounded-md bg-raised p-2 mb-4">
          <WaveformCanvas
            type={controls.type}
            amplitude={amplitude}
            frequency={frequency}
            phase={phase}
            offset={offset}
            duration={duration}
            sampleRate={sampleRate}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          <div className="bg-raised border border-rule rounded-md p-3">
            <span className="block text-xs text-ink-muted">RMS</span>
            <span className="text-lg font-bold text-copper">
              {signalRms.toFixed(4)} V
            </span>
          </div>
          <div className="bg-raised border border-rule rounded-md p-3">
            <span className="block text-xs text-ink-muted">Peak to peak</span>
            <span className="text-lg font-bold text-copper">
              {peakToPeak.toFixed(4)} V
            </span>
          </div>
          <div className="bg-raised border border-rule rounded-md p-3">
            <span className="block text-xs text-ink-muted">Period</span>
            <span className="text-lg font-bold text-copper">
              {frequency === 0 ? "DC" : formatTime(1 / Math.abs(frequency))}
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className="w-full bg-copper text-ground py-2 rounded-md font-medium hover:bg-copper-bright disabled:opacity-50"
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
            ? "Saved!"
            : projectId
            ? "Update Project"
            : "Save Project"}
        </button>

        {saveStatus === "error" && (
          <p className="mt-2 text-sm text-danger">{saveError}</p>
        )}

        <div className="mt-4 pt-4 border-t border-rule">
          <ShareButton projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
