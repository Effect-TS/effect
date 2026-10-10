/**
 * Validation of executable documents against the schema model: only the rules
 * that decide whether generated types are correct (EFF-1829 point 5), plus
 * operation and fragment name uniqueness across all input files (EFF-1830
 * point 10).
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
 * then by position. Messages follow graphql-js where it has a matching rule,
 * without its "Did you mean" suggestion lists.
 *
 * - Fields exist on their parent type (`__typename` exists on every composite
 *   type).
 * - Arguments exist; required arguments (non-null, no default) are provided.
 * - Variables are defined, used (directly or through spread fragments) and of
 *   known input types.
 * - Fragments are defined, used, acyclic, and spread onto a possible type;
 *   type conditions name known types.
 * - Operations are named. Operation names and fragment names are each unique
 *   across all files; every definition sharing a name gets one diagnostic at
 *   its name.
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
  files.forEach((file, fileIndex) => {
    const report = (offset: number, message: string) => {
      reports.push({ fileIndex, offset, diagnostic: make(file.source, offset, message) })
    }
    new DocumentValidator(schema, file.document, report).validate()
  })
  checkUniqueNames(files, reports)
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

class DocumentValidator {
  readonly schema: SchemaModel.Schema
  readonly report: (offset: number, message: string) => void
  readonly operations: ReadonlyArray<Ast.OperationDefinition>
  readonly fragmentList: ReadonlyArray<Ast.FragmentDefinition>
  /** The first fragment with each name; duplicates are reported by `checkUniqueNames`. */
  readonly fragments = new Map<string, Ast.FragmentDefinition>()

  constructor(
    schema: SchemaModel.Schema,
    document: Ast.Document,
    report: (offset: number, message: string) => void
  ) {
    this.schema = schema
    this.report = report
    this.operations = document.definitions.filter((definition): definition is Ast.OperationDefinition =>
      definition._tag === "OperationDefinition"
    )
    this.fragmentList = document.definitions.filter((definition): definition is Ast.FragmentDefinition =>
      definition._tag === "FragmentDefinition"
    )
    for (const fragment of this.fragmentList) {
      if (!this.fragments.has(fragment.name.value)) this.fragments.set(fragment.name.value, fragment)
    }
  }

  validate(): void {
    for (const operation of this.operations) this.validateOperation(operation)
    for (const fragment of this.fragmentList) {
      const type = this.typeCondition(
        fragment.typeCondition,
        (name) => `Fragment "${fragment.name.value}" cannot condition on non composite type "${name}".`
      )
      if (type !== undefined) this.validateSelectionSet(fragment.selectionSet, type)
    }
    this.checkUnusedFragments()
    this.checkFragmentCycles()
  }

  // Operations and variables

  validateOperation(operation: Ast.OperationDefinition): void {
    const name = operation.name?.value
    if (name === undefined) {
      this.report(operation.loc.start, "Anonymous operations are not supported, name this operation.")
    }

    const defined = new Set<string>()
    for (const definition of operation.variableDefinitions) {
      defined.add(definition.variable.name.value)
      const named = namedAstType(definition.type)
      const type = this.schema.types.get(named.name.value)
      if (type === undefined) {
        this.report(named.loc.start, `Unknown type "${named.name.value}".`)
      } else if (!isInput(type)) {
        this.report(
          definition.type.loc.start,
          `Variable "$${definition.variable.name.value}" cannot be non-input type "${printAstType(definition.type)}".`
        )
      }
    }

    const usages = this.recursiveVariableUsages(operation)
    const used = new Set(usages.map((usage) => usage.name.value))
    for (const usage of usages) {
      if (defined.has(usage.name.value)) continue
      this.report(
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
      this.report(operation.loc.start, `Schema is not configured to execute ${operation.operation} operation.`)
      return
    }
    this.validateSelectionSet(operation.selectionSet, root)
  }

  /** Variables used by an operation, including through every fragment it spreads, transitively. */
  recursiveVariableUsages(operation: Ast.OperationDefinition): ReadonlyArray<Ast.Variable> {
    const usages: Array<Ast.Variable> = []
    variablesInDirectives(operation.directives, usages)
    variablesInSelectionSet(operation.selectionSet, usages)
    const seen = new Set<string>()
    const pending = [...fragmentSpreads(operation.selectionSet)]
    while (pending.length > 0) {
      const spread = pending.pop()!
      if (seen.has(spread.name.value)) continue
      seen.add(spread.name.value)
      const fragment = this.fragments.get(spread.name.value)
      if (fragment === undefined) continue
      variablesInDirectives(fragment.directives, usages)
      variablesInSelectionSet(fragment.selectionSet, usages)
      pending.push(...fragmentSpreads(fragment.selectionSet))
    }
    return usages
  }

  // Selections

  validateSelectionSet(selectionSet: Ast.SelectionSet, parent: Composite): void {
    const byResponseKey = new Map<string, Ast.Field>()
    for (const selection of selectionSet.selections) {
      switch (selection._tag) {
        case "Field": {
          this.validateField(selection, parent)
          const key = (selection.alias ?? selection.name).value
          const first = byResponseKey.get(key)
          if (first === undefined) {
            byResponseKey.set(key, selection)
          } else if (first.name.value !== selection.name.value) {
            this.report(
              selection.loc.start,
              `Fields "${key}" conflict because "${first.name.value}" and "${selection.name.value}" are different fields. Use different aliases on the fields to fetch both if this was intentional.`
            )
          } else if (!sameArguments(first.arguments, selection.arguments)) {
            this.report(
              selection.loc.start,
              `Fields "${key}" conflict because they have differing arguments. Use different aliases on the fields to fetch both if this was intentional.`
            )
          }
          break
        }
        case "InlineFragment": {
          if (selection.typeCondition === undefined) {
            this.validateSelectionSet(selection.selectionSet, parent)
            break
          }
          const type = this.typeCondition(
            selection.typeCondition,
            (name) => `Fragment cannot condition on non composite type "${name}".`
          )
          if (type === undefined) break
          if (!this.overlaps(parent, type)) {
            this.report(
              selection.loc.start,
              `Fragment cannot be spread here as objects of type "${parent.name}" can never be of type "${type.name}".`
            )
          }
          this.validateSelectionSet(selection.selectionSet, type)
          break
        }
        case "FragmentSpread": {
          const fragment = this.fragments.get(selection.name.value)
          if (fragment === undefined) {
            this.report(selection.name.loc.start, `Unknown fragment "${selection.name.value}".`)
            break
          }
          const type = this.schema.types.get(fragment.typeCondition.name.value)
          // Unknown and non-composite type conditions are reported on the fragment definition.
          if (type !== undefined && isComposite(type) && !this.overlaps(parent, type)) {
            this.report(
              selection.loc.start,
              `Fragment "${fragment.name.value}" cannot be spread here as objects of type "${parent.name}" can never be of type "${type.name}".`
            )
          }
          break
        }
      }
    }
  }

  validateField(field: Ast.Field, parent: Composite): void {
    const name = field.name.value
    const definition = fieldOf(parent, name)
    if (definition === undefined) {
      this.report(field.loc.start, `Cannot query field "${name}" on type "${parent.name}".`)
      return
    }

    for (const argument of field.arguments) {
      if (!definition.arguments.some((candidate) => candidate.name === argument.name.value)) {
        this.report(argument.loc.start, `Unknown argument "${argument.name.value}" on field "${parent.name}.${name}".`)
      }
    }
    for (const argument of definition.arguments) {
      if (
        argument.type._tag === "NonNullTypeRef" &&
        argument.defaultValue === undefined &&
        !field.arguments.some((candidate) => candidate.name.value === argument.name)
      ) {
        this.report(
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
          field.selectionSet.loc.start,
          `Field "${name}" must not have a selection since type "${printed}" has no subfields.`
        )
      }
    } else if (field.selectionSet === undefined) {
      this.report(
        field.loc.start,
        `Field "${name}" of type "${printed}" must have a selection of subfields. Did you mean "${name} { ... }"?`
      )
    } else {
      this.validateSelectionSet(field.selectionSet, type)
    }
  }

  /** Resolves a type condition, reporting unknown and non-composite types. */
  typeCondition(condition: Ast.NamedType, nonComposite: (name: string) => string): Composite | undefined {
    const type = this.schema.types.get(condition.name.value)
    if (type === undefined) {
      this.report(condition.loc.start, `Unknown type "${condition.name.value}".`)
      return undefined
    }
    if (!isComposite(type)) {
      this.report(condition.loc.start, nonComposite(condition.name.value))
      return undefined
    }
    return type
  }

  overlaps(a: Composite, b: Composite): boolean {
    const names = new Set(possibleTypes(a))
    return possibleTypes(b).some((name) => names.has(name))
  }

  // Fragments

  checkUnusedFragments(): void {
    const used = new Set<string>()
    const pending = this.operations.flatMap((operation) => fragmentSpreads(operation.selectionSet))
    while (pending.length > 0) {
      const spread = pending.pop()!
      if (used.has(spread.name.value)) continue
      used.add(spread.name.value)
      const fragment = this.fragments.get(spread.name.value)
      if (fragment !== undefined) pending.push(...fragmentSpreads(fragment.selectionSet))
    }
    for (const fragment of this.fragmentList) {
      if (!used.has(fragment.name.value)) {
        this.report(fragment.loc.start, `Fragment "${fragment.name.value}" is never used.`)
      }
    }
  }

  /**
   * Depth-first search from each fragment in document order, reporting each
   * cycle once at the first spread on its path (as graphql-js's
   * NoFragmentCycles rule does).
   */
  checkFragmentCycles(): void {
    const visited = new Set<string>()
    const path: Array<Ast.FragmentSpread> = []
    const indexOnPath = new Map<string, number>()
    const visit = (fragment: Ast.FragmentDefinition): void => {
      const name = fragment.name.value
      if (visited.has(name)) return
      visited.add(name)
      const spreads = fragmentSpreads(fragment.selectionSet)
      if (spreads.length === 0) return
      indexOnPath.set(name, path.length)
      for (const spread of spreads) {
        const target = spread.name.value
        const cycleStart = indexOnPath.get(target)
        path.push(spread)
        if (cycleStart === undefined) {
          const next = this.fragments.get(target)
          if (next !== undefined) visit(next)
        } else {
          const cycle = path.slice(cycleStart)
          const via = cycle.slice(0, -1).map((step) => `"${step.name.value}"`).join(", ")
          this.report(
            cycle[0]!.loc.start,
            `Cannot spread fragment "${target}" within itself${via === "" ? "." : ` via ${via}.`}`
          )
        }
        path.pop()
      }
      indexOnPath.delete(name)
    }
    for (const fragment of this.fragmentList) visit(fragment)
  }
}

