import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare"
import * as path from "node:path"

const bindings = ["CLUSTER_ENTITY", "CLUSTER_WORKFLOW", "CLUSTER_QUEUE", "CLUSTER_SINGLETON"]

const makeMiniflare = Effect.acquireRelease(
  Effect.promise(async () => {
    const bundle = await esbuild.build({
      entryPoints: [path.join(import.meta.dirname, "fixtures", "worker.ts")],
      bundle: true,
      format: "esm",
      write: false,
      external: ["cloudflare:workers"],
      alias: {
        "@effect/platform-cloudflare": path.join(import.meta.dirname, "..", "src")
      }
    })
    return new Miniflare({
      modules: [{ type: "ESModule", path: "worker.mjs", contents: bundle.outputFiles[0].text }],
      compatibilityDate: "2026-08-01",
      durableObjects: {
        CLUSTER_ENTITY: { className: "ClusterEntity", useSQLite: true },
        CLUSTER_WORKFLOW: { className: "ClusterWorkflow", useSQLite: true },
        CLUSTER_QUEUE: { className: "ClusterDurableQueue", useSQLite: true },
        CLUSTER_SINGLETON: { className: "ClusterSingleton", useSQLite: true }
      }
    })
  }),
  (miniflare) => Effect.promise(() => miniflare.dispose())
)

describe("CloudflareDurableObjects", () => {
  it.effect("binds the four Durable Object classes", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      for (const binding of bindings) {
        const response = yield* Effect.promise(async () => {
          const response = await miniflare.dispatchFetch(`http://placeholder/${binding}`)
          return { status: response.status, body: await response.text() }
        })
        assert.strictEqual(response.status, 200, `${binding}: ${response.body}`)
        assert.include(response.body, "not exposed over fetch", binding)
      }
    }), 60_000)

  it.effect("journals only persisted RPCs and deduplicates primary keys", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const call = (tag: string, operationId: string) =>
        Effect.promise(() =>
          miniflare.dispatchFetch(
            `http://placeholder/mailbox?tag=${tag}&operationId=${operationId}`
          ).then(async (response) => {
            const body = await response.text()
            assert.strictEqual(response.status, 200, body)
            return JSON.parse(body)
          })
        )

      yield* call("Add", "same-operation")
      yield* call("Add", "same-operation")
      yield* call("AddVolatile", "volatile-1")
      yield* call("AddVolatile", "volatile-2")
      const result = yield* call("Get", "read")
      const terminal = JSON.parse(result.replies[0])

      assert.strictEqual(terminal._tag, "WithExit")
      assert.deepStrictEqual(terminal.exit, { _tag: "Success", value: 3 })
    }), 60_000)

  it.effect("acknowledges stream chunks without holding the entity lock", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const call = (path: string) =>
        Effect.promise(() =>
          Promise.race([
            miniflare.dispatchFetch(`http://placeholder${path}`).then(async (response) => {
              const body = await response.text()
              assert.strictEqual(response.status, 200, body)
              return JSON.parse(body)
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${path} did not return`)), 2_000))
          ])
        )

      const result = yield* call("/mailbox?tag=Watch")
      const first = JSON.parse(result.replies[0])
      assert.deepStrictEqual(first, {
        _tag: "Chunk",
        requestId: result.requestId,
        id: first.id,
        sequence: 0,
        values: [1]
      })

      const getResult = yield* call("/mailbox?tag=Get")
      const getReply = JSON.parse(getResult.replies[0])
      assert.deepStrictEqual(getReply.exit, { _tag: "Success", value: 1 })

      const secondReplies = yield* call(`/ack?requestId=${result.requestId}&replyId=${first.id}`)
      const second = JSON.parse(secondReplies[0])
      assert.deepStrictEqual(second, {
        _tag: "Chunk",
        requestId: result.requestId,
        id: second.id,
        sequence: 1,
        values: [2]
      })

      const terminalReplies = yield* call(`/ack?requestId=${result.requestId}&replyId=${second.id}`)
      const terminal = JSON.parse(terminalReplies[0])
      assert.strictEqual(terminal._tag, "WithExit")
      assert.strictEqual(terminal.requestId, result.requestId)
      assert.deepStrictEqual(terminal.exit, { _tag: "Success", value: null })
    }), 60_000)

  it.effect("isolates an undecodable replay row from later mailbox requests", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      yield* Effect.promise(() => miniflare.dispatchFetch("http://placeholder/seed-poison"))
      const response = yield* Effect.promise(() =>
        miniflare.dispatchFetch("http://placeholder/mailbox?tag=Get").then(async (response) => ({
          status: response.status,
          body: await response.text()
        }))
      )

      assert.strictEqual(response.status, 200, response.body)
      const result = JSON.parse(response.body)
      const terminal = JSON.parse(result.replies[0])
      assert.deepStrictEqual(terminal.exit, { _tag: "Success", value: 0 })
    }), 60_000)
})
