import type { Option } from "../Option/Option"
import { updateAt as updateAt_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export const updateAt: <A>(
  k: string,
  a: A
) => <K extends string>(r: Record<K, A>) => Option<Record<K, A>> = updateAt_1
