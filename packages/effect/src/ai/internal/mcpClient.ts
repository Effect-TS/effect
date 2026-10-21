/** @internal */
import * as ByteSize from "../../ByteSize.ts"
import type * as Cause from "../../Cause.ts"
import * as Deferred from "../../Deferred.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Base64 from "../../encoding/Base64.ts"
import * as Sse from "../../encoding/Sse.ts"
import { dual } from "../../Function.ts"
import * as HttpClient from "../../http/HttpClient.ts"
import * as HttpClientRequest from "../../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../../http/HttpClientResponse.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import { pipeArguments } from "../../Pipeable.ts"
import * as Predicate from "../../Predicate.ts"
import type * as ChildProcess from "../../process/ChildProcess.ts"
import { ChildProcessSpawner } from "../../process/ChildProcessSpawner.ts"
import * as Queue from "../../Queue.ts"
import type * as Rpc from "../../rpc/Rpc.ts"
import * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import type {
  CallOptions,
  CallToolParams,
  Client,
  GetPromptParams,
  McpClientErrorReason,
  Options,
  ProtocolVersion,
  ReadResourceParams
} from "../McpClient.ts"
import type * as McpProtocol from "../McpProtocol.ts"
import * as McpSchema from "../McpSchema.ts"
import * as Tool from "../Tool.ts"
import * as Toolkit from "../Toolkit.ts"
import { McpClient, McpClientError, Transport, TransportTypeId } from "./mcpClientModels.ts"

export { TransportTypeId } from "./mcpClientModels.ts"

const DEFAULT_MAX_MESSAGE_BYTES = ByteSize.mebibytes(16)
const DEFAULT_TIMEOUT = Duration.seconds(60)
const CLOSE_TIMEOUT = Duration.seconds(5)
const MAX_DISCOVERY_PAGES = 100
const MAX_DISCOVERY_ITEMS = 10_000
const UNSUPPORTED_PROTOCOL_VERSION_ERROR_CODE = -32022
const HEADER_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

type Protocol = McpProtocol.ProtocolAdapter<ProtocolVersion>

type TransportService = Transport["Service"] & {
  readonly protocol: Protocol
  /** Sends a request and resolves with its JSON-RPC response. */
  readonly request: (
    message: McpSchema.JsonRpcRequest,
    tool?: McpSchema.Tool
  ) => Effect.Effect<McpSchema.JsonRpcResponse, McpClientError>
  readonly notify: (message: McpSchema.JsonRpcNotification) => Effect.Effect<void, McpClientError>
  /** Whether a discovered tool can be called over this transport. */
  readonly isCallable: (tool: McpSchema.Tool) => boolean
}

const fail = (reason: McpClientErrorReason) => new McpClientError({ reason })

const isRecord = Predicate.isReadonlyObject

const decodeMessage = Schema.decodeUnknownEffect(McpSchema.JsonRpcMessage, { onExcessProperty: "error" })
const decodeVersionRejection = Schema.decodeUnknownOption(Schema.Struct({
  requested: Schema.String,
  supported: Schema.Array(Schema.String)
}))
const decodeServerCapabilities = Schema.decodeUnknownEffect(McpSchema.ServerCapabilities)
const decodeImplementation = Schema.decodeUnknownEffect(McpSchema.Implementation)
const decodeToolArguments = Schema.decodeUnknownEffect(Schema.JsonObject)

const byteLength = (text: string) => new TextEncoder().encode(text).length

const messageLimit = (input: ByteSize.Input | undefined) => {
  const size = input === undefined ? DEFAULT_MAX_MESSAGE_BYTES : Option.getOrUndefined(ByteSize.fromInput(input))
  const bytes = size === undefined ? undefined : Option.getOrUndefined(ByteSize.toNumber(size))

  return bytes !== undefined && Number.isSafeInteger(bytes) && bytes > 0
    ? Effect.succeed(bytes)
    : Effect.fail(fail({ _tag: "ConfigurationError", message: "maxMessageBytes must be a positive safe integer" }))
}

const encodeMessage = Effect.fnUntraced(function*(message: McpSchema.JsonRpcMessage, maxBytes: number) {
  const json = yield* Effect.try({
    try: () => JSON.stringify(message),
    catch: (cause) => fail({ _tag: "TransportError", message: "Cannot encode MCP message", cause })
  })

  if (byteLength(json) > maxBytes) {
    return yield* fail({ _tag: "LimitError", message: "MCP message exceeds maxMessageBytes" })
  }

  return json
})

