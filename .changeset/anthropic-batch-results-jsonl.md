---
"@effect/ai-anthropic": minor
---

Fix `Generated` `messageBatchesResults` failing on its successful JSON Lines response: it now returns the body as bytes, `messageBatchesResultsStream` streams it, and `MessageBatchIndividualResponse` decodes each line (and the same for the `beta*` variants).
