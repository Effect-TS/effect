import * as O from "../../Option"
import * as S from "../../Set"
import * as Cause from "../Cause/core"
import { succeed, unit } from "../Effect/core"
import { Async, Sync } from "../Effect/effect"
import * as Exit from "../Exit/core"
import { FiberRef } from "../FiberRef/fiberRef"
import { Scope } from "../Scope"

import { FiberID } from "./id"
import { Status } from "./status"

export { equalsFiberID, FiberID, newFiberId, None } from "./id"

/**
 * A record containing information about a `Fiber`.
 *
 * @param id            The fiber's unique identifier
 * @param interruptors  The set of fibers attempting to interrupt the fiber or its ancestors.
 * @param children      The fiber's forked children.
 */
export class Descriptor {
  constructor(
    readonly id: FiberID,
    readonly status: Status,
    readonly interruptors: S.Set<FiberID>,
    readonly interruptStatus: InterruptStatus,
    readonly scope: Scope<Exit.Exit<any, any>>
  ) {}
}

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking ZIO effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 */
export type Fiber<E, A> = Runtime<E, A> | Syntetic<E, A>

export interface CommonFiber<E, A> {
  wait: Async<Exit.Exit<E, A>>
  //children: Sync<Iterable<Runtime<any, any>>>
  getRef: <K>(fiberRef: FiberRef<K>) => Sync<K>
  inheritRefs: Async<void>
  interruptAs(fiberId: FiberID): Async<Exit.Exit<E, A>>
  poll: Async<O.Option<Exit.Exit<E, A>>>
}

export interface Runtime<E, A> extends CommonFiber<E, A> {
  _tag: "RuntimeFiber"
}

export interface Syntetic<E, A> extends CommonFiber<E, A> {
  _tag: "SynteticFiber"
}

/**
 * Folds over the runtime or synthetic fiber.
 */
export const fold = <E, A, Z>(
  runtime: (_: Runtime<E, A>) => Z,
  syntetic: (_: Syntetic<E, A>) => Z
) => (fiber: Fiber<E, A>) => {
  switch (fiber._tag) {
    case "RuntimeFiber": {
      return runtime(fiber)
    }
    case "SynteticFiber": {
      return syntetic(fiber)
    }
  }
}

/**
 * A fiber that is done with the specified `Exit` value.
 */
export const done = <E, A>(exit: Exit.Exit<E, A>): Syntetic<E, A> => ({
  _tag: "SynteticFiber",
  wait: succeed(exit),
  getRef: (ref) => succeed(ref.initial),
  inheritRefs: unit,
  interruptAs: () => succeed(exit),
  poll: succeed(O.some(exit))
})

/**
 * A fiber that has already failed with the specified value.
 */
export const fail = <E>(e: E) => done(Exit.fail(e))

/**
 * Creates a `Fiber` that is halted with the specified cause.
 */
export const halt = <E>(cause: Cause.Cause<E>) => done(Exit.halt(cause))

/**
 * A fiber that is already interrupted.
 */
export const interruptAs = (id: FiberID) => done(Exit.interrupt(id))

/**
 * InterruptStatus tracks interruptability of the current stack region
 */
export class InterruptStatus {
  constructor(readonly isInterruptible: boolean) {}

  get isUninteruptible(): boolean {
    return !this.isInterruptible
  }

  get toBoolean(): boolean {
    return this.isInterruptible
  }
}

/**
 * Interruptible region
 */
export const interruptible = new InterruptStatus(true)

/**
 * Uninterruptible region
 */
export const uninterruptible = new InterruptStatus(false)

/**
 * Create InterruptStatus from a boolean value
 */
export const interruptStatus = (b: boolean) => (b ? interruptible : uninterruptible)
