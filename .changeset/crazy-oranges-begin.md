---
"@effect/ai-google": patch
---

- `thinkingLevel` field on `ThinkingConfig` with values: `THINKING_LEVEL_UNSPECIFIED`, `MINIMAL`, `LOW`, `MEDIUM`, `HIGH`
- New `CandidateFinishReason` enum values: `IMAGE_PROHIBITED_CONTENT`, `IMAGE_OTHER`, `NO_IMAGE`, `IMAGE_RECITATION`, `MISSING_THOUGHT_SIGNATURE`
- Updated `finishReasonMap` in utilities to handle the new finish reason values
