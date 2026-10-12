---
"@effect/ai-openai": patch
---

Regenerate the OpenAI client from the canonical OpenAI specification (`openai/openai-openapi`, pinned to a commit). Composed request and response schemas such as `CreateChatCompletionRequest`, `Response` and web search actions decode their documented shapes again instead of collapsing to `Schema.Never`. Free-form objects and maps such as `Metadata` and `FunctionParameters` keep their keys instead of decoding to an empty struct.

The regenerated `Generated` module changes some public types:

- Removed exports: the Realtime WebSocket event schemas, which no HTTP operation references in the canonical spec, and multipart request bodies, which are now exported as `*Multipart` and `*FormData` (for example `CreateFileRequestMultipart`).
- Newly required fields that follow the spec, including `CreateImageRequest.model`, `AdminApiKey.expires_at`, `ProjectApiKey.owner_project_access`, `AssignedRoleDetails.assignment_sources` and `VoiceResource.type`.
- Maps and free-form objects are typed records instead of `{}`. For example, `Metadata` is `{ readonly [x: string]: string } | null`.
- `FineTuningJob` is a union: jobs using the `dpo` or `reinforcement` method, and jobs that report `hyperparameters`. `WebSearchToolCall.status` refers to `WebSearchCallStatus`.
