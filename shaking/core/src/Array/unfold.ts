import type { Option } from "../Option/Option"
import { unfold as unfold_1 } from "../Readonly/Array/unfold"

export const unfold: <A, B>(b: B, f: (b: B) => Option<[A, B]>) => A[] = unfold_1 as any
