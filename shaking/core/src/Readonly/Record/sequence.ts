import type {
  Applicative,
  Applicative1,
  Applicative2,
  Applicative2C,
  Applicative3,
  Applicative3C
} from "fp-ts/lib/Applicative"
import type { HKT, Kind, Kind2, Kind3, URIS, URIS2, URIS3 } from "fp-ts/lib/HKT"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { traverseWithIndex } from "./traverseWithIndex"

/**
 * @since 2.5.0
 */
export function sequence<F extends URIS3>(
  F: Applicative3<F>
): <K extends string, R, E, A>(
  ta: ReadonlyRecord<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS3, E>(
  F: Applicative3C<F, E>
): <K extends string, R, A>(
  ta: ReadonlyRecord<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS2>(
  F: Applicative2<F>
): <K extends string, E, A>(
  ta: ReadonlyRecord<K, Kind2<F, E, A>>
) => Kind2<F, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS2, E>(
  F: Applicative2C<F, E>
): <K extends string, A>(
  ta: ReadonlyRecord<K, Kind2<F, E, A>>
) => Kind2<F, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS>(
  F: Applicative1<F>
): <K extends string, A>(
  ta: ReadonlyRecord<K, Kind<F, A>>
) => Kind<F, ReadonlyRecord<K, A>>
export function sequence<F>(
  F: Applicative<F>
): <K extends string, A>(
  ta: ReadonlyRecord<K, HKT<F, A>>
) => HKT<F, ReadonlyRecord<K, A>>
export function sequence<F>(
  F: Applicative<F>
): <A>(ta: ReadonlyRecord<string, HKT<F, A>>) => HKT<F, ReadonlyRecord<string, A>> {
  return traverseWithIndex(F)((_, a) => a)
}
