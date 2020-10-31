import type { Array } from "../Array"
import { constant, tuple } from "../Function"
import * as IT from "../Iterable"
import { fold_ } from "../Option"
import type { UIO } from "./_internal/effect"
import * as T from "./_internal/effect"
import type { Runtime } from "./core"
import { FiberDump } from "./dump"
import { fiberName } from "./fiberName"
import type { Status } from "./status"

export function dumpWith(withTrace: false) {
  return <E, A>(fiber: Runtime<E, A>): T.UIO<FiberDump> =>
    T.map_(
      // todo: trace is not supported, add it later
      T.zipWithPar_(fiber.getRef(fiberName), fiber.status, tuple),
      ([name, status]) => FiberDump(fiber.id, name, status)
    )
}

export const dump = dumpWith(false)

export function dumpFibers(fibers: Iterable<Runtime<any, any>>): UIO<Array<FiberDump>> {
  return T.foreach_(fibers, dump)
}

// export function dumpFibersStr() {}
// export function putDumpFibersStr() {}

export function dumpStr(
  fibers: Iterable<Runtime<any, any>>,
  withTrace: false
): UIO<string> {
  const du = T.foreach_(fibers, dumpWith(withTrace))
  const now = T.effectTotal(() => new Date().getTime())
  return T.map_(T.zipWith_(du, now, tuple), ([dumps, now]) => {
    const tree = renderHierarchy(dumps)
    const dumpStrings = withTrace ? collectTraces(dumps, now) : []
    return IT.reduce_(dumpStrings, tree, (acc, v) => acc + "\n" + v)
  })
}

export function prettyPrintM(dump: FiberDump): UIO<string> {
  return T.succeed(prettyPrint(dump, new Date().getTime()))
}

/**
 * @internal
 */
export function prettyPrint(dump: FiberDump, now: number): string {
  const millis = now - dump.fiberId.startTimeMillis
  const seconds = millis / 1000
  const minutes = seconds / 60
  const hours = minutes / 60

  const name = fold_(dump.fiberName, constant(""), (n) => `"${n}" `)
  const lifeMsg =
    (hours < 1 ? "" : `${Math.trunc(hours)}h`) +
    (hours < 1 && minutes < 1 ? "" : `${Math.trunc(minutes)}m`) +
    (hours < 1 && minutes < 1 && seconds < 1 ? "" : `${Math.trunc(seconds)}s`) +
    `${millis}ms`
  const waitMsg = (function (status: Status) {
    switch (status._tag) {
      case "Suspended":
        return status.blockingOn.length > 0
          ? `waiting on ` + status.blockingOn.map((id) => `${id.seqNumber}`).join(", ")
          : ""
      default:
        return ""
    }
  })(dump.status)
  const statMsg = renderStatus(dump.status)

  return [
    `${name}#${dump.fiberId.seqNumber} (${lifeMsg}) ${waitMsg}`,
    `   Status: ${statMsg}`
    // todo: add pretty printed trace
  ].join("\n")
}

/**
 * @internal
 */
export function renderOne(tree: FiberDump): string {
  const prefix = ""

  const name = fold_(tree.fiberName, constant(""), (n) => '"' + n + '" ')
  const statusMsg = renderStatus(tree.status)
  return `${prefix}+---${name}#${tree.fiberId.seqNumber} Status: ${statusMsg}\n`
}

/**
 * @internal
 */
export function renderStatus(status: Status): string {
  switch (status._tag) {
    case "Done":
      return "Done"
    case "Finishing":
      return `Finishing(${status.interrupting ? "interrupting" : ""})`
    case "Running":
      return `Running(${status.interrupting ? "interrupting" : ""})`
    case "Suspended": {
      const inter = status.interruptible ? "interruptible" : "uninterruptible"
      const ep = `${status.epoch} asyncs`
      // todo trace
      // const as = status.asyncTrace
      return `Suspended(${inter}, ${ep})`
    }
  }
}

/**
 * @internal
 */
export function renderHierarchy(trees: Iterable<FiberDump>): string {
  return IT.reduce_(IT.map_(trees, renderOne), "", (acc, str) => acc + str)
}

export function collectTraces(
  dumps: Iterable<FiberDump>,
  now: number
): Iterable<string> {
  return IT.map_(dumps, (d) => prettyPrint(d, now))
}
