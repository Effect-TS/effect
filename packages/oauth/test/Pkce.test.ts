import { Pkce } from "@effect/oauth"
import { assert, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as PlatformError from "effect/PlatformError"
import * as Redacted from "effect/Redacted"

it.effect("uses the injected native Crypto service for entropy and SHA-256", () =>
  Effect.gen(function*() {
    const entropy = Uint8Array.from({ length: 32 }, (_, i) => i)
    const digest = new Uint8Array(32).fill(42)
    const calls: Array<string> = []
    const crypto = Crypto.make({
      randomBytes: (size) => {
        assert.strictEqual(size, 32)
        calls.push("random")
        return entropy.slice()
      },
      digest: (algorithm, input) => {
        assert.strictEqual(algorithm, "SHA-256")
        assert.strictEqual(new TextDecoder().decode(input), Base64Url.encode(entropy))
        calls.push("digest")
        return Effect.succeed(digest)
      }
    })
    const transaction = yield* Pkce.make().pipe(Effect.provideService(Crypto.Crypto, crypto))
    assert.strictEqual(Redacted.value(transaction.verifier), Base64Url.encode(entropy))
    assert.strictEqual(transaction.challenge, Base64Url.encode(digest))
    assert.deepStrictEqual(calls, ["random", "digest"])
    assert.notInclude(JSON.stringify(transaction), Redacted.value(transaction.verifier))
  }))

it.effect("maps injected entropy and digest failures to safe unknown outcomes", () =>
  Effect.gen(function*() {
    const failure = PlatformError.badArgument({
      module: "Crypto",
      method: "digest",
      description: "private-provider-cause"
    })
    const base = Crypto.make({
      randomBytes: (size) => new Uint8Array(size),
      digest: () => Effect.succeed(new Uint8Array(32))
    })
    for (const operation of ["randomBytes", "digest"] as const) {
      const crypto = Crypto.Crypto.of({ ...base, [operation]: () => Effect.fail(failure) })
      const error = yield* Pkce.make().pipe(Effect.provideService(Crypto.Crypto, crypto), Effect.flip)
      assert.strictEqual(error._tag, "OAuthUnavailable")
      assert.notInclude(JSON.stringify(error), "private-provider-cause")
      assert.notInclude(String(error), "private-provider-cause")
    }
  }))

it.effect("rejects wrong-sized entropy and digests from an injected service", () =>
  Effect.gen(function*() {
    for (const operation of ["randomBytes", "digest"] as const) {
      for (const length of [0, 31, 33]) {
        const crypto = Crypto.make({
          randomBytes: (size) => new Uint8Array(operation === "randomBytes" ? length : size),
          digest: () => Effect.succeed(new Uint8Array(operation === "digest" ? length : 32))
        })
        const error = yield* Pkce.make().pipe(Effect.provideService(Crypto.Crypto, crypto), Effect.flip)
        assert.strictEqual(error._tag, "OAuthUnavailable")
      }
    }
  }))

it.effect("rejects invalid and erased verifiers before invoking Crypto", () =>
  Effect.gen(function*() {
    const erased = Redacted.make("x".repeat(43))
    Redacted.wipeUnsafe(erased)
    const crypto = Crypto.make({
      randomBytes: (size) => new Uint8Array(size),
      digest: () => Effect.die("Crypto must not be called")
    })
    for (const verifier of [erased, Redacted.make("x".repeat(129)), Redacted.make("!".repeat(43))]) {
      const error = yield* Pkce.challenge(verifier).pipe(
        Effect.provideService(Crypto.Crypto, crypto),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthUnavailable")
    }
  }))
