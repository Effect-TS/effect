/** @internal */
import * as Arr from "../../Array.ts"
import * as ByteSize from "../../ByteSize.ts"
import type * as Cause from "../../Cause.ts"
import * as Context from "../../Context.ts"
import * as Data from "../../Data.ts"
import * as Deferred from "../../Deferred.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Base64 from "../../encoding/Base64.ts"
import * as Sse from "../../encoding/Sse.ts"
import * as Exit from "../../Exit.ts"
import * as Fiber from "../../Fiber.ts"
import { dual, memoize } from "../../Function.ts"
import * as HttpClient from "../../http/HttpClient.ts"
import * as HttpClientError from "../../http/HttpClientError.ts"
import * as HttpClientRequest from "../../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../../http/HttpClientResponse.ts"
import * as Layer from "../../Layer.ts"
import * as Match from "../../Match.ts"
import * as MutableHashMap from "../../MutableHashMap.ts"
import * as Option from "../../Option.ts"
import { pipeArguments } from "../../Pipeable.ts"
import * as Predicate from "../../Predicate.ts"
import type * as ChildProcess from "../../process/ChildProcess.ts"
import { ChildProcessSpawner } from "../../process/ChildProcessSpawner.ts"
import * as Queue from "../../Queue.ts"
import * as Ref from "../../Ref.ts"
import type * as Rpc from "../../rpc/Rpc.ts"
import * as Schema from "../../Schema.ts"
import * as Scope from "../../Scope.ts"
import * as Semaphore from "../../Semaphore.ts"
import * as Stream from "../../Stream.ts"
import type {
  CallOptions,
  CallToolParams,
  Client,
  GetPromptParams,
  Options,
  ProtocolVersion,
  ReadResourceParams
} from "../McpClient.ts"
import type * as McpProtocol from "../McpProtocol.ts"
import * as McpSchema from "../McpSchema.ts"
import * as Tool from "../Tool.ts"
import * as Toolkit from "../Toolkit.ts"
import { McpClient, McpClientError, Transport, TransportTypeId } from "./mcpClientModels.ts"

const DEFAULT_MAX_MESSAGE_BYTES = ByteSize.mebibytes(16)
const DEFAULT_TIMEOUT = Duration.seconds(60)
const SHUTDOWN_GRACE_PERIOD = Duration.seconds(5)
const SHUTDOWN_FORCE_PERIOD = Duration.seconds(5)
const HTTP_CLOSE_TIMEOUT = Duration.seconds(5)
const MAX_CONCURRENT_REQUESTS = 64
const MAX_DISCOVERY_PAGES = 100
const MAX_DISCOVERY_ITEMS = 10_000
const SSE_FRAMING_ALLOWANCE = 7
const UNSUPPORTED_PROTOCOL_VERSION_ERROR_CODE = -32022

const decodeMessageBytes = Schema.decodeUnknownEffect(Schema.Int.check(Schema.isGreaterThan(0)))
const decodeJsonRpcError = Schema.decodeUnknownOption(McpSchema.JsonRpcResponse.members[1])
const decodeJson = Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)
const encodeJson = Schema.encodeEffect(Schema.UnknownFromJsonString)
const decodeToolArguments = Schema.decodeUnknownEffect(Schema.JsonObject)
const decodePing = Schema.decodeUnknownEffect(McpSchema.Ping.payloadSchema)
const decodeEnvelope = Schema.decodeUnknownEffect(McpSchema.JsonRpcMessage, { onExcessProperty: "error" })

// RPC groups erase schema service requirements. Restore the codec view only here;
// all values still pass the selected runtime schema before reaching callers.
const payloadCodecs = memoize((schema: Schema.Constraint): McpProtocol.PayloadCodecs => {
  const codec = schema as Schema.ConstraintCodec<unknown, unknown>

  return {
    decode: Schema.decodeUnknownEffect(codec),
    encode: Schema.encodeUnknownEffect(codec)
  }
})

const decodePayload = Effect.fnUntraced(function*(schema: Schema.Constraint, value: unknown) {
  return yield* payloadCodecs(schema).decode(value)
})
const encodePayload = Effect.fnUntraced(function*(schema: Schema.Constraint, value: unknown) {
  return yield* payloadCodecs(schema).encode(value)
})

const encodeImplementation = Schema.encodeUnknownEffect(McpSchema.Implementation)
const encodeClientCapabilities = Schema.encodeUnknownEffect(McpSchema.ClientCapabilities)
const decodeToolsPage = Schema.decodeUnknownEffect(McpSchema.ListToolsResult)
const decodeToolExecution = Schema.decodeUnknownEffect(Schema.Struct({
  taskSupport: Schema.optionalKey(Schema.Literals(["forbidden", "optional", "required"]))
}))

const decodeServerCapabilities = Schema.decodeUnknownEffect(McpSchema.ServerCapabilities)
const decodeImplementation = Schema.decodeUnknownEffect(McpSchema.Implementation)
const decodeVersionRejection = Schema.decodeUnknownOption(Schema.Struct({
  requested: Schema.Literals(["2025-11-25", "2026-07-28"]),
  supported: Schema.Array(Schema.String)
}))

export { TransportTypeId } from "./mcpClientModels.ts"

type TransportService = Transport["Service"] & {
  readonly protocol: McpProtocol.ProtocolAdapter<ProtocolVersion>
  readonly request: (
    message: McpSchema.JsonRpcRequest,
    receive: (message: unknown) => Effect.Effect<void, McpClientError>,
    tool?: McpSchema.Tool
  ) => Effect.Effect<void, McpClientError>
  readonly send: (
    message: McpSchema.JsonRpcNotification | McpSchema.JsonRpcResponse
  ) => Effect.Effect<void, McpClientError>
  readonly run: (
    receive: (message: unknown) => Effect.Effect<void, McpClientError>
  ) => Effect.Effect<never, McpClientError>
  readonly filterTools?: (
    tools: ReadonlyArray<McpSchema.Tool>
  ) => Effect.Effect<ReadonlyArray<McpSchema.Tool>, McpClientError>
}

/** @internal */
const DeadlineFailure = Context.Reference<Ref.Ref<McpClientError | undefined> | undefined>(
  "effect/ai/internal/mcpClient/DeadlineFailure",
  { defaultValue: () => undefined }
)

type State = Data.TaggedEnum<{
  Open: {}
  Failed: { readonly error: McpClientError }
  Closed: { readonly error: McpClientError }
}>

const State = Data.taggedEnum<State>()

