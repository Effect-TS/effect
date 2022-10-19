import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as SafeEval from "@fp-ts/data/SafeEval"

// -----------------------------------------------------------------------------
// Rendering Algorithms
// -----------------------------------------------------------------------------

/** @internal */
export function renderAnsi(self: DocStream<AnsiStyle>): string {
  return SafeEval.execute(renderSafe(self, List.make(AnsiStyle.Monoid.empty)))
}

function unsafePeek(stack: List.List<AnsiStyle>): AnsiStyle {
  if (List.isNil(stack)) {
    throw new Error("bug, we ended up peeking at an empty stack!")
  }
  return stack.head
}

function unsafePop(stack: List.List<AnsiStyle>): readonly [AnsiStyle, List.List<AnsiStyle>] {
  if (List.isNil(stack)) {
    throw new Error("bug, we ended up with an empty stack to pop from!")
  }
  return [stack.head, stack.tail]
}

function renderSafe(self: DocStream<AnsiStyle>, stack: List.List<AnsiStyle>): SafeEval.SafeEval<string> {
  switch (self._tag) {
    case "FailedStream": {
      throw new Error("bug, we ended up with a failed stream in render!")
    }
    case "EmptyStream": {
      return SafeEval.succeed("")
    }
    case "CharStream": {
      return pipe(
        SafeEval.suspend(() => renderSafe(self.stream, stack)),
        SafeEval.map((rest) => self.char + rest)
      )
    }
    case "TextStream": {
      return pipe(
        SafeEval.suspend(() => renderSafe(self.stream, stack)),
        SafeEval.map((rest) => self.text + rest)
      )
    }
    case "LineStream": {
      let indent = "\n"
      for (let i = 0; i < self.indentation; i++) {
        indent = indent += " "
      }
      return pipe(
        SafeEval.suspend(() => renderSafe(self.stream, stack)),
        SafeEval.map((rest) => indent + rest)
      )
    }
    case "PushAnnotationStream": {
      const currentStyle = unsafePeek(stack)
      const nextStyle = AnsiStyle.Monoid.combine(currentStyle)(self.annotation)
      return pipe(
        SafeEval.suspend(() => renderSafe(self.stream, List.cons(self.annotation, stack))),
        SafeEval.map((rest) => nextStyle.stringify + rest)
      )
    }
    case "PopAnnotationStream": {
      const [, styles] = unsafePop(stack)
      const nextStyle = unsafePeek(styles)
      return pipe(
        SafeEval.suspend(() => renderSafe(self.stream, styles)),
        SafeEval.map((rest) => nextStyle.stringify + rest)
      )
    }
  }
}

/** @internal */
export function renderCompactAnsi(self: AnsiDoc): string {
  return renderAnsi(self.layoutCompact)
}

/** @internal */
export function renderPrettyAnsi(lineWidth: number, ribbonFraction = 1) {
  return (self: AnsiDoc): string =>
    renderAnsi(
      self.layoutPretty(
        Layout.Options(PageWidth.AvailablePerLine(lineWidth, ribbonFraction))
      )
    )
}

/** @internal */
export function renderPrettyAnsiDefault(self: AnsiDoc): string {
  return renderAnsi(self.layoutPretty(Layout.Options.default))
}

/** @internal */
export function renderPrettyAnsiUnbounded(self: AnsiDoc): string {
  return renderAnsi(self.layoutPretty(Layout.Options(PageWidth.Unbounded)))
}

/** @internal */
export function renderSmartAnsi(lineWidth: number, ribbonFraction = 1) {
  return (self: AnsiDoc): string =>
    renderAnsi(
      self.layoutSmart(
        Layout.Options(PageWidth.AvailablePerLine(lineWidth, ribbonFraction))
      )
    )
}

/** @internal */
export function renderSmartAnsiDefault(self: AnsiDoc): string {
  return renderAnsi(self.layoutSmart(Layout.Options.default))
}

/** @internal */
export function renderSmartAnsiUnbounded(self: AnsiDoc): string {
  return renderAnsi(self.layoutSmart(Layout.Options(PageWidth.Unbounded)))
}
