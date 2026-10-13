// The error a failed assertion throws. It keeps the failure as data (what was
// asserted, why it failed, and every differing path) so the executor can send it
// to reporters without rendering it first; `message` holds the same as text, for
// anything else that catches it.
import * as Formatter from "effect/Formatter"

const TypeId = Symbol.for("@effect/test/AssertionError")

/** One reason an assertion failed, at a path into the actual value (empty: the value itself). */
export interface Mismatch {
  readonly path: ReadonlyArray<PropertyKey>
  readonly expected?: string | undefined
  readonly actual?: string | undefined
  readonly reason?: string | undefined
}

export class AssertionError extends Error {
  readonly [TypeId] = TypeId
  /** the assertion that failed, e.g. `equal` */
  readonly assertion: string
  /** what went wrong, in one line */
  readonly headline: string
  /** the user's label, shown above the headline */
  readonly label: string | undefined
  readonly mismatches: ReadonlyArray<Mismatch>
  /** the failures this one stands for (`soft`) or that led to it (`eventually`) */
  readonly failures: ReadonlyArray<AssertionError>

  constructor(options: {
    readonly assertion: string
    readonly headline: string
    readonly label?: string | undefined
    readonly mismatches?: ReadonlyArray<Mismatch> | undefined
    readonly failures?: ReadonlyArray<AssertionError> | undefined
    /**
     * Where the assertion was called, for assertions that fail later (in another fiber, or
     * after an `await`), where the error's own stack no longer leads back to the test.
     */
    readonly site?: Error | undefined
  }) {
    const mismatches = options.mismatches ?? []
    super([
      ...(options.label !== undefined ? [options.label] : []),
      options.headline,
      ...mismatches.map((m) => `  ${renderMismatch(m)}`)
    ].join("\n"))
    this.name = "AssertionError"
    this.assertion = options.assertion
    this.headline = options.headline
    this.label = options.label
    this.mismatches = mismatches
    this.failures = options.failures ?? []
    if (options.site?.stack !== undefined) {
      this.stack = `${this.name}: ${this.message}\n${options.site.stack.split("\n").slice(1).join("\n")}`
    }
  }
}

export const isAssertionError = (u: unknown): u is AssertionError => typeof u === "object" && u !== null && TypeId in u

/** `["user"]["name"]: expected "ann", got "bob"`; the path is omitted for the value itself. */
export const renderMismatch = (m: Mismatch): string => {
  const at = m.path.length > 0 ? `${formatPath(m.path)}: ` : ""
  if (m.reason !== undefined) return at + m.reason
  return `${at}expected ${m.expected}, got ${m.actual}`
}

export const formatPath = (path: ReadonlyArray<PropertyKey>): string => Formatter.formatPath(path as Array<PropertyKey>)

const MAX_VALUE_LENGTH = 200

/** An error's own fields (a tagged error's data), which `Formatter.format` leaves out. */
const errorFields = (e: Error): Record<string, unknown> | undefined => {
  const fields = Object.fromEntries(
    Object.entries(e).filter(([k, v]) => k !== "stack" && !(k === "_tag" && v === e.name))
  )
  return Object.keys(fields).length > 0 ? fields : undefined
}

/** A value as it appears in a failure: one line, cut short when long. */
export const show = (u: unknown): string => {
  const fields = u instanceof Error ? errorFields(u) : undefined
  const s = u instanceof Error
    ? fields ? `${u.name}(${Formatter.format(fields)})` : u.message ? `${u.name}: ${u.message}` : u.name
    : Formatter.format(u)
  return s.length <= MAX_VALUE_LENGTH ? s : `${s.slice(0, MAX_VALUE_LENGTH)}… (${s.length} characters)`
}
