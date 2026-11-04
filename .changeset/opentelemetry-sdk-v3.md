---
"@effect/opentelemetry": minor
---

Support OpenTelemetry JS SDK 3.x in `@effect/opentelemetry`. SDK 2.x is no longer supported; stay on `@effect/opentelemetry` 4.1.x if you need it.

- Peer dependency changes:
  - `@opentelemetry/api` now needs `>=1.10.0`.
  - `@opentelemetry/resources`, `@opentelemetry/sdk-logs` and `@opentelemetry/sdk-metrics` now need `>=3.0.0 <4.0.0`.
  - `@opentelemetry/sdk-trace` 3.x replaces `@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-trace-node` and `@opentelemetry/sdk-trace-web`.
  - `@opentelemetry/api-logs` is no longer a peer.
- `NodeSdk` and `WebSdk` `tracerConfig` now takes `TracerProviderOptions` from `@opentelemetry/sdk-trace`. `loggerProviderConfig` and `OtelLogger.layerLoggerProvider` now take `LoggerProviderOptions` from `@opentelemetry/sdk-logs`.
- Import span processors, exporters and samplers from `@opentelemetry/sdk-trace`, and import `SeverityNumber` from `@opentelemetry/api`. Pass the exporter in an options object: `new BatchSpanProcessor({ exporter })`. `BatchSpanProcessor` no longer reads `OTEL_BSP_*`, so pass those settings as options.
- `NodeSdk` no longer reads `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_SAMPLER_ARG` or the `OTEL_SPAN_*` / `OTEL_ATTRIBUTE_*` span limits, because SDK 3.x removed environment-based tracer configuration. Configure them in code instead:

  ```ts
  NodeSdk.layer(() => ({
    spanProcessor: new BatchSpanProcessor({ exporter }),
    tracerConfig: {
      sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(0.1) }),
      spanLimits: { attributeCountLimit: 64 }
    }
  }))
  ```

- Metric descriptors from `OtelMetrics` no longer include the `type` and `advice` fields, because they were removed from the SDK 3.x descriptor.
