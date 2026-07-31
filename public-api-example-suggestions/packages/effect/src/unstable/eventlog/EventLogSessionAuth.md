# Example Suggestions: `effect/unstable/eventlog/EventLogSessionAuth`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts`
- **Uncovered API records:** 15
- **Priorities:** 0 required, 8 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                                 | Line | Kind               | Priority        |
| ----------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/EventLogSessionAuth.EventLogSessionAuthError`             |  108 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogSessionAuth.encodeSessionAuthPayload`             |  275 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogSessionAuth.decodeSessionAuthPayload`             |  313 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogSessionAuth.signSessionAuthPayloadBytes`          |  357 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogSessionAuth.verifySessionAuthPayloadBytes`        |  405 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogSessionAuth.signSessionAuthPayload`               |  443 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogSessionAuth.verifySessionAuthPayload`             |  464 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogSessionAuth.verifySessionAuthenticateRequest`     |  502 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogSessionAuth.makeSessionAuthChallenge`             |  485 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogSessionAuth.AuthPayloadContext`                   |   31 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogSessionAuth.Ed25519PublicKeyLength`               |   45 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogSessionAuth.Ed25519SignatureLength`               |   58 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogSessionAuth.SessionAuthChallengeLength`           |   71 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogSessionAuth.SessionAuthChallengeTimeToLiveMillis` |   85 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogSessionAuth.SessionAuthPayload`                   |   94 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/eventlog/EventLogSessionAuth.EventLogSessionAuthError`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:108`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised while encoding, decoding, signing, verifying, or generating session authentication challenges.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.EventLogSessionAuthError`.
- **Suggested snippet:** Create or capture `EventLogSessionAuth.EventLogSessionAuthError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogSessionAuth.encodeSessionAuthPayload`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:275`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Encodes a session authentication payload into the canonical byte format.
- **Signature hint:** `declare function encodeSessionAuthPayload(payload: SessionAuthPayload): Effect.Effect<Uint8Array<ArrayBuffer>, EventLogSessionAuthError, never>`
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.encodeSessionAuthPayload`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogSessionAuth.encodeSessionAuthPayload`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogSessionAuth.decodeSessionAuthPayload`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:313`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Decodes a canonical session authentication payload.
- **Signature hint:** `declare function decodeSessionAuthPayload(payload: Uint8Array<ArrayBufferLike>): Effect.Effect<SessionAuthPayload, EventLogSessionAuthError, never>`
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.decodeSessionAuthPayload`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogSessionAuth.decodeSessionAuthPayload`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogSessionAuth.signSessionAuthPayloadBytes`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:357`
- **Kind / category:** `root-declaration` / `signing`
- **Priority:** **recommended**
- **Current description:** Creates a canonical session authentication signature with an Ed25519 private key.
- **Signature hint:** `declare function signSessionAuthPayloadBytes(options: { readonly payload: Uint8Array; readonly signingPrivateKey: Uint8Array; }): Effect.Effect<Uint8Array<ArrayBuffer>, EventLogSessionAuthError, never>`
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.signSessionAuthPayloadBytes`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogSessionAuth.signSessionAuthPayloadBytes`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogSessionAuth.verifySessionAuthPayloadBytes`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:405`
- **Kind / category:** `root-declaration` / `verification`
- **Priority:** **recommended**
- **Current description:** Verifies an Ed25519 signature for canonical session authentication payload bytes.
- **Signature hint:** `declare function verifySessionAuthPayloadBytes(options: { readonly payload: Uint8Array; readonly signingPublicKey: Uint8Array; readonly signature: Uint8Array; }): Effect.Effect<boolean, EventLogSessionAuthError, never>`
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.verifySessionAuthPayloadBytes`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogSessionAuth.verifySessionAuthPayloadBytes`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogSessionAuth.signSessionAuthPayload`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:443`
- **Kind / category:** `root-declaration` / `signing`
- **Priority:** **recommended**
- **Current description:** Encodes a session authentication payload in canonical form and signs it with an Ed25519 private key.
- **Signature hint:** `declare function signSessionAuthPayload(options: SessionAuthPayload & { readonly signingPrivateKey: Uint8Array; }): Effect.Effect<Uint8Array<ArrayBuffer>, EventLogSessionAuthError, never>`
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.signSessionAuthPayload`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogSessionAuth.signSessionAuthPayload`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogSessionAuth.verifySessionAuthPayload`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:464`
- **Kind / category:** `root-declaration` / `verification`
- **Priority:** **recommended**
- **Current description:** Encodes a session authentication payload in canonical form and verifies its Ed25519 signature.
- **Signature hint:** `declare function verifySessionAuthPayload(options: SessionAuthPayload & { readonly signature: Uint8Array; }): Effect.Effect<boolean, EventLogSessionAuthError, never>`
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.verifySessionAuthPayload`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogSessionAuth.verifySessionAuthPayload`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogSessionAuth.verifySessionAuthenticateRequest`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:502`
- **Kind / category:** `root-declaration` / `verification`
- **Priority:** **recommended**
- **Current description:** Verifies an authentication request by requiring the `Ed25519` algorithm and checking the signature over the canonical session authentication payload.
- **Signature hint:** `declare function verifySessionAuthenticateRequest(options: { readonly remoteId: string | Uint8Array; readonly challenge: Uint8Array; readonly publicKey: string; readonly signingPublicKey: Uint8Array; readonly signature: Uint8Array; readonly algorithm: string; }): Effect.Effect<boolean, EventLogSessionAuthError, never>`
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.verifySessionAuthenticateRequest`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogSessionAuth.verifySessionAuthenticateRequest`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/EventLogSessionAuth.makeSessionAuthChallenge`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:485`
- **Kind / category:** `root-declaration` / `challenge`
- **Priority:** **optional**
- **Current description:** Generates a random session authentication challenge using `globalThis.crypto`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.makeSessionAuthChallenge`.
- **Suggested snippet:** Construct one representative value with `EventLogSessionAuth.makeSessionAuthChallenge`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogSessionAuth.AuthPayloadContext`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:31`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Defines the domain-separation string embedded in canonical session authentication payloads.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.AuthPayloadContext`.
- **Suggested snippet:** Use `EventLogSessionAuth.AuthPayloadContext` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogSessionAuth.Ed25519PublicKeyLength`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:45`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Defines the required byte length for raw Ed25519 public keys used in session authentication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.Ed25519PublicKeyLength`.
- **Suggested snippet:** Use `EventLogSessionAuth.Ed25519PublicKeyLength` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogSessionAuth.Ed25519SignatureLength`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:58`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Defines the required byte length for Ed25519 signatures used in session authentication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.Ed25519SignatureLength`.
- **Suggested snippet:** Use `EventLogSessionAuth.Ed25519SignatureLength` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogSessionAuth.SessionAuthChallengeLength`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:71`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Defines the number of random bytes generated for a session authentication challenge.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.SessionAuthChallengeLength`.
- **Suggested snippet:** Use `EventLogSessionAuth.SessionAuthChallengeLength` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogSessionAuth.SessionAuthChallengeTimeToLiveMillis`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:85`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Defines the time-to-live, in milliseconds, for a pending session authentication challenge.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogSessionAuth } from "effect/unstable/eventlog"` and use `EventLogSessionAuth.SessionAuthChallengeTimeToLiveMillis`.
- **Suggested snippet:** Use `EventLogSessionAuth.SessionAuthChallengeTimeToLiveMillis` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogSessionAuth.SessionAuthPayload`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts:94`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Payload fields that are canonicalized and signed during session authentication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLogSessionAuth.SessionAuthPayload`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
