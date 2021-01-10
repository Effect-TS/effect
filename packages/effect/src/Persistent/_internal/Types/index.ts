// copyright https://github.com/frptools

export type Concrete = string | number | boolean | symbol | object

export type Defined = Concrete | null

export type Primitive = Defined | undefined

export type ValueRef<A> = { value: A }

export interface AssociativeMap<V> {
  [key: string]: V
}

export type FilterFn<A> = (value: A, index: number) => any

export type KeyedFilterFn<A, K> = (value: A, key: K, index: number) => any

export type MapFn<A, B> = (value: A, index: number) => B

export type KeyedMapFn<A, K, B> = (value: A, key: K, index: number) => B

export type ReduceFn<A, B> = (accum: B, value: A, index: number) => B

export type KeyedReduceFn<B, A, K> = (accum: B, value: A, key: K, index: number) => B

export type ForEachFn<A> = (value: A, index: number) => any

export type KeyedForEachFn<A, K> = (value: A, key: K, index: number) => any

export type SelectorFn<A, B> = (value: A) => B

export type KeyedSelectorFn<A, K, B> = (value: A, key: K) => B

export type EqualityFn<A> = (a: A, b: A) => boolean

export type ComparatorFn<A> = (a: A, b: A) => number
