/**
 * The generator's schema model (EFF-1829 points 3 and 4). `SdlReader` and
 * `IntrospectionReader` both produce it, and the same schema read either way
 * gives equal models.
 *
 * Conventions:
 * - Names are plain strings; type references are `TypeRef` chains ending in a
 *   name. Nothing carries a source location.
 * - Optional values (`description`, `deprecationReason`, `defaultValue`,
 *   `specifiedBy`, a missing root type) are `undefined` when absent.
 * - Lists keep declaration order, with fields, values, members and interfaces
 *   added by `extend` appended in document order. The exception is
 *   `InterfaceType.possibleTypes`, which is sorted by name.
 * - `types` holds every schema type plus the five built-in scalars (`String`,
 *   `Int`, `Float`, `Boolean`, `ID`), which are always present and never carry
 *   a description. Introspection meta types (`__Schema`, `__Type`, ...) are
 *   left out.
 * - `directives` holds the schema's own directive definitions. The built-in
 *   `skip`, `include`, `deprecated`, `specifiedBy` and `oneOf` are left out.
 * - Applied directives are consumed, not kept: `@deprecated` becomes
 *   `deprecationReason` (`"No longer supported"` when it has no `reason`),
 *   `@specifiedBy` becomes `ScalarType.specifiedBy` and `@oneOf` becomes
 *   `InputObjectType.oneOf`. Every other applied directive is dropped, whether
 *   or not the schema defines it.
 * - Default values are parsed const values without locations.
 *
 * @internal
 */
import type * as Ast from "./Ast.ts"

export interface Schema {
  readonly queryType: string
  readonly mutationType: string | undefined
  readonly subscriptionType: string | undefined
  readonly types: ReadonlyMap<string, NamedType>
  readonly directives: ReadonlyMap<string, DirectiveDefinition>
}

export type NamedType = ScalarType | ObjectType | InterfaceType | UnionType | EnumType | InputObjectType

export interface ScalarType {
  readonly _tag: "ScalarType"
  readonly name: string
  readonly description: string | undefined
  /** The `@specifiedBy` URL, or introspection `specifiedByURL`. */
  readonly specifiedBy: string | undefined
}

export interface ObjectType {
  readonly _tag: "ObjectType"
  readonly name: string
  readonly description: string | undefined
  readonly interfaces: ReadonlyArray<string>
  readonly fields: ReadonlyArray<Field>
}

export interface InterfaceType {
  readonly _tag: "InterfaceType"
  readonly name: string
  readonly description: string | undefined
  readonly interfaces: ReadonlyArray<string>
  readonly fields: ReadonlyArray<Field>
  /** The object types implementing this interface, sorted by name. */
  readonly possibleTypes: ReadonlyArray<string>
}

export interface UnionType {
  readonly _tag: "UnionType"
  readonly name: string
  readonly description: string | undefined
  /** The member types in declaration order. */
  readonly possibleTypes: ReadonlyArray<string>
}

export interface EnumType {
  readonly _tag: "EnumType"
  readonly name: string
  readonly description: string | undefined
  readonly values: ReadonlyArray<EnumValueDefinition>
}

export interface InputObjectType {
  readonly _tag: "InputObjectType"
  readonly name: string
  readonly description: string | undefined
  readonly oneOf: boolean
  readonly fields: ReadonlyArray<InputValue>
}

export interface Field {
  readonly name: string
  readonly description: string | undefined
  readonly arguments: ReadonlyArray<InputValue>
  readonly type: TypeRef
  readonly deprecationReason: string | undefined
}

/** An argument, an input object field or a directive argument. */
export interface InputValue {
  readonly name: string
  readonly description: string | undefined
  readonly type: TypeRef
  readonly defaultValue: ConstValue | undefined
  readonly deprecationReason: string | undefined
}

export interface EnumValueDefinition {
  readonly name: string
  readonly description: string | undefined
  readonly deprecationReason: string | undefined
}

