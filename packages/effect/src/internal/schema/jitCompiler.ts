import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import type * as Option from "../../Option.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import { effectIsExit } from "../effect.ts"
import * as InternalSchemaCause from "./cause.ts"
import {
  getDirectParser,
  invalid,
  type OptimizedCompiledDecoder,
  type OptimizedIs,
  type OptimizedValidate,
  type Parser,
  type ResolveParser
} from "./compilerRegistry.ts"
import * as InternalParser from "./parser.ts"

const hasParseOptions = (ast: SchemaAST.AST): boolean => {
  const annotations = ast.checks === undefined
    ? ast.annotations
    : ast.checks[ast.checks.length - 1].annotations
  return annotations?.["parseOptions"] !== undefined
}

const isOptional = (ast: SchemaAST.AST): boolean => ast.context?.isOptional ?? false

const maxGeneratedDepth = 256
let functionConstructor: FunctionConstructor | undefined
let functionConstructorSupported = false

const supportsDynamicFunction = (): boolean => {
  if (functionConstructor === globalThis.Function) return functionConstructorSupported
  functionConstructor = globalThis.Function
  try {
    functionConstructor("return true")
    return functionConstructorSupported = true
  } catch {
    return functionConstructorSupported = false
  }
}

type Emission = 0 | 1 | 2

const getEmission = (ast: SchemaAST.AST, depth = 0): Emission => {
  if (depth > maxGeneratedDepth || ast.encoding !== undefined || hasParseOptions(ast)) return 0
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
      return 2
    case "TemplateLiteral": {
      for (const part of ast.parts) {
        if (getEmission(part, depth + 1) === 0) return 0
      }
      return 2
    }
    case "Arrays": {
      let isOutputFree = ast.checks === undefined
      for (const element of ast.elements) {
        const emission = getEmission(element, depth + 1)
        if (emission === 0) return 0
        if (emission === 1) isOutputFree = false
      }
      for (const element of ast.rest) {
        const emission = getEmission(element, depth + 1)
        if (emission === 0) return 0
        if (emission === 1) isOutputFree = false
      }
      return isOutputFree ? 2 : 1
    }
    case "Objects": {
      let isOutputFree = ast.checks === undefined
      for (const property of ast.propertySignatures) {
        const emission = getEmission(property.type, depth + 1)
        if (emission === 0) return 0
        if (emission === 1) isOutputFree = false
      }
      for (const signature of ast.indexSignatures) {
        const key = getEmission(SchemaAST.parameterFromPropertyKey(signature.parameter), depth + 1)
        const value = getEmission(signature.type, depth + 1)
        if (key === 0 || value === 0) return 0
        if (key === 1 || value === 1) isOutputFree = false
      }
      return isOutputFree ? 2 : 1
    }
    case "Union": {
      let isOutputFree = ast.checks === undefined
      for (const type of ast.types) {
        const emission = getEmission(type, depth + 1)
        if (emission === 0) return 0
        if (emission === 1) isOutputFree = false
      }
      return isOutputFree ? 2 : 1
    }
    default:
      return 0
  }
}

const canEmit = (ast: SchemaAST.AST, depth = 0): boolean => getEmission(ast, depth) !== 0

type Emitter = {
  readonly statements: Array<string>
  readonly helpers: Array<string>
  readonly initializers: Array<string>
  readonly decoderHelpers: Map<SchemaAST.AST, string>
  readonly unionHelpers: Map<SchemaAST.Union, string>
  readonly constants: Array<unknown>
  readonly constantIndexes: Map<unknown, number>
  readonly options: "D" | "o"
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
  if (typeof value === "number" && value === 0) {
    const index = emitter.constants.length
    emitter.constants.push(value)
    return `C[${index}]`
  }
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

const shouldCompileParser = (ast: SchemaAST.AST): boolean => {
  if (ast.encoding !== undefined) return true
  if (ast.checks !== undefined || getEncodingChecks(ast) !== undefined) return true
  switch (ast._tag) {
    case "TemplateLiteral":
    case "Arrays":
    case "Objects":
    case "Union":
      return true
    default:
      return false
  }
}

const failsChecks = (
  ast: SchemaAST.AST,
  value: unknown,
  encoded: boolean,
  options: SchemaAST.ParseOptions
): boolean => {
  const checks = encoded ? getEncodingChecks(ast) : ast.checks
  return !options.disableChecks && checks !== undefined &&
    SchemaAST.collectIssues(checks, value, undefined, ast, options) !== undefined
}

const matchesTemplateLiteral = (
  ast: SchemaAST.TemplateLiteral,
  value: unknown,
  options: SchemaAST.ParseOptions
): boolean => typeof value === "string" && ast.matchPart(value, options) !== undefined

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
    statements.push(`if(K(${astConstant},${input},1,${emitter.options}))return I`)
  }
  if (ast.checks === undefined) return output
  const checked = variable(emitter)
  statements.push(
    `const ${checked}=${output}`,
    `if(K(${astConstant},${checked},0,${emitter.options}))return I`
  )
  return checked
}

function emit(
  ast: SchemaAST.AST,
  input: string,
  statements: Array<string>,
  emitter: Emitter,
  needsValue: boolean
): string {
  return emitDecoded(ast, input, statements, emitter, needsValue)
}

const emitDecoderHelper = (ast: SchemaAST.AST, emitter: Emitter, needsValue: boolean): string => {
  const cached = emitter.decoderHelpers.get(ast)
  if (cached !== undefined) return cached
  const name = `d${emitter.next++}`
  emitter.decoderHelpers.set(ast, name)
  const statements: Array<string> = []
  const output = emit(ast, "i", statements, emitter, needsValue)
  emitter.helpers.push(
    `function ${name}(i${emitter.options === "o" ? ",o" : ""}){${statements.join(";")};return ${output}}`
  )
  return name
}

