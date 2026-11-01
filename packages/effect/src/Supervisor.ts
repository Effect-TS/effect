/**
 * Observes the lifecycles of fibers: when each one starts, blocks, unblocks
 * and ends, and what a blocked fiber waits on.
 *
 * A Supervisor only observes. Use it to know which fibers a part of a program
 * started and what each one is doing, for example in a test runner that
 * reports the fibers a test left running, or a diagnostic dump of a program
 * that hangs.
 *
 * **Installing a Supervisor**
 *
 * A fiber reports to the Supervisor in its context when it is created, for
 * its whole life. So where a Supervisor is installed decides which fibers it
 * sees:
 *
 * - `Effect.withSupervisor(effect, supervisor)` runs the effect in a new child
 *   fiber and sees that fiber and everything it forks. Use it around `main`.
 * - `Supervisor.layer(supervisor)` sees the root fibers of a built
 *   `ManagedRuntime` and what they fork. Under `Layer.launch`, a platform
 *   `runMain`, or a `ManagedRuntime` that is not built yet, the root fiber
 *   exists before the layer, so only forks are seen.
 * - `Effect.provideService(Supervisor.Supervisor, supervisor)` and
 *   `Effect.provide(layer)` inside a fiber see only the fibers forked inside
 *   the region, never the fiber already running it.
 *
 * `withSupervisor` and `layer` add to the Supervisor in place, which is
 * called first; adding one already in place changes nothing. Providing the
 * reference directly replaces it, and providing `undefined` opts a region's
 * forks out.
 *
 * **What a blocked fiber waits on**
 *
 * `onBlock` receives the object the fiber waits on. A defined value means
 * only the program itself can complete the wait; `undefined` means something
 * outside the program may (I/O, a timer, a promise). The objects are:
 *
 * - `Deferred.await`: the Deferred.
 * - Queue take, offer and await: the Queue.
 * - `PubSub` publish (back-pressure): the PubSub. `PubSub` take: the
 *   Subscription.
 * - `Latch` await: the Latch.
 * - `Semaphore`, `PartitionedSemaphore`: the semaphore.
 * - `Pool` get: the Pool.
 * - `Fiber.await`, `Fiber.join`: the fiber.
 * - `Fiber.awaitAll`, `Fiber.joinAll`: an array of the fibers.
 * - `Effect.race` and its variants, a concurrent `Effect.forEach` (and what is
 *   built on it), `RequestResolver.fromEffect`: the `Set` of fibers it forked.
 * - A transaction's retry: an array of the `TxRef`s it read. `TxQueue`,
 *   `TxDeferred` and the other Tx structures show up as their `TxRef`s.
 * - `Effect.never`: `Effect.never` itself.
 * - A `TestClock` sleep: the Latch of that sleep (see `TestClock.stateUnsafe`).
 * - `Effect.callback`, `Effect.promise`, `Effect.tryPromise`, a sleep on the
 *   live clock, and anything else: `undefined`.
 *
 * A collection means "these fibers" (or "these refs"), not whether the wait
 * completes on one of them or on all of them. It is full when `onBlock` is
 * called. Narrow with the guards `Deferred.isDeferred`, `Queue.isQueue`,
 * `PubSub.isPubSub`, `PubSub.isSubscription`, `Latch.isLatch`,
 * `Semaphore.isSemaphore`, `PartitionedSemaphore.isPartitionedSemaphore`,
 * `Pool.isPool`, `Fiber.isFiber`, `TxRef.isTxRef`, with `Array.isArray` and
 * `instanceof Set`, and by identity for `Effect.never`. More waits may be
 * labelled in later versions.
 *
 * **Example** (Keeping a weak set of live fibers)
 *
 * ```ts import.meta.vitest
 * import { Effect, Fiber, Supervisor } from "effect"
 *
 * // WeakRefs let fibers that block forever be collected; the WeakMap keeps
 * // per-fiber state without pinning the fiber or what it waits on
 * const live = new Set<WeakRef<Fiber.Fiber<unknown, unknown>>>()
 * const refs = new WeakMap<Fiber.Fiber<unknown, unknown>, WeakRef<Fiber.Fiber<unknown, unknown>>>()
 * const waitingOn = new WeakMap<Fiber.Fiber<unknown, unknown>, object | undefined>()
 * const registry = new FinalizationRegistry<WeakRef<Fiber.Fiber<unknown, unknown>>>((ref) => live.delete(ref))
 *
 * const tracker: Supervisor.Supervisor = {
 *   onStart: (fiber) => {
 *     const ref = new WeakRef(fiber)
 *     live.add(ref)
 *     refs.set(fiber, ref)
 *     registry.register(fiber, ref)
 *   },
 *   onEnd: (fiber) => {
 *     const ref = refs.get(fiber)
 *     if (ref !== undefined) live.delete(ref)
 *   },
 *   onBlock: (fiber, blockedOn) => waitingOn.set(fiber, blockedOn),
 *   onUnblock: (fiber) => waitingOn.delete(fiber)
 * }
 *
 * const program = Effect.gen(function*() {
 *   yield* Effect.forkChild(Effect.never)
 *   yield* Effect.yieldNow
 *   return Array.from(live, (ref) => ref.deref()).filter((fiber) => fiber !== undefined).length
 * })
 *
 * await Effect.runPromise(Effect.withSupervisor(program, tracker)) // => 2
 * ```
 *
 * @stability experimental
 * @since 4.1.2
 */
