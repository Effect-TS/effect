import type { Eq } from "../Eq"
import type { Option } from "../Option"
import * as RM from "../Readonly/Map/modifyAt"

/**
 * @since 2.0.0
 */
export const modifyAt: <K>(
  E: Eq<K>
) => <A>(
  k: K,
  f: (a: A) => A
) => (m: Map<K, A>) => Option<Map<K, A>> = RM.modifyAt as any
