# Example Suggestions: `@effect/opentelemetry/Resource`

- **Package:** `@effect/opentelemetry`
- **Source:** `packages/opentelemetry/src/Resource.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 5 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/opentelemetry/Resource.layer`              |   45 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/Resource.configToAttributes` |   81 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/Resource.layerFromEnv`       |  106 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/Resource.layerEmpty`         |  145 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/Resource.Resource`           |   34 | `root-declaration` | **recommended** |

## Recommended

### `@effect/opentelemetry/Resource.layer`

- **Source:** `packages/opentelemetry/src/Resource.ts:45`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `Resource` layer from service metadata and additional OpenTelemetry attributes.
- **Signature hint:** `declare function layer(config: { readonly serviceName: string; readonly serviceVersion?: string; readonly attributes?: OtelApi.Attributes; }): Layer.Layer<Resource, never, never>`
- **Import guidance:** Start from `import { Resource } from "@effect/opentelemetry"` and use `Resource.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Resource.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/Resource.configToAttributes`

- **Source:** `packages/opentelemetry/src/Resource.ts:81`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Converts resource configuration into OpenTelemetry attributes, adding service name, optional service version, and telemetry SDK metadata.
- **Signature hint:** `declare function configToAttributes(options: { readonly serviceName: string; readonly serviceVersion?: string; readonly attributes?: OtelApi.Attributes; }): Record<string, string>`
- **Import guidance:** Start from `import { Resource } from "@effect/opentelemetry"` and use `Resource.configToAttributes`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts resource configuration into OpenTelemetry attributes, adding service name, optional service version, and telemetry SDK metadata. Call `Resource.configToAttributes` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/Resource.layerFromEnv`

- **Source:** `packages/opentelemetry/src/Resource.ts:106`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `Resource` layer from OpenTelemetry environment variables, optionally merging additional attributes.
- **Signature hint:** `declare function layerFromEnv(additionalAttributes?: OtelApi.Attributes | undefined): Layer.Layer<Resource>`
- **Import guidance:** Start from `import { Resource } from "@effect/opentelemetry"` and use `Resource.layerFromEnv`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Resource.layerFromEnv`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/Resource.layerEmpty`

- **Source:** `packages/opentelemetry/src/Resource.ts:145`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides an empty OpenTelemetry resource.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Resource } from "@effect/opentelemetry"` and use `Resource.layerEmpty`.
- **Suggested snippet:** Use `Resource.layerEmpty` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/Resource.Resource`

- **Source:** `packages/opentelemetry/src/Resource.ts:34`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for OpenTelemetry metadata attached to emitted telemetry.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Resource } from "@effect/opentelemetry"` and use `Resource.Resource`.
- **Suggested snippet:** Consume `Resource.Resource` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
