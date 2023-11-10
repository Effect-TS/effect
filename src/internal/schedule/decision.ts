import { Chunk } from "../../Chunk.js"
import type { ScheduleDecision } from "../../ScheduleDecision.js"
import type { ScheduleInterval } from "../../ScheduleInterval.js"
import { ScheduleIntervals } from "../../ScheduleIntervals.js"

/** @internal */
export const OP_CONTINUE = "Continue" as const

/** @internal */
export type OP_CONTINUE = typeof OP_CONTINUE

/** @internal */
export const OP_DONE = "Done" as const

/** @internal */
export type OP_DONE = typeof OP_DONE

/** @internal */
export const _continue = (intervals: ScheduleIntervals): ScheduleDecision => {
  return {
    _tag: OP_CONTINUE,
    intervals
  }
}

/** @internal */
export const continueWith = (interval: ScheduleInterval): ScheduleDecision => {
  return {
    _tag: OP_CONTINUE,
    intervals: ScheduleIntervals.make(Chunk.of(interval))
  }
}

/** @internal */
export const done: ScheduleDecision = {
  _tag: OP_DONE
}

/** @internal */
export const isContinue = (self: ScheduleDecision): self is ScheduleDecision.Continue => {
  return self._tag === OP_CONTINUE
}

/** @internal */
export const isDone = (self: ScheduleDecision): self is ScheduleDecision.Done => {
  return self._tag === OP_DONE
}
