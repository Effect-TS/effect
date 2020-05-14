import type { Eq } from "../Eq"
import type { Option } from "../Option"
import * as RM from "../Readonly/Map/updateAt"

/**
 * @since 2.0.0
 */
export const updateAt: <K>(
  E: Eq<K>
) => <A>(k: K, a: A) => (m: Map<K, A>) => Option<Map<K, A>> = RM.updateAt as any
