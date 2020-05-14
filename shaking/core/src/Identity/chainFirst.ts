import { chain_ } from "./chain_"
import { map_ } from "./map_"

export const chainFirst: <A, B>(f: (a: A) => B) => (ma: A) => A = (f) => (ma) =>
  chain_(ma, (x) => map_(f(x), () => x))
