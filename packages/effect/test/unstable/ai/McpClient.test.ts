import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Fiber, Layer, Option, Queue, Schema, Sink, Stdio, Stream } from "effect"
import type * as Cause from "effect/Cause"
import * as McpClient from "effect/unstable/ai/McpClient"
import { CreateMessageResult, ListRootsResult, McpServerClient, Root } from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import * as Tool from "effect/unstable/ai/Tool"
import * as Toolkit from "effect/unstable/ai/Toolkit"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import { ChildProcessSpawner } from "effect/unstable/process"

const SampleTool = Tool.make("Sample", {
  description: "Asks the connected client to sample an LLM message",
  success: Schema.String,
  dependencies: [McpServerClient]
})

const ListClientRootsTool = Tool.make("ListClientRoots", {
  description: "Asks the connected client for its list of roots",
  success: Schema.Array(Schema.String),
  dependencies: [McpServerClient]
})

const SamplingAndRootsToolkit = Toolkit.make(SampleTool, ListClientRootsTool)

const SamplingAndRootsToolkitLayer = McpServer.toolkit(SamplingAndRootsToolkit).pipe(
  Layer.provideMerge(
    SamplingAndRootsToolkit.toLayer({
      Sample: () =>
        Effect.gen(function*() {
          const { getClient } = yield* McpServerClient
          const client = yield* getClient
          const result = yield* client["sampling/createMessage"]({
            messages: [{ role: "user", content: { type: "text", text: "Hello" } }],
            maxTokens: 100,
            metadata: {}
          })
          return result.model
        }).pipe(Effect.scoped, Effect.orDie),
      ListClientRoots: () =>
        Effect.gen(function*() {
          const { getClient } = yield* McpServerClient
          const client = yield* getClient
          const result = yield* client["roots/list"](undefined)
          return result.roots.map((root) => root.uri)
        }).pipe(Effect.scoped, Effect.orDie)
    })
  )
)

const EchoResource = McpServer.resource({
  uri: "file:///echo.txt",
  name: "Echo Resource",
  description: "A simple echo resource",
  mimeType: "text/plain",
  content: Effect.succeed("hello from resource")
})

const GreetPrompt = McpServer.prompt({
  name: "Greet",
  description: "Greets someone",
  parameters: {
    name: Schema.String
  },
  content: ({ name }) => Effect.succeed(`Hello, ${name}!`)
})

const AskNameTool = Tool.make("AskName", {
  description: "Asks the connected client for their name via elicitation",
  success: Schema.String,
  dependencies: [McpServerClient]
})

const AskNameToolkit = Toolkit.make(AskNameTool)

const AskNameToolkitLayer = McpServer.toolkit(AskNameToolkit).pipe(
  Layer.provideMerge(
    AskNameToolkit.toLayer({
      AskName: () =>
        McpServer.elicit({
          message: "What is your name?",
          schema: Schema.Struct({ name: Schema.String })
        }).pipe(
          Effect.map((result) => `Got name: ${result.name}`),
          Effect.catchTag("ElicitationDeclined", () => Effect.succeed("declined"))
        )
    })
  )
)

// A factory rather than a module-level constant: `Layer.build` memoizes layer
// construction keyed by the `Layer` object's identity in the ambient
// `Layer.CurrentMemoMap`, which persists across the several `it.live` bodies
// in this file (each sharing the same top-level fiber/context). Reusing the
// same `Layer` instance across tests would replay the *first* test's
// already-torn-down server instead of building a fresh one.
const makeServerLayer = () =>
  McpServer.layerStdio({ name: "TestServer", version: "1.0.0" }).pipe(
    Layer.provideMerge(Layer.mergeAll(
      EchoResource,
      GreetPrompt,
      AskNameToolkitLayer,
      SamplingAndRootsToolkitLayer
    ))
  )

/**
 * Fake `ChildProcessSpawner` that, instead of spawning a real OS process,
 * connects its `ChildProcessHandle`'s stdin/stdout to two in-memory queues
 * that are already wired to a running `McpServer.layerStdio` instance. This
 * keeps the stdio transport test deterministic and CI-fast, matching the
 * convention already established by
 * `packages/effect/test/unstable/process/ChildProcess.test.ts`.
 */
