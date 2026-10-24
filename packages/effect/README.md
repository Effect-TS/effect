# effect

Effect is a library for building robust, maintainable, type-safe, and production grade applications in TypeScript.

The `effect` package is the core of the framework. It provides primitives for managing side effects, errors, concurrency, resources, and structured data, alongside a rich standard library.

> **Effect 4.x is a long-term support (LTS) release**, with at least three years of bug and security fixes. If you are upgrading from Effect 3.x, follow the [migration guide](https://github.com/Effect-TS/effect/blob/main/MIGRATION.md).

## Installation

```sh
npm install effect
```

## Requirements

- **TypeScript 5.9 or newer.** TypeScript 7 is recommended for the best performance and compatibility with [Effect's TypeScript tooling](https://github.com/Effect-TS/tsgo#installation).
- **Node.js 18 or newer** when running Effect on Node.js.
- **Strict type-checking:** the `strict` flag must be enabled in your `tsconfig.json`:

  ```json
  {
    "compilerOptions": {
      "strict": true
    }
  }
  ```

## Links

- [Website](https://effect.website): documentation, guides, and news.
- [Reference](https://effect.website/docs/v4/api/effect): API documentation for this package.
- [Discord](https://discord.gg/effect-ts): ask questions, share what you're building, and talk to the core team.
- [Community](https://effect.website/community-hub): meetups and events, or bring Effect to your own.
- [Issues](https://github.com/Effect-TS/effect/issues): bug reports and feature requests.

## Let's talk

Whether your team is considering Effect, rolling it out, or already running it in production, we'd love to hear from you: what you're building, what works, and what you need from Effect next.

- **Talk to the maintainers.** Introduce your team on [Discord](https://discord.gg/effect-ts) or email [contact@effectful.co](mailto:contact@effectful.co). We're happy to connect privately on Slack or Discord for feedback and help with adoption.
- **Production support.** We're exploring how to better support teams running Effect in production. If your organization has specific support needs, let's discuss them.
- **Adoption help.** Our [adoption partners](https://effect.website/adoption-partners) offer implementation, consulting, team extension, training, and commercial support.

## Overview

The `effect` package is a collection of modules. Some of the core ones:

| Module   | Description                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| Effect   | The core abstraction for managing side effects, concurrency, and error handling in a structured way.                       |
| Context  | A lightweight dependency injection mechanism that enables passing services through computations without direct references. |
| Layer    | A system for managing dependencies, allowing for modular and composable resource allocation.                               |
| Fiber    | Lightweight virtual threads with resource-safe cancellation capabilities, enabling many features in Effect.                |
| Stream   | A powerful abstraction for handling asynchronous, event-driven data processing.                                            |
| Schedule | A module for defining retry and repeat policies with composable schedules.                                                 |
| Scope    | Manages the lifecycle of resources, ensuring proper acquisition and release.                                               |
| Schema   | A powerful library for defining, validating, and transforming structured data with type-safe encoding and decoding.        |

In v4, functionality that previously lived in separate packages ships inside `effect` under the `effect/*` namespaces, including `http`, `http-api`, `rpc`, `cluster`, `workflow`, `cli`, `ai`, `sql`, and `reactivity`.

## JOSE

Unstable JOSE APIs are available through `effect/jose` and its module entry points.

The modules provide algorithm-bound keys, compact JWS and JWE, schema-typed
JWTs, and local or scoped remote JWKS resolution. They use Effect's crypto
and HTTP services, with no additional runtime dependencies.

### Schema-typed JWTs

```ts
import { Effect, Schema } from "effect"
import { Mac, SecureRandom, Signature } from "effect/crypto"
import * as Jose from "effect/jose"

const Claims = Schema.Struct({ sub: Schema.String })

const program = Effect.gen(function*() {
  const pair = yield* Jose.Jwk.generateKeyPair({ algorithm: "ES256", kid: "signing-key" })
  const signingKey = yield* Jose.Jwk.importPrivate(pair.privateKey, "ES256")
  const verificationKey = yield* Jose.Jwk.importPublic(pair.publicKey, "ES256")
  const token = yield* Jose.Jwt.sign(Claims, { sub: "user_1" }, signingKey, { alg: "ES256", typ: "JWT" })
  return yield* Jose.Jwt.verify(Claims, token, verificationKey, { algorithms: ["ES256"], typ: "JWT" })
}).pipe(
  Effect.provide([Mac.layerWebCrypto, Signature.layerWebCrypto]),
  Effect.provide(SecureRandom.layerWebCrypto)
)
```

Tokens, private and symmetric keys, and decrypted bytes use `Redacted`. JWT
verification checks signatures and registered claims before decoding the
application schema. Expiration and not-before claims are checked when present;
include `"exp"` in `requiredClaims` when expiration is mandatory.

`Jwt.decodeUnverified` parses without establishing trust. Applications choose
accepted algorithms, issuers, audiences, and token purpose. Schema failures and
encoding/decoding services remain in the error and requirement types.

### Key sets and supported algorithms

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