/** @internal */
const makeSharedTransport = Effect.fnUntraced(function*(options: {
  readonly protocol: McpProtocol.ProtocolAdapter<ProtocolVersion>
  readonly write: (message: McpSchema.JsonRpcMessage) => Effect.Effect<void, McpClientError>
  readonly read: (
    receive: (message: unknown) => Effect.Effect<void, McpClientError>
  ) => Effect.Effect<void, McpClientError>
  readonly close?: Effect.Effect<void, McpClientError>
}) {
  const pending = MutableHashMap.empty<
    string | number,
    {
      readonly receive: (message: unknown) => Effect.Effect<void, McpClientError>
      readonly done: Deferred.Deferred<void, McpClientError>
      terminalSeen: boolean
    }
  >()

  const state = yield* Ref.make<State>(State.Open())

  const close = Effect.gen(function*() {
    const error = yield* Ref.modify(state, (current): readonly [McpClientError | undefined, State] => {
      return State.$match(current, {
        Open: () => {
          const error = new McpClientError({ reason: { _tag: "ClosedError", message: "MCP transport scope closed" } })
          return [error, State.Closed({ error })] as const
        },
        Failed: ({ error }) => [error, State.Closed({ error })] as const,
        Closed: (current) => [undefined, current] as const
      })
    })

    if (error === undefined) return

    for (const entry of MutableHashMap.values(pending)) yield* Deferred.fail(entry.done, error)
    MutableHashMap.clear(pending)
    yield* options.close ?? Effect.void
  })

  yield* Effect.addFinalizer(() => close.pipe(Effect.ignore))

  const transport: TransportService = {
    [TransportTypeId]: TransportTypeId,
    protocol: options.protocol,
    send: Effect.fnUntraced(function*(message) {
      const current = yield* Ref.get(state)

      if (!State.$is("Open")(current)) return yield* current.error
      yield* options.write(message)
    }),
    request: Effect.fnUntraced(function*(message, receive) {
      const current = yield* Ref.get(state)

      if (!State.$is("Open")(current)) return yield* current.error

      if (MutableHashMap.has(pending, message.id)) {
        return yield* new McpClientError({
          reason: { _tag: "ProtocolError", message: "Duplicate active MCP request id" }
        })
      }

      const done = yield* Deferred.make<void, McpClientError>()
      const entry = { receive, done, terminalSeen: false }
      MutableHashMap.set(pending, message.id, entry)
      yield* options.write(message).pipe(
        Effect.andThen(Deferred.await(done)),
        Effect.onInterrupt(Effect.fnUntraced(function*() {
          const current = yield* Ref.get(state)

          if (entry.terminalSeen || !State.$is("Open")(current) || message.method === "initialize") return
          yield* options.write({
            jsonrpc: "2.0",
            method: "notifications/cancelled",
            params: { requestId: message.id }
          }).pipe(Effect.ignore)
        })),
        Effect.ensuring(Effect.sync(() => MutableHashMap.remove(pending, message.id)))
      )
    }),
    run: Effect.fnUntraced(
      function*(receive) {
        yield* options.read(Effect.fnUntraced(function*(message: unknown) {
          const responseEntry =
            Predicate.isReadonlyObject(message) && (typeof message.id === "string" || typeof message.id === "number") &&
              !("method" in message)
              ? Option.getOrUndefined(MutableHashMap.get(pending, message.id)) :
              undefined

          const entry = responseEntry

          if (entry) entry.terminalSeen = true
          yield* (responseEntry?.receive ?? receive)(message)

          if (entry) {
            yield* Deferred.succeed(entry.done, undefined)
          }
        }))

        return yield* new McpClientError({ reason: { _tag: "TransportError", message: "MCP input closed" } })
      },
      Effect.tapError(Effect.fnUntraced(function*(error) {
        yield* Ref.update(
          state,
          State.$match({
            Open: () => State.Failed({ error }),
            Failed: (current) => current,
            Closed: (current) => current
          })
        )

        for (const entry of MutableHashMap.values(pending)) yield* Deferred.fail(entry.done, error)
      }))
    )
  }

  return transport
})

const toolRouting = (tool: McpSchema.Tool) => {
  type Path = { readonly key: string; readonly parent: Path | undefined }

  const found: Array<{ path: ReadonlyArray<string>; name: string; type: string }> = []
  const names = new Set<string>()
  const active = new WeakSet<object>()
  const completed = new WeakMap<object, boolean>()

  const stack: Array<
    { schema: unknown; path: Path | undefined; reachable: boolean; exit?: boolean; annotationCount?: number }
  > = [
    { schema: tool.inputSchema, path: undefined, reachable: true }
  ]

  while (stack.length > 0) {
    const frame = stack.pop()!
    const schema = frame.schema

    if (!record(schema)) continue

    if (frame.exit) {
      active.delete(schema)
      completed.set(schema, found.length > frame.annotationCount!)
      continue
    }

    if (active.has(schema)) return undefined

    if (completed.has(schema)) {
      if (completed.get(schema)) return undefined
      continue
    }

    active.add(schema)
    stack.push({ ...frame, exit: true, annotationCount: found.length })

    if ("x-mcp-header" in schema) {
      const name = schema["x-mcp-header"]

      if (
        !frame.reachable || !frame.path || typeof name !== "string" || !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name) ||
        names.has(name.toLowerCase()) || typeof schema.type !== "string" ||
        !["string", "integer", "boolean"].includes(schema.type)
      ) return undefined
      names.add(name.toLowerCase())
      const path: Array<string> = []

      for (let current: Path | undefined = frame.path; current; current = current.parent) path.push(current.key)
      found.push({ path: path.reverse(), name: name.toLowerCase(), type: schema.type })
    }

    for (const [keyword, value] of Object.entries(schema)) {
      Match.value({ keyword, value }).pipe(
        Match.when({
          keyword: Match.is(
            "properties",
            "patternProperties",
            "$defs",
            "definitions",
            "dependentSchemas",
            "dependencies"
          ),
          value: record
        }, ({ keyword, value }) => {
          for (const [key, child] of Object.entries(value)) {
            stack.push({
              schema: child,
              path: keyword === "properties" ? { key, parent: frame.path } : frame.path,
              reachable: frame.reachable && keyword === "properties"
            })
          }
        }),
        Match.when({
          keyword: Match.is("allOf", "anyOf", "oneOf", "prefixItems", "items"),
          value: Array.isArray
        }, ({ value }) => {
          for (const child of value) stack.push({ schema: child, path: frame.path, reachable: false })
        }),
        Match.when({
          keyword: Match.is(
            "additionalProperties",
            "unevaluatedProperties",
            "propertyNames",
            "contains",
            "items",
            "additionalItems",
            "unevaluatedItems",
            "not",
            "if",
            "then",
            "else",
            "contentSchema"
          )
        }, ({ value }) => {
          stack.push({ schema: value, path: frame.path, reachable: false })
        }),
        Match.orElse(() => {})
      )
    }
  }

  return found
}

const record = Predicate.isReadonlyObject

const matching = (value: unknown, id: string | number) => record(value) && value.id === id && !("method" in value)

const mediaType = (response: HttpClientResponse.HttpClientResponse) =>
  response.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase()

const headerValue = (value: string) =>
  /^[\t\x20-\x7e]*$/.test(value) && value.trim() === value && !(value.startsWith("=?base64?") && value.endsWith("?="))
    ? value :
    `=?base64?${Base64.encode(value)}?=`

const limit = Effect.fnUntraced(function*(value: ByteSize.Input | undefined) {
  const parsed = value === undefined ? Option.some(DEFAULT_MAX_MESSAGE_BYTES) : ByteSize.fromInput(value)

  if (Option.isNone(parsed)) {
    return yield* new McpClientError({
      reason: { _tag: "ConfigurationError", message: "maxMessageBytes must be a positive safe integer" }
    })
  }

  return yield* decodeMessageBytes(Option.getOrUndefined(ByteSize.toNumber(parsed.value))).pipe(
    Effect.mapError((cause) =>
      new McpClientError({
        reason: { _tag: "ConfigurationError", message: "maxMessageBytes must be a positive safe integer", cause }
      })
    )
  )
})

type HttpState = Data.TaggedEnum<{
  Open: { readonly session: string | undefined }
  Expired: {}
  Closed: { readonly session: string | undefined }
}>

const HttpState = Data.taggedEnum<HttpState>()

interface ActiveRequest {
  readonly done: Deferred.Deferred<void>
  fiberId: number | undefined
}

const parse = Effect.fnUntraced(function*(text: string, bytes: number) {
  if (new TextEncoder().encode(text).length > bytes) {
    return yield* new McpClientError({
      reason: { _tag: "LimitError", message: "MCP message exceeds maxMessageBytes" }
    })
  }

  return yield* decodeJson(text).pipe(
    Effect.mapError((cause) =>
      new McpClientError({ reason: { _tag: "ProtocolError", message: "Invalid MCP JSON", cause } })
    )
  )
})

