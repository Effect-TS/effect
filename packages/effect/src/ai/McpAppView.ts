/**
 * The page side of MCP Apps, the `io.modelcontextprotocol/ui` extension.
 *
 * A host renders an app's HTML in a sandboxed iframe next to a tool call and
 * talks to it over JSON-RPC on `postMessage`. `McpAppView` is that page's end
 * of the conversation: it performs the `ui/initialize` handshake, receives the
 * tool call's input and result, keeps the host context up to date, and sends
 * the page's requests to the host.
 *
 * The module is platform-agnostic: {@link layer} takes a {@link Transport}
 * over any `postMessage`-capable target, so it needs no DOM types and runs in
 * a test with an in-memory host. `@effect/platform-browser` provides the
 * window transport and automatic resize reporting. The host-sent data types
 * here are the stable 2026-01-26 specification plus the draft's
 * `ui/download-file` and `ui/notifications/request-teardown`.
 *
 * Messages are collected from the moment the layer connects, so the host may
 * send the tool input and result before the page reads them.
 *
 * **Example** (A page that renders a report and refreshes it)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { McpAppView, Tool } from "effect/ai"
 *
 * const Report = Tool.make("Report", {
 *   parameters: Schema.Struct({ runId: Schema.String }),
 *   success: Schema.Struct({ passed: Schema.Number })
 * })
 *
 * const page = Effect.gen(function*() {
 *   const view = yield* McpAppView.McpAppView
 *   const call = view.toolCall(Report)
 *   const input = yield* call.input
 *   const report = yield* call.result
 *   // render `report`, then poll the server through the host
 *   const fresh = yield* view.callTool(Report, { runId: input.runId })
 *   return fresh.passed
 * })
 *
 * // Provide a transport, for example `BrowserMcpAppView.layer` from
 * // `@effect/platform-browser`, and run with `McpAppView.run(page)`.
 * ```
 *
 * @see https://github.com/modelcontextprotocol/ext-apps
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Deferred from "../Deferred.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Fiber from "../Fiber.ts"
import * as Layer from "../Layer.ts"
import * as Predicate from "../Predicate.ts"
import * as Queue from "../Queue.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import * as SubscriptionRef from "../SubscriptionRef.ts"
import { ToolError } from "./McpClientError.ts"
import * as McpSchema from "./McpSchema.ts"
import type * as Tool from "./Tool.ts"

/**
 * The MCP Apps protocol revision the page speaks in `ui/initialize`.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.3
 */
export const PROTOCOL_VERSION = "2026-01-26"

