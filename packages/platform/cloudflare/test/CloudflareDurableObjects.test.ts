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

  it.effect("runs a configured workflow Durable Object class", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const response = yield* Effect.promise(() =>
        Promise.race([
          miniflare.dispatchFetch("http://placeholder/workflow-run?id=class-api"),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("workflow RPC did not return")), 2_000))
        ])
      )
      const body = yield* Effect.promise(() => response.json())
      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(body, { status: "complete" })
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

  it.effect("persists DeliverAt rows and runs and re-arms the entity alarm", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const fetchJson = (path: string) =>
        Effect.promise(() =>
          miniflare.dispatchFetch(`http://placeholder${path}`).then(async (response) => {
            const body = await response.text()
            assert.strictEqual(response.status, 200, body)
            return JSON.parse(body)
          })
        )
      const id = "scheduled-alarm"
      const firstAt = Date.now() + 500
      const secondAt = firstAt + 600

      const first = yield* fetchJson(
        `/delayed?id=${id}&operationId=first&discard=true&deliverAt=${firstAt}`
      )
      const second = yield* fetchJson(
        `/delayed?id=${id}&operationId=second&discard=true&deliverAt=${secondAt}`
      )
      assert.deepStrictEqual(first.replies, [])
      assert.deepStrictEqual(second.replies, [])

      const persisted = yield* fetchJson(`/scheduled-rows?id=${id}`)
      assert.deepStrictEqual(
        persisted.rows.map((row: any) => ({ messageId: row.message_id, deliverAt: row.deliver_at })),
        [
          { messageId: `Mailbox/${id}/Add/first`, deliverAt: firstAt },
          { messageId: `Mailbox/${id}/Add/second`, deliverAt: secondAt }
        ]
      )
      assert.strictEqual(persisted.alarm, firstAt)

      yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 700)))
      const afterFirst = yield* fetchJson(`/mailbox?id=${id}&tag=Get`)
      assert.deepStrictEqual(JSON.parse(afterFirst.replies[0]).exit, { _tag: "Success", value: 1 })
      const rearmed = yield* fetchJson(`/scheduled-rows?id=${id}`)
      assert.strictEqual(rearmed.alarm, secondAt)

      yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 500)))
      const afterSecond = yield* fetchJson(`/mailbox?id=${id}&tag=Get`)
      assert.deepStrictEqual(JSON.parse(afterSecond.replies[0]).exit, { _tag: "Success", value: 2 })
    }), 60_000)

  it.effect("keeps a Worker delayed ask open and deduplicates its primary key", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const fetchJson = (path: string) =>
        Effect.promise(() =>
          miniflare.dispatchFetch(`http://placeholder${path}`).then(async (response) => {
            const body = await response.text()
            assert.strictEqual(response.status, 200, body)
            return JSON.parse(body)
          })
        )
      const id = "scheduled-ask"
      const deliverAt = Date.now() + 300
      const [first, duplicate] = yield* Effect.promise(() =>
        Promise.all([
          Effect.runPromise(fetchJson(`/delayed?id=${id}&operationId=same&discard=false&deliverAt=${deliverAt}`)),
          Effect.runPromise(fetchJson(`/delayed?id=${id}&operationId=same&discard=false&deliverAt=${deliverAt}`))
        ])
      )
      const terminal = JSON.parse(first.replies[0])
      assert.strictEqual(terminal._tag, "WithExit")
      assert.strictEqual(duplicate.requestId, first.requestId)
      const result = yield* fetchJson(`/mailbox?id=${id}&tag=Get`)
      assert.deepStrictEqual(JSON.parse(result.replies[0]).exit, { _tag: "Success", value: 1 })
    }), 60_000)

  it.effect("interrupts only the matching deduplicated Worker waiter", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const result = yield* Effect.promise(() =>
        miniflare.dispatchFetch("http://placeholder/interrupt-delayed?id=interrupt-waiter").then(async (response) => {
          const body = await response.text()
          assert.strictEqual(response.status, 200, body)
          return JSON.parse(body)
        })
      )

      assert.deepStrictEqual(result, { firstStatus: "pending", secondStatus: "rejected" })
    }), 60_000)

  it.effect(
    "rejects an ask deduplicated onto a future tell without hanging or running it early",
    () =>
      Effect.gen(function*() {
        const miniflare = yield* makeMiniflare
        const fetchJson = (path: string) =>
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
        const id = "scheduled-dedup"
        yield* fetchJson(
          `/delayed?id=${id}&operationId=same&discard=true&deliverAt=${Date.now() + 60_000}`
        )
        const duplicate = yield* fetchJson(`/mailbox?id=${id}&tag=Add&operationId=same&discard=false`)
        assert.strictEqual(duplicate._tag, "AskDeduplicatedToTell")

        const result = yield* fetchJson(`/mailbox?id=${id}&tag=Get`)
        assert.deepStrictEqual(JSON.parse(result.replies[0]).exit, { _tag: "Success", value: 0 })
      }),
    60_000
  )

  it.effect("rejects an ask deduplicated onto a processed tell without hanging", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const fetchJson = (path: string) =>
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
      const id = "processed-tell-dedup"
      yield* fetchJson(`/mailbox?id=${id}&tag=Add&operationId=same`)
      const duplicate = yield* fetchJson(`/mailbox?id=${id}&tag=Add&operationId=same&discard=false`)

      assert.strictEqual(duplicate._tag, "AskDeduplicatedToTell")
    }), 60_000)

  it.effect("honors the entity concurrency option for in-flight handlers", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const gate = (type: string) =>
        Effect.promise(() =>
          miniflare.dispatchFetch(`http://placeholder/gate?type=${type}&id=g1`).then(async (response) => {
            const body = await response.text()
            assert.strictEqual(response.status, 200, body)
            return JSON.parse(body)
          })
        )

      // Default concurrency serializes: Open cannot run while WaitTurn is
      // still in flight, so WaitTurn times out and Open finds no waiter.
      const serial = yield* gate("GateSerial")
      assert.deepStrictEqual(serial, { wait: "timeout", open: "no-waiter" })

      // With two permits the second ask interleaves while the first handler
      // is suspended, and releases it.
      const concurrent = yield* gate("GateConcurrent")
      assert.deepStrictEqual(concurrent, { wait: "opened", open: "opened" })

      const unbounded = yield* gate("GateUnbounded")
      assert.deepStrictEqual(unbounded, { wait: "opened", open: "opened" })
    }), 60_000)

  it.effect("completes an ask cycle between entities given sufficient concurrency", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const result = yield* Effect.promise(() =>
        Promise.race([
          miniflare.dispatchFetch("http://placeholder/cycle?id=c1").then(async (response) => {
            const body = await response.text()
            assert.strictEqual(response.status, 200, body)
            return JSON.parse(body)
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("ask cycle did not complete")), 5_000))
        ])
      )
      assert.deepStrictEqual(result, { value: "cycle:pong" })
    }), 60_000)

  it.effect("delivers a scheduled ask reply to the caller Durable Object", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      const fetchJson = (path: string) =>
        Effect.promise(() =>
          miniflare.dispatchFetch(`http://placeholder${path}`).then(async (response) => {
            const body = await response.text()
            assert.strictEqual(response.status, 200, body)
            return JSON.parse(body)
          })
        )
      const targetId = "callback-target"
      const callerId = "callback-caller"
      const replyTo = `7:Mailbox${callerId}`
      const accepted = yield* fetchJson(
        `/delayed?id=${targetId}&operationId=callback&discard=false&deliverAt=${Date.now() + 100}` +
          `&replyTo=${encodeURIComponent(replyTo)}`
      )
      assert.deepStrictEqual(accepted.replies, [])

      yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 200)))
      const received = yield* fetchJson(`/delayed-reply?id=${callerId}`)
      assert.strictEqual(received.reply.requestId, accepted.requestId)
      const terminal = JSON.parse(received.reply.reply)
      assert.strictEqual(terminal._tag, "WithExit")
      assert.deepStrictEqual(terminal.exit, { _tag: "Success", value: null })
    }), 60_000)
})
