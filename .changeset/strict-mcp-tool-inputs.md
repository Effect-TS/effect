---
"effect": patch
---

Honor `Tool.Strict` in MCP input schemas and argument validation. Strict dynamic tools require Effect schemas; raw JSON Schema is rejected at registration.

Support identified input schemas for non-strict tools. Report parameter-validation failures as `InvalidParams` in either failure mode, and return declared failures as tool errors without `structuredContent`.

Allow `Toolkit.handle` to accept `SchemaAST.ParseOptions` for parameter decoding.
