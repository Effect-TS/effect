import * as Digest from "effect/crypto/Digest"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import { phoneFailure } from "./failure.ts"
import { PhoneOtpRejected } from "./models.ts"
import { PhoneAdmission } from "./phoneAdmission.ts"
import { PhoneRequestContext } from "./phoneRequestContext.ts"

const tuple = Schema.fromJsonString(Schema.Array(Schema.String))

/** @internal */
export const phoneDigest = Effect.fnUntraced(function*(values: ReadonlyArray<string>) {
  const bytes = new TextEncoder().encode(
    yield* Schema.encodeEffect(tuple)(values).pipe(Effect.mapError(phoneFailure))
  )

  return TokenDigest.make(
    Base64Url.encode(
      yield* (yield* Digest.Digest).digest(Digest.sha256, bytes).pipe(Effect.mapError(phoneFailure))
    )
  )
})

/**
 * Trusted network scope is resolved per invocation, including suppressed requests.
 *
 * @internal
 */
export const phoneAdmission = Effect.fnUntraced(function*(
  moduleId: string,
  action: "request" | "attempt"
) {
  const context = yield* PhoneRequestContext

  return yield* (yield* PhoneAdmission).admit({
    moduleId,
    action,
    networkKey: Redacted.value(context.networkKey)
  })
})

/** @internal */
export const phoneAttemptAdmission = Effect.fnUntraced(function*(moduleId: string) {
  if (!(yield* phoneAdmission(moduleId, "attempt"))) return yield* PhoneOtpRejected.make({})
})
