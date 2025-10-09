#!/usr/bin/env node

/**
 * CLI command for stepping through Node.js scripts line-by-line using the Chrome DevTools Protocol.
 *
 * This module provides a debugger step-through utility that connects to a Node.js process via WebSocket
 * and allows step-by-step execution of code, displaying each line as it executes.
 *
 * @since 1.0.0
 */
import { Command, Options } from "@effect/cli"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

import * as Debug from "../Debug.js"

// Helper to discover WebSocket URL from HTTP endpoint
const discoverWebSocketUrl = (endpoint: string): Effect.Effect<string, Error> =>
  Effect.gen(function*() {
    // If it's already a WebSocket URL, return it as-is
    if (endpoint.startsWith("ws://") || endpoint.startsWith("wss://")) {
      return endpoint
    }

    // Convert http:// or just host:port to http://
    let httpUrl = endpoint
    if (!httpUrl.startsWith("http://") && !httpUrl.startsWith("https://")) {
      httpUrl = `http://${httpUrl}`
    }

    // Ensure /json endpoint
    if (!httpUrl.endsWith("/json")) {
      httpUrl = `${httpUrl.replace(/\/$/, "")}/json`
    }

    yield* Console.log(`🔍 Discovering WebSocket URL from ${httpUrl}...`)

    try {
      const response = yield* Effect.promise(() => fetch(httpUrl))
      if (!response.ok) {
        return yield* Effect.fail(
          new Error(`Failed to fetch ${httpUrl}: ${response.status} ${response.statusText}`)
        )
      }

      const targets = yield* Effect.promise(() => response.json() as Promise<Array<any>>)

      if (!Array.isArray(targets) || targets.length === 0) {
        return yield* Effect.fail(new Error(`No debug targets found at ${httpUrl}`))
      }

      const wsUrl = targets[0].webSocketDebuggerUrl
      if (!wsUrl || typeof wsUrl !== "string") {
        return yield* Effect.fail(new Error(`No webSocketDebuggerUrl found in response from ${httpUrl}`))
      }

      yield* Console.log(`✅ Found WebSocket URL: ${wsUrl}`)
      return wsUrl
    } catch (error) {
      return yield* Effect.fail(
        new Error(`Failed to discover WebSocket URL: ${error instanceof Error ? error.message : String(error)}`)
      )
    }
  })

const GetScriptSource = (scriptId: string) =>
  Debug.cdpCommand({
    command: "Debugger.getScriptSource",
    params: { scriptId },
    response: Schema.Struct({ scriptSource: Schema.String })
  })

const StepOver = Debug.cdpCommand({ command: "Debugger.stepOver", response: Schema.Struct({}) })
const Resume = Debug.cdpCommand({ command: "Debugger.resume", response: Schema.Struct({}) })

const EnableDebugger = Debug.cdpCommand({
  command: "Debugger.enable",
  response: Schema.Struct({ debuggerId: Schema.String })
})
const RunIfWaiting = Debug.cdpCommand({ command: "Runtime.runIfWaitingForDebugger", response: Schema.Struct({}) })
const Pause = Debug.cdpCommand({ command: "Debugger.pause", response: Schema.Struct({}) })

// Define CLI arguments and options

