// tracing: off

// based on the work of Giulio Canti in io-ts (3.x poc stage)

import { flow } from "@effect-ts/core/Function"
import { Case } from "@effect-ts/system/Case"
import * as Chunk from "@effect-ts/system/Collections/Immutable/Chunk"

export interface Actual<A> {
  readonly actual: A
}

export interface SingleE<E> {
  readonly error: E
}

export interface CompoundE<E> {
  readonly errors: Chunk.Chunk<E>
}

export type SchemaError<E> =
  | LeafE<E>
  | RefinementE<SchemaError<E>>
  | RequiredKeyE<PropertyKey, SchemaError<E>>
  | OptionalKeyE<PropertyKey, SchemaError<E>>
  | StructE<SchemaError<E>>
  | PrevE<SchemaError<E>>
  | NextE<SchemaError<E>>
  | CompositionE<SchemaError<E>>
  | MissingKeysE<PropertyKey>
  | OptionalIndexE<number, SchemaError<E>>
  | CollectionE<SchemaError<E>>
  | NamedE<string, SchemaError<E>>
  | IntersectionE<SchemaError<E>>
  | UnionE<SchemaError<E>>
  | MemberE<string | number, SchemaError<E>>

export interface LeafErrors {
  ParseStringE: ParseStringE
  ParseNumberE: ParseNumberE
  ParseObjectE: ParseObjectE
  ParseDateE: ParseDateE
  ParseDateMsE: ParseDateMsE
  InvalidIntegerE: InvalidIntegerE
  PositiveE: PositiveE
  UnknownRecordE: UnknownRecordE
  LiteralE: LiteralE<string[]>
  NonEmptyE: NonEmptyE<unknown>
  UnknownArrayE: UnknownArrayE
  TaggedUnionExtractKeyE: ExtractKeyE
}

export type LeafError = Extract<LeafErrors[keyof LeafErrors], HasDefaultLeafE>

export const defaultLeafSymbol = Symbol.for("@effect-ts/schema/error/defaultLeaf")
export const toTreeSymbol = Symbol.for("@effect-ts/schema/error/defaultLeaf/toTree")

export interface HasDefaultLeafE {
  readonly [toTreeSymbol]: Tree<string>
}

// @ts-expect-error
export abstract class DefaultLeafE<T extends object>
  extends Case<T>
  implements HasDefaultLeafE {
  readonly [defaultLeafSymbol] = defaultLeafSymbol

  abstract get [toTreeSymbol](): Tree<string>
}

export function isDefaultLeaf<T extends object>(t: T): t is DefaultLeafE<T> & T {
  return typeof t === "object" && t != null && defaultLeafSymbol in t
}

export type AnyError = SchemaError<LeafError>

//
// Schema Errors
//

export class UnionE<E>
  extends Case<{ readonly errors: Chunk.Chunk<E> }>
  implements CompoundE<E> {
  readonly _tag = "Union"
}

export function unionE<E>(errors: Chunk.Chunk<E>): UnionE<E> {
  return new UnionE({ errors })
}

export class ExtractKeyE
  extends DefaultLeafE<{
    readonly field: string
    readonly keys: readonly string[]
    readonly actual: unknown
  }>
  implements Actual<unknown> {
  readonly _tag = "ExtractKey"

  get [toTreeSymbol](): Tree<string> {
    return tree(
      `cannot extract key ${this.field} from ${JSON.stringify(
        this.actual
      )}, expected one of ${this.keys.join(", ")}`
    )
  }
}

export function extractKeyE(field: string, keys: readonly string[], actual: unknown) {
  return new ExtractKeyE({ actual, field, keys })
}

export class LeafE<E> extends Case<{ readonly error: E }> implements SingleE<E> {
  readonly _tag = "Leaf"
}

export function leafE<E>(e: E): LeafE<E> {
  return new LeafE({ error: e })
}

export class PrevE<E> extends Case<{ readonly error: E }> implements SingleE<E> {
  readonly _tag = "Prev"
}

export function prevE<E>(e: E): PrevE<E> {
  return new PrevE({ error: e })
}

export class NextE<E> extends Case<{ readonly error: E }> implements SingleE<E> {
  readonly _tag = "Next"
}

export function nextE<E>(e: E): NextE<E> {
  return new NextE({ error: e })
}

export class RefinementE<E> extends Case<{ readonly error: E }> implements SingleE<E> {
  readonly _tag = "Refinement"
}

export function refinementE<E>(e: E): RefinementE<E> {
  return new RefinementE({ error: e })
}

export class NamedE<Name extends string, E>
  extends Case<{
    readonly name: Name
    readonly error: E
  }>
  implements SingleE<E> {
  readonly _tag = "Named"
}

export function namedE<N extends string, E>(name: N, error: E): NamedE<N, E> {
  return new NamedE({ error, name })
}

export class StructE<E>
  extends Case<{ readonly errors: Chunk.Chunk<E> }>
  implements CompoundE<E> {
  readonly _tag = "Struct"
}

