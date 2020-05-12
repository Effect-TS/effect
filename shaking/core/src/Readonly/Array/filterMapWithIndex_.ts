import type { Option } from "../../Option/Option"
import { isSome } from "../../Option/isSome"

export const filterMapWithIndex_ = <A, B>(
  fa: ReadonlyArray<A>,
  f: (i: number, a: A) => Option<B>
): ReadonlyArray<B> => {
  // tslint:disable-next-line: readonly-array
  const result: Array<B> = []
  for (let i = 0; i < fa.length; i++) {
    const optionB = f(i, fa[i])
    if (isSome(optionB)) {
      result.push(optionB.value)
    }
  }
  return result
}
