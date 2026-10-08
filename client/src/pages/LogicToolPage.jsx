/**
 * pages/LogicToolPage.jsx
 * -----------------------------------------------------------------------
 * Tool 3: Logic Gate Sandbox.
 *
 * All boolean logic lives in utils/logicEvaluator.js so it can be unit
 * tested without rendering this component. This file is placement,
 * wiring, drawing and persistence only.
 *
 * ---------------------------------------------------------------------
 * SCOPE ADJUSTMENT, recorded here deliberately.
 *
 * The CST-451 plan called for free drag-and-drop built on react-konva.
 * This is the documented fallback from the Milestone 4 build plan: a
 * click-to-place grid instead of free positioning.
 *
 * Two consequences, both intentional:
 *
 *   1. Components snap to grid cells rather than being dragged anywhere.
 *      Every node therefore has a known cell, so wires have predictable
 *      endpoints and cannot be dropped in ambiguous places. It is also
 *      far easier to operate while narrating a screencast than dragging
 *      small shapes with a mouse.
 *   2. Rendering uses inline SVG rather than react-konva. Once positions
 *      are snapped to a grid there is nothing canvas-based left to do,
 *      and SVG stays crisp at any zoom, which matters for a recorded
 *      demonstration.
 *
 * react-konva was therefore never used, and has been removed from
 * client/package.json along with konva and mathjs. Restoring free
 * dragging in a later iteration would mean adding it back.
 * ---------------------------------------------------------------------
 *
 * How it is used:
 *   - pick a component from the palette, then click an empty cell
 *   - click an output pin, then an input pin, to run a wire
 *   - click an INPUT component's body to toggle it between 0 and 1
 *   - select a component and press Delete to remove it and its wires
 *
 * NOTE: styling is deliberately plain and matches the other pages. The
 * visual pass over the whole site comes after every tool works.
 * -----------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
// useSearchParams reads and writes the query string the way useState reads
// and writes component state; its setter takes the same options object as
// navigate(), which is where { replace: true } below comes from.
// Source: React Router v6 useSearchParams docs -
// https://reactrouter.com/en/main/hooks/use-search-params
import { useNavigate, useSearchParams } from "react-router-dom";
import { createProject, getProject, updateProject } from "../api/projects.js";
import ShareButton from "../components/ShareButton.jsx";
import palette from "../theme.js";
import {
  GATE_TYPES,
  evaluateCircuit,
  generateTruthTable,
  getInputNodes,
  getOutputNodes,
  inputCountFor,
  toExpression,
  validateCircuit,
} from "../utils/logicEvaluator.js";

const DEFAULT_NAME = "Untitled Logic Project";

// Grid geometry. Cells are generous enough that pins stay easy to hit.
const COLS = 7;
const ROWS = 5;
const CELL_W = 116;
const CELL_H = 84;
const NODE_W = 76;
const NODE_H = 46;
const PIN_R = 5;
// The visible pin stays small so the board reads like a schematic, but a
// 10px target is far below the 24px minimum interactive size in WCAG 2.5.8
// and is genuinely hard to hit with a mouse, let alone a finger. An
// invisible circle of this radius sits behind each pin and carries the
// click, so the target is 24px across while the drawing is unchanged.
const PIN_HIT_R = 12;

const BOARD_W = COLS * CELL_W;
const BOARD_H = ROWS * CELL_H;

/** Everything that can be placed, in palette order. */
const PALETTE = ["INPUT", ...GATE_TYPES, "OUTPUT"];

/** Where a node's box and pins sit, derived purely from its grid cell. */
function geometry(node) {
  const x = node.col * CELL_W + (CELL_W - NODE_W) / 2;
  const y = node.row * CELL_H + (CELL_H - NODE_H) / 2;
  const pinCount = inputCountFor(node.type);

  const inputPins = [];
  for (let i = 0; i < pinCount; i++) {
    // Spread pins evenly down the left edge: one pin sits centred, two
    // sit at a third and two thirds of the height.
    const fraction = (i + 1) / (pinCount + 1);
    inputPins.push({ x, y: y + NODE_H * fraction, port: i });
  }

  return {
    x,
    y,
    w: NODE_W,
    h: NODE_H,
    inputPins,
    outputPin: { x: x + NODE_W, y: y + NODE_H / 2 },
  };
}

