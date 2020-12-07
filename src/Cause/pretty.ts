/**
 * tracing: off
 */
import * as A from "../Array"
import type { FiberID } from "../Fiber/id"
import type { Trace } from "../Fiber/tracing"
import { prettyTrace } from "../Fiber/tracing"
import { pipe } from "../Function"
import * as O from "../Option"
import * as S from "../Sync"
import type { Cause } from "./cause"

//
// @category PrettyPrint
//

type Segment = Sequential | Parallel | Failure

type Step = Parallel | Failure

interface Failure {
  _tag: "Failure"
  lines: string[]
}

interface Parallel {
  _tag: "Parallel"
  all: Sequential[]
}

interface Sequential {
  _tag: "Sequential"
  all: Step[]
}

const Failure = (lines: string[]): Failure => ({
  _tag: "Failure",
  lines
})

const Sequential = (all: Step[]): Sequential => ({
  _tag: "Sequential",
  all
})

const Parallel = (all: Sequential[]): Parallel => ({
  _tag: "Parallel",
  all
})

export type Renderer = (_: Trace) => string

const headTail = <A>(a: readonly A[] & { 0: A }): [A, A[]] => {
  const x = [...a]
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const head = x.shift()!
  return [head, x]
}

const prefixBlock = (values: readonly string[], p1: string, p2: string): string[] =>
  A.isNonEmpty(values)
    ? pipe(headTail(values), ([head, tail]) => [
        `${p1}${head}`,
        ...tail.map((_) => `${p2}${_}`)
      ])
    : []

const renderInterrupt = (
  fiberId: FiberID,
  trace: O.Option<Trace>,
  renderer: Renderer
): Sequential =>
  Sequential([
    Failure([
      `An interrupt was produced by #${fiberId.seqNumber}.`,
      "",
      ...renderTrace(trace, renderer)
    ])
  ])

const renderError = (error: Error): string[] =>
  lines(error.stack ? error.stack : String(error))

const renderDie = (
  error: Error,
  trace: O.Option<Trace>,
  renderer: Renderer
): Sequential =>
  Sequential([
    Failure([
      "An unchecked error was produced.",
      "",
      ...renderError(error),
      ...renderTrace(trace, renderer)
    ])
  ])

const renderDieUnknown = (
  error: string[],
  trace: O.Option<Trace>,
  renderer: Renderer
): Sequential =>
  Sequential([
    Failure([
      "An unchecked error was produced.",
      "",
      ...error,
      ...renderTrace(trace, renderer)
    ])
  ])

const renderFail = (
  error: string[],
  trace: O.Option<Trace>,
  renderer: Renderer
): Sequential =>
  Sequential([
    Failure([
      "A checked error was not handled.",
      "",
      ...error,
      ...renderTrace(trace, renderer)
    ])
  ])

const renderFailError = (
  error: Error,
  trace: O.Option<Trace>,
  renderer: Renderer
): Sequential =>
  Sequential([
    Failure([
      "A checked error was not handled.",
      "",
      ...renderError(error),
      ...renderTrace(trace, renderer)
    ])
  ])

const lines = (s: string) => s.split("\n").map((s) => s.replace("\r", "")) as string[]

const linearSegments = <E>(cause: Cause<E>, renderer: Renderer): S.UIO<Step[]> =>
  S.gen(function* (_) {
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

const parallelSegments = <E>(
  cause: Cause<E>,
  renderer: Renderer
): S.UIO<Sequential[]> =>
  S.gen(function* (_) {
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

const causeToSequential = <E>(cause: Cause<E>, renderer: Renderer): S.UIO<Sequential> =>
  S.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return Sequential([])
      }
      case "Fail": {
        return cause.value instanceof Error
          ? renderFailError(cause.value, O.none, renderer)
          : renderFail(lines(JSON.stringify(cause.value, null, 2)), O.none, renderer)
      }
      case "Die": {
        return cause.value instanceof Error
          ? renderDie(cause.value, O.none, renderer)
          : renderDieUnknown(
              lines(JSON.stringify(cause.value, null, 2)),
              O.none,
              renderer
            )
      }
      case "Interrupt": {
        return renderInterrupt(cause.fiberId, O.none, renderer)
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
            return cause.cause.value instanceof Error
              ? renderFailError(cause.cause.value, O.some(cause.trace), renderer)
              : renderFail(
                  lines(JSON.stringify(cause.cause.value, null, 2)),
                  O.some(cause.trace),
                  renderer
                )
          }
          case "Die": {
            return cause.cause.value instanceof Error
              ? renderDie(cause.cause.value, O.some(cause.trace), renderer)
              : renderDieUnknown(
                  lines(JSON.stringify(cause.cause.value, null, 2)),
                  O.some(cause.trace),
                  renderer
                )
          }
          case "Interrupt": {
            return renderInterrupt(cause.cause.fiberId, O.some(cause.trace), renderer)
          }
          default: {
            return Sequential([
              Failure([
                "An error was rethrown with a new trace.",
                ...renderTrace(O.some(cause.trace), renderer)
              ]),
              ...(yield* _(causeToSequential(cause.cause, renderer))).all
            ])
          }
        }
      }
    }
  })

function renderTrace(o: O.Option<Trace>, renderer: Renderer) {
  return o._tag === "None" ? ["No Trace available."] : lines(renderer(o.value))
}

const times = (s: string, n: number) => {
  let h = ""

  for (let i = 0; i < n; i += 1) {
    h += s
  }

  return h
}

const format = (segment: Segment): readonly string[] => {
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

const prettyLines = <E>(cause: Cause<E>, renderer: Renderer) =>
  S.gen(function* (_) {
    const s = yield* _(causeToSequential(cause, renderer))

    if (s.all.length === 1 && s.all[0]._tag === "Failure") {
      return s.all[0].lines
    }

    return O.getOrElse_(A.updateAt_(format(s), 0, "╥"), (): string[] => [])
  })

export function prettyM<E1>(cause: Cause<E1>, renderer: Renderer) {
  return S.gen(function* (_) {
    const lines = yield* _(prettyLines(cause, renderer))

    return `\n${lines.join("\n")}`
  })
}

/**
 * Returns a `String` with the cause pretty-printed.
 */
export const pretty = <E1>(cause: Cause<E1>, renderer: Renderer = prettyTrace) =>
  S.run(prettyM(cause, renderer))
