/**
 * Token-minimal printer for executable documents; SDL is not supported.
 *
 * Preserves definition order and number text. Strings use regular quoted
 * syntax. Spaces separate adjacent non-punctuator tokens; there is no trailing
 * newline. Anonymous queries without variables or directives use shorthand.
 *
 * Descriptions are omitted because they have no execution meaning and are
 * rejected by servers using the 2021 grammar.
 *
 * @internal
 */
import type * as Ast from "./Ast.ts"

/**
 * Prints an executable document compactly. Throws on type-system definitions
 * and extensions, which are outside the contract.
 */
export const print = (document: Ast.Document): string => concatAll(document.definitions.map(printDefinition))

/** A character that ends or starts a non-punctuator token. */
const isWordCharacter = (char: string): boolean => /[A-Za-z0-9_"-]/.test(char)

/** Joins two printed fragments, adding a space only where two non-punctuators would otherwise touch. */
const concat = (left: string, right: string): string => {
  if (left.length === 0 || right.length === 0) return left + right
  return isWordCharacter(left[left.length - 1]!) && isWordCharacter(right[0]!) ? `${left} ${right}` : left + right
}

const concatAll = (parts: ReadonlyArray<string>): string => parts.reduce(concat, "")

const printDefinition = (definition: Ast.Definition): string => {
  switch (definition._tag) {
    case "OperationDefinition":
      return printOperation(definition)
    case "FragmentDefinition":
      return concatAll([
        "fragment",
        definition.name.value,
        "on",
        definition.typeCondition.name.value,
        printDirectives(definition.directives),
        printSelectionSet(definition.selectionSet)
      ])
    default:
      throw new Error(
        `@effect/graphql-generator: cannot print a ${definition._tag}; only executable documents are printed`
      )
  }
}

const printOperation = (operation: Ast.OperationDefinition): string => {
  const selectionSet = printSelectionSet(operation.selectionSet)
  if (
    operation.operation === "query" &&
    operation.name === undefined &&
    operation.variableDefinitions.length === 0 &&
    operation.directives.length === 0
  ) {
    return selectionSet
  }
  return concatAll([
    operation.operation,
    operation.name === undefined ? "" : operation.name.value,
    operation.variableDefinitions.length === 0
      ? ""
      : `(${concatAll(operation.variableDefinitions.map(printVariableDefinition))})`,
    printDirectives(operation.directives),
    selectionSet
  ])
}

const printVariableDefinition = (definition: Ast.VariableDefinition): string =>
  concatAll([
    `$${definition.variable.name.value}:`,
    printType(definition.type),
    definition.defaultValue === undefined ? "" : `=${printValue(definition.defaultValue)}`,
    printDirectives(definition.directives)
  ])

const printType = (type: Ast.Type): string => {
  switch (type._tag) {
    case "NamedType":
      return type.name.value
    case "ListType":
      return `[${printType(type.type)}]`
    case "NonNullType":
      return `${printType(type.type)}!`
  }
}

const printSelectionSet = (selectionSet: Ast.SelectionSet): string =>
  `{${concatAll(selectionSet.selections.map(printSelection))}}`

const printSelection = (selection: Ast.Selection): string => {
  switch (selection._tag) {
    case "Field":
      return concatAll([
        selection.alias === undefined ? selection.name.value : `${selection.alias.value}:${selection.name.value}`,
        printArguments(selection.arguments),
        printDirectives(selection.directives),
        selection.selectionSet === undefined ? "" : printSelectionSet(selection.selectionSet)
      ])
    case "FragmentSpread":
      return concatAll([`...${selection.name.value}`, printDirectives(selection.directives)])
    case "InlineFragment":
      return concatAll([
        "...",
        selection.typeCondition === undefined ? "" : `on ${selection.typeCondition.name.value}`,
        printDirectives(selection.directives),
        printSelectionSet(selection.selectionSet)
      ])
  }
}

const printArguments = (args: ReadonlyArray<Ast.Argument>): string =>
  args.length === 0
    ? ""
    : `(${concatAll(args.map((argument) => `${argument.name.value}:${printValue(argument.value)}`))})`

const printDirectives = (directives: ReadonlyArray<Ast.Directive>): string =>
  concatAll(directives.map((directive) => `@${directive.name.value}${printArguments(directive.arguments)}`))

const printValue = (value: Ast.Value): string => {
  switch (value._tag) {
    case "Variable":
      return `$${value.name.value}`
    case "IntValue":
    case "FloatValue":
    case "EnumValue":
      return value.value
    case "StringValue":
      return printString(value.value)
    case "BooleanValue":
      return value.value ? "true" : "false"
    case "NullValue":
      return "null"
    case "ListValue":
      return `[${concatAll(value.values.map(printValue))}]`
    case "ObjectValue":
      return `{${concatAll(value.fields.map((field) => `${field.name.value}:${printValue(field.value)}`))}}`
  }
}

const escapes: ReadonlyMap<string, string> = new Map([
  ["\"", "\\\""],
  ["\\", "\\\\"],
  ["\b", "\\b"],
  ["\f", "\\f"],
  ["\n", "\\n"],
  ["\r", "\\r"],
  ["\t", "\\t"]
])

/** Prints a string value as a regular GraphQL string literal. */
const printString = (value: string): string => {
  let out = "\""
  for (let i = 0; i < value.length; i++) {
    const char = value[i]!
    const code = value.charCodeAt(i)
    out += escapes.get(char) ??
      (code < 0x0020 || code === 0x007f ? `\\u${code.toString(16).toUpperCase().padStart(4, "0")}` : char)
  }
  return out + "\""
}
