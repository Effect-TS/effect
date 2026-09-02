import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Option from "../../Option.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import * as SchemaParser from "../../SchemaParser.ts"
import { effectIsExit } from "../effect.ts"
import * as InternalSchemaCause from "./cause.ts"
import { type Decoder, DecoderFailure, invalid } from "./compilerHook.ts"

const cache = new WeakMap<SchemaAST.AST, Decoder | null>()
const runtimeCache = new WeakMap<SchemaAST.AST, Decoder>()

const hasParseOptions = (ast: SchemaAST.AST): boolean => {
  const annotations = ast.checks === undefined
    ? ast.annotations
    : ast.checks[ast.checks.length - 1].annotations
  return annotations?.["parseOptions"] !== undefined
}

const isCompatible = (ast: SchemaAST.AST): boolean => ast.encoding === undefined && !hasParseOptions(ast)

const isOptional = (ast: SchemaAST.AST): boolean => ast.context?.isOptional ?? false

const canEmitShape = (ast: SchemaAST.AST): boolean => {
  switch (ast._tag) {
    case "Null":
    case "Undefined":
    case "Void":
    case "Never":
    case "Any":
    case "Unknown":
    case "ObjectKeyword":
    case "Enum":
    case "UniqueSymbol":
    case "Literal":
    case "String":
    case "Number":
    case "Boolean":
    case "Symbol":
    case "BigInt":
    case "TemplateLiteral":
      return true
    case "Arrays":
      return ast.encodingChecks === undefined
    case "Objects":
      if (ast.encodingChecks !== undefined) return false
      if (ast.indexSignatures.length === 0) {
        return ast.propertySignatures.every((property) => typeof property.name === "string")
      }
      return ast.propertySignatures.length === 0 &&
        ast.indexSignatures.length === 1 &&
        ast.indexSignatures[0].parameter._tag === "String" &&
        ast.indexSignatures[0].parameter.checks === undefined &&
        isCompatible(ast.indexSignatures[0].parameter)
    case "Union":
      return ast.encodingChecks === undefined
    default:
      return false
  }
}

const canEmit = (ast: SchemaAST.AST): boolean => !hasParseOptions(ast) && canEmitShape(ast)

const runtimeDecoder = (ast: SchemaAST.AST): Decoder => {
  const cached = runtimeCache.get(ast)
  if (cached !== undefined) return cached
  const parse = SchemaParser.run<unknown, never>(ast)
  const decoder: Decoder = (input) => {
    const result = parse(input)
    const exit = effectIsExit(result) ? result : Effect.runSyncExit(result)
    if (Exit.isSuccess(exit)) return exit.value
    if (InternalSchemaCause.getSchemaIssue(exit.cause) !== undefined) return invalid
    throw new DecoderFailure(exit.cause)
  }
  runtimeCache.set(ast, decoder)
  return decoder
}

const transform = (
  transformation: SchemaAST.Link["transformation"],
  value: unknown
): unknown | typeof invalid => {
  const option = Option.some(value)
  const result = transformation._tag === "Transformation"
    ? transformation.decode.run(option, SchemaAST.defaultParseOptions)
    : transformation.decode(Effect.succeed(option), SchemaAST.defaultParseOptions)
  const exit = effectIsExit(result)
    ? result
    : Effect.runSyncExit(result as Effect.Effect<Option.Option<unknown>, SchemaIssue.Issue>)
  if (Exit.isSuccess(exit)) {
    return Option.isSome(exit.value) ? exit.value.value : invalid
  }
  if (InternalSchemaCause.getSchemaIssue(exit.cause) !== undefined) return invalid
  throw new DecoderFailure(exit.cause)
}

const wrapEncodingFailure = (
  error: unknown,
  ast: SchemaAST.AST,
  input: unknown
): unknown =>
  error instanceof DecoderFailure
    ? new DecoderFailure(Cause.map(
      error.cause,
      (issue) => new SchemaIssue.Encoding(ast, issue, input, SchemaAST.defaultParseOptions)
    ))
    : error

