---
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"effect": patch
---

Return unknown tools, invalid tool parameters, and malformed provider tool-call
JSON as model-visible tool call errors instead of failing the language model
operation. Tool call errors retain the original call and become failed tool
results in chat history, allowing a model to correct and retry its request.

Centralize provider parameter decoding in `LanguageModel`, add
`Response.ToolCallErrorPart`, expose errors through
`GenerateTextResponse.toolCallErrors`, and execute validated parameters through
a composable Toolkit boundary. `HandlerResult` is discriminated by `isFailure`,
so successful and failed results remain narrow after toolkit composition.
Parameter validation errors also accept arbitrary runtime values while retaining
a JSON-encoded representation, so reporting non-JSON invalid parameters cannot
become a defect.
