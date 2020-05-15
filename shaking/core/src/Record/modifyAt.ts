import type { Option } from "../Option/Option"
import { modifyAt as modifyAt_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export const modifyAt: <A>(
  k: string,
  f: (a: A) => A
) => <K extends string>(r: Record<K, A>) => Option<Record<K, A>> = modifyAt_1
