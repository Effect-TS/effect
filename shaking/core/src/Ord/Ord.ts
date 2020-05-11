import { Eq } from "../Eq"

import { Ordering } from "./Ordering"
/**
 * @since 2.0.0
 */
export interface Ord<A> extends Eq<A> {
  readonly compare: (x: A, y: A) => Ordering
}
