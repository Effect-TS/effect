import type * as Response from "@effect/ai/Response"
import type {
  JsonSchema7,
  JsonSchema7AnyOf,
  JsonSchema7Array,
  JsonSchema7Enum,
  JsonSchema7Integer,
  JsonSchema7Number,
  JsonSchema7Object,
  JsonSchema7String,
  JsonSchemaAnnotations
} from "effect/JSONSchema"
import * as Predicate from "effect/Predicate"
import type { Mutable } from "effect/Types"
import type { CandidateFinishReason, Schema, Type } from "../Generated.js"

/** @internal */
export const ProviderOptionsKey = "@effect/ai-google/GoogleLanguageModel/ProviderOptions"

/** @internal */
export const ProviderMetadataKey = "@effect/ai-google/GoogleLanguageModel/ProviderMetadata"

const finishReasonMap: Record<typeof CandidateFinishReason.Type, Response.FinishReason> = {
  BLOCKLIST: "content-filter",
  FINISH_REASON_UNSPECIFIED: "other",
  IMAGE_OTHER: "other",
  IMAGE_PROHIBITED_CONTENT: "content-filter",
  IMAGE_RECITATION: "content-filter",
  IMAGE_SAFETY: "content-filter",
  LANGUAGE: "content-filter",
  MALFORMED_FUNCTION_CALL: "error",
  MAX_TOKENS: "length",
  MISSING_THOUGHT_SIGNATURE: "error",
  NO_IMAGE: "other",
  OTHER: "other",
  PROHIBITED_CONTENT: "content-filter",
  RECITATION: "content-filter",
  SAFETY: "content-filter",
  SPII: "content-filter",
  STOP: "stop",
  TOO_MANY_TOOL_CALLS: "error",
  UNEXPECTED_TOOL_CALL: "error"
}

/** @internal */
export const resolveFinishReason = (
  finishReason: typeof CandidateFinishReason.Type | undefined,
  hasToolCalls: boolean
): Response.FinishReason => {
  if (Predicate.isUndefined(finishReason)) {
    return "unknown"
  }
  if (finishReason === "STOP" && hasToolCalls) {
    return "tool-calls"
  }
  const reason = finishReasonMap[finishReason]
  return Predicate.isUndefined(reason) ? "unknown" : reason
}

