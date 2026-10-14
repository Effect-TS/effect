# @effect/oauth

OAuth authorization-code and refresh flows, profile requests, revocation, PKCE
S256, and separable issuer discovery for Effect. The package exports `Errors`,
`OAuth`, `Oidc`, and `Pkce` namespaces and matching subpaths. All public APIs are
unstable and may change in minor releases.

## Authentication boundary

**This package does not verify signed OpenID Connect ID tokens or authenticate
identities.** Effect's native `Crypto` service supplies entropy and digests, not
signature verification. Signed OIDC verification is deferred; this package has
no JOSE dependency, signing-key resolver, ID-token verifier, or authenticated
claims model.

`TokenSet.idToken` is an optional redacted, opaque provider receipt. Its presence,
JWT-like spelling, or successful normalization is not evidence of authentication.
Neither discovery, issuer matching, sending a nonce or maximum age, nor fetching
a profile verifies ID-token signatures or claims. Applications needing OIDC
sign-in must establish that separate verification boundary before trusting an
identity. Do not decode an ID token and treat its claims as authenticated.

## Ownership and requests

`OAuth.make` captures the injected `HttpClient` and `Fetch` and requires an owning
`Scope`. Keep that scope open for the client's lifetime. Closing it interrupts and
joins active operations and prevents reuse. Caller interruption joins only that
operation and does not close the client. Configuration is snapshotted and frozen;
caller-owned input is not frozen or wiped.

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

Only a complete JSON HTTP 400 `invalid_grant` without conflicting success fields
becomes `Errors.Rejected`. Malformed, mixed, other-status, transport, and timeout
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
Tenant domains do not match a broader template. These helpers do not validate a
token issuer, tenant claim, or signing-key authority. Advertised `jwks_uri` and
signing algorithms are metadata only and are not used for verification.

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

See the [OAuth API](src/OAuth.ts), [discovery API](src/Oidc.ts),
[PKCE API](src/Pkce.ts), and [third-party notices](THIRD_PARTY_NOTICES.md).
