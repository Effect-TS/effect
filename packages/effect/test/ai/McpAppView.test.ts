import { assert, describe, it } from "@effect/vitest"
import * as McpAppView from "effect/ai/McpAppView"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import * as McpTest from "effect/ai/McpTest"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import * as TestClock from "effect/testing/TestClock"

const appInfo = { name: "test-view", version: "1.0.0" }

// The tool the page was opened for. Its schemas type both the host-delivered
// call and the calls the page makes back to the server.
const Report = Tool.make("Report", {
  parameters: Schema.Struct({ runId: Schema.String }),
  success: Schema.Struct({ passed: Schema.Number }),
  failure: Schema.Struct({ reason: Schema.String })
})

const ReportToolkit = Toolkit.make(Report)

const ReportHandlers = ReportToolkit.toLayer({
  Report: ({ runId }) =>
    runId === "ok" ? Effect.succeed({ passed: 3 }) : Effect.fail({ reason: `unknown run ${runId}` })
})

const hostInfo = { name: "test-host", version: "2.0.0" }

const view = (host: McpTest.AppHost) => McpAppView.layer({ transport: host.transport, appInfo })

const withView = <A, E, R>(host: McpTest.AppHost, program: Effect.Effect<A, E, R>) =>
  Effect.provide(program, view(host))

