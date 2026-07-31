# Example Suggestions: `@effect/sql-mssql/Parameter`

- **Package:** `@effect/sql-mssql`
- **Source:** `packages/sql/mssql/src/Parameter.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 0 recommended, 2 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                          | Line | Kind               | Priority        |
| -------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-mssql/Parameter.make`           |   54 | `root-declaration` | **optional**    |
| `@effect/sql-mssql/Parameter.Parameter`      |   40 | `root-declaration` | **optional**    |
| `@effect/sql-mssql/Parameter.TypeId (value)` |   24 | `root-declaration` | **discouraged** |
| `@effect/sql-mssql/Parameter.TypeId (type)`  |   32 | `root-declaration` | **discouraged** |

## Optional

### `@effect/sql-mssql/Parameter.make`

- **Source:** `packages/sql/mssql/src/Parameter.ts:54`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates typed metadata for a SQL Server stored procedure parameter.
- **Signature hint:** `declare function make<A>(name: string, type: DataType, options?: ParameterOptions): Parameter<A>`
- **Import guidance:** Start from `import { Parameter } from "@effect/sql-mssql"` and use `Parameter.make`.
- **Suggested snippet:** Construct one representative value with `Parameter.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/Parameter.Parameter`

- **Source:** `packages/sql/mssql/src/Parameter.ts:40`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Metadata for a SQL Server stored procedure parameter, including its name, Tedious data type, options, and phantom value type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mssql/Parameter.Parameter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-mssql/Parameter.TypeId (value)`

- **Source:** `packages/sql/mssql/src/Parameter.ts:24`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark SQL Server stored procedure parameter metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Parameter } from "@effect/sql-mssql"` and use `Parameter.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Parameter.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-mssql/Parameter.TypeId (type)`

- **Source:** `packages/sql/mssql/src/Parameter.ts:32`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark SQL Server stored procedure parameter metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-mssql/Parameter.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
