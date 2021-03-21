// tracing: off

import * as IO from "@effect-ts/core/IO"

import type { Doc } from "../Doc"
import type { DocStream } from "../DocStream"
import type { LayoutOptions } from "../Layout"
import * as Layout from "../Layout"

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
        for (let i = 1; i < x.indentation; i++) {
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
// operations
// -------------------------------------------------------------------------------------

export function render<A>(stream: DocStream<A>): string {
  return IO.run(renderRec(stream))
}

export function renderPretty_<A>(doc: Doc<A>, options: LayoutOptions): string {
  return render(Layout.pretty_(options, doc))
}

/**
 * @dataFirst renderPretty_
 */
export function renderPretty(options: LayoutOptions) {
  return <A>(doc: Doc<A>): string => renderPretty_(doc, options)
}

export function renderPrettyDefault<A>(doc: Doc<A>): string {
  return render(Layout.pretty_(Layout.defaultLayoutOptions, doc))
}

export function renderSmart_<A>(doc: Doc<A>, options: LayoutOptions) {
  return render(Layout.smart_(options, doc))
}

/**
 * @dataFirst renderSmart_
 */
export function renderSmart(options: LayoutOptions) {
  return <A>(doc: Doc<A>): string => renderSmart_(doc, options)
}

export function renderSmartDefault<A>(doc: Doc<A>): string {
  return render(Layout.smart_(Layout.defaultLayoutOptions, doc))
}
