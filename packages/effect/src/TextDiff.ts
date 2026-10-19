/**
 * The `TextDiff` module computes minimal edit scripts between sequences and
 * text, and formats line differences as unified diffs. Use it for readable
 * assertion output, CLI tools, reviewing or applying generated edits, and as
 * the diff step of editors and collaborative editing.
 *
 * Scripts are computed with Myers' O(ND) algorithm in linear space, after
 * trimming the common prefix and suffix. The module provides edit scripts and
 * unified output only; word diffs, semantic cleanup and alternative
 * algorithms are out of scope.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Equal from "./Equal.ts"

/**
 * One run of an edit script.
 *
 * **Details**
 *
 * `Equal` runs carry items kept from `before`, `Delete` runs carry items
 * removed from `before`, and `Insert` runs carry items added from `after`.
 * Scripts produced by this module never contain empty runs or two adjacent
 * runs with the same tag, and within each change the `Delete` run comes before
 * the `Insert` run.
 *
 * @see {@link diff} to compute an edit script
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Edit<A> = EditEqual<A> | EditInsert<A> | EditDelete<A>

/**
 * Run of items present in both sequences.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface EditEqual<A> {
  readonly _tag: "Equal"
  readonly items: ReadonlyArray<A>
}

/**
 * Run of items present only in the `after` sequence.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface EditInsert<A> {
  readonly _tag: "Insert"
  readonly items: ReadonlyArray<A>
}

/**
 * Run of items present only in the `before` sequence.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface EditDelete<A> {
  readonly _tag: "Delete"
  readonly items: ReadonlyArray<A>
}

/**
 * Options for computing an edit script.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface DiffOptions {
  /**
   * Largest number of inserted plus deleted items searched for in each
   * changed region. Common prefixes, suffixes and matching runs are free.
   * When a region needs more edits, the search splits it at the furthest
   * point it reached and continues on the rest, and a part that still cannot
   * be matched becomes a deletion followed by an insertion. The script stays
   * valid, and is minimal whenever the whole diff needs at most `maxEdits`
   * edits. Work is O((N + M) * maxEdits).
   *
   * @default Infinity
   */
  readonly maxEdits?: number | undefined
}

/**
 * Options for {@link unified}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface UnifiedOptions {
  /**
   * Number of unchanged lines shown around each change.
   *
   * @default 3
   */
  readonly context?: number | undefined
  /**
   * Name shown in the `---` header line.
   */
  readonly fromFile?: string | undefined
  /**
   * Name shown in the `+++` header line.
   */
  readonly toFile?: string | undefined
}

