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

`AmazonBedrockClient.layer` accepts explicit keys (`accessKeyId`, `secretAccessKey`, `sessionToken`), an `apiKey`, or a `credentials` effect that resolves AWS credentials on every request, which is where a credential provider such as `fromNodeProviderChain()` from `@aws-sdk/credential-providers` plugs in. `region`, `apiUrl` and `transformClient` customize HTTP access.
