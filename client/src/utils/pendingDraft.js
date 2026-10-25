/**
 * utils/pendingDraft.js
 * -----------------------------------------------------------------------
 * Holds a guest's unsaved work while they sign up or log in (SC-06,
 * iteration 3).
 *
 * Visitors can use every tool without an account. When a guest presses
 * "Sign up to save" or "Log in to save", the tool page stores its current
 * project here. After a successful login, LoginPage takes the draft back
 * out, saves it to the new account, and opens it in the tool. Without
 * this, a guest who built a circuit and then signed up would lose it.
 *
 * sessionStorage is used rather than localStorage so a forgotten draft
 * disappears when the tab is closed instead of appearing in some later,
 * unrelated login.
 *
 * Both functions take the storage object as a parameter so the unit
 * tests can pass in a simple stand-in instead of a real browser.
 *
 * Source: Web Storage API (sessionStorage), MDN -
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
 * -----------------------------------------------------------------------
 */

export const PENDING_KEY = "eeroom_pending_draft";
export const TOOL_TYPES = ["ohm", "wave", "logic"];

/** Store a draft: { toolType, name, projectData }. */
export function savePendingDraft(draft, storage = window.sessionStorage) {
  storage.setItem(PENDING_KEY, JSON.stringify(draft));
}

/**
 * Remove and return the stored draft, or null if there is none or it is
 * not usable. It is always removed, so a bad draft cannot get stuck and
 * a good one is never saved twice.
 */
export function takePendingDraft(storage = window.sessionStorage) {
  const raw = storage.getItem(PENDING_KEY);
  storage.removeItem(PENDING_KEY);
  if (!raw) return null;

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !draft ||
    !TOOL_TYPES.includes(draft.toolType) ||
    typeof draft.projectData !== "object" ||
    draft.projectData === null
  ) {
    return null;
  }

  return {
    toolType: draft.toolType,
    name: typeof draft.name === "string" ? draft.name : "",
    projectData: draft.projectData,
  };
}
