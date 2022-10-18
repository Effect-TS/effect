import type { StackAnnotation } from "@effect/core/io/Cause/definition"
import { isStackAnnotation, realCause } from "@effect/core/io/Cause/definition"
import { runtimeDebug } from "@effect/core/io/Debug"
import { isSpan } from "@effect/core/io/SpanTracer"
import { Doc } from "@effect/printer/Doc"
import { FusionDepth } from "@effect/printer/Optimize"
import { renderPretty } from "@effect/printer/Render"

export interface Renderer<E = unknown> {
  readonly lineWidth: number
  readonly ribbonFraction: number
  readonly renderSpan: boolean
  readonly renderExecution: boolean
  readonly renderStack: boolean
  readonly renderSpanDepth: number
  readonly renderExecutionDepth: number
  readonly renderStackDepth: number
  readonly renderError: (error: E) => string[]
  readonly renderUnknown: (error: unknown) => string[]
}

export type Segment = Sequential | Parallel | Failure

export type Step = Parallel | Failure

export interface Failure {
  readonly _tag: "Failure"
  readonly lines: ReadonlyArray<Doc<never>>
}

export interface Parallel {
  readonly _tag: "Parallel"
  readonly all: ReadonlyArray<Sequential>
}

export interface Sequential {
  readonly _tag: "Sequential"
  readonly all: ReadonlyArray<Step>
}

export function Failure(lines: ReadonlyArray<Doc<never>>): Failure {
  return {
    _tag: "Failure",
    lines
  }
}

export function Sequential(all: ReadonlyArray<Step>): Sequential {
  return {
    _tag: "Sequential",
    all
  }
}

export function Parallel(all: ReadonlyArray<Sequential>): Parallel {
  return {
    _tag: "Parallel",
    all
  }
}

