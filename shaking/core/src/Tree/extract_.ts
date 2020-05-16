import type { Tree } from "./Tree"

export const extract_: <A>(wa: Tree<A>) => A = (wa) => wa.value
