/**
 * @since 1.0.0
 */
import type * as AiInput from "@effect/ai/AiInput"
import * as AiLanguageModel from "@effect/ai/AiLanguageModel"
import * as AiModel from "@effect/ai/AiModel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as JsonSchema from "effect/JSONSchema"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import { GoogleAiClient } from "./GoogleAiClient.js"
import * as InternalUtilities from "./internal/utilities.js"

/**
 * @since 1.0.0
 * @category Models
 */
export type Model = string

// =============================================================================
// Google Ai Language Model Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class Config extends Context.Tag("@effect/ai-google/GoogleAiLanguageModel/Config")<
  Config,
  Config.Service
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<Config.Service | undefined> = Effect.map(
    Effect.context<never>(),
    (context) => context.unsafeMap.get(Config.key)
  )
}

/**
 * @since 1.0.0
 */
export declare namespace Config {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Service extends
    Simplify<
      Partial<
        & Omit<
          typeof Generated.GenerateContentRequest.Encoded,
          "contents" | "tools" | "toolConfig" | "systemInstruction"
        >
        & {
          readonly toolConfig: Partial<{
            readonly functionCallingConfig: Omit<
              typeof Generated.FunctionCallingConfig.Encoded,
              "mode"
            >
          }>
        }
      >
    > { }
}

// =============================================================================
// Google Ai Provider Metadata
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class ProviderMetadata extends Context.Tag(InternalUtilities.ProviderMetadataKey)<
  ProviderMetadata,
  ProviderMetadata.Service
>() { }

/**
 * @since 1.0.0
 */
export declare namespace ProviderMetadata {
  /**
   * @since 1.0.0
   * @category Provider Metadata
   */
  export interface Service {
    /**
     * Citations to sources for a specific response.
     */
    readonly citationSources?: ReadonlyArray<typeof Generated.CitationSource.Encoded> | undefined
    /**
     * Attribution information for sources that contributed to a grounded answer.
     */
    readonly groundingAttributions?: ReadonlyArray<typeof Generated.GroundingAttribution.Encoded> | undefined
    /**
     * Grounding metadata for the candidate.
     */
    readonly groundingMetadata?: ReadonlyArray<typeof Generated.GroundingMetadata.Encoded> | undefined
    /**
     * The URLs that were retrieved by the URL context retrieval tool.
     */
    readonly retrievedUrls?: ReadonlyArray<typeof Generated.UrlMetadata.Encoded> | undefined
    /**
     * List of ratings for the safety of a response candidate.
     *
     * There is at most one rating per category.
     */
    readonly safetyRatings?: ReadonlyArray<typeof Generated.SafetyRating.Encoded> | undefined
  }
}

// =============================================================================
// Google Ai Language Model
// =============================================================================

