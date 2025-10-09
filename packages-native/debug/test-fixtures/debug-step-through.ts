/**
 * @deprecated This test fixture has been extracted into a CLI tool.
 *
 * Instead of running this file directly, use:
 *
 *   npx @effect-native/debug steps [options] <file>
 *
 * Or via package script:
 *
 *   pnpm test:debug-log-steps
 *
 * See CLI.md for full documentation.
 *
 * This file is kept for reference on how to build similar tools programmatically.
 */

import * as NodeSocket from "@effect/platform-node/NodeSocket"
import type { ChildProcess } from "child_process"
import { spawn } from "child_process"
import * as Console from "effect/Console"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { dirname, join } from "path"
import { fileURLToPath, pathToFileURL } from "url"
import { command as debugCommand, Debug, layerCdp, Transport as DebugTransport } from "../src/Debug.js"

const TARGET_FILE_NAME = "broken-simple.js"
const MAX_STEPS = 200

interface SpawnedTarget {
  readonly port: number
  readonly process: ChildProcess
  readonly filePath: string
  readonly fileUrl: string
}

const launchTarget = (): SpawnedTarget => {
  const callerPath = fileURLToPath(import.meta.url)
  const callerDir = dirname(callerPath)
  const filePath = join(callerDir, TARGET_FILE_NAME)
  const fileUrl = pathToFileURL(filePath).href

  const port = 9300 + Math.floor(Math.random() * 100)
  console.log(`🚀 Launching: node --inspect-brk=${port} ${filePath}`)

  const child = spawn("node", ["--inspect-brk=" + port, filePath], {
    stdio: ["ignore", "pipe", "pipe"]
  })

  child.stdout.on("data", (chunk) => process.stdout.write(`[target] ${chunk}`))
  child.stderr.on("data", (chunk) => process.stderr.write(`[target] ${chunk}`))

  return { port, process: child, filePath, fileUrl }
}

const fetchWebSocketUrl = async (port: number): Promise<string> => {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      const targets = (await response.json()) as Array<{ webSocketDebuggerUrl: string }>
      if (targets.length > 0) {
        return targets[0].webSocketDebuggerUrl
      }
    } catch {
      // ignore, retry after delay
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Unable to discover inspector endpoint on port ${port}`)
}

const program = Effect.gen(function*() {
  yield* Console.log("🔍 Debug Step-Through Demo")
  yield* Console.log("━".repeat(80))

  const target = launchTarget()
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      target.process.kill("SIGKILL")
    })
  )

  const wsUrl = yield* Effect.promise(() => fetchWebSocketUrl(target.port))
  yield* Console.log(`🔌 Connected to ${wsUrl}`)

  const debug = yield* Debug
  const session = yield* debug.connect({
    endpoint: wsUrl,
    transport: DebugTransport.cdp()
  })

  const scriptSources = yield* Ref.make(new Map<string, { url: string; source?: string }>())
  const stepCountRef = yield* Ref.make(0)

  const GetScriptSource = (scriptId: string) =>
    debugCommand({
      transport: DebugTransport.cdp(),
      command: "Debugger.getScriptSource",
      params: { scriptId },
      response: Schema.Struct({ scriptSource: Schema.String })
    })

  const StepOver = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Debugger.stepOver",
    response: Schema.Struct({})
  })

  const Resume = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Debugger.resume",
    response: Schema.Struct({})
  })

  const events = yield* debug.subscribe(session)
  yield* Effect.forkScoped(
    Stream.runForEach(events, (event) =>
      Effect.gen(function*() {
        if (event.method === "Debugger.scriptParsed") {
          const params = event.params as any
          const scriptId: string = params.scriptId
          const url: string = params.url ?? ""
          yield* Ref.update(scriptSources, (map) => {
            const previous = map.get(scriptId)
            map.set(scriptId, { url, source: previous?.source })
            return map
          })
          if (url === target.fileUrl) {
            const sourceResponse = yield* debug.sendCommand(session, GetScriptSource(scriptId))
            yield* Ref.update(scriptSources, (map) => {
              map.set(scriptId, { url, source: sourceResponse.scriptSource })
              return map
            })
          }
          return
        }

        if (event.method === "Debugger.paused") {
          const params = event.params as any
          const callFrames: Array<any> = params.callFrames ?? []
          if (callFrames.length === 0) {
            yield* debug.sendCommand(session, Resume)
            return
          }

          const frame = callFrames[0]
          const location = frame.location as { scriptId: string; lineNumber: number; columnNumber?: number }
          const scripts = yield* Ref.get(scriptSources)
          const entry = scripts.get(location.scriptId)

          if (!entry) {
            yield* debug.sendCommand(session, Resume)
            return
          }

          let sourceEntry = entry
          if (sourceEntry.url === target.fileUrl && sourceEntry.source === undefined) {
            const sourceResponse = yield* debug.sendCommand(session, GetScriptSource(location.scriptId))
            sourceEntry = { url: sourceEntry.url, source: sourceResponse.scriptSource }
            yield* Ref.update(scriptSources, (map) => {
              map.set(location.scriptId, sourceEntry)
              return map
            })
          }

          if (sourceEntry.url === target.fileUrl && sourceEntry.source) {
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
            const shortPath = target.filePath.split("/").pop() ?? target.filePath

            yield* Console.log(
              `[${nextStep.toString().padStart(4, " ")}] ${shortPath}:${displayLine}:${column} ${functionName}`
            )
            yield* Console.log(`      > ${lineText.trimEnd()}`)
            if (displayLine >= 98 || nextStep >= MAX_STEPS) {
              yield* Console.log("🏁 Completed stepping target script. Exiting debugger session.")
              yield* debug.sendCommand(session, Resume)
              yield* debug.disconnect(session)
              yield* Effect.sync(() => target.process.kill("SIGKILL"))
              yield* Console.log("✅ Finished stepping session")
              yield* Effect.sync(() => process.exit(0))
            } else {
              yield* Effect.fork(debug.sendCommand(session, StepOver))
            }
            return
          }

          yield* debug.sendCommand(session, Resume)
          return
        }

        if (event.method === "Debugger.resumed") {
          return
        }
      }).pipe(
        Effect.catchAll((error) =>
          Console.error(`❌ Event handler error: ${error instanceof Error ? error.message : String(error)}`)
        )
      ))
  )

  const EnableDebugger = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Debugger.enable",
    response: Schema.Struct({ debuggerId: Schema.String })
  })
  yield* debug.sendCommand(session, EnableDebugger)
  yield* Console.log("✅ Debugger enabled")

  const RunIfWaiting = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Runtime.runIfWaitingForDebugger",
    response: Schema.Struct({})
  })
  yield* debug.sendCommand(session, RunIfWaiting)
  yield* Console.log("▶️  runtime.runIfWaitingForDebugger invoked")

  const Pause = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Debugger.pause",
    response: Schema.Struct({})
  })
  yield* debug.sendCommand(session, Pause)
  yield* Console.log("⏸️  Initial pause requested")

  yield* Console.log("🔁 Stepping through code (Ctrl+C to stop)...")
  yield* Console.log("━".repeat(80))

  yield* Effect.never
})

const runnable = Effect.scoped(program).pipe(
  Effect.provide(layerCdp),
  Effect.provide(NodeSocket.layerWebSocketConstructor)
)

Effect.runPromise(runnable).catch((error) => {
  console.error("❌ Fatal error:", error)
  process.exit(1)
})
