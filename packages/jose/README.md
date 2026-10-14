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
individual module entry points. Signing, verification, key import, and decryption
use the runtime's Web Crypto API (`globalThis.crypto.subtle`). Encryption also
requires Effect's `Crypto` service for fresh nonces; on Node, provide
`NodeCrypto.layer` from `@effect/platform-node/NodeCrypto`.

```ts
import { Jwk, Jwt } from "@effect/jose"
import { Effect, Schema } from "effect"

const Claims = Schema.Struct({ sub: Schema.String })

const program = Effect.gen(function*() {
  const pair = yield* Jwk.generateKeyPair({ algorithm: "ES256", kid: "signing-key" })
  const signingKey = yield* Jwk.importPrivate(pair.privateKey, "ES256")
  const verificationKey = yield* Jwk.importPublic(pair.publicKey, "ES256")
  const token = yield* Jwt.sign(Claims, { sub: "user_1" }, signingKey, { alg: "ES256", typ: "JWT" })
  return yield* Jwt.verify(Claims, token, verificationKey, { algorithms: ["ES256"], typ: "JWT" })
})
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
The runtime must support the chosen algorithm. Other algorithms, JSON
serialization, unencoded/detached payloads, critical extensions, and compression
are unsupported.

See the [third-party notices](THIRD_PARTY_NOTICES.md) for adapted contract tests.
