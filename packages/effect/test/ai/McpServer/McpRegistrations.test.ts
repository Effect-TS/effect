import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"
import * as TestClock from "effect/testing/TestClock"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader, readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeMcpStdioHarness, type McpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const features = ["tools", "resources", "prompts"] as const
const metadata = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {}
}
const tool = (name = "Dynamic", text = name) => ({
  tool: new McpSchema.Tool({ name, inputSchema: { type: "object" } }),
  annotations: Context.empty(),
  handle: () => Effect.succeed(new McpSchema.CallToolResult({ content: [{ type: "text", text }] }))
})
const resource = (uri = "test://item", text = uri) => ({
  resource: new McpSchema.Resource({ uri, name: uri }),
  annotations: Context.empty(),
  handle: Effect.succeed(McpSchema.ReadResourceResult.make({ contents: [{ uri, text }] }))
})
const completion = (text: string) => () =>
  Effect.succeed(McpSchema.CompleteResult.make({ completion: { values: [text] } }))
const prompt = (name = "Dynamic", completions = {}) => ({
  prompt: new McpSchema.Prompt({ name }),
  annotations: Context.empty(),
  completions,
  handle: () => Effect.succeed(new McpSchema.GetPromptResult({ messages: [] }))
})
const template = (uriTemplate = "test://{item}", routerPath = "test://:0", text = "template", completions = {}) => ({
  template: new McpSchema.ResourceTemplate({ uriTemplate, name: uriTemplate }),
  annotations: Context.empty(),
  routerPath,
  completions,
  handle: (uri: string) => Effect.succeed(McpSchema.ReadResourceResult.make({ contents: [{ uri, text }] }))
})

const listen = Effect.fnUntraced(function*(harness: McpStdioHarness, protocol: McpProtocol.ProtocolAdapter) {
  if (protocol.runtime._tag === "Stateless") {
    yield* harness.startRequest("subscriptions/listen", {
      notifications: { toolsListChanged: true, resourcesListChanged: true, promptsListChanged: true }
    }, "changes")
    return yield* harness.awaitOutboundMethod("notifications/subscriptions/acknowledged")
  }
})

const noNotification = Effect.fnUntraced(function*(harness: McpStdioHarness) {
  const pending = yield* harness.takeMessage.pipe(Effect.forkChild)
  yield* TestClock.adjust("1 millis")
  assert.isUndefined(pending.pollUnsafe())
  yield* Fiber.interrupt(pending)
})