type Emitter = {
  readonly statements: Array<string>
  readonly helpers: Array<string>
  readonly initializers: Array<string>
  readonly objectHelpers: Map<SchemaAST.Objects, string>
  readonly decoderHelpers: Map<SchemaAST.AST, string>
  readonly unionHelpers: Map<SchemaAST.Union, string>
  readonly constants: Array<unknown>
  readonly constantIndexes: Map<unknown, number>
  next: number
}

const variable = (emitter: Emitter): string => `v${emitter.next++}`

const assignProperty = (output: string, key: string, value: string): string =>
  key === "\"__proto__\""
    ? `Object.defineProperty(${output},${key},{value:${value},writable:true,enumerable:true,configurable:true})`
    : `${output}[${key}]=${value}`

const constant = (emitter: Emitter, value: unknown): string => {
  const cached = emitter.constantIndexes.get(value)
  if (cached !== undefined) return `C[${cached}]`
  const index = emitter.constants.length
  emitter.constants.push(value)
  emitter.constantIndexes.set(value, index)
  return `C[${index}]`
}

const needsOwnProperty = (ast: SchemaAST.AST): boolean => {
  if (!canEmit(ast)) return true
  switch (ast._tag) {
    case "Undefined":
    case "Void":
    case "Any":
    case "Unknown":
      return true
    case "Union":
      return ast.types.some(needsOwnProperty)
    default:
      return false
  }
}

const failsChecks = (ast: SchemaAST.AST, value: unknown): boolean =>
  ast.checks !== undefined &&
  SchemaAST.collectIssues(ast.checks, value, undefined, ast, SchemaAST.defaultParseOptions) !== undefined

const matchesTemplateLiteral = (ast: SchemaAST.TemplateLiteral, value: unknown): boolean =>
  typeof value === "string" && ast.matchPart(value, SchemaAST.defaultParseOptions) !== undefined

const lookupMemberValues = (ast: SchemaAST.AST): ReadonlyArray<unknown> | undefined => {
  if (ast.checks !== undefined) return undefined
  switch (ast._tag) {
    case "Null":
      return [null]
    case "Undefined":
      return [undefined]
    case "Literal":
      return [ast.literal]
    case "UniqueSymbol":
      return [ast.symbol]
    case "Enum":
      return [...new Set(ast.enums.map((entry) => entry[1]))]
    default:
      return undefined
  }
}

function emitDecoded(
  ast: SchemaAST.AST,
  input: string,
  statements: Array<string>,
  emitter: Emitter
): string {
  const output = emitBase(ast, input, statements, emitter)
  if (ast.checks === undefined) return output
  const checked = variable(emitter)
  const astConstant = constant(emitter, ast)
  statements.push(`const ${checked}=${output}`, `if(K(${astConstant},${checked}))return I`)
  return checked
}

function emitEncodingBody(
  ast: SchemaAST.AST,
  input: string,
  statements: Array<string>,
  emitter: Emitter
): string {
  const links = ast.encoding!
  let current = emit(links[links.length - 1].to, input, statements, emitter)
  for (let index = links.length - 1; index >= 0; index--) {
    const transformed = variable(emitter)
    const transformation = constant(emitter, links[index].transformation)
    statements.push(`const ${transformed}=X(${transformation},${current})`, `if(${transformed}===I)return I`)
    current = index === 0 ? transformed : emit(links[index - 1].to, transformed, statements, emitter)
  }
  return emitDecoded(ast, current, statements, emitter)
}

function emitEncoding(
  ast: SchemaAST.AST,
  input: string,
  statements: Array<string>,
  emitter: Emitter
): string {
  const body: Array<string> = []
  const output = emitEncodingBody(ast, input, body, emitter)
  const result = variable(emitter)
  const error = variable(emitter)
  const astConstant = constant(emitter, ast)
  statements.push(
    `let ${result};try{${body.join(";")};${result}=${output}}catch(${error}){throw Y(${error},${astConstant},${input})}`
  )
  return result
}

function emit(
  ast: SchemaAST.AST,
  input: string,
  statements: Array<string>,
  emitter: Emitter
): string {
  if (!canEmit(ast)) {
    const output = variable(emitter)
    const decoder = constant(emitter, runtimeDecoder(ast))
    statements.push(`const ${output}=${decoder}(${input})`, `if(${output}===I)return I`)
    return output
  }
  return ast.encoding === undefined
    ? emitDecoded(ast, input, statements, emitter)
    : emitEncoding(ast, input, statements, emitter)
}

