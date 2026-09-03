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
const isCache = new WeakMap<SchemaAST.AST, Decoder | null>()
const runtimeCache = new WeakMap<SchemaAST.AST, Decoder>()
const suspendCache = new WeakMap<SchemaAST.Suspend, Decoder>()
const suspendIsCache = new WeakMap<SchemaAST.Suspend, Decoder>()

const hasParseOptions = (ast: SchemaAST.AST): boolean => {
  const annotations = ast.checks === undefined
    ? ast.annotations
    : ast.checks[ast.checks.length - 1].annotations
  return annotations?.["parseOptions"] !== undefined
}

const isOptional = (ast: SchemaAST.AST): boolean => ast.context?.isOptional ?? false

const canEmitIndexParameter = (ast: SchemaAST.AST): boolean => canEmit(SchemaAST.parameterFromPropertyKey(ast))

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
      return true
    case "Objects":
      if (ast.indexSignatures.length === 0) {
        return true
      }
      return ast.indexSignatures.every((signature) => canEmitIndexParameter(signature.parameter))
    case "Union":
      return true
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

const suspendDecoder = (ast: SchemaAST.Suspend, needsValue: boolean): Decoder => {
  const targetCache = needsValue ? suspendCache : suspendIsCache
  const cached = targetCache.get(ast)
  if (cached !== undefined) return cached
  let target: Decoder | undefined
  const decoder: Decoder = (input) => {
    if (target === undefined) {
      const targetAST = ast.thunk()
      target = (needsValue ? compile(targetAST) : compileIs(targetAST)) ?? runtimeDecoder(targetAST)
    }
    return target(input)
  }
  targetCache.set(ast, decoder)
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
  readonly decoderHelpers: readonly [Map<SchemaAST.AST, string>, Map<SchemaAST.AST, string>]
  readonly unionHelpers: readonly [Map<SchemaAST.Union, string>, Map<SchemaAST.Union, string>]
  readonly constants: Array<unknown>
  readonly constantIndexes: Map<unknown, number>
  next: number
}

const variable = (emitter: Emitter): string => `v${emitter.next++}`

const propertyKey = (emitter: Emitter, key: PropertyKey): string =>
  typeof key === "string" ? JSON.stringify(key) : constant(emitter, key)

const propertyPresence = (input: string, key: string, name: PropertyKey): string =>
  name === "__proto__" ? `Object.hasOwn(${input},${key})` : `${key} in ${input}`

const assignProperty = (output: string, key: string, value: string, name: PropertyKey): string =>
  name === "__proto__"
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

const needsPresenceCheck = (ast: SchemaAST.AST): boolean => {
  if (!canEmit(ast)) return true
  switch (ast._tag) {
    case "Undefined":
    case "Void":
    case "Any":
    case "Unknown":
      return true
    case "Union":
      return ast.types.some(needsPresenceCheck)
    default:
      return false
  }
}

const propertyNeedsPresenceCheck = (name: PropertyKey, ast: SchemaAST.AST): boolean =>
  name === "__proto__" || needsPresenceCheck(ast)

const getEncodingChecks = (ast: SchemaAST.AST): SchemaAST.Checks | undefined => {
  switch (ast._tag) {
    case "Arrays":
    case "Objects":
    case "Union":
      return ast.encodingChecks
    default:
      return undefined
  }
}

const failsChecks = (ast: SchemaAST.AST, value: unknown, encoded = false): boolean => {
  const checks = encoded ? getEncodingChecks(ast) : ast.checks
  return checks !== undefined &&
    SchemaAST.collectIssues(checks, value, undefined, ast, SchemaAST.defaultParseOptions) !== undefined
}

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
  emitter: Emitter,
  needsValue: boolean
): string {
  const output = emitBase(ast, input, statements, emitter, needsValue || ast.checks !== undefined)
  const encodingChecks = getEncodingChecks(ast)
  const astConstant = ast.checks !== undefined || encodingChecks !== undefined ? constant(emitter, ast) : undefined
  if (encodingChecks !== undefined) {
    statements.push(`if(K(${astConstant},${input},1))return I`)
  }
  if (ast.checks === undefined) return output
  const checked = variable(emitter)
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
  let current = emit(links[links.length - 1].to, input, statements, emitter, true)
  for (let index = links.length - 1; index >= 0; index--) {
    const transformed = variable(emitter)
    const transformation = constant(emitter, links[index].transformation)
    statements.push(`const ${transformed}=X(${transformation},${current})`, `if(${transformed}===I)return I`)
    current = index === 0 ? transformed : emit(links[index - 1].to, transformed, statements, emitter, true)
  }
  return emitDecoded(ast, current, statements, emitter, true)
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
  emitter: Emitter,
  needsValue: boolean
): string {
  if (!canEmit(ast)) {
    const output = variable(emitter)
    const decoder = constant(
      emitter,
      ast._tag === "Suspend" && ast.encoding === undefined ? suspendDecoder(ast, needsValue) : runtimeDecoder(ast)
    )
    statements.push(`const ${output}=${decoder}(${input})`, `if(${output}===I)return I`)
    return output
  }
  return ast.encoding === undefined
    ? emitDecoded(ast, input, statements, emitter, needsValue)
    : emitEncoding(ast, input, statements, emitter)
}

