/**
 * Ported from { @link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/05766ab10a4987e93fdee7627f9fe9e7bc6d1a65/types/json-schema/index.d.ts|@types/json-schema v7.0.9999 }.
 */

// ==================================================================================================
// JSON Schema Draft 07
// ==================================================================================================
// https://tools.ietf.org/html/draft-handrews-json-schema-validation-01
// --------------------------------------------------------------------------------------------------

/**
 * Primitive type
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1.1
 */
type JSONSchema7TypeName =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null"

/**
 * Primitive type
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1.1
 */
type JSONSchema7Type =
  | string
  | number
  | boolean
  | JSONSchema7Object
  | JSONSchema7Array
  | null

// Workaround for infinite type recursion
interface JSONSchema7Object {
  [key: string]: JSONSchema7Type
}

// Workaround for infinite type recursion
// https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
interface JSONSchema7Array extends Array<JSONSchema7Type> {
}

/**
 * Meta schema
 *
 * Recommended values:
 * - 'http://json-schema.org/schema#'
 * - 'http://json-schema.org/hyper-schema#'
 * - 'http://json-schema.org/draft-07/schema#'
 * - 'http://json-schema.org/draft-07/hyper-schema#'
 *
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-5
 */
type JSONSchema7Version =
  | {} & string
  | "http://json-schema.org/draft-07/schema#"
  | "http://json-schema.org/draft-07/hyper-schema#"

type JSONSchema7Core = {
  /**
   * The `$schema` keyword is both used as a JSON Schema feature set identifier and as the identifier of a resource which is itself a JSON Schema, which describes the set of valid schemas written for this particular feature set.
   *
   * The value of this keyword MUST be a URI {@link https://datatracker.ietf.org/doc/html/rfc3986 RFC 3986} (containing a scheme) and this URI MUST be normalized.
   * The current schema MUST be valid against the meta-schema identified by this URI.
   *
   * If this URI identifies a retrievable resource, that resource SHOULD be of media type `"application/schema+json"`.
   *
   * The `$schema` keyword SHOULD be used in a resource root schema.
   * It MUST NOT appear in resource subschemas.
   * If absent from the root schema, the resulting behavior is implementation-defined.
   *
   * If multiple schema resources are present in a single document, then all schema resources SHOULD Have the same value for `$schema`.
   * The result of differing values for "$schema" within the same schema document is implementation-defined.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-02#section-8.1.1
   */
  $schema?: undefined | JSONSchema7Version

  /**
   * The `$id` keyword identifies a schema resource with its canonical {@link https://datatracker.ietf.org/doc/html/rfc6596 RFC 6596} URI.
   *
   * Note that this URI is an identifier and not necessarily a network locator.
   * In the case of a network-addressable URL, a schema need not be downloadable from its canonical URI.
   *
   * If present, the value for this keyword MUST be a string, and MUST represent a valid URI-reference {@link https://datatracker.ietf.org/doc/html/rfc3986 RFC 3986}.
   * This URI-reference SHOULD be normalized, and MUST resolve to an absolute-URI [RFC 3986] (without a fragment).
   * Therefore, `$id` MUST NOT contain a non-empty fragment, and SHOULD NOT contain an empty fragment.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-02#section-8.2.2
   */
  $id?: undefined | string

  /**
   * The `$ref` keyword is an applicator that is used to reference a statically identified schema.
   * Its results are the results of the referenced schema.
   *
   * The value of the `$ref` property MUST be a string which is a URI-Reference.
   * Resolved against the current URI base, it produces the URI of the schema to apply.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-02#section-8.2.4.1
   */
  $ref?: string | undefined

  /**
   * This keyword reserves a location for comments from schema authors to readers or maintainers of the schema.
   *
   * The value of this keyword MUST be a string.
   * Implementations MUST NOT present this string to end users.
   * Tools for editing schemas SHOULD support displaying and editing this keyword.
   * The value of this keyword MAY be used in debug or error output which is intended for developers making use of schemas.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-02#section-8.3
   */
  $comment?: undefined | string

  /**
   * The `$defs` keyword reserves a location for schema authors to inline re-usable JSON Schemas into a more general schema.
   * The keyword does not directly affect the validation result.
   *
   * This keyword's value MUST be an object. Each member value of this object MUST be a valid JSON Schema.
   *
   * @example
   * ```json
   * {
   *   "type": "array",
   *   "items": { "$ref": "#/$defs/positiveInteger" },
   *   "$defs": {
   *     "positiveInteger": {
   *       "type": "integer",
   *       "exclusiveMinimum": 0
   *     }
   *   }
   * }
   * ```
   * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-8.2.4
   * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#appendix-A
   */
  $defs?:
    | undefined
    | Record<string, JSONSchema7Definition>
}

