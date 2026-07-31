# Example Suggestions: `effect/SchemaParser`

- **Package:** `effect`
- **Source:** `packages/effect/src/SchemaParser.ts`
- **Uncovered API records:** 25
- **Priorities:** 0 required, 11 recommended, 14 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                        | Line | Kind               | Priority        |
| ------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/SchemaParser.makeEffect`           |   73 | `root-declaration` | **recommended** |
| `effect/SchemaParser.makeOption`           |  104 | `root-declaration` | **recommended** |
| `effect/SchemaParser.make`                 |  138 | `root-declaration` | **recommended** |
| `effect/SchemaParser.is`                   |  176 | `root-declaration` | **recommended** |
| `effect/SchemaParser.asserts`              |  228 | `root-declaration` | **recommended** |
| `effect/SchemaParser.decodeUnknownEffect`  |  261 | `root-declaration` | **recommended** |
| `effect/SchemaParser.decodeEffect`         |  296 | `root-declaration` | **recommended** |
| `effect/SchemaParser.decodeUnknownPromise` |  328 | `root-declaration` | **recommended** |
| `effect/SchemaParser.encodeUnknownEffect`  |  600 | `root-declaration` | **recommended** |
| `effect/SchemaParser.encodeEffect`         |  634 | `root-declaration` | **recommended** |
| `effect/SchemaParser.encodeUnknownPromise` |  666 | `root-declaration` | **recommended** |
| `effect/SchemaParser.decodePromise`        |  360 | `root-declaration` | **optional**    |
| `effect/SchemaParser.decodeUnknownExit`    |  396 | `root-declaration` | **optional**    |
| `effect/SchemaParser.decodeExit`           |  429 | `root-declaration` | **optional**    |
| `effect/SchemaParser.decodeUnknownResult`  |  475 | `root-declaration` | **optional**    |
| `effect/SchemaParser.decodeResult`         |  508 | `root-declaration` | **optional**    |
| `effect/SchemaParser.decodeUnknownSync`    |  540 | `root-declaration` | **optional**    |
| `effect/SchemaParser.decodeSync`           |  574 | `root-declaration` | **optional**    |
| `effect/SchemaParser.encodePromise`        |  697 | `root-declaration` | **optional**    |
| `effect/SchemaParser.encodeUnknownExit`    |  728 | `root-declaration` | **optional**    |
| `effect/SchemaParser.encodeExit`           |  761 | `root-declaration` | **optional**    |
| `effect/SchemaParser.encodeUnknownResult`  |  809 | `root-declaration` | **optional**    |
| `effect/SchemaParser.encodeResult`         |  842 | `root-declaration` | **optional**    |
| `effect/SchemaParser.encodeUnknownSync`    |  873 | `root-declaration` | **optional**    |
| `effect/SchemaParser.encodeSync`           |  907 | `root-declaration` | **optional**    |

## Recommended

### `effect/SchemaParser.makeEffect`

- **Source:** `packages/effect/src/SchemaParser.ts:73`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an effectful maker for the schema's decoded type side.
- **Signature hint:** `declare function makeEffect<S extends Schema.Constraint>(schema: S): (input: S['~type.make.in'], options?: Schema.MakeOptions) => Effect.Effect<S['Type'], SchemaIssue.Issue>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.makeEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SchemaParser.makeEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.makeOption`

- **Source:** `packages/effect/src/SchemaParser.ts:104`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a synchronous maker that returns `Option.some` with the constructed value on success, or `Option.none` when construction fails with schema issues.
- **Signature hint:** `declare function makeOption<S extends Schema.Constraint>(schema: S): (input: S['~type.make.in'], options?: Schema.MakeOptions) => Option.Option<S['Type']>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.makeOption`.
- **Suggested snippet:** Call `SchemaParser.makeOption` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.make`

- **Source:** `packages/effect/src/SchemaParser.ts:138`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a synchronous maker for the schema's decoded type side.
- **Signature hint:** `declare function make<S extends Schema.Constraint>(schema: S): (input: S['~type.make.in'], options?: Schema.MakeOptions) => S['Type']`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.make`.
- **Suggested snippet:** Construct one representative value with `SchemaParser.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.is`

- **Source:** `packages/effect/src/SchemaParser.ts:176`
- **Kind / category:** `root-declaration` / `Asserting`
- **Priority:** **recommended**
- **Current description:** Creates a type guard that checks whether an input satisfies the schema's decoded type side.
- **Signature hint:** `declare function is<S extends Schema.Constraint>(schema: S): <I>(input: I) => input is I & S['Type']`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.is`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaParser.is` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.asserts`

