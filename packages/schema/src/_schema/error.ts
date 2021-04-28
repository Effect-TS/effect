// tracing: off

// based on the work of Giulio Canti in io-ts (3.x poc stage)

import { flow } from "@effect-ts/core/Function"
import * as Chunk from "@effect-ts/system/Collections/Immutable/Chunk"

import { Data } from "./data"

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
  | UnionMemberE<SchemaError<E>>
  | KeyedMemberE<string, SchemaError<E>>
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

export abstract class DefaultLeafE<T> extends Data<T> implements HasDefaultLeafE {
  readonly [defaultLeafSymbol] = defaultLeafSymbol

  abstract get [toTreeSymbol](): Tree<string>
}

export function isDefaultLeaf<T>(t: T): t is DefaultLeafE<T> & T {
  return typeof t === "object" && t != null && defaultLeafSymbol in t
}

export type AnyError = SchemaError<LeafError>

//
// Schema Errors
//

export class UnionE<E> extends Data<UnionE<E>> implements CompoundE<E> {
  readonly _tag = "Union"
  readonly errors!: Chunk.Chunk<E>
}

export class ExtractKeyE extends DefaultLeafE<ExtractKeyE> implements Actual<unknown> {
  readonly _tag = "ExtractKey"
  readonly field!: string
  readonly keys!: readonly string[]
  readonly actual!: unknown

  get [toTreeSymbol](): Tree<string> {
    return tree(
      `cannot extract key ${this.field} from ${JSON.stringify(
        this.actual
      )}, expected one of ${this.keys.join(", ")}`
    )
  }
}

export class KeyedMemberE<K, E> extends Data<KeyedMemberE<K, E>> implements SingleE<E> {
  readonly _tag = "KeyedMember"
  readonly key!: K
  readonly error!: E
}

export class UnionMemberE<E> extends Data<UnionMemberE<E>> implements SingleE<E> {
  readonly _tag = "UnionMember"
  readonly error!: E
}

export class LeafE<E> extends Data<LeafE<E>> implements SingleE<E> {
  readonly _tag = "Leaf"
  readonly error!: E
}

export function leafE<E>(e: E): LeafE<E> {
  return new LeafE({ error: e })
}

export class PrevE<E> extends Data<PrevE<E>> implements SingleE<E> {
  readonly _tag = "Prev"
  readonly error!: E
}

export function prevE<E>(e: E): PrevE<E> {
  return new PrevE({ error: e })
}

export class NextE<E> extends Data<NextE<E>> implements SingleE<E> {
  readonly _tag = "Next"
  readonly error!: E
}

export function nextE<E>(e: E): NextE<E> {
  return new NextE({ error: e })
}

export class RefinementE<E> extends Data<RefinementE<E>> implements SingleE<E> {
  readonly _tag = "Refinement"
  readonly error!: E
}

export function refinementE<E>(e: E): RefinementE<E> {
  return new RefinementE({ error: e })
}

export class NamedE<Name extends string, E>
  extends Data<NamedE<Name, E>>
  implements SingleE<E> {
  readonly _tag = "Named"
  readonly name!: string
  readonly error!: E
}

export function namedE<N extends string, E>(name: N, error: E): NamedE<N, E> {
  return new NamedE({ error, name })
}

export class StructE<E> extends Data<StructE<E>> implements CompoundE<E> {
  readonly _tag = "Struct"
  readonly errors!: Chunk.Chunk<E>
}

export function structE<E>(errors: Chunk.Chunk<E>): StructE<E> {
  return new StructE({ errors })
}

export class CollectionE<E> extends Data<CollectionE<E>> implements CompoundE<E> {
  readonly _tag = "Collection"
  readonly errors!: Chunk.Chunk<E>
}

export function chunkE<E>(errors: Chunk.Chunk<E>): CollectionE<E> {
  return new CollectionE({ errors })
}