describe("MCP dynamic registrations", () => {
  for (const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2026_07_28]) {
    describe(protocol.protocolVersion, () => {
      // https://modelcontextprotocol.io/specification/2026-07-28/server/prompts#capabilities
      it.effect("declares empty features before the first registration", () =>
        Effect.gen(function*() {
          const harness = yield* makeMcpStdioHarness(protocol, [protocol], undefined, { declaredFeatures: features })
          const initialized = yield* harness.initialize()
          for (const kind of features) assert.nestedProperty(initialized, `result.capabilities.${kind}`)
          const acknowledged = yield* listen(harness, protocol)
          if (acknowledged !== undefined) {
            assert.deepNestedInclude(acknowledged, {
              "params.notifications": { toolsListChanged: true, resourcesListChanged: true, promptsListChanged: true }
            })
          }
          for (
            const [add, method] of [
              [harness.server.addTool(tool()), "notifications/tools/list_changed"],
              [harness.server.addResource(resource()), "notifications/resources/list_changed"],
              [harness.server.addPrompt(prompt()), "notifications/prompts/list_changed"]
            ] as const
          ) {
            yield* add
            assert.propertyVal(yield* harness.awaitOutboundMethod(method), "method", method)
          }
        }))

      it.effect("returns empty lists for every empty registration kind", () =>
        Effect.gen(function*() {
          const harness = yield* makeMcpStdioHarness(protocol)
          yield* harness.initialize()
          for (
            const [method, field] of [
              ["tools/list", "tools"],
              ["resources/list", "resources"],
              ["resources/templates/list", "resourceTemplates"],
              ["prompts/list", "prompts"]
            ]
          ) {
            assert.deepNestedInclude(yield* harness.sendRequest(method), { [`result.${field}`]: [] })
          }
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/server/tools#list-changed-notification
      for (const kind of ["tool", "resource", "template", "prompt"] as const) {
        it.effect(`removes a ${kind}, notifies once, and retains capability support`, () =>
          Effect.gen(function*() {
            const registrations = Layer.effectDiscard(McpServer.McpServer.use((server) => {
              switch (kind) {
                case "tool":
                  return server.addTool(tool())
                case "resource":
                  return server.addResource(resource())
                case "template":
                  return server.addResourceTemplate(template())
                case "prompt":
                  return server.addPrompt(prompt())
              }
            }))
            const harness = yield* makeMcpStdioHarness(protocol, [protocol], registrations)
            yield* harness.initialize()
            yield* listen(harness, protocol)
            const remove = kind === "tool" ?
              harness.server.removeTool("Dynamic")
              : kind === "resource" ?
              harness.server.removeResource("test://item")
              : kind === "template" ?
              harness.server.removeResourceTemplate("test://{item}")
              : harness.server.removePrompt("Dynamic")
            const feature = kind === "tool" ? "tools" : kind === "prompt" ? "prompts" : "resources"
            assert.isTrue(yield* remove)
            yield* harness.awaitOutboundMethod(`notifications/${feature}/list_changed`)
            assert.isFalse(yield* remove)
            yield* noNotification(harness)
            const method = kind === "template" ? "resources/templates/list" : `${feature}/list`
            const field = kind === "template" ? "resourceTemplates" : feature
            assert.deepNestedInclude(yield* harness.sendRequest(method), { [`result.${field}`]: [] })
            assert.lengthOf(
              kind === "tool" ?
                harness.server.tools
                : kind === "resource" ?
                harness.server.resources
                : kind === "template"
                ? harness.server.resourceTemplates
                : harness.server.prompts,
              0
            )
            if (protocol.runtime._tag === "Stateless") {
              assert.nestedProperty(yield* harness.sendRequest("server/discover"), `result.capabilities.${feature}`)
            }
          }))
      }

      it.effect("replaces a prompt's completion map without retaining removed arguments or colliding owners", () =>
        Effect.gen(function*() {
          const harness = yield* makeMcpStdioHarness(protocol)
          yield* harness.initialize()
          yield* harness.server.addPrompt(prompt("a", { "b/c": completion("first") }))
          yield* harness.server.addPrompt(prompt("a/b", { c: completion("second") }))
          const complete = (name: string, argument: string) =>
            harness.sendRequest("completion/complete", {
              ref: { type: "ref/prompt", name },
              argument: { name: argument, value: "" }
            })
          assert.deepNestedInclude(yield* complete("a", "b/c"), { "result.completion.values": ["first"] })
          yield* harness.server.addPrompt(prompt("a"))
          assert.nestedPropertyVal(yield* complete("a", "b/c"), "error.code", -32602)
          assert.deepNestedInclude(yield* complete("a/b", "c"), { "result.completion.values": ["second"] })
          assert.isTrue(yield* harness.server.removePrompt("a/b"))
          assert.nestedPropertyVal(yield* complete("a/b", "c"), "error.code", -32602)
        }))

      it.effect("replaces and removes a resource template's owned completions", () =>
        Effect.gen(function*() {
          const harness = yield* makeMcpStdioHarness(protocol)
          yield* harness.initialize()
          const complete = (name: string) =>
            harness.sendRequest("completion/complete", {
              ref: { type: "ref/resource", uri: "test://{item}" },
              argument: { name, value: "" }
            })
          yield* harness.server.addResourceTemplate(template(undefined, undefined, "first", {
            old: completion("old"),
            item: completion("first")
          }))
          yield* harness.server.addResourceTemplate(
            template(undefined, undefined, "second", { item: completion("second") })
          )
          assert.nestedPropertyVal(yield* complete("old"), "error.code", -32602)
          assert.deepNestedInclude(yield* complete("item"), { "result.completion.values": ["second"] })
          assert.isTrue(yield* harness.server.removeResourceTemplate("test://{item}"))
          assert.nestedPropertyVal(yield* complete("item"), "error.code", -32602)
        }))

      it.effect("falls through removed static resources and templates without resurrecting replaced registrations", () =>
        Effect.gen(function*() {
          const harness = yield* makeMcpStdioHarness(protocol)
          yield* harness.initialize()
          yield* harness.server.addResource(resource("test://item", "static"))
          yield* harness.server.addResourceTemplate(template(undefined, undefined, "first"))
          yield* harness.server.addResourceTemplate(template("test://{other}", "test://:0", "fallback"))
          const read = () => harness.sendRequest("resources/read", { uri: "test://item" })
          assert.nestedPropertyVal(yield* read(), "result.contents[0].text", "static")
          yield* harness.server.removeResource("test://item")
          assert.nestedPropertyVal(yield* read(), "result.contents[0].text", "first")
          yield* harness.server.addResourceTemplate(template(undefined, undefined, "replacement"))
          assert.nestedPropertyVal(yield* read(), "result.contents[0].text", "replacement")
          yield* harness.server.removeResourceTemplate("test://{item}")
          assert.nestedPropertyVal(yield* read(), "result.contents[0].text", "fallback")
        }))
    })
  }

  it.effect("lets an already selected handler finish after its tool is removed", () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const harness = yield* makeMcpStdioHarness(McpProtocol.v2026_07_28)
      yield* harness.server.addTool({
        ...tool(),
        handle: () =>
          Deferred.succeed(entered, undefined).pipe(
            Effect.andThen(Deferred.await(release)),
            Effect.as(new McpSchema.CallToolResult({ content: [] }))
          )
      })
      const pending = yield* harness.startRequest("tools/call", { name: "Dynamic" })
      yield* Deferred.await(entered)
      yield* harness.server.removeTool("Dynamic")
      assert.nestedPropertyVal(yield* harness.sendRequest("tools/call", { name: "Dynamic" }), "error.code", -32602)
      yield* Deferred.succeed(release, undefined)
      assert.nestedProperty(yield* pending.response, "result.content")
    }))

  for (const kind of ["tool", "prompt", "template"] as const) {
    it.effect(`keeps ${kind} replacement and removal atomic across scheduler yields`, () =>
      Effect.gen(function*() {
        const harness = yield* makeMcpStdioHarness(McpProtocol.v2026_07_28)
        const server = harness.server
        const add = (description: string) => {
          switch (kind) {
            case "tool":
              return server.addTool({
                ...tool(),
                tool: new McpSchema.Tool({ name: "Dynamic", description, inputSchema: { type: "object" } })
              })
            case "prompt":
              return server.addPrompt({ ...prompt(), prompt: new McpSchema.Prompt({ name: "Dynamic", description }) })
            case "template":
              return server.addResourceTemplate({
                ...template(),
                template: new McpSchema.ResourceTemplate({ name: "Dynamic", uriTemplate: "test://{item}", description })
              })
          }
        }
        const descriptions = () =>
          kind === "tool"
            ? server.tools.map(({ tool }) => tool.description)
            : kind === "prompt"
            ? server.prompts.map(({ prompt }) => prompt.description)
            : server.resourceTemplates.map(({ template }) => template.description)
        yield* add("original")
        // Pause at each Effect operation. Once the public replacement appears,
        // removing it must also remove the canonical entry used by wire calls.
        const tasks: Array<() => void> = []
        const gated: Scheduler.Scheduler = {
          executionMode: "async",
          shouldYield: (fiber) => fiber.currentOpCount > 2,
          makeDispatcher: () => ({ scheduleTask: (task) => tasks.push(task), flush: () => {} })
        }
        const adding = yield* add("replacement").pipe(
          Effect.provideService(Scheduler.Scheduler, gated),
          Effect.forkChild
        )
        while (tasks.length === 0) yield* Effect.yieldNow
        while (tasks.length > 0 && !descriptions().includes("replacement")) tasks.shift()!()
        assert.deepStrictEqual(descriptions(), ["replacement"])
        assert.isTrue(
          yield* (kind === "tool" ?
            server.removeTool("Dynamic")
            : kind === "prompt" ?
            server.removePrompt("Dynamic")
            : server.removeResourceTemplate("test://{item}"))
        )
        while (tasks.length > 0) tasks.shift()!()
        yield* Fiber.join(adding)
        assert.deepStrictEqual(descriptions(), [])
        const [method, field] = kind === "tool" ?
          ["tools/list", "tools"]
          : kind === "prompt" ?
          ["prompts/list", "prompts"]
          : ["resources/templates/list", "resourceTemplates"]
        assert.deepNestedInclude(yield* harness.sendRequest(method), { [`result.${field}`]: [] })
      }))
  }

  it.effect("checks skill-file ownership when a deferred removal executes", () =>
    Effect.gen(function*() {
      const server = yield* McpServer.McpServer
      const uri = "skill://registered/SKILL.md"
      const pending = server.removeResource(uri)
      yield* McpServer.registerSkill({
        uri,
        files: { "SKILL.md": "---\nname: registered\ndescription: Existing skill\n---\n\nKeep this file.\n" }
      })
      const exit = yield* Effect.exit(pending)
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) assert.match(String(Cause.squash(exit.cause)), /file of a registered skill/)
      assert.isTrue(server.resources.some(({ resource }) => resource.uri === uri))
    }).pipe(Effect.provide(McpServer.McpServer.layer)))

  // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions#acknowledgment
  for (const mode of ["server", "request"] as const) {
    it.effect(`declares empty HTTP features in ${mode} mode`, () =>
      Effect.gen(function*() {
        const options = {
          name: "Declared",
          version: "1.0.0",
          path: "/mcp" as const,
          protocols: [McpProtocol.v2026_07_28] as const,
          declaredFeatures: features
        }
        const harness = yield* makeHttpHarness(
          mode === "server"
            ? McpServer.layerHttp(options) :
            McpServer.layerHttpRequestScoped(options)
        )
        for (const [method, field] of [["server/discover", "capabilities"], ["prompts/list", "prompts"]]) {
          const response = yield* harness.post({ jsonrpc: "2.0", id: method, method, params: { _meta: metadata } }, {
            "mcp-protocol-version": "2026-07-28",
            "mcp-method": method
          })
          const message = yield* readMcpHttpResponse(response)
          assert.strictEqual(response.status, 200)
          assert.nestedProperty(message, `result.${field}`)
          if (method === "server/discover") {
            for (const feature of features) {
              assert.nestedPropertyVal(message, `result.capabilities.${feature}.listChanged`, mode === "server")
            }
          }
        }
      }))
  }

  it.effect("delivers the first resource and its removal to an existing HTTP listener", () =>
    Effect.gen(function*() {
      const ready = yield* Deferred.make<McpServer.McpServer["Service"]>()
      const options = {
        name: "LateResource",
        version: "1.0.0",
        path: "/mcp" as const,
        protocols: [McpProtocol.v2026_07_28] as const,
        declaredFeatures: ["resources"] as const,
        registrations: Layer.effectDiscard(McpServer.McpServer.use((server) => Deferred.succeed(ready, server)))
      }
      const harness = yield* makeHttpHarness(McpServer.layerHttp(options))
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: "changes",
        method: "subscriptions/listen",
        params: { _meta: metadata, notifications: { resourcesListChanged: true } }
      }, { "mcp-protocol-version": "2026-07-28", "mcp-method": "subscriptions/listen" })
      const stream = makeMcpSseReader(response)
      yield* Effect.addFinalizer(() => stream.cancel)
      assert.nestedPropertyVal(yield* stream.take(), "params.notifications.resourcesListChanged", true)
      const server = yield* Deferred.await(ready)
      yield* server.addResource(resource())
      assert.propertyVal(yield* stream.take(), "method", "notifications/resources/list_changed")
      yield* server.removeResource("test://item")
      assert.propertyVal(yield* stream.take(), "method", "notifications/resources/list_changed")
    }))

  it.effect("advertises declared features to a legacy HTTP session before any registrations", () =>
    Effect.gen(function*() {
      const options = {
        name: "LegacyDeclared",
        version: "1.0.0",
        path: "/mcp" as const,
        protocols: [McpProtocol.v2025_11_25] as const,
        declaredFeatures: features
      }
      const harness = yield* makeHttpHarness(McpServer.layerHttp(options))
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: "initialize",
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "legacy", version: "1.0.0" }
        }
      })
      const initialized = yield* readMcpHttpResponse(response)
      for (const feature of features) assert.nestedProperty(initialized, `result.capabilities.${feature}`)
    }))
})
