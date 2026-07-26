import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import { McpConformanceTest, type TestLayer } from "./McpConformanceTest.ts"

const decodeResources = Schema.decodeUnknownEffect(McpSchema.ListResourcesResult)
const decodeResourceTemplates = Schema.decodeUnknownEffect(McpSchema.ListResourceTemplatesResult)
const decodeReadResource = Schema.decodeUnknownEffect(McpSchema.ReadResourceResult)

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Resources", () => {
      // Identical requirements in the 2024-11-05, 2025-03-26, and 2025-06-18 specifications.
      describe("Capabilities", () => {
        it.effect("MUST advertise resources when resources are registered", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })

            assert.property(initialized.message.result.capabilities, "resources")
          }))

        it.effect("MUST NOT advertise resources when resources are not supported", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize()

            assert.notProperty(initialized.message.result.capabilities, "resources")
          }))

        it.effect("MUST NOT advertise resource subscriptions when they are unsupported", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })

            assert.strictEqual(initialized.message.result.capabilities.resources?.subscribe, false)
          }))

        it.effect("MUST advertise listChanged when resource list change notifications are supported", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })

            assert.strictEqual(initialized.message.result.capabilities.resources?.listChanged, true)
          }))
      })

      describe("Listing Resources", () => {
        it.effect("MUST list every resource visible to the initialized client", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/list",
              params: {}
            })
            const result = yield* test.decodeResult(response).pipe(
              Effect.flatMap((message) => decodeResources(message.result))
            )

            assert.deepStrictEqual(result.resources.map((resource) => resource.uri).sort(), [
              "file:///binary",
              "file:///multiple",
              "file:///test"
            ])
          }))

        it.effect("SCHEMA preserves resource URI, name, description, and MIME type", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/list",
              params: {}
            })
            const result = yield* test.decodeResult(response).pipe(
              Effect.flatMap((message) => decodeResources(message.result))
            )

            const resource = result.resources.find((resource) => resource.uri === "file:///test")
            assert.isDefined(resource)
            assert.deepInclude(resource, {
              uri: "file:///test",
              name: "TestResource",
              description: "A test resource",
              mimeType: "text/plain"
            })
          }))
      })

      describe("Reading Resources", () => {
        it.effect("MUST read text resource contents", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/read",
              params: { uri: "file:///test" }
            })
            const result = yield* test.decodeResult(response).pipe(
              Effect.flatMap((message) => decodeReadResource(message.result))
            )

            assert.deepStrictEqual(result.contents, [{
              uri: "file:///test",
              mimeType: "text/plain",
              text: "test"
            }])
          }))
        it.effect("MUST read binary resource contents as base64", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/read",
              params: { uri: "file:///binary" }
            })
            const body = yield* Effect.promise<unknown>(() => response.json())
            const message = yield* Schema.decodeUnknownEffect(Schema.Struct({
              result: Schema.Struct({
                contents: Schema.Array(Schema.Struct({
                  uri: Schema.String,
                  mimeType: Schema.String,
                  blob: Schema.String
                }))
              })
            }))(body)

            assert.deepStrictEqual(message.result.contents, [{
              uri: "file:///binary",
              mimeType: "application/octet-stream",
              blob: "AQID"
            }])
          }))
        it.effect("SCHEMA preserves the resource URI and MIME type in returned contents", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/read",
              params: { uri: "file:///test" }
            })
            const result = yield* test.decodeResult(response).pipe(
              Effect.flatMap((message) => decodeReadResource(message.result))
            )

            assert.strictEqual(result.contents[0]?.uri, "file:///test")
            assert.strictEqual(result.contents[0]?.mimeType, "text/plain")
          }))
        it.effect("MUST return multiple resource contents in order", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/read",
              params: { uri: "file:///multiple" }
            })
            const result = yield* test.decodeResult(response).pipe(
              Effect.flatMap((message) => decodeReadResource(message.result))
            )

            assert.deepStrictEqual(result.contents.map((content) => content.uri), [
              "file:///multiple#first",
              "file:///multiple#second"
            ])
          }))
        // FIX: Effect currently returns Invalid Params (-32602) for an unknown resource URI
        // instead of the resource-specific Resource Not Found error (-32002).
        it.effect.skip("SHOULD return resource not found for an unknown resource URI", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/read",
              params: { uri: "file:///missing" }
            })
            const error = yield* test.decodeError(response)

            assert.strictEqual(error.error.code, -32002)
          }))
      })

      describe("Resource Templates", () => {
        it.effect("MUST list every registered resource template", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/templates/list",
              params: {}
            })
            const result = yield* test.decodeResult(response).pipe(
              Effect.flatMap((message) => decodeResourceTemplates(message.result))
            )

            const template = result.resourceTemplates.find(
              (template) => template.name === "TestResourceTemplate"
            )
            assert.deepStrictEqual(
              template && {
                uriTemplate: template.uriTemplate,
                name: template.name,
                description: template.description,
                mimeType: template.mimeType
              },
              {
                uriTemplate: "file:///template/{path}",
                name: "TestResourceTemplate",
                description: "A test resource template",
                mimeType: "text/plain"
              }
            )
          }))

        it.effect("MUST match and decode a concrete resource-template URI", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/read",
              params: { uri: "file:///template/encoded%20path" }
            })
            const result = yield* test.decodeResult(response).pipe(
              Effect.flatMap((message) => decodeReadResource(message.result))
            )

            assert.strictEqual(
              result.contents[0] && "text" in result.contents[0] ? result.contents[0].text : undefined,
              "file:///template/encoded%20path:encoded path"
            )
          }))
        // FIX: The resource-template handler is currently invoked even when a
        // path parameter cannot be decoded by its declared schema.
        it.effect.skip("MUST not invoke the handler when template parameter decoding fails", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            yield* test.resetObservations
            const initialized = yield* test.initialize({ server: "features" })
            yield* test.notifyInitialized(initialized)
            yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 2,
              method: "resources/read",
              params: { uri: "file:///numeric/not-a-number" }
            })

            assert.strictEqual((yield* test.observations).resourceTemplateInvocations, 0)
          }))
      })

      describe("List Changed Notification", () => {
        // HARNESS: Requires dynamic registration plus an observable outbound
        // notification stream.
        it.skip("SHOULD send a resource list changed notification when the advertised list changes", () => {})
      })

      describe("Subscriptions", () => {
        // HARNESS: Requires a server fixture that advertises
        // `resources.subscribe` and can publish controlled resource updates.
        it.skip("MUST subscribe to a resource when subscriptions are advertised", () => {})
        it.skip("MUST send update notifications only for subscribed resources", () => {})
        it.skip("MUST include the updated resource URI in each notification", () => {})
        it.skip("MUST unsubscribe from resource updates", () => {})
        it.skip("MUST not send updates after a resource is unsubscribed", () => {})
      })
    })
  })