/**
 * @since 1.0.0
 * @category AiModel
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.AiModel<AiLanguageModel.AiLanguageModel, GoogleAiClient> => AiModel.make(layer({ model, config }))

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function* (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* GoogleAiClient

  const makeRequest = Effect.fnUntraced(
    function* (method: string, { prompt, system, toolChoice, tools }: AiLanguageModel.AiLanguageModelOptions) {
      const context = yield* Effect.context<never>()
      const perRequestConfig = context.unsafeMap.get(Config.key) as Config.Service | undefined
      const useStructured = tools.length === 1 && tools[0].structured
      const responseMimeType = useStructured
        ? "application/json"
        : (options.config?.generationConfig?.responseMimeType ?? perRequestConfig?.generationConfig?.responseMimeType)
      const responseSchema = useStructured
        ? convertJsonSchemaToOpenAPISchema(tools[0].parameters)
        : undefined
      let toolConfig: typeof Generated.ToolConfig.Encoded | undefined = options.config?.toolConfig
      if (Predicate.isNotUndefined(toolChoice) && !useStructured && tools.length > 0) {
        if (toolChoice === "none") {
          toolConfig = { functionCallingConfig: { ...toolConfig?.functionCallingConfig, mode: "NONE" } }
        } else if (toolChoice === "auto") {
          toolConfig = { functionCallingConfig: { ...toolConfig?.functionCallingConfig, mode: "AUTO" } }
        } else if (toolChoice === "required") {
          toolConfig = { functionCallingConfig: { ...toolConfig?.functionCallingConfig, mode: "ANY" } }
        } else {
          toolConfig = { functionCallingConfig: { allowedFunctionNames: [toolChoice.tool], mode: "ANY" } }
        }
      }
      const content = makeContent(method, system, prompt)
      return {
        model: options.model,
        ...options.config,
        ...perRequestConfig,
        generationConfig: {
          ...options.config?.generationConfig,
          ...perRequestConfig?.generationConfig,
          responseMimeType,
          responseSchema
        },
        content,
        tools: !useStructured && tools.length > 0
          ? [{ functionDeclarations: convertTools(tools) }]
          : undefined,
        toolConfig
      } satisfies typeof Generated.GenerateContentRequest.Encoded
    }
  )
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<AiLanguageModel.AiLanguageModel, never, GoogleAiClient> =>
  Layer.effect(AiLanguageModel.AiLanguageModel, make({ model: options.model, config: options.config }))

const makeContent = Effect.fnUntraced(function* (
  method: string,
  system: Option.Option<string>,
  prompt: AiInput.AiInput
) {
})

const convertTools = (
  tools: AiLanguageModel.AiLanguageModelOptions["tools"]
): ReadonlyArray<typeof Generated.FunctionDeclaration.Encoded> => {
  const converted: Array<typeof Generated.FunctionDeclaration.Encoded> = []
  for (const tool of tools) {
    converted.push({
      name: tool.name,
      description: tool.description,
      parameters: convertJsonSchemaToOpenAPISchema(tool.parameters)
    })
  }
  return converted
}

const convertJsonSchemaToOpenAPISchema = (jsonSchema: JsonSchema.JsonSchema7): unknown => {
  switch (jsonSchema.title)
  // parameters need to be undefined if they are empty objects:
  if (isEmptyObjectSchema(jsonSchema)) {
    return undefined;
  }

  if (typeof jsonSchema === 'boolean') {
    return { type: 'boolean', properties: {} };
  }

  const {
    type,
    description,
    required,
    properties,
    items,
    allOf,
    anyOf,
    oneOf,
    format,
    const: constValue,
    minLength,
    enum: enumValues,
  } = jsonSchema;

  const result: Record<string, unknown> = {};

  if (jsonSchema.description) result.description = description
  if (jsonSchema.title)

    if (description) result.description = description;
  if (required) result.required = required;
  if (format) result.format = format;

  if (constValue !== undefined) {
    result.enum = [constValue];
  }

  // Handle type
  if (type) {
    if (Array.isArray(type)) {
      if (type.includes('null')) {
        result.type = type.filter(t => t !== 'null')[0];
        result.nullable = true;
      } else {
        result.type = type;
      }
    } else if (type === 'null') {
      result.type = 'null';
    } else {
      result.type = type;
    }
  }

  // Handle enum
  if (enumValues !== undefined) {
    result.enum = enumValues;
  }

  if (properties != null) {
    result.properties = Object.entries(properties).reduce(
      (acc, [key, value]) => {
        acc[key] = convertJSONSchemaToOpenAPISchema(value);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  if (items) {
    result.items = Array.isArray(items)
      ? items.map(convertJSONSchemaToOpenAPISchema)
      : convertJSONSchemaToOpenAPISchema(items);
  }

  if (allOf) {
    result.allOf = allOf.map(convertJSONSchemaToOpenAPISchema);
  }
  if (anyOf) {
    // Handle cases where anyOf includes a null type
    if (
      anyOf.some(
        schema => typeof schema === 'object' && schema?.type === 'null',
      )
    ) {
      const nonNullSchemas = anyOf.filter(
        schema => !(typeof schema === 'object' && schema?.type === 'null'),
      );

      if (nonNullSchemas.length === 1) {
        // If there's only one non-null schema, convert it and make it nullable
        const converted = convertJSONSchemaToOpenAPISchema(nonNullSchemas[0]);
        if (typeof converted === 'object') {
          result.nullable = true;
          Object.assign(result, converted);
        }
      } else {
        // If there are multiple non-null schemas, keep them in anyOf
        result.anyOf = nonNullSchemas.map(convertJSONSchemaToOpenAPISchema);
        result.nullable = true;
      }
    } else {
      result.anyOf = anyOf.map(convertJSONSchemaToOpenAPISchema);
    }
  }
  if (oneOf) {
    result.oneOf = oneOf.map(convertJSONSchemaToOpenAPISchema);
  }

  if (minLength !== undefined) {
    result.minLength = minLength;
  }

  return result;
}

function isEmptyObjectSchema(jsonSchema: JSONSchema7Definition): boolean {
  return (
    jsonSchema != null &&
    typeof jsonSchema === 'object' &&
    jsonSchema.type === 'object' &&
    (jsonSchema.properties == null ||
      Object.keys(jsonSchema.properties).length === 0)
  );
}
}
