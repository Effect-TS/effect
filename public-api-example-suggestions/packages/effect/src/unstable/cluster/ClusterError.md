# Example Suggestions: `effect/unstable/cluster/ClusterError`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts`
- **Uncovered API records:** 21
- **Priorities:** 0 required, 7 recommended, 7 optional, 7 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                     | Line | Kind               | Priority        |
| ----------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/ClusterError.EntityNotAssignedToRunner`        |   28 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ClusterError.MalformedMessage`                 |   63 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ClusterError.PersistenceError`                 |  102 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ClusterError.RunnerNotRegistered`              |  130 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ClusterError.RunnerUnavailable`                |  148 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ClusterError.MailboxFull`                      |  184 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ClusterError.AlreadyProcessingMessage`         |  216 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ClusterError.EntityNotAssignedToRunner.is`     |   46 | `member`           | **optional**    |
| `effect/unstable/cluster/ClusterError.MalformedMessage.is`              |   79 | `member`           | **optional**    |
| `effect/unstable/cluster/ClusterError.MalformedMessage.refail`          |   88 | `member`           | **optional**    |
| `effect/unstable/cluster/ClusterError.PersistenceError.refail`          |  118 | `member`           | **optional**    |
| `effect/unstable/cluster/ClusterError.RunnerUnavailable.is`             |  164 | `member`           | **optional**    |
| `effect/unstable/cluster/ClusterError.MailboxFull.is`                   |  200 | `member`           | **optional**    |
| `effect/unstable/cluster/ClusterError.AlreadyProcessingMessage.is`      |  235 | `member`           | **optional**    |
| `effect/unstable/cluster/ClusterError.EntityNotAssignedToRunner.TypeId` |   39 | `member`           | **discouraged** |
| `effect/unstable/cluster/ClusterError.MalformedMessage.TypeId`          |   72 | `member`           | **discouraged** |
| `effect/unstable/cluster/ClusterError.PersistenceError.TypeId`          |  111 | `member`           | **discouraged** |
| `effect/unstable/cluster/ClusterError.RunnerNotRegistered.TypeId`       |  139 | `member`           | **discouraged** |
| `effect/unstable/cluster/ClusterError.RunnerUnavailable.TypeId`         |  157 | `member`           | **discouraged** |
| `effect/unstable/cluster/ClusterError.MailboxFull.TypeId`               |  193 | `member`           | **discouraged** |
| `effect/unstable/cluster/ClusterError.AlreadyProcessingMessage.TypeId`  |  228 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/cluster/ClusterError.EntityNotAssignedToRunner`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:28`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an error that occurs when a Runner receives a message for an entity that is not assigned to the receiving runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterError } from "effect/unstable/cluster"` and use `ClusterError.EntityNotAssignedToRunner`.
- **Suggested snippet:** Create or capture `ClusterError.EntityNotAssignedToRunner` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ClusterError.MalformedMessage`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:63`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an error that occurs when a message fails at a schema serialization or deserialization boundary.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterError } from "effect/unstable/cluster"` and use `ClusterError.MalformedMessage`.
- **Suggested snippet:** Create or capture `ClusterError.MalformedMessage` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ClusterError.PersistenceError`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:102`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an error that occurs when a message fails to be persisted into cluster's mailbox storage.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterError } from "effect/unstable/cluster"` and use `ClusterError.PersistenceError`.
- **Suggested snippet:** Create or capture `ClusterError.PersistenceError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ClusterError.RunnerNotRegistered`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:130`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an error that occurs when a Runner is not registered with the shard manager.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterError } from "effect/unstable/cluster"` and use `ClusterError.RunnerNotRegistered`.
- **Suggested snippet:** Create or capture `ClusterError.RunnerNotRegistered` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ClusterError.RunnerUnavailable`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:148`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an error that occurs when a Runner is unresponsive.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterError } from "effect/unstable/cluster"` and use `ClusterError.RunnerUnavailable`.
- **Suggested snippet:** Create or capture `ClusterError.RunnerUnavailable` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ClusterError.MailboxFull`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:184`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an error that occurs when the entity mailbox is full.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterError } from "effect/unstable/cluster"` and use `ClusterError.MailboxFull`.
- **Suggested snippet:** Create or capture `ClusterError.MailboxFull` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ClusterError.AlreadyProcessingMessage`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:216`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an error that occurs when the same request envelope is already being processed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterError } from "effect/unstable/cluster"` and use `ClusterError.AlreadyProcessingMessage`.
- **Suggested snippet:** Create or capture `ClusterError.AlreadyProcessingMessage` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/ClusterError.EntityNotAssignedToRunner.is`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:46`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns `true` when the value is an `EntityNotAssignedToRunner` error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/ClusterError.EntityNotAssignedToRunner.is` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterError.MalformedMessage.is`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:79`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns `true` when the value is a `MalformedMessage` error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/ClusterError.MalformedMessage.is` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterError.MalformedMessage.refail`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:88`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Maps failures from the supplied effect into `MalformedMessage` errors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/ClusterError.MalformedMessage.refail` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterError.PersistenceError.refail`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:118`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Maps failures from the supplied effect into `PersistenceError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/ClusterError.PersistenceError.refail` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterError.RunnerUnavailable.is`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:164`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns `true` when the value is a `RunnerUnavailable` error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/ClusterError.RunnerUnavailable.is` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterError.MailboxFull.is`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:200`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns `true` when the value is a `MailboxFull` error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/ClusterError.MailboxFull.is` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterError.AlreadyProcessingMessage.is`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:235`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns `true` when the value is an `AlreadyProcessingMessage` error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/ClusterError.AlreadyProcessingMessage.is` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/ClusterError.EntityNotAssignedToRunner.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:39`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/ClusterError.EntityNotAssignedToRunner.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/ClusterError.MalformedMessage.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:72`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/ClusterError.MalformedMessage.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/ClusterError.PersistenceError.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:111`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/ClusterError.PersistenceError.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/ClusterError.RunnerNotRegistered.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:139`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/ClusterError.RunnerNotRegistered.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/ClusterError.RunnerUnavailable.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:157`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/ClusterError.RunnerUnavailable.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/ClusterError.MailboxFull.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:193`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/ClusterError.MailboxFull.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/ClusterError.AlreadyProcessingMessage.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/ClusterError.ts:228`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/ClusterError.AlreadyProcessingMessage.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
