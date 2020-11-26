import * as L from "../List"
import * as O from "../Option"
import * as S from "../Sync"
import type { FiberID } from "./id"
import { prettyFiberId } from "./id"

export type TraceElement = NoLocation | SourceLocation

export class NoLocation {
  readonly _tag = "NoLocation"
}
export class SourceLocation {
  readonly _tag = "SourceLocation"
  constructor(readonly location: string) {}
}

export function traceLocation(k: any): TraceElement {
  if (k["$trace"]) {
    return new SourceLocation(k["$trace"])
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
    L.push(parent, pushable)
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

export class Platform {
  constructor(
    readonly executionTraceLength: number,
    readonly stackTraceLength: number,
    readonly traceExecution: boolean,
    readonly traceStack: boolean,
    readonly traceEffects: boolean,
    readonly initialTracingStatus: boolean,
    readonly ancestorExecutionTraceLength: number,
    readonly ancestorStackTraceLength: number,
    readonly ancestryLength: number
  ) {}
}

export function prettyLocation(traceElement: TraceElement, pre: string) {
  return traceElement._tag === "NoLocation"
    ? "No Location Present"
    : `${pre}${traceElement.location}`
}

export function prettyTrace(trace: Trace, pre: string): string {
  return S.run(prettyTraceSafe(trace, pre))
}

export function prettyTraceSafe(trace: Trace, pre: string): S.UIO<string> {
  return S.gen(function* ($) {
    const execTrace = !L.isEmpty(trace.executionTrace)
    const stackTrace = !L.isEmpty(trace.stackTrace)

    const execPrint = execTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} Execution trace:`,
          "",
          ...L.toArray(
            L.map_(trace.executionTrace, (a) => `  ${prettyLocation(a, pre)}`)
          )
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} Execution trace: <empty trace>`]

    const stackPrint = stackTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to:`,
          "",
          ...L.toArray(
            L.map_(
              trace.stackTrace,
              (e) => `  a future continuation at ${prettyLocation(e, pre)}`
            )
          )
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
            `Fiber: ${prettyFiberId(trace.fiberId)} was spawned by:\n`,
            yield* $(prettyTraceSafe(parent.value, pre))
          ]

    return ["", ...stackPrint, "", ...execPrint, "", ...ancestry].join("\n")
  })
}
