// tracing: off

import * as A from "@effect-ts/core/Array"
import { absurd, pipe } from "@effect-ts/core/Function"
import * as Ident from "@effect-ts/core/Identity"
import * as IO from "@effect-ts/core/IO"

import type { DocStream } from "./DocStream"

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

const fold = Ident.fold(Ident.string)

export const render = <A>(stream: DocStream<A>): string => {
  const go = (x: DocStream<A>): IO.IO<string> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "Failed":
          return absurd<string>(x as never)
        case "EmptyStream":
          return Ident.string.identity
        case "CharStream": {
          const rest = yield* _(go(x.stream))
          return fold([x.char, rest])
        }
        case "TextStream": {
          const rest = yield* _(go(x.stream))
          return fold([x.text, rest])
        }
        case "LineStream": {
          const indent = pipe(x.indentation, A.replicate(" "), A.cons("\n"), fold)
          const rest = yield* _(go(x.stream))
          return fold([indent, rest])
        }
        case "PushAnnotation":
          return yield* _(go(x.stream))
        case "PopAnnotation":
          return yield* _(go(x.stream))
        default:
          return absurd(x)
      }
    })
  return IO.run(go(stream))
}
