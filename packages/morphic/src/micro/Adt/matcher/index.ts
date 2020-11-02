import type { KeysDefinition } from "../utils"
import { isIn } from "../utils"

type ValueByKeyByTag<
  Union extends Record<any, any>,
  Tags extends keyof Union = keyof Union
> = {
  [Tag in Tags]: {
    [Key in Union[Tag]]: Union extends { [r in Tag]: Key } ? Union : never
  }
}

type Cases<Record, R> = { [key in keyof Record]: (v: Record[key]) => R }

interface Folder<A> {
  <R>(f: (a: A) => R): (a: A) => R
}

interface Transform<A, Tag extends keyof A>
  extends TransformInter<A, ValueByKeyByTag<A>[Tag]> {}
interface TransformInter<A, Record> {
  (match: Partial<Cases<Record, A>>): (a: A) => A
}

interface ReducerBuilder<S, A, Tag extends keyof A> {
  (match: Cases<ValueByKeyByTag<A>[Tag], (s: S) => S>): Reducer<S, A>
  <
    M extends Partial<Cases<ValueByKeyByTag<A>[Tag], (s: S) => S>>,
    D extends (
      _: { [k in keyof ValueByKeyByTag<A>[Tag]]: ValueByKeyByTag<A>[Tag][k] }[Exclude<
        keyof ValueByKeyByTag<A>[Tag],
        keyof M
      >]
    ) => (s: S) => S
  >(
    match: M,
    def: D
  ): Reducer<S, A>
}

interface MatcherStrict<A, Tag extends keyof A>
  extends MatcherStrictInter<A, ValueByKeyByTag<A>[Tag]> {}

interface MatcherStrictInter<A, Rec> {
  <R>(match: Cases<Rec, R>): (a: A) => R
}

interface MatcherWiden<A, Tag extends keyof A>
  extends MatcherWidenIntern<A, ValueByKeyByTag<A>[Tag]> {}

interface MatcherWidenIntern<A, Record> {
  <M extends Cases<Record, unknown>>(match: M): (
    a: A
  ) => ReturnType<M[keyof M]> extends infer R ? R : never
  <
    M extends Partial<Cases<Record, unknown>>,
    D extends (
      _: { [k in keyof Record]: Record[k] }[Exclude<keyof Record, keyof M>]
    ) => any
  >(
    match: M,
    def: D
  ): (
    a: A
  ) =>
    | (ReturnType<NonNullable<M[keyof M]>> extends infer R ? R : never)
    | (unknown extends ReturnType<D> ? never : ReturnType<D>)
}

export interface Reducer<S, A> {
  (state: S | undefined, action: A): S
}

export interface Matchers<A, Tag extends keyof A> {
  fold: Folder<A>
  transform: Transform<A, Tag>
  match: MatcherWiden<A, Tag>
  matchStrict: MatcherStrict<A, Tag>
  createReducer: <S>(initialState: S) => ReducerBuilder<S, A, Tag>
  strict: <R>(f: (_: A) => R) => (_: A) => R
}

export const Matchers = <A, Tag extends keyof A>(tag: Tag) => (
  keys: KeysDefinition<A, Tag>
): Matchers<A, Tag> => {
  const inKeys = isIn(keys)
  const match = (match: any, def?: any) => (a: any): any => (match[a[tag]] || def)(a)
  const transform = (match: any) => (a: any): any => {
    const c = match[a[tag]]
    return c ? c(a) : a
  }
  const fold = <A>(a: A) => a
  const createReducer = <S>(initialState: S): ReducerBuilder<S, A, Tag> => (
    m: any,
    def?: any
  ) => {
    const matcher = match(m, def)
    return (s: any, a: any) => {
      const state = s === undefined ? initialState : s
      return inKeys(a[tag]) ? matcher(a)(state) : state
    }
  }
  return {
    matchStrict: match,
    match,
    transform,
    fold,
    createReducer,
    strict: <A>(a: A) => a
  }
}