interface NonEmptyReadonlyArray<A> extends ReadonlyArray<A> {
  readonly 0: A
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

function spanToLines(span: Span, renderer: Renderer<any>): ReadonlyArray<Doc<never>> {
  const lines: Doc<never>[] = []
  let current = Maybe.some(span)
  while (current.isSome() && lines.length < renderer.renderSpanDepth) {
    if (current.value.trace) {
      lines.push(Doc.text(`${current.value.name} @ ${current.value.trace}`))
    } else {
      lines.push(Doc.text(`${current.value.name}`))
    }
    current = current.value.parent
  }
  return lines
}

function stackToLines(stack: StackAnnotation, renderer: Renderer<any>): ReadonlyArray<Doc<never>> {
  const lines: Doc<never>[] = []
  let current = Maybe.fromNullable(stack.stack)
  while (current.isSome() && lines.length < renderer.renderStackDepth) {
    switch (current.value.value._tag) {
      case "OnSuccess":
      case "OnFailure":
      case "OnSuccessAndFailure": {
        if (current.value.value.trace) {
          lines.push(Doc.text(current.value.value.trace))
        }
        break
      }
    }
    current = Maybe.fromNullable(current.value?.previous)
  }
  return lines
}

function renderSpan(span: Maybe<Span>, renderer: Renderer<any>): ReadonlyArray<Doc<never>> {
  if (!renderer.renderSpan || span.isNone()) {
    return []
  }
  const lines = spanToLines(span.value, renderer)
  return lines.length === 0 ? [] : [
    Doc.text("Span:"),
    Doc.empty,
    ...lines,
    Doc.empty
  ]
}

function renderStack(
  span: Maybe<StackAnnotation>,
  renderer: Renderer<any>
): ReadonlyArray<Doc<never>> {
  if (!renderer.renderStack || span.isNone()) {
    return []
  }
  const lines = stackToLines(span.value, renderer)
  return lines.length === 0 ? [] : [
    Doc.text("Stack:"),
    Doc.empty,
    ...lines,
    Doc.empty
  ]
}

function renderExecution(
  span: Maybe<StackAnnotation>,
  renderer: Renderer<any>
): ReadonlyArray<Doc<never>> {
  if (!renderer.renderExecution || span.isNone()) {
    return []
  }
  if (span.value.execution && span.value.execution.isNonEmpty) {
    return [
      Doc.text("Execution:"),
      Doc.empty,
      ...span.value.execution.take(renderer.renderExecutionDepth).map((line) => Doc.text(line)),
      Doc.empty
    ]
  }
  return []
}

function renderFail(
  error: ReadonlyArray<Doc<never>>,
  span: Maybe<Span>,
  stack: Maybe<StackAnnotation>,
  renderer: Renderer<any>
): Sequential {
  return Sequential([
    Failure([
      Doc.text("A checked error was not handled."),
      Doc.empty,
      ...error,
      Doc.empty,
      ...renderSpan(span, renderer),
      ...renderStack(stack, renderer),
      ...renderExecution(stack, renderer)
    ])
  ])
}

function renderDie(
  error: ReadonlyArray<Doc<never>>,
  span: Maybe<Span>,
  stack: Maybe<StackAnnotation>,
  renderer: Renderer<any>
): Sequential {
  return Sequential([
    Failure([
      Doc.text("An unchecked error was produced."),
      Doc.empty,
      ...error,
      Doc.empty,
      ...renderSpan(span, renderer),
      ...renderStack(stack, renderer),
      ...renderExecution(stack, renderer)
    ])
  ])
}

function renderInterrupt(
  fiberId: FiberId,
  span: Maybe<Span>,
  stack: Maybe<StackAnnotation>,
  renderer: Renderer<any>
): Sequential {
  const ids = Array.from(fiberId.ids).map((id) => `#${id}`).join(", ")
  return Sequential([
    Failure([
      Doc.text(`An interrupt was produced by ${ids}.`),
      Doc.empty,
      ...renderSpan(span, renderer),
      ...renderStack(stack, renderer),
      ...renderExecution(stack, renderer)
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
    const init = Doc.cat(prefix1, head)
    const rest = tail.map((value) => Doc.cat(prefix2, value))
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
      const horizontalLines = Doc.cat(box.horizontal.heavy, box.horizontal.heavy)
      const verticalSeparator = Doc.cat(spaces, box.vertical.heavy)

      const junction = Doc.cat(horizontalLines, box.branch.down.heavy)
      const busTerminal = Doc.cat(horizontalLines, box.terminal.down.heavy)

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
  renderer: Renderer<E>,
  span: Maybe<Span>,
  stack: Maybe<StackAnnotation>
): Eval<ReadonlyArray<Step>> {
  realCause(cause)
  switch (cause._tag) {
    case "Then": {
      return linearSegments(cause.left, renderer, span, stack).zipWith(
        linearSegments(cause.right, renderer, span, stack),
        (left, right) => [...left, ...right]
      )
    }
    default: {
      return causeToSequential(cause, renderer, span, stack).map((sequential) => sequential.all)
    }
  }
}

function parallelSegments<E>(
  cause: Cause<E>,
  renderer: Renderer<E>,
  span: Maybe<Span>,
  stack: Maybe<StackAnnotation>
): Eval<ReadonlyArray<Sequential>> {
  realCause(cause)
  switch (cause._tag) {
    case "Both": {
      return parallelSegments(cause.left, renderer, span, stack).zipWith(
        parallelSegments(cause.right, renderer, span, stack),
        (left, right) => [...left, ...right]
      )
    }
    default: {
      return causeToSequential(cause, renderer, span, stack).map((sequential) => [sequential])
    }
  }
}

function causeToSequential<E>(
  cause: Cause<E>,
  renderer: Renderer<E>,
  span: Maybe<Span>,
  stack: Maybe<StackAnnotation>
): Eval<Sequential> {
  realCause(cause)
  switch (cause._tag) {
    case "Empty": {
      return Eval.succeed(Sequential([]))
    }
    case "Fail": {
      return Eval.succeed(
        renderFail(
          renderer.renderError(cause.value).map((line) => Doc.text(line)),
          span,
          stack,
          renderer
        )
      )
    }
    case "Die": {
      return Eval.succeed(
        renderDie(
          renderer.renderUnknown(cause.value).map((line) => Doc.text(line)),
          span,
          stack,
          renderer
        )
      )
    }
    case "Interrupt": {
      return Eval.succeed(
        renderInterrupt(cause.fiberId, span, stack, renderer)
      )
    }
    case "Then": {
      return linearSegments(cause, renderer, span, stack)
        .map((segments) => Sequential(segments))
    }
    case "Both": {
      return parallelSegments(cause, renderer, span, stack)
        .map((segments) => Sequential([Parallel(segments)]))
    }
    case "Annotated": {
      if (isSpan(cause.annotation)) {
        return Eval.suspend(
          causeToSequential(cause.cause, renderer, Maybe.some(cause.annotation), stack)
        )
      }
      if (isStackAnnotation(cause.annotation)) {
        return Eval.suspend(
          causeToSequential(cause.cause, renderer, span, Maybe.some(cause.annotation))
        )
      }
      return Eval.suspend(causeToSequential(cause.cause, renderer, span, stack))
    }
  }
}

function defaultErrorToLines(error: unknown) {
  return error instanceof Error ? renderError(error) : lines(renderToString(error))
}

export const defaultRenderer: Renderer = {
  lineWidth: 80,
  ribbonFraction: 1,
  renderSpan: runtimeDebug.traceSpanEnabledInCause,
  renderStack: runtimeDebug.traceStackEnabledInCause,
  renderExecution: runtimeDebug.traceExecutionEnabledInCause,
  renderSpanDepth: runtimeDebug.traceSpanLimit,
  renderStackDepth: runtimeDebug.traceStackLimit,
  renderExecutionDepth: runtimeDebug.traceExecutionLimit,
  renderError: defaultErrorToLines,
  renderUnknown: defaultErrorToLines
}

function prettyDocuments<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): Eval<ReadonlyArray<Doc<never>>> {
  return causeToSequential(cause, renderer, Maybe.none, Maybe.none).map((sequential) => {
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
}

function prettySafe<E>(
  cause: Cause<E>,
  renderer: Renderer<E>
): Eval<string> {
  return prettyDocuments(cause, renderer).map((docs) => {
    const document = Doc.cat(
      Doc.lineBreak,
      Doc.concatWith(docs, (x, y) => x.appendWithLineBreak(y))
    ).optimize(FusionDepth.Deep)
    return renderPretty(renderer.lineWidth, renderer.ribbonFraction)(document)
  })
}

/**
 * Returns a `String` with the cause pretty-printed.
 *
 * @tsplus static effect/core/io/Cause.Aspects pretty
 * @tsplus pipeable effect/core/io/Cause pretty
 */
export function pretty<E>(renderer: Renderer<E> = defaultRenderer) {
  return (self: Cause<E>): string => prettySafe(self, renderer).run
}
