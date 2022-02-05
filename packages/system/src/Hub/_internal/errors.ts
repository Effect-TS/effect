// ets_tracing: off

import "../../Operator/index.js"

export const InvalidCapacityErrorSymbol: unique symbol = Symbol.for(
  "@effect-ts/core/symbols/errors/InvalidCapacity"
)
export class InvalidCapacityError extends Error {
  readonly [InvalidCapacityErrorSymbol] = "InvalidCapacityError"

  constructor(message?: string) {
    super(message)
    this.name = this[InvalidCapacityErrorSymbol]
  }
}

export function ensureCapacity(capacity: number): asserts capacity {
  if (capacity <= 0) {
    throw new InvalidCapacityError(`A Hub cannot have a capacity of ${capacity}`)
  }
}

export function isInvalidCapacityError(u: unknown): u is InvalidCapacityError {
  return u instanceof Error && u[InvalidCapacityErrorSymbol] === "InvalidCapacityError"
}
