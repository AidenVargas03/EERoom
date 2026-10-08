/**
 * utils/logicEvaluator.js
 * -----------------------------------------------------------------------
 * Boolean logic evaluation and truth table generation for the Logic Gate
 * Sandbox. No React, no canvas - a circuit goes in, values come out, so
 * all of this is unit testable on its own (Milestone 4's unit test
 * requirement) without rendering anything.
 *
 * Circuit shape. A circuit is a directed graph:
 *
 *   {
 *     nodes: [
 *       { id: "n1", type: "INPUT",  label: "A" },
 *       { id: "n2", type: "AND" },
 *       { id: "n3", type: "OUTPUT", label: "Y" }
 *     ],
 *     edges: [
 *       { from: "n1", to: "n2", toPort: 0 }
 *     ]
 *   }
 *
 * `toPort` is which input pin of the destination the wire lands on, so a
 * student can wire A into the first pin of an AND and B into the second
 * and the two are not interchangeable. Gates read their inputs in port
 * order, which matters for nothing symmetric like AND but would matter if
 * non-commutative gates were added later.
 *
 * ---------------------------------------------------------------------
 * DESIGN DECISION: what an unconnected gate input evaluates to.
 *
 * A half-built circuit has pins with no wire attached. Three options were
 * considered:
 *
 *   1. Refuse to evaluate until the circuit is complete.
 *   2. Treat the pin as an unknown third value (X), like a hardware
 *      description language does.
 *   3. Treat the pin as logic 0 (LOW).
 *
 * This project uses option 3, and reports every floating pin alongside
 * the result so the interface can flag them.
 *
 * Reasoning: option 1 means a student building a circuit sees nothing at
 * all until the last wire lands, which is the opposite of what a learning
 * tool should do. Option 2 is the most electrically honest but turns
 * every truth table into three-valued logic, which is harder to read than
 * the two-valued tables a first course in digital logic teaches. Option 3
 * keeps the circuit evaluable at every stage, is deterministic, matches
 * the common convention of a floating input pulled to ground, and - as
 * long as the floating pins are reported rather than hidden - does not
 * mislead. `evaluateCircuit` therefore returns `floating`, and the page
 * is expected to show it.
 * ---------------------------------------------------------------------
 *
 * These are the standard truth-table definitions of the seven gates,
 * implemented from those definitions rather than adapted from an external
 * source, so there is no citation here.
 * -----------------------------------------------------------------------
 */

/**
 * The gates the sandbox offers. `inputs` is the pin count, which both the
 * evaluator and the canvas use, so the two can never disagree about how
 * many pins a gate has.
 *
 * All binary gates are kept strictly 2-input. An N-input XOR computes odd
 * parity rather than "exactly one true", which reliably confuses people
 * meeting it for the first time, so widening them is left out.
 */
export const GATES = {
  AND: { inputs: 2, evaluate: (i) => i[0] && i[1] },
  OR: { inputs: 2, evaluate: (i) => i[0] || i[1] },
  NOT: { inputs: 1, evaluate: (i) => !i[0] },
  NAND: { inputs: 2, evaluate: (i) => !(i[0] && i[1]) },
  NOR: { inputs: 2, evaluate: (i) => !(i[0] || i[1]) },
  XOR: { inputs: 2, evaluate: (i) => i[0] !== i[1] },
  XNOR: { inputs: 2, evaluate: (i) => i[0] === i[1] },
};

/** Gate type names, in the order they should appear in a palette. */
export const GATE_TYPES = Object.keys(GATES);

/** An OUTPUT node is a single-pin sink; it has no logic of its own. */
const OUTPUT_INPUTS = 1;

/** How many inputs a node of this type accepts. INPUT nodes accept none. */
export function inputCountFor(type) {
  if (type === "INPUT") return 0;
  if (type === "OUTPUT") return OUTPUT_INPUTS;
  return GATES[type] ? GATES[type].inputs : 0;
}

/**
 * Beyond this many INPUT nodes a truth table stops being a useful object:
 * 2^10 is 1024 rows, which no one reads, and the row count doubles with
 * every input after that.
 */
export const MAX_TRUTH_TABLE_INPUTS = 10;

/** Normalize a possibly-missing circuit into { nodes, edges }. */
function normalize(circuit) {
  const nodes = Array.isArray(circuit?.nodes) ? circuit.nodes : [];
  const edges = Array.isArray(circuit?.edges) ? circuit.edges : [];
  return { nodes, edges };
}

/**
 * Structural problems with a circuit, as human-readable strings. Empty
 * array means the circuit is well-formed - which is not the same as
 * complete, since floating pins are reported by evaluateCircuit instead.
 */
