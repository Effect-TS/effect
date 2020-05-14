import type { Option } from "../Option"
import * as RM from "../Readonly/Map/compact"

export const compact: <E, A>(fa: Map<E, Option<A>>) => Map<E, A> = RM.compact as any
