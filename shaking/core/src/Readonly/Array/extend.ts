import { extend_ } from "./extend_"

export const extend: <A, B>(
  f: (fa: readonly A[]) => B
) => (ma: readonly A[]) => readonly B[] = (f) => (ma) => extend_(ma, f)