export function validateCircuit(circuit) {
  const { nodes, edges } = normalize(circuit);
  const problems = [];
  const byId = new Map();

  for (const node of nodes) {
    if (!node || typeof node.id !== "string" || node.id === "") {
      problems.push("A node is missing an id.");
      continue;
    }
    if (byId.has(node.id)) {
      problems.push(`Duplicate node id "${node.id}".`);
      continue;
    }
    if (node.type !== "INPUT" && node.type !== "OUTPUT" && !GATES[node.type]) {
      problems.push(`Node "${node.id}" has unknown type "${node.type}".`);
      continue;
    }
    byId.set(node.id, node);
  }

  const seenPins = new Set();
  for (const edge of edges) {
    const source = byId.get(edge?.from);
    const target = byId.get(edge?.to);

    if (!source) {
      problems.push(`A wire starts at unknown node "${edge?.from}".`);
      continue;
    }
    if (!target) {
      problems.push(`A wire ends at unknown node "${edge?.to}".`);
      continue;
    }
    if (target.type === "INPUT") {
      problems.push(`Input "${target.label || target.id}" cannot receive a wire.`);
      continue;
    }

    const port = edge.toPort ?? 0;
    const pinCount = inputCountFor(target.type);
    if (!Number.isInteger(port) || port < 0 || port >= pinCount) {
      problems.push(
        `A wire lands on pin ${port} of ${target.type} "${target.id}", which has ${pinCount} pin(s).`
      );
      continue;
    }

    // One wire per pin. Two sources driving one pin is a short, not a
    // circuit, and silently picking one would hide the mistake.
    const pinKey = `${target.id}:${port}`;
    if (seenPins.has(pinKey)) {
      problems.push(`Pin ${port} of "${target.id}" has more than one wire into it.`);
      continue;
    }
    seenPins.add(pinKey);
  }

  return problems;
}

/**
 * Stable ordering for truth table columns.
 *
 * Where nodes carry a board position, order follows the board: top to
 * bottom, then left to right. A half-adder with Sum above Carry therefore
 * produces columns S, C - the order the student sees - rather than C, S,
 * which is what sorting by label alone would give and reads backwards.
 *
 * Nodes without a position (a circuit built programmatically, or a unit
 * test fixture) fall back to label order, so the ordering is always
 * deterministic and columns never jump around between renders.
 */
function byBoardPosition(a, b) {
  const aPlaced = Number.isFinite(a.row) && Number.isFinite(a.col);
  const bPlaced = Number.isFinite(b.row) && Number.isFinite(b.col);

  if (aPlaced && bPlaced) {
    if (a.row !== b.row) return a.row - b.row;
    if (a.col !== b.col) return a.col - b.col;
  } else if (aPlaced !== bPlaced) {
    return aPlaced ? -1 : 1; // placed nodes first, so the order stays settled
  }

  return String(a.label ?? a.id).localeCompare(String(b.label ?? b.id));
}

/** INPUT nodes, ordered for display. */
export function getInputNodes(circuit) {
  const { nodes } = normalize(circuit);
  return nodes.filter((n) => n.type === "INPUT").sort(byBoardPosition);
}

/** OUTPUT nodes, same ordering. */
export function getOutputNodes(circuit) {
  const { nodes } = normalize(circuit);
  return nodes.filter((n) => n.type === "OUTPUT").sort(byBoardPosition);
}

/**
 * Evaluate every node for one set of input values.
 *
 * @param {object} circuit
 * @param {Record<string, boolean>} inputValues - keyed by INPUT node id
 * @returns {{values: Record<string, boolean>, floating: string[]}}
 *   `values` holds the logic level of every node. `floating` names every
 *   unconnected pin, as "<nodeId>:<port>", per the design decision above.
 * @throws {Error} if the circuit contains a feedback loop
 */
export function evaluateCircuit(circuit, inputValues = {}) {
  const { nodes, edges } = normalize(circuit);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // For each node, the source driving each of its input pins.
  const sources = new Map();
  for (const edge of edges) {
    if (!byId.has(edge?.from) || !byId.has(edge?.to)) continue;
    const port = edge.toPort ?? 0;
    if (!sources.has(edge.to)) sources.set(edge.to, new Map());
    sources.get(edge.to).set(port, edge.from);
  }

  const values = {};
  const floating = [];
  const resolved = new Set();
  const inProgress = new Set(); // nodes on the current DFS path - a repeat is a loop

  function resolve(id) {
    if (resolved.has(id)) return values[id];

    if (inProgress.has(id)) {
      // A combinational circuit is a DAG. A wire that feeds back on itself
      // is sequential logic (a latch), which has no single truth table, so
      // this is refused rather than guessed at.
      throw new Error(
        `Feedback loop detected at node "${id}". A combinational circuit cannot contain a loop.`
      );
    }

    const node = byId.get(id);
    if (!node) return false;

    inProgress.add(id);

    let result;
    if (node.type === "INPUT") {
      result = Boolean(inputValues[id]);
    } else {
      const pinCount = inputCountFor(node.type);
      const wired = sources.get(id);
      const pins = [];

      for (let port = 0; port < pinCount; port++) {
        const sourceId = wired?.get(port);
        if (sourceId === undefined) {
          // Unconnected pin: LOW, and recorded so the page can flag it.
          floating.push(`${id}:${port}`);
          pins.push(false);
        } else {
          pins.push(resolve(sourceId));
        }
      }

      result = node.type === "OUTPUT" ? pins[0] : GATES[node.type].evaluate(pins);
    }

    inProgress.delete(id);
    resolved.add(id);
    values[id] = Boolean(result);
    return values[id];
  }

  for (const node of nodes) resolve(node.id);

  return { values, floating };
}

