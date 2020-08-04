import { chain } from "./chain"
import { succeed } from "./succeed"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export const map = <A, B>(f: (a: A) => B) => chain((a: A) => succeed(f(a)))
