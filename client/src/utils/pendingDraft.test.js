import { describe, it, expect, beforeEach } from "vitest";
import { savePendingDraft, takePendingDraft, PENDING_KEY } from "./pendingDraft.js";

// A minimal stand-in for window.sessionStorage.
function fakeStorage() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("pending guest draft", () => {
  let storage;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it("returns a saved draft unchanged", () => {
    const draft = { toolType: "ohm", name: "Lab 2", projectData: { voltage: 12, current: 2 } };
    savePendingDraft(draft, storage);
    expect(takePendingDraft(storage)).toEqual(draft);
  });

  it("removes the draft once it has been taken", () => {
    savePendingDraft({ toolType: "wave", name: "", projectData: {} }, storage);
    takePendingDraft(storage);
    expect(takePendingDraft(storage)).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(takePendingDraft(storage)).toBeNull();
  });

  it("rejects an unknown tool type", () => {
    savePendingDraft({ toolType: "circuit", name: "x", projectData: {} }, storage);
    expect(takePendingDraft(storage)).toBeNull();
  });

  it("rejects a draft with no project data", () => {
    savePendingDraft({ toolType: "logic", name: "x", projectData: null }, storage);
    expect(takePendingDraft(storage)).toBeNull();
  });

  it("rejects corrupted JSON and clears it", () => {
    storage.setItem(PENDING_KEY, "{not json");
    expect(takePendingDraft(storage)).toBeNull();
    expect(storage.getItem(PENDING_KEY)).toBeNull();
  });

  it("replaces a missing name with an empty string", () => {
    savePendingDraft({ toolType: "logic", projectData: { nodes: [] } }, storage);
    expect(takePendingDraft(storage).name).toBe("");
  });
});
