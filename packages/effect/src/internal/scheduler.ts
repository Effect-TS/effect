import type * as Fiber from "../Fiber.ts"
import type * as Scheduler from "../Scheduler.ts"

// The scheduler side of parking a fiber. A fiber parks by asking its
// scheduler for a wait, and hands every entry that would make it run again,
// the effect its wait produced, its start, or an interrupt, back here. The
// fiber keeps no state about either.

/** @internal */
export interface RunnableFiber extends Fiber.Fiber<unknown, unknown> {
  run(effect: unknown): void
}

interface AsyncResource {
  runInAsyncScope(fn: () => void): void
  emitDestroy(): void
}

const AsyncResource: (new(type: string) => AsyncResource) | undefined = (() => {
  try {
    return (globalThis as any).process?.getBuiltinModule?.("node:async_hooks")?.AsyncResource
  } catch {
    return undefined
  }
})()

// The wait of a scheduler that does not implement ParkingScheduler, where
// node:async_hooks is available: an async resource created where the fiber
// parked, which runs the fiber inside it. Elsewhere, such as in browsers,
// there is no wait and the fiber resumes in the caller's context.
const DefaultWait: (new(type: string) => Scheduler.Wait) | undefined = AsyncResource && class extends AsyncResource {
  resume(task: () => void) {
    try {
      this.runInAsyncScope(task)
    } finally {
      // The wait has ended, even if the task threw. Node calls destroy hooks
      // later, so this cannot re-enter the fiber. Without it, async_hooks
      // consumers would see the resource as live until it is collected.
      this.emitDestroy()
    }
  }
}

// The outstanding wait of each parked fiber, shared by every scheduler, so a
// wait resumes the fiber even after Fiber.setContext replaces its scheduler.
// null once an entry has been passed to the wait, until the fiber runs: later
// entries are dropped, and an interrupt among them is already recorded on the
// fiber. Weak, so a fiber that is never woken can be collected.
const waits = new WeakMap<Fiber.Fiber<unknown, unknown>, Scheduler.Wait | null>()

// The fiber whose wait is being created. Creating it can run code that wakes
// the fiber, such as async_hooks init callbacks, before the wait is stored.
let installing: Fiber.Fiber<unknown, unknown> | undefined

/** @internal */
export const park = (scheduler: Scheduler.Scheduler, fiber: Fiber.Fiber<unknown, unknown>): void => {
  const parking = (scheduler as Partial<Scheduler.ParkingScheduler>).park !== undefined
  if (!parking && DefaultWait === undefined) return
  const previous = installing
  installing = fiber
  const wait = parking ? (scheduler as Scheduler.ParkingScheduler).park(fiber) : new DefaultWait!("effect/Fiber")
  const resumed = installing !== fiber
  installing = previous
  if (resumed) {
    // The fiber already ran where it parked, so the wait only needs ending
    wait.resume(noop)
  } else {
    waits.set(fiber, wait)
  }
}

/** @internal */
export const resume = (fiber: RunnableFiber, effect: unknown): void => {
  const wait = waits.get(fiber)
  if (wait) {
    waits.set(fiber, null)
    wait.resume(() => {
      waits.delete(fiber)
      fiber.run(effect)
    })
  } else if (wait === undefined) {
    // Woken while its wait is being created, the fiber is still where it
    // parked. Otherwise it is not parked: it has not started, has exited, or
    // has no wait in this runtime.
    if (installing === fiber) installing = undefined
    fiber.run(effect)
  }
}

const noop = (): void => {}
