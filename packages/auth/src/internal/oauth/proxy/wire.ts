import * as Cause from "effect/Cause"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

import { Rejected, Unavailable } from "./models.ts"

/** @internal */
export const noStore = {
  "cache-control": "no-store",
  pragma: "no-cache",
  "referrer-policy": "no-referrer"
}

/** @internal */
export const secrets = Effect.gen(function*() {
  const random = yield* SecureRandom.SecureRandom
  const digest = yield* Digest.Digest

  return {
    random: random.randomBytes(32).pipe(
      Effect.map((bytes) => {
        const value = Base64Url.encode(bytes)

        bytes.fill(0)

        return value
      }),
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
    ),
    digest: (value: string) =>
      digest.digest(Digest.sha256, new TextEncoder().encode(value)).pipe(
        Effect.map(Base64Url.encode),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
      )
  }
})

/** @internal */
export const readText = Effect.fnUntraced(function*<E, R>(stream: Stream.Stream<Uint8Array, E, R>, maximum: number) {
  let bytes = 0

  return yield* stream.pipe(
    Stream.mapEffect((chunk) => {
      bytes += chunk.byteLength

      return bytes > maximum ? Effect.fail(Rejected.make({})) : Effect.succeed(chunk)
    }),
    Stream.decodeText(),
    Stream.runFold(
      () => "",
      (text, chunk) => text + chunk
    ),
    Effect.catchCause((cause) =>
      Effect.failCause(
        Cause.map(cause, (error) => (Schema.is(Rejected)(error) ? error : Unavailable.make({})))
      )
    )
  )
})
