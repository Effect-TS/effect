import { concat } from "./concat"

export const alt_: <A>(fx: readonly A[], fy: () => readonly A[]) => readonly A[] = (
  fx,
  f
) => concat(fx, f())
