import type { Effect } from "../../Effect.js"
import type { Either } from "../../Either.js"
import type { Exit } from "../../Exit.js"
import type { Fiber } from "../../Fiber.js"
import { dual } from "../../Function.js"
import type { MergeState } from "../../MergeState.js"
import { hasProperty } from "../../Predicate.js"
import { OpCodes } from "../opCodes/channelMergeState.js"

/** @internal */
const MergeStateSymbolKey = "effect/ChannelMergeState"

/** @internal */
export const MergeStateTypeId: MergeState.MergeStateTypeId = Symbol.for(
  MergeStateSymbolKey
) as MergeState.MergeStateTypeId

/** @internal */
const proto = {
  [MergeStateTypeId]: MergeStateTypeId
}

/** @internal */
export const BothRunning = <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  left: Fiber<Err, Either<Done, Elem>>,
  right: Fiber<Err1, Either<Done1, Elem>>
): MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_BOTH_RUNNING
  op.left = left
  op.right = right
  return op
}

/** @internal */
export const LeftDone = <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  f: (exit: Exit<Err1, Done1>) => Effect<Env, Err2, Done2>
): MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_LEFT_DONE
  op.f = f
  return op
}

/** @internal */
export const RightDone = <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  f: (exit: Exit<Err, Done>) => Effect<Env, Err2, Done2>
): MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_RIGHT_DONE
  op.f = f
  return op
}

/** @internal */
export const isMergeState = (
  u: unknown
): u is MergeState<unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown> =>
  hasProperty(u, MergeStateTypeId)

/** @internal */
export const isBothRunning = <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
): self is MergeState.BothRunning<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> => {
  return self._tag === OpCodes.OP_BOTH_RUNNING
}

/** @internal */
export const isLeftDone = <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
): self is MergeState.LeftDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> => {
  return self._tag === OpCodes.OP_LEFT_DONE
}

/** @internal */
export const isRightDone = <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
): self is MergeState.RightDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> => {
  return self._tag === OpCodes.OP_RIGHT_DONE
}

/** @internal */
export const match = dual<
  <Env, Err, Err1, Err2, Elem, Done, Done1, Done2, Z>(
    options: {
      readonly onBothRunning: (
        left: Fiber<Err, Either<Done, Elem>>,
        right: Fiber<Err1, Either<Done1, Elem>>
      ) => Z
      readonly onLeftDone: (f: (exit: Exit<Err1, Done1>) => Effect<Env, Err2, Done2>) => Z
      readonly onRightDone: (f: (exit: Exit<Err, Done>) => Effect<Env, Err2, Done2>) => Z
    }
  ) => (self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>) => Z,
  <Env, Err, Err1, Err2, Elem, Done, Done1, Done2, Z>(
    self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>,
    options: {
      readonly onBothRunning: (
        left: Fiber<Err, Either<Done, Elem>>,
        right: Fiber<Err1, Either<Done1, Elem>>
      ) => Z
      readonly onLeftDone: (f: (exit: Exit<Err1, Done1>) => Effect<Env, Err2, Done2>) => Z
      readonly onRightDone: (f: (exit: Exit<Err, Done>) => Effect<Env, Err2, Done2>) => Z
    }
  ) => Z
>(2, (
  self,
  { onBothRunning, onLeftDone, onRightDone }
) => {
  switch (self._tag) {
    case OpCodes.OP_BOTH_RUNNING: {
      return onBothRunning(self.left, self.right)
    }
    case OpCodes.OP_LEFT_DONE: {
      return onLeftDone(self.f)
    }
    case OpCodes.OP_RIGHT_DONE: {
      return onRightDone(self.f)
    }
  }
})