// Create the command
const stepsCommand = Command.make(
  "steps",
  {
    maxSteps: Options.integer("max-steps").pipe(
      Options.withDescription("Maximum number of steps to execute"),
      Options.withDefault(200)
    ),
    wsUrl: Options.text("ws-url").pipe(
      Options.withDescription("WebSocket URL or HTTP endpoint (e.g., ws://127.0.0.1:9229/... or http://127.0.0.1:9229)")
    )
  },
  Effect.fn(function*({ maxSteps, wsUrl }) {
    yield* Console.log("🔍 Debug Step-Through")
    yield* Console.log("━".repeat(80))

    // Discover WebSocket URL if HTTP endpoint was provided
    const resolvedWsUrl = yield* discoverWebSocketUrl(wsUrl)

    yield* Console.log(`🔌 Connected to ${resolvedWsUrl}`)

    const debug = yield* Debug.Debug
    const session = yield* debug.connect({ endpoint: resolvedWsUrl })

    const scriptSources = yield* Ref.make(new Map<string, { url: string; source?: string }>())
    const stepCountRef = yield* Ref.make(0)

    const events = yield* debug.subscribe(session)

    yield* Effect.forkScoped(
      Stream.runForEach(
        events,
        Effect.fn(
          function*(event) {
            if (event.method === "Debugger.scriptParsed") {
              const params = event.params as { scriptId: string; url: string }
              const scriptId: string = params.scriptId
              const url: string = params.url ?? ""

              yield* Ref.update(scriptSources, (map) => {
                const previous = map.get(scriptId)
                const entry: { url: string; source?: string } = { url }
                if (previous?.source !== undefined) {
                  entry.source = previous.source
                }
                map.set(scriptId, entry)
                return map
              })

              const sourceResponse = yield* debug.sendCommand(session, yield* GetScriptSource(scriptId))
              yield* Ref.update(scriptSources, (map) => {
                map.set(scriptId, { url, source: sourceResponse.scriptSource })
                return map
              })

              return
            }

            if (event.method === "Debugger.paused") {
              const params = event.params as { callFrames: Array<any> }
              const callFrames: Array<any> = params.callFrames ?? []
              if (callFrames.length === 0) {
                yield* debug.sendCommand(session, yield* Resume)
                return
              }

              const frame = callFrames[0]
              const location = frame.location as { scriptId: string; lineNumber: number; columnNumber?: number }
              const scripts = yield* Ref.get(scriptSources)
              const entry = scripts.get(location.scriptId)

              if (!entry) {
                yield* debug.sendCommand(session, yield* Resume)
                return
              }

              // Skip Node.js internal modules and node_modules
              if (
                entry.url.startsWith("node:") ||
                entry.url.includes("/node_modules/") ||
                entry.url.includes("\\node_modules\\")
              ) {
                yield* debug.sendCommand(session, yield* StepOver)
                return
              }

              let sourceEntry = entry
              if (sourceEntry.source === undefined) {
                const sourceResponse = yield* debug.sendCommand(session, yield* GetScriptSource(location.scriptId))
                sourceEntry = { url: sourceEntry.url, source: sourceResponse.scriptSource }
                yield* Ref.update(scriptSources, (map) => {
                  map.set(location.scriptId, sourceEntry)
                  return map
                })
              }

              if (sourceEntry.source) {
                const lines = sourceEntry.source.split(/\r?\n/)
                const zeroBasedLine = location.lineNumber ?? 0
                const lineText = lines[zeroBasedLine] ?? ""
                const column = location.columnNumber ?? 0
                const nextStep = (yield* Ref.get(stepCountRef)) + 1
                yield* Ref.set(stepCountRef, nextStep)
                const displayLine = zeroBasedLine + 1
                const functionName = frame.functionName && frame.functionName.length > 0
                  ? frame.functionName
                  : "(anonymous)"

                yield* Console.log(
                  `[${
                    nextStep.toString().padStart(4, " ")
                  }] ${sourceEntry.url}:${displayLine}:${column} ${functionName}`
                )
                yield* Console.log(`      > ${lineText.trimEnd()}`)

                if (nextStep >= maxSteps) {
                  yield* Console.log(`🏁 Reached maximum step count (${maxSteps}). Exiting debugger session.`)
                  yield* debug.sendCommand(session, yield* Resume)
                  yield* debug.disconnect(session)
                  // yield* kill
                  yield* Console.log("✅ Finished stepping session")
                  return yield* Effect.sync(() => process.exit(0))
                }
                yield* Effect.fork(debug.sendCommand(session, yield* StepOver))
                return
              }

              yield* debug.sendCommand(session, yield* Resume)
              return
            }

            if (event.method === "Debugger.resumed") {
              return
            }
          },
          Effect.catchAll((error) =>
            Console.error(`❌ Event handler error: ${error instanceof Error ? error.message : String(error)}`)
          )
        )
      )
    )

    yield* debug.sendCommand(session, yield* EnableDebugger)
    yield* Console.log("✅ Debugger enabled")

    yield* debug.sendCommand(session, yield* RunIfWaiting)
    yield* Console.log("▶️  Runtime.runIfWaitingForDebugger invoked")

    yield* debug.sendCommand(session, yield* Pause)
    yield* Console.log("⏸️  Initial pause requested")
    yield* Console.log("🔁 Stepping through code (Ctrl+C to stop)...")
    yield* Console.log("━".repeat(80))

    return yield* Effect.never
  }, Effect.scoped)
).pipe(
  Command.withDescription("Step through a Node.js script line-by-line using the debugger protocol")
)

// Run the CLI
const cli = Command.run(stepsCommand, {
  name: "Debug Steps",
  version: "0.0.0"
})

const layers = Layer.mergeAll(
  Debug.layerCdp.pipe(Layer.provide(NodeSocket.layerWebSocketConstructor)),
  NodeContext.layer
)
Effect.suspend(() => cli(process.argv)).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.provide(layers),
  (it) => it,
  NodeRuntime.runMain
)
