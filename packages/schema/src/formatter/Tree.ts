/**
 * @since 1.0.0
 */

import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import type * as DE from "@fp-ts/schema/ParseError"

/**
 * @since 1.0.0
 */
export interface Forest<A> extends ReadonlyArray<Tree<A>> {}

/**
 * @since 1.0.0
 */
export interface Tree<A> {
  value: A
  forest: Forest<A>
}

/**
 * @since 1.0.0
 */
export const make = <A>(value: A, forest: Forest<A> = []): Tree<A> => ({
  value,
  forest
})

/**
 * @since 1.0.0
 */
export const format = (errors: NonEmptyReadonlyArray<DE.ParseError>): string =>
  drawTree(make(`${errors.length} error(s) found`, errors.map(go)))

const drawTree = (tree: Tree<string>): string => tree.value + draw("\n", tree.forest)

const draw = (indentation: string, forest: Forest<string>): string => {
  let r = ""
  const len = forest.length
  let tree: Tree<string>
  for (let i = 0; i < len; i++) {
    tree = forest[i]
    const isLast = i === len - 1
    r += indentation + (isLast ? "└" : "├") + "─ " + tree.value
    r += draw(indentation + (len > 1 && !isLast ? "│  " : "   "), tree.forest)
  }
  return r
}

/**
 * @since 1.0.0
 */
export const stringify = (actual: unknown): string => {
  if (typeof actual === "number") {
    return Number.isNaN(actual) ? "NaN" : String(actual)
  }
  if (typeof actual === "symbol") {
    return String(actual)
  }
  if (actual === undefined) {
    return "undefined"
  }
  if (actual === null) {
    return "null"
  }
  if (actual instanceof Set) {
    return `Set([${stringify(Array.from(actual.values()))}])`
  }
  if (actual instanceof Map) {
    return `Map([${stringify(Array.from(actual.entries()))}])`
  }
  try {
    return JSON.stringify(actual, (_, value) => typeof value === "function" ? value.name : value)
  } catch (e) {
    return String(actual)
  }
}

const go = (e: DE.ParseError): Tree<string> => {
  switch (e._tag) {
    case "Meta":
      return make(`${stringify(e.actual)} did not satisfy ${stringify(e.meta)}`)
    case "Type":
      return make(`${stringify(e.actual)} did not satisfy is(${e.expected})`)
    case "Refinement":
      return make(
        `${stringify(e.actual)} did not satisfy refinement(${stringify(e.meta)})`
      )
    case "Transform":
      return make(
        `${stringify(e.actual)} did not satisfy parsing from (${e.from}) to (${e.to})`
      )
    case "Equal":
      return make(
        `${stringify(e.actual)} did not satisfy isEqual(${stringify(e.expected)})`
      )
    case "Enums":
      return make(`${stringify(e.actual)} did not satisfy isEnum(${stringify(e.enums)})`)
    case "Index":
      return make(`index ${e.index}`, e.errors.map(go))
    case "Unexpected":
      return make(`is unexpected`)
    case "Key":
      return make(`key ${stringify(e.key)}`, e.errors.map(go))
    case "Missing":
      return make(`is missing`)
    case "Member":
      return make(`union member`, e.errors.map(go))
  }
}
