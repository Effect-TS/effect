---
"@effect/ai-openai": patch
---

Previously, setting `strict: false` on `OpenAiLanguageModel` config caused a 400 "Unknown parameter: 'strict'" response from the OpenAI Responses API, because the flag was spread into the top-level request body instead of being consumed only by the tool and response_format schema builders. The `strict` flag is now stripped from the request body while still controlling `strict` on tool schemas (`prepareTools`) and json_schema response formats (`prepareResponseFormat`).