/**
 * A cable-like curve from one point to another. Horizontal control points
 * bow the wire out sideways instead of cutting a straight diagonal through
 * the boxes in between. Shared by finished wires and the one currently
 * being dragged, so the preview looks exactly like the result.
 */
function cablePath(a, b) {
  const dx = Math.max(28, Math.abs(b.x - a.x) / 2);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

/**
 * Turn a mouse or touch position into board coordinates.
 *
 * The board is an SVG with its own coordinate system, and it can be scaled
 * down when the window is narrow, so a click at 400px across the screen is
 * not at x = 400 on the board. getScreenCTM gives the transform the browser
 * is applying, and inverting it maps the other way.
 */
function boardPointFromEvent(svgEl, event) {
  if (!svgEl) return null;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return null;
  const pt = svgEl.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  return pt.matrixTransform(ctm.inverse());
}

/** Next free label in a sequence, so inputs read A, B, C and outputs Y, Z. */
function nextLabel(existing, alphabet) {
  const used = new Set(existing.map((n) => n.label));
  for (const letter of alphabet) {
    if (!used.has(letter)) return letter;
  }
  return `${alphabet[0]}${existing.length}`;
}

const INPUT_LETTERS = "ABCDEFGHIJ".split("");
const OUTPUT_LETTERS = "YZWVUT".split("");

export default function LogicToolPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projectId, setProjectId] = useState(searchParams.get("project"));
  const [projectName, setProjectName] = useState("");
  const [circuit, setCircuit] = useState({ nodes: [], edges: [] });
  const [inputValues, setInputValues] = useState({});

  const [placing, setPlacing] = useState(null); // palette type awaiting a cell
  const [pendingWire, setPendingWire] = useState(null); // { from: nodeId }
  // A wire currently being dragged: where it started and where the pointer
  // is now, in board coordinates. Null when nothing is being dragged.
  const [dragWire, setDragWire] = useState(null);
  const svgRef = useRef(null);

  // Where the dragged wire is anchored. Derived from the source node rather
  // than stored, so it stays correct if the board changes mid-drag.
  const dragOrigin = dragWire
    ? geometry(circuit.nodes.find((n) => n.id === dragWire.from) ?? { col: 0, row: 0 })
        .outputPin
    : null;
  const [selectedId, setSelectedId] = useState(null);
  // A selected wire, keyed "<destination node id>:<port>". Only one wire can
  // land on a given input pin, so that pair identifies a wire uniquely and
  // stays valid when other wires are added or removed, which an index into
  // the edges array would not.
  const [selectedEdge, setSelectedEdge] = useState(null);

  const [loading, setLoading] = useState(Boolean(searchParams.get("project")));
  const [loadError, setLoadError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState("");

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

        if (project.tool_type !== "logic") {
          setLoadError("That project belongs to a different tool.");
          return;
        }

        setProjectName(project.name || "");
        const d = project.project_data || {};
        setCircuit({
          nodes: Array.isArray(d.nodes) ? d.nodes : [],
          edges: Array.isArray(d.edges) ? d.edges : [],
        });
        setInputValues(d.inputValues && typeof d.inputValues === "object" ? d.inputValues : {});
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

  // ---- editing -----------------------------------------------------------

  function placeAt(col, row) {
    if (!placing) return;
    // One component per cell keeps wire endpoints unambiguous.
    if (circuit.nodes.some((n) => n.col === col && n.row === row)) return;

    const id = `n${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    const node = { id, type: placing, col, row };

    if (placing === "INPUT") {
      node.label = nextLabel(getInputNodes(circuit), INPUT_LETTERS);
    } else if (placing === "OUTPUT") {
      node.label = nextLabel(getOutputNodes(circuit), OUTPUT_LETTERS);
    }

    setCircuit((c) => ({ ...c, nodes: [...c.nodes, node] }));
    setPlacing(null);
  }

  /** Clicking an output pin starts a wire; clicking an input pin finishes it. */
  function startWire(nodeId) {
    setPendingWire({ from: nodeId });
    setSelectedId(null);
    setSelectedEdge(null);
  }

  /**
   * Add a wire. Both ways of making one end up here: clicking an output pin
   * then an input pin, and dragging from one to the other.
   */
  function connect(fromId, toId, port) {
    if (fromId === toId) {
      // A node wired straight back to itself is the simplest feedback loop;
      // refuse it here rather than letting the evaluator throw later.
      return;
    }

    setCircuit((c) => ({
      ...c,
      // Replace anything already on this pin: one wire per input.
      edges: [
        ...c.edges.filter((e) => !(e.to === toId && (e.toPort ?? 0) === port)),
        { from: fromId, to: toId, toPort: port },
      ],
    }));
  }

  function finishWire(nodeId, port) {
    if (!pendingWire) return;
    connect(pendingWire.from, nodeId, port);
    setPendingWire(null);
  }

  /** Called when a dragged wire is released over an input pin. */
  function dropWire(nodeId, port) {
    if (!dragWire) return;
    connect(dragWire.from, nodeId, port);
    setDragWire(null);
    setPendingWire(null);
  }

  function deleteSelected() {
    // A wire is selected: take just that wire off, leave the components.
    if (selectedEdge) {
      const [toId, portText] = selectedEdge.split(":");
      const port = Number(portText);
      setCircuit((c) => ({
        ...c,
        edges: c.edges.filter((e) => !(e.to === toId && (e.toPort ?? 0) === port)),
      }));
      setSelectedEdge(null);
      return;
    }

    if (!selectedId) return;
    setCircuit((c) => ({
      nodes: c.nodes.filter((n) => n.id !== selectedId),
      // Wires dangling from a removed component go with it.
      edges: c.edges.filter((e) => e.from !== selectedId && e.to !== selectedId),
    }));
    setInputValues((v) => {
      const next = { ...v };
      delete next[selectedId];
      return next;
    });
    setSelectedId(null);
  }

  function clearBoard() {
    setCircuit({ nodes: [], edges: [] });
    setInputValues({});
    setSelectedId(null);
    setSelectedEdge(null);
    setPendingWire(null);
    setPlacing(null);
  }

  // Delete key removes the selected component.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.key === "Delete" || e.key === "Backspace") && (selectedId || selectedEdge)) {
        // Ignore while typing in the project name field.
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "Escape") {
        setDragWire(null);
        setPlacing(null);
        setPendingWire(null);
        setSelectedId(null);
        setSelectedEdge(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // ---- evaluation --------------------------------------------------------

  const problems = validateCircuit(circuit);

  let values = {};
  let floating = [];
  let evalError = "";
  try {
    const result = evaluateCircuit(circuit, inputValues);
    values = result.values;
    floating = result.floating;
  } catch (err) {
    evalError = err.message;
  }

  let truthTable = null;
  let tableError = "";
  if (!evalError && circuit.nodes.length > 0) {
    try {
      truthTable = generateTruthTable(circuit);
    } catch (err) {
      tableError = err.message;
    }
  }

  const outputNodes = getOutputNodes(circuit);
  const expressions = [];
  if (!evalError) {
    for (const out of outputNodes) {
      try {
        expressions.push(toExpression(circuit, out.id));
      } catch {
        // A loop already surfaces through evalError; no need to repeat it.
      }
    }
  }

  const floatingSet = new Set(floating);

  // ---- save --------------------------------------------------------------

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");

    const nameToSave = projectName.trim() || DEFAULT_NAME;
    const projectData = { nodes: circuit.nodes, edges: circuit.edges, inputValues };

    try {
      if (projectId) {
        await updateProject(projectId, { name: nameToSave, project_data: projectData });
      } else {
        const created = await createProject(nameToSave, "logic", projectData);
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
        <div className="max-w-5xl mx-auto bg-panel rounded-lg border border-rule p-8">
          <p className="text-ink-muted">Loading project...</p>
        </div>
      </div>
    );
  }

  const occupied = new Set(circuit.nodes.map((n) => `${n.col},${n.row}`));

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto bg-panel rounded-lg border border-rule p-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-ink-muted hover:underline mb-4"
        >
          &larr; Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-ink mb-2">Logic Gate Sandbox</h1>
        {/* Numbered because building a circuit genuinely is a sequence:
            you cannot wire a gate you have not placed. The wiring step
            says which side each pin is on, since that is the part people
            get stuck on. */}
        <ol className="text-sm text-ink-muted mb-6 space-y-1.5 max-w-prose">
          <li>
            <span className="text-copper font-medium">1.</span> Pick a component below,
            then click an empty cell to drop it on the board.
          </li>
          <li>
            <span className="text-copper font-medium">2.</span> To wire two components,
            click the small circle on the <span className="text-ink">right</span> edge of
            one, then the circle on the <span className="text-ink">left</span> edge of the
            next. A line is drawn between them.
          </li>
          <li>
            <span className="text-copper font-medium">3.</span> Click an INPUT box to flip
            it between 0 and 1. Wires carrying a 1 turn copper, and the truth table below
            fills in as you go.
          </li>
          <li>
            <span className="text-copper font-medium">4.</span> Wired something up wrong?
            Click the wire to select it, then press Delete or use the button. Dragging a
            new wire onto the same pin replaces the old one.
          </li>
        </ol>

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

        {/* ---- palette ---- */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {PALETTE.map((type) => (
            <button
              key={type}
              onClick={() => {
                setPlacing(placing === type ? null : type);
                setPendingWire(null);
              }}
              className={
                placing === type
                  ? "px-3 py-1.5 text-sm rounded-md bg-copper text-ground"
                  : "px-3 py-1.5 text-sm rounded-md border border-rule-strong text-ink-muted hover:bg-raised"
              }
            >
              {type}
            </button>
          ))}
          <span className="flex-1" />
          <button
            onClick={deleteSelected}
            disabled={!selectedId && !selectedEdge}
            className="px-3 py-1.5 text-sm rounded-md border border-rule-strong text-ink-muted hover:bg-raised disabled:opacity-40"
          >
            {selectedEdge ? "Delete wire" : "Delete selected"}
          </button>
          <button
            onClick={clearBoard}
            className="px-3 py-1.5 text-sm rounded-md border border-rule-strong text-ink-muted hover:bg-raised"
          >
            Clear board
          </button>
        </div>

        {/* Reserves its own height so the board does not jump when the
            message appears and disappears. */}
        <p className="text-xs mb-2 min-h-5">
          {placing ? (
            <span className="text-copper">
              Placing {placing}. Click an empty cell, or press Escape to cancel.
            </span>
          ) : pendingWire ? (
            <span className="text-copper">
              Wire started. Now click a circle on the left edge of another component, or
              press Escape to cancel.
            </span>
          ) : (
            <span className="text-ink-faint">
              Nothing selected. Pick a component above to start placing.
            </span>
          )}
        </p>

        {/* ---- board ---- */}
        {/* w-fit keeps the border wrapped tight around the board. The SVG is
            a fixed BOARD_W wide, so a full-width container shows its own
            background in the gap to the right of the last cell. max-w-full
            with overflow-x-auto still lets it scroll on a narrow screen. */}
        <div className="border border-rule rounded-md bg-panel overflow-x-auto mb-4 w-fit max-w-full mx-auto">
          <svg
            ref={svgRef}
            width={BOARD_W}
            height={BOARD_H}
            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
            className="block"
            // touchAction none stops a finger drag scrolling the page while
            // it is pulling a wire.
            style={{ touchAction: "none" }}
            onPointerMove={(event) => {
              if (!dragWire) return;
              const point = boardPointFromEvent(svgRef.current, event);
              if (point) setDragWire((d) => (d ? { ...d, x: point.x, y: point.y } : d));
            }}
            // Released anywhere that is not an input pin, the wire is
            // abandoned. The pin's own handler runs first and clears this.
            onPointerUp={() => setDragWire(null)}
            onPointerLeave={() => setDragWire(null)}
          >
            {/* empty cells, clickable while placing */}
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const taken = occupied.has(`${col},${row}`);
                return (
                  <rect
                    key={`${col},${row}`}
                    x={col * CELL_W}
                    y={row * CELL_H}
                    width={CELL_W}
                    height={CELL_H}
                    fill={placing && !taken ? palette.raised : palette.panel}
                    stroke={palette.grid}
                    onClick={() => {
                      setSelectedEdge(null);
                      placeAt(col, row);
                    }}
                    style={{ cursor: placing && !taken ? "pointer" : "default" }}
                  />
                );
              })
            )}

            {/* wires, coloured by the value they are carrying */}
            {circuit.edges.map((edge, i) => {
              const from = circuit.nodes.find((n) => n.id === edge.from);
              const to = circuit.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;

              const a = geometry(from).outputPin;
              const pin = geometry(to).inputPins[edge.toPort ?? 0];
              if (!pin) return null;

              const live = Boolean(values[edge.from]);
              const key = `${edge.to}:${edge.toPort ?? 0}`;
              const isSelected = selectedEdge === key;
              const d = cablePath(a, pin);

              return (
                <g key={`e${i}`}>
                  {/* A 2px line is almost impossible to click. This invisible
                      copy is 16px wide and carries the click, the same trick
                      used on the pins. */}
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedEdge(key);
                      setSelectedId(null);
                      setPendingWire(null);
                    }}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={
                      isSelected
                        ? palette.danger
                        : live
                        ? palette.copper
                        : palette.rule
                    }
                    strokeWidth={isSelected ? 3.5 : live ? 2.5 : 2}
                    strokeDasharray={isSelected ? "7 4" : undefined}
                    pointerEvents="none"
                  />
                </g>
              );
            })}

            {/* the wire currently being dragged, drawn the same way a
                finished one will be so there is no surprise on release */}
            {dragWire && (
              <path
                d={cablePath(dragOrigin, { x: dragWire.x, y: dragWire.y })}
                fill="none"
                stroke={palette.copperBright}
                strokeWidth={2}
                strokeDasharray="6 4"
                pointerEvents="none"
              />
            )}

            {/* components */}
            {circuit.nodes.map((node) => {
              const g = geometry(node);
              const isInput = node.type === "INPUT";
              const value = Boolean(values[node.id]);
              const selected = selectedId === node.id;
              const wiring = pendingWire?.from === node.id;

              return (
                <g key={node.id}>
                  <rect
                    x={g.x}
                    y={g.y}
                    width={g.w}
                    height={g.h}
                    rx={6}
                    fill={isInput && value ? palette.copperDim : palette.raised}
                    stroke={selected || wiring ? palette.copper : palette.ruleStrong}
                    strokeWidth={selected || wiring ? 2.5 : 1.5}
                    onClick={() => {
                      if (isInput) {
                        setInputValues((v) => ({ ...v, [node.id]: !v[node.id] }));
                      }
                      setSelectedId(node.id);
                    }}
                    style={{ cursor: "pointer" }}
                  />
                  <text
                    x={g.x + g.w / 2}
                    y={g.y + g.h / 2 + 4}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="600"
                    fill={palette.ink}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {node.label ? `${node.label} = ${value ? 1 : 0}` : node.type}
                  </text>

                  {/* input pins */}
                  {g.inputPins.map((pin) => {
                    const isFloating = floatingSet.has(`${node.id}:${pin.port}`);
                    return (
                      <g
                        key={pin.port}
                        onClick={() => finishWire(node.id, pin.port)}
                        onPointerUp={() => dropWire(node.id, pin.port)}
                        style={{
                          cursor: pendingWire || dragWire ? "pointer" : "default",
                        }}
                      >
                        <circle cx={pin.x} cy={pin.y} r={PIN_HIT_R} fill="transparent" />
                        <circle
                          cx={pin.x}
                          cy={pin.y}
                          r={PIN_R}
                          fill={isFloating ? palette.warningSurface : palette.panel}
                          stroke={isFloating ? palette.warning : palette.ruleStrong}
                          strokeWidth={1.5}
                          style={{ pointerEvents: "none" }}
                        />
                      </g>
                    );
                  })}

                  {/* output pin, except on OUTPUT components which have none */}
                  {node.type !== "OUTPUT" && (
                    <g
                      onClick={() => startWire(node.id)}
                      onPointerDown={(event) => {
                        // preventDefault stops the browser starting a text
                        // selection, which would fight the drag.
                        event.preventDefault();
                        setDragWire({
                          from: node.id,
                          x: g.outputPin.x,
                          y: g.outputPin.y,
                        });
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={g.outputPin.x}
                        cy={g.outputPin.y}
                        r={PIN_HIT_R}
                        fill="transparent"
                      />
                      <circle
                        cx={g.outputPin.x}
                        cy={g.outputPin.y}
                        r={PIN_R}
                        fill={value ? palette.copper : palette.panel}
                        stroke={palette.ruleStrong}
                        strokeWidth={1.5}
                        style={{ pointerEvents: "none" }}
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* ---- problems and warnings ---- */}
        {evalError && (
          <div className="mb-4 rounded-md bg-danger-surface border border-danger p-3 text-sm text-danger">
            {evalError}
          </div>
        )}
        {problems.length > 0 && (
          <div className="mb-4 rounded-md bg-danger-surface border border-danger p-3 text-sm text-danger">
            <ul className="list-disc list-inside space-y-1">
              {problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}
        {floating.length > 0 && !evalError && (
          <div className="mb-4 rounded-md bg-warning-surface border border-warning p-3 text-sm text-warning">
            <strong>{floating.length} unconnected input pin{floating.length === 1 ? "" : "s"}</strong>{" "}
            (ringed in amber). An unconnected pin is read as logic 0, so the circuit still
            evaluates, but the result is not what the finished circuit will do.
          </div>
        )}

        {/* ---- expressions ---- */}
        {expressions.length > 0 && (
          <div className="mb-4 bg-raised border border-rule rounded-md p-3">
            <span className="block text-xs text-ink-muted mb-1">Boolean expression</span>
            {expressions.map((e, i) => (
              <code key={i} className="block text-sm text-ink">
                {e}
              </code>
            ))}
          </div>
        )}

        {/* ---- truth table ---- */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">
            Truth table
          </h2>
          {tableError ? (
            <div className="rounded-md bg-warning-surface border border-warning p-3 text-sm text-warning">
              {tableError}
            </div>
          ) : !truthTable || truthTable.outputs.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Place at least one input and one output component to generate a truth table.
            </p>
          ) : (
            <div className="overflow-x-auto border border-rule rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-raised">
                  <tr>
                    {truthTable.inputs.map((label) => (
                      <th key={label} className="px-3 py-2 text-left font-semibold text-ink">
                        {label}
                      </th>
                    ))}
                    {truthTable.outputs.map((label) => (
                      <th key={label} className="px-3 py-2 text-left font-semibold text-copper-bright">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {truthTable.rows.map((row, i) => (
                    <tr key={i} className={i % 2 ? "bg-raised" : "bg-panel"}>
                      {row.inputs.map((bit, j) => (
                        <td key={j} className="px-3 py-1.5 font-mono text-ink">
                          {bit ? 1 : 0}
                        </td>
                      ))}
                      {row.outputs.map((bit, j) => (
                        <td key={j} className="px-3 py-1.5 font-mono font-semibold text-copper-bright">
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
