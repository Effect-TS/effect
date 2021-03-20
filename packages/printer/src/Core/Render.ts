// tracing: off

import * as A from "@effect-ts/core/Array"
import { absurd, pipe } from "@effect-ts/core/Function"
import * as Ident from "@effect-ts/core/Identity"
import * as Sy from "@effect-ts/core/Sync"

import type { DocStream } from "./DocStream"

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

const foldS = Ident.fold(Ident.string)

export const renderS = <A>(stream: DocStream<A>): string => {
  const go = (x: DocStream<A>): Sy.UIO<string> =>
    Sy.gen(function* (_) {
      switch (x._tag) {
        case "Failed":
          return absurd<string>(x as never)
        case "EmptyStream":
          return Ident.string.identity
        case "CharStream": {
          const rest = yield* _(go(x.stream))
          return foldS([x.char, rest])
        }
        case "TextStream": {
          const rest = yield* _(go(x.stream))
          return foldS([x.text, rest])
        }
        case "LineStream": {
          const indent = pipe(x.indentation, A.replicate(" "), A.cons("\n"), foldS)
          const rest = yield* _(go(x.stream))
          return foldS([indent, rest])
        }
        case "PushAnnotation":
          return yield* _(go(x.stream))
        case "PopAnnotation":
          return yield* _(go(x.stream))
        default:
          return absurd(x)
      }
    })
  return Sy.run(go(stream))
}