/**
 * Creates a function that computes a minimal edit script between two arrays
 * using a custom equivalence.
 *
 * **When to use**
 *
 * Use when items should match by key or by a structural comparison other than
 * `Equal.equals`.
 *
 * **Details**
 *
 * The script has the fewest possible inserted plus deleted items. `Equal`
 * runs carry the items from `before`.
 *
 * **Gotchas**
 *
 * Without `maxEdits`, work grows with the product of the input size and the
 * number of differences, which is quadratic for unrelated inputs. Set
 * `maxEdits` for large or untrusted inputs.
 *
 * **Example** (Matching items by id)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * const diffById = TextDiff.diffWith<{ readonly id: number }>((a, b) => a.id === b.id)
 *
 * diffById([{ id: 1 }, { id: 2 }], [{ id: 2 }]) // => [{ _tag: "Delete", items: [{ id: 1 }] }, { _tag: "Equal", items: [{ id: 2 }] }]
 * ```
 *
 * @see {@link diff} for the `Equal.equals` variant
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const diffWith = <A>(isEquivalent: (self: A, that: A) => boolean) =>
(
  before: ReadonlyArray<A>,
  after: ReadonlyArray<A>,
  options?: DiffOptions
): Array<Edit<A>> => editScript(before, after, (i, j) => isEquivalent(before[i], after[j]), options?.maxEdits)

/**
 * Computes a minimal edit script between two arrays, comparing items with
 * `Equal.equals`.
 *
 * **Details**
 *
 * The script has the fewest possible inserted plus deleted items. Among
 * equally short scripts the choice is deterministic, and each change lists its
 * deletions before its insertions.
 *
 * **Example** (Diffing two arrays)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * TextDiff.diff([1, 2, 3, 4], [1, 3, 4, 5]) // => [{ _tag: "Equal", items: [1] }, { _tag: "Delete", items: [2] }, { _tag: "Equal", items: [3, 4] }, { _tag: "Insert", items: [5] }]
 * ```
 *
 * @see {@link diffWith} to compare items with a custom equivalence
 * @see {@link apply} to replay a script
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const diff = <A>(
  before: ReadonlyArray<A>,
  after: ReadonlyArray<A>,
  options?: DiffOptions
): Array<Edit<A>> => diffWith<A>(Equal.equals)(before, after, options)

/**
 * Computes a minimal line-level edit script between two strings.
 *
 * **Details**
 *
 * Each line keeps its `\n` terminator, so `\n` versus `\r\n` endings and a
 * missing final newline are reported as changes. Joining the items of a run
 * gives the exact text it covers.
 *
 * **Gotchas**
 *
 * Without `maxEdits`, work is quadratic for unrelated inputs: two unrelated
 * 10,000-line texts take a few seconds. Set `maxEdits` when diffing large
 * or untrusted text.
 *
 * **Example** (Diffing lines)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * TextDiff.lines("a\nb\n", "a\nc\n") // => [{ _tag: "Equal", items: ["a\n"] }, { _tag: "Delete", items: ["b\n"] }, { _tag: "Insert", items: ["c\n"] }]
 * ```
 *
 * @see {@link codePoints} for a code point diff
 * @see {@link unified} to format a line diff
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const lines = (before: string, after: string, options?: DiffOptions): Array<Edit<string>> =>
  diffStrings(splitLines(before), splitLines(after), options)

/**
 * Computes a minimal code point edit script between two strings.
 *
 * **Details**
 *
 * Items are Unicode code points, so a surrogate pair is never split between
 * runs. Grapheme clusters, such as an emoji with modifiers or a letter with
 * combining marks, can still be split. The UTF-16 length of a run is the sum
 * of its items' lengths.
 *
 * **Gotchas**
 *
 * Without `maxEdits`, work is quadratic for unrelated inputs. Set `maxEdits`
 * when diffing large or untrusted text.
 *
 * **Example** (Diffing code points)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * TextDiff.codePoints("cat", "cut") // => [{ _tag: "Equal", items: ["c"] }, { _tag: "Delete", items: ["a"] }, { _tag: "Insert", items: ["u"] }, { _tag: "Equal", items: ["t"] }]
 * ```
 *
 * @see {@link lines} for a line diff
 * @see {@link applyText} to replay a script on a string
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const codePoints = (before: string, after: string, options?: DiffOptions): Array<Edit<string>> =>
  diffStrings(Array.from(before), Array.from(after), options)

/**
 * Applies an edit script to an array.
 *
 * **Details**
 *
 * `Equal` and `Delete` runs consume items from `before` by count, `Equal` runs
 * copy them to the result, and `Insert` runs add their items. Run contents are
 * not compared with `before`, since under a custom equivalence `Equal` items
 * can differ from the input.
 *
 * **Gotchas**
 *
 * Throws when the runs do not consume exactly `before.length` items.
 *
 * **Example** (Replaying a script)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * const edits = TextDiff.diff([1, 2, 3], [1, 3, 4])
 *
 * TextDiff.apply([1, 2, 3], edits) // => [1, 3, 4]
 * ```
 *
 * @see {@link applyText} for the string variant
 * @see {@link invert} to apply a script in reverse
 * @stability unstable
 * @category combinators
 * @since 4.0.6
 */
export const apply = <A>(before: ReadonlyArray<A>, edits: ReadonlyArray<Edit<A>>): Array<A> => {
  const out: Array<A> = []
  let index = 0
  for (const edit of edits) {
    if (edit._tag === "Insert") {
      for (const item of edit.items) out.push(item)
      continue
    }
    const end = index + edit.items.length
    if (end > before.length) throw new Error("Edit script consumes more items than the input contains")
    if (edit._tag === "Equal") {
      for (let i = index; i < end; i++) out.push(before[i])
    }
    index = end
  }
  if (index !== before.length) throw new Error("Edit script consumes fewer items than the input contains")
  return out
}

