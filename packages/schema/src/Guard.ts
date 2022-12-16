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
          const elements = ast.elements.map((e) => go(e.type))
          const rest = pipe(ast.rest, O.map(([head]) => [head, go(head)] as const)) // TODO: handle tail
          return make(
            I.makeSchema(ast),
            (input: unknown): input is any => {
              if (!Array.isArray(input)) {
                return false
              }
              let i = 0
              // ---------------------------------------------
              // handle elements
              // ---------------------------------------------
              for (; i < elements.length; i++) {
                if (input.length < i + 1) {
                  if (ast.elements[i].isOptional) {
                    continue
                  }
                  return false
                }
                if (!elements[i].is(input[i])) {
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
            ast.indexSignatures.map((is) => go(is.value))
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
  indexSignatures: ReadonlyArray<Guard<any>>
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
        if (!Object.prototype.hasOwnProperty.call(input, key)) {
          if (field.isOptional) {
            continue
          }
          return false
        }
        if (!fields[i].is(input[key])) {
          return false
        }
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (indexSignatures.length > 0) {
        const keys = Object.keys(input)
        const symbols = Object.getOwnPropertySymbols(input)
        for (let i = 0; i < indexSignatures.length; i++) {
          const guard = indexSignatures[i]
          const ks = ast.indexSignatures[i].key === "symbol" ? symbols : keys
          for (const key of ks) {
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