const parseMessage = Effect.fnUntraced(function*(text: string, maxBytes: number) {
  if (byteLength(text) > maxBytes) {
    return yield* fail({ _tag: "LimitError", message: "MCP message exceeds maxMessageBytes" })
  }

  const json = yield* Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: (cause) => fail({ _tag: "ProtocolError", message: "Invalid MCP JSON", cause })
  })

  return yield* decodeMessage(json).pipe(
    Effect.mapError((cause) => fail({ _tag: "ProtocolError", message: "Invalid JSON-RPC message", cause }))
  )
})

const isRequest = (message: McpSchema.JsonRpcMessage): message is McpSchema.JsonRpcRequest =>
  "method" in message && "id" in message

const isResponse = (message: McpSchema.JsonRpcMessage): message is McpSchema.JsonRpcResponse => !("method" in message)

// The client advertises no capabilities, so it answers pings and declines every other server request.
const replyToServer = (request: McpSchema.JsonRpcRequest): McpSchema.JsonRpcResponse =>
  request.method === "ping"
    ? { jsonrpc: "2.0", id: request.id, result: {} }
    : {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: McpSchema.METHOD_NOT_FOUND_ERROR_CODE, message: `Unsupported MCP method: ${request.method}` }
    }

const cancelled = (id: McpSchema.RequestId): McpSchema.JsonRpcNotification => ({
  jsonrpc: "2.0",
  method: "notifications/cancelled",
  params: { requestId: id }
})

// -----------------------------------------------------------------------------
// stdio
// -----------------------------------------------------------------------------

export const stdio = Effect.fnUntraced(function*(options: {
  readonly command: ChildProcess.Command
  readonly protocol: Protocol
  readonly maxMessageBytes?: ByteSize.Input | undefined
}): Effect.fn.Return<TransportService, McpClientError, ChildProcessSpawner | Scope.Scope> {
  const maxBytes = yield* messageLimit(options.maxMessageBytes)
  const spawner = yield* ChildProcessSpawner
  const process = yield* spawner.spawn(options.command).pipe(
    Effect.mapError((cause) => fail({ _tag: "TransportError", message: "Cannot spawn MCP server", cause }))
  )

  const pending = new Map<McpSchema.RequestId, Deferred.Deferred<McpSchema.JsonRpcResponse>>()
  const failure = yield* Deferred.make<never, McpClientError>()
  let failed: McpClientError | undefined

  const close = (error: McpClientError) =>
    Effect.suspend(() => {
      failed ??= error
      return Deferred.fail(failure, failed)
    })

  const input = yield* Queue.unbounded<Uint8Array, Cause.Done>()

  const write = Effect.fnUntraced(function*(message: McpSchema.JsonRpcMessage) {
    if (failed !== undefined) return yield* failed
    const json = yield* encodeMessage(message, maxBytes)
    yield* Queue.offer(input, new TextEncoder().encode(json + "\n"))
  })

  const receive = Effect.fnUntraced(function*(message: McpSchema.JsonRpcMessage) {
    if (isRequest(message)) return yield* write(replyToServer(message))
    if (!isResponse(message)) return
    // Without an ID the error cannot be correlated, so no pending request can be trusted.
    if (message.id === undefined || message.id === null) {
      return yield* fail({ _tag: "ProtocolError", message: "Server returned an uncorrelated JSON-RPC error" })
    }
    const response = pending.get(message.id)
    if (response !== undefined) yield* Deferred.succeed(response, message)
  })

  yield* Stream.fromQueue(input).pipe(
    Stream.run(process.stdin),
    Effect.catch((cause) => close(fail({ _tag: "TransportError", message: "MCP stdin failed", cause }))),
    Effect.forkScoped
  )
  yield* Stream.runDrain(process.stderr).pipe(Effect.ignore, Effect.forkScoped)
  const drained = yield* Deferred.make<void>()
  let buffer = ""
  yield* process.stdout.pipe(
    Stream.decodeText(),
    Stream.runForEach(Effect.fnUntraced(function*(chunk) {
      buffer += chunk
      let index: number
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 1)
        if (line.trim() !== "") yield* receive(yield* parseMessage(line, maxBytes))
      }
      if (buffer.length > maxBytes) {
        return yield* fail({ _tag: "LimitError", message: "MCP message exceeds maxMessageBytes" })
      }
    })),
    Effect.mapError((cause) =>
      cause instanceof McpClientError
        ? cause
        : fail({ _tag: "TransportError", message: "MCP stdout failed", cause })
    ),
    Effect.andThen(Effect.fail(fail({ _tag: "TransportError", message: "MCP server closed stdout" }))),
    Effect.catch(close),
    Effect.ensuring(Deferred.succeed(drained, undefined)),
    Effect.forkScoped
  )
  // Output written just before exit is delivered before pending requests fail.
  yield* process.exitCode.pipe(
    Effect.map((code) => `MCP process exited (${code})`),
    Effect.orElseSucceed(() => "MCP process exited"),
    Effect.tap(() => Deferred.await(drained).pipe(Effect.timeoutOption(CLOSE_TIMEOUT))),
    Effect.flatMap((message) => close(fail({ _tag: "TransportError", message }))),
    Effect.forkScoped
  )

  // Close stdin, then escalate to SIGTERM and SIGKILL if the server does not exit.
  // https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#stdio
  yield* Effect.addFinalizer(() =>
    Effect.gen(function*() {
      yield* close(fail({ _tag: "ClosedError", message: "MCP transport closed" }))
      yield* Queue.end(input)
      const exited = yield* process.exitCode.pipe(Effect.timeoutOption(CLOSE_TIMEOUT), Effect.option)
      if (Option.isNone(exited) || Option.isNone(exited.value)) {
        yield* process.kill({ killSignal: "SIGTERM", forceKillAfter: Duration.toMillis(CLOSE_TIMEOUT) }).pipe(
          Effect.ignore
        )
      }
    })
  )

  return {
    [TransportTypeId]: TransportTypeId,
    protocol: options.protocol,
    isCallable: () => true,
    notify: (message) => write(message),
    request: Effect.fnUntraced(function*(message) {
      const response = yield* Deferred.make<McpSchema.JsonRpcResponse>()
      pending.set(message.id, response)

      return yield* write(message).pipe(
        Effect.andThen(Deferred.await(response)),
        Effect.raceFirst(Deferred.await(failure)),
        Effect.onInterrupt(() =>
          message.method === "initialize"
            ? Effect.void
            : Deferred.isDone(response).pipe(
              Effect.flatMap((done) => done ? Effect.void : write(cancelled(message.id)).pipe(Effect.ignore))
            )
        ),
        Effect.ensuring(Effect.sync(() => pending.delete(message.id)))
      )
    })
  }
})

