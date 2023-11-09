import type { Context } from "../exports/Context.js"
import type { Effect } from "../exports/Effect.js"
import type { Exit } from "../exports/Exit.js"
import type { Fiber } from "../exports/Fiber.js"
import { pipe } from "../exports/Function.js"
import { globalValue } from "../exports/GlobalValue.js"
import { MutableRef } from "../exports/MutableRef.js"
import type { Option } from "../exports/Option.js"
import { hasProperty, isTagged } from "../exports/Predicate.js"
import { SortedSet } from "../exports/SortedSet.js"
import type { Supervisor } from "../exports/Supervisor.js"
import * as core from "./core.js"

/** @internal */
const SupervisorSymbolKey = "effect/Supervisor"

/** @internal */
export const SupervisorTypeId: Supervisor.SupervisorTypeId = Symbol.for(
  SupervisorSymbolKey
) as Supervisor.SupervisorTypeId

/** @internal */
export const supervisorVariance = {
  _T: (_: never) => _
}

/** @internal */
export class ProxySupervisor<T> implements Supervisor<T> {
  readonly [SupervisorTypeId] = supervisorVariance

  constructor(
    readonly underlying: Supervisor<any>,
    readonly value0: () => Effect<never, never, T>
  ) {
  }

  value(): Effect<never, never, T> {
    return this.value0()
  }

  onStart<R, E, A>(
    context: Context<R>,
    effect: Effect<R, E, A>,
    parent: Option<Fiber.RuntimeFiber<any, any>>,
    fiber: Fiber.RuntimeFiber<E, A>
  ): void {
    this.underlying.onStart(context, effect, parent, fiber)
  }

  onEnd<E, A>(value: Exit<E, A>, fiber: Fiber.RuntimeFiber<E, A>): void {
    this.underlying.onEnd(value, fiber)
  }

  onEffect<E, A>(fiber: Fiber.RuntimeFiber<E, A>, effect: Effect<any, any, any>): void {
    this.underlying.onEffect(fiber, effect)
  }

  onSuspend<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void {
    this.underlying.onSuspend(fiber)
  }

  onResume<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void {
    this.underlying.onResume(fiber)
  }

  map<B>(f: (a: T) => B): Supervisor<B> {
    return new ProxySupervisor(this, () => pipe(this.value(), core.map(f)))
  }

  zip<B>(right: Supervisor<B>): Supervisor<[T, B]> {
    return new Zip(this, right)
  }
}

/** @internal */
export class Zip<T0, T1> implements Supervisor<readonly [T0, T1]> {
  readonly _tag = "Zip"
  readonly [SupervisorTypeId] = supervisorVariance

  constructor(
    readonly left: Supervisor<T0>,
    readonly right: Supervisor<T1>
  ) {
  }

  value(): Effect<never, never, [T0, T1]> {
    return core.zip(this.left.value(), this.right.value())
  }

  onStart<R, E, A>(
    context: Context<R>,
    effect: Effect<R, E, A>,
    parent: Option<Fiber.RuntimeFiber<any, any>>,
    fiber: Fiber.RuntimeFiber<E, A>
  ): void {
    this.left.onStart(context, effect, parent, fiber)
    this.right.onStart(context, effect, parent, fiber)
  }

  onEnd<E, A>(value: Exit<E, A>, fiber: Fiber.RuntimeFiber<E, A>): void {
    this.left.onEnd(value, fiber)
    this.right.onEnd(value, fiber)
  }

  onEffect<E, A>(fiber: Fiber.RuntimeFiber<E, A>, effect: Effect<any, any, any>): void {
    this.left.onEffect(fiber, effect)
    this.right.onEffect(fiber, effect)
  }

  onSuspend<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void {
    this.left.onSuspend(fiber)
    this.right.onSuspend(fiber)
  }

  onResume<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void {
    this.left.onResume(fiber)
    this.right.onResume(fiber)
  }

  map<B>(f: (a: [T0, T1]) => B): Supervisor<B> {
    return new ProxySupervisor(this, () => pipe(this.value(), core.map(f)))
  }

  zip<A>(right: Supervisor<A>): Supervisor<[[T0, T1], A]> {
    return new Zip(this, right)
  }
}

/** @internal */
export const isZip = (self: unknown): self is Zip<any, any> =>
  hasProperty(self, SupervisorTypeId) && isTagged(self, "Zip")

/** @internal */
export class Track implements Supervisor<Array<Fiber.RuntimeFiber<any, any>>> {
  readonly [SupervisorTypeId] = supervisorVariance

  readonly fibers: Set<Fiber.RuntimeFiber<any, any>> = new Set()

  value(): Effect<never, never, Array<Fiber.RuntimeFiber<any, any>>> {
    return core.sync(() => Array.from(this.fibers))
  }

  onStart<R, E, A>(
    _context: Context<R>,
    _effect: Effect<R, E, A>,
    _parent: Option<Fiber.RuntimeFiber<any, any>>,
    fiber: Fiber.RuntimeFiber<E, A>
  ): void {
    this.fibers.add(fiber)
  }

  onEnd<E, A>(_value: Exit<E, A>, fiber: Fiber.RuntimeFiber<E, A>): void {
    this.fibers.delete(fiber)
  }

