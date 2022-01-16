// ets_tracing: off

import * as M from "../../Collections/Immutable/Map"
import type * as FiberRef from "../../FiberRef"
import { set_ as fiberRefSet_ } from "../../FiberRef/operations/set"
import * as O from "../../Option"
import type { UIO } from "../definition"
import { IFiberRefGetAll } from "../definition"
import { forEachDiscard_ } from "./excl-forEach"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 */
export class FiberRefs {
  #fiberRefLocals: M.Map<FiberRef.Runtime<any>, any>

  constructor(fiberRefLocals: M.Map<FiberRef.Runtime<any>, any>) {
    this.#fiberRefLocals = fiberRefLocals
  }

  /**
   * Returns a set of each `FiberRef` in this collection.
   */
  get fiberRefs(): ReadonlySet<FiberRef.Runtime<any>> {
    return new Set(this.#fiberRefLocals.keys())
  }

  /**
   * Sets the value of each `FiberRef` for the fiber running this effect to the
   * value in this collection of `FiberRef` values.
   */
  get setAll(): UIO<void> {
    return forEachDiscard_(this.fiberRefs, (fiberRef) =>
      fiberRefSet_(fiberRef, this.getOrDefault(fiberRef))
    )
  }

  /**
   * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
   * values if it exists or `None` otherwise.
   */
  get<A>(fiberRef: FiberRef.Runtime<A>): O.Option<A> {
    return M.lookup_(this.#fiberRefLocals, fiberRef)
  }

  /**
   * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
   * values if it exists or the `initial` value of the `FiberRef` otherwise.
   */
  getOrDefault<A>(fiberRef: FiberRef.Runtime<A>): A {
    return O.getOrElse_(this.get(fiberRef), () => fiberRef.initial)
  }
}

/**
 * Returns a collection of all `FiberRef` values for the fiber running this
 * effect.
 */
export const getFiberRefs: UIO<FiberRefs> = new IFiberRefGetAll((fiberRefLocals) =>
  succeedNow(new FiberRefs(fiberRefLocals))
)

/**
 * Sets the `FiberRef` values for the fiber running this effect to the values
 * in the specified collection of `FiberRef` values.
 */
export function setFiberRefs(fiberRefs: FiberRefs, __trace?: string): UIO<void> {
  return suspendSucceed(() => fiberRefs.setAll)
}
