# Example Suggestions: `effect/SchemaRepresentation`

- **Package:** `effect`
- **Source:** `packages/effect/src/SchemaRepresentation.ts`
- **Uncovered API records:** 71
- **Priorities:** 0 required, 9 recommended, 62 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind                    | Priority        |
| ----------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/SchemaRepresentation.makeDeclarationReviver`        |  568 | `root-declaration`      | **recommended** |
| `effect/SchemaRepresentation.makeFilterReviver`             |  580 | `root-declaration`      | **recommended** |
| `effect/SchemaRepresentation.makeFilterGroupReviver`        |  592 | `root-declaration`      | **recommended** |
| `effect/SchemaRepresentation.toJsonSchemaDocument`          |  738 | `root-declaration`      | **recommended** |
| `effect/SchemaRepresentation.toJsonSchemaMultiDocument`     |  761 | `root-declaration`      | **recommended** |
| `effect/SchemaRepresentation.toCodeDocument`                |  782 | `root-declaration`      | **recommended** |
| `effect/SchemaRepresentation.fromJson`                      | 1054 | `root-declaration`      | **recommended** |
| `effect/SchemaRepresentation.fromJsonMultiDocument`         | 1076 | `root-declaration`      | **recommended** |
| `effect/SchemaRepresentation.fromRepresentations`           | 1135 | `root-declaration`      | **recommended** |
| `effect/SchemaRepresentation.CheckRepresentationAnnotation` |   36 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.RepresentationAnnotation`      |   25 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.makeCode`                      |  633 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.toRepresentation`              |  685 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.toRepresentations`             |  699 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.toMultiDocument`               |  715 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.toJson`                        | 1011 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.toJsonMultiDocument`           | 1032 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.fromJsonSchemaDocument`        | 1159 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.fromJsonSchemaMultiDocument`   | 1183 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.ToJsonSchema`                  |   45 | `namespace`             | **optional**    |
| `effect/SchemaRepresentation.ToJsonSchema.CheckInput`       |   52 | `namespace-declaration` | **optional**    |
| `effect/SchemaRepresentation.ToJsonSchema.Check`            |   63 | `namespace-declaration` | **optional**    |
| `effect/SchemaRepresentation.Generation`                    |   71 | `namespace`             | **optional**    |
| `effect/SchemaRepresentation.Generation.DeclarationInput`   |   78 | `namespace-declaration` | **optional**    |
| `effect/SchemaRepresentation.Generation.DeclarationOutput`  |   88 | `namespace-declaration` | **optional**    |
| `effect/SchemaRepresentation.Generation.Declaration`        |  100 | `namespace-declaration` | **optional**    |
| `effect/SchemaRepresentation.Generation.CheckInput`         |  108 | `namespace-declaration` | **optional**    |
| `effect/SchemaRepresentation.Generation.CheckOutput`        |  118 | `namespace-declaration` | **optional**    |
| `effect/SchemaRepresentation.Generation.Check`              |  129 | `namespace-declaration` | **optional**    |
| `effect/SchemaRepresentation.Declaration`                   |  138 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Suspend`                       |  152 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Reference`                     |  165 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Null`                          |  182 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Undefined`                     |  189 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Void`                          |  196 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Never`                         |  203 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Unknown`                       |  210 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Any`                           |  217 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.String`                        |  225 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Number`                        |  233 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Boolean`                       |  240 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.BigInt`                        |  247 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Literal`                       |  267 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.UniqueSymbol`                  |  277 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.ObjectKeyword`                 |  287 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Enum`                          |  300 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.TemplateLiteral`               |  310 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Element`                       |  320 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Arrays`                        |  332 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.PropertySignature`             |  353 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.IndexSignature`                |  367 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Objects`                       |  378 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Union`                         |  389 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Representation`                |  400 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Check`                         |  430 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Filter`                        |  438 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.FilterGroup`                   |  451 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.References`                    |  464 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Document`                      |  474 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.MultiDocument`                 |  485 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.DeclarationReviver`            |  496 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.FilterReviver`                 |  512 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.FilterGroupReviver`            |  528 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.CheckReviver`                  |  544 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Reviver`                       |  552 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.AnyReviver`                    |  560 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.FromJsonSchemaOptions`         |  612 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Code`                          |  622 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Artifact`                      |  641 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.CodeDocument`                  |  663 | `root-declaration`      | **optional**    |
| `effect/SchemaRepresentation.Symbol`                        |  254 | `root-declaration`      | **optional**    |

## Recommended

### `effect/SchemaRepresentation.makeDeclarationReviver`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:568`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a declaration reviver while inferring its payload type from `payloadSchema`.
- **Signature hint:** `declare function makeDeclarationReviver<P>(id: string, payloadSchema: Schema.Decoder<P>, revive: DeclarationReviver<P>['revive']): DeclarationReviver<P>`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.makeDeclarationReviver`.
- **Suggested snippet:** Use `SchemaRepresentation.makeDeclarationReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaRepresentation.makeFilterReviver`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:580`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a filter reviver while inferring its payload type from `payloadSchema`.
- **Signature hint:** `declare function makeFilterReviver<P>(id: string, payloadSchema: Schema.Decoder<P>, revive: FilterReviver<P>['revive']): FilterReviver<P>`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.makeFilterReviver`.
- **Suggested snippet:** Use `SchemaRepresentation.makeFilterReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaRepresentation.makeFilterGroupReviver`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:592`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a filter group reviver while inferring its payload type from `payloadSchema`.
- **Signature hint:** `declare function makeFilterGroupReviver<P>(id: string, payloadSchema: Schema.Decoder<P>, revive: FilterGroupReviver<P>['revive']): FilterGroupReviver<P>`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.makeFilterGroupReviver`.
- **Suggested snippet:** Use `SchemaRepresentation.makeFilterGroupReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaRepresentation.toJsonSchemaDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:738`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **recommended**
- **Current description:** Compiles a live representation document to JSON Schema Draft 2020-12.
- **Signature hint:** `declare function toJsonSchemaDocument(document: Document, options?: Schema.ToJsonSchemaOptions): JsonSchema.Document<'draft-2020-12'>`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.toJsonSchemaDocument`.
- **Suggested snippet:** Create a small public Schema, call `SchemaRepresentation.toJsonSchemaDocument`, and assert a stable JSON Schema projection such as `type`, `required`, or one property schema rather than the entire metadata-rich document.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaRepresentation.toJsonSchemaMultiDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:761`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **recommended**
- **Current description:** Compiles multiple live representations to a shared JSON Schema Draft 2020-12 document.
- **Signature hint:** `declare function toJsonSchemaMultiDocument(document: MultiDocument, options?: Schema.ToJsonSchemaOptions): JsonSchema.MultiDocument<'draft-2020-12'>`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.toJsonSchemaMultiDocument`.
- **Suggested snippet:** Create a small public Schema, call `SchemaRepresentation.toJsonSchemaMultiDocument`, and assert a stable JSON Schema projection such as `type`, `required`, or one property schema rather than the entire metadata-rich document.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaRepresentation.toCodeDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:782`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **recommended**
- **Current description:** Generates TypeScript source for live schema representations and their definitions.
- **Signature hint:** `declare function toCodeDocument(document: MultiDocument): CodeDocument`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.toCodeDocument`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaRepresentation.toCodeDocument`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaRepresentation.fromJson`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:1054`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Decodes a persisted single-root representation document from JSON.
- **Signature hint:** `declare function fromJson(input: Schema.Json): Document`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.fromJson`.
- **Suggested snippet:** Convert one representative external input with `SchemaRepresentation.fromJson` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaRepresentation.fromJsonMultiDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:1076`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Decodes a persisted multi-root representation document from JSON.
- **Signature hint:** `declare function fromJsonMultiDocument(input: Schema.Json): MultiDocument`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.fromJsonMultiDocument`.
- **Suggested snippet:** Convert one representative external input with `SchemaRepresentation.fromJsonMultiDocument` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaRepresentation.fromRepresentations`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:1135`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **recommended**
- **Current description:** Reconstructs multiple runtime schemas from a representation multi-document.
- **Signature hint:** `declare function fromRepresentations(document: MultiDocument, options: { readonly revivers: ReadonlyArray<AnyReviver>; }): readonly [Schema.Top, ...Array<Schema.Top>]`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.fromRepresentations`.
- **Suggested snippet:** Convert one representative external input with `SchemaRepresentation.fromRepresentations` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/SchemaRepresentation.CheckRepresentationAnnotation`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:36`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Open persistence identity and schema dependencies carried by opaque checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.CheckRepresentationAnnotation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.RepresentationAnnotation`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:25`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Open persistence identity carried by declarations and opaque checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.RepresentationAnnotation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.makeCode`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:633`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates generated runtime and TypeScript source strings for a schema.
- **Signature hint:** `declare function makeCode(runtime: string, Type: string): Code`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.makeCode`.
- **Suggested snippet:** Construct one representative value with `SchemaRepresentation.makeCode`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.toRepresentation`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:685`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Lowers the encoded side of an AST to a live representation document.
- **Signature hint:** `declare function toRepresentation(ast: SchemaAST.AST): Document`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.toRepresentation`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaRepresentation.toRepresentation`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.toRepresentations`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:699`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Lowers one or more AST encoded sides in a shared reference environment.
- **Signature hint:** `declare function toRepresentations(asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>]): MultiDocument`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.toRepresentations`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaRepresentation.toRepresentations`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.toMultiDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:715`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Wraps a single representation document as a multi-document with one root.
- **Signature hint:** `declare function toMultiDocument(document: Document): MultiDocument`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.toMultiDocument`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaRepresentation.toMultiDocument`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.toJson`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:1011`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Projects a live single-root representation document and encodes it as JSON.
- **Signature hint:** `declare function toJson(document: Document): Schema.Json`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.toJson`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaRepresentation.toJson`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.toJsonMultiDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:1032`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Projects a live multi-root representation document and encodes it as JSON.
- **Signature hint:** `declare function toJsonMultiDocument(document: MultiDocument): Schema.Json`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.toJsonMultiDocument`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `SchemaRepresentation.toJsonMultiDocument`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.fromJsonSchemaDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:1159`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Imports a JSON Schema Draft 2020-12 document as a runtime schema.
- **Signature hint:** `declare function fromJsonSchemaDocument(document: JsonSchema.Document<'draft-2020-12'>, options?: FromJsonSchemaOptions): Schema.Top`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.fromJsonSchemaDocument`.
- **Suggested snippet:** Define the smallest domain Schema involving `SchemaRepresentation.fromJsonSchemaDocument`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.fromJsonSchemaMultiDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:1183`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Imports multiple JSON Schema Draft 2020-12 roots as runtime schemas with shared definitions.
- **Signature hint:** `declare function fromJsonSchemaMultiDocument(document: JsonSchema.MultiDocument<'draft-2020-12'>, options?: FromJsonSchemaOptions): readonly [Schema.Top, ...Array<Schema.Top>]`
- **Import guidance:** Start from `import { SchemaRepresentation } from "effect"` and use `SchemaRepresentation.fromJsonSchemaMultiDocument`.
- **Suggested snippet:** Convert one representative external input with `SchemaRepresentation.fromJsonSchemaMultiDocument` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.ToJsonSchema`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:45`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Input passed to JSON Schema compiler annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.ToJsonSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.ToJsonSchema.CheckInput`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:52`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input for a check compiler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.ToJsonSchema.CheckInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.ToJsonSchema.Check`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:63`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** JSON Schema compiler for a check.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.ToJsonSchema.Check`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Generation`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:71`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Input and output contracts for code generation annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Generation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Generation.DeclarationInput`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:78`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input for declaration code generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Generation.DeclarationInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Generation.DeclarationOutput`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:88`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Output of declaration code generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Generation.DeclarationOutput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Generation.Declaration`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:100`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Declaration code generator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Generation.Declaration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Generation.CheckInput`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:108`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input for check code generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Generation.CheckInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Generation.CheckOutput`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:118`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Output of check code generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Generation.CheckOutput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Generation.Check`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:129`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Check code generator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Generation.Check`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Declaration`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:138`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A custom opaque declaration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Declaration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Suspend`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:152`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A lazily resolved representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Suspend`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Reference`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:165`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A named reference.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Reference`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Null`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:182`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The null keyword representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Null`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Undefined`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:189`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The undefined keyword representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Undefined`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Void`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:196`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The void keyword representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Void`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Never`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:203`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The never keyword representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Never`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Unknown`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:210`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The unknown keyword representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Unknown`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Any`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:217`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The any keyword representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.String`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:225`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A string representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.String`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Number`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:233`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A number representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Number`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Boolean`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:240`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A boolean representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Boolean`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.BigInt`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:247`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A bigint representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.BigInt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Literal`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:267`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A literal representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Literal`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.UniqueSymbol`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:277`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A unique global symbol representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.UniqueSymbol`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.ObjectKeyword`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:287`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The object keyword representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.ObjectKeyword`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Enum`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:300`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An enum representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Enum`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.TemplateLiteral`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:310`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A template literal representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.TemplateLiteral`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Element`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:320`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A tuple element.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Element`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Arrays`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:332`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An array or tuple representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Arrays`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.PropertySignature`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:353`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A property signature.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.PropertySignature`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.IndexSignature`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:367`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An index signature.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.IndexSignature`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Objects`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:378`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An object representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Objects`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Union`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:389`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A union representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Union`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Representation`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:400`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The structural schema representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Representation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Check`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:430`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A structural check.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Check`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Filter`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:438`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An opaque leaf check.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Filter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.FilterGroup`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:451`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A non-empty group of checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.FilterGroup`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.References`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:464`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Named representation definitions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.References`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Document`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:474`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A single representation and its definitions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Document`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.MultiDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:485`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Multiple representations sharing definitions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.MultiDocument`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.DeclarationReviver`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:496`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Reviver for a declaration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.DeclarationReviver`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.FilterReviver`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:512`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Reviver for a leaf check.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.FilterReviver`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.FilterGroupReviver`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:528`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Reviver for a check group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.FilterGroupReviver`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.CheckReviver`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:544`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A check reviver.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.CheckReviver`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Reviver`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:552`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A typed reviver.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Reviver`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.AnyReviver`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:560`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A reviver erased only at collection boundaries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.AnyReviver`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.FromJsonSchemaOptions`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:612`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Options for importing JSON Schema Draft 2020-12 documents.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.FromJsonSchemaOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Code`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:622`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Runtime and TypeScript source generated for one schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Code`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Artifact`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:641`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Auxiliary source artifact emitted while generating schema code.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Artifact`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.CodeDocument`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:663`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated schema code together with named references and auxiliary artifacts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.CodeDocument`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaRepresentation.Symbol`

- **Source:** `packages/effect/src/SchemaRepresentation.ts:254`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A symbol representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaRepresentation.Symbol`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