const encode = Effect.fnUntraced(function*(message: McpSchema.JsonRpcMessage, bytes: number) {
  const json = yield* encodeJson(message).pipe(
    Effect.mapError((cause) =>
      new McpClientError({ reason: { _tag: "TransportError", message: "Cannot encode MCP message", cause } })
    )
  )

  const encoded = new TextEncoder().encode(json + "\n")

  if (encoded.length - 1 > bytes) {
    return yield* new McpClientError({
      reason: { _tag: "LimitError", message: "MCP message exceeds maxMessageBytes" }
    })
  }

  return encoded
})
export const stdio = Effect.fnUntraced(function*(options: {
  readonly command: ChildProcess.Command
  readonly protocol: McpProtocol.ProtocolAdapter<ProtocolVersion>
  readonly maxMessageBytes?: ByteSize.Input | undefined
}): Effect.fn.Return<TransportService, McpClientError, ChildProcessSpawner | Scope.Scope> {
  const bytes = yield* limit(options.maxMessageBytes)

  const shutdown = {
    grace: SHUTDOWN_GRACE_PERIOD,
    force: SHUTDOWN_FORCE_PERIOD
  }

  const spawner = yield* ChildProcessSpawner

  const process = yield* spawner.spawn(options.command).pipe(
    Effect.mapError((cause) =>
      new McpClientError({ reason: { _tag: "TransportError", message: "Cannot spawn MCP server", cause } })
    )
  )

  const input = yield* Queue.unbounded<Uint8Array, McpClientError | Cause.Done>()
  const writerFailure = yield* Deferred.make<never, McpClientError>()
  yield* Stream.fromQueue(input).pipe(
    Stream.run(process.stdin),
    Effect.mapError((cause) =>
      new McpClientError({ reason: { _tag: "TransportError", message: "MCP stdin failed", cause } })
    ),
    Effect.catch((error) => Deferred.fail(writerFailure, error)),
    Effect.forkScoped
  )
  yield* Stream.runDrain(process.stderr).pipe(Effect.ignore, Effect.forkScoped)
  yield* Effect.addFinalizer(() => Queue.shutdown(input))

  return yield* makeSharedTransport({
    ...options,
    close: Effect.gen(function*() {
      yield* Queue.end(input)

      const exited = yield* process.exitCode.pipe(
        Effect.timeoutOption(shutdown.grace),
        Effect.mapError((cause) =>
          new McpClientError({ reason: { _tag: "TransportError", message: "Cannot wait for MCP process", cause } })
        )
      )

      if (Option.isSome(exited)) return
      yield* process.kill({ killSignal: "SIGTERM", forceKillAfter: Duration.toMillis(shutdown.force) }).pipe(
        Effect.mapError((cause) =>
          new McpClientError({ reason: { _tag: "TransportError", message: "Cannot stop MCP process", cause } })
        )
      )
    }),
    write: Effect.fnUntraced(function*(message) {
      const data = yield* encode(message, bytes)
      yield* Queue.offer(input, data)
    }),
    read: Effect.fnUntraced(function*(receive) {
      const drained = yield* Deferred.make<void>()
      let buffered = ""
      const decoder = new TextDecoder("utf-8", { fatal: true })

      const stdout = process.stdout.pipe(
        Stream.runForEach(Effect.fnUntraced(function*(chunk) {
          const text = yield* Effect.try({
            try: () => decoder.decode(chunk, { stream: true }),
            catch: (cause) =>
              new McpClientError({ reason: { _tag: "TransportError", message: "Invalid MCP UTF-8", cause } })
          })

          buffered += text
          let newline: number

          while ((newline = buffered.indexOf("\n")) >= 0) {
            const line = buffered.slice(0, newline)
            buffered = buffered.slice(newline + 1)
            yield* receive(yield* parse(line, bytes))
          }

          if (new TextEncoder().encode(buffered).length > bytes) {
            return yield* new McpClientError({
              reason: { _tag: "LimitError", message: "MCP line exceeds maxMessageBytes" }
            })
          }
        })),
        Effect.mapError((cause) =>
          cause instanceof McpClientError
            ? cause
            : new McpClientError({ reason: { _tag: "TransportError", message: "MCP stdout failed", cause } })
        ),
        Effect.ensuring(Deferred.succeed(drained, undefined))
      )

      const exit = process.exitCode.pipe(
        Effect.mapError((cause) =>
          new McpClientError({ reason: { _tag: "TransportError", message: "MCP process wait failed", cause } })
        ),
        Effect.flatMap(Effect.fnUntraced(function*(code) {
          // Exit can precede delivery of the final stdout bytes and completion of their receiver.
          yield* Deferred.await(drained).pipe(Effect.timeoutOption(shutdown.grace))

          return yield* new McpClientError({
            reason: { _tag: "TransportError", message: `MCP process exited (${code})` }
          })
        }))
      )

      return yield* Effect.raceFirst(stdout, Effect.raceFirst(exit, Deferred.await(writerFailure)))
    })
  })
})
export const http = Effect.fnUntraced(function*(options: {
  readonly url: string | URL
  readonly protocol: McpProtocol.ProtocolAdapter<ProtocolVersion>
  readonly headers?: Readonly<Record<string, string>> | undefined
  readonly maxMessageBytes?: ByteSize.Input | undefined
}): Effect.fn.Return<TransportService, McpClientError, HttpClient.HttpClient | Scope.Scope> {
  const bytes = yield* limit(options.maxMessageBytes)
  const closeTimeout = HTTP_CLOSE_TIMEOUT
  const client = HttpClient.withScope(yield* HttpClient.HttpClient)
  const state = yield* Ref.make<HttpState>(HttpState.Open({ session: undefined }))
  const closed = yield* Deferred.make<never, McpClientError>()
  const active = new Set<ActiveRequest>()

  const owned = Effect.fnUntraced(function*<A, E, R>(effect: Effect.Effect<A, E, R>) {
    const done = yield* Deferred.make<void>()
    const entry: ActiveRequest = { done, fiberId: undefined }
    active.add(entry)

    return yield* Effect.raceFirst(
      Effect.withFiber((fiber) => {
        entry.fiberId = fiber.id

        return effect
      }),
      Deferred.await(closed)
    ).pipe(
      Effect.ensuring(
        Effect.sync(() => active.delete(entry)).pipe(Effect.andThen(Deferred.succeed(done, undefined)))
      )
    )
  })

  const modern = options.protocol.protocolVersion === "2026-07-28"

  const headers = (session: string | undefined, message?: McpSchema.JsonRpcMessage) => {
    const result: Record<string, string> = {
      ...options.headers,
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": options.protocol.protocolVersion
    }

    if (session) result["mcp-session-id"] = session

    if (modern && message && "method" in message) {
      result["mcp-method"] = message.method

      const name = message.method === "tools/call" || message.method === "prompts/get"
        ? message.params?.name
        : message.method === "resources/read"
        ? message.params?.uri
        : undefined
      if (typeof name === "string") result["mcp-name"] = headerValue(name)
    }

    return result
  }

  const httpFailure = Effect.fnUntraced(function*(
    response: HttpClientResponse.HttpClientResponse
  ) {
    const reason = {
      _tag: "HttpError" as const,
      message: `MCP HTTP status ${response.status}`,
      status: response.status,
      ...(response.headers["www-authenticate"] === undefined ? {} : {
        wwwAuthenticate: response.headers["www-authenticate"]
      }),
      ...(response.headers["retry-after"] === undefined ? {} : { retryAfter: response.headers["retry-after"] })
    }

    const deadlineFailure = yield* DeadlineFailure

    if (deadlineFailure !== undefined) yield* Ref.set(deadlineFailure, new McpClientError({ reason }))
    let remote: Extract<McpSchema.JsonRpcResponse, { readonly error: unknown }>["error"] | undefined

    if (mediaType(response) === "application/json") {
      const details = yield* Effect.gen(function*() {
        const chunks: Array<Uint8Array> = []
        let size = 0
        yield* response.stream.pipe(Stream.runForEach(Effect.fnUntraced(function*(chunk) {
          size += chunk.length

          if (size > bytes) {
            return yield* new McpClientError({
              reason: { _tag: "LimitError", message: "MCP response exceeds maxMessageBytes" }
            })
          }

          chunks.push(chunk)
        })))
        const body = new Uint8Array(size)
        let offset = 0

        for (const chunk of chunks) {
          body.set(chunk, offset)
          offset += chunk.length
        }

        const text = yield* Effect.try(() => new TextDecoder("utf-8", { fatal: true }).decode(body))
        const decoded = yield* parse(text, bytes)

        return decodeJsonRpcError(decoded)
      }).pipe(Effect.option)

      if (Option.isSome(details) && Option.isSome(details.value)) remote = details.value.value.error
    }

    return new McpClientError({
      reason: {
        ...reason,
        message: remote?.message ?? reason.message,
        ...(remote?.code === undefined ? {} : { code: remote.code }),
        ...(remote?.data === undefined ? {} : { data: remote.data })
      }
    })
  })

  const execute = Effect.fnUntraced(function*(request: HttpClientRequest.HttpClientRequest, cleanup = false) {
    const current = yield* Ref.get(state)

    if (!HttpState.$is("Open")(current) && !(cleanup && HttpState.$is("Closed")(current))) {
      return yield* new McpClientError({
        reason: {
          _tag: "ClosedError",
          message: "MCP HTTP session expired",
          sessionExpired: HttpState.$is("Expired")(current)
        }
      })
    }

    const response = yield* client.execute(request).pipe(Effect.catch((error) => {
      if (
        HttpClientError.isHttpClientError(error) && error.response !== undefined &&
        (error.response.status < 200 || error.response.status >= 300)
      ) {
        return Effect.succeed(error.response)
      }

      return Effect.fail(
        new McpClientError({
          reason: { _tag: "TransportError", message: "MCP HTTP request failed" }
        })
      )
    }))

    if (!modern && response.status === 404 && current.session) {
      yield* Ref.update(state, (current): HttpState => HttpState.$is("Open")(current) ? HttpState.Expired() : current)

      return yield* new McpClientError({
        reason: {
          _tag: "ClosedError",
          message: "MCP HTTP session expired",
          sessionExpired: true
        }
      })
    }

    if ((response.status < 200 || response.status >= 300) && !(request.method === "GET" && response.status === 405)) {
      return yield* Effect.fail(yield* httpFailure(response))
    }

    const next = response.headers["mcp-session-id"]

    if (!modern && next) {
      yield* Ref.update(
        state,
        (current): HttpState => HttpState.$is("Open")(current) ? HttpState.Open({ session: next }) : current
      )
    }

    return response
  })

  const read = Effect.fnUntraced(function*(
    response: HttpClientResponse.HttpClientResponse,
    receive: (message: unknown) => Effect.Effect<void, McpClientError>,
    request?: McpSchema.JsonRpcRequest
  ) {
    if (response.status === 202 || response.status === 204) {
      if (request) {
        return yield* new McpClientError({
          reason: { _tag: "ProtocolError", message: "MCP request received no response" }
        })
      }

      return
    }

    const terminal = yield* Ref.make(false)

    const deliver = Effect.fnUntraced(function*(message: unknown) {
      if (request && record(message) && !("method" in message) && message.id !== request.id) {
        return yield* new McpClientError({
          reason: { _tag: "ProtocolError", message: "HTTP MCP response id does not match its request" }
        })
      }

      yield* Ref.set(
        terminal,
        request !== undefined && matching(message, request.id)
      )
      yield* receive(message)
    })

    const contentType = mediaType(response)
    yield* Match.value(contentType).pipe(
      Match.when("text/event-stream", () => {
        let events: Array<Sse.Event> = []
        let prefix = ""
        let dataField = false
        let ignoredField = false

        const parser = Sse.makeParser((event) => {
          // HTTP resumption is unsupported; only data fields reach this parser.
          if (event._tag === "Event") {
            events.push(event)
          }
        }, {
          // Allow an incomplete "data: " prefix and the parser's retained newline.
          // The decoded JSON keeps its separate UTF-8 byte limit below.
          maxEventSize: bytes + SSE_FRAMING_ALLOWANCE
        })

        return response.stream.pipe(
          Stream.decodeText(),
          Stream.map((text) => text.split(/(?<=[\r\n])/)),
          Stream.flattenIterable,
          Stream.rechunk(1),
          Stream.mapEffect(Effect.fnUntraced(function*(line) {
            const ended = line.endsWith("\r") || line.endsWith("\n")
            let input: string

            if (ignoredField) {
              if (!ended) return []
              input = line.slice(-1)
              ignoredField = false
            } else if (dataField) {
              input = line

              if (ended) dataField = false
            } else {
              prefix += line

              if (!ended && "data".startsWith(prefix)) return []

              if (prefix.startsWith("data:") || prefix === "data\r" || prefix === "data\n") {
                input = prefix
                dataField = !ended
              } else if (prefix === "\r" || prefix === "\n") {
                input = prefix
              } else {
                // Metadata and comments have no JSON payload. Discard their fragments
                // while preserving their line ending for the stateful SSE parser.
                input = ended ? `:${line.slice(-1)}` : ":"
                ignoredField = !ended
              }

              prefix = ""
            }

            const error = parser.feed(input)

            if (error) {
              return yield* new McpClientError({
                reason: {
                  _tag: "LimitError",
                  message: "Pending MCP SSE event exceeds maxMessageBytes and framing allowance"
                }
              })
            }

            const parsed = events
            events = []

            return parsed
          })),
          Stream.flattenIterable,
          Stream.filter((event) => event.data !== ""),
          Stream.takeUntilEffect((event) =>
            parse(event.data, bytes).pipe(
              Effect.flatMap(deliver),
              Effect.andThen(Ref.get(terminal))
            )
          ),
          Stream.runDrain
        )
      }),
      Match.when(
        "application/json",
        Effect.fnUntraced(function*() {
          let text = ""
          let size = 0
          const decoder = new TextDecoder("utf-8", { fatal: true })
          yield* response.stream.pipe(
            Stream.runForEach(Effect.fnUntraced(function*(chunk) {
              size += chunk.length

              if (size > bytes) {
                return yield* new McpClientError({
                  reason: { _tag: "LimitError", message: "MCP response exceeds maxMessageBytes" }
                })
              }

              text += yield* Effect.try({
                try: () => decoder.decode(chunk, { stream: true }),
                catch: (cause) =>
                  new McpClientError({ reason: { _tag: "TransportError", message: "Invalid MCP UTF-8", cause } })
              })
            }))
          )

          const tail = yield* Effect.try({
            try: () => decoder.decode(),
            catch: (cause) =>
              new McpClientError({ reason: { _tag: "TransportError", message: "Invalid MCP UTF-8", cause } })
          })

          yield* deliver(yield* parse(text + tail, bytes))
        })
      ),
      Match.orElse(Effect.fnUntraced(function*() {
        return yield* new McpClientError({
          reason: { _tag: "ProtocolError", message: "Unsupported MCP response Content-Type" }
        })
      })),
      Effect.mapError((cause) =>
        cause instanceof McpClientError
          ? cause
          : new McpClientError({
            reason: {
              _tag: "TransportError",
              message: contentType === "text/event-stream" ? "MCP SSE response failed" : "Cannot read MCP response",
              cause
            }
          })
      )
    )

    if (request && !(yield* Ref.get(terminal))) {
      return yield* new McpClientError({
        reason: { _tag: "TransportError", message: "MCP response stream ended before terminal response" }
      })
    }
  })

  const post = Effect.fnUntraced(function*(
    message: McpSchema.JsonRpcMessage,
    receive: (message: unknown) => Effect.Effect<void, McpClientError>,
    request?: McpSchema.JsonRpcRequest,
    tool?: McpSchema.Tool,
    cleanup = false
  ) {
    const encoded = yield* encode(message, bytes)
    const current = yield* Ref.get(state)

    const mirrored = headers(
      HttpState.$is("Open")(current) || (cleanup && HttpState.$is("Closed")(current)) ? current.session : undefined,
      message
    )

    if (
      modern && "method" in message && message.method === "tools/call" && typeof message.params?.name === "string"
    ) {
      if (tool && tool.name !== message.params.name) {
        return yield* new McpClientError({
          reason: { _tag: "ValidationError", message: "Tool descriptor does not match tools/call name" }
        })
      }

      const descriptor = tool ? toolRouting(tool) : undefined

      if (!descriptor) {
        return yield* new McpClientError({
          reason: {
            _tag: "UnsupportedError",
            message: "HTTP tools/call requires a discovered tool definition supplied with this request"
          }
        })
      }

      for (const annotation of descriptor) {
        let value: unknown = message.params.arguments

        for (const key of annotation.path) value = record(value) ? value[key] : undefined

        if (value === undefined || value === null) continue

        if (
          typeof value !== annotation.type &&
          !(annotation.type === "integer" && typeof value === "number" && Number.isSafeInteger(value))
        ) {
          return yield* new McpClientError({
            reason: { _tag: "ValidationError", message: "Invalid MCP header parameter type" }
          })
        }

        mirrored[`mcp-param-${annotation.name}`] = headerValue(String(value))
      }
    }

    const response = yield* execute(
      HttpClientRequest.post(options.url).pipe(
        HttpClientRequest.setHeaders(mirrored),
        HttpClientRequest.bodyUint8Array(encoded.subarray(0, -1), "application/json")
      ),
      cleanup
    )

    yield* read(response, receive, request)
  }, Effect.scoped)

  const close = Effect.withFiber(Effect.fnUntraced(function*(fiber) {
    const previous = yield* Ref.modify(state, (current): readonly [HttpState, HttpState] => [
      current,
      HttpState.$is("Closed")(current) ?
        current :
        HttpState.Closed({ session: HttpState.$is("Open")(current) ? current.session : undefined })
    ])

    if (HttpState.$is("Closed")(previous)) return
    yield* Deferred.fail(
      closed,
      new McpClientError({ reason: { _tag: "ClosedError", message: "MCP HTTP transport closed" } })
    )
    yield* Effect.forEach(
      Array.from(active).filter((entry) => entry.fiberId !== fiber.id),
      (entry) => Deferred.await(entry.done),
      { discard: true }
    )

    if (!HttpState.$is("Open")(previous) || previous.session === undefined) return
    yield* Effect.scoped(
      client.execute(
        HttpClientRequest.make("DELETE")(options.url).pipe(
          HttpClientRequest.setHeaders(headers(previous.session))
        )
      )
    ).pipe(Effect.timeoutOption(closeTimeout), Effect.ignore)
  })).pipe(Effect.uninterruptible)

  yield* Effect.addFinalizer(() => close)

  return {
    [TransportTypeId]: TransportTypeId,
    protocol: options.protocol,
    request: Effect.fnUntraced(function*(message, receive, tool) {
      let terminalSeen = false
      yield* post(
        message,
        Effect.fnUntraced(function*(received) {
          if (matching(received, message.id)) terminalSeen = true
          yield* receive(received)
        }),
        message,
        tool
      ).pipe(
        Effect.onInterrupt(Effect.fnUntraced(function*() {
          if (modern || terminalSeen || message.method === "initialize") return
          yield* post(
            {
              jsonrpc: "2.0",
              method: "notifications/cancelled",
              params: { requestId: message.id }
            },
            () => Effect.void,
            undefined,
            undefined,
            true
          ).pipe(Effect.timeoutOption(closeTimeout), Effect.ignore)
        }))
      )
    }, owned),
    send: Effect.fnUntraced(function*(message) {
      if (modern && !("method" in message)) {
        return yield* new McpClientError({
          reason: { _tag: "ProtocolError", message: "Modern HTTP does not accept reverse responses" }
        })
      }

      yield* owned(post(message, () => Effect.void))
    }),
    run: Effect.fnUntraced(function*() {
      return yield* Effect.never
    }),
    filterTools: Effect.fnUntraced(function*(tools) {
      return modern ? Arr.filter(tools, (tool) => toolRouting(tool) !== undefined) : tools
    })
  }
})
export const layerStdio = (options: Options & Parameters<typeof stdio>[0]): Layer.Layer<
  McpClient,
  McpClientError,
  ChildProcessSpawner
