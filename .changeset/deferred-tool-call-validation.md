---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
---

Add `toolCallValidation: "deferred"` to `LanguageModel.generateText`, `streamText`, and `generateObject` for callers that resolve tool calls themselves. With `disableToolCallResolution: true`, every tool call is returned with `unknown` parameters, including calls with invalid parameters, calls to tools missing from the toolkit, and calls made without a toolkit, so the caller can validate them and report errors back to the model. The Anthropic, OpenAI, and OpenAI-compatible providers pass calls to undeclared tools through instead of failing with `ToolNotFoundError`. The default stays `"strict"`.
