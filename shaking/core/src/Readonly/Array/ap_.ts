import { flatten } from "./flatten"
import { map_ } from "./map_"

export const ap_: <A, B>(
  fab: readonly ((a: A) => B)[],
  fa: readonly A[]
) => readonly B[] = (fab, fa) => flatten(map_(fab, (f) => map_(fa, f)))
