import { OAuth } from "@effect/auth"
import * as OAuthCapability from "@effect/auth/oauth"
import { assert, it } from "@effect/vitest"

it("exposes the same OAuth modules through the root namespace and public entrypoint", () => {
  assert.isFunction(OAuth.OAuth.make)
  assert.strictEqual(OAuth.OAuth, OAuthCapability.OAuth)
  assert.strictEqual(OAuth.OAuthError, OAuthCapability.OAuthError)
  assert.strictEqual(OAuth.OAuthProvider, OAuthCapability.OAuthProvider)
  assert.strictEqual(OAuth.Oidc, OAuthCapability.Oidc)
  assert.strictEqual(OAuth.Pkce, OAuthCapability.Pkce)
})