/**
 * How the host displays the page.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type DisplayMode = "inline" | "fullscreen" | "pip"

/**
 * What the host can do for the page, as returned by `ui/initialize`.
 *
 * **Details**
 *
 * Every entry is optional: an absent entry means the host does not offer the
 * feature, and the matching page operation fails with
 * {@link UnsupportedCapability} before sending anything. Fields the
 * specification adds later are kept under their own keys.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface HostCapabilities {
  readonly experimental?: Readonly<Record<string, unknown>> | undefined
  readonly openLinks?: object | undefined
  readonly downloadFile?: object | undefined
  readonly serverTools?: { readonly listChanged?: boolean | undefined } | undefined
  readonly serverResources?: { readonly listChanged?: boolean | undefined } | undefined
  readonly logging?: object | undefined
  readonly sandbox?: {
    readonly permissions?: Readonly<Record<string, object>> | undefined
    readonly csp?: Readonly<Record<string, ReadonlyArray<string>>> | undefined
  } | undefined
  readonly [key: string]: unknown
}

/**
 * The host's description of where and how the page is shown.
 *
 * **Details**
 *
 * `toolInfo.id` is the JSON-RPC id of the `tools/call` that opened the page,
 * the same id the server sees as `McpRequestContext.requestId`. The host may
 * change any field later through `ui/notifications/host-context-changed`;
 * the page observes the merged value on `McpAppView.hostContext`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface HostContext {
  readonly toolInfo?: { readonly id?: McpSchema.RequestId | undefined; readonly tool: McpSchema.Tool } | undefined
  readonly theme?: "light" | "dark" | undefined
  readonly styles?: {
    readonly variables?: Readonly<Record<string, string | undefined>> | undefined
    readonly css?: { readonly fonts?: string | undefined } | undefined
  } | undefined
  readonly displayMode?: DisplayMode | undefined
  readonly availableDisplayModes?: ReadonlyArray<DisplayMode> | undefined
  readonly containerDimensions?: {
    readonly width?: number | undefined
    readonly height?: number | undefined
    readonly maxWidth?: number | undefined
    readonly maxHeight?: number | undefined
  } | undefined
  readonly locale?: string | undefined
  readonly timeZone?: string | undefined
  readonly userAgent?: string | undefined
  readonly platform?: "web" | "desktop" | "mobile" | undefined
  readonly deviceCapabilities?:
    | { readonly touch?: boolean | undefined; readonly hover?: boolean | undefined }
    | undefined
  readonly safeAreaInsets?: {
    readonly top: number
    readonly right: number
    readonly bottom: number
    readonly left: number
  } | undefined
  readonly [key: string]: unknown
}

/**
 * What the page declares in `ui/initialize`.
 *
 * **Details**
 *
 * `availableDisplayModes` lists the modes the page can render; a host must
 * not switch the page to another one. App-provided tools are not supported.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface AppCapabilities {
  readonly experimental?: Readonly<Record<string, unknown>> | undefined
  readonly availableDisplayModes?: ReadonlyArray<DisplayMode> | undefined
}

/**
 * A `postMessage`-capable connection to the host.
 *
 * **Details**
 *
 * `postMessage` sends one JSON-RPC message object. `onMessage` registers a
 * listener for incoming message objects and returns the function that removes
 * it. In a browser the target is `window.parent` and the listener reads
 * `event.data`; `@effect/platform-browser` provides that transport.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Transport {
  readonly postMessage: (message: unknown) => void
  readonly onMessage: (listener: (message: unknown) => void) => () => void
}

/**
 * The host cancelled the tool call that opened the page.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.3
 */
export class ToolCancelled extends Schema.Error<ToolCancelled>("effect/ai/McpAppView/ToolCancelled")({
  _tag: Schema.tag("ToolCancelled"),
  reason: Schema.optional(Schema.String)
}) {
  override get message(): string {
    return this.reason === undefined
      ? "The host cancelled the tool call"
      : `The host cancelled the tool call: ${this.reason}`
  }
}

/**
 * The host does not offer the capability an operation needs. The request was
 * not sent.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.3
 */
export class UnsupportedCapability
  extends Schema.Error<UnsupportedCapability>("effect/ai/McpAppView/UnsupportedCapability")({
    _tag: Schema.tag("UnsupportedCapability"),
    capability: Schema.String
  })
{
  override get message(): string {
    return `The host does not support ${this.capability}`
  }
}

/**
 * The host answered a request with a JSON-RPC error.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.3
 */
export class HostError extends Schema.Error<HostError>("effect/ai/McpAppView/HostError")({
  _tag: Schema.tag("HostError"),
  method: Schema.String,
  code: Schema.Int,
  description: Schema.String,
  data: Schema.optional(Schema.Unknown)
}) {
  override get message(): string {
    return `${this.method} failed with code ${this.code}: ${this.description}`
  }
}

/**
 * The tool call that opened the page, typed by the tool's schemas.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface ToolCall<T extends Tool.Any> {
  /**
   * The complete tool arguments, decoded with the tool's parameters schema.
   */
  readonly input: Effect.Effect<Tool.Parameters<T>, never, ParametersDecodingServices<T>>
  /**
   * The tool's `structuredContent`, decoded with its success schema. A result
   * with `isError` fails with `ToolError`, keeping the whole result.
   */
  readonly result: Effect.Effect<Tool.Success<T>, ToolCancelled | ToolError, SuccessDecodingServices<T>>
}

/**
 * The services the tool's parameters schema needs to decode its arguments.
 *
 * @stability unstable
 * @category utility types
 * @since 4.1.3
 */
