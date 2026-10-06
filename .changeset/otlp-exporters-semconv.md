---
"effect": patch
---

Improve OpenTelemetry convention alignment for built-in OTLP logs, traces, and resources. Logs use event timestamps and unique attribute keys, with generated attributes overriding annotations. Replace `log.error` with `exception.type`, `exception.message`, and `exception.stacktrace`; rename `fiberId` to `effect.fiberId` and `logSpan.<label>` to `effect.log_span.<label>` (integer milliseconds instead of strings).

Trace and log scopes use `effect` instead of the service name. Replace the placeholder User-Agent with `OTel-OTLP-Exporter-JavaScript-Effect-<label>`, preserving any user-supplied prefix. Resources default `telemetry.sdk.name` and `telemetry.sdk.language` with user overrides, and missing service names fall back to `unknown_service:<process.executable.name>` when available, or `unknown_service` otherwise.