export class UnknownArrayE
  extends DefaultLeafE<UnknownArrayE>
  implements Actual<unknown> {
  readonly _tag = "NotArray"
  readonly actual!: unknown

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected an array`)
  }
}

export function unknownArrayE(actual: unknown): UnknownArrayE {
  return new UnknownArrayE({ actual })
}

export class RequiredKeyE<K, E> extends Data<RequiredKeyE<K, E>> implements SingleE<E> {
  readonly _tag = "RequiredKey"
  readonly error!: E
  readonly key!: K
}

export function requiredKeyE<K, E>(key: K, error: E): RequiredKeyE<K, E> {
  return new RequiredKeyE({ error, key })
}

export class OptionalKeyE<K, E> extends Data<OptionalKeyE<K, E>> implements SingleE<E> {
  readonly _tag = "OptionalKey"
  readonly error!: E
  readonly key!: K
}

export function optionalKeyE<K, E>(key: K, error: E): OptionalKeyE<K, E> {
  return new OptionalKeyE({ error, key })
}

export class OptionalIndexE<I, E>
  extends Data<OptionalIndexE<I, E>>
  implements SingleE<E> {
  readonly _tag = "OptionalIndex"
  readonly index!: I
  readonly error!: E
}

export function optionalIndexE<K, E>(index: K, error: E): OptionalIndexE<K, E> {
  return new OptionalIndexE({ error, index })
}

export class MissingKeysE<K> extends Data<MissingKeysE<K>> {
  readonly _tag = "Missing"
  readonly keys!: Chunk.Chunk<K>
}

export function missingKeysE<K>(keys: Chunk.Chunk<K>): MissingKeysE<K> {
  return new MissingKeysE({ keys })
}

export class CompositionE<E> extends Data<CompositionE<E>> implements CompoundE<E> {
  readonly _tag = "Composition"
  readonly errors!: Chunk.Chunk<E>
}

export function compositionE<E>(errors: Chunk.Chunk<E>): CompositionE<E> {
  return new CompositionE({ errors })
}

export class UnknownRecordE
  extends DefaultLeafE<UnknownRecordE>
  implements Actual<unknown> {
  readonly _tag = "NotRecord"
  readonly actual!: unknown

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected a record`)
  }
}

export function unknownRecordE(actual: unknown): UnknownRecordE {
  return new UnknownRecordE({ actual })
}

export class MemberE<M, E> extends Data<MemberE<M, E>> implements SingleE<E> {
  readonly _tag = "Member"
  readonly member!: M
  readonly error!: E
}

export function memberE<M, E>(member: M, error: E): MemberE<M, E> {
  return new MemberE({ error, member })
}

export class IntersectionE<E> extends Data<IntersectionE<E>> implements CompoundE<E> {
  readonly _tag = "Intersection"
  readonly errors!: Chunk.Chunk<E>
}

export function intersectionE<E>(errors: Chunk.Chunk<E>): IntersectionE<E> {
  return new IntersectionE({ errors })
}

//
// Builtin
//

export class ParseDateE extends DefaultLeafE<ParseDateE> implements Actual<unknown> {
  readonly _tag = "NotDateString"
  readonly actual!: unknown

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected a date string`)
  }
}

export function parseDateE(actual: unknown): ParseDateE {
  return new ParseDateE({ actual })
}

export class ParseDateMsE
  extends DefaultLeafE<ParseDateMsE>
  implements Actual<unknown> {
  readonly _tag = "NotDateMs"
  readonly actual!: unknown

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected a date in ms`)
  }
}

export function parseDateMsE(actual: unknown): ParseDateMsE {
  return new ParseDateMsE({ actual })
}

export class LiteralE<KS extends readonly string[]>
  extends DefaultLeafE<LiteralE<KS>>
  implements Actual<unknown> {
  readonly _tag = "Literal"
  readonly actual!: unknown
  readonly literals!: KS

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
  extends DefaultLeafE<InvalidIntegerE>
  implements Actual<number> {
  readonly _tag = "NotInteger"
  readonly actual!: number

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected an integer`)
  }
}

export function invalidIntegerE(actual: number): InvalidIntegerE {
  return new InvalidIntegerE({ actual })
}

export class PositiveE extends DefaultLeafE<PositiveE> implements Actual<number> {
  readonly _tag = "NotPositive"
  readonly actual!: number

  get [toTreeSymbol]() {
    return tree(
      `cannot process ${JSON.stringify(this.actual)}, expected to be positive`
    )
  }
}

export function positiveE(actual: number): PositiveE {
  return new PositiveE({ actual })
}

export class NonEmptyE<A> extends DefaultLeafE<NonEmptyE<A>> implements Actual<A> {
  readonly _tag = "NonEmpty"
  readonly actual!: A

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
  extends DefaultLeafE<ParseNumberE>
  implements Actual<unknown> {
  readonly _tag = "NotNumber"
  readonly actual!: unknown

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected a number`)
  }
}

export function parseNumberE(actual: unknown): ParseNumberE {
  return new ParseNumberE({ actual })
}

export class ParseObjectE
  extends DefaultLeafE<ParseObjectE>
  implements Actual<unknown> {
  readonly _tag = "NotObject"
  readonly actual!: unknown

  get [toTreeSymbol]() {
    return tree(`cannot process ${JSON.stringify(this.actual)}, expected an object`)
  }
}

export function parseObjectE(actual: unknown): ParseObjectE {
  return new ParseObjectE({ actual })
}

export class ParseStringE
  extends DefaultLeafE<ParseStringE>
  implements Actual<unknown> {
  readonly _tag = "NotString"
  readonly actual!: unknown

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
      case "UnionMember":
        return tree(
          `1 error(s) found while processing a union member`,
          Chunk.single(go(de.error))
        )
      case "KeyedMember":
        return tree(
          `1 error(s) found while processing the meber ${JSON.stringify(de.key)}`,
          Chunk.single(go(de.error))
        )
      case "Named": {
        return tree(`processing ${de.name}`, Chunk.single(go(de.error)))
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
