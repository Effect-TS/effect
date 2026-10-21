import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

import { exactReturnTargets } from "../shared/returnTarget.ts"
import { EmailConfigurationError, EmailRejected, type EmailUnavailable } from "./errors.ts"
import { SafeReturnTarget } from "./models.ts"

/** Resolve before issuance and again before consumption. Never take a target from
 * email/deep-link data. The core returns this canonical value; it never redirects.
 */
export class EmailReturnTargets extends Context.Service<
  EmailReturnTargets,
  {
    readonly resolve: (
      input: string
    ) => Effect.Effect<SafeReturnTarget, EmailRejected | EmailUnavailable>
  }
>()("@effect/auth/EmailReturnTargets") {
  /** Exact paths or absolute HTTPS URLs on explicitly trusted origins. No query,
   * fragment, wildcard, normalization or prefix matching. Share trustedOrigins
   * with Http configuration; HTTP mutation admission remains independent. */
  static readonly exactRoutes = (
    routes: ReadonlyArray<string>,
    options?: { readonly trustedOrigins: ReadonlyArray<string> }
  ) => {
    const allowed = exactReturnTargets(routes, options?.trustedOrigins ?? []).pipe(
      Effect.mapError(() => EmailConfigurationError.make({}))
    )

    return Layer.effect(
      this,
      Effect.gen(function*() {
        const checked = yield* allowed

        return EmailReturnTargets.of({
          resolve: Effect.fn("EmailReturnTargets.resolve")(function*(input) {
            if (!checked.has(input)) return yield* EmailRejected.make({})

            return yield* Schema.decodeEffect(SafeReturnTarget)(input).pipe(
              Effect.mapError(() => EmailRejected.make({}))
            )
          })
        })
      })
    )
  }
}
