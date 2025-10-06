---
"@effect/ai-amazon-bedrock": minor
"@effect/ai": minor
---

Previously, tool call handler errors were _always_ raised as an expected error in the Effect `E` channel at the point of execution of the tool call handler (i.e. when a `generate*` method is invoked on a `LanguageModel`).

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
* If set to `"error"` (the default), errors that occur during tool call handler execution will be returned in the error channel of the calling effect
* If set to `"return"`, errors that occur during tool call handler execution will be captured and returned as part of the tool call result

### Response - Tool Result Parts

The `result` field of a `"tool-result"` part of a large language model provider response is now represented as an `Either`. 
* If the `result` is a `Left`, the `result` will be the `failure` specified in the tool call specification
* If the `result` is a `Right`, the `result` will be the `success` specified in the tool call specification

This is only relevant if the end user sets `failureMode` to `"return"`. If set to `"error"` (the default), then the `result` property will always be a `Right` with the successful result of the tool call handler.

Similarly the `encodedResult` field of a `"tool-result"` part will be represented as an `EitherEncoded`, where:
* `{ _tag: "Left", left: <failure> }` represents a tool call handler failure
* `{ _tag: "Right", right: <success> }` represents a tool call handler success

### Prompt - Tool Result Parts

The `result` field of a `"tool-result"` part of a prompt will now only accept an `EitherEncoded` as specified above.
