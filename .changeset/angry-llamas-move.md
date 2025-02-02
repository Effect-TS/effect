---
"@effect/ai": patch
---

Support non-identified schemas in `AiChat.structured` and `Completions.structured`.

Instead of requiring a `Schema` with either an `identifier` or `_tag` property
for AI APIs that allow for returning structured outputs, you can now optionally
pass a `correlationId` to `AiChat.structured` and `Completions.structured` when
you want to either use a simple schema or inline the schema.

Example:

```ts
import { Completions } from "@effect/ai"
import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai"
import { NodeHttpClient } from "@effect/platform-node"
import { Config, Effect, Layer, Schema, String } from "effect"

const OpenAi = OpenAiClient.layerConfig({
  apiKey: Config.redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(NodeHttpClient.layerUndici))

const Gpt4oCompletions = OpenAiCompletions.layer({
  model: "gpt-4o"
}).pipe(Layer.provide(OpenAi))

const program = Effect.gen(function*() {
  const completions = yield* Completions.Completions

  const CalendarEvent = Schema.Struct({
    name: Schema.String,
    date: Schema.DateFromString,
    participants: Schema.Array(Schema.String)
  })

  yield* completions.structured({
    correlationId: "CalendarEvent",
    schema: CalendarEvent,
    input: String.stripMargin(`
      |Extract event information from the following prose:
      |
      |Alice and Bob are going to a science fair on Friday.
    `)
  })
})

program.pipe(
  Effect.provide(Gpt4oCompletions),
  Effect.runPromise
)
```
