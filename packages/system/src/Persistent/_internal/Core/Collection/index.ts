// copyright https://github.com/frptools

import type {
  Equatable,
  Hashable,
  Persistent,
  RecursiveUnwrappable
} from "../../Structural"

export type CollectionEntry<K, V> = [K, V] | { key: K; value: V } | K | V

export const isCollectionSymbol = Symbol()
export const sizeSymbol = Symbol()

export interface Collection<T, U = any>
  extends Persistent,
    Equatable,
    Hashable,
    RecursiveUnwrappable<U>,
    Iterable<T> {
  readonly [isCollectionSymbol]: true
  readonly [sizeSymbol]: number
}
