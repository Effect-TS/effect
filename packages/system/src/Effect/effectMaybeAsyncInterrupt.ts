// ets_tracing: off

import type * as E from "../Either/index.js"
import type { FiberID } from "../Fiber/id.js"
import * as O from "../Option/index.js"
import { AtomicReference } from "../Support/AtomicReference/index.js"
import { OneShot } from "../Support/OneShot/index.js"
import type { Canceler } from "./Canceler.js"
import type { Cb } from "./Cb.js"
import * as core from "./core.js"
import type { Effect, UIO } from "./effect.js"
import { flatten } from "./flatten.js"
import { onInterrupt_ } from "./interruption.js"

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
export function effectMaybeAsyncInterrupt<R, E, A>(
  register: (cb: Cb<Effect<R, E, A>>) => E.Either<Canceler<R>, Effect<R, E, A>>,
  __trace?: string
) {
  return effectMaybeAsyncInterruptBlockingOn(register, [], __trace)
}

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
export function effectMaybeAsyncInterruptBlockingOn<R, E, A>(
  register: (cb: Cb<Effect<R, E, A>>) => E.Either<Canceler<R>, Effect<R, E, A>>,
  blockingOn: readonly FiberID[],
  __trace?: string
) {
  return core.chain_(
    core.succeedWith(
      () => [new AtomicReference(false), new OneShot<Canceler<R>>()] as const
    ),
    ([started, cancel]) =>
      onInterrupt_(
        flatten(
          core.effectAsyncOptionBlockingOn<unknown, never, Effect<R, E, A>>(
            (k) => {
              started.set(true)

              const ret = new AtomicReference<O.Option<UIO<Effect<R, E, A>>>>(O.none)

              try {
                const res = register((io) => k(core.succeed(io)))

                switch (res._tag) {
                  case "Right": {
                    ret.set(O.some(core.succeed(res.right)))
                    break
                  }
                  case "Left": {
                    cancel.set(res.left)
                    break
                  }
                }
              } finally {
                if (!cancel.isSet()) {
                  cancel.set(core.unit)
                }
              }

              return ret.get
            },
            blockingOn,
            __trace
          )
        ),
        () => core.suspend(() => (started.get ? cancel.get() : core.unit))
      )
  )
}