import * as Context from "./Context.ts"
import type * as Exit from "./Exit.ts"
import type * as Fiber from "./Fiber.ts"
import { constUndefined, dual } from "./Function.ts"
import { withFiber } from "./internal/core.ts"
import * as effect from "./internal/effect.ts"
import * as Layer from "./Layer.ts"

/**
 * Receives the lifecycle events of the fibers created in a context that
 * provides it through the {@link Supervisor} reference.
 *
 * **When to use**
 *
 * Use to observe which fibers a part of a program starts and what each one
 * waits on. Implement it with an object literal or a class.
 *
 * **Details**
 *
 * - `onStart` is called when a fiber is created, before it runs. `parent` is
 *   the fiber that forked it, attached or detached, and `undefined` for a root
 *   fiber (`Effect.runFork` and friends), even one started inside another
 *   fiber.
 * - `onBlock` is called when a fiber suspends on a wait that did not complete
 *   at once. Yielding to the scheduler is not blocking. `blockedOn` is what it
 *   waits on (see the module documentation).
 * - `onUnblock` is called when the fiber leaves that wait, because it
 *   completed or because the fiber was interrupted, before the fiber runs
 *   again.
 * - `onEnd` is called once, when the fiber's exit is set.
 *
 * For each fiber, `onStart` comes first, then pairs of `onBlock` and
 * `onUnblock` with no other event of that fiber between them, then at most
 * one `onEnd`, never while blocked. A child's `onStart` comes before its
 * forker continues, and a fiber's `onEnd` comes before any fiber waiting on
 * it is unblocked. Nothing else about the order across fibers is promised.
 * A fiber that is never unblocked gets no further event, so a long-lived
 * Supervisor should hold fibers weakly.
 *
 * **Gotchas**
 *
 * The methods are called synchronously inside the runtime. They may read the
 * fiber (`id`, `getRef`, `pollUnsafe`) and update the Supervisor's own state,
 * and must be cheap. They must not throw, and must not act on the runtime:
 * no interrupting, resuming (`Deferred.doneUnsafe`, `Queue.offerUnsafe`, ...),
 * forking, running effects, `setContext` or `addObserver`. To act, defer the
 * work with `queueMicrotask` or a scheduler task. A method that throws or acts
 * leaves the runtime in an unspecified state: fibers may hang, a fiber may be
 * killed, and the order above no longer holds.
 *
 * **Example** (Counting the fibers a program starts)
 *
 * ```ts import.meta.vitest
 * import { Effect, Fiber, Supervisor } from "effect"
 *
 * let started = 0
 * const counter: Supervisor.Supervisor = {
 *   onStart: () => started++,
 *   onEnd: () => {},
 *   onBlock: () => {},
 *   onUnblock: () => {}
 * }
 *
 * const program = Effect.gen(function*() {
 *   const fibers = yield* Effect.forEach([1, 2, 3], (n) => Effect.forkChild(Effect.succeed(n * 2)))
 *   return yield* Fiber.joinAll(fibers)
 * })
 *
 * await Effect.runPromise(Effect.withSupervisor(program, counter)) // => [2, 4, 6]
 * // the region's own fiber and the three forks
 * started // => 4
 * ```
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Supervisor {
  readonly onStart: (fiber: Fiber.Fiber<unknown, unknown>, parent: Fiber.Fiber<unknown, unknown> | undefined) => void
  readonly onEnd: (fiber: Fiber.Fiber<unknown, unknown>, exit: Exit.Exit<unknown, unknown>) => void
  readonly onBlock: (fiber: Fiber.Fiber<unknown, unknown>, blockedOn: object | undefined) => void
  readonly onUnblock: (fiber: Fiber.Fiber<unknown, unknown>) => void
}

/**
 * The {@link Supervisor} the fibers created in this context report to; none
 * by default.
 *
 * **Details**
 *
 * A fiber reads it once, when it is created. Providing a value directly
 * replaces the Supervisor in place, and providing `undefined` opts the
 * region's forks out; use {@link layer} or `Effect.withSupervisor` to add one
 * instead. Inside a region with several Supervisors, it holds their
 * combination, so keep your own reference to your Supervisor if you need it.
 *
 * @stability experimental
 * @category references
 * @since 4.1.2
 */
