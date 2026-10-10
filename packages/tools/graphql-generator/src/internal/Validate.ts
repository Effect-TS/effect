/**
 * Validation of executable documents against the schema model: only the rules
 * that decide whether generated types are correct. All
 * input files are validated together: fragments resolve across files and
 * operations and fragments share one namespace.
 *
 * @internal
 */
import type * as Ast from "./Ast.ts"
import { type Diagnostic, make, type Source } from "./Diagnostic.ts"
import * as SchemaModel from "./SchemaModel.ts"

/** One parsed input file. */
export interface File {
  readonly source: Source
  readonly document: Ast.Document
}

/**
 * Collects every diagnostic across `files`, ordered by file (input order) and
 * then by position. Each diagnostic is reported in the file holding the node
 * it points at. Messages follow graphql-js where it has a matching rule,
 * without its "Did you mean" suggestion lists.
 *
 * - Fields exist on their parent type (`__typename` exists on every composite
 *   type).
 * - Arguments exist; required arguments (non-null, no default) are provided.
 * - Variables are defined, used (directly or through spread fragments, from
 *   any file) and of known input types.
 * - Fragments are defined in some input file, used by some operation, acyclic,
 *   and spread onto a possible type (a composite type always overlaps
 *   itself); type conditions name known types.
 * - Operations are named. Operations and fragments share one namespace across
 *   all files; every definition sharing a name gets one diagnostic at its
 *   name, worded for its kind or as "operation or fragment" when kinds mix.
 * - Leaf fields have no selection set; composite fields have one.
 * - Within one selection set, fields sharing a response key select the same
 *   field with the same arguments; the later field is reported.
 *
 * Fields under an unknown field or type are not checked further. The server
 * schema is not validated, and input values are left to the runtime
 * variables `Schema`.
 */
export const validate = (
  schema: SchemaModel.Schema,
  files: ReadonlyArray<File>
): ReadonlyArray<Diagnostic> => {
  const reports: Array<Report> = []
  const report = (fileIndex: number, offset: number, message: string) => {
    reports.push({ fileIndex, offset, diagnostic: make(files[fileIndex]!.source, offset, message) })
  }
  new Validator(schema, files, report).validate()
  // `sort` is stable, so diagnostics at the same position keep the order they were found in.
  return reports
    .sort((a, b) => a.fileIndex - b.fileIndex || a.offset - b.offset)
    .map((report) => report.diagnostic)
}

interface Report {
  readonly fileIndex: number
  readonly offset: number
  readonly diagnostic: Diagnostic
}

/** Reports `message` at a code-unit offset into input file `fileIndex`. */
type Reporter = (fileIndex: number, offset: number, message: string) => void

/** A definition together with the index of the input file it came from. */
interface Located<A> {
  readonly node: A
  readonly file: number
}

type Composite = SchemaModel.ObjectType | SchemaModel.InterfaceType | SchemaModel.UnionType

const isComposite = (type: SchemaModel.NamedType): type is Composite =>
  type._tag === "ObjectType" || type._tag === "InterfaceType" || type._tag === "UnionType"

const isInput = (type: SchemaModel.NamedType): boolean =>
  type._tag === "ScalarType" || type._tag === "EnumType" || type._tag === "InputObjectType"

const typenameField: SchemaModel.Field = {
  name: "__typename",
  description: undefined,
  arguments: [],
  type: { _tag: "NonNullTypeRef", ofType: { _tag: "NamedTypeRef", name: "String" } },
  deprecationReason: undefined
}

const fieldOf = (parent: Composite, name: string): SchemaModel.Field | undefined => {
  if (name === "__typename") return typenameField
  return parent._tag === "UnionType" ? undefined : parent.fields.find((field) => field.name === name)
}

const possibleTypes = (type: Composite): ReadonlyArray<string> =>
  type._tag === "ObjectType" ? [type.name] : type.possibleTypes

const printAstType = (type: Ast.Type): string => SchemaModel.printTypeRef(SchemaModel.fromAstType(type))

