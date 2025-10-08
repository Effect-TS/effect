# @effect/ai-amazon-bedrock

## 0.11.0

### Minor Changes

- [#5621](https://github.com/Effect-TS/effect/pull/5621) [`4c3bdfb`](https://github.com/Effect-TS/effect/commit/4c3bdfbcbc2dcd7ecd6321df3e4a504af19de825) Thanks @IMax153! - Remove `Either` / `EitherEncoded` from tool call results.

  Specifically, the encoding of tool call results as an `Either` / `EitherEncoded` has been removed and is replaced by encoding the tool call success / failure directly into the `result` property.

  To allow type-safe discrimination between a tool call result which was a success vs. one that was a failure, an `isFailure` property has also been added to the `"tool-result"` part. If `isFailure` is `true`, then the tool call handler result was an error.

  ```ts
  import * as AnthropicClient from "@effect/ai-anthropic/AnthropicClient"
  import * as AnthropicLanguageModel from "@effect/ai-anthropic/AnthropicLanguageModel"
  import * as LanguageModel from "@effect/ai/LanguageModel"
  import * as Tool from "@effect/ai/Tool"
  import * as Toolkit from "@effect/ai/Toolkit"
  import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient"
  import { Config, Effect, Layer, Schema, Stream } from "effect"

  const Claude = AnthropicLanguageModel.model("claude-4-sonnet-20250514")

  const MyTool = Tool.make("MyTool", {
    description: "An example of a tool with success and failure types",
    failureMode: "return", // Return errors in the response
    parameters: { bar: Schema.Number },
    success: Schema.Number,
    failure: Schema.Struct({ reason: Schema.Literal("reason-1", "reason-2") })
  })

  const MyToolkit = Toolkit.make(MyTool)

  const MyToolkitLayer = MyToolkit.toLayer({
    MyTool: () => Effect.succeed(42)
  })

  const program = LanguageModel.streamText({
    prompt: "Tell me about the meaning of life",
    toolkit: MyToolkit
  }).pipe(
    Stream.runForEach((part) => {
      if (part.type === "tool-result" && part.name === "MyTool") {
        // The `isFailure` property can be used to discriminate whether the result
        // of a tool call is a success or a failure
        if (part.isFailure) {
          part.result
          //   ^? { readonly reason: "reason-1" | "reason-2"; }
        } else {
          part.result
          //   ^? number
        }
      }
      return Effect.void
    }),
    Effect.provide(Claude)
  )

  const Anthropic = AnthropicClient.layerConfig({
    apiKey: Config.redacted("ANTHROPIC_API_KEY")
  }).pipe(Layer.provide(NodeHttpClient.layerUndici))

  program.pipe(Effect.provide([Anthropic, MyToolkitLayer]), Effect.runPromise)
  ```

### Patch Changes

- Updated dependencies [[`4c3bdfb`](https://github.com/Effect-TS/effect/commit/4c3bdfbcbc2dcd7ecd6321df3e4a504af19de825)]:
  - @effect/ai-anthropic@0.21.0
  - @effect/ai@0.31.0

## 0.10.0

### Minor Changes

- [#5614](https://github.com/Effect-TS/effect/pull/5614) [`c63e658`](https://github.com/Effect-TS/effect/commit/c63e6582244fbb50d31650c4b4ea0660fe194652) Thanks @IMax153! - Previously, tool call handler errors were _always_ raised as an expected error in the Effect `E` channel at the point of execution of the tool call handler (i.e. when a `generate*` method is invoked on a `LanguageModel`).

  With this PR, the end user now has control over whether tool call handler errors should be raised as an Effect error, or returned by the SDK to allow, for example, sending that error information to another application.

  ### Tool Call Specification

  The `Tool.make` and `Tool.providerDefined` constructors now take an extra optional parameter called `failureMode`, which can be set to either `"error"` or `"return"`.

  ```ts
  import { Tool } from "@effect/ai"
  import { Schema } from "effect"

  const MyTool = Tool.make("MyTool", {
    description: "My special tool",
    failureMode: "return" // "error" (default) or "return"
    parameters: {
      myParam: Schema.String
    },
    success: Schema.Struct({
      mySuccess: Schema.String
    }),
    failure: Schema.Struct({
      myFailure: Schema.String
    })
  })

  ```

  The semantics of `failureMode` are as follows:
  - If set to `"error"` (the default), errors that occur during tool call handler execution will be returned in the error channel of the calling effect
  - If set to `"return"`, errors that occur during tool call handler execution will be captured and returned as part of the tool call result

  ### Response - Tool Result Parts

  The `result` field of a `"tool-result"` part of a large language model provider response is now represented as an `Either`.
  - If the `result` is a `Left`, the `result` will be the `failure` specified in the tool call specification
  - If the `result` is a `Right`, the `result` will be the `success` specified in the tool call specification

  This is only relevant if the end user sets `failureMode` to `"return"`. If set to `"error"` (the default), then the `result` property will always be a `Right` with the successful result of the tool call handler.

  Similarly the `encodedResult` field of a `"tool-result"` part will be represented as an `EitherEncoded`, where:
  - `{ _tag: "Left", left: <failure> }` represents a tool call handler failure
  - `{ _tag: "Right", right: <success> }` represents a tool call handler success

  ### Prompt - Tool Result Parts

  The `result` field of a `"tool-result"` part of a prompt will now only accept an `EitherEncoded` as specified above.

### Patch Changes

- Updated dependencies [[`1d2e92d`](https://github.com/Effect-TS/effect/commit/1d2e92de9a20f39765bd0b338ffc936ba2fd9463), [`6ae2f5d`](https://github.com/Effect-TS/effect/commit/6ae2f5da45a9ed9832605eca12b3e2bf2e2a1a67), [`c63e658`](https://github.com/Effect-TS/effect/commit/c63e6582244fbb50d31650c4b4ea0660fe194652)]:
  - @effect/ai-anthropic@0.20.0
  - effect@3.18.4
  - @effect/ai@0.30.0

## 0.9.0

### Patch Changes

- Updated dependencies [[`1c6ab74`](https://github.com/Effect-TS/effect/commit/1c6ab74b314b2b6df8bb1b1a0cb9527ceda0e3fa), [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137), [`c296e32`](https://github.com/Effect-TS/effect/commit/c296e32554143b84ae8987046984e1cf1852417c), [`a098ddf`](https://github.com/Effect-TS/effect/commit/a098ddfc551f5aa0a7c36f9b4928372a64d4d9f2), [`f8b93ac`](https://github.com/Effect-TS/effect/commit/f8b93ac6446efd3dd790778b0fc71d299a38f272)]:
  - effect@3.18.0
  - @effect/ai@0.29.0
  - @effect/platform@0.92.0
  - @effect/ai-anthropic@0.19.0
  - @effect/experimental@0.56.0

## 0.8.1

### Patch Changes

- [#5571](https://github.com/Effect-TS/effect/pull/5571) [`122aa53`](https://github.com/Effect-TS/effect/commit/122aa53058ff008cf605cc2f0f0675a946c3cae9) Thanks @IMax153! - Ensure that AI provider clients filter response status for stream requests

- Updated dependencies [[`122aa53`](https://github.com/Effect-TS/effect/commit/122aa53058ff008cf605cc2f0f0675a946c3cae9)]:
  - @effect/ai-anthropic@0.18.2

## 0.8.0

### Patch Changes

- Updated dependencies [[`d4d86a8`](https://github.com/Effect-TS/effect/commit/d4d86a81f02b94e09fce8004ce2c5369c505ca5a)]:
  - @effect/platform@0.91.0
  - @effect/ai@0.28.0
  - @effect/ai-anthropic@0.18.0
  - @effect/experimental@0.55.0

## 0.7.1

### Patch Changes

- [#5521](https://github.com/Effect-TS/effect/pull/5521) [`fa49bc8`](https://github.com/Effect-TS/effect/commit/fa49bc86b14599300d106f306ceaf82a79121b80) Thanks @IMax153! - Fix provider metadata and parse tool call parameters safely

- Updated dependencies [[`fa49bc8`](https://github.com/Effect-TS/effect/commit/fa49bc86b14599300d106f306ceaf82a79121b80)]:
  - @effect/ai-anthropic@0.17.1
  - @effect/ai@0.27.1

## 0.7.0

### Minor Changes

- [#5469](https://github.com/Effect-TS/effect/pull/5469) [`42b914a`](https://github.com/Effect-TS/effect/commit/42b914a0e8750350ce17d434afaec7d655ddf4b7) Thanks @IMax153! - Refactor the Effect AI SDK and associated provider packages

  This pull request contains a complete refactor of the base Effect AI SDK package
  as well as the associated provider integration packages to improve flexibility
  and enhance ergonomics. Major changes are outlined below.

  ## Modules

  All modules in the base Effect AI SDK have had the leading `Ai` prefix dropped
  from their name (except for the `AiError` module).

  For example, the `AiLanguageModel` module is now the `LanguageModel` module.

  In addition, the `AiInput` module has been renamed to the `Prompt` module.

  ## Prompts

  The `Prompt` module has been completely redesigned with flexibility in mind.

  The `Prompt` module now supports building a prompt using either the constructors
  exposed from the `Prompt` module, or using raw prompt content parts / messages,
  which should be familiar to those coming from other AI SDKs.

  In addition, the `system` option has been removed from all `LanguageModel` methods
  and must now be provided as part of the prompt.

  **Prompt Constructors**

  ```ts
  import { LanguageModel, Prompt } from "@effect/ai"

  const textPart = Prompt.makePart("text", {
    text: "What is machine learning?"
  })

  const userMessage = Prompt.makeMessage("user", {
    content: [textPart]
  })

  const systemMessage = Prompt.makeMessage("system", {
    content: "You are an expert in machine learning"
  })

  const program = LanguageModel.generateText({
    prompt: Prompt.fromMessages([systemMessage, userMessage])
  })
  ```

  **Raw Prompt Input**

  ```ts
  import { LanguageModel } from "@effect/ai"

  const program = LanguageModel.generateText({
    prompt: [
      { role: "system", content: "You are an expert in machine learning" },
      {
        role: "user",
        content: [{ type: "text", text: "What is machine learning?" }]
      }
    ]
  })
  ```

  **NOTE**: Providing a plain string as a prompt is still supported, and will be converted
  internally into a user message with a single text content part.

  ### Provider-Specific Options

  To support specification of provider-specific options when interacting with large
  language model providers, support has been added for adding provider-specific
  options to the parts of a `Prompt`.

  ```ts
  import { LanguageModel } from "@effect/ai"
  import { AnthropicLanguageModel } from "@effect/ai-anthropic"

  const Claude = AnthropicLanguageModel.model("claude-sonnet-4-20250514")

  const program = LanguageModel.generateText({
    prompt: [
      {
        role: "user",
        content: [{ type: "text", text: "What is machine learning?" }],
        options: {
          anthropic: { cacheControl: { type: "ephemeral", ttl: "1h" } }
        }
      }
    ]
  }).pipe(Effect.provide(Claude))
  ```

  ## Responses

  The `Response` module has also been completely redesigned to support a wider
  variety of response parts, particularly when streaming.

  ### Streaming Responses

  When streaming text via the `LanguageModel.streamText` method, you will now
  receive a stream of content parts instead of a stream of responses, which should
  make it much simpler to filter down the stream to the parts you are interested in.

  In addition, additional content parts will be present in the stream to allow you to track,
  for example, when a text content part starts / ends.

  ### Tool Calls / Tool Call Results

  The decoded parts of a `Response` (as returned by the methods of `LanguageModel`)
  are now fully type-safe on tool calls / tool call results. Filtering the content parts of a
  response to tool calls will narrow the type of the tool call `params` based on the tool
  `name`. Similarly, filtering the response to tool call results will narrow the type of the
  tool call `result` based on the tool `name`.

  ```ts
  import { LanguageModel, Tool, Toolkit } from "@effect/ai"
  import { Effect, Schema } from "effect"

  const DadJokeTool = Tool.make("DadJokeTool", {
    parameters: { topic: Schema.String },
    success: Schema.Struct({ joke: Schema.String })
  })

  const FooTool = Tool.make("FooTool", {
    parameters: { foo: Schema.Number },
    success: Schema.Struct({ bar: Schema.Boolean })
  })

  const MyToolkit = Toolkit.make(DadJokeTool, FooTool)

  const program = Effect.gen(function* () {
    const response = yield* LanguageModel.generateText({
      prompt: "Tell me a dad joke",
      toolkit: MyToolkit
    })

    for (const toolCall of response.toolCalls) {
      if (toolCall.name === "DadJokeTool") {
        //         ^? "DadJokeTool" | "FooTool"
        toolCall.params
        //       ^? { readonly topic: string }
      }
    }

    for (const toolResult of response.toolResults) {
      if (toolResult.name === "DadJokeTool") {
        //           ^? "DadJokeTool" | "FooTool"
        toolResult.result
        //         ^? { readonly joke: string }
      }
    }
  })
  ```

  ### Provider Metadata

  As with provider-specific options, provider-specific metadata is now returned as
  part of the response from the large language model provider.

  ```ts
  import { LanguageModel } from "@effect/ai"
  import { AnthropicLanguageModel } from "@effect/ai-anthropic"
  import { Effect } from "effect"

  const Claude = AnthropicLanguageModel.model("claude-4-sonnet-20250514")

  const program = Effect.gen(function* () {
    const response = yield* LanguageModel.generateText({
      prompt: "What is the meaning of life?"
    })

    for (const part of response.content) {
      // When metadata **is not** defined for a content part, accessing the
      // provider's key on the part's metadata will return an untyped record
      if (part.type === "text") {
        const metadata = part.metadata.anthropic
        //    ^? { readonly [x: string]: unknown } | undefined
      }
      // When metadata **is** defined for a content part, accessing the
      // provider's key on the part's metadata will return typed metadata
      if (part.type === "reasoning") {
        const metadata = part.metadata.anthropic
        //    ^? AnthropicReasoningInfo | undefined
      }
    }
  }).pipe(Effect.provide(Claude))
  ```

  ## Tool Calls

  The `Tool` module has been enhanced to support provider-defined tools (e.g.
  web search, computer use, etc.). Large language model providers which support
  calling their own tools now have a separate module present in their provider
  integration packages which contain definitions for their tools.

  These provider-defined tools can be included alongside user-defined tools in
  existing `Toolkit`s. Provider-defined tools that require a user-space handler
  will be raise a type error in the associated `Toolkit` layer if no such handler
  is defined.

  ```ts
  import { LanguageModel, Tool, Toolkit } from "@effect/ai"
  import { AnthropicTool } from "@effect/ai-anthropic"
  import { Schema } from "effect"

  const DadJokeTool = Tool.make("DadJokeTool", {
    parameters: { topic: Schema.String },
    success: Schema.Struct({ joke: Schema.String })
  })

  const MyToolkit = Toolkit.make(
    DadJokeTool,
    AnthropicTool.WebSearch_20250305({ max_uses: 1 })
  )

  const program = LanguageModel.generateText({
    prompt: "Search the web for a dad joke",
    toolkit: MyToolkit
  })
  ```

  ## AiError

  The `AiError` type has been refactored into a union of different error types
  which can be raised by the Effect AI SDK. The goal of defining separate error
  types is to allow providing the end-user with more granular information about
  the error that occurred.

  For now, the following errors have been defined. More error types may be added
  over time based upon necessity / use case.

  ```ts
  type AiError =
    | HttpRequestError,
    | HttpResponseError,
    | MalformedInput,
    | MalformedOutput,
    | UnknownError
  ```

### Patch Changes

- Updated dependencies [[`42b914a`](https://github.com/Effect-TS/effect/commit/42b914a0e8750350ce17d434afaec7d655ddf4b7)]:
  - @effect/ai-anthropic@0.17.0
  - @effect/ai@0.27.0

## 0.6.2

### Patch Changes

- [#5438](https://github.com/Effect-TS/effect/pull/5438) [`0065a12`](https://github.com/Effect-TS/effect/commit/0065a12bb82e05cb7766de3c6c9c30fabf883fd9) Thanks @IMax153! - Fix the InferenceConfiguration schema in the Amazon Bedrock AI provider package

- Updated dependencies [[`3b26094`](https://github.com/Effect-TS/effect/commit/3b2609409ac1e8c6939d699584f00b1b99c47e2e), [`a33e491`](https://github.com/Effect-TS/effect/commit/a33e49153d944abd183fed93267fa7e52abae68b)]:
  - effect@3.17.10

## 0.6.1

### Patch Changes

- [#5424](https://github.com/Effect-TS/effect/pull/5424) [`3a8ba9b`](https://github.com/Effect-TS/effect/commit/3a8ba9b5e894a28e1724a5d5f3a965348caec2f1) Thanks @IMax153! - Fix system content block structure for Amazon Bedrock `AiLanguageModel`

- Updated dependencies [[`0271f14`](https://github.com/Effect-TS/effect/commit/0271f1450c0c861f589e26ff534a73dea7ea97b7)]:
  - effect@3.17.9

## 0.6.0

### Patch Changes

- Updated dependencies []:
  - @effect/ai@0.26.0
  - @effect/experimental@0.54.6

## 0.5.0

### Patch Changes

- Updated dependencies [[`5a0f4f1`](https://github.com/Effect-TS/effect/commit/5a0f4f176687a39d9fa46bb894bb7ac3175b0e87)]:
  - effect@3.17.1
  - @effect/ai@0.25.0
  - @effect/experimental@0.54.0

## 0.4.0

### Patch Changes

- Updated dependencies [[`7813640`](https://github.com/Effect-TS/effect/commit/7813640279d9e3a3e7fc0a29bfb5c6d5fb3c270f)]:
  - @effect/platform@0.90.0
  - @effect/ai@0.24.0
  - @effect/experimental@0.54.0

## 0.3.0

### Patch Changes

- Updated dependencies [[`40c3c87`](https://github.com/Effect-TS/effect/commit/40c3c875f724264312b43002859c82bed9ad0df9), [`ed2c74a`](https://github.com/Effect-TS/effect/commit/ed2c74ae8fa4ea0dd06ea84a3e58cd32e6916104), [`073a1b8`](https://github.com/Effect-TS/effect/commit/073a1b8be5dbfa87454393ee7346f5bc36a4fd63), [`f382e99`](https://github.com/Effect-TS/effect/commit/f382e99e409838a879246250fc3994b9bf5b3c2c), [`e8c7ba5`](https://github.com/Effect-TS/effect/commit/e8c7ba5fd3eb0c3ae3039fc24c09d69391987989), [`7e10415`](https://github.com/Effect-TS/effect/commit/7e1041599ade25103428703f5d2dfd7378a09636), [`e9bdece`](https://github.com/Effect-TS/effect/commit/e9bdececdc24f60a246be5055eca71a0d49ea7f2), [`8d95eb0`](https://github.com/Effect-TS/effect/commit/8d95eb0356b1d1736204836c275d201a547d208d)]:
  - effect@3.17.0
  - @effect/ai@0.23.0
  - @effect/experimental@0.53.0
  - @effect/platform@0.89.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`f5dfabf`](https://github.com/Effect-TS/effect/commit/f5dfabf51ba481a4468c1509c537314978ef6cec), [`17a5ea8`](https://github.com/Effect-TS/effect/commit/17a5ea8fa29785fe6e4c9480f2a2e9c8c59f3f38), [`d25f22b`](https://github.com/Effect-TS/effect/commit/d25f22be7598abe977caf6cdac3b0dd78b438c48)]:
  - effect@3.16.14
  - @effect/platform@0.88.1
  - @effect/experimental@0.52.1
  - @effect/ai@0.22.1

## 0.2.0

### Patch Changes

- Updated dependencies [[`27206d7`](https://github.com/Effect-TS/effect/commit/27206d7f0558d7fe28de57bf54f1d0cc83acc92e), [`dbabf5e`](https://github.com/Effect-TS/effect/commit/dbabf5e76fa63b050d2b6c466713c7dc59f07d3c)]:
  - @effect/platform@0.88.0
  - @effect/ai@0.22.0
  - @effect/experimental@0.52.0

## 0.1.14

### Patch Changes

- Updated dependencies [[`c1c05a8`](https://github.com/Effect-TS/effect/commit/c1c05a8242fb5df7445b4a12387a60eac7726eb7), [`81fe4a2`](https://github.com/Effect-TS/effect/commit/81fe4a2c81d5e30e180a60e68c52016a27b350db)]:
  - effect@3.16.13
  - @effect/ai@0.21.17
  - @effect/experimental@0.51.14
  - @effect/platform@0.87.13

## 0.1.13

### Patch Changes

- [#5186](https://github.com/Effect-TS/effect/pull/5186) [`e5692ab`](https://github.com/Effect-TS/effect/commit/e5692ab2be157b885f449ffb5c5f022eca04a59e) Thanks @IMax153! - Do not use `Config.Wrap` for AI provider `layerConfig`

- Updated dependencies [[`32ba77a`](https://github.com/Effect-TS/effect/commit/32ba77ae304d2161362a73e8b61965332626cf2d), [`d5e25b2`](https://github.com/Effect-TS/effect/commit/d5e25b237f05670ee42b386cb40b2cb448fc11d7)]:
  - @effect/platform@0.87.12
  - @effect/ai@0.21.16
  - @effect/experimental@0.51.13

## 0.1.12

### Patch Changes

- Updated dependencies [[`001392b`](https://github.com/Effect-TS/effect/commit/001392ba8bfcad101bb034348a7415012fb12f72), [`7bfb099`](https://github.com/Effect-TS/effect/commit/7bfb099cb5528511b8d63045c4fbb4dc9cb18528)]:
  - @effect/platform@0.87.11
  - @effect/ai@0.21.15
  - @effect/experimental@0.51.12

## 0.1.11

### Patch Changes

- Updated dependencies [[`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0), [`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0)]:
  - @effect/platform@0.87.10
  - @effect/ai@0.21.14
  - @effect/experimental@0.51.11

## 0.1.10

### Patch Changes

- Updated dependencies [[`54514a2`](https://github.com/Effect-TS/effect/commit/54514a2f53166de27ad7e756dbf12194691fd4af)]:
  - @effect/platform@0.87.9
  - @effect/ai@0.21.13
  - @effect/experimental@0.51.10

## 0.1.9

### Patch Changes

- Updated dependencies [[`4ce4f82`](https://github.com/Effect-TS/effect/commit/4ce4f824f6fdef492be1d35c05a490ffce518c89)]:
  - @effect/platform@0.87.8
  - @effect/experimental@0.51.9
  - @effect/ai@0.21.12

## 0.1.8

### Patch Changes

- Updated dependencies [[`d92d12a`](https://github.com/Effect-TS/effect/commit/d92d12acb6097a4fa6c9c918faa3cd5c3fb6c778), [`25ca0cf`](https://github.com/Effect-TS/effect/commit/25ca0cf141139cd44ff53081b1c877f8f3ab5e41), [`d92d12a`](https://github.com/Effect-TS/effect/commit/d92d12acb6097a4fa6c9c918faa3cd5c3fb6c778)]:
  - @effect/ai@0.21.11

## 0.1.7

### Patch Changes

- Updated dependencies [[`a9b617f`](https://github.com/Effect-TS/effect/commit/a9b617f125171ed76cd79ab46d7a924daf3b0e70), [`7e26e86`](https://github.com/Effect-TS/effect/commit/7e26e86524abcc93713d6ad7eee486638c98f7c2)]:
  - @effect/platform@0.87.7
  - @effect/ai@0.21.10
  - @effect/experimental@0.51.8

## 0.1.6

### Patch Changes

- Updated dependencies [[`030ac21`](https://github.com/Effect-TS/effect/commit/030ac217eac167d345a095bff26d9c95827fa64c), [`905da99`](https://github.com/Effect-TS/effect/commit/905da996aad665057b4ca6dba1a4af44fb8835bd), [`aaae9b1`](https://github.com/Effect-TS/effect/commit/aaae9b10345ab5f867b08e1c6eb21685cfc2b078)]:
  - @effect/ai@0.21.9
  - effect@3.16.12
  - @effect/experimental@0.51.7
  - @effect/platform@0.87.6

## 0.1.5

### Patch Changes

- Updated dependencies [[`96c1292`](https://github.com/Effect-TS/effect/commit/96c129262835410b311a51d0bf7f58b8f6fc9a12)]:
  - @effect/experimental@0.51.6
  - @effect/ai@0.21.8

## 0.1.4

### Patch Changes

- Updated dependencies [[`2fd8676`](https://github.com/Effect-TS/effect/commit/2fd8676c803cd40000dfc3231f5daecaa0e0ebd2)]:
  - @effect/platform@0.87.5
  - @effect/ai@0.21.7
  - @effect/experimental@0.51.5

## 0.1.3

### Patch Changes

- Updated dependencies [[`e82a4fd`](https://github.com/Effect-TS/effect/commit/e82a4fd60f6528d08cef1a4aba0abe0d3ba741ad)]:
  - @effect/platform@0.87.4
  - @effect/ai@0.21.6
  - @effect/experimental@0.51.4

## 0.1.2

### Patch Changes

- Updated dependencies [[`1b6e396`](https://github.com/Effect-TS/effect/commit/1b6e396d699f3cbbc56b68f99055cf746529bb9e)]:
  - @effect/platform@0.87.3
  - @effect/ai@0.21.5
  - @effect/experimental@0.51.3

## 0.1.1

### Patch Changes

- Updated dependencies [[`4fea68c`](https://github.com/Effect-TS/effect/commit/4fea68ca7a25a3c39a1ab68b3885534513ab0c81), [`b927954`](https://github.com/Effect-TS/effect/commit/b9279543cf5688dd8a577af80456959c615217d0), [`99590a6`](https://github.com/Effect-TS/effect/commit/99590a6ca9128eb1ede265b6670b655311995614), [`6c3e24c`](https://github.com/Effect-TS/effect/commit/6c3e24c2308f7d4a29b8f4270ab81bca22ac6bb4)]:
  - @effect/platform@0.87.2
  - effect@3.16.11
  - @effect/ai@0.21.4
  - @effect/experimental@0.51.2

## 0.1.0

### Minor Changes

- [#5020](https://github.com/Effect-TS/effect/pull/5020) [`530aa65`](https://github.com/Effect-TS/effect/commit/530aa6561b68ea591cef44e30e8629082e42fda2) Thanks @IMax153! - add Amazon Bedrock AI provider package