/**
 * Applies a text edit script to a string.
 *
 * **Details**
 *
 * Works with scripts from both {@link lines} and {@link codePoints}. The
 * joined items of each `Equal` and `Delete` run must match `before` at the
 * current position, so a script made for different text is rejected rather
 * than applied.
 *
 * **Gotchas**
 *
 * Throws when a run does not match `before`, or when the runs do not cover
 * all of it.
 *
 * **Example** (Replaying a code point diff)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * const edits = TextDiff.codePoints("cat", "cut")
 *
 * TextDiff.applyText("cat", edits) // => "cut"
 * ```
 *
 * @see {@link apply} for the array variant
 * @stability unstable
 * @category combinators
 * @since 4.0.6
 */
export const applyText = (before: string, edits: ReadonlyArray<Edit<string>>): string => {
  let out = ""
  let index = 0
  for (const edit of edits) {
    const text = edit.items.join("")
    if (edit._tag === "Insert") {
      out += text
      continue
    }
    if (!before.startsWith(text, index)) throw new Error(`Edit script does not match the input at index ${index}`)
    if (edit._tag === "Equal") out += text
    index += text.length
  }
  if (index !== before.length) throw new Error("Edit script covers less text than the input contains")
  return out
}

/**
 * Inverts an edit script, so it turns `after` back into `before`.
 *
 * **Details**
 *
 * Swaps the items of each change's `Delete` and `Insert` runs, keeping
 * deletions before insertions. `Equal` runs are unchanged.
 *
 * **Example** (Undoing a change)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * const edits = TextDiff.diff([1, 2], [1, 3])
 *
 * TextDiff.apply([1, 3], TextDiff.invert(edits)) // => [1, 2]
 * ```
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.6
 */
export const invert = <A>(edits: ReadonlyArray<Edit<A>>): Array<Edit<A>> => {
  const out: Array<Edit<A>> = []
  let deleted: ReadonlyArray<A> = []
  let inserted: ReadonlyArray<A> = []
  const flush = () => {
    if (inserted.length > 0) out.push({ _tag: "Delete", items: inserted })
    if (deleted.length > 0) out.push({ _tag: "Insert", items: deleted })
    deleted = []
    inserted = []
  }
  for (const edit of edits) {
    if (edit._tag === "Delete") {
      deleted = deleted.concat(edit.items)
    } else if (edit._tag === "Insert") {
      inserted = inserted.concat(edit.items)
    } else {
      flush()
      out.push(edit)
    }
  }
  flush()
  return out
}

/**
 * Formats a line edit script as a unified diff.
 *
 * **Details**
 *
 * The script must come from {@link lines}, or otherwise hold one line per
 * item. The output follows `diff -u`: hunks whose context would touch or
 * overlap are merged, and a final line without a newline is followed by
 * `\ No newline at end of file`. When `fromFile` or `toFile` is set, both
 * header lines are emitted and an unset name falls back to the other. A script
 * without changes produces an empty string.
 *
 * **Gotchas**
 *
 * Among equally small diffs, hunks can differ from those of GNU diff or Git,
 * which apply extra heuristics.
 *
 * **Example** (Formatting a unified diff)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * TextDiff.unified(TextDiff.lines("a\nb\n", "a\nc\n")) // => "@@ -1,2 +1,2 @@\n a\n-b\n+c\n"
 * ```
 *
 * @see {@link lines} to compute a line diff
 * @stability unstable
 * @category formatting
 * @since 4.0.6
 */
export const unified = (edits: ReadonlyArray<Edit<string>>, options?: UnifiedOptions): string => {
  const a: Array<string> = []
  const b: Array<string> = []
  // Changes are the maximal runs of edits between `Equal` runs
  const changes: Array<Change> = []
  let change: Change | undefined
  for (const edit of edits) {
    if (edit._tag === "Equal") {
      change = undefined
      for (const line of edit.items) {
        a.push(line)
        b.push(line)
      }
      continue
    }
    if (edit.items.length === 0) continue
    if (change === undefined) {
      change = { a0: a.length, a1: a.length, b0: b.length, b1: b.length }
      changes.push(change)
    }
    if (edit._tag === "Delete") {
      for (const line of edit.items) a.push(line)
      change.a1 = a.length
    } else {
      for (const line of edit.items) b.push(line)
      change.b1 = b.length
    }
  }
  if (changes.length === 0) return ""

  const context = Math.max(0, Math.floor(options?.context ?? 3))
  let out = ""
  if (options?.fromFile !== undefined || options?.toFile !== undefined) {
    out += `--- ${options.fromFile ?? options.toFile}\n+++ ${options.toFile ?? options.fromFile}\n`
  }
  let start = 0
  while (start < changes.length) {
    let end = start + 1
    while (end < changes.length && changes[end].a0 - changes[end - 1].a1 <= 2 * context) end++
    const first = changes[start]
    const last = changes[end - 1]
    const a0 = Math.max(0, first.a0 - context)
    const b0 = first.b0 - (first.a0 - a0)
    const a1 = Math.min(a.length, last.a1 + context)
    const b1 = last.b1 + (a1 - last.a1)
    out += `@@ -${range(a0, a1 - a0)} +${range(b0, b1 - b0)} @@\n`
    let line = a0
    for (let c = start; c < end; c++) {
      const change = changes[c]
      for (; line < change.a0; line++) out += formatLine(" ", a[line])
      for (let k = change.a0; k < change.a1; k++) out += formatLine("-", a[k])
      for (let k = change.b0; k < change.b1; k++) out += formatLine("+", b[k])
      line = change.a1
    }
    for (; line < a1; line++) out += formatLine(" ", a[line])
    start = end
  }
  return out
}