const namedAstType = (type: Ast.Type): Ast.NamedType => type._tag === "NamedType" ? type : namedAstType(type.type)

/** Structural equality of argument values, ignoring locations. */
const valueEquals = (a: Ast.Value, b: Ast.Value): boolean => {
  switch (a._tag) {
    case "Variable":
      return b._tag === "Variable" && a.name.value === b.name.value
    case "IntValue":
    case "FloatValue":
    case "StringValue":
    case "EnumValue":
    case "BooleanValue":
      return b._tag === a._tag && b.value === a.value
    case "NullValue":
      return b._tag === "NullValue"
    case "ListValue":
      return b._tag === "ListValue" && a.values.length === b.values.length &&
        a.values.every((value, i) => valueEquals(value, b.values[i]!))
    case "ObjectValue":
      return b._tag === "ObjectValue" && a.fields.length === b.fields.length &&
        a.fields.every((field) => {
          const other = b.fields.find((candidate) => candidate.name.value === field.name.value)
          return other !== undefined && valueEquals(field.value, other.value)
        })
  }
}

const sameArguments = (a: ReadonlyArray<Ast.Argument>, b: ReadonlyArray<Ast.Argument>): boolean =>
  a.length === b.length &&
  a.every((argument) => {
    const other = b.find((candidate) => candidate.name.value === argument.name.value)
    return other !== undefined && valueEquals(argument.value, other.value)
  })

class Validator {
  readonly schema: SchemaModel.Schema
  readonly report: Reporter
  /** Every operation and fragment, in file order and then document order. */
  readonly operations: Array<Located<Ast.OperationDefinition>> = []
  readonly fragmentList: Array<Located<Ast.FragmentDefinition>> = []
  /** The first fragment with each name in any file; duplicates are reported by `checkUniqueNames`. */
  readonly fragments = new Map<string, Located<Ast.FragmentDefinition>>()

  constructor(schema: SchemaModel.Schema, files: ReadonlyArray<File>, report: Reporter) {
    this.schema = schema
    this.report = report
    files.forEach((file, index) => {
      for (const definition of file.document.definitions) {
        if (definition._tag === "OperationDefinition") {
          this.operations.push({ node: definition, file: index })
        } else if (definition._tag === "FragmentDefinition") {
          const fragment = { node: definition, file: index }
          this.fragmentList.push(fragment)
          if (!this.fragments.has(definition.name.value)) this.fragments.set(definition.name.value, fragment)
        }
      }
    })
  }

  validate(): void {
    for (const operation of this.operations) this.validateOperation(operation)
    for (const { file, node: fragment } of this.fragmentList) {
      const type = this.typeCondition(
        file,
        fragment.typeCondition,
        (name) => `Fragment "${fragment.name.value}" cannot condition on non composite type "${name}".`
      )
      if (type !== undefined) this.validateSelectionSet(file, fragment.selectionSet, type)
    }
    this.checkUnusedFragments()
    this.checkFragmentCycles()
    this.checkUniqueNames()
  }

  // Operations and variables

  validateOperation({ file, node: operation }: Located<Ast.OperationDefinition>): void {
    const name = operation.name?.value
    if (name === undefined) {
      this.report(file, operation.loc.start, "Anonymous operations are not supported, name this operation.")
    }

    const defined = new Set<string>()
    for (const definition of operation.variableDefinitions) {
      defined.add(definition.variable.name.value)
      const named = namedAstType(definition.type)
      const type = this.schema.types.get(named.name.value)
      if (type === undefined) {
        this.report(file, named.loc.start, `Unknown type "${named.name.value}".`)
      } else if (!isInput(type)) {
        this.report(
          file,
          definition.type.loc.start,
          `Variable "$${definition.variable.name.value}" cannot be non-input type "${printAstType(definition.type)}".`
        )
      }
    }

    const usages = this.recursiveVariableUsages(file, operation)
    const used = new Set(usages.map((usage) => usage.node.name.value))
    for (const { file: usageFile, node: usage } of usages) {
      if (defined.has(usage.name.value)) continue
      this.report(
        usageFile,
        usage.loc.start,
        name === undefined
          ? `Variable "$${usage.name.value}" is not defined.`
          : `Variable "$${usage.name.value}" is not defined by operation "${name}".`
      )
    }
    for (const definition of operation.variableDefinitions) {
      const variable = definition.variable.name.value
      if (used.has(variable)) continue
      this.report(
        file,
        definition.variable.loc.start,
        name === undefined
          ? `Variable "$${variable}" is never used.`
          : `Variable "$${variable}" is never used in operation "${name}".`
      )
    }

    const rootName = operation.operation === "query"
      ? this.schema.queryType
      : operation.operation === "mutation"
      ? this.schema.mutationType
      : this.schema.subscriptionType
    const root = rootName === undefined ? undefined : this.schema.types.get(rootName)
    if (root === undefined || !isComposite(root)) {
      this.report(file, operation.loc.start, `Schema is not configured to execute ${operation.operation} operation.`)
      return
    }
    this.validateSelectionSet(file, operation.selectionSet, root)
  }

