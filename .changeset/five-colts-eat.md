---
"@effect/ai": minor
---

This release includes a complete refactor of the internals of the base `@effect/ai` library, with a focus on flexibility for the end user and incorporation of more information from model providers.

## Notable Changes

### `AiLanguageModel` and `AiEmbeddingModel`

The `Completions` service from `@effect/ai` has been renamed to `AiLanguageModel`, and the `Embeddings` service has similarly been renamed to `AiEmbeddingModel`. In addition, `Completions.create` and `Completions.toolkit` have been unified into `AiLanguageModel.generateText`. Similarly, `Completions.stream` and `Completions.toolkitStream` have been unified into `AiLanguageModel.streamText`.

### Structured Outputs

`Completions.structured` has been renamed to `AiLanguageModel.generateObject`, and this method now returns a specialized `AiResponse.WithStructuredOutput` type, which contains a `value` property with the result of the structured output call. This enhancement prevents the end user from having to unnecessarily unwrap an `Option`.

### `AiModel` and `AiPlan`

The `.provide` method on a built `AiModel` / `AiPlan` has been renamed to `.use` to improve clarity given that a user is _using_ the services provided by the model / plan to run a particular piece of code.

In addition, the `AiPlan.fromModel` constructor has been simplified into `AiPlan.make`, which allows you to create an initial `AiPlan` with multiple steps incorporated.

For example:

```ts
import { AiPlan } from "@effect/ai"
import { OpenAiLanguageModel } from "@effect/ai-openai"
import { AnthropicLanguageModel } from "@effect/ai-anthropic"
import { Effect } from "effect"

const main = Effect.gen(function*() {
  const plan = yield* AiPlan.make({
    model: OpenAiLanguageModel.model("gpt-4"),
    attempts: 1
  }, {
    model: AnthropicLanguageModel.model("claude-3-7-sonnet-latest"),
    attempts: 1
  }, {
    model: AnthropicLanguageModel.model("claude-3-5-sonnet-latest"),
    attempts: 1
  })

  yield* plan.use(program)
})
```

### `AiInput` and `AiResponse`

The `AiInput` and `AiResponse` types have been refactored to allow inclusion of more information and metadata from model providers where possible, such as reasoning output and prompt cache token utilization.

### `AiTool` and `AiToolkit`

The `AiToolkit` has been completely refactored to simplify creating a collection of tools and using those tools in requests to model providers. A new `AiTool` data type has also been introduced to simplify defining tools for a toolkit. `AiToolkit.implement` has been renamed to `AiToolkit.toLayer` for clarity, and defining handlers is now very similar to the way handlers are defined in the `@effect/rpc` library.

In addition, you can now control how many sequential steps are performed by `AiLanguageModel.generateText` and `AiLanguageModel.streamText` via the `maxSteps` option. For example, if `maxSteps` is set to `> 1` and any tools are invoked by the language model, these methods will take care of resolving the tool call and returning the results to the language model for subsequent generation (up to the maximum number of steps specified).

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
    toolkit,
    // Allow a maximum of two sequential interactions with the language model
    // before returning the response
    maxSteps: 2
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

