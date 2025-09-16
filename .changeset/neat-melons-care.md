---
"@effect/ai-amazon-bedrock": minor
"@effect/ai-anthropic": minor
"@effect/ai-google": minor
"@effect/ai-openai": minor
"@effect/ai": minor
---

Refactor the Effect AI SDK and associated provider packages

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
  prompt: Prompt.fromMessages([
    systemMessage,
    userMessage
  ])
})
```

**Raw Prompt Input**

```ts
import { LanguageModel } from "@effect/ai"

const program = LanguageModel.generateText({
  prompt: [
    { role: "system", content: "You are an expert in machine learning" },
    { role: "user", content: [{ type: "text", text: "What is machine learning?" }] }
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

const program = Effect.gen(function*() {
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

const program = Effect.gen(function*() {
  const response = yield* LanguageModel.generateText({
    prompt: "What is the meaning of life?"
  })

  for (const part of response.content) {
    // When metadata **is not** defined for a content part, accessing the
    // provider's key on the part's metadata will return an untyped record
    if (part.type === "text") {
      const metadata = part.metadata.anthropic
      //    ^? { readonly [x: string]: unknown }
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
