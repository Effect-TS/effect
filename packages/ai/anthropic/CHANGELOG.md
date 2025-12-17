# @effect/ai-anthropic

## 0.23.0

### Patch Changes

- Updated dependencies [[`77eeb86`](https://github.com/Effect-TS/effect/commit/77eeb86ddf208e51ec25932af83d52d3b4700371), [`ff7053f`](https://github.com/Effect-TS/effect/commit/ff7053f6d8508567b6145239f97aacc5773b0c53), [`287c32c`](https://github.com/Effect-TS/effect/commit/287c32c9f10da8e96f2b9ef8424316189d9ad4b3)]:
  - effect@3.19.13
  - @effect/platform@0.94.0
  - @effect/ai@0.33.0
  - @effect/experimental@0.58.0

## 0.22.0

### Patch Changes

- Updated dependencies [[`3c15d5f`](https://github.com/Effect-TS/effect/commit/3c15d5f99fb8d8470a00c5a33d9ba3cac89dfe4c), [`3863fa8`](https://github.com/Effect-TS/effect/commit/3863fa89f61e63e5529fd961e37333bddf7db64a), [`2a03c76`](https://github.com/Effect-TS/effect/commit/2a03c76c2781ca7e9e228e838eab2eb0d0795b1d), [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433)]:
  - effect@3.19.0
  - @effect/platform@0.93.0
  - @effect/ai@0.32.0
  - @effect/experimental@0.57.0

## 0.21.1

### Patch Changes

- [#5644](https://github.com/Effect-TS/effect/pull/5644) [`7de0bfc`](https://github.com/Effect-TS/effect/commit/7de0bfc57f9a1d69c342224ab26402752677efcb) Thanks @IMax153! - Ensure that model accepts a string in Anthropic request schemas

## 0.21.0

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
  - @effect/ai@0.31.0

## 0.20.0

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

- [#5615](https://github.com/Effect-TS/effect/pull/5615) [`1d2e92d`](https://github.com/Effect-TS/effect/commit/1d2e92de9a20f39765bd0b338ffc936ba2fd9463) Thanks @janglad! - Remove accidental commit of debug console.dir

- Updated dependencies [[`6ae2f5d`](https://github.com/Effect-TS/effect/commit/6ae2f5da45a9ed9832605eca12b3e2bf2e2a1a67), [`c63e658`](https://github.com/Effect-TS/effect/commit/c63e6582244fbb50d31650c4b4ea0660fe194652)]:
  - effect@3.18.4
  - @effect/ai@0.30.0

## 0.19.2

### Patch Changes

- [#5608](https://github.com/Effect-TS/effect/pull/5608) [`215ed46`](https://github.com/Effect-TS/effect/commit/215ed4642b0c991d47e86fabb62f2118bf5f0231) Thanks @IMax153! - Fix incorrect detection of either result

- Updated dependencies [[`8ba4757`](https://github.com/Effect-TS/effect/commit/8ba47576c75b8b91be4bf9c1dae13995b37018af)]:
  - effect@3.18.2

## 0.19.1

### Patch Changes

- [#5599](https://github.com/Effect-TS/effect/pull/5599) [`d7eba97`](https://github.com/Effect-TS/effect/commit/d7eba977288f0a97a1dac5cadb1f16253220b82a) Thanks @IMax153! - Fix provider defined tool results in prompt input

## 0.19.0

### Patch Changes

- Updated dependencies [[`1c6ab74`](https://github.com/Effect-TS/effect/commit/1c6ab74b314b2b6df8bb1b1a0cb9527ceda0e3fa), [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137), [`c296e32`](https://github.com/Effect-TS/effect/commit/c296e32554143b84ae8987046984e1cf1852417c), [`a098ddf`](https://github.com/Effect-TS/effect/commit/a098ddfc551f5aa0a7c36f9b4928372a64d4d9f2), [`f8b93ac`](https://github.com/Effect-TS/effect/commit/f8b93ac6446efd3dd790778b0fc71d299a38f272)]:
  - effect@3.18.0
  - @effect/ai@0.29.0
  - @effect/platform@0.92.0
  - @effect/experimental@0.56.0

## 0.18.2

### Patch Changes

- [#5571](https://github.com/Effect-TS/effect/pull/5571) [`122aa53`](https://github.com/Effect-TS/effect/commit/122aa53058ff008cf605cc2f0f0675a946c3cae9) Thanks @IMax153! - Ensure that AI provider clients filter response status for stream requests

## 0.18.1

### Patch Changes

- [#5554](https://github.com/Effect-TS/effect/pull/5554) [`800ab2e`](https://github.com/Effect-TS/effect/commit/800ab2e6d983ed424deb10aebee720cfc666df7a) Thanks @IMax153! - Improve the information available to the user following a model response error

- Updated dependencies [[`800ab2e`](https://github.com/Effect-TS/effect/commit/800ab2e6d983ed424deb10aebee720cfc666df7a), [`800ab2e`](https://github.com/Effect-TS/effect/commit/800ab2e6d983ed424deb10aebee720cfc666df7a), [`800ab2e`](https://github.com/Effect-TS/effect/commit/800ab2e6d983ed424deb10aebee720cfc666df7a), [`800ab2e`](https://github.com/Effect-TS/effect/commit/800ab2e6d983ed424deb10aebee720cfc666df7a), [`800ab2e`](https://github.com/Effect-TS/effect/commit/800ab2e6d983ed424deb10aebee720cfc666df7a), [`800ab2e`](https://github.com/Effect-TS/effect/commit/800ab2e6d983ed424deb10aebee720cfc666df7a)]:
  - @effect/ai@0.28.2

## 0.18.0

### Patch Changes

- Updated dependencies [[`d4d86a8`](https://github.com/Effect-TS/effect/commit/d4d86a81f02b94e09fce8004ce2c5369c505ca5a)]:
  - @effect/platform@0.91.0
  - @effect/ai@0.28.0
  - @effect/experimental@0.55.0

## 0.17.1

### Patch Changes

- [#5521](https://github.com/Effect-TS/effect/pull/5521) [`fa49bc8`](https://github.com/Effect-TS/effect/commit/fa49bc86b14599300d106f306ceaf82a79121b80) Thanks @IMax153! - Fix provider metadata and parse tool call parameters safely

- Updated dependencies [[`fa49bc8`](https://github.com/Effect-TS/effect/commit/fa49bc86b14599300d106f306ceaf82a79121b80)]:
  - @effect/ai@0.27.1

## 0.17.0

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
  - @effect/ai@0.27.0

## 0.16.2

### Patch Changes

- [#5476](https://github.com/Effect-TS/effect/pull/5476) [`18ec398`](https://github.com/Effect-TS/effect/commit/18ec39853b493795fd0bff01a67f36e142cb6f4e) Thanks @richburdon! - fix total token count

## 0.16.1

### Patch Changes

- [#5474](https://github.com/Effect-TS/effect/pull/5474) [`5f5ae17`](https://github.com/Effect-TS/effect/commit/5f5ae1730510a372f229426aff832ba1c5c5145b) Thanks @IMax153! - Ensure that the finish part is emitted when streaming text from Anthropic

## 0.16.0

### Patch Changes

- Updated dependencies []:
  - @effect/ai@0.26.0
  - @effect/experimental@0.54.6

## 0.15.1

### Patch Changes

- [`4bcf799`](https://github.com/Effect-TS/effect/commit/4bcf799275bfc38932c5c5c5947afc271a283fac) Thanks @dmaretskyi! - Fix tools with no parameters not being called

## 0.15.0

### Patch Changes

- Updated dependencies [[`5a0f4f1`](https://github.com/Effect-TS/effect/commit/5a0f4f176687a39d9fa46bb894bb7ac3175b0e87)]:
  - effect@3.17.1
  - @effect/ai@0.25.0
  - @effect/experimental@0.54.0

## 0.14.0

### Patch Changes

- Updated dependencies [[`7813640`](https://github.com/Effect-TS/effect/commit/7813640279d9e3a3e7fc0a29bfb5c6d5fb3c270f)]:
  - @effect/platform@0.90.0
  - @effect/ai@0.24.0
  - @effect/experimental@0.54.0

## 0.13.0

### Patch Changes

- Updated dependencies [[`40c3c87`](https://github.com/Effect-TS/effect/commit/40c3c875f724264312b43002859c82bed9ad0df9), [`ed2c74a`](https://github.com/Effect-TS/effect/commit/ed2c74ae8fa4ea0dd06ea84a3e58cd32e6916104), [`073a1b8`](https://github.com/Effect-TS/effect/commit/073a1b8be5dbfa87454393ee7346f5bc36a4fd63), [`f382e99`](https://github.com/Effect-TS/effect/commit/f382e99e409838a879246250fc3994b9bf5b3c2c), [`e8c7ba5`](https://github.com/Effect-TS/effect/commit/e8c7ba5fd3eb0c3ae3039fc24c09d69391987989), [`7e10415`](https://github.com/Effect-TS/effect/commit/7e1041599ade25103428703f5d2dfd7378a09636), [`e9bdece`](https://github.com/Effect-TS/effect/commit/e9bdececdc24f60a246be5055eca71a0d49ea7f2), [`8d95eb0`](https://github.com/Effect-TS/effect/commit/8d95eb0356b1d1736204836c275d201a547d208d)]:
  - effect@3.17.0
  - @effect/ai@0.23.0
  - @effect/experimental@0.53.0
  - @effect/platform@0.89.0

## 0.12.2

### Patch Changes

- Updated dependencies [[`f5dfabf`](https://github.com/Effect-TS/effect/commit/f5dfabf51ba481a4468c1509c537314978ef6cec), [`17a5ea8`](https://github.com/Effect-TS/effect/commit/17a5ea8fa29785fe6e4c9480f2a2e9c8c59f3f38), [`d25f22b`](https://github.com/Effect-TS/effect/commit/d25f22be7598abe977caf6cdac3b0dd78b438c48)]:
  - effect@3.16.14
  - @effect/platform@0.88.1
  - @effect/experimental@0.52.1
  - @effect/ai@0.22.1

## 0.12.1

### Patch Changes

- [#5209](https://github.com/Effect-TS/effect/pull/5209) [`3deaa66`](https://github.com/Effect-TS/effect/commit/3deaa66e022e361a2036ce6bfc9d76f77d9cc948) Thanks @tim-smart! - fix ai layerConfig regression, to allow for conditional Config variables

## 0.12.0

### Patch Changes

- Updated dependencies [[`27206d7`](https://github.com/Effect-TS/effect/commit/27206d7f0558d7fe28de57bf54f1d0cc83acc92e), [`dbabf5e`](https://github.com/Effect-TS/effect/commit/dbabf5e76fa63b050d2b6c466713c7dc59f07d3c)]:
  - @effect/platform@0.88.0
  - @effect/ai@0.22.0
  - @effect/experimental@0.52.0

## 0.11.19

### Patch Changes

- Updated dependencies [[`c1c05a8`](https://github.com/Effect-TS/effect/commit/c1c05a8242fb5df7445b4a12387a60eac7726eb7), [`81fe4a2`](https://github.com/Effect-TS/effect/commit/81fe4a2c81d5e30e180a60e68c52016a27b350db)]:
  - effect@3.16.13
  - @effect/ai@0.21.17
  - @effect/experimental@0.51.14
  - @effect/platform@0.87.13

## 0.11.18

### Patch Changes

- [#5186](https://github.com/Effect-TS/effect/pull/5186) [`e5692ab`](https://github.com/Effect-TS/effect/commit/e5692ab2be157b885f449ffb5c5f022eca04a59e) Thanks @IMax153! - Do not use `Config.Wrap` for AI provider `layerConfig`

- Updated dependencies [[`32ba77a`](https://github.com/Effect-TS/effect/commit/32ba77ae304d2161362a73e8b61965332626cf2d), [`d5e25b2`](https://github.com/Effect-TS/effect/commit/d5e25b237f05670ee42b386cb40b2cb448fc11d7)]:
  - @effect/platform@0.87.12
  - @effect/ai@0.21.16
  - @effect/experimental@0.51.13

## 0.11.17

### Patch Changes

- Updated dependencies [[`001392b`](https://github.com/Effect-TS/effect/commit/001392ba8bfcad101bb034348a7415012fb12f72), [`7bfb099`](https://github.com/Effect-TS/effect/commit/7bfb099cb5528511b8d63045c4fbb4dc9cb18528)]:
  - @effect/platform@0.87.11
  - @effect/ai@0.21.15
  - @effect/experimental@0.51.12

## 0.11.16

### Patch Changes

- Updated dependencies [[`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0), [`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0)]:
  - @effect/platform@0.87.10
  - @effect/ai@0.21.14
  - @effect/experimental@0.51.11

## 0.11.15

### Patch Changes

- Updated dependencies [[`54514a2`](https://github.com/Effect-TS/effect/commit/54514a2f53166de27ad7e756dbf12194691fd4af)]:
  - @effect/platform@0.87.9
  - @effect/ai@0.21.13
  - @effect/experimental@0.51.10

## 0.11.14

### Patch Changes

- Updated dependencies [[`4ce4f82`](https://github.com/Effect-TS/effect/commit/4ce4f824f6fdef492be1d35c05a490ffce518c89)]:
  - @effect/platform@0.87.8
  - @effect/experimental@0.51.9
  - @effect/ai@0.21.12

## 0.11.13

### Patch Changes

- [#5029](https://github.com/Effect-TS/effect/pull/5029) [`d92d12a`](https://github.com/Effect-TS/effect/commit/d92d12acb6097a4fa6c9c918faa3cd5c3fb6c778) Thanks @IMax153! - Cleanup AiLanguageModel construction and finish basic support for gemini

- Updated dependencies [[`d92d12a`](https://github.com/Effect-TS/effect/commit/d92d12acb6097a4fa6c9c918faa3cd5c3fb6c778), [`25ca0cf`](https://github.com/Effect-TS/effect/commit/25ca0cf141139cd44ff53081b1c877f8f3ab5e41), [`d92d12a`](https://github.com/Effect-TS/effect/commit/d92d12acb6097a4fa6c9c918faa3cd5c3fb6c778)]:
  - @effect/ai@0.21.11

## 0.11.12

### Patch Changes

- Updated dependencies [[`a9b617f`](https://github.com/Effect-TS/effect/commit/a9b617f125171ed76cd79ab46d7a924daf3b0e70), [`7e26e86`](https://github.com/Effect-TS/effect/commit/7e26e86524abcc93713d6ad7eee486638c98f7c2)]:
  - @effect/platform@0.87.7
  - @effect/ai@0.21.10
  - @effect/experimental@0.51.8

## 0.11.11

### Patch Changes

- Updated dependencies [[`030ac21`](https://github.com/Effect-TS/effect/commit/030ac217eac167d345a095bff26d9c95827fa64c), [`905da99`](https://github.com/Effect-TS/effect/commit/905da996aad665057b4ca6dba1a4af44fb8835bd), [`aaae9b1`](https://github.com/Effect-TS/effect/commit/aaae9b10345ab5f867b08e1c6eb21685cfc2b078)]:
  - @effect/ai@0.21.9
  - effect@3.16.12
  - @effect/experimental@0.51.7
  - @effect/platform@0.87.6

## 0.11.10

### Patch Changes

- Updated dependencies [[`96c1292`](https://github.com/Effect-TS/effect/commit/96c129262835410b311a51d0bf7f58b8f6fc9a12)]:
  - @effect/experimental@0.51.6
  - @effect/ai@0.21.8

## 0.11.9

### Patch Changes

- Updated dependencies [[`2fd8676`](https://github.com/Effect-TS/effect/commit/2fd8676c803cd40000dfc3231f5daecaa0e0ebd2)]:
  - @effect/platform@0.87.5
  - @effect/ai@0.21.7
  - @effect/experimental@0.51.5

## 0.11.8

### Patch Changes

- Updated dependencies [[`e82a4fd`](https://github.com/Effect-TS/effect/commit/e82a4fd60f6528d08cef1a4aba0abe0d3ba741ad)]:
  - @effect/platform@0.87.4
  - @effect/ai@0.21.6
  - @effect/experimental@0.51.4

## 0.11.7

### Patch Changes

- Updated dependencies [[`1b6e396`](https://github.com/Effect-TS/effect/commit/1b6e396d699f3cbbc56b68f99055cf746529bb9e)]:
  - @effect/platform@0.87.3
  - @effect/ai@0.21.5
  - @effect/experimental@0.51.3

## 0.11.6

### Patch Changes

- Updated dependencies [[`4fea68c`](https://github.com/Effect-TS/effect/commit/4fea68ca7a25a3c39a1ab68b3885534513ab0c81), [`b927954`](https://github.com/Effect-TS/effect/commit/b9279543cf5688dd8a577af80456959c615217d0), [`99590a6`](https://github.com/Effect-TS/effect/commit/99590a6ca9128eb1ede265b6670b655311995614), [`6c3e24c`](https://github.com/Effect-TS/effect/commit/6c3e24c2308f7d4a29b8f4270ab81bca22ac6bb4)]:
  - @effect/platform@0.87.2
  - effect@3.16.11
  - @effect/ai@0.21.4
  - @effect/experimental@0.51.2

## 0.11.5

### Patch Changes

- [#5121](https://github.com/Effect-TS/effect/pull/5121) [`8e3c565`](https://github.com/Effect-TS/effect/commit/8e3c565aad2b888badb0b62f109d9b4ec4049305) Thanks @IMax153! - Fix several issues in the generated OpenAPI models for the Anthropic AI provider
  package.

  The OpenAPI specification that Anthropic maintains for its API is apparently
  [incorrect](https://github.com/anthropics/anthropic-sdk-typescript/issues/605).
  Some properties which are marked as nullable but required are sometimes not
  returned by the API. This fixes the schemas associated with some of those
  properties, though others may exist / be found that require manual adjustment.

## 0.11.4

### Patch Changes

- [#5020](https://github.com/Effect-TS/effect/pull/5020) [`530aa65`](https://github.com/Effect-TS/effect/commit/530aa6561b68ea591cef44e30e8629082e42fda2) Thanks @IMax153! - add Amazon Bedrock AI provider package

## 0.11.3

### Patch Changes

- Updated dependencies [[`faad30e`](https://github.com/Effect-TS/effect/commit/faad30ec8742916be59f9db642d0fc98225b636c)]:
  - effect@3.16.10
  - @effect/ai@0.21.3
  - @effect/experimental@0.51.1
  - @effect/platform@0.87.1

## 0.11.2

### Patch Changes

- Updated dependencies []:
  - @effect/ai@0.21.2
  - @effect/experimental@0.51.0

## 0.11.1

### Patch Changes

- Updated dependencies [[`f667373`](https://github.com/Effect-TS/effect/commit/f667373da3471f1e907366780f8c3ea7f52cc5c8)]:
  - @effect/ai@0.21.1
  - @effect/experimental@0.51.0

## 0.11.0

### Patch Changes

- Updated dependencies [[`b5bac9a`](https://github.com/Effect-TS/effect/commit/b5bac9ac2913fcd11b02322624f03b544eef53ba)]:
  - @effect/platform@0.87.0
  - @effect/ai@0.21.0
  - @effect/experimental@0.51.0

## 0.10.0

### Patch Changes

- Updated dependencies [[`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`c23d25c`](https://github.com/Effect-TS/effect/commit/c23d25c3e7c541f1f63b28484d8c461d86c67e99), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07)]:
  - effect@3.16.9
  - @effect/platform@0.86.0
  - @effect/ai@0.20.0
  - @effect/experimental@0.50.0

## 0.9.5

### Patch Changes

- Updated dependencies [[`a8d99b2`](https://github.com/Effect-TS/effect/commit/a8d99b2ec2f55d9aa6e7d00a5138e80380716877)]:
  - @effect/ai@0.19.4
  - @effect/experimental@0.49.2

## 0.9.4

### Patch Changes

- Updated dependencies [[`914a191`](https://github.com/Effect-TS/effect/commit/914a191e7cb6341a3d0e965bccd27c336cf22e44)]:
  - @effect/platform@0.85.2
  - @effect/ai@0.19.3
  - @effect/experimental@0.49.2

## 0.9.3

### Patch Changes

- [#5051](https://github.com/Effect-TS/effect/pull/5051) [`0945c0d`](https://github.com/Effect-TS/effect/commit/0945c0d0a20df456c0b0ec53f5e7487480aa62e1) Thanks @IMax153! - Fix the generated Anthropic OpenAPI schemas

## 0.9.2

### Patch Changes

- Updated dependencies []:
  - @effect/ai@0.19.2
  - @effect/experimental@0.49.1

## 0.9.1

### Patch Changes

- Updated dependencies [[`8cb98d5`](https://github.com/Effect-TS/effect/commit/8cb98d53e68330228287ce2a2e0d8a4c86bcab3b), [`db2dd3c`](https://github.com/Effect-TS/effect/commit/db2dd3c3a8a77d791eae19e66153527e1cde4e6e)]:
  - effect@3.16.8
  - @effect/ai@0.19.1
  - @effect/experimental@0.49.1
  - @effect/platform@0.85.1

## 0.9.0

### Patch Changes

- Updated dependencies [[`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e)]:
  - @effect/platform@0.85.0
  - @effect/ai@0.19.0
  - @effect/experimental@0.49.0

## 0.8.16

### Patch Changes

- Updated dependencies [[`daed158`](https://github.com/Effect-TS/effect/commit/daed158f2cf00175633284f075cf611c52aa2a1c)]:
  - @effect/ai@0.18.16

## 0.8.15

### Patch Changes

- Updated dependencies [[`c315989`](https://github.com/Effect-TS/effect/commit/c315989cade6c2a5c9cb157ad85f56b492675add)]:
  - @effect/ai@0.18.15

## 0.8.14

### Patch Changes

- Updated dependencies [[`1bb0d8a`](https://github.com/Effect-TS/effect/commit/1bb0d8ab96782e99434356266b38251554ea0294), [`cbac1ac`](https://github.com/Effect-TS/effect/commit/cbac1ac61a4e15ad15828563b39eef412bcee66e), [`dd4d380`](https://github.com/Effect-TS/effect/commit/dd4d3802f714d59171b1e9226a7babf9723ea952)]:
  - effect@3.16.7
  - @effect/ai@0.18.14
  - @effect/experimental@0.48.12
  - @effect/platform@0.84.11

## 0.8.13

### Patch Changes

- Updated dependencies [[`a5f7595`](https://github.com/Effect-TS/effect/commit/a5f75956ef9a15a83c416517ef493f0ee2f5ee8a), [`a02470c`](https://github.com/Effect-TS/effect/commit/a02470c75579e91525a25adb3f21b3650d042fdd), [`aa3a819`](https://github.com/Effect-TS/effect/commit/aa3a819707c15dd39b6d9ae4b4293bd87b74e175), [`bf369b2`](https://github.com/Effect-TS/effect/commit/bf369b2902a0e0b195d957c18b9efd180942cf8b), [`f891d45`](https://github.com/Effect-TS/effect/commit/f891d45adffdafd3f94a2eca23faa354e3a409a8)]:
  - effect@3.16.6
  - @effect/ai@0.18.13
  - @effect/platform@0.84.10
  - @effect/experimental@0.48.11

## 0.8.12

### Patch Changes

- Updated dependencies [[`bf418ef`](https://github.com/Effect-TS/effect/commit/bf418ef14a0f2ec965535793d5cea8fa8ba177ac)]:
  - effect@3.16.5
  - @effect/ai@0.18.12
  - @effect/experimental@0.48.10
  - @effect/platform@0.84.9

## 0.8.11

### Patch Changes

- Updated dependencies [[`2dc5f93`](https://github.com/Effect-TS/effect/commit/2dc5f932f89d260e2f6139c9b89e0548d11d94c2)]:
  - @effect/ai@0.18.11
  - @effect/experimental@0.48.9

## 0.8.10

### Patch Changes

- Updated dependencies [[`8b9db77`](https://github.com/Effect-TS/effect/commit/8b9db7742846af0f58fd8e8b7acb7f4f5ff487ec)]:
  - @effect/platform@0.84.8
  - @effect/experimental@0.48.9
  - @effect/ai@0.18.10

## 0.8.9

### Patch Changes

- Updated dependencies [[`74ab9a0`](https://github.com/Effect-TS/effect/commit/74ab9a0a9e16d6e019369d256e1e24175c8bc3f3), [`770008e`](https://github.com/Effect-TS/effect/commit/770008eca3aad2899a2ed951236e575793294b28)]:
  - effect@3.16.4
  - @effect/ai@0.18.9
  - @effect/experimental@0.48.8
  - @effect/platform@0.84.7

## 0.8.8

### Patch Changes

- Updated dependencies [[`a2d57c9`](https://github.com/Effect-TS/effect/commit/a2d57c9ac596445009ca12859b78e00e5d89b936)]:
  - @effect/experimental@0.48.7
  - @effect/ai@0.18.8

## 0.8.7

### Patch Changes

- Updated dependencies [[`ceea77a`](https://github.com/Effect-TS/effect/commit/ceea77a13055f145520f763e3fce5b8ff15d728f)]:
  - @effect/platform@0.84.6
  - @effect/ai@0.18.7
  - @effect/experimental@0.48.6

## 0.8.6

### Patch Changes

- Updated dependencies [[`85f54ed`](https://github.com/Effect-TS/effect/commit/85f54ed1ecf2f191de8c907247066e3631b5d7e1), [`ec52c6a`](https://github.com/Effect-TS/effect/commit/ec52c6a2211e76972462b15b9d5a9d6d56761b7a)]:
  - @effect/ai@0.18.6
  - @effect/platform@0.84.5
  - @effect/experimental@0.48.5

## 0.8.5

### Patch Changes

- Updated dependencies [[`4ddb28d`](https://github.com/Effect-TS/effect/commit/4ddb28d230d572735fe34539c1c59005d4932d8a)]:
  - @effect/ai@0.18.5

## 0.8.4

### Patch Changes

- Updated dependencies [[`87722fc`](https://github.com/Effect-TS/effect/commit/87722fce693a9b49284bbddbf82d30714c688261), [`36217ee`](https://github.com/Effect-TS/effect/commit/36217eeb1337edd9ac3f9a635b80a6385d22ae8f)]:
  - effect@3.16.3
  - @effect/ai@0.18.4
  - @effect/experimental@0.48.4
  - @effect/platform@0.84.4

## 0.8.3

### Patch Changes

- Updated dependencies [[`52c88c4`](https://github.com/Effect-TS/effect/commit/52c88c4b7d20ea819b9f2efaf112d03de0a4627b), [`ab7684f`](https://github.com/Effect-TS/effect/commit/ab7684f1c2a0671bf091f255d220e3a4cc7f528e)]:
  - @effect/ai@0.18.3
  - @effect/platform@0.84.3
  - @effect/experimental@0.48.3

## 0.8.2

### Patch Changes

- Updated dependencies [[`0ddf148`](https://github.com/Effect-TS/effect/commit/0ddf148a247aa87af043d276b8453a714a400897)]:
  - effect@3.16.2
  - @effect/ai@0.18.2
  - @effect/experimental@0.48.2
  - @effect/platform@0.84.2

## 0.8.1

### Patch Changes

- Updated dependencies [[`71174d0`](https://github.com/Effect-TS/effect/commit/71174d09691314a9b6b66189e456fd21e3eb6543), [`d615e6e`](https://github.com/Effect-TS/effect/commit/d615e6e5b944f6fd5e627e31752c7ca7e4e1c17d)]:
  - @effect/platform@0.84.1
  - effect@3.16.1
  - @effect/ai@0.18.1
  - @effect/experimental@0.48.1

## 0.8.0

### Minor Changes

- [#4891](https://github.com/Effect-TS/effect/pull/4891) [`0552674`](https://github.com/Effect-TS/effect/commit/055267461a3076b06dea896258f4bb2154211fcb) Thanks @IMax153! - Make `AiModel` a plain `Layer` and remove `AiPlan` in favor of `ExecutionPlan`

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

  const program = Effect.gen(function* () {
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

  program.pipe(Effect.provide(OpenAi), Effect.runPromise)
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
    effect: Effect.gen(function* () {
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

### Patch Changes

- Updated dependencies [[`ee0bd5d`](https://github.com/Effect-TS/effect/commit/ee0bd5d24864752c54cb359f67a67dd903971ec4), [`5189800`](https://github.com/Effect-TS/effect/commit/51898004e11766b8cf6d95e960b636f6d5db79ec), [`58bfeaa`](https://github.com/Effect-TS/effect/commit/58bfeaa64ded8c88f772b184311c0c0dbac10960), [`194d748`](https://github.com/Effect-TS/effect/commit/194d7486943f56f3267ef415395ac220a4b3e634), [`0552674`](https://github.com/Effect-TS/effect/commit/055267461a3076b06dea896258f4bb2154211fcb), [`918c9ea`](https://github.com/Effect-TS/effect/commit/918c9ea1a57facb154f0fb26792021f337054dee), [`9198e6f`](https://github.com/Effect-TS/effect/commit/9198e6fcc1a3ff4fefb3363004de558d8de01f40), [`2a370bf`](https://github.com/Effect-TS/effect/commit/2a370bf625fdeede5659721468eb0d527e403279), [`58ccb91`](https://github.com/Effect-TS/effect/commit/58ccb91328c8df5d49808b673738bc09df355201), [`fd47834`](https://github.com/Effect-TS/effect/commit/fd478348203fa89462b0a1d067ce4de034353df4)]:
  - effect@3.16.0
  - @effect/ai@0.18.0
  - @effect/experimental@0.48.0
  - @effect/platform@0.84.0

## 0.7.0

### Patch Changes

- Updated dependencies [[`5522520`](https://github.com/Effect-TS/effect/commit/55225206ab9af0ad60b1c0654690a8a096d625cd), [`cc5bb2b`](https://github.com/Effect-TS/effect/commit/cc5bb2b918a9450a975f702dabcea891bda382cb)]:
  - @effect/platform@0.83.0
  - effect@3.15.5
  - @effect/ai@0.17.0
  - @effect/experimental@0.47.0

## 0.6.9

### Patch Changes

- Updated dependencies [[`0617b9d`](https://github.com/Effect-TS/effect/commit/0617b9dc365f1963b36949ad7f9023ab6eb94524)]:
  - @effect/platform@0.82.8
  - @effect/ai@0.16.9
  - @effect/experimental@0.46.8

## 0.6.8

### Patch Changes

- Updated dependencies [[`f570554`](https://github.com/Effect-TS/effect/commit/f57055459524587b041340577dad85476bb35f81), [`78047e8`](https://github.com/Effect-TS/effect/commit/78047e8dfc8005b66f87afe50bb95981fea51561), [`c20b95a`](https://github.com/Effect-TS/effect/commit/c20b95a99ffe452b4774c844d397a905f713b6d6), [`94ada43`](https://github.com/Effect-TS/effect/commit/94ada430928d5685bdbef513e87562c20774a3a2)]:
  - effect@3.15.4
  - @effect/platform@0.82.7
  - @effect/ai@0.16.8
  - @effect/experimental@0.46.7

## 0.6.7

### Patch Changes

- Updated dependencies [[`618903b`](https://github.com/Effect-TS/effect/commit/618903ba9ae96e2bfe6ee31f61c4359b915f2a36)]:
  - @effect/platform@0.82.6
  - @effect/ai@0.16.7
  - @effect/experimental@0.46.6

## 0.6.6

### Patch Changes

- Updated dependencies [[`7764a07`](https://github.com/Effect-TS/effect/commit/7764a07d960c60df81f14e1dc949518f4bbe494a), [`4577f54`](https://github.com/Effect-TS/effect/commit/4577f548d67273e576cdde423bdd34a4b910766a), [`30a0d9c`](https://github.com/Effect-TS/effect/commit/30a0d9cb51c84290d51b1361d72ff5cee33c13c7)]:
  - @effect/platform@0.82.5
  - effect@3.15.3
  - @effect/ai@0.16.6
  - @effect/experimental@0.46.5

## 0.6.5

### Patch Changes

- [#4899](https://github.com/Effect-TS/effect/pull/4899) [`0a8c0e7`](https://github.com/Effect-TS/effect/commit/0a8c0e762af96d5dbf323d495a06647f39797674) Thanks @alex-dixon! - fix: anthropic tag name

- Updated dependencies [[`d45e8a8`](https://github.com/Effect-TS/effect/commit/d45e8a8ac8227192f504e39e6d04fdcf4fb1d225), [`d13b68e`](https://github.com/Effect-TS/effect/commit/d13b68e3a9456d0bfee9bca8273a7b44a9c69087)]:
  - @effect/platform@0.82.4
  - @effect/ai@0.16.5
  - @effect/experimental@0.46.4

## 0.6.4

### Patch Changes

- Updated dependencies [[`b8722b8`](https://github.com/Effect-TS/effect/commit/b8722b817e2306fe8c8245f3f9e32d85b824b961), [`a328f4b`](https://github.com/Effect-TS/effect/commit/a328f4b4fe717dd53e5b04a30f387433c32f7328)]:
  - effect@3.15.2
  - @effect/platform@0.82.3
  - @effect/ai@0.16.4
  - @effect/experimental@0.46.3

## 0.6.3

### Patch Changes

- Updated dependencies [[`739a3d4`](https://github.com/Effect-TS/effect/commit/739a3d4a4565915fe2e690003f4f9085cb4422fc)]:
  - @effect/platform@0.82.2
  - @effect/ai@0.16.3
  - @effect/experimental@0.46.2

## 0.6.2

### Patch Changes

- Updated dependencies [[`787ce70`](https://github.com/Effect-TS/effect/commit/787ce7042e35b657963473c6efe47752868cd811), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348)]:
  - effect@3.15.1
  - @effect/ai@0.16.2
  - @effect/experimental@0.46.1
  - @effect/platform@0.82.1

## 0.6.1

### Patch Changes

- Updated dependencies [[`cb3c30f`](https://github.com/Effect-TS/effect/commit/cb3c30f540a83dafcd6d841375073b5e069fa417)]:
  - @effect/ai@0.16.1
  - @effect/experimental@0.46.0

## 0.6.0

### Patch Changes

- Updated dependencies [[`c654595`](https://github.com/Effect-TS/effect/commit/c65459587b51da140b78098e81fdbfece65d53e2), [`d9f5dea`](https://github.com/Effect-TS/effect/commit/d9f5deae0f02f5de2b9fcb1cca8b142ba4bc2bba), [`49aa723`](https://github.com/Effect-TS/effect/commit/49aa7236a15e13f818c86edbca08c4af67c8dfaf), [`74c14d0`](https://github.com/Effect-TS/effect/commit/74c14d01d0cb48cf517a1b6e29a373a96ed0ff5b), [`e4f49b6`](https://github.com/Effect-TS/effect/commit/e4f49b66857e01b74ab6a9a0bc7132f44cd04cbb), [`6f02224`](https://github.com/Effect-TS/effect/commit/6f02224b3fc46a682ad2defb1a260841956c6780), [`1dcfd41`](https://github.com/Effect-TS/effect/commit/1dcfd41ff96abd706901293a00c1893cb29dd8fd), [`b21ab16`](https://github.com/Effect-TS/effect/commit/b21ab16b6f773e7ec4369db4e752c35e719f7870), [`fcf1822`](https://github.com/Effect-TS/effect/commit/fcf1822f98fcda60351d64e9d2c2c13563d7e6db), [`0061dd1`](https://github.com/Effect-TS/effect/commit/0061dd140740165e91569a684cce27a77b23229e), [`8421e6e`](https://github.com/Effect-TS/effect/commit/8421e6e49332bca8f96f482dfd48680e238b3a89), [`a9b3fb7`](https://github.com/Effect-TS/effect/commit/a9b3fb78abcfdb525318a956fd02fcadeb56143e), [`fa10f56`](https://github.com/Effect-TS/effect/commit/fa10f56b96bd9af070ba99ebc3279aa93954261e)]:
  - effect@3.15.0
  - @effect/platform@0.82.0
  - @effect/ai@0.16.0
  - @effect/experimental@0.46.0

## 0.5.0

### Minor Changes

- [#4766](https://github.com/Effect-TS/effect/pull/4766) [`a4d42c5`](https://github.com/Effect-TS/effect/commit/a4d42c55669eff56963d06323d155a5bf3082a70) Thanks @IMax153! - Refactor `@effect/ai-anthropic` to align with changes to `@effect/ai`

### Patch Changes

- Updated dependencies [[`a4d42c5`](https://github.com/Effect-TS/effect/commit/a4d42c55669eff56963d06323d155a5bf3082a70)]:
  - @effect/ai@0.15.0
  - @effect/experimental@0.45.1

## 0.4.1

### Patch Changes

- Updated dependencies [[`24a9ebb`](https://github.com/Effect-TS/effect/commit/24a9ebbb5af598f0bfd6ecc45307e528043fe011)]:
  - effect@3.14.22
  - @effect/ai@0.14.1
  - @effect/experimental@0.45.1
  - @effect/platform@0.81.1

## 0.4.0

### Patch Changes

- Updated dependencies [[`672920f`](https://github.com/Effect-TS/effect/commit/672920f85da8abd5f9d4ad85e29248a2aca57ed8)]:
  - @effect/platform@0.81.0
  - @effect/ai@0.14.0
  - @effect/experimental@0.45.0

## 0.3.22

### Patch Changes

- Updated dependencies [[`2f3b7d4`](https://github.com/Effect-TS/effect/commit/2f3b7d4e1fa1ef8790b0ca4da22eb88872ee31df)]:
  - effect@3.14.21
  - @effect/ai@0.13.21
  - @effect/experimental@0.44.21
  - @effect/platform@0.80.21

## 0.3.21

### Patch Changes

- Updated dependencies [[`17e2f30`](https://github.com/Effect-TS/effect/commit/17e2f3091408cf0fca9414d4af3bdf7b2765b378)]:
  - effect@3.14.20
  - @effect/ai@0.13.20
  - @effect/experimental@0.44.20
  - @effect/platform@0.80.20

## 0.3.20

### Patch Changes

- Updated dependencies [[`056a910`](https://github.com/Effect-TS/effect/commit/056a910d0a0b8b00b0dc9df4a070466b2b5c2f6c), [`e25e7bb`](https://github.com/Effect-TS/effect/commit/e25e7bbc1797733916f48f501425d9f2ef310d9f), [`3273d57`](https://github.com/Effect-TS/effect/commit/3273d572c2b3175a842677f19efeea4cd65ab016)]:
  - effect@3.14.19
  - @effect/platform@0.80.19
  - @effect/ai@0.13.19
  - @effect/experimental@0.44.19

## 0.3.19

### Patch Changes

- Updated dependencies [[`b1164d4`](https://github.com/Effect-TS/effect/commit/b1164d49a1dfdf299e9971367b6fc6be4df0ddff)]:
  - effect@3.14.18
  - @effect/ai@0.13.18
  - @effect/experimental@0.44.18
  - @effect/platform@0.80.18

## 0.3.18

### Patch Changes

- Updated dependencies [[`0b54681`](https://github.com/Effect-TS/effect/commit/0b54681cd89245e211d8f49272be0f1bf2f81813), [`41a59d5`](https://github.com/Effect-TS/effect/commit/41a59d5916a296b12b0d5ead9e859e05f40b4cce)]:
  - effect@3.14.17
  - @effect/ai@0.13.17
  - @effect/experimental@0.44.17
  - @effect/platform@0.80.17

## 0.3.17

### Patch Changes

- Updated dependencies [[`ee14444`](https://github.com/Effect-TS/effect/commit/ee144441021ec77039e43396eaf90714687bb495), [`f1c8583`](https://github.com/Effect-TS/effect/commit/f1c8583f8c3ea9415f813795ca2940a897c9ba9a)]:
  - effect@3.14.16
  - @effect/platform@0.80.16
  - @effect/ai@0.13.16
  - @effect/experimental@0.44.16

## 0.3.16

### Patch Changes

- Updated dependencies [[`239cc99`](https://github.com/Effect-TS/effect/commit/239cc995ce645946210a3c3d2cb52bd3547c0687), [`8b6c947`](https://github.com/Effect-TS/effect/commit/8b6c947eaa8e45a67ecb3c37d45cd27f3e41d165), [`c50a63b`](https://github.com/Effect-TS/effect/commit/c50a63bbecb9f560b9cae349c447eed877d1b9b6)]:
  - effect@3.14.15
  - @effect/ai@0.13.15
  - @effect/experimental@0.44.15
  - @effect/platform@0.80.15

## 0.3.15

### Patch Changes

- Updated dependencies [[`6ed8d15`](https://github.com/Effect-TS/effect/commit/6ed8d1589beb181d30abc79afebdaabc1d101538)]:
  - effect@3.14.14
  - @effect/ai@0.13.14
  - @effect/experimental@0.44.14
  - @effect/platform@0.80.14

## 0.3.14

### Patch Changes

- Updated dependencies [[`ee77788`](https://github.com/Effect-TS/effect/commit/ee77788747e7ebbde6bfa88256cde49dbbad3608), [`5fce6ba`](https://github.com/Effect-TS/effect/commit/5fce6ba19c3cc63cc0104e737e581ad989dedbf0), [`570e45f`](https://github.com/Effect-TS/effect/commit/570e45f8cb936e42ec48f67f21bb2b7252f36c0c)]:
  - effect@3.14.13
  - @effect/ai@0.13.13
  - @effect/experimental@0.44.13
  - @effect/platform@0.80.13

## 0.3.13

### Patch Changes

- Updated dependencies [[`c2ad9ee`](https://github.com/Effect-TS/effect/commit/c2ad9ee9f3c4c743390edf35ed9e85a20be33811), [`9c68654`](https://github.com/Effect-TS/effect/commit/9c686542b6eb3ea188cb70673ef2e41223633e89)]:
  - effect@3.14.12
  - @effect/ai@0.13.12
  - @effect/experimental@0.44.12
  - @effect/platform@0.80.12

## 0.3.12

### Patch Changes

- Updated dependencies [[`e536127`](https://github.com/Effect-TS/effect/commit/e536127c1e6f2fb3a542c73ae919435a629a346b)]:
  - effect@3.14.11
  - @effect/ai@0.13.11
  - @effect/experimental@0.44.11
  - @effect/platform@0.80.11

## 0.3.11

### Patch Changes

- Updated dependencies [[`bc7efa3`](https://github.com/Effect-TS/effect/commit/bc7efa3b031bb25e1ed3c8f2d3fb5e8da166cadc)]:
  - effect@3.14.10
  - @effect/ai@0.13.10
  - @effect/experimental@0.44.10
  - @effect/platform@0.80.10

## 0.3.10

### Patch Changes

- Updated dependencies [[`d78249f`](https://github.com/Effect-TS/effect/commit/d78249f0b67f63cf4baf806ff090cba33293daf0)]:
  - effect@3.14.9
  - @effect/ai@0.13.9
  - @effect/experimental@0.44.9
  - @effect/platform@0.80.9

## 0.3.9

### Patch Changes

- [#4726](https://github.com/Effect-TS/effect/pull/4726) [`b8b0703`](https://github.com/Effect-TS/effect/commit/b8b070382b3290eff922b76125f0d06732b74155) Thanks @dearlordylord! - AnthropicClient.layerConfig has the same ROut as AnthropicClient.layer - specifically, AiModels.AiModels was missing

## 0.3.8

### Patch Changes

- Updated dependencies [[`b3a2d32`](https://github.com/Effect-TS/effect/commit/b3a2d32772e6f7f20eacf2e18128e99324c4d378)]:
  - effect@3.14.8
  - @effect/ai@0.13.8
  - @effect/experimental@0.44.8
  - @effect/platform@0.80.8

## 0.3.7

### Patch Changes

- Updated dependencies [[`b542a4b`](https://github.com/Effect-TS/effect/commit/b542a4bf195be0c9af1523e1ba96c953decc4d25)]:
  - effect@3.14.7
  - @effect/ai@0.13.7
  - @effect/experimental@0.44.7
  - @effect/platform@0.80.7

## 0.3.6

### Patch Changes

- Updated dependencies [[`47618c1`](https://github.com/Effect-TS/effect/commit/47618c1ad84ebcc5a51133a3fff5aa5012d49d45), [`6077882`](https://github.com/Effect-TS/effect/commit/60778824a4794336c33807801f813f8751d1c7e4)]:
  - effect@3.14.6
  - @effect/ai@0.13.6
  - @effect/experimental@0.44.6
  - @effect/platform@0.80.6

## 0.3.5

### Patch Changes

- Updated dependencies [[`40dbfef`](https://github.com/Effect-TS/effect/commit/40dbfeff239b6e567706752114f31b2fce7de4e3), [`85fba81`](https://github.com/Effect-TS/effect/commit/85fba815ac07eb13d4227a69ac76a18e4b94df18), [`5a5ebdd`](https://github.com/Effect-TS/effect/commit/5a5ebdddfaddd259538b4599a6676281faca778e)]:
  - effect@3.14.5
  - @effect/platform@0.80.5
  - @effect/ai@0.13.5
  - @effect/experimental@0.44.5

## 0.3.4

### Patch Changes

- Updated dependencies [[`e4ba2c6`](https://github.com/Effect-TS/effect/commit/e4ba2c66a878e81b5e295d6d49aaf724b80a28ef)]:
  - effect@3.14.4
  - @effect/ai@0.13.4
  - @effect/experimental@0.44.4
  - @effect/platform@0.80.4

## 0.3.3

### Patch Changes

- Updated dependencies [[`37aa8e1`](https://github.com/Effect-TS/effect/commit/37aa8e137725a902e70cd1e468ea98b873aa5056), [`34f03d6`](https://github.com/Effect-TS/effect/commit/34f03d66875f21f266f102223a03cd14c2ed6ea6)]:
  - effect@3.14.3
  - @effect/ai@0.13.3
  - @effect/experimental@0.44.3
  - @effect/platform@0.80.3

## 0.3.2

### Patch Changes

- Updated dependencies [[`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`0a3e3e1`](https://github.com/Effect-TS/effect/commit/0a3e3e18eea5e0d1882f1a6c906198e6ef226a41)]:
  - effect@3.14.2
  - @effect/ai@0.13.2
  - @effect/experimental@0.44.2
  - @effect/platform@0.80.2

## 0.3.1

### Patch Changes

- Updated dependencies [[`4a274fe`](https://github.com/Effect-TS/effect/commit/4a274fe9f623182b6b902827e0e83bd89ca3b05c)]:
  - effect@3.14.1
  - @effect/ai@0.13.1
  - @effect/experimental@0.44.1
  - @effect/platform@0.80.1

## 0.3.0

### Patch Changes

- Updated dependencies [[`1f47e4e`](https://github.com/Effect-TS/effect/commit/1f47e4e12546ab691b29bfb7b5128bb17b93baa5), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`3131f8f`](https://github.com/Effect-TS/effect/commit/3131f8fd12ba9eb31b90fa2f42bf88b12309133c), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`04dff2d`](https://github.com/Effect-TS/effect/commit/04dff2d01ac68c260f29a6d4743381825c353c86), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`c7fac0c`](https://github.com/Effect-TS/effect/commit/c7fac0cd7eadcd5cc0c3a987051c5b57ad271638), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`ffaa3f3`](https://github.com/Effect-TS/effect/commit/ffaa3f3969df26610fcc02ad537340641d44e803), [`ab957c1`](https://github.com/Effect-TS/effect/commit/ab957c1fee714868f56c7ab4e802b9d449e9b666), [`35db9ce`](https://github.com/Effect-TS/effect/commit/35db9ce228f1416c8abacc6dc9c36fbd0f33ef0f), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`cf77ea9`](https://github.com/Effect-TS/effect/commit/cf77ea9ab4fc89e66a43f682a9926ccdee6c57ed), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`baaab60`](https://github.com/Effect-TS/effect/commit/baaab60b737f35dfab8e4a21bce28a195d19e899)]:
  - effect@3.14.0
  - @effect/experimental@0.44.0
  - @effect/platform@0.80.0
  - @effect/ai@0.13.0

## 0.2.4

### Patch Changes

- [#4592](https://github.com/Effect-TS/effect/pull/4592) [`5662363`](https://github.com/Effect-TS/effect/commit/566236361e270e575ef1cbf308ad1967c82a362c) Thanks @tim-smart! - update generated ai clients

- Updated dependencies [[`5662363`](https://github.com/Effect-TS/effect/commit/566236361e270e575ef1cbf308ad1967c82a362c), [`5f1fd15`](https://github.com/Effect-TS/effect/commit/5f1fd15308ab154791580059b89877d19a2055c2), [`8bb1460`](https://github.com/Effect-TS/effect/commit/8bb1460c824f66f0f25ebd899c5e74e388089c37)]:
  - @effect/platform@0.79.4
  - @effect/ai@0.12.4
  - @effect/experimental@0.43.4

## 0.2.3

### Patch Changes

- Updated dependencies [[`0c4803f`](https://github.com/Effect-TS/effect/commit/0c4803fcc69262d11a97ce49d0e9b4288df0651f), [`6f65ac4`](https://github.com/Effect-TS/effect/commit/6f65ac4eac1489cd6ea390e18b0908670722adad)]:
  - effect@3.13.12
  - @effect/ai@0.12.3
  - @effect/experimental@0.43.3
  - @effect/platform@0.79.3

## 0.2.2

### Patch Changes

- Updated dependencies [[`fad8cca`](https://github.com/Effect-TS/effect/commit/fad8cca9bbfcc2eaeb44b97c15dbe0a1eda75315), [`4296293`](https://github.com/Effect-TS/effect/commit/4296293049414d0cf2d915a26c552b09f946b9a0), [`9c241ab`](https://github.com/Effect-TS/effect/commit/9c241abe47ccf7a5257b98a4a64a63054a12741d), [`082b0c1`](https://github.com/Effect-TS/effect/commit/082b0c1b9f4252bcdd69608f2e4a9226f953ac3f), [`be12983`](https://github.com/Effect-TS/effect/commit/be12983bc7e7537b41cd8910fc4eb7d1da56ab07), [`de88127`](https://github.com/Effect-TS/effect/commit/de88127a5a5906ccece98af74787b5ae0e65e431)]:
  - effect@3.13.11
  - @effect/ai@0.12.2
  - @effect/experimental@0.43.2
  - @effect/platform@0.79.2

## 0.2.1

### Patch Changes

- Updated dependencies [[`527c964`](https://github.com/Effect-TS/effect/commit/527c9645229f5be9714a7e60a38a9e753c4bbfb1)]:
  - effect@3.13.10
  - @effect/ai@0.12.1
  - @effect/experimental@0.43.1
  - @effect/platform@0.79.1

## 0.2.0

### Patch Changes

- Updated dependencies [[`88fe129`](https://github.com/Effect-TS/effect/commit/88fe12923740765c0335a6e6203fdcc6a463edca), [`d630249`](https://github.com/Effect-TS/effect/commit/d630249426113088abe8b382db4f14d80f2160c2), [`2976e52`](https://github.com/Effect-TS/effect/commit/2976e52538d9dc9ffdcbc84d4ac748cff9305971)]:
  - @effect/platform@0.79.0
  - effect@3.13.9
  - @effect/experimental@0.43.0
  - @effect/ai@0.12.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`c65d336`](https://github.com/Effect-TS/effect/commit/c65d3362d07ec815ff3b46278314e8a31706ddc2), [`22d2ebb`](https://github.com/Effect-TS/effect/commit/22d2ebb4b11f5a44351a4736e65da391a3b647d0)]:
  - effect@3.13.8
  - @effect/ai@0.11.1
  - @effect/experimental@0.42.1
  - @effect/platform@0.78.1

## 0.1.0

### Patch Changes

- Updated dependencies [[`c5bcf53`](https://github.com/Effect-TS/effect/commit/c5bcf53b7cb49dacffdd2a6cd8eb48cc452b417e)]:
  - @effect/platform@0.78.0
  - @effect/ai@0.11.0
  - @effect/experimental@0.42.0

## 0.0.7

### Patch Changes

- Updated dependencies [[`840cc73`](https://github.com/Effect-TS/effect/commit/840cc7329908db7ca693ef47b07d4f845c29cadd), [`9bf8a74`](https://github.com/Effect-TS/effect/commit/9bf8a74b967f18d931743dd5196af326c9118e9c), [`87ba23c`](https://github.com/Effect-TS/effect/commit/87ba23c41c193503ed0c612b0d32d0b253794c64), [`f910880`](https://github.com/Effect-TS/effect/commit/f91088069057f3b4529753f5bc5532b028d726df), [`0d01480`](https://github.com/Effect-TS/effect/commit/0d014803e4f688f74386a80abd65485e1a319244), [`a95108a`](https://github.com/Effect-TS/effect/commit/a95108acac7f25fc5e1c0dcdf16bcc638dca5c00)]:
  - @effect/platform@0.77.7
  - effect@3.13.7
  - @effect/ai@0.10.7
  - @effect/experimental@0.41.7

## 0.0.6

### Patch Changes

- Updated dependencies [[`3154ce4`](https://github.com/Effect-TS/effect/commit/3154ce4692fa18b804982158d3c4c8a8a5fae386)]:
  - effect@3.13.6
  - @effect/ai@0.10.6
  - @effect/experimental@0.41.6
  - @effect/platform@0.77.6

## 0.0.5

### Patch Changes

- Updated dependencies [[`3d6d323`](https://github.com/Effect-TS/effect/commit/3d6d323c2a1028f3caba45453187b9374bac2c36), [`367bb35`](https://github.com/Effect-TS/effect/commit/367bb35f4c2a254e1fb211d96db2474a7aed9020), [`6cf11c3`](https://github.com/Effect-TS/effect/commit/6cf11c3a75773ceec2877c85ddc760f381f0866d), [`a0acec8`](https://github.com/Effect-TS/effect/commit/a0acec851f72e19466363d24b9cc218acd00006a), [`975c20e`](https://github.com/Effect-TS/effect/commit/975c20e446186e9bb975f77e7c6ac7b248f7b5f6)]:
  - @effect/ai@0.10.5
  - effect@3.13.5
  - @effect/experimental@0.41.5
  - @effect/platform@0.77.5

## 0.0.4

### Patch Changes

- Updated dependencies [[`e0746f9`](https://github.com/Effect-TS/effect/commit/e0746f9aa398b69c6542e375910683bf17f49f46), [`17d9e89`](https://github.com/Effect-TS/effect/commit/17d9e89f9851663bdbb6c1e685601d97806114a4)]:
  - @effect/platform@0.77.4
  - effect@3.13.4
  - @effect/ai@0.10.4
  - @effect/experimental@0.41.4

## 0.0.3

### Patch Changes

- [#4504](https://github.com/Effect-TS/effect/pull/4504) [`a67a8a1`](https://github.com/Effect-TS/effect/commit/a67a8a1a4979fb7a039a060d067d805879da4d4b) Thanks @IMax153! - Introduce `AiModel` and `AiPlan` for describing retry / fallback logic between
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
  }).pipe(
    AiPlan.withFallback({
      model: AnthropicCompletions.model("claude-3-5-haiku-latest")
    })
  )

  const program = Effect.gen(function* () {
    // Build the plan of execution
    const plan = yield* Plan

    // Create a program which uses the services provided by the plan
    const getDadJoke = Effect.gen(function* () {
      const completions = yield* Completions.Completions
      const response = yield* completions.create("Tell me a dad joke")
      yield* Console.log(response.text)
    })

    // Provide the plan to whichever programs need it
    yield* plan.provide(getDadJoke)
  })

  program.pipe(Effect.provide([Anthropic, OpenAi]), NodeRuntime.runMain)
  ```

- Updated dependencies [[`cc5588d`](https://github.com/Effect-TS/effect/commit/cc5588df07f9103513547cb429ce041b9436a8bd), [`623c8cd`](https://github.com/Effect-TS/effect/commit/623c8cd053ed6ee3d353aaa8778d484670fca2bb), [`00b4eb1`](https://github.com/Effect-TS/effect/commit/00b4eb1ece12a16e222e6220965bb4024d6752ac), [`f2aee98`](https://github.com/Effect-TS/effect/commit/f2aee989b0a600900ce83e7f460d02908620c80f), [`fb798eb`](https://github.com/Effect-TS/effect/commit/fb798eb9061f1191badc017d1aa649360254da20), [`2251b15`](https://github.com/Effect-TS/effect/commit/2251b1528810bb695b37ce388b653cec0c5bf80c), [`2e15c1e`](https://github.com/Effect-TS/effect/commit/2e15c1e33648add0b29fe274fbcb7294b7515085), [`a4979db`](https://github.com/Effect-TS/effect/commit/a4979db021aef16e731be64df196b72088fc4376), [`b74255a`](https://github.com/Effect-TS/effect/commit/b74255a304ad49d60bedb1a260fd697f370af27a), [`d7f6a5c`](https://github.com/Effect-TS/effect/commit/d7f6a5c7d26c1963dcd864ca62360d20d08c7b49), [`9dd8979`](https://github.com/Effect-TS/effect/commit/9dd8979e940915b1cc1b1f264f3d019c77a65a02), [`477b488`](https://github.com/Effect-TS/effect/commit/477b488284f47c5469d7fba3e4065fb7e3b6556e), [`10932cb`](https://github.com/Effect-TS/effect/commit/10932cbf58fc721ada631cebec42f773ce96d3cc), [`9f6c784`](https://github.com/Effect-TS/effect/commit/9f6c78468b3b5e9ebfc38ffdfb70702901ee977b), [`2c639ec`](https://github.com/Effect-TS/effect/commit/2c639ecee332de4266e36022c989c35ae4e02105), [`886aaa8`](https://github.com/Effect-TS/effect/commit/886aaa81e06dfd3cd9391e8ea987d8cd5ada1124), [`a67a8a1`](https://github.com/Effect-TS/effect/commit/a67a8a1a4979fb7a039a060d067d805879da4d4b)]:
  - effect@3.13.3
  - @effect/ai@0.10.3
  - @effect/experimental@0.41.3
  - @effect/platform@0.77.3

## 0.0.2

### Patch Changes

- Updated dependencies [[`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f), [`3e7ce97`](https://github.com/Effect-TS/effect/commit/3e7ce97f8a41756a039cf635d0b3d9a75d781097), [`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f)]:
  - effect@3.13.2
  - @effect/platform@0.77.2
  - @effect/ai@0.10.2
  - @effect/experimental@0.41.2

## 0.0.1

### Patch Changes

- [#4446](https://github.com/Effect-TS/effect/pull/4446) [`9375c28`](https://github.com/Effect-TS/effect/commit/9375c28ca808325577da6c67cc92af25931027c8) Thanks @IMax153! - Add Anthropic AI provider integration

- Updated dependencies [[`b56a211`](https://github.com/Effect-TS/effect/commit/b56a2110569fd0ec0b57ac137743e926d49f51cc), [`9375c28`](https://github.com/Effect-TS/effect/commit/9375c28ca808325577da6c67cc92af25931027c8)]:
  - effect@3.13.1
  - @effect/ai@0.10.1
  - @effect/experimental@0.41.1
  - @effect/platform@0.77.1
