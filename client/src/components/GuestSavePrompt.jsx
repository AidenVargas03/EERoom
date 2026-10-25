/**
 * components/GuestSavePrompt.jsx
 * -----------------------------------------------------------------------
 * Shown in place of the Save button when a visitor is using a tool
 * without an account (SC-06, iteration 3).
 *
 * The tools work fully for guests; only saving and sharing need an
 * account, because a saved project has to belong to a user. Pressing
 * either button stores the current work with savePendingDraft() before
 * leaving the page, and LoginPage saves it to the account once the
 * user is in.
 *
 * Props:
 *   toolType  "ohm" | "wave" | "logic"
 *   getDraft  function returning { name, projectData } for the work on screen
 * -----------------------------------------------------------------------
 */

import { useNavigate } from "react-router-dom";
import { savePendingDraft } from "../utils/pendingDraft.js";

export default function GuestSavePrompt({ toolType, getDraft }) {
  const navigate = useNavigate();

  function keepWorkAndGo(path) {
    const { name, projectData } = getDraft();
    savePendingDraft({ toolType, name, projectData });
    navigate(path);
  }

  return (
    <div className="mt-6 bg-raised border border-rule rounded-md p-4">
      <p className="text-sm text-ink mb-3">
        You are using EERoom as a guest. Create a free account to save this project and get a
        share link. Your work will be saved as soon as you log in.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => keepWorkAndGo("/register")}
          className="bg-copper text-ground px-4 py-2 rounded-md font-medium hover:bg-copper-bright"
        >
          Sign up to save
        </button>
        <button
          type="button"
          onClick={() => keepWorkAndGo("/login")}
          className="border border-rule-strong text-ink px-4 py-2 rounded-md hover:border-copper hover:text-copper"
        >
          Log in to save
        </button>
      </div>
    </div>
  );
}
