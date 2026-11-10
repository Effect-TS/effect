---
"@effect/ai-openai-compat": patch
---

Fix failed responses and dropped stream chunks when OpenAI-compatible servers send `null` for optional chat completion and embeddings response fields. The affected `OpenAiClient` response types now include `null`.
