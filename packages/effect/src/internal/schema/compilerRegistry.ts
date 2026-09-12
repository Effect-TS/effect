import * as Effect from "../../Effect.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import type { Parser } from "../../SchemaParser.ts"
import type { CompiledDecoder, Is, Validate } from "../../unstable/schema/SchemaCompiler.ts"
import * as Interpreter from "./interpreter.ts"
import * as InternalParser from "./parser.ts"

/** @internal */
export const invalid = Symbol()

/** @internal */
export type Resolve = (ast: SchemaAST.AST) => Entry

/** @internal */
export type Compile = (ast: SchemaAST.AST, resolve: Resolve) => CompiledDecoder | undefined

const cache = new WeakMap<SchemaAST.AST, Entry>()
let compiler: ((ast: SchemaAST.AST, resolve: Resolve) => Entry | undefined) | undefined

/** @internal */
export let compilerAdaptersEnabled = false

function activateCompilerAdapters(): void {
  compilerAdaptersEnabled = true
}

const decodeChild = (ast: SchemaAST.AST): Parser => lazyParser(resolve, ast, "parser")
const makeChild = (ast: SchemaAST.AST): Parser => lazyParser(resolve, ast, "makeEffect")
const makeDefaultedChild = (ast: SchemaAST.AST): Parser => lazyParser(resolve, ast, "makeDefaulted")

/** @internal */
export interface Entry {
  readonly ast: SchemaAST.AST
  readonly source?: CompiledDecoder | undefined
  readonly resolve: Resolve
  readonly is?: Is | undefined
  readonly validate?: Validate | undefined
  readonly decodeEffect: Parser
  readonly parser: Parser
  readonly makeEffect: Parser
  readonly makeDefaulted: Parser
}

class InterpretedEntry implements Entry {
  readonly ast: SchemaAST.AST
  readonly resolve: Resolve

  constructor(
    ast: SchemaAST.AST,
    resolve: Resolve
  ) {
    this.ast = ast
    this.resolve = resolve
  }

  protected save<K extends keyof Entry>(key: K, value: Entry[K]): Entry[K] {
    Object.defineProperty(this, key, { value })
    return value
  }

  get decodeEffect(): Parser {
    return this.save(
      "decodeEffect",
      Interpreter.compile(
        this.ast,
        this.resolve === resolve ? decodeChild : (ast) => lazyParser(this.resolve, ast, "parser")
      )
    )
  }

  get parser(): Parser {
    return this.decodeEffect
  }

  get makeEffect(): Parser {
    return this.save(
      "makeEffect",
      Interpreter.compile(
        this.ast,
        this.resolve === resolve ? makeChild : (ast) => lazyParser(this.resolve, ast, "makeEffect"),
        this.resolve === resolve ? makeDefaultedChild : (ast) => lazyParser(this.resolve, ast, "makeDefaulted")
      )
    )
  }

  get makeDefaulted(): Parser {
    const link = this.ast.context?.constructorDefault
    return link === undefined ? this.makeEffect : this.save(
      "makeDefaulted",
      Interpreter.withDefault(
        this.ast,
        (input, options) => this.makeEffect(input, options),
        this.resolve === resolve ? makeChild : (ast) => lazyParser(this.resolve, ast, "makeEffect")
      )
    )
  }
}

class InstalledEntry extends InterpretedEntry {
  readonly source: CompiledDecoder

  constructor(ast: SchemaAST.AST, source: CompiledDecoder, resolve: Resolve) {
    super(ast, resolve)
    this.source = source
  }

  get is(): Is | undefined {
    return this.save("is", this.source.is)
  }

  get validate(): Validate | undefined {
    return this.save("validate", this.source.validate)
  }

  override get decodeEffect(): Parser {
    return this.save("decodeEffect", this.source.decodeEffect)
  }

  override get parser(): Parser {
    const validate = this.validate
    return validate === undefined
      ? this.decodeEffect
      : this.save("parser", withValidation(validate, () => this.decodeEffect))
  }

  override get makeEffect(): Parser {
    const makeEffect = this.source.makeEffect
    return makeEffect === undefined
      ? super.makeEffect
      : this.save("makeEffect", makeEffect)
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
  operation: "parser" | "decodeEffect" | "makeEffect" | "makeDefaulted"
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
  const entry = compiler?.(ast, resolve) ?? new InterpretedEntry(ast, resolve)
  cache.set(ast, entry)
  return entry
}

/** @internal */
export function set(ast: SchemaAST.AST, decoder: CompiledDecoder | undefined, resolveChild: Resolve = resolve): Entry {
  if (decoder !== undefined) activateCompilerAdapters()
  const entry = decoder === undefined
    ? new InterpretedEntry(ast, resolveChild)
    : new InstalledEntry(ast, decoder, resolveChild)
  cache.set(ast, entry)
  return entry
}

/** @internal */
export function install(compile: Compile): void {
  activateCompilerAdapters()
  compiler = (ast, resolve) => {
    const decoder = compile(ast, resolve)
    return decoder === undefined ? undefined : new InstalledEntry(ast, decoder, resolve)
  }
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
