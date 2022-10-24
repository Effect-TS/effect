import { _K, _V, TMapSym } from "@effect/core/stm/TMap/definition"
import type { List } from "@fp-ts/data/List"

/** @internal */
export class InternalTMap<K, V> implements TMap<K, V> {
  readonly [TMapSym]: TMapSym = TMapSym
  readonly [_K]!: () => K
  readonly [_V]!: () => V
  constructor(
    readonly tBuckets: TRef<TArray<List<readonly [K, V]>>>,
    readonly tSize: TRef<number>
  ) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTMap<K, V>(
  _: TMap<K, V>
): asserts _ is InternalTMap<K, V> {
  //
}
