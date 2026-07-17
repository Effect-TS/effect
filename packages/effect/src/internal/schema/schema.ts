import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Pipeable from "../../Pipeable.ts"
import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import { SchemaError } from "../../SchemaError.ts"
import type { Issue } from "../../SchemaIssue.ts"
import * as SchemaParser from "../../SchemaParser.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"

/** @internal */
export const TypeId = "~effect/Schema/Schema"

/** @internal */
export function makeDeclarationReviver<P>(
  id: string,
  payloadSchema: Schema.Decoder<P>,
  revive: SchemaRepresentation.DeclarationReviver<P>["revive"]
): SchemaRepresentation.DeclarationReviver<P> {
  return {
    id,
    payloadSchema,
    revive
  }
}

/** @internal */
export function makeFilterReviver<P>(
  id: string,
  payloadSchema: Schema.Decoder<P>,
  revive: SchemaRepresentation.FilterReviver<P>["revive"]
): SchemaRepresentation.FilterReviver<P> {
  return {
    id,
    payloadSchema,
    revive
  }
}

/** @internal */
export function makeFilterGroupReviver<P>(
  id: string,
  payloadSchema: Schema.Decoder<P>,
  revive: SchemaRepresentation.FilterGroupReviver<P>["revive"]
): SchemaRepresentation.FilterGroupReviver<P> {
  return {
    id,
    payloadSchema,
    revive
  }
}

const SchemaProto = {
  [TypeId]: TypeId,
  pipe() {
    return Pipeable.pipeArguments(this, arguments)
  },
  annotate(this: Schema.Top, annotations: Schema.Annotations.Annotations) {
    return this.rebuild(SchemaAST.annotate(this.ast, annotations))
  },
  annotateKey(this: Schema.Top, annotations: Schema.Annotations.Key<unknown>) {
    return this.rebuild(SchemaAST.annotateKey(this.ast, annotations))
  },
  check(this: Schema.Top, ...checks: readonly [SchemaAST.Check<unknown>, ...Array<SchemaAST.Check<unknown>>]) {
    return this.rebuild(SchemaAST.appendChecks(this.ast, checks))
  }
}

/** @internal */
export function make<S extends Schema.Constraint>(ast: S["ast"], options?: object): S {
  const self = Object.create(SchemaProto)
  if (options) {
    Object.assign(self, options)
  }
  self.ast = ast
  self.rebuild = (ast: SchemaAST.AST) => make(ast, options)
  const makeEffect = SchemaParser.makeEffect(self)
  self.makeEffect = (input: S["~type.make.in"], options?: Schema.MakeOptions) =>
    fromIssueEffect(makeEffect(input, options))
  self.make = SchemaParser.make(self)
  self.makeOption = SchemaParser.makeOption(self)
  return self
}

/** @internal */
export function fromIssueEffect<A, R>(
  self: Effect.Effect<A, Issue, R>
): Effect.Effect<A, SchemaError, R> {
  return Effect.catchCause(
    self,
    (cause) => Effect.failCauseSync(() => Cause.map(cause, (issue) => new SchemaError(issue)))
  )
}

/** @internal */
export const jsonReorder = makeReorder(getJsonPriority)

function getJsonPriority(ast: SchemaAST.AST): number {
  switch (ast._tag) {
    case "BigInt":
    case "Symbol":
    case "UniqueSymbol":
      return 0
    default:
      return 1
  }
}

/** @internal */
export function makeReorder(getPriority: (ast: SchemaAST.AST) => number) {
  return (types: ReadonlyArray<SchemaAST.AST>): ReadonlyArray<SchemaAST.AST> => {
    // Create a map of original indices for O(1) lookup
    const indexMap = new Map<SchemaAST.AST, number>()
    for (let i = 0; i < types.length; i++) {
      indexMap.set(SchemaAST.toEncoded(types[i]), i)
    }

    // Create a sorted copy of the types array
    const sortedTypes = [...types].sort((a, b) => {
      a = SchemaAST.toEncoded(a)
      b = SchemaAST.toEncoded(b)
      const pa = getPriority(a)
      const pb = getPriority(b)
      if (pa !== pb) return pa - pb
      // If priorities are equal, maintain original order (stable sort)
      return indexMap.get(a)! - indexMap.get(b)!
    })

    // Check if order changed by comparing arrays
    const orderChanged = sortedTypes.some((ast, index) => ast !== types[index])

    if (!orderChanged) return types
    return sortedTypes
  }
}
