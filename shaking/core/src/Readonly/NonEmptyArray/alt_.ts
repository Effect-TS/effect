import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"
import { concat } from "./concat"

export const alt_: <A>(
  fx: ReadonlyNonEmptyArray<A>,
  fy: () => ReadonlyNonEmptyArray<A>
) => ReadonlyNonEmptyArray<A> = (fx, fy) => concat(fx, fy())
