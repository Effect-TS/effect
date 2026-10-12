---
"@effect/ai-openai": patch
---

Regenerate the OpenAI client from a pinned canonical specification. Fix composed schemas that collapsed to `Schema.Never` and preserve keys in maps and free-form objects.

Public type changes in `Generated`:

- Remove Realtime WebSocket event exports no longer referenced by HTTP operations. Rename multipart request bodies to `*Multipart` or `*FormData`.
- Require fields specified upstream, including `CreateImageRequest.model`, `AdminApiKey.expires_at`, `ProjectApiKey.owner_project_access`, `AssignedRoleDetails.assignment_sources` and `VoiceResource.type`.
- Type maps and free-form objects as records instead of `{}`. `Metadata` is now `{ readonly [x: string]: string } | null`.
- Make `FineTuningJob` a union of `dpo`, `reinforcement` and `hyperparameters` variants. Use `WebSearchCallStatus` for `WebSearchToolCall.status`.
