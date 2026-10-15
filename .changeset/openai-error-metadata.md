---
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
---

Consistently nest authentication, internal provider, and unknown error metadata under the `openai` or `openai-compat` provider key, including error codes, error types, and request IDs.
