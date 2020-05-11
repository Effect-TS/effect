import type { Either } from "./Either"
import { ap_ } from "./ap"
import { map_ } from "./map"

export const apSecond = <E, B>(fb: Either<E, B>) => <E2, A>(
  fa: Either<E2, A>
): Either<E | E2, B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