/** Every fragment spread in a selection set, at any depth, without following spreads. */
const fragmentSpreads = (selectionSet: Ast.SelectionSet): Array<Ast.FragmentSpread> => {
  const spreads: Array<Ast.FragmentSpread> = []
  const walk = (set: Ast.SelectionSet): void => {
    for (const selection of set.selections) {
      if (selection._tag === "FragmentSpread") spreads.push(selection)
      else if (selection.selectionSet !== undefined) walk(selection.selectionSet)
    }
  }
  walk(selectionSet)
  return spreads
}

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

const variablesInDirectives = (directives: ReadonlyArray<Ast.Directive>, out: Array<Ast.Variable>): void => {
  for (const directive of directives) {
    for (const argument of directive.arguments) variablesInValue(argument.value, out)
  }
}

/** Variables in arguments and directives at any depth, without following fragment spreads. */
const variablesInSelectionSet = (selectionSet: Ast.SelectionSet, out: Array<Ast.Variable>): void => {
  for (const selection of selectionSet.selections) {
    variablesInDirectives(selection.directives, out)
    if (selection._tag === "Field") {
      for (const argument of selection.arguments) variablesInValue(argument.value, out)
    }
    if (selection._tag !== "FragmentSpread" && selection.selectionSet !== undefined) {
      variablesInSelectionSet(selection.selectionSet, out)
    }
  }
}

