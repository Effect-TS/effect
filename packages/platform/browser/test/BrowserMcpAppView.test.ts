import * as BrowserMcpAppView from "@effect/platform-browser/BrowserMcpAppView"
import { assert, describe, it } from "@effect/vitest"
import * as McpAppView from "effect/ai/McpAppView"
import * as Effect from "effect/Effect"

type Listener = (event: { readonly data: unknown }) => void

// A page window as a host embeds it: messages go to `parent`, replies arrive
// as `message` events, and the host answers `ui/initialize`.
const makeWindow = () => {
  const posted: Array<any> = []
  const listeners = new Set<Listener>()
  const observers: Array<{ callback: ResizeObserverCallback; disconnected: boolean; observed: unknown }> = []
  const deliver = (data: unknown) => listeners.forEach((listener) => listener({ data }))
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
})
