# Example Suggestions: `effect/unstable/sql/Statement`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/sql/Statement.ts`
- **Uncovered API records:** 47
- **Priorities:** 0 required, 3 recommended, 43 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind               | Priority        |
| -------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/sql/Statement.isFragment`               |  115 | `root-declaration` | **recommended** |
| `effect/unstable/sql/Statement.isCustom`                 |  123 | `root-declaration` | **recommended** |
| `effect/unstable/sql/Statement.primitiveKind`            | 1098 | `root-declaration` | **recommended** |
| `effect/unstable/sql/Statement.fragment`                 |   48 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.CurrentTransformer`       |  105 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.literal`                  |  164 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.identifier`               |  188 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.parameter`                |  211 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.arrayHelper`              |  234 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.recordInsertHelper`       |  271 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.recordUpdateHelper`       |  307 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.recordUpdateHelperSingle` |  345 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.custom`                   |  382 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.make`                     |  532 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.statement`                |  618 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.join`                     |  655 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.and`                      |  694 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.or`                       |  703 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.csv`                      |  712 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Compiler`                 |  744 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.CompilerOptions`          |  760 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.makeCompiler`             |  795 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.makeCompilerSqlite`       | 1055 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.defaultEscape`            | 1082 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.defaultTransforms`        | 1132 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Fragment`                 |   37 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Dialect`                  |   61 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Statement`                |   71 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Transformer`              |   91 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Segment`                  |  134 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Literal`                  |  151 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Identifier`               |  176 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Parameter`                |  200 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.ArrayHelper`              |  223 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.RecordInsertHelper`       |  246 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.RecordUpdateHelper`       |  286 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.RecordUpdateHelperSingle` |  324 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Custom`                   |  362 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.PrimitiveKind`            |  398 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Helper`                   |  414 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Constructor`              |  431 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Statement.Constructor.update`       |  462 | `member`           | **optional**    |
| `effect/unstable/sql/Statement.Constructor.updateValues` |  474 | `member`           | **optional**    |
| `effect/unstable/sql/Statement.Constructor.and`          |  482 | `member`           | **optional**    |
| `effect/unstable/sql/Statement.Constructor.or`           |  487 | `member`           | **optional**    |
| `effect/unstable/sql/Statement.Constructor.csv`          |  496 | `member`           | **optional**    |
| `effect/unstable/sql/Statement.Constructor.unsafe`       |  442 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/sql/Statement.isFragment`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:115`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a SQL `Fragment`.
- **Signature hint:** `declare function isFragment(u: unknown): u is Fragment`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.isFragment`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Statement.isFragment` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/Statement.isCustom`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:123`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Creates a type guard for custom SQL segments with the specified custom kind.
- **Signature hint:** `declare function isCustom<A extends Custom<any, any, any, any>>(kind: A['kind']): (u: unknown) => u is A`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.isCustom`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Statement.isCustom` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/Statement.primitiveKind`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:1098`
- **Kind / category:** `root-declaration` / `predicates`
- **Priority:** **recommended**
- **Current description:** Classifies a JavaScript value as a SQL primitive kind, treating `undefined` as `null` and defaulting unrecognized objects to `string`.
- **Signature hint:** `declare function primitiveKind(value: unknown): PrimitiveKind`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.primitiveKind`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Classifies a JavaScript value as a SQL primitive kind, treating `undefined` as `null` and defaulting unrecognized objects to `string`. Call `Statement.primitiveKind` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/sql/Statement.fragment`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:48`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a SQL `Fragment` from low-level statement segments.
- **Signature hint:** `declare function fragment(segments: ReadonlyArray<Segment>): Fragment`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.fragment`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a SQL `Fragment` from low-level statement segments. Call `Statement.fragment` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.CurrentTransformer`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:105`
- **Kind / category:** `root-declaration` / `transformer`
- **Priority:** **optional**
- **Current description:** Context reference for an optional current SQL statement transformer applied before statement execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.CurrentTransformer`.
- **Suggested snippet:** Consume `Statement.CurrentTransformer` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.literal`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:164`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a raw SQL literal segment. The literal text is not escaped, so use bound parameters for untrusted values.
- **Signature hint:** `declare function literal(value: string, params?: ReadonlyArray<unknown> | undefined): Literal`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.literal`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a raw SQL literal segment. The literal text is not escaped, so use bound parameters for untrusted values. Call `Statement.literal` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.identifier`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:188`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a SQL identifier segment that will be escaped by the active compiler.
- **Signature hint:** `declare function identifier(value: string): Identifier`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.identifier`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a SQL identifier segment that will be escaped by the active compiler. Call `Statement.identifier` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.parameter`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:211`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a bound parameter segment for a statement value.
- **Signature hint:** `declare function parameter(value: unknown): Parameter`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.parameter`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a bound parameter segment for a statement value. Call `Statement.parameter` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.arrayHelper`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:234`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs an `ArrayHelper` segment for an array of values or fragments.
- **Signature hint:** `declare function arrayHelper(value: ReadonlyArray<unknown | Fragment>): ArrayHelper`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.arrayHelper`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs an `ArrayHelper` segment for an array of values or fragments. Call `Statement.arrayHelper` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.recordInsertHelper`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:271`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a `RecordInsertHelper` from one or more row objects.
- **Signature hint:** `declare function recordInsertHelper(value: ReadonlyArray<Record<string, unknown>>): RecordInsertHelper`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.recordInsertHelper`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a `RecordInsertHelper` from one or more row objects. Call `Statement.recordInsertHelper` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.recordUpdateHelper`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:307`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a `RecordUpdateHelper` for multi-row update compilation using the provided alias.
- **Signature hint:** `declare function recordUpdateHelper(value: ReadonlyArray<Record<string, unknown>>, alias: string): RecordUpdateHelper`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.recordUpdateHelper`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a `RecordUpdateHelper` for multi-row update compilation using the provided alias. Call `Statement.recordUpdateHelper` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.recordUpdateHelperSingle`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:345`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a `RecordUpdateHelperSingle` from a record and a list of columns to omit from the update.
- **Signature hint:** `declare function recordUpdateHelperSingle(value: Record<string, unknown>, omit: ReadonlyArray<string>): RecordUpdateHelperSingle`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.recordUpdateHelperSingle`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a `RecordUpdateHelperSingle` from a record and a list of columns to omit from the update. Call `Statement.recordUpdateHelperSingle` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.custom`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:382`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a constructor for custom SQL segments of a specific kind handled by the active compiler.
- **Signature hint:** `declare function custom<C extends Custom<any, any, any, any>>(kind: C['kind']): (paramA: C['paramA'], paramB: C['paramB'], paramC: C['paramC']) => C`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.custom`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a constructor for custom SQL segments of a specific kind handled by the active compiler. Call `Statement.custom` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.make`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:532`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a cached SQL statement constructor from a connection acquirer, compiler, tracing attributes, and optional row transformation function.
- **Signature hint:** `declare function make(acquirer: Acquirer, compiler: Compiler, spanAttributes: ReadonlyArray<readonly [string, unknown]>, transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined): Constructor`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.make`.
- **Suggested snippet:** Construct one representative value with `Statement.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.statement`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:618`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Builds a `Statement` from template strings and arguments, preserving fragments and helper segments while converting ordinary interpolated values into bound parameters.
- **Signature hint:** `declare function statement<A = Row>(acquirer: Acquirer, compiler: Compiler, strings: TemplateStringsArray, args: Array<any>, spanAttributes: ReadonlyArray<readonly [string, unknown]>, transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined): Statement<A>`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.statement`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds a `Statement` from template strings and arguments, preserving fragments and helper segments while converting ordinary interpolated values into bound parameters. Call `Statement.statement` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.join`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:655`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a helper that joins SQL clauses with a literal separator, optionally wrapping multiple clauses in parentheses and using a fallback for an empty list.
- **Signature hint:** `declare function join(lit: string, addParens?: boolean, fallback?: string): (clauses: ReadonlyArray<string | Fragment>) => Fragment`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.join`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a helper that joins SQL clauses with a literal separator, optionally wrapping multiple clauses in parentheses and using a fallback for an empty list. Call `Statement.join` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.and`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:694`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Combines clauses with `AND`, parenthesizing multiple clauses and returning `1=1` when the list is empty.
- **Signature hint:** `declare function and(clauses: ReadonlyArray<string | Fragment>): Fragment`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.and`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Combines clauses with `AND`, parenthesizing multiple clauses and returning `1=1` when the list is empty. Call `Statement.and` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.or`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:703`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Combines clauses with `OR`, parenthesizing multiple clauses and returning `1=1` when the list is empty.
- **Signature hint:** `declare function or(clauses: ReadonlyArray<string | Fragment>): Fragment`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.or`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Combines clauses with `OR`, parenthesizing multiple clauses and returning `1=1` when the list is empty. Call `Statement.or` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.csv`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:712`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a comma-separated SQL fragment from values, optionally adding a prefix, and returns an empty fragment when no values are provided.
- **Signature hint:** `declare function csv(values: ReadonlyArray<string | Fragment>): Fragment declare function csv(prefix: string, values: ReadonlyArray<string | Fragment>): Fragment`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.csv`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a comma-separated SQL fragment from values, optionally adding a prefix, and returns an empty fragment when no values are provided. Call `Statement.csv` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Compiler`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:744`
- **Kind / category:** `root-declaration` / `compiler`
- **Priority:** **optional**
- **Current description:** Dialect-specific compiler that converts a SQL `Fragment` into SQL text and bind parameters, with a no-transform variant.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Compiler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.CompilerOptions`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:760`
- **Kind / category:** `root-declaration` / `compiler`
- **Priority:** **optional**
- **Current description:** Callbacks used by `makeCompiler` to render dialect placeholders, identifiers, insert helpers, update helpers, and custom SQL segments.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.CompilerOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.makeCompiler`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:795`
- **Kind / category:** `root-declaration` / `compiler`
- **Priority:** **optional**
- **Current description:** Creates a dialect-specific SQL `Compiler` from rendering callbacks.
- **Signature hint:** `declare function makeCompiler<C extends Custom<any, any, any, any> = any>(options: CompilerOptions<C>): Compiler`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.makeCompiler`.
- **Suggested snippet:** Construct one representative value with `Statement.makeCompiler`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.makeCompilerSqlite`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:1055`
- **Kind / category:** `root-declaration` / `compiler`
- **Priority:** **optional**
- **Current description:** Creates a SQLite compiler that uses `?` placeholders and quoted identifiers, optionally transforming identifier names before escaping.
- **Signature hint:** `declare function makeCompilerSqlite(transform?: ((_: string) => string) | undefined): Compiler`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.makeCompilerSqlite`.
- **Suggested snippet:** Construct one representative value with `Statement.makeCompilerSqlite`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.defaultEscape`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:1082`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an identifier escaping function that wraps names in the given delimiter, doubles delimiter characters, and escapes dots between identifier parts.
- **Signature hint:** `declare function defaultEscape(c: string): (str: string) => string`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.defaultEscape`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an identifier escaping function that wraps names in the given delimiter, doubles delimiter characters, and escapes dots between identifier parts. Call `Statement.defaultEscape` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.defaultTransforms`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:1132`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Builds value, object, and row-array transformers that rename object keys with the supplied function and optionally recurse into nested object arrays.
- **Signature hint:** `declare function defaultTransforms(transformer: (str: string) => string, nested?: boolean): { readonly value: (value: any) => any; readonly object: (obj: Record<string, any>) => any; readonly array: <A extends object>(rows: ReadonlyArray<A>) => ReadonlyArray<A>; }`
- **Import guidance:** Start from `import { Statement } from "effect/unstable/sql"` and use `Statement.defaultTransforms`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds value, object, and row-array transformers that rename object keys with the supplied function and optionally recurse into nested object arrays. Call `Statement.defaultTransforms` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Fragment`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:37`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Composable SQL fragment represented as low-level segments that can be interpolated into statements.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Fragment`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Dialect`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:61`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Supported SQL dialect identifiers used by statement compilers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Dialect`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Statement`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:71`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Executable SQL statement that is also a `Fragment` and `Effect`, with helpers for raw execution, streaming, value rows, unprepared execution, no-transform execution, and compilation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Statement`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Transformer`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:91`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Hook that can rewrite or wrap a `Statement` before execution, using the current SQL constructor, fiber, and tracing span.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Transformer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Segment`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:134`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of low-level segment types that make up a SQL `Fragment`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Segment`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Literal`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:151`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Raw SQL literal segment. The literal text is inserted directly into the compiled SQL, while optional `params` are appended as bind parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Literal`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Identifier`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:176`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** SQL identifier segment whose value is escaped by the active dialect compiler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Identifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Parameter`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:200`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Bound parameter segment whose value is emitted as a dialect-specific placeholder and bind value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Parameter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.ArrayHelper`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:223`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Helper segment for compiling an array of values, commonly used to produce placeholder lists for `IN` clauses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.ArrayHelper`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.RecordInsertHelper`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:246`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Helper segment for compiling one or more record objects into an INSERT column/value clause, with optional returning output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.RecordInsertHelper`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.RecordUpdateHelper`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:286`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Helper segment for compiling multi-row update values with a table alias and optional returning output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.RecordUpdateHelper`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.RecordUpdateHelperSingle`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:324`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Helper segment for compiling a single record into update assignments, omitting selected columns and optionally returning output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.RecordUpdateHelperSingle`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Custom`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:362`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Custom SQL segment identified by `kind` and interpreted by the compiler's `onCustom` callback.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Custom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.PrimitiveKind`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:398`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Names the primitive value categories recognized by SQL statement helpers and `primitiveKind`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.PrimitiveKind`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Helper`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:414`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of helper segment types accepted by the SQL statement constructor.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Helper`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Constructor`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:431`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** SQL tagged-template constructor and helper API for building parameterized statements, escaped identifiers, fragments, record helpers, and dialect-specific branches. Raw helpers such as `unsafe` and `literal` insert SQL text directly.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Statement.Constructor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Constructor.update`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:462`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Update a single row
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/Statement.Constructor.update` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Constructor.updateValues`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:474`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Update multiple rows.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/Statement.Constructor.updateValues` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Constructor.and`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:482`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create an `AND` chain for a where clause
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/Statement.Constructor.and` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Constructor.or`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:487`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create an `OR` chain for a where clause
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/Statement.Constructor.or` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Statement.Constructor.csv`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:496`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create comma seperated values, with an optional prefix.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/Statement.Constructor.csv` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/sql/Statement.Constructor.unsafe`

- **Source:** `packages/effect/src/unstable/sql/Statement.ts:442`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Create unsafe SQL query
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/sql/Statement.Constructor.unsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
