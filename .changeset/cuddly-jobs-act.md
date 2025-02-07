---
"@effect/ai-openai": patch
---

Support per-request HTTP client transformations in the OpenAi AI integration package.

For example:

```ts
import { Completions } from "@effect/ai"
import { OpenAiClient, OpenAiCompletions, OpenAiConfig } from "@effect/ai-openai"
import { HttpClient, HttpClientRequest } from "@effect/platform"
import { NodeHttpClient } from "@effect/platform-node"
import { Config, Effect, Layer } from "effect"

const OpenAi = OpenAiClient.layerConfig({
  apiKey: Config.redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(NodeHttpClient.layerUndici))

const Gpt4oCompletions = OpenAiCompletions.layer({
  model: "gpt-4o"
}).pipe(Layer.provide(OpenAi))

const program = Effect.gen(function*() {
  const completions = yield* Completions.Completions

  yield* completions.create("Tell me a dad joke").pipe(
    // Per-request HTTP client transforms which are only applied if
    // the OpenAi provider is in use
    OpenAiConfig.withClientTransform(
      HttpClient.mapRequest(
        HttpClientRequest.setHeader("x-dad-jokes", "are-awesome")
      )
    )
  )
})

program.pipe(Effect.provide(Gpt4oCompletions), Effect.runPromise)
```
