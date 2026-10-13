// Readable mismatches for strings: a short one-line string is shown whole (`expected "a", got
// "b"`); a long one shows where it first differs, with a caret; a string that spans lines shows
// which lines differ, with a line of context around each change.
import { type Mismatch, show } from "../AssertionError.ts"

/** One-line strings longer than this show where they first differ instead of both in full. */
const LONG = 60
/** Characters shown on each side of the first difference. */
const WINDOW = 30
/** Unchanged lines shown around a changed one. */
const CONTEXT = 1
/** Lines of a line diff shown before it is cut. */
const MAX_LINES = 40
/** Above this many line pairs, a line diff only names the first differing line. */
const MAX_CELLS = 250_000

export const stringMismatch = (path: ReadonlyArray<PropertyKey>, actual: string, expected: string): Mismatch => {
  if (actual.includes("\n") || expected.includes("\n")) return { path, reason: lineDiff(actual, expected) }
  if (Math.max(actual.length, expected.length) > LONG) return { path, reason: firstDifference(actual, expected) }
  return { path, expected: show(expected), actual: show(actual) }
}

/** `s` as it is written inside quotes (escapes for `"`, `\`, control characters). */
const escaped = (s: string) => JSON.stringify(s).slice(1, -1)

const firstDifference = (actual: string, expected: string): string => {
  let i = 0
  while (i < actual.length && i < expected.length && actual[i] === expected[i]) i++
  const from = Math.max(0, i - WINDOW)
  const excerpt = (s: string) =>
    `"${from > 0 ? "…" : ""}${escaped(s.slice(from, i + WINDOW))}${s.length > i + WINDOW ? "…" : ""}"`
  // the caret goes under the first differing character, after `expected "` and the excerpt's start
  const caret = "expected ".length + 1 + (from > 0 ? 1 : 0) + escaped(expected.slice(from, i)).length
  const lengths = actual.length !== expected.length
    ? ` (expected ${expected.length} characters, got ${actual.length})`
    : ""
  return [
    `strings differ at index ${i}${lengths}:`,
    `expected ${excerpt(expected)}`,
    `actual   ${excerpt(actual)}`,
    `${" ".repeat(caret)}^`
  ].join("\n")
}

/** A line with its tabs and carriage returns visible, so a whitespace-only change shows. */
const visible = (line: string) => line.replace(/\t/g, "\\t").replace(/\r/g, "\\r")

type Op = readonly [" " | "-" | "+", string]

/** The line edits from `expected` to `actual`: a longest common subsequence of lines. */
const lineOps = (expected: ReadonlyArray<string>, actual: ReadonlyArray<string>): Array<Op> => {
  const n = expected.length
  const m = actual.length
  // lcs[i * (m + 1) + j]: the longest common subsequence of expected[i..] and actual[j..]
  const lcs = new Uint32Array((n + 1) * (m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * (m + 1) + j] = expected[i] === actual[j]
        ? lcs[(i + 1) * (m + 1) + j + 1] + 1
        : Math.max(lcs[(i + 1) * (m + 1) + j], lcs[i * (m + 1) + j + 1])
    }
  }
  const ops: Array<Op> = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && expected[i] === actual[j]) {
      ops.push([" ", expected[i]])
      i++
      j++
    } else if (j < m && (i === n || lcs[i * (m + 1) + j + 1] >= lcs[(i + 1) * (m + 1) + j])) {
      ops.push(["+", actual[j++]])
    } else {
      ops.push(["-", expected[i++]])
    }
  }
  // within a change, list what was expected before what was there instead
  for (let k = 0; k < ops.length; k++) {
    let end = k
    while (end < ops.length && ops[end][0] !== " ") end++
    if (end > k) {
      const run = ops.slice(k, end)
      ops.splice(k, run.length, ...run.filter(([op]) => op === "-"), ...run.filter(([op]) => op === "+"))
      k = end
    }
  }
  return ops
}

const lineDiff = (actual: string, expected: string): string => {
  const e = expected.split("\n")
  const a = actual.split("\n")
  if (e.length * a.length > MAX_CELLS) {
    let i = 0
    while (i < e.length && i < a.length && e[i] === a[i]) i++
    return [
      `strings differ at line ${i + 1} (expected ${e.length} lines, got ${a.length}):`,
      `- ${e[i] ?? "(no line)"}`,
      `+ ${a[i] ?? "(no line)"}`
    ].join("\n")
  }
  const ops = lineOps(e, a)
  const changed = ops.map(([op]) => op !== " ")
  const near = (k: number) => {
    for (let d = -CONTEXT; d <= CONTEXT; d++) if (changed[k + d]) return true
    return false
  }
  // unchanged lines far from a change are folded, unless folding would hide just one line
  const lines: Array<string> = []
  for (let k = 0; k < ops.length;) {
    let end = k
    while (end < ops.length && !near(end)) end++
    if (end - k > 1) {
      lines.push("  …")
      k = end
      continue
    }
    const [op, text] = ops[k++]
    lines.push(`${op} ${visible(text)}`)
  }
  const removed = ops.filter(([op]) => op === "-").length
  const added = ops.filter(([op]) => op === "+").length
  const shown = lines.length > MAX_LINES
    ? [...lines.slice(0, MAX_LINES), `… (+${lines.length - MAX_LINES} more lines)`]
    : lines
  return [`strings differ: ${removed} line(s) expected, ${added} line(s) instead (- expected, + actual):`, ...shown]
    .join("\n")
}
