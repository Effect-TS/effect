import * as Cause from "effect/Cause"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

export class PersistenceMappingError extends Schema.TaggedError<PersistenceMappingError>()(
  "PersistenceMappingError",
  { operation: Schema.NonEmptyString, cause: Schema.Defect() }
) {}

/** Conflict recovery requires every nested Cause reason to be a recognized failure. */
export const isMappedConstraintConflict = (
  classify: (cause: unknown) => boolean,
  failure: unknown
): boolean => {
  const seen = new Map<unknown, boolean>()
  let inspected = 0

  const inspect = (current: unknown): boolean => {
    if (current === undefined || current === null) return false
    const known = seen.get(current)

    if (known !== undefined) return known
    if (inspected++ >= 24) return false
    // Cyclic or unclassified wrappers never authorize conflict recovery.
    seen.set(current, false)
    let conflict: boolean

    if (Cause.isCause(current)) {
      conflict = current.reasons.length > 0 &&
        current.reasons.every((reason) => Cause.isFailReason(reason) && inspect(reason.error))
    } else if (classify(current)) conflict = true
    else if (Predicate.isObjectOrArray(current)) {
      const wrapped = current as { readonly cause?: unknown; readonly reason?: unknown }

      const nested = [...new Set([wrapped.cause, wrapped.reason])].filter(
        (value) => value !== undefined
      )

      conflict = nested.length > 0 && nested.every(inspect)
    } else conflict = false
    seen.set(current, conflict)

    return conflict
  }

  return inspect(failure)
}
