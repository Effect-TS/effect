import { hole } from "effect"
import { McpProtocol, McpSchema, McpServer, Tool, Toolkit } from "effect/ai"
import * as McpProtocolInternal from "effect/ai/internal/mcpProtocol"
import type * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as Layer from "effect/Layer"
import * as Rpc from "effect/rpc/Rpc"
import * as RpcGroup from "effect/rpc/RpcGroup"
import type * as RpcServer from "effect/rpc/RpcServer"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import type * as Stdio from "effect/Stdio"
import { describe, expect, it } from "tstyche"

const serverOptions = {
  name: "TestServer",
  version: "1.0.0",
  protocols: [McpProtocol.v2025_11_25]
} as const

type Requires<S> = McpServer.Request<"Requires", S>

describe("McpServer", () => {
  it("should expose protocol-neutral request facts without a session service", () => {
    expect(McpSchema.McpRequestContext.useSync((context) => context.protocolVersion)).type.toBe<
      Effect.Effect<string, never, McpSchema.McpRequestContext>
    >()
    expect(McpSchema.McpRequestContext.useSync((context) => context.clientInfo)).type.toBe<
      Effect.Effect<McpSchema.Implementation | undefined, never, McpSchema.McpRequestContext>
    >()
    expect(McpServer.clientCapabilities).type.toBe<
      Effect.Effect<McpSchema.ClientCapabilities, never, McpSchema.McpRequestContext>
    >()
  })

  it("should accept scalar tool output schemas while keeping inputs object-rooted", () => {
    expect(McpSchema.Tool.make).type.toBeCallableWith({
      name: "scalar-output",
      inputSchema: { type: "object" },
      outputSchema: { type: "string" }
    })
    expect({ type: "string" } as const).type.not.toBeAssignableTo<McpSchema.ToolJson>()
  })

  it("should accept JSON-valued structured sampling results", () => {
    expect(McpSchema.ToolResultContent.make).type.toBeCallableWith({
      toolUseId: "call-1",
      content: [],
      structuredContent: ["sunny", null, 24]
    })
  })

  describe("protocol configuration", () => {
    it("should restrict request-scoped HTTP to stateless protocols without session options", () => {
      const options = {
        name: "TestServer",
        version: "1.0.0",
        path: "/mcp",
        protocols: [McpProtocol.v2026_07_28]
      } as const

      expect(McpServer.layerHttpRequestScoped).type.toBeCallableWith(options)
      expect(McpServer.layerHttpRequestScoped).type.not.toBeCallableWith({
        ...options,
        protocols: [McpProtocol.v2025_11_25] as const
      })
      expect(McpServer.layerHttpRequestScoped).type.not.toBeCallableWith({
        ...options,
        protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25] as const
      })
      expect(McpServer.layerHttpRequestScoped).type.not.toBeCallableWith({
        ...options,
        allowSubscriptions: true
      })
      expect(McpServer.layerHttpRequestScoped).type.not.toBeCallableWith({
        ...options,
        allowSessionTermination: true
      })
    })

    it("should accept a non-empty protocol declaration when constructing any server", () => {
      expect(McpServer.run).type.toBeCallableWith(serverOptions)
      expect(McpServer.layer).type.toBeCallableWith(serverOptions)
      expect(McpServer.layerStdio).type.toBeCallableWith(serverOptions)
      expect(McpServer.layerHttp).type.toBeCallableWith({
        ...serverOptions,
        path: "/mcp",
        allowedOrigins: ["https://mcp.example"]
      })
    })

    it("should require a protocol declaration when constructing a server", () => {
      expect(McpServer.layer).type.not.toBeCallableWith({
        name: "TestServer",
        version: "1.0.0"
      })
    })

    it("should reject an empty protocol declaration when constructing a server", () => {
      expect(McpServer.layer).type.not.toBeCallableWith({
        name: "TestServer",
        version: "1.0.0",
        protocols: [] as const
      })
    })

    it("should reject version strings when protocol adapter values are required", () => {
      expect(McpServer.layer).type.not.toBeCallableWith({
        name: "TestServer",
        version: "1.0.0",
        protocols: ["2025-06-18"] as const
      })
    })

    it("should require client notification RPCs to be included in the complete client RPC group", () => {
      const Request = Rpc.make("request", {
        payload: Schema.Struct({}),
        success: Schema.Struct({})
      })
      const Notification = Rpc.make("notification", {
        payload: Schema.Struct({}),
        success: Schema.Struct({})
      })

      expect(McpProtocolInternal.make).type.not.toBeCallableWith({
        protocolVersion: "test",
        clientRpcs: RpcGroup.make(Request),
        clientNotificationRpcs: RpcGroup.make(Notification),
        serverRequestRpcs: RpcGroup.make(),
        serverNotificationRpcs: RpcGroup.make()
      })
    })

    it("should expose every historical protocol adapter", () => {
      expect<McpProtocol.ProtocolVersion>().type.toBe<
        "2024-11-05" | "2025-03-26" | "2025-06-18" | "2025-11-25" | "2026-07-28"
      >()
    })

    it("should expose each historical protocol through the structural adapter interface", () => {
      expect(McpProtocol.v2024_11_05).type.toBeAssignableTo<McpProtocol.ProtocolAdapter<"2024-11-05">>()
      expect(McpProtocol.v2025_03_26).type.toBeAssignableTo<McpProtocol.ProtocolAdapter<"2025-03-26">>()
      expect(McpProtocol.v2025_06_18).type.toBeAssignableTo<McpProtocol.ProtocolAdapter<"2025-06-18">>()
      expect(McpProtocol.v2025_11_25).type.toBeAssignableTo<McpProtocol.ProtocolAdapter<"2025-11-25">>()
      expect(McpProtocol.v2026_07_28).type.toBeAssignableTo<McpProtocol.ProtocolAdapter<"2026-07-28">>()
      expect(McpProtocol.v2025_06_18.runtime).type.toBe<McpProtocol.StatefulRuntimeDescriptor>()
      expect(McpProtocol.v2026_07_28.runtime).type.toBe<McpProtocol.StatelessRuntimeDescriptor>()

      const protocols: readonly [McpProtocol.ProtocolAdapter, ...Array<McpProtocol.ProtocolAdapter>] = [
        McpProtocol.v2024_11_05,
        McpProtocol.v2025_03_26,
        McpProtocol.v2025_06_18,
        McpProtocol.v2025_11_25,
        McpProtocol.v2026_07_28
      ]

      expect(protocols[0].protocolVersion).type.toBe<McpProtocol.ProtocolVersion>()
      expect(protocols[0].runtime).type.toBe<McpProtocol.RuntimeDescriptor>()
      expect(protocols[0].runtime.transport).type.toBe<McpProtocol.TransportPolicy>()
      expect(protocols[0].clientRpcs.requests).type.toBeAssignableTo<ReadonlyMap<string, Rpc.Any>>()
    })

    it("should preserve the decoded tool JSON Schema shape", () => {
      expect<Schema.Schema.Type<typeof McpSchema.ToolJson>>().type.toBe<McpSchema.ToolJson>()
    })

    it("should expose invalid protocol declarations as typed constructor failures", () => {
      const run = McpServer.run(serverOptions)
      const layer = McpServer.layer(serverOptions)

      expect<Effect.Error<typeof run>>().type.toBe<Cause.IllegalArgumentError>()
      expect<Layer.Error<typeof layer>>().type.toBe<Cause.IllegalArgumentError>()
    })
  })

  it("should make declared toolkit dependencies request-level in both registration APIs", () => {
    const toolkit = Toolkit.make(Tool.make("http", { dependencies: [HttpClient.HttpClient] }))
    const registered = McpServer.registerToolkit(toolkit)
    const layer = McpServer.toolkit(toolkit)
    type Requirements = McpServer.McpServer | Tool.HandlersFor<typeof toolkit.tools> | Requires<HttpClient.HttpClient>

    expect<Effect.Services<typeof registered>>().type.toBe<Requirements>()
    expect<Layer.Services<typeof layer>>().type.toBe<Requirements>()
  })

  it("should keep toolkit schema services registration-time unless a tool declares them", () => {
    class IdCodec extends Context.Service<IdCodec, { readonly n: number }>()("IdCodec") {}
    class TagEncoder extends Context.Service<TagEncoder, { readonly n: number }>()("TagEncoder") {}
    const Id = hole<Schema.Codec<string, string, IdCodec, never>>()
    const Tag = hole<Schema.Codec<string, string, never, TagEncoder>>()
    const plain = Toolkit.make(Tool.make("plain", { parameters: Schema.Struct({ id: Id }), success: Tag }))
    const declared = Toolkit.make(Tool.make("declared", {
      parameters: Schema.Struct({ id: Id }),
      success: Schema.String,
      dependencies: [IdCodec, McpSchema.McpRequestContext]
    }))
    const plainLayer = McpServer.toolkit(plain)
    const declaredLayer = McpServer.toolkit(declared)

    expect<Layer.Services<typeof plainLayer>>().type.toBe<
      McpServer.McpServer | Tool.HandlersFor<typeof plain.tools> | IdCodec | TagEncoder
    >()
    expect<Layer.Services<typeof declaredLayer>>().type.toBe<
      McpServer.McpServer | Tool.HandlersFor<typeof declared.tools> | Requires<IdCodec>
    >()
  })

  describe("resource templates", () => {
    class Lookup extends Context.Service<Lookup, { readonly values: Array<string> }>()("Lookup") {}
    class IdCodec extends Context.Service<IdCodec, { readonly n: number }>()("IdCodec") {}
    class TagEncoder extends Context.Service<TagEncoder, { readonly n: number }>()("TagEncoder") {}

    it("should require template decoding services in both APIs", () => {
      const UserId = hole<Schema.Codec<string, string, IdCodec, never>>()
      const options = {
        name: "by-id",
        content: (_uri: string, id: string) => Effect.succeed(id)
      }
      const registered = McpServer.registerResource`user://${McpSchema.param("id", UserId)}`(options)
      const layer = McpServer.resource`user://${McpSchema.param("id", UserId)}`(options)

      expect<Effect.Services<typeof registered>>().type.toBe<IdCodec | McpServer.McpServer>()
      expect<Layer.Services<typeof layer>>().type.toBe<IdCodec | McpServer.McpServer>()
    })

    it("should require template completion encoding services in both APIs", () => {
      const Tag = hole<Schema.Codec<string, string, never, TagEncoder>>()
      const options = {
        name: "by-tag",
        completion: { tag: (input: string) => Effect.succeed([input]) },
        content: (_uri: string, tag: string) => Effect.succeed(tag)
      }
      const registered = McpServer.registerResource`tag://${McpSchema.param("tag", Tag)}`(options)
      const layer = McpServer.resource`tag://${McpSchema.param("tag", Tag)}`(options)

      expect<Effect.Services<typeof registered>>().type.toBe<TagEncoder | McpServer.McpServer>()
      expect<Layer.Services<typeof layer>>().type.toBe<TagEncoder | McpServer.McpServer>()
    })

    it("should make services used by one-argument completion handlers request-level in both APIs", () => {
      const registered = McpServer.registerResource`file://${Schema.String}`({
        name: "lookup",
        completion: { param0: (_input) => Effect.map(Lookup, (lookup) => lookup.values) },
        content: (_uri, path) => Effect.succeed(path)
      })
      const layer = McpServer.resource`file://${Schema.String}`({
        name: "lookup",
        completion: { param0: (_input) => Effect.map(Lookup, (lookup) => lookup.values) },
        content: (_uri, path) => Effect.succeed(path)
      })

      expect<Effect.Services<typeof registered>>().type.toBe<Requires<Lookup> | McpServer.McpServer>()
      expect<Layer.Services<typeof layer>>().type.toBe<Requires<Lookup> | McpServer.McpServer>()
    })

    it("should make services used by two-argument completion handlers request-level in both APIs", () => {
      const registered = McpServer.registerResource`file://${Schema.String}`({
        name: "lookup",
        completion: { param0: (_input, _context) => Effect.map(Lookup, (lookup) => lookup.values) },
        content: (_uri, path) => Effect.succeed(path)
      })
      const layer = McpServer.resource`file://${Schema.String}`({
        name: "lookup",
        completion: { param0: (_input, _context) => Effect.map(Lookup, (lookup) => lookup.values) },
        content: (_uri, path) => Effect.succeed(path)
      })

      expect<Effect.Services<typeof registered>>().type.toBe<Requires<Lookup> | McpServer.McpServer>()
      expect<Layer.Services<typeof layer>>().type.toBe<Requires<Lookup> | McpServer.McpServer>()
    })

    it("should count completion encoding services only for completed parameters", () => {
      const Tag = hole<Schema.Codec<string, string, never, TagEncoder>>()
      const uncompleted = McpServer.resource`tag://${McpSchema.param("tag", Tag)}`({
        name: "uncompleted",
        content: (_uri, tag) => Effect.succeed(tag)
      })
      const unnamed = McpServer.resource`tag://${Schema.String}/${Tag}`({
        name: "unnamed",
        completion: { param1: (input) => Effect.succeed([input]) },
        content: (_uri, _a, tag) => Effect.succeed(tag)
      })
      const otherUnnamed = McpServer.resource`tag://${Schema.String}/${Tag}`({
        name: "other-unnamed",
        completion: { param0: (input) => Effect.succeed([input]) },
        content: (_uri, _a, tag) => Effect.succeed(tag)
      })

      expect<Layer.Services<typeof uncompleted>>().type.toBe<McpServer.McpServer>()
      expect<Layer.Services<typeof unnamed>>().type.toBe<TagEncoder | McpServer.McpServer>()
      expect<Layer.Services<typeof otherUnnamed>>().type.toBe<McpServer.McpServer>()
    })

    it("should make a schema service request-level when a handler or completion reads it", () => {
      const UserId = hole<Schema.Codec<string, string, IdCodec, never>>()
      const content = McpServer.resource`user://${McpSchema.param("id", UserId)}`({
        name: "content-reads-codec",
        content: (_uri, id) => IdCodec.useSync((codec) => `${codec.n}:${id}`)
      })
      const completion = McpServer.resource`user://${McpSchema.param("id", UserId)}`({
        name: "completion-reads-codec",
        completion: { id: (input) => IdCodec.useSync((codec) => [`${codec.n}:${input}`]) },
        content: (_uri, id) => Effect.succeed(id)
      })
      const mixed = McpServer.resource`user://${McpSchema.param("id", UserId)}`({
        name: "mixed",
        completion: { id: (input) => Effect.map(Lookup, (lookup) => [input, ...lookup.values]) },
        content: (_uri, id) => Effect.succeed(id)
      })
      const requestContext = McpServer.resource`caps://${Schema.String}`({
        name: "request-context",
        completion: { param0: (input) => McpSchema.McpRequestContext.useSync(() => [input]) },
        content: (_uri, path) => Effect.succeed(path)
      })

      expect<Layer.Services<typeof content>>().type.toBe<Requires<IdCodec> | McpServer.McpServer>()
      expect<Layer.Services<typeof completion>>().type.toBe<Requires<IdCodec> | McpServer.McpServer>()
      expect<Layer.Services<typeof mixed>>().type.toBe<IdCodec | Requires<Lookup> | McpServer.McpServer>()
      expect<Layer.Services<typeof requestContext>>().type.toBe<McpServer.McpServer>()
    })
  })

  describe("prompts", () => {
    class Lookup extends Context.Service<Lookup, { readonly values: Array<string> }>()("Lookup") {}
    const name = () => Effect.map(Lookup, (lookup) => lookup.values)

    it("should require prompt completion encoding services in both APIs", () => {
      class TagEncoder extends Context.Service<TagEncoder, { readonly n: number }>()("TagEncoder") {}
      const Tag = hole<Schema.Codec<string, string, never, TagEncoder>>()
      const options = {
        name: "tagged",
        parameters: { tag: Tag },
        completion: { tag: (input: string) => Effect.succeed([input]) },
        content: ({ tag }: { readonly tag: string }) => Effect.succeed(tag)
      }
      const registered = McpServer.registerPrompt(options)
      const layer = McpServer.prompt(options)

      expect<Effect.Services<typeof registered>>().type.toBe<TagEncoder | McpServer.McpServer>()
      expect<Layer.Services<typeof layer>>().type.toBe<TagEncoder | McpServer.McpServer>()
    })

    it("should make services used by completion handlers request-level", () => {
      const options = {
        name: "lookup",
        parameters: { name: Schema.String },
        completion: { name },
        content: () => Effect.succeed("content")
      }
      const registered = McpServer.registerPrompt(options)
      const layer = McpServer.prompt(options)

      expect<Effect.Services<typeof registered>>().type.toBe<Requires<Lookup> | McpServer.McpServer>()
      expect<Layer.Services<typeof layer>>().type.toBe<Requires<Lookup> | McpServer.McpServer>()
    })

    it("should make services used by optional completion handlers request-level", () => {
      const completion: { readonly name?: typeof name } = { name }
      const options = {
        name: "lookup",
        parameters: { name: Schema.String },
        completion,
        content: () => Effect.succeed("content")
      }
      const registered = McpServer.registerPrompt(options)
      const layer = McpServer.prompt(options)

      expect<Effect.Services<typeof registered>>().type.toBe<Requires<Lookup> | McpServer.McpServer>()
      expect<Layer.Services<typeof layer>>().type.toBe<Requires<Lookup> | McpServer.McpServer>()
    })

    it("should require decoding of every parameter and encoding of completed parameters only", () => {
      class IdCodec extends Context.Service<IdCodec, { readonly n: number }>()("IdCodec") {}
      class TagEncoder extends Context.Service<TagEncoder, { readonly n: number }>()("TagEncoder") {}
      const UserId = hole<Schema.Codec<string, string, IdCodec, never>>()
      const Tag = hole<Schema.Codec<string, string, never, TagEncoder>>()
      const tagged = McpServer.prompt({
        name: "tagged",
        parameters: { id: UserId, tag: Tag, other: Tag },
        completion: { tag: (input) => Effect.succeed([input]) },
        content: ({ id, tag }) => Effect.succeed(`${id} ${tag}`)
      })
      const untagged = McpServer.prompt({
        name: "untagged",
        parameters: { other: Tag },
        content: ({ other }) => Effect.succeed(other)
      })

      expect<Layer.Services<typeof tagged>>().type.toBe<IdCodec | TagEncoder | McpServer.McpServer>()
      expect<Layer.Services<typeof untagged>>().type.toBe<McpServer.McpServer>()
    })
  })

  describe("request context", () => {
    it("should not claim that stateless handlers receive the legacy client service", () => {
      const layer = McpServer.resource({
        uri: "file:///legacy-client.txt",
        name: "legacy-client",
        content: McpSchema.McpServerClient.useSync((client) => client.clientInfo.name)
      })
      expect<Layer.Services<typeof layer>>().type.toBe<McpServer.McpServer | Requires<McpSchema.McpServerClient>>()
    })

    it("should expose multi-round-trip input through the request context", () => {
      expect(McpSchema.McpRequestContext.useSync((context) => context.inputResponses)).type.toBe<
        Effect.Effect<
          Readonly<Record<string, McpSchema.McpInputResponse>> | undefined,
          never,
          McpSchema.McpRequestContext
        >
      >()
      expect(McpSchema.McpRequestContext.useSync((context) => context.requestState)).type.toBe<
        Effect.Effect<string | undefined, never, McpSchema.McpRequestContext>
      >()
      expect(
        new McpSchema.InputRequired({
          inputRequests: {
            approval: { method: "elicitation/create", params: { message: "Approve" } }
          }
        })
      ).type.toBe<McpSchema.InputRequired>()
      expect(
        new McpSchema.InputRequired({
          requestState: "retry-after-1s"
        })
      ).type.toBe<McpSchema.InputRequired>()
      expect(McpSchema.InputRequired).type.not.toBeConstructableWith({})
    })

    it("should expose the selected protocol version when a handler reads its client", () => {
      expect(McpSchema.McpServerClient.useSync((client) => client.protocolVersion)).type.toBe<
        Effect.Effect<McpProtocol.StatefulProtocolVersion, never, McpSchema.McpServerClient>
      >()
    })

    it("should expose initialization data and the generated reverse RPC client", () => {
      expect(McpSchema.McpServerClient.useSync((client) => client.initializePayload.capabilities)).type.toBe<
        Effect.Effect<McpSchema.ClientCapabilities, never, McpSchema.McpServerClient>
      >()
      expect(McpSchema.McpServerClient.useSync((client) => client.initializePayload.clientInfo)).type.toBe<
        Effect.Effect<McpSchema.Implementation, never, McpSchema.McpServerClient>
      >()
      expect(McpSchema.McpServerClient.use((client) => client.getClient)).type.toBeAssignableTo<
        Effect.Effect<object, never, McpSchema.McpServerClient | Scope.Scope>
      >()
    })
  })

  describe("request-level dependencies", () => {
    class CurrentUser extends Context.Service<CurrentUser, { readonly id: string }>()("CurrentUser") {}
    class Db extends Context.Service<Db, { readonly read: (key: string) => Effect.Effect<string> }>()("Db") {}
    class SessionStore extends Context.Service<SessionStore, {
      readonly lookup: (token: string | undefined) => Effect.Effect<{ readonly id: string }, Unauthorized>
    }>()("SessionStore") {}
    class Unauthorized extends Schema.Error<Unauthorized>("Unauthorized")({
      ...McpSchema.McpErrorBase.fields,
      _tag: Schema.tag("Unauthorized"),
      code: Schema.tag(-32001)
    }) {}
    class Boom extends Data.TaggedError("Boom")<{}> {}

    const WhoAmI = Tool.make("WhoAmI", { success: Schema.String, dependencies: [CurrentUser] })
    const UserToolkit = Toolkit.make(WhoAmI)
    type UserHandlers = Tool.HandlersFor<typeof UserToolkit.tools>
    const UserTools = McpServer.toolkit(UserToolkit)

    const Auth = McpServer.middleware<{ provides: CurrentUser }>()(
      Effect.gen(function*() {
        const sessions = yield* SessionStore
        yield* Effect.addFinalizer(() => Effect.void)
        return (effect, { headers, sessionId }) =>
          Effect.flatMap(
            sessions.lookup(headers["authorization"] ?? sessionId),
            (user) => Effect.provideService(effect, CurrentUser, user)
          )
      })
    )
    const Audit = McpServer.middleware()((effect) => Effect.andThen(CurrentUser, effect))

    it("should discharge request markers only through MCP middleware", () => {
      const HttpAuth = HttpRouter.middleware<{ provides: CurrentUser }>()((effect) =>
        Effect.provideService(effect, CurrentUser, { id: "http" })
      )
      const withMiddleware = UserTools.pipe(Layer.provide(Auth.layer))
      const withService = UserTools.pipe(Layer.provide(Layer.succeed(CurrentUser, { id: "static" })))
      const withHttpMiddleware = UserTools.pipe(Layer.provide(HttpAuth.layer))
      const registered = McpServer.registerToolkit(UserToolkit).pipe(Effect.provide(Auth.layer))

      expect<Layer.Services<typeof withMiddleware>>().type.toBe<McpServer.McpServer | UserHandlers | SessionStore>()
      expect<Layer.Services<typeof withService>>().type.toBe<
        McpServer.McpServer | UserHandlers | Requires<CurrentUser>
      >()
      expect<Requires<CurrentUser>>().type.toBeAssignableTo<Layer.Services<typeof withHttpMiddleware>>()
      expect<Effect.Services<typeof registered>>().type.toBe<McpServer.McpServer | UserHandlers | SessionStore>()
    })

    it("should make resource and prompt handler services request-level", () => {
      const DbLive = hole<Layer.Layer<Db>>()
      const notes = McpServer.resource({
        uri: "file:///notes",
        name: "notes",
        content: Effect.flatMap(Db, (db) => db.read("notes"))
      })
      const notesWithService = notes.pipe(Layer.provide(DbLive))
      const notesClosedOver = Layer.unwrap(
        Effect.map(Db, (db) => McpServer.resource({ uri: "file:///notes", name: "notes", content: db.read("notes") }))
      )
      const greet = McpServer.prompt({
        name: "greet",
        parameters: { greeting: Schema.String },
        content: ({ greeting }) => Effect.map(CurrentUser, (user) => `${greeting}, ${user.id}`)
      })

      expect<Layer.Services<typeof notesWithService>>().type.toBe<McpServer.McpServer | Requires<Db>>()
      expect<Layer.Services<typeof notesClosedOver>>().type.toBe<McpServer.McpServer | Db>()
      expect<Layer.Services<typeof greet>>().type.toBe<McpServer.McpServer | Requires<CurrentUser>>()
    })

    it("should expose middleware as layers that provide request markers", () => {
      const AuthGlobal = McpServer.middleware<{ provides: CurrentUser }>()(
        (effect, { headers }) =>
          headers["authorization"] === undefined
            ? Effect.fail(new Unauthorized({ message: "Missing Authorization header" }))
            : Effect.provideService(effect, CurrentUser, { id: headers["authorization"] }),
        { global: true }
      )

      expect(Auth.layer).type.toBe<Layer.Layer<Requires<CurrentUser>, never, SessionStore>>()
      expect(Auth.layerGlobal).type.toBe<
        Layer.Layer<Requires<CurrentUser>, never, McpServer.McpServer | SessionStore>
      >()
      expect(AuthGlobal).type.toBe<Layer.Layer<Requires<CurrentUser>, never, McpServer.McpServer>>()
      expect(Audit.combine(Auth).layer).type.toBe<Layer.Layer<Requires<CurrentUser>, never, SessionStore>>()
      expect(Audit.combine(Auth).layerGlobal).type.toBe<
        Layer.Layer<Requires<CurrentUser>, never, McpServer.McpServer | SessionStore>
      >()
    })

    it("should reject middleware whose per-call needs are not met by combine or a transport", () => {
      const AuditGlobal = McpServer.middleware()((effect) => Effect.andThen(CurrentUser, effect), { global: true })
      const AuditGlobalBuilt = McpServer.middleware()(
        Effect.succeed((effect: Effect.Effect<McpServer.MiddlewareSuccess, McpSchema.McpErrorBase>) =>
          Effect.andThen(CurrentUser, effect)
        ),
        { global: true }
      )
      const IpGuard = McpServer.middleware()((effect) => Effect.andThen(HttpServerRequest.HttpServerRequest, effect))

      expect(Audit.layer).type.toBe<McpServer.MissingRequestDependencies<CurrentUser>>()
      expect(Audit.layerGlobal).type.toBe<McpServer.MissingRequestDependencies<CurrentUser>>()
      expect(AuditGlobal).type.toBe<McpServer.MissingRequestDependencies<CurrentUser>>()
      expect(AuditGlobalBuilt).type.toBe<McpServer.MissingRequestDependencies<CurrentUser>>()
      expect(IpGuard.layer).type.toBe<Layer.Layer<never, never, Requires<HttpServerRequest.HttpServerRequest>>>()
    })

    it("should require middleware failures to be MCP errors", () => {
      const middleware = McpServer.middleware()

      expect(middleware).type.toBeCallableWith(() => Effect.fail(new Unauthorized({ message: "Unauthorized" })))
      expect(middleware).type.not.toBeCallableWith(() => Effect.fail(new Boom()))
      expect(middleware).type.not.toBeCallableWith(Effect.succeed(() => Effect.fail(new Boom())))
      expect(middleware).type.not.toBeCallableWith(() => Effect.fail(new Boom()), { global: true })
    })

    describe("transports", () => {
      const TransportToolkit = Toolkit.make(Tool.make("transport", {
        dependencies: [Scope.Scope, HttpServerRequest.HttpServerRequest, McpSchema.McpServerClient]
      }))
      type TransportHandlers = Tool.HandlersFor<typeof TransportToolkit.tools>
      const TransportTools = McpServer.toolkit(TransportToolkit)
      const stateful = { ...serverOptions, protocols: [McpProtocol.v2025_11_25, McpProtocol.v2025_06_18] } as const
      const mixed = { ...serverOptions, protocols: [McpProtocol.v2025_06_18, McpProtocol.v2026_07_28] } as const
      const stateless = { ...serverOptions, path: "/mcp", protocols: [McpProtocol.v2026_07_28] } as const

      it("should leave undischarged markers on stdio and custom transports", () => {
        const authenticated = McpServer.layerStdio({
          ...stateful,
          registrations: UserTools.pipe(Layer.provide(Auth.layer))
        })
        const unauthenticated = McpServer.layerStdio({ ...stateful, registrations: UserTools })
        const stdio = McpServer.layerStdio({ ...stateful, registrations: TransportTools })
        const stdioMixed = McpServer.layerStdio({ ...mixed, registrations: TransportTools })
        const custom = McpServer.layer({ ...stateful, registrations: TransportTools })

        expect<Layer.Services<typeof authenticated>>().type.toBe<Stdio.Stdio | UserHandlers | SessionStore>()
        expect<Layer.Services<typeof unauthenticated>>().type.toBe<
          Stdio.Stdio | UserHandlers | Requires<CurrentUser>
        >()
        expect<Layer.Services<typeof stdio>>().type.toBe<
          Stdio.Stdio | TransportHandlers | Requires<HttpServerRequest.HttpServerRequest>
        >()
        expect<Layer.Services<typeof stdioMixed>>().type.toBe<
          | Stdio.Stdio
          | TransportHandlers
          | Requires<HttpServerRequest.HttpServerRequest>
          | Requires<McpSchema.McpServerClient>
        >()
        expect<Layer.Services<typeof custom>>().type.toBe<
          RpcServer.Protocol | TransportHandlers | Requires<HttpServerRequest.HttpServerRequest>
        >()
      })

      it("should convert undischarged markers into HTTP router requirements", () => {
        const http = McpServer.layerHttp({ ...stateful, path: "/mcp", registrations: TransportTools })
        const httpUser = McpServer.layerHttp({ ...stateful, path: "/mcp", registrations: UserTools })
        const requestScoped = McpServer.layerHttpRequestScoped({ ...stateless, registrations: TransportTools })

        expect<Layer.Services<typeof http>>().type.toBe<HttpRouter.HttpRouter | TransportHandlers>()
        expect<Layer.Services<typeof httpUser>>().type.toBe<
          HttpRouter.HttpRouter | UserHandlers | HttpRouter.Request<"Requires", CurrentUser>
        >()
        expect<Layer.Services<typeof requestScoped>>().type.toBe<
          HttpRouter.HttpRouter | TransportHandlers | HttpRouter.Request<"Requires", McpSchema.McpServerClient>
        >()
      })

      it("should require the server when registrations are merged with a transport", () => {
        const merged = Layer.mergeAll(UserTools.pipe(Layer.provide(Auth.layer)), McpServer.layerStdio(stateful))

        expect<McpServer.McpServer>().type.toBeAssignableTo<Layer.Services<typeof merged>>()
      })
    })

    describe("in-process testing", () => {
      const Confirm = Tool.make("Confirm", { success: Schema.Boolean, dependencies: [McpSchema.McpServerClient] })
      const Tools = Toolkit.make(WhoAmI, Confirm)
      const Handlers = hole<Layer.Layer<Tool.HandlersFor<typeof Tools.tools>>>()
      const Registrations = McpServer.toolkit(Tools).pipe(Layer.provide(Handlers))
      const alice = hole<McpSchema.McpServerClient["Service"]>()
      const TestUser = McpServer.middleware<{ provides: CurrentUser }>()((effect) =>
        Effect.provideService(effect, CurrentUser, { id: "alice" })
      )
      const TestClient = McpServer.middleware<{ provides: McpSchema.McpServerClient }>()((effect) =>
        Effect.provideService(effect, McpSchema.McpServerClient, alice)
      )
      const callTool = McpServer.McpServer.use((server) => server.callTool({ name: "WhoAmI", arguments: {} }))

      it("should build the server service without discharging request markers", () => {
        expect(McpServer.McpServer.layer).type.toBe<Layer.Layer<McpServer.McpServer>>()
      })

      it("should require a test middleware for every request marker", () => {
        const complete = Registrations.pipe(
          Layer.provide([TestUser.layer, TestClient.layer]),
          Layer.provideMerge(McpServer.McpServer.layer)
        )
        const missingUser = Registrations.pipe(
          Layer.provide(TestClient.layer),
          Layer.provideMerge(McpServer.McpServer.layer)
        )
        const staticUser = Registrations.pipe(
          Layer.provide([TestClient.layer, Layer.succeed(CurrentUser, { id: "alice" })]),
          Layer.provideMerge(McpServer.McpServer.layer)
        )
        const callSiteClientOnly = Registrations.pipe(
          Layer.provide(TestUser.layer),
          Layer.provideMerge(McpServer.McpServer.layer)
        )
        const withoutCallSiteClient = callTool.pipe(Effect.provide(complete))

        expect<Layer.Services<typeof complete>>().type.toBe<never>()
        expect<Layer.Services<typeof missingUser>>().type.toBe<Requires<CurrentUser>>()
        expect<Layer.Services<typeof staticUser>>().type.toBe<Requires<CurrentUser>>()
        expect<Layer.Services<typeof callSiteClientOnly>>().type.toBe<Requires<McpSchema.McpServerClient>>()
        expect<Effect.Services<typeof withoutCallSiteClient>>().type.toBe<McpSchema.McpServerClient>()
      })
    })
  })
})
