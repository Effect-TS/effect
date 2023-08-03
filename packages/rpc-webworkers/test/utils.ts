export type Equals<A, B> = [A] extends [B] ? [B] extends [A] ? true
  : false
  : false

export const typeEquals = <A>(_a: A) => <B>(): Equals<A, B> => void 0 as any