  onEffect<E, A>(_fiber: Fiber.RuntimeFiber<E, A>, _effect: Effect<any, any, any>): void {
    //
  }

  onSuspend<E, A>(_fiber: Fiber.RuntimeFiber<E, A>): void {
    //
  }

  onResume<E, A>(_fiber: Fiber.RuntimeFiber<E, A>): void {
    //
  }

  map<B>(f: (a: Array<Fiber.RuntimeFiber<any, any>>) => B): Supervisor<B> {
    return new ProxySupervisor(this, () => pipe(this.value(), core.map(f)))
  }

  zip<A>(
    right: Supervisor<A>
  ): Supervisor<[Array<Fiber.RuntimeFiber<any, any>>, A]> {
    return new Zip(this, right)
  }

  onRun<E, A, X>(execution: () => X, _fiber: Fiber.RuntimeFiber<E, A>): X {
    return execution()
  }
}

/** @internal */
export class Const<T> implements Supervisor<T> {
  readonly [SupervisorTypeId] = supervisorVariance

  constructor(readonly effect: Effect<never, never, T>) {
  }

  value(): Effect<never, never, T> {
    return this.effect
  }

  onStart<R, E, A>(
    _context: Context<R>,
    _effect: Effect<R, E, A>,
    _parent: Option<Fiber.RuntimeFiber<any, any>>,
    _fiber: Fiber.RuntimeFiber<E, A>
  ): void {
    //
  }

  onEnd<E, A>(_value: Exit<E, A>, _fiber: Fiber.RuntimeFiber<E, A>): void {
    //
  }

  onEffect<E, A>(_fiber: Fiber.RuntimeFiber<E, A>, _effect: Effect<any, any, any>): void {
    //
  }

  onSuspend<E, A>(_fiber: Fiber.RuntimeFiber<E, A>): void {
    //
  }

  onResume<E, A>(_fiber: Fiber.RuntimeFiber<E, A>): void {
    //
  }

  map<B>(f: (a: T) => B): Supervisor<B> {
    return new ProxySupervisor(this, () => pipe(this.value(), core.map(f)))
  }

  zip<A>(right: Supervisor<A>): Supervisor<[T, A]> {
    return new Zip(this, right)
  }

  onRun<E, A, X>(execution: () => X, _fiber: Fiber.RuntimeFiber<E, A>): X {
    return execution()
  }
}

class FibersIn implements Supervisor<SortedSet<Fiber.RuntimeFiber<any, any>>> {
  readonly [SupervisorTypeId] = supervisorVariance

  constructor(readonly ref: MutableRef<SortedSet<Fiber.RuntimeFiber<any, any>>>) {
  }

  value(): Effect<never, never, SortedSet<Fiber.RuntimeFiber<any, any>>> {
    return core.sync(() => MutableRef.get(this.ref))
  }

  onStart<R, E, A>(
    _context: Context<R>,
    _effect: Effect<R, E, A>,
    _parent: Option<Fiber.RuntimeFiber<any, any>>,
    fiber: Fiber.RuntimeFiber<E, A>
  ): void {
    pipe(this.ref, MutableRef.set(pipe(MutableRef.get(this.ref), SortedSet.add(fiber))))
  }

  onEnd<E, A>(_value: Exit<E, A>, fiber: Fiber.RuntimeFiber<E, A>): void {
    pipe(this.ref, MutableRef.set(pipe(MutableRef.get(this.ref), SortedSet.remove(fiber))))
  }

  onEffect<E, A>(_fiber: Fiber.RuntimeFiber<E, A>, _effect: Effect<any, any, any>): void {
    //
  }

  onSuspend<E, A>(_fiber: Fiber.RuntimeFiber<E, A>): void {
    //
  }

  onResume<E, A>(_fiber: Fiber.RuntimeFiber<E, A>): void {
    //
  }

  map<B>(f: (a: SortedSet<Fiber.RuntimeFiber<any, any>>) => B): Supervisor<B> {
    return new ProxySupervisor(this, () => pipe(this.value(), core.map(f)))
  }

  zip<A>(
    right: Supervisor<A>
  ): Supervisor<[SortedSet<Fiber.RuntimeFiber<any, any>>, A]> {
    return new Zip(this, right)
  }

  onRun<E, A, X>(execution: () => X, _fiber: Fiber.RuntimeFiber<E, A>): X {
    return execution()
  }
}

/** @internal */
export const unsafeTrack = (): Supervisor<Array<Fiber.RuntimeFiber<any, any>>> => {
  return new Track()
}

/** @internal */
export const track: Effect<
  never,
  never,
  Supervisor<Array<Fiber.RuntimeFiber<any, any>>>
> = core.sync(unsafeTrack)

/** @internal */
export const fromEffect = <A>(effect: Effect<never, never, A>): Supervisor<A> => {
  return new Const(effect)
}

/** @internal */
export const none = globalValue("effect/Supervisor/none", () => fromEffect(core.unit))

/** @internal */
export const fibersIn = (
  ref: MutableRef<SortedSet<Fiber.RuntimeFiber<any, any>>>
): Effect<
  never,
  never,
  Supervisor<SortedSet<Fiber.RuntimeFiber<any, any>>>
> => core.sync(() => new FibersIn(ref))
