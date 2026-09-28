---
"effect": patch
---

Honor `Tool.Strict` in MCP input schemas and argument validation. Strict dynamic tools require Effect schemas; raw JSON Schema is rejected at registration.

Support identified input schemas for non-strict tools. Invalid arguments use `InvalidParams` on protocols before 2025-11-25 and `isError: true` results on newer protocols.

Distinguish validation failures from declared handler failures. Declared failures return `isError: true` without `structuredContent`: error mode uses `Error.message` or schema-encoded text, and return mode uses the encoded payload. Declared failures do not produce internal-error diagnostics.

Log and report internal failures, including defects and encoding errors, while keeping client messages generic.

Allow `Toolkit.handle` to accept `SchemaAST.ParseOptions` for parameter decoding. Expose the `Toolkit.FailureOrigin` cause annotation and shared `Tool.FailureOrigin` type, with the same origin available in `Tool.HandlerResult.failureOrigin` on returned failures.