// -----------------------------------------------------------------------------
// Streamable HTTP
// -----------------------------------------------------------------------------

const mediaType = (response: HttpClientResponse.HttpClientResponse) =>
  response.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase()

// Values that are not plain visible ASCII are sent Base64 encoded.
// https://modelcontextprotocol.io/specification/2026-07-28/basic/transports#custom-headers-from-tool-parameters
const headerValue = (value: string) =>
  /^[\x20-\x7e]*$/.test(value) && value.trim() === value && !(value.startsWith("=?base64?") && value.endsWith("?="))
    ? value
    : `=?base64?${Base64.encode(value)}?=`

interface HeaderParameter {
  readonly path: ReadonlyArray<string>
  readonly header: string
  readonly type: string
}

// JSON Schema keywords whose values are schemas, maps of schemas or arrays of schemas.
const SCHEMA_KEYWORDS = new Set([
  "additionalProperties",
  "unevaluatedProperties",
  "propertyNames",
  "items",
  "additionalItems",
  "unevaluatedItems",
  "contains",
  "not",
  "if",
  "then",
  "else",
  "contentSchema"
])
const SCHEMA_MAP_KEYWORDS = new Set([
  "properties",
  "patternProperties",
  "$defs",
  "definitions",
  "dependentSchemas",
  "dependencies"
])
const SCHEMA_ARRAY_KEYWORDS = new Set(["allOf", "anyOf", "oneOf", "prefixItems", "items"])

// Collects `x-mcp-header` annotations along chains of `properties` keys, or
// returns undefined when an annotation is invalid or found anywhere else.
// https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#schema-extension
const headerParameters = (tool: McpSchema.Tool): ReadonlyArray<HeaderParameter> | undefined => {
  const parameters: Array<HeaderParameter> = []
  const names = new Set<string>()

  // `path` is undefined once the traversal leaves a properties-only chain.
  const visit = (schema: unknown, path: ReadonlyArray<string> | undefined): boolean => {
    if (!isRecord(schema)) return true
    const name = schema["x-mcp-header"]
    if (name !== undefined) {
      if (
        path === undefined || path.length === 0 || typeof name !== "string" || !HEADER_TOKEN.test(name) ||
        names.has(name.toLowerCase()) || !["string", "integer", "boolean"].includes(schema.type as string)
      ) return false
      names.add(name.toLowerCase())
      parameters.push({ path, header: `mcp-param-${name.toLowerCase()}`, type: schema.type as string })
    }
    return Object.entries(schema).every(([keyword, value]) => {
      if (SCHEMA_MAP_KEYWORDS.has(keyword) && isRecord(value)) {
        return Object.entries(value).every(([key, child]) =>
          visit(child, keyword === "properties" && path !== undefined ? [...path, key] : undefined)
        )
      }
      if (Array.isArray(value)) {
        return !SCHEMA_ARRAY_KEYWORDS.has(keyword) || value.every((child) => visit(child, undefined))
      }
      return !SCHEMA_KEYWORDS.has(keyword) || visit(value, undefined)
    })
  }

  return visit(tool.inputSchema, []) ? parameters : undefined
}

