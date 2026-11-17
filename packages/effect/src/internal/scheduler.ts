import type * as Fiber from "../Fiber.ts"
import type * as Scheduler from "../Scheduler.ts"

// The scheduler side of parking a fiber. A fiber parks by asking its
// scheduler for a wait, and hands every entry that would make it run again,
// the effect its wait produced, its start, or an interrupt, back here. The
// fiber only provides the slot this module keeps its wait in.

/** @internal */
export interface ParkableFiber extends Fiber.Fiber<unknown, unknown> {
  run(effect: unknown): void
  // The outstanding wait of the fiber, kept here whatever its scheduler is
  // now, so the wait resumes it even after Fiber.setContext replaces its
  // scheduler. null once an entry has been passed to the wait, until the
  // fiber runs: later entries are dropped, and an interrupt among them is
  // already recorded on the fiber. Only this module reads or writes it.
  _wait: Scheduler.Wait | null | undefined
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
      // Cleanup, not a fallback: the wait has ended even if the task threw,
      // for example from an exit observer. Node calls destroy hooks later, so
      // this cannot re-enter the fiber. Without it, async_hooks consumers
      // would see the resource as live until it is collected.
      this.emitDestroy()
    }
  }
}

// The fiber whose wait is being created. Creating it can run code that wakes
// the fiber, such as async_hooks init callbacks, before the wait is stored.
let installing: ParkableFiber | undefined

/** @internal */
export const park = (scheduler: Scheduler.Scheduler, fiber: ParkableFiber): void => {
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
    fiber._wait = wait
  }
}

/** @internal */
export const resume = (fiber: ParkableFiber, effect: unknown): void => {
  const wait = fiber._wait
  if (wait) {
    fiber._wait = null
    wait.resume(() => {
      fiber._wait = undefined
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
