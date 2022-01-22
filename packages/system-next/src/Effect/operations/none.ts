import * as O from "../../Option"
import type { UIO } from "../definition"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect with the empty value.
 *
 * @ets static ets/EffectOps none
 */
export const none: UIO<O.Option<never>> = succeedNow(O.none)
