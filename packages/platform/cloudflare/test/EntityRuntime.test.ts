import type { EntityRegistration } from "@effect/platform-cloudflare/internal/entityRegistry"
import { makeEntityRuntime } from "@effect/platform-cloudflare/internal/entityRuntime"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Option, Schedule, Schema, Stream } from "effect"
import { Entity, EntityAddress, EntityId, EntityType, ShardId } from "effect/unstable/cluster"
import { Rpc, RpcSchema } from "effect/unstable/rpc"

const User = Entity.make("User", [
  Rpc.make("Ping", { success: Schema.String })
])

const address = new EntityAddress.EntityAddress({
  shardId: ShardId.make("default", 1),
  entityType: EntityType.make("User"),
  entityId: EntityId.make("42")
})

const request = {
  _tag: "Request" as const,
  requestId: "0198bd72-6a80-72f1-8d87-5e9b5cf1e000" as any,
  address,
  tag: "Ping" as const,
  payload: undefined,
  headers: {}
}

describe("EntityRuntime", () => {
  it.effect("builds handlers once per wake and returns terminal ask replies", () =>
    Effect.gen(function*() {
      let builds = 0
      const registration: EntityRegistration = {
        entity: User,
        build: Effect.sync(() => {
          builds++
          return User.of({ Ping: () => Effect.succeed("pong") })
        }),
        options: undefined,
        context: Context.empty()
      }
      let replyId = 0
      const runtime = yield* makeEntityRuntime(registration, address, () => `reply-${replyId++}`)
      const replies: Array<any> = []

      yield* runtime.run(request as any, Option.none(), false, (reply) =>
        Effect.sync(() => {
          replies.push(reply)
        }))
      yield* runtime.run(
        { ...request, requestId: "0198bd72-6a81-72f1-8d87-5e9b5cf1e001" } as any,
        Option.none(),
        false,
        (reply) =>
          Effect.sync(() => {
            replies.push(reply)
          })
      )

      assert.strictEqual(builds, 1)
      assert.strictEqual(replies.length, 2)
      assert.isTrue(replies.every((reply) => reply._tag === "WithExit" && Exit.isSuccess(reply.exit)))
      assert.deepStrictEqual(replies.map((reply) => reply.exit.value), ["pong", "pong"])
    }))

  it.effect("resumes ask stream sequence from lastSentChunk and ends with WithExit", () =>
    Effect.gen(function*() {
      const Streaming = Entity.make("User", [
        Rpc.make("Values", { success: RpcSchema.Stream(Schema.Number, Schema.Never) })
      ])
      const registration: EntityRegistration = {
        entity: Streaming,
        build: Effect.succeed(Streaming.of({
          Values: () => Stream.fromIterable([6, 7]).pipe(Stream.rechunk(1))
        })),
        options: undefined,
        context: Context.empty()
      }
      let replyId = 0
      const runtime = yield* makeEntityRuntime(registration, address, () => `reply-${replyId++}`)
      const replies: Array<any> = []
      const lastSentChunk = Option.some({
        _tag: "Chunk",
        requestId: request.requestId,
        id: "chunk-5",
        sequence: 5,
        values: [5]
      } as any)

      yield* runtime.run(
        { ...request, tag: "Values" } as any,
        lastSentChunk,
        false,
        (reply) => Effect.sync(() => replies.push(reply))
      )

      assert.deepStrictEqual(replies.map((reply) => reply._tag), ["Chunk", "Chunk", "WithExit"])
      assert.deepStrictEqual(replies.slice(0, 2).map((reply) => [reply.sequence, reply.values]), [
        [6, [6]],
        [7, [7]]
      ])
      assert.isTrue(Exit.isSuccess(replies[2].exit))
    }))

  it.effect("retries a defective stream from the last emitted chunk", () =>
    Effect.gen(function*() {
      const Streaming = Entity.make("User", [
        Rpc.make("Values", { success: RpcSchema.Stream(Schema.Number, Schema.Never) })
      ])
      const seenLastChunks: Array<number | undefined> = []
      const registration: EntityRegistration = {
        entity: Streaming,
        build: Effect.succeed(Streaming.of({
          Values: (request) => {
            const last = Option.getOrUndefined(request.lastSentChunkValue)
            seenLastChunks.push(last)
            return last === undefined
              ? Stream.concat(Stream.make(1), Stream.die("retry"))
              : Stream.make(last + 1)
          }
        })),
        options: { defectRetryPolicy: Schedule.recurs(1) },
        context: Context.empty()
      }
      let replyId = 0
      const runtime = yield* makeEntityRuntime(registration, address, () => `reply-${replyId++}`)
      const replies: Array<any> = []

      yield* runtime.run(
        { ...request, tag: "Values" } as any,
        Option.none(),
        false,
        (reply) => Effect.sync(() => replies.push(reply))
      )

      assert.deepStrictEqual(seenLastChunks, [undefined, 1])
      assert.deepStrictEqual(
        replies.filter((reply) => reply._tag === "Chunk").map((reply) => [reply.sequence, reply.values]),
        [[0, [1]], [1, [2]]]
      )
      assert.isTrue(Exit.isSuccess(replies.at(-1).exit))
    }))

  it.effect("finishes tells without emitting a stored reply", () =>
    Effect.gen(function*() {
      let handled = 0
      const registration: EntityRegistration = {
        entity: User,
        build: Effect.succeed(User.of({
          Ping: () =>
            Effect.sync(() => {
              handled++
              return "pong"
            })
        })),
        options: undefined,
        context: Context.empty()
      }
      const runtime = yield* makeEntityRuntime(registration, address, () => "reply")
      const replies: Array<any> = []

      yield* runtime.run(request as any, Option.none(), true, (reply) =>
        Effect.sync(() => {
          replies.push(reply)
        }))

      assert.strictEqual(handled, 1)
      assert.deepStrictEqual(replies, [])
    }))

  it.effect("stores a terminal defect after retry exhaustion and rebuilds handlers in-wake", () =>
    Effect.gen(function*() {
      let builds = 0
      let attempts = 0
      const registration: EntityRegistration = {
        entity: User,
        build: Effect.sync(() => {
          const build = ++builds
          return User.of({
            Ping: () =>
              build === 1
                ? Effect.sync(() => {
                  attempts++
                  throw new Error("boom")
                })
                : Effect.succeed("recovered")
          })
        }),
        options: { defectRetryPolicy: Schedule.recurs(1) },
        context: Context.empty()
      }
      const runtime = yield* makeEntityRuntime(registration, address, () => `reply-${builds}-${attempts}`)
      const replies: Array<any> = []

      yield* runtime.run(request as any, Option.none(), false, (reply) =>
        Effect.sync(() => {
          replies.push(reply)
        }))

      assert.strictEqual(attempts, 2)
      assert.strictEqual(builds, 2)
      assert.strictEqual(replies.length, 1)
      assert.isTrue(Exit.isFailure(replies[0].exit))
      assert.isTrue(Cause.hasDies(replies[0].exit.cause))

      yield* runtime.run(
        { ...request, requestId: "0198bd72-6a82-72f1-8d87-5e9b5cf1e002" } as any,
        Option.none(),
        false,
        (reply) =>
          Effect.sync(() => {
            replies.push(reply)
          })
      )
      assert.isTrue(Exit.isSuccess(replies[1].exit))
      assert.strictEqual(replies[1].exit.value, "recovered")
    }))
})
