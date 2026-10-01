import * as Deferred from "../../Deferred.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Fiber from "../../Fiber.ts"
import * as Scope from "../../Scope.ts"
import type { EntityAddress } from "../EntityAddress.ts"
import { acquireEntity, releaseEntity } from "./interruptors.ts"

type Pending<A> = {
  readonly _tag: "Pending"
  readonly scope: Scope.Closeable
  /**
   * What must be released before acquiring: the replaced generation, or the
   * release of a failed one that is already under way.
   */
  readonly releases: Scope.Closeable | Fiber.Fiber<void> | undefined
  releasing: boolean
  /** Completed once a generation is ready, or this one fails. */
  readonly ready: Deferred.Deferred<A>
  /** Set while the acquired value is prepared. */
  value: A | undefined
  /** Runs the rebuild, interrupted when the ref closes. */
  work: Fiber.Fiber<void> | undefined
  prepare: Fiber.Fiber<void> | undefined
  superseded: boolean
}

type State<A> =
  | { readonly _tag: "Closed" }
  | { readonly _tag: "Ready"; readonly scope: Scope.Closeable; readonly value: A }
  | Pending<A>
  | {
    readonly _tag: "Failed"
    readonly ready: Deferred.Deferred<A>
    /** The release of the failed generation, awaited by the next rebuild. */
    readonly releasing: Fiber.Fiber<void> | undefined
  }

/**
 * A resource that is replaced in place. Each acquisition is a generation,
 * identified by the value it produced.
 *
 * @internal
 */
export class ResourceRef<A> {
  static from = Effect.fnUntraced(function*<A>(
    parentScope: Scope.Scope,
    acquire: (scope: Scope.Scope) => Effect.Effect<A>,
    teardownAddress?: EntityAddress
  ) {
    // Releases run in a scope closed after the ref, so closing wakes waiters
    // before waiting for any release that is still under way.
    const releaseScope = Scope.forkUnsafe(parentScope)
    const ref = new ResourceRef(releaseScope, acquire, teardownAddress)
    yield* Scope.addFinalizerExit(parentScope, (exit) => ref.close(exit))
    const pending = ref.pending(undefined, Deferred.makeUnsafe())
    const value = yield* acquire(pending.scope)
    if (ref.state === pending) {
      ref.state = { _tag: "Ready", scope: pending.scope, value }
      Deferred.doneUnsafe(pending.ready, Exit.succeed(value))
    }
    return ref
  })

  private state: State<A> = { _tag: "Closed" }
  private readonly releaseScope: Scope.Scope
  private readonly acquire: (scope: Scope.Scope) => Effect.Effect<A>
  private readonly teardownAddress: EntityAddress | undefined
  private constructor(
    releaseScope: Scope.Scope,
    acquire: (scope: Scope.Scope) => Effect.Effect<A>,
    teardownAddress: EntityAddress | undefined
  ) {
    this.releaseScope = releaseScope
    this.acquire = acquire
    this.teardownAddress = teardownAddress
  }

  /**
   * The ready value, or `undefined` while a generation is being built or
   * prepared.
   */
  getUnsafe(): A | undefined {
    return this.state._tag === "Ready" ? this.state.value : undefined
  }

  /**
   * Resolves with the ready value. Interrupts once the ref is closed.
   */
  readonly await: Effect.Effect<A> = Effect.suspend(() => {
    const s = this.state
    switch (s._tag) {
      case "Closed":
        return Effect.interrupt
      case "Ready":
        return Effect.succeed(s.value)
      case "Pending":
      case "Failed":
        return Deferred.await(s.ready)
    }
  })

  /**
   * Replaces the current generation. Returns `undefined` when refused:
   * - with `from`, unless the ready or preparing value is `from`, so each
   *   generation is replaced at most once
   * - without `from`, while a rebuild is already acquiring or preparing
   *
   * Waiters are held from the moment the rebuild is accepted. The returned
   * effect closes the replaced generation, acquires the new one and runs
   * `prepare` with it before admitting them. It interrupts if the ref closes
   * or another rebuild replaces this generation first, interrupting its
   * acquisition or `prepare` too. If it fails, waiters are released with the
   * same cause and the next rebuild without `from` is accepted; that rebuild
   * first waits for the failed generation to be released. A rebuild
   * interrupted while still releasing instead leaves its waiters to the next
   * rebuild.
   */
  rebuildUnsafe(options?: {
    readonly from?: A | undefined
    readonly prepare?: ((value: A) => Effect.Effect<void>) | undefined
  }): Effect.Effect<void> | undefined {
    const s = this.state
    const from = options?.from
    let pending: Pending<A>
    switch (s._tag) {
      case "Closed":
        return undefined
      case "Ready": {
        if (from !== undefined && from !== s.value) return undefined
        pending = this.pending(s.scope, Deferred.makeUnsafe())
        break
      }
      case "Failed": {
        if (from !== undefined) return undefined
        pending = this.pending(s.releasing, s.ready)
        break
      }
      case "Pending": {
        if (from === undefined || s.value !== from) return undefined
        s.superseded = true
        s.prepare?.interruptUnsafe()
        pending = this.pending(s.scope, s.ready)
        break
      }
    }
    return this.run(pending, options?.prepare)
  }

