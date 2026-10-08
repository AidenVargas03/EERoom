/**
 * utils/logicEvaluator.test.js
 * -----------------------------------------------------------------------
 * Unit tests for boolean circuit evaluation and truth table generation
 * (Milestone 4, unit test requirement). Covers normal operation and error
 * conditions, per the Capstone Handbook's requirement that test cases
 * exercise both.
 *
 * Run with: npm test
 *
 * Every gate is checked against its textbook truth table, and the
 * half-adder test checks a circuit whose behaviour is fixed by digital
 * logic rather than by anything in this codebase. The expression and the
 * truth table are produced by two separate code paths - one walks the
 * graph building text, the other evaluates every input combination - so
 * agreeing on the same answer is meaningful rather than circular.
 *
 * Uses Vitest's describe/it/expect API.
 * Source: Vitest API documentation - https://vitest.dev/api/
 * -----------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import {
  GATE_TYPES,
  MAX_TRUTH_TABLE_INPUTS,
  evaluateCircuit,
  generateTruthTable,
  getInputNodes,
  getOutputNodes,
  inputCountFor,
  toExpression,
  validateCircuit,
} from "./logicEvaluator.js";

/** A -> gate pin 0, B -> gate pin 1, gate -> Y. The standard 2-input rig. */
function twoInputCircuit(type) {
  return {
    nodes: [
      { id: "a", type: "INPUT", label: "A", col: 0, row: 0 },
      { id: "b", type: "INPUT", label: "B", col: 0, row: 1 },
      { id: "g", type, col: 2, row: 0 },
      { id: "y", type: "OUTPUT", label: "Y", col: 4, row: 0 },
    ],
    edges: [
      { from: "a", to: "g", toPort: 0 },
      { from: "b", to: "g", toPort: 1 },
      { from: "g", to: "y", toPort: 0 },
    ],
  };
}

/** The output column of a truth table as a bit string, e.g. "0001" for AND. */
function outputBits(table, column = 0) {
  return table.rows.map((row) => (row.outputs[column] ? 1 : 0)).join("");
}

describe("gate definitions against their textbook truth tables", () => {
  // Rows run A B = 00, 01, 10, 11.
  const expected = {
    AND: "0001",
    OR: "0111",
    NAND: "1110",
    NOR: "1000",
    XOR: "0110",
    XNOR: "1001",
  };

  for (const [type, bits] of Object.entries(expected)) {
    it(`${type} produces ${bits}`, () => {
      expect(outputBits(generateTruthTable(twoInputCircuit(type)))).toBe(bits);
    });
  }

  it("NOT produces 10", () => {
    const circuit = {
      nodes: [
        { id: "a", type: "INPUT", label: "A", col: 0, row: 0 },
        { id: "g", type: "NOT", col: 2, row: 0 },
        { id: "y", type: "OUTPUT", label: "Y", col: 4, row: 0 },
      ],
      edges: [
        { from: "a", to: "g", toPort: 0 },
        { from: "g", to: "y", toPort: 0 },
      ],
    };
    expect(outputBits(generateTruthTable(circuit))).toBe("10");
  });

  it("offers exactly seven gate types", () => {
    expect(GATE_TYPES).toHaveLength(7);
  });
});

describe("pin counts", () => {
  it("gives NOT one pin and the binary gates two", () => {
    expect(inputCountFor("NOT")).toBe(1);
    expect(inputCountFor("AND")).toBe(2);
    expect(inputCountFor("XNOR")).toBe(2);
  });

  it("gives INPUT no pins and OUTPUT one", () => {
    expect(inputCountFor("INPUT")).toBe(0);
    expect(inputCountFor("OUTPUT")).toBe(1);
  });
});

describe("unconnected pins read as logic 0 and are reported", () => {
  const halfWired = (type) => ({
    nodes: [
      { id: "a", type: "INPUT", label: "A", col: 0, row: 0 },
      { id: "g", type, col: 2, row: 0 },
      { id: "y", type: "OUTPUT", label: "Y", col: 4, row: 0 },
    ],
    edges: [
      { from: "a", to: "g", toPort: 0 },
      { from: "g", to: "y", toPort: 0 },
    ],
  });

  it("gives AND a 0 output when its second pin is floating and A is high", () => {
    const { values } = evaluateCircuit(halfWired("AND"), { a: true });
    expect(values.y).toBe(false);
  });

  it("gives OR a 1 output in the same situation", () => {
    const { values } = evaluateCircuit(halfWired("OR"), { a: true });
    expect(values.y).toBe(true);
  });

  it("names the floating pin so the interface can flag it", () => {
    const { floating } = evaluateCircuit(halfWired("AND"), { a: true });
    expect(floating).toEqual(["g:1"]);
  });

  it("reports nothing floating once every pin is wired", () => {
    const { floating } = evaluateCircuit(twoInputCircuit("AND"), { a: true, b: true });
    expect(floating).toEqual([]);
  });
});

