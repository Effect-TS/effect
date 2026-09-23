---
"@effect/ai-openrouter": patch
---

Accept rounded probabilities in OpenRouter choice and score decisions when the total is within 0.01 of 1, plus floating-point tolerance. Larger discrepancies still fail validation regardless of the number of outcomes.
