// copyright https://github.com/frptools

import type { UpdaterFn } from "../../Structural"
import { commit, modify, update as _update } from "../../Structural"
import type { Collection, CollectionEntry } from "../Collection"

export const getSymbol = Symbol()
export const hasSymbol = Symbol()
export const setSymbol = Symbol()
export const updateSymbol = Symbol()
export const verifyKeySymbol = Symbol()

export interface IndexedCollection<K, V, T extends CollectionEntry<K, V> = any, U = any>
  extends Collection<T, U> {
  readonly [getSymbol]: (key: K) => V | undefined
  readonly [hasSymbol]: (key: K) => boolean
  readonly [setSymbol]: (key: K, value: V) => this
  readonly [updateSymbol]: (
    key: K,
    updater: (value: V, collection: this) => any
  ) => this
  readonly [verifyKeySymbol]: (key: K) => boolean
}

export function has_<K, V>(collection: IndexedCollection<K, V>, key: K): boolean {
  return collection[hasSymbol](key)
}

export function has<K>(key: K) {
  return <V>(collection: IndexedCollection<K, V>) => has_(collection, key)
}

export function get_<K, V>(collection: IndexedCollection<K, V>, key: K): V | undefined {
  return collection[getSymbol](key)
}

export function get<K>(key: K) {
  return <V>(collection: IndexedCollection<K, V>) => get_(collection, key)
}

export function set_<K, V, C extends IndexedCollection<K, V>>(
  collection: C,
  key: K,
  value: V
): C {
  return collection[setSymbol](key, value)
}

export function set<K, V>(key: K, value: V) {
  return <C extends IndexedCollection<K, V>>(collection: C) =>
    set_(collection, key, value)
}

export function verifyKey_<K, C extends IndexedCollection<K, any>>(
  collection: C,
  key: K
): boolean {
  return collection[verifyKeySymbol](key)
}

export function verifyKey<K>(key: K) {
  return <C extends IndexedCollection<K, any>>(collection: C) =>
    verifyKey_(collection, key)
}

export function update_<C extends IndexedCollection<any, any>>(
  collection: C,
  updater: UpdaterFn<C, C | void>
): C {
  return _update(collection, updater)
}

export function update<C extends IndexedCollection<any, any>>(
  updater: UpdaterFn<C, C | void>
) {
  return (collection: C) => update_(collection, updater)
}

export function updateEntry_<K, V, C extends IndexedCollection<K, V>>(
  collection: C,
  key: K,
  updater: (value: V, collection: C) => any
): C {
  let next = modify(collection)
  next = next[updateSymbol](key, updater) || next
  return commit(next)
}

export function updateEntry<K, V, C extends IndexedCollection<K, V>>(
  key: K,
  updater: (value: V, collection: C) => any
) {
  return (collection: C) => updateEntry_(collection, key, updater)
}
