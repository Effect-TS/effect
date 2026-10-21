import * as Cause from "effect/Cause"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"

import { Unavailable } from "./models.ts"

/** @internal */
export const makeSecrets = Effect.gen(function*() {
  const random = yield* SecureRandom.SecureRandom
  const digest = yield* Digest.Digest

  return {
    random: random.randomBytes(32).pipe(
      Effect.map(Base64Url.encode),
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
    ),
    digest: (value: string) =>
      digest.digest(Digest.sha256, new TextEncoder().encode(value)).pipe(
        Effect.map(Base64Url.encode),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
      )
  }
})