const emitUnionHelper = (ast: SchemaAST.Union, emitter: Emitter, needsValue: boolean): string => {
  const cached = emitter.unionHelpers.get(ast)
  if (cached !== undefined) return cached
  const name = `u${emitter.next++}`
  emitter.unionHelpers.set(ast, name)
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
          : `G(${input},${constant(emitter, parameter)},${emitter.options})`
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
      return value
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
      statements.push(`if(!T(${template},${input},${emitter.options}))return I`)
      return input
    }
    case "Arrays": {
      statements.push(`if(!Array.isArray(${input}))return I`)
      const length = variable(emitter)
      statements.push(`const ${length}=${input}.length`)
      const elementLength = ast.elements.length
      const requiredElementLength = ast.elements.findIndex(isOptional)
      const minimumElementLength = requiredElementLength === -1 ? elementLength : requiredElementLength
      const tailLength = Math.max(0, ast.rest.length - 1)
      if (ast.rest.length === 0) {
        statements.push(
          minimumElementLength === elementLength
            ? `if(${length}!==${elementLength})return I`
            : `if(${length}<${minimumElementLength}||${length}>${elementLength})return I`
        )
        if (minimumElementLength === elementLength) {
          const elements = ast.elements.map((element, index) => {
            const value = variable(emitter)
            statements.push(`const ${value}=${input}[${index}]`)
            return emit(element, value, statements, emitter, needsValue)
          })
          return needsValue ? `[${elements.join(",")}]` : input
        }
        const output = needsValue ? variable(emitter) : undefined
        if (output !== undefined) statements.push(`const ${output}=new Array(${length})`)
        for (let index = 0; index < elementLength; index++) {
          const value = variable(emitter)
          const elementStatements: Array<string> = [`const ${value}=${input}[${index}]`]
          const decoded = emit(ast.elements[index], value, elementStatements, emitter, needsValue)
          if (output !== undefined) elementStatements.push(`${output}[${index}]=${decoded}`)
          statements.push(
            index < minimumElementLength
              ? elementStatements.join(";")
              : `if(${index}<${length}){${elementStatements.join(";")}}`
          )
        }
        return output ?? input
      }
      statements.push(`if(${length}<${minimumElementLength + tailLength})return I`)
      const output = needsValue ? variable(emitter) : undefined
      if (output !== undefined) statements.push(`const ${output}=new Array(${length})`)
      for (let index = 0; index < elementLength; index++) {
        const value = variable(emitter)
        const elementStatements: Array<string> = [`const ${value}=${input}[${index}]`]
        const decoded = emit(ast.elements[index], value, elementStatements, emitter, needsValue)
        if (output !== undefined) elementStatements.push(`${output}[${index}]=${decoded}`)
        statements.push(
          index < minimumElementLength
            ? elementStatements.join(";")
            : `if(${index}<${length}){${elementStatements.join(";")}}`
        )
      }
      const index = variable(emitter)
      const restStatements: Array<string> = []
      const value = variable(emitter)
      restStatements.push(`const ${value}=${input}[${index}]`)
      const decoded = emit(ast.rest[0], value, restStatements, emitter, needsValue)
      if (output !== undefined) restStatements.push(`${output}[${index}]=${decoded}`)
      statements.push(
        `for(let ${index}=${elementLength};${index}<${length}-${tailLength};${index}++){${restStatements.join(";")}}`
      )
      for (let index = 0; index < tailLength; index++) {
        const inputIndex = `${length}-${tailLength - index}`
        const value = variable(emitter)
        statements.push(`const ${value}=${input}[${inputIndex}]`)
        const decoded = emit(ast.rest[index + 1], value, statements, emitter, needsValue)
        if (output !== undefined) statements.push(`${output}[${inputIndex}]=${decoded}`)
      }
      return output ?? input
    }
    case "Objects": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        statements.push(`if(${input}===null||${input}===void 0)return I`)
        return input
      }
      statements.push(
        `if(typeof ${input}!=="object"||${input}===null||Array.isArray(${input}))return I`
      )
      const hasOptional = ast.propertySignatures.some((property) => isOptional(property.type))
      if (needsValue && ast.propertySignatures.length > 0 && !hasOptional) {
        const output = variable(emitter)
        const properties = ast.propertySignatures.map((property) => {
          const key = propertyKey(emitter, property.name)
          const outputKey = typeof property.name === "string" && property.name !== "__proto__" ? key : `[${key}]`
          const value = variable(emitter)
          if (propertyNeedsPresenceCheck(property.name, property.type)) {
            statements.push(`if(!(${propertyPresence(input, key, property.name)}))return I`)
          }
          statements.push(`const ${value}=${input}[${key}]`)
          return `${outputKey}:${emit(property.type, value, statements, emitter, true)}`
        })
        statements.push(`const ${output}={${properties.join(",")}}`)
        if (ast.indexSignatures.length > 0) emitIndexes(ast, input, output, statements, emitter, true)
        return output
      }
      const output = needsValue ? variable(emitter) : undefined
      if (output !== undefined) statements.push(`const ${output}={}`)
      for (const property of ast.propertySignatures) {
        const key = propertyKey(emitter, property.name)
        const value = variable(emitter)
        const propertyStatements: Array<string> = [`const ${value}=${input}[${key}]`]
        const decoded = emit(property.type, value, propertyStatements, emitter, needsValue)
        if (output !== undefined) propertyStatements.push(assignProperty(output, key, decoded, property.name))
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
      if (ast.indexSignatures.length > 0) emitIndexes(ast, input, output, statements, emitter, needsValue)
      return output ?? input
    }
    case "Union": {
      const memberValues = ast.types.map(lookupMemberValues)
      const hasSignedZeroLiteral = ast.types.some((type) => type._tag === "Literal" && type.literal === 0)
      if (!hasSignedZeroLiteral && memberValues.every((values) => values !== undefined)) {
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
          `for(let ${index}=0;${index}<${candidates}.length;${index}++){${decoder}=${decoders}.get(${candidates}[${index}]);${candidate}=${decoder}(${input}${
            emitter.options === "o" ? ",o" : ""
          });if(${candidate}!==I){${output}=${candidate};break}}`
        )
        statements.push(`if(${output}===I)return I`)
      } else {
        const successes = variable(emitter)
        statements.push(`let ${successes}=0`)
        statements.push(
          `for(let ${index}=0;${index}<${candidates}.length;${index}++){${decoder}=${decoders}.get(${candidates}[${index}]);${candidate}=${decoder}(${input}${
            emitter.options === "o" ? ",o" : ""
          });if(${candidate}!==I){${successes}++;${output}=${candidate}}}`
        )
        statements.push(`if(${successes}!==1)return I`)
      }
      return output
    }
    default:
      throw new Error(`Unsupported Schema AST: ${ast._tag}`)
  }
}

