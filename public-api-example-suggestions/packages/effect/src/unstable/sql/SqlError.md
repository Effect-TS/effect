# Example Suggestions: `effect/unstable/sql/SqlError`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/sql/SqlError.ts`
- **Uncovered API records:** 45
- **Priorities:** 0 required, 17 recommended, 16 optional, 12 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                               | Line | Kind               | Priority        |
| ----------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/sql/SqlError.ConnectionError`                    |   31 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.AuthenticationError`                |   59 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.AuthorizationError`                 |   86 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.SqlSyntaxError`                     |  112 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.UniqueViolation`                    |  145 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.ConstraintError`                    |  172 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.DeadlockError`                      |  199 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.SerializationError`                 |  227 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.LockTimeoutError`                   |  254 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.StatementTimeoutError`              |  281 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.UnknownError`                       |  307 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.SqlErrorReason (value)`             |  354 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.SqlError`                           |  387 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.isSqlError`                         |  429 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.isSqlErrorReason`                   |  437 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.classifySqliteError`                |  513 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.ResultLengthMismatch`               |  576 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlError.SqlErrorReason (type)`              |  335 | `root-declaration` | **optional**    |
| `effect/unstable/sql/SqlError.ConnectionError.isRetryable`        |   47 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.AuthenticationError.isRetryable`    |   74 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.AuthorizationError.isRetryable`     |  101 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.SqlSyntaxError.isRetryable`         |  128 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.UniqueViolation.isRetryable`        |  161 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.ConstraintError.isRetryable`        |  188 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.DeadlockError.isRetryable`          |  215 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.SerializationError.isRetryable`     |  242 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.LockTimeoutError.isRetryable`       |  270 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.StatementTimeoutError.isRetryable`  |  296 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.UnknownError.isRetryable`           |  323 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.SqlError.cause`                     |  402 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.SqlError.message`                   |  409 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.SqlError.isRetryable`               |  418 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.ResultLengthMismatch.message`       |  587 | `member`           | **optional**    |
| `effect/unstable/sql/SqlError.ConnectionError.ReasonTypeId`       |   40 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.AuthenticationError.ReasonTypeId`   |   67 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.AuthorizationError.ReasonTypeId`    |   94 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.SqlSyntaxError.ReasonTypeId`        |  121 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.UniqueViolation.ReasonTypeId`       |  154 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.ConstraintError.ReasonTypeId`       |  181 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.DeadlockError.ReasonTypeId`         |  208 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.SerializationError.ReasonTypeId`    |  235 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.LockTimeoutError.ReasonTypeId`      |  263 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.StatementTimeoutError.ReasonTypeId` |  289 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.UnknownError.ReasonTypeId`          |  316 | `member`           | **discouraged** |
| `effect/unstable/sql/SqlError.SqlError.TypeId`                    |  395 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/sql/SqlError.ConnectionError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:31`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for connection or open failures; marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.ConnectionError`.
- **Suggested snippet:** Create or capture `SqlError.ConnectionError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.AuthenticationError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:59`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for authentication failures such as invalid credentials; not marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.AuthenticationError`.
- **Suggested snippet:** Create or capture `SqlError.AuthenticationError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.AuthorizationError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:86`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for authorization or permission failures; not marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.AuthorizationError`.
- **Suggested snippet:** Create or capture `SqlError.AuthorizationError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.SqlSyntaxError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:112`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for invalid SQL syntax; not marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.SqlSyntaxError`.
- **Suggested snippet:** Create or capture `SqlError.SqlSyntaxError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.UniqueViolation`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:145`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for a unique constraint violation, including the violated constraint identifier; not marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.UniqueViolation`.
- **Suggested snippet:** Create or capture `SqlError.UniqueViolation` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.ConstraintError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:172`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for a non-unique constraint violation; not marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.ConstraintError`.
- **Suggested snippet:** Create or capture `SqlError.ConstraintError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.DeadlockError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:199`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for a database deadlock; marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.DeadlockError`.
- **Suggested snippet:** Create or capture `SqlError.DeadlockError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.SerializationError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:227`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for a transaction serialization or isolation conflict; marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.SerializationError`.
- **Suggested snippet:** Create or capture `SqlError.SerializationError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.LockTimeoutError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:254`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for timing out while waiting on a database lock; marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.LockTimeoutError`.
- **Suggested snippet:** Create or capture `SqlError.LockTimeoutError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.StatementTimeoutError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:281`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for a statement or query timeout; marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.StatementTimeoutError`.
- **Suggested snippet:** Create or capture `SqlError.StatementTimeoutError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.UnknownError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:307`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** SQL error reason for an unclassified database failure; not marked retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.UnknownError`.
- **Suggested snippet:** Create or capture `SqlError.UnknownError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.SqlErrorReason (value)`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:354`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for encoding and decoding SQL error reasons.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.SqlErrorReason`.
- **Suggested snippet:** Use `SqlError.SqlErrorReason` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.SqlError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:387`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error wrapper for SQL failures whose `message`, `cause`, and `isRetryable` values are derived from its `SqlErrorReason`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.SqlError`.
- **Suggested snippet:** Create or capture `SqlError.SqlError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.isSqlError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:429`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a `SqlError`.
- **Signature hint:** `declare function isSqlError(u: unknown): u is SqlError`
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.isSqlError`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SqlError.isSqlError` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.isSqlErrorReason`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:437`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a `SqlErrorReason`.
- **Signature hint:** `declare function isSqlErrorReason(u: unknown): u is SqlErrorReason`
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.isSqlErrorReason`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SqlError.isSqlErrorReason` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.classifySqliteError`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:513`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Classifies a native SQLite error cause into a `SqlErrorReason` using its `code` or `errno`, with optional message and operation metadata.
- **Signature hint:** `declare function classifySqliteError(cause: unknown, { message, operation }?: SqliteClassifyOptions): SqlErrorReason`
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.classifySqliteError`.
- **Suggested snippet:** Create or capture `SqlError.classifySqliteError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlError.ResultLengthMismatch`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:576`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when an ordered batched SQL resolver receives a different number of result rows than requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlError } from "effect/unstable/sql"` and use `SqlError.ResultLengthMismatch`.
- **Suggested snippet:** Create or capture `SqlError.ResultLengthMismatch` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/sql/SqlError.SqlErrorReason (type)`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:335`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of structured SQL error reasons, each carrying the original cause plus optional message and operation metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlError.SqlErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.ConnectionError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:47`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.ConnectionError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.AuthenticationError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:74`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.AuthenticationError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.AuthorizationError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:101`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.AuthorizationError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.SqlSyntaxError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:128`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.SqlSyntaxError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.UniqueViolation.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:161`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.UniqueViolation.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.ConstraintError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:188`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.ConstraintError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.DeadlockError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:215`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.DeadlockError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.SerializationError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:242`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.SerializationError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.LockTimeoutError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:270`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.LockTimeoutError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.StatementTimeoutError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:296`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.StatementTimeoutError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.UnknownError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:323`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Indicates whether retrying the failed SQL operation may succeed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.UnknownError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.SqlError.cause`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:402`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Exposes the structured SQL reason as the JavaScript error cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.SqlError.cause` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.SqlError.message`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:409`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Uses the reason message when present, otherwise falls back to the reason tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.SqlError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.SqlError.isRetryable`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:418`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Delegates retryability to the underlying SQL error reason.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.SqlError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlError.ResultLengthMismatch.message`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:587`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Explains the mismatch between expected and actual batched SQL result counts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlError.ResultLengthMismatch.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/sql/SqlError.ConnectionError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:40`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.ConnectionError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.AuthenticationError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:67`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.AuthenticationError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.AuthorizationError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:94`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.AuthorizationError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.SqlSyntaxError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:121`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.SqlSyntaxError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.UniqueViolation.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:154`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.UniqueViolation.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.ConstraintError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:181`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.ConstraintError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.DeadlockError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:208`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.DeadlockError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.SerializationError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:235`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.SerializationError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.LockTimeoutError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:263`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.LockTimeoutError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.StatementTimeoutError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:289`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.StatementTimeoutError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.UnknownError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:316`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a structured SQL error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.UnknownError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/sql/SqlError.SqlError.TypeId`

- **Source:** `packages/effect/src/unstable/sql/SqlError.ts:395`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as the top-level SQL error wrapper for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/SqlError.SqlError.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