export type ParametersDecodingServices<T extends Tool.Any> = Tool.ParametersSchema<T>["DecodingServices"]

/**
 * The services the tool's parameters schema needs to encode its arguments.
 *
 * @stability unstable
 * @category utility types
 * @since 4.1.3
 */
export type ParametersEncodingServices<T extends Tool.Any> = Tool.ParametersSchema<T>["EncodingServices"]

/**
 * The services the tool's success schema needs to decode its result.
 *
 * @stability unstable
 * @category utility types
 * @since 4.1.3
 */
export type SuccessDecodingServices<T extends Tool.Any> = Tool.SuccessSchema<T>["DecodingServices"]

/**
 * The page's connection to its host.
 *
 * **Details**
 *
 * `toolInput`, `toolResult` and `toolInputPartial` carry the call that opened
 * the page. `toolInputPartial` ends once the complete input arrives and is
 * meant for one consumer. `hostContext` holds the host context merged with
 * every change the host sent since.
 *
 * Values are encoded and decoded with the tool's schemas and the MCP result
 * schemas; a mismatch is a defect, as the page and its server share the tool
 * definitions and the host is trusted. Services the tool's schemas need are
 * required by the effects that encode or decode with them.
 *
 * Operations the stable specification gates on a host capability fail with
 * {@link UnsupportedCapability} without sending the request: `callTool` on
 * `serverTools`, `readResource` on `serverResources`, `openLink` on
 * `openLinks`, `log` on `logging`, `downloadFile` on `downloadFile`, and
 * `requestDisplayMode` on the host context's `availableDisplayModes`, which
 * must list the requested mode.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Service {
  /**
   * The host's name and version.
   */
  readonly hostInfo: McpSchema.Implementation
  /**
   * What the host offers, as sent in `ui/initialize`.
   */
  readonly hostCapabilities: HostCapabilities
  /**
   * The host context, merged with every `host-context-changed` notification.
   */
  readonly hostContext: SubscriptionRef.SubscriptionRef<HostContext>
  /**
   * The complete arguments of the tool call that opened the page.
   */
  readonly toolInput: Effect.Effect<Readonly<Record<string, unknown>>>
  /**
   * The arguments as the agent streams them, before `toolInput` completes.
   */
  readonly toolInputPartial: Stream.Stream<Readonly<Record<string, unknown>>>
  /**
   * The result of the tool call that opened the page.
   */
  readonly toolResult: Effect.Effect<McpSchema.CallToolResult, ToolCancelled>
  /**
   * The tool call that opened the page, typed by `tool`'s schemas.
   */
  readonly toolCall: <T extends Tool.Any>(tool: T) => ToolCall<T>
  /**
   * Calls a server tool through the host, encoding `params` and decoding the
   * `structuredContent` with the tool's schemas.
   */
  readonly callTool: <T extends Tool.Any>(
    tool: T,
    params: Tool.Parameters<T>
  ) => Effect.Effect<
    Tool.Success<T>,
    ToolError | HostError | UnsupportedCapability,
    ParametersEncodingServices<T> | SuccessDecodingServices<T>
  >
  /**
   * Reads a server resource through the host.
   */
  readonly readResource: (
    uri: string
  ) => Effect.Effect<McpSchema.ReadResourceResult, HostError | UnsupportedCapability>
  /**
   * Asks the host to open a URL in the user's browser.
   */
  readonly openLink: (url: string) => Effect.Effect<void, HostError | UnsupportedCapability>
  /**
   * Adds a user message to the host's conversation.
   */
  readonly sendMessage: (content: McpSchema.ContentBlock) => Effect.Effect<void, HostError>
  /**
   * Replaces the context the host gives the model on its next turn.
   */
  readonly updateModelContext: (params: {
    readonly content?: ReadonlyArray<McpSchema.ContentBlock> | undefined
    readonly structuredContent?: Readonly<Record<string, unknown>> | undefined
  }) => Effect.Effect<void, HostError>
  /**
   * Asks for a display mode and returns the mode the host settled on.
   */
  readonly requestDisplayMode: (mode: DisplayMode) => Effect.Effect<DisplayMode, HostError | UnsupportedCapability>
  /**
   * Tells the host the rendered size of the page.
   */
  readonly sendSizeChanged: (size: {
    readonly width?: number | undefined
    readonly height?: number | undefined
  }) => Effect.Effect<void>
  /**
   * Sends a log message to the host.
   */
  readonly log: (
    level: McpSchema.LoggingLevel,
    data: unknown,
    logger?: string | undefined
  ) => Effect.Effect<void, UnsupportedCapability>
  /**
   * Asks the host to download files, inline or by link (draft specification).
   */
  readonly downloadFile: (
    contents: ReadonlyArray<McpSchema.EmbeddedResource | McpSchema.ResourceLink>
  ) => Effect.Effect<void, HostError | UnsupportedCapability>
  /**
   * Asks the host to tear the page down (draft specification). The host may
   * ignore it; when it agrees, it sends `ui/resource-teardown`.
   */
  readonly requestTeardown: Effect.Effect<void>
  /**
   * Runs `program` until it completes or the host tears the page down. On
   * `ui/resource-teardown` the program is interrupted, its finalizers run, and
   * only then does the host get its answer; `run` succeeds once the answer is
   * sent, so a layer provided around `run` stays open long enough. After a
   * teardown, `run` returns at once. Interrupting `run` interrupts `program`
   * and waits for its finalizers.
   */
  readonly run: <A, E, R>(program: Effect.Effect<A, E, R>) => Effect.Effect<void, E, Exclude<R, Scope.Scope>>
}