describe("feedback loops are refused rather than guessed", () => {
  const loop = {
    nodes: [
      { id: "g1", type: "NOT", col: 1, row: 0 },
      { id: "g2", type: "NOT", col: 2, row: 0 },
      { id: "y", type: "OUTPUT", label: "Y", col: 4, row: 0 },
    ],
    edges: [
      { from: "g1", to: "g2", toPort: 0 },
      { from: "g2", to: "g1", toPort: 0 },
      { from: "g2", to: "y", toPort: 0 },
    ],
  };

  it("throws when evaluating a loop", () => {
    expect(() => evaluateCircuit(loop, {})).toThrow(/Feedback loop/);
  });

  it("throws when building a truth table from a loop", () => {
    expect(() => generateTruthTable(loop)).toThrow(/Feedback loop/);
  });

  it("throws on a gate wired directly back to itself", () => {
    const self = {
      nodes: [{ id: "g", type: "NOT", col: 1, row: 1 }],
      edges: [{ from: "g", to: "g", toPort: 0 }],
    };
    expect(() => evaluateCircuit(self, {})).toThrow(/Feedback loop/);
  });
});

describe("truth table size", () => {
  const inputsOnly = (count) => ({
    nodes: Array.from({ length: count }, (_, i) => ({
      id: `i${i}`,
      type: "INPUT",
      label: `I${i}`,
    })),
    edges: [],
  });

  it(`allows ${MAX_TRUTH_TABLE_INPUTS} inputs`, () => {
    expect(generateTruthTable(inputsOnly(MAX_TRUTH_TABLE_INPUTS)).rows).toHaveLength(
      2 ** MAX_TRUTH_TABLE_INPUTS
    );
  });

  it("refuses one more than the limit", () => {
    expect(() => generateTruthTable(inputsOnly(MAX_TRUTH_TABLE_INPUTS + 1))).toThrow(
      RangeError
    );
  });

  it("still gives one row for a circuit with no inputs", () => {
    const circuit = { nodes: [{ id: "y", type: "OUTPUT", label: "Y" }], edges: [] };
    expect(generateTruthTable(circuit).rows).toHaveLength(1);
  });

  it("counts rows up in binary with the first input as the most significant bit", () => {
    const table = generateTruthTable(twoInputCircuit("AND"));
    const combinations = table.rows.map((r) => r.inputs.map((b) => (b ? 1 : 0)).join(""));
    expect(combinations).toEqual(["00", "01", "10", "11"]);
  });
});

describe("validateCircuit - structural errors", () => {
  it("catches a duplicate node id", () => {
    const problems = validateCircuit({
      nodes: [
        { id: "a", type: "INPUT" },
        { id: "a", type: "INPUT" },
      ],
      edges: [],
    });
    expect(problems.some((p) => p.includes("Duplicate"))).toBe(true);
  });

  it("catches an unknown gate type", () => {
    const problems = validateCircuit({ nodes: [{ id: "a", type: "XNAND" }], edges: [] });
    expect(problems.some((p) => p.includes("unknown type"))).toBe(true);
  });

  it("catches a wire landing on a pin the gate does not have", () => {
    const problems = validateCircuit({
      nodes: [
        { id: "a", type: "INPUT" },
        { id: "g", type: "NOT" },
      ],
      edges: [{ from: "a", to: "g", toPort: 5 }],
    });
    expect(problems.some((p) => p.includes("pin 5"))).toBe(true);
  });

  it("catches two wires driving one pin, which is a short rather than a circuit", () => {
    const problems = validateCircuit({
      nodes: [
        { id: "a", type: "INPUT" },
        { id: "b", type: "INPUT" },
        { id: "g", type: "NOT" },
      ],
      edges: [
        { from: "a", to: "g", toPort: 0 },
        { from: "b", to: "g", toPort: 0 },
      ],
    });
    expect(problems.some((p) => p.includes("more than one wire"))).toBe(true);
  });

  it("catches a wire into an INPUT component", () => {
    const problems = validateCircuit({
      nodes: [
        { id: "a", type: "INPUT" },
        { id: "b", type: "INPUT" },
      ],
      edges: [{ from: "a", to: "b", toPort: 0 }],
    });
    expect(problems.some((p) => p.includes("cannot receive"))).toBe(true);
  });

  it("reports nothing for a well-formed circuit", () => {
    expect(validateCircuit(twoInputCircuit("AND"))).toEqual([]);
  });
});

