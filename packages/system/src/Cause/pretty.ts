import * as A from "../Array"
import type { FiberID } from "../Fiber/id"
import { pipe } from "../Function"
import * as O from "../Option"
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

const renderInterrupt = (fiberId: FiberID): Sequential =>
  Sequential([Failure([`An interrupt was produced by #${fiberId.seqNumber}.`])])

const renderError = (error: Error): string[] =>
  lines(error.stack ? error.stack : String(error))

const renderDie = (error: Error): Sequential =>
  Sequential([Failure(["An unchecked error was produced.", ...renderError(error)])])

const renderDieUnknown = (error: string[]): Sequential =>
  Sequential([Failure(["An unchecked error was produced.", ...error])])

const renderFail = (error: string[]): Sequential =>
  Sequential([Failure(["A checked error was not handled.", ...error])])

const renderFailError = (error: Error): Sequential =>
  Sequential([Failure(["A checked error was not handled.", ...renderError(error)])])

const lines = (s: string) => s.split("\n").map((s) => s.replace("\r", "")) as string[]

const linearSegments = <E>(cause: Cause<E>): Step[] => {
  switch (cause._tag) {
    case "Then": {
      return [...linearSegments(cause.left), ...linearSegments(cause.right)]
    }
    default: {
      return causeToSequential(cause).all
    }
  }
}

const parallelSegments = <E>(cause: Cause<E>): Sequential[] => {
  switch (cause._tag) {
    case "Both": {
      return [...parallelSegments(cause.left), ...parallelSegments(cause.right)]
    }
    default: {
      return [causeToSequential(cause)]
    }
  }
}

const causeToSequential = <E>(cause: Cause<E>): Sequential => {
  switch (cause._tag) {
    case "Empty": {
      return Sequential([])
    }
    case "Fail": {
      return cause.value instanceof Error
        ? renderFailError(cause.value)
        : renderFail(lines(JSON.stringify(cause.value, null, 2)))
    }
    case "Die": {
      return cause.value instanceof Error
        ? renderDie(cause.value)
        : renderDieUnknown(lines(JSON.stringify(cause.value, null, 2)))
    }
    case "Interrupt": {
      return renderInterrupt(cause.fiberId)
    }
    case "Then": {
      return Sequential(linearSegments(cause))
    }
    case "Both": {
      return Sequential([Parallel(parallelSegments(cause))])
    }
  }
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

const prettyLines = <E>(cause: Cause<E>): readonly string[] => {
  const s = causeToSequential(cause)

  if (s.all.length === 1 && s.all[0]._tag === "Failure") {
    return s.all[0].lines
  }

  return O.getOrElse_(A.updateAt_(format(s), 0, "╥"), (): string[] => [])
}

/**
 * Returns a `String` with the cause pretty-printed.
 */
export const pretty = <E1>(cause: Cause<E1>) => prettyLines(cause).join("\n")
