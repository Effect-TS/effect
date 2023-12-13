/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/WorkerRunner`](https://effect-ts.github.io/platform/platform/WorkerRunner.ts.html).
 */
import type { WorkerError } from "@effect/platform/WorkerError"
import type * as Runner from "@effect/platform/WorkerRunner"
import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import * as internal from "./internal/workerRunner.js"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/WorkerRunner"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <I, R, E, O>(
  process: (request: I) => Stream.Stream<R, E, O>,
  options?: Runner.Runner.Options<O> | undefined
) => Effect.Effect<R | Scope.Scope, WorkerError, void> = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerialized: <
  I,
  A extends Schema.TaggedRequest.Any,
  Handlers extends {
    readonly [K in A["_tag"]]: Extract<A, { readonly _tag: K }> extends
      Serializable.SerializableWithResult<infer _IS, infer S, infer _IE, infer E, infer _IO, infer O>
      ? (_: S) => Stream.Stream<any, E, O> | Effect.Effect<any, E, O> :
      never
  }
>(
  schema: Schema.Schema<I, A>,
  handlers: Handlers
) => Effect.Effect<
  Scope.Scope | (ReturnType<Handlers[keyof Handlers]> extends Stream.Stream<infer R, infer _E, infer _A> ? R : never),
  WorkerError,
  never
> = internal.makeSerialized

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<never, never, Runner.PlatformRunner> = internal.layer