const routingHeaders = Effect.fnUntraced(function*(message: McpSchema.JsonRpcMessage, tool?: McpSchema.Tool) {
  if (!("method" in message)) return {}
  const headers: Record<string, string> = { "mcp-method": message.method }
  const params = message.params ?? {}
  const name = message.method === "resources/read" ? params.uri : params.name
  if (
    typeof name === "string" &&
    (message.method === "tools/call" || message.method === "prompts/get" || message.method === "resources/read")
  ) {
    headers["mcp-name"] = headerValue(name)
  }
  if (message.method !== "tools/call") return headers

  const parameters = tool === undefined ? undefined : headerParameters(tool)
  if (parameters === undefined) {
    return yield* fail({ _tag: "UnsupportedError", message: "Tool has invalid x-mcp-header annotations" })
  }
  for (const { header, path, type } of parameters) {
    let value: unknown = params.arguments
    for (const key of path) value = isRecord(value) && Object.hasOwn(value, key) ? value[key] : undefined
    if (value === undefined || value === null) continue
    if (type === "integer" ? !Number.isSafeInteger(value) : typeof value !== type) {
      return yield* fail({ _tag: "ValidationError", message: `Invalid value for MCP header parameter ${header}` })
    }
    headers[header] = headerValue(String(value))
  }
  return headers
})

const readBody = Effect.fnUntraced(function*(response: HttpClientResponse.HttpClientResponse, maxBytes: number) {
  const chunks: Array<Uint8Array> = []
  let size = 0
  yield* Stream.runForEach(response.stream, (chunk) => {
    size += chunk.length
    if (size > maxBytes) {
      return Effect.fail(fail({ _tag: "LimitError", message: "MCP response exceeds maxMessageBytes" }))
    }
    chunks.push(chunk)
    return Effect.void
  })
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(body)
})

