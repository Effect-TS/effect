import { Microsoft } from "@effect/auth/oauth/providers"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"
import { codeInput, tokenBody } from "../fixtures.ts"
import {
  claims,
  cryptoLayer,
  form,
  microsoftMetadata,
  microsoftOrigin,
  microsoftTemplate,
  oidcAuthorization,
  oidcExchange,
  seconds,
  sign,
  signingKeys,
  transport
} from "./fixtures.ts"

const providerOptions = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret"),
  redirectUri: codeInput.redirectUri
}

const tenantId = "11111111-1111-1111-1111-111111111111"
const objectId = "22222222-2222-2222-2222-222222222222"
const personalTenant = "9188040d-6c67-4c5b-b112-36a304b66dad"

it.effect("uses Microsoft oid and tid consistently across tenant authorities", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* signingKeys
    for (const tenant of [undefined, "organizations", "consumers", tenantId] as const) {
      const tid = tenant === "consumers" ? personalTenant : tenantId
      const issuer = microsoftOrigin + "/" + tid + "/v2.0"
      const profile = { oid: objectId, tid, email: "mutable@example.test", preferred_username: "mutable-name" }
      const idToken = yield* sign(keys.privateKey, { ...claims, iss: issuer, ...profile })
      const authenticationMethod = tenant === tenantId ? "client_secret_post" : "client_secret_basic"
      const requests: Array<string> = []
      const client = yield* Microsoft.make({
        ...providerOptions,
        ...(tenant === undefined ? {} : { tenant }),
        ...(authenticationMethod === "client_secret_post" ? { authenticationMethod } : {})
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests.push(request.url)
            if (request.url.endsWith("/.well-known/openid-configuration")) {
              const authority = new URL(request.url).pathname.split("/")[1]
              assert.include(tenant === "consumers" ? ["consumers", personalTenant] : [tenant ?? "common"], authority)
              return Response.json(microsoftMetadata(authority))
            }
            if (request.url.endsWith("/oauth2/v2.0/token")) {
              const body = form(request)
              if (authenticationMethod === "client_secret_post") {
                assert.strictEqual(body.get("client_secret"), "client-secret")
              } else {
                assert.match(request.headers.authorization, /^Basic /)
                assert.isNull(body.get("client_secret"))
              }
              assert.strictEqual(body.get("code_verifier"), Redacted.value(codeInput.pkceVerifier))
              return Response.json({ ...tokenBody, id_token: idToken })
            }
            assert.strictEqual(request.url, microsoftMetadata().jwks_uri)
            return Response.json({ keys: [{ ...keys.jwk, issuer: microsoftTemplate }] })
          })
        )
      )
      const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
      assert.strictEqual(url.searchParams.get("scope"), "openid profile")
      assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
      const result = yield* client.exchangeCode(oidcExchange)
      assert.strictEqual(result.identity.issuer, issuer)
      assert.strictEqual(result.identity.subject, objectId + ":" + tid)
      assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
      assert.lengthOf(requests, 3)
    }
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("enforces Microsoft tenant and signing-key authority beyond generic OIDC checks", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* signingKeys
    const issuer = microsoftOrigin + "/" + tenantId + "/v2.0"
    const concrete = {
      tenant: tenantId,
      metadataIssuer: issuer,
      issuer,
      tid: tenantId,
      oid: objectId,
      keyIssuer: issuer
    }
    for (
      const entry of [
        { ...concrete, tid: personalTenant },
        {
          ...concrete,
          tenant: "organizations",
          metadataIssuer: microsoftTemplate,
          issuer: microsoftOrigin + "/" + personalTenant + "/v2.0",
          tid: personalTenant,
          keyIssuer: microsoftTemplate
        },
        { ...concrete, keyIssuer: undefined },
        { ...concrete, oid: "not-an-object-guid" }
      ]
    ) {
      const token = yield* sign(keys.privateKey, { ...claims, iss: entry.issuer, tid: entry.tid, oid: entry.oid })
      let requests = 0
      const client = yield* Microsoft.make({ ...providerOptions, tenant: entry.tenant }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests++
            if (request.url.endsWith("/.well-known/openid-configuration")) {
              return Response.json({ ...microsoftMetadata(entry.tenant), issuer: entry.metadataIssuer })
            }
            if (request.url.endsWith("/oauth2/v2.0/token")) return Response.json({ ...tokenBody, id_token: token })
            assert.strictEqual(request.url, microsoftMetadata().jwks_uri)
            return Response.json({
              keys: [{ ...keys.jwk, ...(entry.keyIssuer === undefined ? {} : { issuer: entry.keyIssuer }) }]
            })
          })
        )
      )
      const error = yield* client.exchangeCode(oidcExchange).pipe(Effect.flip)
      assert.strictEqual(error._tag, "OAuthRejected")
      if (error._tag === "OAuthRejected") assert.strictEqual(error.reason, "claims")
      assert.strictEqual(requests, 3)
    }
  }).pipe(Effect.provide(cryptoLayer)))
