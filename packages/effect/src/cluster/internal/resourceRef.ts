import type * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Latch from "../../Latch.ts"
import * as MutableRef from "../../MutableRef.ts"
import * as Option from "../../Option.ts"
import * as Scope from "../../Scope.ts"
import type { EntityAddress } from "../EntityAddress.ts"
import { acquireEntity, releaseEntity } from "./interruptors.ts"

/**
 * Each generation of the resource is identified by its scope.
 *
 * @internal
 */
export type State<A, E> = {
  readonly _tag: "Closed"
} | {
  readonly _tag: "Acquiring"
  readonly scope: Scope.Closeable
  /** The replaced generation, until the rebuild has closed it. */
  readonly retiring?: Scope.Closeable | undefined
} | {
  readonly _tag: "Acquired"
  readonly scope: Scope.Closeable
  readonly value: A
} | {
  readonly _tag: "Failed"
  readonly scope: Scope.Closeable
  readonly cause: Cause.Cause<E>
}

/**
 * @internal
 */
export class ResourceRef<A, E = never> {
  static from = Effect.fnUntraced(function*<A, E>(
    parentScope: Scope.Scope,
    acquire: (scope: Scope.Scope) => Effect.Effect<A, E>,
    teardownAddress?: EntityAddress
  ) {
    const ref = new ResourceRef<A, E>(MutableRef.make<State<A, E>>({ _tag: "Closed" }), acquire, teardownAddress)
    yield* Scope.addFinalizerExit(parentScope, (exit) => ref.close(exit))

    const scope = yield* Scope.make()
    MutableRef.set(ref.state, { _tag: "Acquiring", scope })
    const value = yield* acquire(scope)
    if (ref.scopeUnsafe() === scope) {
      MutableRef.set(ref.state, { _tag: "Acquired", scope, value })
      ref.latch.openUnsafe()
    }
    return ref
  })

  readonly state: MutableRef.MutableRef<State<A, E>>
  readonly acquire: (scope: Scope.Scope) => Effect.Effect<A, E>
  readonly teardownAddress: EntityAddress | undefined
  constructor(
    state: MutableRef.MutableRef<State<A, E>>,
    acquire: (scope: Scope.Scope) => Effect.Effect<A, E>,
    teardownAddress?: EntityAddress
  ) {
    this.state = state
    this.acquire = acquire
    this.teardownAddress = teardownAddress
  }

  /**
   * Open once the current generation is ready for use, has failed, or the ref
   * has closed.
   */
  latch = Latch.makeUnsafe(false)

  /**
   * The current value, if it is ready for use.
   */
  getUnsafe(): Option.Option<A> {
    const s = this.state.current
    return s._tag === "Acquired" && this.latch.isOpen() ? Option.some(s.value) : Option.none()
  }

  /**
   * The scope identifying the current generation, unless the ref is closed.
   */
  scopeUnsafe(): Scope.Scope | undefined {
    const s = this.state.current
    return s._tag === "Closed" ? undefined : s.scope
  }

  /**
   * Replaces the resource, resolving with the newly acquired value.
   *
   * With `from`, only the generation owning that scope is replaced, so each
   * generation is replaced at most once. Returns `undefined` when `from` is no
   * longer current.
   *
   * The new value is published only if no other rebuild started meanwhile.
   * Waiters are admitted after `onAcquired` has run, unless a later rebuild has
   * taken over by then.
   */
  rebuildUnsafe(): Effect.Effect<A, E>
  rebuildUnsafe(options: {
    readonly from: Scope.Scope
    readonly onAcquired?: ((value: A) => Effect.Effect<void>) | undefined
  }): Effect.Effect<A, E> | undefined
  rebuildUnsafe(options?: {
    readonly from: Scope.Scope
    readonly onAcquired?: ((value: A) => Effect.Effect<void>) | undefined
  }): Effect.Effect<A, E> | undefined {
    const prev = this.state.current
    if (prev._tag === "Closed") {
      return options ? undefined : Effect.interrupt
    } else if (options && prev.scope !== options.from) {
      return undefined
    }
    const scope = Scope.makeUnsafe()
    this.latch.closeUnsafe()
    MutableRef.set(this.state, { _tag: "Acquiring", scope, retiring: prev.scope })
    const teardownAddress = this.teardownAddress
    const onAcquired = options?.onAcquired
    return Effect.suspend(() => {
      let close = Scope.close(prev.scope, Exit.void)
      if (prev._tag === "Acquiring" && prev.retiring) {
        close = Effect.andThen(Scope.close(prev.retiring, Exit.void), close)
      }
      if (!teardownAddress) return close
      acquireEntity(teardownAddress)
      return Effect.ensuring(close, Effect.sync(() => releaseEntity(teardownAddress)))
    }).pipe(
      Effect.andThen(this.acquire(scope)),
      Effect.flatMap((value) => {
        if (this.scopeUnsafe() !== scope) {
          return Effect.interrupt
        }
        MutableRef.set(this.state, { _tag: "Acquired", scope, value })
        if (!onAcquired) return Effect.as(this.latch.open, value)
        return onAcquired(value).pipe(
          Effect.andThen(Effect.suspend(() => this.scopeUnsafe() === scope ? this.latch.open : Effect.void)),
          Effect.as(value)
        )
      }),
      Effect.onExit((exit) => {
        if (Exit.isSuccess(exit)) {
          return Effect.void
        }
        return Scope.close(scope, exit).pipe(
          Effect.ensuring(Effect.sync(() => {
            if (this.scopeUnsafe() === scope) {
              MutableRef.set(this.state, { _tag: "Failed", scope, cause: exit.cause })
              this.latch.openUnsafe()
            }
          }))
        )
      })
    )
  }

  await: Effect.Effect<A, E> = Effect.suspend(() => {
    const s = this.state.current
    if (s._tag === "Closed") {
      return Effect.interrupt
    } else if (s._tag === "Failed") {
      return Effect.failCause(s.cause)
    } else if (s._tag === "Acquired" && this.latch.isOpen()) {
      return Effect.succeed(s.value)
    }
    return Effect.flatMap(this.latch.await, () => this.await)
  })

  private close(exit: Exit.Exit<unknown, unknown>): Effect.Effect<void> {
    const s = this.state.current
    if (s._tag === "Closed") {
      return Effect.void
    }
    MutableRef.set(this.state, { _tag: "Closed" })
    // Wake waiters so they observe the closure instead of a pending acquisition.
    this.latch.openUnsafe()
    const close = Scope.close(s.scope, exit)
    return s._tag === "Acquiring" && s.retiring ? Effect.andThen(Scope.close(s.retiring, exit), close) : close
  }
}
