---
"@effect/ai-anthropic": minor
---

Fix `messageBatchesResults` and `betaMessageBatchesResults` failing on successful JSON Lines responses. They now return the raw bytes, new `*Stream` variants stream them, and each line decodes with `MessageBatchIndividualResponse` or `BetaMessageBatchIndividualResponse`.
