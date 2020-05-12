import { alt_ } from "./alt_"

export const alt: <A>(
  that: () => readonly A[]
) => (fa: readonly A[]) => readonly A[] = (that) => (fa) => alt_(fa, that)
