import { Exit } from "../Exit"
import { FunctionN } from "../Function"
import { Option, some, fromNullable } from "../Option"
import { Effect, Sync, SyncE, AsyncE, Async, SyncR } from "../Support/Common/effect"
import { Driver, DriverImpl } from "../Support/Driver"

import { access } from "./access"
import { applySecond } from "./applySecond"
import { asyncTotal } from "./asyncTotal"
import { chain_ } from "./chain"
import { completed } from "./completed"
import { map_ } from "./map"
import { provide } from "./provide"
import { pureNone } from "./pureNone"
import { sync } from "./sync"

/**
 * Implementation of Stack/waver fork. Creates an IO that will fork a fiber in the background
 * @param init
 * @param name
 */
export function makeFiber<S, R, E, A>(
  init: Effect<S, R, E, A>,
  name?: string
): SyncR<R, Fiber<E, A>> {
  return access((r: R) => {
    const driver = new DriverImpl<E, A>()
    const fiber = new FiberImpl(driver, name)
    driver.start(provide(r)(init))
    return fiber
  })
}
export interface Fiber<E, A> {
  /**
   * The name of the fiber
   */
  readonly name: Option<string>
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
  readonly result: SyncE<E, Option<A>>
  /**
   * Determine if the fiber is complete
   */
  readonly isComplete: Sync<boolean>
}
export class FiberImpl<E, A> implements Fiber<E, A> {
  name = fromNullable(this.n)
  sendInterrupt = sync(() => {
    this.driver.interrupt()
  })
  wait = asyncTotal((f: FunctionN<[Exit<E, A>], void>) => this.driver.onExit(f))
  interrupt = applySecond(this.sendInterrupt, this.wait)
  join = chain_(this.wait, completed)
  result = chain_(
    sync(() => this.driver.completed),
    (opt) => (opt === null ? pureNone : map_(completed(opt), some))
  )
  isComplete = sync(() => this.driver.completed !== null)
  constructor(readonly driver: Driver<E, A>, readonly n?: string) {}
}
