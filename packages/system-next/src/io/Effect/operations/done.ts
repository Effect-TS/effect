import type { Exit } from "../../Exit"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect from a `Exit` value.
 *
 * @ets static ets/EffectOps done
 */
export function done<E, A>(exit: Exit<E, A>, __etsTrace?: string): IO<E, A> {
  return Effect.suspendSucceed(() =>
    exit._tag === "Success"
      ? Effect.succeedNow(exit.value)
      : Effect.failCauseNow(exit.cause)
  )
}