describe("McpAppView", () => {
  it.effect("initializes with the host and exposes what the host declared", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({
        hostInfo,
        hostCapabilities: { serverTools: {}, openLinks: {} },
        hostContext: { theme: "dark", displayMode: "inline" }
      })

      const seen = yield* withView(
        host,
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          return {
            hostInfo: view.hostInfo,
            hostCapabilities: view.hostCapabilities,
            hostContext: yield* SubscriptionRef.get(view.hostContext)
          }
        })
      )
      assert.deepStrictEqual(seen, {
        hostInfo,
        hostCapabilities: { serverTools: {}, openLinks: {} },
        hostContext: { theme: "dark", displayMode: "inline" }
      })

      const initialize = yield* Queue.take(host.requests)
      assert.strictEqual(initialize.method, "ui/initialize")
      assert.deepInclude(initialize.params, { appInfo })
      const initialized = yield* Queue.take(host.notifications)
      assert.strictEqual(initialized.method, "ui/notifications/initialized")
    }))

  it.effect("keeps host messages sent before the program reads them", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({ hostInfo })

      const seen = yield* withView(
        host,
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          // The host streams while the page is still busy elsewhere.
          yield* host.sendToolInputPartial({ runId: "o" })
          yield* host.sendToolInputPartial({ runId: "ok" })
          yield* host.sendToolInput({ runId: "ok" })
          yield* host.sendToolResult({
            content: [{ type: "text", text: "3 passed" }],
            structuredContent: { passed: 3 }
          })
          const call = view.toolCall(Report)
          return {
            partial: yield* Stream.runCollect(Stream.take(view.toolInputPartial, 2)),
            input: yield* call.input,
            result: yield* call.result
          }
        })
      )
      assert.deepStrictEqual(seen, {
        partial: [{ runId: "o" }, { runId: "ok" }],
        input: { runId: "ok" },
        result: { passed: 3 }
      })
    }))

  it.effect("fails the result when the host cancels the call", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({ hostInfo })

      const error = yield* withView(
        host,
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          yield* host.sendToolCancelled("user action")
          return yield* Effect.flip(view.toolCall(Report).result)
        })
      )
      assert.deepInclude(error, { _tag: "ToolCancelled", reason: "user action" })
    }))

  it.effect("keeps a failed tool result in the error", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({ hostInfo })
      const failed = {
        content: [{ type: "text" as const, text: "unknown run" }],
        structuredContent: { reason: "unknown run" },
        isError: true
      }

      const error = yield* withView(
        host,
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          yield* host.sendToolResult(failed)
          return yield* Effect.flip(view.toolCall(Report).result)
        })
      )
      assert(error._tag === "ToolError")
      assert.deepStrictEqual(error.result.content, failed.content)
    }))

  it.effect("merges host context changes into the current context", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({
        hostInfo,
        hostContext: { theme: "light", displayMode: "inline" }
      })

      const contexts = yield* withView(
        host,
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          const changes = yield* Stream.runCollect(Stream.take(SubscriptionRef.changes(view.hostContext), 2)).pipe(
            Effect.forkChild
          )
          yield* host.sendHostContextChanged({ theme: "dark" })
          return yield* Fiber.join(changes)
        })
      )
      assert.deepStrictEqual(contexts, [
        { theme: "light", displayMode: "inline" },
        { theme: "dark", displayMode: "inline" }
      ])
    }))

  it.effect("calls server tools through the host with the tool's schemas", () =>
    Effect.gen(function*() {
      const server = yield* McpTest.makeClient(
        McpServer.toolkit(ReportToolkit).pipe(Layer.provide(ReportHandlers)),
        { protocols: [McpProtocol.v2026_07_28] }
      )
      const host = yield* McpTest.makeAppHost({
        hostInfo,
        hostCapabilities: { serverTools: {} },
        server
      })

      const seen = yield* withView(
        host,
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          const passed = yield* view.callTool(Report, { runId: "ok" })
          const failed = yield* Effect.flip(view.callTool(Report, { runId: "missing" }))
          return { passed, failed }
        })
      )
      assert.deepStrictEqual(seen.passed, { passed: 3 })
      assert(seen.failed._tag === "ToolError")
      // A declared failure reaches the page as JSON text content, without `structuredContent`.
      assert.deepStrictEqual(seen.failed.result.content, [
        { type: "text", text: JSON.stringify({ reason: "unknown run missing" }) }
      ])

      yield* Queue.take(host.requests) // ui/initialize
      const call = yield* Queue.take(host.requests)
      assert.strictEqual(call.method, "tools/call")
      assert.deepStrictEqual(call.params, { name: "Report", arguments: { runId: "ok" } })
    }))

  it.effect("fails fast when the host lacks a capability, without sending the request", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({
        hostInfo,
        hostCapabilities: {},
        hostContext: { displayMode: "inline", availableDisplayModes: ["inline"] }
      })

      const errors = yield* withView(
        host,
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          return {
            link: yield* Effect.flip(view.openLink("https://example.com")),
            displayMode: yield* Effect.flip(view.requestDisplayMode("fullscreen"))
          }
        })
      )
      assert.deepInclude(errors.link, { _tag: "UnsupportedCapability", capability: "openLinks" })
      assert.deepInclude(errors.displayMode, { _tag: "UnsupportedCapability", capability: "availableDisplayModes" })

      yield* Queue.take(host.requests) // ui/initialize
      assert.strictEqual(yield* Queue.size(host.requests), 0)

      // A host that lists no display modes has not offered any.
      const silent = yield* McpTest.makeAppHost({ hostInfo, hostContext: {} })
      const unlisted = yield* withView(
        silent,
        Effect.flatMap(McpAppView.McpAppView, (view) => Effect.flip(view.requestDisplayMode("fullscreen")))
      )
      assert.deepInclude(unlisted, { _tag: "UnsupportedCapability", capability: "availableDisplayModes" })
      yield* Queue.take(silent.requests) // ui/initialize
      assert.strictEqual(yield* Queue.size(silent.requests), 0)
    }))

  it.effect("answers ping and rejects other host requests with method not found", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({ hostInfo })

      const seen = yield* withView(
        host,
        Effect.gen(function*() {
          yield* McpAppView.McpAppView
          return {
            ping: yield* host.request("ping", {}),
            unknown: yield* Effect.flip(host.request("ui/not-a-method", {}))
          }
        })
      )
      assert.deepStrictEqual(seen.ping, {})
      assert.deepInclude(seen.unknown, { code: -32601 })
    }))

  it.effect("interrupts the program and runs its finalizers before answering teardown", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({ hostInfo })
      const log: Array<string> = []

      yield* withView(
        host,
        Effect.gen(function*() {
          const program = Effect.gen(function*() {
            yield* Effect.addFinalizer(() =>
              Effect.sleep("1 second").pipe(Effect.andThen(Effect.sync(() => log.push("finalized"))))
            )
            return yield* Effect.never
          })
          const running = yield* Effect.forkChild(McpAppView.run(program))
          const teardown = yield* Effect.forkChild(
            host.teardown("conversation closed").pipe(Effect.tap(() => Effect.sync(() => log.push("replied"))))
          )
          yield* Effect.yieldNow
          yield* Effect.yieldNow
          // The finalizer is still sleeping, so the host must not have its answer yet.
          assert.deepStrictEqual(log, [])
          yield* TestClock.adjust("1 second")
          assert.deepStrictEqual(yield* Fiber.join(teardown), {})
          yield* Fiber.join(running)
        })
      )
      assert.deepStrictEqual(log, ["finalized", "replied"])
    }))

  it.effect("answers teardown when run alone keeps the layer alive", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({ hostInfo })

      // The documented entrypoint: the layer lives only as long as `run`.
      const running = yield* Effect.forkChild(McpAppView.run(Effect.never).pipe(Effect.provide(view(host))))
      yield* Queue.take(host.requests) // ui/initialize: the page is connected
      const teardown = yield* Effect.forkChild(host.teardown("conversation closed").pipe(Effect.timeout("1 second")))
      yield* Fiber.join(running)
      yield* TestClock.adjust("1 second")
      assert.deepStrictEqual(yield* Fiber.join(teardown), {})
    }))

  it.effect("interrupts the program when the caller of run is interrupted", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({ hostInfo })
      const log: Array<string> = []

      yield* withView(
        host,
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          const started = yield* Deferred.make<void>()
          const program = Effect.gen(function*() {
            yield* Effect.addFinalizer(() => Effect.sync(() => log.push("finalized")))
            yield* Deferred.succeed(started, undefined)
            return yield* Effect.never
          })
          const fiber = yield* Effect.forkChild(view.run(program))
          yield* Deferred.await(started)
          yield* Fiber.interrupt(fiber)
          assert.deepStrictEqual(log, ["finalized"])
        })
      )
    }))

  it.effect("sends size changes, teardown requests and downloads to the host", () =>
    Effect.gen(function*() {
      const host = yield* McpTest.makeAppHost({ hostInfo, hostCapabilities: { downloadFile: {} } })
      const contents = [{
        type: "resource" as const,
        resource: { uri: "file:///export.json", mimeType: "application/json", text: "{}" }
      }]

      yield* withView(
        host,
        Effect.gen(function*() {
          const view = yield* McpAppView.McpAppView
          yield* view.sendSizeChanged({ width: 320, height: 200 })
          yield* view.requestTeardown
          yield* view.downloadFile(contents)
        })
      )

      yield* Queue.take(host.notifications) // ui/notifications/initialized
      const sizeChanged = yield* Queue.take(host.notifications)
      assert.deepInclude(sizeChanged, {
        method: "ui/notifications/size-changed",
        params: { width: 320, height: 200 }
      })
      const requestTeardown = yield* Queue.take(host.notifications)
      assert.strictEqual(requestTeardown.method, "ui/notifications/request-teardown")

      yield* Queue.take(host.requests) // ui/initialize
      const download = yield* Queue.take(host.requests)
      assert.deepInclude(download, { method: "ui/download-file", params: { contents } })
    }))
})
