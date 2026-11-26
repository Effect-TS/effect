import * as Pipeable from "../../Pipeable.ts"
import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaParser from "../../SchemaParser.ts"

/** @internal */
export const TypeId = "~effect/Schema/Schema"

const RebuildOptions = Symbol()
const AstValue = Symbol()
const AstThunk = Symbol()
const AstDepth = Symbol()

// Building a lazy AST recurses through every unbuilt dependency. Bounding the
// unbuilt depth keeps deeply nested definitions within the call stack.
const maxLazyDepth = 64

const SchemaProto = {
  [TypeId]: TypeId,
  // The AST is built on first access and memoized.
  get ast() {
    let ast = (this as any)[AstValue]
    if (ast === undefined) {
      ast = (this as any)[AstValue] = (this as any)[AstThunk]()
      ;(this as any)[AstThunk] = undefined
      ;(this as any)[AstDepth] = 0
    }
    return ast
  },
  set ast(ast: SchemaAST.AST) {
    ;(this as any)[AstValue] = ast
    ;(this as any)[AstThunk] = undefined
    ;(this as any)[AstDepth] = 0
  },
  get make() {
    const value = SchemaParser.make(this as any)
    Object.defineProperty(this, "make", { value, enumerable: true })
    return value
  },
  get makeEffect() {
    const value = SchemaParser.makeEffect(this as any)
    Object.defineProperty(this, "makeEffect", { value, enumerable: true })
    return value
  },
  get makeOption() {
    const value = SchemaParser.makeOption(this as any)
    Object.defineProperty(this, "makeOption", { value, enumerable: true })
    return value
  },
  pipe() {
    return Pipeable.pipeArguments(this, arguments)
  },
  annotate(this: Schema.Top, annotations: Schema.Annotations.Annotations) {
    return rebuildLazy(this, () => SchemaAST.annotate(this.ast, annotations))
  },
  annotateKey(this: Schema.Top, annotations: Schema.Annotations.Key<unknown>) {
    return rebuildLazy(this, () => SchemaAST.annotateKey(this.ast, annotations))
  },
  check(this: Schema.Top, ...checks: readonly [SchemaAST.Check<unknown>, ...Array<SchemaAST.Check<unknown>>]) {
    return rebuildLazy(this, () => SchemaAST.appendChecks(this.ast, checks))
  },
  rebuild(this: Schema.Top, ast: SchemaAST.AST) {
    return make(ast, (this as any)[RebuildOptions])
  }
}

// A derivation of a built AST is eager, so that its validation errors are
// thrown at definition. Schemas that override `rebuild` receive an eager AST.
function rebuildLazy(self: Schema.Top, thunk: () => SchemaAST.AST) {
  return (self as any)[AstValue] === undefined && self.rebuild === SchemaProto.rebuild
    ? makeLazy(thunk, (self as any)[RebuildOptions], [self])
    : self.rebuild(thunk())
}

/**
 * Derives a schema from the AST of `schema`, eagerly when that AST is built.
 *
 * @internal
 */
export function makeDerived<S extends Schema.Constraint>(
  schema: Schema.Constraint,
  f: (ast: SchemaAST.AST) => S["ast"],
  options?: object
): S {
  return (schema as any)[AstValue] === undefined
    ? makeLazy(() => f(schema.ast), options, [schema])
    : make(f(schema.ast), options)
}

/** @internal */
export function make<S extends Schema.Constraint>(ast: S["ast"], options?: object): S {
  return init(ast, undefined, options)
}

/**
 * Creates a schema whose AST is built by `thunk` on first access. The thunk
 * must not throw and may only read the ASTs of `dependencies`.
 *
 * @internal
 */
export function makeLazy<S extends Schema.Constraint>(
  thunk: () => S["ast"],
  options: object | undefined,
  dependencies: ReadonlyArray<Schema.Constraint>
): S {
  let depth = 0
  for (const dependency of dependencies) {
    const pending = (dependency as any)[AstDepth]
    if (pending > depth) depth = pending
  }
  if (depth >= maxLazyDepth) {
    for (const dependency of dependencies) dependency.ast
    depth = 0
  }
  const self = init(undefined, thunk, options)
  self[AstDepth] = depth + 1
  return self
}

function init(ast: SchemaAST.AST | undefined, thunk: (() => SchemaAST.AST) | undefined, options?: object): any {
  function Schema() {}
  const self = Object.setPrototypeOf(Schema, SchemaProto)
  if (
    options &&
    (Object.hasOwn(options, "name") || Object.hasOwn(options, "length") || Object.hasOwn(options, "__proto__"))
  ) {
    Object.defineProperties(self, Object.getOwnPropertyDescriptors({ ...options }))
  } else {
    Object.assign(self, options)
  }
  self[RebuildOptions] = options
  self[AstValue] = ast
  self[AstThunk] = thunk
  self[AstDepth] = 0
  return self
}