const emitDecoderHelper = (ast: SchemaAST.AST, emitter: Emitter, needsValue: boolean): string => {
  const helpers = emitter.decoderHelpers[needsValue ? 1 : 0]
  const cached = helpers.get(ast)
  if (cached !== undefined) return cached
  const name = `d${emitter.next++}`
  helpers.set(ast, name)
  const statements: Array<string> = []
  const output = emit(ast, "i", statements, emitter, needsValue)
  emitter.helpers.push(`function ${name}(i){${statements.join(";")};return ${output}}`)
  return name
}

const emitUnionHelper = (ast: SchemaAST.Union, emitter: Emitter, needsValue: boolean): string => {
  const helpers = emitter.unionHelpers[needsValue ? 1 : 0]
  const cached = helpers.get(ast)
  if (cached !== undefined) return cached
  const name = `u${emitter.next++}`
  helpers.set(ast, name)
  const entries = ast.types.map((type) =>
    `[${constant(emitter, type)},${emitDecoderHelper(type, emitter, needsValue)}]`
  )
  emitter.initializers.push(`const ${name}=new Map([${entries.join(",")}])`)
  return name
}

const emitIndexes = (
  ast: SchemaAST.Objects,
  input: string,
  output: string | undefined,
  statements: Array<string>,
  emitter: Emitter,
  needsValue: boolean
): void => {
  const fixedKeys = output === undefined || ast.propertySignatures.length === 0
    ? undefined
    : constant(emitter, new Set(ast.propertySignatures.map((property) => property.name)))
  for (const signature of ast.indexSignatures) {
    const keys = variable(emitter)
    const index = variable(emitter)
    const key = variable(emitter)
    const parameter = signature.parameter
    statements.push(
      `const ${keys}=${
        parameter._tag === "String" && parameter.checks === undefined
          ? `Object.keys(${input})`
          : `G(${input},${constant(emitter, parameter)})`
      }`
    )
    const loop: Array<string> = [`const ${key}=${keys}[${index}]`]
    const decodedKey = parameter._tag === "String" && parameter.checks === undefined && parameter.encoding === undefined
      ? key
      : emit(SchemaAST.parameterFromPropertyKey(parameter), key, loop, emitter, true)
    const value = variable(emitter)
    loop.push(`const ${value}=${input}[${key}]`)
    const decoded = emit(signature.type, value, loop, emitter, needsValue)
    if (output !== undefined) {
      const assign =
        `if(${decodedKey}==="__proto__")Object.defineProperty(${output},${decodedKey},{value:${decoded},writable:true,enumerable:true,configurable:true});else ${output}[${decodedKey}]=${decoded}`
      loop.push(
        fixedKeys === undefined
          ? assign
          : `if(!${fixedKeys}.has(${key})&&!${fixedKeys}.has(${decodedKey})){${assign}}`
      )
    }
    statements.push(`for(let ${index}=0;${index}<${keys}.length;${index}++){${loop.join(";")}}`)
  }
}

