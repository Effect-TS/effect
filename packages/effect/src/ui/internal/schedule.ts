/**
 * The one pure scheduling rule for Command modes and interrupts, shared by the
 * runtime and `Story` so the two can't drift apart.
 *
 * @internal
 * @since 4.1.5
 */
import type * as Command from "../Command.ts"

/**
 * A run the scheduler knows about: a Command that is running, waiting to run,
 * or awaiting: its fiber has exited and its message hasn't been delivered.
 *
 * @internal
 */
export interface Entry<A> {
  readonly name: string
  /** The group key, or `undefined` for a Command without `group`. */
  readonly key: string | undefined
  readonly mode: Command.Mode
  readonly status: Status
  readonly value: A
}

/**
 * Where a run is: `running`, `queued` behind a running run of its group, or
 * `awaiting`: its fiber exited and its message waits, on its own
 * `Command.afterRefetch` wait or, under `queue`, behind an earlier message
 * of its group.
 *
 * @internal
 */
export type Status = "running" | "queued" | "awaiting"

/**
 * What to do with an issued Command, and which in-flight entries it interrupts.
 *
 * @internal
 */
export interface Decision<A> {
  readonly action: "start" | "queue" | "drop" | "none"
  readonly interrupt: ReadonlyArray<Entry<A>>
}

const sameGroup = <A>(entry: Entry<A>, name: string, key: string | undefined): boolean =>
  entry.name === name && entry.key === key

/**
 * Decides how an issued Command relates to the in-flight runs of its instance.
 *
 * Concurrency is grouped by Command name plus the group key of its `group`
 * fields. `concurrent` always starts. `switch` starts and interrupts the
 * group's running, queued and awaiting runs. `drop` is ignored while the
 * group has a running or awaiting run. `queue` waits while the group has a
 * running run: an awaiting one doesn't hold it. An `Interrupt` starts nothing
 * and interrupts every run with its name, or only those with its group key
 * when it has one.
 *
 * @internal
 */
export const schedule = <A>(
  inFlight: ReadonlyArray<Entry<A>>,
  command: Command.Command<any, any>
): Decision<A> => {
  if (command._tag === "Interrupt") {
    return {
      action: "none",
      interrupt: inFlight.filter((entry) =>
        entry.name === command.name && (command.groupKey === undefined || entry.key === command.groupKey)
      )
    }
  }
  const group = inFlight.filter((entry) => sameGroup(entry, command.name, command.groupKey))
  switch (command.mode) {
    case "concurrent":
      return { action: "start", interrupt: [] }
    case "switch":
      return { action: "start", interrupt: group }
    case "drop":
      return { action: group.some((entry) => entry.status !== "queued") ? "drop" : "start", interrupt: [] }
    case "queue":
      return { action: group.some((entry) => entry.status === "running") ? "queue" : "start", interrupt: [] }
  }
}

/**
 * Decides which queued run starts when a running one's fiber exits: the
 * oldest queued run of the same group, if `remaining` no longer has a
 * running one. An awaiting run doesn't hold the queue.
 *
 * @internal
 */
export const next = <A>(remaining: ReadonlyArray<Entry<A>>, ended: Entry<A>): Entry<A> | undefined => {
  const group = remaining.filter((entry) => sameGroup(entry, ended.name, ended.key))
  if (group.some((entry) => entry.status === "running")) return undefined
  return group.find((entry) => entry.status === "queued")
}

/**
 * Returns the next awaiting run whose message is ready to deliver. Under
 * `queue`, selects the group's oldest awaiting run to preserve issue order;
 * otherwise selects `entry`. Returns nothing until the selected run's own
 * wait has ended (`ready`).
 *
 * @internal
 */
export const deliverable = <A>(
  inFlight: ReadonlyArray<Entry<A>>,
  entry: Entry<A>,
  ready: (value: A) => boolean
): Entry<A> | undefined => {
  const next = entry.mode === "queue"
    ? inFlight.find((other) => sameGroup(other, entry.name, entry.key) && other.status === "awaiting")
    : inFlight.find((other) => other.value === entry.value && other.status === "awaiting")
  return next !== undefined && ready(next.value) ? next : undefined
}