/** Operation and fragment names are unique across every file (EFF-1830 point 10). */
const checkUniqueNames = (files: ReadonlyArray<File>, reports: Array<Report>): void => {
  const operations = new Map<string, Array<readonly [number, File, Ast.Name]>>()
  const fragments = new Map<string, Array<readonly [number, File, Ast.Name]>>()
  files.forEach((file, fileIndex) => {
    for (const definition of file.document.definitions) {
      let table: Map<string, Array<readonly [number, File, Ast.Name]>>
      let name: Ast.Name | undefined
      if (definition._tag === "OperationDefinition") {
        table = operations
        name = definition.name
      } else if (definition._tag === "FragmentDefinition") {
        table = fragments
        name = definition.name
      } else {
        continue
      }
      if (name === undefined) continue
      const entries = table.get(name.value)
      const entry = [fileIndex, file, name] as const
      if (entries === undefined) table.set(name.value, [entry])
      else entries.push(entry)
    }
  })
  for (const [table, kind] of [[operations, "operation"], [fragments, "fragment"]] as const) {
    for (const [name, entries] of table) {
      if (entries.length < 2) continue
      for (const [fileIndex, file, node] of entries) {
        reports.push({
          fileIndex,
          offset: node.loc.start,
          diagnostic: make(file.source, node.loc.start, `There can be only one ${kind} named "${name}".`)
        })
      }
    }
  }
}