/**
 * The page's connection to its host, built by {@link layer}.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export class McpAppView extends Context.Service<McpAppView, Service>()("effect/ai/McpAppView") {}

/**
 * Options for {@link layer} and {@link make}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Options {
  readonly transport: Transport
  readonly appInfo: McpSchema.Implementation
  readonly appCapabilities?: AppCapabilities | undefined
}

/**
 * Connects to the host and completes the `ui/initialize` handshake.
 *
 * **Details**
 *
 * The transport is subscribed before the handshake starts, so nothing the
 * host sends is lost. Host requests other than `ping` and
 * `ui/resource-teardown` are answered with JSON-RPC `-32601`. The connection
 * lives in the surrounding `Scope`; closing it tears down every program
 * started with `run`.
 *
 * @see {@link layer} for the layer-based wrapper
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const make: (options: Options) => Effect.Effect<Service, HostError, Scope.Scope> = Effect.fnUntraced(
  function*(options: Options) {
    const transport = options.transport
    const inbox = yield* Queue.unbounded<unknown>()
    const unsubscribe = transport.onMessage((message) => {
      Queue.offerUnsafe(inbox, message)
    })
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe))

    const post = (message: object) => Effect.sync(() => transport.postMessage(message))
    const notify = (method: string, params: unknown) => post({ jsonrpc: "2.0", method, params })
    const reply = (id: McpSchema.RequestId, result: unknown) => post({ jsonrpc: "2.0", id, result })
    const replyError = (id: McpSchema.RequestId, code: number, message: string) =>
      post({ jsonrpc: "2.0", id, error: { code, message } })

    const pending = new Map<
      number,
      { readonly method: string; readonly deferred: Deferred.Deferred<unknown, HostError> }
    >()
    let nextId = 1
    const request = (method: string, params: unknown): Effect.Effect<unknown, HostError> =>
      Effect.suspend(() => {
        const id = nextId++
        const deferred = Deferred.makeUnsafe<unknown, HostError>()
        pending.set(id, { method, deferred })
        return post({ jsonrpc: "2.0", id, method, params }).pipe(
          Effect.andThen(Deferred.await(deferred)),
          Effect.onInterrupt(() => Effect.sync(() => pending.delete(id)))
        )
      })

    const toolInput = yield* Deferred.make<Readonly<Record<string, unknown>>>()
    const toolInputPartial = yield* Queue.unbounded<Readonly<Record<string, unknown>>, Cause.Done>()
    const toolResult = yield* Deferred.make<McpSchema.CallToolResult, ToolCancelled>()
    const hostContext = yield* SubscriptionRef.make<HostContext>({})
    // Programs started with `run` live here, so a teardown ends them all.
    const owned = yield* Scope.make()
    yield* Effect.addFinalizer(() => Scope.close(owned, Exit.void))
    // Set once the host asks for a teardown; `replied` completes after the answer is posted.
    let tearingDown = false
    const replied = yield* Deferred.make<void>()

    const settle = (message: McpSchema.JsonRpcResponse) => {
      if (typeof message.id !== "number") return Effect.void
      const entry = pending.get(message.id)
      if (entry === undefined) return Effect.void
      pending.delete(message.id)
      return message.error === undefined
        ? Deferred.succeed(entry.deferred, message.result)
        : Deferred.fail(
          entry.deferred,
          new HostError({
            method: entry.method,
            code: message.error.code,
            description: message.error.message,
            data: message.error.data
          })
        )
    }

    const handleRequest = (id: McpSchema.RequestId, method: string): Effect.Effect<void, never, Scope.Scope> => {
      switch (method) {
        case "ping":
          return reply(id, {})
        case "ui/resource-teardown":
          // Interrupt every owned program, let the finalizers finish, then answer. `run`
          // waits for the answer, so a layer provided around `run` outlives it.
          tearingDown = true
          return Scope.close(owned, Exit.void).pipe(
            Effect.andThen(reply(id, {})),
            Effect.andThen(Deferred.succeed(replied, undefined)),
            Effect.forkScoped,
            Effect.asVoid
          )
        default:
          return replyError(id, McpSchema.METHOD_NOT_FOUND_ERROR_CODE, `Method not found: ${method}`)
      }
    }

    const handleNotification = (method: string, params: unknown): Effect.Effect<void> => {
      switch (method) {
        case "ui/notifications/tool-input":
          return Effect.andThen(Deferred.succeed(toolInput, argumentsOf(params)), Queue.end(toolInputPartial))
        case "ui/notifications/tool-input-partial":
          return Effect.asVoid(Queue.offer(toolInputPartial, argumentsOf(params)))
        case "ui/notifications/tool-result":
          return Effect.flatMap(Effect.exit(decodeCallToolResult(params)), (exit) => Deferred.done(toolResult, exit))
        case "ui/notifications/tool-cancelled":
          return Effect.asVoid(Deferred.fail(toolResult, new ToolCancelled({ reason: reasonOf(params) })))
        case "ui/notifications/host-context-changed":
          return Predicate.isReadonlyObject(params)
            ? SubscriptionRef.update(hostContext, (current) => ({ ...current, ...params }))
            : Effect.void
        default:
          return Effect.void
      }
    }

    const handle = (message: unknown): Effect.Effect<void, never, Scope.Scope> => {
      if (!Predicate.isReadonlyObject(message) || message.jsonrpc !== "2.0") return Effect.void
      if (typeof message.method === "string") {
        return typeof message.id === "string" || typeof message.id === "number"
          ? handleRequest(message.id, message.method)
          : handleNotification(message.method, message.params)
      }
      return "id" in message ? settle(message as McpSchema.JsonRpcResponse) : Effect.void
    }
    yield* Queue.take(inbox).pipe(Effect.flatMap(handle), Effect.forever, Effect.forkScoped)

    const initialized = yield* request("ui/initialize", {
      protocolVersion: PROTOCOL_VERSION,
      appInfo: options.appInfo,
      appCapabilities: options.appCapabilities ?? {}
    }).pipe(Effect.map(initializeResult))
    yield* SubscriptionRef.set(hostContext, initialized.hostContext)
    yield* notify("ui/notifications/initialized", {})

    const requireCapability = (capability: keyof HostCapabilities & string) =>
      initialized.hostCapabilities[capability] === undefined
        ? Effect.fail(new UnsupportedCapability({ capability }))
        : Effect.void

    const decodeSuccess = <T extends Tool.Any>(
      tool: T,
      result: McpSchema.CallToolResult
    ): Effect.Effect<Tool.Success<T>, ToolError, SuccessDecodingServices<T>> =>
      result.isError === true
        ? Effect.fail(new ToolError({ result }))
        // `Success<T>` is the success schema's `Type`, which TypeScript cannot see for a generic `T`.
        : Effect.orDie(
          decodeToolJson(tool.successSchema as Tool.SuccessSchema<T>)(result.structuredContent)
        ) as Effect.Effect<
          Tool.Success<T>,
          never,
          SuccessDecodingServices<T>
        >

    const callTool = <T extends Tool.Any>(
      tool: T,
      params: Tool.Parameters<T>
    ): Effect.Effect<
      Tool.Success<T>,
      ToolError | HostError | UnsupportedCapability,
      ParametersEncodingServices<T> | SuccessDecodingServices<T>
    > =>
      requireCapability("serverTools").pipe(
        Effect.andThen(Effect.orDie(encodeToolJson(tool.parametersSchema as Tool.ParametersSchema<T>)(params))),
        Effect.flatMap((args) => request("tools/call", { name: tool.name, arguments: args })),
        Effect.flatMap(decodeCallToolResult),
        Effect.flatMap((result) => decodeSuccess(tool, result))
      )

    const run = <A, E, R>(program: Effect.Effect<A, E, R>): Effect.Effect<void, E, Exclude<R, Scope.Scope>> =>
      Effect.uninterruptibleMask((restore) =>
        Effect.flatMap(
          Effect.forkIn(restore(Effect.scoped(program)), owned),
          (fiber) =>
            restore(Fiber.await(fiber)).pipe(
              // Interrupting the caller interrupts the program and waits for its finalizers.
              Effect.onInterrupt(() => Fiber.interrupt(fiber)),
              Effect.flatMap((exit) => {
                if (Exit.isSuccess(exit)) return Effect.void
                if (!Cause.hasInterruptsOnly(exit.cause)) return Effect.failCause(exit.cause)
                return tearingDown ? restore(Deferred.await(replied)) : Effect.void
              })
            )
        )
      )

    return McpAppView.of({
      hostInfo: initialized.hostInfo,
      hostCapabilities: initialized.hostCapabilities,
      hostContext,
      toolInput: Deferred.await(toolInput),
      toolInputPartial: Stream.fromQueue(toolInputPartial),
      toolResult: Deferred.await(toolResult),
      toolCall: <T extends Tool.Any>(tool: T): ToolCall<T> => ({
        input: Effect.flatMap(
          Deferred.await(toolInput),
          (input) =>
            Effect.orDie(decodeToolJson(tool.parametersSchema as Tool.ParametersSchema<T>)(input)) as Effect.Effect<
              Tool.Parameters<T>,
              never,
              ParametersDecodingServices<T>
            >
        ),
        result: Effect.flatMap(Deferred.await(toolResult), (result) => decodeSuccess(tool, result))
      }),
      callTool,
      readResource: (uri) =>
        requireCapability("serverResources").pipe(
          Effect.andThen(request("resources/read", { uri })),
          Effect.flatMap(decodeReadResourceResult)
        ),
      openLink: (url) =>
        requireCapability("openLinks").pipe(Effect.andThen(request("ui/open-link", { url })), Effect.asVoid),
      sendMessage: (content) =>
        Effect.flatMap(
          encodeContentBlock(content),
          (content) => Effect.asVoid(request("ui/message", { role: "user", content }))
        ),
      updateModelContext: (params) =>
        Effect.flatMap(
          params.content === undefined ? Effect.succeed(undefined) : encodeContentBlocks(params.content),
          (content) =>
            Effect.asVoid(request("ui/update-model-context", {
              ...(content === undefined ? {} : { content }),
              ...(params.structuredContent === undefined ? {} : { structuredContent: params.structuredContent })
            }))
        ),
      requestDisplayMode: (mode) =>
        Effect.flatMap(
          SubscriptionRef.get(hostContext),
          (context): Effect.Effect<DisplayMode, HostError | UnsupportedCapability> => {
            // The host offers only the modes it lists; an absent list offers none.
            return context.availableDisplayModes?.includes(mode) !== true
              ? Effect.fail(new UnsupportedCapability({ capability: "availableDisplayModes" }))
              : Effect.map(request("ui/request-display-mode", { mode }), displayModeOf(mode))
          }
        ),
      sendSizeChanged: (size) => notify("ui/notifications/size-changed", size),
      log: (level, data, logger) =>
        requireCapability("logging").pipe(
          Effect.andThen(notify("notifications/message", { level, data, ...(logger === undefined ? {} : { logger }) }))
        ),
      downloadFile: (contents) =>
        requireCapability("downloadFile").pipe(
          Effect.andThen(encodeContentBlocks(contents)),
          Effect.flatMap((contents) => request("ui/download-file", { contents })),
          Effect.asVoid
        ),
      requestTeardown: notify("ui/notifications/request-teardown", {}),
      run
    })
  }
)

/**
 * Creates a layer that connects to the host and completes the handshake.
 *
 * @see {@link make} for the details
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const layer = (options: Options): Layer.Layer<McpAppView, HostError> => Layer.effect(McpAppView, make(options))

/**
 * Runs a page program with the connected host.
 *
 * **Details**
 *
 * The same as `McpAppView.run`: `program` is interrupted and its finalizers
 * run before the host's `ui/resource-teardown` is answered.
 *
 * @stability experimental
 * @category running
 * @since 4.1.3
 */