> => layer(options).pipe(Layer.provide(Layer.effect(Transport)(stdio(options))))
export const layerHttp = (options: Options & Parameters<typeof http>[0]): Layer.Layer<
  McpClient,
  McpClientError,
  HttpClient.HttpClient
> => layer(options).pipe(Layer.provide(Layer.effect(Transport)(http(options))))

type Protocol = McpProtocol.ProtocolAdapter<ProtocolVersion>

const payloadRecord = (value: unknown): Record<string, unknown> => Predicate.isReadonlyObject(value) ? value : {}

const getRequestRpc = (protocol: Protocol, method: string): Rpc.AnyWithProps | undefined => {
  if (method.startsWith("tasks/") || protocol.clientNotificationRpcs.requests.has(method)) return undefined

  return protocol.clientRpcs.requests.get(method) as Rpc.AnyWithProps | undefined
}

/** @internal */
const encodeProtocolRequest = Effect.fnUntraced(
  function*(
    protocol: Protocol,
    method: string,
    params: unknown,
    clientInfo: McpSchema.Implementation,
    capabilities: McpSchema.ClientCapabilities
  ) {
    const rpc = getRequestRpc(protocol, method)

    if (rpc === undefined) {
      return yield* new McpClientError({
        reason: { _tag: "UnsupportedError", message: `Unsupported MCP method: ${method}` }
      })
    }

    if (payloadRecord(params).task !== undefined) {
      return yield* new McpClientError({
        reason: { _tag: "UnsupportedError", message: "Unsupported MCP method: tasks" }
      })
    }

    const input = protocol.protocolVersion === "2026-07-28" ?
      {
        ...payloadRecord(params),
        _meta: {
          ...payloadRecord(payloadRecord(params)._meta),
          "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
          "io.modelcontextprotocol/clientInfo": yield* encodeImplementation(clientInfo),
          "io.modelcontextprotocol/clientCapabilities": yield* encodeClientCapabilities(capabilities)
        }
      } :
      params

    const payload = yield* decodePayload(rpc.payloadSchema, input)

    return yield* encodePayload(rpc.payloadSchema, payload)
  },
  Effect.mapError((cause) =>
    Schema.isSchemaError(cause)
      ? new McpClientError({ reason: { _tag: "ValidationError", message: "Invalid MCP payload", cause } })
      : cause
  )
)

