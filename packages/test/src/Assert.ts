// Assertions that report into a per-test sink.
//
// The sink is a Context.Reference, so every fiber forked by a test inherits it:
// an assertion failing in a forked (even detached) fiber still fails the owning
// test. Plain (sync / Promise) tests have no fiber after the first `await`, so the
// executor runs them one at a time and publishes the running one's sink in
// `plainSink`. No AsyncLocalStorage: it is Node-specific and not needed.
//
// Assertions are plain synchronous calls (they throw), not Effects. That makes
// them usable in sync, Promise and Effect tests alike, and it means an assertion
// can never be "built but not yielded".
import { Context, Equal, Fiber, Formatter } from "effect"
import { callSite } from "./CallSite.ts"
import type { Failure } from "./Protocol.ts"

export class Sink {
  count = 0
  readonly failures: Array<{ readonly error: AssertionError; readonly failure: Failure }> = []
}

export const CurrentSink = Context.Reference<Sink | undefined>("effect/test/CurrentSink", {
  defaultValue: () => undefined
})
/** The sink of the plain test that is running, if any. Executors run at most one at a time. */
let plainSink: Sink | undefined
export const setPlainSink = (sink: Sink | undefined) => {
  plainSink = sink
}

const currentSink = (): Sink | undefined => Fiber.getCurrent()?.getRef(CurrentSink) ?? plainSink

export class AssertionError extends Error {
  readonly failure: Failure
  constructor(failure: Failure) {
    super(failure.message)
    this.name = "AssertionError"
    this.failure = failure
  }
}

const record = () => {
  const sink = currentSink()
  if (sink) sink.count++
  return sink
}

const fail_ = (sink: Sink | undefined, failure: Omit<Failure, "kind" | "location">): never => {
  const location = callSite()
  const full: Failure = { kind: "assertion", ...failure, ...(location ? { location } : {}) }
  const error = new AssertionError(full)
  sink?.failures.push({ error, failure: full })
  throw error
}

export const show = (u: unknown): string => typeof u === "string" ? JSON.stringify(u) : Formatter.format(u)

// --- structural diff that agrees with Equal: only differing paths are reported

const isRecord = (u: unknown): u is Record<string, unknown> => typeof u === "object" && u !== null && !Array.isArray(u)

export const diff = (expected: unknown, actual: unknown, path = ""): Array<{ path: string; expected: string; actual: string }> => {
  if (Equal.equals(expected, actual)) return []
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const out = []
    for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
      const p = `${path}[${i}]`
      if (i >= actual.length) out.push({ path: p, expected: show(expected[i]), actual: "<missing>" })
      else if (i >= expected.length) out.push({ path: p, expected: "<missing>", actual: show(actual[i]) })
      else out.push(...diff(expected[i], actual[i], p))
    }
    return out
  }
  if (isRecord(expected) && isRecord(actual) && expected.constructor === actual.constructor) {
    const out = []
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)])
    for (const k of keys) {
      const p = `${path}.${k}`
      if (!(k in actual)) out.push({ path: p, expected: show(expected[k]), actual: "<missing>" })
      else if (!(k in expected)) out.push({ path: p, expected: "<missing>", actual: show(actual[k]) })
      else out.push(...diff(expected[k], actual[k], p))
    }
    if (out.length > 0) return out
  }
  return [{ path: path || "(root)", expected: show(expected), actual: show(actual) }]
}

// --- the assertions

export const assertEquals = <A>(actual: A, expected: A, message?: string): void => {
  const sink = record()
  if (Equal.equals(actual, expected)) return
  const d = diff(expected, actual)
  fail_(sink, {
    message: message ?? "Expected values to be Equal",
    expected: show(expected),
    actual: show(actual),
    diff: d
  })
}

export const assertTrue = (condition: boolean, message?: string): void => {
  const sink = record()
  if (condition === true) return
  fail_(sink, { message: message ?? "Expected condition to be true", expected: "true", actual: show(condition) })
}

export const assertFalse = (condition: boolean, message?: string): void => {
  const sink = record()
  if (condition === false) return
  fail_(sink, { message: message ?? "Expected condition to be false", expected: "false", actual: show(condition) })
}

export const fail = (message: string): never => fail_(record(), { message })