  /**
   * Variables used by an operation, including through every fragment it
   * spreads, transitively and across files. Each usage keeps the file it is in.
   */
  recursiveVariableUsages(file: number, operation: Ast.OperationDefinition): ReadonlyArray<Located<Ast.Variable>> {
    const usages: Array<Located<Ast.Variable>> = []
    const collect = (at: number, definition: Ast.OperationDefinition | Ast.FragmentDefinition): void => {
      const found: Array<Ast.Variable> = []
      variablesInDirectives(definition.directives, found)
      variablesInSelectionSet(definition.selectionSet, found)
      for (const variable of found) usages.push({ node: variable, file: at })
    }
    collect(file, operation)
    for (const fragment of this.reachableFragments([operation.selectionSet])) collect(fragment.file, fragment.node)
    return usages
  }

  /** The defined fragments spread from `selectionSets`, transitively and across files, each once. */
  reachableFragments(selectionSets: ReadonlyArray<Ast.SelectionSet>): Array<Located<Ast.FragmentDefinition>> {
    const reached: Array<Located<Ast.FragmentDefinition>> = []
    const seen = new Set<string>()
    const pending = selectionSets.flatMap((selectionSet) => fragmentSpreads(selectionSet))
    while (pending.length > 0) {
      const name = pending.pop()!.name.value
      if (seen.has(name)) continue
      seen.add(name)
      const fragment = this.fragments.get(name)
      if (fragment === undefined) continue
      reached.push(fragment)
      pending.push(...fragmentSpreads(fragment.node.selectionSet))
    }
    return reached
  }

  // Selections

  validateSelectionSet(file: number, selectionSet: Ast.SelectionSet, parent: Composite): void {
    const byResponseKey = new Map<string, Ast.Field>()
    for (const selection of selectionSet.selections) {
      switch (selection._tag) {
        case "Field": {
          this.validateField(file, selection, parent)
          const key = (selection.alias ?? selection.name).value
          const first = byResponseKey.get(key)
          if (first === undefined) {
            byResponseKey.set(key, selection)
          } else if (first.name.value !== selection.name.value) {
            this.report(
              file,
              selection.loc.start,
              `Fields "${key}" conflict because "${first.name.value}" and "${selection.name.value}" are different fields. Use different aliases on the fields to fetch both if this was intentional.`
            )
          } else if (!sameArguments(first.arguments, selection.arguments)) {
            this.report(
              file,
              selection.loc.start,
              `Fields "${key}" conflict because they have differing arguments. Use different aliases on the fields to fetch both if this was intentional.`
            )
          }
          break
        }
        case "InlineFragment": {
          if (selection.typeCondition === undefined) {
            this.validateSelectionSet(file, selection.selectionSet, parent)
            break
          }
          const type = this.typeCondition(
            file,
            selection.typeCondition,
            (name) => `Fragment cannot condition on non composite type "${name}".`
          )
          if (type === undefined) break
          if (!this.overlaps(parent, type)) {
            this.report(
              file,
              selection.loc.start,
              `Fragment cannot be spread here as objects of type "${parent.name}" can never be of type "${type.name}".`
            )
          }
          this.validateSelectionSet(file, selection.selectionSet, type)
          break
        }
        case "FragmentSpread": {
          const fragment = this.fragments.get(selection.name.value)?.node
          if (fragment === undefined) {
            this.report(file, selection.name.loc.start, `Unknown fragment "${selection.name.value}".`)
            break
          }
          const type = this.schema.types.get(fragment.typeCondition.name.value)
          // Unknown and non-composite type conditions are reported on the fragment definition.
          if (type !== undefined && isComposite(type) && !this.overlaps(parent, type)) {
            this.report(
              file,
              selection.loc.start,
              `Fragment "${fragment.name.value}" cannot be spread here as objects of type "${parent.name}" can never be of type "${type.name}".`
            )
          }
          break
        }
      }
    }
  }

