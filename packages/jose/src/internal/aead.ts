import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { copy, decode, importError, nativeError, nativeErrorName, withSecret } from "./crypto.ts"
import { AuthenticationFailed } from "./cryptoErrors.ts"

const fields = {
  algorithm: Schema.Literal("AES-256-GCM"),
  key: Schema.Redacted(Schema.Uint8Array, { disallowJsonEncode: true }),
  nonce: Schema.Uint8Array,
  additionalData: Schema.Uint8Array
}
const EncryptInput = Schema.Struct({
  ...fields,
  plaintext: Schema.Redacted(Schema.Uint8Array, { disallowJsonEncode: true })
})
const DecryptInput = Schema.Struct({ ...fields, ciphertext: Schema.Uint8Array })
const keyBytes = Schema.Uint8Array.check(Schema.isBetweenLength(32, 32))
const nonceBytes = Schema.Uint8Array.check(Schema.isBetweenLength(12, 12))

const importKey = (key: Redacted.Redacted<Uint8Array>) =>
  withSecret(key, (material) =>
    decode(keyBytes, material, "key").pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => globalThis.crypto.subtle.importKey("raw", material, "AES-GCM", false, ["encrypt", "decrypt"]),
          catch: importError
        })
      ),
      Effect.uninterruptible
    ))

export const encrypt = Effect.fnUntraced(function*(input: typeof EncryptInput.Type) {
  const value = yield* decode(EncryptInput, input, "data")
  const iv = yield* decode(nonceBytes, value.nonce, "nonce").pipe(Effect.flatMap(copy))
  const additionalData = yield* copy(value.additionalData)
  return yield* withSecret(value.plaintext, (data) =>
    Effect.gen(function*() {
      const key = yield* importKey(value.key)
      return new Uint8Array(
        yield* Effect.tryPromise({
          try: () =>
            globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData, tagLength: 128 }, key, data),
          catch: nativeError
        })
      )
    }).pipe(Effect.uninterruptible))
})

export const decrypt = Effect.fnUntraced(function*(input: typeof DecryptInput.Type) {
  const value = yield* decode(DecryptInput, input, "data")
  const iv = yield* decode(nonceBytes, value.nonce, "nonce").pipe(Effect.flatMap(copy))
  const additionalData = yield* copy(value.additionalData)
  const data = yield* copy(value.ciphertext)
  if (data.length < 16) return yield* AuthenticationFailed.make({})
  const key = yield* importKey(value.key)
  const plaintext = yield* Effect.tryPromise({
    try: () => globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData, tagLength: 128 }, key, data),
    catch: (cause) => nativeErrorName(cause) === "OperationError" ? AuthenticationFailed.make({}) : nativeError(cause)
  })
  return Redacted.make(new Uint8Array(plaintext))
}, Effect.uninterruptible)
