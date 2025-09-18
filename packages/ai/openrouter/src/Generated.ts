/**
 * @since 1.0.0
 */
import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import * as S from "effect/Schema"

export class CacheControlEphemeral extends S.Class<CacheControlEphemeral>("CacheControlEphemeral")({
  "type": S.Literal("ephemeral")
}) {}

export class ReasoningDetailSummaryType extends S.Literal("reasoning.summary") {}

export class ReasoningDetailSummaryFormat extends S.Literal("unknown", "openai-responses-v1", "anthropic-claude-v1") {}

/**
 * Reasoning summary detail
 */
export class ReasoningDetailSummary extends S.Class<ReasoningDetailSummary>("ReasoningDetailSummary")({
  "type": ReasoningDetailSummaryType,
  "summary": S.String,
  "id": S.optionalWith(S.String, { nullable: true }),
  "format": S.optionalWith(ReasoningDetailSummaryFormat, {
    nullable: true,
    default: () => "anthropic-claude-v1" as const
  }),
  "index": S.optionalWith(S.Number, { nullable: true })
}) {}

export class ReasoningDetailEncryptedType extends S.Literal("reasoning.encrypted") {}

export class ReasoningDetailEncryptedFormat
  extends S.Literal("unknown", "openai-responses-v1", "anthropic-claude-v1")
{}

/**
 * Encrypted reasoning detail
 */
export class ReasoningDetailEncrypted extends S.Class<ReasoningDetailEncrypted>("ReasoningDetailEncrypted")({
  "type": ReasoningDetailEncryptedType,
  "data": S.String,
  "id": S.optionalWith(S.String, { nullable: true }),
  "format": S.optionalWith(ReasoningDetailEncryptedFormat, {
    nullable: true,
    default: () => "anthropic-claude-v1" as const
  }),
  "index": S.optionalWith(S.Number, { nullable: true })
}) {}

export class ReasoningDetailTextType extends S.Literal("reasoning.text") {}

export class ReasoningDetailTextFormat extends S.Literal("unknown", "openai-responses-v1", "anthropic-claude-v1") {}

/**
 * Text reasoning detail
 */
export class ReasoningDetailText extends S.Class<ReasoningDetailText>("ReasoningDetailText")({
  "type": ReasoningDetailTextType,
  "text": S.optionalWith(S.String, { nullable: true }),
  "signature": S.optionalWith(S.String, { nullable: true }),
  "id": S.optionalWith(S.String, { nullable: true }),
  "format": S.optionalWith(ReasoningDetailTextFormat, {
    nullable: true,
    default: () => "anthropic-claude-v1" as const
  }),
  "index": S.optionalWith(S.Number, { nullable: true })
}) {}

/**
 * Reasoning detail information
 */
export class ReasoningDetail extends S.Union(ReasoningDetailSummary, ReasoningDetailEncrypted, ReasoningDetailText) {}

export class ChatCompletionSystemMessageParamRole extends S.Literal("system") {}

export class ChatCompletionContentPartTextType extends S.Literal("text") {}

/**
 * Text content part
 */
export class ChatCompletionContentPartText
  extends S.Class<ChatCompletionContentPartText>("ChatCompletionContentPartText")({
    "type": ChatCompletionContentPartTextType,
    "text": S.String,
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true })
  })
{}

/**
 * System message for setting behavior
 */
export class ChatCompletionSystemMessageParam
  extends S.Class<ChatCompletionSystemMessageParam>("ChatCompletionSystemMessageParam")({
    "role": ChatCompletionSystemMessageParamRole,
    /**
     * System message content
     */
    "content": S.Union(S.String, S.Array(ChatCompletionContentPartText)),
    /**
     * Optional name for the system message
     */
    "name": S.optionalWith(S.String, { nullable: true }),
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true })
  })
{}

export class ChatCompletionUserMessageParamRole extends S.Literal("user") {}

export class ChatCompletionContentPartImageType extends S.Literal("image_url") {}

/**
 * Image detail level for vision models
 */
export class ChatCompletionContentPartImageImageUrlDetail extends S.Literal("auto", "low", "high") {}

/**
 * Image content part for vision models
 */
export class ChatCompletionContentPartImage
  extends S.Class<ChatCompletionContentPartImage>("ChatCompletionContentPartImage")({
    "type": ChatCompletionContentPartImageType,
    "image_url": S.Struct({
      /**
       * URL of the image (data: URLs supported)
       */
      "url": S.String,
      /**
       * Image detail level for vision models
       */
      "detail": S.optionalWith(ChatCompletionContentPartImageImageUrlDetail, { nullable: true })
    }),
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true })
  })
{}

export class ChatCompletionContentPartAudioType extends S.Literal("input_audio") {}

