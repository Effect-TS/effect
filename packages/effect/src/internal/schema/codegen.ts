import * as SchemaAST from "../../SchemaAST.ts"
import type { CompiledDecoder } from "../../unstable/schema/SchemaCompiler.ts"
import type { runtime } from "../../unstable/schema/SchemaCompiler/runtime.ts"

const getEncodingChecks = (ast: SchemaAST.AST): SchemaAST.Checks | undefined =>
  "encodingChecks" in ast ? ast.encodingChecks : undefined
const getExpectedKeys = (ast: SchemaAST.Objects): ReadonlyArray<PropertyKey> =>
  ast.propertySignatures.map((p) => typeof p.name === "number" ? String(p.name) : p.name)

const isOptional = (ast: SchemaAST.AST): boolean => ast.context?.isOptional ?? false

const maxGeneratedDepth = 256
/** @internal */
export const maxGeneratedNodes = 2048

type Emission = "unsupported" | "validate" | "is"
type Operation = "validate" | "is"

const failureExpression = (operation: Operation): string => operation === "validate" ? "I" : "false"

/** @internal */
const getEmission = (
  ast: SchemaAST.AST,
  depth = 0,
  local = false,
  budget = { remaining: maxGeneratedNodes }
): Emission => {
  // Count occurrences, not distinct ASTs: shared subgraphs are expanded by the emitter.
  if (--budget.remaining < 0 || depth > maxGeneratedDepth || !local && ast.encoding !== undefined) return "unsupported"
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
      return "is"
    case "TemplateLiteral": {
      for (const part of ast.parts) {
        if (getEmission(part, depth + 1, false, budget) === "unsupported") return "unsupported"
      }
      return "is"
    }
    case "Arrays": {
      let isOutputFree = ast.checks === undefined
      for (const element of ast.elements) {
        const emission = getEmission(element, depth + 1, false, budget)
        if (emission === "unsupported") return "unsupported"
        if (emission === "validate") isOutputFree = false
      }
      for (const element of ast.rest) {
        const emission = getEmission(element, depth + 1, false, budget)
        if (emission === "unsupported") return "unsupported"
        if (emission === "validate") isOutputFree = false
      }
      return isOutputFree ? "is" : "validate"
    }
    case "Objects": {
      let isOutputFree = ast.checks === undefined
      for (const property of ast.propertySignatures) {
        const emission = getEmission(property.type, depth + 1, false, budget)
        if (emission === "unsupported") return "unsupported"
        if (emission === "validate") isOutputFree = false
      }
      for (const signature of ast.indexSignatures) {
        const key = getEmission(SchemaAST.parameterFromPropertyKey(signature.parameter), depth + 1, false, budget)
        const value = getEmission(signature.type, depth + 1, false, budget)
        if (key === "unsupported" || value === "unsupported") return "unsupported"
        if (key === "validate" || value === "validate") isOutputFree = false
      }
      return isOutputFree ? "is" : "validate"
    }
    case "Union": {
      let isOutputFree = ast.checks === undefined
      for (const type of ast.types) {
        const emission = getEmission(type, depth + 1, false, budget)
        if (emission === "unsupported") return "unsupported"
        if (emission === "validate") isOutputFree = false
      }
      return isOutputFree ? "is" : "validate"
    }
    case "Declaration":
    case "Suspend":
      return "unsupported"
  }
}

const canEmit = (ast: SchemaAST.AST, depth = 0): boolean => getEmission(ast, depth) !== "unsupported"

type Emitter = {
  readonly statements: Array<string>
  readonly helpers: Array<string>
  readonly initializers: Array<string>
  readonly decoderHelpers: Map<SchemaAST.AST, string>
  readonly unionHelpers: Map<SchemaAST.Union, string>
  readonly bindings: Array<Binding>
  readonly constantIndexes: Map<unknown, number>
  next: number
}

const variable = (emitter: Emitter): string => `v${emitter.next++}`

const propertyKey = (emitter: Emitter, key: PropertyKey, reference: string): string =>
  typeof key === "string" ? JSON.stringify(key) : constant(emitter, key, reference)

const propertyPresence = (input: string, key: string, name: PropertyKey): string =>
  name === "__proto__" ? `Object.hasOwn(${input},${key})` : `${key} in ${input}`

