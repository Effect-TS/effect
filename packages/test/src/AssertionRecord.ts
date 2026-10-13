// Each test attempt's record of assertions: how many ran, which failed, and which
// assertion Effects / Promises were built but have not run. Assertions (Assert.ts)
// report into it, so the executor can fail a test that made no assertions, whose
// failed assertion was caught (or thrown in a fiber it never joined), or that
// dropped an assertion it built (a missing `yield*` / `await`).
//
// Effect tests find their record through the fiber: it is a Context.Reference, so
// every fiber a test forks (even detached) inherits it. Plain (sync / Promise) tests
// have no fiber after their first `await`, so the executor runs them one at a time
// and publishes the running one's record here. No AsyncLocalStorage: it is
// Node-specific and not needed.
import * as Context from "effect/Context"
import * as Fiber from "effect/Fiber"
import type { AssertionError } from "./AssertionError.ts"

export class AssertionRecord {
  count = 0
  /** failed assertions, unless an assertion that owns them (`throws`, `eventually`) handled them */
  readonly failures = new Set<AssertionError>()
  /** assertion Effects / Promises not run yet, with the stack of where they were built */
  readonly pending = new Map<object, { readonly assertion: string; readonly site: Error }>()
  /** open `Assert.soft` scopes of plain (sync / Promise) code, innermost last */
  readonly soft: Array<Array<AssertionError>> = []
}

export const CurrentRecord = Context.Reference<AssertionRecord | undefined>("@effect/test/AssertionRecord", {
  defaultValue: () => undefined
})

/** The failures collected by the `Assert.soft` scope (an Effect) this fiber runs in, if any. */
export const CurrentSoft = Context.Reference<Array<AssertionError> | undefined>("@effect/test/Soft", {
  defaultValue: () => undefined
})

/** The record of the plain test that is running, if any. Executors run at most one at a time. */
let plainRecord: AssertionRecord | undefined
export const setPlainRecord = (record: AssertionRecord | undefined) => {
  plainRecord = record
}

/** The record of the test this code runs for, if any. */
export const current = (): AssertionRecord | undefined => Fiber.getCurrent()?.getRef(CurrentRecord) ?? plainRecord

/** The soft scope a failure would be collected by: a plain one opened here, else the fiber's. */
export const currentSoft = (record: AssertionRecord | undefined): Array<AssertionError> | undefined =>
  record?.soft.at(-1) ?? Fiber.getCurrent()?.getRef(CurrentSoft)