/**
 * Build the full truth table: every combination of input values, with the
 * resulting output for each.
 *
 * Rows count up in binary with the first input as the most significant
 * bit, which is the order a textbook truth table uses.
 *
 * @returns {{inputs: string[], outputs: string[], rows: Array<{inputs: boolean[], outputs: boolean[]}>}}
 * @throws {RangeError} if the circuit has more inputs than MAX_TRUTH_TABLE_INPUTS
 * @throws {Error} if the circuit contains a feedback loop
 */
export function generateTruthTable(circuit) {
  const inputNodes = getInputNodes(circuit);
  const outputNodes = getOutputNodes(circuit);

  if (inputNodes.length > MAX_TRUTH_TABLE_INPUTS) {
    throw new RangeError(
      `A truth table for ${inputNodes.length} inputs would have ${2 ** inputNodes.length} rows. ` +
        `The limit is ${MAX_TRUTH_TABLE_INPUTS} inputs (${2 ** MAX_TRUTH_TABLE_INPUTS} rows).`
    );
  }

  const inputLabels = inputNodes.map((n) => String(n.label ?? n.id));
  const outputLabels = outputNodes.map((n) => String(n.label ?? n.id));

  // No inputs still has one row: a circuit of constants has one state.
  const rowCount = 2 ** inputNodes.length;
  const rows = [];

  for (let row = 0; row < rowCount; row++) {
    const combination = {};
    const inputBits = [];

    inputNodes.forEach((node, index) => {
      // Shift so index 0 is the most significant bit.
      const bit = Boolean((row >> (inputNodes.length - 1 - index)) & 1);
      combination[node.id] = bit;
      inputBits.push(bit);
    });

    const { values } = evaluateCircuit(circuit, combination);
    rows.push({
      inputs: inputBits,
      outputs: outputNodes.map((n) => Boolean(values[n.id])),
    });
  }

  return { inputs: inputLabels, outputs: outputLabels, rows };
}

/**
 * Boolean expression for one output, as readable text, e.g.
 * "Y = (A AND B) OR (NOT C)".
 *
 * Useful for checking a circuit matches an expression written by hand,
 * and it reads well in a demo. An unconnected pin becomes "0", matching
 * the evaluation rule above so the expression and the truth table always
 * agree.
 *
 * @throws {Error} if the circuit contains a feedback loop
 */
export function toExpression(circuit, outputId) {
  const { nodes, edges } = normalize(circuit);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const sources = new Map();
  for (const edge of edges) {
    if (!byId.has(edge?.from) || !byId.has(edge?.to)) continue;
    if (!sources.has(edge.to)) sources.set(edge.to, new Map());
    sources.get(edge.to).set(edge.toPort ?? 0, edge.from);
  }

  const inProgress = new Set();

  function build(id) {
    const node = byId.get(id);
    if (!node) return "0";

    if (inProgress.has(id)) {
      throw new Error(`Feedback loop detected at node "${id}".`);
    }
    inProgress.add(id);

    let text;
    if (node.type === "INPUT") {
      text = String(node.label ?? node.id);
    } else {
      const wired = sources.get(id);
      const pinCount = inputCountFor(node.type);
      const parts = [];
      for (let port = 0; port < pinCount; port++) {
        const sourceId = wired?.get(port);
        parts.push(sourceId === undefined ? "0" : build(sourceId));
      }

      if (node.type === "OUTPUT") text = parts[0];
      else if (node.type === "NOT") text = `NOT ${parts[0]}`;
      else text = `(${parts[0]} ${node.type} ${parts[1]})`;
    }

    inProgress.delete(id);
    return text;
  }

  const output = byId.get(outputId);
  const label = output ? String(output.label ?? output.id) : String(outputId);
  return `${label} = ${build(outputId)}`;
}
