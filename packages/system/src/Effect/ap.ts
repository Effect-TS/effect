import { chain_ } from "./core"
import { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Applicative's ap
 */
export const ap: <S2, R2, E2, A>(
  fa: Effect<S2, R2, E2, A>
) => <S, R, E, B>(
  fab: Effect<S, R, E, (a: A) => B>
) => Effect<S2 | S, R & R2, E2 | E, B> = (fa) => (fab) =>
  chain_(fab, (ab) => map_(fa, ab))
