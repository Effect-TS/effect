import { Effect } from "@effect/core/io/Effect/definition"
import type { Exit } from "@effect/core/io/Exit/definition"
import type { FiberRuntime } from "@effect/core/io/Fiber/_internal/runtime"
import type { Patch as P } from "@effect/core/io/Supervisor/patch"
import type { SortedSet } from "@tsplus/stdlib/collections/SortedSet"
import type { Maybe } from "@tsplus/stdlib/data/Maybe"
import type { Env } from "@tsplus/stdlib/service/Env"

export const SupervisorURI = Symbol.for("@effect/core/io/Supervisor")
export type SupervisorURI = typeof SupervisorURI

export namespace Supervisor {
  export type Patch = P
}

/**
 * A `Supervisor<A>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `A` from the supervision.
 *
 * @tsplus type effect/core/io/Supervisor
 * @tsplus companion effect/core/io/Supervisor.Ops
 */
export abstract class Supervisor<T> {
  readonly [SupervisorURI]!: {
    _T: (_: never) => T
  }

  /**
   * Returns an effect that succeeds with the value produced by this supervisor.
   * This value may change over time, reflecting what the supervisor produces as
   * it supervises fibers.
   */
  abstract get value(): Effect<never, never, T>

  abstract onStart<R, E, A>(
    environment: Env<R>,
    effect: Effect<R, E, A>,
    parent: Maybe<FiberRuntime<any, any>>,
    fiber: FiberRuntime<E, A>
  ): void

  abstract onEnd<E, A>(
    value: Exit<E, A>,
    fiber: FiberRuntime<E, A>
  ): void

  abstract onEffect<E, A>(
    fiber: FiberRuntime<E, A>,
    effect: Effect<any, any, any>
  ): void

  abstract onSuspend<E, A>(
    fiber: FiberRuntime<E, A>
  ): void

  abstract onResume<E, A>(
    fiber: FiberRuntime<E, A>
  ): void

  /**
   * Maps this supervisor to another one, which has the same effect, but whose
   * value has been transformed by the specified function.
   */
  map<B>(f: (a: T) => B): Supervisor<B> {
    return new ProxySupervisor(this, () => this.value.map(f))
  }

  /**
   * Returns a new supervisor that performs the function of this supervisor, and
   * the function of the specified supervisor, producing a tuple of the outputs
   * produced by both supervisors.
   */
  zip<B>(right: Supervisor<B>): Supervisor<Tuple<[T, B]>> {
    return new Zip(this, right)
  }
}

export class ProxySupervisor<T> extends Supervisor<T> {
  constructor(
    readonly underlying: Supervisor<any>,
    readonly value0: () => Effect<never, never, T>
  ) {
    super()
  }

  get value(): Effect<never, never, T> {
    return this.value0()
  }

  onStart<R, E, A>(
    environment: Env<R>,
    effect: Effect<R, E, A>,
    parent: Maybe<FiberRuntime<any, any>>,
    fiber: FiberRuntime<E, A>
  ): void {
    this.underlying.onStart(environment, effect, parent, fiber)
  }

  onEnd<E, A>(value: Exit<E, A>, fiber: FiberRuntime<E, A>): void {
    this.underlying.onEnd(value, fiber)
  }

  onEffect<E, A>(fiber: FiberRuntime<E, A>, effect: Effect<any, any, any>): void {
    this.underlying.onEffect(fiber, effect)
  }

  onSuspend<E, A>(fiber: FiberRuntime<E, A>): void {
    this.underlying.onSuspend(fiber)
  }

  onResume<E, A>(fiber: FiberRuntime<E, A>): void {
    this.underlying.onResume(fiber)
  }
}

export class Zip<T0, T1> extends Supervisor<Tuple<[T0, T1]>> {
  constructor(
    readonly left: Supervisor<T0>,
    readonly right: Supervisor<T1>
  ) {
    super()
  }

  get value(): Effect<never, never, Tuple<[T0, T1]>> {
    return this.left.value.zip(this.right.value)
  }

  onStart<R, E, A>(
    environment: Env<R>,
    effect: Effect<R, E, A>,
    parent: Maybe<FiberRuntime<any, any>>,
    fiber: FiberRuntime<E, A>
  ): void {
    this.left.onStart(environment, effect, parent, fiber)
    this.right.onStart(environment, effect, parent, fiber)
  }

  onEnd<E, A>(value: Exit<E, A>, fiber: FiberRuntime<E, A>): void {
    this.left.onEnd(value, fiber)
    this.right.onEnd(value, fiber)
  }

  onEffect<E, A>(fiber: FiberRuntime<E, A>, effect: Effect<any, any, any>): void {
    this.left.onEffect(fiber, effect)
    this.right.onEffect(fiber, effect)
  }

