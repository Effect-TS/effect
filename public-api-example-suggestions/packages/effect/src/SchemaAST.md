# Example Suggestions: `effect/SchemaAST`

- **Package:** `effect`
- **Source:** `packages/effect/src/SchemaAST.ts`
- **Uncovered API records:** 78
- **Priorities:** 0 required, 5 recommended, 73 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/SchemaAST.isAST`                         |   93 | `root-declaration` | **recommended** |
| `effect/SchemaAST.isDeclaration`                 |  110 | `root-declaration` | **recommended** |
| `effect/SchemaAST.isNull`                        |  127 | `root-declaration` | **recommended** |
| `effect/SchemaAST.decodeTo`                      | 3448 | `root-declaration` | **recommended** |
| `effect/SchemaAST.flip`                          | 3647 | `root-declaration` | **recommended** |
| `effect/SchemaAST.ParseOptions`                  |  458 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isUndefined`                   |  142 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isVoid`                        |  157 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isNever`                       |  173 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isUnknown`                     |  188 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isAny`                         |  203 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isString`                      |  220 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isNumber`                      |  233 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isBoolean`                     |  249 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isBigInt`                      |  264 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isSymbol`                      |  279 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isLiteral`                     |  294 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isUniqueSymbol`                |  302 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isObjectKeyword`               |  319 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isEnum`                        |  334 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isTemplateLiteral`             |  342 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isArrays`                      |  357 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isObjects`                     |  365 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isUnion`                       |  373 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isSuspend`                     |  381 | `root-declaration` | **optional**    |
| `effect/SchemaAST.void`                          |  854 | `root-declaration` | **optional**    |
| `effect/SchemaAST.never`                         |  896 | `root-declaration` | **optional**    |
| `effect/SchemaAST.any`                           |  932 | `root-declaration` | **optional**    |
| `effect/SchemaAST.unknown`                       |  972 | `root-declaration` | **optional**    |
| `effect/SchemaAST.objectKeyword`                 | 1010 | `root-declaration` | **optional**    |
| `effect/SchemaAST.string`                        | 1354 | `root-declaration` | **optional**    |
| `effect/SchemaAST.number`                        | 1453 | `root-declaration` | **optional**    |
| `effect/SchemaAST.boolean`                       | 1490 | `root-declaration` | **optional**    |
| `effect/SchemaAST.bigInt`                        | 1601 | `root-declaration` | **optional**    |
| `effect/SchemaAST.optionalKey`                   | 3393 | `root-declaration` | **optional**    |
| `effect/SchemaAST.isOptional`                    | 3513 | `root-declaration` | **optional**    |
| `effect/SchemaAST.resolveAt`                     | 3997 | `root-declaration` | **optional**    |
| `effect/SchemaAST.resolveIdentifier`             | 4012 | `root-declaration` | **optional**    |
| `effect/SchemaAST.resolveTitle`                  | 4024 | `root-declaration` | **optional**    |
| `effect/SchemaAST.resolveDescription`            | 4036 | `root-declaration` | **optional**    |
| `effect/SchemaAST.AST`                           |   54 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Link`                          |  402 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Encoding`                      |  433 | `root-declaration` | **optional**    |
| `effect/SchemaAST.ParseOptions.errors`           |  470 | `member`           | **optional**    |
| `effect/SchemaAST.ParseOptions.onExcessProperty` |  483 | `member`           | **optional**    |
| `effect/SchemaAST.ParseOptions.propertyOrder`    |  506 | `member`           | **optional**    |
| `effect/SchemaAST.ParseOptions.disableChecks`    |  512 | `member`           | **optional**    |
| `effect/SchemaAST.ParseOptions.concurrency`      |  519 | `member`           | **optional**    |
| `effect/SchemaAST.Context`                       |  546 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Context.defaultValue`          |  550 | `member`           | **optional**    |
| `effect/SchemaAST.Checks`                        |  582 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Base`                          |  606 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Declaration`                   |  649 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Null`                          |  715 | `root-declaration` | **optional**    |
| `effect/SchemaAST.null`                          |  740 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Undefined`                     |  755 | `root-declaration` | **optional**    |
| `effect/SchemaAST.undefined`                     |  792 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Void`                          |  815 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Never`                         |  870 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Any`                           |  907 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Unknown`                       |  947 | `root-declaration` | **optional**    |
| `effect/SchemaAST.ObjectKeyword`                 |  984 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Enum`                          | 1024 | `root-declaration` | **optional**    |
| `effect/SchemaAST.TemplateLiteral`               | 1105 | `root-declaration` | **optional**    |
| `effect/SchemaAST.UniqueSymbol`                  | 1201 | `root-declaration` | **optional**    |
| `effect/SchemaAST.LiteralValue`                  | 1237 | `root-declaration` | **optional**    |
| `effect/SchemaAST.String`                        | 1324 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Number`                        | 1375 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Boolean`                       | 1464 | `root-declaration` | **optional**    |
| `effect/SchemaAST.BigInt`                        | 1564 | `root-declaration` | **optional**    |
| `effect/SchemaAST.PropertySignature`             | 1931 | `root-declaration` | **optional**    |
| `effect/SchemaAST.IndexSignature`                | 1993 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Filter`                        | 3017 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Filter.aborted`                | 3024 | `member`           | **optional**    |
| `effect/SchemaAST.FilterGroup`                   | 3065 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Check`                         | 3100 | `root-declaration` | **optional**    |
| `effect/SchemaAST.Symbol`                        | 1510 | `root-declaration` | **optional**    |
| `effect/SchemaAST.symbol`                        | 1549 | `root-declaration` | **optional**    |

## Recommended

### `effect/SchemaAST.isAST`

- **Source:** `packages/effect/src/SchemaAST.ts:93`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if the value is an `AST` node (any variant).
- **Signature hint:** `declare function isAST(u: unknown): u is AST`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isAST`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isAST` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaAST.isDeclaration`

