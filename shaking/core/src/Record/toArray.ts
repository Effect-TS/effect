import { toReadonlyArray } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export const toArray: <K extends string, A>(
  r: Record<K, A>
) => Array<[K, A]> = toReadonlyArray as any
