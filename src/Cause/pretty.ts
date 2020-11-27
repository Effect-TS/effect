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
  pre: string
): Sequential =>
  Sequential([
    Failure([
      `An interrupt was produced by #${fiberId.seqNumber}.`,
      "",
      ...renderTrace(trace, pre)
    ])
  ])

const renderError = (error: Error): string[] =>
  lines(error.stack ? error.stack : String(error))

const renderDie = (error: Error, trace: O.Option<Trace>, pre: string): Sequential =>
  Sequential([
    Failure([
      "An unchecked error was produced.",
      "",
      ...renderError(error),
      ...renderTrace(trace, pre)
    ])
  ])

const renderDieUnknown = (
  error: string[],
  trace: O.Option<Trace>,
  pre: string
): Sequential =>
  Sequential([
    Failure([
      "An unchecked error was produced.",
      "",
      ...error,
      ...renderTrace(trace, pre)
    ])
  ])

const renderFail = (error: string[], trace: O.Option<Trace>, pre: string): Sequential =>
  Sequential([
    Failure([
      "A checked error was not handled.",
      "",
      ...error,
      ...renderTrace(trace, pre)
    ])
  ])

const renderFailError = (
  error: Error,
  trace: O.Option<Trace>,
  pre: string
): Sequential =>
  Sequential([
    Failure([
      "A checked error was not handled.",
      "",
      ...renderError(error),
      ...renderTrace(trace, pre)
    ])
  ])

const lines = (s: string) => s.split("\n").map((s) => s.replace("\r", "")) as string[]

const linearSegments = <E>(cause: Cause<E>, pre: string): S.UIO<Step[]> =>
  S.gen(function* (_) {
    switch (cause._tag) {
      case "Then": {
        return [
          ...(yield* _(linearSegments(cause.left, pre))),
          ...(yield* _(linearSegments(cause.right, pre)))
        ]
      }
      default: {
        return (yield* _(causeToSequential(cause, pre))).all
      }
    }
  })

const parallelSegments = <E>(cause: Cause<E>, pre: string): S.UIO<Sequential[]> =>
  S.gen(function* (_) {
    switch (cause._tag) {
      case "Both": {
        return [
          ...(yield* _(parallelSegments(cause.left, pre))),
          ...(yield* _(parallelSegments(cause.right, pre)))
        ]
      }
      default: {
        return [yield* _(causeToSequential(cause, pre))]
      }
    }
  })

const causeToSequential = <E>(cause: Cause<E>, pre: string): S.UIO<Sequential> =>
  S.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return Sequential([])
      }
      case "Fail": {
        return cause.value instanceof Error
          ? renderFailError(cause.value, O.none, pre)
          : renderFail(lines(JSON.stringify(cause.value, null, 2)), O.none, pre)
      }
      case "Die": {
        return cause.value instanceof Error
          ? renderDie(cause.value, O.none, pre)
          : renderDieUnknown(lines(JSON.stringify(cause.value, null, 2)), O.none, pre)
      }
      case "Interrupt": {
        return renderInterrupt(cause.fiberId, O.none, pre)
      }
      case "Then": {
        return Sequential(yield* _(linearSegments(cause, pre)))
      }
      case "Both": {
        return Sequential([Parallel(yield* _(parallelSegments(cause, pre)))])
      }
      case "Traced": {
        switch (cause.cause._tag) {
          case "Fail": {
            return cause.cause.value instanceof Error
              ? renderFailError(cause.cause.value, O.some(cause.trace), pre)
              : renderFail(
                  lines(JSON.stringify(cause.cause.value, null, 2)),
                  O.some(cause.trace),
                  pre
                )
          }
          case "Die": {
            return cause.cause.value instanceof Error
              ? renderDie(cause.cause.value, O.some(cause.trace), pre)
              : renderDieUnknown(
                  lines(JSON.stringify(cause.cause.value, null, 2)),
                  O.some(cause.trace),
                  pre
                )
          }
          case "Interrupt": {
            return renderInterrupt(cause.cause.fiberId, O.some(cause.trace), pre)
          }
          default: {
            return Sequential([
              Failure([
                "An error was rethrown with a new trace.",
                ...renderTrace(O.some(cause.trace), pre)
              ]),
              ...(yield* _(causeToSequential(cause.cause, pre))).all
            ])
          }
        }
      }
    }
  })

function renderTrace(o: O.Option<Trace>, pre: string) {
  return o._tag === "None" ? ["No Trace available."] : lines(prettyTrace(o.value, pre))
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

const prettyLines = <E>(cause: Cause<E>, pre: string) =>
  S.gen(function* (_) {
    const s = yield* _(causeToSequential(cause, pre))

    if (s.all.length === 1 && s.all[0]._tag === "Failure") {
      return s.all[0].lines
    }

    return O.getOrElse_(A.updateAt_(format(s), 0, "╥"), (): string[] => [])
  })

export function prettyM<E1>(cause: Cause<E1>, pre = "") {
  return S.gen(function* (_) {
    const lines = yield* _(prettyLines(cause, pre))

    return lines.join("\n")
  })
}

/**
 * Returns a `String` with the cause pretty-printed.
 */
export const pretty = <E1>(cause: Cause<E1>, pre = "") => S.run(prettyM(cause, pre))
