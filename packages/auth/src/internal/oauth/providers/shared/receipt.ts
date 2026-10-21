import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"

import * as OAuth from "../../../../oauth/OAuth.ts"
import { OAuthProtocolRejected, OAuthUnavailable } from "../../signInErrors.ts"
import type { TokenCompatibility } from "./compatibility.ts"

/**
 * Provider-specific raw fields are inspected before the generic token projection.
 *
 * @internal
 */
export const tokens = Effect.fnUntraced(function*(
  receipt: OAuth.TokenReceipt,
  compatibility: TokenCompatibility | undefined,
  input: Parameters<TokenCompatibility["inspectReceipt"]>[1]
) {
  if (compatibility !== undefined) {
    yield* compatibility.inspectReceipt({ ...receipt, body: Redacted.value(receipt.body) }, input)
  }

  return yield* OAuth.tokens(receipt).pipe(
    Effect.catchCause((cause) =>
      Effect.failCause(
        Cause.map(cause, (error) =>
          error._tag === "OAuthRejected"
            ? OAuthProtocolRejected.make({})
            : OAuthUnavailable.make({}))
      )
    )
  )
})
