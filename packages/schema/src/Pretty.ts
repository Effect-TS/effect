/**
 * @since 1.0.0
 */
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as AST from "./AST.js"
import * as Format from "./Format.js"
import * as Internal from "./internal/ast.js"
import * as hooks from "./internal/hooks.js"
import * as InternalSchema from "./internal/schema.js"
import * as Parser from "./Parser.js"
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
export const PrettyHookId: unique symbol = hooks.PrettyHookId

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
  <I>(self: Schema.Schema<I, A>): Schema.Schema<I, A> =>
    InternalSchema.make(AST.setAnnotation(self.ast, PrettyHookId, handler))

/**
 * @category prettify
 * @since 1.0.0
 */
export const make = <I, A>(schema: Schema.Schema<I, A>): (a: A) => string => compile(schema.ast)

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

const formatUnknown = getMatcher(Format.formatUnknown)

/**
 * @since 1.0.0
 */
export const match: AST.Match<Pretty<any>> = {
  "Declaration": (ast, go) => {
    const hook = getHook(ast)
    if (Option.isSome(hook)) {
      return hook.value(...ast.typeParameters.map(go))
    }
    throw new Error("cannot build an Pretty for a declaration without annotations")
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
  "Tuple": (ast, go) => {
    const hook = getHook(ast)
    if (Option.isSome(hook)) {
      return hook.value()
    }
    const elements = ast.elements.map((e) => go(e.type))
    const rest = Option.map(ast.rest, ReadonlyArray.map(go))
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
      if (Option.isSome(rest)) {
        const [head, ...tail] = rest.value
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
          `${getPrettyPropertyKey(name)}: ${propertySignaturesTypes[i](input[name])}`
        )
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (indexSignatureTypes.length > 0) {
        for (let i = 0; i < indexSignatureTypes.length; i++) {
          const type = indexSignatureTypes[i]
          const keys = Internal.getKeysForIndexSignature(input, ast.indexSignatures[i].parameter)
          for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
              continue
            }
            output.push(`${getPrettyPropertyKey(key)}: ${type(input[key])}`)
          }
        }
      }

      return ReadonlyArray.isNonEmptyReadonlyArray(output) ? "{ " + output.join(", ") + " }" : "{}"
    }
  },
  "Union": (ast, go) => {
    const hook = getHook(ast)
    if (Option.isSome(hook)) {
      return hook.value()
    }
    const types = ast.types.map((ast) => [Parser.is(InternalSchema.make(ast)), go(ast)] as const)
    return (a) => {
      const index = types.findIndex(([is]) => is(a))
      return types[index][1](a)
    }
  },
  "Suspend": (ast, go) => {
    return Option.match(getHook(ast), {
      onNone: () => {
        const get = Internal.memoizeThunk(() => go(ast.f()))
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
  "Transform": (ast, go) => {
    return Option.match(getHook(ast), {
      onNone: () => go(ast.to),
      onSome: (handler) => handler()
    })
  }
}

const compile = AST.getCompiler(match)

const getPrettyPropertyKey = (name: PropertyKey): string =>
  typeof name === "string" ? JSON.stringify(name) : String(name)
