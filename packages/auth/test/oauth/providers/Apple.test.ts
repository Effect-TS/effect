import { assert, describe, it } from "@effect/vitest"
import * as Signature from "effect/crypto/Signature"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"
import * as jose from "jose"
import { vi } from "vitest"

import * as Jwk from "@effect/auth/jose/Jwk"
import * as Apple from "@effect/auth/oauth/providers/Apple"
import {
  claims,
  cryptoLayer,
  form,
  generateSigningKeys,
  metadataFor,
  oidcAuthorization,
  oidcExchange,
  providerOptions,
  seconds,
  sign,
  signingKeys,
  transport
} from "./fixtures.ts"

const issuer = "https://appleid.apple.com"
const metadata = {
  ...metadataFor(issuer),
  authorization_endpoint: issuer + "/auth/authorize",
  token_endpoint: issuer + "/auth/token",
  jwks_uri: issuer + "/auth/keys",
  userinfo_endpoint: undefined,
  code_challenge_methods_supported: undefined,
  authorization_response_iss_parameter_supported: false
}

const signingOptions = Effect.gen(function*() {
  const keys = yield* generateSigningKeys("ES256")
  const pem = yield* Effect.promise(() => jose.exportPKCS8(keys.privateKey))
  return {
    keys,
    options: {
      clientId: providerOptions.clientId,
      redirectUri: providerOptions.redirectUri,
      teamId: "ABCDEFGHIJ",
      keyId: "1234567890",
      privateKey: Redacted.make(pem)
    } satisfies Apple.Options
  }
})

const verifyClientSecret = (token: string, jwk: jose.JWK, issuedAt: number, lifetime = 300) =>
  Effect.promise(async () => {
    const result = await jose.jwtVerify(token, await jose.importJWK(jwk, "ES256"), {
      algorithms: ["ES256"],
      issuer: "ABCDEFGHIJ",
      subject: providerOptions.clientId,
      audience: issuer,
      currentDate: new Date(issuedAt * 1000)
    })
    assert.deepStrictEqual(result.protectedHeader, { alg: "ES256", kid: "1234567890" })
    assert.deepStrictEqual(result.payload, {
      iss: "ABCDEFGHIJ",
      sub: providerOptions.clientId,
      aud: issuer,
      iat: issuedAt,
      exp: issuedAt + lifetime
    })
  })