/**
 * Audio format
 */
export class ChatCompletionContentPartAudioInputAudioFormat
  extends S.Literal("wav", "mp3", "flac", "m4a", "ogg", "pcm16", "pcm24")
{}

/**
 * Audio input content part
 */
export class ChatCompletionContentPartAudio
  extends S.Class<ChatCompletionContentPartAudio>("ChatCompletionContentPartAudio")({
    "type": ChatCompletionContentPartAudioType,
    "input_audio": S.Struct({
      /**
       * Base64 encoded audio data
       */
      "data": S.String,
      /**
       * Audio format
       */
      "format": ChatCompletionContentPartAudioInputAudioFormat
    })
  })
{}

export class ChatCompletionContentPartFileType extends S.Literal("file") {}

/**
 * File content part
 */
export class ChatCompletionContentPartFile
  extends S.Class<ChatCompletionContentPartFile>("ChatCompletionContentPartFile")({
    "type": ChatCompletionContentPartFileType,
    "file": S.Struct({
      /**
       * Name of the file.
       */
      "filename": S.String,
      /**
       * File data.
       */
      "file_data": S.String
    }),
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true })
  })
{}

/**
 * Content part for chat completion messages
 */
export class ChatCompletionContentPart extends S.Union(
  ChatCompletionContentPartText,
  ChatCompletionContentPartImage,
  ChatCompletionContentPartAudio,
  ChatCompletionContentPartFile
) {}

/**
 * User message
 */
export class ChatCompletionUserMessageParam
  extends S.Class<ChatCompletionUserMessageParam>("ChatCompletionUserMessageParam")({
    "role": ChatCompletionUserMessageParamRole,
    /**
     * User message content
     */
    "content": S.Union(S.String, S.Array(ChatCompletionContentPart)),
    /**
     * Optional name for the user
     */
    "name": S.optionalWith(S.String, { nullable: true }),
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true })
  })
{}

export class ChatCompletionAssistantMessageParamRole extends S.Literal("assistant") {}

export class ChatCompletionMessageToolCallType extends S.Literal("function") {}

/**
 * Tool call made by the assistant
 */
export class ChatCompletionMessageToolCall
  extends S.Class<ChatCompletionMessageToolCall>("ChatCompletionMessageToolCall")({
    /**
     * Tool call identifier
     */
    "id": S.String,
    "type": ChatCompletionMessageToolCallType,
    "function": S.Struct({
      /**
       * Function name to call
       */
      "name": S.String,
      /**
       * Function arguments as JSON string
       */
      "arguments": S.String
    })
  })
{}

/**
 * Assistant message with tool calls and audio support
 */
export class ChatCompletionAssistantMessageParam
  extends S.Class<ChatCompletionAssistantMessageParam>("ChatCompletionAssistantMessageParam")({
    "role": ChatCompletionAssistantMessageParamRole,
    /**
     * Assistant message content
     */
    "content": S.optionalWith(S.Union(S.String, S.Array(ChatCompletionContentPart)), { nullable: true }),
    /**
     * Optional name for the assistant
     */
    "name": S.optionalWith(S.String, { nullable: true }),
    /**
     * Reasoning output
     */
    "reasoning": S.optionalWith(S.String, { nullable: true }),
    /**
     * Tool calls made by the assistant
     */
    "tool_calls": S.optionalWith(S.Array(ChatCompletionMessageToolCall), { nullable: true }),
    /**
     * Reasoning details delta to send reasoning details back to upstream
     */
    "reasoning_details": S.optionalWith(S.Array(ReasoningDetail), { nullable: true }),
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true })
  })
{}

export class ChatCompletionToolMessageParamRole extends S.Literal("tool") {}

/**
 * Tool response message
 */
export class ChatCompletionToolMessageParam
  extends S.Class<ChatCompletionToolMessageParam>("ChatCompletionToolMessageParam")({
    "role": ChatCompletionToolMessageParamRole,
    /**
     * Tool response content
     */
    "content": S.Union(S.String, S.Array(ChatCompletionContentPart)),
    /**
     * ID of the tool call this message responds to
     */
    "tool_call_id": S.String,
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true })
  })
{}

/**
 * Chat completion message with role-based discrimination
 */
export class ChatCompletionMessageParam extends S.Union(
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam
) {}

/**
 * Reasoning effort
 */
export class ChatCompletionCreateParamsReasoningEffort extends S.Literal("high", "medium", "low", "minimal") {}

export class ChatCompletionCreateParamsResponseFormatEnumType extends S.Literal("python") {}

/**
 * The schema for the response format, described as a JSON Schema object
 */
export class ResponseFormatJsonSchemaSchema
  extends S.Class<ResponseFormatJsonSchemaSchema>("ResponseFormatJsonSchemaSchema")({})
{}