/** @internal */
const decodeProtocolResult = Effect.fnUntraced(
  function*(
    protocol: Protocol,
    method: string,
    value: unknown
  ) {
    const rpc = getRequestRpc(protocol, method)

    if (rpc === undefined) {
      return yield* new McpClientError({
        reason: { _tag: "UnsupportedError", message: `Unsupported MCP method: ${method}` }
      })
    }

    // Older peers can omit the complete discriminator. Keep server encoding strict
    // while applying the protocol's compatibility default at the client boundary.
    const input =
      protocol.protocolVersion === "2026-07-28" && Predicate.isReadonlyObject(value) && value.resultType === undefined
        ? { ...payloadRecord(value), resultType: "complete" }
        : value

    const validated = yield* decodePayload(rpc.successSchema, input)

    if (protocol.protocolVersion === "2026-07-28" && payloadRecord(value).resultType === "input_required") {
      return yield* new McpClientError({
        reason: { _tag: "UnsupportedError", message: "MCP input continuation is not supported" }
      })
    }

    if (payloadRecord(value).task !== undefined || payloadRecord(value).taskId !== undefined) {
      return yield* new McpClientError({
        reason: { _tag: "UnsupportedError", message: "Unsupported MCP method: tasks" }
      })
    }

    if (method === "initialize" || method === "server/discover") return validated

    const publicRpc = McpSchema.ClientRequestRpcs.requests.get(method)

    if (publicRpc === undefined) return validated

    if (method !== "tools/list") return yield* decodePayload(publicRpc.successSchema, value)
    const normalized = yield* decodeToolsPage(value)

    const tools = payloadRecord(value).tools

    if (Array.isArray(tools)) {
      for (const tool of tools) {
        if (payloadRecord(tool).execution !== undefined) {
          yield* decodeToolExecution(payloadRecord(tool).execution)
        }
      }
    }

    return {
      ...normalized,
      tools: normalized.tools.map((tool, index) => ({
        ...tool,
        ...(Array.isArray(tools) && payloadRecord(tools[index]).execution !== undefined
          ? { execution: payloadRecord(tools[index]).execution }
          : {})
      }))
    }
  },
  Effect.mapError((cause) =>
    Schema.isSchemaError(cause)
      ? new McpClientError({ reason: { _tag: "ValidationError", message: "Invalid MCP payload", cause } })
      : cause
  )
)

