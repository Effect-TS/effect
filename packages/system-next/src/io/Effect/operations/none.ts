import * as O from "../../../data/Option"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect with the empty value.
 *
 * @ets static ets/EffectOps none
 */
export const none: UIO<O.Option<never>> = Effect.succeed(() => O.none)
