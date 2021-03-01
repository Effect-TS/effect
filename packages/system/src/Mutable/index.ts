export type MutableSet<A> = Set<A>
export type MutableArray<A> = Array<A>
export type MutableMap<K, T> = Map<K, T>

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}
