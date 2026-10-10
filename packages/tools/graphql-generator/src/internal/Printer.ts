/**
 * Compact printer for executable documents. There is no SDL printer.
 *
 * Output rules, pinned by `test/Printer.test.ts` and the conformance cases:
 * - Definitions are printed in the order given, with no trailing newline.
 * - The output is token-minimal: no ignored tokens at all, except a single
 *   space where two adjacent non-punctuator tokens (names, keywords, numbers,
 *   strings) would otherwise merge. The punctuators are
 *   `! $ & ( ) ... : = @ [ ] { | }`, so `f(a:[]b:{})`, `[1 -2]` and `a...F`.
 * - Descriptions on operations, fragments and variable definitions are not
 *   printed; they carry no execution meaning and servers on the 2021 grammar
 *   reject them.
 * - A `query` operation with no name, variables or directives prints in the
 *   `{ ... }` shorthand, whether or not it had a description.
 * - Every string prints as a regular (non-block) string. `"` and `\` are
 *   escaped, control characters U+0000 to U+001F use `\b \f \n \r \t` or
 *   `\u00XX` with upper-case hex, U+007F prints as `\u007F`, and everything
 *   else is written as-is.
 * - `IntValue` and `FloatValue` print their source text unchanged.
 *
 * @internal
 */
import type * as Ast from "./Ast.ts"

/**
 * Prints an executable document compactly. Throws on type-system definitions
 * and extensions, which are outside the contract.
 */
export const print = (document: Ast.Document): string => {
  let out = ""
  for (const definition of document.definitions) {
    out = concat(out, printDefinition(definition))
  }
  return out
}

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

/** Prints a string value as a regular GraphQL string literal. */
export const printString = (value: string): string => {
  let out = "\""
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    switch (code) {
      case 0x0022:
        out += "\\\""
        break
      case 0x005c:
        out += "\\\\"
        break
      case 0x0008:
        out += "\\b"
        break
      case 0x000c:
        out += "\\f"
        break
      case 0x000a:
        out += "\\n"
        break
      case 0x000d:
        out += "\\r"
        break
      case 0x0009:
        out += "\\t"
        break
      default:
        out += code < 0x0020 || code === 0x007f
          ? `\\u${code.toString(16).toUpperCase().padStart(4, "0")}`
          : value[i]
    }
  }
  return out + "\""
}
