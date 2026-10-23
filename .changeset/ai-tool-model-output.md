---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
---

Let AI tools send images and files to the model in their results. A tool defined with the new `toModelOutput` option maps its successful result to `Prompt.TextPart` and `Prompt.FilePart` content. That content is stored in a new optional `modelOutput` field on tool result parts, and the typed result the application receives is unchanged. Anthropic sends it as `text`, `image` and `document` blocks in `tool_result.content`, and OpenAI Responses sends it as `input_text`, `input_image` and `input_file` items in `function_call_output.output`. Providers without rich tool results, such as OpenAI-compatible Chat Completions, keep sending the serialized result.

OpenAI Responses now also sends PDF file parts whose data is a base64 string, a data URL or an HTTP(S) URL string. Previously these parts were dropped.
