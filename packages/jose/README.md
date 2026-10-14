# @effect/jose

Unstable APIs: breaking changes may occur in minor releases.

JOSE for Effect: JWK import/export, public key sets, compact signatures and
encryption, and JWTs whose claims are encoded and decoded by your Effect Schema.
Your application owns keys, accepted algorithms, issuers, audiences, and token
purpose.

```sh
pnpm add @effect/jose effect
```

Import `Errors`, `Jwk`, `Jwks`, `Jws`, `Jwt`, and `Jwe` from the root or use their
individual module entry points. Cryptographic operations use Effect's native
algorithm services: `Hmac` for HS256, `Rsa` for RS256/PS256, `Ecdsa` for ES256,
`Ed25519` for EdDSA, and `Aes` for direct A256GCM encryption. Encryption also
requires `SecureRandom` for fresh nonces. On Node, provide `NodeCrypto.layer`
from `@effect/platform-node/NodeCrypto`; it supplies all these services and the
Web Crypto backend used by key import/export helpers.

`Jws.Requirements` includes the four signature/HMAC services. JWS and JWT
key-set verification require the three asymmetric services plus `Jwks`.
`Jwe.encrypt` requires `Aes` and `SecureRandom`; `Jwe.decrypt` requires only
`Aes`. JWT operations additionally retain the application's Schema services.
For other runtimes, compose the corresponding layers from `effect/crypto`.
When injecting a `WebCrypto.SubtleCrypto` backend, provide it both to those
layers and to the program so key helpers use the same backend.

```ts
import { Jwk, Jwt } from "@effect/jose"
import { NodeCrypto } from "@effect/platform-node"
import { Effect, Schema } from "effect"

const Claims = Schema.Struct({ sub: Schema.String })

const program = Effect.gen(function*() {
  const pair = yield* Jwk.generateKeyPair({ algorithm: "ES256", kid: "signing-key" })
  const signingKey = yield* Jwk.importPrivate(pair.privateKey, "ES256")
  const verificationKey = yield* Jwk.importPublic(pair.publicKey, "ES256")
  const token = yield* Jwt.sign(Claims, { sub: "user_1" }, signingKey, { alg: "ES256", typ: "JWT" })
  return yield* Jwt.verify(Claims, token, verificationKey, { algorithms: ["ES256"], typ: "JWT" })
}).pipe(Effect.provide(NodeCrypto.layer))
```

Tokens, private keys, symmetric keys, and decrypted bytes use `Redacted`. JWT
verification checks signatures and registered claims before decoding the
application Schema. Schema failures and encoding/decoding services remain in
`E` and `R`; custom Schema diagnostics remain application-owned.
`Jwt.decodeUnverified` parses without establishing trust.

Local JWKS verification needs no HTTP. Remote JWKS use an application-configured
HTTPS URL and an Effect HttpClient, with a bounded cache and refresh lifetime
owned by the Layer's Scope. Token-supplied key URLs are ignored; redirects are rejected.

The supported profile is compact JWS/JWT with HS256, RS256, PS256, ES256, and EdDSA
(Ed25519), and compact JWE with `dir` / `A256GCM`. RSA requires at least 2048 bits.
PS256 uses SHA-256 with a 32-byte salt; ES256 uses P-256, SHA-256, and fixed-width
P1363 signatures. The runtime must support the chosen algorithm. Other algorithms, JSON
serialization, unencoded/detached payloads, critical extensions, and compression
are unsupported.

Native operations finish before interruption releases their owned inputs; remote
JWKS waits remain interruptible. Native causes are sanitized before they reach
JOSE errors, and caller-owned secret bytes are never wiped by an operation.

See the [third-party notices](THIRD_PARTY_NOTICES.md) for adapted contract tests.