export const run = <A, E, R>(
  program: Effect.Effect<A, E, R>
): Effect.Effect<void, E, Exclude<R, Scope.Scope> | McpAppView> =>
  Effect.flatMap(McpAppView, (view) => view.run(program))

// A tool schema's JSON codec keeps the schema's own service requirements.
const decodeToolJson = <S extends Schema.Constraint>(
  schema: S
): (input: unknown) => Effect.Effect<S["Type"], Schema.SchemaError, S["DecodingServices"]> =>
  Schema.decodeUnknownEffect(Schema.toCodecJson(schema))
const encodeToolJson = <S extends Schema.Constraint>(
  schema: S
): (input: unknown) => Effect.Effect<unknown, Schema.SchemaError, S["EncodingServices"]> =>
  Schema.encodeUnknownEffect(Schema.toCodecJson(schema))

// The host is trusted and the schemas are shared with the server, so a mismatch is a defect.
const orDie = <A, E, R>(decode: (input: unknown) => Effect.Effect<A, E, R>) => (input: unknown) =>
  Effect.orDie(decode(input))
const decodeCallToolResult = orDie(Schema.decodeUnknownEffect(McpSchema.CallToolResult))
const decodeReadResourceResult = orDie(Schema.decodeUnknownEffect(McpSchema.ReadResourceResult))
const decodeImplementation = Schema.decodeUnknownSync(McpSchema.Implementation)
const encodeContentBlock = orDie(Schema.encodeUnknownEffect(McpSchema.ContentBlock))
const encodeContentBlocks = orDie(Schema.encodeUnknownEffect(Schema.Array(McpSchema.ContentBlock)))

const argumentsOf = (params: unknown): Readonly<Record<string, unknown>> =>
  Predicate.isReadonlyObject(params) && Predicate.isReadonlyObject(params.arguments) ? params.arguments : {}

const reasonOf = (params: unknown): string | undefined =>
  Predicate.isReadonlyObject(params) && typeof params.reason === "string" ? params.reason : undefined

const displayModeOf = (requested: DisplayMode) => (result: unknown): DisplayMode =>
  Predicate.isReadonlyObject(result) && typeof result.mode === "string" ? result.mode as DisplayMode : requested

const initializeResult = (result: unknown): {
  readonly hostInfo: McpSchema.Implementation
  readonly hostCapabilities: HostCapabilities
  readonly hostContext: HostContext
} => {
  const fields = Predicate.isReadonlyObject(result) ? result : {}
  return {
    hostInfo: decodeImplementation(fields.hostInfo),
    hostCapabilities: Predicate.isReadonlyObject(fields.hostCapabilities) ? fields.hostCapabilities : {},
    hostContext: Predicate.isReadonlyObject(fields.hostContext) ? fields.hostContext : {}
  }
}
