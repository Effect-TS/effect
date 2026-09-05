import * as Effect from "../../Effect.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaIssue from "../../SchemaIssue.ts"
import { compile as compileInterpreted } from "./interpreter.ts"
import * as InternalParser from "./parser.ts"

/** @internal */
export const invalid = Symbol()

/** @internal */
export interface Is {
  (input: unknown, options: SchemaAST.ParseOptions): boolean
}

/** @internal */
export interface Validate {
  (input: unknown, options: SchemaAST.ParseOptions): unknown | typeof invalid
}

/** @internal */
export interface Decode {
  (
    input: unknown,
    options: SchemaAST.ParseOptions
  ): Effect.Effect<unknown, SchemaIssue.Issue, any>
}

/** @internal */
export interface CompiledDecoder {
  readonly is?: Is
  readonly validate?: Validate
  readonly decode: Decode
}

/** @internal */
export interface OptimizedIs extends Is {
  readonly default: (input: unknown) => boolean
}

/** @internal */
export interface OptimizedValidate extends Validate {
  readonly default: (input: unknown) => unknown | typeof invalid
}

/** @internal */
export interface OptimizedCompiledDecoder {
  readonly is?: OptimizedIs
  readonly validate?: OptimizedValidate
  readonly decode: Decode
}

/** @internal */
export interface Parser {
  (
    input: unknown,
    options: SchemaAST.ParseOptions
  ): Effect.Effect<unknown, SchemaIssue.Issue, any>
}

/** @internal */
export interface ResolveParser {
  (ast: SchemaAST.AST): Parser
}

/** @internal */
export interface Compiler {
  (ast: SchemaAST.AST, resolve: ResolveParser): OptimizedCompiledDecoder | undefined
}

const CompiledDecoderTypeId = Symbol()
const DirectParserTypeId = Symbol()

type CompiledParser = Parser & {
  readonly [CompiledDecoderTypeId]: OptimizedCompiledDecoder
  readonly [DirectParserTypeId]: () => Parser
}

/** @internal */
export const getCompiledDecoder = (parser: Parser): OptimizedCompiledDecoder | undefined =>
  (parser as Partial<CompiledParser>)[CompiledDecoderTypeId]

const makeDirectParser = (compiled: OptimizedCompiledDecoder): Parser => {
  const validate = compiled.validate
  if (validate === undefined) return compiled.decode
  return (input, options) => {
    if (input !== InternalParser.missing) {
      try {
        const output = options === SchemaAST.defaultParseOptions
          ? validate.default(input)
          : validate(input, options)
        if (output !== invalid) {
          return output === input ? InternalParser.sameExit : InternalParser.succeed(output)
        }
      } catch (error) {
        return Effect.die(error)
      }
    }
    return compiled.decode(input, options)
  }
}

const makeCompiledParser = (compiled: OptimizedCompiledDecoder): CompiledParser => {
  let direct: Parser | undefined
  const getDirect = (): Parser => direct ??= makeDirectParser(compiled)
  const parser: Parser = (input, options) => getDirect()(input, options)
  return Object.assign(parser, {
    [CompiledDecoderTypeId]: compiled,
    [DirectParserTypeId]: getDirect
  })
}

/** @internal */
export const getDirectParser = (parser: Parser): Parser =>
  (parser as Partial<CompiledParser>)[DirectParserTypeId]?.() ?? parser

const cache = new WeakMap<SchemaAST.AST, Parser>()

const optimizeIs = (is: Is): OptimizedIs => {
  const optimized = (is as Partial<OptimizedIs>).default
  return optimized === undefined
    ? Object.assign(
      (input: unknown, options: SchemaAST.ParseOptions) => is(input, options),
      { default: (input: unknown) => is(input, SchemaAST.defaultParseOptions) }
    )
    : is as OptimizedIs
}

const optimizeValidate = (validate: Validate): OptimizedValidate => {
  const optimized = (validate as Partial<OptimizedValidate>).default
  return optimized === undefined
    ? Object.assign(
      (input: unknown, options: SchemaAST.ParseOptions) => validate(input, options),
      { default: (input: unknown) => validate(input, SchemaAST.defaultParseOptions) }
    )
    : validate as OptimizedValidate
}

const optimize = (compiled: CompiledDecoder): OptimizedCompiledDecoder => {
  const out: {
    is?: OptimizedIs
    validate?: OptimizedValidate
    decode: Decode
  } = { decode: compiled.decode }
  if (compiled.is !== undefined) out.is = optimizeIs(compiled.is)
  if (compiled.validate !== undefined) out.validate = optimizeValidate(compiled.validate)
  return out
}

const setOptimized = (ast: SchemaAST.AST, compiled: OptimizedCompiledDecoder): Parser => {
  const parser = makeCompiledParser(compiled)
  cache.set(ast, parser)
  return parser
}

/** @internal */
export const set = (ast: SchemaAST.AST, compiled: CompiledDecoder): Parser => setOptimized(ast, optimize(compiled))

let installedCompiler: Compiler | undefined

/** @internal */
export const install = (compiler: Compiler): void => {
  installedCompiler = compiler
}

/** @internal */
export const resolve: ResolveParser = (ast) => {
  const cached = cache.get(ast)
  if (cached !== undefined) return cached
  const compiled = installedCompiler?.(ast, resolve)
  if (compiled !== undefined) return setOptimized(ast, compiled)
  const parser = compileInterpreted(ast, resolve)
  cache.set(ast, parser)
  return parser
}

/** @internal */
export const makeScopedCompiler = (compiler: Compiler): (ast: SchemaAST.AST) => void => {
  const pending = new WeakMap<SchemaAST.AST, Parser>()

  const resolveScoped: ResolveParser = (ast) => {
    const recursive = pending.get(ast)
    if (recursive !== undefined) return recursive
    const cached = cache.get(ast)
    if (cached !== undefined && getCompiledDecoder(cached) !== undefined) {
      return cached
    }
    return compileAndSet(ast, cached)
  }

  const compileAndSet = (ast: SchemaAST.AST, cached: Parser | undefined): Parser => {
    let parser: Parser | undefined
    const recursive: Parser = (input, options) => parser!(input, options)
    pending.set(ast, recursive)
    try {
      const compiled = compiler(ast, resolveScoped)
      if (compiled !== undefined) {
        parser = setOptimized(ast, compiled)
        return parser
      }
      if (cached !== undefined && getCompiledDecoder(cached) !== undefined) {
        parser = cached
        return parser
      }
      parser = compileInterpreted(ast, resolveScoped)
      cache.set(ast, parser)
      return parser
    } finally {
      pending.delete(ast)
    }
  }

  return (ast) => {
    compileAndSet(ast, cache.get(ast))
  }
}
