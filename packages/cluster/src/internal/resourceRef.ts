import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as MutableRef from "effect/MutableRef"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"
import type { EntityAddress } from "../EntityAddress.js"
import { acquireEntity, releaseEntity } from "./interruptors.js"

export type State<A, E> = {
  readonly _tag: "Closed"
} | {
  readonly _tag: "Acquiring"
  readonly scope: Scope.CloseableScope
} | {
  readonly _tag: "Acquired"
  readonly scope: Scope.CloseableScope
  readonly value: A
} | {
  readonly _tag: "Failed"
  readonly scope: Scope.CloseableScope
  readonly cause: Cause.Cause<E>
}

export class ResourceRef<A, E = never> {
  static from = Effect.fnUntraced(function*<A, E>(
    parentScope: Scope.Scope,
    acquire: (scope: Scope.Scope) => Effect.Effect<A, E>,
    teardownAddress?: EntityAddress
  ) {
    const state = MutableRef.make<State<A, E>>({ _tag: "Closed" })

    yield* Scope.addFinalizerExit(parentScope, (exit) => {
      const s = MutableRef.get(state)
      if (s._tag === "Closed") {
        return Effect.void
      }
      const scope = s.scope
      MutableRef.set(state, { _tag: "Closed" })
      return Scope.close(scope, exit)
    })

    const scope = yield* Scope.make()
    MutableRef.set(state, { _tag: "Acquiring", scope })
    const value = yield* acquire(scope)
    MutableRef.set(state, { _tag: "Acquired", scope, value })

    return new ResourceRef(state, acquire, teardownAddress)
  })

  constructor(
    readonly state: MutableRef.MutableRef<State<A, E>>,
    readonly acquire: (scope: Scope.Scope) => Effect.Effect<A, E>,
    readonly teardownAddress?: EntityAddress
  ) {}

  latch = Effect.unsafeMakeLatch(true)

  unsafeGet(): Option.Option<A> {
    if (this.state.current._tag === "Acquired") {
      return Option.some(this.state.current.value)
    }
    return Option.none()
  }

  unsafeRebuild(): Effect.Effect<void, E> {
    const s = this.state.current
    if (s._tag === "Closed") {
      return Effect.interrupt
    }
    const prevScope = s.scope
    const scope = Effect.runSync(Scope.make())
    this.latch.unsafeClose()
    MutableRef.set(this.state, { _tag: "Acquiring", scope })
    const teardownAddress = this.teardownAddress
    return Effect.suspend(() => {
      const close = Scope.close(prevScope, Exit.void)
      if (!teardownAddress) return close
      acquireEntity(teardownAddress)
      return Effect.ensuring(close, Effect.sync(() => releaseEntity(teardownAddress)))
    }).pipe(
      Effect.andThen(this.acquire(scope)),
      Effect.flatMap((value) => {
        if (this.state.current._tag === "Closed") {
          return Effect.interrupt
        }
        MutableRef.set(this.state, { _tag: "Acquired", scope, value })
        return this.latch.open
      }),
      Effect.onExit((exit) => {
        if (Exit.isSuccess(exit)) return Effect.void
        return Scope.close(scope, exit).pipe(
          Effect.ensuring(Effect.sync(() => {
            const state = this.state.current
            if (state._tag === "Acquiring" && state.scope === scope) {
              MutableRef.set(this.state, { _tag: "Failed", scope, cause: exit.cause })
              this.latch.unsafeOpen()
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
    } else if (s._tag === "Acquired") {
      return Effect.succeed(s.value)
    } else if (s._tag === "Failed") {
      return Effect.failCause(s.cause)
    }
    return Effect.zipRight(this.latch.await, this.await)
  })
}