export const http = Effect.fnUntraced(function*(options: {
  readonly url: string | URL
  readonly protocol: Protocol
  readonly headers?: Readonly<Record<string, string>> | undefined
  readonly maxMessageBytes?: ByteSize.Input | undefined
}): Effect.fn.Return<TransportService, McpClientError, HttpClient.HttpClient | Scope.Scope> {
  const maxBytes = yield* messageLimit(options.maxMessageBytes)
  const client = HttpClient.withScope(yield* HttpClient.HttpClient)
  const modern = options.protocol.protocolVersion === "2026-07-28"
  const closed = yield* Deferred.make<never, McpClientError>()
  let failed: McpClientError | undefined
  // Legacy servers may assign a session during initialization.
  let session: string | undefined

  const headers = (): Record<string, string> => ({
    ...options.headers,
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": options.protocol.protocolVersion,
    ...(session === undefined ? {} : { "mcp-session-id": session })
  })

  const httpError = Effect.fnUntraced(function*(response: HttpClientResponse.HttpClientResponse) {
    // Error bodies may carry a JSON-RPC error without an ID, e.g. an unsupported protocol version.
    const remote = mediaType(response) === "application/json"
      ? yield* readBody(response, maxBytes).pipe(
        Effect.flatMap((text) => parseMessage(text, maxBytes)),
        Effect.map((message) => "error" in message ? message.error : undefined),
        Effect.orElseSucceed(() => undefined)
      )
      : undefined
    const wwwAuthenticate = response.headers["www-authenticate"]
    const retryAfter = response.headers["retry-after"]

    return yield* fail({
      _tag: "HttpError",
      message: remote?.message ?? `MCP HTTP status ${response.status}`,
      status: response.status,
      ...(wwwAuthenticate === undefined ? {} : { wwwAuthenticate }),
      ...(retryAfter === undefined ? {} : { retryAfter }),
      ...(remote?.code === undefined ? {} : { code: remote.code }),
      ...(remote?.data === undefined ? {} : { data: remote.data })
    })
  })

  const readResponse = Effect.fnUntraced(function*(
    response: HttpClientResponse.HttpClientResponse,
    request: McpSchema.JsonRpcRequest
  ) {
    const match = Effect.fnUntraced(function*(message: McpSchema.JsonRpcMessage) {
      if (isRequest(message)) {
        yield* post(replyToServer(message))
        return undefined
      }
      if (!isResponse(message)) return undefined
      // A response on this exchange belongs to its request; an error may omit the ID.
      if (message.id !== request.id && !("error" in message && message.id == null)) {
        return yield* fail({ _tag: "ProtocolError", message: "HTTP MCP response id does not match its request" })
      }
      return message
    })

    switch (mediaType(response)) {
      case "application/json": {
        const message = yield* match(yield* parseMessage(yield* readBody(response, maxBytes), maxBytes))
        if (message === undefined) break
        return message
      }
      case "text/event-stream": {
        const events: Array<string> = []
        const parser = Sse.makeParser((event) => {
          // Resumption is unsupported, so retry directives and event IDs are ignored.
          if (event._tag === "Event" && event.data !== "") events.push(event.data)
        }, { maxEventSize: maxBytes })
        const message = yield* response.stream.pipe(
          Stream.decodeText(),
          Stream.flatMap((chunk) => {
            const error = parser.feed(chunk)
            const parsed = Stream.fromIterable(events.splice(0))
            // Events before an oversized one can still complete the request.
            return error === undefined ? parsed : parsed.pipe(
              Stream.concat(Stream.fail(fail({ _tag: "LimitError", message: "MCP SSE event exceeds maxMessageBytes" })))
            )
          }),
          Stream.mapEffect((data) => parseMessage(data, maxBytes).pipe(Effect.flatMap(match))),
          Stream.filter(Predicate.isNotUndefined),
          Stream.runHead
        )
        if (Option.isNone(message)) break
        return message.value
      }
      default: {
        return yield* fail({ _tag: "ProtocolError", message: "Unsupported MCP response Content-Type" })
      }
    }
    return yield* fail({ _tag: "TransportError", message: "MCP response ended before the terminal response" })
  })

  function post(message: McpSchema.JsonRpcRequest, tool?: McpSchema.Tool): Effect.Effect<
    McpSchema.JsonRpcResponse,
    McpClientError
  >
  function post(message: McpSchema.JsonRpcMessage): Effect.Effect<void, McpClientError>
  function post(message: McpSchema.JsonRpcMessage, tool?: McpSchema.Tool) {
    return Effect.gen(function*() {
      if (failed !== undefined) return yield* failed
      const body = yield* encodeMessage(message, maxBytes)
      const request = HttpClientRequest.post(options.url).pipe(
        HttpClientRequest.setHeaders({ ...headers(), ...(modern ? yield* routingHeaders(message, tool) : {}) }),
        HttpClientRequest.bodyText(body, "application/json")
      )
      const response = yield* client.execute(request).pipe(
        // Clients using `filterStatusOk` surface error responses as failures.
        Effect.catch((cause) =>
          cause.response === undefined
            ? Effect.fail(fail({ _tag: "TransportError", message: "MCP HTTP request failed", cause }))
            : Effect.succeed(cause.response)
        )
      )

      // A legacy session ends when the server no longer recognizes its ID.
      if (session !== undefined && response.status === 404) {
        failed ??= fail({ _tag: "ClosedError", message: "MCP HTTP session expired", sessionExpired: true })
        return yield* failed
      }
      if (response.status < 200 || response.status >= 300) return yield* httpError(response)
      if (!modern) session = response.headers["mcp-session-id"] ?? session
      if (!isRequest(message)) return
      if (response.status === 202 || response.status === 204) {
        return yield* fail({ _tag: "ProtocolError", message: "MCP request received no response" })
      }
      return yield* readResponse(response, message)
    }).pipe(
      Effect.mapError((cause) =>
        cause instanceof McpClientError
          ? cause
          : fail({ _tag: "TransportError", message: "Cannot read MCP response", cause })
      ),
      Effect.raceFirst(Deferred.await(closed)),
      Effect.scoped
    )
  }

  yield* Effect.addFinalizer(() =>
    Effect.gen(function*() {
      const current = session
      failed ??= fail({ _tag: "ClosedError", message: "MCP HTTP transport closed" })
      yield* Deferred.fail(closed, failed)
      if (current === undefined || failed.reason._tag !== "ClosedError" || failed.reason.sessionExpired) return
      // Explicitly terminate a legacy session.
      // https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#session-management
      yield* client.execute(
        HttpClientRequest.delete(options.url).pipe(
          HttpClientRequest.setHeaders({ ...options.headers, ...headers(), "mcp-session-id": current })
        )
      ).pipe(Effect.scoped, Effect.timeoutOption(CLOSE_TIMEOUT), Effect.ignore)
    })
  )

  return {
    [TransportTypeId]: TransportTypeId,
    protocol: options.protocol,
    isCallable: (tool) => !modern || headerParameters(tool) !== undefined,
    notify: (message) => post(message),
    request: (message, tool) =>
      post(message, tool).pipe(
        // Modern servers treat a closed response stream as cancellation.
        Effect.onInterrupt(() =>
          modern || message.method === "initialize"
            ? Effect.void
            : post(cancelled(message.id)).pipe(Effect.timeoutOption(CLOSE_TIMEOUT), Effect.ignore)
        )
      )
  }
})

