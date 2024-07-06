/**
 * @since 3.5.0
 */
import * as Context from "./Context.js"
import * as Effect from "./Effect.js"
import * as Exit from "./Exit.js"
import * as FiberRef from "./FiberRef.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import * as Scope from "./Scope.js"

/**
 * @since 3.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("effect/RcRef")

/**
 * @since 3.5.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 3.5.0
 * @category models
 */
export interface RcRef<in out A, in out E> extends Pipeable {
  readonly [TypeId]: TypeId

  /** @internal */
  readonly acquire: Effect.Effect<A, E, Scope.Scope>
  /** @internal */
  readonly context: Context.Context<never>
  /** @internal */
  state: State<A>
  /** @internal */
  readonly semaphore: Effect.Semaphore
}

type State<A> = State.Empty | State.Acquired<A> | State.Closed

declare namespace State {
  interface Empty {
    readonly _tag: "Empty"
  }
  interface Acquired<A> {
    readonly _tag: "Acquired"
    readonly value: A
    readonly scope: Scope.CloseableScope
    refCount: number
  }
  interface Closed {
    readonly _tag: "Closed"
  }
}

const stateEmpty: State<never> = { _tag: "Empty" }
const stateClosed: State<never> = { _tag: "Closed" }

const RcRefProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Create an `RcRef` from an acquire `Effect`.
 *
 * An RcRef wraps a reference counted resource that can be acquired and released
 * multiple times.
 *
 * The resource is lazily acquired on the first call to `get` and released when
 * the last reference is released.
 *
 * @since 3.5.0
 * @category constructors
 * @example
 * import { Effect, RcRef } from "effect"
 *
 * Effect.gen(function*() {
 *   const ref = yield* RcRef.make(Effect.acquireRelease(
 *     Effect.succeed("foo"),
 *     () => Effect.log("release foo")
 *   ))
 *
 *   // will only acquire the resource once, and release it
 *   // when the scope is closed
 *   yield* RcRef.get(ref).pipe(
 *     Effect.andThen(RcRef.get(ref)),
 *     Effect.scoped
 *   )
 * })
 */
export const make = <A, E, R>(
  acquire: Effect.Effect<A, E, R>
): Effect.Effect<RcRef<A, E>, never, R | Scope.Scope> =>
  Effect.acquireRelease(
    Effect.map(Effect.context<R>(), (context): RcRef<A, E> =>
      Object.assign(Object.create(RcRefProto), {
        acquire,
        context,
        semaphore: Effect.unsafeMakeSemaphore(1),
        state: stateEmpty
      })),
    (self) =>
      self.semaphore.withPermits(1)(
        Effect.suspend(() => {
          const close = self.state._tag === "Acquired"
            ? Scope.close(self.state.scope, Exit.void)
            : Effect.void
          self.state = stateClosed
          return close
        })
      )
  )

/**
 * @since 3.5.0
 * @category combinators
 */
export const get = <A, E>(
  self: RcRef<A, E>
): Effect.Effect<A, E, Scope.Scope> =>
  Effect.uninterruptibleMask((restore) =>
    Effect.suspend(() => {
      switch (self.state._tag) {
        case "Closed": {
          return Effect.interrupt
        }
        case "Acquired": {
          self.state.refCount++
          return Effect.succeed(self.state)
        }
        case "Empty": {
          return Effect.flatMap(Scope.make(), (scope) =>
            Effect.map(
              restore(Effect.locally(
                self.acquire as Effect.Effect<A, E>,
                FiberRef.currentContext,
                Context.add(self.context, Scope.Scope, scope)
              )),
              (value): State.Acquired<A> => (self.state = { _tag: "Acquired", value, scope, refCount: 1 })
            ))
        }
      }
    }) as Effect.Effect<State.Acquired<A>, E>
  ).pipe(
    self.semaphore.withPermits(1),
    Effect.bindTo("state"),
    Effect.bind("scope", () => Effect.scope),
    Effect.tap(({ scope, state }) =>
      Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          state.refCount--
          if (state.refCount > 0) {
            return false
          }
          self.state = stateEmpty
          return true
        }).pipe(
          self.semaphore.withPermits(1),
          Effect.flatMap((removed) =>
            removed
              ? Scope.close(state.scope, Exit.void)
              : Effect.void
          )
        )
      )
    ),
    Effect.map(({ state }) => state.value)
  )
