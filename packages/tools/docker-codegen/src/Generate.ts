/**
 * Renders the patched Docker Engine API document as Effect Schemas.
 *
 * Only `components.schemas` is generated; there are no operations. Every
 * definition becomes an exported Schema constant with its own JSDoc, by
 * registering one synthetic root that references all of them with
 * `JsonSchemaGenerator.generate` and dropping that root from the output.
 *
 * @since 4.0.7
 */
import * as JsonSchemaGenerator from "@effect/openapi-generator/JsonSchemaGenerator"
import type * as JsonSchema from "effect/JsonSchema"
import * as Predicate from "effect/Predicate"
import type { CodegenConfig } from "./Config.ts"
import * as Patches from "./Patches.ts"

const rootName = "__DockerSchemaRoot"

const isStringArray = (u: unknown): u is ReadonlyArray<string> => Array.isArray(u) && u.every(Predicate.isString)

/** Closes an object with declared properties, as the Engine's types are fixed Go structs. */
const shouldClose = (js: JsonSchema.JsonSchema): boolean =>
  (js.type === "object" || (isStringArray(js.type) && js.type.includes("object"))) &&
  Predicate.isObject(js.properties) && Object.keys(js.properties).length > 0 &&
  js.additionalProperties === undefined &&
  js.allOf === undefined && js.anyOf === undefined && js.oneOf === undefined

const closeObject = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  const properties = js.properties as { readonly [x: string]: unknown }
  const undeclared = isStringArray(js.required) ? js.required.filter((key) => !Object.hasOwn(properties, key)) : []
  return {
    ...js,
    properties: { ...properties, ...Object.fromEntries(undeclared.map((key) => [key, {}])) },
    additionalProperties: false
  }
}

/**
 * Go's `int64` and `uint64` counters (CPU time, sizes) exceed
 * `Number.MAX_SAFE_INTEGER`, which the integer check rejects. Integers decode
 * as plain numbers instead; JSON can't carry more precision anyway.
 */
const integerAsNumber = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  if (js.type === "integer") return { ...js, type: "number" }
  if (isStringArray(js.type) && js.type.includes("integer")) {
    return { ...js, type: js.type.map((type) => type === "integer" ? "number" : type) }
  }
  return js
}

/**
 * Validation keywords are dropped: the Engine is the authority on its own
 * data, and a client that rejects an ID because it isn't 64 hex characters
 * (or a size because it is negative) only gets in the way. Types stay.
 */
const constraintKeys = [
  "pattern",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties"
]

const makeOnEnter = (exclude: ReadonlySet<string>) => (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  let out: JsonSchema.JsonSchema = integerAsNumber({ ...js })
  for (const key of exclude) delete out[key]
  for (const key of constraintKeys) delete out[key]
  if (shouldClose(out)) out = closeObject(out)
  return out
}

const prelude = `import * as Schema from "../Schema.ts"

// The open half of a lenient enum: any string the Engine sends that isn't one
// of the known values.
const ${Patches.lenientStringName}: Schema.Codec<string & {}> = Schema.String
`

/** The JSDoc of a generated definition, which the public API checks require. */
const jsdoc = (summary: string, category: string, since: string): string =>
  [
    "/**",
    ` * ${summary}`,
    " *",
    " * @stability unstable",
    ` * @category ${category}`,
    ` * @since ${since}`,
    " */"
  ].join("\n")

/** A definition's type: its Schema's, under the same name. */
const typeAlias = (name: string, since: string): Array<string> => [
  "",
  jsdoc(`The Engine API's \`${name}\` definition, as decoded.`, "models", since),
  `export type ${name} = typeof ${name}.Type`
]

/**
 * Generates the source of the Schemas module from the patched OpenAPI 3.0
 * document.
 *
 * @category generation
 * @since 4.0.7
 */
export const generate = (document: Patches.Node, config: CodegenConfig): string => {
  const components = (document.components as Patches.Node).schemas as Record<string, JsonSchema.JsonSchema>
  const generator = JsonSchemaGenerator.make()
  generator.addSchema(rootName, {
    type: "object",
    properties: Object.fromEntries(
      Object.keys(components).map((name) => [name, { $ref: `#/components/schemas/${name}` }])
    )
  })
  const source = generator.generate("openapi-3.0", components, false, {
    onEnter: makeOnEnter(new Set(config.excludeAnnotations))
  })

  const lines: Array<string> = []
  let current: string | undefined
  for (const line of source.split("\n")) {
    // the synthetic root, and the section comments
    if (line.startsWith("// schemas")) break
    if (line.startsWith("// ")) continue
    if (
      line.startsWith(`export type ${Patches.lenientStringName} =`) ||
      line.startsWith(`export const ${Patches.lenientStringName} =`)
    ) continue
    // the generator's own types: each Schema's type follows it instead
    if (line.startsWith("export type ")) {
      continue
    } else if (line.startsWith("export const ")) {
      if (current !== undefined) lines.push(...typeAlias(current, config.since))
      // a blank line between definitions
      if (lines.length > 0) lines.push("")
      current = /^export const (\w+)/.exec(line)![1]
      lines.push(jsdoc(`The Engine API's \`${current}\` definition.`, "schemas", config.since))
      // a forward reference takes its type from the Schema it points to
      lines.push(line.replaceAll(/\(\): Schema\.Codec<(\w+)> =>/g, "(): typeof $1 =>"))
    } else if (line.trim() !== "") {
      lines.push(line)
    }
  }
  if (current !== undefined) lines.push(...typeAlias(current, config.since))

  return [config.header.trimEnd(), "", prelude, lines.join("\n"), ""].join("\n")
}