export const layerStdio = (options: Options & Parameters<typeof stdio>[0]): Layer.Layer<
  McpClient,
  McpClientError,
  ChildProcessSpawner
> => Layer.effect(McpClient)(make(options)).pipe(Layer.provide(Layer.effect(Transport)(stdio(options))))

export const layerHttp = (options: Options & Parameters<typeof http>[0]): Layer.Layer<
  McpClient,
  McpClientError,
  HttpClient.HttpClient
> => Layer.effect(McpClient)(make(options)).pipe(Layer.provide(Layer.effect(Transport)(http(options))))

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

export const TypeId = "~effect/ai/McpClient" as const

export const isClient = (value: unknown): value is Client => Predicate.hasProperty(value, TypeId)

const validationError = (cause: Schema.SchemaError) =>
  fail({ _tag: "ValidationError", message: "Invalid MCP payload", cause })

const decodeUnknown = (schema: Schema.Constraint, value: unknown) =>
  Schema.decodeUnknownEffect(schema as Schema.ConstraintCodec<unknown, unknown>)(value).pipe(
    Effect.mapError(validationError)
  )

const publicRpcs: ReadonlyMap<string, { readonly successSchema: Schema.Constraint }> =
  McpSchema.ClientRequestRpcs.requests

// Tools that require task-augmented execution cannot be called without the tasks extension.
const requiresTasks = (tool: unknown) =>
  isRecord(tool) && isRecord(tool.execution) && tool.execution.taskSupport === "required"

