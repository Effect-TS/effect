// Comparison for `Assert.equal` and the matchers: Effect's `Equal.equals` semantics, plus
// a prototype check, written as a walk that reports every differing path instead of a
// boolean. Matcher values may appear anywhere in the expected value.
import * as Equal from "effect/Equal"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import type * as SchemaIssue from "effect/SchemaIssue"
import { makeFormatterStandardSchemaV1 } from "effect/SchemaIssue"
import { type Mismatch, show } from "../AssertionError.ts"
import { stringMismatch } from "./diff.ts"

export const MatcherTypeId: unique symbol = Symbol.for("@effect/test/Matcher") as any

/** A value that decides for itself whether an actual value matches. See `Matcher.ts`. */
export interface Matcher<in A> {
  readonly [MatcherTypeId]: { readonly _A: (_: A) => void }
  /** what it matches, e.g. `an instance of User` */
  readonly description: string
  /** why `actual` does not match, at paths relative to it; empty when it matches */
  readonly test: (actual: unknown) => ReadonlyArray<Mismatch>
}

export const isMatcher = (u: unknown): u is Matcher<unknown> =>
  typeof u === "object" && u !== null && MatcherTypeId in u

export const makeMatcher = <A>(
  description: string,
  test: (actual: unknown) => ReadonlyArray<Mismatch>
): Matcher<A> => ({
  [MatcherTypeId]: { _A: () => {} },
  description,
  test,
  toString: () => description,
  toJSON: () => description
} as Matcher<A>)

/**
 * Every path at which `actual` differs from `expected` (empty: they are equal). With
 * `partial`, keys the expected object doesn't mention are ignored, at every depth;
 * arrays still need the same length.
 */
export const compare = (actual: unknown, expected: unknown, partial = false): Array<Mismatch> => {
  const out: Array<Mismatch> = []
  walk(actual, expected, [], partial, out, [])
  return out
}

export const matches = (actual: unknown, expected: unknown, partial = false): boolean =>
  compare(actual, expected, partial).length === 0

type Path = ReadonlyArray<PropertyKey>

const isObjectLike = (u: unknown): u is object => typeof u === "object" && u !== null

const isPlainPrototype = (proto: unknown) => proto === Object.prototype || proto === null

const walk = (
  a: unknown,
  e: unknown,
  path: Path,
  partial: boolean,
  out: Array<Mismatch>,
  visiting: Array<readonly [unknown, unknown]>
): void => {
  if (isMatcher(e)) {
    for (const m of e.test(a)) out.push({ ...m, path: [...path, ...m.path] })
    return
  }
  if (a === e || (typeof a === "number" && typeof e === "number" && a !== a && e !== e)) return
  if (typeof a === "string" && typeof e === "string") {
    out.push(stringMismatch(path, a, e))
    return
  }
  if (!isObjectLike(a) || !isObjectLike(e)) {
    out.push({ path, expected: show(e), actual: show(a) })
    return
  }
  // a pair already being compared further up closes a cycle (coinductive, like `Equal.equals`)
  for (const [x, y] of visiting) if (x === a && y === e) return
  visiting.push([a, e])
  try {
    walkObjects(a, e, path, partial, out, visiting)
  } finally {
    visiting.pop()
  }
}

const walkObjects = (
  a: object,
  e: object,
  path: Path,
  partial: boolean,
  out: Array<Mismatch>,
  visiting: Array<readonly [unknown, unknown]>
): void => {
  const pa = Object.getPrototypeOf(a)
  const pe = Object.getPrototypeOf(e)
  // a plain object and one without a prototype are both plain records (generators make the latter on purpose)
  if (pa !== pe && !(isPlainPrototype(pa) && isPlainPrototype(pe))) {
    const [sa, se] = [show(a), show(e)]
    out.push(
      sa === se
        ? { path, reason: `expected ${kindOf(pe)}, got ${kindOf(pa)}: ${sa}` }
        : { path, expected: se, actual: sa }
    )
    return
  }
  if (Equal.isEqual(a) || Equal.isEqual(e)) {
    if (Equal.equals(a, e)) return
    // localise the difference by walking the structure; if that finds none, the value's
    // own `[Equal.symbol]` disagrees with structural equality (or matchers / partial matching
    // accepted what `Equal.equals` can't)
    const before = out.length
    walkStructure(a, e, path, partial, out, visiting)
    if (out.length === before && !partial && !containsMatcher(e)) {
      out.push({
        path,
        reason: `not Equal.equals, though no field differs (its [Equal.symbol] returned false): ${show(a)}`
      })
    }
    return
  }
  walkStructure(a, e, path, partial, out, visiting)
}

