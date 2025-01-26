/**
 * @since 1.0.0
 */
import * as Transferable from "@effect/platform/Transferable"
import type { NoSuchElementException } from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { ParseError } from "effect/ParseResult"
import * as Schema from "effect/Schema"
import type { Protocol } from "./RpcServer.js"

/**
 * @since 1.0.0
 * @category initial message
 */
export class InitialMessage extends Context.Tag("@effect/rpc/RpcWorker/InitialMessage")<
  InitialMessage,
  Effect.Effect<
    readonly [
      data: unknown,
      transfers: ReadonlyArray<Transferable>
    ]
  >
>() {}

/**
 * @since 1.0.0
 * @category initial message
 */
export declare namespace InitialMessage {
  /**
   * @since 1.0.0
   * @category initial message
   */
  export interface Encoded {
    readonly _tag: "InitialMessage"
    readonly value: unknown
  }
}

const ProtocolTag: typeof Protocol = Context.GenericTag("@effect/rpc/RpcServer/Protocol") as any

/**
 * @since 1.0.0
 * @category initial message
 */
export const makeInitialMessage = <A, I, R, E, R2>(
  schema: Schema.Schema<A, I, R>,
  effect: Effect.Effect<A, E, R2>
): Effect.Effect<
  readonly [data: unknown, transferables: ReadonlyArray<globalThis.Transferable>],
  E | ParseError,
  R | R2
> =>
  Effect.flatMap(effect, (value) => {
    const collector = Transferable.unsafeMakeCollector()
    return Schema.encode(schema)(value).pipe(
      Effect.provideService(Transferable.Collector, collector),
      Effect.map((encoded) => [encoded, collector.unsafeClear()] as const)
    )
  })

/**
 * @since 1.0.0
 * @category initial message
 */
export const layerInitialMessage = <A, I, R, R2>(
  schema: Schema.Schema<A, I, R>,
  build: Effect.Effect<A, never, R2>
): Layer.Layer<InitialMessage, never, R | R2> =>
  Layer.effect(
    InitialMessage,
    Effect.contextWith((context: Context.Context<R | R2>) =>
      Effect.provide(Effect.orDie(makeInitialMessage(schema, build)), context)
    )
  )

/**
 * @since 1.0.0
 * @category initial message
 */
export const initialMessage = <A, I, R>(
  schema: Schema.Schema<A, I, R>
): Effect.Effect<A, NoSuchElementException | ParseError, Protocol | R> =>
  ProtocolTag.pipe(
    Effect.flatMap((protocol) => protocol.initialMessage),
    Effect.flatten,
    Effect.flatMap(Schema.decodeUnknown(schema))
  )