export const Supervisor: Context.Reference<Supervisor | undefined> = Context.Reference<Supervisor | undefined>(
  effect.SupervisorKey,
  { fiberCached: true, defaultValue: constUndefined }
)

class Combined implements Supervisor {
  readonly outer: Supervisor
  readonly inner: Supervisor
  constructor(outer: Supervisor, inner: Supervisor) {
    this.outer = outer
    this.inner = inner
  }
  onStart(fiber: Fiber.Fiber<unknown, unknown>, parent: Fiber.Fiber<unknown, unknown> | undefined) {
    this.outer.onStart(fiber, parent)
    this.inner.onStart(fiber, parent)
  }
  onEnd(fiber: Fiber.Fiber<unknown, unknown>, exit: Exit.Exit<unknown, unknown>) {
    this.outer.onEnd(fiber, exit)
    this.inner.onEnd(fiber, exit)
  }
  onBlock(fiber: Fiber.Fiber<unknown, unknown>, blockedOn: object | undefined) {
    this.outer.onBlock(fiber, blockedOn)
    this.inner.onBlock(fiber, blockedOn)
  }
  onUnblock(fiber: Fiber.Fiber<unknown, unknown>) {
    this.outer.onUnblock(fiber)
    this.inner.onUnblock(fiber)
  }
}

const contains = (chain: Supervisor, supervisor: Supervisor): boolean =>
  chain === supervisor ||
  (chain instanceof Combined && (contains(chain.outer, supervisor) || contains(chain.inner, supervisor)))

/**
 * Combines two Supervisors into one that calls `outer`, then `inner`, on
 * every hook.
 *
 * **When to use**
 *
 * Use to install several Supervisors at once, for example at a root with
 * `Effect.runForkWith`.
 *
 * **Details**
 *
 * Supervisors are compared by identity: `combine(a, a)` is `a`, and when
 * `inner` is already part of `outer`, the result is `outer`, so no fiber
 * reports to the same Supervisor twice.
 *
 * @stability experimental
 * @category combinators
 * @since 4.1.2
 */
export const combine: {
  (inner: Supervisor): (outer: Supervisor) => Supervisor
  (outer: Supervisor, inner: Supervisor): Supervisor
} = dual(
  2,
  (outer: Supervisor, inner: Supervisor): Supervisor => contains(outer, inner) ? outer : new Combined(outer, inner)
)

/**
 * A layer that adds `supervisor` to the Supervisor in place.
 *
 * **Details**
 *
 * The Supervisor in place, if any, is still called first. Under a built
 * `ManagedRuntime` the root fibers are observed; under `Layer.launch`, a
 * platform `runMain`, or `Effect.provide` inside a fiber, only the fibers
 * forked after the layer is built are. Use `Effect.withSupervisor` around
 * `main` to observe the main fiber. To replace the Supervisor in place
 * instead, use `Layer.succeed(Supervisor.Supervisor)(supervisor)`. Unlike
 * `Logger.layer`, adding is the default.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.2
 */
export const layer = (supervisor: Supervisor): Layer.Layer<never> =>
  Layer.effect(
    Supervisor,
    withFiber((fiber) => {
      const current = fiber.getRef(Supervisor)
      return effect.succeed(current === undefined ? supervisor : combine(current, supervisor))
    })
  )