- **Source:** `packages/effect/src/SchemaParser.ts:228`
- **Kind / category:** `root-declaration` / `Asserting`
- **Priority:** **recommended**
- **Current description:** Asserts that an input satisfies the schema's decoded type side.
- **Signature hint:** `declare function asserts<S extends Schema.Constraint, I>(schema: S, input: I): asserts input is I & S['Type']`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.asserts`.
- **Suggested snippet:** Declare a value with the broad accepted type, call `SchemaParser.asserts` once with a satisfying value, and access a property available only after the assertion to demonstrate narrowing. Include an invalid value only inside a supported throw assertion when runtime rejection is part of the documented contract.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.decodeUnknownEffect`

- **Source:** `packages/effect/src/SchemaParser.ts:261`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Creates an effectful decoder for `unknown` input.
- **Signature hint:** `declare function decodeUnknownEffect<S extends Schema.Constraint>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Effect.Effect<S['Type'], SchemaIssue.Issue, S['DecodingServices']>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodeUnknownEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SchemaParser.decodeUnknownEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.decodeEffect`

- **Source:** `packages/effect/src/SchemaParser.ts:296`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Creates an effectful decoder for input already typed as the schema's `Encoded` type.
- **Signature hint:** `declare function decodeEffect<S extends Schema.Constraint>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => Effect.Effect<S['Type'], SchemaIssue.Issue, S['DecodingServices']>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodeEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SchemaParser.decodeEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.decodeUnknownPromise`

- **Source:** `packages/effect/src/SchemaParser.ts:328`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Creates a Promise-based decoder for `unknown` input.
- **Signature hint:** `declare function decodeUnknownPromise<S extends Schema.ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Promise<S['Type']>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodeUnknownPromise`.
- **Suggested snippet:** Convert one representative external input with `SchemaParser.decodeUnknownPromise` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.encodeUnknownEffect`

- **Source:** `packages/effect/src/SchemaParser.ts:600`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Creates an effectful encoder for `unknown` input.
- **Signature hint:** `declare function encodeUnknownEffect<S extends Schema.Constraint>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Effect.Effect<S['Encoded'], SchemaIssue.Issue, S['EncodingServices']>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodeUnknownEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SchemaParser.encodeUnknownEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.encodeEffect`

- **Source:** `packages/effect/src/SchemaParser.ts:634`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Creates an effectful encoder for input already typed as the schema's decoded `Type`.
- **Signature hint:** `declare function encodeEffect<S extends Schema.Constraint>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => Effect.Effect<S['Encoded'], SchemaIssue.Issue, S['EncodingServices']>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodeEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SchemaParser.encodeEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaParser.encodeUnknownPromise`

- **Source:** `packages/effect/src/SchemaParser.ts:666`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Creates a Promise-based encoder for `unknown` input.
- **Signature hint:** `declare function encodeUnknownPromise<S extends Schema.ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Promise<S['Encoded']>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodeUnknownPromise`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaParser.encodeUnknownPromise`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/SchemaParser.decodePromise`

- **Source:** `packages/effect/src/SchemaParser.ts:360`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Creates a Promise-based decoder for input already typed as the schema's `Encoded` type.
- **Signature hint:** `declare function decodePromise<S extends Schema.ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => Promise<S['Type']>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodePromise`.
- **Suggested snippet:** Convert one representative external input with `SchemaParser.decodePromise` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.decodeUnknownExit`

- **Source:** `packages/effect/src/SchemaParser.ts:396`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Creates a synchronous decoder for `unknown` input that reports failure safely as an `Exit`.
- **Signature hint:** `declare function decodeUnknownExit<S extends Schema.ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Exit.Exit<S['Type'], SchemaIssue.Issue>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodeUnknownExit`.
- **Suggested snippet:** Call `SchemaParser.decodeUnknownExit` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.decodeExit`

- **Source:** `packages/effect/src/SchemaParser.ts:429`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Creates a synchronous decoder for input already typed as the schema's `Encoded` type, reporting failure safely as an `Exit`.
- **Signature hint:** `declare function decodeExit<S extends Schema.ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => Exit.Exit<S['Type'], SchemaIssue.Issue>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodeExit`.
- **Suggested snippet:** Call `SchemaParser.decodeExit` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.decodeUnknownResult`

