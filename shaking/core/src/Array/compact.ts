import { Option } from "../Option/Option"
import { compact as compact_ } from "../Readonly/Array/compact"

export const compact: <A>(fa: Option<A>[]) => A[] = compact_ as any