/** @internal */
export const jsonSchemaToOpenApiSchema = (schema: JsonSchema7): typeof Schema.Encoded => {
  // Handle special $id types
  if ("$id" in schema) {
    switch (schema.$id) {
      case "/schemas/never":
        // Gemini doesn't have a direct "never" type, but we can simulate it
        // by creating a schema that can never be satisfied
        return {
          type: "OBJECT",
          properties: {},
          required: ["impossible_required_field"]
        }

      case "/schemas/any":
      case "/schemas/unknown":
        // For any/unknown, we create a schema that accepts any type
        return {
          type: "OBJECT",
          description: schema.description || "Any value"
        }

      case "/schemas/void":
        return {
          type: "NULL",
          description: schema.description || "Void"
        }

      case "/schemas/object":
        return {
          type: "OBJECT",
          description: schema.description
        }
    }
  }

  // Handle $ref
  if ("$ref" in schema) {
    // In a real implementation, you would resolve the reference
    // For now, we'll throw an error indicating this needs to be resolved
    throw new Error(`Reference resolution not implemented: ${schema.$ref}`)
  }

  // Handle enum
  if ("enum" in schema) {
    const enumSchema = schema as JsonSchema7Enum
    const result: typeof Schema.Encoded = {
      type: determineEnumType(enumSchema.enum),
      enum: enumSchema.enum.map(String), // Convert to strings for Gemini
      ...extractAnnotations(enumSchema)
    }

    return result
  }

  // Handle null type
  if ("type" in schema && schema.type === "null") {
    return {
      type: "NULL",
      ...extractAnnotations(schema)
    }
  }

  // Handle string type
  if ("type" in schema && schema.type === "string") {
    const stringSchema = schema as JsonSchema7String
    const result: Mutable<typeof Schema.Encoded> = {
      type: "STRING",
      ...extractAnnotations(stringSchema)
    }

    if (stringSchema.minLength !== undefined) result.minLength = stringSchema.minLength.toString()
    if (stringSchema.maxLength !== undefined) result.maxLength = stringSchema.maxLength.toString()
    if (stringSchema.pattern !== undefined) result.pattern = stringSchema.pattern
    if (stringSchema.format !== undefined) result.format = stringSchema.format

    return result
  }

  // Handle number type
  if ("type" in schema && schema.type === "number") {
    const numberSchema = schema as JsonSchema7Number
    const result: Mutable<typeof Schema.Encoded> = {
      type: "NUMBER",
      ...extractAnnotations(numberSchema)
    }

    if (numberSchema.minimum !== undefined) result.minimum = numberSchema.minimum
    if (numberSchema.maximum !== undefined) result.maximum = numberSchema.maximum

    return result
  }

  // Handle integer type
  if ("type" in schema && schema.type === "integer") {
    const integerSchema = schema as JsonSchema7Integer
    const result: Mutable<typeof Schema.Encoded> = {
      type: "INTEGER",
      ...extractAnnotations(integerSchema)
    }

    if (integerSchema.minimum !== undefined) result.minimum = integerSchema.minimum
    if (integerSchema.maximum !== undefined) result.maximum = integerSchema.maximum

    return result
  }

  // Handle boolean type
  if ("type" in schema && schema.type === "boolean") {
    return {
      type: "BOOLEAN",
      ...extractAnnotations(schema)
    }
  }

  // Handle array type
  if ("type" in schema && schema.type === "array") {
    const arraySchema = schema as JsonSchema7Array
    const result: Mutable<typeof Schema.Encoded> = {
      type: "ARRAY",
      ...extractAnnotations(arraySchema)
    }

    if (arraySchema.minItems !== undefined) result.minItems = arraySchema.minItems.toString()
    if (arraySchema.maxItems !== undefined) result.maxItems = arraySchema.maxItems.toString()

    if (arraySchema.items) {
      if (Array.isArray(arraySchema.items)) {
        // Tuple validation - Gemini doesn't directly support this
        // We'll use the first item type as a simplification
        if (arraySchema.items.length > 0) {
          result.items = jsonSchemaToOpenApiSchema(arraySchema.items[0])
        }
      } else {
        result.items = jsonSchemaToOpenApiSchema(arraySchema.items)
      }
    }

    return result
  }

  // Handle anyOf
  if ("anyOf" in schema) {
    const anyOfSchema = schema as JsonSchema7AnyOf
    const result: typeof Schema.Encoded = {
      anyOf: anyOfSchema.anyOf.map((s) => jsonSchemaToOpenApiSchema(s)),
      ...extractAnnotations(anyOfSchema)
    } as any

    return result
  }

  // Handle object type
  if ("type" in schema && schema.type === "object") {
    const objectSchema = schema as JsonSchema7Object
    const result: Mutable<typeof Schema.Encoded> = {
      type: "OBJECT",
      ...extractAnnotations(objectSchema)
    }

    if (objectSchema.properties) {
      result.properties = {}
      for (const [key, value] of Object.entries(objectSchema.properties)) {
        ;(result.properties as any)[key] = jsonSchemaToOpenApiSchema(value)
      }
    }

    if (objectSchema.required && objectSchema.required.length > 0) {
      result.required = objectSchema.required
    }

    // Note: Gemini doesn't directly support additionalProperties, patternProperties, or propertyNames
    // These would need special handling in a production implementation

    return result
  }

  // Default fallback
  return {
    type: "OBJECT",
    ...extractAnnotations(schema)
  }
}

/**
 * Extracts common annotations from JsonSchema7 to Gemini format
 */
const extractAnnotations = (schema: JsonSchemaAnnotations): Partial<typeof Schema.Encoded> => {
  const result: Partial<Mutable<typeof Schema.Encoded>> = {}
  if (schema.title) result.title = schema.title
  if (schema.description) result.description = schema.description
  return result
}

/**
 * Determines the Gemini type for an enum based on its values
 */
const determineEnumType = (enumValues: Array<string | number | boolean>): typeof Type.Encoded => {
  if (enumValues.every((v) => typeof v === "string")) return "STRING"
  if (enumValues.every((v) => typeof v === "number")) return "NUMBER"
  if (enumValues.every((v) => typeof v === "boolean")) return "BOOLEAN"
  // Mixed types default to STRING
  return "STRING"
}
