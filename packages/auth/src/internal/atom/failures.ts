import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"

import { markAuthFailureReported, reportAuthFailure, ReportedOperationDefect } from "../shared/diagnostics.ts"

/**
 * Atom owns the public result. Typed failures retain their contract; unexpected
 * defects are reported before a finite marker reaches AsyncResult.
 *
 * @internal
 */
export const reportAtomDefects = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.uninterruptibleMask((restore) =>
    restore(effect).pipe(
      Effect.catchCause((cause) => {
        const defects = cause.reasons.filter(Cause.isDieReason)

        if (defects.length === 0) return Effect.failCause(cause)

        return reportAuthFailure("client-workflow", Cause.fromReasons<never>(defects)).pipe(
          Effect.andThen(
            Effect.failCause(
              markAuthFailureReported(
                Cause.fromReasons<E>(
                  cause.reasons.map((reason) =>
                    Cause.isDieReason(reason)
                      ? Cause.makeDieReason(ReportedOperationDefect.make({}))
                      : reason
                  )
                )
              )
            )
          )
        )
      })
    )
  )
