import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import type * as Crypto from "effect/Crypto"
import { PgAuth } from "effect/postgres"
import * as Result from "effect/Result"
import { bytes, md5, scram } from "./fixtures/goldens.ts"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const success = <A, E>(result: Result.Result<A, E>): A => {
  assert.isTrue(Result.isSuccess(result))
  return (result as Result.Success<A, E>).success
}

const assertFailureTagged = (tag: string, run: () => Result.Result<unknown, { readonly _tag: string }>) => {
  const result = run()
  assert.isTrue(Result.isFailure(result))
  if (Result.isFailure(result)) assert.strictEqual(result.failure._tag, tag)
}

const assertEffectFailureTagged = (tag: string, run: () => Effect.Effect<unknown, PgAuth.AuthError, Crypto.Crypto>) =>
  Effect.gen(function*() {
    const error = yield* Effect.flip(run().pipe(Effect.provide(NodeCrypto.layer)))
    assert.strictEqual(error._tag, tag)
  })

describe("PgAuth", () => {
  describe("md5Password", () => {
    it.effect("matches the response PostgreSQL accepted", () =>
      Effect.gen(function*() {
        assert.strictEqual(
          yield* PgAuth.md5Password({ user: md5.user, password: md5.password, salt: bytes(md5.salt) }).pipe(
            Effect.provide(NodeCrypto.layer)
          ),
          md5.expected
        )
      }))

    it.effect("depends on the salt", () =>
      Effect.gen(function*() {
        const other = yield* PgAuth.md5Password({
          user: md5.user,
          password: md5.password,
          salt: bytes("00000000")
        }).pipe(Effect.provide(NodeCrypto.layer))
        assert.notStrictEqual(other, md5.expected)
      }))

    it.effect("rejects a salt that is not exactly four bytes", () =>
      Effect.gen(function*() {
        for (const salt of [new Uint8Array(0), new Uint8Array(3), new Uint8Array(5)]) {
          const result = yield* Effect.result(
            PgAuth.md5Password({ user: "u", password: "p", salt }).pipe(Effect.provide(NodeCrypto.layer))
          )
          assert.isTrue(Result.isFailure(result))
          if (Result.isFailure(result)) assert.strictEqual(result.failure._tag, "PgAuthError")
        }
      }))
  })

  describe("SCRAM-SHA-256", () => {
    it.effect("replays a captured PostgreSQL exchange", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        assert.strictEqual(decoder.decode(started.response), scram.clientFirstMessage)

        const continued = yield* PgAuth.scramContinue(started.state, encoder.encode(scram.serverFirstMessage)).pipe(
          Effect.provide(NodeCrypto.layer)
        )
        assert.strictEqual(decoder.decode(continued.response), scram.clientFinalMessage)

        success(PgAuth.scramFinish(continued.state, encoder.encode(scram.serverFinalMessage)))
      }))

    it.effect("rejects a server nonce that does not extend the client nonce", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        yield* assertEffectFailureTagged(
          "PgAuthError",
          () => PgAuth.scramContinue(started.state, encoder.encode("r=other,s=DBRmN4Xi9iMOo1tZfsi+Hg==,i=4096"))
        )
      }))

    it.effect("rejects a server nonce that only echoes the client nonce", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        yield* assertEffectFailureTagged(
          "PgAuthError",
          () =>
            PgAuth.scramContinue(
              started.state,
              encoder.encode(`r=${scram.clientNonce},s=DBRmN4Xi9iMOo1tZfsi+Hg==,i=4096`)
            )
        )
      }))

    it.effect("rejects a missing attribute", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        yield* assertEffectFailureTagged(
          "PgAuthError",
          () => PgAuth.scramContinue(started.state, encoder.encode(`r=${scram.clientNonce}x,i=4096`))
        )
      }))

    it.effect("rejects duplicate server attributes", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        yield* assertEffectFailureTagged(
          "PgAuthError",
          () =>
            PgAuth.scramContinue(
              started.state,
              encoder.encode(`${scram.serverFirstMessage},r=${scram.clientNonce}replacement`)
            )
        )
      }))

    it.effect("rejects malformed salts and iteration counts", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        const nonce = `${scram.clientNonce}server`
        for (
          const challenge of [
            `r=${nonce},s=,i=4096`,
            `r=${nonce},s=*,i=4096`,
            `r=${nonce},s=AA==,i=0`,
            `r=${nonce},s=AA==,i=-1`,
            `r=${nonce},s=AA==,i=1.5`,
            `r=${nonce},s=AA==,i=1e3`,
            `r=${nonce},s=AA==,i=1000001`,
            `r=${nonce},s=AA==,i=2147483648`
          ]
        ) {
          yield* assertEffectFailureTagged("PgAuthError", () =>
            PgAuth.scramContinue(started.state, encoder.encode(challenge)))
        }
      }))

    it.effect("rejects malformed SCRAM text", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        yield* assertEffectFailureTagged(
          "PgAuthError",
          () => PgAuth.scramContinue(started.state, new Uint8Array([0xff]))
        )
        yield* assertEffectFailureTagged(
          "PgAuthError",
          () => PgAuth.scramContinue(started.state, encoder.encode("not-an-attribute"))
        )
      }))

    it.effect("rejects a tampered server signature", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        const continued = yield* PgAuth.scramContinue(started.state, encoder.encode(scram.serverFirstMessage)).pipe(
          Effect.provide(NodeCrypto.layer)
        )
        assertFailureTagged(
          "PgAuthError",
          () => PgAuth.scramFinish(continued.state, encoder.encode("v=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="))
        )
      }))

    it.effect("surfaces a server error attribute", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        const continued = yield* PgAuth.scramContinue(started.state, encoder.encode(scram.serverFirstMessage)).pipe(
          Effect.provide(NodeCrypto.layer)
        )
        assertFailureTagged(
          "PgAuthError",
          () => PgAuth.scramFinish(continued.state, encoder.encode("e=invalid-proof"))
        )
      }))

    it.effect("rejects malformed server-final messages", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce }))
        const continued = yield* PgAuth.scramContinue(started.state, encoder.encode(scram.serverFirstMessage)).pipe(
          Effect.provide(NodeCrypto.layer)
        )
        for (
          const challenge of [
            new Uint8Array([0xff]),
            encoder.encode("x=missing-signature"),
            encoder.encode("v=*"),
            encoder.encode(`${scram.serverFinalMessage},${scram.serverFinalMessage}`)
          ]
        ) {
          assertFailureTagged("PgAuthError", () => PgAuth.scramFinish(continued.state, challenge))
        }
      }))

    it.effect("rejects a nonce outside SCRAM's printable ASCII range", () =>
      Effect.gen(function*() {
        for (const nonce of ["", "a,b", "with space", "line\nbreak", "nönce"]) {
          assertFailureTagged("PgAuthError", () => PgAuth.scramInit({ password: "x", nonce }))
        }
      }))

    it.effect("derives a different proof for a different password", () =>
      Effect.gen(function*() {
        const started = success(PgAuth.scramInit({ password: "wrong", nonce: scram.clientNonce }))
        const continued = yield* PgAuth.scramContinue(started.state, encoder.encode(scram.serverFirstMessage)).pipe(
          Effect.provide(NodeCrypto.layer)
        )
        assert.notStrictEqual(decoder.decode(continued.response), scram.clientFinalMessage)
        assertFailureTagged(
          "PgAuthError",
          () => PgAuth.scramFinish(continued.state, encoder.encode(scram.serverFinalMessage))
        )
      }))
  })
})
