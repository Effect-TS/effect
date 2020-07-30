import { join } from "../Fiber/api"

import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { fiberId } from "./fiberId"
import { forkDaemon } from "./forkDaemon"
import { onInterrupt_ } from "./onInterrupt_"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Returns an effect whose interruption will be disconnected from the
 * fiber's own interruption, being performed in the background without
 * slowing down the fiber's interruption.
 *
 * This method is useful to create "fast interrupting" effects. For
 * example, if you call this on a bracketed effect, then even if the
 * effect is "stuck" in acquire or release, its interruption will return
 * immediately, while the acquire / release are performed in the
 * background.
 *
 * See timeout and race for other applications.
 */
export const disconnect = <S, R, E, A>(effect: Effect<S, R, E, A>) =>
  uninterruptibleMask(({ restore }) =>
    chain_(fiberId(), (id) =>
      chain_(forkDaemon(restore(effect)), (fiber) =>
        onInterrupt_(restore(join(fiber)), () => forkDaemon(fiber.interruptAs(id)))
      )
    )
  )
