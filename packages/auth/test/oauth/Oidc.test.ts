import { Oidc } from "@effect/auth/oauth"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import { metadata, transport } from "./fixtures.ts"

const tenant = "11111111-1111-1111-1111-111111111111"
const origin = "https://login.microsoftonline.com"
const template = `${origin}/{tenantid}/v2.0`
const personal = `${origin}/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0`

it("matches only complete tenant segments and exact issuer authorities", () => {
  assert.isTrue(Oidc.isTenantIssuerTemplate(template))
  for (
    const value of [
      `${origin}/tenantid/v2.0`,
      `${origin}/prefix{tenantid}/v2.0`,
      `${origin}/{tenantid}/{tenantid}`,
      `${origin}/%7Btenantid%7D/v2.0`,
      `http://login.microsoftonline.com/{tenantid}/v2.0`
    ]
  ) {
    assert.isFalse(Oidc.isTenantIssuerTemplate(value))
    assert.isUndefined(Oidc.substituteTenantIssuer(value, tenant))
  }
  assert.strictEqual(Oidc.substituteTenantIssuer(template, tenant), `${origin}/${tenant}/v2.0`)
  assert.isUndefined(Oidc.substituteTenantIssuer(template, "common"))
  assert.isUndefined(Oidc.substituteTenantIssuer(template, "../tenant"))
  for (const segment of [tenant, "common", "organizations", "consumers"]) {
    assert.isTrue(Oidc.discoveredIssuerMatches(`${origin}/${segment}/v2.0`, template))
  }
  assert.isTrue(Oidc.discoveredIssuerMatches(`${origin}/consumers/v2.0`, personal))
  for (
    const configured of [
      `${origin}/example.com/v2.0`,
      `${origin}/${tenant}/v2.0/`,
      `https://other.example/${tenant}/v2.0`,
      `https://other.example/consumers/v2.0`
    ]
  ) {
    assert.isFalse(Oidc.discoveredIssuerMatches(configured, template))
  }
  assert.isFalse(Oidc.discoveredIssuerMatches("https://issuer.example/", "https://issuer.example"))
})

it.effect("pins tenant metadata from an explicit discovery URL without fetching keys", () =>
  Effect.gen(function*() {
    const documentUrl = `${origin}/common/v2.0/.well-known/openid-configuration`
    const requests: Array<string> = []
    const http = transport((request) => {
      requests.push(request.url)
      return Response.json({ ...metadata, issuer: template })
    })
    for (
      const [segment, expected] of [
        [tenant, `${origin}/${tenant}/v2.0`],
        ["consumers", personal],
        ["common", template],
        ["organizations", template]
      ]
    ) {
      const discovered = yield* Oidc.discover(`${origin}/${segment}/v2.0`, {
        metadataUrl: documentUrl,
        timeout: 1000
      }).pipe(Effect.provideService(HttpClient.HttpClient, http))
      assert.strictEqual(discovered.issuer, expected)
      assert.strictEqual(discovered.signing_key_issuer_required, expected === template ? undefined : true)
      assert.strictEqual(discovered.jwks_uri, metadata.jwks_uri)
      assert.isTrue(Object.isFrozen(discovered))
      assert.isTrue(Object.isFrozen(discovered.code_challenge_methods_supported))
    }
    assert.deepStrictEqual(requests, Array(4).fill(documentUrl))
    const failure = yield* Oidc.discover(`${origin}/example.com/v2.0`, {
      metadataUrl: documentUrl,
      timeout: 1000
    }).pipe(Effect.provideService(HttpClient.HttpClient, http), Effect.flip)
    assert.strictEqual(failure._tag, "OAuthConfigurationError")
    assert.lengthOf(requests, 5)
  }))

it.effect("rejects unsafe discovery URLs before dispatch and mismatched issuer documents", () =>
  Effect.gen(function*() {
    let calls = 0
    const http = transport(() => {
      calls++
      return Response.json(metadata)
    })
    for (const metadataUrl of ["http://issuer.example/config", "https://issuer.example/config#fragment"]) {
      const failure = yield* Oidc.discover(metadata.issuer, { metadataUrl, timeout: 1000 }).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.flip
      )
      assert.strictEqual(failure._tag, "OAuthConfigurationError")
    }
    assert.strictEqual(calls, 0)
    const mismatch = yield* Oidc.discover("https://other.example", {
      metadataUrl: "https://issuer.example/config",
      timeout: 1000
    }).pipe(Effect.provideService(HttpClient.HttpClient, http), Effect.flip)
    assert.strictEqual(mismatch._tag, "OAuthConfigurationError")
    assert.strictEqual(calls, 1)
  }))
