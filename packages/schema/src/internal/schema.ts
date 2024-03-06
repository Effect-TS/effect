import { pipeArguments } from "effect/Pipeable"
import type { Mutable } from "effect/Types"
import * as AST from "../AST.js"
import type * as S from "../Schema.js"
import * as _hooks from "./hooks.js"

/** @internal */
export const TypeId: S.TypeId = Symbol.for("@effect/schema/Schema") as S.TypeId

/** @internal */
export const PropertySignatureTypeId: S.PropertySignatureTypeId = Symbol.for(
  "@effect/schema/PropertySignature"
) as S.PropertySignatureTypeId

/** @internal */
export const make = <A, I, R>(ast: AST.AST): S.Schema<A, I, R> => new Schema(ast)

/** @internal */
export const toASTAnnotations = (
  annotations?: Record<string | symbol, any> | undefined
): AST.Annotations => {
  if (!annotations) {
    return {}
  }
  const out: Mutable<AST.Annotations> = {}

  // symbols are reserved for custom annotations
  const custom = Object.getOwnPropertySymbols(annotations)
  for (const sym of custom) {
    out[sym] = annotations[sym]
  }

  // string keys are reserved as /schema namespace
  if (annotations.typeId !== undefined) {
    const typeId = annotations.typeId
    if (typeof typeId === "object") {
      out[AST.TypeAnnotationId] = typeId.id
      out[typeId.id] = typeId.annotation
    } else {
      out[AST.TypeAnnotationId] = typeId
    }
  }
  const move = (from: keyof typeof annotations, to: symbol) => {
    if (annotations[from] !== undefined) {
      out[to] = annotations[from]
    }
  }
  move("message", AST.MessageAnnotationId)
  move("identifier", AST.IdentifierAnnotationId)
  move("title", AST.TitleAnnotationId)
  move("description", AST.DescriptionAnnotationId)
  move("examples", AST.ExamplesAnnotationId)
  move("default", AST.DefaultAnnotationId)
  move("documentation", AST.DocumentationAnnotationId)
  move("jsonSchema", AST.JSONSchemaAnnotationId)
  move("arbitrary", _hooks.ArbitraryHookId)
  move("pretty", _hooks.PrettyHookId)
  move("equivalence", _hooks.EquivalenceHookId)
  move("concurrency", AST.ConcurrencyAnnotationId)
  move("batching", AST.BatchingAnnotationId)

  return out
}

/** @internal */
export const variance = {
  /* c8 ignore next */
  _A: (_: any) => _,
  /* c8 ignore next */
  _I: (_: any) => _,
  /* c8 ignore next */
  _R: (_: never) => _
}

/** @internal */
export const annotations = <A>(ast: AST.AST, annotations: S.Annotations<A>): AST.AST =>
  AST.annotations(ast, toASTAnnotations(annotations))

/** @internal */
export class Schema<in out A, in out I = A, out R = never> implements S.Schema<A, I, R> {
  readonly [TypeId] = variance
  constructor(readonly ast: AST.AST) {}
  pipe() {
    return pipeArguments(this, arguments)
  }
  annotations(a: S.Annotations<A>): S.Schema<A, I, R> {
    return new Schema(annotations(this.ast, a))
  }
}
