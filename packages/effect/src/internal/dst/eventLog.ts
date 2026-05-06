/**
 * DST Event Log - Records every scheduling decision for deterministic replay.
 *
 * @internal
 */

/** @internal */
export type DSTEventAction = "schedule" | "execute" | "yield" | "complete" | "interrupt"

/** @internal */
export interface DSTEvent {
  readonly tick: number
  readonly action: DSTEventAction
  readonly fiberId: number
  readonly priority: number
  readonly chosenIndex: number
  readonly pendingCount: number
}

/** @internal */
export interface DSTEventLog {
  readonly seed: number
  readonly events: Array<DSTEvent>
  append(event: DSTEvent): void
  toJSON(): {
    readonly seed: number
    readonly events: ReadonlyArray<DSTEvent>
    readonly totalTicks: number
  }
}

/** @internal */
export const make = (seed: number): DSTEventLog => {
  const events: Array<DSTEvent> = []
  return {
    seed,
    events,
    append(event: DSTEvent) {
      events.push(event)
    },
    toJSON() {
      return {
        seed,
        events,
        totalTicks: events.length > 0 ? events[events.length - 1]!.tick + 1 : 0
      }
    }
  }
}