const emitDecoderHelper = (ast: SchemaAST.AST, emitter: Emitter): string => {
  const cached = emitter.decoderHelpers.get(ast)
  if (cached !== undefined) return cached
  const name = `d${emitter.decoderHelpers.size}`
  emitter.decoderHelpers.set(ast, name)
  const statements: Array<string> = []
  const output = emit(ast, "i", statements, emitter)
  emitter.helpers.push(`function ${name}(i){${statements.join(";")};return ${output}}`)
  return name
}

const emitUnionHelper = (ast: SchemaAST.Union, emitter: Emitter): string => {
  const cached = emitter.unionHelpers.get(ast)
  if (cached !== undefined) return cached
  const name = `u${emitter.unionHelpers.size}`
  emitter.unionHelpers.set(ast, name)
  const entries = ast.types.map((type) => `[${constant(emitter, type)},${emitDecoderHelper(type, emitter)}]`)
  emitter.initializers.push(`const ${name}=new Map([${entries.join(",")}])`)
  return name
}

const emitObjectHelper = (ast: SchemaAST.Objects, emitter: Emitter): string => {
  const cached = emitter.objectHelpers.get(ast)
  if (cached !== undefined) return cached
  const name = `h${emitter.objectHelpers.size}`
  emitter.objectHelpers.set(ast, name)
  const statements: Array<string> = []
  if (ast.propertySignatures.some((property) => isOptional(property.type))) {
    const output = variable(emitter)
    statements.push(`const ${output}={}`)
    for (const property of ast.propertySignatures) {
      const key = JSON.stringify(property.name)
      const value = variable(emitter)
      const propertyStatements: Array<string> = [`const ${value}=i[${key}]`]
      const decoded = emit(property.type, value, propertyStatements, emitter)
      propertyStatements.push(assignProperty(output, key, decoded))
      statements.push(
        isOptional(property.type)
          ? `if(Object.hasOwn(i,${key})){${propertyStatements.join(";")}}`
          : `if(!Object.hasOwn(i,${key}))return I;${propertyStatements.join(";")}`
      )
    }
    emitter.helpers.push(`function ${name}(i){${statements.join(";")};return ${output}}`)
    return name
  }
  const properties = ast.propertySignatures.map((property) => {
    const key = JSON.stringify(property.name)
    const value = variable(emitter)
    statements.push(`if(!Object.hasOwn(i,${key}))return I`, `const ${value}=i[${key}]`)
    return `[${key}]:${emit(property.type, value, statements, emitter)}`
  })
  emitter.helpers.push(`function ${name}(i){${statements.join(";")};return{${properties.join(",")}}}`)
  return name
}

