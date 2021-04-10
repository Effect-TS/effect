// tracing: off

import type { Array } from "@effect-ts/core/Collections/Immutable/Array"
import * as A from "@effect-ts/core/Collections/Immutable/Array"
import { tuple } from "@effect-ts/core/Function"
import * as IO from "@effect-ts/core/IO"

import type { Doc } from "../../Core/Doc"
import type { DocStream } from "../../Core/DocStream"
import * as Layout from "../../Core/Layout"
import * as PageWidth from "../../Core/PageWidth"
import type { Style } from "../Style"
import * as S from "../Style"

// -----------------------------------------------------------------------------
// definition
// -----------------------------------------------------------------------------

export type AnsiDoc = Doc<Style>

// -----------------------------------------------------------------------------
// operations
// -----------------------------------------------------------------------------

function unsafePeek(stack: Array<Style>): Style {
  if (A.isEmpty(stack)) {
    throw new Error("bug, we ended up peeking at an empty stack!")
  }
  return stack[0] as any
}

function unsafePop(stack: Array<Style>): readonly [Style, Array<Style>] {
  if (A.isEmpty(stack)) {
    throw new Error("bug, we ended up with an empty stack to pop from!")
  }
  return tuple<readonly [Style, Array<Style>]>(stack[0] as any, stack.slice(1))
}

function renderRec(stack: Array<Style>, x: DocStream<Style>): IO.IO<string> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "FailedStream":
        throw new Error("bug, we ended up with a failed stream in render!")
      case "EmptyStream":
        return ""
      case "CharStream": {
        const rest = yield* _(renderRec(stack, x.stream))
        return x.char + rest
      }
      case "TextStream": {
        const rest = yield* _(renderRec(stack, x.stream))
        return x.text + rest
      }
      case "LineStream": {
        let indent = "\n"
        for (let i = 0; i < x.indentation; i++) {
          indent = indent += " "
        }
        const rest = yield* _(renderRec(stack, x.stream))
        return indent + rest
      }
      case "PushAnnotationStream": {
        const currentStyle = unsafePeek(stack)
        const nextStyle = S.Identity.combine(x.annotation, currentStyle)
        const rest = yield* _(renderRec(A.cons_(stack, x.annotation), x.stream))
        return S.Show.show(nextStyle) + rest
      }
      case "PopAnnotationStream": {
        const [, styles] = unsafePop(stack)
        const nextStyle = unsafePeek(styles)
        const rest = yield* _(renderRec(styles, x.stream))
        return S.Show.show(nextStyle) + rest
      }
    }
  })
}

// -----------------------------------------------------------------------------
// rendering algorithms
// -----------------------------------------------------------------------------

export function render(stream: DocStream<Style>): string {
  return IO.run(renderRec(A.single(S.Identity.identity), stream))
}

export function renderPretty_(
  doc: AnsiDoc,
  lineWidth: number,
  ribbonFraction = 1
): string {
  return render(
    Layout.pretty_(
      Layout.layoutOptions(PageWidth.availablePerLine(lineWidth, ribbonFraction)),
      doc
    )
  )
}

/**
 * @dataFirst renderPretty_
 */
export function renderPretty(lineWidth: number, ribbonFraction = 1) {
  return (doc: AnsiDoc): string => renderPretty_(doc, lineWidth, ribbonFraction)
}

export function renderPrettyDefault(doc: AnsiDoc): string {
  return render(Layout.pretty_(Layout.defaultLayoutOptions, doc))
}

export function renderPrettyUnbounded(doc: AnsiDoc): string {
  return render(Layout.pretty_(Layout.layoutOptions(PageWidth.unbounded), doc))
}

export function renderSmart_(
  doc: AnsiDoc,
  lineWidth: number,
  ribbonFraction = 1
): string {
  return render(
    Layout.smart_(
      Layout.layoutOptions(PageWidth.availablePerLine(lineWidth, ribbonFraction)),
      doc
    )
  )
}

/**
 * @dataFirst renderSmart_
 */
export function renderSmart(lineWidth: number, ribbonFraction = 1) {
  return (doc: AnsiDoc): string => renderSmart_(doc, lineWidth, ribbonFraction)
}

export function renderSmartDefault(doc: AnsiDoc): string {
  return render(Layout.smart_(Layout.defaultLayoutOptions, doc))
}

export function renderSmartUnbounded(doc: AnsiDoc): string {
  return render(Layout.smart_(Layout.layoutOptions(PageWidth.unbounded), doc))
}

export function renderCompact(doc: AnsiDoc): string {
  return render(Layout.compact(doc))
}
