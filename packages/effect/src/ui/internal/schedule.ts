/**
 * The one pure scheduling rule for Command modes and interrupts, shared by the
 * runtime and `Story` so the two can't drift apart.
 *
 * @internal
 * @since 4.1.3
 */
import type * as Command from "../Command.ts"

/**
 * A run the scheduler knows about: a Command that is running or waiting to run.
 *
 * @internal
 */
export interface Entry<A> {
  readonly name: string
  readonly key: string | undefined
  readonly mode: Command.Mode
  readonly status: "running" | "queued"
  readonly value: A
}

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
 * Concurrency is grouped by Command name plus the key derived from its
 * arguments. `concurrent` always starts. `switch` starts and interrupts the
 * group's running and queued runs. `drop` is ignored while the group has a
 * running run. `queue` waits while the group has a running run. An `Interrupt`
 * starts nothing and interrupts every run with its name, or only those with
 * its key when it has one.
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
        entry.name === command.name && (command.key === undefined || entry.key === command.key)
      )
    }
  }
  const group = inFlight.filter((entry) => sameGroup(entry, command.name, command.key))
  switch (command.mode) {
    case "concurrent":
      return { action: "start", interrupt: [] }
    case "switch":
      return { action: "start", interrupt: group }
    case "drop":
      return { action: group.some((entry) => entry.status === "running") ? "drop" : "start", interrupt: [] }
    case "queue":
      return { action: group.some((entry) => entry.status === "running") ? "queue" : "start", interrupt: [] }
  }
}

/**
 * Decides which queued run starts when a running one ends: the oldest queued
 * run of the same group, if `remaining` no longer has a running one.
 *
 * @internal
 */
export const next = <A>(remaining: ReadonlyArray<Entry<A>>, ended: Entry<A>): Entry<A> | undefined => {
  const group = remaining.filter((entry) => sameGroup(entry, ended.name, ended.key))
  if (group.some((entry) => entry.status === "running")) return undefined
  return group.find((entry) => entry.status === "queued")
}
