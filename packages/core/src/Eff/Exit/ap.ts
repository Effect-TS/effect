import { chain_ } from "./chain_"
import { Exit } from "./exit"
import { map_ } from "./map_"

/**
 * Applicative's ap
 */
export const ap: <E, A>(
  fa: Exit<E, A>
) => <B>(fab: Exit<E, (a: A) => B>) => Exit<E, B> = (fa) => (fab) =>
  chain_(fab, (f) => map_(fa, (a) => f(a)))
