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

export class OpenResponsesReasoningFormat
  extends S.Literal("unknown", "openai-responses-v1", "xai-responses-v1", "anthropic-claude-v1", "google-gemini-v1")
{}

export class OpenResponsesReasoningType extends S.Literal("reasoning") {}

export class ReasoningTextContentType extends S.Literal("reasoning_text") {}

export class ReasoningTextContent extends S.Class<ReasoningTextContent>("ReasoningTextContent")({
  "type": ReasoningTextContentType,
  "text": S.String
}) {}

export class ReasoningSummaryTextType extends S.Literal("summary_text") {}

export class ReasoningSummaryText extends S.Class<ReasoningSummaryText>("ReasoningSummaryText")({
  "type": ReasoningSummaryTextType,
  "text": S.String
}) {}

export class OpenResponsesReasoningStatusEnum extends S.Literal("in_progress") {}

export class OpenResponsesReasoning extends S.Class<OpenResponsesReasoning>("OpenResponsesReasoning")({
  "signature": S.optionalWith(S.String, { nullable: true }),
  "format": S.optionalWith(OpenResponsesReasoningFormat, { nullable: true }),
  "type": OpenResponsesReasoningType,
  "id": S.String,
  "content": S.optionalWith(S.Array(ReasoningTextContent), { nullable: true }),
  "summary": S.Array(ReasoningSummaryText),
  "encrypted_content": S.optionalWith(S.String, { nullable: true }),
  "status": S.optionalWith(
    S.Union(OpenResponsesReasoningStatusEnum, OpenResponsesReasoningStatusEnum, OpenResponsesReasoningStatusEnum),
    { nullable: true }
  )
}) {}

export class OpenResponsesEasyInputMessageType extends S.Literal("message") {}

export class OpenResponsesEasyInputMessageRoleEnum extends S.Literal("developer") {}

export class ResponseInputTextType extends S.Literal("input_text") {}

/**
 * Text input content item
 */
export class ResponseInputText extends S.Class<ResponseInputText>("ResponseInputText")({
  "type": ResponseInputTextType,
  "text": S.String
}) {}

export class ResponseInputImageType extends S.Literal("input_image") {}

export class ResponseInputImageDetail extends S.Literal("auto", "high", "low") {}

/**
 * Image input content item
 */
export class ResponseInputImage extends S.Class<ResponseInputImage>("ResponseInputImage")({
  "type": ResponseInputImageType,
  "detail": ResponseInputImageDetail,
  "image_url": S.optionalWith(S.String, { nullable: true })
}) {}

export class ResponseInputFileType extends S.Literal("input_file") {}

/**
 * File input content item
 */
export class ResponseInputFile extends S.Class<ResponseInputFile>("ResponseInputFile")({
  "type": ResponseInputFileType,
  "file_id": S.optionalWith(S.String, { nullable: true }),
  "file_data": S.optionalWith(S.String, { nullable: true }),
  "filename": S.optionalWith(S.String, { nullable: true }),
  "file_url": S.optionalWith(S.String, { nullable: true })
}) {}

export class ResponseInputAudioType extends S.Literal("input_audio") {}

export class ResponseInputAudioInputAudioFormat extends S.Literal("mp3", "wav") {}

/**
 * Audio input content item
 */
export class ResponseInputAudio extends S.Class<ResponseInputAudio>("ResponseInputAudio")({
  "type": ResponseInputAudioType,
  "input_audio": S.Struct({
    "data": S.String,
    "format": ResponseInputAudioInputAudioFormat
  })
}) {}

export class OpenResponsesEasyInputMessage
  extends S.Class<OpenResponsesEasyInputMessage>("OpenResponsesEasyInputMessage")({
    "type": S.optionalWith(OpenResponsesEasyInputMessageType, { nullable: true }),
    "role": S.Union(
      OpenResponsesEasyInputMessageRoleEnum,
      OpenResponsesEasyInputMessageRoleEnum,
      OpenResponsesEasyInputMessageRoleEnum,
      OpenResponsesEasyInputMessageRoleEnum
    ),
    "content": S.Union(
      S.Array(S.Union(ResponseInputText, ResponseInputImage, ResponseInputFile, ResponseInputAudio)),
      S.String
    )
  })
{}

export class OpenResponsesInputMessageItemType extends S.Literal("message") {}

export class OpenResponsesInputMessageItemRoleEnum extends S.Literal("developer") {}

export class OpenResponsesInputMessageItem
  extends S.Class<OpenResponsesInputMessageItem>("OpenResponsesInputMessageItem")({
    "id": S.optionalWith(S.String, { nullable: true }),
    "type": S.optionalWith(OpenResponsesInputMessageItemType, { nullable: true }),
    "role": S.Union(
      OpenResponsesInputMessageItemRoleEnum,
      OpenResponsesInputMessageItemRoleEnum,
      OpenResponsesInputMessageItemRoleEnum
    ),
    "content": S.Array(S.Union(ResponseInputText, ResponseInputImage, ResponseInputFile, ResponseInputAudio))
  })
{}

export class OpenResponsesFunctionToolCallType extends S.Literal("function_call") {}

export class ToolCallStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A function call initiated by the model
 */
export class OpenResponsesFunctionToolCall
  extends S.Class<OpenResponsesFunctionToolCall>("OpenResponsesFunctionToolCall")({
    "type": OpenResponsesFunctionToolCallType,
    "call_id": S.String,
    "name": S.String,
    "arguments": S.String,
    "id": S.String,
    "status": S.optionalWith(ToolCallStatus, { nullable: true })
  })
{}

export class OpenResponsesFunctionCallOutputType extends S.Literal("function_call_output") {}

/**
 * The output from a function call execution
 */
export class OpenResponsesFunctionCallOutput
  extends S.Class<OpenResponsesFunctionCallOutput>("OpenResponsesFunctionCallOutput")({
    "type": OpenResponsesFunctionCallOutputType,
    "id": S.optionalWith(S.String, { nullable: true }),
    "call_id": S.String,
    "output": S.String,
    "status": S.optionalWith(ToolCallStatus, { nullable: true })
  })
{}

export class ResponsesOutputMessageRole extends S.Literal("assistant") {}

export class ResponsesOutputMessageType extends S.Literal("message") {}

export class ResponsesOutputMessageStatusEnum extends S.Literal("in_progress") {}

export class ResponseOutputTextType extends S.Literal("output_text") {}

export class FileCitationType extends S.Literal("file_citation") {}

export class FileCitation extends S.Class<FileCitation>("FileCitation")({
  "type": FileCitationType,
  "file_id": S.String,
  "filename": S.String,
  "index": S.Number
}) {}

export class URLCitationType extends S.Literal("url_citation") {}

export class URLCitation extends S.Class<URLCitation>("URLCitation")({
  "type": URLCitationType,
  "url": S.String,
  "title": S.String,
  "start_index": S.Number,
  "end_index": S.Number
}) {}

export class FilePathType extends S.Literal("file_path") {}

export class FilePath extends S.Class<FilePath>("FilePath")({
  "type": FilePathType,
  "file_id": S.String,
  "index": S.Number
}) {}

export class OpenAIResponsesAnnotation extends S.Union(FileCitation, URLCitation, FilePath) {}

export class ResponseOutputText extends S.Class<ResponseOutputText>("ResponseOutputText")({
  "type": ResponseOutputTextType,
  "text": S.String,
  "annotations": S.optionalWith(S.Array(OpenAIResponsesAnnotation), { nullable: true })
}) {}

export class OpenAIResponsesRefusalContentType extends S.Literal("refusal") {}

export class OpenAIResponsesRefusalContent
  extends S.Class<OpenAIResponsesRefusalContent>("OpenAIResponsesRefusalContent")({
    "type": OpenAIResponsesRefusalContentType,
    "refusal": S.String
  })
{}

export class ResponsesOutputMessage extends S.Class<ResponsesOutputMessage>("ResponsesOutputMessage")({
  "id": S.String,
  "role": ResponsesOutputMessageRole,
  "type": ResponsesOutputMessageType,
  "status": S.optionalWith(
    S.Union(ResponsesOutputMessageStatusEnum, ResponsesOutputMessageStatusEnum, ResponsesOutputMessageStatusEnum),
    { nullable: true }
  ),
  "content": S.Array(S.Union(ResponseOutputText, OpenAIResponsesRefusalContent))
}) {}

export class ResponsesOutputItemReasoningType extends S.Literal("reasoning") {}

export class ResponsesOutputItemReasoningStatusEnum extends S.Literal("in_progress") {}

export class ResponsesOutputItemReasoning
  extends S.Class<ResponsesOutputItemReasoning>("ResponsesOutputItemReasoning")({
    "type": ResponsesOutputItemReasoningType,
    "id": S.String,
    "content": S.optionalWith(S.Array(ReasoningTextContent), { nullable: true }),
    "summary": S.Array(ReasoningSummaryText),
    "encrypted_content": S.optionalWith(S.String, { nullable: true }),
    "status": S.optionalWith(
      S.Union(
        ResponsesOutputItemReasoningStatusEnum,
        ResponsesOutputItemReasoningStatusEnum,
        ResponsesOutputItemReasoningStatusEnum
      ),
      { nullable: true }
    )
  })
{}

export class ResponsesOutputItemFunctionCallType extends S.Literal("function_call") {}

export class ResponsesOutputItemFunctionCallStatusEnum extends S.Literal("in_progress") {}

export class ResponsesOutputItemFunctionCall
  extends S.Class<ResponsesOutputItemFunctionCall>("ResponsesOutputItemFunctionCall")({
    "type": ResponsesOutputItemFunctionCallType,
    "id": S.optionalWith(S.String, { nullable: true }),
    "name": S.String,
    "arguments": S.String,
    "call_id": S.String,
    "status": S.optionalWith(
      S.Union(
        ResponsesOutputItemFunctionCallStatusEnum,
        ResponsesOutputItemFunctionCallStatusEnum,
        ResponsesOutputItemFunctionCallStatusEnum
      ),
      { nullable: true }
    )
  })
{}

export class ResponsesWebSearchCallOutputType extends S.Literal("web_search_call") {}

export class WebSearchStatus extends S.Literal("completed", "searching", "in_progress", "failed") {}

export class ResponsesWebSearchCallOutput
  extends S.Class<ResponsesWebSearchCallOutput>("ResponsesWebSearchCallOutput")({
    "type": ResponsesWebSearchCallOutputType,
    "id": S.String,
    "status": WebSearchStatus
  })
{}

export class ResponsesOutputItemFileSearchCallType extends S.Literal("file_search_call") {}

export class ResponsesOutputItemFileSearchCall
  extends S.Class<ResponsesOutputItemFileSearchCall>("ResponsesOutputItemFileSearchCall")({
    "type": ResponsesOutputItemFileSearchCallType,
    "id": S.String,
    "queries": S.Array(S.String),
    "status": WebSearchStatus
  })
{}

export class ResponsesImageGenerationCallType extends S.Literal("image_generation_call") {}

export class ImageGenerationStatus extends S.Literal("in_progress", "completed", "generating", "failed") {}

export class ResponsesImageGenerationCall
  extends S.Class<ResponsesImageGenerationCall>("ResponsesImageGenerationCall")({
    "type": ResponsesImageGenerationCallType,
    "id": S.String,
    "result": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "status": ImageGenerationStatus
  })
{}

/**
 * Input for a response request - can be a string or array of items
 */
export class OpenResponsesInput extends S.Union(
  S.String,
  S.Array(
    S.Union(
      OpenResponsesReasoning,
      OpenResponsesEasyInputMessage,
      OpenResponsesInputMessageItem,
      OpenResponsesFunctionToolCall,
      OpenResponsesFunctionCallOutput,
      ResponsesOutputMessage,
      ResponsesOutputItemReasoning,
      ResponsesOutputItemFunctionCall,
      ResponsesWebSearchCallOutput,
      ResponsesOutputItemFileSearchCall,
      ResponsesImageGenerationCall
    )
  )
) {}

/**
 * Metadata key-value pairs for the request. Keys must be ≤64 characters and cannot contain brackets. Values must be ≤512 characters. Maximum 16 pairs allowed.
 */
export class OpenResponsesRequestMetadata extends S.Record({ key: S.String, value: S.Unknown }) {}

export class OpenResponsesWebSearchPreviewToolType extends S.Literal("web_search_preview") {}

/**
 * Size of the search context for web search tools
 */
export class ResponsesSearchContextSize extends S.Literal("low", "medium", "high") {}

export class WebSearchPreviewToolUserLocationType extends S.Literal("approximate") {}

