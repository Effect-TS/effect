import * as E from "../../Either"
import type { FiberId } from "../../FiberId"
import { none } from "../../FiberId/operations/none"
import type * as O from "../../Option"
import type { Effect } from "../definition"
import { asyncInterruptBlockingOn } from "./asyncInterrupt"
import type { Cb } from "./Cb"
import { unit } from "./unit"

/**
 * Imports an asynchronous effect into a pure `ZIO` value, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function `ZIO[R, E, A] => Any` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * @ets static ets/EffectOps asyncMaybe
 */
export function asyncMaybe<R, E, A>(
  register: (callback: Cb<Effect<R, E, A>>) => O.Option<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, A> {
  return asyncMaybeBlockingOn(register, none, __trace)
}

/**
 * Imports an asynchronous effect into a pure `ZIO` value, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function `ZIO[R, E, A] => Any` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 *
 * @ets static ets/EffectOps asyncMaybeBlockingOn
 */
export function asyncMaybeBlockingOn<R, E, A>(
  register: (callback: Cb<Effect<R, E, A>>) => O.Option<Effect<R, E, A>>,
  blockingOn: FiberId,
  __trace?: string
): Effect<R, E, A> {
  return asyncInterruptBlockingOn(
    (cb) => {
      const result = register(cb)
      switch (result._tag) {
        case "None":
          return E.left(unit)
        case "Some":
          return E.right(result.value)
      }
    },
    blockingOn,
    __trace
  )
}
