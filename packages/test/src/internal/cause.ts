// Describing an Exit's Cause in failure messages, shared by the assertions and the matchers.
import * as Cause from "effect/Cause"
import * as Schema from "effect/Schema"
import * as SchemaIssue from "effect/SchemaIssue"
import { type AssertionError, isAssertionError, type Mismatch, show } from "../AssertionError.ts"
import { issueMismatches } from "./compare.ts"

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** The Schema issue an error carries, if it is one (or a `SchemaError`): optics and decoding fail with these. */
export const schemaIssueOf = (error: unknown): SchemaIssue.Issue | undefined =>
  Schema.isSchemaError(error) ? error.issue : SchemaIssue.isIssue(error) ? error : undefined

/** One line per reason in a Cause, for failure messages; a Schema issue as its own reasons, by path. */
export const reasonsOf = (cause: Cause.Cause<unknown>): Array<Mismatch> =>
  cause.reasons.flatMap((r): Array<Mismatch> => {
    const issue = Cause.isFailReason(r) ? schemaIssueOf(r.error) : undefined
    if (issue !== undefined) return issueMismatches(issue)
    return [{
      path: [],
      reason: Cause.isFailReason(r)
        ? `Fail(${show(r.error)})`
        : Cause.isDieReason(r)
        ? `Die(${r.defect instanceof Error ? `${r.defect.name}: ${r.defect.message}` : show(r.defect)})`
        : `Interrupt(${r.fiberId === undefined ? "" : `fiber #${r.fiberId}`})`
    }]
  })

/** What a Cause holds, counted: `1 typed failure, 1 defect`. */
export const shapeOf = (cause: Cause.Cause<unknown>): string => {
  const count = (pred: (r: Cause.Reason<unknown>) => boolean, word: string) => {
    const n = cause.reasons.filter(pred).length
    return n > 0 ? [plural(n, word)] : []
  }
  return [
    ...count(Cause.isFailReason, "typed failure"),
    ...count(Cause.isDieReason, "defect"),
    ...count(Cause.isInterruptReason, "interruption")
  ].join(", ") || "no reasons"
}

/** The assertion errors a Cause failed with, if that is all it holds (interruptions aside). */
export const assertionErrorsIn = (cause: Cause.Cause<unknown>): Array<AssertionError> | undefined => {
  const errors: Array<AssertionError> = []
  for (const r of cause.reasons) {
    if (Cause.isInterruptReason(r)) continue
    const value = Cause.isFailReason(r) ? r.error : r.defect
    if (!isAssertionError(value)) return undefined
    errors.push(value)
  }
  return errors.length > 0 ? errors : undefined
}
