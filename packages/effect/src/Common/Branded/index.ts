export const _brand: unique symbol = Symbol()

export interface Brand<B> {
  readonly [_brand]: B
}

export type Branded<A, B> = A & Brand<B>