export const make = Effect.fnUntraced(function*(options: Options): Effect.fn.Return<
  Client,
  McpClientError,
  Scope.Scope | Transport
> {
  const transport = (yield* Transport) as TransportService
  const protocol = transport.protocol
  const version = protocol.protocolVersion
  const modern = version === "2026-07-28"
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  const closed = yield* Deferred.make<never, McpClientError>()
  yield* Effect.addFinalizer(() =>
    Deferred.fail(closed, fail({ _tag: "ClosedError", message: "MCP client scope closed" }))
  )
  let nextId = 1

  const request = Effect.fnUntraced(function*(method: string, params: Record<string, unknown>, tool?: McpSchema.Tool) {
    const rpc = protocol.clientRpcs.requests.get(method) as Rpc.AnyWithProps | undefined
    if (rpc === undefined) {
      return yield* fail({ _tag: "UnsupportedError", message: `Unsupported MCP method: ${method}` })
    }

    // Modern requests carry the client identity in every request.
    // https://modelcontextprotocol.io/specification/2026-07-28/basic/index
    const input = modern
      ? {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": version,
          "io.modelcontextprotocol/clientInfo": options.clientInfo,
          "io.modelcontextprotocol/clientCapabilities": {}
        }
      }
      : params
    const codecs = protocol.payloadCodecs(rpc)
    const payload = yield* codecs.decode(input).pipe(Effect.flatMap(codecs.encode), Effect.mapError(validationError))

    const response = yield* transport.request(
      { jsonrpc: "2.0", id: nextId++, method, params: payload as Schema.JsonObject },
      tool
    )
    if ("error" in response) {
      return yield* fail({ _tag: "ProtocolError", ...response.error })
    }

    let result: unknown = response.result
    // Older modern peers may omit the complete discriminator.
    if (modern && isRecord(result) && result.resultType === undefined) result = { ...result, resultType: "complete" }
    if (method === "tools/list" && isRecord(result) && Array.isArray(result.tools)) {
      result = { ...result, tools: result.tools.filter((tool) => !requiresTasks(tool)) }
    }

    // Validate against the selected revision, then decode into the public model.
    const validated = yield* decodeUnknown(rpc.successSchema, result)
    if (isRecord(result) && result.resultType === "input_required") {
      return yield* fail({ _tag: "UnsupportedError", message: "MCP input continuation is not supported" })
    }
    const publicRpc = publicRpcs.get(method)
    return publicRpc === undefined ? validated : yield* decodeUnknown(publicRpc.successSchema, result)
  })

  const withDeadline = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    duration: Duration.Input,
    operation: string
  ) =>
    effect.pipe(
      Effect.raceFirst(Deferred.await(closed)),
      Effect.timeoutOrElse({
        duration,
        orElse: () => Effect.fail(fail({ _tag: "TimeoutError", message: `MCP ${operation} deadline exceeded` }))
      })
    )

  const initialize = Effect.gen(function*() {
    if (!modern) {
      return yield* request("initialize", {
        protocolVersion: version,
        capabilities: {},
        clientInfo: options.clientInfo
      })
    }
    const discover = request("server/discover", {})
    // Retry once when the server rejects a version that it reports as supported.
    return yield* discover.pipe(Effect.catchIf((error) => {
      const reason = error.reason
      if (reason._tag !== "ProtocolError" && reason._tag !== "HttpError") return false
      const rejection = Option.getOrUndefined(decodeVersionRejection(reason.data))
      return reason.code === UNSUPPORTED_PROTOCOL_VERSION_ERROR_CODE && rejection?.requested === version &&
        rejection.supported.includes(version)
    }, () => discover))
  })

  const { capabilities, instructions, serverInfo } = yield* withDeadline(
    Effect.gen(function*() {
      // The selected revision has validated the initialization result.
      const result = (yield* initialize) as {
        readonly protocolVersion?: string
        readonly supportedVersions?: ReadonlyArray<string>
        readonly capabilities: unknown
        readonly serverInfo?: unknown
        readonly instructions?: string
        readonly _meta?: Record<string, unknown>
      }
      if (modern ? !result.supportedVersions?.includes(version) : result.protocolVersion !== version) {
        return yield* fail({
          _tag: "UnsupportedError",
          message: "Server does not support the explicitly selected protocol version"
        })
      }
      const identity = modern ? result._meta?.["io.modelcontextprotocol/serverInfo"] : result.serverInfo
      const capabilities = yield* decodeServerCapabilities(result.capabilities)
      const serverInfo = identity === undefined && modern ? undefined : yield* decodeImplementation(identity)
      if (!modern) yield* transport.notify({ jsonrpc: "2.0", method: "notifications/initialized" })
      return { capabilities, instructions: result.instructions, serverInfo }
    }).pipe(
      Effect.mapError((cause) =>
        Schema.isSchemaError(cause)
          ? fail({ _tag: "ProtocolError", message: "Invalid MCP initialization result", cause })
          : cause
      )
    ),
    timeout,
    "initialization"
  )

  const requireCapability = (kind: "tools" | "prompts" | "resources") =>
    capabilities[kind] === undefined
      ? Effect.fail(fail({ _tag: "UnsupportedError", message: `Server does not advertise ${kind}` }))
      : Effect.void

  const list = <K extends "tools" | "prompts" | "resources", A>(kind: K) => (callOptions?: CallOptions) =>
    withDeadline(
      Effect.gen(function*() {
        if (capabilities[kind] === undefined) return []
        const items: Array<A> = []
        const cursors = new Set<string>()
        let cursor: string | undefined
        for (let page = 0; page < MAX_DISCOVERY_PAGES; page++) {
          const result = (yield* request(`${kind}/list`, cursor === undefined ? {} : { cursor })) as
            & Record<K, ReadonlyArray<A>>
            & { readonly nextCursor?: string }
          items.push(...result[kind])
          if (items.length > MAX_DISCOVERY_ITEMS) {
            return yield* fail({ _tag: "LimitError", message: `MCP ${kind} discovery exceeded its item limit` })
          }
          if (result.nextCursor === undefined) return items
          if (cursors.has(result.nextCursor)) {
            return yield* fail({ _tag: "LimitError", message: `MCP ${kind} discovery repeated a cursor` })
          }
          cursors.add(cursor = result.nextCursor)
        }
        return yield* fail({ _tag: "LimitError", message: `MCP ${kind} discovery exceeded its page limit` })
      }),
      callOptions?.timeout ?? timeout,
      `${kind} discovery`
    )

  const listTools = list<"tools", McpSchema.Tool>("tools")

  function callTool<S extends Schema.Top>(
    params: CallToolParams<S>,
    callOptions?: CallOptions
  ): Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]> {
    return withDeadline(
      Effect.gen(function*() {
        yield* requireCapability("tools")
        const result = (yield* request(
          "tools/call",
          { name: params.tool.name, ...(params.arguments === undefined ? {} : { arguments: params.arguments }) },
          params.tool
        )) as McpSchema.CallToolResult
        if (params.schema === undefined) return result
        if (result.isError === true) {
          return yield* fail({ _tag: "ToolError", message: "MCP tool reported an execution error", result })
        }
        return yield* Schema.decodeUnknownEffect(params.schema)(result.structuredContent).pipe(
          Effect.mapError((cause) =>
            fail({ _tag: "ValidationError", message: "MCP structured result validation failed", cause })
          )
        )
      }),
      callOptions?.timeout ?? timeout,
      "tools/call"
    )
  }

  return {
    [TypeId]: TypeId,
    pipe() {
      return pipeArguments(this, arguments)
    },
    protocolVersion: version,
    serverInfo,
    instructions,
    listTools: (callOptions) =>
      listTools(callOptions).pipe(Effect.map((tools) => tools.filter((tool) => transport.isCallable(tool)))),
    listPrompts: list("prompts"),
    listResources: list("resources"),
    getPrompt: (params, callOptions) =>
      withDeadline(
        requireCapability("prompts").pipe(Effect.andThen(request("prompts/get", {
          name: params.prompt.name,
          ...(params.arguments === undefined ? {} : { arguments: params.arguments })
        }))),
        callOptions?.timeout ?? timeout,
        "prompts/get"
      ) as Effect.Effect<McpSchema.GetPromptResult, McpClientError>,
    readResource: (params, callOptions) =>
      withDeadline(
        requireCapability("resources").pipe(Effect.andThen(request("resources/read", { uri: params.uri }))),
        callOptions?.timeout ?? timeout,
        "resources/read"
      ) as Effect.Effect<McpSchema.ReadResourceResult, McpClientError>,
    callTool: callTool as Client["callTool"]
  }
})

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

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
  <S extends Schema.Top>(self: Client, params: CallToolParams<S>, options?: CallOptions) =>
    self.callTool(params, options)
)

