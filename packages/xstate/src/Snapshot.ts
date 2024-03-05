/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 * @category models
 */
export type Any = WithError<any, any> | WithError<any, never>

/**
 * @since 1.0.0
 * @category models
 */
export type Unknown = WithError<unknown, unknown> | WithError<unknown, never>

/**
 * @since 1.0.0
 * @category models
 */
export type InferSuccess<Snapshot> = Extract<Snapshot, { readonly status: "done" }> extends
  { readonly output: infer A } ? A
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type InferError<Snapshot> = Extract<Snapshot, { readonly status: "error" }> extends { readonly error: infer E } ?
  FlattenCause<E>
  : never

type FlattenCause<E> = [E] extends [Cause.Cause<infer Err>] ? Err : E

/**
 * @since 1.0.0
 * @category models
 */
export type InferContext<Snapshot> = Extract<Snapshot, { readonly status: "active" }> extends
  { readonly context: infer A } ? A
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type InferContextNonNullable<Snapshot> = Extract<Snapshot, { readonly status: "active" }> extends
  { readonly context: infer A } ? NonNullable<A>
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type WithInput<A, E = never, In = unknown> = {
  readonly status: "active"
  readonly output: undefined
  readonly error: undefined
  readonly input: In
} | {
  readonly status: "done"
  readonly output: A
  readonly error: undefined
  readonly input: In
} | {
  readonly status: "error"
  readonly output: undefined
  readonly error: E
  readonly input: In
} | {
  readonly status: "stopped"
  readonly output: undefined
  readonly error: undefined
  readonly input: In
}

/**
 * @since 1.0.0
 * @category models
 */
export type WithError<A, E> = {
  readonly status: "active"
  readonly output: undefined
  readonly error: undefined
} | {
  readonly status: "done"
  readonly output: A
  readonly error: undefined
} | {
  readonly status: "error"
  readonly error: E
  readonly output: undefined
} | {
  readonly status: "stopped"
  readonly output: undefined
  readonly error: undefined
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace WithError {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = WithError<any, any> | WithError<any, never>
}

/**
 * @since 1.0.0
 * @category models
 */
export type WithContext<A, E> = {
  readonly status: "active"
  readonly context: A
  readonly output: undefined
  readonly error: undefined
} | {
  readonly status: "done"
  readonly context: A
  readonly output: unknown
  readonly error: undefined
} | {
  readonly status: "error"
  readonly context: A
  readonly error: E
  readonly output: undefined
} | {
  readonly status: "stopped"
  readonly context: A
  readonly output: undefined
  readonly error: undefined
}

/**
 * @since 1.0.0
 * @category models
 */
export type WithContextInput<A, E, In = unknown> = {
  readonly status: "active"
  readonly context: A
  readonly output: undefined
  readonly error: undefined
  readonly input: In
} | {
  readonly status: "done"
  readonly context: A
  readonly output: void
  readonly error: undefined
  readonly input: In
} | {
  readonly status: "error"
  readonly context: A
  readonly error: E
  readonly output: undefined
  readonly input: In
} | {
  readonly status: "stopped"
  readonly context: A
  readonly output: undefined
  readonly error: undefined
  readonly input: In
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace WithContext {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = WithContext<any, any> | WithContext<any, never>
}

/**
 * @since 1.0.0
 * @category models
 */
export type WithCause<A, E = never> = WithError<A, Cause.Cause<E>>

/**
 * @since 1.0.0
 */
export const flattenEffect = <A, E, E2, R>(
  effect: Effect.Effect<WithError<A, E>, E2, R>
): Effect.Effect<
  A,
  (E extends Cause.Cause<infer Err> ? Err : E) | E2,
  R
> =>
  Effect.flatMap(effect, (snapshot) => {
    switch (snapshot.status) {
      case "done": {
        return Effect.succeed(snapshot.output)
      }
      case "error": {
        return Cause.isCause(snapshot.error)
          ? Effect.failCause(snapshot.error as Cause.Cause<any>)
          : Effect.fail(snapshot.error)
      }
      default: {
        return Effect.interrupt
      }
    }
  })

/**
 * @since 1.0.0
 */
export const flattenStreamContext = <A, E>(
  stream: Stream.Stream<WithContext<A, E>>
): Stream.Stream<
  NonNullable<A>,
  E extends Cause.Cause<infer Err> ? Err : E
> =>
  Stream.flatMap(stream, (snapshot) => {
    switch (snapshot.status) {
      case "active": {
        return snapshot.context === undefined || snapshot.context === null
          ? Stream.empty
          : Stream.succeed(snapshot.context)
      }
      case "error": {
        return Cause.isCause(snapshot.error)
          ? Stream.failCause(snapshot.error as Cause.Cause<any>)
          : Stream.fail(snapshot.error)
      }
      case "stopped": {
        return Effect.interrupt
      }
      default: {
        return Stream.empty
      }
    }
  })