  validateField(file: number, field: Ast.Field, parent: Composite): void {
    const name = field.name.value
    const definition = fieldOf(parent, name)
    if (definition === undefined) {
      this.report(file, field.loc.start, `Cannot query field "${name}" on type "${parent.name}".`)
      return
    }

    for (const argument of field.arguments) {
      if (!definition.arguments.some((candidate) => candidate.name === argument.name.value)) {
        this.report(
          file,
          argument.loc.start,
          `Unknown argument "${argument.name.value}" on field "${parent.name}.${name}".`
        )
      }
    }
    for (const argument of definition.arguments) {
      if (
        argument.type._tag === "NonNullTypeRef" &&
        argument.defaultValue === undefined &&
        !field.arguments.some((candidate) => candidate.name.value === argument.name)
      ) {
        this.report(
          file,
          field.loc.start,
          `Field "${name}" argument "${argument.name}" of type "${
            SchemaModel.printTypeRef(argument.type)
          }" is required, but it was not provided.`
        )
      }
    }

    const type = this.schema.types.get(SchemaModel.namedTypeOf(definition.type))
    if (type === undefined) return
    const printed = SchemaModel.printTypeRef(definition.type)
    if (!isComposite(type)) {
      if (field.selectionSet !== undefined) {
        this.report(
          file,
          field.selectionSet.loc.start,
          `Field "${name}" must not have a selection since type "${printed}" has no subfields.`
        )
      }
    } else if (field.selectionSet === undefined) {
      this.report(
        file,
        field.loc.start,
        `Field "${name}" of type "${printed}" must have a selection of subfields. Did you mean "${name} { ... }"?`
      )
    } else {
      this.validateSelectionSet(file, field.selectionSet, type)
    }
  }

  /** Resolves a type condition, reporting unknown and non-composite types. */
  typeCondition(
    file: number,
    condition: Ast.NamedType,
    nonComposite: (name: string) => string
  ): Composite | undefined {
    const type = this.schema.types.get(condition.name.value)
    if (type === undefined) {
      this.report(file, condition.loc.start, `Unknown type "${condition.name.value}".`)
      return undefined
    }
    if (!isComposite(type)) {
      this.report(file, condition.loc.start, nonComposite(condition.name.value))
      return undefined
    }
    return type
  }

  /** Whether some object type can be both `a` and `b`; a type always overlaps itself, as in graphql-js. */
  overlaps(a: Composite, b: Composite): boolean {
    if (a.name === b.name) return true
    const names = new Set(possibleTypes(a))
    return possibleTypes(b).some((name) => names.has(name))
  }

  // Fragments

  checkUnusedFragments(): void {
    const used = new Set(
      this.reachableFragments(this.operations.map((operation) => operation.node.selectionSet))
        .map((fragment) => fragment.node.name.value)
    )
    for (const { file, node: fragment } of this.fragmentList) {
      if (!used.has(fragment.name.value)) {
        this.report(file, fragment.loc.start, `Fragment "${fragment.name.value}" is never used.`)
      }
    }
  }

