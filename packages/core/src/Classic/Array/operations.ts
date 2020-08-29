import * as A from "@effect-ts/system/Array"
import { flow, pipe } from "@effect-ts/system/Function"

import type { ArrayURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"

export * from "@effect-ts/system/Array"

export const foreachWithIndexF = P.implementForeachWithIndexF<[ArrayURI]>()(
  (_) => (G) => (f) =>
    A.reduceWithIndex(DSL.succeedF(G)([] as typeof _.B[]), (k, b, a) =>
      pipe(
        b,
        G.both(f(k, a)),
        G.map(([x, y]) => {
          x.push(y)
          return x
        })
      )
    )
)

export const foreachF = P.implementForeachF<[ArrayURI]>()((_) => (G) => (f) =>
  foreachWithIndexF(G)((_, a) => f(a))
)

export const separateF = P.implementSeparateF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.separate))
)

export const compactF = P.implementCompactF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.compact))
)

export const compactWithIndexF = P.implementCompactWithIndexF<
  [ArrayURI]
>()((_) => (G) => (f) => flow(foreachWithIndexF(G)(f), G.map(A.compact)))
