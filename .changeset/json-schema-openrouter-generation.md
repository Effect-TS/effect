---
"effect": patch
"@effect/openapi-generator": patch
"@effect/ai-openrouter": patch
---

Add experimental `closeObjects`, fix JSON Schema composition and examples, and regenerate the OpenRouter client with a boolean workspace-deletion confirmation flag.

### Breaking changes

The generated OpenRouter schemas follow the current upstream specification. Some intermediate schema exports are removed; derive their types from the corresponding request or response schema instead. Hand-built generation statistics must now include `workspace_id`, and activity entries must include `cached_tokens`. Tool parameter and structured-output schemas accept JSON-valued records.

Fixtures and stored responses must also include these newly required fields:

- `Model`: `endpoints`.
- `BYOKKey`: `declared_region`, `declared_zdr`, `is_byok_only`, and `is_required`.
- `PublicEndpoint`: `native_tools`, `service_tier`, `supports_diarization`, and `supports_tool_choice`.