- **Source:** `packages/effect/src/SchemaAST.ts:110`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Narrows an `AST` to `Declaration`.
- **Signature hint:** `declare function isDeclaration(ast: AST): ast is Declaration`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isDeclaration`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isDeclaration` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaAST.isNull`

- **Source:** `packages/effect/src/SchemaAST.ts:127`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Narrows an `AST` to `Null`.
- **Signature hint:** `declare function isNull(ast: AST): ast is Null`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isNull`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isNull` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaAST.decodeTo`

- **Source:** `packages/effect/src/SchemaAST.ts:3448`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **recommended**
- **Current description:** Attaches a `Transformation` to the `to` AST, making it decode from the `from` AST and encode back to it.
- **Signature hint:** `declare function decodeTo<A extends AST>(from: AST, to: A, transformation: SchemaTransformation.Transformation<any, any, any, any>): A`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.decodeTo`.
- **Suggested snippet:** Convert one representative external input with `SchemaAST.decodeTo` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SchemaAST.flip`

- **Source:** `packages/effect/src/SchemaAST.ts:3647`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **recommended**
- **Current description:** Swaps the decode and encode directions of an AST's `Encoding` chain.
- **Signature hint:** `declare function flip(ast: AST): AST`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.flip`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Swaps the decode and encode directions of an AST's `Encoding` chain. Call `SchemaAST.flip` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/SchemaAST.ParseOptions`

- **Source:** `packages/effect/src/SchemaAST.ts:458`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options that control schema parsing, validation, transformation, and output behavior.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaAST.ParseOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isUndefined`

- **Source:** `packages/effect/src/SchemaAST.ts:142`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Undefined`.
- **Signature hint:** `declare function isUndefined(ast: AST): ast is Undefined`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isUndefined`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isUndefined` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isVoid`

- **Source:** `packages/effect/src/SchemaAST.ts:157`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Void`.
- **Signature hint:** `declare function isVoid(ast: AST): ast is Void`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isVoid`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isVoid` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isNever`

- **Source:** `packages/effect/src/SchemaAST.ts:173`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Never`.
- **Signature hint:** `declare function isNever(ast: AST): ast is Never`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isNever`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isNever` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isUnknown`

- **Source:** `packages/effect/src/SchemaAST.ts:188`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Unknown`.
- **Signature hint:** `declare function isUnknown(ast: AST): ast is Unknown`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isUnknown`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isUnknown` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isAny`

- **Source:** `packages/effect/src/SchemaAST.ts:203`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Any`.
- **Signature hint:** `declare function isAny(ast: AST): ast is Any`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isAny`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isAny` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isString`

- **Source:** `packages/effect/src/SchemaAST.ts:220`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `String`.
- **Signature hint:** `declare function isString(ast: AST): ast is String`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isString`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isString` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isNumber`

- **Source:** `packages/effect/src/SchemaAST.ts:233`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Number`.
- **Signature hint:** `declare function isNumber(ast: AST): ast is Number`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isNumber`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isNumber` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isBoolean`

