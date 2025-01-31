/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import type * as RpcSchema from "@effect/rpc/RpcSchema"
import * as Data from "effect/Data"
import { identity } from "effect/Function"
import { hasProperty } from "effect/Predicate"
import * as Schema from "effect/Schema"
import { type Snowflake, SnowflakeFromString } from "./Snowflake.js"

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
  readonly values: ReadonlyArray<Rpc.SuccessChunkEncoded<R>>
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
 * @category models
 */
export class Chunk<R extends Rpc.Any> extends Data.TaggedClass("Chunk")<{
  readonly requestId: Snowflake
  readonly id: Snowflake
  readonly values: ReadonlyArray<Rpc.SuccessChunk<R>>
}> {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 1.0.0
   */
  static readonly schemaFromSelf: Schema.Schema<Chunk<never>> = Schema.declare((u): u is Chunk<never> =>
    isReply(u) && u._tag === "Chunk"
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
    return Schema.transform(
      Schema.Struct({
        _tag: Schema.Literal("Chunk"),
        requestId: SnowflakeFromString,
        id: SnowflakeFromString,
        values: Schema.Array(successSchema)
      }),
      Chunk.schemaFromSelf,
      {
        decode: (encoded) => new Chunk(encoded as any),
        encode: identity
      }
    ) as any
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
    const rpcAny = rpc as any as Rpc.AnyWithProps
    return Schema.transform(
      Schema.Struct({
        _tag: Schema.Literal("WithExit"),
        requestId: SnowflakeFromString,
        id: SnowflakeFromString,
        exit: Schema.Exit({
          success: rpcAny.successSchema,
          failure: rpcAny.errorSchema,
          defect: Schema.Defect
        })
      }),
      Schema.declare((u): u is WithExit<R> => isReply(u) && u._tag === "WithExit"),
      {
        decode: (encoded) => new WithExit(encoded),
        encode: identity
      }
    ) as any
  }
}
