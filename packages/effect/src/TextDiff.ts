/**
 * The `TextDiff` module computes minimal edit scripts between sequences and
 * text, and formats line differences as unified diffs. Use it for readable
 * assertion output, CLI tools, reviewing or applying generated edits, and as
 * the diff step of editors and collaborative editing.
 *
 * Scripts are computed with Myers' O(ND) algorithm in linear space, after
 * trimming the common prefix and suffix.
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
   * Upper bound on the search work, counted in item comparisons and search
   * steps. When it is exhausted, unresolved regions are emitted as a deletion
   * followed by an insertion, so the script stays valid but may not be
   * minimal.
   *
   * @default Infinity
   */
  readonly maxCost?: number | undefined
}

/**
 * Options for {@link unified}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface UnifiedOptions extends DiffOptions {
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
 * Work grows with the product of the input size and the number of differences.
 * Set `maxCost` for large or untrusted inputs.
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
): Array<Edit<A>> =>
  toEdits(
    before,
    after,
    matchingBlocks(before.length, after.length, (i, j) => isEquivalent(before[i], after[j]), options?.maxCost)
  )

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
 * **Example** (Diffing lines)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * TextDiff.lines("a\nb\n", "a\nc\n") // => [{ _tag: "Equal", items: ["a\n"] }, { _tag: "Delete", items: ["b\n"] }, { _tag: "Insert", items: ["c\n"] }]
 * ```
 *
 * @see {@link chars} for a code point diff
 * @see {@link unified} to format a line diff
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const lines = (before: string, after: string, options?: DiffOptions): Array<Edit<string>> =>
  diffTokens(splitLines(before), splitLines(after), options)

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
 * **Example** (Diffing characters)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * TextDiff.chars("cat", "cut") // => [{ _tag: "Equal", items: ["c"] }, { _tag: "Delete", items: ["a"] }, { _tag: "Insert", items: ["u"] }, { _tag: "Equal", items: ["t"] }]
 * ```
 *
 * @see {@link lines} for a line diff
 * @see {@link applyText} to replay a script on a string
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const chars = (before: string, after: string, options?: DiffOptions): Array<Edit<string>> =>
  diffTokens(Array.from(before), Array.from(after), options)

/**
 * Applies an edit script to an array.
 *
 * **Details**
 *
 * `Equal` and `Delete` runs consume items from `before` by count, `Equal` runs
 * copy them to the result, and `Insert` runs add their items. Run contents are
 * not compared with `before`.
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
    const end = consume(index, edit, before.length)
    if (edit._tag === "Equal") {
      for (let i = index; i < end; i++) out.push(before[i])
    } else if (edit._tag === "Insert") {
      for (const item of edit.items) out.push(item)
    }
    index = end
  }
  ensureConsumed(index, before.length)
  return out
}

/**
 * Applies a text edit script to a string.
 *
 * **Details**
 *
 * Runs are measured by the UTF-16 length of their joined items, so this works
 * with scripts from both {@link lines} and {@link chars}. Run contents are not
 * compared with `before`.
 *
 * **Gotchas**
 *
 * Throws when the runs do not consume exactly `before.length` code units.
 *
 * **Example** (Replaying a character diff)
 *
 * ```ts import.meta.vitest
 * import { TextDiff } from "effect"
 *
 * const edits = TextDiff.chars("cat", "cut")
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
    const end = index + text.length
    if (end > before.length) throw new Error(overrun)
    if (edit._tag === "Equal") out += before.slice(index, end)
    index = end
  }
  ensureConsumed(index, before.length)
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
 * Formats the line differences between two strings as a unified diff.
 *
 * **Details**
 *
 * The output follows `diff -u`: hunks whose context would touch or overlap
 * are merged, and a final line without a newline is followed by
 * `\ No newline at end of file`. When `fromFile` or `toFile` is set, both
 * header lines are emitted and an unset name falls back to the other. Equal
 * inputs produce an empty string.
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
 * TextDiff.unified("a\nb\n", "a\nc\n") // => "@@ -1,2 +1,2 @@\n a\n-b\n+c\n"
 * ```
 *
 * @see {@link lines} for the underlying line diff
 * @stability unstable
 * @category formatting
 * @since 4.0.6
 */
export const unified = (before: string, after: string, options?: UnifiedOptions): string => {
  const a = splitLines(before)
  const b = splitLines(after)
  const context = Math.max(0, Math.floor(options?.context ?? 3))
  const blocks = matchingBlocks(a.length, b.length, internedEquals(a, b), options?.maxCost)

  // Changes are the gaps between matching blocks
  const changes: Array<Change> = []
  let i = 0
  let j = 0
  for (const block of blocks) {
    if (block.a > i || block.b > j) changes.push({ a0: i, a1: block.a, b0: j, b1: block.b })
    i = block.a + block.length
    j = block.b + block.length
  }
  if (i < a.length || j < b.length) changes.push({ a0: i, a1: a.length, b0: j, b1: b.length })
  if (changes.length === 0) return ""

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
  readonly a0: number
  readonly a1: number
  readonly b0: number
  readonly b1: number
}

