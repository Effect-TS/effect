import * as O from "../../Option"

import { Exit } from "./exit"
import { fail } from "./fail"
import { succeed } from "./succeed"

/**
 * Embeds an option result into an Exit with the specified error using onNone
 */
export const fromOption = <E>(onNone: () => E) => <A>(a: O.Option<A>): Exit<E, A> =>
  a._tag === "None" ? fail(onNone()) : succeed(a.value)