class Failure {
  readonly issue: SchemaIssue.Issue

  constructor(issue: SchemaIssue.Issue) {
    this.issue = issue
  }
}

type DetailedDecoder = (
  input: unknown,
  options: SchemaAST.ParseOptions
) => unknown | Failure

const fail = (issue: SchemaIssue.Issue): Failure => new Failure(issue)

const isFailure = (value: unknown): value is Failure => value instanceof Failure

const invalidType = (
  ast: SchemaAST.AST,
  input: unknown,
  options: SchemaAST.ParseOptions
): Failure => fail(new SchemaIssue.InvalidType(ast, input, options))

const composite = (
  ast: SchemaAST.AST,
  issue: SchemaIssue.Issue,
  input: unknown,
  options: SchemaAST.ParseOptions
): Failure => fail(new SchemaIssue.Composite(ast, [issue], input, options))

const pointer = (key: PropertyKey, failure: Failure): SchemaIssue.Pointer =>
  new SchemaIssue.Pointer([key], failure.issue)

const assignDecodedProperty = (
  output: Record<PropertyKey, unknown>,
  key: PropertyKey,
  value: unknown
): void => {
  if (key === "__proto__") {
    Object.defineProperty(output, key, { value, writable: true, enumerable: true, configurable: true })
  } else {
    output[key] = value
  }
}

function compileDetailed(ast: SchemaAST.AST): DetailedDecoder {
  const base = compileDetailedBase(ast)
  const encodingChecks = getEncodingChecks(ast)
  const checks = ast.checks
  if (encodingChecks === undefined && checks === undefined) return base
  return (input, options) => {
    const output = base(input, options)
    if (
      isFailure(output) ||
      input === InternalParser.missing ||
      output === InternalParser.missing ||
      options.disableChecks
    ) {
      return output
    }
    if (encodingChecks !== undefined) {
      const issues = SchemaAST.collectIssues(encodingChecks, input, undefined, ast, options)
      if (issues !== undefined) return fail(new SchemaIssue.Composite(ast, issues, input, options))
    }
    if (checks !== undefined) {
      const issues = SchemaAST.collectIssues(checks, output, undefined, ast, options)
      if (issues !== undefined) return fail(new SchemaIssue.Composite(ast, issues, output, options))
    }
    return output
  }
}

function compileDetailedBase(ast: SchemaAST.AST): DetailedDecoder {
  switch (ast._tag) {
    case "Null":
      return (input, options) =>
        input === InternalParser.missing || input === null ? input : invalidType(ast, input, options)
    case "Undefined":
      return (input, options) =>
        input === InternalParser.missing || input === undefined ? input : invalidType(ast, input, options)
    case "Void":
      return (input) => input === InternalParser.missing ? input : undefined
    case "Never":
      return (input, options) => input === InternalParser.missing ? input : invalidType(ast, input, options)
    case "Any":
    case "Unknown":
      return (input) => input
    case "ObjectKeyword":
      return (input, options) => {
        if (input === InternalParser.missing) return input
        return (input !== null && typeof input === "object") || typeof input === "function"
          ? input
          : invalidType(ast, input, options)
      }
    case "Enum": {
      const values = new Set<unknown>(ast.enums.map((entry) => entry[1]))
      return (input, options) => {
        if (input === InternalParser.missing) return input
        return values.has(input) ? input : invalidType(ast, input, options)
      }
    }
    case "UniqueSymbol":
      return (input, options) => {
        if (input === InternalParser.missing) return input
        return input === ast.symbol ? input : invalidType(ast, input, options)
      }
    case "Literal":
      return (input, options) => {
        if (input === InternalParser.missing) return input
        return input === ast.literal ? ast.literal : invalidType(ast, input, options)
      }
    case "String":
      return (input, options) => {
        if (input === InternalParser.missing) return input
        return typeof input === "string" ? input : invalidType(ast, input, options)
      }
    case "Number":
      return (input, options) => {
        if (input === InternalParser.missing) return input
        return typeof input === "number" ? input : invalidType(ast, input, options)
      }
    case "Boolean":
      return (input, options) => {
        if (input === InternalParser.missing) return input
        return typeof input === "boolean" ? input : invalidType(ast, input, options)
      }
    case "Symbol":
      return (input, options) => {
        if (input === InternalParser.missing) return input
        return typeof input === "symbol" ? input : invalidType(ast, input, options)
      }
    case "BigInt":
      return (input, options) => {
        if (input === InternalParser.missing) return input
        return typeof input === "bigint" ? input : invalidType(ast, input, options)
      }
    case "TemplateLiteral": {
      const parserAst = ast.asTemplateLiteralParser()
      return (input, options) => {
        if (input === InternalParser.missing) return input
        if (typeof input !== "string") return invalidType(ast, input, options)
        return matchesTemplateLiteral(ast, input, options)
          ? input
          : fail(
            new SchemaIssue.Composite(
              ast,
              [
                new SchemaIssue.Encoding(
                  parserAst,
                  new SchemaIssue.InvalidValue(
                    { expected: "a string matching template literal parts" },
                    input,
                    options
                  ),
                  input,
                  options
                )
              ],
              input,
              options
            )
          )
      }
    }
    case "Arrays":
      return compileDetailedArrays(ast)
    case "Objects":
      return compileDetailedObjects(ast)
    case "Union":
      return compileDetailedUnion(ast)
    default:
      throw new Error(`Unsupported Schema AST: ${ast._tag}`)
  }
}

