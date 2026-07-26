import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import { McpConformanceTest, type TestLayer } from "./McpConformanceTest.ts"

const rootsHandler = (roots: ReadonlyArray<{ readonly uri: string; readonly name?: string }>) => () =>
  Effect.succeed({ roots })

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Roots", () => {
      // Identical requirements in the 2024-11-05, 2025-03-26, and 2025-06-18 specifications.
      describe("Capabilities", () => {
        it.effect("MUST send roots requests when the client advertises roots", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const peer = yield* test.makePeer({
              capabilities: { roots: {} },
              handlers: {
                "roots/list": rootsHandler([])
              }
            })

            yield* peer.client.listRoots()

            assert.strictEqual((yield* peer.takeRequest).method, "roots/list")
          }).pipe(Effect.scoped))

        it.effect("MUST NOT send roots requests when the client omits the roots capability", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const peer = yield* test.makePeer()
            const error = yield* peer.client.listRoots().pipe(Effect.flip)

            assert.instanceOf(error, McpSchema.McpReverseOperationUnsupported)
            assert.deepStrictEqual(yield* peer.requests, [])
          }).pipe(Effect.scoped))
        it.effect("MUST accept roots requests when the client advertises list changes", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const peer = yield* test.makePeer({
              capabilities: { roots: { listChanged: true } },
              handlers: {
                "roots/list": rootsHandler([])
              }
            })

            yield* peer.client["roots/list"](undefined)

            assert.strictEqual((yield* peer.takeRequest).method, "roots/list")
          }).pipe(Effect.scoped))
      })

      describe("Listing Roots", () => {
        it.effect("MUST accept roots with file URIs and preserve optional names", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const peer = yield* test.makePeer({
              capabilities: { roots: {} },
              handlers: {
                "roots/list": rootsHandler([
                  { uri: "file:///workspace", name: "Workspace" },
                  { uri: "file:///unnamed" }
                ])
              }
            })

            const result = yield* peer.client["roots/list"](undefined)

            assert.deepStrictEqual(
              result.roots.map((root) => ({
                uri: root.uri,
                name: root.name
              })),
              [
                { uri: "file:///workspace", name: "Workspace" },
                { uri: "file:///unnamed", name: undefined }
              ]
            )
          }).pipe(Effect.scoped))

        it.effect("MAY accept an empty roots list", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const peer = yield* test.makePeer({
              capabilities: { roots: {} },
              handlers: {
                "roots/list": rootsHandler([])
              }
            })

            const result = yield* peer.client["roots/list"](undefined)

            assert.deepStrictEqual(result.roots, [])
          }).pipe(Effect.scoped))

        it.effect("MUST surface client errors returned by roots/list", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const peer = yield* test.makePeer({
              capabilities: { roots: {} },
              handlers: {
                "roots/list": () =>
                  Effect.fail(
                    new McpSchema.InternalError({
                      message: "Roots unavailable"
                    })
                  )
              }
            })

            const error = yield* peer.client["roots/list"](undefined).pipe(Effect.flip)

            assert.instanceOf(error, McpSchema.InternalError)
            assert.strictEqual(error.message, "Roots unavailable")
          }).pipe(Effect.scoped))
      })

      describe("Root List Changes", () => {
        // HARNESS: Requires an initialized client session whose outbound roots/list
        // requests can be observed after the inbound notification.
        it.skip("SHOULD refresh roots after a capable client reports a list change", () => {})
      })
    })
  })
