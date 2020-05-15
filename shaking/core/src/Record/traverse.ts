import type {
  Applicative,
  Applicative1,
  Applicative2,
  Applicative2C,
  Applicative3,
  Applicative3C
} from "fp-ts/lib/Applicative"
import type { HKT, Kind, Kind2, Kind3, URIS, URIS2, URIS3 } from "fp-ts/lib/HKT"

import { traverse as traverse_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export function traverse<F extends URIS3>(
  F: Applicative3<F>
): <R, E, A, B>(
  f: (a: A) => Kind3<F, R, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
export function traverse<F extends URIS3, E>(
  F: Applicative3C<F, E>
): <R, A, B>(
  f: (a: A) => Kind3<F, R, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
export function traverse<F extends URIS2>(
  F: Applicative2<F>
): <E, A, B>(
  f: (a: A) => Kind2<F, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
export function traverse<F extends URIS2, E>(
  F: Applicative2C<F, E>
): <A, B>(
  f: (a: A) => Kind2<F, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
export function traverse<F extends URIS>(
  F: Applicative1<F>
): <A, B>(
  f: (a: A) => Kind<F, B>
) => <K extends string>(ta: Record<K, A>) => Kind<F, Record<K, B>>
export function traverse<F>(
  F: Applicative<F>
): <A, B>(
  f: (a: A) => HKT<F, B>
) => <K extends string>(ta: Record<K, A>) => HKT<F, Record<K, B>>
export function traverse<F>(
  F: Applicative<F>
): <A, B>(
  f: (a: A) => HKT<F, B>
) => (ta: Record<string, A>) => HKT<F, Record<string, B>> {
  return traverse_1(F)
}
