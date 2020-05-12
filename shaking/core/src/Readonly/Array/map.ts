import { map_ } from "./map_"

export const map: <A, B>(f: (a: A) => B) => (fa: readonly A[]) => readonly B[] = (
  f
) => (fa) => map_(fa, f)