// -----------------------------------------------------------------------------
// internal
// -----------------------------------------------------------------------------

interface Block {
  readonly a: number
  readonly b: number
  readonly length: number
}

interface Change {
  a0: number
  a1: number
  b0: number
  b1: number
}

interface Region {
  readonly aLo: number
  readonly aHi: number
  readonly bLo: number
  readonly bHi: number
}

// A diagonal run from (x, y) to (u, v)
interface Snake {
  readonly x: number
  readonly y: number
  readonly u: number
  readonly v: number
}

const splitLines = (text: string): Array<string> => text.match(/[^\n]*\n|[^\n]+$/g) ?? []

const range = (start: number, count: number): string =>
  count === 0 ? `${start},0` : count === 1 ? `${start + 1}` : `${start + 1},${count}`

const formatLine = (prefix: string, line: string): string =>
  line.endsWith("\n") ? prefix + line : `${prefix}${line}\n\\ No newline at end of file\n`

// Interns the tokens so the search compares integers instead of strings
const diffStrings = (a: ReadonlyArray<string>, b: ReadonlyArray<string>, options?: DiffOptions) => {
  const ids = new Map<string, number>()
  const intern = (token: string) => {
    let id = ids.get(token)
    if (id === undefined) {
      id = ids.size
      ids.set(token, id)
    }
    return id
  }
  const ai = Int32Array.from(a, intern)
  const bi = Int32Array.from(b, intern)
  return editScript(a, b, (i, j) => ai[i] === bi[j], options?.maxEdits)
}

const editScript = <A>(
  a: ReadonlyArray<A>,
  b: ReadonlyArray<A>,
  equals: (i: number, j: number) => boolean,
  maxEdits?: number
): Array<Edit<A>> => {
  const blocks = matchingBlocks(a.length, b.length, equals, maxEdits)
  // A final empty block flushes the trailing changes
  blocks.push({ a: a.length, b: b.length, length: 0 })
  const out: Array<Edit<A>> = []
  let i = 0
  let j = 0
  for (const block of blocks) {
    if (block.a > i) out.push({ _tag: "Delete", items: a.slice(i, block.a) })
    if (block.b > j) out.push({ _tag: "Insert", items: b.slice(j, block.b) })
    if (block.length > 0) out.push({ _tag: "Equal", items: a.slice(block.a, block.a + block.length) })
    i = block.a + block.length
    j = block.b + block.length
  }
  return out
}

/**
 * Returns the matched runs of an edit script between `a[0..n)` and `b[0..m)`,
 * in order and with adjacent runs merged. Uses the linear-space
 * divide-and-conquer form of Myers' algorithm: find the middle snake of an
 * optimal path, then solve both halves. A region needing more than `maxEdits`
 * edits is split at the furthest point either search reached instead.
 */
