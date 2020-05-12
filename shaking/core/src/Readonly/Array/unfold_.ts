import type { Option } from "../../Option/Option"
import { isSome } from "../../Option/isSome"

export const unfold_ = <A, B>(
  b: B,
  f: (b: B) => Option<readonly [A, B]>
): ReadonlyArray<A> => {
  // tslint:disable-next-line: readonly-array
  const ret: Array<A> = []
  let bb: B = b
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const mt = f(bb)
    if (isSome(mt)) {
      const [a, b] = mt.value
      ret.push(a)
      bb = b
    } else {
      break
    }
  }
  return ret
}
