import { succeedNow } from "../Effect/succeedNow"

import { mapM } from "./mapM"

/**
 * Maps over the value the fiber computes.
 */
export const map = <A, B>(f: (a: A) => B) => mapM((a: A) => succeedNow(f(a)))