const overrun = "Edit script consumes more items than the input contains"

const consume = (index: number, edit: Edit<unknown>, length: number): number => {
  if (edit._tag === "Insert") return index
  const end = index + edit.items.length
  if (end > length) throw new Error(overrun)
  return end
}

const ensureConsumed = (index: number, length: number) => {
  if (index !== length) throw new Error("Edit script consumes fewer items than the input contains")
}

const splitLines = (text: string): Array<string> => {
  const out: Array<string> = []
  let start = 0
  while (start < text.length) {
    const newline = text.indexOf("\n", start)
    const end = newline === -1 ? text.length : newline + 1
    out.push(text.slice(start, end))
    start = end
  }
  return out
}

const range = (start: number, count: number): string =>
  count === 0 ? `${start},0` : count === 1 ? `${start + 1}` : `${start + 1},${count}`

const formatLine = (prefix: string, line: string): string =>
  line.endsWith("\n") ? prefix + line : `${prefix}${line}\n\\ No newline at end of file\n`

const internedEquals = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => {
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
  return (i: number, j: number) => ai[i] === bi[j]
}

const diffTokens = (a: ReadonlyArray<string>, b: ReadonlyArray<string>, options?: DiffOptions) =>
  toEdits(a, b, matchingBlocks(a.length, b.length, internedEquals(a, b), options?.maxCost))

const toEdits = <A>(a: ReadonlyArray<A>, b: ReadonlyArray<A>, blocks: ReadonlyArray<Block>): Array<Edit<A>> => {
  const out: Array<Edit<A>> = []
  let i = 0
  let j = 0
  for (const block of [...blocks, { a: a.length, b: b.length, length: 0 }]) {
    if (block.a > i) out.push({ _tag: "Delete", items: a.slice(i, block.a) })
    if (block.b > j) out.push({ _tag: "Insert", items: b.slice(j, block.b) })
    if (block.length > 0) out.push({ _tag: "Equal", items: a.slice(block.a, block.a + block.length) })
    i = block.a + block.length
    j = block.b + block.length
  }
  return out
}

/**
 * Returns the matched runs of a minimal edit script between `a[0..n)` and
 * `b[0..m)`, in order and with adjacent runs merged. Uses the linear-space
 * divide-and-conquer form of Myers' algorithm: find the middle snake of an
 * optimal path, then solve both halves.
 */
const matchingBlocks = (
  n: number,
  m: number,
  equals: (i: number, j: number) => boolean,
  maxCost = Infinity
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
  let budget = maxCost

  // Sets `snake` to [x, y, u, v] in absolute coordinates, or returns false when
  // the budget runs out
  const snake = [0, 0, 0, 0]
  const middleSnake = (aLo: number, aHi: number, bLo: number, bHi: number): boolean => {
    const N = aHi - aLo
    const M = bHi - bLo
    const delta = N - M
    const odd = (delta & 1) === 1
    const maxD = (N + M + 1) >> 1
    vf[offset + 1] = 0
    vb[offset + 1] = 0
    for (let d = 0; d <= maxD; d++) {
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
        budget -= x - x0 + 1
        vf[offset + k] = x
        if (odd && k >= delta - (d - 1) && k <= delta + (d - 1) && x + vb[offset + delta - k] >= N) {
          snake[0] = aLo + x0
          snake[1] = bLo + y0
          snake[2] = aLo + x
          snake[3] = bLo + y
          return true
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
        budget -= x - x0 + 1
        vb[offset + k] = x
        if (!odd && k >= delta - d && k <= delta + d && x + vf[offset + delta - k] >= N) {
          snake[0] = aHi - x
          snake[1] = bHi - y
          snake[2] = aHi - x0
          snake[3] = bHi - y0
          return true
        }
      }
      if (budget < 0) return false
    }
    // Unreachable: an optimal path has at most N + M edits
    return false
  }

  const compare = (aLo: number, aHi: number, bLo: number, bHi: number): void => {
    const prefixStart = aLo
    while (aLo < aHi && bLo < bHi && equals(aLo, bLo)) {
      aLo++
      bLo++
    }
    push(prefixStart, bLo - (aLo - prefixStart), aLo - prefixStart)
    let suffix = 0
    while (aLo < aHi - suffix && bLo < bHi - suffix && equals(aHi - suffix - 1, bHi - suffix - 1)) suffix++
    aHi -= suffix
    bHi -= suffix
    // With a common prefix and suffix removed, a non-empty side on both ends
    // means at least two edits, so both halves below are strictly smaller
    if (aLo < aHi && bLo < bHi && budget >= 0 && middleSnake(aLo, aHi, bLo, bHi)) {
      const [x, y, u, v] = snake
      compare(aLo, x, bLo, y)
      push(x, y, u - x)
      compare(u, aHi, v, bHi)
    }
    push(aHi, bHi, suffix)
  }

  compare(0, n, 0, m)
  return blocks
}
