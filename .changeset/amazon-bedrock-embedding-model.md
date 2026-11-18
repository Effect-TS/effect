---
"@effect/ai-amazon-bedrock": minor
---

Add `AmazonBedrockEmbeddingModel` for Amazon Titan Text Embeddings V2 and Cohere Embed v3 and v4, and `invokeModel` on `AmazonBedrockClient`.

Custom `AmazonBedrockClient.Service` implementations and mocks must now provide `invokeModel`.
