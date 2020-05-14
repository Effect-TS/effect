import type { Ord } from "../Ord"
import * as RM from "../Readonly/Map/collect"

/**
 * @since 2.0.0
 */
export const collect: <K>(
  O: Ord<K>
) => <A, B>(f: (k: K, a: A) => B) => (m: Map<K, A>) => Array<B> = RM.collect as any
