---
"@effect/ai-typesafe": patch
---

Support images and Box questions in `TypeSafeDecisionModel`. Images are sent as base64 assets with the `TypeSafe-Danger-Zone-Images: true` header, and the state becomes `{ input, images }`. `Decision.locate` maps to Box questions, which need `jev-preview` or `jev-1.14.0`. Remote URLs and formats other than PNG and JPEG fail with `AiError.InvalidUserInputError`.
