# Example Suggestions: `effect/unstable/observability/OtlpResource`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts`
- **Uncovered API records:** 25
- **Priorities:** 0 required, 2 recommended, 22 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                          | Line | Kind               | Priority        |
| ---------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/observability/OtlpResource.make`                            |   40 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpResource.fromConfig`                      |   91 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpResource.entriesToAttributes`             |  164 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpResource.unknownToAttributeValue`         |  186 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpResource.Resource`                        |   22 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpResource.Resource.attributes`             |   24 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.Resource.droppedAttributesCount` |   26 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.KeyValue`                        |  228 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpResource.KeyValue.key`                    |  230 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.KeyValue.value`                  |  232 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.AnyValue`                        |  241 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpResource.AnyValue.stringValue`            |  243 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.AnyValue.boolValue`              |  245 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.AnyValue.intValue`               |  247 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.AnyValue.doubleValue`            |  249 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.AnyValue.arrayValue`             |  251 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.AnyValue.kvlistValue`            |  253 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.AnyValue.bytesValue`             |  255 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.ArrayValue`                      |  264 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpResource.ArrayValue.values`               |  266 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.KeyValueList`                    |  275 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpResource.KeyValueList.values`             |  277 | `member`           | **optional**    |
| `effect/unstable/observability/OtlpResource.LongBits`                        |  286 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpResource.Fixed64`                         |  297 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpResource.serviceNameUnsafe`               |  148 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/observability/OtlpResource.make`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:40`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OTLP resource from service metadata and additional attributes.
- **Signature hint:** `declare function make(options: { readonly serviceName: string; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown> | undefined; }): Resource`
- **Import guidance:** Start from `import { OtlpResource } from "effect/unstable/observability"` and use `OtlpResource.make`.
- **Suggested snippet:** Construct one representative value with `OtlpResource.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/OtlpResource.fromConfig`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:91`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OTLP resource from explicit options and OpenTelemetry configuration.
- **Signature hint:** `declare function fromConfig(options?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown> | undefined; } | undefined): Effect.Effect<Resource>`
- **Import guidance:** Start from `import { OtlpResource } from "effect/unstable/observability"` and use `OtlpResource.fromConfig`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OtlpResource.fromConfig`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/observability/OtlpResource.entriesToAttributes`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:164`
- **Kind / category:** `root-declaration` / `Attributes`
- **Priority:** **optional**
- **Current description:** Converts key/value entries into OTLP `KeyValue` attributes.
- **Signature hint:** `declare function entriesToAttributes(entries: Iterable<[string, unknown]>): Array<KeyValue>`
- **Import guidance:** Start from `import { OtlpResource } from "effect/unstable/observability"` and use `OtlpResource.entriesToAttributes`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts key/value entries into OTLP `KeyValue` attributes. Call `OtlpResource.entriesToAttributes` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.unknownToAttributeValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:186`
- **Kind / category:** `root-declaration` / `Attributes`
- **Priority:** **optional**
- **Current description:** Converts an arbitrary JavaScript value into an OTLP `AnyValue`.
- **Signature hint:** `declare function unknownToAttributeValue(value: unknown): AnyValue`
- **Import guidance:** Start from `import { OtlpResource } from "effect/unstable/observability"` and use `OtlpResource.unknownToAttributeValue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts an arbitrary JavaScript value into an OTLP `AnyValue`. Call `OtlpResource.unknownToAttributeValue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.Resource`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:22`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OTLP resource metadata attached to exported logs, metrics, and traces.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpResource.Resource`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.Resource.attributes`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:24`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Resource attributes
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.Resource.attributes` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.Resource.droppedAttributesCount`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:26`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Resource droppedAttributesCount
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.Resource.droppedAttributesCount` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.KeyValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:228`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An OTLP attribute represented as a string key and typed value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpResource.KeyValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.KeyValue.key`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:230`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** KeyValue key
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.KeyValue.key` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.KeyValue.value`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:232`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** KeyValue value
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.KeyValue.value` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.AnyValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:241`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OTLP `AnyValue` payload for scalar, array, key/value-list, or byte values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpResource.AnyValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.AnyValue.stringValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:243`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** AnyValue stringValue
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.AnyValue.stringValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.AnyValue.boolValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:245`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** AnyValue boolValue
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.AnyValue.boolValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.AnyValue.intValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:247`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** AnyValue intValue
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.AnyValue.intValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.AnyValue.doubleValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:249`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** AnyValue doubleValue
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.AnyValue.doubleValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.AnyValue.arrayValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:251`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** AnyValue arrayValue
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.AnyValue.arrayValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.AnyValue.kvlistValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:253`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** AnyValue kvlistValue
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.AnyValue.kvlistValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.AnyValue.bytesValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:255`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** AnyValue bytesValue
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.AnyValue.bytesValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.ArrayValue`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:264`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OTLP array value containing nested `AnyValue` entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpResource.ArrayValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.ArrayValue.values`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:266`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** ArrayValue values
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.ArrayValue.values` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.KeyValueList`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:275`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OTLP key/value-list value containing nested attributes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpResource.KeyValueList`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.KeyValueList.values`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:277`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** KeyValueList values
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/OtlpResource.KeyValueList.values` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.LongBits`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:286`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Low and high 32-bit parts of a 64-bit integer value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpResource.LongBits`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpResource.Fixed64`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:297`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Accepted runtime representations for an OTLP/protobuf fixed 64-bit value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpResource.Fixed64`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/observability/OtlpResource.serviceNameUnsafe`

- **Source:** `packages/effect/src/unstable/observability/OtlpResource.ts:148`
- **Kind / category:** `root-declaration` / `Attributes`
- **Priority:** **discouraged**
- **Current description:** Returns the `service.name` attribute from an OTLP resource.
- **Signature hint:** `declare function serviceNameUnsafe(resource: Resource): string`
- **Import guidance:** Start from `import { OtlpResource } from "effect/unstable/observability"` and use `OtlpResource.serviceNameUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `OtlpResource.serviceNameUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
