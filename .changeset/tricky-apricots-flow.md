---
"effect": minor
---

add LayerMap module

A `LayerMap` allows you to create a map of Layer's that can be used to
dynamically access resources based on a key.

Here is an example of how you can use a `LayerMap` to create a service that
provides access to multiple OpenAI completions services.

```ts
import { Completions } from "@effect/ai"
import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai"
import { FetchHttpClient } from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Config, Effect, Layer, LayerMap } from "effect"

// create the openai client layer
const OpenAiLayer = OpenAiClient.layerConfig({
  apiKey: Config.redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(FetchHttpClient.layer))

// create a service that wraps a LayerMap
class AiClients extends LayerMap.Service<AiClients>()("AiClients", {
  // this LayerMap will provide the ai Completions service
  provides: Completions.Completions,

  // define the lookup function for the layer map
  //
  // The returned Layer will be used to provide the Completions service for the
  // given model.
  lookup: (model: OpenAiCompletions.Model) =>
    OpenAiCompletions.layer({ model }),

  // If a layer is not used for a certain amount of time, it can be removed
  idleTimeToLive: "5 seconds",

  // Supply the dependencies for the layers in the LayerMap
  dependencies: [OpenAiLayer]
}) {}

// usage
Effect.gen(function* () {
  // access and use the generic Completions service
  const ai = yield* Completions.Completions
  const response = yield* ai.create("Hello, world!")
  console.log(response.text)
}).pipe(
  // use the AiClients service to provide a variant of the Completions service
  AiClients.provide("gpt-4o"),
  // provide the LayerMap service
  Effect.provide(AiClients.Default),
  NodeRuntime.runMain
)
```
