import * as NodeSocket from "@effect/platform-node/NodeSocket"
import type * as Socket from "@effect/platform/Socket"
import { describe, expect, it } from "@effect/vitest"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as ChildProcess from "node:child_process"
import { constants as FsConstants } from "node:fs"
import * as Fs from "node:fs/promises"
import * as inspector from "node:inspector"
import * as Net from "node:net"
import * as Os from "node:os"
import * as Path from "node:path"
import { WebSocketServer } from "ws"
import { cdpCommand, command as debugCommand, Debug, layerCdp, Transport as DebugTransport } from "../src/Debug.js"
import type { Service as DebugService } from "../src/DebugModel.js"

type CloseFn = () => Promise<void>

interface TestCdpServer {
  readonly url: string
  readonly seenIds: () => ReadonlyArray<number>
  readonly close: CloseFn
}

// TODO: refactor to use @effect/rpc
const makeTestCdpServer: Effect.Effect<TestCdpServer, Error, Scope.Scope> = Effect.acquireRelease(
  Effect.async<TestCdpServer, Error>((resume) => {
    const wss = new WebSocketServer({ port: 0 })
    const seenIds: Array<number> = []

    const fail = (cause: unknown) => {
      for (const client of wss.clients) {
        client.terminate()
      }
      wss.close()
      resume(Effect.fail(cause instanceof Error ? cause : new Error(String(cause))))
    }

    wss.once("error", fail)

    wss.on("connection", (socket) => {
      socket.on("message", (raw) => {
        const text = typeof raw === "string" ? raw : raw.toString()
        const packet = JSON.parse(text) as {
          readonly id?: number
          readonly method?: string
        }
        const id = packet.id
        if (typeof id === "number") {
          seenIds.push(id)
          switch (packet.method) {
            case "Browser.getVersion": {
              socket.send(JSON.stringify({
                id,
                result: {
                  protocolVersion: "1.3",
                  product: "TestBrowser/1.0",
                  revision: "12345",
                  userAgent: "TestBrowser/1.0"
                }
              }))
              return
            }
            case "Runtime.enable": {
              socket.send(JSON.stringify({ id, result: {} }))
              socket.send(JSON.stringify({
                method: "Runtime.consoleAPICalled",
                params: {
                  type: "log",
                  args: [
                    { type: "string", value: "hello" }
                  ]
                }
              }))
              return
            }
            default: {
              socket.send(JSON.stringify({ id, result: { ack: packet.method } }))
              return
            }
          }
        }
      })
    })

    wss.on("listening", () => {
      const address = wss.address()
      if (!address || typeof address !== "object") {
        fail(new Error("Failed to acquire server address"))
        return
      }
      const { port } = address
      resume(
        Effect.succeed({
          url: `ws://127.0.0.1:${port}/devtools/page/1`,
          seenIds: () => seenIds,
          close: () =>
            new Promise<void>((resolve) => {
              for (const client of wss.clients) {
                client.terminate()
              }
              wss.close(() => resolve())
            })
        })
      )
    })
  }),
  (server) => Effect.promise(server.close)
)

const BrowserGetVersion = debugCommand({
  transport: DebugTransport.cdp(),
  command: "Browser.getVersion",
  response: Schema.Struct({
    protocolVersion: Schema.String,
    product: Schema.String,
    revision: Schema.String,
    userAgent: Schema.String
  })
})

const RuntimeEnable = debugCommand({
  transport: DebugTransport.cdp(),
  command: "Runtime.enable",
  response: Schema.Struct({})
})

const RuntimeEvaluate = debugCommand({
  transport: DebugTransport.cdp(),
  command: "Runtime.evaluate",
  params: { expression: "21 * 2" },
  response: Schema.Struct({
    result: Schema.Struct({
      type: Schema.String,
      value: Schema.optional(Schema.Number),
      description: Schema.optional(Schema.String)
    })
  })
})

const chromeBinaryCandidates: ReadonlyArray<string | undefined> = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/opt/google/chrome/google-chrome",
  "/snap/bin/chromium"
]

interface ChromeInspectorSession {
  readonly endpoint: string
  readonly targetType?: string | undefined
}

const findChromeExecutable: Effect.Effect<string, Error> = Effect.gen(function*() {
  for (const candidate of chromeBinaryCandidates) {
    if (!candidate) {
      continue
    }
    const exists = yield* Effect.matchEffect(
      Effect.tryPromise({
        try: () => Fs.access(candidate, FsConstants.X_OK),
        catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause)))
      }),
      {
        onFailure: () => Effect.succeed(false),
        onSuccess: () => Effect.succeed(true)
      }
    )
    if (exists) {
      return candidate
    }
  }
  return yield* Effect.fail(new Error("Chrome executable not found; set CHROME_PATH to override"))
})