  onSuspend<E, A>(fiber: FiberRuntime<E, A>): void {
    this.left.onSuspend(fiber)
    this.right.onSuspend(fiber)
  }

  onResume<E, A>(fiber: FiberRuntime<E, A>): void {
    this.left.onResume(fiber)
    this.right.onResume(fiber)
  }
}

export class Track extends Supervisor<Chunk<FiberRuntime<any, any>>> {
  readonly fibers: Set<FiberRuntime<any, any>> = new Set()

  get value(): Effect<never, never, Chunk<FiberRuntime<any, any>>> {
    return Effect.sync(Chunk.from(this.fibers))
  }

  onStart<R, E, A>(
    _environment: Env<R>,
    _effect: Effect<R, E, A>,
    _parent: Maybe<FiberRuntime<any, any>>,
    fiber: FiberRuntime<E, A>
  ): void {
    this.fibers.add(fiber)
  }

  onEnd<E, A>(_value: Exit<E, A>, fiber: FiberRuntime<E, A>): void {
    this.fibers.delete(fiber)
  }

  onEffect<E, A>(_fiber: FiberRuntime<E, A>, _effect: Effect<any, any, any>): void {
    //
  }

  onSuspend<E, A>(_fiber: FiberRuntime<E, A>): void {
    //
  }

  onResume<E, A>(_fiber: FiberRuntime<E, A>): void {
    //
  }
}

export class Const<T> extends Supervisor<T> {
  constructor(readonly effect: Effect<never, never, T>) {
    super()
  }

  get value(): Effect<never, never, T> {
    return this.effect
  }

  onStart<R, E, A>(
    _environment: Env<R>,
    _effect: Effect<R, E, A>,
    _parent: Maybe<FiberRuntime<any, any>>,
    _fiber: FiberRuntime<E, A>
  ): void {
    //
  }

  onEnd<E, A>(_value: Exit<E, A>, _fiber: FiberRuntime<E, A>): void {
    //
  }

  onEffect<E, A>(_fiber: FiberRuntime<E, A>, _effect: Effect<any, any, any>): void {
    //
  }

  onSuspend<E, A>(_fiber: FiberRuntime<E, A>): void {
    //
  }

  onResume<E, A>(_fiber: FiberRuntime<E, A>): void {
    //
  }
}

/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @tsplus static effect/core/io/Supervisor.Ops unsafeTrack
 */
export function unsafeTrack(): Supervisor<Chunk<FiberRuntime<any, any>>> {
  return new Track()
}

/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @tsplus static effect/core/io/Supervisor.Ops track
 */
export const track = Effect.sync(unsafeTrack)

/**
 * Creates a new supervisor that constantly yields effect when polled
 *
 * @tsplus static effect/core/io/Supervisor.Ops fromEffect
 */
export function fromEffect<A>(
  effect: Effect<never, never, A>
): Supervisor<A> {
  return new Const(effect)
}

/**
 * A supervisor that doesn't do anything in response to supervision events.
 *
 * @tsplus static effect/core/io/Supervisor.Ops none
 */
export const none = fromEffect(Effect.unit)

class FibersIn extends Supervisor<SortedSet<FiberRuntime<any, any>>> {
  constructor(readonly ref: AtomicReference<SortedSet<FiberRuntime<any, any>>>) {
    super()
  }

  get value(): Effect<never, never, SortedSet<FiberRuntime<any, any>>> {
    return Effect.sync(this.ref.get)
  }

  onStart<R, E, A>(
    _environment: Env<R>,
    _effect: Effect<R, E, A>,
    _parent: Maybe<FiberRuntime<any, any>>,
    fiber: FiberRuntime<E, A>
  ): void {
    this.ref.set(this.ref.get.add(fiber))
  }
  onEnd<E, A>(_value: Exit<E, A>, fiber: FiberRuntime<E, A>): void {
    this.ref.set(this.ref.get.remove(fiber))
  }
  onEffect<E, A>(_fiber: FiberRuntime<E, A>, _effect: Effect<any, any, any>): void {
    //
  }
  onSuspend<E, A>(_fiber: FiberRuntime<E, A>): void {
    //
  }
  onResume<E, A>(_fiber: FiberRuntime<E, A>): void {
    //
  }
}

/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @tsplus static effect/core/io/Supervisor.Ops fibersIn
 */
export function fibersIn(
  ref: AtomicReference<SortedSet<FiberRuntime<any, any>>>
): Effect<never, never, Supervisor<SortedSet<FiberRuntime<any, any>>>> {
  return Effect.sync(new FibersIn(ref))
}