const unsupported = (message: string, result?: McpSchema.CallToolResult) =>
  new McpClientError({ reason: { _tag: "UnsupportedError", message, ...(result === undefined ? {} : { result }) } })

const toText = Effect.fnUntraced(function*(result: McpSchema.CallToolResult) {
  const parts: Array<string> = []

  for (const block of result.content) {
    yield* Match.value(block).pipe(
      Match.when({ type: "text" }, (block) =>
        Effect.sync(() => {
          parts.push(block.text)
        })),
      Match.when({ type: "resource_link" }, (block) =>
        Effect.sync(() => {
          parts.push(
            `${block.title ?? block.name}: ${block.uri}${
              block.description === undefined ? "" : `\n${block.description}`
            }`
          )
        })),
      Match.when({ type: "resource" }, (block) =>
        Match.value(block.resource).pipe(
          Match.when({ text: Match.string }, (resource) =>
            Effect.sync(() => {
              parts.push(resource.text)
            })),
          Match.orElse(() =>
            Effect.fail(unsupported("MCP binary resources require an application text converter", result))
          )
        )),
      Match.when(
        { type: Match.is("image", "audio") },
        (block) => Effect.fail(unsupported(`MCP ${block.type} content requires an application text converter`, result))
      ),
      Match.exhaustive
    )
  }

  if (parts.length === 0 && result.structuredContent !== undefined) {
    return yield* encodeJson(result.structuredContent).pipe(
      Effect.mapError((cause) =>
        new McpClientError({
          reason: { _tag: "ValidationError", message: "Cannot encode MCP structured content", cause }
        })
      )
    )
  }

  return parts.join("\n")
})
export const toolkit = Effect.fnUntraced(function*(client: Client, prefix = "") {
  const descriptors = yield* client.listTools()
  const tools: Array<
    Tool.Tool<string, {
      readonly parameters: typeof Schema.Unknown
      readonly success: typeof Schema.String
      readonly failure: typeof McpClientError
      readonly failureMode: "error"
    }>
  > = []
  const handlers: Record<string, (params: unknown) => Effect.Effect<string, McpClientError>> = Object.create(null)

  for (const descriptor of descriptors) {
    const name = `${prefix}${descriptor.name}`
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name) || Object.hasOwn(handlers, name)) {
      return yield* new McpClientError({
        reason: { _tag: "ConfigurationError", message: `Invalid or duplicate MCP model tool name: ${name}` }
      })
    }
    tools.push(
      Tool.dynamic(name, {
        parameters: descriptor.inputSchema,
        description: descriptor.description,
        success: Schema.String,
        failure: McpClientError
      }).annotate(Tool.Strict, false)
    )
    handlers[name] = Effect.fnUntraced(function*(params: unknown) {
      const arguments_ = yield* decodeToolArguments(params).pipe(
        Effect.mapError((cause) =>
          new McpClientError({
            reason: { _tag: "ValidationError", message: "MCP tool arguments must be a JSON object", cause }
          })
        )
      )
      const result = yield* client.callTool({ tool: descriptor, arguments: arguments_ })
      if (result.isError === true) {
        return yield* new McpClientError({
          reason: { _tag: "ToolError", message: "MCP tool reported an execution error", result }
        })
      }
      return yield* toText(result)
    })
  }

  const toolkit = Toolkit.make(...tools)
  return yield* toolkit.pipe(Effect.provideContext(yield* toolkit.toHandlers(handlers)))
})

export const TypeId = "~effect/ai/McpClient" as const
export const isClient = (value: unknown): value is Client => Predicate.hasProperty(value, TypeId)
export const callTool: {
  (
    params: CallToolParams,
    options?: CallOptions
  ): (self: Client) => Effect.Effect<McpSchema.CallToolResult, McpClientError>
  (self: Client, params: CallToolParams, options?: CallOptions): Effect.Effect<McpSchema.CallToolResult, McpClientError>
  <S extends Schema.Top>(
    params: CallToolParams<S> & { readonly schema: S },
    options?: CallOptions
  ): (self: Client) => Effect.Effect<S["Type"], McpClientError, S["DecodingServices"]>
  <S extends Schema.Top = never>(
    params: CallToolParams<S>,
    options?: CallOptions
  ): (self: Client) => Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]>
  <S extends Schema.Top>(
    self: Client,
    params: CallToolParams<S> & { readonly schema: S },
    options?: CallOptions
  ): Effect.Effect<S["Type"], McpClientError, S["DecodingServices"]>
  <S extends Schema.Top = never>(
    self: Client,
    params: CallToolParams<S>,
    options?: CallOptions
  ): Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]>
} = dual(
  (args) => isClient(args[0]),
  Effect.fnUntraced(function*<S extends Schema.Top = never>(
    self: Client,
    params: CallToolParams<S>,
    options?: CallOptions
  ) {
    return yield* self.callTool(params, options)
  })
)

export const listPrompts: {
  (options?: CallOptions): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
  (self: Client, options?: CallOptions): Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
} = dual(
  (args) => isClient(args[0]),
  Effect.fnUntraced(function*(self: Client, options?: CallOptions) {
    return yield* self.listPrompts(options)
  })
)

export const getPrompt: {
  (
    params: GetPromptParams,
    options?: CallOptions
  ): (self: Client) => Effect.Effect<McpSchema.GetPromptResult, McpClientError>
  (
    self: Client,
    params: GetPromptParams,
    options?: CallOptions
  ): Effect.Effect<McpSchema.GetPromptResult, McpClientError>
} = dual(
  (args) => isClient(args[0]),
  Effect.fnUntraced(function*(self: Client, params: GetPromptParams, options?: CallOptions) {
    return yield* self.getPrompt(params, options)
  })
)

export const listResources: {
  (options?: CallOptions): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
  (self: Client, options?: CallOptions): Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
} = dual(
  (args) => isClient(args[0]),
  Effect.fnUntraced(function*(self: Client, options?: CallOptions) {
    return yield* self.listResources(options)
  })
)

export const readResource: {
  (
    params: ReadResourceParams,
    options?: CallOptions
  ): (self: Client) => Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
  (
    self: Client,
    params: ReadResourceParams,
    options?: CallOptions
  ): Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
} = dual(
  (args) => isClient(args[0]),
  Effect.fnUntraced(function*(self: Client, params: ReadResourceParams, options?: CallOptions) {
    return yield* self.readResource(params, options)
  })
)

const validateTimeout = Effect.fnUntraced(function*(input: Duration.Input) {
  const duration = Option.getOrUndefined(Duration.fromInput(input))
  const millis = duration === undefined ? NaN : Duration.toMillis(duration)

  if (duration === undefined || !Number.isFinite(millis) || millis <= 0) {
    return yield* new McpClientError({
      reason: { _tag: "ConfigurationError", message: "Timeout must be a positive finite duration" }
    })
  }

  return duration
})

export const make = Effect.fnUntraced(function*(options: Options): Effect.fn.Return<
  Client,
  McpClientError,
  Scope.Scope | Transport
> {
  const transport = (yield* Transport) as TransportService
  const parentScope = yield* Scope.Scope
  const scope = yield* Scope.fork(parentScope)

  return yield* connectClient(options, transport, scope).pipe(
    Effect.onExit((exit) => Exit.isFailure(exit) ? Scope.close(scope, exit) : Effect.void)
  )
})