export class WebSearchPreviewToolUserLocation
  extends S.Class<WebSearchPreviewToolUserLocation>("WebSearchPreviewToolUserLocation")({
    "type": WebSearchPreviewToolUserLocationType,
    "city": S.optionalWith(S.String, { nullable: true }),
    "country": S.optionalWith(S.String, { nullable: true }),
    "region": S.optionalWith(S.String, { nullable: true }),
    "timezone": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * Web search preview tool configuration
 */
export class OpenResponsesWebSearchPreviewTool
  extends S.Class<OpenResponsesWebSearchPreviewTool>("OpenResponsesWebSearchPreviewTool")({
    "type": OpenResponsesWebSearchPreviewToolType,
    "search_context_size": S.optionalWith(ResponsesSearchContextSize, { nullable: true }),
    "user_location": S.optionalWith(WebSearchPreviewToolUserLocation, { nullable: true })
  })
{}

export class OpenResponsesWebSearchPreview20250311ToolType extends S.Literal("web_search_preview_2025_03_11") {}

/**
 * Web search preview tool configuration (2025-03-11 version)
 */
export class OpenResponsesWebSearchPreview20250311Tool
  extends S.Class<OpenResponsesWebSearchPreview20250311Tool>("OpenResponsesWebSearchPreview20250311Tool")({
    "type": OpenResponsesWebSearchPreview20250311ToolType,
    "search_context_size": S.optionalWith(ResponsesSearchContextSize, { nullable: true }),
    "user_location": S.optionalWith(WebSearchPreviewToolUserLocation, { nullable: true })
  })
{}

export class OpenResponsesWebSearchToolType extends S.Literal("web_search") {}

export class ResponsesWebSearchUserLocationType extends S.Literal("approximate") {}

/**
 * User location information for web search
 */
export class ResponsesWebSearchUserLocation
  extends S.Class<ResponsesWebSearchUserLocation>("ResponsesWebSearchUserLocation")({
    "type": S.optionalWith(ResponsesWebSearchUserLocationType, { nullable: true }),
    "city": S.optionalWith(S.String, { nullable: true }),
    "country": S.optionalWith(S.String, { nullable: true }),
    "region": S.optionalWith(S.String, { nullable: true }),
    "timezone": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * Web search tool configuration
 */
export class OpenResponsesWebSearchTool extends S.Class<OpenResponsesWebSearchTool>("OpenResponsesWebSearchTool")({
  "type": OpenResponsesWebSearchToolType,
  "filters": S.optionalWith(
    S.Struct({
      "allowed_domains": S.optionalWith(S.Array(S.String), { nullable: true })
    }),
    { nullable: true }
  ),
  "search_context_size": S.optionalWith(ResponsesSearchContextSize, { nullable: true }),
  "user_location": S.optionalWith(ResponsesWebSearchUserLocation, { nullable: true })
}) {}

export class OpenResponsesWebSearch20250826ToolType extends S.Literal("web_search_2025_08_26") {}

/**
 * Web search tool configuration (2025-08-26 version)
 */
export class OpenResponsesWebSearch20250826Tool
  extends S.Class<OpenResponsesWebSearch20250826Tool>("OpenResponsesWebSearch20250826Tool")({
    "type": OpenResponsesWebSearch20250826ToolType,
    "filters": S.optionalWith(
      S.Struct({
        "allowed_domains": S.optionalWith(S.Array(S.String), { nullable: true })
      }),
      { nullable: true }
    ),
    "search_context_size": S.optionalWith(ResponsesSearchContextSize, { nullable: true }),
    "user_location": S.optionalWith(ResponsesWebSearchUserLocation, { nullable: true })
  })
{}

export class OpenAIResponsesToolChoiceEnum extends S.Literal("required") {}

export class OpenAIResponsesToolChoiceEnumType extends S.Literal("function") {}

export class OpenAIResponsesToolChoiceEnumTypeEnum extends S.Literal("web_search_preview") {}

export class OpenAIResponsesToolChoice extends S.Union(
  OpenAIResponsesToolChoiceEnum,
  OpenAIResponsesToolChoiceEnum,
  OpenAIResponsesToolChoiceEnum,
  S.Struct({
    "type": OpenAIResponsesToolChoiceEnumType,
    "name": S.String
  }),
  S.Struct({
    "type": S.Union(OpenAIResponsesToolChoiceEnumTypeEnum, OpenAIResponsesToolChoiceEnumTypeEnum)
  })
) {}

export class ResponsesFormatTextType extends S.Literal("text") {}

/**
 * Plain text response format
 */
export class ResponsesFormatText extends S.Class<ResponsesFormatText>("ResponsesFormatText")({
  "type": ResponsesFormatTextType
}) {}

export class ResponsesFormatJSONObjectType extends S.Literal("json_object") {}

/**
 * JSON object response format
 */
export class ResponsesFormatJSONObject extends S.Class<ResponsesFormatJSONObject>("ResponsesFormatJSONObject")({
  "type": ResponsesFormatJSONObjectType
}) {}

export class ResponsesFormatTextJSONSchemaConfigType extends S.Literal("json_schema") {}

/**
 * JSON schema constrained response format
 */
export class ResponsesFormatTextJSONSchemaConfig
  extends S.Class<ResponsesFormatTextJSONSchemaConfig>("ResponsesFormatTextJSONSchemaConfig")({
    "type": ResponsesFormatTextJSONSchemaConfigType,
    "name": S.String,
    "description": S.optionalWith(S.String, { nullable: true }),
    "strict": S.optionalWith(S.Boolean, { nullable: true }),
    "schema": S.Record({ key: S.String, value: S.Unknown })
  })
{}

/**
 * Text response format configuration
 */
export class ResponseFormatTextConfig
  extends S.Union(ResponsesFormatText, ResponsesFormatJSONObject, ResponsesFormatTextJSONSchemaConfig)
{}

export class OpenResponsesResponseTextVerbosity extends S.Literal("high", "low", "medium") {}

/**
 * Text output configuration including format and verbosity
 */
export class OpenResponsesResponseText extends S.Class<OpenResponsesResponseText>("OpenResponsesResponseText")({
  "format": S.optionalWith(ResponseFormatTextConfig, { nullable: true }),
  "verbosity": S.optionalWith(OpenResponsesResponseTextVerbosity, { nullable: true })
}) {}

export class OpenAIResponsesReasoningEffort extends S.Literal("xhigh", "high", "medium", "low", "minimal", "none") {}

export class ReasoningSummaryVerbosity extends S.Literal("auto", "concise", "detailed") {}

export class OpenResponsesReasoningConfig
  extends S.Class<OpenResponsesReasoningConfig>("OpenResponsesReasoningConfig")({
    "max_tokens": S.optionalWith(S.Number, { nullable: true }),
    "enabled": S.optionalWith(S.Boolean, { nullable: true }),
    "effort": S.optionalWith(OpenAIResponsesReasoningEffort, { nullable: true }),
    "summary": S.optionalWith(ReasoningSummaryVerbosity, { nullable: true })
  })
{}

export class OpenAIResponsesPrompt extends S.Class<OpenAIResponsesPrompt>("OpenAIResponsesPrompt")({
  "id": S.String,
  "variables": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class OpenAIResponsesIncludable extends S.Literal(
  "file_search_call.results",
  "message.input_image.image_url",
  "computer_call_output.output.image_url",
  "reasoning.encrypted_content",
  "code_interpreter_call.outputs"
) {}

export class OpenResponsesRequestServiceTier extends S.Literal("auto") {}

export class OpenResponsesRequestTruncationEnum extends S.Literal("auto", "disabled") {}

export class OpenResponsesRequestTruncation extends OpenResponsesRequestTruncationEnum {}

/**
 * Data collection setting. If no available model provider meets the requirement, your request will return an error.
 * - allow: (default) allow providers which store user data non-transiently and may train on it
 *
 * - deny: use only providers which do not collect user data.
 */
export class DataCollection extends S.Literal("deny", "allow") {}

export class ProviderName extends S.Literal(
  "AI21",
  "AionLabs",
  "Alibaba",
  "Amazon Bedrock",
  "Amazon Nova",
  "Anthropic",
  "Arcee AI",
  "AtlasCloud",
  "Avian",
  "Azure",
  "BaseTen",
  "BytePlus",
  "Black Forest Labs",
  "Cerebras",
  "Chutes",
  "Cirrascale",
  "Clarifai",
  "Cloudflare",
  "Cohere",
  "Crusoe",
  "DeepInfra",
  "DeepSeek",
  "Featherless",
  "Fireworks",
  "Friendli",
  "GMICloud",
  "GoPomelo",
  "Google",
  "Google AI Studio",
  "Groq",
  "Hyperbolic",
  "Inception",
  "InferenceNet",
  "Infermatic",
  "Inflection",
  "Liquid",
  "Mara",
  "Mancer 2",
  "Minimax",
  "ModelRun",
  "Mistral",
  "Modular",
  "Moonshot AI",
  "Morph",
  "NCompass",
  "Nebius",
  "NextBit",
  "Novita",
  "Nvidia",
  "OpenAI",
  "OpenInference",
  "Parasail",
  "Perplexity",
  "Phala",
  "Relace",
  "SambaNova",
  "SiliconFlow",
  "Sourceful",
  "Stealth",
  "StreamLake",
  "Switchpoint",
  "Targon",
  "Together",
  "Venice",
  "WandB",
  "Xiaomi",
  "xAI",
  "Z.AI",
  "FakeProvider"
) {}

export class Quantization extends S.Literal("int4", "int8", "fp4", "fp6", "fp8", "fp16", "bf16", "fp32", "unknown") {}

export class ProviderSort extends S.Literal("price", "throughput", "latency") {}

export class ProviderSortConfigPartitionEnum extends S.Literal("model", "none") {}

export class ProviderSortConfig extends S.Class<ProviderSortConfig>("ProviderSortConfig")({
  "by": S.optionalWith(ProviderSort, { nullable: true }),
  "partition": S.optionalWith(ProviderSortConfigPartitionEnum, { nullable: true })
}) {}

/**
 * A value in string format that is a large number
 */
export class BigNumberUnion extends S.String {}

/**
 * The search engine to use for web search.
 */
export class WebSearchEngine extends S.Literal("native", "exa") {}

/**
 * The engine to use for parsing PDF files.
 */
export class PDFParserEngine extends S.Literal("mistral-ocr", "pdf-text", "native") {}

/**
 * Options for PDF parsing.
 */
export class PDFParserOptions extends S.Class<PDFParserOptions>("PDFParserOptions")({
  "engine": S.optionalWith(PDFParserEngine, { nullable: true })
}) {}

/**
 * **DEPRECATED** Use providers.sort.partition instead. Backwards-compatible alias for providers.sort.partition. Accepts legacy values: "fallback" (maps to "model"), "sort" (maps to "none").
 */
export class OpenResponsesRequestRoute extends S.Literal("fallback", "sort") {}

/**
 * Request schema for Responses endpoint
 */
export class OpenResponsesRequest extends S.Class<OpenResponsesRequest>("OpenResponsesRequest")({
  "input": S.optionalWith(OpenResponsesInput, { nullable: true }),
  "instructions": S.optionalWith(S.String, { nullable: true }),
  "metadata": S.optionalWith(OpenResponsesRequestMetadata, { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(
      /**
       * Function tool definition
       */
      S.Struct({}),
      OpenResponsesWebSearchPreviewTool,
      OpenResponsesWebSearchPreview20250311Tool,
      OpenResponsesWebSearchTool,
      OpenResponsesWebSearch20250826Tool
    )),
    { nullable: true }
  ),
  "tool_choice": S.optionalWith(OpenAIResponsesToolChoice, { nullable: true }),
  "parallel_tool_calls": S.optionalWith(S.Boolean, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true }),
  "models": S.optionalWith(S.Array(S.String), { nullable: true }),
  "text": S.optionalWith(OpenResponsesResponseText, { nullable: true }),
  "reasoning": S.optionalWith(OpenResponsesReasoningConfig, { nullable: true }),
  "max_output_tokens": S.optionalWith(S.Number, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "top_k": S.optionalWith(S.Number, { nullable: true }),
  "prompt_cache_key": S.optionalWith(S.String, { nullable: true }),
  "previous_response_id": S.optionalWith(S.String, { nullable: true }),
  "prompt": S.optionalWith(OpenAIResponsesPrompt, { nullable: true }),
  "include": S.optionalWith(S.Array(OpenAIResponsesIncludable), { nullable: true }),
  "background": S.optionalWith(S.Boolean, { nullable: true }),
  "safety_identifier": S.optionalWith(S.String, { nullable: true }),
  "store": S.optionalWith(S.Literal(false), { nullable: true, default: () => false as const }),
  "service_tier": S.optionalWith(OpenResponsesRequestServiceTier, { nullable: true, default: () => "auto" as const }),
  "truncation": S.optionalWith(OpenResponsesRequestTruncation, { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
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
      "data_collection": S.optionalWith(DataCollection, { nullable: true }),
      /**
       * Whether to restrict routing to only ZDR (Zero Data Retention) endpoints. When true, only endpoints that do not retain prompts will be used.
       */
      "zdr": S.optionalWith(S.Boolean, { nullable: true }),
      /**
       * Whether to restrict routing to only models that allow text distillation. When true, only models where the author has allowed distillation will be used.
       */
      "enforce_distillable_text": S.optionalWith(S.Boolean, { nullable: true }),
      /**
       * An ordered list of provider slugs. The router will attempt to use the first provider in the subset of this list that supports your requested model, and fall back to the next if it is unavailable. If no providers are available, the request will fail with an error message.
       */
      "order": S.optionalWith(S.Array(S.Union(ProviderName, S.String)), { nullable: true }),
      /**
       * List of provider slugs to allow. If provided, this list is merged with your account-wide allowed provider settings for this request.
       */
      "only": S.optionalWith(S.Array(S.Union(ProviderName, S.String)), { nullable: true }),
      /**
       * List of provider slugs to ignore. If provided, this list is merged with your account-wide ignored provider settings for this request.
       */
      "ignore": S.optionalWith(S.Array(S.Union(ProviderName, S.String)), { nullable: true }),
      /**
       * A list of quantization levels to filter the provider by.
       */
      "quantizations": S.optionalWith(S.Array(Quantization), { nullable: true }),
      /**
       * The sorting strategy to use for this request, if "order" is not specified. When set, no load balancing is performed.
       */
      "sort": S.optionalWith(S.Union(ProviderSort, ProviderSortConfig), { nullable: true }),
      /**
       * The object specifying the maximum price you want to pay for this request. USD price per million tokens, for prompt and completion.
       */
      "max_price": S.optionalWith(
        S.Struct({
          "prompt": S.optionalWith(BigNumberUnion, { nullable: true }),
          "completion": S.optionalWith(BigNumberUnion, { nullable: true }),
          "image": S.optionalWith(BigNumberUnion, { nullable: true }),
          "audio": S.optionalWith(BigNumberUnion, { nullable: true }),
          "request": S.optionalWith(BigNumberUnion, { nullable: true })
        }),
        { nullable: true }
      ),
      /**
       * Preferred minimum throughput (in tokens per second). Endpoints below this threshold may still be used, but are deprioritized in routing. When using fallback models, this may cause a fallback model to be used instead of the primary model if it meets the threshold.
       */
      "preferred_min_throughput": S.optionalWith(S.Number, { nullable: true }),
      /**
       * Preferred maximum latency (in seconds). Endpoints above this threshold may still be used, but are deprioritized in routing. When using fallback models, this may cause a fallback model to be used instead of the primary model if it meets the threshold.
       */
      "preferred_max_latency": S.optionalWith(S.Number, { nullable: true }),
      /**
       * **DEPRECATED** Use preferred_min_throughput instead. Backwards-compatible alias for preferred_min_throughput.
       */
      "min_throughput": S.optionalWith(S.Number, { nullable: true }),
      /**
       * **DEPRECATED** Use preferred_max_latency instead. Backwards-compatible alias for preferred_max_latency.
       */
      "max_latency": S.optionalWith(S.Number, { nullable: true })
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
        /**
         * Set to false to disable the web-search plugin for this request. Defaults to true.
         */
        "enabled": S.optionalWith(S.Boolean, { nullable: true }),
        "max_results": S.optionalWith(S.Number, { nullable: true }),
        "search_prompt": S.optionalWith(S.String, { nullable: true }),
        "engine": S.optionalWith(WebSearchEngine, { nullable: true })
      }),
      S.Struct({
        "id": S.Literal("file-parser"),
        /**
         * Set to false to disable the file-parser plugin for this request. Defaults to true.
         */
        "enabled": S.optionalWith(S.Boolean, { nullable: true }),
        "pdf": S.optionalWith(PDFParserOptions, { nullable: true })
      }),
      S.Struct({
        "id": S.Literal("response-healing"),
        /**
         * Set to false to disable the response-healing plugin for this request. Defaults to true.
         */
        "enabled": S.optionalWith(S.Boolean, { nullable: true })
      })
    )),
    { nullable: true }
  ),
  /**
   * **DEPRECATED** Use providers.sort.partition instead. Backwards-compatible alias for providers.sort.partition. Accepts legacy values: "fallback" (maps to "model"), "sort" (maps to "none").
   */
  "route": S.optionalWith(OpenResponsesRequestRoute, { nullable: true }),
  /**
   * A unique identifier representing your end-user, which helps distinguish between different users of your app. This allows your app to identify specific users in case of abuse reports, preventing your entire app from being affected by the actions of individual users. Maximum of 128 characters.
   */
  "user": S.optionalWith(S.String.pipe(S.maxLength(128)), { nullable: true }),
  /**
   * A unique identifier for grouping related requests (e.g., a conversation or agent workflow) for observability. If provided in both the request body and the x-session-id header, the body value takes precedence. Maximum of 128 characters.
   */
  "session_id": S.optionalWith(S.String.pipe(S.maxLength(128)), { nullable: true })
}) {}

export class OutputMessageRole extends S.Literal("assistant") {}

export class OutputMessageType extends S.Literal("message") {}

export class OutputMessageStatusEnum extends S.Literal("in_progress") {}

export class OutputMessage extends S.Class<OutputMessage>("OutputMessage")({
  "id": S.String,
  "role": OutputMessageRole,
  "type": OutputMessageType,
  "status": S.optionalWith(S.Union(OutputMessageStatusEnum, OutputMessageStatusEnum, OutputMessageStatusEnum), {
    nullable: true
  }),
  "content": S.Array(S.Union(ResponseOutputText, OpenAIResponsesRefusalContent))
}) {}

export class OutputItemReasoningType extends S.Literal("reasoning") {}

export class OutputItemReasoningStatusEnum extends S.Literal("in_progress") {}

export class OutputItemReasoning extends S.Class<OutputItemReasoning>("OutputItemReasoning")({
  "type": OutputItemReasoningType,
  "id": S.String,
  "content": S.optionalWith(S.Array(ReasoningTextContent), { nullable: true }),
  "summary": S.Array(ReasoningSummaryText),
  "encrypted_content": S.optionalWith(S.String, { nullable: true }),
  "status": S.optionalWith(
    S.Union(OutputItemReasoningStatusEnum, OutputItemReasoningStatusEnum, OutputItemReasoningStatusEnum),
    { nullable: true }
  )
}) {}

export class OutputItemFunctionCallType extends S.Literal("function_call") {}

export class OutputItemFunctionCallStatusEnum extends S.Literal("in_progress") {}

export class OutputItemFunctionCall extends S.Class<OutputItemFunctionCall>("OutputItemFunctionCall")({
  "type": OutputItemFunctionCallType,
  "id": S.optionalWith(S.String, { nullable: true }),
  "name": S.String,
  "arguments": S.String,
  "call_id": S.String,
  "status": S.optionalWith(
    S.Union(OutputItemFunctionCallStatusEnum, OutputItemFunctionCallStatusEnum, OutputItemFunctionCallStatusEnum),
    { nullable: true }
  )
}) {}

export class OutputItemWebSearchCallType extends S.Literal("web_search_call") {}

export class OutputItemWebSearchCall extends S.Class<OutputItemWebSearchCall>("OutputItemWebSearchCall")({
  "type": OutputItemWebSearchCallType,
  "id": S.String,
  "status": WebSearchStatus
}) {}

export class OutputItemFileSearchCallType extends S.Literal("file_search_call") {}

export class OutputItemFileSearchCall extends S.Class<OutputItemFileSearchCall>("OutputItemFileSearchCall")({
  "type": OutputItemFileSearchCallType,
  "id": S.String,
  "queries": S.Array(S.String),
  "status": WebSearchStatus
}) {}

export class OutputItemImageGenerationCallType extends S.Literal("image_generation_call") {}

export class OutputItemImageGenerationCall
  extends S.Class<OutputItemImageGenerationCall>("OutputItemImageGenerationCall")({
    "type": OutputItemImageGenerationCallType,
    "id": S.String,
    "result": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "status": ImageGenerationStatus
  })
{}

export class OpenAIResponsesUsage extends S.Class<OpenAIResponsesUsage>("OpenAIResponsesUsage")({
  "input_tokens": S.Number,
  "input_tokens_details": S.Struct({
    "cached_tokens": S.Number
  }),
  "output_tokens": S.Number,
  "output_tokens_details": S.Struct({
    "reasoning_tokens": S.Number
  }),
  "total_tokens": S.Number
}) {}

export class OpenResponsesNonStreamingResponseObject extends S.Literal("response") {}

export class OpenAIResponsesResponseStatus
  extends S.Literal("completed", "incomplete", "in_progress", "failed", "cancelled", "queued")
{}

export class ResponsesErrorFieldCode extends S.Literal(
  "server_error",
  "rate_limit_exceeded",
  "invalid_prompt",
  "vector_store_timeout",
  "invalid_image",
  "invalid_image_format",
  "invalid_base64_image",
  "invalid_image_url",
  "image_too_large",
  "image_too_small",
  "image_parse_error",
  "image_content_policy_violation",
  "invalid_image_mode",
  "image_file_too_large",
  "unsupported_image_media_type",
  "empty_image_file",
  "failed_to_download_image",
  "image_file_not_found"
) {}

/**
 * Error information returned from the API
 */
export class ResponsesErrorField extends S.Class<ResponsesErrorField>("ResponsesErrorField")({
  "code": ResponsesErrorFieldCode,
  "message": S.String
}) {}

export class OpenAIResponsesIncompleteDetailsReason extends S.Literal("max_output_tokens", "content_filter") {}

export class OpenAIResponsesIncompleteDetails
  extends S.Class<OpenAIResponsesIncompleteDetails>("OpenAIResponsesIncompleteDetails")({
    "reason": S.optionalWith(OpenAIResponsesIncompleteDetailsReason, { nullable: true })
  })
{}

export class OpenAIResponsesInput extends S.Union(
  S.String,
  S.Array(S.Union(
    S.Struct({
      "type": S.optionalWith(S.Literal("message"), { nullable: true }),
      "role": S.Union(S.Literal("user"), S.Literal("system"), S.Literal("assistant"), S.Literal("developer")),
      "content": S.Union(
        S.Array(S.Union(ResponseInputText, ResponseInputImage, ResponseInputFile, ResponseInputAudio)),
        S.String
      )
    }),
    S.Struct({
      "id": S.String,
      "type": S.optionalWith(S.Literal("message"), { nullable: true }),
      "role": S.Union(S.Literal("user"), S.Literal("system"), S.Literal("developer")),
      "content": S.Array(S.Union(ResponseInputText, ResponseInputImage, ResponseInputFile, ResponseInputAudio))
    }),
    S.Struct({
      "type": S.Literal("function_call_output"),
      "id": S.optionalWith(S.String, { nullable: true }),
      "call_id": S.String,
      "output": S.String,
      "status": S.optionalWith(ToolCallStatus, { nullable: true })
    }),
    S.Struct({
      "type": S.Literal("function_call"),
      "call_id": S.String,
      "name": S.String,
      "arguments": S.String,
      "id": S.optionalWith(S.String, { nullable: true }),
      "status": S.optionalWith(ToolCallStatus, { nullable: true })
    }),
    OutputItemImageGenerationCall,
    OutputMessage
  ))
) {}

export class OpenAIResponsesReasoningConfig
  extends S.Class<OpenAIResponsesReasoningConfig>("OpenAIResponsesReasoningConfig")({
    "effort": S.optionalWith(OpenAIResponsesReasoningEffort, { nullable: true }),
    "summary": S.optionalWith(ReasoningSummaryVerbosity, { nullable: true })
  })
{}

export class OpenAIResponsesServiceTier extends S.Literal("auto", "default", "flex", "priority", "scale") {}

export class OpenAIResponsesTruncation extends S.Literal("auto", "disabled") {}

export class ResponseTextConfigVerbosity extends S.Literal("high", "low", "medium") {}

/**
 * Text output configuration including format and verbosity
 */
export class ResponseTextConfig extends S.Class<ResponseTextConfig>("ResponseTextConfig")({
  "format": S.optionalWith(ResponseFormatTextConfig, { nullable: true }),
  "verbosity": S.optionalWith(ResponseTextConfigVerbosity, { nullable: true })
}) {}

export class OpenResponsesNonStreamingResponse
  extends S.Class<OpenResponsesNonStreamingResponse>("OpenResponsesNonStreamingResponse")({
    "output": S.Array(
      S.Union(
        OutputMessage,
        OutputItemReasoning,
        OutputItemFunctionCall,
        OutputItemWebSearchCall,
        OutputItemFileSearchCall,
        OutputItemImageGenerationCall
      )
    ),
    "usage": S.optionalWith(OpenAIResponsesUsage, { nullable: true }),
    "id": S.String,
    "object": OpenResponsesNonStreamingResponseObject,
    "created_at": S.Number,
    "model": S.String,
    "status": S.optionalWith(OpenAIResponsesResponseStatus, { nullable: true }),
    "user": S.optionalWith(S.String, { nullable: true }),
    "output_text": S.optionalWith(S.String, { nullable: true }),
    "prompt_cache_key": S.optionalWith(S.String, { nullable: true }),
    "safety_identifier": S.optionalWith(S.String, { nullable: true }),
    "error": S.NullOr(ResponsesErrorField),
    "incomplete_details": S.NullOr(OpenAIResponsesIncompleteDetails),
    "max_tool_calls": S.optionalWith(S.Number, { nullable: true }),
    "top_logprobs": S.optionalWith(S.Number, { nullable: true }),
    "max_output_tokens": S.optionalWith(S.Number, { nullable: true }),
    "temperature": S.NullOr(S.Number),
    "top_p": S.NullOr(S.Number),
    "instructions": OpenAIResponsesInput,
    "metadata": S.NullOr(OpenResponsesRequestMetadata),
    "tools": S.Array(S.Union(
      /**
       * Function tool definition
       */
      S.Struct({}),
      OpenResponsesWebSearchPreviewTool,
      OpenResponsesWebSearchPreview20250311Tool,
      OpenResponsesWebSearchTool,
      OpenResponsesWebSearch20250826Tool
    )),
    "tool_choice": OpenAIResponsesToolChoice,
    "parallel_tool_calls": S.Boolean,
    "prompt": S.optionalWith(OpenAIResponsesPrompt, { nullable: true }),
    "background": S.optionalWith(S.Boolean, { nullable: true }),
    "previous_response_id": S.optionalWith(S.String, { nullable: true }),
    "reasoning": S.optionalWith(OpenAIResponsesReasoningConfig, { nullable: true }),
    "service_tier": S.optionalWith(OpenAIResponsesServiceTier, { nullable: true }),
    "store": S.optionalWith(S.Boolean, { nullable: true }),
    "truncation": S.optionalWith(OpenAIResponsesTruncation, { nullable: true }),
    "text": S.optionalWith(ResponseTextConfig, { nullable: true })
  })
{}

/**
 * Error data for BadRequestResponse
 */
export class BadRequestResponseErrorData extends S.Class<BadRequestResponseErrorData>("BadRequestResponseErrorData")({
  "code": S.Int,
  "message": S.String,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * Bad Request - Invalid request parameters or malformed input
 */
export class BadRequestResponse extends S.Class<BadRequestResponse>("BadRequestResponse")({
  "error": BadRequestResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for UnauthorizedResponse
 */
export class UnauthorizedResponseErrorData
  extends S.Class<UnauthorizedResponseErrorData>("UnauthorizedResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Unauthorized - Authentication required or invalid credentials
 */
export class UnauthorizedResponse extends S.Class<UnauthorizedResponse>("UnauthorizedResponse")({
  "error": UnauthorizedResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for PaymentRequiredResponse
 */
export class PaymentRequiredResponseErrorData
  extends S.Class<PaymentRequiredResponseErrorData>("PaymentRequiredResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Payment Required - Insufficient credits or quota to complete request
 */
export class PaymentRequiredResponse extends S.Class<PaymentRequiredResponse>("PaymentRequiredResponse")({
  "error": PaymentRequiredResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for NotFoundResponse
 */
export class NotFoundResponseErrorData extends S.Class<NotFoundResponseErrorData>("NotFoundResponseErrorData")({
  "code": S.Int,
  "message": S.String,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * Not Found - Resource does not exist
 */
export class NotFoundResponse extends S.Class<NotFoundResponse>("NotFoundResponse")({
  "error": NotFoundResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for RequestTimeoutResponse
 */
export class RequestTimeoutResponseErrorData
  extends S.Class<RequestTimeoutResponseErrorData>("RequestTimeoutResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Request Timeout - Operation exceeded time limit
 */
export class RequestTimeoutResponse extends S.Class<RequestTimeoutResponse>("RequestTimeoutResponse")({
  "error": RequestTimeoutResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for PayloadTooLargeResponse
 */
export class PayloadTooLargeResponseErrorData
  extends S.Class<PayloadTooLargeResponseErrorData>("PayloadTooLargeResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Payload Too Large - Request payload exceeds size limits
 */
export class PayloadTooLargeResponse extends S.Class<PayloadTooLargeResponse>("PayloadTooLargeResponse")({
  "error": PayloadTooLargeResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for UnprocessableEntityResponse
 */
export class UnprocessableEntityResponseErrorData
  extends S.Class<UnprocessableEntityResponseErrorData>("UnprocessableEntityResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Unprocessable Entity - Semantic validation failure
 */
export class UnprocessableEntityResponse extends S.Class<UnprocessableEntityResponse>("UnprocessableEntityResponse")({
  "error": UnprocessableEntityResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for TooManyRequestsResponse
 */
export class TooManyRequestsResponseErrorData
  extends S.Class<TooManyRequestsResponseErrorData>("TooManyRequestsResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Too Many Requests - Rate limit exceeded
 */
export class TooManyRequestsResponse extends S.Class<TooManyRequestsResponse>("TooManyRequestsResponse")({
  "error": TooManyRequestsResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for InternalServerResponse
 */
export class InternalServerResponseErrorData
  extends S.Class<InternalServerResponseErrorData>("InternalServerResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Internal Server Error - Unexpected server error
 */
export class InternalServerResponse extends S.Class<InternalServerResponse>("InternalServerResponse")({
  "error": InternalServerResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for BadGatewayResponse
 */
export class BadGatewayResponseErrorData extends S.Class<BadGatewayResponseErrorData>("BadGatewayResponseErrorData")({
  "code": S.Int,
  "message": S.String,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * Bad Gateway - Provider/upstream API failure
 */
export class BadGatewayResponse extends S.Class<BadGatewayResponse>("BadGatewayResponse")({
  "error": BadGatewayResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for ServiceUnavailableResponse
 */
export class ServiceUnavailableResponseErrorData
  extends S.Class<ServiceUnavailableResponseErrorData>("ServiceUnavailableResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableResponse extends S.Class<ServiceUnavailableResponse>("ServiceUnavailableResponse")({
  "error": ServiceUnavailableResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for EdgeNetworkTimeoutResponse
 */
export class EdgeNetworkTimeoutResponseErrorData
  extends S.Class<EdgeNetworkTimeoutResponseErrorData>("EdgeNetworkTimeoutResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Infrastructure Timeout - Provider request timed out at edge network
 */
export class EdgeNetworkTimeoutResponse extends S.Class<EdgeNetworkTimeoutResponse>("EdgeNetworkTimeoutResponse")({
  "error": EdgeNetworkTimeoutResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Error data for ProviderOverloadedResponse
 */
export class ProviderOverloadedResponseErrorData
  extends S.Class<ProviderOverloadedResponseErrorData>("ProviderOverloadedResponseErrorData")({
    "code": S.Int,
    "message": S.String,
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * Provider Overloaded - Provider is temporarily overloaded
 */
export class ProviderOverloadedResponse extends S.Class<ProviderOverloadedResponse>("ProviderOverloadedResponse")({
  "error": ProviderOverloadedResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class GetUserActivityParams extends S.Struct({
  /**
   * Filter by a single UTC date in the last 30 days (YYYY-MM-DD format).
   */
  "date": S.optionalWith(S.String, { nullable: true })
}) {}

export class ActivityItem extends S.Class<ActivityItem>("ActivityItem")({
  /**
   * Date of the activity (YYYY-MM-DD format)
   */
  "date": S.String,
  /**
   * Model slug (e.g., "openai/gpt-4.1")
   */
  "model": S.String,
  /**
   * Model permaslug (e.g., "openai/gpt-4.1-2025-04-14")
   */
  "model_permaslug": S.String,
  /**
   * Unique identifier for the endpoint
   */
  "endpoint_id": S.String,
  /**
   * Name of the provider serving this endpoint
   */
  "provider_name": S.String,
  /**
   * Total cost in USD (OpenRouter credits spent)
   */
  "usage": S.Number,
  /**
   * BYOK inference cost in USD (external credits spent)
   */
  "byok_usage_inference": S.Number,
  /**
   * Number of requests made
   */
  "requests": S.Number,
  /**
   * Total prompt tokens used
   */
  "prompt_tokens": S.Number,
  /**
   * Total completion tokens generated
   */
  "completion_tokens": S.Number,
  /**
   * Total reasoning tokens used
   */
  "reasoning_tokens": S.Number
}) {}

export class GetUserActivity200 extends S.Struct({
  /**
   * List of activity items
   */
  "data": S.Array(ActivityItem)
}) {}

/**
 * Error data for ForbiddenResponse
 */
export class ForbiddenResponseErrorData extends S.Class<ForbiddenResponseErrorData>("ForbiddenResponseErrorData")({
  "code": S.Int,
  "message": S.String,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * Forbidden - Authentication successful but insufficient permissions
 */
export class ForbiddenResponse extends S.Class<ForbiddenResponse>("ForbiddenResponse")({
  "error": ForbiddenResponseErrorData,
  "user_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Total credits purchased and used
 */
export class GetCredits200 extends S.Struct({
  "data": S.Struct({
    /**
     * Total credits purchased
     */
    "total_credits": S.Number,
    /**
     * Total credits used
     */
    "total_usage": S.Number
  })
}) {}

export class CreateChargeRequestChainId extends S.Literal(1, 137, 8453) {}

/**
 * Create a Coinbase charge for crypto payment
 */
export class CreateChargeRequest extends S.Class<CreateChargeRequest>("CreateChargeRequest")({
  "amount": S.Number,
  "sender": S.String,
  "chain_id": CreateChargeRequestChainId
}) {}

export class CreateCoinbaseCharge200 extends S.Struct({
  "data": S.Struct({
    "id": S.String,
    "created_at": S.String,
    "expires_at": S.String,
    "web3_data": S.Struct({
      "transfer_intent": S.Struct({
        "call_data": S.Struct({
          "deadline": S.String,
          "fee_amount": S.String,
          "id": S.String,
          "operator": S.String,
          "prefix": S.String,
          "recipient": S.String,
          "recipient_amount": S.String,
          "recipient_currency": S.String,
          "refund_destination": S.String,
          "signature": S.String
        }),
        "metadata": S.Struct({
          "chain_id": S.Number,
          "contract_address": S.String,
          "sender": S.String
        })
      })
    })
  })
}) {}

export class CreateEmbeddingsRequestEncodingFormat extends S.Literal("float", "base64") {}

/**
 * The sorting strategy to use for this request, if "order" is not specified. When set, no load balancing is performed.
 */
export class ProviderPreferencesSort extends S.Literal("price", "throughput", "latency") {}

/**
 * Provider routing preferences for the request.
 */
export class ProviderPreferences extends S.Class<ProviderPreferences>("ProviderPreferences")({
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
  "data_collection": S.optionalWith(DataCollection, { nullable: true }),
  /**
   * Whether to restrict routing to only ZDR (Zero Data Retention) endpoints. When true, only endpoints that do not retain prompts will be used.
   */
  "zdr": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Whether to restrict routing to only models that allow text distillation. When true, only models where the author has allowed distillation will be used.
   */
  "enforce_distillable_text": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * An ordered list of provider slugs. The router will attempt to use the first provider in the subset of this list that supports your requested model, and fall back to the next if it is unavailable. If no providers are available, the request will fail with an error message.
   */
  "order": S.optionalWith(S.Array(S.Union(ProviderName, S.String)), { nullable: true }),
  /**
   * List of provider slugs to allow. If provided, this list is merged with your account-wide allowed provider settings for this request.
   */
  "only": S.optionalWith(S.Array(S.Union(ProviderName, S.String)), { nullable: true }),
  /**
   * List of provider slugs to ignore. If provided, this list is merged with your account-wide ignored provider settings for this request.
   */
  "ignore": S.optionalWith(S.Array(S.Union(ProviderName, S.String)), { nullable: true }),
  /**
   * A list of quantization levels to filter the provider by.
   */
  "quantizations": S.optionalWith(S.Array(Quantization), { nullable: true }),
  "sort": S.optionalWith(ProviderPreferencesSort, { nullable: true }),
  /**
   * The object specifying the maximum price you want to pay for this request. USD price per million tokens, for prompt and completion.
   */
  "max_price": S.optionalWith(
    S.Struct({
      "prompt": S.optionalWith(BigNumberUnion, { nullable: true }),
      "completion": S.optionalWith(BigNumberUnion, { nullable: true }),
      "image": S.optionalWith(BigNumberUnion, { nullable: true }),
      "audio": S.optionalWith(BigNumberUnion, { nullable: true }),
      "request": S.optionalWith(BigNumberUnion, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * Preferred minimum throughput (in tokens per second). Endpoints below this threshold may still be used, but are deprioritized in routing. When using fallback models, this may cause a fallback model to be used instead of the primary model if it meets the threshold.
   */
  "preferred_min_throughput": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Preferred maximum latency (in seconds). Endpoints above this threshold may still be used, but are deprioritized in routing. When using fallback models, this may cause a fallback model to be used instead of the primary model if it meets the threshold.
   */
  "preferred_max_latency": S.optionalWith(S.Number, { nullable: true }),
  /**
   * **DEPRECATED** Use preferred_min_throughput instead. Backwards-compatible alias for preferred_min_throughput.
   */
  "min_throughput": S.optionalWith(S.Number, { nullable: true }),
  /**
   * **DEPRECATED** Use preferred_max_latency instead. Backwards-compatible alias for preferred_max_latency.
   */
  "max_latency": S.optionalWith(S.Number, { nullable: true })
}) {}

export class CreateEmbeddingsRequest extends S.Class<CreateEmbeddingsRequest>("CreateEmbeddingsRequest")({
  "input": S.Union(
    S.String,
    S.Array(S.String),
    S.Array(S.Number),
    S.Array(S.Array(S.Number)),
    S.Array(S.Struct({
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
    }))
  ),
  "model": S.String,
  "encoding_format": S.optionalWith(CreateEmbeddingsRequestEncodingFormat, { nullable: true }),
  "dimensions": S.optionalWith(S.Int.pipe(S.greaterThan(0)), { nullable: true }),
  "user": S.optionalWith(S.String, { nullable: true }),
  "provider": S.optionalWith(ProviderPreferences, { nullable: true }),
  "input_type": S.optionalWith(S.String, { nullable: true })
}) {}

export class CreateEmbeddings200Object extends S.Literal("list") {}

export class CreateEmbeddings200 extends S.Struct({
  "id": S.optionalWith(S.String, { nullable: true }),
  "object": CreateEmbeddings200Object,
  "data": S.Array(S.Struct({
    "object": S.Literal("embedding"),
    "embedding": S.Union(S.Array(S.Number), S.String),
    "index": S.optionalWith(S.Number, { nullable: true })
  })),
  "model": S.String,
  "usage": S.optionalWith(
    S.Struct({
      "prompt_tokens": S.Number,
      "total_tokens": S.Number,
      "cost": S.optionalWith(S.Number, { nullable: true })
    }),
    { nullable: true }
  )
}) {}

/**
 * Pricing information for the model
 */
export class PublicPricing extends S.Class<PublicPricing>("PublicPricing")({
  "prompt": BigNumberUnion,
  "completion": BigNumberUnion,
  "request": S.optionalWith(BigNumberUnion, { nullable: true }),
  "image": S.optionalWith(BigNumberUnion, { nullable: true }),
  "image_token": S.optionalWith(BigNumberUnion, { nullable: true }),
  "image_output": S.optionalWith(BigNumberUnion, { nullable: true }),
  "audio": S.optionalWith(BigNumberUnion, { nullable: true }),
  "input_audio_cache": S.optionalWith(BigNumberUnion, { nullable: true }),
  "web_search": S.optionalWith(BigNumberUnion, { nullable: true }),
  "internal_reasoning": S.optionalWith(BigNumberUnion, { nullable: true }),
  "input_cache_read": S.optionalWith(BigNumberUnion, { nullable: true }),
  "input_cache_write": S.optionalWith(BigNumberUnion, { nullable: true }),
  "discount": S.optionalWith(S.Number, { nullable: true })
}) {}

/**
 * Tokenizer type used by the model
 */
export class ModelGroup extends S.Literal(
  "Router",
  "Media",
  "Other",
  "GPT",
  "Claude",
  "Gemini",
  "Grok",
  "Cohere",
  "Nova",
  "Qwen",
  "Yi",
  "DeepSeek",
  "Mistral",
  "Llama2",
  "Llama3",
  "Llama4",
  "PaLM",
  "RWKV",
  "Qwen3"
) {}

/**
 * Instruction format type
 */
export class ModelArchitectureInstructType extends S.Literal(
  "none",
  "airoboros",
  "alpaca",
  "alpaca-modif",
  "chatml",
  "claude",
  "code-llama",
  "gemma",
  "llama2",
  "llama3",
  "mistral",
  "nemotron",
  "neural",
  "openchat",
  "phi3",
  "rwkv",
  "vicuna",
  "zephyr",
  "deepseek-r1",
  "deepseek-v3.1",
  "qwq",
  "qwen3"
) {}

export class InputModality extends S.Literal("text", "image", "file", "audio", "video") {}

export class OutputModality extends S.Literal("text", "image", "embeddings") {}

/**
 * Model architecture information
 */
export class ModelArchitecture extends S.Class<ModelArchitecture>("ModelArchitecture")({
  "tokenizer": S.optionalWith(ModelGroup, { nullable: true }),
  /**
   * Instruction format type
   */
  "instruct_type": S.optionalWith(ModelArchitectureInstructType, { nullable: true }),
  /**
   * Primary modality of the model
   */
  "modality": S.NullOr(S.String),
  /**
   * Supported input modalities
   */
  "input_modalities": S.Array(InputModality),
  /**
   * Supported output modalities
   */
  "output_modalities": S.Array(OutputModality)
}) {}

/**
 * Information about the top provider for this model
 */
export class TopProviderInfo extends S.Class<TopProviderInfo>("TopProviderInfo")({
  /**
   * Context length from the top provider
   */
  "context_length": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Maximum completion tokens from the top provider
   */
  "max_completion_tokens": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Whether the top provider moderates content
   */
  "is_moderated": S.Boolean
}) {}

/**
 * Per-request token limits
 */
export class PerRequestLimits extends S.Class<PerRequestLimits>("PerRequestLimits")({
  /**
   * Maximum prompt tokens per request
   */
  "prompt_tokens": S.Number,
  /**
   * Maximum completion tokens per request
   */
  "completion_tokens": S.Number
}) {}

export class Parameter extends S.Literal(
  "temperature",
  "top_p",
  "top_k",
  "min_p",
  "top_a",
  "frequency_penalty",
  "presence_penalty",
  "repetition_penalty",
  "max_tokens",
  "logit_bias",
  "logprobs",
  "top_logprobs",
  "seed",
  "response_format",
  "structured_outputs",
  "stop",
  "tools",
  "tool_choice",
  "parallel_tool_calls",
  "include_reasoning",
  "reasoning",
  "reasoning_effort",
  "web_search_options",
  "verbosity"
) {}

/**
 * Default parameters for this model
 */
export class DefaultParameters extends S.Class<DefaultParameters>("DefaultParameters")({
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "frequency_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true
  })
}) {}

/**
 * Information about an AI model available on OpenRouter
 */
export class Model extends S.Class<Model>("Model")({
  /**
   * Unique identifier for the model
   */
  "id": S.String,
  /**
   * Canonical slug for the model
   */
  "canonical_slug": S.String,
  /**
   * Hugging Face model identifier, if applicable
   */
  "hugging_face_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Display name of the model
   */
  "name": S.String,
  /**
   * Unix timestamp of when the model was created
   */
  "created": S.Number,
  /**
   * Description of the model
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  "pricing": PublicPricing,
  /**
   * Maximum context length in tokens
   */
  "context_length": S.NullOr(S.Number),
  "architecture": ModelArchitecture,
  "top_provider": TopProviderInfo,
  "per_request_limits": S.NullOr(PerRequestLimits),
  /**
   * List of supported parameters for this model
   */
  "supported_parameters": S.Array(Parameter),
  "default_parameters": S.NullOr(DefaultParameters)
}) {}

/**
 * List of available models
 */
export class ModelsListResponseData extends S.Array(Model) {}

/**
 * List of available models
 */
export class ModelsListResponse extends S.Class<ModelsListResponse>("ModelsListResponse")({
  "data": ModelsListResponseData
}) {}

export class GetGenerationParams extends S.Struct({
  "id": S.String.pipe(S.minLength(1))
}) {}

/**
 * Type of API used for the generation
 */
export class GetGeneration200DataApiType extends S.Literal("completions", "embeddings") {}

/**
 * Generation response
 */
export class GetGeneration200 extends S.Struct({
  /**
   * Generation data
   */
  "data": S.Struct({
    /**
     * Unique identifier for the generation
     */
    "id": S.String,
    /**
     * Upstream provider's identifier for this generation
     */
    "upstream_id": S.NullOr(S.String),
    /**
     * Total cost of the generation in USD
     */
    "total_cost": S.Number,
    /**
     * Discount applied due to caching
     */
    "cache_discount": S.NullOr(S.Number),
    /**
     * Cost charged by the upstream provider
     */
    "upstream_inference_cost": S.NullOr(S.Number),
    /**
     * ISO 8601 timestamp of when the generation was created
     */
    "created_at": S.String,
    /**
     * Model used for the generation
     */
    "model": S.String,
    /**
     * ID of the app that made the request
     */
    "app_id": S.NullOr(S.Number),
    /**
     * Whether the response was streamed
     */
    "streamed": S.NullOr(S.Boolean),
    /**
     * Whether the generation was cancelled
     */
    "cancelled": S.NullOr(S.Boolean),
    /**
     * Name of the provider that served the request
     */
    "provider_name": S.NullOr(S.String),
    /**
     * Total latency in milliseconds
     */
    "latency": S.NullOr(S.Number),
    /**
     * Moderation latency in milliseconds
     */
    "moderation_latency": S.NullOr(S.Number),
    /**
     * Time taken for generation in milliseconds
     */
    "generation_time": S.NullOr(S.Number),
    /**
     * Reason the generation finished
     */
    "finish_reason": S.NullOr(S.String),
    /**
     * Number of tokens in the prompt
     */
    "tokens_prompt": S.NullOr(S.Number),
    /**
     * Number of tokens in the completion
     */
    "tokens_completion": S.NullOr(S.Number),
    /**
     * Native prompt tokens as reported by provider
     */
    "native_tokens_prompt": S.NullOr(S.Number),
    /**
     * Native completion tokens as reported by provider
     */
    "native_tokens_completion": S.NullOr(S.Number),
    /**
     * Native completion image tokens as reported by provider
     */
    "native_tokens_completion_images": S.NullOr(S.Number),
    /**
     * Native reasoning tokens as reported by provider
     */
    "native_tokens_reasoning": S.NullOr(S.Number),
    /**
     * Native cached tokens as reported by provider
     */
    "native_tokens_cached": S.NullOr(S.Number),
    /**
     * Number of media items in the prompt
     */
    "num_media_prompt": S.NullOr(S.Number),
    /**
     * Number of audio inputs in the prompt
     */
    "num_input_audio_prompt": S.NullOr(S.Number),
    /**
     * Number of media items in the completion
     */
    "num_media_completion": S.NullOr(S.Number),
    /**
     * Number of search results included
     */
    "num_search_results": S.NullOr(S.Number),
    /**
     * Origin URL of the request
     */
    "origin": S.String,
    /**
     * Usage amount in USD
     */
    "usage": S.Number,
    /**
     * Whether this used bring-your-own-key
     */
    "is_byok": S.Boolean,
    /**
     * Native finish reason as reported by provider
     */
    "native_finish_reason": S.NullOr(S.String),
    /**
     * External user identifier
     */
    "external_user": S.NullOr(S.String),
    /**
     * Type of API used for the generation
     */
    "api_type": S.NullOr(GetGeneration200DataApiType)
  })
}) {}

/**
 * Model count data
 */
export class ModelsCountResponse extends S.Class<ModelsCountResponse>("ModelsCountResponse")({
  /**
   * Model count data
   */
  "data": S.Struct({
    /**
     * Total number of available models
     */
    "count": S.Number
  })
}) {}

export class GetModelsParams extends S.Struct({
  "category": S.optionalWith(S.String, { nullable: true }),
  "supported_parameters": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Instruction format type
 */
export class ListEndpointsResponseArchitectureEnumInstructType extends S.Literal(
  "none",
  "airoboros",
  "alpaca",
  "alpaca-modif",
  "chatml",
  "claude",
  "code-llama",
  "gemma",
  "llama2",
  "llama3",
  "mistral",
  "nemotron",
  "neural",
  "openchat",
  "phi3",
  "rwkv",
  "vicuna",
  "zephyr",
  "deepseek-r1",
  "deepseek-v3.1",
  "qwq",
  "qwen3"
) {}

/**
 * Model architecture information
 */
export class ListEndpointsResponseArchitecture extends S.Struct({
  "tokenizer": ModelGroup,
  /**
   * Instruction format type
   */
  "instruct_type": S.NullOr(
    S.Literal(
      "none",
      "airoboros",
      "alpaca",
      "alpaca-modif",
      "chatml",
      "claude",
      "code-llama",
      "gemma",
      "llama2",
      "llama3",
      "mistral",
      "nemotron",
      "neural",
      "openchat",
      "phi3",
      "rwkv",
      "vicuna",
      "zephyr",
      "deepseek-r1",
      "deepseek-v3.1",
      "qwq",
      "qwen3"
    )
  ),
  /**
   * Primary modality of the model
   */
  "modality": S.NullOr(S.String),
  /**
   * Supported input modalities
   */
  "input_modalities": S.Array(InputModality),
  /**
   * Supported output modalities
   */
  "output_modalities": S.Array(OutputModality)
}) {}

export class PublicEndpointQuantizationEnum
  extends S.Literal("int4", "int8", "fp4", "fp6", "fp8", "fp16", "bf16", "fp32", "unknown")
{}

export class PublicEndpointQuantization extends PublicEndpointQuantizationEnum {}

export class EndpointStatus extends S.Literal(0, -1, -2, -3, -5, -10) {}

/**
 * Information about a specific model endpoint
 */
export class PublicEndpoint extends S.Class<PublicEndpoint>("PublicEndpoint")({
  "name": S.String,
  "model_name": S.String,
  "context_length": S.Number,
  "pricing": S.Struct({
    "prompt": BigNumberUnion,
    "completion": BigNumberUnion,
    "request": S.optionalWith(BigNumberUnion, { nullable: true }),
    "image": S.optionalWith(BigNumberUnion, { nullable: true }),
    "image_token": S.optionalWith(BigNumberUnion, { nullable: true }),
    "image_output": S.optionalWith(BigNumberUnion, { nullable: true }),
    "audio": S.optionalWith(BigNumberUnion, { nullable: true }),
    "input_audio_cache": S.optionalWith(BigNumberUnion, { nullable: true }),
    "web_search": S.optionalWith(BigNumberUnion, { nullable: true }),
    "internal_reasoning": S.optionalWith(BigNumberUnion, { nullable: true }),
    "input_cache_read": S.optionalWith(BigNumberUnion, { nullable: true }),
    "input_cache_write": S.optionalWith(BigNumberUnion, { nullable: true }),
    "discount": S.optionalWith(S.Number, { nullable: true })
  }),
  "provider_name": ProviderName,
  "tag": S.String,
  "quantization": PublicEndpointQuantization,
  "max_completion_tokens": S.NullOr(S.Number),
  "max_prompt_tokens": S.NullOr(S.Number),
  "supported_parameters": S.Array(Parameter),
  "status": S.optionalWith(EndpointStatus, { nullable: true }),
  "uptime_last_30m": S.NullOr(S.Number),
  "supports_implicit_caching": S.Boolean
}) {}

/**
 * List of available endpoints for a model
 */
export class ListEndpointsResponse extends S.Class<ListEndpointsResponse>("ListEndpointsResponse")({
  /**
   * Unique identifier for the model
   */
  "id": S.String,
  /**
   * Display name of the model
   */
  "name": S.String,
  /**
   * Unix timestamp of when the model was created
   */
  "created": S.Number,
  /**
   * Description of the model
   */
  "description": S.String,
  "architecture": ListEndpointsResponseArchitecture,
  /**
   * List of available endpoints for this model
   */
  "endpoints": S.Array(PublicEndpoint)
}) {}

export class ListEndpoints200 extends S.Struct({
  "data": ListEndpointsResponse
}) {}

export class ListEndpointsZdr200 extends S.Struct({
  "data": S.Array(PublicEndpoint)
}) {}

export class GetParametersParams extends S.Struct({
  "provider": S.optionalWith(ProviderName, { nullable: true })
}) {}

export class GetParameters200 extends S.Struct({
  /**
   * Parameter analytics data
   */
  "data": S.Struct({
    /**
     * Model identifier
     */
    "model": S.String,
    /**
     * List of parameters supported by this model
     */
    "supported_parameters": S.Array(
      S.Literal(
        "temperature",
        "top_p",
        "top_k",
        "min_p",
        "top_a",
        "frequency_penalty",
        "presence_penalty",
        "repetition_penalty",
        "max_tokens",
        "logit_bias",
        "logprobs",
        "top_logprobs",
        "seed",
        "response_format",
        "structured_outputs",
        "stop",
        "tools",
        "tool_choice",
        "parallel_tool_calls",
        "include_reasoning",
        "reasoning",
        "reasoning_effort",
        "web_search_options",
        "verbosity"
      )
    )
  })
}) {}

export class ListProviders200 extends S.Struct({
  "data": S.Array(S.Struct({
    /**
     * Display name of the provider
     */
    "name": S.String,
    /**
     * URL-friendly identifier for the provider
     */
    "slug": S.String,
    /**
     * URL to the provider's privacy policy
     */
    "privacy_policy_url": S.NullOr(S.String),
    /**
     * URL to the provider's terms of service
     */
    "terms_of_service_url": S.optionalWith(S.String, { nullable: true }),
    /**
     * URL to the provider's status page
     */
    "status_page_url": S.optionalWith(S.String, { nullable: true })
  }))
}) {}

export class ListParams extends S.Struct({
  /**
   * Whether to include disabled API keys in the response
   */
  "include_disabled": S.optionalWith(S.String, { nullable: true }),
  /**
   * Number of API keys to skip for pagination
   */
  "offset": S.optionalWith(S.String, { nullable: true })
}) {}

export class List200 extends S.Struct({
  /**
   * List of API keys
   */
  "data": S.Array(S.Struct({
    /**
     * Unique hash identifier for the API key
     */
    "hash": S.String,
    /**
     * Name of the API key
     */
    "name": S.String,
    /**
     * Human-readable label for the API key
     */
    "label": S.String,
    /**
     * Whether the API key is disabled
     */
    "disabled": S.Boolean,
    /**
     * Spending limit for the API key in USD
     */
    "limit": S.NullOr(S.Number),
    /**
     * Remaining spending limit in USD
     */
    "limit_remaining": S.NullOr(S.Number),
    /**
     * Type of limit reset for the API key
     */
    "limit_reset": S.NullOr(S.String),
    /**
     * Whether to include external BYOK usage in the credit limit
     */
    "include_byok_in_limit": S.Boolean,
    /**
     * Total OpenRouter credit usage (in USD) for the API key
     */
    "usage": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC day
     */
    "usage_daily": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "usage_weekly": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC month
     */
    "usage_monthly": S.Number,
    /**
     * Total external BYOK usage (in USD) for the API key
     */
    "byok_usage": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC day
     */
    "byok_usage_daily": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "byok_usage_weekly": S.Number,
    /**
     * External BYOK usage (in USD) for current UTC month
     */
    "byok_usage_monthly": S.Number,
    /**
     * ISO 8601 timestamp of when the API key was created
     */
    "created_at": S.String,
    /**
     * ISO 8601 timestamp of when the API key was last updated
     */
    "updated_at": S.NullOr(S.String),
    /**
     * ISO 8601 UTC timestamp when the API key expires, or null if no expiration
     */
    "expires_at": S.optionalWith(S.String, { nullable: true })
  }))
}) {}

/**
 * Type of limit reset for the API key (daily, weekly, monthly, or null for no reset). Resets happen automatically at midnight UTC, and weeks are Monday through Sunday.
 */
export class CreateKeysRequestLimitReset extends S.Literal("daily", "weekly", "monthly") {}

export class CreateKeysRequest extends S.Class<CreateKeysRequest>("CreateKeysRequest")({
  /**
   * Name for the new API key
   */
  "name": S.String.pipe(S.minLength(1)),
  /**
   * Optional spending limit for the API key in USD
   */
  "limit": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Type of limit reset for the API key (daily, weekly, monthly, or null for no reset). Resets happen automatically at midnight UTC, and weeks are Monday through Sunday.
   */
  "limit_reset": S.optionalWith(CreateKeysRequestLimitReset, { nullable: true }),
  /**
   * Whether to include BYOK usage in the limit
   */
  "include_byok_in_limit": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Optional ISO 8601 UTC timestamp when the API key should expire. Must be UTC, other timezones will be rejected
   */
  "expires_at": S.optionalWith(S.String, { nullable: true })
}) {}

export class CreateKeys201 extends S.Struct({
  /**
   * The created API key information
   */
  "data": S.Struct({
    /**
     * Unique hash identifier for the API key
     */
    "hash": S.String,
    /**
     * Name of the API key
     */
    "name": S.String,
    /**
     * Human-readable label for the API key
     */
    "label": S.String,
    /**
     * Whether the API key is disabled
     */
    "disabled": S.Boolean,
    /**
     * Spending limit for the API key in USD
     */
    "limit": S.NullOr(S.Number),
    /**
     * Remaining spending limit in USD
     */
    "limit_remaining": S.NullOr(S.Number),
    /**
     * Type of limit reset for the API key
     */
    "limit_reset": S.NullOr(S.String),
    /**
     * Whether to include external BYOK usage in the credit limit
     */
    "include_byok_in_limit": S.Boolean,
    /**
     * Total OpenRouter credit usage (in USD) for the API key
     */
    "usage": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC day
     */
    "usage_daily": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "usage_weekly": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC month
     */
    "usage_monthly": S.Number,
    /**
     * Total external BYOK usage (in USD) for the API key
     */
    "byok_usage": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC day
     */
    "byok_usage_daily": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "byok_usage_weekly": S.Number,
    /**
     * External BYOK usage (in USD) for current UTC month
     */
    "byok_usage_monthly": S.Number,
    /**
     * ISO 8601 timestamp of when the API key was created
     */
    "created_at": S.String,
    /**
     * ISO 8601 timestamp of when the API key was last updated
     */
    "updated_at": S.NullOr(S.String),
    /**
     * ISO 8601 UTC timestamp when the API key expires, or null if no expiration
     */
    "expires_at": S.optionalWith(S.String, { nullable: true })
  }),
  /**
   * The actual API key string (only shown once)
   */
  "key": S.String
}) {}

export class GetKey200 extends S.Struct({
  /**
   * The API key information
   */
  "data": S.Struct({
    /**
     * Unique hash identifier for the API key
     */
    "hash": S.String,
    /**
     * Name of the API key
     */
    "name": S.String,
    /**
     * Human-readable label for the API key
     */
    "label": S.String,
    /**
     * Whether the API key is disabled
     */
    "disabled": S.Boolean,
    /**
     * Spending limit for the API key in USD
     */
    "limit": S.NullOr(S.Number),
    /**
     * Remaining spending limit in USD
     */
    "limit_remaining": S.NullOr(S.Number),
    /**
     * Type of limit reset for the API key
     */
    "limit_reset": S.NullOr(S.String),
    /**
     * Whether to include external BYOK usage in the credit limit
     */
    "include_byok_in_limit": S.Boolean,
    /**
     * Total OpenRouter credit usage (in USD) for the API key
     */
    "usage": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC day
     */
    "usage_daily": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "usage_weekly": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC month
     */
    "usage_monthly": S.Number,
    /**
     * Total external BYOK usage (in USD) for the API key
     */
    "byok_usage": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC day
     */
    "byok_usage_daily": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "byok_usage_weekly": S.Number,
    /**
     * External BYOK usage (in USD) for current UTC month
     */
    "byok_usage_monthly": S.Number,
    /**
     * ISO 8601 timestamp of when the API key was created
     */
    "created_at": S.String,
    /**
     * ISO 8601 timestamp of when the API key was last updated
     */
    "updated_at": S.NullOr(S.String),
    /**
     * ISO 8601 UTC timestamp when the API key expires, or null if no expiration
     */
    "expires_at": S.optionalWith(S.String, { nullable: true })
  })
}) {}

export class DeleteKeys200 extends S.Struct({
  /**
   * Confirmation that the API key was deleted
   */
  "deleted": S.Literal(true)
}) {}

/**
 * New limit reset type for the API key (daily, weekly, monthly, or null for no reset). Resets happen automatically at midnight UTC, and weeks are Monday through Sunday.
 */
export class UpdateKeysRequestLimitReset extends S.Literal("daily", "weekly", "monthly") {}

export class UpdateKeysRequest extends S.Class<UpdateKeysRequest>("UpdateKeysRequest")({
  /**
   * New name for the API key
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Whether to disable the API key
   */
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * New spending limit for the API key in USD
   */
  "limit": S.optionalWith(S.Number, { nullable: true }),
  /**
   * New limit reset type for the API key (daily, weekly, monthly, or null for no reset). Resets happen automatically at midnight UTC, and weeks are Monday through Sunday.
   */
  "limit_reset": S.optionalWith(UpdateKeysRequestLimitReset, { nullable: true }),
  /**
   * Whether to include BYOK usage in the limit
   */
  "include_byok_in_limit": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class UpdateKeys200 extends S.Struct({
  /**
   * The updated API key information
   */
  "data": S.Struct({
    /**
     * Unique hash identifier for the API key
     */
    "hash": S.String,
    /**
     * Name of the API key
     */
    "name": S.String,
    /**
     * Human-readable label for the API key
     */
    "label": S.String,
    /**
     * Whether the API key is disabled
     */
    "disabled": S.Boolean,
    /**
     * Spending limit for the API key in USD
     */
    "limit": S.NullOr(S.Number),
    /**
     * Remaining spending limit in USD
     */
    "limit_remaining": S.NullOr(S.Number),
    /**
     * Type of limit reset for the API key
     */
    "limit_reset": S.NullOr(S.String),
    /**
     * Whether to include external BYOK usage in the credit limit
     */
    "include_byok_in_limit": S.Boolean,
    /**
     * Total OpenRouter credit usage (in USD) for the API key
     */
    "usage": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC day
     */
    "usage_daily": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "usage_weekly": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC month
     */
    "usage_monthly": S.Number,
    /**
     * Total external BYOK usage (in USD) for the API key
     */
    "byok_usage": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC day
     */
    "byok_usage_daily": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "byok_usage_weekly": S.Number,
    /**
     * External BYOK usage (in USD) for current UTC month
     */
    "byok_usage_monthly": S.Number,
    /**
     * ISO 8601 timestamp of when the API key was created
     */
    "created_at": S.String,
    /**
     * ISO 8601 timestamp of when the API key was last updated
     */
    "updated_at": S.NullOr(S.String),
    /**
     * ISO 8601 UTC timestamp when the API key expires, or null if no expiration
     */
    "expires_at": S.optionalWith(S.String, { nullable: true })
  })
}) {}

export class GetCurrentKey200 extends S.Struct({
  /**
   * Current API key information
   */
  "data": S.Struct({
    /**
     * Human-readable label for the API key
     */
    "label": S.String,
    /**
     * Spending limit for the API key in USD
     */
    "limit": S.NullOr(S.Number),
    /**
     * Total OpenRouter credit usage (in USD) for the API key
     */
    "usage": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC day
     */
    "usage_daily": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "usage_weekly": S.Number,
    /**
     * OpenRouter credit usage (in USD) for the current UTC month
     */
    "usage_monthly": S.Number,
    /**
     * Total external BYOK usage (in USD) for the API key
     */
    "byok_usage": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC day
     */
    "byok_usage_daily": S.Number,
    /**
     * External BYOK usage (in USD) for the current UTC week (Monday-Sunday)
     */
    "byok_usage_weekly": S.Number,
    /**
     * External BYOK usage (in USD) for current UTC month
     */
    "byok_usage_monthly": S.Number,
    /**
     * Whether this is a free tier API key
     */
    "is_free_tier": S.Boolean,
    /**
     * Whether this is a provisioning key
     */
    "is_provisioning_key": S.Boolean,
    /**
     * Remaining spending limit in USD
     */
    "limit_remaining": S.NullOr(S.Number),
    /**
     * Type of limit reset for the API key
     */
    "limit_reset": S.NullOr(S.String),
    /**
     * Whether to include external BYOK usage in the credit limit
     */
    "include_byok_in_limit": S.Boolean,
    /**
     * ISO 8601 UTC timestamp when the API key expires, or null if no expiration
     */
    "expires_at": S.optionalWith(S.String, { nullable: true }),
    /**
     * Legacy rate limit information about a key. Will always return -1.
     */
    "rate_limit": S.Struct({
      /**
       * Number of requests allowed per interval
       */
      "requests": S.Number,
      /**
       * Rate limit interval
       */
      "interval": S.String,
      /**
       * Note about the rate limit
       */
      "note": S.String
    })
  })
}) {}

/**
 * The method used to generate the code challenge
 */
export class ExchangeAuthCodeForAPIKeyRequestCodeChallengeMethod extends S.Literal("S256", "plain") {}

export class ExchangeAuthCodeForAPIKeyRequest
  extends S.Class<ExchangeAuthCodeForAPIKeyRequest>("ExchangeAuthCodeForAPIKeyRequest")({
    /**
     * The authorization code received from the OAuth redirect
     */
    "code": S.String,
    /**
     * The code verifier if code_challenge was used in the authorization request
     */
    "code_verifier": S.optionalWith(S.String, { nullable: true }),
    /**
     * The method used to generate the code challenge
     */
    "code_challenge_method": S.optionalWith(ExchangeAuthCodeForAPIKeyRequestCodeChallengeMethod, { nullable: true })
  })
{}

export class ExchangeAuthCodeForAPIKey200 extends S.Struct({
  /**
   * The API key to use for OpenRouter requests
   */
  "key": S.String,
  /**
   * User ID associated with the API key
   */
  "user_id": S.NullOr(S.String)
}) {}

/**
 * The method used to generate the code challenge
 */
export class CreateAuthKeysCodeRequestCodeChallengeMethod extends S.Literal("S256", "plain") {}

export class CreateAuthKeysCodeRequest extends S.Class<CreateAuthKeysCodeRequest>("CreateAuthKeysCodeRequest")({
  /**
   * The callback URL to redirect to after authorization. Note, only https URLs on ports 443 and 3000 are allowed.
   */
  "callback_url": S.String,
  /**
   * PKCE code challenge for enhanced security
   */
  "code_challenge": S.optionalWith(S.String, { nullable: true }),
  /**
   * The method used to generate the code challenge
   */
  "code_challenge_method": S.optionalWith(CreateAuthKeysCodeRequestCodeChallengeMethod, { nullable: true }),
  /**
   * Credit limit for the API key to be created
   */
  "limit": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional expiration time for the API key to be created
   */
  "expires_at": S.optionalWith(S.String, { nullable: true })
}) {}

export class CreateAuthKeysCode200 extends S.Struct({
  /**
   * Auth code data
   */
  "data": S.Struct({
    /**
     * The authorization code ID to use in the exchange request
     */
    "id": S.String,
    /**
     * The application ID associated with this auth code
     */
    "app_id": S.Number,
    /**
     * ISO 8601 timestamp of when the auth code was created
     */
    "created_at": S.String
  })
}) {}

export class ChatGenerationParamsProviderEnumDataCollectionEnum extends S.Literal("deny", "allow") {}

export class Schema0 extends S.Array(
  S.Union(
    S.Literal(
      "AI21",
      "AionLabs",
      "Alibaba",
      "Amazon Bedrock",
      "Amazon Nova",
      "Anthropic",
      "Arcee AI",
      "AtlasCloud",
      "Avian",
      "Azure",
      "BaseTen",
      "BytePlus",
      "Black Forest Labs",
      "Cerebras",
      "Chutes",
      "Cirrascale",
      "Clarifai",
      "Cloudflare",
      "Cohere",
      "Crusoe",
      "DeepInfra",
      "DeepSeek",
      "Featherless",
      "Fireworks",
      "Friendli",
      "GMICloud",
      "GoPomelo",
      "Google",
      "Google AI Studio",
      "Groq",
      "Hyperbolic",
      "Inception",
      "InferenceNet",
      "Infermatic",
      "Inflection",
      "Liquid",
      "Mara",
      "Mancer 2",
      "Minimax",
      "ModelRun",
      "Mistral",
      "Modular",
      "Moonshot AI",
      "Morph",
      "NCompass",
      "Nebius",
      "NextBit",
      "Novita",
      "Nvidia",
      "OpenAI",
      "OpenInference",
      "Parasail",
      "Perplexity",
      "Phala",
      "Relace",
      "SambaNova",
      "SiliconFlow",
      "Sourceful",
      "Stealth",
      "StreamLake",
      "Switchpoint",
      "Targon",
      "Together",
      "Venice",
      "WandB",
      "Xiaomi",
      "xAI",
      "Z.AI",
      "FakeProvider"
    ),
    S.String
  )
) {}

export class ProviderSortUnion extends S.Union(ProviderSort, ProviderSortConfig) {}

export class Schema1 extends S.Union(S.Number, S.String, S.Number) {}

export class ChatGenerationParamsRouteEnum extends S.Literal("fallback", "sort") {}

export class ChatMessageContentItemCacheControlTtl extends S.Literal("5m", "1h") {}

export class ChatMessageContentItemCacheControl
  extends S.Class<ChatMessageContentItemCacheControl>("ChatMessageContentItemCacheControl")({
    "type": S.Literal("ephemeral"),
    "ttl": S.optionalWith(ChatMessageContentItemCacheControlTtl, { nullable: true })
  })
{}

export class ChatMessageContentItemText extends S.Class<ChatMessageContentItemText>("ChatMessageContentItemText")({
  "type": S.Literal("text"),
  "text": S.String,
  "cache_control": S.optionalWith(ChatMessageContentItemCacheControl, { nullable: true })
}) {}

export class SystemMessage extends S.Class<SystemMessage>("SystemMessage")({
  "role": S.Literal("system"),
  "content": S.Union(S.String, S.Array(ChatMessageContentItemText)),
  "name": S.optionalWith(S.String, { nullable: true })
}) {}

export class ChatMessageContentItemImageImageUrlDetail extends S.Literal("auto", "low", "high") {}

export class ChatMessageContentItemImage extends S.Class<ChatMessageContentItemImage>("ChatMessageContentItemImage")({
  "type": S.Literal("image_url"),
  "image_url": S.Struct({
    "url": S.String,
    "detail": S.optionalWith(ChatMessageContentItemImageImageUrlDetail, { nullable: true })
  })
}) {}

export class ChatMessageContentItemAudio extends S.Class<ChatMessageContentItemAudio>("ChatMessageContentItemAudio")({
  "type": S.Literal("input_audio"),
  "input_audio": S.Struct({
    "data": S.String,
    "format": S.String
  })
}) {}

export class ChatMessageContentItemVideo extends S.Record({ key: S.String, value: S.Unknown }) {}

export class ChatMessageContentItem extends S.Record({ key: S.String, value: S.Unknown }) {}

export class UserMessage extends S.Class<UserMessage>("UserMessage")({
  "role": S.Literal("user"),
  "content": S.Union(S.String, S.Array(ChatMessageContentItem)),
  "name": S.optionalWith(S.String, { nullable: true })
}) {}

export class ChatMessageToolCall extends S.Class<ChatMessageToolCall>("ChatMessageToolCall")({
  "id": S.String,
  "type": S.Literal("function"),
  "function": S.Struct({
    "name": S.String,
    "arguments": S.String
  })
}) {}

export class AssistantMessage extends S.Class<AssistantMessage>("AssistantMessage")({
  "role": S.Literal("assistant"),
  "content": S.optionalWith(S.Union(S.String, S.Array(ChatMessageContentItem)), { nullable: true }),
  "name": S.optionalWith(S.String, { nullable: true }),
  "tool_calls": S.optionalWith(S.Array(ChatMessageToolCall), { nullable: true }),
  "refusal": S.optionalWith(S.String, { nullable: true }),
  "reasoning": S.optionalWith(S.String, { nullable: true }),
  "reasoning_details": S.optionalWith(S.Array(ReasoningDetail), { nullable: true }),
  "images": S.optionalWith(S.Array(ChatMessageContentItemImage), { nullable: true }),
  "annotations": S.optionalWith(S.Array(AnnotationDetail), { nullable: true })
}) {}

export class ToolResponseMessage extends S.Class<ToolResponseMessage>("ToolResponseMessage")({
  "role": S.Literal("tool"),
  "content": S.Union(S.String, S.Array(ChatMessageContentItem)),
  "tool_call_id": S.String
}) {}

export class Message extends S.Record({ key: S.String, value: S.Unknown }) {}

export class ModelName extends S.String {}

export class ChatGenerationParamsReasoningEffortEnum
  extends S.Literal("xhigh", "high", "medium", "low", "minimal", "none")
{}

export class JSONSchemaConfig extends S.Class<JSONSchemaConfig>("JSONSchemaConfig")({
  "name": S.String.pipe(S.maxLength(64)),
  "description": S.optionalWith(S.String, { nullable: true }),
  "schema": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "strict": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ResponseFormatJSONSchema extends S.Class<ResponseFormatJSONSchema>("ResponseFormatJSONSchema")({
  "type": S.Literal("json_schema"),
  "json_schema": JSONSchemaConfig
}) {}

export class ResponseFormatTextGrammar extends S.Class<ResponseFormatTextGrammar>("ResponseFormatTextGrammar")({
  "type": S.Literal("grammar"),
  "grammar": S.String
}) {}

export class ChatStreamOptions extends S.Class<ChatStreamOptions>("ChatStreamOptions")({
  "include_usage": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class NamedToolChoice extends S.Class<NamedToolChoice>("NamedToolChoice")({
  "type": S.Literal("function"),
  "function": S.Struct({
    "name": S.String
  })
}) {}

export class ToolChoiceOption
  extends S.Union(S.Literal("none"), S.Literal("auto"), S.Literal("required"), NamedToolChoice)
{}

export class ToolDefinitionJson extends S.Class<ToolDefinitionJson>("ToolDefinitionJson")({
  "type": S.Literal("function"),
  "function": S.Struct({
    "name": S.String.pipe(S.maxLength(64)),
    "description": S.optionalWith(S.String, { nullable: true }),
    "parameters": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
    "strict": S.optionalWith(S.Boolean, { nullable: true })
  })
}) {}

export class ChatGenerationParams extends S.Class<ChatGenerationParams>("ChatGenerationParams")({
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
       *
       * - deny: use only providers which do not collect user data.
       */
      "data_collection": S.optionalWith(S.Literal("deny", "allow"), { nullable: true }),
      "zdr": S.optionalWith(S.Boolean, { nullable: true }),
      "enforce_distillable_text": S.optionalWith(S.Boolean, { nullable: true }),
      /**
       * An ordered list of provider slugs. The router will attempt to use the first provider in the subset of this list that supports your requested model, and fall back to the next if it is unavailable. If no providers are available, the request will fail with an error message.
       */
      "order": S.optionalWith(Schema0, { nullable: true }),
      /**
       * List of provider slugs to allow. If provided, this list is merged with your account-wide allowed provider settings for this request.
       */
      "only": S.optionalWith(Schema0, { nullable: true }),
      /**
       * List of provider slugs to ignore. If provided, this list is merged with your account-wide ignored provider settings for this request.
       */
      "ignore": S.optionalWith(Schema0, { nullable: true }),
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
      "sort": S.optionalWith(ProviderSortUnion, { nullable: true }),
      /**
       * The object specifying the maximum price you want to pay for this request. USD price per million tokens, for prompt and completion.
       */
      "max_price": S.optionalWith(
        S.Struct({
          "prompt": S.optionalWith(Schema1, { nullable: true }),
          "completion": S.optionalWith(Schema1, { nullable: true }),
          "image": S.optionalWith(Schema1, { nullable: true }),
          "audio": S.optionalWith(Schema1, { nullable: true }),
          "request": S.optionalWith(Schema1, { nullable: true })
        }),
        { nullable: true }
      ),
      "preferred_min_throughput": S.optionalWith(S.Number, { nullable: true }),
      "preferred_max_latency": S.optionalWith(S.Number, { nullable: true }),
      "min_throughput": S.optionalWith(S.Number, { nullable: true }),
      "max_latency": S.optionalWith(S.Number, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * Plugins you want to enable for this request, including their settings.
   */
  "plugins": S.optionalWith(S.Array(S.Record({ key: S.String, value: S.Unknown })), { nullable: true }),
  "route": S.optionalWith(ChatGenerationParamsRouteEnum, { nullable: true }),
  "user": S.optionalWith(S.String, { nullable: true }),
  /**
   * A unique identifier for grouping related requests (e.g., a conversation or agent workflow) for observability. If provided in both the request body and the x-session-id header, the body value takes precedence. Maximum of 128 characters.
   */
  "session_id": S.optionalWith(S.String.pipe(S.maxLength(128)), { nullable: true }),
  "messages": S.NonEmptyArray(Message).pipe(S.minItems(1)),
  "model": S.optionalWith(ModelName, { nullable: true }),
  "models": S.optionalWith(S.Array(ModelName), { nullable: true }),
  "frequency_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true
  }),
  "logit_bias": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "logprobs": S.optionalWith(S.Boolean, { nullable: true }),
  "top_logprobs": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)), { nullable: true }),
  "max_completion_tokens": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
  "max_tokens": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "presence_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true
  }),
  "reasoning": S.optionalWith(
    S.Struct({
      "effort": S.optionalWith(ChatGenerationParamsReasoningEffortEnum, { nullable: true }),
      "summary": S.optionalWith(ReasoningSummaryVerbosity, { nullable: true })
    }),
    { nullable: true }
  ),
  "response_format": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "seed": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(-9007199254740991), S.lessThanOrEqualTo(9007199254740991)), {
    nullable: true
  }),
  "stop": S.optionalWith(S.Union(S.String, S.Array(S.String).pipe(S.maxItems(4))), { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stream_options": S.optionalWith(ChatStreamOptions, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "tool_choice": S.optionalWith(ToolChoiceOption, { nullable: true }),
  "tools": S.optionalWith(S.Array(ToolDefinitionJson), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "debug": S.optionalWith(
    S.Struct({
      "echo_upstream_body": S.optionalWith(S.Boolean, { nullable: true })
    }),
    { nullable: true }
  )
}) {}

export class ChatCompletionFinishReason extends S.Literal("tool_calls", "stop", "length", "content_filter", "error") {}

export class Schema2 extends S.Union(ChatCompletionFinishReason, S.Null) {}

export class Schema4 extends S.Union(S.String, S.Null) {}

export class Schema5Enum
  extends S.Literal("unknown", "openai-responses-v1", "xai-responses-v1", "anthropic-claude-v1", "google-gemini-v1")
{}

export class Schema5 extends S.Union(Schema5Enum, S.Null) {}

export class Schema6 extends S.Number {}

export class Schema3 extends S.Record({ key: S.String, value: S.Unknown }) {}

export class ChatMessageTokenLogprob extends S.Class<ChatMessageTokenLogprob>("ChatMessageTokenLogprob")({
  "token": S.String,
  "logprob": S.Number,
  "bytes": S.NullOr(S.Array(S.Number)),
  "top_logprobs": S.Array(S.Struct({
    "token": S.String,
    "logprob": S.Number,
    "bytes": S.NullOr(S.Array(S.Number))
  }))
}) {}

export class ChatMessageTokenLogprobs extends S.Class<ChatMessageTokenLogprobs>("ChatMessageTokenLogprobs")({
  "content": S.optionalWith(S.Array(ChatMessageTokenLogprob), { nullable: true }),
  "refusal": S.optionalWith(S.Array(ChatMessageTokenLogprob), { nullable: true })
}) {}

export class ChatResponseChoice extends S.Class<ChatResponseChoice>("ChatResponseChoice")({
  "finish_reason": S.NullOr(ChatCompletionFinishReason),
  "index": S.Number,
  "message": AssistantMessage,
  "reasoning_details": S.optionalWith(S.Array(Schema3), { nullable: true }),
  "logprobs": S.optionalWith(ChatMessageTokenLogprobs, { nullable: true })
}) {}

export class ChatGenerationTokenUsage extends S.Class<ChatGenerationTokenUsage>("ChatGenerationTokenUsage")({
  "completion_tokens": S.Number,
  "prompt_tokens": S.Number,
  "total_tokens": S.Number,
  "cost": S.optionalWith(S.Number, { nullable: true }),
  "cost_details": S.optionalWith(
    S.Struct({
      upstream_inference_cost: S.optionalWith(S.Number, { nullable: true })
    }),
    { nullable: true }
  ),
  "completion_tokens_details": S.optionalWith(
    S.Struct({
      "reasoning_tokens": S.optionalWith(S.Number, { nullable: true }),
      "audio_tokens": S.optionalWith(S.Number, { nullable: true }),
      "accepted_prediction_tokens": S.optionalWith(S.Number, { nullable: true }),
      "rejected_prediction_tokens": S.optionalWith(S.Number, { nullable: true })
    }),
    { nullable: true }
  ),
  "prompt_tokens_details": S.optionalWith(
    S.Struct({
      "cached_tokens": S.optionalWith(S.Number, { nullable: true }),
      "audio_tokens": S.optionalWith(S.Number, { nullable: true }),
      "video_tokens": S.optionalWith(S.Number, { nullable: true })
    }),
    { nullable: true }
  )
}) {}

export class ChatResponse extends S.Class<ChatResponse>("ChatResponse")({
  "id": S.String,
  "provider": S.optionalWith(S.String, { nullable: true }),
  "choices": S.Array(ChatResponseChoice),
  "created": S.Number,
  "model": S.String,
  "object": S.Literal("chat.completion"),
  "system_fingerprint": S.optionalWith(S.String, { nullable: true }),
  "usage": S.optionalWith(ChatGenerationTokenUsage, { nullable: true })
}) {}

export class ChatError extends S.Class<ChatError>("ChatError")({
  "error": S.Struct({
    "code": S.NullOr(S.Union(S.String, S.Number)),
    "message": S.String,
    "param": S.optionalWith(S.String, { nullable: true }),
    "type": S.optionalWith(S.String, { nullable: true })
  })
}) {}

export class CompletionCreateParams extends S.Class<CompletionCreateParams>("CompletionCreateParams")({
  "model": S.optionalWith(ModelName, { nullable: true }),
  "models": S.optionalWith(S.Array(ModelName), { nullable: true }),
  "prompt": S.Union(S.String, S.Array(S.String), S.Array(S.Number), S.Array(S.Array(S.Number))),
  "best_of": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(20)), { nullable: true }),
  "echo": S.optionalWith(S.Boolean, { nullable: true }),
  "frequency_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true
  }),
  "logit_bias": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "logprobs": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(5)), { nullable: true }),
  "max_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(9007199254740991)), {
    nullable: true
  }),
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(128)), { nullable: true }),
  "presence_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true
  }),
  "seed": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(-9007199254740991), S.lessThanOrEqualTo(9007199254740991)), {
    nullable: true
  }),
  "stop": S.optionalWith(S.Union(S.String, S.Array(S.String)), { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stream_options": S.optionalWith(
    S.Struct({
      "include_usage": S.optionalWith(S.Boolean, { nullable: true })
    }),
    { nullable: true }
  ),
  "suffix": S.optionalWith(S.String, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "user": S.optionalWith(S.String, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "response_format": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class CompletionLogprobs extends S.Class<CompletionLogprobs>("CompletionLogprobs")({
  "tokens": S.Array(S.String),
  "token_logprobs": S.Array(S.Number),
  "top_logprobs": S.NullOr(S.Array(S.Record({ key: S.String, value: S.Unknown }))),
  "text_offset": S.Array(S.Number)
}) {}

export class CompletionFinishReasonEnum extends S.Literal("stop", "length", "content_filter") {}

export class CompletionFinishReason extends S.Union(CompletionFinishReasonEnum, S.Null) {}

export class CompletionChoice extends S.Class<CompletionChoice>("CompletionChoice")({
  "text": S.String,
  "index": S.Number,
  "logprobs": S.NullOr(CompletionLogprobs),
  "finish_reason": S.NullOr(S.Literal("stop", "length", "content_filter")),
  "native_finish_reason": S.optionalWith(S.String, { nullable: true }),
  "reasoning": S.optionalWith(S.String, { nullable: true })
}) {}

export class CompletionUsage extends S.Class<CompletionUsage>("CompletionUsage")({
  "prompt_tokens": S.Number,
  "completion_tokens": S.Number,
  "total_tokens": S.Number
}) {}

export class CompletionResponse extends S.Class<CompletionResponse>("CompletionResponse")({
  "id": S.String,
  "object": S.Literal("text_completion"),
  "created": S.Number,
  "model": S.String,
  "provider": S.optionalWith(S.String, { nullable: true }),
  "system_fingerprint": S.optionalWith(S.String, { nullable: true }),
  "choices": S.Array(CompletionChoice),
  "usage": S.optionalWith(CompletionUsage, { nullable: true })
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
    "createResponses": (options) =>
      HttpClientRequest.post(`/responses`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(OpenResponsesNonStreamingResponse),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "402": decodeError("PaymentRequiredResponse", PaymentRequiredResponse),
          "404": decodeError("NotFoundResponse", NotFoundResponse),
          "408": decodeError("RequestTimeoutResponse", RequestTimeoutResponse),
          "413": decodeError("PayloadTooLargeResponse", PayloadTooLargeResponse),
          "422": decodeError("UnprocessableEntityResponse", UnprocessableEntityResponse),
          "429": decodeError("TooManyRequestsResponse", TooManyRequestsResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          "502": decodeError("BadGatewayResponse", BadGatewayResponse),
          "503": decodeError("ServiceUnavailableResponse", ServiceUnavailableResponse),
          "524": decodeError("EdgeNetworkTimeoutResponse", EdgeNetworkTimeoutResponse),
          "529": decodeError("ProviderOverloadedResponse", ProviderOverloadedResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getUserActivity": (options) =>
      HttpClientRequest.get(`/activity`).pipe(
        HttpClientRequest.setUrlParams({ "date": options?.["date"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GetUserActivity200),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "403": decodeError("ForbiddenResponse", ForbiddenResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getCredits": () =>
      HttpClientRequest.get(`/credits`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GetCredits200),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "403": decodeError("ForbiddenResponse", ForbiddenResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createCoinbaseCharge": (options) =>
      HttpClientRequest.post(`/credits/coinbase`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateCoinbaseCharge200),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "429": decodeError("TooManyRequestsResponse", TooManyRequestsResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createEmbeddings": (options) =>
      HttpClientRequest.post(`/embeddings`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateEmbeddings200),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "402": decodeError("PaymentRequiredResponse", PaymentRequiredResponse),
          "404": decodeError("NotFoundResponse", NotFoundResponse),
          "429": decodeError("TooManyRequestsResponse", TooManyRequestsResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          "502": decodeError("BadGatewayResponse", BadGatewayResponse),
          "503": decodeError("ServiceUnavailableResponse", ServiceUnavailableResponse),
          "524": decodeError("EdgeNetworkTimeoutResponse", EdgeNetworkTimeoutResponse),
          "529": decodeError("ProviderOverloadedResponse", ProviderOverloadedResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listEmbeddingsModels": () =>
      HttpClientRequest.get(`/embeddings/models`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ModelsListResponse),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getGeneration": (options) =>
      HttpClientRequest.get(`/generation`).pipe(
        HttpClientRequest.setUrlParams({ "id": options?.["id"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GetGeneration200),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "402": decodeError("PaymentRequiredResponse", PaymentRequiredResponse),
          "404": decodeError("NotFoundResponse", NotFoundResponse),
          "429": decodeError("TooManyRequestsResponse", TooManyRequestsResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          "502": decodeError("BadGatewayResponse", BadGatewayResponse),
          "524": decodeError("EdgeNetworkTimeoutResponse", EdgeNetworkTimeoutResponse),
          "529": decodeError("ProviderOverloadedResponse", ProviderOverloadedResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listModelsCount": () =>
      HttpClientRequest.get(`/models/count`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ModelsCountResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getModels": (options) =>
      HttpClientRequest.get(`/models`).pipe(
        HttpClientRequest.setUrlParams({
          "category": options?.["category"] as any,
          "supported_parameters": options?.["supported_parameters"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ModelsListResponse),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listModelsUser": () =>
      HttpClientRequest.get(`/models/user`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ModelsListResponse),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listEndpoints": (author, slug) =>
      HttpClientRequest.get(`/models/${author}/${slug}/endpoints`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListEndpoints200),
          "404": decodeError("NotFoundResponse", NotFoundResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listEndpointsZdr": () =>
      HttpClientRequest.get(`/endpoints/zdr`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListEndpointsZdr200),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getParameters": (author, slug, options) =>
      HttpClientRequest.get(`/parameters/${author}/${slug}`).pipe(
        HttpClientRequest.setUrlParams({ "provider": options?.["provider"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GetParameters200),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "404": decodeError("NotFoundResponse", NotFoundResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listProviders": () =>
      HttpClientRequest.get(`/providers`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListProviders200),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "list": (options) =>
      HttpClientRequest.get(`/keys`).pipe(
        HttpClientRequest.setUrlParams({
          "include_disabled": options?.["include_disabled"] as any,
          "offset": options?.["offset"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(List200),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "429": decodeError("TooManyRequestsResponse", TooManyRequestsResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createKeys": (options) =>
      HttpClientRequest.post(`/keys`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateKeys201),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "429": decodeError("TooManyRequestsResponse", TooManyRequestsResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getKey": (hash) =>
      HttpClientRequest.get(`/keys/${hash}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GetKey200),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "404": decodeError("NotFoundResponse", NotFoundResponse),
          "429": decodeError("TooManyRequestsResponse", TooManyRequestsResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "deleteKeys": (hash) =>
      HttpClientRequest.del(`/keys/${hash}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteKeys200),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "404": decodeError("NotFoundResponse", NotFoundResponse),
          "429": decodeError("TooManyRequestsResponse", TooManyRequestsResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "updateKeys": (hash, options) =>
      HttpClientRequest.patch(`/keys/${hash}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UpdateKeys200),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "404": decodeError("NotFoundResponse", NotFoundResponse),
          "429": decodeError("TooManyRequestsResponse", TooManyRequestsResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getCurrentKey": () =>
      HttpClientRequest.get(`/key`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GetCurrentKey200),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "exchangeAuthCodeForAPIKey": (options) =>
      HttpClientRequest.post(`/auth/keys`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ExchangeAuthCodeForAPIKey200),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "403": decodeError("ForbiddenResponse", ForbiddenResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createAuthKeysCode": (options) =>
      HttpClientRequest.post(`/auth/keys/code`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateAuthKeysCode200),
          "400": decodeError("BadRequestResponse", BadRequestResponse),
          "401": decodeError("UnauthorizedResponse", UnauthorizedResponse),
          "500": decodeError("InternalServerResponse", InternalServerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "sendChatCompletionRequest": (options) =>
      HttpClientRequest.post(`/chat/completions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ChatResponse),
          "400": decodeError("ChatError", ChatError),
          "401": decodeError("ChatError", ChatError),
          "429": decodeError("ChatError", ChatError),
          "500": decodeError("ChatError", ChatError),
          orElse: unexpectedStatus
        }))
      ),
    "createCompletions": (options) =>
      HttpClientRequest.post(`/completions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CompletionResponse),
          "400": decodeError("ChatError", ChatError),
          "401": decodeError("ChatError", ChatError),
          "429": decodeError("ChatError", ChatError),
          "500": decodeError("ChatError", ChatError),
          orElse: unexpectedStatus
        }))
      )
  }
}

export interface Client {
  readonly httpClient: HttpClient.HttpClient
  /**
   * Creates a streaming or non-streaming response using OpenResponses API format
   */
  readonly "createResponses": (
    options: typeof OpenResponsesRequest.Encoded
  ) => Effect.Effect<
    typeof OpenResponsesNonStreamingResponse.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"PaymentRequiredResponse", typeof PaymentRequiredResponse.Type>
    | ClientError<"NotFoundResponse", typeof NotFoundResponse.Type>
    | ClientError<"RequestTimeoutResponse", typeof RequestTimeoutResponse.Type>
    | ClientError<"PayloadTooLargeResponse", typeof PayloadTooLargeResponse.Type>
    | ClientError<"UnprocessableEntityResponse", typeof UnprocessableEntityResponse.Type>
    | ClientError<"TooManyRequestsResponse", typeof TooManyRequestsResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
    | ClientError<"BadGatewayResponse", typeof BadGatewayResponse.Type>
    | ClientError<"ServiceUnavailableResponse", typeof ServiceUnavailableResponse.Type>
    | ClientError<"EdgeNetworkTimeoutResponse", typeof EdgeNetworkTimeoutResponse.Type>
    | ClientError<"ProviderOverloadedResponse", typeof ProviderOverloadedResponse.Type>
  >
  /**
   * Returns user activity data grouped by endpoint for the last 30 (completed) UTC days
   */
  readonly "getUserActivity": (
    options?: typeof GetUserActivityParams.Encoded | undefined
  ) => Effect.Effect<
    typeof GetUserActivity200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"ForbiddenResponse", typeof ForbiddenResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Get total credits purchased and used for the authenticated user
   */
  readonly "getCredits": () => Effect.Effect<
    typeof GetCredits200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"ForbiddenResponse", typeof ForbiddenResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Create a Coinbase charge for crypto payment
   */
  readonly "createCoinbaseCharge": (
    options: typeof CreateChargeRequest.Encoded
  ) => Effect.Effect<
    typeof CreateCoinbaseCharge200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"TooManyRequestsResponse", typeof TooManyRequestsResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Submits an embedding request to the embeddings router
   */
  readonly "createEmbeddings": (
    options: typeof CreateEmbeddingsRequest.Encoded
  ) => Effect.Effect<
    typeof CreateEmbeddings200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"PaymentRequiredResponse", typeof PaymentRequiredResponse.Type>
    | ClientError<"NotFoundResponse", typeof NotFoundResponse.Type>
    | ClientError<"TooManyRequestsResponse", typeof TooManyRequestsResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
    | ClientError<"BadGatewayResponse", typeof BadGatewayResponse.Type>
    | ClientError<"ServiceUnavailableResponse", typeof ServiceUnavailableResponse.Type>
    | ClientError<"EdgeNetworkTimeoutResponse", typeof EdgeNetworkTimeoutResponse.Type>
    | ClientError<"ProviderOverloadedResponse", typeof ProviderOverloadedResponse.Type>
  >
  /**
   * Returns a list of all available embeddings models and their properties
   */
  readonly "listEmbeddingsModels": () => Effect.Effect<
    typeof ModelsListResponse.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Get request & usage metadata for a generation
   */
  readonly "getGeneration": (
    options: typeof GetGenerationParams.Encoded
  ) => Effect.Effect<
    typeof GetGeneration200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"PaymentRequiredResponse", typeof PaymentRequiredResponse.Type>
    | ClientError<"NotFoundResponse", typeof NotFoundResponse.Type>
    | ClientError<"TooManyRequestsResponse", typeof TooManyRequestsResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
    | ClientError<"BadGatewayResponse", typeof BadGatewayResponse.Type>
    | ClientError<"EdgeNetworkTimeoutResponse", typeof EdgeNetworkTimeoutResponse.Type>
    | ClientError<"ProviderOverloadedResponse", typeof ProviderOverloadedResponse.Type>
  >
  /**
   * Get total count of available models
   */
  readonly "listModelsCount": () => Effect.Effect<
    typeof ModelsCountResponse.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * List all models and their properties
   */
  readonly "getModels": (
    options?: typeof GetModelsParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ModelsListResponse.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * List models filtered by user provider preferences
   */
  readonly "listModelsUser": () => Effect.Effect<
    typeof ModelsListResponse.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * List all endpoints for a model
   */
  readonly "listEndpoints": (
    author: string,
    slug: string
  ) => Effect.Effect<
    typeof ListEndpoints200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"NotFoundResponse", typeof NotFoundResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Preview the impact of ZDR on the available endpoints
   */
  readonly "listEndpointsZdr": () => Effect.Effect<
    typeof ListEndpointsZdr200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Get a model's supported parameters and data about which are most popular
   */
  readonly "getParameters": (
    author: string,
    slug: string,
    options?: typeof GetParametersParams.Encoded | undefined
  ) => Effect.Effect<
    typeof GetParameters200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"NotFoundResponse", typeof NotFoundResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * List all providers
   */
  readonly "listProviders": () => Effect.Effect<
    typeof ListProviders200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * List API keys
   */
  readonly "list": (
    options?: typeof ListParams.Encoded | undefined
  ) => Effect.Effect<
    typeof List200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"TooManyRequestsResponse", typeof TooManyRequestsResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Create a new API key
   */
  readonly "createKeys": (
    options: typeof CreateKeysRequest.Encoded
  ) => Effect.Effect<
    typeof CreateKeys201.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"TooManyRequestsResponse", typeof TooManyRequestsResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Get a single API key
   */
  readonly "getKey": (
    hash: string
  ) => Effect.Effect<
    typeof GetKey200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"NotFoundResponse", typeof NotFoundResponse.Type>
    | ClientError<"TooManyRequestsResponse", typeof TooManyRequestsResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Delete an API key
   */
  readonly "deleteKeys": (
    hash: string
  ) => Effect.Effect<
    typeof DeleteKeys200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"NotFoundResponse", typeof NotFoundResponse.Type>
    | ClientError<"TooManyRequestsResponse", typeof TooManyRequestsResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Update an API key
   */
  readonly "updateKeys": (
    hash: string,
    options: typeof UpdateKeysRequest.Encoded
  ) => Effect.Effect<
    typeof UpdateKeys200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"NotFoundResponse", typeof NotFoundResponse.Type>
    | ClientError<"TooManyRequestsResponse", typeof TooManyRequestsResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Get information on the API key associated with the current authentication session
   */
  readonly "getCurrentKey": () => Effect.Effect<
    typeof GetCurrentKey200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Exchange an authorization code from the PKCE flow for a user-controlled API key
   */
  readonly "exchangeAuthCodeForAPIKey": (
    options: typeof ExchangeAuthCodeForAPIKeyRequest.Encoded
  ) => Effect.Effect<
    typeof ExchangeAuthCodeForAPIKey200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"ForbiddenResponse", typeof ForbiddenResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Create an authorization code for the PKCE flow to generate a user-controlled API key
   */
  readonly "createAuthKeysCode": (
    options: typeof CreateAuthKeysCodeRequest.Encoded
  ) => Effect.Effect<
    typeof CreateAuthKeysCode200.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"BadRequestResponse", typeof BadRequestResponse.Type>
    | ClientError<"UnauthorizedResponse", typeof UnauthorizedResponse.Type>
    | ClientError<"InternalServerResponse", typeof InternalServerResponse.Type>
  >
  /**
   * Sends a request for a model response for the given chat conversation. Supports both streaming and non-streaming modes.
   */
  readonly "sendChatCompletionRequest": (
    options: typeof ChatGenerationParams.Encoded
  ) => Effect.Effect<
    typeof ChatResponse.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"ChatError", typeof ChatError.Type>
    | ClientError<"ChatError", typeof ChatError.Type>
    | ClientError<"ChatError", typeof ChatError.Type>
    | ClientError<"ChatError", typeof ChatError.Type>
  >
  /**
   * Creates a completion for the provided prompt and parameters. Supports both streaming and non-streaming modes.
   */
  readonly "createCompletions": (
    options: typeof CompletionCreateParams.Encoded
  ) => Effect.Effect<
    typeof CompletionResponse.Type,
    | HttpClientError.HttpClientError
    | ParseError
    | ClientError<"ChatError", typeof ChatError.Type>
    | ClientError<"ChatError", typeof ChatError.Type>
    | ClientError<"ChatError", typeof ChatError.Type>
    | ClientError<"ChatError", typeof ChatError.Type>
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