function compileDetailedArrays(ast: SchemaAST.Arrays): DetailedDecoder {
  const elements = ast.elements.map((ast) => ({ ast, decode: compileDetailed(ast) }))
  const rest = ast.rest.map((ast) => ({ ast, decode: compileDetailed(ast) }))
  const elementLength = elements.length
  const tailLength = Math.max(0, rest.length - 1)
  return (input, options) => {
    if (input === InternalParser.missing) return input
    if (!Array.isArray(input)) return invalidType(ast, input, options)
    const length = input.length
    const output = new Array<unknown>(length)
    let issues: [SchemaIssue.Issue, ...Array<SchemaIssue.Issue>] | undefined
    const errorsAll = options.errors === "all"
    const end = rest.length === 0 ? elementLength : Math.max(length, elementLength + tailLength)
    const tailThreshold = Math.max(elementLength, length - tailLength)
    for (let index = 0; index < end; index++) {
      const element = index < elementLength
        ? elements[index]
        : index >= tailThreshold
        ? rest[index - tailThreshold + 1]
        : rest[0]
      const value = index < length ? input[index] : InternalParser.missing
      const decoded = element.decode(value, options)
      if (isFailure(decoded)) {
        const issue = pointer(index, decoded)
        if (!errorsAll) return composite(ast, issue, input, options)
        if (issues === undefined) issues = [issue]
        else issues.push(issue)
      } else if (decoded !== InternalParser.missing) {
        output[index] = decoded
      } else if (!isOptional(element.ast)) {
        const issue = new SchemaIssue.Pointer(
          [index],
          new SchemaIssue.MissingKey(element.ast.context?.annotations)
        )
        if (!errorsAll) return composite(ast, issue, input, options)
        if (issues === undefined) issues = [issue]
        else issues.push(issue)
      }
    }
    if (rest.length === 0 && length > elementLength) {
      for (let index = elementLength; index < length; index++) {
        const issue = new SchemaIssue.Pointer(
          [index],
          new SchemaIssue.UnexpectedKey(ast, input[index], options)
        )
        if (!errorsAll) return composite(ast, issue, input, options)
        if (issues === undefined) issues = [issue]
        else issues.push(issue)
      }
    }
    return issues === undefined ? output : fail(new SchemaIssue.Composite(ast, issues, input, options))
  }
}

