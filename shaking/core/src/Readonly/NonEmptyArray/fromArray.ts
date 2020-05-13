import type { Option } from "../../Option"
import { fromArray as fromArray_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"
import { fromReadonlyArray } from "./fromReadonlyArray"

/**
 * @since 2.5.0
 */
// tslint:disable-next-line: readonly-array
export function fromArray<A>(as: Array<A>): Option<ReadonlyNonEmptyArray<A>> {
  return fromReadonlyArray(fromArray_1(as))
}
