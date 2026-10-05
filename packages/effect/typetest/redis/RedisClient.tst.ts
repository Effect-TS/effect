import { Effect, type Result, type Scope } from "effect"
import type { RedisClient } from "effect/redis/RedisClient"
import * as Command from "effect/redis/RedisCommand"
import type { RedisConnection } from "effect/redis/RedisConnection"
import type { RedisError } from "effect/redis/RedisError"
import type { Reply } from "effect/redis/RedisProtocol"
import * as Transaction from "effect/redis/RedisTransaction"
import { describe, expect, it } from "tstyche"

declare const client: RedisClient

describe("Redis client", () => {
  it("infers the decoder result of typed command execution", () => {
    expect(client.run(Command.get("key"))).type.toBe<Effect.Effect<string | null, RedisError>>()
    expect(client.run(Command.getBytes("key"))).type.toBe<Effect.Effect<Uint8Array | null, RedisError>>()
    expect(client.run(Command.make(["INCR", "key"], Command.integer))).type.toBe<Effect.Effect<bigint, RedisError>>()
  })

  it("preserves heterogeneous readonly pipeline result positions", () => {
    expect(client.pipeline(
      [
        Command.get("text"),
        Command.getBytes("binary"),
        Command.make(["INCR", "integer"], Command.integer)
      ] as const
    )).type.toBe<
      Effect.Effect<
        readonly [
          Result.Result<string | null, RedisError>,
          Result.Result<Uint8Array | null, RedisError>,
          Result.Result<bigint, RedisError>
        ],
        RedisError
      >
    >()
    expect(client.pipeline([] as const)).type.toBe<Effect.Effect<readonly [], RedisError>>()
  })

  it("requires a scope for reserved sessions and removes it through scoped ownership", () => {
    expect(client.reserve({ key: new Uint8Array([0, 255]) })).type.toBe<
      Effect.Effect<RedisConnection, RedisError, Scope.Scope>
    >()
    expect(Effect.scoped(client.reserve())).type.toBe<Effect.Effect<RedisConnection, RedisError>>()
  })

  it("keeps raw replies explicit instead of permitting unchecked caller result types", () => {
    expect(client.execute(["GET", "key"])).type.toBe<Effect.Effect<Reply, RedisError>>()
    // @ts-expect-error Expected 0 type arguments
    client.execute<string>(["GET", "key"])
    // @ts-expect-error is not assignable
    client.run({ arguments: ["GET", "key"] })
  })

  it("preserves transaction result positions and nullable WATCH conflicts", () => {
    expect(Transaction.execute(client, [Command.get("key"), Command.make(["INCR", "key"], Command.integer)] as const))
      .type.toBe<
      Effect.Effect<
        readonly [Result.Result<string | null, RedisError>, Result.Result<bigint, RedisError>] | null,
        RedisError
      >
    >()
  })
})
