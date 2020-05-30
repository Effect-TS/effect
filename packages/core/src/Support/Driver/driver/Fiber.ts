import * as Ex from "../../../Exit"
import { Lazy, FunctionN } from "../../../Function"
import * as O from "../../../Option"
import * as Common from "../../Common"
import { Async, AsyncE, SyncE, Sync, Effect } from "../../Common/effect"

import { Driver } from "./Driver"

export interface Fiber<E, A> {
  /**
   * The name of the fiber
   */
  readonly name: O.Option<string>
  /**
   * Send an interrupt signal to this fiber.
   *
   * The this will complete execution once the target fiber has halted.
   * Does nothing if the target fiber is already complete
   */
  readonly interrupt: Async<Ex.Exit<E, A>>
  /**
   * Await the result of this fiber
   */
  readonly wait: Async<Ex.Exit<E, A>>
  /**
   * Join with this fiber.
   * This is equivalent to fiber.wait.chain(io.completeWith)
   */
  readonly join: AsyncE<E, A>
  /**
   * Poll for a fiber result
   */
  readonly result: SyncE<E, O.Option<A>>
  /**
   * Determine if the fiber is complete
   */
  readonly isComplete: Sync<boolean>
}

export function async<E, A>(op: Common.AsyncFn<E, A>): AsyncE<E, A> {
  return new Common.IAsync(op) as any
}

export function asyncTotal<A>(
  op: FunctionN<[FunctionN<[A], void>], Common.AsyncCancelContFn>
): Async<A> {
  return async((callback) => op((a) => callback({ _tag: "Right", right: a })))
}

export function pure<A>(a: A): Sync<A> {
  return new Common.IPure(a) as any
}

export function suspended<S, R, E, A>(
  thunk: Lazy<Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return new Common.ISuspended(thunk) as any
}

export function sync<A>(thunk: Lazy<A>): Sync<A> {
  return suspended(() => pure(thunk()))
}

export function chain_<S, R, E, A, S2, R2, E2, B>(
  inner: Effect<S, R, E, A>,
  bind: FunctionN<[A], Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return (((inner as any) as Common.Instructions).tag() === Common.IPureTag
    ? bind(((inner as any) as Common.IPure<A>).a)
    : new Common.IChain(inner, bind)) as any
}

export function map_<S, R, E, A, B>(
  base: Effect<S, R, E, A>,
  f: FunctionN<[A], B>
): Effect<S, R, E, B> {
  return (((base as any) as Common.Instructions).tag() === Common.IPureTag
    ? new Common.IPure(f(((base as any) as Common.IPure<A>).a))
    : new Common.IMap(base, f)) as any
}

export const pureNone =
  /*#__PURE__*/
  (() => pure(O.none))()

export function completed<E = never, A = never>(exit: Ex.Exit<E, A>): SyncE<E, A> {
  return new Common.ICompleted(exit) as any
}

export function snd<A, B>(_: A, b: B): B {
  return b
}

export function zipWith_<S, R, E, A, S2, R2, E2, B, C>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): Effect<S | S2, R & R2, E | E2, C> {
  return chain_(first, (a) => map_(second, (b) => f(a, b)))
}

export function applySecond<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, B> {
  return zipWith_(first, second, snd)
}

export class FiberImpl<E, A> implements Fiber<E, A> {
  name = O.fromNullable(this.n)
  sendInterrupt = sync(() => {
    this.driver.interrupt()
  })
  wait = asyncTotal((f: FunctionN<[Ex.Exit<E, A>], void>) => this.driver.onExit(f))
  interrupt = applySecond(this.sendInterrupt, this.wait)
  join = chain_(this.wait, completed)
  result = chain_(
    sync(() => this.driver.completed),
    (opt) => (opt === null ? pureNone : map_(completed(opt), O.some))
  )
  isComplete = sync(() => this.driver.completed !== null)
  constructor(readonly driver: Driver<E, A>, readonly n?: string) {}
}