const matchingBlocks = (
  n: number,
  m: number,
  equals: (i: number, j: number) => boolean,
  maxEdits = Infinity
): Array<Block> => {
  const blocks: Array<Block> = []
  const push = (a: number, b: number, length: number) => {
    if (length === 0) return
    const last = blocks[blocks.length - 1]
    if (last !== undefined && last.a + last.length === a && last.b + last.length === b) {
      blocks[blocks.length - 1] = { a: last.a, b: last.b, length: last.length + length }
    } else {
      blocks.push({ a, b, length })
    }
  }

  // Forward and reverse furthest-reaching x per diagonal, offset by n + m + 1
  const offset = n + m + 1
  const vf = new Int32Array(2 * offset + 1)
  const vb = new Int32Array(2 * offset + 1)
  // The searches meet after half the edits of a region, so a region needing at
  // most `maxEdits` edits is solved within `maxD` steps of each search
  const maxD = Math.ceil(Math.max(0, maxEdits) / 2)

  // Returns the middle snake of a minimal path in absolute coordinates, or an
  // empty snake at the furthest point reached when the region needs more than
  // `maxEdits` edits, or undefined when no point inside the region was reached
  const findSplit = (aLo: number, aHi: number, bLo: number, bHi: number): Snake | undefined => {
    const N = aHi - aLo
    const M = bHi - bLo
    const delta = N - M
    const odd = (delta & 1) === 1
    const limit = Math.min((N + M + 1) >> 1, maxD)
    vf[offset + 1] = 0
    vb[offset + 1] = 0
    for (let d = 0; d <= limit; d++) {
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && vf[offset + k - 1] < vf[offset + k + 1])
          ? vf[offset + k + 1]
          : vf[offset + k - 1] + 1
        let y = x - k
        const x0 = x
        const y0 = y
        while (x < N && y < M && equals(aLo + x, bLo + y)) {
          x++
          y++
        }
        vf[offset + k] = x
        if (odd && k >= delta - (d - 1) && k <= delta + (d - 1) && x + vb[offset + delta - k] >= N) {
          return { x: aLo + x0, y: bLo + y0, u: aLo + x, v: bLo + y }
        }
      }
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && vb[offset + k - 1] < vb[offset + k + 1])
          ? vb[offset + k + 1]
          : vb[offset + k - 1] + 1
        let y = x - k
        const x0 = x
        const y0 = y
        while (x < N && y < M && equals(aHi - x - 1, bHi - y - 1)) {
          x++
          y++
        }
        vb[offset + k] = x
        if (!odd && k >= delta - d && k <= delta + d && x + vf[offset + delta - k] >= N) {
          return { x: aHi - x, y: bHi - y, u: aHi - x0, v: bHi - y0 }
        }
      }
    }

    // Over the cap: split at the reached point that covers the most items. It
    // must lie strictly inside the region so that both parts shrink
    let best = 0
    let x = 0
    let y = 0
    for (let k = -limit; k <= limit; k += 2) {
      const xf = vf[offset + k]
      const yf = xf - k
      if (xf <= N && yf >= 0 && yf <= M && xf + yf > best) {
        best = xf + yf
        x = aLo + xf
        y = bLo + yf
      }
      const xb = vb[offset + k]
      const yb = xb - k
      if (xb <= N && yb >= 0 && yb <= M && xb + yb > best) {
        best = xb + yb
        x = aHi - xb
        y = bHi - yb
      }
    }
    return best > 0 && best < N + M ? { x, y, u: x, v: y } : undefined
  }

  // Regions are processed in order from an explicit stack, since splits over
  // the cap can nest deeper than the call stack allows
  const stack: Array<Region | Block> = [{ aLo: 0, aHi: n, bLo: 0, bHi: m }]
  while (stack.length > 0) {
    const task = stack.pop()!
    if ("length" in task) {
      push(task.a, task.b, task.length)
      continue
    }
    let { aHi, aLo, bHi, bLo } = task
    let prefix = 0
    while (aLo + prefix < aHi && bLo + prefix < bHi && equals(aLo + prefix, bLo + prefix)) prefix++
    push(aLo, bLo, prefix)
    aLo += prefix
    bLo += prefix
    let suffix = 0
    while (aLo < aHi - suffix && bLo < bHi - suffix && equals(aHi - suffix - 1, bHi - suffix - 1)) suffix++
    aHi -= suffix
    bHi -= suffix
    stack.push({ a: aHi, b: bHi, length: suffix })
    // With a common prefix and suffix removed, a non-empty side on both ends
    // means at least two edits, so both halves below are strictly smaller
    const snake = aLo < aHi && bLo < bHi ? findSplit(aLo, aHi, bLo, bHi) : undefined
    if (snake !== undefined) {
      stack.push(
        { aLo: snake.u, aHi, bLo: snake.v, bHi },
        { a: snake.x, b: snake.y, length: snake.u - snake.x },
        { aLo, aHi: snake.x, bLo, bHi: snake.y }
      )
    }
  }
  return blocks
}
