import * as L from "../List"
import * as O from "../Option"
import * as S from "../Sync"
import type { FiberID } from "./id"

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
