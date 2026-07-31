# Example Suggestions: `@effect/sql-mssql/Procedure`

- **Package:** `@effect/sql-mssql`
- **Source:** `packages/sql/mssql/src/Procedure.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 4 recommended, 6 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind                    | Priority        |
| -------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `@effect/sql-mssql/Procedure.param`                      |  139 | `root-declaration`      | **recommended** |
| `@effect/sql-mssql/Procedure.outputParam`                |  164 | `root-declaration`      | **recommended** |
| `@effect/sql-mssql/Procedure.withRows`                   |  189 | `root-declaration`      | **recommended** |
| `@effect/sql-mssql/Procedure.compile`                    |  203 | `root-declaration`      | **recommended** |
| `@effect/sql-mssql/Procedure.make`                       |  125 | `root-declaration`      | **optional**    |
| `@effect/sql-mssql/Procedure.Procedure (type) (type)`    |   43 | `root-declaration`      | **optional**    |
| `@effect/sql-mssql/Procedure.ProcedureWithValues`        |   63 | `root-declaration`      | **optional**    |
| `@effect/sql-mssql/Procedure.Procedure (type) (type)`    |   76 | `namespace`             | **optional**    |
| `@effect/sql-mssql/Procedure.Procedure.ParametersRecord` |   83 | `namespace-declaration` | **optional**    |
| `@effect/sql-mssql/Procedure.Procedure.Result`           |   98 | `namespace-declaration` | **optional**    |
| `@effect/sql-mssql/Procedure.TypeId (value)`             |   27 | `root-declaration`      | **discouraged** |
| `@effect/sql-mssql/Procedure.TypeId (type)`              |   35 | `root-declaration`      | **discouraged** |

## Recommended

### `@effect/sql-mssql/Procedure.param`

- **Source:** `packages/sql/mssql/src/Procedure.ts:139`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds a typed input parameter to a SQL Server stored procedure definition.
- **Signature hint:** `declare function param<A>(): <N extends string, T extends DataType>(name: N, type: T, options?: ParameterOptions) => <I extends Record<string, Parameter.Parameter<any>>, O extends Record<string, Parameter.Parameter<any>>>(self: Procedure<I, O>) => Procedure<Simplify<I & { [K in N]: Parameter.Parameter<A>; }>, O>`
- **Import guidance:** Start from `import { Procedure } from "@effect/sql-mssql"` and use `Procedure.param`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a typed input parameter to a SQL Server stored procedure definition. Call `Procedure.param` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mssql/Procedure.outputParam`

- **Source:** `packages/sql/mssql/src/Procedure.ts:164`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds a typed output parameter to a SQL Server stored procedure definition.
- **Signature hint:** `declare function outputParam<A>(): <N extends string, T extends DataType>(name: N, type: T, options?: ParameterOptions) => <I extends Record<string, Parameter.Parameter<any>>, O extends Record<string, Parameter.Parameter<any>>>(self: Procedure<I, O>) => Procedure<I, Simplify<O & { [K in N]: Parameter.Parameter<A>; }>>`
- **Import guidance:** Start from `import { Procedure } from "@effect/sql-mssql"` and use `Procedure.outputParam`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a typed output parameter to a SQL Server stored procedure definition. Call `Procedure.outputParam` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mssql/Procedure.withRows`

- **Source:** `packages/sql/mssql/src/Procedure.ts:189`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets the expected row type for a SQL Server stored procedure definition.
- **Signature hint:** `declare function withRows<A extends object = Row>(): <I extends Record<string, Parameter.Parameter<any>>, O extends Record<string, Parameter.Parameter<any>>>(self: Procedure<I, O>) => Procedure<I, O, A>`
- **Import guidance:** Start from `import { Procedure } from "@effect/sql-mssql"` and use `Procedure.withRows`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the expected row type for a SQL Server stored procedure definition. Call `Procedure.withRows` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mssql/Procedure.compile`

- **Source:** `packages/sql/mssql/src/Procedure.ts:203`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Binds input values to a SQL Server stored procedure definition, producing a value that can be executed with `MssqlClient.call`.
- **Signature hint:** `declare function compile<I extends Record<string, Parameter.Parameter<any>>, O extends Record<string, Parameter.Parameter<any>>, A>(self: Procedure<I, O, A>): (input: Procedure.ParametersRecord<I>) => ProcedureWithValues<I, O, A>`
- **Import guidance:** Start from `import { Procedure } from "@effect/sql-mssql"` and use `Procedure.compile`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Binds input values to a SQL Server stored procedure definition, producing a value that can be executed with `MssqlClient.call`. Call `Procedure.compile` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-mssql/Procedure.make`

- **Source:** `packages/sql/mssql/src/Procedure.ts:125`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an empty SQL Server stored procedure definition for the given procedure name.
- **Signature hint:** `declare function make(name: string): Procedure<{}, {}>`
- **Import guidance:** Start from `import { Procedure } from "@effect/sql-mssql"` and use `Procedure.make`.
- **Suggested snippet:** Construct one representative value with `Procedure.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/Procedure.Procedure (type) (type)`

- **Source:** `packages/sql/mssql/src/Procedure.ts:43`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Pipeable definition of a SQL Server stored procedure, tracking its input parameters, output parameters, and result row type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mssql/Procedure.Procedure (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/Procedure.ProcedureWithValues`

- **Source:** `packages/sql/mssql/src/Procedure.ts:63`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Stored procedure definition with concrete input values bound for execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mssql/Procedure.ProcedureWithValues`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/Procedure.Procedure (type) (type)`

- **Source:** `packages/sql/mssql/src/Procedure.ts:76`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type helpers and result types for SQL Server stored procedures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mssql/Procedure.Procedure (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/Procedure.Procedure.ParametersRecord`

- **Source:** `packages/sql/mssql/src/Procedure.ts:83`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Maps a record of `Parameter` metadata to the corresponding record of parameter value types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mssql/Procedure.Procedure.ParametersRecord`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/Procedure.Procedure.Result`

- **Source:** `packages/sql/mssql/src/Procedure.ts:98`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Result of a SQL Server stored procedure call, containing typed output parameter values and returned rows.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mssql/Procedure.Procedure.Result`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-mssql/Procedure.TypeId (value)`

- **Source:** `packages/sql/mssql/src/Procedure.ts:27`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark SQL Server stored procedure definitions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Procedure } from "@effect/sql-mssql"` and use `Procedure.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Procedure.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-mssql/Procedure.TypeId (type)`

- **Source:** `packages/sql/mssql/src/Procedure.ts:35`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark SQL Server stored procedure definitions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-mssql/Procedure.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
