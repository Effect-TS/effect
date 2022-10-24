import { realCause } from "@effect/core/io/Cause/definition"
import { Doc } from "@effect/printer/Doc"
import { FusionDepth } from "@effect/printer/Optimize"
import { pretty as renderPretty } from "@effect/printer/Render"
import { pipe } from "@fp-ts/data/Function"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/NonEmptyReadonlyArray"
import * as SafeEval from "@fp-ts/data/SafeEval"

/** @internal */
export interface Renderer<E = unknown> {
  readonly lineWidth: number
  readonly ribbonFraction: number
  readonly renderError: (error: E) => string[]
  readonly renderUnknown: (error: unknown) => string[]
}

/** @internal */
export type Segment = Sequential | Parallel | Failure

/** @internal */
export type Step = Parallel | Failure

/** @internal */
export interface Failure {
  readonly _tag: "Failure"
  readonly lines: ReadonlyArray<Doc<never>>
}

/** @internal */
export interface Parallel {
  readonly _tag: "Parallel"
  readonly all: ReadonlyArray<Sequential>
}

/** @internal */
export interface Sequential {
  readonly _tag: "Sequential"
  readonly all: ReadonlyArray<Step>
}

/** @internal */
export function Failure(lines: ReadonlyArray<Doc<never>>): Failure {
  return {
    _tag: "Failure",
    lines
  }
}

/** @internal */
export function Sequential(all: ReadonlyArray<Step>): Sequential {
  return {
    _tag: "Sequential",
    all
  }
}

/** @internal */
export function Parallel(all: ReadonlyArray<Sequential>): Parallel {
  return {
    _tag: "Parallel",
    all
  }
}

const box = {
  horizontal: {
    light: Doc.char("─"),
    heavy: Doc.char("═")
  },
  vertical: {
    heavy: Doc.char("║")
  },
  branch: {
    right: {
      heavy: Doc.char("╠")
    },
    down: {
      light: Doc.char("╥"),
      heavy: Doc.char("╦")
    }
  },
  terminal: {
    down: {
      heavy: Doc.char("╗")
    }
  },
  arrow: {
    down: Doc.char("▼")
  }
}

function isNonEmptyArray<A>(array: ReadonlyArray<A>): array is NonEmptyReadonlyArray<A> {
  return array.length > 0
}

function headTail<A>(a: NonEmptyReadonlyArray<A>): readonly [A, ReadonlyArray<A>] {
  const x = [...a]
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const head = x.shift()!
  return [head, x]
}

function lines(s: string) {
  return s.split("\n").map((s) => s.replace("\r", "")) as string[]
}

function renderToString(u: unknown): string {
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

function times<A>(value: A, n: number): ReadonlyArray<A> {
  const array: Array<A> = []
  for (let i = 0; i < n; i = i + 1) {
    array.push(value)
  }
  return array
}

function renderFail(
  error: ReadonlyArray<Doc<never>>
  // trace: O.Option<Trace>,
  // traceRenderer: TraceRenderer
): Sequential {
  return Sequential([
    Failure([
      Doc.text("A checked error was not handled."),
      Doc.empty,
      ...error
      // ...renderTrace(trace, traceRenderer)
    ])
  ])
}

function renderDie(
  error: ReadonlyArray<Doc<never>>
  // trace: O.Option<Trace>,
  // traceRenderer: TraceRenderer
): Sequential {
  return Sequential([
    Failure([
      Doc.text("An unchecked error was produced."),
      Doc.empty,
      ...error
      // ...renderTrace(trace, traceRenderer)
    ])
  ])
}

function renderInterrupt(
  fiberId: FiberId
  // trace: O.Option<Trace>,
  // traceRenderer: TraceRenderer
): Sequential {
  const ids = Array.from(fiberId.ids).map((id) => `#${id}`).join(", ")
  return Sequential([
    Failure([
      Doc.text(`An interrupt was produced by ${ids}.`)
      // "",
      // ...renderTrace(trace, traceRenderer)
    ])
  ])
}

function renderError(error: Error): string[] {
  return lines(error.stack ? error.stack : String(error))
}

function prefixBlock(
  values: ReadonlyArray<Doc<never>>,
  prefix1: Doc<never>,
  prefix2: Doc<never>
): ReadonlyArray<Doc<never>> {
  if (isNonEmptyArray(values)) {
    const [head, tail] = headTail(values)
    const init = prefix1.cat(head)
    const rest = tail.map((value) => prefix2.cat(value))
    return [init, ...rest]
  }
  return []
}

function format(segment: Segment): ReadonlyArray<Doc<never>> {
  switch (segment._tag) {
    case "Failure": {
      return prefixBlock(segment.lines, box.horizontal.light, Doc.char(" "))
    }
    case "Parallel": {
      const spaces = Doc.spaces(2)
      const horizontalLines = box.horizontal.heavy.cat(box.horizontal.heavy)
      const verticalSeparator = spaces.cat(box.vertical.heavy)

      const junction = horizontalLines.cat(box.branch.down.heavy)
      const busTerminal = horizontalLines.cat(box.terminal.down.heavy)

      const fiberBus = Doc.hcat([...times(junction, segment.all.length - 1), busTerminal])
      const segments = segment.all.reduceRight(
        (acc, curr) => [
          ...prefixBlock(acc, verticalSeparator, verticalSeparator),
          ...prefixBlock(format(curr), spaces, spaces)
        ],
        [] as ReadonlyArray<Doc<never>>
      )

      return [fiberBus, ...segments]
    }
    case "Sequential": {
      return segment.all.flatMap((step) => [
        box.vertical.heavy,
        ...prefixBlock(format(step), box.branch.right.heavy, box.vertical.heavy),
        box.arrow.down
      ])
    }
  }
}

function linearSegments<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): SafeEval.SafeEval<ReadonlyArray<Step>> {
  realCause(cause)
  switch (cause._tag) {
    case "Then": {
      return pipe(
        SafeEval.suspend(() => linearSegments(cause.left, renderer)),
        SafeEval.zipWith(
          SafeEval.suspend(() => linearSegments(cause.right, renderer)),
          (left, right) => [...left, ...right]
        )
      )
    }
    default: {
      return pipe(
        causeToSequential(cause, renderer),
        SafeEval.map((sequential) => sequential.all)
      )
    }
  }
}

