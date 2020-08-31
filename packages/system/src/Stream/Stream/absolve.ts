import type { Either } from "../../Either"
import { fold } from "../../Either"
import { chain } from "./chain"
import type { Stream } from "./definitions"
import { fail } from "./fail"
import { succeed } from "./succeed"

/**
 * Submerges the error case of an `Either` into the `ZStream`.
 */
export const absolve: <S, R, E, E2, O>(
  xs: Stream<S, R, E, Either<E2, O>>
) => Stream<S, R, E | E2, O> = chain(fold(fail, succeed))
