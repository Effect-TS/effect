// ets_tracing: off

import "../Operator/index.js"

export const _brand: unique symbol = Symbol()

export interface Brand<B> {
  readonly [_brand]: B
}

export type Branded<A, B> = A & Brand<B>

/**
 * @ets_optimize identity
 */
export function makeBranded<T extends Branded<any, any>>(
  self: Omit<T, typeof _brand>
): T {
  // @ts-expect-error
  return self
}
