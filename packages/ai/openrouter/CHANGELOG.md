# @effect/ai-openrouter

## 0.5.0

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

## 0.4.0

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

- Updated dependencies [[`6ae2f5d`](https://github.com/Effect-TS/effect/commit/6ae2f5da45a9ed9832605eca12b3e2bf2e2a1a67), [`c63e658`](https://github.com/Effect-TS/effect/commit/c63e6582244fbb50d31650c4b4ea0660fe194652)]:
  - effect@3.18.4
  - @effect/ai@0.30.0

## 0.3.0

### Patch Changes

- Updated dependencies [[`1c6ab74`](https://github.com/Effect-TS/effect/commit/1c6ab74b314b2b6df8bb1b1a0cb9527ceda0e3fa), [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137), [`c296e32`](https://github.com/Effect-TS/effect/commit/c296e32554143b84ae8987046984e1cf1852417c), [`a098ddf`](https://github.com/Effect-TS/effect/commit/a098ddfc551f5aa0a7c36f9b4928372a64d4d9f2), [`f8b93ac`](https://github.com/Effect-TS/effect/commit/f8b93ac6446efd3dd790778b0fc71d299a38f272)]:
  - effect@3.18.0
  - @effect/ai@0.29.0
  - @effect/platform@0.92.0
  - @effect/experimental@0.56.0

## 0.2.1

### Patch Changes

- [#5571](https://github.com/Effect-TS/effect/pull/5571) [`122aa53`](https://github.com/Effect-TS/effect/commit/122aa53058ff008cf605cc2f0f0675a946c3cae9) Thanks @IMax153! - Ensure that AI provider clients filter response status for stream requests

## 0.2.0

### Patch Changes

- Updated dependencies [[`d4d86a8`](https://github.com/Effect-TS/effect/commit/d4d86a81f02b94e09fce8004ce2c5369c505ca5a)]:
  - @effect/platform@0.91.0
  - @effect/ai@0.28.0
  - @effect/experimental@0.55.0

## 0.1.0

### Minor Changes

- [#5521](https://github.com/Effect-TS/effect/pull/5521) [`fa49bc8`](https://github.com/Effect-TS/effect/commit/fa49bc86b14599300d106f306ceaf82a79121b80) Thanks @IMax153! - Add Effect AI SDK provider integration package for OpenRouter

### Patch Changes

- [#5521](https://github.com/Effect-TS/effect/pull/5521) [`fa49bc8`](https://github.com/Effect-TS/effect/commit/fa49bc86b14599300d106f306ceaf82a79121b80) Thanks @IMax153! - Fix provider metadata and parse tool call parameters safely

- Updated dependencies [[`fa49bc8`](https://github.com/Effect-TS/effect/commit/fa49bc86b14599300d106f306ceaf82a79121b80)]:
  - @effect/ai@0.27.1
