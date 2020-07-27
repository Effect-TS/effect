import { Effect } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM_"
import { succeedNow } from "./succeedNow"

export const bimap = <E, A, E2, B>(f: (e: E) => E2, g: (a: A) => B) => <S, R>(
  self: Effect<S, R, E, A>
) =>
  foldM_(
    self,
    (e) => fail(f(e)),
    (a) => succeedNow(g(a))
  )