const acquireDebuggingPort: Effect.Effect<number, Error> = Effect.async((resume) => {
  const server = Net.createServer()
  const fail = (cause: unknown) => {
    server.close()
    resume(Effect.fail(cause instanceof Error ? cause : new Error(String(cause))))
  }
  server.once("error", fail)
  server.listen(0, "127.0.0.1", () => {
    const address = server.address()
    server.close(() => {
      if (!address || typeof address !== "object") {
        resume(Effect.fail(new Error("Failed to allocate debugging port")))
        return
      }
      resume(Effect.succeed(address.port))
    })
  })
})

const fetchChromeJson = (
  port: number,
  path: string,
  init?: RequestInit
): Effect.Effect<unknown, Error> =>
  Effect.tryPromise({
    try: async () => {
      const url = `http://127.0.0.1:${port}${path}`
      const signal = init?.signal ?? AbortSignal.timeout(200)
      const response = await fetch(url, {
        ...init,
        method: init?.method ?? "GET",
        signal
      })
      if (!response.ok) {
        throw new Error(`Chrome debugger request to ${path} failed with status ${response.status}`)
      }
      return response.json() as Promise<unknown>
    },
    catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause)))
  })

const parseChromeTarget = (value: unknown): ChromeInspectorSession | undefined => {
  if (!value || typeof value !== "object") {
    return undefined
  }
  const candidate = value as {
    readonly type?: unknown
    readonly webSocketDebuggerUrl?: unknown
  }
  const endpoint = candidate.webSocketDebuggerUrl
  if (typeof endpoint !== "string") {
    return undefined
  }
  const rawType = candidate.type
  const targetType = typeof rawType === "string" ? rawType : undefined
  return { endpoint, targetType }
}

const findInspectablePage = (value: unknown): ChromeInspectorSession | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }
  for (const entry of value) {
    const target = parseChromeTarget(entry)
    if (!target) {
      continue
    }
    if (!target.targetType || target.targetType === "page" || target.targetType === "tab") {
      return target
    }
  }
  return undefined
}

const waitFor = (ms: number): Effect.Effect<void> =>
  Effect.promise(() => new Promise((resolve) => setTimeout(resolve, ms)))

