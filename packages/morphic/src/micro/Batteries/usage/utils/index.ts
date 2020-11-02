export const assignFunction = <F extends Function, C>(ab: F, c: C): F & C => {
  const newF: typeof ab = ((...x: any[]) => ab(...x)) as any
  return Object.assign(newF, c)
}

export type SelectKeyOfMatchingValues<KeyedValues, Constraint> = {
  [k in keyof KeyedValues]: KeyedValues[k] extends Constraint ? k : never
}[keyof KeyedValues]

export const assignCallable = <C, F extends Function & C, D>(F: F, d: D): F & C & D =>
  assignFunction(F, Object.assign({}, F, d))

export const wrapFun = <A, B, X>(g: ((a: A) => B) & X): typeof g =>
  ((x: any) => g(x)) as any

export interface InhabitedTypes<R, E, A> {
  _R: (_: R) => void
  _E: E
  _A: A
}

export type AType<X extends InhabitedTypes<any, any, any>> = X["_A"]

export type EType<X extends InhabitedTypes<any, any, any>> = X["_E"]

export type RType<X extends InhabitedTypes<any, any, any>> = Parameters<X["_R"]>[0]

export const inhabitTypes = <R, E, A, T>(t: T): T & InhabitedTypes<R, E, A> =>
  t as T & InhabitedTypes<R, E, A>