const walkStructure = (
  a: any,
  e: any,
  path: Path,
  partial: boolean,
  out: Array<Mismatch>,
  visiting: Array<readonly [unknown, unknown]>
): void => {
  const recurse = (x: unknown, y: unknown, p: Path) => walk(x, y, p, partial, out, visiting)
  if (Array.isArray(a)) return walkArray(a, e, path, recurse, out)
  if (ArrayBuffer.isView(a)) {
    const [x, y] = [bytes(a), bytes(e as ArrayBufferView)]
    if (x.length !== y.length || x.some((b, i) => b !== y[i])) out.push({ path, expected: show(e), actual: show(a) })
    return
  }
  if (a instanceof Date) {
    const [x, y] = [a.getTime(), (e as Date).getTime()]
    if (x !== y && !(x !== x && y !== y)) out.push({ path, expected: show(e), actual: show(a) })
    return
  }
  if (a instanceof RegExp) {
    if (String(a) !== String(e)) out.push({ path, expected: show(e), actual: show(a) })
    return
  }
  if (a instanceof Map) return walkMap([...a], [...(e as Map<unknown, unknown>)], path, partial, recurse, out)
  if (HashMap.isHashMap(a)) {
    return walkMap([...a], [...(e as HashMap.HashMap<unknown, unknown>)], path, partial, recurse, out)
  }
  if (a instanceof Set || HashSet.isHashSet(a)) {
    for (const m of unordered([...(a as Iterable<unknown>)], [...(e as Iterable<unknown>)], partial)) {
      out.push({ ...m, path: [...path, ...m.path] })
    }
    return
  }
  if (a instanceof Error) {
    if (a.name !== (e as Error).name) recurse(a.name, (e as Error).name, [...path, "name"])
    if (a.message !== (e as Error).message) recurse(a.message, (e as Error).message, [...path, "message"])
    return walkRecord(a, e, path, partial, recurse, out)
  }
  // other Effect data types that iterate (Chunk, List, ...): compare what they contain
  if (Equal.isEqual(a) && Symbol.iterator in a) {
    return walkArray([...(a as Iterable<unknown>)], [...(e as Iterable<unknown>)], path, recurse, out)
  }
  return walkRecord(a, e, path, partial, recurse, out)
}

const walkArray = (
  a: ReadonlyArray<unknown>,
  e: ReadonlyArray<unknown>,
  path: Path,
  recurse: (x: unknown, y: unknown, p: Path) => void,
  out: Array<Mismatch>
) => {
  const n = Math.min(a.length, e.length)
  for (let i = 0; i < n; i++) recurse(a[i], e[i], [...path, i])
  for (let i = n; i < e.length; i++) out.push({ path: [...path, i], reason: `missing, expected ${describe(e[i])}` })
  for (let i = n; i < a.length; i++) out.push({ path: [...path, i], reason: `unexpected element ${show(a[i])}` })
}

const keysOf = (o: object): Array<PropertyKey> =>
  Reflect.ownKeys(o).filter((k) => Object.prototype.propertyIsEnumerable.call(o, k))

