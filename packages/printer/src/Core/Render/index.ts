// tracing: off

import * as IO from "@effect-ts/core/IO"

import type { Doc } from "../Doc"
import type { DocStream } from "../DocStream"
import * as Layout from "../Layout"
import * as PageWidth from "../PageWidth"

function renderRec<A>(x: DocStream<A>): IO.IO<string> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "FailedStream":
        throw new Error("bug, we ended up with a failed in render!")
      case "EmptyStream":
        return ""
      case "CharStream": {
        const rest = yield* _(renderRec(x.stream))
        return x.char + rest
      }
      case "TextStream": {
        const rest = yield* _(renderRec(x.stream))
        return x.text + rest
      }
      case "LineStream": {
        let indent = "\n"
        for (let i = 0; i < x.indentation; i++) {
          indent = indent += " "
        }
        const rest = yield* _(renderRec(x.stream))
        return indent + rest
      }
      case "PushAnnotationStream":
        return yield* _(renderRec(x.stream))
      case "PopAnnotationStream":
        return yield* _(renderRec(x.stream))
    }
  })
}

// -------------------------------------------------------------------------------------
// rendering algorithms
// -------------------------------------------------------------------------------------

export function render<A>(stream: DocStream<A>): string {
  return IO.run(renderRec(stream))
}

export function renderPretty_<A>(
  doc: Doc<A>,
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
  return <A>(doc: Doc<A>): string => renderPretty_(doc, lineWidth, ribbonFraction)
}

export function renderPrettyDefault<A>(doc: Doc<A>): string {
  return render(Layout.pretty_(Layout.defaultLayoutOptions, doc))
}

export function renderPrettyUnbounded<A>(doc: Doc<A>): string {
  return render(Layout.pretty_(Layout.layoutOptions(PageWidth.unbounded), doc))
}

export function renderSmart_<A>(
  doc: Doc<A>,
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
  return <A>(doc: Doc<A>): string => renderSmart_(doc, lineWidth, ribbonFraction)
}

export function renderSmartDefault<A>(doc: Doc<A>): string {
  return render(Layout.smart_(Layout.defaultLayoutOptions, doc))
}

export function renderSmartUnbounded<A>(doc: Doc<A>): string {
  return render(Layout.smart_(Layout.layoutOptions(PageWidth.unbounded), doc))
}

export function renderCompact<A>(doc: Doc<A>): string {
  return render(Layout.compact(doc))
}