/**
 * # 6.1 Validation Keywords for Any Instance Type
 *
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1
 */
type JSONSchema7ValidationAny = {
  /**
   * The value of this keyword MUST be either a string or an array.
   * If it is an array, elements of the array MUST be strings and MUST be unique.
   * String values MUST be one of the six primitive types (`"null"`, `"boolean"`, `"object"`, `"array"`, `"number"`, or `"string"`), or `"integer"` which matches any number with a zero fractional part.
   *
   * An instance validates if and only if the instance is in any of the sets listed for this keyword.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.1.1 6.1.1 type
   */
  type?: undefined | JSONSchema7TypeName | Array<JSONSchema7TypeName>

  /**
   * The value of this keyword MUST be an array. This array SHOULD have at least one element. Elements in the array SHOULD be unique.
   *
   * An instance validates successfully against this keyword if its value is equal to one of the elements in this keyword's array value.
   *
   * Elements in the array might be of any value, including null.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.1.2| 6.1.2. enum
   */
  enum?: undefined | Array<JSONSchema7Type>

  /**
   * The value of this keyword MAY be of any type, including null.
   *
   * An instance validates successfully against this keyword if its value is equal to the value of the keyword.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.1.3 6.1.3. const
   */
  const?: undefined | JSONSchema7Type
}

/**
 * # 6.2. Validation Keywords for Numeric Instances (number and integer)
 *
 * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.2
 */
type JSONSchema7ValidationNumeric = {
  type?: undefined | Extract<JSONSchema7TypeName, "integer" | "number">

  /**
   * The value of `multipleOf` MUST be a number, strictly greater than 0.
   *
   * A numeric instance is valid only if division by this keyword's value results in an integer.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.2.1 6.2.1. multipleOf
   */
  multipleOf?: undefined | number

  /**
   * The value of `maximum` MUST be a number, representing an inclusive upper limit for a numeric instance.
   *
   * If the instance is a number, then this keyword validates only if the instance is less than or exactly equal to `maximum`.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.2.2 6.2.2. maximum
   */
  maximum?: undefined | number

  /**
   * The value of `exclusiveMaximum` MUST be number, representing an exclusive upper limit for a numeric instance.
   *
   * If the instance is a number, then the instance is valid only if it has a value strictly less than (not equal to) `exclusiveMaximum`.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.2.3 6.2.3. exclusiveMaximum
   */
  exclusiveMaximum?: undefined | number

  /**
   * The value of `minimum` MUST be a number, representing an inclusive lower limit for a numeric instance.
   *
   * If the instance is a number, then this keyword validates only if the instance is greater than or exactly equal to `minimum`.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.2.4 6.2.4. minimum
   */
  minimum?: undefined | number

  /**
   * The value of `exclusiveMinimum` MUST be number, representing an exclusive lower limit for a numeric instance.
   *
   * If the instance is a number, then the instance is valid only if it has a value strictly greater than (not equal to) `exclusiveMinimum`.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.2.5 6.2.5. exclusiveMinimum
   */
  exclusiveMinimum?: undefined | number
}

/**
 * # 6.3. Validation Keywords for Strings
 *
 * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.3
 */
