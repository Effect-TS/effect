declare const _brand: unique symbol

export interface Brand<B> {
  readonly [_brand]: B
}

export type Branded<A, B> = A & Brand<B>
