import type {
  Applicative,
  Applicative1,
  Applicative2,
  Applicative2C,
  Applicative3,
  Applicative3C
} from "fp-ts/lib/Applicative"
import type { HKT, Kind, Kind2, Kind3, URIS, URIS2, URIS3, Kind4 } from "fp-ts/lib/HKT"

import { sequence as sequence_1 } from "../Readonly/Record/sequence"
import type {
  Applicative4E,
  MaURIS,
  Applicative4EP,
  Applicative4EC,
  Applicative4ECP
} from "../Support/Overloads"

/**
 * @since 2.0.0
 */
export function sequence<F extends MaURIS, E>(
  F: Applicative4ECP<F, E>
): <K extends string, S, R, A>(
  ta: Record<K, Kind4<F, S, R, E, A>>
) => Kind4<F, unknown, R, E, Record<K, A>>
export function sequence<F extends MaURIS, E>(
  F: Applicative4EC<F, E>
): <K extends string, S, R, A>(
  ta: Record<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, Record<K, A>>
export function sequence<F extends MaURIS>(
  F: Applicative4EP<F>
): <K extends string, S, R, E, A>(
  ta: Record<K, Kind4<F, S, R, E, A>>
) => Kind4<F, unknown, R, E, Record<K, A>>
export function sequence<F extends MaURIS>(
  F: Applicative4E<F>
): <K extends string, S, R, E, A>(
  ta: Record<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, Record<K, A>>
export function sequence<F extends URIS3>(
  F: Applicative3<F>
): <K extends string, R, E, A>(
  ta: Record<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, Record<K, A>>
export function sequence<F extends URIS3, E>(
  F: Applicative3C<F, E>
): <K extends string, R, A>(
  ta: Record<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, Record<K, A>>
export function sequence<F extends URIS2>(
  F: Applicative2<F>
): <K extends string, E, A>(ta: Record<K, Kind2<F, E, A>>) => Kind2<F, E, Record<K, A>>
export function sequence<F extends URIS2, E>(
  F: Applicative2C<F, E>
): <K extends string, A>(ta: Record<K, Kind2<F, E, A>>) => Kind2<F, E, Record<K, A>>
export function sequence<F extends URIS>(
  F: Applicative1<F>
): <K extends string, A>(ta: Record<K, Kind<F, A>>) => Kind<F, Record<K, A>>
export function sequence<F>(
  F: Applicative<F>
): <K extends string, A>(ta: Record<K, HKT<F, A>>) => HKT<F, Record<K, A>>
export function sequence<F>(
  F: Applicative<F>
): <A>(ta: Record<string, HKT<F, A>>) => HKT<F, Record<string, A>> {
  return sequence_1(F)
}
