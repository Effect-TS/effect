// ported from https://github.com/gcanti/io-ts/blob/master/src/DecodeError.ts
import * as FA from "../../FreeAssociative"

import * as DE from "./errorNode"

import * as E from "@matechs/preview/Either"
import { pipe } from "@matechs/preview/Function"

export type DecodeError = FA.FreeAssociative<DE.ErrorNode<string>>

interface Tree<A> {
  readonly value: A
  readonly forest: ReadonlyArray<Tree<A>>
}

const empty: Array<never> = []

const make = <A>(value: A, forest: ReadonlyArray<Tree<A>> = empty): Tree<A> => ({
  value,
  forest
})

const drawTree = (tree: Tree<string>): string =>
  tree.value + drawForest("\n", tree.forest)

const drawForest = (
  indentation: string,
  forest: ReadonlyArray<Tree<string>>
): string => {
  let r = ""
  const len = forest.length
  let tree: Tree<string>
  for (let i = 0; i < len; i++) {
    tree = forest[i]
    const isLast = i === len - 1
    r += indentation + (isLast ? "└" : "├") + "─ " + tree.value
    r += drawForest(indentation + (len > 1 && !isLast ? "│  " : "   "), tree.forest)
  }
  return r
}

const toTree: (e: DE.ErrorNode<string>) => Tree<string> = DE.fold({
  Leaf: (input, error) =>
    make(`cannot decode ${JSON.stringify(input)}, should be ${error}`),
  Key: (key, kind, errors) =>
    make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
  Index: (index, kind, errors) => make(`${kind} index ${index}`, toForest(errors)),
  Member: (index, errors) => make(`member ${index}`, toForest(errors)),
  Lazy: (id, errors) => make(`lazy type ${id}`, toForest(errors)),
  Wrap: (error, errors) => make(error, toForest(errors))
})

const toForest = (e: DecodeError): ReadonlyArray<Tree<string>> =>
  pipe(
    e,
    FA.fold(
      (value) => [toTree(value)],
      (right) => (left) => toForest(left).concat(toForest(right))
    )
  )

export const draw = (e: DecodeError): string => toForest(e).map(drawTree).join("\n")

export const stringify: <A>(e: E.Either<DecodeError, A>) => string = E.fold(draw, (a) =>
  JSON.stringify(a, null, 2)
)

export function error(actual: unknown, message: string) {
  return FA.of(DE.leaf(actual, message))
}
