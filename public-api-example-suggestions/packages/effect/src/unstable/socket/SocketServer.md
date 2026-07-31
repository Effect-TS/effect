# Example Suggestions: `effect/unstable/socket/SocketServer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 4 recommended, 5 optional, 3 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                 | Line | Kind               | Priority        |
| ------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/socket/SocketServer.SocketServer`                  |   24 | `root-declaration` | **recommended** |
| `effect/unstable/socket/SocketServer.SocketServerOpenError`         |   53 | `root-declaration` | **recommended** |
| `effect/unstable/socket/SocketServer.SocketServerUnknownError`      |   67 | `root-declaration` | **recommended** |
| `effect/unstable/socket/SocketServer.SocketServerError`             |   90 | `root-declaration` | **recommended** |
| `effect/unstable/socket/SocketServer.SocketServerErrorReason`       |   81 | `root-declaration` | **optional**    |
| `effect/unstable/socket/SocketServer.SocketServerError.message`     |  113 | `member`           | **optional**    |
| `effect/unstable/socket/SocketServer.Address`                       |  124 | `root-declaration` | **optional**    |
| `effect/unstable/socket/SocketServer.TcpAddress`                    |  132 | `root-declaration` | **optional**    |
| `effect/unstable/socket/SocketServer.UnixAddress`                   |  144 | `root-declaration` | **optional**    |
| `effect/unstable/socket/SocketServer.ErrorTypeId (value)`           |   37 | `root-declaration` | **discouraged** |
| `effect/unstable/socket/SocketServer.ErrorTypeId (type)`            |   45 | `root-declaration` | **discouraged** |
| `effect/unstable/socket/SocketServer.SocketServerError.ErrorTypeId` |  106 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/socket/SocketServer.SocketServer`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:24`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for a socket server, exposing its bound address and a run loop that handles each accepted `Socket`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SocketServer } from "effect/unstable/socket"` and use `SocketServer.SocketServer`.
- **Suggested snippet:** Consume `SocketServer.SocketServer` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/SocketServer.SocketServerOpenError`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:53`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason for failures that occur while opening a socket server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SocketServer } from "effect/unstable/socket"` and use `SocketServer.SocketServerOpenError`.
- **Suggested snippet:** Create or capture `SocketServer.SocketServerOpenError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/SocketServer.SocketServerUnknownError`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:67`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason for uncategorized socket server failures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SocketServer } from "effect/unstable/socket"` and use `SocketServer.SocketServerUnknownError`.
- **Suggested snippet:** Create or capture `SocketServer.SocketServerUnknownError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/SocketServer.SocketServerError`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:90`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Tagged socket server error that wraps a server error reason and exposes its cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SocketServer } from "effect/unstable/socket"` and use `SocketServer.SocketServerError`.
- **Suggested snippet:** Create or capture `SocketServer.SocketServerError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/socket/SocketServer.SocketServerErrorReason`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:81`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of socket server error reasons.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/socket/SocketServer.SocketServerErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/SocketServer.SocketServerError.message`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:113`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Delegates the public message to the underlying socket server error reason.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/socket/SocketServer.SocketServerError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/SocketServer.Address`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:124`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Socket server address, either a TCP host and port or a Unix socket path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/socket/SocketServer.Address`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/SocketServer.TcpAddress`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:132`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** TCP socket server address with hostname and port.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/socket/SocketServer.TcpAddress`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/SocketServer.UnixAddress`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:144`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Unix socket server address identified by a filesystem path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/socket/SocketServer.UnixAddress`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/socket/SocketServer.ErrorTypeId (value)`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:37`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier attached to `SocketServerError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SocketServer } from "effect/unstable/socket"` and use `SocketServer.ErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `SocketServer.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/socket/SocketServer.ErrorTypeId (type)`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:45`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark `SocketServerError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/socket/SocketServer.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/socket/SocketServer.SocketServerError.ErrorTypeId`

- **Source:** `packages/effect/src/unstable/socket/SocketServer.ts:106`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a socket server error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/socket/SocketServer.SocketServerError.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