- **Source:** `packages/effect/src/SchemaAST.ts:249`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Boolean`.
- **Signature hint:** `declare function isBoolean(ast: AST): ast is Boolean`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isBoolean`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isBoolean` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isBigInt`

- **Source:** `packages/effect/src/SchemaAST.ts:264`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `BigInt`.
- **Signature hint:** `declare function isBigInt(ast: AST): ast is BigInt`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isBigInt`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isBigInt` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isSymbol`

- **Source:** `packages/effect/src/SchemaAST.ts:279`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Symbol`.
- **Signature hint:** `declare function isSymbol(ast: AST): ast is Symbol`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isSymbol`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isSymbol` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isLiteral`

- **Source:** `packages/effect/src/SchemaAST.ts:294`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Literal`.
- **Signature hint:** `declare function isLiteral(ast: AST): ast is Literal`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isLiteral`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isLiteral` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isUniqueSymbol`

- **Source:** `packages/effect/src/SchemaAST.ts:302`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `UniqueSymbol`.
- **Signature hint:** `declare function isUniqueSymbol(ast: AST): ast is UniqueSymbol`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isUniqueSymbol`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isUniqueSymbol` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isObjectKeyword`

- **Source:** `packages/effect/src/SchemaAST.ts:319`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `ObjectKeyword`.
- **Signature hint:** `declare function isObjectKeyword(ast: AST): ast is ObjectKeyword`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isObjectKeyword`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isObjectKeyword` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isEnum`

- **Source:** `packages/effect/src/SchemaAST.ts:334`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Enum`.
- **Signature hint:** `declare function isEnum(ast: AST): ast is Enum`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isEnum`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isEnum` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isTemplateLiteral`

- **Source:** `packages/effect/src/SchemaAST.ts:342`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `TemplateLiteral`.
- **Signature hint:** `declare function isTemplateLiteral(ast: AST): ast is TemplateLiteral`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isTemplateLiteral`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isTemplateLiteral` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isArrays`

- **Source:** `packages/effect/src/SchemaAST.ts:357`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Arrays`.
- **Signature hint:** `declare function isArrays(ast: AST): ast is Arrays`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isArrays`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isArrays` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isObjects`

- **Source:** `packages/effect/src/SchemaAST.ts:365`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Objects`.
- **Signature hint:** `declare function isObjects(ast: AST): ast is Objects`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isObjects`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isObjects` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isUnion`

- **Source:** `packages/effect/src/SchemaAST.ts:373`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Union`.
- **Signature hint:** `declare function isUnion(ast: AST): ast is Union<AST>`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isUnion`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isUnion` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isSuspend`

- **Source:** `packages/effect/src/SchemaAST.ts:381`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Narrows an `AST` to `Suspend`.
- **Signature hint:** `declare function isSuspend(ast: AST): ast is Suspend`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isSuspend`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaAST.isSuspend` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.void`

- **Source:** `packages/effect/src/SchemaAST.ts:854`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `Void` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.void`.
- **Suggested snippet:** Use `SchemaAST.void` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.never`

- **Source:** `packages/effect/src/SchemaAST.ts:896`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `Never` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.never`.
- **Suggested snippet:** Use `SchemaAST.never` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.any`

- **Source:** `packages/effect/src/SchemaAST.ts:932`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `Any` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.any`.
- **Suggested snippet:** Use `SchemaAST.any` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.unknown`

- **Source:** `packages/effect/src/SchemaAST.ts:972`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `Unknown` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.unknown`.
- **Suggested snippet:** Use `SchemaAST.unknown` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.objectKeyword`

- **Source:** `packages/effect/src/SchemaAST.ts:1010`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `ObjectKeyword` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.objectKeyword`.
- **Suggested snippet:** Use `SchemaAST.objectKeyword` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.string`

- **Source:** `packages/effect/src/SchemaAST.ts:1354`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `String` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.string`.
- **Suggested snippet:** Use `SchemaAST.string` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.number`

- **Source:** `packages/effect/src/SchemaAST.ts:1453`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `Number` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.number`.
- **Suggested snippet:** Use `SchemaAST.number` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.boolean`

- **Source:** `packages/effect/src/SchemaAST.ts:1490`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `Boolean` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.boolean`.
- **Suggested snippet:** Use `SchemaAST.boolean` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.bigInt`

- **Source:** `packages/effect/src/SchemaAST.ts:1601`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `BigInt` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.bigInt`.
- **Suggested snippet:** Use `SchemaAST.bigInt` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.optionalKey`

- **Source:** `packages/effect/src/SchemaAST.ts:3393`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Marks an AST node's property key as optional by setting `Context.isOptional` to `true`.
- **Signature hint:** `declare function optionalKey<A extends AST>(ast: A): A`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.optionalKey`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Marks an AST node's property key as optional by setting `Context.isOptional` to `true`. Call `SchemaAST.optionalKey` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.isOptional`