  /**
   * Depth-first search from each fragment in file and document order,
   * reporting each cycle once at the first spread on its path (as graphql-js's
   * NoFragmentCycles rule does), in the file holding that spread.
   */
  checkFragmentCycles(): void {
    const visited = new Set<string>()
    const path: Array<Located<Ast.FragmentSpread>> = []
    const indexOnPath = new Map<string, number>()
    const visit = ({ file, node: fragment }: Located<Ast.FragmentDefinition>): void => {
      const name = fragment.name.value
      if (visited.has(name)) return
      visited.add(name)
      const spreads = fragmentSpreads(fragment.selectionSet)
      if (spreads.length === 0) return
      indexOnPath.set(name, path.length)
      for (const spread of spreads) {
        const target = spread.name.value
        const cycleStart = indexOnPath.get(target)
        path.push({ node: spread, file })
        if (cycleStart === undefined) {
          const next = this.fragments.get(target)
          if (next !== undefined) visit(next)
        } else {
          const cycle = path.slice(cycleStart)
          const via = cycle.slice(0, -1).map((step) => `"${step.node.name.value}"`).join(", ")
          this.report(
            cycle[0]!.file,
            cycle[0]!.node.loc.start,
            `Cannot spread fragment "${target}" within itself${via === "" ? "." : ` via ${via}.`}`
          )
        }
        path.pop()
      }
      indexOnPath.delete(name)
    }
    for (const fragment of this.fragmentList) visit(fragment)
  }

  /** Operations and fragments share one namespace across every file: both become generated exports. */
  checkUniqueNames(): void {
    const byName = new Map<string, Array<{ readonly kind: string; readonly file: number; readonly name: Ast.Name }>>()
    const add = (kind: string, file: number, name: Ast.Name | undefined): void => {
      if (name === undefined) return
      const entries = byName.get(name.value)
      if (entries === undefined) byName.set(name.value, [{ kind, file, name }])
      else entries.push({ kind, file, name })
    }
    for (const { file, node } of this.operations) add("operation", file, node.name)
    for (const { file, node } of this.fragmentList) add("fragment", file, node.name)
    for (const [name, entries] of byName) {
      if (entries.length < 2) continue
      const kind = entries.every((entry) => entry.kind === entries[0]!.kind)
        ? entries[0]!.kind
        : "operation or fragment"
      for (const entry of entries) {
        this.report(entry.file, entry.name.loc.start, `There can be only one ${kind} named "${name}".`)
      }
    }
  }
}

/** Every fragment spread in a selection set, at any depth and in source order, without following spreads. */
export const fragmentSpreads = (selectionSet: Ast.SelectionSet): Array<Ast.FragmentSpread> =>
  selectionSet.selections.flatMap((selection) =>
    selection._tag === "FragmentSpread"
      ? [selection]
      : selection.selectionSet === undefined
      ? []
      : fragmentSpreads(selection.selectionSet)
  )

/** Appends every variable referenced in `value`, in document order. */
const variablesInValue = (value: Ast.Value, out: Array<Ast.Variable>): void => {
  switch (value._tag) {
    case "Variable":
      out.push(value)
      break
    case "ListValue":
      for (const item of value.values) variablesInValue(item, out)
      break
    case "ObjectValue":
      for (const field of value.fields) variablesInValue(field.value, out)
      break
  }
}

const variablesInArguments = (args: ReadonlyArray<Ast.Argument>, out: Array<Ast.Variable>): void => {
  for (const argument of args) variablesInValue(argument.value, out)
}

const variablesInDirectives = (directives: ReadonlyArray<Ast.Directive>, out: Array<Ast.Variable>): void => {
  for (const directive of directives) variablesInArguments(directive.arguments, out)
}

/** Variables in arguments and directives at any depth, without following fragment spreads. */
const variablesInSelectionSet = (selectionSet: Ast.SelectionSet, out: Array<Ast.Variable>): void => {
  for (const selection of selectionSet.selections) {
    variablesInDirectives(selection.directives, out)
    if (selection._tag === "Field") variablesInArguments(selection.arguments, out)
    if (selection._tag !== "FragmentSpread" && selection.selectionSet !== undefined) {
      variablesInSelectionSet(selection.selectionSet, out)
    }
  }
}