function compileDetailedObjects(ast: SchemaAST.Objects): DetailedDecoder {
  if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
    return (input, options) => {
      if (input === InternalParser.missing) return input
      return input !== null && input !== undefined ? input : invalidType(ast, input, options)
    }
  }
  const properties = ast.propertySignatures.map((property) => ({
    ast: property.type,
    decode: compileDetailed(property.type),
    name: property.name,
    optional: isOptional(property.type),
    valueFirst: property.name !== "__proto__" && !isOptional(property.type)
  }))
  const indexes = ast.indexSignatures.map((signature) => ({
    signature,
    decodeKey: compileDetailed(SchemaAST.parameterFromPropertyKey(signature.parameter)),
    decodeValue: compileDetailed(signature.type)
  }))
  const expectedKeys = ast.propertySignatures.map((property) => property.name)
  const expectedKeysSet = new Set(expectedKeys)
  return (input, options) => {
    if (input === InternalParser.missing) return input
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return invalidType(ast, input, options)
    }
    const record = input as Record<PropertyKey, unknown>
    const output: Record<PropertyKey, unknown> = {}
    const errorsAll = options.errors === "all"
    let issues: [SchemaIssue.Issue, ...Array<SchemaIssue.Issue>] | undefined
    let inputKeys: ReadonlyArray<PropertyKey> | undefined
    if (indexes.length === 0 && options.onExcessProperty !== undefined && options.onExcessProperty !== "ignore") {
      inputKeys = Reflect.ownKeys(record)
      for (const key of inputKeys) {
        if (expectedKeysSet.has(key)) continue
        if (options.onExcessProperty === "preserve") {
          assignDecodedProperty(output, key, record[key])
        } else {
          const issue = new SchemaIssue.Pointer(
            [key],
            new SchemaIssue.UnexpectedKey(ast, record[key], options)
          )
          if (!errorsAll) return composite(ast, issue, input, options)
          if (issues === undefined) issues = [issue]
          else issues.push(issue)
        }
      }
    }
    for (const property of properties) {
      const name = property.name
      let value: unknown
      if (property.valueFirst) {
        value = record[name]
        if (value === undefined && !(name in record)) value = InternalParser.missing
      } else {
        const present = name === "__proto__" ? Object.hasOwn(record, name) : name in record
        value = present ? record[name] : InternalParser.missing
      }
      const decoded = property.decode(value, options)
      if (isFailure(decoded)) {
        const issue = pointer(name, decoded)
        if (!errorsAll) return composite(ast, issue, input, options)
        if (issues === undefined) issues = [issue]
        else issues.push(issue)
      } else if (decoded !== InternalParser.missing) {
        assignDecodedProperty(output, name, decoded)
      } else if (!property.optional) {
        const issue = new SchemaIssue.Pointer(
          [name],
          new SchemaIssue.MissingKey(property.ast.context?.annotations)
        )
        if (!errorsAll) return composite(ast, issue, input, options)
        if (issues === undefined) issues = [issue]
        else issues.push(issue)
      }
    }
    for (const index of indexes) {
      const parameter = index.signature.parameter
      const keys = parameter === SchemaAST.string
        ? Object.keys(record)
        : SchemaAST.getIndexSignatureKeys(record, parameter, options)
      for (const key of keys) {
        let decodedKey: unknown = key
        if (parameter !== SchemaAST.string) {
          decodedKey = index.decodeKey(key, options)
          if (isFailure(decodedKey)) {
            const issue = pointer(key, decodedKey)
            if (!errorsAll) return composite(ast, issue, input, options)
            if (issues === undefined) issues = [issue]
            else issues.push(issue)
            continue
          }
        }
        const inputValue = record[key]
        const decodedValue = index.decodeValue(inputValue, options)
        if (isFailure(decodedValue)) {
          const issue = pointer(key, decodedValue)
          if (!errorsAll) return composite(ast, issue, input, options)
          if (issues === undefined) issues = [issue]
          else issues.push(issue)
          continue
        }
        if (decodedKey === InternalParser.missing || decodedValue === InternalParser.missing) continue
        const outputKey = decodedKey as PropertyKey
        if (properties.length > 0 && (expectedKeysSet.has(key) || expectedKeysSet.has(outputKey))) continue
        assignDecodedProperty(output, outputKey, decodedValue)
      }
    }
    if (issues !== undefined) return fail(new SchemaIssue.Composite(ast, issues, input, options))
    if (options.propertyOrder === "original") {
      const ordered: Record<PropertyKey, unknown> = {}
      for (const key of [...(inputKeys ?? Reflect.ownKeys(record)), ...expectedKeys]) {
        if (Object.hasOwn(output, key)) assignDecodedProperty(ordered, key, output[key])
      }
      return ordered
    }
    return output
  }
}

function compileDetailedUnion(ast: SchemaAST.Union): DetailedDecoder {
  const decoders = new Map(ast.types.map((type) => [type, compileDetailed(type)]))
  return (input, options) => {
    if (input === InternalParser.missing) return input
    const candidates = SchemaAST.getCandidates(input, ast.types)
    const issues: Array<SchemaIssue.Issue> = []
    const successes: Array<SchemaAST.AST> | undefined = ast.mode === "oneOf" ? [] : undefined
    let output: unknown = invalid
    for (const candidate of candidates) {
      const decoded = decoders.get(candidate)!(input, options)
      if (isFailure(decoded)) {
        issues.push(decoded.issue)
      } else if (successes === undefined) {
        return decoded
      } else {
        successes.push(candidate)
        output = decoded
        if (successes.length > 1) {
          return fail(new SchemaIssue.OneOf(ast, successes, input, options))
        }
      }
    }
    return successes !== undefined && successes.length === 1
      ? output
      : fail(new SchemaIssue.AnyOf(ast, issues, input, options))
  }
}

const makeDetailed = (decode: DetailedDecoder): OptimizedCompiledDecoder["decode"] => {
  return (input, options) => {
    try {
      const output = decode(input, options)
      if (isFailure(output)) return Effect.fail(output.issue)
      if (output === InternalParser.missing) return InternalParser.missingExit
      return output === input ? InternalParser.sameExit : InternalParser.succeed(output)
    } catch (error) {
      return Effect.die(error)
    }
  }
}

type ComposedObjectProperty = {
  readonly ast: SchemaAST.AST
  readonly name: PropertyKey
  readonly optional: boolean
  parser: Parser
  readonly valueFirst: boolean
}

type ComposedObjectState = {
  readonly ast: SchemaAST.Objects
  readonly input: Record<PropertyKey, unknown>
  readonly options: SchemaAST.ParseOptions
  readonly output: Record<PropertyKey, unknown>
}

const resolveDirect = (resolve: ResolveParser, ast: SchemaAST.AST): Parser => {
  return getDirectParser(resolve(ast))
}

const wrapComposedObjectFailure = (
  state: ComposedObjectState,
  key: PropertyKey,
  exit: Exit.Failure<unknown, SchemaIssue.Issue>
): Exit.Exit<void, SchemaIssue.Issue> | undefined => {
  if (exit.cause.reasons.length === 0) return exit
  const issue = InternalSchemaCause.getSchemaIssue(exit.cause)
  if (issue === undefined) {
    return Exit.failCause(
      Cause.map(
        exit.cause,
        (issue) =>
          new SchemaIssue.Composite(
            state.ast,
            [new SchemaIssue.Pointer([key], issue)],
            state.input,
            state.options
          )
      )
    )
  }
  const pointed = new SchemaIssue.Pointer([key], issue)
  return Exit.fail(new SchemaIssue.Composite(state.ast, [pointed], state.input, state.options))
}

