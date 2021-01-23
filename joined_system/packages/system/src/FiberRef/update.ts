import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified function.
 */
export const update = <A>(f: (a: A) => A) => modify<A, void>((v) => [undefined, f(v)])
