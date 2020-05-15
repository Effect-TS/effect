import { hasOwnProperty as hasOwnProperty_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export const hasOwnProperty: <K extends string>(
  k: string,
  r: Record<K, unknown>
) => k is K = hasOwnProperty_1
