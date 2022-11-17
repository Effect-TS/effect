/**
 * @since 1.0.0
 */

import * as A from "@fp-ts/codec/Annotation"
import type { AST } from "@fp-ts/codec/AST"
import * as Str from "@fp-ts/codec/data/string"
import * as G from "@fp-ts/codec/Guard"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { identity, pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Show<in out A> extends Schema<A> {
  readonly show: (a: A) => string
}

/**
 * @since 1.0.0
 */
export const make = <A>(schema: Schema<A>, show: Show<A>["show"]): Show<A> =>
  ({ ast: schema.ast, show }) as any

/**
 * @since 1.0.0
 */
export const lazy = <A>(
  f: () => Show<A>
): Show<A> => {
  const get = S.memoize<void, Show<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().show(a)
  )
}

const ShowAnnotationId: unique symbol = Symbol.for(
  "@fp-ts/codec/annotation/ShowAnnotation"
) as ShowAnnotationId

/**
 * @since 1.0.0
 * @category symbol
 */
export type ShowAnnotationId = typeof ShowAnnotationId

/**
 * @since 1.0.0
 */
export interface ShowAnnotation {
  readonly _id: ShowAnnotationId
  readonly showFor: (
    annotations: A.Annotations,
    ...guards: ReadonlyArray<Show<any>>
  ) => Show<any>
}

/**
 * @since 1.0.0
 */
export const makeShowAnnotation = (
  showFor: (
    annotations: A.Annotations,
    ...guards: ReadonlyArray<Show<any>>
  ) => Show<any>
): ShowAnnotation => ({ _id: ShowAnnotationId, showFor })

/**
 * @since 1.0.0
 */
export const isShowAnnotation = (u: unknown): u is ShowAnnotation =>
  typeof u === "object" && u != null && "_id" in u && u["_id"] === ShowAnnotationId

const go = S.memoize((ast: AST): Show<any> => {
  switch (ast._tag) {
    case "Declaration": {
      if (ast === Str.Schema.ast) {
        return make(S.string, (a) => JSON.stringify(a))
      }
      return pipe(
        A.find(ast.annotations, isShowAnnotation),
        O.map((annotation) => annotation.showFor(ast.annotations, ...ast.nodes.map(go))),
        O.match(() => {
          throw new Error(
            `Missing "ShowAnnotation" for ${
              pipe(A.getName(ast.annotations), O.getOrElse("<anonymous data type>"))
            }`
          )
        }, identity)
      )
    }
    case "Number":
      return make(S.number, (a) => JSON.stringify(a))
    case "Boolean":
      return make(S.boolean, (a) => JSON.stringify(a))
    case "Of":
      return make(S.make(ast), (a) => JSON.stringify(a))
    case "Tuple": {
      const components: ReadonlyArray<Show<unknown>> = ast.components.map(go)
      return make(S.make(ast), (tuple: ReadonlyArray<unknown>) =>
        "[" +
        tuple.map((c, i) =>
          i < components.length ?
            components[i].show(c) :
            O.isSome(ast.restElement) ?
            go(ast.restElement.value).show(c) :
            ""
        ).join(
          ","
        ) + "]")
    }
    case "Union": {
      const members = ast.members.map(go)
      const guards = ast.members.map((member) => G.unsafeGuardFor(S.make(member)))
      return make(S.make(ast), (a) => {
        const index = guards.findIndex((guard) => guard.is(a))
        return members[index].show(a)
      })
    }
    case "Struct": {
      const fields = {}
      for (const field of ast.fields) {
        fields[field.key] = go(field.value)
      }
      const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
      return make(
        S.make(ast),
        (struct: { [_: PropertyKey]: unknown }) => {
          const keys = Object.keys(struct)
          let out = "{"
          for (const key of keys) {
            if (key in fields) {
              out += `${JSON.stringify(key)}:${fields[key].show(struct[key])},`
            }
          }
          if (O.isSome(oIndexSignature)) {
            const indexSignature = oIndexSignature.value
            for (const key of keys) {
              if (!(key in fields)) {
                out += `${JSON.stringify(key)}:${indexSignature.show(struct[key])},`
              }
            }
          }
          out = out.substring(0, out.length - 1)
          out += "}"
          return out
        }
      )
    }
    case "Lazy":
      return lazy(() => go(ast.f()))
    case "Refinement":
      throw new Error("Unhandled Refinement case")
  }
})

/**
 * @since 1.0.0
 */
export const unsafeShowFor = <A>(schema: Schema<A>): Show<A> => go(schema.ast)
