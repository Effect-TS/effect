import * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { copy, decode, importError, nativeError, withSecret } from "./crypto.ts"

const Input = Schema.Struct({
  algorithm: Schema.Literal("SHA-256"),
  key: Schema.Redacted(Schema.Uint8Array, { disallowJsonEncode: true }),
  data: Schema.Uint8Array
})

const VerifyInput = Schema.Struct({ ...Input.fields, tag: Schema.Uint8Array })
const keyBytes = Schema.Uint8Array.check(Schema.isMinLength(1))

const importKey = (key: Redacted.Redacted<Uint8Array>) =>
  withSecret(key, (material) =>
    decode(keyBytes, material, "key").pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            globalThis.crypto.subtle.importKey(
              "raw",
              material,
              {
                name: "HMAC",
                hash: "SHA-256"
              },
              false,
              ["sign", "verify"]
            ),
          catch: importError
        })
      ),
      Effect.uninterruptible
    ))

export const sign = Effect.fnUntraced(function*(input: typeof Input.Type) {
  const value = yield* decode(Input, input, "data")
  const data = yield* copy(value.data)
  const key = yield* importKey(value.key)
  return new Uint8Array(
    yield* Effect.tryPromise({
      try: () => globalThis.crypto.subtle.sign("HMAC", key, data),
      catch: nativeError
    })
  )
}, Effect.uninterruptible)

export const verify = Effect.fnUntraced(function*(input: typeof VerifyInput.Type) {
  const value = yield* decode(VerifyInput, input, "data")
  const data = yield* copy(value.data)
  const tag = yield* copy(value.tag)
  const key = yield* importKey(value.key)
  return yield* Effect.tryPromise({
    try: () => globalThis.crypto.subtle.verify("HMAC", key, tag, data),
    catch: nativeError
  })
}, Effect.uninterruptible)
