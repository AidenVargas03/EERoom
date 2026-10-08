
/**
 * pages/OhmToolPage.jsx
 * -----------------------------------------------------------------------
 * Tool 1: Ohm's Law & Power Calculator.
 *
 * Behavior (per Milestone 3 spec, Section 6):
 *   - 3 input fields: Voltage (V), Current (I), Resistance (R)
 *   - User enters ANY 2 of the 3; the 3rd is calculated instantly on
 *     every keystroke (no submit button needed for the math itself)
 *   - Power (P = V*I) is always calculated and displayed as well
 *   - A Project name field, so saved work is identifiable on the dashboard
 *   - A Save button that either creates a new project (POST /projects) or
 *     updates the one currently open (PUT /projects/:id)
 *
 * Two modes, decided by the ?project=<id> query parameter:
 *   - No parameter  -> "new project" mode. Save creates a row.
 *   - ?project=<id> -> "edit" mode. The page loads that project's saved
 *                      state on mount and Save updates that same row.
 * The dashboard's Open button is what produces the ?project= link.
 *
 * After a successful create we switch into edit mode (store the new id and
 * put it in the URL), so pressing Save a second time updates the project
 * instead of creating a duplicate every time.
 *
 * Formula logic (student-authored business logic - not derived from an
 * external source, so no citation needed here; this is straight from
 * Ohm's Law: V = IR):
 *     if V and I given:  R = V / I,  P = V * I
 *     if V and R given:  I = V / R,  P = V * I
 *     if I and R given:  V = I * R,  P = V * I
 *
 * We track which 2 fields the user most recently typed into using a
 * small history array. Whichever field they DIDN'T touch most recently
 * out of the 3 is the one we solve for. This lets the user change their
 * mind about which 2 values are "known" at any time, rather than
 * hard-coding which field is always the output.
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

const DEFAULT_NAME = "Untitled Ohm's Law Project";

export default function OhmToolPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // The project currently being edited, or null when creating a new one.
  // Seeded from the URL so a refresh keeps editing the same project.
  const [projectId, setProjectId] = useState(searchParams.get("project"));
  const [projectName, setProjectName] = useState("");

  // Raw string values for each field, so the input can be empty/partial
  // while typing (e.g. "1." or "-") without fighting the user.
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");
  const [resistance, setResistance] = useState("");

  // Tracks the order fields were last edited in, most-recent last.
  // e.g. ["voltage", "current"] means those two are the "known" values
  // and resistance should be calculated.
  const [editOrder, setEditOrder] = useState([]);

  const [loading, setLoading] = useState(Boolean(searchParams.get("project")));
  const [loadError, setLoadError] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"
  const [saveError, setSaveError] = useState("");

  /**
   * On mount, if the URL carried ?project=<id>, fetch that project and
   * fill the form with its saved state.
   *
   * `cancelled` guards against setting state after unmount - React 18's
   * StrictMode mounts, unmounts and remounts every component once in
   * development, so the first discarded mount's request would otherwise
   * still try to update a component that no longer exists.
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

        if (project.tool_type !== "ohm") {
          // Someone edited the URL by hand, or followed a link to a
          // project belonging to a different tool.
          setLoadError("That project belongs to a different tool.");
          return;
        }

        setProjectName(project.name || "");

        // Saved numbers come back as numbers; the inputs are controlled
        // by strings, so convert. Nulls become "" (an empty field).
        const data = project.project_data || {};
        setVoltage(data.voltage == null ? "" : String(data.voltage));
        setCurrent(data.current == null ? "" : String(data.current));
        setResistance(data.resistance == null ? "" : String(data.resistance));

        // editOrder stays empty on purpose. With all three values present
        // and no recent edits, nothing is "solved for" - every field just
        // shows its saved value, and power falls out of V * I below. As
        // soon as the user types, the normal solve logic takes over.
        setEditOrder([]);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.error || "Could not load that project."
          );
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

  /**
   * Records that `field` was just edited, keeping only the 2 most
   * recent fields in editOrder (that's all we need to know which field
   * to solve for).
   */
  function recordEdit(field) {
    setEditOrder((prev) => {
      const withoutField = prev.filter((f) => f !== field);
      return [...withoutField, field].slice(-2);
    });
  }

  function handleVoltageChange(e) {
    setVoltage(e.target.value);
    recordEdit("voltage");
  }
  function handleCurrentChange(e) {
    setCurrent(e.target.value);
    recordEdit("current");
  }
  function handleResistanceChange(e) {
    setResistance(e.target.value);
    recordEdit("resistance");
  }

  // Parse raw strings to numbers where possible; null if not a valid number.
  const vNum = voltage === "" ? null : parseFloat(voltage);
  const iNum = current === "" ? null : parseFloat(current);
  const rNum = resistance === "" ? null : parseFloat(resistance);

  const allFields = ["voltage", "current", "resistance"];
  // The field to solve for is whichever one is NOT in the 2 most-recently-edited.
  const solveFor = editOrder.length === 2
    ? allFields.find((f) => !editOrder.includes(f))
    : null;

  let calculatedVoltage = vNum;
  let calculatedCurrent = iNum;
  let calculatedResistance = rNum;
  let power = null;
  let calcError = "";

  if (solveFor && vNum !== null && iNum !== null && rNum === null && solveFor === "resistance") {
    if (iNum === 0) {
      calcError = "Current cannot be 0 when solving for resistance.";
    } else {
      calculatedResistance = vNum / iNum;
      power = vNum * iNum;
    }
  } else if (solveFor && vNum !== null && rNum !== null && iNum === null && solveFor === "current") {
    if (rNum === 0) {
      calcError = "Resistance cannot be 0 when solving for current.";
    } else {
      calculatedCurrent = vNum / rNum;
      power = vNum * calculatedCurrent;
    }
  } else if (solveFor && iNum !== null && rNum !== null && vNum === null && solveFor === "voltage") {
    calculatedVoltage = iNum * rNum;
    power = calculatedVoltage * iNum;
  } else if (vNum !== null && iNum !== null && rNum !== null) {
    // All 3 present (e.g. user typed over a calculated field, or we just
    // loaded a saved project) - just display power using V and I; don't
    // try to recalculate anything.
    power = vNum * iNum;
  }

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");

    // The database requires a name (NOT NULL), and an untitled project is
    // better than a failed save, so fall back rather than blocking.
    const nameToSave = projectName.trim() || DEFAULT_NAME;
    const projectData = {
      voltage: calculatedVoltage,
      current: calculatedCurrent,
      resistance: calculatedResistance,
      power,
    };

    try {
      if (projectId) {
        // Edit mode: update the row we already have open.
        await updateProject(projectId, {
          name: nameToSave,
          project_data: projectData,
        });
      } else {
        // New project: create it, then switch into edit mode so a second
        // Save updates this project instead of creating another one.
        const created = await createProject(nameToSave, "ohm", projectData);
        setProjectId(created.project_id);
        // replace: true swaps the current history entry instead of pushing a
        // new one, so Back returns to the dashboard rather than walking the
        // user back through every save. (NavigateOptions - see the
        // useSearchParams citation at the top of this file.)
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
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
          <p className="text-slate-500">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-slate-500 hover:underline mb-4"
        >
          &larr; Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Ohm's Law &amp; Power Calculator</h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter any 2 values - the 3rd is calculated automatically.
        </p>

        {loadError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Project name
          </label>
          <input
            type="text"
            maxLength={100}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={DEFAULT_NAME}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            Leave blank to use &ldquo;{DEFAULT_NAME}&rdquo;. Max 100 characters.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Voltage (V)
            </label>
            <input
              type="number"
              step="any"
              value={solveFor === "voltage" && calculatedVoltage !== null ? calculatedVoltage.toFixed(4) : voltage}
              onChange={handleVoltageChange}
              placeholder="e.g. 12"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Current (I) - Amps
            </label>
            <input
              type="number"
              step="any"
              value={solveFor === "current" && calculatedCurrent !== null ? calculatedCurrent.toFixed(4) : current}
              onChange={handleCurrentChange}
              placeholder="e.g. 2"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Resistance (R) - Ohms
            </label>
            <input
              type="number"
              step="any"
              value={solveFor === "resistance" && calculatedResistance !== null ? calculatedResistance.toFixed(4) : resistance}
              onChange={handleResistanceChange}
              placeholder="e.g. 6"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {calcError && (
          <p className="mt-4 text-sm text-red-600">{calcError}</p>
        )}

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-md p-4">
          <span className="text-sm font-medium text-slate-700">Power (P = V x I): </span>
          <span className="text-lg font-bold text-blue-600">
            {power !== null ? `${power.toFixed(4)} W` : "-"}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={power === null || saveStatus === "saving"}
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
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
          <p className="mt-2 text-sm text-red-600">{saveError}</p>
        )}
      </div>
    </div>
  );
}
