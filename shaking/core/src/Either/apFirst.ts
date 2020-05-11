import type { Either } from "./Either"
import { ap_ } from "./ap"
import { map_ } from "./map"

export const apFirst: <E, B>(
  fb: Either<E, B>
) => <E2, A>(fa: Either<E2, A>) => Either<E | E2, A> = (fb) => (fa) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )
