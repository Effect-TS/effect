import * as E from "../../Either"
import * as O from "../../Option"
import { FiberID } from "../Fiber/id"
import { AtomicReference } from "../Support/AtomicReference"
import { OneShot } from "../Support/OneShot"

import { Canceler } from "./Canceler"
import { Cb } from "./Cb"
import { chain_ } from "./chain_"
import { AsyncRE, Sync } from "./effect"
import { effectAsyncOption } from "./effectAsyncOption"
import { effectTotal } from "./effectTotal"
import { flatten } from "./flatten"
import { onInterrupt_ } from "./onInterrupt_"
import { succeedNow } from "./succeedNow"
import { suspend } from "./suspend"
import { unit } from "./unit"

/**
 * Imports an asynchronous side-effect into an effect. The side-effect
 * has the option of returning the value synchronously, which is useful in
 * cases where it cannot be determined if the effect is synchronous or
 * asynchronous until the side-effect is actually executed. The effect also
 * has the option of returning a canceler, which will be used by the runtime
 * to cancel the asynchronous effect if the fiber executing the effect is
 * interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called
 * at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export const effectMaybeAsyncInterrupt = <R, E, A>(
  register: (cb: Cb<AsyncRE<R, E, A>>) => E.Either<Canceler<R>, AsyncRE<R, E, A>>,
  blockingOn: readonly FiberID[] = []
) =>
  chain_(
    effectTotal(
      () => [new AtomicReference(false), new OneShot<Canceler<R>>()] as const
    ),
    ([started, cancel]) =>
      onInterrupt_(
        flatten(
          effectAsyncOption<R, E, AsyncRE<R, E, A>>((k) => {
            started.set(true)

            const ret = new AtomicReference<O.Option<Sync<AsyncRE<R, E, A>>>>(O.none)

            try {
              const res = register((io) => k(succeedNow(io)))

              switch (res._tag) {
                case "Right": {
                  ret.set(O.some(succeedNow(res.right)))
                  break
                }
                case "Left": {
                  cancel.set(res.left)
                  break
                }
              }
            } finally {
              if (!cancel.isSet()) {
                cancel.set(unit)
              }
            }

            return ret.get
          }, blockingOn)
        ),
        () => suspend(() => (started.get ? cancel.get() : unit))
      )
  )
