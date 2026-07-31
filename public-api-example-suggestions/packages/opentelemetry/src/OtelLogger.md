# Example Suggestions: `@effect/opentelemetry/OtelLogger`

- **Package:** `@effect/opentelemetry`
- **Source:** `packages/opentelemetry/src/OtelLogger.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 5 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind               | Priority        |
| ----------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/opentelemetry/OtelLogger.layer`                    |  142 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelLogger.layerLoggerProvider`      |  168 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelLogger.OtelLoggerProvider`       |   36 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelLogger.logLevelToSeverityNumber` |   55 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelLogger.make`                     |   80 | `root-declaration` | **recommended** |

## Recommended

### `@effect/opentelemetry/OtelLogger.layer`

- **Source:** `packages/opentelemetry/src/OtelLogger.ts:142`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that installs the OpenTelemetry-backed Effect logger, merging with existing loggers by default.
- **Signature hint:** `declare function layer(options: { readonly mergeWithExisting?: boolean | undefined; }): Layer.Layer<never, never, OtelLoggerProvider>`
- **Import guidance:** Start from `import { OtelLogger } from "@effect/opentelemetry"` and use `OtelLogger.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `OtelLogger.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelLogger.layerLoggerProvider`

- **Source:** `packages/opentelemetry/src/OtelLogger.ts:168`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a scoped OpenTelemetry logger provider from one or more log record processors, using the current `Resource` and flushing and shutting down the provider when the layer is released.
- **Signature hint:** `declare function layerLoggerProvider(processor: Otel.LogRecordProcessor | NonEmptyReadonlyArray<Otel.LogRecordProcessor>, config?: Omit<Otel.LoggerProviderConfig, 'resource'> & { readonly shutdownTimeout?: Duration.Input | undefined; }): Layer.Layer<OtelLoggerProvider, never, Resource>`
- **Import guidance:** Start from `import { OtelLogger } from "@effect/opentelemetry"` and use `OtelLogger.layerLoggerProvider`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtelLogger.layerLoggerProvider`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelLogger.OtelLoggerProvider`

- **Source:** `packages/opentelemetry/src/OtelLogger.ts:36`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service containing the OpenTelemetry `LoggerProvider` used to emit Effect log records.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelLogger } from "@effect/opentelemetry"` and use `OtelLogger.OtelLoggerProvider`.
- **Suggested snippet:** Consume `OtelLogger.OtelLoggerProvider` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelLogger.logLevelToSeverityNumber`

- **Source:** `packages/opentelemetry/src/OtelLogger.ts:55`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Maps an Effect `LogLevel` to the corresponding OpenTelemetry `SeverityNumber`.
- **Signature hint:** `declare function logLevelToSeverityNumber(level: LogLevel.LogLevel): SeverityNumber`
- **Import guidance:** Start from `import { OtelLogger } from "@effect/opentelemetry"` and use `OtelLogger.logLevelToSeverityNumber`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Maps an Effect `LogLevel` to the corresponding OpenTelemetry `SeverityNumber`. Call `OtelLogger.logLevelToSeverityNumber` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelLogger.make`

- **Source:** `packages/opentelemetry/src/OtelLogger.ts:80`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an Effect logger that emits log records through the configured OpenTelemetry logger provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelLogger } from "@effect/opentelemetry"` and use `OtelLogger.make`.
- **Suggested snippet:** Construct one representative value with `OtelLogger.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
