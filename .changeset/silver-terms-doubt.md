---
"@effect/ai-anthropic": minor
"@effect/ai-openai": minor
"@effect/ai": minor
---

Make `AiModel` a plain `Layer` and remove `AiPlan` in favor of `ExecutionPlan`

This release substantially simplifies and improves the ergonomics of using `AiModel` for various providers. With these changes, an `AiModel` now returns a plain `Layer` which can be used to provide services to a program that interacts with large language models.

**Before**

```ts
import { AiLanguageModel } from "@effect/ai"
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"
import { NodeHttpClient } from "@effect/platform-node"
import { Config, Console, Effect, Layer } from "effect"

// Produces an `AiModel<AiLanguageModel, OpenAiClient>`
const Gpt4o = OpenAiLanguageModel.model("gpt-4o")

// Generate a dad joke
const getDadJoke = AiLanguageModel.generateText({
  prompt: "Tell me a dad joke"
})

const program = Effect.gen(function*() {
  // Build the `AiModel` into a `Provider`
  const gpt4o = yield* Gpt4o
  // Use the built `AiModel` to run the program
  const response = yield* gpt4o.use(getDadJoke)
  // Log the response
  yield* Console.log(response.text)
})

const OpenAi = OpenAiClient.layerConfig({
  apiKey: Config.redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(NodeHttpClient.layerUndici))

program.pipe(
  Effect.provide(OpenAi),
  Effect.runPromise
)
```

**After**

```ts
import { AiLanguageModel } from "@effect/ai"
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"
import { NodeHttpClient } from "@effect/platform-node"
import { Config, Console, Effect, Layer } from "effect"

// Produces a `Layer<AiLanguageModel, never, OpenAiClient>`
const Gpt4o = OpenAiLanguageModel.model("gpt-4o")

const program = Effect.gen(function*() {
  // Generate a dad joke
  const response = yield* AiLanguageModel.generateText({
    prompt: "Tell me a dad joke"
  })
  // Log the response
  yield* Console.log(response.text)
).pipe(Effect.provide(Gpt4o))

const OpenAi = OpenAiClient.layerConfig({
  apiKey: Config.redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(NodeHttpClient.layerUndici))

program.pipe(
  Effect.provide(OpenAi),
  Effect.runPromise
)
```

In addition, `AiModel` can be `yield*`'ed to produce a layer with no requirements. 

This shifts the requirements of building the layer into the calling effect, which is particularly useful for creating AI-powered services.

```ts
import { AiLanguageModel } from "@effect/ai"
import { OpenAiLanguageModel } from "@effect/ai-openai"
import { Effect } from "effect"

class DadJokes extends Effect.Service<DadJokes>()("DadJokes", {
  effect: Effect.gen(function*() {
    // Yielding the model will return a layer with no requirements
    // 
    //      ┌─── Layer<AiLanguageModel>
    //      ▼
    const model = yield* OpenAiLanguageModel.model("gpt-4o")

    const getDadJoke = AiLanguageModel.generateText({
      prompt: "Generate a dad joke"
    }).pipe(Effect.provide(model))

    return { getDadJoke } as const
  })
}) {}

// The requirements are lifted into the service constructor
// 
//          ┌─── Layer<DadJokes, never, OpenAiClient>
//          ▼
DadJokes.Default 
```
