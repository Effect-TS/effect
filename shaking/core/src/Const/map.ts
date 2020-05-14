import type { Const } from "./Const"
import { map_ } from "./map_"

export const map: <A, B>(f: (a: A) => B) => <E>(fa: Const<E, A>) => Const<E, B> = (
  f
) => (fa) => map_(fa, f)
