---
"effect": patch
---

Recover tool calls which `Toolkit` never sees

A tool call naming a tool which is not in the toolkit fails the whole
operation today: the response schema has no member for it, and even if it
decoded, `Toolkit` would skip it and leave it unanswered.

`generateText` and `streamText` now accept `unknownToolCalls`. With `"return"`,
such a call comes back as a `tool-call-error` response part, and
`Prompt.fromResponseParts` adds it to history as the original tool call with a
failed tool result, so the model can correct the call on the next turn. The
default, `"error"`, is unchanged. A call which names a tool in the toolkit is
unaffected: `Toolkit` still routes a failure of its parameters through that
tool's `failureMode`.

```
const response = yield* LanguageModel.generateText({
  prompt,
  toolkit,
  unknownToolCalls: "return"
})

response.toolCallErrors // tool-call-error parts: { name, params, error }
```
