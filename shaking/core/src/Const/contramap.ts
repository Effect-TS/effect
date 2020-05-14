import type { Const } from "./Const"
import { contramap_ } from "./contramap_"

export const contramap: <A, B>(
  f: (b: B) => A
) => <E>(fa: Const<E, A>) => Const<E, B> = (f) => (fa) => contramap_(fa, f)
