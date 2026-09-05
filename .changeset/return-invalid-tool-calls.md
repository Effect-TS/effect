---
"effect": patch
---

Recover tool calls which `Toolkit` never sees

A tool call's parameter failure is routed through the tool's `failureMode`, but
only when `Toolkit` resolves the call. Two calls never reach it: one made with
`disableToolCallResolution: true`, and one naming a tool which is not in the
toolkit. Both fail the whole operation today.

A call which names a tool in the toolkit now follows that tool's `failureMode`
even when resolution is disabled. With `"return"` it produces the same failed
`tool-result` `Toolkit` itself would have produced, rather than failing the
operation.

A call which names no tool has no declaration to decide for it, so
`generateText` and `streamText` accept `unknownToolCalls`. With `"return"`, such
a call comes back as a `tool-call-error` response part, and
`Prompt.fromResponseParts` adds it to history as a failed tool result so the
model can correct the call on the next turn. The default, `"error"`, is
unchanged.

```
const response = yield* LanguageModel.generateText({
  prompt,
  toolkit,
  unknownToolCalls: "return"
})

response.toolCallErrors // tool-call-error parts: { name, params, error }
```
