---
"@effect/ai-amazon-bedrock": minor
"@effect/ai-openrouter": minor
"@effect/ai-anthropic": minor
"@effect/ai-google": minor
"@effect/ai-openai": minor
"@effect/ai": minor
---

Remove `Either` / `EitherEncoded` from tool call results. 

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

program.pipe(
  Effect.provide([Anthropic, MyToolkitLayer]),
  Effect.runPromise
)
```
