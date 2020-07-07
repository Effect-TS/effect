import { MutableQueue } from "../Support/MutableQueue"

export const unsafePollAll = <A>(q: MutableQueue<A>): readonly A[] => {
  const as = [] as A[]

  while (!q.isEmpty) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    as.push(q.poll(undefined)!)
  }

  return as
}