export function structE<E>(errors: Chunk.Chunk<E>): StructE<E> {
  return new StructE({ errors })
}

export class CollectionE<E>
  extends Case<{ readonly errors: Chunk.Chunk<E> }>
  implements CompoundE<E> {
  readonly _tag = "Collection"
}

export function chunkE<E>(errors: Chunk.Chunk<E>): CollectionE<E> {
  return new CollectionE({ errors })
}

export class UnknownArrayE
  extends DefaultLeafE<{ readonly actual: unknown }>
  implements Actual<unknown> {
  readonly _tag = "NotArray"

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected an array`)
  }
}

export function unknownArrayE(actual: unknown): UnknownArrayE {
  return new UnknownArrayE({ actual })
}

export class RequiredKeyE<K, E>
  extends Case<{
    readonly error: E
    readonly key: K
  }>
  implements SingleE<E> {
  readonly _tag = "RequiredKey"
}

export function requiredKeyE<K, E>(key: K, error: E): RequiredKeyE<K, E> {
  return new RequiredKeyE({ error, key })
}

export class OptionalKeyE<K, E>
  extends Case<{
    readonly error: E
    readonly key: K
  }>
  implements SingleE<E> {
  readonly _tag = "OptionalKey"
}

export function optionalKeyE<K, E>(key: K, error: E): OptionalKeyE<K, E> {
  return new OptionalKeyE({ error, key })
}

export class OptionalIndexE<I, E>
  extends Case<{
    readonly index: I
    readonly error: E
  }>
  implements SingleE<E> {
  readonly _tag = "OptionalIndex"
}

export function optionalIndexE<K, E>(index: K, error: E): OptionalIndexE<K, E> {
  return new OptionalIndexE({ error, index })
}

export class MissingKeysE<K> extends Case<{ readonly keys: Chunk.Chunk<K> }> {
  readonly _tag = "Missing"
}

export function missingKeysE<K>(keys: Chunk.Chunk<K>): MissingKeysE<K> {
  return new MissingKeysE({ keys })
}

export class CompositionE<E>
  extends Case<{
    readonly errors: Chunk.Chunk<E>
  }>
  implements CompoundE<E> {
  readonly _tag = "Composition"
}

export function compositionE<E>(errors: Chunk.Chunk<E>): CompositionE<E> {
  return new CompositionE({ errors })
}

export class UnknownRecordE
  extends DefaultLeafE<{ readonly actual: unknown }>
  implements Actual<unknown> {
  readonly _tag = "NotRecord"

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected a record`)
  }
}

export function unknownRecordE(actual: unknown): UnknownRecordE {
  return new UnknownRecordE({ actual })
}

export class MemberE<M, E>
  extends Case<{
    readonly member: M
    readonly error: E
  }>
  implements SingleE<E> {
  readonly _tag = "Member"
}

export function memberE<M, E>(member: M, error: E): MemberE<M, E> {
  return new MemberE({ error, member })
}

export class IntersectionE<E>
  extends Case<{
    readonly errors: Chunk.Chunk<E>
  }>
  implements CompoundE<E> {
  readonly _tag = "Intersection"
}

export function intersectionE<E>(errors: Chunk.Chunk<E>): IntersectionE<E> {
  return new IntersectionE({ errors })
}

//
// Builtin
//

export class ParseDateE
  extends DefaultLeafE<{
    readonly actual: unknown
  }>
  implements Actual<unknown> {
  readonly _tag = "NotDateString"

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected a date string`)
  }
}

export function parseDateE(actual: unknown): ParseDateE {
  return new ParseDateE({ actual })
}

export class ParseDateMsE
  extends DefaultLeafE<{
    readonly actual: unknown
  }>
  implements Actual<unknown> {
  readonly _tag = "NotDateMs"

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected a date in ms`)
  }
}

export function parseDateMsE(actual: unknown): ParseDateMsE {
  return new ParseDateMsE({ actual })
}

export class LiteralE<KS extends readonly string[]>
  extends DefaultLeafE<{
    readonly actual: unknown
    readonly literals: KS
  }>
  implements Actual<unknown> {
  readonly _tag = "Literal"

  get [toTreeSymbol]() {
    return tree(
      `cannot process ${JSON.stringify(this.actual)}, expected one of ` +
        this.literals.join(", ")
    )
  }
}

export function literalE<KS extends readonly string[]>(
  literals: KS,
  actual: unknown
): LiteralE<KS> {
  return new LiteralE({ literals, actual })
}

