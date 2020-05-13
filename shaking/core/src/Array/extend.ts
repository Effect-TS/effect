import { extend as extend_1 } from "../Readonly/Array/extend"

export const extend: <A, B>(f: (fa: A[]) => B) => (ma: A[]) => B[] = extend_1 as any