const connectClient = Effect.fnUntraced(function*(
  options: Options,
  transport: TransportService,
  scope: Scope.Scope
): Effect.fn.Return<Client, McpClientError, Scope.Scope> {
  const protocol = transport.protocol

  const version = protocol.protocolVersion

  const timeout = yield* validateTimeout(options.timeout ?? DEFAULT_TIMEOUT)
  const capabilities = McpSchema.ClientCapabilities.make({})

  const shutdown = yield* Deferred.make<never, McpClientError>()
  const closed = yield* Ref.make<McpClientError | undefined>(undefined)
  const nextId = yield* Ref.make(1)
  const capabilitiesRef = yield* Ref.make(McpSchema.ServerCapabilities.make({}))

  const pending = MutableHashMap.empty<
    McpSchema.RequestId,
    { method: string; response: Deferred.Deferred<unknown, McpClientError> }
  >()

  const permits = Semaphore.makeUnsafe(MAX_CONCURRENT_REQUESTS)

  const assertOpen = Effect.gen(function*() {
    const error = yield* Ref.get(closed)

    if (error) return yield* error
  })

  const close = Effect.fnUntraced(function*(error: McpClientError) {
    const claimed = yield* Ref.modify(
      closed,
      (current) => current === undefined ? [true, error] as const : [false, current] as const
    )

    if (!claimed) return

    for (const entry of MutableHashMap.values(pending)) yield* Deferred.fail(entry.response, error)
    MutableHashMap.clear(pending)

    yield* Deferred.fail(shutdown, error)
  })

  yield* Scope.addFinalizer(
    scope,
    close(new McpClientError({ reason: { _tag: "ClosedError", message: "MCP client scope closed" } }))
  )

  const receive = Effect.fnUntraced(function*(input: unknown) {
    const message = yield* decodeEnvelope(input).pipe(
      Effect.mapError((cause) =>
        new McpClientError({
          reason: { _tag: "ProtocolError", message: "Invalid JSON-RPC message", cause }
        })
      )
    )

    if ("method" in message) {
      if ("id" in message) {
        if (version !== "2025-11-25") {
          return yield* new McpClientError({
            reason: { _tag: "ProtocolError", message: "Modern MCP servers cannot initiate JSON-RPC requests" }
          })
        }

        if (message.method === "ping") {
          yield* decodePing(message.params).pipe(
            Effect.matchEffect({
              onSuccess: () => transport.send({ jsonrpc: "2.0", id: message.id, result: {} }),
              onFailure: () =>
                transport.send({
                  jsonrpc: "2.0",
                  id: message.id,
                  error: { code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Invalid ping parameters" }
                })
            })
          )
        } else {
          yield* transport.send({
            jsonrpc: "2.0",
            id: message.id,
            error: { code: McpSchema.METHOD_NOT_FOUND_ERROR_CODE, message: `Unsupported MCP method: ${message.method}` }
          })
        }
      }

      return
    }

    if (message.id === null) {
      return yield* new McpClientError({
        reason: { _tag: "ProtocolError", message: "Server returned an uncorrelated JSON-RPC error" }
      })
    }

    const entry = Option.getOrUndefined(MutableHashMap.get(pending, message.id))

    if (!entry) return

    if ("error" in message) {
      yield* Deferred.fail(
        entry.response,
        new McpClientError({ reason: { _tag: "ProtocolError", ...message.error } })
      )
    } else {
      yield* Deferred.complete(entry.response, decodeProtocolResult(protocol, entry.method, message.result))
    }
  })

  yield* transport.run(receive).pipe(
    Effect.catch((error) => close(error)),
    Effect.onExit((exit) =>
      Exit.isFailure(exit)
        ? close(new McpClientError({ reason: { _tag: "ClosedError", message: "MCP reader stopped" } }))
        : Effect.void
    ),
    Effect.forkIn(scope)
  )

  const exchange = Effect.fnUntraced(function*(method: string, params: unknown, tool?: McpSchema.Tool) {
    yield* assertOpen
    const id = yield* Ref.getAndUpdate(nextId, (id) => id + 1)
    // The selected RPC schema validates JSON encoding, but the adapter erases its encoded type.
    const payload = yield* encodeProtocolRequest(protocol, method, params, options.clientInfo, capabilities)
    const response = yield* Deferred.make<unknown, McpClientError>()
    const entry = { method, response }
    MutableHashMap.set(pending, id, entry)

    return yield* Effect.gen(function*() {
      const sending = yield* transport.request(
        {
          jsonrpc: "2.0",
          id,
          method,
          params: payload as Schema.JsonObject
        },
        receive,
        tool
      ).pipe(
        Effect.catch((error) => error.reason._tag === "ClosedError" ? close(error) : Deferred.fail(response, error)),
        Effect.onExit((exit) =>
          Exit.isFailure(exit)
            ? Deferred.fail(
              response,
              new McpClientError({
                reason: { _tag: "ClosedError", message: "MCP request transport stopped" }
              })
            )
            : Effect.void
        ),
        Effect.forkScoped
      )

      const result = yield* Deferred.await(response)
      yield* Fiber.join(sending)

      return result
    }).pipe(
      Effect.scoped,
      Effect.ensuring(Effect.sync(() => MutableHashMap.remove(pending, id)))
    )
  })

  const ensureCapability = Effect.fnUntraced(function*(method: string) {
    const serverCapabilities = yield* Ref.get(capabilitiesRef)

    const capability = Match.value(method).pipe(
      Match.when((method) => method.startsWith("tools/"), () => "tools" as const),
      Match.when((method) => method.startsWith("prompts/"), () => "prompts" as const),
      Match.when((method) => method.startsWith("resources/"), () => "resources" as const),
      Match.orElse(() => undefined)
    )
    if (capability !== undefined && serverCapabilities[capability] === undefined) {
      return yield* new McpClientError({
        reason: { _tag: "UnsupportedError", message: `Server does not advertise ${capability}` }
      })
    }
  })

  let initialized = false

  const runOperation = Effect.fnUntraced(
    function*(method: string, params: unknown, tool?: McpSchema.Tool) {
      yield* ensureCapability(method)
      return yield* exchange(method, params ?? {}, tool).pipe(
        Effect.catch((error) =>
          Match.value(error.reason).pipe(
            Match.tag(
              "ProtocolError",
              "HttpError",
              Effect.fnUntraced(function*(reason) {
                const rejection = decodeVersionRejection(reason.data)
                if (
                  !initialized && version === "2026-07-28" && method === "server/discover" &&
                  reason.code === UNSUPPORTED_PROTOCOL_VERSION_ERROR_CODE &&
                  Option.isSome(rejection) && rejection.value.requested === version &&
                  rejection.value.supported.includes(version)
                ) {
                  return yield* exchange(method, params ?? {}, tool)
                }
                return yield* error
              })
            ),
            Match.orElse(() => Effect.fail(error))
          )
        )
      )
    }
  )

  const operation = Effect.fnUntraced(function*<A = unknown, R2 = never>(
    method: string,
    params: unknown,
    callOptions?: CallOptions,
    tool?: McpSchema.Tool,
    decode?: (result: unknown) => Effect.Effect<A, McpClientError, R2>
  ): Effect.fn.Return<A, McpClientError, R2> {
    const duration = callOptions?.timeout
    const validated = duration === undefined ? timeout : yield* validateTimeout(duration)

    const deadlineFailure = (yield* DeadlineFailure) ?? (yield* Ref.make<McpClientError | undefined>(undefined))

    return yield* runOperation(method, params, tool).pipe(
      Effect.provideService(DeadlineFailure, deadlineFailure),
      permits.withPermits(1),
      Effect.flatMap(Effect.fnUntraced(function*(result) {
        // decodeProtocolResult has validated the method-specific result; the string dispatch erases its type.
        return decode ? yield* decode(result) : result as A
      })),
      Effect.raceFirst(Deferred.await(shutdown)),
      Effect.timeoutOrElse({
        duration: validated,
        orElse: Effect.fnUntraced(function*() {
          const knownFailure = yield* Ref.get(deadlineFailure)

          if (knownFailure !== undefined) return yield* knownFailure

          return yield* new McpClientError({
            reason: { _tag: "TimeoutError", message: "MCP operation deadline exceeded" }
          })
        })
      })
    )
  })

  const initializationFailure = yield* Ref.make<McpClientError | undefined>(undefined)

  const { profile, serverCapabilities, serverInfo } = yield* Effect.gen(function*() {
    const initial = yield* operation(
      version === "2025-11-25" ? "initialize" : "server/discover",
      version === "2025-11-25" ?
        {
          protocolVersion: version,
          capabilities,
          clientInfo: options.clientInfo
        } :
        {}
    )

    initialized = true

    // Both initialization schemas have validated these fields; string dispatch erases their shared shape.
    const profile = initial as {
      protocolVersion?: string
      supportedVersions?: ReadonlyArray<string>
      capabilities: unknown
      serverInfo?: unknown
      _meta?: Record<string, unknown>
      instructions?: string
    }

    if (
      (version === "2025-11-25" && profile.protocolVersion !== version) ||
      (version === "2026-07-28" && !profile.supportedVersions?.includes(version))
    ) {
      return yield* new McpClientError({
        reason: {
          _tag: "UnsupportedError",
          message: "Server does not support the explicitly selected protocol version"
        }
      })
    }

    const serverCapabilities = yield* decodeServerCapabilities(profile.capabilities)
      .pipe(
        Effect.mapError((cause) =>
          new McpClientError({
            reason: { _tag: "ProtocolError", message: "Invalid server capabilities", cause }
          })
        )
      )

    yield* Ref.set(capabilitiesRef, serverCapabilities)
    const identity = profile.serverInfo ?? profile._meta?.["io.modelcontextprotocol/serverInfo"]

    const serverInfo = version === "2026-07-28" && identity === undefined
      ? undefined
      : yield* decodeImplementation(identity).pipe(
        Effect.mapError((cause) =>
          new McpClientError({
            reason: { _tag: "ProtocolError", message: "Invalid server implementation", cause }
          })
        )
      )

    if (version === "2025-11-25") yield* transport.send({ jsonrpc: "2.0", method: "notifications/initialized" })

    return { profile, serverCapabilities, serverInfo }
  }).pipe(
    Effect.provideService(DeadlineFailure, initializationFailure),
    Effect.timeoutOrElse({
      duration: timeout,
      orElse: Effect.fnUntraced(function*() {
        const knownFailure = yield* Ref.get(initializationFailure)

        if (knownFailure !== undefined) return yield* knownFailure

        return yield* new McpClientError({
          reason: { _tag: "TimeoutError", message: "MCP initialization deadline exceeded" }
        })
      })
    })
  )

  const invokeTool = Effect.fnUntraced(function*<A = McpSchema.CallToolResult, R2 = never>(
    params: Pick<CallToolParams, "tool" | "arguments">,
    callOptions?: CallOptions,
    decode?: (result: McpSchema.CallToolResult) => Effect.Effect<A, McpClientError, R2>
  ): Effect.fn.Return<A, McpClientError, R2> {
    yield* assertOpen

    if (
      Predicate.hasProperty(params.tool, "execution") && Predicate.isReadonlyObject(params.tool.execution) &&
      params.tool.execution.taskSupport === "required"
    ) {
      return yield* new McpClientError({
        reason: { _tag: "UnsupportedError", message: "Tool requires the unsupported tasks extension" }
      })
    }

    const payload = {
      name: params.tool.name,
      ...(params.arguments === undefined ? {} : { arguments: params.arguments })
    }

    return yield* operation<A, R2>(
      "tools/call",
      payload,
      callOptions,
      params.tool,
      decode ? (result) => decode(result as McpSchema.CallToolResult) : undefined
    )
  })

  const listAll = <A>(
    kind: "tools" | "prompts" | "resources",
    select: (page: unknown) => { readonly items: ReadonlyArray<A>; readonly nextCursor?: string | undefined },
    transform?: (items: ReadonlyArray<A>) => Effect.Effect<ReadonlyArray<A>, McpClientError>
  ) =>
    Effect.fnUntraced(function*(options?: CallOptions) {
      const duration = options?.timeout === undefined ? timeout : yield* validateTimeout(options.timeout)
      const deadlineFailure = yield* Ref.make<McpClientError | undefined>(undefined)
      return yield* Effect.gen(function*() {
        yield* assertOpen
        if (!serverCapabilities[kind]) return []

        const items: Array<A> = []
        const cursors = new Set<string>()
        let cursor: string | undefined

        for (let pageCount = 0;; pageCount++) {
          if (pageCount >= MAX_DISCOVERY_PAGES) {
            return yield* new McpClientError({
              reason: { _tag: "LimitError", message: `MCP ${kind} discovery exceeded its page limit` }
            })
          }
          const page = select(
            yield* operation(
              `${kind}/list`,
              cursor === undefined ? {} : { cursor },
              options
            )
          )
          if (items.length + page.items.length > MAX_DISCOVERY_ITEMS) {
            return yield* new McpClientError({
              reason: { _tag: "LimitError", message: `MCP ${kind} discovery exceeded its item limit` }
            })
          }
          items.push(...page.items)
          cursor = page.nextCursor
          if (cursor === undefined) break
          if (cursors.has(cursor)) {
            return yield* new McpClientError({
              reason: { _tag: "LimitError", message: `MCP ${kind} discovery repeated a cursor` }
            })
          }
          cursors.add(cursor)
        }

        return transform ? yield* transform(items) : items
      }).pipe(
        Effect.provideService(DeadlineFailure, deadlineFailure),
        Effect.timeoutOrElse({
          duration,
          orElse: Effect.fnUntraced(function*() {
            const knownFailure = yield* Ref.get(deadlineFailure)
            return yield* knownFailure ??
              new McpClientError({
                reason: { _tag: "TimeoutError", message: `MCP ${kind} discovery deadline exceeded` }
              })
          })
        })
      )
    })

  const listTools = listAll("tools", (page) => {
    const result = page as McpSchema.ListToolsResult
    return { items: result.tools, nextCursor: result.nextCursor }
  }, transport.filterTools)
  const listPrompts = listAll("prompts", (page) => {
    const result = page as McpSchema.ListPromptsResult
    return { items: result.prompts, nextCursor: result.nextCursor }
  })
  const listResources = listAll("resources", (page) => {
    const result = page as McpSchema.ListResourcesResult
    return { items: result.resources, nextCursor: result.nextCursor }
  })

  const callToolImpl = Effect.fnUntraced(function*<S extends Schema.Top>(
    params: CallToolParams<S>,
    opts?: CallOptions
  ): Effect.fn.Return<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]> {
    if (params.schema === undefined) return yield* invokeTool(params, opts)

    const decode = Schema.decodeUnknownEffect(params.schema)

    return yield* invokeTool(
      params,
      opts,
      Effect.fnUntraced(function*(result) {
        if (result.isError === true) {
          return yield* new McpClientError({
            reason: { _tag: "ToolError", message: "MCP tool reported an execution error", result }
          })
        }

        return yield* decode(result.structuredContent).pipe(
          Effect.mapError((cause) =>
            new McpClientError({
              reason: { _tag: "ValidationError", message: "MCP structured result validation failed", cause }
            })
          )
        )
      })
    )
  })

  function callTool(
    params: CallToolParams,
    options?: CallOptions
  ): Effect.Effect<McpSchema.CallToolResult, McpClientError>
  function callTool<S extends Schema.Top>(
    params: CallToolParams<S> & { readonly schema: S },
    options?: CallOptions
  ): Effect.Effect<S["Type"], McpClientError, S["DecodingServices"]>
  function callTool<S extends Schema.Top = never>(
    params: CallToolParams<S>,
    options?: CallOptions
  ): Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]>
  function callTool<S extends Schema.Top>(
    params: CallToolParams<S>,
    options?: CallOptions
  ): Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]> {
    return callToolImpl(params, options)
  }

  const client: Client = {
    [TypeId]: TypeId,
    pipe() {
      return pipeArguments(this, arguments)
    },
    protocolVersion: version,
    serverInfo,
    instructions: profile.instructions,
    listTools,
    listPrompts,
    listResources,
    getPrompt: (params, options) =>
      operation<McpSchema.GetPromptResult>(
        "prompts/get",
        { name: params.prompt.name, ...(params.arguments === undefined ? {} : { arguments: params.arguments }) },
        options
      ),
    readResource: (params, options) => operation<McpSchema.ReadResourceResult>("resources/read", params, options),
    callTool
  }

  return client
})
const layer = (options: Options): Layer.Layer<
  McpClient,
  McpClientError,
  Transport
> => Layer.effect(McpClient)(make(options))
