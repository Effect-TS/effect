// ets_tracing: off

export type MutableSet<A> = Set<A>
export type MutableArray<A> = Array<A>
export type MutableRecord<K extends string, T> = Record<K, T>
export type MutableMap<K, T> = Map<K, T>

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}
