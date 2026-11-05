---
"effect": patch
"@effect/platform-browser": patch
---

Add `McpAppView`, the page side of MCP Apps, and `BrowserMcpAppView` for the browser.

- `McpAppView.layer` connects a page to its host over any `postMessage`-capable transport, performs the `ui/initialize` handshake, and exposes the tool call that opened the page, the host context and the host's requests as Effect values. `McpAppView.run` interrupts the page and runs its finalizers before answering the host's `ui/resource-teardown`.
- `BrowserMcpAppView.layer` provides the window transport, with the target origin a sandboxed iframe needs, accepts only messages from the parent window, and reports the document's size to the host until teardown.
- `McpTest.makeAppHost` is an in-memory host for testing pages.

```ts
import { Effect, Schema } from "effect"
import { McpAppView, Tool } from "effect/ai"

const Report = Tool.make("Report", {
  parameters: Schema.Struct({ runId: Schema.String }),
  success: Schema.Struct({ passed: Schema.Number })
})

const page = Effect.gen(function*() {
  const view = yield* McpAppView.McpAppView
  const { passed } = yield* view.toolCall(Report).result
  const { runId } = yield* view.toolCall(Report).input
  return yield* view.callTool(Report, { runId }).pipe(Effect.map((fresh) => fresh.passed - passed))
})
```
