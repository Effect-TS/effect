import { chain } from "./chain"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export const map = <A, B>(f: (a: A) => B) => chain((a: A) => succeedNow(f(a)))