const makeFakeChildProcessHandle = Effect.fnUntraced(function*(options?: {
  /**
   * Invoked with each raw chunk the (fake) client process writes to its
   * stdout, i.e. what the server reads as its stdin - lets a test observe
   * outbound client traffic (e.g. notifications) that the server itself
   * discards without any observable side effect.
   */
  readonly onClientMessage?: (data: Uint8Array) => void
  /**
   * Rewrites each raw chunk the (fake) server process writes to its stdout,
   * i.e. what the client reads. Lets a test simulate a server responding
   * with e.g. an unsupported protocol version without reimplementing the
   * RPC/transport layers by hand.
   */
  readonly rewriteServerMessage?: (data: Uint8Array) => Uint8Array
}) {
  // `Stdio.stdout()` accepts `string | Uint8Array` (`Stdio.ts`), and the
  // `as any` casts below let the server/client's ndjson-serialized `string`
  // writes flow directly into these `Uint8Array`-typed queues unconverted -
  // so a raw item read back out may actually be a `string` at runtime.
  const toBytes = (data: Uint8Array | string): Uint8Array => typeof data === "string" ? textEncoder.encode(data) : data
  const textEncoder = new TextEncoder()

  const toServer = yield* Queue.make<Uint8Array, Cause.Done>()
  const toClient = yield* Queue.make<Uint8Array, Cause.Done>()

  const fakeStdio = Stdio.make({
    args: Effect.succeed([]),
    stdin: options?.onClientMessage
      ? Stream.tap(Stream.fromQueue(toServer), (data) => Effect.sync(() => options.onClientMessage!(toBytes(data))))
      : Stream.fromQueue(toServer),
    stdout: () => Sink.fromQueue(toClient) as any,
    stderr: () => Sink.drain
  })

  const clientStdout = options?.rewriteServerMessage
    ? Stream.map(Stream.fromQueue(toClient), (data) => options.rewriteServerMessage!(toBytes(data)))
    : Stream.fromQueue(toClient)

  const handle = ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(1),
    exitCode: Effect.never,
    isRunning: Effect.succeed(true),
    kill: () => Effect.void,
    stdin: Sink.fromQueue(toServer).pipe(Sink.mapError((e) => e as never)) as any,
    stdout: clientStdout as any,
    stderr: Stream.empty,
    all: clientStdout as any,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    unref: Effect.sync(() => Effect.void)
  })

  return { handle, fakeStdio } as const
})

/**
 * Forks the build of a `McpClient.layerStdio` layer wired to a fresh
 * `makeServerLayer()` instance over fake in-memory stdio, and returns the
 * build fiber without joining it - lets a test observe a failed build (e.g.
 * an unsupported protocol version rejection) as well as a successful one.
 */
const forkTestClientBuild = (options?: {
  readonly handlers?: McpClient.ClientCapabilityHandlers
  readonly onClientMessage?: (data: Uint8Array) => void
  readonly rewriteServerMessage?: (data: Uint8Array) => Uint8Array
}) =>
  Effect.gen(function*() {
    const { fakeStdio, handle } = yield* makeFakeChildProcessHandle({
      ...(options?.onClientMessage ? { onClientMessage: options.onClientMessage } : {}),
      ...(options?.rewriteServerMessage ? { rewriteServerMessage: options.rewriteServerMessage } : {})
    })

    // `RpcServer.makeProtocolStdio` captures `Fiber.getCurrent()` at the point
    // it is run, and interrupts that fiber once its stdin reader completes
    // (including on ordinary scope-close). Building the server layer directly
    // on this test's own fiber would let that self-interrupt tear down the
    // rest of the test; forking the build onto its own fiber isolates it, the
    // same way a real program builds this layer as (part of) its own
    // top-level `Layer.launch` fiber rather than inline in caller code.
    yield* Effect.forkChild(Layer.build(makeServerLayer().pipe(Layer.provide(Layer.succeed(Stdio.Stdio, fakeStdio)))))

    const fakeSpawnerLayer = Layer.succeed(
      ChildProcessSpawner.ChildProcessSpawner,
      ChildProcessSpawner.make(() => Effect.succeed(handle))
    )

    return yield* Effect.forkChild(Layer.build(
      McpClient.layerStdio({
        name: "TestClient",
        version: "1.0.0",
        command: "fake",
        handlers: options?.handlers
      }).pipe(
        Layer.provide(fakeSpawnerLayer)
      )
    ))
  })

