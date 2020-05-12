import { mapWithIndex_ } from "./mapWithIndex_"

export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: readonly A[]) => readonly B[] = (f) => (fa) => mapWithIndex_(fa, f)
