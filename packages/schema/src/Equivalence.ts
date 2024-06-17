/**
 * @since 0.67.0
 */

import * as Arr from "effect/Array"
import * as Equal from "effect/Equal"
import * as Equivalence from "effect/Equivalence"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as AST from "./AST.js"
import * as errors_ from "./internal/errors.js"
import * as util_ from "./internal/util.js"
import * as ParseResult from "./ParseResult.js"
import type * as Schema from "./Schema.js"

/**
 * @category hooks
 * @since 0.67.0
 */
export const EquivalenceHookId: unique symbol = Symbol.for("@effect/schema/EquivalenceHookId")

/**
 * @category hooks
 * @since 0.67.0
 */
export type EquivalenceHookId = typeof EquivalenceHookId

/**
 * @category annotations
 * @since 0.67.0
 */
export const equivalence =
  <A>(handler: (...args: ReadonlyArray<Equivalence.Equivalence<any>>) => Equivalence.Equivalence<A>) =>
  <I, R>(self: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> => self.annotations({ [EquivalenceHookId]: handler })

/**
 * @category Equivalence
 * @since 0.67.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): Equivalence.Equivalence<A> => go(schema.ast, [])

const getHook = AST.getAnnotation<
  (...args: ReadonlyArray<Equivalence.Equivalence<any>>) => Equivalence.Equivalence<any>
>(
  EquivalenceHookId
)

const go = (ast: AST.AST, path: ReadonlyArray<PropertyKey>): Equivalence.Equivalence<any> => {
  const hook = getHook(ast)
  if (Option.isSome(hook)) {
    switch (ast._tag) {
      case "Declaration":
        return hook.value(...ast.typeParameters.map((tp) => go(tp, path)))
      case "Refinement":
        return hook.value(go(ast.from, path))
      default:
        return hook.value()
    }
  }
  switch (ast._tag) {
    case "NeverKeyword":
      throw new Error(errors_.getEquivalenceUnsupportedErrorMessage(ast, path))
    case "Transformation":
      return go(ast.to, path)
    case "Declaration":
    case "Literal":
    case "StringKeyword":
    case "TemplateLiteral":
    case "UniqueSymbol":
    case "SymbolKeyword":
    case "UnknownKeyword":
    case "AnyKeyword":
    case "NumberKeyword":
    case "BooleanKeyword":
    case "BigIntKeyword":
    case "UndefinedKeyword":
    case "VoidKeyword":
    case "Enums":
    case "ObjectKeyword":
      return Equal.equals
    case "Refinement":
      return go(ast.from, path)
    case "Suspend": {
      const get = util_.memoizeThunk(() => go(ast.f(), path))
      return (a, b) => get()(a, b)
    }
    case "TupleType": {
      const elements = ast.elements.map((element, i) => go(element.type, path.concat(i)))
      const rest = ast.rest.map((annotatedAST) => go(annotatedAST.type, path))
      return Equivalence.make((a, b) => {
        const len = a.length
        if (len !== b.length) {
          return false
        }
        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        let i = 0
        for (; i < Math.min(len, ast.elements.length); i++) {
          if (!elements[i](a[i], b[i])) {
            return false
          }
        }
        // ---------------------------------------------
        // handle rest element
        // ---------------------------------------------
        if (Arr.isNonEmptyReadonlyArray(rest)) {
          const [head, ...tail] = rest
          for (; i < len - tail.length; i++) {
            if (!head(a[i], b[i])) {
              return false
            }
          }
          // ---------------------------------------------
          // handle post rest elements
          // ---------------------------------------------
          for (let j = 0; j < tail.length; j++) {
            i += j
            if (!tail[j](a[i], b[i])) {
              return false
            }
          }
        }
        return true
      })
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return Equal.equals
      }
      const propertySignatures = ast.propertySignatures.map((ps) => go(ps.type, path.concat(ps.name)))
      const indexSignatures = ast.indexSignatures.map((is) => go(is.type, path))
      return Equivalence.make((a, b) => {
        const aStringKeys = Object.keys(a)
        const aSymbolKeys = Object.getOwnPropertySymbols(a)
        // ---------------------------------------------
        // handle property signatures
        // ---------------------------------------------
        for (let i = 0; i < propertySignatures.length; i++) {
          const ps = ast.propertySignatures[i]
          const name = ps.name
          const aHas = Object.prototype.hasOwnProperty.call(a, name)
          const bHas = Object.prototype.hasOwnProperty.call(b, name)
          if (ps.isOptional) {
            if (aHas !== bHas) {
              return false
            }
          }
          if (aHas && bHas && !propertySignatures[i](a[name], b[name])) {
            return false
          }
        }
        // ---------------------------------------------
        // handle index signatures
        // ---------------------------------------------
        let bSymbolKeys: Array<symbol> | undefined
        let bStringKeys: Array<string> | undefined
        for (let i = 0; i < indexSignatures.length; i++) {
          const is = ast.indexSignatures[i]
          const base = AST.getParameterBase(is.parameter)
          const isSymbol = AST.isSymbolKeyword(base)
          if (isSymbol) {
            bSymbolKeys = bSymbolKeys || Object.getOwnPropertySymbols(b)
            if (aSymbolKeys.length !== bSymbolKeys.length) {
              return false
            }
          } else {
            bStringKeys = bStringKeys || Object.keys(b)
            if (aStringKeys.length !== bStringKeys.length) {
              return false
            }
          }
          const aKeys = isSymbol ? aSymbolKeys : aStringKeys
          for (let j = 0; j < aKeys.length; j++) {
            const key = aKeys[j]
            if (
              !Object.prototype.hasOwnProperty.call(b, key) || !indexSignatures[i](a[key], b[key])
            ) {
              return false
            }
          }
        }
        return true
      })
    }
    case "Union": {
      const searchTree = ParseResult.getSearchTree(ast.types, true)
      const ownKeys = util_.ownKeys(searchTree.keys)
      const len = ownKeys.length
      return Equivalence.make((a, b) => {
        let candidates: Array<AST.AST> = []
        if (len > 0 && Predicate.isRecord(a)) {
          for (let i = 0; i < len; i++) {
            const name = ownKeys[i]
            const buckets = searchTree.keys[name].buckets
            if (Object.prototype.hasOwnProperty.call(a, name)) {
              const literal = String(a[name])
              if (Object.prototype.hasOwnProperty.call(buckets, literal)) {
                candidates = candidates.concat(buckets[literal])
              }
            }
          }
        }
        if (searchTree.otherwise.length > 0) {
          candidates = candidates.concat(searchTree.otherwise)
        }
        const tuples = candidates.map((ast) => [go(ast, path), ParseResult.is({ ast } as any)] as const)
        for (let i = 0; i < tuples.length; i++) {
          const [equivalence, is] = tuples[i]
          if (is(a) && is(b)) {
            if (equivalence(a, b)) {
              return true
            }
          }
        }
        return false
      })
    }
  }
}
