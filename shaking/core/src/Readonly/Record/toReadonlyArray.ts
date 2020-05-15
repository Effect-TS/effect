import type { ReadonlyRecord } from "./ReadonlyRecord"
import { collect } from "./collect"

/**
 * @since 2.5.0
 */
export const toReadonlyArray: <K extends string, A>(
  r: ReadonlyRecord<K, A>
) => ReadonlyArray<readonly [K, A]> = collect((k, a) => [k, a])
