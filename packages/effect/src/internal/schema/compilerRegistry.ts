import * as Effect from "../../Effect.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import type { Parser } from "../../SchemaParser.ts"
import type { CompiledDecoder, Is, Make, Validate } from "../../unstable/schema/SchemaCompiler.ts"
import * as Interpreter from "./interpreter.ts"
import * as InternalParser from "./parser.ts"

/** @internal */
export const invalid = Symbol()

/** @internal */
export type Resolve = (ast: SchemaAST.AST) => Entry

/** @internal */
export type Compile = (ast: SchemaAST.AST, resolve: Resolve) => CompiledDecoder | undefined

const cache = new WeakMap<SchemaAST.AST, Entry>()
let compiler: ((ast: SchemaAST.AST, resolve: Resolve) => Entry) | undefined

/** @internal */
export let compilerAdaptersEnabled = false

function activateCompilerAdapters(): void {
  compilerAdaptersEnabled = true
}

const decodeChild = (ast: SchemaAST.AST): Parser =>
  compilerAdaptersEnabled
    ? lazyParser(resolve, ast, "parser")
    : resolve(ast).parser
const makeChild = (ast: SchemaAST.AST): Parser =>
  compilerAdaptersEnabled
    ? lazyParser(resolve, ast, "makeEffect")
    : resolve(ast).makeEffect
const makeField = (ast: SchemaAST.AST): Parser => Interpreter.compileField(ast, makeChild)

/** @internal */
export interface Entry {
  readonly ast: SchemaAST.AST
  readonly source?: CompiledDecoder | undefined
  readonly resolve?: Resolve | undefined
  readonly is?: Is | undefined
  readonly validate?: Validate | undefined
  readonly make?: Make | undefined
  readonly decodeEffect: Parser
  readonly parser: Parser
  readonly makeEffect: Parser
}

class InterpretedEntry implements Entry {
  readonly ast: SchemaAST.AST
  declare private cachedDecodeEffect: Parser | undefined
  declare private cachedMakeEffect: Parser | undefined

  constructor(ast: SchemaAST.AST) {
    this.ast = ast
  }

  get decodeEffect(): Parser {
    return this.cachedDecodeEffect ??= Interpreter.compile(this.ast, decodeChild)
  }

  get parser(): Parser {
    return this.decodeEffect
  }

  get makeEffect(): Parser {
    return this.cachedMakeEffect ??= Interpreter.compile(this.ast, makeChild, makeField)
  }
}

class CompilerEntry extends InterpretedEntry {
  readonly source: CompiledDecoder | undefined
  readonly resolve: Resolve

  constructor(ast: SchemaAST.AST, source: CompiledDecoder | undefined, resolve: Resolve) {
    super(ast)
    this.source = source
    this.resolve = resolve
  }

  private save<K extends keyof Entry>(key: K, value: Entry[K]): Entry[K] {
    Object.defineProperty(this, key, { value })
    return value
  }

  get is(): Is | undefined {
    return this.save("is", this.source?.is)
  }

  get validate(): Validate | undefined {
    return this.save("validate", this.source?.validate)
  }

  get make(): Make | undefined {
    return this.save("make", this.source?.make)
  }

  override get decodeEffect(): Parser {
    return this.save(
      "decodeEffect",
      this.source?.decodeEffect ?? Interpreter.compile(this.ast, (ast) => lazyParser(this.resolve, ast, "parser"))
    )
  }

  override get parser(): Parser {
    const validate = this.validate
    return validate === undefined
      ? this.decodeEffect
      : this.save("parser", withValidation(validate, () => this.decodeEffect))
  }

  override get makeEffect(): Parser {
    const makeEffect = this.source?.makeEffect
    if (makeEffect !== undefined) return this.save("makeEffect", makeEffect)
    const child = (ast: SchemaAST.AST): Parser => lazyParser(this.resolve, ast, "makeEffect")
    return this.save(
      "makeEffect",
      Interpreter.compile(
        this.ast,
        child,
        (ast) => Interpreter.compileField(ast, child)
      )
    )
  }
}

/** @internal */
export function withValidation(validate: Validate, decode: () => Parser): Parser {
  let detailed: Parser | undefined
  return (input, options) => {
    if (input !== InternalParser.missing) {
      try {
        const value = validate(input, options)
        if (value !== invalid) return value === input ? InternalParser.sameExit : InternalParser.succeed(value)
      } catch (error) {
        return Effect.die(error)
      }
    }
    return (detailed ??= decode())(input, options)
  }
}

/** @internal */
export function lazyParser(
  resolve: Resolve,
  ast: SchemaAST.AST,
  operation: "parser" | "decodeEffect" | "makeEffect"
): Parser {
  const entry = resolve(ast)
  if (entry.source === undefined || Object.hasOwn(entry, operation)) return entry[operation]
  let parser: Parser | undefined
  return (input, options) => (parser ??= entry[operation])(input, options)
}

/** @internal */
export function resolve(ast: SchemaAST.AST): Entry {
  const cached = cache.get(ast)
  if (cached !== undefined) return cached
  const entry = compiler === undefined ? new InterpretedEntry(ast) : compiler(ast, resolve)
  cache.set(ast, entry)
  return entry
}

/** @internal */
export function set(ast: SchemaAST.AST, decoder: CompiledDecoder | undefined, resolveChild: Resolve = resolve): Entry {
  if (decoder !== undefined) activateCompilerAdapters()
  const entry = new CompilerEntry(ast, decoder, resolveChild)
  cache.set(ast, entry)
  return entry
}

/** @internal */
export function install(compile: Compile): void {
  activateCompilerAdapters()
  compiler = (ast, resolve) => new CompilerEntry(ast, compile(ast, resolve), resolve)
}

/** @internal */
export function enable(ast: SchemaAST.AST, compile: Compile): void {
  activateCompilerAdapters()
  const scoped: Resolve = (child) => {
    const cached = cache.get(child)
    return cached !== undefined && (cached.source !== undefined || cached.resolve === scoped)
      ? cached
      : set(child, compile(child, scoped), scoped)
  }
  const decoder = compile(ast, scoped)
  if (decoder !== undefined || cache.get(ast)?.source === undefined) set(ast, decoder, scoped)
}
