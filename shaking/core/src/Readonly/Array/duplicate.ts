import { extend_ } from "./extend_"

export const duplicate: <A>(ma: readonly A[]) => readonly (readonly A[])[] = (ma) =>
  extend_(ma, (x) => x)
