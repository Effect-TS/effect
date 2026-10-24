# @effect/auth

Unstable OAuth and OpenID Connect clients for Effect. Use `@effect/auth/oauth`
and `@effect/auth/oauth/providers`, or the `OAuth` namespace from `@effect/auth`.

The clients use Effect's crypto and HTTP services, with no additional runtime
dependencies. JOSE key management and token primitives are available through
[`effect/jose`](../effect/README.md#jose).

## OAuth and OpenID Connect

`OAuth.Client` is the service for an installed OAuth client. Provide it with
`OAuth.layer(options)` and acquire it with
`const oauth = yield* OAuth.Client`. The layer owns the client's scope.

`OAuth.make` installs authorization-code and refresh flows, profile requests, and
revocation. `client.codeGrant` and `client.refreshGrant` return redacted
`TokenReceipt` values. Inspect provider-specific extensions before calling
`OAuth.tokens`; normalization makes no additional request and preserves the receipt.
It omits null refresh tokens, accepts finite nonnegative numeric or decimal-string
lifetimes, and joins array scopes with spaces.

`TokenSet.idToken` is an optional redacted, opaque provider receipt, not evidence
of authentication. Discovery, sending a nonce or maximum age, and fetching a
profile do not verify it. Pass it to an installed `Oidc.makeVerifier` before
trusting its identity. The verifier authenticates signatures before checking
issuer, a single client audience, authorized party, nonce, expiration, issued-at
and not-before times, authentication age, and any access-token or code hash bindings.
Refresh verification binds the prior subject, issuer, nonce, and authentication
time without treating the original maximum age as a new login. Verified claims
remain redacted; applications still own authorization.

RS256, PS256, ES256, and EdDSA must be advertised by metadata. HS256 requires
explicit opt-in and a client secret of at least 32 UTF-8 bytes; it cannot be mixed
with asymmetric algorithms or establish tenant signing-key authority.
`Oidc.discover` fetches a trusted issuer's well-known URL or an explicit
`metadataUrl`. Issuers match exactly, including trailing slashes. Supported
`{tenantid}` templates remain bound to the same authority, GUID `tid` claim, and
signing-key issuer; pinned discovery preserves the key-authority requirement.
Discovery alone does not authenticate a token.

`OAuth.make` and `Oidc.makeVerifier` require an owning `Scope`. Keep it open for the
client's or verifier's lifetime. Closing it interrupts and joins active operations
and prevents reuse. Caller interruption joins only that operation. Configuration
is snapshotted and frozen; caller-owned input is not frozen or wiped. Asymmetric
verifiers own scoped, bounded JWKS caches; HS256 does not fetch keys.

Each exchange, refresh, profile request, or revocation makes one request without
implicit retry. Supply a cancellation-aware `HttpClient` without retry, redirect,
cookie, or credential-logging middleware. HTTP operations capture `HttpClient`
and `Fetch`; fetch requests disable redirect following, ambient credentials,
caching, and tracing propagation. HTTP tracing is disabled, and redirects and
unexpected response URLs are rejected.

Provider endpoints require HTTPS. Callbacks must be exact registered HTTPS URLs
(or HTTP loopback URLs), without queries or fragments. Requests require a timeout
of 1–60,000 milliseconds. Responses default to a 1 MiB limit, configurable from
1 byte to 1 MiB; JSON is bounded to 64 nested containers and 65,536 values.
Bound the complete application workflow as well as each request.

Client authentication supports form-encoded Basic credentials,
`client_secret_post`, and explicitly public clients. Post authentication may use
a request-specific secret when none is stored; revocation may use separately
configured authentication. Token requests support form or JSON encoding; JSON
rejects duplicate parameter names, while form preserves repeated resource indicators.
Authorization supports `query` or `form_post` response modes and space- or
comma-separated scopes. Profile requests support GET or POST with a JSON body
and safe custom headers. Applications own callback parsing, transaction storage,
state comparison, and single-use enforcement for state, nonce, and PKCE verifiers.

```ts
import { OAuth, Pkce } from "@effect/auth/oauth"
import { NodeCrypto } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/http"

const OAuthLive = OAuth.layer({
  metadata: {
    issuer: "https://issuer.example",
    authorization_endpoint: "https://issuer.example/authorize",
    token_endpoint: "https://issuer.example/token"
  },
  clientId: "registered-client",
  authentication: { method: "none", publicClient: true },
  timeout: "5 seconds"
}).pipe(Layer.provide(FetchHttpClient.layer))

const authorization = Effect.gen(function*() {
  const client = yield* OAuth.Client
  const state = yield* Pkce.random()
  const pkce = yield* Pkce.make()
  const url = yield* client.authorizationUrl({
    redirectUri: "https://app.example/callback",
    scopes: ["profile"],
    state,
    codeChallenge: pkce.challenge
  })
  // Store state and pkce.verifier in a private, single-use transaction.
  return { state, pkce, url }
}).pipe(
  Effect.provide(OAuthLive),
  Effect.provide([NodeCrypto.layerDigest, NodeCrypto.layerSecureRandom])
)
```

## Provider clients

All 25 provider clients expose `make`, `layer`, a distinct `Client` service, and
a `Profile` schema. Configure a client ID, a redacted client secret, one registered
`redirectUri`, and provider-specific options. Apple uses a redacted signing key,
team ID, and key ID to generate its client secrets. Requests default to a
10-second timeout. Each client exposes `authorizationUrl` and `exchangeCode`,
with the callback and scopes fixed when the client is installed.

| Client        | Default scopes          | Identity subject                                |
| ------------- | ----------------------- | ----------------------------------------------- |
| `Apple`       | `openid`                | Verified ID-token `sub`                         |
| `Atlassian`   | `read:me`               | Profile `account_id`                            |
| `Auth0`       | `openid`                | Verified ID-token `sub`                         |
| `Cognito`     | `openid`                | Verified ID-token `sub`                         |
| `Dropbox`     | `account_info.read`     | Profile `account_id`                            |
| `Figma`       | `current_user:read`     | Profile `id`                                    |
| `GitHub`      | `read:user`             | Numeric user ID, as a string                    |
| `GitLab`      | `openid`                | Verified ID-token `sub`                         |
| `Google`      | `openid profile email`  | Verified ID-token `sub`                         |
| `HuggingFace` | `openid`                | Verified ID-token `sub`                         |
| `Keycloak`    | `openid`                | Verified ID-token `sub`                         |
| `Kick`        | `user:read`             | Numeric user ID, as a string                    |
| `Line`        | `openid`                | Verified ID-token `sub`                         |
| `Linear`      | `read`                  | GraphQL viewer `id`                             |
| `Microsoft`   | `openid profile`        | Verified `oid:tid`                              |
| `Notion`      | None                    | Token receipt's `owner.user.id`                 |
| `Okta`        | `openid`                | Verified ID-token `sub`                         |
| `Railway`     | `openid`                | Verified ID-token `sub`, bound to UserInfo      |
| `Roblox`      | `openid`                | Verified ID-token `sub`                         |
| `Slack`       | `openid`                | Verified ID-token `sub`                         |
| `Strava`      | `read`                  | Token receipt's numeric athlete ID, as a string |
| `Vercel`      | `openid`                | Verified ID-token `sub`                         |
| `X`           | `users.read tweet.read` | Profile `data.id`                               |
| `Zitadel`     | `openid`                | Verified ID-token `sub`                         |
| `Zoom`        | `openid`                | Verified ID-token `sub`                         |

Authorization requires private state. Every provider except Apple, Notion, and
Strava also requires an S256 challenge and the original verifier at exchange.
All OIDC clients require the original nonce for both operations. Supply an
optional `maxAge` consistently from the saved transaction. Before exchange,
validate callback state and issuer and consume the single-use transaction.
Providers without authorization response issuers need distinct callback routing;
Keycloak, Railway, and Zoom require advertised response issuer support and the
caller must validate the callback's `iss`.

`exchangeCode` returns an `OAuthProvider.ExchangeResult`: the original redacted
receipt, normalized tokens, and an identity with `issuer`, `subject`, and a
redacted typed profile. Use both issuer and subject for account lookup. OIDC
clients verify signed ID tokens before projecting profile claims, and exchange
requires `Oidc.VerificationRequirements`. Google, Microsoft, and Apple use RS256;
LINE uses HS256 with its channel secret; Railway and Roblox use ES256. Other
OIDC clients accept the advertised intersection of RS256, PS256, ES256, and EdDSA.
Decoding a `Profile` schema by itself does not authenticate an identity.

Auth0 retains the tenant issuer's trailing slash. Cognito derives its issuer from
the region and user pool. Keycloak accepts a server URL and realm, Okta accepts
an authorization server ID or `org`, and Zitadel accepts an instance domain.
GitLab can use an explicitly configured self-hosted issuer. Discovery supplements
are limited to known provider metadata and validate their issuer and endpoint pins.

Apple sends `form_post` authorization responses and mints a fresh ES256 client-secret
JWT for each code exchange. Its optional first-consent `user` callback value supplies
display names only; verified token claims remain authoritative. The explicitly
named client-secret lifetime options are in seconds.

Notion sends JSON token requests and identifies the authorizing person from the
token receipt, rather than the integration bot. Strava checks granted scopes from
the token receipt, falling back to the already validated callback's `scope` when
the receipt omits it. Pass that callback value as `Strava.ExchangeInput.scope`.
Strava's absolute access-token expiry is normalized to remaining seconds. Neither
Notion nor Strava sends PKCE parameters.

Railway fetches UserInfo after ID-token verification and requires the same `sub`;
verified token claims take precedence when merging profile fields. Linear fetches
the GraphQL viewer and rejects responses containing GraphQL errors. Dropbox rejects
disabled accounts. Profile names, email addresses, and provider hints do not
authorize account linking or establish application membership.

GitHub validates the exact returned scope set and normalizes its comma-separated
receipt into space-separated scopes. Requesting `offline_access` also requires
an expiring access token, a refresh token, and its lifetime in the receipt;
`offline_access` itself must be absent from the returned scope set. This client
supports GitHub.com OAuth Apps. It does not implement GitHub App installation
tokens or verified-primary-email lookup.

Google always requests `openid`, defaults to account selection, and requests
offline access without guaranteeing a refresh token. Its optional `hostedDomain`
is an authorization hint; enforce Workspace policy against the verified `hd`
claim. Google accepts the `none`, `consent`, and `select_account` prompts. With
`maxAge`, it also requests the `auth_time` claim needed for age verification.
This client requires the canonical `https://accounts.google.com` issuer;
legacy `accounts.google.com` ID tokens are rejected.

Microsoft always requests `openid profile`, defaults to the `common`
tenant and Basic client authentication, and accepts `organizations`, `consumers`,
or a tenant GUID. Microsoft identity uses the concrete verified issuer and the
same `oid:tid` format for every authority. Profile email and display names never
authorize account linking.

The underlying `client.oauth` remains available for protocol operations with
application-owned receipt handling. The provider helpers cover initial sign-in;
they do not manage sessions, durable login transactions, account linking, token
storage, registration rotation, or connected-grant refresh workflows. In particular,
calling Strava's raw refresh operation does not check continuity of the athlete
identity. An exchange can consume its code before a later profile request or
verification fails; such a failure does not authorize retrying the code.

## Errors and attribution

[OAuthError](src/oauth/OAuthError.ts) exposes typed failures with fixed diagnostics
that omit native causes and secrets. Generic OAuth
normalization recognizes only a complete JSON HTTP 400 `invalid_grant` without
conflicting success fields as `OAuthError.Rejected`. The GitHub client also recognizes
a complete JSON HTTP 200 or 400 `bad_verification_code` response. Strava recognizes
its documented JSON HTTP 400 `Bad Request` response when every error is
`AuthorizationCode` / `code` / `invalid` and no conflicting fields are present.
Authenticated invalid ID-token claims or provider profiles become
`OAuthError.Rejected`, with reason `claims`. Malformed tokens, key/signature faults,
mixed receipts, Linear GraphQL errors, other-status, transport, and timeout failures remain
`OAuthError.Unavailable`: an unknown outcome is not permission to retry a single-use
code or rotating refresh token. Expected failures remain typed. Composed failures,
interruption, and cleanup defects remain observable when requests time out or
clients close; empty-body recovery applies only to an entirely expected empty-body
failure. Keep receipts and revealed secrets out of logs and telemetry, and project
safe diagnostics before reporting defects outside the application.

See the [third-party notices](THIRD_PARTY_NOTICES.md) for adapted contracts and
fixtures in [test/oauth](test/oauth).
