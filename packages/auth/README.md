# @effect/auth

JOSE keys, signatures, encryption, schema-typed JWTs, OAuth client protocols, PKCE
S256, and signed OpenID Connect verification for Effect. All public APIs are
unstable and may change in minor releases.

```sh
pnpm add @effect/auth effect
```

The root namespace exports are `Jose`, `JoseError`, `OAuth`, `OAuthError`, `Oidc`,
and `Pkce`, each with a matching public subpath. Use
`import { Jose, OAuth } from "@effect/auth"` for `Jose.Jwt.verify(...)` and
`OAuth.make(...)`.

`Jose` groups [Jwe](src/Jose/Jwe.ts), [Jwk](src/Jose/Jwk.ts),
[Jwks](src/Jose/Jwks.ts), [Jws](src/Jose/Jws.ts), and [Jwt](src/Jose/Jwt.ts).
Individual JOSE namespaces are available with
`import { Jwk } from "@effect/auth/Jose"`.

## Native Effect services

Cryptographic operations use Effect's native algorithm services: `Hmac` for
HS256, `Rsa` for RS256/PS256, `Ecdsa` for ES256, `Ed25519` for EdDSA, and `Aes` for
direct A256GCM encryption. `SecureRandom` supplies JWE nonces and PKCE entropy;
`Sha2` supplies PKCE challenges and OIDC hash bindings, including SHA-512 for
EdDSA. There are no runtime dependencies other than the application's Effect peer.

On Node.js, provide `NodeCrypto.layer` from `@effect/platform-node/NodeCrypto`.
It supplies these services and the Web Crypto backend used by key import/export
helpers. For other runtimes, compose the corresponding layers from `effect/crypto`.
When injecting `WebCrypto.SubtleCrypto`, provide it both to those layers and to
the program so key helpers use the same backend.

`Jose.Jws.Requirements` includes the four signature/HMAC services. JWS and JWT key-set
verification require the three asymmetric services plus `Jose.Jwks.Jwks`. `Jose.Jwe.encrypt`
requires `Aes` and `SecureRandom`; `Jose.Jwe.decrypt` requires only `Aes`. JWT operations
also retain the application's Schema services. `Pkce.random` requires
`SecureRandom`, `Pkce.challenge` requires `Sha2`, and `Pkce.make` requires both.
Each installed OIDC verifier's `verify` operation requires `Sha2` and all four
signature/HMAC services; installation captures HTTP and Scope, not crypto services.

Native operations finish before interruption releases their owned inputs; JWKS
network waits remain interruptible. A native operation that never settles can
delay teardown. Caller-owned secret bytes are never wiped by an operation.

## JOSE and schema-typed JWTs

```ts
import { Jose } from "@effect/auth"
import { NodeCrypto } from "@effect/platform-node"
import { Effect, Schema } from "effect"

const Claims = Schema.Struct({ sub: Schema.String })

const program = Effect.gen(function*() {
  const pair = yield* Jose.Jwk.generateKeyPair({ algorithm: "ES256", kid: "signing-key" })
  const signingKey = yield* Jose.Jwk.importPrivate(pair.privateKey, "ES256")
  const verificationKey = yield* Jose.Jwk.importPublic(pair.publicKey, "ES256")
  const token = yield* Jose.Jwt.sign(Claims, { sub: "user_1" }, signingKey, { alg: "ES256", typ: "JWT" })
  return yield* Jose.Jwt.verify(Claims, token, verificationKey, { algorithms: ["ES256"], typ: "JWT" })
}).pipe(Effect.provide(NodeCrypto.layer))
```

Tokens, private and symmetric keys, and decrypted bytes use `Redacted`. JWT
verification checks signatures and registered claims before decoding the
application Schema. Schema failures and encoding/decoding services remain in
`E` and `R`; custom Schema diagnostics remain application-owned.
`Jose.Jwt.decodeUnverified` parses without establishing trust. Applications own keys,
accepted algorithms, issuers, audiences, and token purpose.

Local JWKS verification needs no HTTP. Remote JWKS use an application-configured
HTTPS URL and an Effect `HttpClient`, with a bounded cache and refresh lifetime
owned by the Layer's Scope. Token-supplied key URLs are ignored; redirects are rejected.

The supported profile is compact JWS/JWT with HS256, RS256, PS256, ES256, and EdDSA
(Ed25519), and compact JWE with `dir` / `A256GCM`. RSA requires at least 2048 bits.
PS256 uses SHA-256 with a 32-byte salt; ES256 uses P-256, SHA-256, and fixed-width
P1363 signatures. The runtime must support the chosen algorithm. Other algorithms,
JSON serialization, unencoded/detached payloads, critical extensions, and compression
are unsupported.

## OAuth and OpenID Connect

`OAuth.Client` is the service for an installed OAuth client. Provide it with
`Layer.effect(OAuth.Client, OAuth.make(options))` and acquire it with
`const oauth = yield* OAuth.Client`. The layer owns the client's scope.

`OAuth.make` installs authorization-code and refresh flows, profile requests, and
revocation. `client.codeGrant` and `client.refreshGrant` return redacted
`TokenReceipt` values. Inspect provider-specific extensions before calling
`OAuth.tokens`; normalization makes no additional request and preserves the receipt.
It omits null refresh tokens, accepts finite nonnegative numeric or whole
decimal-string lifetimes, and joins array scopes with spaces.

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
import { OAuth, Pkce } from "@effect/auth"
import { NodeCrypto } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/http"

const OAuthLive = Layer.effect(
  OAuth.Client,
  OAuth.make({
    metadata: {
      issuer: "https://issuer.example",
      authorization_endpoint: "https://issuer.example/authorize",
      token_endpoint: "https://issuer.example/token"
    },
    clientId: "registered-client",
    authentication: { method: "none", publicClient: true },
    timeoutMs: 5000
  })
).pipe(Layer.provide(FetchHttpClient.layer))

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
  Effect.provide(NodeCrypto.layer)
)
```

## Errors and attribution

[JoseError](src/JoseError.ts) and [OAuthError](src/OAuthError.ts) expose typed
failures with fixed diagnostics that omit native causes and secrets. Only a
complete JSON HTTP 400 `invalid_grant` without conflicting success fields becomes
`OAuthError.Rejected`; authenticated invalid ID-token claims also become
`OAuthError.Rejected`, with reason `claims`. Malformed tokens, key/signature faults,
mixed receipts, other-status, transport, and timeout failures remain
`OAuthError.Unavailable`: an unknown outcome is not permission to retry a single-use
code or rotating refresh token. Keep receipts and revealed secrets out of logs
and telemetry.

See the [third-party notices](THIRD_PARTY_NOTICES.md) for adapted contracts and
fixtures in [test/jose](test/jose) and [test/oauth](test/oauth).