const walkRecord = (
  a: any,
  e: any,
  path: Path,
  partial: boolean,
  recurse: (x: unknown, y: unknown, p: Path) => void,
  out: Array<Mismatch>
) => {
  const actualKeys = new Set(keysOf(a))
  for (const k of keysOf(e)) {
    if (actualKeys.has(k)) recurse(a[k], e[k], [...path, k])
    else out.push({ path: [...path, k], reason: `missing, expected ${describe(e[k])}` })
  }
  if (partial) return
  const expectedKeys = new Set(keysOf(e))
  for (const k of actualKeys) {
    if (!expectedKeys.has(k)) out.push({ path: [...path, k], reason: `unexpected key, got ${show(a[k])}` })
  }
}

/** Entries are paired by key (`Equal.equals`); a key that is not a property key is shown formatted. */
const walkMap = (
  a: ReadonlyArray<readonly [unknown, unknown]>,
  e: ReadonlyArray<readonly [unknown, unknown]>,
  path: Path,
  partial: boolean,
  recurse: (x: unknown, y: unknown, p: Path) => void,
  out: Array<Mismatch>
) => {
  const used = new Set<number>()
  const at = (k: unknown): Path => [...path, typeof k === "string" || typeof k === "number" ? k : show(k)]
  for (const [k, v] of e) {
    const i = a.findIndex(([ak], i) => !used.has(i) && Equal.equals(ak, k))
    if (i === -1) {
      out.push({ path: at(k), reason: `missing key, expected ${describe(v)}` })
      continue
    }
    used.add(i)
    recurse(a[i][1], v, at(k))
  }
  if (partial) return
  a.forEach(([k, v], i) => {
    if (!used.has(i)) out.push({ path: at(k), reason: `unexpected key, got ${show(v)}` })
  })
}

/**
 * Multiset comparison: pairs each expected item with a distinct actual item that matches it
 * (a maximum bipartite matching, so overlapping matchers can't cause a false mismatch), and
 * reports what is left over on either side.
 */
export const unordered = (
  actual: ReadonlyArray<unknown>,
  expected: ReadonlyArray<unknown>,
  partial = false
): Array<Mismatch> => {
  const fits = expected.map((y) => actual.map((x) => matches(x, y, partial)))
  const owner = new Array<number>(actual.length).fill(-1) // actual index -> expected index
  const tryAssign = (j: number, seen: Array<boolean>): boolean => {
    for (let i = 0; i < actual.length; i++) {
      if (!fits[j][i] || seen[i]) continue
      seen[i] = true
      if (owner[i] === -1 || tryAssign(owner[i], seen)) {
        owner[i] = j
        return true
      }
    }
    return false
  }
  const out: Array<Mismatch> = []
  expected.forEach((y, j) => {
    if (!tryAssign(j, new Array(actual.length).fill(false))) {
      out.push({ path: [], reason: `missing element ${describe(y)}` })
    }
  })
  actual.forEach((x, i) => {
    if (owner[i] === -1) out.push({ path: [], reason: `unexpected element ${show(x)}` })
  })
  return out
}

const describe = (e: unknown): string => isMatcher(e) ? e.description : show(e)

const containsMatcher = (u: unknown, seen = new Set<unknown>()): boolean => {
  if (isMatcher(u)) return true
  if (!isObjectLike(u) || seen.has(u)) return false
  seen.add(u)
  const values = Symbol.iterator in u ? [...(u as Iterable<unknown>)] : keysOf(u).map((k) => (u as any)[k])
  return values.some((v) => containsMatcher(v, seen))
}

const kindOf = (proto: object | null): string =>
  proto === null
    ? "an object without a prototype"
    : proto === Object.prototype
    ? "a plain object"
    : `an instance of ${(proto as { constructor?: { name?: string } }).constructor?.name || "an anonymous class"}`

const bytes = (v: ArrayBufferView) => new Uint8Array(v.buffer, v.byteOffset, v.byteLength)

const formatIssue = makeFormatterStandardSchemaV1()

/** A Schema issue as mismatches: one per leaf, at its path. */
export const issueMismatches = (issue: SchemaIssue.Issue): Array<Mismatch> =>
  formatIssue(issue).issues.map((i): Mismatch => ({
    path: (i.path ?? []).map((p) => typeof p === "object" ? p.key : p),
    reason: i.message
  }))
