// tracing: off

import * as IO from "@effect-ts/core/IO"

import type { DocStream } from "../DocStream"

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export const render = <A>(stream: DocStream<A>): string => {
  const go = (x: DocStream<A>): IO.IO<string> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "FailedStream":
          throw new Error("bug, we ended up with a failed in render!")
        case "EmptyStream":
          return ""
        case "CharStream": {
          const rest = yield* _(go(x.stream))
          return x.char + rest
        }
        case "TextStream": {
          const rest = yield* _(go(x.stream))
          return x.text + rest
        }
        case "LineStream": {
          let indent = "\n"
          for (let i = 1; i < x.indentation; i++) {
            indent = indent += " "
          }
          const rest = yield* _(go(x.stream))
          return indent + rest
        }
        case "PushAnnotationStream":
          return yield* _(go(x.stream))
        case "PopAnnotationStream":
          return yield* _(go(x.stream))
      }
    })
  return IO.run(go(stream))
}
