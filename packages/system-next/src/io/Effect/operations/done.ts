import type { Exit } from "../../Exit"
import type { IO } from "../definition"
import { failCause } from "./failCause"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Returns an effect from a `Exit` value.
 *
 * @ets static ets/EffectOps done
 */
export function done<E, A>(exit: Exit<E, A>, __etsTrace?: string): IO<E, A> {
  return suspendSucceed(
    () => (exit._tag === "Success" ? succeedNow(exit.value) : failCause(exit.cause)),
    __etsTrace
  )
}