function parallelSegments<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): SafeEval.SafeEval<ReadonlyArray<Sequential>> {
  realCause(cause)
  switch (cause._tag) {
    case "Both": {
      return pipe(
        SafeEval.suspend(() => parallelSegments(cause.left, renderer)),
        SafeEval.zipWith(
          SafeEval.suspend(() => parallelSegments(cause.right, renderer)),
          (left, right) => [...left, ...right]
        )
      )
    }
    default: {
      return pipe(
        causeToSequential(cause, renderer),
        SafeEval.map((sequential) => [sequential])
      )
    }
  }
}

function causeToSequential<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): SafeEval.SafeEval<Sequential> {
  realCause(cause)
  switch (cause._tag) {
    case "Empty": {
      return SafeEval.succeed(Sequential([]))
    }
    case "Fail": {
      return SafeEval.succeed(
        renderFail(renderer.renderError(cause.value).map((line) => Doc.text(line)))
      )
    }
    case "Die": {
      return SafeEval.succeed(
        renderDie(renderer.renderUnknown(cause.value).map((line) => Doc.text(line)))
      )
    }
    case "Interrupt": {
      return SafeEval.succeed(
        renderInterrupt(cause.fiberId)
      )
    }
    case "Then": {
      return pipe(
        linearSegments(cause, renderer),
        SafeEval.map((segments) => Sequential(segments))
      )
    }
    case "Both": {
      return pipe(
        parallelSegments(cause, renderer),
        SafeEval.map((segments) => Sequential([Parallel(segments)]))
      )
    }
    case "Stackless": {
      // TODO: determine if this is correct for `Stackless` cause
      return SafeEval.suspend(() => causeToSequential(cause.cause, renderer))
    }
  }
}

function defaultErrorToLines(error: unknown) {
  return error instanceof Error ? renderError(error) : lines(renderToString(error))
}

export const defaultRenderer: Renderer = {
  lineWidth: 80,
  ribbonFraction: 1,
  renderError: defaultErrorToLines,
  renderUnknown: defaultErrorToLines
}

function prettyDocuments<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): SafeEval.SafeEval<ReadonlyArray<Doc<never>>> {
  return pipe(
    causeToSequential(cause, renderer),
    SafeEval.map((sequential) => {
      if (
        sequential.all.length === 1 &&
        sequential.all[0] &&
        sequential.all[0]._tag === "Failure"
      ) {
        return sequential.all[0].lines
      }
      const documents = format(sequential)
      return documents.length > 0 ? [box.branch.down.light, ...documents] : documents
    })
  )
}

function prettySafe<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): SafeEval.SafeEval<string> {
  return pipe(
    prettyDocuments(cause, renderer),
    SafeEval.map((docs) => {
      const document = Doc.lineBreak.cat(
        Doc.concatWith((x, y) => x.catWithLineBreak(y))(docs)
      ).optimize(FusionDepth.Deep)
      return renderPretty(renderer.lineWidth, renderer.ribbonFraction)(document)
    })
  )
}

/**
 * Returns a `String` with the cause pretty-printed.
 *
 * @tsplus static effect/core/io/Cause.Aspects pretty
 * @tsplus pipeable effect/core/io/Cause pretty
 */
export function pretty<E>(renderer: Renderer<E> = defaultRenderer) {
  return (self: Cause<E>): string => SafeEval.execute(prettySafe(self, renderer))
}
