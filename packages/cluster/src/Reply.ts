/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc"
import type * as RpcSchema from "@effect/rpc/RpcSchema"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import type * as Option from "effect/Option"
import { hasProperty } from "effect/Predicate"
import * as Schema from "effect/Schema"
import { MalformedMessage } from "./ClusterError.js"
import type { OutgoingRequest } from "./Message.js"
import { Snowflake, SnowflakeFromString } from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/Reply")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isReply = (u: unknown): u is Reply<Rpc.Any> => hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export type Reply<R extends Rpc.Any> = WithExit<R> | Chunk<R>

/**
 * @since 1.0.0
 * @category models
 */
export class ReplyWithContext<R extends Rpc.Any> extends Data.TaggedClass("ReplyWithContext")<{
  readonly reply: Reply<R>
  readonly context: Context.Context<Rpc.Context<R>>
  readonly rpc: R
}> {
  /**
   * @since 1.0.0
   */
  static fromDefect(options: {
    readonly id: Snowflake
    readonly requestId: Snowflake
    readonly defect: unknown
  }): ReplyWithContext<any> {
    return new ReplyWithContext({
      reply: new WithExit({
        requestId: options.requestId,
        id: options.id,
        exit: Exit.die(Schema.encodeSync(Schema.Defect)(options.defect))
      }),
      context: Context.empty() as any,
      rpc: neverRpc
    })
  }
  /**
   * @since 1.0.0
   */
  static interrupt(options: {
    readonly id: Snowflake
    readonly requestId: Snowflake
  }): ReplyWithContext<any> {
    return new ReplyWithContext({
      reply: new WithExit({
        requestId: options.requestId,
        id: options.id,
        exit: Exit.interrupt(FiberId.none)
      }),
      context: Context.empty() as any,
      rpc: neverRpc
    })
  }
}

const neverRpc = Rpc.make("Never", {
  success: Schema.Never as any,
  error: Schema.Never,
  payload: {}
})

/**
 * @since 1.0.0
 * @category models
 */
export type ReplyEncoded<R extends Rpc.Any> = WithExitEncoded<R> | ChunkEncoded<R>

/**
 * @since 1.0.0
 * @category models
 */
export interface WithExitEncoded<R extends Rpc.Any> {
  readonly _tag: "WithExit"
  readonly requestId: string
  readonly id: string
  readonly exit: Rpc.ExitEncoded<R>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ChunkEncoded<R extends Rpc.Any> {
  readonly _tag: "Chunk"
  readonly requestId: string
  readonly id: string
  readonly sequence: number
  readonly values: NonEmptyReadonlyArray<Rpc.SuccessChunkEncoded<R>>
}

const schemaCache = new WeakMap<Rpc.Any, Schema.Schema<Reply<Rpc.Any>, ReplyEncoded<Rpc.Any>, Rpc.Context<Rpc.Any>>>()

/**
 * @since 1.0.0
 * @category schemas
 */
export const Reply = <R extends Rpc.Any>(rpc: R): Schema.Schema<
  Reply<R>,
  ReplyEncoded<R>,
  Rpc.Context<R>
> => {
  if (schemaCache.has(rpc)) {
    return schemaCache.get(rpc) as any
  }
  const schema = Schema.Union(WithExit.schema(rpc), Chunk.schema(rpc))
  schemaCache.set(rpc, schema)
  return schema
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Encoded = Schema.Union(
  Schema.Struct({
    _tag: Schema.Literal("WithExit"),
    requestId: Schema.String,
    id: Schema.String,
    exit: Schema.Unknown
  }),
  Schema.Struct({
    _tag: Schema.Literal("Chunk"),
    requestId: Schema.String,
    id: Schema.String,
    sequence: Schema.Number,
    values: Schema.Array(Schema.Unknown)
  })
)

/**
 * @since 1.0.0
 * @category models
 */
export class Chunk<R extends Rpc.Any> extends Data.TaggedClass("Chunk")<{
  readonly requestId: Snowflake
  readonly id: Snowflake
  readonly sequence: number
  readonly values: NonEmptyReadonlyArray<Rpc.SuccessChunk<R>>
}> {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 1.0.0
   */
  static emptyFrom(requestId: Snowflake) {
    return new Chunk({
      requestId,
      id: Snowflake(BigInt(0)),
      sequence: 0,
      values: [undefined]
    })
  }

  /**
   * @since 1.0.0
   */
  static readonly schemaFromSelf: Schema.Schema<Chunk<never>> = Schema.declare(
    (u): u is Chunk<never> => isReply(u) && u._tag === "Chunk",
    {
      typeConstructor: { _tag: "effect/cluster/Reply.Chunk" }
    }
  )

  /**
   * @since 1.0.0
   */
  static schema<R extends Rpc.Any>(rpc: R): Schema.Schema<
    Chunk<R>,
    ChunkEncoded<R>,
    Rpc.Context<R>
  > {
    const successSchema = ((rpc as any as Rpc.AnyWithProps).successSchema as RpcSchema.Stream<any, any>).success
    if (!successSchema) {
      return Schema.Never as any
    }
    return Schema.transform(
      Schema.Struct({
        _tag: Schema.Literal("Chunk"),
        requestId: SnowflakeFromString,
        id: SnowflakeFromString,
        sequence: Schema.Number,
        values: Schema.NonEmptyArray(successSchema)
      }),
      Chunk.schemaFromSelf,
      {
        decode: (encoded) => new Chunk(encoded as any),
        encode: identity
      }
    ) as any
  }

  /**
   * @since 1.0.0
   */
  withRequestId(requestId: Snowflake): Chunk<R> {
    return new Chunk({
      ...this,
      requestId
    })
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export class WithExit<R extends Rpc.Any> extends Data.TaggedClass("WithExit")<{
  readonly requestId: Snowflake
  readonly id: Snowflake
  readonly exit: Rpc.Exit<R>
}> {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 1.0.0
   */
  static schema<R extends Rpc.Any>(rpc: R): Schema.Schema<
    WithExit<R>,
    WithExitEncoded<R>,
    Rpc.Context<R>
  > {
    return Schema.transform(
      Schema.Struct({
        _tag: Schema.Literal("WithExit"),
        requestId: SnowflakeFromString,
        id: SnowflakeFromString,
        exit: Rpc.exitSchema(rpc)
      }),
      Schema.declare((u): u is WithExit<R> => isReply(u) && u._tag === "WithExit"),
      {
        decode: (encoded) => new WithExit(encoded),
        encode: identity
      }
    ) as any
  }

  /**
   * @since 1.0.0
   */
  withRequestId(requestId: Snowflake): WithExit<R> {
    return new WithExit({
      ...this,
      requestId
    })
  }
}

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const serialize = <R extends Rpc.Any>(
  self: ReplyWithContext<R>
): Effect.Effect<ReplyEncoded<R>, MalformedMessage> => {
  const schema = Reply(self.rpc)
  return MalformedMessage.refail(
    Effect.locally(Schema.encode(schema)(self.reply), FiberRef.currentContext, self.context)
  )
}

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const serializeLastReceived = <R extends Rpc.Any>(
  self: OutgoingRequest<R>
): Effect.Effect<Option.Option<ReplyEncoded<R>>, MalformedMessage> => {
  if (self.lastReceivedReply._tag === "None") {
    return Effect.succeedNone
  }
  const schema = Reply(self.rpc)
  return Effect.asSome(MalformedMessage.refail(
    Effect.locally(Schema.encode(schema)(self.lastReceivedReply.value), FiberRef.currentContext, self.context)
  ))
}
