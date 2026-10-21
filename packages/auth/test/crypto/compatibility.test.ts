import * as OAuth from "@effect/auth/OAuth"
import * as Password from "@effect/auth/Password"
import * as Totp from "@effect/auth/Totp"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Schema } from "effect"
import * as Kdf from "effect/crypto/Kdf"
import * as KdfAdmission from "effect/crypto/KdfAdmission"
import { Base64Url } from "effect/encoding"
import { webCryptoLayer } from "../utils/crypto.ts"

import fixtures from "../fixtures/credentials.ts"

const admission = KdfAdmission.layer({ maxQueued: 0 })
const runtime = Layer.mergeAll(Kdf.layerPortable, admission, webCryptoLayer)

it.effect(
  "verifies stored PHC and PBKDF2 without normalizing password bytes or nesting admission",
  () =>
    Effect.gen(function*() {
      const hashing = yield* Password.PasswordHashing

      for (const encoded of [fixtures.password.phc, fixtures.password.pbkdf2]) {
        const verifier = Redacted.make(Password.EncodedPasswordHash.make(encoded))

        assert.deepEqual(yield* hashing.verify(Redacted.make(fixtures.password.password), verifier), {
          matches: true,
          needsRehash: true
        })
        assert.deepEqual(
          yield* hashing.verify(Redacted.make(fixtures.password.password.normalize("NFC")), verifier),
          { matches: false, needsRehash: false }
        )
      }

      const invalid = yield* hashing
        .verify(
          Redacted.make("x"),
          Redacted.make(
            Password.EncodedPasswordHash.make(fixtures.password.phc.replace("m=32", "m=65537"))
          )
        )
        .pipe(Effect.result)

      assert.strictEqual(invalid._tag, "Failure")
      assert.nestedPropertyVal(invalid, "failure._tag", "PasswordVerifierInvalid")
      assert.nestedPropertyVal(invalid, "failure.reason", "work-limit")
    }).pipe(Effect.provide(Password.PasswordHashing.layer().pipe(Layer.provide(runtime))))
)

const key = Redacted.make(Schema.decodeSync(Schema.Uint8ArrayFromBase64Url)(fixtures.totp.key))

const keys = Layer.succeed(Totp.TotpSecretKeys, {
  current: Effect.succeed({ keyId: "key1", key }),
  get: () => Effect.succeed(key)
})

it.effect("opens stored TOTP secrets and retains recovery and RFC 6238 formats", () =>
  Effect.gen(function*() {
    const cryptography = yield* Totp.TotpCryptography
    const binding = Schema.decodeSync(Totp.TotpSecretBinding)(fixtures.totp.binding)
    const envelope = Schema.decodeSync(Totp.TotpSecretEnvelope)(fixtures.totp.envelope)
    const secret = yield* cryptography.decryptSecret(binding, envelope)

    assert.strictEqual(Base64Url.encode(secret), fixtures.totp.secret)
    assert.strictEqual(yield* cryptography.matchCode(secret, "287082", 59000, 0), 1)
    assert.strictEqual<string>(
      yield* cryptography.recoveryDigest("totp", "subject", fixtures.totp.recovery),
      fixtures.totp.digest
    )
    const invalid = yield* cryptography.decryptSecret({ ...binding, credentialId: "other" }, envelope).pipe(
      Effect.result
    )
    assert.strictEqual(invalid._tag, "Failure")
    assert.nestedPropertyVal(invalid, "failure._tag", "TotpUnavailable")
    const codes = yield* cryptography.newRecoveryCodes("totp", "subject")

    assert.lengthOf(codes.codes, 10)
    assert.isTrue(codes.codes.every((code) => /^rc1-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(code)))
  }).pipe(
    Effect.provide(Totp.TotpCryptography.layer.pipe(Layer.provide(Layer.merge(keys, runtime))))
  ))

const keyring = {
  activeKeyId: "key1",
  keys: [{ id: "key1", material: Redacted.make(fixtures.oauth.key) }]
}

it.effect("opens all stored OAuth XChaCha envelope domains and rejects changed durable authority", () =>
  Effect.gen(function*() {
    const signIn = yield* OAuth.OAuthTransactionProtector
    const link = yield* OAuth.OAuthLinkTransactionProtector
    const connected = yield* OAuth.OAuthConnectedTransactionProtector
    const token = yield* OAuth.OAuthConnectedTokenProtector

    const a = fixtures.oauth.signIn,
      b = fixtures.oauth.link,
      c = fixtures.oauth.connected,
      d = fixtures.oauth.token

    const context = Schema.decodeSync(OAuth.OAuthSignInTransactionContext)(a.context)
    const sealed = Schema.decodeSync(OAuth.OAuthSealedTransaction)(a.sealed)

    assert.deepEqual(Schema.encodeSync(OAuth.OAuthTransactionSecrets)(yield* signIn.open({ context, sealed })), a.plain)
    const invalid = yield* signIn.open({
      context: { ...context, flowId: OAuth.OAuthSignInBegin.fields.flowId.make("other") },
      sealed
    }).pipe(Effect.result)
    assert.strictEqual(invalid._tag, "Failure")
    assert.nestedPropertyVal(invalid, "failure._tag", "OAuthUnavailable")
    assert.deepEqual(
      Schema.encodeSync(OAuth.OAuthTransactionSecrets)(
        yield* link.open({
          context: Schema.decodeSync(OAuth.OAuthLinkTransactionContext)(b.context),
          sealed: Schema.decodeSync(OAuth.OAuthSealedTransaction)(b.sealed)
        })
      ),
      b.plain
    )
    assert.deepEqual(
      Schema.encodeSync(OAuth.OAuthTransactionSecrets)(
        yield* connected.open({
          context: Schema.decodeSync(OAuth.OAuthConnectedTransactionContext)(c.context),
          sealed: Schema.decodeSync(OAuth.OAuthSealedTransaction)(c.sealed)
        })
      ),
      c.plain
    )
    assert.deepEqual(
      Schema.encodeSync(OAuth.OAuthConnectedTokenMaterial)(
        yield* token.open({
          context: Schema.decodeSync(OAuth.OAuthConnectedTokenContext)(d.context),
          sealed: Schema.decodeSync(OAuth.OAuthConnectedSealedTokens)(d.sealed)
        })
      ),
      d.plain
    )
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        OAuth.OAuthTransactionProtector.layer(keyring),
        OAuth.OAuthLinkTransactionProtector.layer(keyring),
        OAuth.OAuthConnectedTransactionProtector.layer(keyring),
        OAuth.OAuthConnectedTokenProtector.layer(keyring)
      ).pipe(Layer.provide(runtime))
    )
  ))