export const listPrompts: {
  (options?: CallOptions): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
  (self: Client, options?: CallOptions): Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
} = dual((args) => isClient(args[0]), (self: Client, options?: CallOptions) => self.listPrompts(options))

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
  (self: Client, params: GetPromptParams, options?: CallOptions) => self.getPrompt(params, options)
)

export const listResources: {
  (options?: CallOptions): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
  (self: Client, options?: CallOptions): Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
} = dual((args) => isClient(args[0]), (self: Client, options?: CallOptions) => self.listResources(options))

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
  (self: Client, params: ReadResourceParams, options?: CallOptions) => self.readResource(params, options)
)

// -----------------------------------------------------------------------------
// Toolkit
// -----------------------------------------------------------------------------

const toText = (result: McpSchema.CallToolResult): Effect.Effect<string, McpClientError> => {
  const parts: Array<string> = []
  for (const block of result.content) {
    switch (block.type) {
      case "text": {
        parts.push(block.text)
        break
      }
      case "resource_link": {
        parts.push(
          `${block.title ?? block.name}: ${block.uri}${block.description === undefined ? "" : `\n${block.description}`}`
        )
        break
      }
      case "resource": {
        if (!("text" in block.resource)) {
          return Effect.fail(fail({
            _tag: "UnsupportedError",
            message: "MCP binary resources require an application text converter",
            result
          }))
        }
        parts.push(block.resource.text)
        break
      }
      default: {
        return Effect.fail(fail({
          _tag: "UnsupportedError",
          message: `MCP ${block.type} content requires an application text converter`,
          result
        }))
      }
    }
  }
  return Effect.succeed(
    parts.length === 0 && result.structuredContent !== undefined
      ? JSON.stringify(result.structuredContent)
      : parts.join("\n")
  )
}

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
      return yield* fail({ _tag: "ConfigurationError", message: `Invalid or duplicate MCP model tool name: ${name}` })
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
      const args = yield* decodeToolArguments(params).pipe(
        Effect.mapError((cause) =>
          fail({ _tag: "ValidationError", message: "MCP tool arguments must be a JSON object", cause })
        )
      )
      const result = yield* client.callTool({ tool: descriptor, arguments: args })
      if (result.isError === true) {
        return yield* fail({ _tag: "ToolError", message: "MCP tool reported an execution error", result })
      }
      return yield* toText(result)
    })
  }

  const toolkit = Toolkit.make(...tools)
  return yield* toolkit.pipe(Effect.provideContext(yield* toolkit.toHandlers(handlers)))
})