const emitBase = (
  ast: SchemaAST.AST,
  input: string,
  statements: Array<string>,
  emitter: Emitter,
  needsValue: boolean
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
          return emit(element, value, statements, emitter, needsValue)
        })
        return needsValue ? `[${elements.join(",")}]` : input
      }
      statements.push(`if(${length}<${elementLength + tailLength})return I`)
      if (!needsValue) {
        for (let index = 0; index < elementLength; index++) {
          const value = variable(emitter)
          statements.push(`const ${value}=${input}[${index}]`)
          emit(ast.elements[index], value, statements, emitter, false)
        }
        const index = variable(emitter)
        const restStatements: Array<string> = []
        const value = variable(emitter)
        restStatements.push(`const ${value}=${input}[${index}]`)
        emit(ast.rest[0], value, restStatements, emitter, false)
        statements.push(
          `for(let ${index}=${elementLength};${index}<${length}-${tailLength};${index}++){${restStatements.join(";")}}`
        )
        for (let index = 0; index < tailLength; index++) {
          const value = variable(emitter)
          statements.push(`const ${value}=${input}[${length}-${tailLength - index}]`)
          emit(ast.rest[index + 1], value, statements, emitter, false)
        }
        return input
      }
      const output = variable(emitter)
      statements.push(`const ${output}=new Array(${length})`)
      for (let index = 0; index < elementLength; index++) {
        const value = variable(emitter)
        statements.push(`const ${value}=${input}[${index}]`)
        const decoded = emit(ast.elements[index], value, statements, emitter, true)
        statements.push(`${output}[${index}]=${decoded}`)
      }
      const index = variable(emitter)
      const restStatements: Array<string> = []
      const value = variable(emitter)
      restStatements.push(`const ${value}=${input}[${index}]`)
      const decoded = emit(ast.rest[0], value, restStatements, emitter, true)
      restStatements.push(`${output}[${index}]=${decoded}`)
      statements.push(
        `for(let ${index}=${elementLength};${index}<${length}-${tailLength};${index}++){${restStatements.join(";")}}`
      )
      for (let index = 0; index < tailLength; index++) {
        const inputIndex = `${length}-${tailLength - index}`
        const value = variable(emitter)
        statements.push(`const ${value}=${input}[${inputIndex}]`)
        const decoded = emit(ast.rest[index + 1], value, statements, emitter, true)
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
      if (ast.indexSignatures.length > 0 && ast.propertySignatures.length === 0) {
        if (!needsValue) {
          emitIndexes(ast, input, undefined, statements, emitter, false)
          return input
        }
        const output = variable(emitter)
        statements.push(`const ${output}={}`)
        emitIndexes(ast, input, output, statements, emitter, true)
        return output
      }
      if (!needsValue) {
        for (const property of ast.propertySignatures) {
          const key = propertyKey(emitter, property.name)
          const value = variable(emitter)
          const propertyStatements: Array<string> = [`const ${value}=${input}[${key}]`]
          emit(property.type, value, propertyStatements, emitter, false)
          statements.push(
            isOptional(property.type)
              ? `if(${propertyPresence(input, key, property.name)}){${propertyStatements.join(";")}}`
              : `${
                propertyNeedsPresenceCheck(property.name, property.type)
                  ? `if(!(${propertyPresence(input, key, property.name)}))return I;`
                  : ""
              }${propertyStatements.join(";")}`
          )
        }
        if (ast.indexSignatures.length > 0) {
          emitIndexes(ast, input, undefined, statements, emitter, false)
        }
        return input
      }
      const output = variable(emitter)
      const plainStatements: Array<string> = []
      if (ast.propertySignatures.some((property) => isOptional(property.type))) {
        plainStatements.push(`const ${output}={}`)
        for (const property of ast.propertySignatures) {
          const key = propertyKey(emitter, property.name)
          const value = variable(emitter)
          const propertyStatements: Array<string> = [`const ${value}=${input}[${key}]`]
          const decoded = emit(property.type, value, propertyStatements, emitter, true)
          propertyStatements.push(assignProperty(output, key, decoded, property.name))
          plainStatements.push(
            isOptional(property.type)
              ? `if(${propertyPresence(input, key, property.name)}){${propertyStatements.join(";")}}`
              : `${
                propertyNeedsPresenceCheck(property.name, property.type)
                  ? `if(!(${propertyPresence(input, key, property.name)}))return I;`
                  : ""
              }${propertyStatements.join(";")}`
          )
        }
      } else {
        const properties = ast.propertySignatures.map((property) => {
          const key = propertyKey(emitter, property.name)
          const outputKey = typeof property.name === "string" && property.name !== "__proto__" ? key : `[${key}]`
          const value = variable(emitter)
          if (propertyNeedsPresenceCheck(property.name, property.type)) {
            plainStatements.push(`if(!(${propertyPresence(input, key, property.name)}))return I`)
          }
          plainStatements.push(`const ${value}=${input}[${key}]`)
          return `${outputKey}:${emit(property.type, value, plainStatements, emitter, true)}`
        })
        plainStatements.push(`const ${output}={${properties.join(",")}}`)
      }
      statements.push(...plainStatements)
      if (ast.indexSignatures.length > 0) {
        emitIndexes(ast, input, output, statements, emitter, true)
      }
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
      const decoders = emitUnionHelper(ast, emitter, needsValue)
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

const make = (ast: SchemaAST.AST, needsValue: boolean): Decoder | undefined => {
  try {
    if (!canEmit(ast)) return undefined
    const emitter: Emitter = {
      statements: [],
      helpers: [],
      initializers: [],
      decoderHelpers: [new Map(), new Map()],
      unionHelpers: [new Map(), new Map()],
      constants: [],
      constantIndexes: new Map(),
      next: 0
    }
    const output = emit(ast, "i", emitter.statements, emitter, needsValue)
    const source = `"use strict";${emitter.helpers.join(";")};${emitter.initializers.join(";")};return function(i){${
      emitter.statements.join(";")
    };return ${output}}`
    return globalThis.Function("I", "C", "K", "T", "U", "G", "X", "Y", source)(
      invalid,
      emitter.constants,
      failsChecks,
      matchesTemplateLiteral,
      SchemaAST.getCandidates,
      SchemaAST.getIndexSignatureKeys,
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
  const decoder = make(ast, true)
  cache.set(ast, decoder ?? null)
  return decoder
}

/** @internal */
export const compileIs = (ast: SchemaAST.AST): Decoder | undefined => {
  const cached = isCache.get(ast)
  if (cached !== undefined) return cached ?? undefined
  const decoder = make(ast, false)
  isCache.set(ast, decoder ?? null)
  return decoder
}
