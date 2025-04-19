---
"@effect/ai": minor
---

This release includes a complete refactor of the internals of the base `@effect/ai` library, with a focus on flexibility for the end user and incorporation of more information from model providers.

## Notable Changes

- `Completions` has been renamed to `AiLanguageModel`

- `Embeddings` has been renamed to `AiEmbeddingModel`

- `Completions.create` and `Completions.toolkit` have been merged into `AiLanguageModel.generateText`

- `Completions.stream` and `Completions.toolkitStream` have been merged into `AiLanguageModel.streamText`

- `Completions.structured` has been renamed to `AiLanguageModel.generateObject` 

- To avoid unnecessarily having to unwrap an `Option`, `AiLanguageModel.generateObject` now returns an `AiInput.WithStructuredOutput` which contains a `value` property with the generated value

- `AiToolkit` has been completely refactored to simplify creating a collection of tools
  - `AiTool` has been introduced to simplify defining tools for a toolkit
  - `AiToolkit.implement` has been renamed to `AiToolkit.toLayer` 

A complete example of an `AiToolkit` implementation and usage can be found below:

```ts
import { AiLanguageModel, AiTool, AiToolkit } from "@effect/ai"
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { NodeHttpClient, NodeRuntime } from "@effect/platform-node"
import { Array, Config, Console, Effect, Layer, Schema } from "effect"

// =============================================================================
// Domain Models 
// =============================================================================

const DadJoke = Schema.Struct({
  id: Schema.String,
  joke: Schema.String
})

const SearchResponse = Schema.Struct({
  current_page: Schema.Int,
  limit: Schema.Int,
  next_page: Schema.Int,
  previous_page: Schema.Int,
  search_term: Schema.String,
  results: Schema.Array(DadJoke),
  status: Schema.Int,
  total_jokes: Schema.Int,
  total_pages: Schema.Int
})

// =============================================================================
// Service Definitions 
// =============================================================================

export class ICanHazDadJoke extends Effect.Service<ICanHazDadJoke>()("ICanHazDadJoke", {
  dependencies: [FetchHttpClient.layer],
  effect: Effect.gen(function*() {
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl("https://icanhazdadjoke.com"))
    )
    const httpClientOk = HttpClient.filterStatusOk(httpClient)

    const search = Effect.fn("ICanHazDadJoke.search")(
      function(term: string) {
        return httpClientOk.get("/search", {
          acceptJson: true,
          urlParams: { term }
        }).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(SearchResponse)),
          Effect.orDie
        )
      }
    )

    return {
      search
    } as const
  })
}) {}

// =============================================================================
// Toolkit Definition
// =============================================================================

export class DadJokeTools extends AiToolkit.make(
  AiTool.make("GetDadJoke", {
    description: "Fetch a dad joke based on a search term from the ICanHazDadJoke API",
    success: DadJoke,
    parameters: Schema.Struct({
      searchTerm: Schema.String
    })
  })
) {}

// =============================================================================
// Toolkit Handlers
// =============================================================================

export const DadJokeToolHandlers = DadJokeTools.toLayer(
  Effect.gen(function*() {
    const icanhazdadjoke = yield* ICanHazDadJoke
    return {
      GetDadJoke: (params) =>
        icanhazdadjoke.search(params.searchTerm).pipe(
          Effect.flatMap((response) => Array.head(response.results)),
          Effect.orDie
        )
    }
  })
).pipe(Layer.provide(ICanHazDadJoke.Default))

// =============================================================================
// Toolkit Usage
// =============================================================================

const makeDadJoke = Effect.gen(function*() {
  const languageModel = yield* AiLanguageModel.AiLanguageModel
  const toolkit = yield* DadJokeTools

  const response = yield* languageModel.generateText({
    prompt: "Come up with a dad joke about pirates",
    toolkit
  })

  return yield* languageModel.generateText({
    prompt: response
  })
})

const program = Effect.gen(function*() {
  const model = yield* OpenAiLanguageModel.model("gpt-4o")
  const result = yield* model.provide(makeDadJoke)
  yield* Console.log(result.text)
})

const OpenAi = OpenAiClient.layerConfig({
  apiKey: Config.redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(NodeHttpClient.layerUndici))

program.pipe(
  Effect.provide([OpenAi, DadJokeToolHandlers]),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
```

