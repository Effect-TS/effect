import { chain as chain_1 } from "../Readonly/Array/chain"

export const chain: <A, B>(f: (a: A) => B[]) => (ma: A[]) => B[] = chain_1 as any