export class InvalidIntegerE
  extends DefaultLeafE<{
    readonly actual: number
  }>
  implements Actual<number> {
  readonly _tag = "NotInteger"

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected an integer`)
  }
}

export function invalidIntegerE(actual: number): InvalidIntegerE {
  return new InvalidIntegerE({ actual })
}

export class PositiveE
  extends DefaultLeafE<{
    readonly actual: number
  }>
  implements Actual<number> {
  readonly _tag = "NotPositive"

  get [toTreeSymbol]() {
    return tree(
      `cannot process ${JSON.stringify(this.actual)}, expected to be positive`
    )
  }
}

export function positiveE(actual: number): PositiveE {
  return new PositiveE({ actual })
}

export class NonEmptyE<A>
  extends DefaultLeafE<{
    readonly actual: A
  }>
  implements Actual<A> {
  readonly _tag = "NonEmpty"

  get [toTreeSymbol]() {
    return tree(
      `cannot process ${JSON.stringify(this.actual)}, expected to be not empty`
    )
  }
}

export function nonEmptyE<A>(actual: A): NonEmptyE<A> {
  return new NonEmptyE({ actual })
}

export class ParseNumberE
  extends DefaultLeafE<{
    readonly actual: unknown
  }>
  implements Actual<unknown> {
  readonly _tag = "NotNumber"

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected a number`)
  }
}

export function parseNumberE(actual: unknown): ParseNumberE {
  return new ParseNumberE({ actual })
}

export class ParseObjectE
  extends DefaultLeafE<{
    readonly actual: unknown
  }>
  implements Actual<unknown> {
  readonly _tag = "NotObject"

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected an object`)
  }
}

export function parseObjectE(actual: unknown): ParseObjectE {
  return new ParseObjectE({ actual })
}

export class ParseStringE
  extends DefaultLeafE<{
    readonly actual: unknown
  }>
  implements Actual<unknown> {
  readonly _tag = "NotString"

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected an string`)
  }
}

export function parseStringE(actual: unknown): ParseStringE {
  return new ParseStringE({ actual })
}

//
// Draw
//
export type Forest<A> = Chunk.Chunk<Tree<A>>

export interface Tree<A> {
  readonly value: A
  readonly forest: Forest<A>
}

const empty = Chunk.empty<never>()

function tree<A>(value: A, forest: Forest<A> = empty): Tree<A> {
  return {
    value,
    forest
  }
}

export function toTreeWith<E>(
  toTree: (e: E) => Tree<string>
): (de: SchemaError<E>) => Tree<string> {
  const go = (de: SchemaError<E>): Tree<string> => {
    switch (de._tag) {
      case "Leaf": {
        return toTree(de.error)
      }
      case "Refinement": {
        return tree(
          `1 error(s) found while processing a refinement`,
          Chunk.single(go(de.error))
        )
      }
      case "RequiredKey": {
        return tree(
          `1 error(s) found while processing required key ${JSON.stringify(de.key)}`,
          Chunk.single(go(de.error))
        )
      }
      case "OptionalKey": {
        return tree(
          `1 error(s) found while processing optional key ${JSON.stringify(de.key)}`,
          Chunk.single(go(de.error))
        )
      }
      case "OptionalIndex":
        return tree(
          `1 error(s) found while processing optional index ${de.index}`,
          Chunk.single(go(de.error))
        )
      case "Collection":
        return tree(
          `${de.errors.length} error(s) found while processing a collection`,
          Chunk.map_(de.errors, go)
        )
      case "Struct": {
        return tree(
          `${de.errors.length} error(s) found while processing a struct`,
          Chunk.map_(de.errors, go)
        )
      }
      case "Union": {
        return tree(
          `${de.errors.length} error(s) found while processing a union`,
          Chunk.map_(de.errors, go)
        )
      }
      case "Named": {
        return tree(
          `1 error(s) found while processing ${de.name}`,
          Chunk.single(go(de.error))
        )
      }
      case "Missing": {
        return tree(
          `${de.keys.length} error(s) found while checking keys`,
          Chunk.map_(de.keys, (key) =>
            tree(`missing required key ${JSON.stringify(key)}`)
          )
        )
      }
      case "Member":
        return tree(
          `1 error(s) found while processing member ${JSON.stringify(de.member)}`,
          Chunk.single(go(de.error))
        )
      case "Intersection":
        return tree(
          `${de.errors.length} error(s) found while processing an intersection`,
          Chunk.map_(de.errors, go)
        )
      case "Prev":
        return go(de.error)
      case "Next":
        return go(de.error)
      case "Composition": {
        return de.errors.length === 1
          ? go(Chunk.unsafeGet_(de.errors, 0)) // less noise in the output if there's only one error
          : tree(
              `${de.errors.length} error(s) found while processing a composition`,
              Chunk.map_(de.errors, go)
            )
      }
    }
  }
  return go
}

export function drawTree(tree: Tree<string>): string {
  return tree.value + drawForest("\n", tree.forest)
}

function drawForest(indentation: string, forest: Chunk.Chunk<Tree<string>>): string {
  let r = ""
  const len = forest.length
  let tree: Tree<string>
  for (let i = 0; i < len; i++) {
    tree = Chunk.unsafeGet_(forest, i)
    const isLast = i === len - 1
    r += indentation + (isLast ? "└" : "├") + "─ " + tree.value
    r += drawForest(indentation + (len > 1 && !isLast ? "│  " : "   "), tree.forest)
  }
  return r
}

export const errorToTree = toTreeWith((e: LeafError) => e[toTreeSymbol])

export const drawError = flow(errorToTree, drawTree)
