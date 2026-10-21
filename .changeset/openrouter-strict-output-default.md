---
"@effect/ai-openrouter": patch
---

Default schema-backed OpenRouter response formats to strict validation for models using the OpenAI schema transformer (`openai/`, `gpt-`, `o1-`, `o3-`, and `o4-` prefixes). Other models retain `strict: null`, and tool strictness is unchanged. Endpoint support still varies; callers using incompatible endpoints can set `strictJsonSchema: false` to opt out, and explicit overrides remain respected.