const makeChromeInspectorSession = Effect.acquireRelease(
  Effect.gen(function*() {
    const chromeBinary = yield* findChromeExecutable
    const port = yield* acquireDebuggingPort
    const userDataDir = yield* Effect.tryPromise({
      try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), "uxp-chrome-")),
      catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause)))
    })

    const chrome = ChildProcess.spawn(
      chromeBinary,
      [
        `--remote-debugging-port=${port}`,
        "--remote-debugging-address=127.0.0.1",
        `--user-data-dir=${userDataDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-first-run-ui",
        "--disable-fre",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-extensions",
        "--disable-popup-blocking",
        "--disable-search-engine-choice-screen",
        "--password-store=basic",
        "--use-mock-keychain",
        "--headless=new",
        "about:blank"
      ],
      {
        stdio: "ignore"
      }
    )

    if (chrome.pid === undefined) {
      return yield* Effect.fail(new Error("Failed to spawn Chrome process"))
    }

    let spawnError: Error | undefined
    let exitCode: number | null = null
    let exitSignal: NodeJS.Signals | null = null

    chrome.once("error", (error) => {
      spawnError = error instanceof Error ? error : new Error(String(error))
    })
    chrome.once("exit", (code, signal) => {
      exitCode = code
      exitSignal = signal
    })

    const maxAttempts = 40
    const waitDelayMs = 100
    const creationLimit = 5
    let creationAttempts = 0
    let lastTargetsSummary = "none"
    let lastFailure: unknown = undefined
    let createdTargetEndpoint: string | undefined

    const { endpoint, targetType } = yield* Effect.gen(function*() {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (spawnError) {
          return yield* Effect.fail(
            new Error(`Chrome failed before debugger became ready: ${spawnError.message}`)
          )
        }
        if (exitCode !== null) {
          return yield* Effect.fail(
            new Error(
              `Chrome exited before debugger became ready (code: ${String(exitCode)}, signal: ${exitSignal ?? "none"})`
            )
          )
        }
        const result = yield* Effect.either(fetchChromeJson(port, "/json/list"))
        if (result._tag === "Right") {
          const value = result.right
          lastTargetsSummary = Array.isArray(value) ? `targets=${value.length}` : "non-array"
          const pageTarget = findInspectablePage(value)
          if (pageTarget) {
            return pageTarget
          }
          if (creationAttempts < creationLimit) {
            creationAttempts += 1
            const creation = yield* Effect.either(
              fetchChromeJson(port, `/json/new?${encodeURIComponent("about:blank")}`, {
                method: "PUT"
              })
            )
            if (creation._tag === "Right") {
              const createdTarget = parseChromeTarget(creation.right)
              if (createdTarget) {
                createdTargetEndpoint = createdTarget.endpoint
                return createdTarget
              }
            }
          }
        } else {
          lastFailure = result.left
        }

        yield* waitFor(waitDelayMs)
      }

      const failureDetailParts: Array<string> = []
      if (createdTargetEndpoint) {
        failureDetailParts.push(`last-created=${createdTargetEndpoint}`)
      }
      if (lastTargetsSummary !== "none") {
        failureDetailParts.push(lastTargetsSummary)
      }
      if (lastFailure !== undefined) {
        const rendered = lastFailure instanceof Error
          ? lastFailure.message
          : String(lastFailure)
        failureDetailParts.push(`last-error=${rendered}`)
      }
      const detail = failureDetailParts.length > 0 ? ` (${failureDetailParts.join(", ")})` : ""
      return yield* Effect.fail(new Error(`Timed out waiting for Chrome debugger target${detail}`))
    })

    return { endpoint, targetType, chrome, userDataDir }
  }),
  ({ chrome, userDataDir }) =>
    Effect.async<void, never>((resume) => {
      let completed = false
      const finish = () => {
        if (!completed) {
          completed = true
          resume(Effect.void)
        }
      }
      chrome.once("close", finish)
      chrome.once("exit", finish)
      chrome.once("error", finish)
      if (!chrome.kill("SIGTERM")) {
        finish()
      }
      setTimeout(() => {
        if (!chrome.killed) {
          chrome.kill("SIGKILL")
        }
      }, 1_000)
    }).pipe(
      Effect.zipRight(
        Effect.tryPromise({
          try: () => Fs.rm(userDataDir, { recursive: true, force: true }),
          catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause)))
        }).pipe(Effect.catchAll(() => Effect.void))
      )
    )
).pipe(Effect.map(({ endpoint, targetType }) => ({ endpoint, targetType })))

const makeNodeInspectorSession: Effect.Effect<string, Error, Scope.Scope> = Effect.acquireRelease(
  Effect.gen(function*() {
    inspector.close()
    inspector.open(0, "127.0.0.1", false)
    const url = inspector.url()
    return url ? url : yield* Effect.fail(new Error("Inspector URL unavailable"))
  }),
  () => Effect.sync(() => inspector.close())
)

const withDebugEnvironment = <A, E>(
  effect: Effect.Effect<A, E, DebugService | Socket.WebSocketConstructor>
): Effect.Effect<A, E, never> =>
  effect.pipe(
    Effect.provide(layerCdp),
    Effect.provide(NodeSocket.layerWebSocketConstructor)
  )

describe.sequential("Debug CDP connection", () => {
  it.effect("connects and fetches browser metadata", () =>
    withDebugEnvironment(
      Effect.scoped(
        Effect.gen(function*() {
          const server = yield* makeTestCdpServer
          const debug = yield* Debug
          const session = yield* debug.connect({
            endpoint: server.url,
            transport: DebugTransport.cdp()
          })
          const version = yield* debug.sendCommand(session, BrowserGetVersion)
          expect(version.product).toBe("TestBrowser/1.0")
          expect(version.userAgent).toBe("TestBrowser/1.0")
          const runtimeEnabled = yield* debug.sendCommand(session, RuntimeEnable)
          expect(runtimeEnabled).toEqual({})
          expect(server.seenIds()).toEqual([1, 2])
          yield* debug.disconnect(session)
        })
      )
    ).pipe(Effect.orDie))

  it.effect("emits protocol events via subscribe", () =>
    withDebugEnvironment(
      Effect.scoped(
        Effect.gen(function*() {
          const server = yield* makeTestCdpServer
          const debug = yield* Debug
          const session = yield* debug.connect({
            endpoint: server.url,
            transport: DebugTransport.cdp()
          })
          const events = yield* debug.subscribe(session)
          const collector = yield* Stream.take(events, 1).pipe(Stream.runCollect, Effect.forkScoped)
          yield* debug.sendCommand(session, RuntimeEnable)
          yield* Effect.yieldNow()
          const chunk = yield* Fiber.join(collector)
          const head = Chunk.head(chunk)
          expect(Option.map(head, (event) => event.method)).toEqual(Option.some("Runtime.consoleAPICalled"))
        })
      )
    ).pipe(Effect.orDie))

  it.effect("uses cdpCommand without explicit transport", () =>
    withDebugEnvironment(
      Effect.scoped(
        Effect.gen(function*() {
          const server = yield* makeTestCdpServer
          const debug = yield* Debug
          const session = yield* debug.connect({
            endpoint: server.url
          })

          // Use cdpCommand helper that reads transport from context
          const GetVersion = cdpCommand({
            command: "Browser.getVersion",
            response: Schema.Struct({
              protocolVersion: Schema.String,
              product: Schema.String,
              revision: Schema.String,
              userAgent: Schema.String
            })
          })

          const version = yield* debug.sendCommand(session, yield* GetVersion)
          expect(version.product).toBe("TestBrowser/1.0")
          expect(version.userAgent).toBe("TestBrowser/1.0")
          yield* debug.disconnect(session)
        })
      )
    ).pipe(Effect.orDie))

  it.effect("connects to Node inspector", () =>
    withDebugEnvironment(
      Effect.scoped(
        Effect.gen(function*() {
          const inspectorSession = yield* makeNodeInspectorSession
          const debug = yield* Debug
          const session = yield* debug.connect({
            endpoint: inspectorSession,
            transport: DebugTransport.cdp()
          })
          const evaluation = yield* debug.sendCommand(session, RuntimeEvaluate)
          expect(evaluation.result.type).toBe("number")
          expect(evaluation.result.value).toBe(42)
          yield* debug.disconnect(session)
        })
      )
    ).pipe(Effect.orDie))

  it.effect("connects via Node debug target discovery", () =>
    withDebugEnvironment(
      Effect.scoped(
        Effect.gen(function*() {
          const inspectorSession = yield* makeNodeInspectorSession
          const inspectorUrl = new URL(inspectorSession)
          const targets = yield* Effect.tryPromise({
            try: async () => {
              const response = await fetch(`http://${inspectorUrl.host}/json/list`)
              if (!response.ok) {
                throw new Error(`Inspector target discovery failed with status ${response.status}`)
              }
              return response.json() as Promise<unknown>
            },
            catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause)))
          })

          if (!Array.isArray(targets)) {
            return yield* Effect.fail(new Error("Inspector target list is not an array"))
          }

          const firstTarget = targets[0]

          if (firstTarget === undefined || typeof firstTarget !== "object" || firstTarget === null) {
            return yield* Effect.fail(new Error("Inspector target list is empty"))
          }

          const nodeTarget = firstTarget as { readonly type?: unknown; readonly webSocketDebuggerUrl?: unknown }
          expect(nodeTarget.type).toBe("node")

          const endpoint = nodeTarget.webSocketDebuggerUrl

          if (typeof endpoint !== "string") {
            return yield* Effect.fail(new Error("Inspector target missing webSocketDebuggerUrl"))
          }

          const debug = yield* Debug
          const session = yield* debug.connect({
            endpoint,
            transport: DebugTransport.cdp()
          })
          const evaluation = yield* debug.sendCommand(session, RuntimeEvaluate)
          expect(evaluation.result.type).toBe("number")
          expect(evaluation.result.value).toBe(42)
          yield* debug.disconnect(session)
        })
      )
    ).pipe(Effect.orDie))

  it.effect(
    "connects to Chrome remote debugging",
    () =>
      Effect.gen(function*() {
        const chromeInspector = yield* makeChromeInspectorSession
        const debug = yield* Debug
        const session = yield* debug.connect({
          endpoint: chromeInspector.endpoint,
          transport: DebugTransport.cdp()
        })
        if (chromeInspector.targetType) {
          expect(["page", "tab"]).toContain(chromeInspector.targetType)
        }
        const runtimeEnabled = yield* debug.sendCommand(session, RuntimeEnable)
        expect(runtimeEnabled).toEqual({})
        const evaluation = yield* debug.sendCommand(session, RuntimeEvaluate)
        expect(evaluation.result.type).toBe("number")
        expect(evaluation.result.value).toBe(42)
        yield* debug.disconnect(session)
      })
        .pipe(Effect.orDie, Effect.scoped, withDebugEnvironment),
    30_000
  )
})
