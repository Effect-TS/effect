import { FoldMap } from "../FoldMap"
import { Auto, URIS } from "../HKT"
import { Reduce } from "../Reduce"
import { ReduceRight } from "../ReduceRight"

export type Foldable<F extends URIS, C = Auto> = ReduceRight<F, C> &
  Reduce<F, C> &
  FoldMap<F, C>
