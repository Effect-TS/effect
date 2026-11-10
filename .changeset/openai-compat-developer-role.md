---
"@effect/ai-openai-compat": patch
---

Send the `developer` system role in `OpenAiLanguageModel` only for OpenAI reasoning model ids (`o1`, `o3`, `o4-mini`, …), `gpt-5`, `codex-` and `computer-use`, instead of for every model id starting with `o`. Models such as `olmo-2` or `openai/gpt-oss-120b` now get the `system` role, which OpenAI-compatible servers like vLLM expect.
