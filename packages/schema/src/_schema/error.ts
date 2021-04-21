// tracing: off

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
  | ChunkE<SchemaError<E>>
  | NamedE<string, SchemaError<E>>
  | IntersectionE<SchemaError<E>>
  | MemberE<string | number, SchemaError<E>>

export type BuiltinError =
  | ParseStringE
  | ParseNumberE
  | ParseObjectE
  | ParseDateE
  | ParseDateMsE
  | InvalidIntegerE
  | PositiveE
  | UnknownRecordE
  | LiteralE<string[]>
  | NonEmptyE<unknown>
  | UnknownArrayE

export type AnyError = SchemaError<BuiltinError>

//
// Schema Errors
//

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

export class ChunkE<E> extends Data<ChunkE<E>> implements CompoundE<E> {
  readonly _tag = "Chunk"
  readonly errors!: Chunk.Chunk<E>
}

export function chunkE<E>(errors: Chunk.Chunk<E>): ChunkE<E> {
  return new ChunkE({ errors })
}

export class UnknownArrayE extends Data<UnknownArrayE> implements Actual<unknown> {
  readonly _tag = "NotArray"
  readonly actual!: unknown
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

export class UnknownRecordE extends Data<UnknownRecordE> implements Actual<unknown> {
  readonly _tag = "NotRecord"
  readonly actual!: unknown
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

export class ParseDateE extends Data<ParseDateE> implements Actual<unknown> {
  readonly _tag = "NotDateString"
  readonly actual!: unknown
}

export function parseDateE(actual: unknown): ParseDateE {
  return new ParseDateE({ actual })
}

export class ParseDateMsE extends Data<ParseDateMsE> implements Actual<unknown> {
  readonly _tag = "NotDateMs"
  readonly actual!: unknown
}

export function parseDateMsE(actual: unknown): ParseDateMsE {
  return new ParseDateMsE({ actual })
}

export class LiteralE<KS extends readonly string[]>
  extends Data<LiteralE<KS>>
  implements Actual<unknown> {
  readonly _tag = "Literal"
  readonly actual!: unknown
  readonly literals!: KS
}

export function literalE<KS extends readonly string[]>(
  literals: KS,
  actual: unknown
): LiteralE<KS> {
  return new LiteralE({ literals, actual })
}

export class InvalidIntegerE extends Data<InvalidIntegerE> implements Actual<number> {
  readonly _tag = "NotInteger"
  readonly actual!: number
}

export function invalidIntegerE(actual: number): InvalidIntegerE {
  return new InvalidIntegerE({ actual })
}

export class PositiveE extends Data<PositiveE> implements Actual<number> {
  readonly _tag = "NotPositive"
  readonly actual!: number
}

export function positiveE(actual: number): PositiveE {
  return new PositiveE({ actual })
}

export class NonEmptyE<A> extends Data<NonEmptyE<A>> implements Actual<A> {
  readonly _tag = "NonEmpty"
  readonly actual!: A
}

export function nonEmptyE<A>(actual: A): NonEmptyE<A> {
  return new NonEmptyE({ actual })
}

export class ParseNumberE extends Data<ParseNumberE> implements Actual<unknown> {
  readonly _tag = "NotNumber"
  readonly actual!: unknown
}

export function parseNumberE(actual: unknown): ParseNumberE {
  return new ParseNumberE({ actual })
}

export class ParseObjectE extends Data<ParseObjectE> implements Actual<unknown> {
  readonly _tag = "NotObject"
  readonly actual!: unknown
}

export function parseObjectE(actual: unknown): ParseObjectE {
  return new ParseObjectE({ actual })
}

export class ParseStringE extends Data<ParseStringE> implements Actual<unknown> {
  readonly _tag = "NotString"
  readonly actual!: unknown
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
      case "Chunk":
        return tree(
          `${de.errors.length} error(s) found while processing an array`,
          Chunk.map_(de.errors, go)
        )
      case "Struct": {
        return tree(
          `${de.errors.length} error(s) found while processing a struct`,
          Chunk.map_(de.errors, go)
        )
      }
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
          `1 error(s) found while decoding member ${JSON.stringify(de.member)}`,
          Chunk.single(go(de.error))
        )
      case "Intersection":
        return tree(
          `${de.errors.length} error(s) found while decoding an intersection`,
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

export function toTreeBuiltin(de: BuiltinError): Tree<string> {
  switch (de._tag) {
    case "NotNumber": {
      return tree(`cannot decode ${JSON.stringify(de.actual)}, expected a number`)
    }
    case "NotInteger": {
      return tree(`cannot decode ${JSON.stringify(de.actual)}, expected an integer`)
    }
    case "NotObject": {
      return tree(`cannot decode ${JSON.stringify(de.actual)}, expected an object`)
    }
    case "NotString": {
      return tree(`cannot decode ${JSON.stringify(de.actual)}, expected an string`)
    }
    case "NotPositive": {
      return tree(`cannot decode ${JSON.stringify(de.actual)}, expected a positive`)
    }
    case "NotRecord": {
      return tree(`cannot decode ${JSON.stringify(de.actual)}, expected a record`)
    }
    case "NotArray": {
      return tree(`cannot decode ${JSON.stringify(de.actual)}, expected an array`)
    }
    case "NotDateString": {
      return tree(`cannot decode ${JSON.stringify(de.actual)}, expected a date string`)
    }
    case "NotDateMs": {
      return tree(`cannot decode ${JSON.stringify(de.actual)}, expected a date in ms`)
    }
    case "Literal": {
      return tree(
        `cannot decode ${JSON.stringify(de.actual)}, expected one of ` +
          de.literals.join(", ")
      )
    }
    case "NonEmpty": {
      return tree(
        `cannot decode ${JSON.stringify(de.actual)}, expected to be not empty`
      )
    }
  }
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

export const errorToTree = toTreeWith(toTreeBuiltin)

export const drawError = flow(errorToTree, drawTree)
