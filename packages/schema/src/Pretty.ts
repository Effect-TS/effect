/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Option from "effect/Option"
import * as AST from "./AST.js"
import * as errors_ from "./internal/errors.js"
import * as util_ from "./internal/util.js"
import * as ParseResult from "./ParseResult.js"
import type * as Schema from "./Schema.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface Pretty<To> {
  (a: To): string
}

/**
 * @category hooks
 * @since 1.0.0
 */
export const PrettyHookId: unique symbol = Symbol.for("@effect/schema/PrettyHookId")

/**
 * @category hooks
 * @since 1.0.0
 */
export type PrettyHookId = typeof PrettyHookId

/**
 * @category annotations
 * @since 1.0.0
 */
export const pretty =
  <A>(handler: (...args: ReadonlyArray<Pretty<any>>) => Pretty<A>) =>
  <I, R>(self: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> => self.annotations({ [PrettyHookId]: handler })

/**
 * @category prettify
 * @since 1.0.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): (a: A) => string => compile(schema.ast)

const getHook = AST.getAnnotation<(...args: ReadonlyArray<Pretty<any>>) => Pretty<any>>(
  PrettyHookId
)

const getMatcher = (defaultPretty: Pretty<any>) => (ast: AST.AST): Pretty<any> =>
  Option.match(getHook(ast), {
    onNone: () => defaultPretty,
    onSome: (handler) => handler()
  })

const toString = getMatcher((a) => String(a))

const stringify = getMatcher((a) => JSON.stringify(a))

const formatUnknown = getMatcher(util_.formatUnknown)

/**
 * @since 1.0.0
 */
export const match: AST.Match<Pretty<any>> = {
  "Declaration": (ast, go) => {
    const hook = getHook(ast)
    if (Option.isSome(hook)) {
      return hook.value(...ast.typeParameters.map(go))
    }
    throw new Error(errors_.getPrettyErrorMessage(`a declaration without annotations (${ast})`))
  },
  "VoidKeyword": getMatcher(() => "void(0)"),
  "NeverKeyword": getMatcher(() => {
    throw new Error("cannot pretty print a `never` value")
  }),
  "Literal": getMatcher((literal: AST.LiteralValue): string =>
    typeof literal === "bigint" ?
      `${String(literal)}n` :
      JSON.stringify(literal)
  ),
  "SymbolKeyword": toString,
  "UniqueSymbol": toString,
  "TemplateLiteral": stringify,
  "UndefinedKeyword": toString,
  "UnknownKeyword": formatUnknown,
  "AnyKeyword": formatUnknown,
  "ObjectKeyword": formatUnknown,
  "StringKeyword": stringify,
  "NumberKeyword": toString,
  "BooleanKeyword": toString,
  "BigIntKeyword": getMatcher((a) => `${String(a)}n`),
  "Enums": stringify,
  "TupleType": (ast, go) => {
    const hook = getHook(ast)
    if (Option.isSome(hook)) {
      return hook.value()
    }
    const elements = ast.elements.map((e) => go(e.type))
    const rest = ast.rest.map(go)
    return (input: ReadonlyArray<unknown>) => {
      const output: Array<string> = []
      let i = 0
      // ---------------------------------------------
      // handle elements
      // ---------------------------------------------
      for (; i < elements.length; i++) {
        if (input.length < i + 1) {
          if (ast.elements[i].isOptional) {
            continue
          }
        } else {
          output.push(elements[i](input[i]))
        }
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (Arr.isNonEmptyReadonlyArray(rest)) {
        const [head, ...tail] = rest
        for (; i < input.length - tail.length; i++) {
          output.push(head(input[i]))
        }
        // ---------------------------------------------
        // handle post rest elements
        // ---------------------------------------------
        for (let j = 0; j < tail.length; j++) {
          i += j
          output.push(tail[j](input[i]))
        }
      }

      return "[" + output.join(", ") + "]"
    }
  },
  "TypeLiteral": (ast, go) => {
    const hook = getHook(ast)
    if (Option.isSome(hook)) {
      return hook.value()
    }
    const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
    const indexSignatureTypes = ast.indexSignatures.map((is) => go(is.type))
    const expectedKeys: any = {}
    for (let i = 0; i < propertySignaturesTypes.length; i++) {
      expectedKeys[ast.propertySignatures[i].name] = null
    }
    return (input: { readonly [x: PropertyKey]: unknown }) => {
      const output: Array<string> = []
      // ---------------------------------------------
      // handle property signatures
      // ---------------------------------------------
      for (let i = 0; i < propertySignaturesTypes.length; i++) {
        const ps = ast.propertySignatures[i]
        const name = ps.name
        if (ps.isOptional && !Object.prototype.hasOwnProperty.call(input, name)) {
          continue
        }
        output.push(
          `${util_.formatPropertyKey(name)}: ${propertySignaturesTypes[i](input[name])}`
        )
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (indexSignatureTypes.length > 0) {
        for (let i = 0; i < indexSignatureTypes.length; i++) {
          const type = indexSignatureTypes[i]
          const keys = util_.getKeysForIndexSignature(input, ast.indexSignatures[i].parameter)
          for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
              continue
            }
            output.push(`${util_.formatPropertyKey(key)}: ${type(input[key])}`)
          }
        }
      }

      return Arr.isNonEmptyReadonlyArray(output) ? "{ " + output.join(", ") + " }" : "{}"
    }
  },
  "Union": (ast, go) => {
    const hook = getHook(ast)
    if (Option.isSome(hook)) {
      return hook.value()
    }
    const types = ast.types.map((ast) => [ParseResult.is({ ast } as any), go(ast)] as const)
    return (a) => {
      const index = types.findIndex(([is]) => is(a))
      return types[index][1](a)
    }
  },
  "Suspend": (ast, go) => {
    return Option.match(getHook(ast), {
      onNone: () => {
        const get = util_.memoizeThunk(() => go(ast.f()))
        return (a) => get()(a)
      },
      onSome: (handler) => handler()
    })
  },
  "Refinement": (ast, go) => {
    return Option.match(getHook(ast), {
      onNone: () => go(ast.from),
      onSome: (handler) => handler()
    })
  },
  "Transformation": (ast, go) => {
    return Option.match(getHook(ast), {
      onNone: () => go(ast.to),
      onSome: (handler) => handler()
    })
  }
}

const compile = AST.getCompiler(match)
