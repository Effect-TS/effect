# @effect/auth

Unstable JOSE APIs for Effect, available through `@effect/auth/jose` or the
`Jose` namespace from `@effect/auth`.

The modules provide algorithm-bound keys, compact JWS and JWE, schema-typed
JWTs, and local or scoped remote JWKS resolution. They use Effect's crypto
and HTTP services, with no additional runtime dependencies.

## Schema-typed JWTs

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
}).pipe(
  Effect.provide([NodeCrypto.layerMac, NodeCrypto.layerSignature]),
  Effect.provide(NodeCrypto.layerSecureRandom)
)
```

Tokens, private and symmetric keys, and decrypted bytes use `Redacted`. JWT
verification checks signatures and registered claims before decoding the
application schema. Expiration and not-before claims are checked when present;
include `"exp"` in `requiredClaims` when expiration is mandatory.

`Jwt.decodeUnverified` parses without establishing trust. Applications choose
accepted algorithms, issuers, audiences, and token purpose. Schema failures and
encoding/decoding services remain in the error and requirement types.

## Key sets and supported algorithms

Local JWKS verification needs no HTTP. Remote JWKS use an application-configured
HTTPS URL and an Effect `HttpClient`, with bounded caches and refresh work owned
by the layer's scope. Token-supplied key URLs are ignored and redirects are rejected.

Compact JWS/JWT supports HS256, RS256, PS256, ES256, and EdDSA (Ed25519).
Compact JWE supports `dir` with `A256GCM`. RSA requires at least 2048 bits.
PS256 uses SHA-256 with a 32-byte salt; ES256 uses P-256, SHA-256, and fixed-width
P1363 signatures. The runtime must support the chosen algorithm.

Time options accept `Duration.Input`, including JWKS `timeToLive`, `cooldown`,
and `timeout`, and JWT `clockTolerance` and `maxTokenAge`. JWT wire claims remain
in seconds.

See [third-party notices](THIRD_PARTY_NOTICES.md) for contract and fixture attribution.
