import { pipe } from "@fp-ts/data/Function"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import type * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as UE from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import type { Schema } from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

export const property = <A>(schema: Schema<A>) => {
  const arbitrary = A.arbitraryFor(schema)
  const guard = G.guardFor(schema)
  const decoder = D.decoderFor(schema)
  const encoder = UE.encoderFor(schema)
  fc.assert(fc.property(arbitrary.arbitrary(fc), (a) => {
    if (!guard.is(a)) {
      return false
    }
    const roundtrip = decoder.decode(encoder.encode(a))
    if (D.isFailure(roundtrip)) {
      return false
    }
    return guard.is(roundtrip.right)
  }))
}

export const expectSuccess = <I, A>(decoder: D.Decoder<I, A>, i: I) => {
  const t = decoder.decode(i)
  expect(T.isRight(t)).toEqual(true)
  expect(t).toEqual(T.right(i))
}

export const expectFailure = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string) => {
  const t = pipe(decoder.decode(i), T.mapLeft(formatAll))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectWarning = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string, a: A) => {
  const t = pipe(decoder.decode(i), T.mapLeft(formatAll))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, a))
}

const formatAll = (errors: NonEmptyReadonlyArray<DE.DecodeError>): string => {
  return pipe(errors, RA.map(format), RA.join(", "))
}

const stringify = (actual: unknown): string => {
  if (typeof actual === "number") {
    return Number.isNaN(actual) ? "NaN" : String(actual)
  }
  return JSON.stringify(actual)
}

const format = (e: DE.DecodeError): string => {
  switch (e._tag) {
    case "Meta":
      return `${JSON.stringify(e.actual)} did not satisfy ${JSON.stringify(e.meta)}`
    case "Type":
      return `${JSON.stringify(e.actual)} did not satisfy is(${e.expected})`
    case "Refinement":
      return `${stringify(e.actual)} did not satisfy refinement(${JSON.stringify(e.meta)})`
    case "Parse":
      return `${JSON.stringify(e.actual)} did not satisfy parsing from (${e.from}) to (${e.to})`
    case "Equal":
      return `${JSON.stringify(e.actual)} did not satisfy isEqual(${String(e.expected)})`
    case "Enums":
      return `${JSON.stringify(e.actual)} did not satisfy isEnum(${JSON.stringify(e.enums)})`
    case "Index":
      return `/${e.index} ${pipe(e.errors, RA.map(format), RA.join(", "))}`
    case "Key":
      return `/${String(e.key)} ${pipe(e.errors, RA.map(format), RA.join(", "))}`
    case "Missing":
      return `did not satisfy is(required)`
    case "UnexpectedKey":
      return `/${String(e.key)} key is unexpected`
    case "UnexpectedIndex":
      return `/${String(e.index)} index is unexpected`
    case "Member":
      return `member: ${pipe(e.errors, RA.map(format), RA.join(", "))}`
  }
}

type Forest<A> = Array<Tree<A>>

export interface Tree<A> {
  value: A
  forest: Forest<A>
}

function make<A>(value: A, forest: Forest<A> = []): Tree<A> {
  return {
    value,
    forest
  }
}

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

function drawForest(forest: Forest<string>): string {
  return draw("\n", forest)
}

function drawTree(tree: Tree<string>): string {
  return tree.value + drawForest(tree.forest)
}

const toTree = (errors: NonEmptyReadonlyArray<DE.DecodeError>): Tree<string> => {
  return make(`${errors.length} error(s) found`, errors.map(go))
}

const go = (e: DE.DecodeError): Tree<string> => {
  switch (e._tag) {
    case "Meta":
      return make(`${JSON.stringify(e.actual)} did not satisfy ${JSON.stringify(e.meta)}`)
    case "Type":
      return make(`${JSON.stringify(e.actual)} did not satisfy is(${e.expected})`)
    case "Refinement":
      return make(
        `${JSON.stringify(e.actual)} did not satisfy refinement(${JSON.stringify(e.meta)})`
      )
    case "Parse":
      return make(
        `${JSON.stringify(e.actual)} did not satisfy parsing from (${e.from}) to (${e.to})`
      )
    case "Equal":
      return make(
        `${JSON.stringify(e.actual)} did not satisfy isEqual(${JSON.stringify(e.expected)})`
      )
    case "Enums":
      return make(`${JSON.stringify(e.actual)} did not satisfy isEnum(${JSON.stringify(e.enums)})`)
    case "Index":
      return make(`index ${e.index}`, e.errors.map(go))
    case "UnexpectedIndex":
      return make(`${String(e.index)} index is unexpected`)
    case "Key":
      return make(`key ${String(e.key)}`, e.errors.map(go))
    case "Missing":
      return make(`did not satisfy not(isNaN)`)
    case "UnexpectedKey":
      return make(`${String(e.key)} key is unexpected`)
    case "Member":
      return make(`union member`, e.errors.map(go))
  }
}

const formatTree = (errors: NonEmptyReadonlyArray<DE.DecodeError>): string => {
  return drawTree(toTree(errors))
}

export const expectFailureTree = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string) => {
  const t = pipe(decoder.decode(i), T.mapLeft(formatTree))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectWarningTree = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string, a: A) => {
  const t = pipe(decoder.decode(i), T.mapLeft(formatTree))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, a))
}