const finishComposedObjectProperty = (
  state: ComposedObjectState,
  property: ComposedObjectProperty,
  exit: Exit.Exit<unknown, SchemaIssue.Issue>
): Exit.Exit<void, SchemaIssue.Issue> | undefined => {
  if (exit._tag === "Failure") return wrapComposedObjectFailure(state, property.name, exit)
  if (exit === InternalParser.sameExit) return
  const value = (exit as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
  if (value !== InternalParser.missing) {
    assignDecodedProperty(state.output, property.name, value)
    return
  }
  delete state.output[property.name]
  if (property.optional) return
  const issue = new SchemaIssue.Pointer(
    [property.name],
    new SchemaIssue.MissingKey(property.ast.context?.annotations)
  )
  return Exit.fail(new SchemaIssue.Composite(state.ast, [issue], state.input, state.options))
}

const startComposedObjectProperty = (
  state: ComposedObjectState,
  property: ComposedObjectProperty
): Effect.Effect<unknown, SchemaIssue.Issue, any> => {
  const name = property.name
  let value: unknown
  if (property.valueFirst) {
    value = state.input[name]
    if (value === undefined && !(name in state.input)) {
      return property.parser(InternalParser.missing, state.options)
    }
  } else {
    const present = name === "__proto__" ? Object.hasOwn(state.input, name) : name in state.input
    if (!present) return property.parser(InternalParser.missing, state.options)
    value = state.input[name]
  }
  assignDecodedProperty(state.output, name, value)
  return property.parser(value, state.options)
}

const runComposedObjectProperties = (
  state: ComposedObjectState,
  properties: ReadonlyArray<ComposedObjectProperty>,
  start: number
): Effect.Effect<void, SchemaIssue.Issue, any> | undefined => {
  for (let index = start; index < properties.length; index++) {
    const property = properties[index]
    const result = startComposedObjectProperty(state, property)
    if (!effectIsExit(result)) {
      return Effect.flatMap(Effect.exit(result), (exit) => {
        const terminal = finishComposedObjectProperty(state, property, exit)
        return terminal ?? runComposedObjectProperties(state, properties, index + 1) ?? Exit.void
      })
    }
    const terminal = finishComposedObjectProperty(state, property, result)
    if (terminal !== undefined) return terminal
  }
}

const makeComposedObjectFallback = (
  ast: SchemaAST.Objects,
  resolve: ResolveParser
): Parser => {
  let parser: Parser | undefined
  return (input, options) => {
    try {
      return (parser ??= ast.getParser(resolve))(input, options)
    } catch (error) {
      return Effect.die(error)
    }
  }
}

const resumeComposedObject = (
  ast: SchemaAST.Objects,
  properties: ReadonlyArray<ComposedObjectProperty>,
  input: Record<PropertyKey, unknown>,
  output: Record<PropertyKey, unknown>,
  index: number,
  pending: Effect.Effect<unknown, SchemaIssue.Issue, any>,
  options: SchemaAST.ParseOptions
): Effect.Effect<unknown, SchemaIssue.Issue, any> =>
  Effect.flatMap(Effect.exit(pending), (exit) => {
    const state: ComposedObjectState = { ast, input, options, output }
    const terminal = finishComposedObjectProperty(state, properties[index], exit)
    if (terminal !== undefined) return terminal
    const rest = runComposedObjectProperties(state, properties, index + 1)
    return rest === undefined
      ? InternalParser.succeed(output)
      : Effect.flatMapEager(rest, () => InternalParser.succeed(output))
  })

const failComposedObjectProperty = (
  ast: SchemaAST.Objects,
  input: Record<PropertyKey, unknown>,
  options: SchemaAST.ParseOptions,
  key: PropertyKey,
  exit: Exit.Failure<unknown, SchemaIssue.Issue>
): Exit.Exit<void, SchemaIssue.Issue> =>
  wrapComposedObjectFailure(
    { ast, input, options, output: {} },
    key,
    exit
  )!

const failMissingComposedObjectProperty = (
  ast: SchemaAST.Objects,
  input: Record<PropertyKey, unknown>,
  options: SchemaAST.ParseOptions,
  property: ComposedObjectProperty
): Exit.Exit<never, SchemaIssue.Issue> =>
  Exit.fail(
    new SchemaIssue.Composite(
      ast,
      [new SchemaIssue.Pointer([property.name], new SchemaIssue.MissingKey(property.ast.context?.annotations))],
      input,
      options
    )
  )

const makeComposedObjectDefault = (
  ast: SchemaAST.Objects,
  properties: ReadonlyArray<ComposedObjectProperty>,
  fallback: Parser
): Parser | undefined => {
  try {
    const statements = [
      "if(o!==D)return F(i,o)",
      "if(i===M)return MX",
      "if(typeof i!==\"object\"||i===null||Array.isArray(i))return IT(T,i,o)",
      "const out={}",
      "let r,x"
    ]
    for (let index = 0; index < properties.length; index++) {
      const property = properties[index]
      const key = typeof property.name === "string" ? JSON.stringify(property.name) : "P[" + index + "].name"
      const value = "v" + index
      const assign = property.name === "__proto__" || typeof property.name !== "string"
        ? "AP(out," + key + "," + value + ")"
        : "out[" + key + "]=" + value
      const assignDecoded = property.name === "__proto__" || typeof property.name !== "string"
        ? "AP(out," + key + ",x)"
        : "out[" + key + "]=x"
      const present = property.name === "__proto__" ? "Object.hasOwn(i," + key + ")" : key + " in i"
      if (property.valueFirst) {
        statements.push(
          "let " + value + "=i[" + key + "]",
          "if(" + value + "===void 0&&!(" + present + "))" + value + "=M;else " + assign
        )
      } else {
        statements.push(
          "let " + value,
          "if(" + present + "){" + value + "=i[" + key + "];" + assign + "}else " + value + "=M"
        )
      }
      statements.push(
        "r=P[" + index + "].parser(" + value + ",o)",
        "if(r!==S){if(!X(r))return R(T,P,i,out," + index +
          ",r,o);if(r._tag===\"Failure\")return W(T,i,o," + key +
          ",r);x=r[A];if(x===M){delete out[" + key + "];" +
          (property.optional ? "" : "return N(T,i,o,P[" + index + "])") +
          "}else{" + assignDecoded + "}}"
      )
    }
    statements.push("return SU(out)")
    const source = "\"use strict\";return function(i,o){try{" + statements.join(";") +
      "}catch(e){return DIE(e)}}"
    return globalThis.Function(
      "T",
      "P",
      "D",
      "F",
      "M",
      "MX",
      "IT",
      "AP",
      "S",
      "A",
      "X",
      "R",
      "W",
      "N",
      "SU",
      "DIE",
      source
    )(
      ast,
      properties,
      SchemaAST.defaultParseOptions,
      fallback,
      InternalParser.missing,
      InternalParser.missingExit,
      (ast: SchemaAST.AST, input: unknown, options: SchemaAST.ParseOptions) =>
        Effect.fail(new SchemaIssue.InvalidType(ast, input, options)),
      assignDecodedProperty,
      InternalParser.sameExit,
      InternalParser.args,
      effectIsExit,
      resumeComposedObject,
      failComposedObjectProperty,
      failMissingComposedObjectProperty,
      InternalParser.succeed,
      Effect.die
    ) as Parser
  } catch {
    return undefined
  }
}

const makeComposedObjectDecode = (
  ast: SchemaAST.Objects,
  resolve: ResolveParser
): Parser | undefined => {
  if (
    ast.encoding !== undefined ||
    ast.indexSignatures.length !== 0 ||
    ast.checks !== undefined ||
    ast.encodingChecks !== undefined ||
    hasParseOptions(ast)
  ) return undefined
  const properties = ast.propertySignatures.map((property): ComposedObjectProperty => {
    const out: ComposedObjectProperty = {
      ast: property.type,
      name: property.name,
      optional: isOptional(property.type),
      parser(input, options) {
        const parser = resolveDirect(resolve, property.type)
        out.parser = parser
        return parser(input, options)
      },
      valueFirst: property.name !== "__proto__" && !isOptional(property.type)
    }
    return out
  })
  const fallback = makeComposedObjectFallback(ast, resolve)
  return makeComposedObjectDefault(ast, properties, fallback)
}

const canCompileComposedObject = (ast: SchemaAST.Objects): boolean =>
  ast.encoding === undefined &&
  ast.indexSignatures.length === 0 &&
  ast.checks === undefined &&
  ast.encodingChecks === undefined &&
  !hasParseOptions(ast)

function applyTransformation(
  result: Effect.Effect<unknown, SchemaIssue.Issue, unknown>,
  current: unknown,
  transformation: SchemaAST.Link["transformation"],
  options: SchemaAST.ParseOptions
): Effect.Effect<unknown, SchemaIssue.Issue, unknown> {
  let transformed: Effect.Effect<Option.Option<unknown>, SchemaIssue.Issue, unknown>
  if (effectIsExit(result) && result._tag === "Success") {
    const optional = InternalParser.toOption(
      result === InternalParser.sameExit
        ? current
        : (result as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
    )
    transformed = transformation._tag === "Transformation"
      ? transformation.decode.run(optional, options)
      : transformation.decode(InternalParser.succeed(optional), options)
  } else if (transformation._tag === "Transformation") {
    transformed = Effect.flatMapEager(
      result,
      (value) => transformation.decode.run(InternalParser.toOption(value), options)
    )
  } else {
    transformed = transformation.decode(
      Effect.mapEager(result, InternalParser.toOption),
      options
    )
  }
  return effectIsExit(transformed) && transformed._tag === "Success"
    ? InternalParser.fromOptionExit(
      (transformed as InternalParser.Success<Option.Option<unknown>, SchemaIssue.Issue>)[InternalParser.args]
    )
    : Effect.flatMapEager(transformed, InternalParser.fromOptionExit)
}

const makeEncodingDetailed = (
  ast: SchemaAST.AST,
  resolve: ResolveParser
): OptimizedCompiledDecoder["decode"] => {
  const links = ast.encoding!
  const parsers = links.map((link) => resolveDirect(resolve, link.to))
  const local = resolveDirect(resolve, SchemaAST.replaceEncoding(ast, undefined))
  const decode = (input: unknown, options: SchemaAST.ParseOptions) => {
    let current = input
    let result = parsers[parsers.length - 1](input, options)
    for (let index = links.length - 1; index >= 0; index--) {
      result = applyTransformation(result, current, links[index].transformation, options)
      if (index !== 0) {
        const next = parsers[index - 1]
        if ((result as Exit.Exit<unknown, unknown>)._tag === "Success") {
          current = (result as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
          result = next(current, options)
        } else {
          result = Effect.flatMapEager(result, (value) => {
            const nextResult = next(value, options)
            return nextResult === InternalParser.sameExit ? InternalParser.succeed(value) : nextResult
          })
        }
      }
    }
    if ((result as Exit.Exit<unknown, unknown>)._tag === "Success") {
      const value = (result as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
      const decoded = local(value, options)
      return decoded === InternalParser.sameExit ? result : decoded
    }
    result = Effect.catchCause(
      result,
      (cause) =>
        Effect.failCauseSync(() =>
          Cause.map(
            cause,
            (issue) => new SchemaIssue.Encoding(ast, issue, input, options)
          )
        )
    )
    return Effect.flatMapEager(result, (value) => {
      const decoded = local(value, options)
      return decoded === InternalParser.sameExit ? InternalParser.succeed(value) : decoded
    })
  }
  return (input, options) => {
    try {
      return decode(input, options)
    } catch (error) {
      return Effect.die(error)
    }
  }
}

type GeneratedValidate = (input: unknown, options?: SchemaAST.ParseOptions) => unknown | typeof invalid

const makeValidate = (
  ast: SchemaAST.AST,
  needsValue: boolean,
  defaultOptions: boolean
): GeneratedValidate | undefined => {
  try {
    const emitter: Emitter = {
      statements: [],
      helpers: [],
      initializers: [],
      decoderHelpers: new Map(),
      unionHelpers: new Map(),
      constants: [],
      constantIndexes: new Map(),
      options: defaultOptions ? "D" : "o",
      next: 0
    }
    const output = emit(ast, "i", emitter.statements, emitter, needsValue)
    const source = `"use strict";${emitter.helpers.join(";")};${emitter.initializers.join(";")};return function(i${
      defaultOptions ? "" : ",o"
    }){${emitter.statements.join(";")};return ${output}}`
    return globalThis.Function("I", "C", "K", "T", "U", "G", "D", source)(
      invalid,
      emitter.constants,
      failsChecks,
      matchesTemplateLiteral,
      SchemaAST.getCandidates,
      SchemaAST.getIndexSignatureKeys,
      SchemaAST.defaultParseOptions
    ) as GeneratedValidate
  } catch {
    return undefined
  }
}

const usesDefaultOutputOptions = (options: SchemaAST.ParseOptions): boolean =>
  options === SchemaAST.defaultParseOptions ||
  (options.onExcessProperty !== "error" && options.onExcessProperty !== "preserve" &&
    options.propertyOrder !== "original")

class CompiledDecoderImpl {
  readonly ast: SchemaAST.AST
  readonly emitIs: boolean

  constructor(ast: SchemaAST.AST, emitIs: boolean) {
    this.ast = ast
    this.emitIs = emitIs
  }

  get detailed(): DetailedDecoder {
    const detailed = compileDetailed(this.ast)
    Object.defineProperty(this, "detailed", { value: detailed })
    return detailed
  }

  get is(): OptimizedIs | undefined {
    const defaultValidate = this.emitIs ? makeValidate(this.ast, false, true) : undefined
    let withOptions: GeneratedValidate | undefined
    const is: OptimizedIs | undefined = defaultValidate === undefined
      ? undefined
      : Object.assign(
        (input: unknown, options: SchemaAST.ParseOptions) => {
          if (options === SchemaAST.defaultParseOptions) return defaultValidate(input) !== invalid
          if (usesDefaultOutputOptions(options)) {
            withOptions ??= makeValidate(this.ast, false, false)
            if (withOptions !== undefined) return withOptions(input, options) !== invalid
          }
          return this.validate!(input, options) !== invalid
        },
        { default: (input: unknown) => defaultValidate(input) !== invalid }
      )
    Object.defineProperty(this, "is", { value: is })
    return is
  }

  get validate(): OptimizedValidate | undefined {
    const defaultValidate = makeValidate(this.ast, true, true)
    let withOptions: GeneratedValidate | undefined
    const validate: OptimizedValidate | undefined = defaultValidate === undefined
      ? undefined
      : Object.assign(
        (input: unknown, options: SchemaAST.ParseOptions) => {
          if (options === SchemaAST.defaultParseOptions) return defaultValidate(input)
          if (usesDefaultOutputOptions(options)) {
            withOptions ??= makeValidate(this.ast, true, false)
            if (withOptions !== undefined) return withOptions(input, options)
          }
          const output = this.detailed(input, options)
          return isFailure(output) ? invalid : output
        },
        { default: defaultValidate }
      )
    Object.defineProperty(this, "validate", { value: validate })
    return validate
  }

  get decode(): OptimizedCompiledDecoder["decode"] {
    const decode = makeDetailed(this.detailed)
    Object.defineProperty(this, "decode", { value: decode })
    return decode
  }
}

const fromDecode = (makeDecode: () => OptimizedCompiledDecoder["decode"]): OptimizedCompiledDecoder => ({
  get decode() {
    const decode = makeDecode()
    Object.defineProperty(this, "decode", { value: decode })
    return decode
  }
})

/** @internal */
export const compile = (ast: SchemaAST.AST, resolve: ResolveParser): OptimizedCompiledDecoder | undefined => {
  if (!shouldCompileParser(ast) || !supportsDynamicFunction()) return undefined
  const emission = getEmission(ast)
  if (emission !== 0) {
    return new CompiledDecoderImpl(ast, emission === 2) as OptimizedCompiledDecoder
  }
  if (ast.encoding !== undefined) return fromDecode(() => makeEncodingDetailed(ast, resolve))
  if (ast._tag === "Objects" && canCompileComposedObject(ast)) {
    return fromDecode(() => makeComposedObjectDecode(ast, resolve) ?? makeComposedObjectFallback(ast, resolve))
  }
  return undefined
}
