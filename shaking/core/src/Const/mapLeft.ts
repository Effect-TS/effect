import type { Const } from "./Const"
import { mapLeft_ } from "./mapLeft_"

export const mapLeft: <E, G>(f: (e: E) => G) => <A>(fa: Const<E, A>) => Const<G, A> = (
  f
) => (fa) => mapLeft_(fa, f)