describe("column ordering", () => {
  const halfAdder = {
    nodes: [
      { id: "a", type: "INPUT", label: "A", col: 0, row: 1 },
      { id: "b", type: "INPUT", label: "B", col: 0, row: 3 },
      { id: "x", type: "XOR", col: 3, row: 1 },
      { id: "n", type: "AND", col: 3, row: 3 },
      { id: "s", type: "OUTPUT", label: "S", col: 6, row: 1 },
      { id: "c", type: "OUTPUT", label: "C", col: 6, row: 3 },
    ],
    edges: [
      { from: "a", to: "x", toPort: 0 },
      { from: "b", to: "x", toPort: 1 },
      { from: "a", to: "n", toPort: 0 },
      { from: "b", to: "n", toPort: 1 },
      { from: "x", to: "s", toPort: 0 },
      { from: "n", to: "c", toPort: 0 },
    ],
  };

  it("follows the board, so Sum placed above Carry gives columns S then C", () => {
    expect(generateTruthTable(halfAdder).outputs).toEqual(["S", "C"]);
  });

  it("falls back to label order when nodes have no board position", () => {
    const unplaced = {
      nodes: [
        { id: "z", type: "INPUT", label: "Z" },
        { id: "a", type: "INPUT", label: "A" },
      ],
      edges: [],
    };
    expect(getInputNodes(unplaced).map((n) => n.label)).toEqual(["A", "Z"]);
  });

  it("separates inputs from outputs", () => {
    expect(getInputNodes(halfAdder)).toHaveLength(2);
    expect(getOutputNodes(halfAdder)).toHaveLength(2);
  });

  describe("half adder behaviour", () => {
    it("matches the truth table computed by hand", () => {
      const table = generateTruthTable(halfAdder);
      // A B -> S C :  00 -> 0 0,  01 -> 1 0,  10 -> 1 0,  11 -> 0 1
      expect(table.rows.map((r) => r.outputs.map((b) => (b ? 1 : 0)).join(""))).toEqual([
        "00",
        "10",
        "10",
        "01",
      ]);
    });

    it("derives expressions that agree with the gates used", () => {
      expect(toExpression(halfAdder, "s")).toBe("S = (A XOR B)");
      expect(toExpression(halfAdder, "c")).toBe("C = (A AND B)");
    });

    it("carries only when both inputs are high", () => {
      expect(evaluateCircuit(halfAdder, { a: true, b: true }).values.c).toBe(true);
      expect(evaluateCircuit(halfAdder, { a: true, b: false }).values.c).toBe(false);
    });
  });
});

describe("toExpression", () => {
  it("nests sub-expressions in the order the gates are wired", () => {
    const circuit = {
      nodes: [
        { id: "a", type: "INPUT", label: "A", col: 0, row: 0 },
        { id: "b", type: "INPUT", label: "B", col: 0, row: 1 },
        { id: "c", type: "INPUT", label: "C", col: 0, row: 2 },
        { id: "and", type: "AND", col: 2, row: 0 },
        { id: "not", type: "NOT", col: 2, row: 2 },
        { id: "or", type: "OR", col: 4, row: 1 },
        { id: "y", type: "OUTPUT", label: "Y", col: 6, row: 1 },
      ],
      edges: [
        { from: "a", to: "and", toPort: 0 },
        { from: "b", to: "and", toPort: 1 },
        { from: "c", to: "not", toPort: 0 },
        { from: "and", to: "or", toPort: 0 },
        { from: "not", to: "or", toPort: 1 },
        { from: "or", to: "y", toPort: 0 },
      ],
    };
    expect(toExpression(circuit, "y")).toBe("Y = ((A AND B) OR NOT C)");

    // The expression and the table come from different code paths, so
    // checking they agree is a real cross-check rather than a tautology.
    const table = generateTruthTable(circuit);
    const byHand = [0, 1, 2, 3, 4, 5, 6, 7]
      .map((n) => {
        const A = (n >> 2) & 1;
        const B = (n >> 1) & 1;
        const C = n & 1;
        return (A && B) || !C ? 1 : 0;
      })
      .join("");
    expect(outputBits(table)).toBe(byHand);
  });

  it("writes an unconnected pin as 0, matching how it is evaluated", () => {
    const circuit = {
      nodes: [
        { id: "a", type: "INPUT", label: "A", col: 0, row: 0 },
        { id: "g", type: "AND", col: 2, row: 0 },
        { id: "y", type: "OUTPUT", label: "Y", col: 4, row: 0 },
      ],
      edges: [
        { from: "a", to: "g", toPort: 0 },
        { from: "g", to: "y", toPort: 0 },
      ],
    };
    expect(toExpression(circuit, "y")).toBe("Y = (A AND 0)");
  });
});