export interface DirectiveDefinition {
  readonly name: string
  readonly description: string | undefined
  readonly arguments: ReadonlyArray<InputValue>
  readonly repeatable: boolean
  /** Spec `DirectiveLocation` names in declaration order. */
  readonly locations: ReadonlyArray<string>
}

export type TypeRef = NamedTypeRef | ListTypeRef | NonNullTypeRef

export interface NamedTypeRef {
  readonly _tag: "NamedTypeRef"
  readonly name: string
}

export interface ListTypeRef {
  readonly _tag: "ListTypeRef"
  readonly ofType: TypeRef
}

export interface NonNullTypeRef {
  readonly _tag: "NonNullTypeRef"
  readonly ofType: NamedTypeRef | ListTypeRef
}

/**
 * A `Value[Const]` without locations. Tags and `value` encodings match the
 * parser's AST: numbers keep their source text, strings are decoded.
 */
export type ConstValue =
  | { readonly _tag: "IntValue"; readonly value: string }
  | { readonly _tag: "FloatValue"; readonly value: string }
  | { readonly _tag: "StringValue"; readonly value: string }
  | { readonly _tag: "BooleanValue"; readonly value: boolean }
  | { readonly _tag: "NullValue" }
  | { readonly _tag: "EnumValue"; readonly value: string }
  | { readonly _tag: "ListValue"; readonly values: ReadonlyArray<ConstValue> }
  | { readonly _tag: "ObjectValue"; readonly fields: ReadonlyArray<ConstObjectField> }

export interface ConstObjectField {
  readonly name: string
  readonly value: ConstValue
}

// -----------------------------------------------------------------------------
// Helpers shared by the readers and validation
// -----------------------------------------------------------------------------

/** The scalars every schema has, whether or not it declares them. */
export const builtInScalarNames: ReadonlyArray<string> = ["String", "Int", "Float", "Boolean", "ID"]

/** Directives the spec defines; they are consumed or ignored, never kept in `Schema.directives`. */
export const builtInDirectiveNames: ReadonlySet<string> = new Set([
  "skip",
  "include",
  "deprecated",
  "specifiedBy",
  "oneOf"
])

/** The reason `@deprecated` implies when it has none. */
export const defaultDeprecationReason = "No longer supported"

export const builtInScalar = (name: string): ScalarType => ({
  _tag: "ScalarType",
  name,
  description: undefined,
  specifiedBy: undefined
})

/** Drops locations from a parsed const value. */
export const fromAstConstValue = (value: Ast.ConstValue): ConstValue => {
  switch (value._tag) {
    case "IntValue":
    case "FloatValue":
    case "StringValue":
    case "EnumValue":
      return { _tag: value._tag, value: value.value }
    case "BooleanValue":
      return { _tag: "BooleanValue", value: value.value }
    case "NullValue":
      return { _tag: "NullValue" }
    case "ListValue":
      return { _tag: "ListValue", values: value.values.map(fromAstConstValue) }
    case "ObjectValue":
      return {
        _tag: "ObjectValue",
        fields: value.fields.map((field) => ({ name: field.name.value, value: fromAstConstValue(field.value) }))
      }
  }
}

export const fromAstType = (type: Ast.Type): TypeRef => {
  switch (type._tag) {
    case "NamedType":
      return { _tag: "NamedTypeRef", name: type.name.value }
    case "ListType":
      return { _tag: "ListTypeRef", ofType: fromAstType(type.type) }
    case "NonNullType":
      return { _tag: "NonNullTypeRef", ofType: fromAstType(type.type) as NamedTypeRef | ListTypeRef }
  }
}

/** The name at the bottom of a type reference. */
export const namedTypeOf = (type: TypeRef): string =>
  type._tag === "NamedTypeRef" ? type.name : namedTypeOf(type.ofType)

/** Prints a type reference in SDL form, e.g. `[Pet!]!`. */
export const printTypeRef = (type: TypeRef): string => {
  switch (type._tag) {
    case "NamedTypeRef":
      return type.name
    case "ListTypeRef":
      return `[${printTypeRef(type.ofType)}]`
    case "NonNullTypeRef":
      return `${printTypeRef(type.ofType)}!`
  }
}
