---
"@effect/ai-openai": patch
---

Regenerate the OpenAI client from the canonical OpenAI specification (`openai/openai-openapi`, pinned to a commit). Composed request and response schemas such as `CreateChatCompletionRequest`, `Response` and web search actions decode their documented shapes again instead of collapsing to `Schema.Never`. Free-form objects and maps such as `Metadata` and `FunctionParameters` keep their keys instead of decoding to an empty struct.