const emitBase = (
  ast: SchemaAST.AST,
  input: string,
  statements: Array<string>,
  emitter: Emitter
): string => {
  switch (ast._tag) {
    case "Null":
      statements.push(`if(${input}!==null)return I`)
      return input
    case "Undefined":
      statements.push(`if(${input}!==void 0)return I`)
      return input
    case "Void":
      return "void 0"
    case "Never":
      statements.push("return I")
      return input
    case "Any":
    case "Unknown":
      return input
    case "ObjectKeyword":
      statements.push(`if((${input}===null||typeof ${input}!=="object")&&typeof ${input}!=="function")return I`)
      return input
    case "Enum": {
      const values = constant(emitter, new Set(ast.enums.map((entry) => entry[1])))
      statements.push(`if(!${values}.has(${input}))return I`)
      return input
    }
    case "UniqueSymbol": {
      const value = constant(emitter, ast.symbol)
      statements.push(`if(${input}!==${value})return I`)
      return input
    }
    case "Literal": {
      const value = constant(emitter, ast.literal)
      statements.push(`if(${input}!==${value})return I`)
      return input
    }
    case "String":
      statements.push(`if(typeof ${input}!=="string")return I`)
      return input
    case "Number":
      statements.push(`if(typeof ${input}!=="number")return I`)
      return input
    case "Boolean":
      statements.push(`if(typeof ${input}!=="boolean")return I`)
      return input
    case "Symbol":
      statements.push(`if(typeof ${input}!=="symbol")return I`)
      return input
    case "BigInt":
      statements.push(`if(typeof ${input}!=="bigint")return I`)
      return input
    case "TemplateLiteral": {
      const template = constant(emitter, ast)
      statements.push(`if(!T(${template},${input}))return I`)
      return input
    }
    case "Arrays": {
      statements.push(`if(!Array.isArray(${input}))return I`)
      const length = variable(emitter)
      statements.push(`const ${length}=${input}.length`)
      const elementLength = ast.elements.length
      const tailLength = Math.max(0, ast.rest.length - 1)
      if (ast.rest.length === 0) {
        statements.push(`if(${length}!==${elementLength})return I`)
        const elements = ast.elements.map((element, index) => {
          const value = variable(emitter)
          statements.push(`const ${value}=${input}[${index}]`)
          return emit(element, value, statements, emitter)
        })
        return `[${elements.join(",")}]`
      }
      statements.push(`if(${length}<${elementLength + tailLength})return I`)
      const output = variable(emitter)
      statements.push(`const ${output}=new Array(${length})`)
      for (let index = 0; index < elementLength; index++) {
        const value = variable(emitter)
        statements.push(`const ${value}=${input}[${index}]`)
        const decoded = emit(ast.elements[index], value, statements, emitter)
        statements.push(`${output}[${index}]=${decoded}`)
      }
      const index = variable(emitter)
      const restStatements: Array<string> = []
      const value = variable(emitter)
      restStatements.push(`const ${value}=${input}[${index}]`)
      const decoded = emit(ast.rest[0], value, restStatements, emitter)
      restStatements.push(`${output}[${index}]=${decoded}`)
      statements.push(
        `for(let ${index}=${elementLength};${index}<${length}-${tailLength};${index}++){${restStatements.join(";")}}`
      )
      for (let index = 0; index < tailLength; index++) {
        const inputIndex = `${length}-${tailLength - index}`
        const value = variable(emitter)
        statements.push(`const ${value}=${input}[${inputIndex}]`)
        const decoded = emit(ast.rest[index + 1], value, statements, emitter)
        statements.push(`${output}[${inputIndex}]=${decoded}`)
      }
      return output
    }
    case "Objects": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        statements.push(`if(${input}===null||${input}===void 0)return I`)
        return input
      }
      statements.push(
        `if(typeof ${input}!=="object"||${input}===null||Array.isArray(${input}))return I`
      )
      if (ast.indexSignatures.length > 0) {
        const keys = variable(emitter)
        const output = variable(emitter)
        const index = variable(emitter)
        const key = variable(emitter)
        statements.push(`const ${keys}=Object.keys(${input})`, `const ${output}={}`)
        const loop: Array<string> = [`const ${key}=${keys}[${index}]`]
        const value = variable(emitter)
        loop.push(`const ${value}=${input}[${key}]`)
        const decoded = emit(ast.indexSignatures[0].type, value, loop, emitter)
        loop.push(
          `if(${key}==="__proto__")Object.defineProperty(${output},${key},{value:${decoded},writable:true,enumerable:true,configurable:true});else ${output}[${key}]=${decoded}`
        )
        statements.push(
          `for(let ${index}=0;${index}<${keys}.length;${index}++){${loop.join(";")}}`
        )
        return output
      }
      const helper = emitObjectHelper(ast, emitter)
      const prototype = variable(emitter)
      const output = variable(emitter)
      statements.push(`const ${prototype}=Object.getPrototypeOf(${input})`)
      const plainStatements: Array<string> = []
      if (ast.propertySignatures.some((property) => isOptional(property.type))) {
        plainStatements.push(`${output}={}`)
        for (const property of ast.propertySignatures) {
          const key = JSON.stringify(property.name)
          const value = variable(emitter)
          const propertyStatements: Array<string> = [`const ${value}=${input}[${key}]`]
          const decoded = emit(property.type, value, propertyStatements, emitter)
          propertyStatements.push(assignProperty(output, key, decoded))
          plainStatements.push(
            isOptional(property.type)
              ? `if(Object.hasOwn(${input},${key})){${propertyStatements.join(";")}}`
              : `${needsOwnProperty(property.type) ? `if(!Object.hasOwn(${input},${key}))return I;` : ""}${
                propertyStatements.join(";")
              }`
          )
        }
      } else {
        const properties = ast.propertySignatures.map((property) => {
          const key = JSON.stringify(property.name)
          const value = variable(emitter)
          if (needsOwnProperty(property.type)) {
            plainStatements.push(`if(!Object.hasOwn(${input},${key}))return I`)
          }
          plainStatements.push(`const ${value}=${input}[${key}]`)
          return `[${key}]:${emit(property.type, value, plainStatements, emitter)}`
        })
        plainStatements.push(`${output}={${properties.join(",")}}`)
      }
      statements.push(
        `let ${output};if(${prototype}!==Object.prototype&&${prototype}!==null){${output}=${helper}(${input});if(${output}===I)return I}else{${
          plainStatements.join(";")
        }}`
      )
      return output
    }
    case "Union": {
      const memberValues = ast.types.map(lookupMemberValues)
      if (memberValues.every((values) => values !== undefined)) {
        if (ast.mode === "anyOf") {
          const values = constant(emitter, new Set(memberValues.flat()))
          statements.push(`if(!${values}.has(${input}))return I`)
        } else {
          const counts = new Map<unknown, number>()
          for (const values of memberValues) {
            for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
          }
          const lookup = constant(emitter, counts)
          statements.push(`if(${lookup}.get(${input})!==1)return I`)
        }
        return input
      }
      const candidates = variable(emitter)
      const output = variable(emitter)
      const candidate = variable(emitter)
      const index = variable(emitter)
      const decoder = variable(emitter)
      const types = constant(emitter, ast.types)
      const decoders = emitUnionHelper(ast, emitter)
      statements.push(
        `const ${candidates}=U(${input},${types})`,
        `let ${output}=I,${candidate},${decoder}`
      )
      if (ast.mode === "anyOf") {
        statements.push(
          `for(let ${index}=0;${index}<${candidates}.length;${index}++){${decoder}=${decoders}.get(${candidates}[${index}]);${candidate}=${decoder}(${input});if(${candidate}!==I){${output}=${candidate};break}}`
        )
        statements.push(`if(${output}===I)return I`)
      } else {
        const successes = variable(emitter)
        statements.push(`let ${successes}=0`)
        statements.push(
          `for(let ${index}=0;${index}<${candidates}.length;${index}++){${decoder}=${decoders}.get(${candidates}[${index}]);${candidate}=${decoder}(${input});if(${candidate}!==I){${successes}++;${output}=${candidate}}}`
        )
        statements.push(`if(${successes}!==1)return I`)
      }
      return output
    }
    default:
      throw new Error(`Unsupported Schema AST: ${ast._tag}`)
  }
}

const make = (ast: SchemaAST.AST): Decoder | undefined => {
  try {
    if (!canEmit(ast)) return undefined
    const emitter: Emitter = {
      statements: [],
      helpers: [],
      initializers: [],
      objectHelpers: new Map(),
      decoderHelpers: new Map(),
      unionHelpers: new Map(),
      constants: [],
      constantIndexes: new Map(),
      next: 0
    }
    const output = emit(ast, "i", emitter.statements, emitter)
    const source = `"use strict";${emitter.helpers.join(";")};${emitter.initializers.join(";")};return function(i){${
      emitter.statements.join(";")
    };return ${output}}`
    return globalThis.Function("I", "C", "K", "T", "U", "X", "Y", source)(
      invalid,
      emitter.constants,
      failsChecks,
      matchesTemplateLiteral,
      SchemaAST.getCandidates,
      transform,
      wrapEncodingFailure
    ) as Decoder
  } catch {
    return undefined
  }
}

/** @internal */
export const compile = (ast: SchemaAST.AST): Decoder | undefined => {
  const cached = cache.get(ast)
  if (cached !== undefined) return cached ?? undefined
  const decoder = make(ast)
  cache.set(ast, decoder ?? null)
  return decoder
}
