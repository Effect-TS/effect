import { assert, it } from "@effect/vitest"
import { Effect, Exit, Redacted, Schema, Scope } from "effect"

import { OAuthConnectedProfile } from "@effect/auth/internal/oauth/permissionProfile"
import { prepareConnectedConfigurations } from "@effect/auth/internal/oauth/providers/shared/connected/configuration"
import { isPrivateKeyAuthentication } from "@effect/auth/internal/oauth/providers/shared/models"
import { OAuthProviderKey } from "@effect/auth/internal/oauth/schema"
import { OAuthCallbackId, OAuthIssuer, OAuthRedirectUri } from "@effect/auth/internal/oauth/signInModels"

const privateKeyJwt = (privateKey: Redacted.Redacted<string>, keyId: string) => ({
  algorithm: "ES256" as const,
  keyId,
  issuer: "https://issuer.example",
  subject: "client",
  audience: "https://issuer.example/token",
  lifetimeSeconds: 300,
  privateKey
})

const readable = (key: Redacted.Redacted<string>) => {
  try {
    Redacted.value(key)

    return true
  } catch {
    return false
  }
}

// copyAuth keeps the caller's key. The configuration retains its own copy, and
// that copy must be erased when the provider scope closes. The cleanup loop
// only walked provider.authentication, so a distinct revocation key survived.
it.effect("erases a separate revocation private key when the provider scope closes", () =>
  Effect.gen(function*() {
    const owner = yield* Scope.fork(yield* Effect.scope)
    const tokenKey = Redacted.make("token-pkcs8-material")
    const revocationKey = Redacted.make("revocation-pkcs8-material")
    const provider = OAuthProviderKey.make("linear")

    const prepared = yield* prepareConnectedConfigurations({
      timeoutSeconds: 10,
      providers: [
        {
          protocol: "oauth",
          provider,
          configurationGeneration: 1,
          issuance: "active",
          issuer: OAuthIssuer.make("https://issuer.example"),
          responseIssuerMode: "unsupported",
          clientId: "client",
          authentication: {
            method: "client_secret_post",
            privateKeyJwt: privateKeyJwt(tokenKey, "token-key")
          },
          callbacks: [
            {
              callbackId: OAuthCallbackId.make("linear"),
              redirectUri: OAuthRedirectUri.make("https://app.test/callback")
            }
          ],
          clientRegistrationId: "registration",
          profiles: [
            Schema.decodeSync(OAuthConnectedProfile)({
              key: "profile",
              generation: 1,
              issuance: "active",
              provider,
              clientRegistrationId: "registration",
              scopes: ["read"],
              resources: [],
              retention: "access-only",
              maximumAccessLifetimeMillis: 60_000,
              refreshAheadMillis: 0,
              refresh: "unsupported",
              revocation: "provider"
            })
          ],
          resourceIndicators: "unsupported",
          refreshExpiry: "unreported",
          revocation: {
            mode: "rfc7009",
            scope: "cohort",
            tokenTypes: "access",
            endpoint: "https://issuer.example/revoke",
            authentication: {
              method: "client_secret_post",
              privateKeyJwt: privateKeyJwt(revocationKey, "revoke-key")
            }
          },
          authorizationEndpoint: "https://issuer.example/authorize",
          tokenEndpoint: "https://issuer.example/token",
          pkceS256: true,
          identitySource: {
            from: "token",
            decodeIdentity: () => Effect.succeed({ subject: "subject" })
          }
        }
      ]
    }).pipe(Effect.provideService(Scope.Scope, owner))

    const retained = prepared.providers[0]?.revocation

    if (retained?.mode !== "rfc7009" || !isPrivateKeyAuthentication(retained.authentication)) {
      return yield* Effect.die("expected a retained revocation private key")
    }

    const retainedKey = retained.authentication.privateKeyJwt.privateKey

    assert.strictEqual(Redacted.value(retainedKey), "revocation-pkcs8-material")
    assert.strictEqual(Redacted.value(revocationKey), "revocation-pkcs8-material")
    yield* Scope.close(owner, Exit.void)
    assert.strictEqual(readable(retainedKey), false)
    assert.strictEqual(Redacted.value(revocationKey), "revocation-pkcs8-material")
    assert.strictEqual(Redacted.value(tokenKey), "token-pkcs8-material")
  }))
