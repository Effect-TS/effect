import { Pkce } from "@effect/auth"
import { assert, it } from "@effect/vitest"
import * as CryptoError from "effect/crypto/CryptoError"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Sha2 from "effect/crypto/Sha2"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"

it.effect("uses independently injected SecureRandom and Sha2 services for a PKCE transaction", () =>
  Effect.gen(function*() {
    const entropy = Uint8Array.from({ length: 32 }, (_, i) => i)
    const digest = new Uint8Array(32).fill(42)
    const calls: Array<string> = []
    const random = SecureRandom.make((size) => {
      assert.strictEqual(size, 32)
      calls.push("random")
      return entropy.slice()
    })
    const sha2 = Sha2.Sha2.of({
      digest: (algorithm, input) => {
        assert.strictEqual(algorithm, "SHA-256")
        assert.strictEqual(new TextDecoder().decode(input), Base64Url.encode(entropy))
        calls.push("digest")
        return Effect.succeed(digest)
      }
    })
    const transaction = yield* Pkce.make().pipe(
      Effect.provideService(SecureRandom.SecureRandom, random),
      Effect.provideService(Sha2.Sha2, sha2)
    )
    assert.strictEqual(Redacted.value(transaction.verifier), Base64Url.encode(entropy))
    assert.strictEqual(transaction.challenge, Base64Url.encode(digest))
    assert.deepStrictEqual(calls, ["random", "digest"])
    assert.notInclude(JSON.stringify(transaction), Redacted.value(transaction.verifier))
  }))

it.effect("generates transaction secrets with only SecureRandom", () =>
  Effect.gen(function*() {
    const entropy = new Uint8Array(32).fill(7)
    const secret = yield* Pkce.random().pipe(
      Effect.provideService(SecureRandom.SecureRandom, SecureRandom.make(() => entropy.slice()))
    )
    assert.strictEqual(Redacted.value(secret), Base64Url.encode(entropy))
  }))

it.effect("computes an S256 challenge with only Sha2", () =>
  Effect.gen(function*() {
    const digest = new Uint8Array(32).fill(42)
    const challenge = yield* Pkce.challenge(Redacted.make("v".repeat(43))).pipe(
      Effect.provideService(Sha2.Sha2, {
        digest: (algorithm, input) => {
          assert.strictEqual(algorithm, "SHA-256")
          assert.strictEqual(new TextDecoder().decode(input), "v".repeat(43))
          return Effect.succeed(digest)
        }
      })
    )
    assert.strictEqual(challenge, Base64Url.encode(digest))
  }))

it.effect("maps injected entropy and digest failures to safe unknown outcomes", () =>
  Effect.gen(function*() {
    const base = SecureRandom.make((size) => new Uint8Array(size))
    for (const operation of ["randomBytes", "digest"] as const) {
      const failure = new CryptoError.CryptoError({
        algorithm: operation === "randomBytes" ? "SecureRandom" : "SHA-256",
        method: operation,
        reason: new CryptoError.BadArgument({ description: "private-provider-cause" })
      })
      const random = SecureRandom.SecureRandom.of({
        ...base,
        randomBytes: operation === "randomBytes" ? () => Effect.fail(failure) : base.randomBytes
      })
      const sha2 = Sha2.Sha2.of({
        digest: () => operation === "digest" ? Effect.fail(failure) : Effect.succeed(new Uint8Array(32))
      })
      const error = yield* Pkce.make().pipe(
        Effect.provideService(SecureRandom.SecureRandom, random),
        Effect.provideService(Sha2.Sha2, sha2),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthUnavailable")
      assert.notInclude(JSON.stringify(error), "private-provider-cause")
      assert.notInclude(String(error), "private-provider-cause")
    }
  }))

it.effect("rejects wrong-sized entropy and digests from injected services", () =>
  Effect.gen(function*() {
    for (const operation of ["randomBytes", "digest"] as const) {
      for (const length of [0, 31, 33]) {
        const random = SecureRandom.make((size) => new Uint8Array(operation === "randomBytes" ? length : size))
        const sha2 = Sha2.Sha2.of({
          digest: () => Effect.succeed(new Uint8Array(operation === "digest" ? length : 32))
        })
        const error = yield* Pkce.make().pipe(
          Effect.provideService(SecureRandom.SecureRandom, random),
          Effect.provideService(Sha2.Sha2, sha2),
          Effect.flip
        )
        assert.strictEqual(error._tag, "OAuthUnavailable")
      }
    }
  }))

it.effect("rejects invalid and erased verifiers before invoking Sha2", () =>
  Effect.gen(function*() {
    const erased = Redacted.make("x".repeat(43))
    Redacted.wipeUnsafe(erased)
    const sha2 = Sha2.Sha2.of({
      digest: () => Effect.die("Sha2 must not be called")
    })
    for (const verifier of [erased, Redacted.make("x".repeat(129)), Redacted.make("!".repeat(43))]) {
      const error = yield* Pkce.challenge(verifier).pipe(
        Effect.provideService(Sha2.Sha2, sha2),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthUnavailable")
    }
  }))
