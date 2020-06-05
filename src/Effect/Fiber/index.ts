import * as E from "../../Either"
import { Exit } from "../../Exit"
import { FunctionN, Lazy } from "../../Function"
import * as O from "../../Option"
import {
  AsyncFn,
  IAsync,
  IChain,
  ICompleted,
  IMap,
  IPure,
  ISuspended
} from "../../Support/Common"
import { Async, AsyncE, Effect, Sync, SyncE } from "../../Support/Common/effect"
import { Driver } from "../../Support/Driver"
import { setExit } from "../../Support/Driver/driver"
import { snd } from "../../Support/Utils"

/**
 * Wrap a block of impure code that returns an IO into an IO
 *
 * When evaluated this IO will run the given thunk to produce the next IO to execute.
 * @param thunk
 */

export function suspended<S, R, E, A>(
  thunk: Lazy<Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return new ISuspended(thunk) as any
}

/**
 * Zip the result of two IOs together using the provided function
 * @param first
 * @param second
 * @param f
 */
export function zipWith_<S, R, E, A, S2, R2, E2, B, C>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): Effect<S | S2, R & R2, E | E2, C> {
  return chain_(first, (a) => map_(second, (b) => f(a, b)))
}

/**
 * An IO has succeeded
 * @param a the value
 */

export function pure<A>(a: A): Sync<A> {
  return new IPure(a) as any
}

/**
 * Map the value produced by an IO
 * @param io
 * @param f
 */
export function map_<S, R, E, A, B>(
  base: Effect<S, R, E, A>,
  f: FunctionN<[A], B>
): Effect<S, R, E, B> {
  return new IMap(base, f) as any
}

export const pureNone =
  /*#__PURE__*/
  (() => pure(O.none))()

/**
 * An IO that is completed with the given exit
 * @param exit
 */
export function completed<E = never, A = never>(exit: Exit<E, A>): SyncE<E, A> {
  return new ICompleted(exit) as any
}

/**
 * Produce an new IO that will use the value produced by inner to produce the next IO to evaluate
 * @param inner
 * @param bind
 */
export function chain_<S, R, E, A, S2, R2, E2, B>(
  inner: Effect<S, R, E, A>,
  bind: FunctionN<[A], Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return new IChain(inner, bind) as any
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the second
 * @param first
 * @param second
 */
export function applySecond<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, B> {
  return zipWith_(first, second, snd)
}

/**
 * Wrap an impure callback in an IO
 *
 * The provided function must accept a callback to report results to and return a cancellation action.
 * If your action is uncancellable for some reason, you should return an empty thunk and wrap the created IO
 * in uninterruptible
 * @param op
 */
export function async<E, A>(op: AsyncFn<E, A>): AsyncE<E, A> {
  return new IAsync(op) as any
}

/**
 * Wrap a block of impure code in an IO
 *
 * When evaluated the this will produce a value or throw
 * @param thunk
 */

export function sync<A>(thunk: Lazy<A>): Sync<A> {
  return suspended(() => pure(thunk()))
}

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
  readonly interrupt: Async<Exit<E, A>>
  /**
   * Await the result of this fiber
   */
  readonly wait: Async<Exit<E, A>>
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
export class FiberImpl<E, A> implements Fiber<E, A> {
  name = O.fromNullable(this.n)
  sendInterrupt = sync(() => {
    this.driver.interrupt()
  })
  wait = async<never, Exit<E, A>>((f) => {
    const listen = this.driver.onExit((ex) => {
      f(E.right(ex))
    })

    return (cb) => {
      listen()
      cb()
    }
  })
  interrupt = applySecond(this.sendInterrupt, this.wait)
  join = chain_(
    async<never, Exit<E, A>>((f) => {
      this.driver.onExit((ex) => {
        f(E.right(ex))
      })

      return (cb) => {
        this.driver.onExit((ex) => {
          cb(setExit(ex))
        })
        this.driver.interrupt()
      }
    }),
    completed
  )
  result = chain_(
    sync(() => this.driver.completed),
    (opt) => (opt === undefined ? pureNone : map_(completed(opt), O.some))
  )
  isComplete = sync(() => this.driver.completed !== undefined)
  constructor(readonly driver: Driver<E, A>, readonly n?: string) {}
}
