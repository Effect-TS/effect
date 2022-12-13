/**
 * @since 1.0.0
 */

import { isBoolean } from "@fp-ts/data/Boolean"
import { pipe } from "@fp-ts/data/Function"
import { isNumber } from "@fp-ts/data/Number"
import * as O from "@fp-ts/data/Option"
import { isString } from "@fp-ts/data/String"
import * as AST from "@fp-ts/schema/AST"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const GuardId = I.GuardId

/**
 * @since 1.0.0
 */
export interface Guard<A> extends Schema<A> {
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, is: Guard<A>["is"]) => Guard<A> = I.makeGuard

/**
 * @since 1.0.0
 */
export const provideGuardFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Guard<A> => {
    const go = (ast: AST.AST): Guard<any> => {
      switch (ast._tag) {
        case "TypeAliasDeclaration":
          return pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.findHandler(I.GuardId, ast.id),
            O.match(
              () => go(ast.type),
              (handler) =>
                O.isSome(ast.config) ?
                  handler(ast.config.value)(...ast.typeParameters.map(go)) :
                  handler(...ast.typeParameters.map(go))
            )
          )
        case "LiteralType":
          return make(I.makeSchema(ast), (u): u is any => u === ast.literal)
        case "UndefinedKeyword":
          return make(I._undefined, I.isUndefined)
        case "NeverKeyword":
          return make(I.never, I.isNever) as any
        case "UnknownKeyword":
          return make(I.unknown, I.isUnknown)
        case "AnyKeyword":
          return make(I.any, I.isUnknown)
        case "StringKeyword":
          return make(I.string, isString)
        case "NumberKeyword":
          return make(I.number, isNumber)
        case "BooleanKeyword":
          return make(I.boolean, isBoolean)
        case "BigIntKeyword":
          return make(I.bigint, I.isBigInt)
        case "SymbolKeyword":
          return make(I.symbol, I.isSymbol)
        case "Tuple": {
          const components = ast.components.map((c) => go(c.value))
          const rest = pipe(ast.rest, O.map((ast) => [ast, go(ast)] as const))
          return make(
            I.makeSchema(ast),
            (input: unknown): input is any => {
              if (!Array.isArray(input)) {
                return false
              }
              let i = 0
              // ---------------------------------------------
              // handle components
              // ---------------------------------------------
              for (; i < components.length; i++) {
                // ---------------------------------------------
                // handle optional components
                // ---------------------------------------------
                if (ast.components[i].optional && input[i] === undefined) {
                  continue
                }
                if (!components[i].is(input[i])) {
                  return false
                }
              }
              // ---------------------------------------------
              // handle rest element
              // ---------------------------------------------
              if (O.isSome(rest)) {
                const [ast, guard] = rest.value
                if (ast !== AST.unknownKeyword && ast !== AST.anyKeyword) {
                  for (; i < input.length; i++) {
                    if (!guard.is(input[i])) {
                      return false
                    }
                  }
                }
              }

              return true
            }
          )
        }
        case "Struct":
          return _struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.indexSignatures.string, O.map((is) => go(is.value))),
            pipe(ast.indexSignatures.symbol, O.map((is) => go(is.value)))
          )
        case "Union": {
          const members = ast.members.map(go)
          return make(
            I.makeSchema(ast),
            (a): a is any => members.some((guard) => guard.is(a))
          )
        }
        case "Lazy":
          return _lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const guardFor: <A>(schema: Schema<A>) => Guard<A> = provideGuardFor(P.empty)

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Guard<any>>,
  oStringIndexSignature: O.Option<Guard<any>>,
  oSymbolIndexSignature: O.Option<Guard<any>>
): Guard<any> =>
  make(
    I.makeSchema(ast),
    (input: unknown): input is any => {
      if (!I.isUnknownObject(input)) {
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
      const keys = Object.keys(input)
      const symbols = Object.getOwnPropertySymbols(input)
      if (O.isSome(oStringIndexSignature) || O.isSome(oSymbolIndexSignature)) {
        if (O.isSome(oStringIndexSignature)) {
          if (symbols.length > 0) {
            return false
          }
          const guard = oStringIndexSignature.value
          for (const key of keys) {
            if (!guard.is(input[key])) {
              return false
            }
          }
        }
        if (O.isSome(oSymbolIndexSignature)) {
          if (keys.length > 0) {
            return false
          }
          const guard = oSymbolIndexSignature.value
          for (const key of symbols) {
            if (!guard.is(input[key])) {
              return false
            }
          }
        }
      }

      return true
    }
  )

const _lazy = <A>(
  f: () => Guard<A>
): Guard<A> => {
  const get = I.memoize<void, Guard<A>>(f)
  const schema = I.lazy(f)
  return make(
    schema,
    (a): a is A => get().is(a)
  )
}