const makeTestClient = (options?: {
  readonly handlers?: McpClient.ClientCapabilityHandlers
  readonly onClientMessage?: (data: Uint8Array) => void
}) =>
  Effect.gen(function*() {
    const clientBuildFiber = yield* forkTestClientBuild(options)
    const context = yield* Fiber.join(clientBuildFiber)
    return Context.get(context, McpClient.McpClient)
  })

describe("McpClient", () => {
  it.live("performs the initialize handshake automatically", () =>
    Effect.gen(function*() {
      const client = yield* makeTestClient()

      assert.strictEqual(client.serverInfo.name, "TestServer")
      assert.strictEqual(client.serverInfo.version, "1.0.0")
      assert.strictEqual(client.protocolVersion, "2025-11-25")
      assert.isTrue(Option.isNone(client.instructions))
    }).pipe(Effect.scoped))

  it.live("fails the handshake when the server responds with an unsupported protocol version", () =>
    Effect.gen(function*() {
      const textDecoder = new TextDecoder()
      const textEncoder = new TextEncoder()

      // Rewrites the real server's `initialize` response on the wire,
      // swapping its negotiated `protocolVersion` for one outside
      // `SUPPORTED_PROTOCOL_VERSIONS`, without needing to hand-roll a fake
      // RPC server: this is otherwise unreachable because the real
      // `McpServer` always normalizes to a supported version.
      const rewriteServerMessage = (data: Uint8Array): Uint8Array => {
        const text = textDecoder.decode(data)
        if (!text.includes("\"protocolVersion\"")) return data
        return textEncoder.encode(text.replace(/"protocolVersion":"[^"]*"/, "\"protocolVersion\":\"1999-01-01\""))
      }

      const clientBuildFiber = yield* forkTestClientBuild({ rewriteServerMessage })
      const error = yield* Fiber.join(clientBuildFiber).pipe(Effect.flip)

      assert.instanceOf(error, McpClient.McpClientError)
      assert.include(error.message, "Unsupported MCP protocol version")
    }).pipe(Effect.scoped))

  it.live("lists and reads resources", () =>
    Effect.gen(function*() {
      const client = yield* makeTestClient()

      const list = yield* McpClient.listResources().pipe(
        Effect.provideService(McpClient.McpClient, client)
      )
      assert.strictEqual(list.resources.length, 1)
      assert.strictEqual(list.resources[0].uri, "file:///echo.txt")

      const read = yield* McpClient.readResource({ uri: "file:///echo.txt" }).pipe(
        Effect.provideService(McpClient.McpClient, client)
      )
      assert.strictEqual(read.contents.length, 1)
      const content = read.contents[0] as { text?: string }
      assert.strictEqual(content.text, "hello from resource")
    }).pipe(Effect.scoped))

  it.live("lists prompts and gets a prompt", () =>
    Effect.gen(function*() {
      const client = yield* makeTestClient()

      const list = yield* McpClient.listPrompts().pipe(
        Effect.provideService(McpClient.McpClient, client)
      )
      assert.strictEqual(list.prompts.length, 1)
      assert.strictEqual(list.prompts[0].name, "Greet")

      const result = yield* McpClient.getPrompt({ name: "Greet", arguments: { name: "Ada" } }).pipe(
        Effect.provideService(McpClient.McpClient, client)
      )
      assert.strictEqual(result.messages.length, 1)
      assert.strictEqual((result.messages[0].content as { text?: string }).text, "Hello, Ada!")
    }).pipe(Effect.scoped))

  it.live("calls a tool that elicits input, and the client's elicitation handler responds", () =>
    Effect.gen(function*() {
      let sawMessage: string | undefined
      const client = yield* makeTestClient({
        handlers: {
          elicitation: (params) => {
            sawMessage = params.message
            return Effect.succeed({ action: "accept", content: { name: "Grace" } })
          }
        }
      })

      const result = yield* McpClient.callTool({ name: "AskName" }).pipe(
        Effect.provideService(McpClient.McpClient, client)
      )

      assert.strictEqual(sawMessage, "What is your name?")
      assert.notStrictEqual(result.isError, true)
      assert.strictEqual((result.content[0] as { text?: string }).text, JSON.stringify("Got name: Grace"))
    }).pipe(Effect.scoped))

  it.live("propagates a decline from the client's elicitation handler", () =>
    Effect.gen(function*() {
      const client = yield* makeTestClient({
        handlers: { elicitation: () => Effect.succeed({ action: "decline" }) }
      })

      const result = yield* McpClient.callTool({ name: "AskName" }).pipe(
        Effect.provideService(McpClient.McpClient, client)
      )

      assert.strictEqual((result.content[0] as { text?: string }).text, JSON.stringify("declined"))
    }).pipe(Effect.scoped))

  it.live("fails the server's elicit call when no elicitation handler is registered", () =>
    Effect.gen(function*() {
      const client = yield* makeTestClient()

      const result = yield* McpClient.callTool({ name: "AskName" }).pipe(
        Effect.provideService(McpClient.McpClient, client)
      )

      // With no `elicitation` handler registered, `McpClient` responds to the
      // server's `elicitation/create` request with an RPC-level error
      // (`MethodNotFound`) rather than hanging or crashing the connection.
      // `McpServer.elicit` turns any such failure into `ElicitationDeclined`,
      // which this fixture's tool handler catches the same way it does an
      // explicit decline, so the tool call still succeeds with "declined".
      assert.notStrictEqual(result.isError, true)
      assert.strictEqual((result.content[0] as { text?: string }).text, JSON.stringify("declined"))
    }).pipe(Effect.scoped))

  it.live("calls a tool that samples an LLM, and the client's sampling handler responds", () =>
    Effect.gen(function*() {
      let sawMaxTokens: number | undefined
      const client = yield* makeTestClient({
        handlers: {
          sampling: (params) => {
            sawMaxTokens = params.maxTokens
            return Effect.succeed(
              new CreateMessageResult({
                role: "assistant",
                content: { type: "text", text: "sampled" },
                model: "test-model"
              })
            )
          }
        }
      })

      const result = yield* McpClient.callTool({ name: "Sample" }).pipe(
        Effect.provideService(McpClient.McpClient, client)
      )

      assert.strictEqual(sawMaxTokens, 100)
      assert.notStrictEqual(result.isError, true)
      assert.strictEqual((result.content[0] as { text?: string }).text, JSON.stringify("test-model"))
    }).pipe(Effect.scoped))

  it.live("fails the server's sampling call when no sampling handler is registered", () =>
    Effect.gen(function*() {
      const client = yield* makeTestClient()

      const result = yield* McpClient.callTool({ name: "Sample" }).pipe(
        Effect.provideService(McpClient.McpClient, client)
      )

      // With no `sampling` handler registered, `McpClient` responds to the
      // server's `sampling/createMessage` request with an RPC-level error
      // (`MethodNotFound`), which surfaces as a tool error rather than
      // hanging or crashing the connection.
      assert.strictEqual(result.isError, true)
    }).pipe(Effect.scoped))

  it.live("calls a tool that lists client roots, and the client's roots handler responds", () =>
    Effect.gen(function*() {
      const client = yield* makeTestClient({
        handlers: {
          roots: {
            list: () => Effect.succeed(new ListRootsResult({ roots: [new Root({ uri: "file:///project" })] }))
          }
        }
      })

      const result = yield* McpClient.callTool({ name: "ListClientRoots" }).pipe(
        Effect.provideService(McpClient.McpClient, client)
      )

      assert.notStrictEqual(result.isError, true)
      assert.strictEqual(
        (result.content[0] as { text?: string }).text,
        JSON.stringify(["file:///project"])
      )
    }).pipe(Effect.scoped))

  it.live("forwards roots.changes stream emissions as notifications/roots/list_changed", () =>
    Effect.gen(function*() {
      const changes = yield* Queue.make<void>()
      const textDecoder = new TextDecoder()
      const seenMessages: Array<string> = []

      const client = yield* makeTestClient({
        handlers: {
          roots: {
            list: () => Effect.succeed(new ListRootsResult({ roots: [] })),
            changes: Stream.fromQueue(changes)
          }
        },
        // `McpServer` acknowledges `notifications/roots/list_changed` with
        // `Effect.void` and exposes no observable side effect, so the raw
        // bytes written to the fake child process's stdin (what the server
        // reads) are inspected directly here to confirm the notification
        // McpClient actually reaches the wire, rather than only asserting
        // that the connection stays alive afterwards.
        onClientMessage: (data) => seenMessages.push(textDecoder.decode(data))
      })

      yield* Queue.offer(changes, void 0)

      // The notification write and this `ping` both go through the same
      // serialized outbound queue (`layerProtocolPairStdio`), so waiting for
      // the `ping` response guarantees the notification was already written
      // and observed by `onClientMessage` beforehand.
      const result = yield* McpClient.ping.pipe(
        Effect.provideService(McpClient.McpClient, client)
      )
      assert.deepStrictEqual(result, {})

      assert.isTrue(seenMessages.some((message) => message.includes("notifications/roots/list_changed")))
    }).pipe(Effect.scoped))
})

