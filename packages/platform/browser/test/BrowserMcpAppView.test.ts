import * as BrowserMcpAppView from "@effect/platform-browser/BrowserMcpAppView"
import { assert, describe, it } from "@effect/vitest"
import * as McpAppView from "effect/ai/McpAppView"
import * as Effect from "effect/Effect"

type Listener = (event: { readonly data: unknown; readonly source: unknown }) => void

// A page window as a host embeds it: messages go to `parent`, replies arrive
// as `message` events from `parent`, and the host answers `ui/initialize`.
const makeWindow = () => {
  const posted: Array<any> = []
  const listeners = new Set<Listener>()
  const observers: Array<{ callback: ResizeObserverCallback; disconnected: boolean; observed: unknown }> = []
  const deliver = (data: unknown, source: unknown = window.parent) =>
    listeners.forEach((listener) => listener({ data, source }))
  const window = {
    parent: {
      postMessage(message: any, targetOrigin: string) {
        posted.push({ message, targetOrigin })
        if (message.method === "ui/initialize") {
          deliver({
            jsonrpc: "2.0",
            id: message.id,
            result: {
              protocolVersion: "2026-01-26",
              hostInfo: { name: "host", version: "1.0.0" },
              hostCapabilities: {},
              hostContext: {}
            }
          })
        }
      }
    },
    addEventListener(_type: "message", listener: Listener) {
      listeners.add(listener)
    },
    removeEventListener(_type: "message", listener: Listener) {
      listeners.delete(listener)
    },
    document: { documentElement: {} },
    ResizeObserver: class {
      readonly entry: { callback: ResizeObserverCallback; disconnected: boolean; observed: unknown }
      constructor(callback: ResizeObserverCallback) {
        this.entry = { callback, disconnected: false, observed: undefined }
        observers.push(this.entry)
      }
      observe(target: unknown) {
        this.entry.observed = target
      }
      disconnect() {
        this.entry.disconnected = true
      }
    }
  }
  return { window, posted, observers, deliver }
}

describe("BrowserMcpAppView", () => {
  it.effect("talks to the parent window with an opaque target origin and reports size changes", () =>
    Effect.gen(function*() {
      const { observers, posted, window } = makeWindow()

      yield* Effect.scoped(
        Effect.gen(function*() {
          yield* McpAppView.McpAppView
          assert.strictEqual(observers.length, 1)
          assert.strictEqual(observers[0].observed, window.document.documentElement)
          observers[0].callback(
            [{ contentRect: { width: 320, height: 200 } } as ResizeObserverEntry],
            observers[0] as unknown as ResizeObserver
          )
        }).pipe(
          Effect.provide(
            BrowserMcpAppView.layer({ appInfo: { name: "page", version: "1.0.0" }, window: window as any })
          )
        )
      )

      assert.deepStrictEqual(posted.map((entry) => entry.targetOrigin), ["*", "*", "*"])
      assert.deepStrictEqual(posted.map((entry) => entry.message.method), [
        "ui/initialize",
        "ui/notifications/initialized",
        "ui/notifications/size-changed"
      ])
      assert.deepStrictEqual(posted[2].message.params, { width: 320, height: 200 })
      // Leaving the scope stops observing.
      assert.strictEqual(observers[0].disconnected, true)
    }))

  it.effect("ignores messages that do not come from the parent window", () =>
    Effect.gen(function*() {
      const { deliver, window } = makeWindow()
      const result = (text: string) => ({
        jsonrpc: "2.0",
        method: "ui/notifications/tool-result",
        params: { content: [{ type: "text", text }] }
      })

      const content = yield* Effect.scoped(
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          // Another frame with a reference to the page forges a result first.
          deliver(result("forged"), {})
          deliver(result("host"))
          return (yield* view.toolResult).content
        }).pipe(
          Effect.provide(
            BrowserMcpAppView.layer({ appInfo: { name: "page", version: "1.0.0" }, window: window as any })
          )
        )
      )
      assert.deepStrictEqual(content, [{ type: "text", text: "host" }])
    }))

  it.effect("stops observing size when the host tears the page down", () =>
    Effect.gen(function*() {
      const { deliver, observers, posted, window } = makeWindow()
      const replied = () => posted.some((entry) => entry.message.id === "teardown" && "result" in entry.message)

      yield* Effect.scoped(
        Effect.gen(function*() {
          yield* McpAppView.McpAppView
          deliver({ jsonrpc: "2.0", id: "teardown", method: "ui/resource-teardown", params: { reason: "done" } })
          // Answering a teardown involves no timers, so a bounded number of turns is enough.
          for (let turns = 0; turns < 100 && !replied(); turns++) {
            yield* Effect.yieldNow
          }
          assert.isTrue(replied())
          assert.strictEqual(observers[0].disconnected, true)
          const sent = posted.length
          observers[0].callback(
            [{ contentRect: { width: 320, height: 200 } } as ResizeObserverEntry],
            observers[0] as unknown as ResizeObserver
          )
          assert.strictEqual(posted.length, sent)
        }).pipe(
          Effect.provide(
            BrowserMcpAppView.layer({ appInfo: { name: "page", version: "1.0.0" }, window: window as any })
          )
        )
      )
    }))
})
