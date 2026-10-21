import { Jose, OAuth } from "@effect/auth"
import { JoseError, Jwe, Jwk, Jwks, Jws, Jwt } from "@effect/auth/jose"
import * as OAuthCapability from "@effect/auth/oauth"
import { assert, it } from "@effect/vitest"

it("exposes the same JOSE modules through the root namespace and public entrypoint", () => {
  assert.strictEqual(Jose.Jwe, Jwe)
  assert.strictEqual(Jose.JoseError, JoseError)
  assert.strictEqual(Jose.Jwk, Jwk)
  assert.strictEqual(Jose.Jwks, Jwks)
  assert.strictEqual(Jose.Jws, Jws)
  assert.strictEqual(Jose.Jwt, Jwt)
  assert.isFunction(OAuth.OAuth.make)
  assert.strictEqual(OAuth.OAuth, OAuthCapability.OAuth)
  assert.strictEqual(OAuth.OAuthError, OAuthCapability.OAuthError)
  assert.strictEqual(OAuth.OAuthProvider, OAuthCapability.OAuthProvider)
  assert.strictEqual(OAuth.Oidc, OAuthCapability.Oidc)
  assert.strictEqual(OAuth.Pkce, OAuthCapability.Pkce)
})