type JSONSchema7ValidationString = {
  type?: undefined | Extract<JSONSchema7TypeName, "string">

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * A string instance is valid against this keyword if its length is less than, or equal to, the value of this keyword.
   *
   * The length of a string instance is defined as the number of its characters as defined by {@link https://datatracker.ietf.org/doc/html/rfc7159 RFC 7159}.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.3.1 6.3.1. maxLength
   */
  maxLength?: undefined | number

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * A string instance is valid against this keyword if its length is greater than, or equal to, the value of this keyword.
   *
   * The length of a string instance is defined as the number of its characters as defined by {@link https://datatracker.ietf.org/doc/html/rfc7159 RFC 7159}.
   *
   * Omitting this keyword has the same behavior as a value of 0.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.3.2 6.3.2. minLength
   */
  minLength?: undefined | number

  /**
   * The value of this keyword MUST be a string.
   * This string SHOULD be a valid regular expression, according to the ECMA 262 regular expression dialect.
   *
   * A string instance is considered valid if the regular expression matches the instance successfully.
   * Recall: regular expressions are not implicitly anchored.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.3.3 6.3.3. pattern
   */
  pattern?: undefined | string

  format?:
    | undefined
    | {} & string // this enables, as by specs, user-defined formats
    | `${JSONSchema7SemanticValidationWithFormat}`
}

/**
 * # 6.4. Validation Keywords for Arrays
 *
 * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.4
 */
type JSONSchema7ValidationArray = {
  type?: undefined | Extract<JSONSchema7TypeName, "array">

  /**
   * The value of `items` MUST be either a valid JSON Schema or an array of valid JSON Schemas.
   *
   * This keyword determines how child instances validate for arrays, and does not directly validate the immediate instance itself.
   *
   * If `items` is a schema, validation succeeds if all elements in the array successfully validate against that schema.
   *
   * If `items` is an array of schemas, validation succeeds if each element of the instance validates against the schema at the same position, if any.
   *
   * Omitting this keyword has the same behavior as an empty schema.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.4.1 6.4.1. items
   */
  items?: undefined | JSONSchema7Definition | Array<JSONSchema7Definition>

  /**
   * The value of `additionalItems` MUST be a valid JSON Schema.
   *
   * This keyword determines how child instances validate for arrays, and does not directly validate the immediate instance itself.
   *
   * If "items" is an array of schemas, validation succeeds if every instance element at a position greater than the size of "items" validates against "additionalItems".
   *
   * Otherwise, `additionalItems` MUST be ignored, as the "items" schema (possibly the default value of an empty schema) is applied to all elements.
   *
   * Omitting this keyword has the same behavior as an empty schema.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.4.2 6.4.2. additionalItems
   */
  additionalItems?: undefined | JSONSchema7Definition

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An array instance is valid against "maxItems" if its size is less than, or equal to, the value of this keyword.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.4.3 6.4.3. maxItems
   */
  maxItems?: undefined | number

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An array instance is valid against `minItems` if its size is greater than, or equal to, the value of this keyword.
   *
   * Omitting this keyword has the same behavior as a value of 0.
   *
   * @default 0
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.4.4 6.4.4. minItems
   */
  minItems?: undefined | number

  /**
   * The value of this keyword MUST be a boolean.
   *
   * If this keyword has boolean value false, the instance validates successfully.
   * If it has boolean value true, the instance validates successfully if all of its elements are unique.
   *
   * Omitting this keyword has the same behavior as a value of false.
   *
   * @default false
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.4.5 6.4.5. uniqueItems
   */
  uniqueItems?: undefined | boolean

  /**
   * The value of this keyword MUST be a valid JSON Schema.
   *
   * An array instance is valid against `contains` if at least one of its elements is valid against the given schema.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.4.6 6.4.6. contains
   */
  contains?: undefined | JSONSchema7Definition
}

/**
 * # 6.5. Validation Keywords for Objects
 *
 * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5
 */
type JSONSchema7ValidationObject = {
  type?: undefined | Extract<JSONSchema7TypeName, "object">

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An object instance is valid against "maxProperties" if its number of properties is less than, or equal to, the value of this keyword.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.1 6.5.1. maxProperties
   */
  maxProperties?: undefined | number

  /**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An object instance is valid against `minProperties` if its number of properties is greater than, or equal to, the value of this keyword.
   *
   * Omitting this keyword has the same behavior as a value of 0.
   *
   * @default 0
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.2 6.5.2. minProperties
   */
  minProperties?: undefined | number

  /**
   * The value of this keyword MUST be an array. Elements of this array, if any, MUST be strings, and MUST be unique.
   *
   * An object instance is valid against this keyword if every item in the array is the name of a property in the instance.
   *
   * Omitting this keyword has the same behavior as an empty array.
   *
   * @default []
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.3 6.5.3. required
   */
  required?: undefined | Array<string>

  /**
   * The value of `properties` MUST be an object. Each value of this object MUST be a valid JSON Schema.
   *
   * This keyword determines how child instances validate for objects, and does not directly validate the immediate instance itself.
   *
   * Validation succeeds if, for each name that appears in both the instance and as a name within this keyword's value, the child instance for that name successfully validates against the corresponding schema.
   *
   * Omitting this keyword has the same behavior as an empty object.
   *
   * @default {}
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.4 6.5.4. properties
   */
  properties?:
    | undefined
    | Record<string, JSONSchema7Definition>

  /**
   * The value of `patternProperties` MUST be an object.
   * Each property name of this object SHOULD be a valid regular expression, according to the ECMA 262 regular expression dialect.
   * Each property value of this object MUST be a valid JSON Schema.
   *
   * This keyword determines how child instances validate for objects, and does not directly validate the immediate instance itself.
   * Validation of the primitive instance type against this keyword always succeeds.
   *
   * Validation succeeds if, for each instance name that matches any regular expressions that appear as a property name in this keyword's value, the child instance for that name successfully validates against each schema that corresponds to a matching regular expression.
   *
   * Omitting this keyword has the same behavior as an empty object.
   *
   * @default {}
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.5 6.5.5. patternProperties
   */
  patternProperties?:
    | undefined
    | Record<string, JSONSchema7Definition>

  /**
   * The value of `additionalProperties` MUST be a valid JSON Schema.
   *
   * This keyword determines how child instances validate for objects, and does not directly validate the immediate instance itself.
   *
   * Validation with `additionalProperties` applies only to the child values of instance names that do not match any names in {@link JSONSchema7ValidationObject.properties|properties }, and do not match any regular expression in {@link JSONSchema7ValidationObject.patternProperties|patternProperties }.
   *
   * For all such properties, validation succeeds if the child instance validates against the `additionalProperties` schema.
   *
   * Omitting this keyword has the same behavior as an empty schema.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.6 6.5.6. additionalProperties
   */
  additionalProperties?: undefined | JSONSchema7Definition

  /**
   * This keyword specifies rules that are evaluated if the instance is an object and contains a certain property.
   *
   * This keyword's value MUST be an object. Each property specifies a dependency. Each dependency value MUST be an array or a valid JSON Schema.
   *
   * If the dependency value is a subschema, and the dependency key is a property in the instance, the entire instance must validate against the dependency value.
   *
   * If the dependency value is an array, each element in the array, if any, MUST be a `string`, and MUST be unique.
   * If the dependency key is a property in the instance, each of the items in the dependency value must be a property that exists in the instance.
   *
   * Omitting this keyword has the same behavior as an empty object.
   *
   * @default {}
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.7 6.5.7. dependencies
   */
  dependencies?:
    | undefined
    | Record<string, JSONSchema7Definition | Array<string>>

  /**
   * The value of "propertyNames" MUST be a valid JSON Schema.
   *
   * If the instance is an object, this keyword validates if every property name in the instance validates against the provided schema.
   * Note the property name that the schema is testing will always be a string.
   *
   * Omitting this keyword has the same behavior as an empty schema.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.8 6.5.8. propertyNames
   */
  propertyNames?: undefined | JSONSchema7Definition
}

/**
 * # 6.6. Keywords for Applying Subschemas Conditionally
 *
 * These keywords work together to implement conditional application of a subschema based on the outcome of another subschema.
 *
 * These keywords **MUST NOT** interact with each other across subschema boundaries.
 * In other words, an {@link JSONSchema7ValidationConditional.if|`if`} in one branch of an {@link JSONSchema7ValidationConditional.allOf|`allOf`} **MUST NOT** have an impact on a {@link JSONSchema7ValidationConditional.then|`then`} or {@link JSONSchema7ValidationConditional.else|`else`} in another branch.
 *
 * There is no default behavior for any of these keywords when they are not present.
 * In particular, they **MUST NOT** be treated as if present with an empty schema, and when `if` is not present, both `then` and `else` **MUST** be entirely ignored.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.6
 */
type JSONSchema7ValidationConditional = {
  /**
   * This keyword's value MUST be a valid JSON Schema.
   *
   * This validation outcome of this keyword's subschema has no direct effect on the overall validation result.
   * Rather, it controls which of the `then` or `else` keywords are evaluated.
   *
   * Instances that successfully validate against this keyword's subschema MUST also be valid against the subschema value of the `then` keyword, if present.
   *
   * Instances that fail to validate against this keyword's subschema MUST also be valid against the subschema value of the `else` keyword, if present.
   *
   * If annotations (Section 3.3) are being collected, they are collected from this keyword's subschema in the usual way, including when the keyword is present without either `then` or `else`.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.6.1 6.6.1. if
   */
  if?: undefined | JSONSchema7Definition

  /**
   * This keyword's value MUST be a valid JSON Schema.
   *
   * When `if` is present, and the instance successfully validates against its subschema, then valiation succeeds against this keyword if the instance also successfully validates against this keyword's subschema.
   *
   * This keyword has no effect when `if` is absent, or when the instance fails to validate against its subschema.
   * Implementations MUST NOT evaluate the instance against this keyword, for either validation or annotation collection purposes, in such cases.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.6.2 6.6.2. then
   */
  then?: undefined | JSONSchema7Definition

  /**
   * This keyword's value MUST be a valid JSON Schema.
   *
   * When `if` is present, and the instance fails to validate against its subschema, then valiation succeeds against this keyword if the instance successfully validates against this keyword's subschema.
   *
   * This keyword has no effect when `if` is absent, or when the instance successfully validates against its subschema.
   * Implementations MUST NOT evaluate the instance against this keyword, for either validation or annotation collection purposes, in such cases.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.6.3 6.6.3. else
   */
  else?: undefined | JSONSchema7Definition
}

/**
 * # 6.7. Keywords for Applying Subschemas With Boolean Logic
 *
 * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.7
 */
type JSONSchema7ValidationLogic = {
  /**
   * This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.
   *
   * An instance validates successfully against this keyword if it validates successfully against all schemas defined by this keyword's value.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.7.1 6.7.1. allOf
   */
  allOf?: undefined | Array<JSONSchema7Definition>

  /**
   * This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.
   *
   * An instance validates successfully against this keyword if it validates successfully against at least one schema defined by this keyword's value.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.7.2 6.7.2. anyOf
   */
  anyOf?: undefined | Array<JSONSchema7Definition>

  /**
   * This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.
   *
   * An instance validates successfully against this keyword if it validates successfully against exactly one schema defined by this keyword's value.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.7.3 6.7.3. oneOf
   */
  oneOf?: undefined | Array<JSONSchema7Definition>

  /**
   * This keyword's value MUST be a valid JSON Schema.
   *
   * An instance is valid against this keyword if it fails to validate successfully against the schema defined by this keyword.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.7.4 6.7.4. not
   */
  not?: undefined | JSONSchema7Definition
}

/**
 * # 7. Semantic Validation With "format"
 *
 * Structural validation alone may be insufficient to validate that an instance meets all the requirements of an application.
 * The `format` keyword is defined to allow interoperable semantic validation for a fixed subset of values which are accurately described by authoritative resources, be they RFCs or other external specifications.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-7
 */
enum JSONSchema7SemanticValidationWithFormat {
  /**
   * ## 7.3.1. DateTimes
   * Dates and times are represented {@link https://datatracker.ietf.org/doc/html/rfc3339#appendix-A | in RFC 3339, section 5.6 }.
   * This is a subset of the date format also commonly known as ISO8601 format.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-7.3.1 7.3.1. date-time
   */

  /**
   * A string instance is valid against this attribute if it is a valid representation according to the `date-time` production.
   *
   * @example
   * '2018-11-13T20:20:39+00:00'
   */
  dateTime = "date-time",

  /**
   * A string instance is valid against this attribute if it is a valid representation according to the `full-date` production.
   *
   * @example
   * '2018-11-13'
   */
  date = "date",

  /**
   * A string instance is valid against this attribute if it is a valid representation according to the `full-time` production.
   *
   * @example
   * '20:20:39+00:00'
   */
  time = "time",

  /**
   * ## 7.3.2. Email Addresses
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-7.3.2
   */

  /**
   * Internet email address, see {@link http://tools.ietf.org/html/rfc5321#section-4.1.2|RFC 5321, section 4.1.2}.
   */
  email = "email",

  /**
   * The internationalized form of an Internet email address, see {@link https://tools.ietf.org/html/rfc6531|RFC 6531}.
   */
  idnEmail = "idn-email",

  /**
   * ## 7.3.3. Hostnames
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-7.3.3
   */

  /**
   * Internet host name as defined by {@link https://datatracker.ietf.org/doc/html/rfc1034#section-3.1 RFC 1034, section 3.1}, including host names produced using the Punycode algorithm specified in {@link https://datatracker.ietf.org/doc/html/rfc5891#section-4.4 RFC 5891, section 4.4}.
   */
  hostname = "hostname",

  /**
   * As defined by either {@link https://datatracker.ietf.org/doc/html/rfc1034 RFC 1034} as for hostname, or an internationalized hostname as defined by {@link https://datatracker.ietf.org/doc/html/rfc5890#section-2.3.2.3 RFC 5890, section 2.3.2.3}.
   */
  idnHostname = "idn-hostname",

  /**
   * ## 7.3.4. IP Addresses
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-7.3.4
   */

  /**
   * An IPv4 address according to the "dotted-quad" ABNF syntax as defined in {@link https://datatracker.ietf.org/doc/html/rfc2673#section-3.2 RFC 2673, section 3.2}.
   */
  ipv4 = "ipv4",

  /**
   * An IPv6 address as defined in {@link https://datatracker.ietf.org/doc/html/rfc4291#section-2.2 RFC 4291, section 2.2}.
   */
  ipv6 = "ipv6",

  /**
   * ## 7.3.5.  Resource Identifiers
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-7.3.5
   */

  /**
   * A string instance is valid against this attribute if it is a valid URI, according to {@link https://datatracker.ietf.org/doc/html/rfc3986 RFC 3986}.
   */
  uri = "uri",

  /**
   * A string instance is valid against this attribute if it is a valid URI Reference (either a URI or a relative-reference), according to {@link https://datatracker.ietf.org/doc/html/rfc3986 RFC 3986}.
   */
  uriReference = "uri-reference",

  /**
   * A string instance is valid against this attribute if it is a valid IRI, according to {@link https://datatracker.ietf.org/doc/html/rfc3987 RFC 3987}.
   */
  iri = "iri",

  /**
   *  A string instance is valid against this attribute if it is a valid IRI Reference (either an IRI or a relative-reference), according to {@link https://datatracker.ietf.org/doc/html/rfc3987 RFC 3987}.
   */
  iriReference = "iri-reference",

  /**
   * ## URItemplate
   */

  /**
   * ## 7.3.6. uri-template
   *
   * A string instance is valid against this attribute if it is a valid URI Template (of any level), according to {@link https://datatracker.ietf.org/doc/html/rfc6570 RFC 6570}.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-7.3.6 7.3.6. uri-template
   */
  uriTemplate = "uri-template",

  /**
   * ## 7.3.7. JSON Pointers
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-7.3.7
   */

  /**
   * A string instance is valid against this attribute if it is a valid JSON string representation of a JSON Pointer, according to {@link https://datatracker.ietf.org/doc/html/rfc6901#section-5 RFC 6901, section 5}.
   */
  jsonPointer = "json-pointer",

  /**
   * A string instance is valid against this attribute if it is a valid Relative JSON Pointer {@link https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#ref-relative-json-pointer relative-json-pointer}.
   */
  relativeJsonPointer = "relative-json-pointer",

  /**
   * ## 7.3.8 regex
   *
   * A regular expression, which should be valid according to the {@link https://www.ecma-international.org/publications-and-standards/standards/ecma-262/|ECMA 262 dialect}.
   */
  regex = "regex"
}

/**
 * # 8. String-Encoding Non-JSON Data
 *
 * Properties defined in this section indicate that an instance contains non-JSON data encoded in a JSON string.
 * They describe the type of content and how it is encoded.
 */

type JSONSchema7StringEncodingNonJSONData = {
  /**
   * If the instance value is a string, this property defines that the string SHOULD be interpreted as binary data and decoded using the encoding named by this property.
   * {@link https://datatracker.ietf.org/doc/html/rfc2045 RFC 2045, Sec 6.1} lists the possible values for this property.
   *
   * The value of this property MUST be a string.
   *
   * The value of this property SHOULD be ignored if the instance described is not a string.
   *
   * @example
   * ```json
   * {
   *     "type": "string",
   *     "contentEncoding": "base64",
   *     "contentMediaType": "image/png"
   * }
   * ```
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-8.3 8.3. contentEncoding
   */
  contentEncoding?: undefined | string

  /**
   * The value of this property must be a media type, as defined by {@link https://datatracker.ietf.org/doc/html/rfc2046 RFC 2046}.
   * This property defines the media type of instances which this schema defines.
   *
   * The value of this property MUST be a string.
   *
   * The value of this property SHOULD be ignored if the instance described is not a string.
   *
   * If the `contentEncoding` property is not present, but the instance value is a string, then the value of this property SHOULD specify a text document type, and the character set SHOULD be the character set into which the JSON string value was decoded (for which the default is Unicode).
   *
   * @example
   * ```json
   * {
   *   "type": "string",
   *   "contentMediaType": "text/html"
   * }
   * ```
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-8.4 8.4. contentMediaType
   */
  contentMediaType?: undefined | string
}

/**
 * # 9.  Schema Re-Use With "definitions"
 *
 * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-9
 */
type JSONSchema7SchemaReuseWithDefinitions = {
  /**
   * The "definitions" keywords provides a standardized location for schema authors to inline re-usable JSON Schemas into a more general schema.
   * The keyword does not directly affect the validation result.
   *
   * This keyword's value MUST be an object. Each member value of this object MUST be a valid JSON Schema.
   *
   * As an example, here is a schema describing an array of positive integers, where the positive integer constraint is a subschema in `definitions`:
   * @example
   * ```json
   * {
   *   "type": "array",
   *   "items": { "$ref": "#/definitions/positiveInteger" },
   *   "definitions": {
   *     "positiveInteger": {
   *       "type": "integer",
   *       "exclusiveMinimum": 0
   *     }
   *   }
   * }
   * ```
   */
  definitions?:
    | undefined
    | Record<string, JSONSchema7Definition>
}

/**
 * # 10. Schema Annotations
 *
 * Schema validation is a useful mechanism for annotating instance data with additional information.
 * The rules for determining when and how annotations are associated with an instance are outlined in section 3.3.
 *
 * These general-purpose annotation keywords provide commonly used information for documentation and user interface display purposes.
 * They are not intended to form a comprehensive set of features.
 * Rather, additional vocabularies can be defined for more complex annotation-based applications.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-10
 */
type JSONSchema7SchemaAnnotations = {
  /**
   * The value of this keyword MUST be a string.
   *
   * Can be used to decorate a user interface with information about the data produced by this user interface.
   * A title will preferably be short.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-10.1 10.1. title
   */
  title?: undefined | string

  /**
   * The value of this keyword MUST be a string.
   *
   * Can be used to decorate a user interface with information about the data produced by this user interface.
   * A description will provide explanation about the purpose of the instance described by this schema.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-10.1 10.1. title
   */
  description?: undefined | string

  /**
   * There are no restrictions placed on the value of this keyword.
   * When multiple occurrences of this keyword are applicable to a single sub-instance, implementations SHOULD remove duplicates.
   *
   * This keyword can be used to supply a default JSON value associated with a particular schema.
   * It is RECOMMENDED that a default value be valid against the associated schema.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-10.2 10.2. default
   */
  default?: undefined | JSONSchema7Type

  /**
   * The value of this keyword MUST be a `boolean`.
   * When multiple occurrences of these keywords are applicable to a single sub-instance, the resulting value MUST be true if any occurrence specifies a true value, and MUST be false otherwise.
   *
   * If `readOnly` has a value of boolean true, it indicates that the value of the instance is managed exclusively by the owning authority, and attempts by an application to modify the value of this property are expected to be ignored or rejected by that owning authority.
   *
   * An instance document that is marked as `readOnly` for the entire document MAY be ignored if sent to the owning authority, or MAY result in an error, at the authority's discretion.
   *
   * For example, `readOnly` would be used to mark a database-generated serial number as read-only, while `writeOnly` would be used to mark a password input field.
   *
   * These keywords can be used to assist in user interface instance generation.
   * In particular, an application MAY choose to use a widget that hides input values as they are typed for write-only fields.
   *
   * Omitting these keywords has the same behavior as values of `false`.
   *
   * @default false
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-10.3 10.3. readOnly and writeOnly
   */
  readOnly?: undefined | boolean

  /**
   * The value of this keyword MUST be a `boolean`.
   * When multiple occurrences of these keywords are applicable to a single sub-instance, the resulting value MUST be true if any occurrence specifies a true value, and MUST be false otherwise.
   *
   * If `writeOnly` has a value of boolean true, it indicates that the value is never present when the instance is retrieved from the owning authority.
   * It can be present when sent to the owning authority to update or create the document (or the resource it represents), but it will not be included in any updated or newly created version of the instance.
   *
   * An instance document that is marked as `writeOnly` for the entire document MAY be returned as a blank document of some sort, or MAY produce an error upon retrieval, or have the retrieval request ignored, at the authority's discretion.
   *
   * For example, `readOnly` would be used to mark a database-generated serial number as read-only, while `writeOnly` would be used to mark a password input field.
   *
   * These keywords can be used to assist in user interface instance generation.
   * In particular, an application MAY choose to use a widget that hides input values as they are typed for write-only fields.
   *
   * Omitting these keywords has the same behavior as values of `false`.
   *
   * @default false
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-10.3 10.3. readOnly and writeOnly
   */
  writeOnly?: undefined | boolean

  /**
   * The value of this keyword MUST be an array.
   * There are no restrictions placed on the values within the array.
   * When multiple occurrences of this keyword are applicable to a single sub-instance, implementations MUST provide a flat array of all values rather than an array of arrays.
   *
   * This keyword can be used to provide sample JSON values associated with a particular schema, for the purpose of illustrating usage.
   * It is RECOMMENDED that these values be valid against the associated schema.
   *
   * Implementations MAY use the value(s) of {@link JSONSchema7SchemaAnnotations.default|`default`}, if present, as an additional example.
   * If `examples` is absent, `default` MAY still be used in this manner.
   *
   * @see https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-10.4 10.4. examples
   */
  examples?: undefined | JSONSchema7Type
}

export interface JSONSchema7
  extends
    JSONSchema7Core,
    JSONSchema7ValidationAny,
    JSONSchema7ValidationNumeric,
    JSONSchema7ValidationString,
    JSONSchema7ValidationArray,
    JSONSchema7ValidationObject,
    JSONSchema7ValidationConditional,
    JSONSchema7ValidationLogic,
    JSONSchema7StringEncodingNonJSONData,
    JSONSchema7SchemaReuseWithDefinitions,
    JSONSchema7SchemaAnnotations
{}

/**
 * JSON Schema v7
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01
 */
type JSONSchema7Definition = JSONSchema7 | boolean