- **Source:** `packages/effect/src/SchemaAST.ts:3513`
- **Kind / category:** `root-declaration` / `predicates`
- **Priority:** **optional**
- **Current description:** Returns `true` if the AST node represents an optional property.
- **Signature hint:** `declare function isOptional(ast: AST): boolean`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.isOptional`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `SchemaAST.isOptional`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.resolveAt`

- **Source:** `packages/effect/src/SchemaAST.ts:3997`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Returns a single annotation value by key from the AST node.
- **Signature hint:** `declare function resolveAt<A>(key: string): (ast: AST) => A | undefined`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.resolveAt`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a single annotation value by key from the AST node. Call `SchemaAST.resolveAt` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.resolveIdentifier`

- **Source:** `packages/effect/src/SchemaAST.ts:4012`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Returns the `identifier` annotation from the AST node, if set.
- **Signature hint:** `declare function resolveIdentifier(ast: AST): string | undefined`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.resolveIdentifier`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the `identifier` annotation from the AST node, if set. Call `SchemaAST.resolveIdentifier` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.resolveTitle`

- **Source:** `packages/effect/src/SchemaAST.ts:4024`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Returns the `title` annotation from the AST node, if set.
- **Signature hint:** `declare function resolveTitle(ast: AST): string | undefined`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.resolveTitle`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the `title` annotation from the AST node, if set. Call `SchemaAST.resolveTitle` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.resolveDescription`

- **Source:** `packages/effect/src/SchemaAST.ts:4036`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Returns the `description` annotation from the AST node, if set.
- **Signature hint:** `declare function resolveDescription(ast: AST): string | undefined`
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.resolveDescription`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the `description` annotation from the AST node, if set. Call `SchemaAST.resolveDescription` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.AST`

- **Source:** `packages/effect/src/SchemaAST.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Discriminated union of all AST node types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaAST.AST`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Link`

- **Source:** `packages/effect/src/SchemaAST.ts:402`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a single step in an `Encoding` chain.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Link`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Link`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Encoding`

- **Source:** `packages/effect/src/SchemaAST.ts:433`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A non-empty chain of `Link` values representing the transformation steps between a schema's decoded (type) form and its encoded (wire) form.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaAST.Encoding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.ParseOptions.errors`

- **Source:** `packages/effect/src/SchemaAST.ts:470`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Controls how many parsing errors are reported.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaAST.ParseOptions.errors` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.ParseOptions.onExcessProperty`

- **Source:** `packages/effect/src/SchemaAST.ts:483`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Controls how object parsing handles keys that are not declared by the schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaAST.ParseOptions.onExcessProperty` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.ParseOptions.propertyOrder`

- **Source:** `packages/effect/src/SchemaAST.ts:506`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The `propertyOrder` option provides control over the order of object fields in the output. This feature is useful when the sequence of keys is important for the consuming processes or when maintaining the input order enhances readability and usability.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaAST.ParseOptions.propertyOrder` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.ParseOptions.disableChecks`

- **Source:** `packages/effect/src/SchemaAST.ts:512`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to disable checks while still applying defaults and transformations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaAST.ParseOptions.disableChecks` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.ParseOptions.concurrency`

- **Source:** `packages/effect/src/SchemaAST.ts:519`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The maximum number of async effects to run concurrently.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaAST.ParseOptions.concurrency` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Context`

- **Source:** `packages/effect/src/SchemaAST.ts:546`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents per-property metadata attached to AST nodes via `Base.context`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Context`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Context`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Context.defaultValue`

- **Source:** `packages/effect/src/SchemaAST.ts:550`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Used for constructor default values (e.g. `withConstructorDefault` API)
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaAST.Context.defaultValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Checks`

- **Source:** `packages/effect/src/SchemaAST.ts:582`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Non-empty array of validation `Check` values attached to an AST node via `Base.checks`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaAST.Checks`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Base`

