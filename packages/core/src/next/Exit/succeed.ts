import { Success } from "./exit"

/**
 * Construct a succeeded exit with the specified value
 */
export const succeed = <A>(a: A) => Success(a)
