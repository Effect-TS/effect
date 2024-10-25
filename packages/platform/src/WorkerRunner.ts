/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import * as internal from "./internal/workerRunner.js"
import type { WorkerError } from "./WorkerError.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface BackingRunner<I, O> {
  readonly run: <A, E, R>(
    handler: (portId: number, message: I) => Effect.Effect<A, E, R>
  ) => Effect.Effect<never, E | WorkerError, R>
  readonly send: (
    portId: number,
    message: O,
    transfers?: ReadonlyArray<unknown>
  ) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace BackingRunner {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Message<I> = readonly [request: 0, I] | readonly [close: 1]
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const PlatformRunnerTypeId: unique symbol = internal.PlatformRunnerTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type PlatformRunnerTypeId = typeof PlatformRunnerTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface PlatformRunner {
  readonly [PlatformRunnerTypeId]: PlatformRunnerTypeId
  readonly start: <I, O>() => Effect.Effect<BackingRunner<I, O>, WorkerError>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const PlatformRunner: Context.Tag<PlatformRunner, PlatformRunner> = internal.PlatformRunner

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Runner {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Options<I, O, E> {
    readonly decode?: (
      message: unknown
    ) => Effect.Effect<I, WorkerError>
    readonly encodeOutput?: (
      request: I,
      message: O
    ) => Effect.Effect<unknown, WorkerError>
    readonly encodeError?: (
      request: I,
      error: E
    ) => Effect.Effect<unknown, WorkerError>
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const run: <I, E, R, O>(
  process: (request: I) => Stream.Stream<O, E, R> | Effect.Effect<O, E, R>,
  options?: Runner.Options<I, O, E>
) => Effect.Effect<never, WorkerError, PlatformRunner | R> = internal.run

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <I, E, R, O>(
  process: (request: I) => Stream.Stream<O, E, R> | Effect.Effect<O, E, R>,
  options?: Runner.Options<I, O, E>
) => Effect.Effect<void, WorkerError, PlatformRunner | R | Scope.Scope> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: <I, E, R, O>(
  process: (request: I) => Stream.Stream<O, E, R> | Effect.Effect<O, E, R>,
  options?: Runner.Options<I, O, E> | undefined
) => Layer.Layer<never, WorkerError, R | PlatformRunner> = internal.layer

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace SerializedRunner {
  /**
   * @since 1.0.0
   */
  export type Handlers<A extends Schema.TaggedRequest.All> = {
    readonly [K in A["_tag"]]: Extract<
      A,
      { readonly _tag: K }
    > extends Serializable.SerializableWithResult<
      infer S,
      infer _SI,
      infer _SR,
      infer A,
      infer _AI,
      infer E,
      infer _EI,
      infer _RR
    > ? (
        _: S
      ) =>
        | Stream.Stream<A, E, any>
        | Effect.Effect<A, E, any>
        | Layer.Layer<any, E, any>
        | Layer.Layer<never, E, any>
      : never
  }

  /**
   * @since 1.0.0
   */
  export type HandlersContext<
    Handlers extends Record<string, (...args: ReadonlyArray<any>) => any>
  > =
    | Exclude<
      {
        [K in keyof Handlers]: ReturnType<Handlers[K]> extends Stream.Stream<
          infer _A,
          infer _E,
          infer R
        > ? R
          : never
      }[keyof Handlers],
      InitialContext<Handlers>
    >
    | InitialEnv<Handlers>

  /**
   * @since 1.0.0
   */
  type InitialContext<
    Handlers extends Record<string, (...args: ReadonlyArray<any>) => any>
  > = Handlers["InitialMessage"] extends (
    ...args: ReadonlyArray<any>
  ) => Layer.Layer<infer A, infer _E, infer _R> ? A
    : never

  /**
   * @since 1.0.0
   */
  type InitialEnv<
    Handlers extends Record<string, (...args: ReadonlyArray<any>) => any>
  > = Handlers["InitialMessage"] extends (
    ...args: ReadonlyArray<any>
  ) => Layer.Layer<infer _A, infer _E, infer R> ? R
    : never
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerialized: <
  R,
  I,
  A extends Schema.TaggedRequest.All,
  const Handlers extends SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<A, I, R>,
  handlers: Handlers
) => Effect.Effect<void, WorkerError, PlatformRunner | Scope.Scope | R | SerializedRunner.HandlersContext<Handlers>> =
  internal.makeSerialized

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSerialized: <
  R,
  I,
  A extends Schema.TaggedRequest.All,
  const Handlers extends SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<A, I, R>,
  handlers: Handlers
) => Layer.Layer<never, WorkerError, PlatformRunner | R | SerializedRunner.HandlersContext<Handlers>> =
  internal.layerSerialized
