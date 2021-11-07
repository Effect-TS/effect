// ets_tracing: off

export const _R: unique symbol = Symbol()
export type _R<T> = [T] extends [{ [k in typeof _R]: (_: infer R) => void }] ? R : never

export const _InErr: unique symbol = Symbol()
export type _InErr<T> = [T] extends [{ [k in typeof _InErr]: (_: infer InErr) => void }]
  ? InErr
  : never

export const _In: unique symbol = Symbol()
export type _In<T> = [T] extends [{ [k in typeof _In]: (_: infer In) => void }]
  ? In
  : never

export const _OutErr: unique symbol = Symbol()
export type _OutErr<T> = [T] extends [{ [k in typeof _L]: () => infer OutErr }]
  ? OutErr
  : never

export const _L: unique symbol = Symbol()
export type _L<T> = [T] extends [{ [k in typeof _L]: () => infer L }] ? L : never

export const _Z: unique symbol = Symbol()
export type _Z<T> = [T] extends [{ [k in typeof _Z]: () => infer Z }] ? Z : never
