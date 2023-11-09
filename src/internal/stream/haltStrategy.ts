import { dual } from "../../Function.js"
import type { StreamHaltStrategy } from "../../StreamHaltStrategy.js"
import * as OpCodes from "../opCodes/streamHaltStrategy.js"

/** @internal */
export const Left: StreamHaltStrategy = {
  _tag: OpCodes.OP_LEFT
}

/** @internal */
export const Right: StreamHaltStrategy = {
  _tag: OpCodes.OP_RIGHT
}

/** @internal */
export const Both: StreamHaltStrategy = {
  _tag: OpCodes.OP_BOTH
}

/** @internal */
export const Either: StreamHaltStrategy = {
  _tag: OpCodes.OP_EITHER
}

/** @internal */
export const fromInput = (input: StreamHaltStrategy.HaltStrategyInput): StreamHaltStrategy => {
  switch (input) {
    case "left":
      return Left
    case "right":
      return Right
    case "both":
      return Both
    case "either":
      return Either
    default:
      return input
  }
}

/** @internal */
export const isLeft = (self: StreamHaltStrategy): self is StreamHaltStrategy.Left => self._tag === OpCodes.OP_LEFT

/** @internal */
export const isRight = (self: StreamHaltStrategy): self is StreamHaltStrategy.Right => self._tag === OpCodes.OP_RIGHT

/** @internal */
export const isBoth = (self: StreamHaltStrategy): self is StreamHaltStrategy.Both => self._tag === OpCodes.OP_BOTH

/** @internal */
export const isEither = (self: StreamHaltStrategy): self is StreamHaltStrategy.Either => self._tag === OpCodes.OP_EITHER

/** @internal */
export const match = dual<
  <Z>(onLeft: () => Z, onRight: () => Z, onBoth: () => Z, onEither: () => Z) => (self: StreamHaltStrategy) => Z,
  <Z>(
    self: StreamHaltStrategy,
    onLeft: () => Z,
    onRight: () => Z,
    onBoth: () => Z,
    onEither: () => Z
  ) => Z
>(5, <Z>(
  self: StreamHaltStrategy,
  onLeft: () => Z,
  onRight: () => Z,
  onBoth: () => Z,
  onEither: () => Z
): Z => {
  switch (self._tag) {
    case OpCodes.OP_LEFT: {
      return onLeft()
    }
    case OpCodes.OP_RIGHT: {
      return onRight()
    }
    case OpCodes.OP_BOTH: {
      return onBoth()
    }
    case OpCodes.OP_EITHER: {
      return onEither()
    }
  }
})
