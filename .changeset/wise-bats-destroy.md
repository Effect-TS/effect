---
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai": patch
---

Introduce `AiModel` and `AiPlan` for describing retry / fallback logic between 
models and providers

For example, the following program builds an `AiPlan` which will attempt to use
OpenAi's chat completions API, and if after three attempts the operation
is still failing, the plan will fallback to utilizing Anthropic's messages API
to resolve the request.

```ts
import { AiPlan, Completions } from "@effect/ai"
import { AnthropicClient, AnthropicCompletions } from "@effect/ai-anthropic"
import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai"
import { NodeHttpClient, NodeRuntime } from "@effect/platform-node" 
import { Config, Console, Effect, Layer } from "effect"

// Create Anthropic client
const Anthropic = AnthropicClient.layerConfig({
  apiKey: Config.redacted("ANTHROPIC_API_KEY")
}).pipe(Layer.provide(NodeHttpClient.layerUndici))

// Create OpenAi client
const OpenAi = OpenAiClient.layerConfig({
  apiKey: Config.redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(NodeHttpClient.layerUndici))

// Create a plan of request execution
const Plan = AiPlan.fromModel(OpenAiCompletions.model("gpt-4o-mini"), {
  attempts: 3
}).pipe(AiPlan.withFallback({
  model: AnthropicCompletions.model("claude-3-5-haiku-latest")
}))

const program = Effect.gen(function*() {
  // Build the plan of execution
  const plan = yield* Plan

  // Create a program which uses the services provided by the plan
  const getDadJoke = Effect.gen(function*() {
    const completions = yield* Completions.Completions
    const response = yield* completions.create("Tell me a dad joke")
    yield* Console.log(response.text)
  })

  // Provide the plan to whichever programs need it
  yield* plan.provide(getDadJoke)
})

program.pipe(
  Effect.provide([Anthropic, OpenAi]),
  NodeRuntime.runMain
)
```
