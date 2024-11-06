/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Deferred from "effect/Deferred"
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import type * as Layer from "effect/Layer"
import type * as ParseResult from "effect/ParseResult"
import type * as Pool from "effect/Pool"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import * as internal from "./internal/worker.js"
import type { WorkerError, WorkerErrorFrom } from "./WorkerError.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface BackingWorker<I, O> {
  readonly send: (message: I, transfers?: ReadonlyArray<unknown>) => Effect.Effect<void, WorkerError>
  readonly run: <A, E, R>(
    handler: (_: BackingWorker.Message<O>) => Effect.Effect<A, E, R>
  ) => Effect.Effect<never, E | WorkerError, R>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace BackingWorker {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Message<O> = readonly [ready: 0] | readonly [data: 1, O]
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const PlatformWorkerTypeId: unique symbol = internal.PlatformWorkerTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type PlatformWorkerTypeId = typeof PlatformWorkerTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface PlatformWorker {
  readonly [PlatformWorkerTypeId]: PlatformWorkerTypeId
  readonly spawn: <I, O>(id: number) => Effect.Effect<BackingWorker<I, O>, WorkerError, Spawner>
}

/**
 * @since 1.0.0
 */
export const makePlatform: <W>() => <
  P extends { readonly postMessage: (message: any, transfers?: any | undefined) => void }
>(
  options: {
    readonly setup: (options: { readonly worker: W; readonly scope: Scope.Scope }) => Effect.Effect<P, WorkerError>
    readonly listen: (
      options: {
        readonly port: P
        readonly emit: (data: any) => void
        readonly deferred: Deferred.Deferred<never, WorkerError>
        readonly scope: Scope.Scope
      }
    ) => Effect.Effect<void>
  }
) => PlatformWorker = internal.makePlatform

/**
 * @since 1.0.0
 * @category tags
 */
export const PlatformWorker: Context.Tag<PlatformWorker, PlatformWorker> = internal.PlatformWorker

/**
 * @since 1.0.0
 * @category models
 */
export interface Worker<I, O, E = never> {
  readonly id: number
  readonly execute: (message: I) => Stream.Stream<O, E | WorkerError>
  readonly executeEffect: (message: I) => Effect.Effect<O, E | WorkerError>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Spawner {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Spawner: Context.Tag<Spawner, SpawnerFn<unknown>> = internal.Spawner

/**
 * @since 1.0.0
 * @category models
 */
export interface SpawnerFn<W = unknown> {
  (id: number): W
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Worker {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Options<I> {
    readonly encode?: ((message: I) => Effect.Effect<unknown, WorkerError>) | undefined
    readonly initialMessage?: LazyArg<I> | undefined
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Request<I = unknown> =
    | readonly [id: number, data: 0, I, trace: Span | undefined]
    | readonly [id: number, interrupt: 1]

  /**
   * @since 1.0.0
   * @category models
   */
  export type Span = readonly [traceId: string, spanId: string, sampled: boolean]

  /**
   * @since 1.0.0
   * @category models
   */
  export type Response<E, O = unknown> =
    | readonly [id: number, data: 0, ReadonlyArray<O>]
    | readonly [id: number, end: 1]
    | readonly [id: number, end: 1, ReadonlyArray<O>]
    | readonly [id: number, error: 2, E]
    | readonly [id: number, defect: 3, Schema.CauseEncoded<WorkerErrorFrom, unknown>]
}

/**
 * @since 1.0.0
 * @category models
 */
export interface WorkerPool<I, O, E = never> {
  readonly backing: Pool.Pool<Worker<I, O, E>, WorkerError>
  readonly broadcast: (message: I) => Effect.Effect<void, E | WorkerError>
  readonly execute: (message: I) => Stream.Stream<O, E | WorkerError>
  readonly executeEffect: (message: I) => Effect.Effect<O, E | WorkerError>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace WorkerPool {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Options<I> =
    & Worker.Options<I>
    & ({
      readonly onCreate?: (worker: Worker<I, unknown, unknown>) => Effect.Effect<void, WorkerError>
      readonly size: number
      readonly concurrency?: number | undefined
      readonly targetUtilization?: number | undefined
    } | {
      readonly onCreate?: (worker: Worker<I, unknown, unknown>) => Effect.Effect<void, WorkerError>
      readonly minSize: number
      readonly maxSize: number
      readonly concurrency?: number | undefined
      readonly targetUtilization?: number | undefined
      readonly timeToLive: Duration.DurationInput
    })
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const WorkerManagerTypeId: unique symbol = internal.WorkerManagerTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type WorkerManagerTypeId = typeof WorkerManagerTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface WorkerManager {
  readonly [WorkerManagerTypeId]: WorkerManagerTypeId
  readonly spawn: <I, O, E>(
    options: Worker.Options<I>
  ) => Effect.Effect<Worker<I, O, E>, WorkerError, Scope.Scope | Spawner>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const WorkerManager: Context.Tag<WorkerManager, WorkerManager> = internal.WorkerManager

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeManager: Effect.Effect<WorkerManager, never, PlatformWorker> = internal.makeManager

/**
 * @since 1.0.0
 * @category layers
 */
export const layerManager: Layer.Layer<WorkerManager, never, PlatformWorker> = internal.layerManager

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePool: <I, O, E>(
  options: WorkerPool.Options<I>
) => Effect.Effect<WorkerPool<I, O, E>, WorkerError, WorkerManager | Spawner | Scope.Scope> = internal.makePool

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePoolLayer: <Tag, I, O, E>(
  tag: Context.Tag<Tag, WorkerPool<I, O, E>>,
  options: WorkerPool.Options<I>
) => Layer.Layer<Tag, WorkerError, WorkerManager | Spawner> = internal.makePoolLayer

/**
 * @since 1.0.0
 * @category models
 */
export interface SerializedWorker<I extends Schema.TaggedRequest.All> {
  readonly id: number
  readonly execute: <Req extends I>(
    message: Req
  ) => Req extends Schema.WithResult<infer A, infer _I, infer E, infer _EI, infer R>
    ? Stream.Stream<A, E | WorkerError | ParseResult.ParseError, R>
    : never
  readonly executeEffect: <Req extends I>(
    message: Req
  ) => Req extends Schema.WithResult<infer A, infer _I, infer E, infer _EI, infer R>
    ? Effect.Effect<A, E | WorkerError | ParseResult.ParseError, R>
    : never
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace SerializedWorker {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Options<I> = Extract<I, { readonly _tag: "InitialMessage" }> extends never ? {
      readonly initialMessage?: LazyArg<I>
    }
    : {
      readonly initialMessage: LazyArg<Extract<I, { readonly _tag: "InitialMessage" }>>
    }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface SerializedWorkerPool<I extends Schema.TaggedRequest.All> {
  readonly backing: Pool.Pool<SerializedWorker<I>, WorkerError>
  readonly broadcast: <Req extends I>(
    message: Req
  ) => Req extends Schema.WithResult<infer _A, infer _I, infer E, infer _EI, infer R>
    ? Effect.Effect<void, E | WorkerError | ParseResult.ParseError, R>
    : never
  readonly execute: <Req extends I>(
    message: Req
  ) => Req extends Schema.WithResult<infer A, infer _I, infer E, infer _EI, infer R>
    ? Stream.Stream<A, E | WorkerError | ParseResult.ParseError, R>
    : never
  readonly executeEffect: <Req extends I>(
    message: Req
  ) => Req extends Schema.WithResult<infer A, infer _I, infer E, infer _EI, infer R>
    ? Effect.Effect<A, E | WorkerError | ParseResult.ParseError, R>
    : never
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace SerializedWorkerPool {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Options<I> =
    & SerializedWorker.Options<I>
    & ({
      readonly onCreate?: (worker: Worker<I, unknown, unknown>) => Effect.Effect<void, WorkerError>
      readonly size: number
      readonly concurrency?: number | undefined
      readonly targetUtilization?: number | undefined
    } | {
      readonly onCreate?: (worker: Worker<I, unknown, unknown>) => Effect.Effect<void, WorkerError>
      readonly minSize: number
      readonly maxSize: number
      readonly concurrency?: number | undefined
      readonly targetUtilization?: number | undefined
      readonly timeToLive: Duration.DurationInput
    })
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerialized: <I extends Schema.TaggedRequest.All>(
  options: SerializedWorker.Options<I>
) => Effect.Effect<SerializedWorker<I>, WorkerError, WorkerManager | Spawner | Scope.Scope> = internal.makeSerialized

/**
 * @since 1.0.0
 * @category constructors
 */
export const makePoolSerialized: <I extends Schema.TaggedRequest.All>(
  options: SerializedWorkerPool.Options<I>
) => Effect.Effect<SerializedWorkerPool<I>, WorkerError, WorkerManager | Spawner | Scope.Scope> =
  internal.makePoolSerialized

/**
 * @since 1.0.0
 * @category layers
 */
export const makePoolSerializedLayer: <Tag, I extends Schema.TaggedRequest.All>(
  tag: Context.Tag<Tag, SerializedWorkerPool<I>>,
  options: SerializedWorkerPool.Options<I>
) => Layer.Layer<Tag, WorkerError, WorkerManager | Spawner> = internal.makePoolSerializedLayer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSpawner: <W = unknown>(spawner: SpawnerFn<W>) => Layer.Layer<Spawner, never, never> =
  internal.layerSpawner
