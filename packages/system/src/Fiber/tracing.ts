// ets_tracing: off

import * as L from "../Collections/Immutable/List/core.js"
import * as O from "../Option/index.js"
import * as S from "../Sync/index.js"
import type { FiberID } from "./id.js"
import { prettyFiberId } from "./id.js"

export type TraceElement = NoLocation | SourceLocation

export class NoLocation {
  readonly _tag = "NoLocation"
}
export class SourceLocation {
  readonly _tag = "SourceLocation"
  constructor(readonly location: string) {}
}

export function traceLocation(k: string | undefined): TraceElement {
  if (k) {
    return new SourceLocation(k)
  }
  return new NoLocation()
}

export class Trace {
  constructor(
    readonly fiberId: FiberID,
    readonly executionTrace: L.List<TraceElement>,
    readonly stackTrace: L.List<TraceElement>,
    readonly parentTrace: O.Option<Trace>
  ) {}
}

export function ancestryLengthSafe(trace: Trace, i: number): S.UIO<number> {
  const parent = trace.parentTrace
  if (parent._tag === "None") {
    return S.succeed(i)
  } else {
    return S.suspend(() => ancestryLengthSafe(parent.value, i + 1))
  }
}

export function ancestryLength(trace: Trace) {
  return S.run(ancestryLengthSafe(trace, 0))
}

export function parents(trace: Trace): L.List<Trace> {
  const pushable = L.emptyPushable<Trace>()
  let parent = O.toUndefined(trace.parentTrace)
  while (parent != null) {
    L.push_(pushable, parent)
    parent = O.toUndefined(parent.parentTrace)
  }
  return pushable
}

export function truncatedParentTrace(
  trace: Trace,
  maxAncestors: number
): O.Option<Trace> {
  if (ancestryLength(trace) > maxAncestors) {
    return L.reduceRight_(
      L.take_(parents(trace), maxAncestors),
      O.none as O.Option<Trace>,
      (trace, parent) =>
        O.some(new Trace(trace.fiberId, trace.executionTrace, trace.stackTrace, parent))
    )
  } else {
    return trace.parentTrace
  }
}

export function prettyTrace(trace: Trace): string {
  return S.run(prettyTraceSafe(trace))
}

export function prettyTraceSafe(trace: Trace): S.UIO<string> {
  return S.gen(function* ($) {
    const execution = L.filter_(
      trace.executionTrace,
      (_): _ is SourceLocation => _._tag === "SourceLocation"
    )

    const stack = L.filter_(
      trace.stackTrace,
      (_): _ is SourceLocation => _._tag === "SourceLocation"
    )

    const execTrace = !L.isEmpty(execution)
    const stackTrace = !L.isEmpty(stack)

    const execPrint = execTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} Execution trace:`,
          "",
          ...L.toArray(L.map_(execution, (a) => `  ${a.location}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} Execution trace: <empty trace>`]

    const stackPrint = stackTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to:`,
          "",
          ...L.toArray(L.map_(stack, (e) => `  a future continuation at ${e.location}`))
        ]
      : [
          `Fiber: ${prettyFiberId(
            trace.fiberId
          )} was supposed to continue to: <empty trace>`
        ]

    const parent = trace.parentTrace

    const ancestry =
      parent._tag === "None"
        ? [`Fiber: ${prettyFiberId(trace.fiberId)} was spawned by: <empty trace>`]
        : [
            `Fiber: ${prettyFiberId(trace.fiberId)} was spawned by:`,
            yield* $(prettyTraceSafe(parent.value))
          ]

    return ["", ...stackPrint, "", ...execPrint, "", ...ancestry].join("\n")
  })
}
