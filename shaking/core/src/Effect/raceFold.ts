import { FunctionN } from "fp-ts/lib/function"

import { makeDeferred } from "../Deferred"
import { Exit } from "../Exit"
import { makeRef } from "../Ref"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { accessM } from "./accessM"
import { chain_ } from "./chain"
import { combineInterruptExit } from "./combineInterruptExit"
import { completeLatched } from "./completeLatched"
import { fork } from "./fork"
import { Fiber } from "./makeFiber"
import { map_ } from "./map"
import { provide } from "./provide"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Race two fibers together and combine their results.
 *
 * This is the primitive from which all other racing and timeout operators are built and you should favor those unless you have very specific needs.
 * @param first
 * @param second
 * @param onFirstWon
 * @param onSecondWon
 */
export function raceFold<S, S2, S3, S4, R, R2, R3, R4, E1, E2, E3, A, B, C, D>(
  first: Effect<S, R, E1, A>,
  second: Effect<S2, R2, E2, B>,
  onFirstWon: FunctionN<[Exit<E1, A>, Fiber<E2, B>], Effect<S3, R3, E3, C>>,
  onSecondWon: FunctionN<[Exit<E2, B>, Fiber<E1, A>], Effect<S4, R4, E3, D>>
): AsyncRE<R & R2 & R3 & R4, E3, C | D> {
  return accessM((r: R & R2) =>
    uninterruptibleMask<unknown, R3 & R4, E3, C | D>((cutout) =>
      chain_(makeRef<boolean>(false), (latch) =>
        chain_(makeDeferred<unknown, R3 & R4, E3, C | D>(), (channel) =>
          chain_(fork(provide(r)(first)), (fiber1) =>
            chain_(fork(provide(r)(second)), (fiber2) =>
              chain_(
                fork(
                  chain_(
                    fiber1.wait,
                    completeLatched(latch, channel, onFirstWon, fiber2)
                  )
                ),
                () =>
                  chain_(
                    fork(
                      chain_(
                        fiber2.wait,
                        completeLatched(latch, channel, onSecondWon, fiber1)
                      )
                    ),
                    () =>
                      combineInterruptExit(
                        cutout(channel.wait),
                        chain_(fiber1.interrupt, (i1) =>
                          map_(fiber2.interrupt, (i2) => [i1, i2])
                        )
                      )
                  )
              )
            )
          )
        )
      )
    )
  )
}
