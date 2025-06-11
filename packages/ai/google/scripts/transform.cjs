// transform_no_ts_morph.js
const fs = require("fs")

const filePath = process.argv[2]

// The ENTIRE new code block, including schemaFields, SchemaEncoded, and the new Schema class.
const newCodeBlock = `
const schemaFields = {
  /**
   * Optional. Maximum value of the Type.INTEGER and Type.NUMBER
   */
  "maximum": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. Minimum number of the properties for Type.OBJECT.
   */
  "minProperties": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. Data type.
   */
  "type": Type,
  /**
   * Optional. A brief description of the parameter. This could contain examples of use.
   * Parameter description may be formatted as Markdown.
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Maximum number of the elements for Type.ARRAY.
   */
  "maxItems": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. The order of the properties.
   * Not a standard field in open api spec. Used to determine the order of the
   * properties in the response.
   */
  "propertyOrdering": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Optional. The format of the data. This is used only for primitive datatypes.
   * Supported formats:
   *  for NUMBER type: float, double
   *  for INTEGER type: int32, int64
   *  for STRING type: enum, date-time
   */
  "format": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Maximum length of the Type.STRING
   */
  "maxLength": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. The title of the schema.
   */
  "title": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. SCHEMA FIELDS FOR TYPE INTEGER and NUMBER
   * Minimum value of the Type.INTEGER and Type.NUMBER
   */
  "minimum": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. Maximum number of the properties for Type.OBJECT.
   */
  "maxProperties": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Possible values of the element of Type.STRING with enum format.
   * For example we can define an Enum Direction as :
   * {type:STRING, format:enum, enum:["EAST", NORTH", "SOUTH", "WEST"]}
   */
  "enum": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Optional. Required properties of Type.OBJECT.
   */
  "required": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Optional. Indicates if the value may be null.
   */
  "nullable": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Optional. Properties of Type.OBJECT.
   */
  "properties": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * Optional. Minimum number of the elements for Type.ARRAY.
   */
  "minItems": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. SCHEMA FIELDS FOR TYPE STRING
   * Minimum length of the Type.STRING
   */
  "minLength": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Pattern of the Type.STRING to restrict a string to a regular expression.
   */
  "pattern": S.optionalWith(S.String, { nullable: true })
}

/**
 * The \`Schema\` object allows the definition of input and output data types.
 * These types can be objects, but also primitives and arrays.
 * Represents a select subset of an [OpenAPI 3.0 schema
 * object](https://spec.openapis.org/oas/v3.0.3#schema).
 */
export interface SchemaEncoded extends S.Struct.Encoded<typeof schemaFields> {
  /**
   * Optional. The value should be validated against any (one or more) of the subschemas
   * in the list.
   */
  readonly "anyOf"?: ReadonlyArray<SchemaEncoded> | undefined | null
  /**
   * Optional. Schema of the elements of Type.ARRAY.
   */
  readonly "items"?: SchemaEncoded | undefined | null
}

/**
 * The \`Schema\` object allows the definition of input and output data types.
 * These types can be objects, but also primitives and arrays.
 * Represents a select subset of an [OpenAPI 3.0 schema
 * object](https://spec.openapis.org/oas/v3.0.3#schema).
 */
export class Schema extends S.Class<Schema>("Schema")({
  ...schemaFields,
  "anyOf": S.optionalWith(S.Array(S.suspend((): S.Schema<Schema, SchemaEncoded> => Schema)), { nullable: true }),
  /**
   * Optional. Schema of the elements of Type.ARRAY.
   */
  "items": S.optionalWith(S.suspend((): S.Schema<Schema, SchemaEncoded> => Schema), { nullable: true })
}) {}`

try {
  let fileContent = fs.readFileSync(filePath, "utf8")
  const lines = fileContent.split(/\r?\n/)

  let inSchemaBlock = false
  let braceLevel = 0 // Tracks braces within the S.Class({}) call
  let schemaClassStartLine = -1 // The line index of "export class Schema..."
  let schemaClassEndLine = -1 // The line index of the final "}) {}"

  // First pass: Identify the Schema class block
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.includes("export class Schema extends S.Class<Schema>(\"Schema\")({")) {
      inSchemaBlock = true
      schemaClassStartLine = i
      braceLevel++ // For the opening brace of the S.Class object
      continue
    }

    if (inSchemaBlock) {
      const openBraceCount = (line.match(/{/g) || []).length
      const closeBraceCount = (line.match(/}/g) || []).length
      braceLevel += openBraceCount - closeBraceCount

      if (braceLevel === 0) {
        schemaClassEndLine = i
        break // Found the end of the Schema class block
      }
    }
  }

  if (schemaClassStartLine === -1 || schemaClassEndLine === -1) {
    console.log(`'Schema' class not found or block structure is different in ${filePath}. No changes made.`)
    process.exit(0) // Exit gracefully
  }

  // Determine the start of the JSDoc *before* the Schema class, if any
  let jsDocStartToRemove = -1
  for (let i = schemaClassStartLine - 1; i >= 0; i--) {
    const line = lines[i].trim() // Trim for JSDoc detection

    if (line === "*/") {
      let tempDocStart = -1
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j].trim()
        if (prevLine === "/**") {
          tempDocStart = j
          break
        } else if (!prevLine.startsWith("*") && prevLine !== "") {
          // Found code/non-comment line before '/**', so this isn't contiguous JSDoc
          break
        }
      }
      if (tempDocStart !== -1) {
        jsDocStartToRemove = tempDocStart
      }
      // If we found a '*/', whether it leads to a full JSDoc or not,
      // we stop looking for *this* JSDoc.
      break
    } else if (line !== "") { // If we hit any non-blank line that's not '*/', there's no JSDoc directly above
      break
    }
  }

  // --- Build the new file content in parts ---
  let parts = []

  // 1. Content before the JSDoc/Schema class
  if (jsDocStartToRemove !== -1) {
    parts.push(lines.slice(0, jsDocStartToRemove).join("\n"))
  } else {
    parts.push(lines.slice(0, schemaClassStartLine).join("\n"))
  }

  // 2. The new code block (SchemaFields, SchemaEncoded, and new Schema class)
  parts.push(newCodeBlock)

  // 3. Content after the old Schema class
  parts.push(lines.slice(schemaClassEndLine + 1).join("\n"))

  // Join the parts with appropriate newlines
  let newFileContent = parts.filter((p) => p.trim() !== "").join("\n\n")

  // --- NOW, ADD ESLINT IGNORE COMMENT ---
  const transformedLines = newFileContent.split(/\r?\n/)
  const targetLineText = "  const decodeError ="
  let insertionIndex = -1

  for (let i = 0; i < transformedLines.length; i++) {
    if (transformedLines[i].includes(targetLineText)) {
      insertionIndex = i
      break
    }
  }

  if (insertionIndex !== -1) {
    // Insert the comment at the found index
    transformedLines.splice(insertionIndex, 0, "// eslint-disable-next-line @typescript-eslint/no-unused-vars") // trim() to remove the trailing \n for splice
    newFileContent = transformedLines.join("\n")
    console.log(`Inserted ESLint ignore comment above "${targetLineText.trim()}"`)
  } else {
    console.log(`Target line "${targetLineText.trim()}" not found for ESLint ignore comment. Skipping insertion.`)
  }

  fs.writeFileSync(filePath, newFileContent, "utf8")
  console.log(`Successfully transformed ${filePath}`)
} catch (error) {
  console.error(`Error transforming file ${filePath}:`, error)
}