- **Source:** `packages/effect/src/SchemaAST.ts:606`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the abstract base class for all `AST` node variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Base`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Base`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Declaration`

- **Source:** `packages/effect/src/SchemaAST.ts:649`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node for user-defined opaque types with custom parsing logic.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Declaration`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Declaration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Null`

- **Source:** `packages/effect/src/SchemaAST.ts:715`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching the `null` literal value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Null`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Null`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.null`

- **Source:** `packages/effect/src/SchemaAST.ts:740`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Provides the singleton `Null` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.null`.
- **Suggested snippet:** Use `SchemaAST.null` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Undefined`

- **Source:** `packages/effect/src/SchemaAST.ts:755`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching the `undefined` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Undefined`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Undefined`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.undefined`

- **Source:** `packages/effect/src/SchemaAST.ts:792`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Provides the singleton `Undefined` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.undefined`.
- **Suggested snippet:** Use `SchemaAST.undefined` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Void`

- **Source:** `packages/effect/src/SchemaAST.ts:815`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching TypeScript `void` return-value semantics.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Void`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Void`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Never`

- **Source:** `packages/effect/src/SchemaAST.ts:870`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node representing the `never` type — no value matches.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Never`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Never`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Any`

- **Source:** `packages/effect/src/SchemaAST.ts:907`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node representing the `any` type — every value matches.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Any`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Unknown`

- **Source:** `packages/effect/src/SchemaAST.ts:947`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node representing the `unknown` type — every value matches.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Unknown`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Unknown`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.ObjectKeyword`

- **Source:** `packages/effect/src/SchemaAST.ts:984`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching the TypeScript `object` type — accepts objects, arrays, and functions (anything non-primitive and non-null).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.ObjectKeyword`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.ObjectKeyword`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Enum`

- **Source:** `packages/effect/src/SchemaAST.ts:1024`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node representing a TypeScript `enum`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Enum`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Enum`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.TemplateLiteral`

- **Source:** `packages/effect/src/SchemaAST.ts:1105`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node representing a TypeScript template literal type (e.g. `` `user_${string}` ``).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.TemplateLiteral`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.TemplateLiteral`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.UniqueSymbol`

- **Source:** `packages/effect/src/SchemaAST.ts:1201`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching a specific `unique symbol` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.UniqueSymbol`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.UniqueSymbol`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.LiteralValue`

- **Source:** `packages/effect/src/SchemaAST.ts:1237`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The set of primitive types that can appear as a `Literal` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaAST.LiteralValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.String`

- **Source:** `packages/effect/src/SchemaAST.ts:1324`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching any `string` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.String`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.String`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Number`

- **Source:** `packages/effect/src/SchemaAST.ts:1375`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching any `number` value (including `NaN`, `Infinity`, `-Infinity`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Number`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Number`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Boolean`

- **Source:** `packages/effect/src/SchemaAST.ts:1464`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching any `boolean` value (`true` or `false`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Boolean`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Boolean`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.BigInt`

- **Source:** `packages/effect/src/SchemaAST.ts:1564`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching any `bigint` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.BigInt`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.BigInt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.PropertySignature`

- **Source:** `packages/effect/src/SchemaAST.ts:1931`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a named property within an `Objects` node.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.PropertySignature`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.PropertySignature`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.IndexSignature`

- **Source:** `packages/effect/src/SchemaAST.ts:1993`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an index signature entry within an `Objects` node.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.IndexSignature`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.IndexSignature`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Filter`

- **Source:** `packages/effect/src/SchemaAST.ts:3017`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a single validation check attached to an AST node.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Filter`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Filter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Filter.aborted`

- **Source:** `packages/effect/src/SchemaAST.ts:3024`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the parsing process should be aborted after this check has failed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaAST.Filter.aborted` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.FilterGroup`

- **Source:** `packages/effect/src/SchemaAST.ts:3065`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a composite validation check grouping multiple `Check` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.FilterGroup`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.FilterGroup`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Check`

- **Source:** `packages/effect/src/SchemaAST.ts:3100`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A validation check — either a single `Filter` or a composite `FilterGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaAST.Check`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.Symbol`

- **Source:** `packages/effect/src/SchemaAST.ts:1510`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** AST node matching any `symbol` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.Symbol`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaAST.Symbol`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaAST.symbol`

- **Source:** `packages/effect/src/SchemaAST.ts:1549`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides the singleton `Symbol` AST instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaAST } from "effect"` and use `SchemaAST.symbol`.
- **Suggested snippet:** Use `SchemaAST.symbol` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
