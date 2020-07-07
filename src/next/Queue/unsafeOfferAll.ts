import { MutableQueue } from "../Support/MutableQueue"

export const unsafeOfferAll = <A>(
  q: MutableQueue<A>,
  as: readonly A[]
): readonly A[] => {
  const bs = Array.from(as)

  while (bs.length > 0) {
    if (!q.offer(bs[0])) {
      return bs
    } else {
      bs.shift()
    }
  }

  return bs
}
