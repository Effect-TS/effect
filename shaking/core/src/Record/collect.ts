import { collect as collect_1 } from "../Readonly/Record"

/**
 * Map a record into an array
 *
 * @example
 * import {collect} from 'fp-ts/lib/Record'
 *
 * const x: { a: string, b: boolean } = { a: 'foo', b: false }
 * assert.deepStrictEqual(
 *   collect((key, val) => ({key: key, value: val}))(x),
 *   [{key: 'a', value: 'foo'}, {key: 'b', value: false}]
 * )
 *
 * @since 2.0.0
 */
export const collect: <K extends string, A, B>(
  f: (k: K, a: A) => B
) => (r: Record<K, A>) => Array<B> = collect_1 as any