describe("McpClient (HTTP transport)", () => {
  const makeHttpTestClient = (options?: {
    /**
     * Rewrites the parsed JSON body of every HTTP response the fake server
     * returns before it reaches the fetch caller - lets a test splice in an
     * extra, unrecognized-method JSON-RPC message alongside a legitimate
     * response.
     */
    readonly rewriteResponseBody?: (body: unknown) => unknown
  }) =>
    Effect.gen(function*() {
      const httpServerLayer = McpServer.layerHttp({
        name: "TestServer",
        version: "1.0.0",
        path: "/mcp"
      }).pipe(
        Layer.provideMerge(Layer.mergeAll(EchoResource, GreetPrompt))
      )
      const { dispose, handler } = HttpRouter.toWebHandler(httpServerLayer, { disableLogger: true })
      yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))

      let sessionId: string | null = null
      const customFetch: typeof fetch = async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init)
        if (sessionId) {
          request.headers.set("Mcp-Session-Id", sessionId)
        }
        const response = await handler(request)
        const newSessionId = response.headers.get("Mcp-Session-Id")
        if (newSessionId) {
          sessionId = newSessionId
        }
        if (!options?.rewriteResponseBody) {
          return response
        }
        const contentType = response.headers.get("content-type")
        const text = await response.text()
        if (text.length === 0) return new Response(text, response)
        const rewritten = options.rewriteResponseBody(JSON.parse(text))
        const headers = new Headers(response.headers)
        if (contentType) headers.set("content-type", contentType)
        return new Response(JSON.stringify(rewritten), { status: response.status, headers })
      }

      const context = yield* Layer.build(
        McpClient.layerHttp({
          name: "TestClient",
          version: "1.0.0",
          url: "http://localhost/mcp"
        }).pipe(
          Layer.provide(FetchHttpClient.layer),
          Layer.provide(Layer.succeed(FetchHttpClient.Fetch, customFetch))
        )
      )
      return Context.get(context, McpClient.McpClient)
    })

  it.effect("performs the initialize handshake and round-trips a resource over Streamable HTTP", () =>
    Effect.gen(function*() {
      const client = yield* makeHttpTestClient()

      assert.strictEqual(client.serverInfo.name, "TestServer")
      assert.strictEqual(client.protocolVersion, "2025-11-25")

      const read = yield* McpClient.readResource({ uri: "file:///echo.txt" }).pipe(
        Effect.provideService(McpClient.McpClient, client)
      )
      const content = read.contents[0] as { text?: string }
      assert.strictEqual(content.text, "hello from resource")
    }).pipe(Effect.scoped))

  it.effect(
    "ignores an unrecognized inbound method spliced into a response batch, without dropping the sibling response",
    () =>
      Effect.gen(function*() {
        // Splices an extra, unrecognized-method JSON-RPC message into every
        // response body alongside whatever the real server actually
        // returned, simulating a malformed/unsupported inbound push
        // arriving in the same batch as a legitimate response.
        const client = yield* makeHttpTestClient({
          rewriteResponseBody: (body) => {
            const rogueMessage = { jsonrpc: "2.0", method: "bogus/unrecognized", params: {} }
            return Array.isArray(body) ? [...body, rogueMessage] : [body, rogueMessage]
          }
        })

        assert.strictEqual(client.serverInfo.name, "TestServer")

        const read = yield* McpClient.readResource({ uri: "file:///echo.txt" }).pipe(
          Effect.provideService(McpClient.McpClient, client)
        )
        const content = read.contents[0] as { text?: string }
        assert.strictEqual(content.text, "hello from resource")
      }).pipe(Effect.scoped)
  )
})
