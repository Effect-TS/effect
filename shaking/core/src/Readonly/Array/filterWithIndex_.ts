export const filterWithIndex_ = <A>(
  fa: ReadonlyArray<A>,
  predicateWithIndex: (i: number, a: A) => boolean
): ReadonlyArray<A> => {
  return fa.filter((a, i) => predicateWithIndex(i, a))
}