- **Source:** `packages/effect/src/SchemaParser.ts:475`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Creates a decoder for `unknown` input that reports failure safely as a `Result`.
- **Signature hint:** `declare function decodeUnknownResult<S extends Schema.ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Result.Result<S['Type'], SchemaIssue.Issue>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodeUnknownResult`.
- **Suggested snippet:** Call `SchemaParser.decodeUnknownResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.decodeResult`

- **Source:** `packages/effect/src/SchemaParser.ts:508`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Creates a decoder for input already typed as the schema's `Encoded` type, reporting failure safely as a `Result`.
- **Signature hint:** `declare function decodeResult<S extends Schema.ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => Result.Result<S['Type'], SchemaIssue.Issue>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodeResult`.
- **Suggested snippet:** Call `SchemaParser.decodeResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.decodeUnknownSync`

- **Source:** `packages/effect/src/SchemaParser.ts:540`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Creates a synchronous decoder for `unknown` input.
- **Signature hint:** `declare function decodeUnknownSync<S extends Schema.ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => S['Type']`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodeUnknownSync`.
- **Suggested snippet:** Convert one representative external input with `SchemaParser.decodeUnknownSync` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.decodeSync`

- **Source:** `packages/effect/src/SchemaParser.ts:574`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Creates a synchronous decoder for input already typed as the schema's `Encoded` type.
- **Signature hint:** `declare function decodeSync<S extends Schema.ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => S['Type']`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.decodeSync`.
- **Suggested snippet:** Convert one representative external input with `SchemaParser.decodeSync` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.encodePromise`

- **Source:** `packages/effect/src/SchemaParser.ts:697`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Creates a Promise-based encoder for input already typed as the schema's decoded `Type`.
- **Signature hint:** `declare function encodePromise<S extends Schema.ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => Promise<S['Encoded']>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodePromise`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaParser.encodePromise`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.encodeUnknownExit`

- **Source:** `packages/effect/src/SchemaParser.ts:728`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Creates a synchronous encoder for `unknown` input that reports failure safely as an `Exit`.
- **Signature hint:** `declare function encodeUnknownExit<S extends Schema.ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Exit.Exit<S['Encoded'], SchemaIssue.Issue>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodeUnknownExit`.
- **Suggested snippet:** Call `SchemaParser.encodeUnknownExit` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.encodeExit`

- **Source:** `packages/effect/src/SchemaParser.ts:761`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Creates a synchronous encoder for input already typed as the schema's decoded `Type`, reporting failure safely as an `Exit`.
- **Signature hint:** `declare function encodeExit<S extends Schema.ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => Exit.Exit<S['Encoded'], SchemaIssue.Issue>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodeExit`.
- **Suggested snippet:** Call `SchemaParser.encodeExit` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.encodeUnknownResult`

- **Source:** `packages/effect/src/SchemaParser.ts:809`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Creates an encoder for `unknown` input that reports failure safely as a `Result`.
- **Signature hint:** `declare function encodeUnknownResult<S extends Schema.ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Result.Result<S['Encoded'], SchemaIssue.Issue>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodeUnknownResult`.
- **Suggested snippet:** Call `SchemaParser.encodeUnknownResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.encodeResult`

- **Source:** `packages/effect/src/SchemaParser.ts:842`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Creates an encoder for input already typed as the schema's decoded `Type`, reporting failure safely as a `Result`.
- **Signature hint:** `declare function encodeResult<S extends Schema.ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => Result.Result<S['Encoded'], SchemaIssue.Issue>`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodeResult`.
- **Suggested snippet:** Call `SchemaParser.encodeResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.encodeUnknownSync`

- **Source:** `packages/effect/src/SchemaParser.ts:873`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Creates a synchronous encoder for `unknown` input.
- **Signature hint:** `declare function encodeUnknownSync<S extends Schema.ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => S['Encoded']`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodeUnknownSync`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaParser.encodeUnknownSync`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaParser.encodeSync`

- **Source:** `packages/effect/src/SchemaParser.ts:907`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Creates a synchronous encoder for input already typed as the schema's decoded `Type`.
- **Signature hint:** `declare function encodeSync<S extends Schema.ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => S['Encoded']`
- **Import guidance:** Start from `import { SchemaParser } from "effect"` and use `SchemaParser.encodeSync`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaParser.encodeSync`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
