# @effect/ai-amazon-bedrock

Amazon Bedrock provider for Effect's `LanguageModel`, built on the Bedrock Runtime Converse and ConverseStream APIs. Requests are signed with AWS Signature Version 4 or sent with a Bedrock API key, and the provider has no runtime dependencies beyond `effect`.

## Installation

```sh
npm install effect @effect/ai-amazon-bedrock
```

## Usage

Set `AWS_REGION` with either `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (plus `AWS_SESSION_TOKEN` for temporary keys) or `AWS_BEARER_TOKEN_BEDROCK`, then provide a Bedrock language model:

```ts
import { AmazonBedrockClient, AmazonBedrockLanguageModel } from "@effect/ai-amazon-bedrock"
import { Effect, Layer } from "effect"
import { LanguageModel } from "effect/ai"
import { FetchHttpClient } from "effect/http"

const Sonnet = AmazonBedrockLanguageModel.layer({
  model: "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
}).pipe(
  Layer.provide(AmazonBedrockClient.layerConfig()),
  Layer.provide(FetchHttpClient.layer)
)

const program = LanguageModel.generateText({
  prompt: "Describe Amazon Bedrock in one sentence."
}).pipe(Effect.provide(Sonnet))
```

## Authentication

`AmazonBedrockClient.layer` accepts explicit keys (`accessKeyId`, `secretAccessKey`, `sessionToken`), an `apiKey`, or a `credentials` effect that resolves AWS credentials before every request. The `credentials` effect is where a credential provider such as `fromNodeProviderChain()` from `@aws-sdk/credential-providers` plugs in:

```ts
import { fromNodeProviderChain } from "@aws-sdk/credential-providers"
import { AmazonBedrockClient } from "@effect/ai-amazon-bedrock"
import { Duration, Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/http"

const provider = fromNodeProviderChain()

const BedrockClient = AmazonBedrockClient.layer({
  region: "eu-west-1",
  credentials: Effect.promise(() => provider()).pipe(Effect.cachedWithTTL(Duration.minutes(5)))
}).pipe(Layer.provide(FetchHttpClient.layer))
```

`region`, `apiUrl` and `transformClient` customize HTTP access.

## Features

- Text generation and streaming, tool calls with every `toolChoice` mode, and tool results.
- Structured output through a forced tool by default, or through Converse's native `outputConfig.textFormat` with `structuredOutputs: true` in the model config.
- Reasoning blocks, which round-trip into later turns with their signature through the `"amazon-bedrock"` provider options.
- Prompt caching, opted into per message or part with `options: { "amazon-bedrock": { cachePoint: { type: "default" } } }`.
- Image and document file parts, sent as bytes.
- Model-specific parameters, such as extended thinking, through `additionalModelRequestFields` in the model config.

The client maps Bedrock's `x-amzn-errortype` exceptions and HTTP statuses to `AiError`, validates the CRC of every event stream frame, and fails a stream on an exception frame such as `throttlingException`.
