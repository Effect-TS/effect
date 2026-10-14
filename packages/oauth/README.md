# @effect/oauth

OAuth authorization-code and refresh flows, profile requests, revocation, PKCE
S256, signed OpenID Connect verification, and separable issuer discovery for Effect.
The package exports `Errors`, `OAuth`, `Oidc`, and `Pkce` namespaces and matching
subpaths. All public APIs are unstable and may change in minor releases.

## Authentication boundary

`TokenSet.idToken` is an optional redacted, opaque provider receipt. Its presence,
JWT-like spelling, or successful normalization is not evidence of authentication.
Discovery, sending a nonce or maximum age, and fetching a profile do not verify it.
Pass the token to an installed `Oidc.makeVerifier` before trusting its identity.

The verifier uses `@effect/jose` to authenticate signatures before rejecting
claims. It checks issuer, a single client audience, authorized party, nonce,
expiration, issued-at and not-before times, authentication age, and any access-token
or code hash bindings. Refresh verification binds the prior subject, issuer, nonce,
and authentication time without treating the original maximum age as a new login.
Verified claims remain redacted; application policy still owns authorization.

RS256, PS256, ES256, and EdDSA are accepted only when advertised by metadata.
HS256 requires explicit opt-in and a client secret of at least 32 UTF-8 bytes;
it cannot be mixed with asymmetric algorithms or establish tenant signing-key
authority. Native `effect/Crypto` supplies PKCE entropy/digests and OIDC hash
bindings, including SHA-512 for EdDSA. Signature verification belongs to JOSE.

## Ownership and requests

`OAuth.make` and `Oidc.makeVerifier` require an owning `Scope`. HTTP operations
capture the injected `HttpClient` and `Fetch`; asymmetric verifiers own a bounded
JWKS cache in that scope, not a process-wide cache. HS256 does not fetch keys.
Keep the scope open for the client's or verifier's lifetime. Closing it interrupts
and joins active operations and prevents reuse. Caller interruption joins only
that operation and does not close the owner. Configuration is snapshotted and
frozen; caller-owned input is not frozen or wiped.

Every code exchange, refresh, profile request, and revocation makes one request
with no implicit retry. Supply a cancellation-aware `HttpClient` without retry,
redirect, cookie, or credential-logging middleware. Fetch requests disable
redirect following, ambient credentials, caching, and tracing propagation. HTTP
tracing is disabled, and redirects and unexpected response URLs are rejected.

Provider endpoints require HTTPS. Callbacks must be exact registered HTTPS URLs
(or HTTP loopback URLs), without queries or fragments. Requests require a timeout
of 1–60,000 milliseconds. Responses default to a 1 MiB limit, configurable from
1 byte to 1 MiB; JSON is additionally bounded to 64 nested containers and 65,536
values. Bound the complete application workflow as well as each request.

`client.codeGrant` and `client.refreshGrant` return redacted `TokenReceipt` values.
Check provider-specific receipt extensions before calling `OAuth.tokens`.
Normalization does not make another request. It omits a null refresh token,
accepts finite nonnegative numeric or whole decimal-string lifetimes, and joins
array scopes with spaces while preserving the original receipt.

For token receipts, only a complete JSON HTTP 400 `invalid_grant` without
conflicting success fields becomes `Errors.Rejected`. Authenticated invalid ID-token
claims also become `Errors.Rejected`, with reason `claims`. Malformed tokens,
key/signature failures, mixed receipts, other-status, transport, and timeout
failures remain `Errors.Unavailable`: their outcome is unknown, not permission to
retry a single-use code or rotating refresh token. Errors omit native causes,
credentials, and response bodies. Keep receipts and revealed secrets out of logs
and telemetry.

## Provider variants

- Client authentication supports RFC 6749 Appendix B form-encoded Basic
  credentials, `client_secret_post`, or an explicitly public client. With no
  stored post secret, each request must supply `clientSecret`; a stored secret
  takes precedence. Revocation may use separately configured authentication.
- Token requests default to form encoding. JSON encoding is available and rejects
  duplicate parameter names, including repeated resource indicators, before
  dispatch. Form encoding preserves repeated resource indicators.
- Authorization defaults to `response_mode=query`; `form_post` is available.
  Scope separators may be spaces or commas. Applications own callback parsing,
  state comparison, transaction storage, and single-use enforcement.
- Profile requests use an explicitly installed URL and default to GET; POST with
  a JSON body and safe custom headers is supported.

`Pkce` uses the injected native `effect/Crypto` service for 32-byte transaction
secrets and SHA-256 challenges. Applications own storage, comparison, and one-time
use of state, nonce, and verifier values.

## Discovery

`Oidc.discover` fetches metadata from a trusted issuer's well-known URL or an
explicit `metadataUrl`. Generic issuers must match exactly, including trailing
slashes. A discovered `{tenantid}` path segment may template the same authority:
a GUID authority stays pinned to that issuer; commercial Microsoft `consumers`
pins its personal-account GUID; `common` and `organizations` retain the template.
Tenant domains do not match a broader template. Verification binds a template to
a GUID `tid` claim and requires the signing key's issuer to authorize that token
issuer. Pinned discovery retains `signing_key_issuer_required` so narrowing the
metadata issuer cannot drop this key-authority check. Discovery alone does not
authenticate a token.

## Example

```ts
import { OAuth, Pkce } from "@effect/oauth"
import { NodeCrypto } from "@effect/platform-node"
import { Effect } from "effect"
import { FetchHttpClient } from "effect/http"

const authorization = Effect.gen(function*() {
  const client = yield* OAuth.make({
    metadata: {
      issuer: "https://issuer.example",
      authorization_endpoint: "https://issuer.example/authorize",
      token_endpoint: "https://issuer.example/token"
    },
    clientId: "registered-client",
    authentication: { method: "none", publicClient: true },
    timeoutMs: 5000
  })
  const state = yield* Pkce.random()
  const pkce = yield* Pkce.make()
  const url = yield* client.authorizationUrl({
    redirectUri: "https://app.example/callback",
    scopes: ["profile"],
    state,
    codeChallenge: pkce.challenge
  })
  // Store state and pkce.verifier in a private, single-use transaction.
  // Keep the client scope open for any subsequent exchange through this client.
  return { state, pkce, url }
}).pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  Effect.provide(NodeCrypto.layer)
)
```

See the [OAuth API](src/OAuth.ts), [OIDC API](src/Oidc.ts),
[PKCE API](src/Pkce.ts), and [third-party notices](THIRD_PARTY_NOTICES.md).
