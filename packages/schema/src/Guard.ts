/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type * as AST from "@fp-ts/schema/AST"
import * as UnknownArray from "@fp-ts/schema/data/UnknownArray"
import * as UnknownObject from "@fp-ts/schema/data/UnknownObject"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const GuardId = I.GuardId

/**
 * @since 1.0.0
 */
export interface Guard<in out A> extends Schema<A> {
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, is: Guard<A>["is"]) => Guard<A> = I.makeGuard

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Guard<any>>,
  oStringIndexSignature: O.Option<Guard<any>>,
  oSymbolIndexSignature: O.Option<Guard<any>>
): Guard<any> =>
  make(
    S.make(ast),
    (input: unknown): input is any => {
      if (!UnknownObject.Guard.is(input)) {
        return false
      }
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const field = ast.fields[i]
        const key = field.key
        // ---------------------------------------------
        // handle optional fields
        // ---------------------------------------------
        const optional = field.optional
        if (optional) {
          if (!Object.prototype.hasOwnProperty.call(input, key)) {
            continue
          }
          if (input[key] === undefined) {
            continue
          }
        }
        // ---------------------------------------------
        // handle required fields
        // ---------------------------------------------
        const guard = fields[i]
        if (!guard.is(input[key])) {
          return false
        }
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature) || O.isSome(oSymbolIndexSignature)) {
        if (O.isSome(oStringIndexSignature)) {
          const guard = oStringIndexSignature.value
          for (const key of Object.keys(input)) {
            if (!guard.is(input[key])) {
              return false
            }
          }
        }
        if (O.isSome(oSymbolIndexSignature)) {
          const guard = oSymbolIndexSignature.value
          for (const key of Object.getOwnPropertySymbols(input)) {
            if (!guard.is(input[key])) {
              return false
            }
          }
        }
      }

      return true
    }
  )

const _tuple = (
  ast: AST.Tuple,
  components: ReadonlyArray<Guard<any>>,
  oRestElement: O.Option<Guard<any>>
): Guard<any> =>
  make(
    S.make(ast),
    (input: unknown): input is any => {
      if (!UnknownArray.Guard.is(input)) {
        return false
      }
      let i = 0
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      for (; i < components.length; i++) {
        if (!components[i].is(input[i])) {
          return false
        }
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRestElement)) {
        const guard = oRestElement.value
        for (; i < input.length; i++) {
          if (!guard.is(input[i])) {
            return false
          }
        }
      }

      return true
    }
  )

/**
 * @since 1.0.0
 */
export const lazy = <A>(
  f: () => Guard<A>
): Guard<A> => {
  const get = S.memoize<void, Guard<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a): a is A => get().is(a)
  )
}

/**
 * @since 1.0.0
 */
export const provideGuardFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Guard<A> => {
    const go = (ast: AST.AST): Guard<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.GuardId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Guard compiler, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return make(S.make(ast), (u): u is any => u === ast.value)
        case "Tuple":
          return _tuple(ast, ast.components.map(go), pipe(ast.restElement, O.map(go)))
        case "Union": {
          const members = ast.members.map(go)
          return make(
            S.make(ast),
            (a): a is any => members.some((guard) => guard.is(a))
          )
        }
        case "Struct":
          return _struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.stringIndexSignature, O.map((is) => go(is.value))),
            pipe(ast.symbolIndexSignature, O.map((is) => go(is.value)))
          )
        case "Lazy":
          return lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const guardFor: <A>(schema: Schema<A>) => Guard<A> = provideGuardFor(empty)
