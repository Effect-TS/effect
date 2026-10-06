---
"effect": patch
---

Align the OTLP exporters with the OpenTelemetry spec. Log attributes change from `log.error` to `exception.type`/`exception.message`/`exception.stacktrace` (the stacktrace holds the full pretty cause), from `fiberId` to `effect.fiberId`, and from `logSpan.<label>` ("Nms" string) to `effect.log_span.<label>` (integer milliseconds); OTLP `timeUnixNano` is now the event time.

The OTLP instrumentation scope name changes from the service name to `"effect"` for traces and logs, the User-Agent changes from `effect-opentelemetry-<label>/0.0.0` to `OTel-OTLP-Exporter-JavaScript-Effect-<label>` with any user-supplied User-Agent prepended, resources gain `telemetry.sdk.name` and `telemetry.sdk.language`, and a missing service name falls back to `unknown_service` instead of failing.