const assignProperty = (output: string, key: string, value: string, name: PropertyKey): string =>
  name === "__proto__"
    ? `Object.defineProperty(${output},${key},{value:${value},writable:true,enumerable:true,configurable:true})`
    : `${output}[${key}]=${value}`

const constant = (emitter: Emitter, value: unknown, reference: string): string => {
  const cached = emitter.constantIndexes.get(value)
  if (cached !== undefined) return `C[${cached}]`
  const index = emitter.bindings.length
  emitter.bindings.push({ value, reference })
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

/** @internal */
export const shouldCompileParser = (ast: SchemaAST.AST, local = false): boolean => {
  if (!local && ast.encoding !== undefined) return true
  if (SchemaAST.getConstructorDescriptor(ast) !== undefined) return true
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

const lookupMemberValues = (ast: SchemaAST.AST): ReadonlyArray<unknown> | undefined => {
  if (ast.checks !== undefined || getEncodingChecks(ast) !== undefined || ast.encoding !== undefined) return undefined
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

const lookupMemberReferences = (ast: SchemaAST.AST, path: string): ReadonlyArray<string> => {
  switch (ast._tag) {
    case "Null":
      return ["null"]
    case "Undefined":
      return ["void 0"]
    case "Literal":
      return [`${path}.literal`]
    case "UniqueSymbol":
      return [`${path}.symbol`]
    case "Enum": {
      const references = new Map<unknown, string>()
      ast.enums.forEach((entry, index) => {
        if (!references.has(entry[1])) references.set(entry[1], `${path}.enums[${index}][1]`)
      })
      return [...references.values()]
    }
    default:
      throw new Error(`Unsupported lookup member: ${ast._tag}`)
  }
}

function emit(
  ast: SchemaAST.AST,
  input: string,
  statements: Array<string>,
  emitter: Emitter,
  operation: Operation,
  path: string
): string {
  const output = emitBase(ast, input, statements, emitter, operation, path)
  const invalid = failureExpression(operation)
  const encodingChecks = getEncodingChecks(ast)
  const astConstant = ast.checks !== undefined || encodingChecks !== undefined
    ? constant(emitter, ast, path)
    : undefined
  if (encodingChecks !== undefined) {
    statements.push(`if(K(${astConstant},${input},1,o))return ${invalid}`)
  }
  if (ast.checks === undefined) return operation === "validate" ? output : "true"
  const checked = variable(emitter)
  statements.push(
    `const ${checked}=${output}`,
    `if(K(${astConstant},${checked},0,o))return ${invalid}`
  )
  return operation === "validate" ? checked : "true"
}

const emitDecoderHelper = (ast: SchemaAST.AST, emitter: Emitter, operation: Operation, path: string): string => {
  const cached = emitter.decoderHelpers.get(ast)
  if (cached !== undefined) return cached
  const name = `d${emitter.next++}`
  emitter.decoderHelpers.set(ast, name)
  const statements: Array<string> = []
  const output = emit(ast, "i", statements, emitter, operation, path)
  emitter.helpers.push(
    `function ${name}(i,o){${statements.join(";")};return ${output}}`
  )
  return name
}

const emitUnionHelper = (ast: SchemaAST.Union, emitter: Emitter, operation: Operation, path: string): string => {
  const cached = emitter.unionHelpers.get(ast)
  if (cached !== undefined) return cached
  const name = `u${emitter.next++}`
  emitter.unionHelpers.set(ast, name)
  const entries = ast.types.map((type, index) =>
    `[${constant(emitter, type, `${path}.types[${index}]`)},${
      emitDecoderHelper(type, emitter, operation, `${path}.types[${index}]`)
    }]`
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
  operation: Operation,
  path: string
): void => {
  const fixedKeys = output === undefined || ast.propertySignatures.length === 0
    ? undefined
    : constant(
      emitter,
      new Set(getExpectedKeys(ast)),
      `new Set(${runtimeReference("getExpectedKeys")}(${path}))`
    )
  for (let signatureIndex = 0; signatureIndex < ast.indexSignatures.length; signatureIndex++) {
    const signature = ast.indexSignatures[signatureIndex]
    const signaturePath = `${path}.indexSignatures[${signatureIndex}]`
    const keys = variable(emitter)
    const index = variable(emitter)
    const key = variable(emitter)
    const parameter = signature.parameter
    statements.push(
      `const ${keys}=${
        parameter._tag === "String" && parameter.checks === undefined
          ? `Object.keys(${input})`
          : `G(${input},${constant(emitter, parameter, `${signaturePath}.parameter`)},o)`
      }`
    )
    const loop: Array<string> = [`const ${key}=${keys}[${index}]`]
    const decodedKey = parameter._tag === "String" && parameter.checks === undefined && parameter.encoding === undefined
      ? key
      : emit(
        SchemaAST.parameterFromPropertyKey(parameter),
        key,
        loop,
        emitter,
        operation,
        `${runtimeReference("parameterFromPropertyKey")}(${signaturePath}.parameter)`
      )
    const value = variable(emitter)
    loop.push(`const ${value}=${input}[${key}]`)
    const decoded = emit(signature.type, value, loop, emitter, operation, `${signaturePath}.type`)
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
  operation: Operation,
  path: string
): string => {
  const needsValue = operation === "validate"
  const invalid = failureExpression(operation)
  switch (ast._tag) {
    case "Null":
      statements.push(`if(${input}!==null)return ${invalid}`)
      return input
    case "Undefined":
      statements.push(`if(${input}!==void 0)return ${invalid}`)
      return input
    case "Void":
      return "void 0"
    case "Never":
      statements.push(`return ${invalid}`)
      return input
    case "Any":
    case "Unknown":
      return input
    case "ObjectKeyword":
      statements.push(
        `if((${input}===null||typeof ${input}!=="object")&&typeof ${input}!=="function")return ${invalid}`
      )
      return input
    case "Enum": {
      const values = constant(
        emitter,
        new Set(ast.enums.map((entry) => entry[1])),
        `new Set(${path}.enums.map(entry=>entry[1]))`
      )
      statements.push(`if(!${values}.has(${input}))return ${invalid}`)
      return input
    }
    case "UniqueSymbol": {
      const value = constant(emitter, ast.symbol, `${path}.symbol`)
      statements.push(`if(${input}!==${value})return ${invalid}`)
      return input
    }
    case "Literal": {
      const value = constant(emitter, ast.literal, `${path}.literal`)
      statements.push(`if(${input}!==${value})return ${invalid}`)
      return input
    }
    case "String":
      statements.push(`if(typeof ${input}!=="string")return ${invalid}`)
      return input
    case "Number":
      statements.push(`if(typeof ${input}!=="number")return ${invalid}`)
      return input
    case "Boolean":
      statements.push(`if(typeof ${input}!=="boolean")return ${invalid}`)
      return input
    case "Symbol":
      statements.push(`if(typeof ${input}!=="symbol")return ${invalid}`)
      return input
    case "BigInt":
      statements.push(`if(typeof ${input}!=="bigint")return ${invalid}`)
      return input
    case "TemplateLiteral": {
      const template = constant(emitter, ast, path)
      statements.push(`if(!T(${template},${input},o))return ${invalid}`)
      return input
    }
    case "Arrays": {
      statements.push(`if(!Array.isArray(${input}))return ${invalid}`)
      const length = variable(emitter)
      statements.push(`const ${length}=${input}.length`)
      const elementLength = ast.elements.length
      const requiredElementLength = ast.elements.findIndex(isOptional)
      const minimumElementLength = requiredElementLength === -1 ? elementLength : requiredElementLength
      const tailLength = Math.max(0, ast.rest.length - 1)
      if (ast.rest.length === 0) {
        statements.push(
          minimumElementLength === elementLength
            ? `if(${length}!==${elementLength})return ${invalid}`
            : `if(${length}<${minimumElementLength}||${length}>${elementLength})return ${invalid}`
        )
        if (minimumElementLength === elementLength) {
          const elements = ast.elements.map((element, index) => {
            const value = variable(emitter)
            statements.push(`const ${value}=${input}[${index}]`)
            return emit(element, value, statements, emitter, operation, `${path}.elements[${index}]`)
          })
          return needsValue ? `[${elements.join(",")}]` : input
        }
        const output = needsValue ? variable(emitter) : undefined
        if (output !== undefined) statements.push(`const ${output}=new Array(${length})`)
        for (let index = 0; index < elementLength; index++) {
          const value = variable(emitter)
          const elementStatements: Array<string> = [`const ${value}=${input}[${index}]`]
          const decoded = emit(
            ast.elements[index],
            value,
            elementStatements,
            emitter,
            operation,
            `${path}.elements[${index}]`
          )
          if (output !== undefined) elementStatements.push(`${output}[${index}]=${decoded}`)
          statements.push(
            index < minimumElementLength
              ? elementStatements.join(";")
              : `if(${index}<${length}){${elementStatements.join(";")}}`
          )
        }
        return output ?? input
      }
      statements.push(`if(${length}<${minimumElementLength + tailLength})return ${invalid}`)
      const output = needsValue ? variable(emitter) : undefined
      if (output !== undefined) statements.push(`const ${output}=new Array(${length})`)
      for (let index = 0; index < elementLength; index++) {
        const value = variable(emitter)
        const elementStatements: Array<string> = [`const ${value}=${input}[${index}]`]
        const decoded = emit(
          ast.elements[index],
          value,
          elementStatements,
          emitter,
          operation,
          `${path}.elements[${index}]`
        )
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
      const decoded = emit(ast.rest[0], value, restStatements, emitter, operation, `${path}.rest[0]`)
      if (output !== undefined) restStatements.push(`${output}[${index}]=${decoded}`)
      statements.push(
        `for(let ${index}=${elementLength};${index}<${length}-${tailLength};${index}++){${restStatements.join(";")}}`
      )
      for (let index = 0; index < tailLength; index++) {
        const inputIndex = `${length}-${tailLength - index}`
        const value = variable(emitter)
        statements.push(`const ${value}=${input}[${inputIndex}]`)
        const decoded = emit(ast.rest[index + 1], value, statements, emitter, operation, `${path}.rest[${index + 1}]`)
        if (output !== undefined) statements.push(`${output}[${inputIndex}]=${decoded}`)
      }
      return output ?? input
    }
    case "Objects": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        statements.push(`if(${input}===null||${input}===void 0)return ${invalid}`)
        return input
      }
      statements.push(
        `if(typeof ${input}!=="object"||${input}===null||Array.isArray(${input}))return ${invalid}`
      )
      statements.push(
        `if(o!==D&&o.onExcessProperty==="error"&&E(${constant(emitter, ast, path)},${input},o))return ${invalid}`
      )
      const hasOptional = ast.propertySignatures.some((property) => isOptional(property.type))
      if (needsValue && ast.propertySignatures.length > 0 && !hasOptional) {
        const output = variable(emitter)
        const properties = ast.propertySignatures.map((property, index) => {
          const propertyPath = `${path}.propertySignatures[${index}]`
          const key = propertyKey(emitter, property.name, `${propertyPath}.name`)
          const outputKey = typeof property.name === "string" && property.name !== "__proto__" ? key : `[${key}]`
          const value = variable(emitter)
          if (propertyNeedsPresenceCheck(property.name, property.type)) {
            statements.push(`if(!(${propertyPresence(input, key, property.name)}))return ${invalid}`)
          }
          statements.push(`const ${value}=${input}[${key}]`)
          return `${outputKey}:${emit(property.type, value, statements, emitter, operation, `${propertyPath}.type`)}`
        })
        statements.push(`const ${output}={${properties.join(",")}}`)
        if (ast.indexSignatures.length > 0) emitIndexes(ast, input, output, statements, emitter, operation, path)
        return output
      }
      const output = needsValue ? variable(emitter) : undefined
      if (output !== undefined) statements.push(`const ${output}={}`)
      for (let propertyIndex = 0; propertyIndex < ast.propertySignatures.length; propertyIndex++) {
        const property = ast.propertySignatures[propertyIndex]
        const propertyPath = `${path}.propertySignatures[${propertyIndex}]`
        const key = propertyKey(emitter, property.name, `${propertyPath}.name`)
        const value = variable(emitter)
        const propertyStatements: Array<string> = [`const ${value}=${input}[${key}]`]
        const decoded = emit(property.type, value, propertyStatements, emitter, operation, `${propertyPath}.type`)
        if (output !== undefined) propertyStatements.push(assignProperty(output, key, decoded, property.name))
        statements.push(
          isOptional(property.type)
            ? `if(${propertyPresence(input, key, property.name)}){${propertyStatements.join(";")}}`
            : `${
              propertyNeedsPresenceCheck(property.name, property.type)
                ? `if(!(${propertyPresence(input, key, property.name)}))return ${invalid};`
                : ""
            }${propertyStatements.join(";")}`
        )
      }
      if (ast.indexSignatures.length > 0) emitIndexes(ast, input, output, statements, emitter, operation, path)
      return output ?? input
    }
    case "Union": {
      const memberValues = ast.types.map(lookupMemberValues)
      if (memberValues.every((values) => values !== undefined)) {
        const references = ast.types.map((type, index) => lookupMemberReferences(type, `${path}.types[${index}]`))
        if (ast.options?.mode !== "oneOf") {
          const values = constant(emitter, new Set(memberValues.flat()), `new Set([${references.flat().join(",")}])`)
          statements.push(`if(!${values}.has(${input}))return ${invalid}`)
        } else {
          const counts = new Map<unknown, number>()
          const valueReferences = new Map<unknown, string>()
          for (let memberIndex = 0; memberIndex < memberValues.length; memberIndex++) {
            const values = memberValues[memberIndex]
            for (let valueIndex = 0; valueIndex < values.length; valueIndex++) {
              const value = values[valueIndex]
              counts.set(value, (counts.get(value) ?? 0) + 1)
              if (!valueReferences.has(value)) valueReferences.set(value, references[memberIndex][valueIndex])
            }
          }
          const entries = [...counts].map(([value, count]) => `[${valueReferences.get(value)},${count}]`)
          const lookup = constant(emitter, counts, `new Map([${entries.join(",")}])`)
          statements.push(`if(${lookup}.get(${input})!==1)return ${invalid}`)
        }
        return input
      }
      const candidates = variable(emitter)
      const output = variable(emitter)
      const candidate = variable(emitter)
      const index = variable(emitter)
      const decoder = variable(emitter)
      const types = constant(emitter, ast.types, `${path}.types`)
      const decoders = emitUnionHelper(ast, emitter, operation, path)
      statements.push(
        `const ${candidates}=U(${input},${types})`,
        `let ${output}=${invalid},${candidate},${decoder}`
      )
      if (ast.options?.mode !== "oneOf") {
        statements.push(
          `for(let ${index}=0;${index}<${candidates}.length;${index}++){${decoder}=${decoders}.get(${candidates}[${index}]);${candidate}=${decoder}(${input},o);if(${candidate}!==${invalid}){${output}=${candidate};break}}`
        )
        statements.push(`if(${output}===${invalid})return ${invalid}`)
      } else {
        const successes = variable(emitter)
        statements.push(`let ${successes}=0`)
        statements.push(
          `for(let ${index}=0;${index}<${candidates}.length;${index}++){${decoder}=${decoders}.get(${candidates}[${index}]);${candidate}=${decoder}(${input},o);if(${candidate}!==${invalid}){if(++${successes}>1)return ${invalid};${output}=${candidate}}}`
        )
        statements.push(`if(${successes}!==1)return ${invalid}`)
      }
      return output
    }
    default:
      throw new Error(`Unsupported Schema AST: ${ast._tag}`)
  }
}

/** @internal */
export interface Binding {
  readonly value: unknown
  readonly reference: string
}

/** @internal */
export const runtimeReference = (name: keyof typeof runtime): string => `R.${name}`

const runtimeBindings = (aliases: Readonly<Record<string, keyof typeof runtime>>): string =>
  `const {${Object.entries(aliases).map(([alias, name]) => `${name}:${alias}`).join(",")}}=R;`

/** @internal */
export interface GeneratedOperation {
  readonly source: string
  readonly bindings: ReadonlyArray<Binding>
}

const emitOperation = (ast: SchemaAST.AST, operation: Operation): GeneratedOperation => {
  const emitter: Emitter = {
    statements: [],
    helpers: [],
    initializers: [],
    decoderHelpers: new Map(),
    unionHelpers: new Map(),
    bindings: [],
    constantIndexes: new Map(),
    next: 0
  }
  const output = emit(ast, "i", emitter.statements, emitter, operation, "ast")
  const bindings = {
    K: "failsChecks",
    T: "matchesTemplateLiteral",
    U: "getCandidates",
    G: "getIndexSignatureKeys",
    D: "defaultParseOptions",
    E: "hasExcessProperties"
  } as const
  const source = `"use strict";${runtimeBindings(operation === "validate" ? { I: "invalid", ...bindings } : bindings)}${
    emitter.helpers.join(";")
  };${emitter.initializers.join(";")};return function(i,o){${emitter.statements.join(";")};return ${output}}`
  return { source, bindings: emitter.bindings }
}

/** @internal */
export type DecoderOperation = keyof CompiledDecoder

const renderOperation = (emitted: GeneratedOperation): string =>
  `(function(C,R){${emitted.source}})([${emitted.bindings.map((binding) => binding.reference).join(",")}],R)`

/** @internal */
export function generate(ast: SchemaAST.AST, operation: DecoderOperation): string | undefined {
  if (operation === "is" || operation === "validate") {
    if (!shouldCompileParser(ast)) return undefined
    const emission = getEmission(ast)
    if (emission === "unsupported" || operation === "is" && emission !== "is") return undefined
    return "return " + renderOperation(emitOperation(ast, operation))
  }
  const object = ast._tag === "Objects" && ast.propertySignatures.length > 0 &&
      ast.indexSignatures.length === 0 && ast.propertySignatures.length <= maxGeneratedNodes
    ? emitObject(ast)
    : "undefined"
  const array = ast._tag === "Arrays" && ast.elements.length === 0 && ast.rest.length === 1
    ? emitArray()
    : "undefined"
  if (operation === "makeEffect") return `return R.make(ast,resolve,${object},${array})`
  const checkpoint = ast.encoding !== undefined && getEmission(ast, 0, true) !== "unsupported"
    ? `()=>${renderOperation(emitOperation(ast, "validate"))}`
    : "undefined"
  return `return R.decode(ast,resolve,${object},${getEmission(ast) !== "unsupported"},${checkpoint},${array})`
}

const emitArray = (): string =>
  `function({getElement,step,resume}){return function(s,input,index=0,end=input.length){
    const parser=getElement();let r,t,value;
    for(;index<end;index++){
      const item=input[index];r=parser(item,s.options);
      if(r===R.sameExit&&item!==R.missing){s.output[index]=item;continue}
      if(!R.effectIsExit(r))return resume(s,item,index,r,end);
      if(r._tag==="Success"&&(value=r===R.sameExit?item:r[R.args])!==R.missing){s.output[index]=value}
      else{t=step(s,item,r,index);if(t)return t}
    }
  }}`

const emitObject = (ast: SchemaAST.Objects): string => {
  const statements = [
    "if(i===R.missing)return R.missingExit",
    "if(o.errors===\"all\"||o.onExcessProperty!==void 0||(o.concurrency!==void 0&&o.concurrency!==1))return fallback(i,o)",
    "if(typeof i!==\"object\"||i===null||Array.isArray(i))return R.invalidType(ast,i,o)",
    "const properties=getProperties(),out={}",
    "const state={ast,input:i,out,options:o,issues:void 0}",
    "let r,t,value"
  ]
  ast.propertySignatures.forEach((property, index) => {
    const key = typeof property.name === "symbol" ? `properties[${index}].name` : JSON.stringify(String(property.name))
    const present = property.name === "__proto__" ? `Object.hasOwn(i,${key})` : `${key} in i`
    statements.push(
      `const p${index}=properties[${index}],h${index}=${present},v${index}=h${index}?i[${key}]:R.missing`,
      `r=p${index}.parser(v${index},o)`,
      `if(r===R.sameExit){if(h${index}){${assignProperty("out", key, `v${index}`, property.name)}}}else{` +
        `if(!R.effectIsExit(r))return resume(state,${index},r);` +
        `if(r._tag==="Success"&&(value=r[R.args])!==R.missing){${assignProperty("out", key, "value", property.name)}}` +
        `else{t=step(state,p${index},r);if(t)return t}}`
    )
  })
  statements.push("return R.succeed(out)")
  return `function({ast,getProperties,fallback,resume,step}){return function(i,o){try{${
    statements.join(";")
  }}catch(e){return R.die(e)}}}`
}
