// ets_tracing: off

import * as A from "../../Collections/Immutable/Array/index.js"
import type { FiberID } from "../../Fiber/id.js"
import type { Trace } from "../../Fiber/tracing.js"
import { prettyTrace } from "../../Fiber/tracing.js"
import { pipe } from "../../Function/index.js"
import * as S from "../../IO/index.js"
import * as O from "../../Option/index.js"
import type { Cause } from "../cause.js"

//
// @category PrettyPrint
//

export type Segment = Sequential | Parallel | Failure

export type Step = Parallel | Failure

export interface Failure {
  _tag: "Failure"
  lines: string[]
}

export interface Parallel {
  _tag: "Parallel"
  all: Sequential[]
}

export interface Sequential {
  _tag: "Sequential"
  all: Step[]
}

export function Failure(lines: string[]): Failure {
  return {
    _tag: "Failure",
    lines
  }
}

export function Sequential(all: Step[]): Sequential {
  return {
    _tag: "Sequential",
    all
  }
}

export function Parallel(all: Sequential[]): Parallel {
  return {
    _tag: "Parallel",
    all
  }
}

export type TraceRenderer = (_: Trace) => string

export interface Renderer<E = unknown> {
  renderError: (error: E) => string[]
  renderTrace: TraceRenderer
  renderUnknown: (error: unknown) => string[]
}

export function headTail<A>(a: readonly A[] & { 0: A }): [A, A[]] {
  const x = [...a]
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const head = x.shift()!
  return [head, x]
}

export function prefixBlock(
  values: readonly string[],
  p1: string,
  p2: string
): string[] {
  return A.isNonEmpty(values)
    ? pipe(headTail(values), ([head, tail]) => [
        `${p1}${head}`,
        ...tail.map((_) => `${p2}${_}`)
      ])
    : []
}

export function renderInterrupt(
  fiberId: FiberID,
  trace: O.Option<Trace>,
  traceRenderer: TraceRenderer
): Sequential {
  return Sequential([
    Failure([
      `An interrupt was produced by #${fiberId.seqNumber}.`,
      "",
      ...renderTrace(trace, traceRenderer)
    ])
  ])
}

export function renderError(error: Error): string[] {
  return lines(error.stack ? error.stack : String(error))
}

export function renderDie(
  error: string[],
  trace: O.Option<Trace>,
  traceRenderer: TraceRenderer
): Sequential {
  return Sequential([
    Failure([
      "An unchecked error was produced.",
      "",
      ...error,
      ...renderTrace(trace, traceRenderer)
    ])
  ])
}

export function renderFail(
  error: string[],
  trace: O.Option<Trace>,
  traceRenderer: TraceRenderer
): Sequential {
  return Sequential([
    Failure([
      "A checked error was not handled.",
      "",
      ...error,
      ...renderTrace(trace, traceRenderer)
    ])
  ])
}

export function lines(s: string) {
  return s.split("\n").map((s) => s.replace("\r", "")) as string[]
}

export function linearSegments<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): S.IO<Step[]> {
  return S.gen(function* (_) {
    switch (cause._tag) {
      case "Then": {
        return [
          ...(yield* _(linearSegments(cause.left, renderer))),
          ...(yield* _(linearSegments(cause.right, renderer)))
        ]
      }
      default: {
        return (yield* _(causeToSequential(cause, renderer))).all
      }
    }
  })
}

export function parallelSegments<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): S.IO<Sequential[]> {
  return S.gen(function* (_) {
    switch (cause._tag) {
      case "Both": {
        return [
          ...(yield* _(parallelSegments(cause.left, renderer))),
          ...(yield* _(parallelSegments(cause.right, renderer)))
        ]
      }
      default: {
        return [yield* _(causeToSequential(cause, renderer))]
      }
    }
  })
}