describe("Apple", { concurrent: false }, () => {
  it.effect("uses form_post without PKCE and mints a fresh ES256 secret for each verified exchange", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const { keys: clientKeys, options } = yield* signingOptions
      const keys = yield* signingKeys
      const profile = {
        email: "private@privaterelay.appleid.com",
        email_verified: "true",
        is_private_email: "true",
        real_user_status: 2 as const,
        transfer_sub: "transfer-subject"
      }
      const token = yield* sign(keys.privateKey, { ...claims, iss: issuer, ...profile })
      const clientSecrets: Array<string> = []
      const requests: Array<string> = []
      const client = yield* Apple.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests.push(request.url)
            if (request.url.endsWith("/.well-known/openid-configuration")) return Response.json(metadata)
            if (request.url === metadata.jwks_uri) return Response.json({ keys: [keys.jwk] })
            assert.strictEqual(request.url, metadata.token_endpoint)
            const body = form(request)
            assert.strictEqual(body.get("client_id"), options.clientId)
            assert.strictEqual(body.get("redirect_uri"), options.redirectUri)
            assert.strictEqual(body.get("code"), "single-use-code")
            assert.isNull(body.get("code_verifier"))
            assert.isUndefined(request.headers.authorization)
            clientSecrets.push(body.get("client_secret")!)
            return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: token })
          })
        )
      )
      // Extra runtime properties cannot turn this preset into a PKCE client.
      const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
      assert.strictEqual(url.origin + url.pathname, metadata.authorization_endpoint)
      assert.strictEqual(url.searchParams.get("response_mode"), "form_post")
      assert.strictEqual(url.searchParams.get("scope"), "openid")
      assert.strictEqual(url.searchParams.get("nonce"), "private-nonce")
      assert.isNull(url.searchParams.get("code_challenge"))
      assert.isNull(url.searchParams.get("code_challenge_method"))
      for (const elapsed of [0, 1]) {
        yield* TestClock.setTime((seconds + elapsed) * 1000)
        const result = yield* client.exchangeCode(oidcExchange)
        assert.strictEqual(result.identity.issuer, issuer)
        assert.strictEqual(result.identity.subject, claims.sub)
        assert.deepStrictEqual(Redacted.value(result.identity.profile), {
          ...profile,
          email_verified: true,
          is_private_email: true
        })
        assert.notInclude(JSON.stringify(result), profile.email)
        assert.notInclude(JSON.stringify(result), token)
        yield* verifyClientSecret(clientSecrets[elapsed], clientKeys.jwk, seconds + elapsed)
      }
      assert.notStrictEqual(clientSecrets[0], clientSecrets[1])
      assert.deepStrictEqual(requests, [
        issuer + "/.well-known/openid-configuration",
        metadata.token_endpoint,
        metadata.jwks_uri,
        metadata.token_endpoint
      ])
      assert.include(Redacted.value(options.privateKey), "BEGIN PRIVATE KEY")
    }).pipe(Effect.provide(cryptoLayer)))

  it.effect("captures signing material and callback names while preserving all signed profile authority", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const { options } = yield* signingOptions
      const keys = yield* signingKeys
      const token = yield* sign(keys.privateKey, {
        ...claims,
        iss: issuer,
        email: "signed@example.com",
        email_verified: true,
        given_name: "Signed"
      })
      const user = Redacted.make(JSON.stringify({
        name: { firstName: " Callback ", lastName: " Family " },
        email: "injected@example.com",
        email_verified: false,
        sub: "injected-subject"
      }))
      const client = yield* Apple.make({ ...options, scopes: ["email", "name"] }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            if (request.url.endsWith("/.well-known/openid-configuration")) {
              Redacted.wipeUnsafe(options.privateKey)
              return Response.json(metadata)
            }
            if (request.url === metadata.jwks_uri) return Response.json({ keys: [keys.jwk] })
            Redacted.wipeUnsafe(user)
            return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: token })
          })
        )
      )
      const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
      assert.strictEqual(url.searchParams.get("scope"), "openid email name")
      const result = yield* client.exchangeCode({ ...oidcExchange, user })
      assert.strictEqual(result.identity.subject, claims.sub)
      assert.deepStrictEqual(Redacted.value(result.identity.profile), {
        email: "signed@example.com",
        email_verified: true,
        given_name: "Signed",
        family_name: "Family",
        name: "Callback Family"
      })
    }).pipe(Effect.provide(cryptoLayer)))

  it.effect("tolerates absent or malformed callback names and rejects unauthenticated or invalid signed claims", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const { options } = yield* signingOptions
      const keys = yield* signingKeys
      const wrongKeys = yield* signingKeys
      const validToken = yield* sign(keys.privateKey, { ...claims, iss: issuer, email_verified: "false" })
      let token: string | undefined = validToken
      let grants = 0
      const client = yield* Apple.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            if (request.url.endsWith("/.well-known/openid-configuration")) return Response.json(metadata)
            if (request.url === metadata.jwks_uri) return Response.json({ keys: [keys.jwk] })
            grants++
            return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: token })
          })
        )
      )
      for (const user of [undefined, "{", "null", "{\"name\":{\"firstName\":42}}"]) {
        const result = yield* client.exchangeCode({
          ...oidcExchange,
          ...(user === undefined ? {} : { user: Redacted.make(user) })
        })
        assert.deepStrictEqual(Redacted.value(result.identity.profile), { email_verified: false })
      }
      const invalid = [
        { token: yield* sign(wrongKeys.privateKey, { ...claims, iss: issuer }), tag: "OAuthUnavailable" },
        { token: yield* sign(keys.privateKey, { ...claims, iss: issuer, nonce: "wrong" }), tag: "OAuthRejected" },
        {
          token: yield* sign(keys.privateKey, { ...claims, iss: issuer, email_verified: "yes" }),
          tag: "OAuthRejected"
        },
        { token: yield* sign(keys.privateKey, { ...claims, iss: issuer, real_user_status: 3 }), tag: "OAuthRejected" },
        { token: undefined, tag: "OAuthUnavailable" }
      ]
      for (const entry of invalid) {
        token = entry.token
        const error = yield* client.exchangeCode({
          ...oidcExchange,
          user: Redacted.make("{\"name\":{\"firstName\":\"Callback\"}}")
        }).pipe(Effect.flip)
        assert.strictEqual(error._tag, entry.tag)
        assert.notInclude(JSON.stringify(error), "Callback")
        assert.notInclude(JSON.stringify(error), "private-")
      }
      assert.strictEqual(grants, 4 + invalid.length)
    }).pipe(Effect.provide(cryptoLayer)))

  it.effect("requires a nonce and pins every discovery endpoint before dispatching credentials", () =>
    Effect.gen(function*() {
      const { options } = yield* signingOptions
      let grants = 0
      const http = transport((request) => {
        if (request.url.endsWith("/.well-known/openid-configuration")) return Response.json(metadata)
        grants++
        return Response.json({})
      })
      const client = yield* Apple.make(options).pipe(Effect.provideService(HttpClient.HttpClient, http))
      const authorizationError = yield* client.authorizationUrl({
        state: oidcAuthorization.state
      } as Apple.AuthorizationInput).pipe(Effect.flip)
      assert.strictEqual(authorizationError._tag, "OAuthConfigurationError")
      const exchangeError = yield* client.exchangeCode({ code: oidcExchange.code } as Apple.ExchangeInput).pipe(
        Effect.flip
      )
      assert.strictEqual(exchangeError._tag, "OAuthConfigurationError")
      assert.strictEqual(grants, 0)
      for (const field of ["issuer", "authorization_endpoint", "token_endpoint", "jwks_uri"] as const) {
        let requests = 0
        const error = yield* Apple.make(options).pipe(
          Effect.provideService(
            HttpClient.HttpClient,
            transport(() => {
              requests++
              return Response.json({ ...metadata, [field]: "https://injected.example/" })
            })
          ),
          Effect.flip
        )
        assert.strictEqual(error._tag, "OAuthConfigurationError")
        assert.strictEqual(requests, 1)
      }
    }).pipe(Effect.provide(cryptoLayer)))

  it.effect("mints bounded client secrets and wipes only owned key material after minting and scope closure", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const { keys, options } = yield* signingOptions
      const captured: Array<{ key: Jwk.PrivateKey; bytes: Uint8Array }> = []
      const original = Jwk.importPkcs8
      const spy = vi.spyOn(Jwk, "importPkcs8").mockImplementation((...args) =>
        original(...args).pipe(
          Effect.tap((key) => Effect.sync(() => captured.push({ key, bytes: Redacted.value(key.material) })))
        )
      )
      yield* Effect.gen(function*() {
        const secret = yield* Apple.mintClientSecret({ ...options, lifetimeSeconds: 15777000 })
        yield* verifyClientSecret(Redacted.value(secret), keys.jwk, seconds, 15777000)
        assert.isTrue(captured[0].bytes.every((byte) => byte === 0))
        assert.throws(() => Redacted.value(captured[0].key.material))
        assert.throws(() => Redacted.value(captured[0].key.jwk))
        assert.include(Redacted.value(options.privateKey), "BEGIN PRIVATE KEY")
        assert.lengthOf(captured, 1)

        const scope = yield* Effect.acquireRelease(Scope.make("parallel"), (scope) => Scope.close(scope, Exit.void))
        const client = yield* Apple.make(options).pipe(
          Effect.provideService(Scope.Scope, scope),
          Effect.provideService(HttpClient.HttpClient, transport(() => Response.json(metadata)))
        )
        assert.lengthOf(captured, 2)
        assert.isTrue(captured[1].bytes.some((byte) => byte !== 0))
        yield* Scope.close(scope, Exit.void)
        assert.isTrue(captured[1].bytes.every((byte) => byte === 0))
        assert.throws(() => Redacted.value(captured[1].key.material))
        assert.throws(() => Redacted.value(captured[1].key.jwk))
        assert.include(Redacted.value(options.privateKey), "BEGIN PRIVATE KEY")
        assert.strictEqual(
          (yield* client.authorizationUrl(oidcAuthorization).pipe(Effect.flip))._tag,
          "OAuthUnavailable"
        )
        assert.strictEqual((yield* client.exchangeCode(oidcExchange).pipe(Effect.flip))._tag, "OAuthUnavailable")

        const failedBuild = yield* Apple.make(options).pipe(
          Effect.provideService(
            HttpClient.HttpClient,
            transport(() =>
              Response.json({
                ...metadata,
                token_endpoint: "https://injected.example/token"
              })
            )
          ),
          Effect.flip
        )
        assert.strictEqual(failedBuild._tag, "OAuthConfigurationError")
        assert.isTrue(captured[2].bytes.every((byte) => byte === 0))
        assert.throws(() => Redacted.value(captured[2].key.material))

        const signature = yield* Signature.Signature
        const failedMint = yield* Apple.mintClientSecret(options).pipe(
          Effect.provideService(Signature.Signature, {
            ...signature,
            sign: () => Effect.die("private-native-failure")
          }),
          Effect.flip
        )
        assert.strictEqual(failedMint._tag, "OAuthUnavailable")
        assert.notInclude(JSON.stringify(failedMint), "private-native-failure")
        assert.isFalse("cause" in failedMint)
        assert.isTrue(captured[3].bytes.every((byte) => byte === 0))
        assert.throws(() => Redacted.value(captured[3].key.material))

        for (const lifetimeSeconds of [0, -1, 15777001, 1.5, Number.NaN]) {
          const error = yield* Apple.mintClientSecret({ ...options, lifetimeSeconds }).pipe(Effect.flip)
          assert.strictEqual(error._tag, "OAuthConfigurationError")
        }
        for (
          const privateKey of ["private-malformed", "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----"]
        ) {
          const error = yield* Apple.mintClientSecret({ ...options, privateKey: Redacted.make(privateKey) }).pipe(
            Effect.flip
          )
          assert.strictEqual(error._tag, "OAuthConfigurationError")
          assert.notInclude(JSON.stringify(error), privateKey)
          assert.isFalse("cause" in error)
        }
      }).pipe(Effect.ensuring(Effect.sync(() => spy.mockRestore())))
    }).pipe(Effect.provide(cryptoLayer)))

  it.effect("joins pending client-secret signing before owner closure wipes the key", () =>
    Effect.gen(function*() {
      const { options } = yield* signingOptions
      const owner = yield* Effect.acquireRelease(Scope.make("parallel"), (scope) => Scope.close(scope, Exit.void))
      const entered = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const signature = yield* Signature.Signature
      const keys: Array<{ key: Jwk.PrivateKey; bytes: Uint8Array }> = []
      let grants = 0
      const original = Jwk.importPkcs8
      const spy = vi.spyOn(Jwk, "importPkcs8").mockImplementation((...args) =>
        original(...args).pipe(
          Effect.tap((key) => Effect.sync(() => keys.push({ key, bytes: Redacted.value(key.material) })))
        )
      )
      yield* Effect.gen(function*() {
        const client = yield* Apple.make(options).pipe(
          Effect.provideService(Scope.Scope, owner),
          Effect.provideService(
            HttpClient.HttpClient,
            transport((request) => {
              if (request.url.endsWith("/.well-known/openid-configuration")) return Response.json(metadata)
              grants++
              return Response.json({})
            })
          )
        )
        const exchange = yield* client.exchangeCode(oidcExchange).pipe(
          Effect.provideService(Signature.Signature, {
            ...signature,
            sign: Effect.fnUntraced(function*(key, bytes) {
              yield* Deferred.succeed(entered, undefined)
              yield* Deferred.await(release)
              return yield* signature.sign(key, bytes)
            })
          }),
          Effect.forkChild
        )
        yield* Deferred.await(entered)
        const closing = yield* Scope.close(owner, Exit.void).pipe(Effect.forkChild({ startImmediately: true }))
        yield* Effect.yieldNow
        assert.isUndefined(closing.pollUnsafe())
        assert.isTrue(keys[0].bytes.some((byte) => byte !== 0))
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(closing)
        assert.strictEqual((yield* Fiber.join(exchange).pipe(Effect.flip))._tag, "OAuthUnavailable")
        assert.isTrue(keys[0].bytes.every((byte) => byte === 0))
        assert.throws(() => Redacted.value(keys[0].key.material))
        assert.strictEqual(grants, 0)
        assert.include(Redacted.value(options.privateKey), "BEGIN PRIVATE KEY")
      }).pipe(
        Effect.ensuring(Deferred.succeed(release, undefined)),
        Effect.ensuring(Effect.sync(() => spy.mockRestore()))
      )
    }).pipe(Effect.provide(cryptoLayer)))

  it.effect("normalizes both Apple boolean encodings without including protocol or arbitrary callback fields", () =>
    Effect.gen(function*() {
      for (const [input, expected] of [[true, true], [false, false], ["true", true], ["false", false]] as const) {
        const profile = yield* Schema.decodeUnknownEffect(Apple.Profile)({
          email_verified: input,
          is_private_email: input,
          iss: issuer,
          sub: "subject",
          arbitrary: "ignored"
        })
        assert.deepStrictEqual(profile, { email_verified: expected, is_private_email: expected })
      }
    }))
})
