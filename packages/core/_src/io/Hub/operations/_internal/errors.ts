export const InvalidCapacityErrorSym: unique symbol = Symbol.for(
  "@effect/core/io/Hub/errors/InvalidCapacity"
)

export class InvalidCapacityError extends Error {
  readonly [InvalidCapacityErrorSym] = "InvalidCapacityError"

  constructor(message?: string) {
    super(message)
    this.name = this[InvalidCapacityErrorSym]
  }
}

export function ensureCapacity(capacity: number): asserts capacity {
  if (capacity <= 0) {
    throw new InvalidCapacityError(`A Hub cannot have a capacity of ${capacity}`)
  }
}

export function isInvalidCapacityError(u: unknown): u is InvalidCapacityError {
  return u instanceof Error && u[InvalidCapacityErrorSym] === "InvalidCapacityError"
}
