import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified function and returns
 * the old value.
 */
export const getAndUpdate = <A>(f: (a: A) => A) => modify<A, A>((v) => [v, f(v)])