export function renderToString(u: unknown): string {
  if (
    typeof u === "object" &&
    u != null &&
    "toString" in u &&
    typeof u["toString"] === "function" &&
    u["toString"] !== Object.prototype.toString
  ) {
    return u["toString"]()
  }
  return JSON.stringify(u, null, 2)
}

export function causeToSequential<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): S.IO<Sequential> {
  return S.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return Sequential([])
      }
      case "Fail": {
        return renderFail(
          renderer.renderError(cause.value),
          O.none,
          renderer.renderTrace
        )
      }
      case "Die": {
        return renderDie(
          renderer.renderUnknown(cause.value),
          O.none,
          renderer.renderTrace
        )
      }
      case "Interrupt": {
        return renderInterrupt(cause.fiberId, O.none, renderer.renderTrace)
      }
      case "Then": {
        return Sequential(yield* _(linearSegments(cause, renderer)))
      }
      case "Both": {
        return Sequential([Parallel(yield* _(parallelSegments(cause, renderer)))])
      }
      case "Traced": {
        switch (cause.cause._tag) {
          case "Fail": {
            return renderFail(
              renderer.renderError(cause.cause.value),
              O.some(cause.trace),
              renderer.renderTrace
            )
          }
          case "Die": {
            return renderDie(
              renderer.renderUnknown(cause.cause.value),
              O.some(cause.trace),
              renderer.renderTrace
            )
          }
          case "Interrupt": {
            return renderInterrupt(
              cause.cause.fiberId,
              O.some(cause.trace),
              renderer.renderTrace
            )
          }
          default: {
            return Sequential([
              Failure([
                "An error was rethrown with a new trace.",
                ...renderTrace(O.some(cause.trace), renderer.renderTrace)
              ]),
              ...(yield* _(causeToSequential(cause.cause, renderer))).all
            ])
          }
        }
      }
    }
  })
}

export function renderTrace(o: O.Option<Trace>, renderTrace: TraceRenderer) {
  return o._tag === "None" ? [] : lines(renderTrace(o.value))
}

export function times(s: string, n: number) {
  let h = ""

  for (let i = 0; i < n; i += 1) {
    h += s
  }

  return h
}

export function format(segment: Segment): readonly string[] {
  switch (segment._tag) {
    case "Failure": {
      return prefixBlock(segment.lines, "─", " ")
    }
    case "Parallel": {
      return [
        times("══╦", segment.all.length - 1) + "══╗",
        ...A.reduceRight_<Sequential, string[]>(segment.all, [], (current, acc) => [
          ...prefixBlock(acc, "  ║", "  ║"),
          ...prefixBlock(format(current), "  ", "  ")
        ])
      ]
    }
    case "Sequential": {
      return A.chain_(segment.all, (seg) => [
        "║",
        ...prefixBlock(format(seg), "╠", "║"),
        "▼"
      ])
    }
  }
}

export function prettyLines<E>(cause: Cause<E>, renderer: Renderer<E>) {
  return S.gen(function* (_) {
    const s = yield* _(causeToSequential(cause, renderer))

    if (s.all.length === 1 && s.all[0] && s.all[0]._tag === "Failure") {
      return s.all[0].lines
    }

    return O.getOrElse_(A.updateAt_(format(s), 0, "╥"), (): string[] => [])
  })
}

export function prettyM<E1>(cause: Cause<E1>, renderer: Renderer<E1>) {
  return S.gen(function* (_) {
    const lines = yield* _(prettyLines(cause, renderer))

    return `\n${lines.join("\n")}`
  })
}

export function defaultErrorToLines(error: unknown) {
  return error instanceof Error ? renderError(error) : lines(renderToString(error))
}

export const defaultRenderer: Renderer = {
  renderError: defaultErrorToLines,
  renderTrace: prettyTrace,
  renderUnknown: defaultErrorToLines
}

/**
 * Returns a `String` with the cause pretty-printed.
 */
export const pretty = <E1>(
  cause: Cause<E1>,
  renderer: Renderer<E1> = defaultRenderer
) => S.run(prettyM(cause, renderer))