/**
 * Streaming configuration options
 */
export class ChatCompletionCreateParamsStreamOptions extends S.Struct({
  /**
   * Include usage information in streaming response
   */
  "include_usage": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ChatCompletionToolChoiceOptionNoneEnum extends S.Literal("none") {}

export class ChatCompletionToolChoiceOptionAutoEnum extends S.Literal("auto") {}

export class ChatCompletionToolChoiceOptionRequiredEnum extends S.Literal("required") {}

export class ChatCompletionNamedToolChoiceType extends S.Literal("function") {}

/**
 * Named tool choice for specific function
 */
export class ChatCompletionNamedToolChoice
  extends S.Class<ChatCompletionNamedToolChoice>("ChatCompletionNamedToolChoice")({
    "type": ChatCompletionNamedToolChoiceType,
    "function": S.Struct({
      /**
       * Function name to call
       */
      "name": S.String
    })
  })
{}

/**
 * Tool choice configuration
 */
export class ChatCompletionToolChoiceOption extends S.Union(
  ChatCompletionToolChoiceOptionNoneEnum,
  ChatCompletionToolChoiceOptionAutoEnum,
  ChatCompletionToolChoiceOptionRequiredEnum,
  ChatCompletionNamedToolChoice
) {}

export class ChatCompletionToolType extends S.Literal("function") {}

/**
 * Tool definition for function calling
 */
export class ChatCompletionTool extends S.Class<ChatCompletionTool>("ChatCompletionTool")({
  "type": ChatCompletionToolType,
  /**
   * Function definition for tool calling
   */
  "function": S.Struct({
    /**
     * Function name (a-z, A-Z, 0-9, underscores, dashes, max 64 chars)
     */
    "name": S.String.pipe(S.maxLength(64)),
    /**
     * Function description for the model
     */
    "description": S.optionalWith(S.String, { nullable: true }),
    /**
     * Function parameters as JSON Schema object
     */
    "parameters": S.optionalWith(S.Struct({}), { nullable: true }),
    /**
     * Enable strict schema adherence
     */
    "strict": S.optionalWith(S.Boolean, { nullable: true })
  })
}) {}

/**
 * Data collection setting. If no available model provider meets the requirement, your request will return an error.
 * - allow: (default) allow providers which store user data non-transiently and may train on it
 * - deny: use only providers which do not collect user data.
 */
export class ChatCompletionCreateParamsProviderDataCollection extends S.Literal("deny", "allow") {}

/**
 * The sorting strategy to use for this request, if "order" is not specified. When set, no load balancing is performed.
 */
export class ChatCompletionCreateParamsProviderSort extends S.Literal("price", "throughput", "latency") {}

/**
 * Chat completion request parameters
 */
export class ChatCompletionCreateParams extends S.Class<ChatCompletionCreateParams>("ChatCompletionCreateParams")({
  /**
   * List of messages for the conversation
   */
  "messages": S.NonEmptyArray(ChatCompletionMessageParam).pipe(S.minItems(1)),
  /**
   * Model to use for completion
   */
  "model": S.optionalWith(S.String, { nullable: true }),
  /**
   * Frequency penalty (-2.0 to 2.0)
   */
  "frequency_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true
  }),
  /**
   * Token logit bias adjustments
   */
  "logit_bias": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * Return log probabilities
   */
  "logprobs": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Number of top log probabilities to return (0-20)
   */
  "top_logprobs": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)), { nullable: true }),
  /**
   * Maximum tokens in completion
   */
  "max_completion_tokens": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
  /**
   * Maximum tokens (deprecated, use max_completion_tokens)
   */
  "max_tokens": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
  /**
   * Key-value pairs for additional object information (max 16 pairs, 64 char keys, 512 char values)
   */
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * Presence penalty (-2.0 to 2.0)
   */
  "presence_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true
  }),
  /**
   * Reasoning configuration
   */
  "reasoning": S.optionalWith(
    S.Struct({
      /**
       * Enables reasoning with default settings. Only work for some models.
       */
      "enabled": S.optionalWith(S.Boolean, { nullable: true }),
      /**
       * OpenAI-style reasoning effort setting
       */
      "effort": S.optionalWith(ChatCompletionCreateParamsReasoningEffort, { nullable: true }),
      /**
       * non-OpenAI-style reasoning effort setting
       */
      "max_tokens": S.optionalWith(S.Number, { nullable: true }),
      "exclude": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
    }),
    { nullable: true }
  ),
  /**
   * Response format configuration
   */
  "response_format": S.optionalWith(
    S.Union(
      /**
       * Default text response format
       */
      S.Struct({
        "type": ChatCompletionCreateParamsResponseFormatEnumType
      }),
      /**
       * JSON object response format
       */
      S.Struct({
        "type": ChatCompletionCreateParamsResponseFormatEnumType
      }),
      /**
       * JSON Schema response format for structured outputs
       */
      S.Struct({
        "type": ChatCompletionCreateParamsResponseFormatEnumType,
        "json_schema": S.Struct({
          /**
           * Schema name (a-z, A-Z, 0-9, underscores, dashes, max 64 chars)
           */
          "name": S.String.pipe(S.maxLength(64)),
          /**
           * Schema description for the model
           */
          "description": S.optionalWith(S.String, { nullable: true }),
          "schema": S.optionalWith(ResponseFormatJsonSchemaSchema, { nullable: true }),
          /**
           * Enable strict schema adherence
           */
          "strict": S.optionalWith(S.Boolean, { nullable: true })
        })
      }),
      /**
       * Custom grammar response format
       */
      S.Struct({
        "type": ChatCompletionCreateParamsResponseFormatEnumType,
        /**
         * Custom grammar for text generation
         */
        "grammar": S.String
      }),
      /**
       * Python code response format
       */
      S.Struct({
        "type": ChatCompletionCreateParamsResponseFormatEnumType
      })
    ),
    { nullable: true }
  ),
  /**
   * Random seed for deterministic outputs
   */
  "seed": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Stop sequences (up to 4)
   */
  "stop": S.optionalWith(S.Union(S.String, S.Array(S.String).pipe(S.maxItems(4))), { nullable: true }),
  /**
   * Enable streaming response
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stream_options": S.optionalWith(ChatCompletionCreateParamsStreamOptions, { nullable: true }),
  /**
   * Sampling temperature (0-2)
   */
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "tool_choice": S.optionalWith(ChatCompletionToolChoiceOption, { nullable: true }),
  /**
   * Available tools for function calling
   */
  "tools": S.optionalWith(S.Array(ChatCompletionTool), { nullable: true }),
  /**
   * Nucleus sampling parameter (0-1)
   */
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * Unique user identifier
   */
  "user": S.optionalWith(S.String, { nullable: true }),
  /**
   * Order of models to fallback to for this request
   */
  "models": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Reasoning effort
   */
  "reasoning_effort": S.optionalWith(ChatCompletionCreateParamsReasoningEffort, { nullable: true }),
  /**
   * When multiple model providers are available, optionally indicate your routing preference.
   */
  "provider": S.optionalWith(
    S.Struct({
      /**
       * Whether to allow backup providers to serve requests
       * - true: (default) when the primary provider (or your custom providers in "order") is unavailable, use the next best provider.
       * - false: use only the primary/custom provider, and return the upstream error if it's unavailable.
       */
      "allow_fallbacks": S.optionalWith(S.Boolean, { nullable: true }),
      /**
       * Whether to filter providers to only those that support the parameters you've provided. If this setting is omitted or set to false, then providers will receive only the parameters they support, and ignore the rest.
       */
      "require_parameters": S.optionalWith(S.Boolean, { nullable: true }),
      /**
       * Data collection setting. If no available model provider meets the requirement, your request will return an error.
       * - allow: (default) allow providers which store user data non-transiently and may train on it
       * - deny: use only providers which do not collect user data.
       */
      "data_collection": S.optionalWith(ChatCompletionCreateParamsProviderDataCollection, { nullable: true }),
      /**
       * An ordered list of provider slugs. The router will attempt to use the first provider in the subset of this list that supports your requested model, and fall back to the next if it is unavailable. If no providers are available, the request will fail with an error message.
       */
      "order": S.optionalWith(
        S.Array(
          S.Union(
            S.Literal(
              "AnyScale",
              "Cent-ML",
              "HuggingFace",
              "Hyperbolic 2",
              "Lepton",
              "Lynn 2",
              "Lynn",
              "Mancer",
              "Modal",
              "OctoAI",
              "Recursal",
              "Reflection",
              "Replicate",
              "SambaNova 2",
              "SF Compute",
              "Together 2",
              "01.AI",
              "AI21",
              "AionLabs",
              "Alibaba",
              "Amazon Bedrock",
              "Anthropic",
              "AtlasCloud",
              "Atoma",
              "Avian",
              "Azure",
              "BaseTen",
              "Cerebras",
              "Chutes",
              "Cloudflare",
              "Cohere",
              "CrofAI",
              "Crusoe",
              "DeepInfra",
              "DeepSeek",
              "Enfer",
              "Featherless",
              "Fireworks",
              "Friendli",
              "GMICloud",
              "Google",
              "Google AI Studio",
              "Groq",
              "Hyperbolic",
              "Inception",
              "InferenceNet",
              "Infermatic",
              "Inflection",
              "InoCloud",
              "Kluster",
              "Lambda",
              "Liquid",
              "Mancer 2",
              "Meta",
              "Minimax",
              "Mistral",
              "Moonshot AI",
              "Morph",
              "NCompass",
              "Nebius",
              "NextBit",
              "Nineteen",
              "Novita",
              "OpenAI",
              "OpenInference",
              "Parasail",
              "Perplexity",
              "Phala",
              "SambaNova",
              "Stealth",
              "Switchpoint",
              "Targon",
              "Together",
              "Ubicloud",
              "Venice",
              "WandB",
              "xAI",
              "Z.AI"
            ),
            S.String
          )
        ),
        { nullable: true }
      ),
      /**
       * List of provider slugs to allow. If provided, this list is merged with your account-wide allowed provider settings for this request.
       */
      "only": S.optionalWith(
        S.Array(
          S.Union(
            S.Literal(
              "AnyScale",
              "Cent-ML",
              "HuggingFace",
              "Hyperbolic 2",
              "Lepton",
              "Lynn 2",
              "Lynn",
              "Mancer",
              "Modal",
              "OctoAI",
              "Recursal",
              "Reflection",
              "Replicate",
              "SambaNova 2",
              "SF Compute",
              "Together 2",
              "01.AI",
              "AI21",
              "AionLabs",
              "Alibaba",
              "Amazon Bedrock",
              "Anthropic",
              "AtlasCloud",
              "Atoma",
              "Avian",
              "Azure",
              "BaseTen",
              "Cerebras",
              "Chutes",
              "Cloudflare",
              "Cohere",
              "CrofAI",
              "Crusoe",
              "DeepInfra",
              "DeepSeek",
              "Enfer",
              "Featherless",
              "Fireworks",
              "Friendli",
              "GMICloud",
              "Google",
              "Google AI Studio",
              "Groq",
              "Hyperbolic",
              "Inception",
              "InferenceNet",
              "Infermatic",
              "Inflection",
              "InoCloud",
              "Kluster",
              "Lambda",
              "Liquid",
              "Mancer 2",
              "Meta",
              "Minimax",
              "Mistral",
              "Moonshot AI",
              "Morph",
              "NCompass",
              "Nebius",
              "NextBit",
              "Nineteen",
              "Novita",
              "OpenAI",
              "OpenInference",
              "Parasail",
              "Perplexity",
              "Phala",
              "SambaNova",
              "Stealth",
              "Switchpoint",
              "Targon",
              "Together",
              "Ubicloud",
              "Venice",
              "WandB",
              "xAI",
              "Z.AI"
            ),
            S.String
          )
        ),
        { nullable: true }
      ),
      /**
       * List of provider slugs to ignore. If provided, this list is merged with your account-wide ignored provider settings for this request.
       */
      "ignore": S.optionalWith(
        S.Array(
          S.Union(
            S.Literal(
              "AnyScale",
              "Cent-ML",
              "HuggingFace",
              "Hyperbolic 2",
              "Lepton",
              "Lynn 2",
              "Lynn",
              "Mancer",
              "Modal",
              "OctoAI",
              "Recursal",
              "Reflection",
              "Replicate",
              "SambaNova 2",
              "SF Compute",
              "Together 2",
              "01.AI",
              "AI21",
              "AionLabs",
              "Alibaba",
              "Amazon Bedrock",
              "Anthropic",
              "AtlasCloud",
              "Atoma",
              "Avian",
              "Azure",
              "BaseTen",
              "Cerebras",
              "Chutes",
              "Cloudflare",
              "Cohere",
              "CrofAI",
              "Crusoe",
              "DeepInfra",
              "DeepSeek",
              "Enfer",
              "Featherless",
              "Fireworks",
              "Friendli",
              "GMICloud",
              "Google",
              "Google AI Studio",
              "Groq",
              "Hyperbolic",
              "Inception",
              "InferenceNet",
              "Infermatic",
              "Inflection",
              "InoCloud",
              "Kluster",
              "Lambda",
              "Liquid",
              "Mancer 2",
              "Meta",
              "Minimax",
              "Mistral",
              "Moonshot AI",
              "Morph",
              "NCompass",
              "Nebius",
              "NextBit",
              "Nineteen",
              "Novita",
              "OpenAI",
              "OpenInference",
              "Parasail",
              "Perplexity",
              "Phala",
              "SambaNova",
              "Stealth",
              "Switchpoint",
              "Targon",
              "Together",
              "Ubicloud",
              "Venice",
              "WandB",
              "xAI",
              "Z.AI"
            ),
            S.String
          )
        ),
        { nullable: true }
      ),
      /**
       * A list of quantization levels to filter the provider by.
       */
      "quantizations": S.optionalWith(
        S.Array(S.Literal("int4", "int8", "fp4", "fp6", "fp8", "fp16", "bf16", "fp32", "unknown")),
        { nullable: true }
      ),
      /**
       * The sorting strategy to use for this request, if "order" is not specified. When set, no load balancing is performed.
       */
      "sort": S.optionalWith(ChatCompletionCreateParamsProviderSort, { nullable: true }),
      /**
       * The object specifying the maximum price you want to pay for this request. USD price per million tokens, for prompt and completion.
       */
      "max_price": S.optionalWith(
        S.Struct({
          "prompt": S.optionalWith(S.Union(S.Number, S.String), { nullable: true }),
          "completion": S.optionalWith(S.Union(S.Number, S.String), { nullable: true }),
          "image": S.optionalWith(S.Union(S.Number, S.String), { nullable: true }),
          "audio": S.optionalWith(S.Union(S.Number, S.String), { nullable: true }),
          "request": S.optionalWith(S.Union(S.Number, S.String), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * Plugins you want to enable for this request, including their settings.
   */
  "plugins": S.optionalWith(
    S.Array(S.Union(
      S.Struct({
        "id": S.Literal("moderation")
      }),
      S.Struct({
        "id": S.Literal("web"),
        "max_results": S.optionalWith(S.Number, { nullable: true }),
        "search_prompt": S.optionalWith(S.String, { nullable: true }),
        "engine": S.optionalWith(S.Literal("native", "exa"), { nullable: true })
      }),
      S.Struct({
        "id": S.Literal("chain-of-thought")
      }),
      S.Struct({
        "id": S.Literal("file-parser"),
        "max_files": S.optionalWith(S.Number, { nullable: true }),
        "pdf": S.optionalWith(
          S.Struct({
            "engine": S.optionalWith(S.Literal("mistral-ocr", "pdf-text", "native"), { nullable: true })
          }),
          { nullable: true }
        )
      })
    )),
    { nullable: true }
  )
}) {}

/**
 * Reason the completion finished
 */
export class ChatCompletionChoiceFinishReason
  extends S.Literal("tool_calls", "stop", "length", "content_filter", "error")
{}

export class ChatCompletionMessageRole extends S.Literal("assistant") {}

export class FileAnnotationDetailType extends S.Literal("file") {}

/**
 * File annotation with content
 */
export class FileAnnotationDetail extends S.Class<FileAnnotationDetail>("FileAnnotationDetail")({
  "type": FileAnnotationDetailType,
  "file": S.Struct({
    "hash": S.String,
    "name": S.optionalWith(S.String, { nullable: true }),
    "content": S.Array(S.Union(
      S.Struct({
        "type": S.Literal("text"),
        "text": S.String
      }),
      S.Struct({
        "type": S.Literal("image_url"),
        "image_url": S.Struct({
          "url": S.String
        })
      })
    ))
  })
}) {}

export class URLCitationAnnotationDetailType extends S.Literal("url_citation") {}

/**
 * URL citation annotation
 */
export class URLCitationAnnotationDetail extends S.Class<URLCitationAnnotationDetail>("URLCitationAnnotationDetail")({
  "type": URLCitationAnnotationDetailType,
  "url_citation": S.Struct({
    "end_index": S.Number,
    "start_index": S.Number,
    "title": S.String,
    "url": S.String,
    "content": S.optionalWith(S.String, { nullable: true })
  })
}) {}

/**
 * Annotation information
 */
export class AnnotationDetail extends S.Union(FileAnnotationDetail, URLCitationAnnotationDetail) {}

/**
 * Assistant message in completion response
 */
export class ChatCompletionMessage extends S.Class<ChatCompletionMessage>("ChatCompletionMessage")({
  "role": ChatCompletionMessageRole,
  /**
   * Message content
   */
  "content": S.NullOr(S.String),
  /**
   * Reasoning output
   */
  "reasoning": S.optionalWith(S.String, { nullable: true }),
  /**
   * Refusal message if content was refused
   */
  "refusal": S.NullOr(S.String),
  /**
   * Images generated by the assistant
   */
  "images": S.optionalWith(S.Array(ChatCompletionContentPartImage), { nullable: true }),
  /**
   * Tool calls made by the assistant
   */
  "tool_calls": S.optionalWith(S.Array(ChatCompletionMessageToolCall), { nullable: true }),
  /**
   * Reasoning details delta to send reasoning details back to upstream
   */
  "reasoning_details": S.optionalWith(S.Array(ReasoningDetail), { nullable: true }),
  /**
   * Annotations delta to send annotations back to upstream
   */
  "annotations": S.optionalWith(S.Array(AnnotationDetail), { nullable: true })
}) {}

/**
 * Token log probability information
 */
export class ChatCompletionTokenLogprob extends S.Class<ChatCompletionTokenLogprob>("ChatCompletionTokenLogprob")({
  /**
   * The token
   */
  "token": S.String,
  /**
   * Log probability of the token
   */
  "logprob": S.Number,
  /**
   * UTF-8 bytes of the token
   */
  "bytes": S.NullOr(S.Array(S.Number)),
  /**
   * Top alternative tokens with probabilities
   */
  "top_logprobs": S.Array(S.Struct({
    "token": S.String,
    "logprob": S.Number,
    "bytes": S.NullOr(S.Array(S.Number))
  }))
}) {}

/**
 * Log probabilities for the completion
 */
export class ChatCompletionTokenLogprobs extends S.Class<ChatCompletionTokenLogprobs>("ChatCompletionTokenLogprobs")({
  /**
   * Log probabilities for content tokens
   */
  "content": S.NullOr(S.Array(ChatCompletionTokenLogprob)),
  /**
   * Log probabilities for refusal tokens
   */
  "refusal": S.NullOr(S.Array(ChatCompletionTokenLogprob))
}) {}

/**
 * Chat completion choice
 */
export class ChatCompletionChoice extends S.Class<ChatCompletionChoice>("ChatCompletionChoice")({
  /**
   * Reason the completion finished
   */
  "finish_reason": S.NullOr(ChatCompletionChoiceFinishReason),
  /**
   * Choice index
   */
  "index": S.Number,
  "message": ChatCompletionMessage,
  "logprobs": S.optionalWith(ChatCompletionTokenLogprobs, { nullable: true })
}) {}

export class ChatCompletionObject extends S.Literal("chat.completion") {}

/**
 * Token usage statistics
 */
export class CompletionUsage extends S.Class<CompletionUsage>("CompletionUsage")({
  /**
   * Number of tokens in the completion
   */
  "completion_tokens": S.Number,
  /**
   * Number of tokens in the prompt
   */
  "prompt_tokens": S.Number,
  /**
   * Total number of tokens
   */
  "total_tokens": S.Number,
  /**
   * Total cost of the completion
   */
  "cost": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Detailed completion token usage
   */
  "completion_tokens_details": S.optionalWith(
    S.Struct({
      /**
       * Tokens used for reasoning
       */
      "reasoning_tokens": S.optionalWith(S.Number, { nullable: true }),
      /**
       * Tokens used for audio output
       */
      "audio_tokens": S.optionalWith(S.Number, { nullable: true }),
      /**
       * Accepted prediction tokens
       */
      "accepted_prediction_tokens": S.optionalWith(S.Number, { nullable: true }),
      /**
       * Rejected prediction tokens
       */
      "rejected_prediction_tokens": S.optionalWith(S.Number, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * Detailed prompt token usage
   */
  "prompt_tokens_details": S.optionalWith(
    S.Struct({
      /**
       * Cached prompt tokens
       */
      "cached_tokens": S.optionalWith(S.Number, { nullable: true }),
      /**
       * Audio input tokens
       */
      "audio_tokens": S.optionalWith(S.Number, { nullable: true })
    }),
    { nullable: true }
  ),
  "cost_details": S.optionalWith(
    S.Struct({
      upstream_inference_cost: S.optionalWith(S.Number, { nullable: true })
    }),
    { nullable: true }
  )
}) {}

/**
 * Chat completion response
 */
export class ChatCompletion extends S.Class<ChatCompletion>("ChatCompletion")({
  /**
   * Unique completion identifier
   */
  "id": S.String,
  /**
   * List of completion choices
   */
  "choices": S.Array(ChatCompletionChoice),
  /**
   * Unix timestamp of creation
   */
  "created": S.Number,
  /**
   * Model used for completion
   */
  "model": S.String,
  /**
   * The provider used for completion
   */
  "provider": S.optionalWith(S.String, { nullable: true }),
  "object": ChatCompletionObject,
  /**
   * System fingerprint
   */
  "system_fingerprint": S.optionalWith(S.String, { nullable: true }),
  "usage": S.optionalWith(CompletionUsage, { nullable: true })
}) {}

/**
 * OpenRouter invalid request error response
 */
export class OpenRouterInvalidRequestError
  extends S.Class<OpenRouterInvalidRequestError>("OpenRouterInvalidRequestError")({
    /**
     * Error object structure
     */
    "error": S.Struct({
      "code": S.NullOr(S.Number),
      "message": S.String,
      "param": S.optionalWith(S.String, { nullable: true }),
      "type": S.optionalWith(S.String, { nullable: true })
    })
  })
{}

/**
 * OpenRouter unauthorized error response
 */
export class OpenRouterUnauthorizedError extends S.Class<OpenRouterUnauthorizedError>("OpenRouterUnauthorizedError")({
  /**
   * Error object structure
   */
  "error": S.Struct({
    "code": S.NullOr(S.Number),
    "message": S.String,
    "param": S.optionalWith(S.String, { nullable: true }),
    "type": S.optionalWith(S.String, { nullable: true })
  })
}) {}

/**
 * OpenRouter rate limit error response
 */
export class OpenRouterRateLimitError extends S.Class<OpenRouterRateLimitError>("OpenRouterRateLimitError")({
  /**
   * Error object structure
   */
  "error": S.Struct({
    "code": S.NullOr(S.Number),
    "message": S.String,
    "param": S.optionalWith(S.String, { nullable: true }),
    "type": S.optionalWith(S.String, { nullable: true })
  })
}) {}

/**
 * OpenRouter server error response
 */
export class OpenRouterServerError extends S.Class<OpenRouterServerError>("OpenRouterServerError")({
  /**
   * Error object structure
   */
  "error": S.Struct({
    "code": S.NullOr(S.Number),
    "message": S.String,
    "param": S.optionalWith(S.String, { nullable: true }),
    "type": S.optionalWith(S.String, { nullable: true })
  })
}) {}

export const make = (
  httpClient: HttpClient.HttpClient,
  options: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => Effect.Effect<HttpClient.HttpClient>) | undefined
  } = {}
): Client => {
  const unexpectedStatus = (response: HttpClientResponse.HttpClientResponse) =>
    Effect.flatMap(
      Effect.orElseSucceed(response.json, () => "Unexpected status code"),
      (description) =>
        Effect.fail(
          new HttpClientError.ResponseError({
            request: response.request,
            response,
            reason: "StatusCode",
            description: typeof description === "string" ? description : JSON.stringify(description)
          })
        )
    )
  const withResponse: <A, E>(
    f: (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<A, E>
  ) => (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<any, any> = options.transformClient
    ? (f) => (request) =>
      Effect.flatMap(
        Effect.flatMap(options.transformClient!(httpClient), (client) => client.execute(request)),
        f
      )
    : (f) => (request) => Effect.flatMap(httpClient.execute(request), f)
  const decodeSuccess = <A, I, R>(schema: S.Schema<A, I, R>) => (response: HttpClientResponse.HttpClientResponse) =>
    HttpClientResponse.schemaBodyJson(schema)(response)
  const decodeError =
    <const Tag extends string, A, I, R>(tag: Tag, schema: S.Schema<A, I, R>) =>
    (response: HttpClientResponse.HttpClientResponse) =>
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(schema)(response),
        (cause) => Effect.fail(ClientError(tag, cause, response))
      )
  return {
    httpClient,
    "createChatCompletion": (options) =>
      HttpClientRequest.post(`/chat/completions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ChatCompletion),
          "400": decodeError("OpenRouterInvalidRequestError", OpenRouterInvalidRequestError),
          "401": decodeError("OpenRouterUnauthorizedError", OpenRouterUnauthorizedError),
          "429": decodeError("OpenRouterRateLimitError", OpenRouterRateLimitError),
          "500": decodeError("OpenRouterServerError", OpenRouterServerError),
          orElse: unexpectedStatus
        }))
      )
  }
}

export interface Client {
  readonly httpClient: HttpClient.HttpClient
  /**
   * Creates a model response for the given chat conversation. Supports both streaming and non-streaming modes.
   */
  readonly "createChatCompletion": (
    options: typeof ChatCompletionCreateParams.Encoded
  ) => Effect.Effect<
    typeof ChatCompletion.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"OpenRouterInvalidRequestError", typeof OpenRouterInvalidRequestError.Type>
    | ClientError<"OpenRouterUnauthorizedError", typeof OpenRouterUnauthorizedError.Type>
    | ClientError<"OpenRouterRateLimitError", typeof OpenRouterRateLimitError.Type>
    | ClientError<"OpenRouterServerError", typeof OpenRouterServerError.Type>
  >
}

export interface ClientError<Tag extends string, E> {
  readonly _tag: Tag
  readonly request: HttpClientRequest.HttpClientRequest
  readonly response: HttpClientResponse.HttpClientResponse
  readonly cause: E
}

class ClientErrorImpl extends Data.Error<{
  _tag: string
  cause: any
  request: HttpClientRequest.HttpClientRequest
  response: HttpClientResponse.HttpClientResponse
}> {}

export const ClientError = <Tag extends string, E>(
  tag: Tag,
  cause: E,
  response: HttpClientResponse.HttpClientResponse
): ClientError<Tag, E> =>
  new ClientErrorImpl({
    _tag: tag,
    cause,
    response,
    request: response.request
  }) as any
