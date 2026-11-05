import * as McpAppView from "effect/ai/McpAppView"
import * as Effect from "effect/Effect"

const transport: McpAppView.Transport = {
  postMessage: () => {},
  onMessage: () => () => {}
}

Effect.gen(function*() {
  const view = yield* McpAppView.McpAppView
  const result = yield* view.toolResult
  yield* view.sendSizeChanged({ height: result.content.length })
}).pipe(
  McpAppView.run,
  Effect.provide(McpAppView.layer({ transport, appInfo: { name: "page", version: "1.0.0" } })),
  Effect.runPromise
)