  private pending(
    releases: Scope.Closeable | Fiber.Fiber<void> | undefined,
    ready: Deferred.Deferred<A>
  ): Pending<A> {
    const pending: Pending<A> = {
      _tag: "Pending",
      scope: Scope.makeUnsafe(),
      releases,
      releasing: false,
      ready,
      value: undefined,
      work: undefined,
      prepare: undefined,
      superseded: false
    }
    this.state = pending
    return pending
  }

  private run(pending: Pending<A>, prepare: ((value: A) => Effect.Effect<void>) | undefined): Effect.Effect<void> {
    const work = Effect.suspend(() => {
      if (this.state !== pending) return Effect.interrupt
      const releases = pending.releases
      if (!releases) return Effect.void
      pending.releasing = true
      return Effect.andThen(
        Fiber.isFiber(releases) ? Fiber.join(releases) : Effect.flatMap(this.release(releases), Fiber.join),
        Effect.sync(() => {
          pending.releasing = false
        })
      )
    }).pipe(
      Effect.andThen(Effect.suspend(() => this.acquire(pending.scope))),
      Effect.tap((value) => {
        if (this.state !== pending) return Effect.interrupt
        pending.value = value
        if (!prepare) return Effect.void
        return Effect.flatMap(Effect.forkChild(prepare(value)), (fiber) => {
          pending.prepare = fiber
          if (pending.superseded) fiber.interruptUnsafe()
          return Fiber.join(fiber)
        })
      }),
      Effect.flatMap((value) => {
        if (this.state !== pending) return Effect.interrupt
        this.state = { _tag: "Ready", scope: pending.scope, value }
        Deferred.doneUnsafe(pending.ready, Exit.succeed(value))
        return Effect.void
      }),
      Effect.onExit((exit) => {
        if (Exit.isSuccess(exit) || this.state !== pending) {
          return Effect.void
        }
        return Effect.map(this.release(pending.scope), (releasing) => {
          if (this.state !== pending) return
          if (pending.releasing) {
            // Abandoned before anything was acquired, so waiters are left to
            // the next rebuild.
            this.state = { _tag: "Failed", ready: pending.ready, releasing }
          } else {
            this.state = { _tag: "Failed", ready: Deferred.makeUnsafe(), releasing }
            Deferred.doneUnsafe(pending.ready, Exit.failCause(exit.cause))
          }
        })
      })
    )
    return Effect.flatMap(Effect.forkChild(work, { startImmediately: true }), (fiber) => {
      pending.work = fiber
      if (this.state._tag === "Closed") fiber.interruptUnsafe()
      return Fiber.join(fiber)
    })
  }

  // Released in its own fiber, so a release that never completes cannot keep
  // a rebuild from being interrupted.
  private release(scope: Scope.Closeable): Effect.Effect<Fiber.Fiber<void>> {
    const teardownAddress = this.teardownAddress
    const close = teardownAddress
      ? Effect.suspend(() => {
        acquireEntity(teardownAddress)
        return Effect.ensuring(Scope.close(scope, Exit.void), Effect.sync(() => releaseEntity(teardownAddress)))
      })
      : Scope.close(scope, Exit.void)
    return Effect.forkIn(close, this.releaseScope, { startImmediately: true })
  }

  private close(exit: Exit.Exit<unknown, unknown>): Effect.Effect<void> {
    const s = this.state
    this.state = { _tag: "Closed" }
    switch (s._tag) {
      case "Closed":
        return Effect.void
      case "Ready":
        return Scope.close(s.scope, exit)
      case "Failed": {
        Deferred.doneUnsafe(s.ready, Effect.interrupt)
        return Effect.void
      }
      case "Pending": {
        Deferred.doneUnsafe(s.ready, Effect.interrupt)
        // Stop the rebuild before tearing down what it was building.
        s.work?.interruptUnsafe()
        s.prepare?.interruptUnsafe()
        const close = Scope.close(s.scope, exit)
        return s.releases && !Fiber.isFiber(s.releases) ? Effect.andThen(Scope.close(s.releases, exit), close) : close
      }
    }
  }
}
