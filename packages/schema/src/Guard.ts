/**
 * @since 1.0.0
 */

import { isBoolean } from "@fp-ts/data/Boolean"
import { pipe } from "@fp-ts/data/Function"
import { isNumber } from "@fp-ts/data/Number"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import { isString } from "@fp-ts/data/String"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import type * as AST from "@fp-ts/schema/AST"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @category model
 * @since 1.0.0
 */
export interface Guard<A> extends Schema<A> {
  readonly is: (input: unknown) => input is A
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, is: Guard<A>["is"]) => Guard<A> = I.makeGuard

const getTypeAliasHook = H.getTypeAliasHook<H.TypeAliasHook<Guard<any>>>(
  H.GuardTypeAliasHookId
)

/**
 * @since 1.0.0
 */
export const guardFor = <A>(schema: Schema<A>): Guard<A> => {
  const go = (ast: AST.AST): Guard<any> => {
    switch (ast._tag) {
      case "TypeAlias":
        return pipe(
          getTypeAliasHook(ast),
          O.match(
            () => go(ast.type),
            ({ handler }) => handler(...ast.typeParameters.map(go))
          )
        )
      case "Literal":
        return make(I.makeSchema(ast), (u): u is typeof ast.literal => u === ast.literal)
      case "UniqueSymbol":
        return make(I.makeSchema(ast), (u): u is typeof ast.symbol => u === ast.symbol)
      case "UndefinedKeyword":
        return make(I.makeSchema(ast), I.isUndefined)
      case "VoidKeyword":
        return make(I.makeSchema(ast), I.isUndefined)
      case "NeverKeyword":
        return make(I.makeSchema(ast), I.isNever) as any
      case "UnknownKeyword":
        return make(I.makeSchema(ast), I.isUnknown)
      case "AnyKeyword":
        return make(I.makeSchema(ast), I.isUnknown)
      case "StringKeyword":
        return make(I.makeSchema(ast), isString)
      case "NumberKeyword":
        return make(I.makeSchema(ast), isNumber)
      case "BooleanKeyword":
        return make(I.makeSchema(ast), isBoolean)
      case "BigIntKeyword":
        return make(I.makeSchema(ast), I.isBigInt)
      case "SymbolKeyword":
        return make(I.makeSchema(ast), I.isSymbol)
      case "ObjectKeyword":
        return make(I.makeSchema(ast), I.isObject)
      case "Tuple": {
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
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
            for (; i < ast.elements.length; i++) {
              if (input.length < i + 1) {
                // the input element is missing...
                if (ast.elements[i].isOptional) {
                  // ...but the element is optional, go on
                  continue
                } else {
                  // ...but the element is required, bail out
                  return false
                }
              } else if (!elements[i].is(input[i])) {
                // the input element is present but is not valid, bail out
                return false
              }
            }
            // ---------------------------------------------
            // handle rest element
            // ---------------------------------------------
            if (O.isSome(rest)) {
              const head = RA.headNonEmpty(rest.value)
              const tail = RA.tailNonEmpty(rest.value)
              for (; i < input.length - tail.length; i++) {
                if (!head.is(input[i])) {
                  // the input element is not valid, bail out
                  return false
                }
              }
              // ---------------------------------------------
              // handle post rest elements
              // ---------------------------------------------
              for (let j = 0; j < tail.length; j++) {
                i += j
                if (input.length < i + 1) {
                  // the input element is missing and the element is required, bail out
                  return false
                } else if (!tail[j].is(input[i])) {
                  // the input element is present but is not valid, bail out
                  return false
                }
              }
            }

            return true
          }
        )
      }
      case "Struct": {
        const fieldTypes = ast.fields.map((f) => go(f.type))
        const indexSignatures = ast.indexSignatures.map((is) =>
          [go(is.parameter), go(is.type)] as const
        )
        if (fieldTypes.length === 0 && indexSignatures.length === 0) {
          return make(I.makeSchema(ast), I.isNotNull)
        }
        return make(
          I.makeSchema(ast),
          (input: unknown): input is any => {
            if (!I.isUnknownObject(input)) {
              return false
            }
            // ---------------------------------------------
            // handle fields
            // ---------------------------------------------
            for (let i = 0; i < ast.fields.length; i++) {
              const field = ast.fields[i]
              const name = field.name
              if (!Object.prototype.hasOwnProperty.call(input, name)) {
                if (field.isOptional) {
                  continue
                }
                return false
              }
              if (!fieldTypes[i].is(input[name])) {
                return false
              }
            }
            // ---------------------------------------------
            // handle index signatures
            // ---------------------------------------------
            if (indexSignatures.length > 0) {
              for (let i = 0; i < indexSignatures.length; i++) {
                const parameter = indexSignatures[i][0]
                const type = indexSignatures[i][1]
                const keys = I.getKeysForIndexSignature(input, ast.indexSignatures[i].parameter)
                for (const key of keys) {
                  if (!parameter.is(key) || !type.is(input[key])) {
                    return false
                  }
                }
              }
            }

            return true
          }
        )
      }
      case "Union": {
        const types = ast.types.map(go)
        return make(
          I.makeSchema(ast),
          (a): a is any => types.some((guard) => guard.is(a))
        )
      }
      case "Lazy": {
        const f = () => go(ast.f())
        const get = I.memoize<void, Guard<A>>(f)
        const schema = I.lazy(f)
        return make(
          schema,
          (a): a is A => get().is(a)
        )
      }
      case "Enums":
        return make(
          I.makeSchema(ast),
          (a): a is any => ast.enums.some(([_, value]) => value === a)
        )
      case "Refinement": {
        const type = go(ast.from)
        return make(
          I.makeSchema(ast),
          (u): u is any => type.is(u) && ast.refinement(u)
        )
      }
      case "TemplateLiteral": {
        const regex = I.getTemplateLiteralRegex(ast)
        return make(
          I.makeSchema(ast),
          (u): u is any => isString(u) && regex.test(u)
        )
      }
    }
  }

  return go(schema.ast)
}
