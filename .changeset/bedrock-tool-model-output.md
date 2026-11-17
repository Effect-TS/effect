---
"@effect/ai-amazon-bedrock": patch
---

Fix `AmazonBedrockLanguageModel` sending the original tool result instead of the content returned by a tool's `toModelOutput`.
