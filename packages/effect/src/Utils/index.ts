export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export function intersect<AS extends unknown[] & { 0: unknown }>(
  ...as: AS
): UnionToIntersection<{ [k in keyof AS]: AS[k] }[number]> {
  return as.reduce((a: any, b: any) => ({ ...a, ...b })) as any
}

export const pattern: <N extends string>(
  n: N
) => {
  <
    X extends { [k in N]: string },
    K extends { [k in X[N]]: (_: Extract<X, { [_tag in N]: k }>) => any }
  >(
    _: K
  ): (m: X) => ReturnType<K[keyof K]>
  <
    X extends { [k in N]: string },
    K extends Partial<{ [k in X[N]]: (_: Extract<X, { [_tag in N]: k }>) => any }>,
    H
  >(
    _: K & { [k in X[N]]?: (_: Extract<X, { [_tag in N]: k }>) => any },
    __: (_: Exclude<X, { _tag: keyof K }>) => H
  ): (m: X) => { [k in keyof K]: ReturnType<NonNullable<K[k]>> }[keyof K] | H
} = (n) =>
  ((_: any, d: any) => (m: any) => {
    return (_[m[n]] ? _[m[n]](m) : d(m)) as any
  }) as any

export const matchTag = pattern("_tag")

export interface Separated<A, B> {
  readonly left: A
  readonly right: B
}

export type RefinementWithIndex<I, A, B extends A> = (i: I, a: A) => a is B

export type PredicateWithIndex<I, A> = (i: I, a: A) => boolean

export type Erase<R, K> = R & K extends K & infer R1 ? R1 : R

export type _A<T> = [T] extends [{ ["_A"]: () => infer A }] ? A : never

export type _R<T> = [T] extends [{ ["_R"]: (_: infer R) => void }] ? R : never

export type _E<T> = [T] extends [{ ["_E"]: () => infer E }] ? E : never
