import * as BrowserCrypto from "@effect/platform-browser/BrowserCrypto"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Exit, Layer } from "effect"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as PlatformError from "effect/PlatformError"
import { webcrypto } from "node:crypto"

const withSubtle = (subtle: unknown): globalThis.Crypto =>
  Object.create(globalThis.crypto, { subtle: { value: subtle } })

const layerWith = (crypto: globalThis.Crypto) =>
  BrowserCrypto.layer.pipe(Layer.provide(Layer.succeed(BrowserCrypto.WebCrypto, crypto)))

const assertPlatformError = (
  exit: Exit.Exit<Uint8Array, PlatformError.PlatformError>,
  description: string
) => {
  assert.ok(Exit.isFailure(exit))
  assert.strictEqual(exit.cause.reasons.length, 1)
  const reason = exit.cause.reasons[0]
  assert.ok(Cause.isFailReason(reason))
  assert.strictEqual(reason.error._tag, "PlatformError")
  assert.instanceOf(reason.error.reason, PlatformError.SystemError)
  assert.strictEqual(reason.error.reason._tag, "Unknown")
  assert.strictEqual(reason.error.reason.module, "Crypto")
  assert.strictEqual(reason.error.reason.method, "digest")
  assert.strictEqual(reason.error.reason.description, description)
  return reason.error
}

const checkUnavailable = (crypto: globalThis.Crypto) =>
  Effect.gen(function*() {
    const service = yield* Crypto.Crypto
    const exit = yield* Effect.exit(Effect.suspend(() => service.digest("SHA-256", new Uint8Array())))
    assertPlatformError(exit, "crypto.subtle.digest is not available")
  }).pipe(Effect.provide(layerWith(crypto)))

describe("BrowserCrypto digest availability", () => {
  it.effect("fails with PlatformError when subtle is absent", () => checkUnavailable(withSubtle(undefined)))

  it.effect("fails with PlatformError when subtle exists but digest is absent", () =>
    checkUnavailable(withSubtle(Object.create(globalThis.crypto.subtle, { digest: { value: undefined } }))))

  it.effect("computes a real SHA-256 digest when subtle is present", () =>
    Effect.gen(function*() {
      const service = yield* Crypto.Crypto
      const bytes = yield* service.digest("SHA-256", new TextEncoder().encode("abc"))
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
      assert.strictEqual(hex, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    }).pipe(Effect.provide(layerWith(withSubtle(webcrypto.subtle)))))

  it.effect("preserves a rejected digest promise as a typed PlatformError", () => {
    const rejection = new Error("Digest rejected by fixture")
    const subtle = Object.create(globalThis.crypto.subtle, {
      digest: { value: () => Promise.reject(rejection) }
    })
    return Effect.gen(function*() {
      const service = yield* Crypto.Crypto
      const exit = yield* Effect.exit(service.digest("SHA-256", new Uint8Array()))
      const error = assertPlatformError(exit, "Could not compute digest")
      assert.strictEqual(error.reason.cause, rejection)
    }).pipe(Effect.provide(layerWith(withSubtle(subtle))))
  })

  it.effect("synthetic control: fails with PlatformError when subtle is null", () => checkUnavailable(withSubtle(null)))

  it.effect("still dies when the entire Web Crypto object is absent", () => {
    const fixture = { crypto: globalThis.crypto }
    Object.defineProperty(fixture, "crypto", { value: undefined })
    return Effect.gen(function*() {
      const exit = yield* Effect.exit(Crypto.Crypto.pipe(Effect.provide(layerWith(fixture.crypto))))
      assert.ok(Exit.isFailure(exit))
      assert.strictEqual(exit.cause.reasons.length, 1)
      const reason = exit.cause.reasons[0]
      assert.ok(Cause.isDieReason(reason))
      assert.ok(reason.defect instanceof Error)
      assert.strictEqual(reason.defect.message, "Web Crypto API is not available")
    })
  })
})
