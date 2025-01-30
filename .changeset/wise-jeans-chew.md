---
"@effect/ai-openai": patch
"@effect/ai": patch
---

Support creation of embeddings from the AI integration packages.

For example, the following program will create an OpenAI `Embeddings` service
that will aggregate all embedding requests received within a `500` millisecond
window into a single batch.

```ts
import { Embeddings } from "@effect/ai"
import { OpenAiClient, OpenAiEmbeddings } from "@effect/ai-openai"
import { NodeHttpClient } from "@effect/platform-node"
import { Config, Effect, Layer } from "effect"

// Create the OpenAI client
const OpenAi = OpenAiClient.layerConfig({
  apiKey: Config.redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(NodeHttpClient.layerUndici))

// Create an embeddings service for the `text-embedding-3-large` model
const TextEmbeddingsLarge = OpenAiEmbeddings.layerDataLoader({
  model: "text-embedding-3-large",
  window: "500 millis",
  maxBatchSize: 2048
}).pipe(Layer.provide(OpenAi))

// Use the generic `Embeddings` service interface in your program
const program = Effect.gen(function*() {
  const embeddings = yield* Embeddings.Embeddings
  const result = yield* embeddings.embed("The input to embed")
})

// Provide the specific implementation to use
program.pipe(
  Effect.provide(TextEmbeddingsLarge),
  Effect.runPromise
)
```
