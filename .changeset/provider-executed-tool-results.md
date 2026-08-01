---
"effect": patch
---

Route provider-executed tool results into the assistant message in `Prompt.fromResponseParts`.

Previously a provider-executed tool result (e.g. OpenAI `web_search`) was placed in a `tool` message like a framework-executed result, so round-tripping the conversation sent it back to OpenAI as a `function_call_output` whose corresponding `web_search_call` had been dropped, failing the request with HTTP 400 `No tool call found for function call output with call_id ws_...`. `Prompt.ToolResultPart` now carries `providerExecuted` (decoding default `false`), and `fromResponseParts` keeps provider-executed results in the assistant message, where the provider packages already expect them. Ports #5944 to the v4 line.
