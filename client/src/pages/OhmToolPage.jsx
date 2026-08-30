
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
 *   - A separate Save button persists the current V/I/R/P state to the
 *     user's account via POST /projects
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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "../api/projects.js";

export default function OhmToolPage() {
  const navigate = useNavigate();

  // Raw string values for each field, so the input can be empty/partial
  // while typing (e.g. "1." or "-") without fighting the user.
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");
  const [resistance, setResistance] = useState("");

  // Tracks the order fields were last edited in, most-recent last.
  // e.g. ["voltage", "current"] means those two are the "known" values
  // and resistance should be calculated.
  const [editOrder, setEditOrder] = useState([]);

  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"
  const [saveError, setSaveError] = useState("");

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
    // All 3 present (e.g. user typed over a calculated field) - just
    // display power using V and I; don't try to recalculate anything.
    power = vNum * iNum;
  }

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");
    try {
      await createProject("Untitled Ohm's Law Project", "ohm", {
        voltage: calculatedVoltage,
        current: calculatedCurrent,
        resistance: calculatedResistance,
        power,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err.response?.data?.error || "Failed to save project.");
    }
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

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Ohm's Law & Power Calculator</h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter any 2 values - the 3rd is calculated automatically.
        </p>

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
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save Project"}
        </button>

        {saveStatus === "error" && (
          <p className="mt-2 text-sm text-red-600">{saveError}</p>
        )}
      </div>
    </div>
  );
}
