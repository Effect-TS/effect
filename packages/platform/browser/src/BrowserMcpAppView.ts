/**
 * Browser transport for `McpAppView`, the page side of MCP Apps.
 *
 * A host loads an app's HTML in a sandboxed iframe, often with an opaque
 * origin. This module connects `McpAppView` to that iframe's parent window
 * over `postMessage`, and reports the page's rendered size to the host with a
 * `ResizeObserver`, as the specification recommends.
 *
 * Host theming is left to the page: read `hostContext.styles` from
 * `McpAppView.McpAppView` and apply the CSS variables and font rules it
 * carries to the document.
 *
 * **Example** (Running a page in the browser)
 *
 * ```ts
 * import { BrowserMcpAppView } from "@effect/platform-browser"
 * import { Effect } from "effect"
 * import { McpAppView } from "effect/ai"
 *
 * const page = Effect.gen(function*() {
 *   const view = yield* McpAppView.McpAppView
 *   const result = yield* view.toolResult
 *   document.body.textContent = JSON.stringify(result.structuredContent)
 * })
 *
 * McpAppView.run(page).pipe(
 *   Effect.provide(BrowserMcpAppView.layer({ appInfo: { name: "report-view", version: "1.0.0" } })),
 *   Effect.runFork
 * )
 * ```
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as McpAppView from "effect/ai/McpAppView"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"

/**
 * The parts of a `Window` the transport and the resize reporting use.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface PageWindow {
  readonly parent: { readonly postMessage: (message: unknown, targetOrigin: string) => void }
  readonly addEventListener: (type: "message", listener: (event: PageMessageEvent) => void) => void
  readonly removeEventListener: (type: "message", listener: (event: PageMessageEvent) => void) => void
  readonly document: { readonly documentElement: Element }
  readonly ResizeObserver?: typeof ResizeObserver | undefined
}

/**
 * The parts of a `MessageEvent` the transport reads.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface PageMessageEvent {
  readonly data: unknown
  readonly source: unknown
}

/**
 * Options for {@link layer}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Options {
  readonly appInfo: McpAppView.Options["appInfo"]
  readonly appCapabilities?: McpAppView.Options["appCapabilities"]
  /**
   * The page's window, `globalThis.window` by default.
   */
  readonly window?: PageWindow | undefined
  /**
   * Whether to send `ui/notifications/size-changed` whenever the document's
   * size changes. On by default; without a `ResizeObserver` nothing is sent.
   */
  readonly autoResize?: boolean | undefined
}

/**
 * A transport over the page's parent window.
 *
 * **Details**
 *
 * Messages are posted with the `"*"` target origin, the only one that reaches
 * a host from a sandboxed iframe with an opaque origin. Incoming `message`
 * events are passed on by their `data` only when they come from the parent
 * window; any other frame with a reference to the page is ignored.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const transport = (window: PageWindow = globalThis.window): McpAppView.Transport => ({
  postMessage: (message) => window.parent.postMessage(message, "*"),
  onMessage: (listener) => {
    const onEvent = (event: PageMessageEvent) => {
      if (event.source === window.parent) listener(event.data)
    }
    window.addEventListener("message", onEvent)
    return () => window.removeEventListener("message", onEvent)
  }
})

/**
 * Creates the `McpAppView` layer for a page in the browser.
 *
 * **Details**
 *
 * Connects through {@link transport} and, unless `autoResize` is `false`,
 * observes `document.documentElement` with a `ResizeObserver`, sending its
 * content size to the host as `ui/notifications/size-changed`. The observer
 * is disconnected when the host tears the page down or the layer's scope
 * closes, whichever comes first.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const layer = (options: Options): Layer.Layer<McpAppView.McpAppView, McpAppView.HostError> => {
  const window = options.window ?? globalThis.window
  const view = McpAppView.layer({
    transport: transport(window),
    appInfo: options.appInfo,
    appCapabilities: options.appCapabilities
  })
  if (options.autoResize === false || window.ResizeObserver === undefined) return view
  const Observer = window.ResizeObserver
  const autoResize = Layer.effectDiscard(Effect.gen(function*() {
    const view = yield* McpAppView.McpAppView
    const observing = yield* Deferred.make<void>()
    // Observing runs as a page program, so a host teardown stops it like any other.
    const observation = yield* view.run(Effect.gen(function*() {
      let active = true
      const observer = yield* Effect.acquireRelease(
        Effect.sync(() =>
          new Observer((entries) => {
            const rect = entries[entries.length - 1]?.contentRect
            if (active && rect !== undefined) {
              Effect.runFork(view.sendSizeChanged({ width: rect.width, height: rect.height }))
            }
          })
        ),
        (observer) =>
          Effect.sync(() => {
            active = false
            observer.disconnect()
          })
      )
      observer.observe(window.document.documentElement)
      yield* Deferred.succeed(observing, undefined)
      return yield* Effect.never
    })).pipe(Effect.forkScoped)
    // Ready once the document is observed, or at once when a teardown came first.
    yield* Effect.raceFirst(Deferred.await(observing), Fiber.join(observation))
  }))
  return Layer.provideMerge(autoResize, view)
}
