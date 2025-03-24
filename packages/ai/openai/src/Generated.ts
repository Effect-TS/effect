/**
 * @since 1.0.0
 */
import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import type * as UrlParams from "@effect/platform/UrlParams"
import * as Effect from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import * as S from "effect/Schema"

export class ListAssistantsParamsOrder extends S.Literal("asc", "desc") {}

export class ListAssistantsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListAssistantsParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

export class AssistantObjectObject extends S.Literal("assistant") {}

export class AssistantToolsCodeType extends S.Literal("code_interpreter") {}

export class AssistantToolsCode extends S.Struct({
  "type": AssistantToolsCodeType
}) {}

export class AssistantToolsFileSearchType extends S.Literal("file_search") {}

export class FileSearchRanker extends S.Literal("auto", "default_2024_08_21") {}

export class FileSearchRankingOptions extends S.Struct({
  "ranker": S.optionalWith(FileSearchRanker, { nullable: true }),
  "score_threshold": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1))
}) {}

export class AssistantToolsFileSearch extends S.Struct({
  "type": AssistantToolsFileSearchType,
  "file_search": S.optionalWith(
    S.Struct({
      "max_num_results": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50)), {
        nullable: true
      }),
      "ranking_options": S.optionalWith(FileSearchRankingOptions, { nullable: true })
    }),
    { nullable: true }
  )
}) {}

export class AssistantToolsFunctionType extends S.Literal("function") {}

export class FunctionParameters extends S.Record({ key: S.String, value: S.Unknown }) {}

export class FunctionObject extends S.Struct({
  "description": S.optionalWith(S.String, { nullable: true }),
  "name": S.String,
  "parameters": S.optionalWith(FunctionParameters, { nullable: true }),
  "strict": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
}) {}

export class AssistantToolsFunction extends S.Struct({
  "type": AssistantToolsFunctionType,
  "function": FunctionObject
}) {}

export class Metadata extends S.Record({ key: S.String, value: S.Unknown }) {}

export class AssistantsApiResponseFormatOptionEnum extends S.Literal("auto") {}

export class ResponseFormatTextType extends S.Literal("text") {}

export class ResponseFormatText extends S.Struct({
  "type": ResponseFormatTextType
}) {}

export class ResponseFormatJsonObjectType extends S.Literal("json_object") {}

export class ResponseFormatJsonObject extends S.Struct({
  "type": ResponseFormatJsonObjectType
}) {}

export class ResponseFormatJsonSchemaType extends S.Literal("json_schema") {}

export class ResponseFormatJsonSchemaSchema extends S.Record({ key: S.String, value: S.Unknown }) {}

export class ResponseFormatJsonSchema extends S.Struct({
  "type": ResponseFormatJsonSchemaType,
  "json_schema": S.Struct({
    "description": S.optionalWith(S.String, { nullable: true }),
    "name": S.String,
    "schema": S.optionalWith(ResponseFormatJsonSchemaSchema, { nullable: true }),
    "strict": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
  })
}) {}

export class AssistantsApiResponseFormatOption extends S.Union(
  AssistantsApiResponseFormatOptionEnum,
  ResponseFormatText,
  ResponseFormatJsonObject,
  ResponseFormatJsonSchema
) {}

export class AssistantObject extends S.Struct({
  "id": S.String,
  "object": AssistantObjectObject,
  "created_at": S.Int,
  "name": S.NullOr(S.String.pipe(S.maxLength(256))),
  "description": S.NullOr(S.String.pipe(S.maxLength(512))),
  "model": S.String,
  "instructions": S.NullOr(S.String.pipe(S.maxLength(256000))),
  "tools": S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(128))
    .pipe(S.propertySignature, S.withConstructorDefault(() => [] as const)),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.NullOr(Metadata),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

export class ListAssistantsResponse extends S.Class<ListAssistantsResponse>("ListAssistantsResponse")({
  "object": S.String,
  "data": S.Array(AssistantObject),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class AssistantSupportedModels extends S.Literal(
  "o3-mini",
  "o3-mini-2025-01-31",
  "o1",
  "o1-2024-12-17",
  "gpt-4o",
  "gpt-4o-2024-11-20",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "gpt-4.5-preview",
  "gpt-4.5-preview-2025-02-27",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-0125-preview",
  "gpt-4-turbo-preview",
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-16k-0613"
) {}

export class ReasoningEffort extends S.Literal("low", "medium", "high") {}

export class CreateAssistantRequest extends S.Class<CreateAssistantRequest>("CreateAssistantRequest")({
  "model": S.Union(S.String, AssistantSupportedModels),
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true }),
  "instructions": S.optionalWith(S.String.pipe(S.maxLength(256000)), { nullable: true }),
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(128)),
    {
      nullable: true,
      default: () => [] as const
    }
  ),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true }),
          "vector_stores": S.optionalWith(
            S.Array(S.Struct({
              "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(10000)), { nullable: true }),
              "chunking_strategy": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
              "metadata": S.optionalWith(Metadata, { nullable: true })
            })).pipe(S.maxItems(1)),
            { nullable: true }
          )
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

export class ModifyAssistantRequest extends S.Class<ModifyAssistantRequest>("ModifyAssistantRequest")({
  "model": S.optionalWith(S.Union(S.String, AssistantSupportedModels), { nullable: true }),
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true }),
  "instructions": S.optionalWith(S.String.pipe(S.maxLength(256000)), { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(128)),
    {
      nullable: true,
      default: () => [] as const
    }
  ),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

export class DeleteAssistantResponseObject extends S.Literal("assistant.deleted") {}

export class DeleteAssistantResponse extends S.Class<DeleteAssistantResponse>("DeleteAssistantResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": DeleteAssistantResponseObject
}) {}

export class CreateSpeechRequestModelEnum extends S.Literal("tts-1", "tts-1-hd") {}

export class CreateSpeechRequestVoice
  extends S.Literal("alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer")
{}

export class CreateSpeechRequestResponseFormat extends S.Literal("mp3", "opus", "aac", "flac", "wav", "pcm") {}

export class CreateSpeechRequest extends S.Class<CreateSpeechRequest>("CreateSpeechRequest")({
  "model": S.Union(S.String, CreateSpeechRequestModelEnum),
  "input": S.String.pipe(S.maxLength(4096)),
  "voice": CreateSpeechRequestVoice,
  "response_format": S.optionalWith(CreateSpeechRequestResponseFormat, {
    nullable: true,
    default: () => "mp3" as const
  }),
  "speed": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0.25), S.lessThanOrEqualTo(4)), {
    nullable: true,
    default: () => 1 as const
  })
}) {}

export class CreateTranscriptionResponseJson extends S.Struct({
  "text": S.String
}) {}

export class TranscriptionWord extends S.Struct({
  "word": S.String,
  "start": S.Number,
  "end": S.Number
}) {}

export class TranscriptionSegment extends S.Struct({
  "id": S.Int,
  "seek": S.Int,
  "start": S.Number,
  "end": S.Number,
  "text": S.String,
  "tokens": S.Array(S.Int),
  "temperature": S.Number,
  "avg_logprob": S.Number,
  "compression_ratio": S.Number,
  "no_speech_prob": S.Number
}) {}

export class CreateTranscriptionResponseVerboseJson extends S.Struct({
  "language": S.String,
  "duration": S.Number,
  "text": S.String,
  "words": S.optionalWith(S.Array(TranscriptionWord), { nullable: true }),
  "segments": S.optionalWith(S.Array(TranscriptionSegment), { nullable: true })
}) {}

export class CreateTranscription200
  extends S.Union(CreateTranscriptionResponseJson, CreateTranscriptionResponseVerboseJson)
{}

export class CreateTranslationResponseJson extends S.Struct({
  "text": S.String
}) {}

export class CreateTranslationResponseVerboseJson extends S.Struct({
  "language": S.String,
  "duration": S.Number,
  "text": S.String,
  "segments": S.optionalWith(S.Array(TranscriptionSegment), { nullable: true })
}) {}

export class CreateTranslation200
  extends S.Union(CreateTranslationResponseJson, CreateTranslationResponseVerboseJson)
{}

export class ListBatchesParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const })
}) {}

export class BatchObject extends S.Literal("batch") {}

export class BatchStatus extends S.Literal(
  "validating",
  "failed",
  "in_progress",
  "finalizing",
  "completed",
  "expired",
  "cancelling",
  "cancelled"
) {}

export class Batch extends S.Struct({
  "id": S.String,
  "object": BatchObject,
  "endpoint": S.String,
  "errors": S.optionalWith(
    S.Struct({
      "object": S.optionalWith(S.String, { nullable: true }),
      "data": S.optionalWith(
        S.Array(S.Struct({
          "code": S.optionalWith(S.String, { nullable: true }),
          "message": S.optionalWith(S.String, { nullable: true }),
          "param": S.optionalWith(S.String, { nullable: true }),
          "line": S.optionalWith(S.Int, { nullable: true })
        })),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "input_file_id": S.String,
  "completion_window": S.String,
  "status": BatchStatus,
  "output_file_id": S.optionalWith(S.String, { nullable: true }),
  "error_file_id": S.optionalWith(S.String, { nullable: true }),
  "created_at": S.Int,
  "in_progress_at": S.optionalWith(S.Int, { nullable: true }),
  "expires_at": S.optionalWith(S.Int, { nullable: true }),
  "finalizing_at": S.optionalWith(S.Int, { nullable: true }),
  "completed_at": S.optionalWith(S.Int, { nullable: true }),
  "failed_at": S.optionalWith(S.Int, { nullable: true }),
  "expired_at": S.optionalWith(S.Int, { nullable: true }),
  "cancelling_at": S.optionalWith(S.Int, { nullable: true }),
  "cancelled_at": S.optionalWith(S.Int, { nullable: true }),
  "request_counts": S.optionalWith(
    S.Struct({
      "total": S.Int,
      "completed": S.Int,
      "failed": S.Int
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class ListBatchesResponseObject extends S.Literal("list") {}

export class ListBatchesResponse extends S.Class<ListBatchesResponse>("ListBatchesResponse")({
  "data": S.Array(Batch),
  "first_id": S.optionalWith(S.String, { nullable: true }),
  "last_id": S.optionalWith(S.String, { nullable: true }),
  "has_more": S.Boolean,
  "object": ListBatchesResponseObject
}) {}

export class CreateBatchRequestEndpoint
  extends S.Literal("/v1/chat/completions", "/v1/embeddings", "/v1/completions")
{}

export class CreateBatchRequestCompletionWindow extends S.Literal("24h") {}

export class CreateBatchRequest extends S.Class<CreateBatchRequest>("CreateBatchRequest")({
  "input_file_id": S.String,
  "endpoint": CreateBatchRequestEndpoint,
  "completion_window": CreateBatchRequestCompletionWindow,
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class ListChatCompletionsParamsOrder extends S.Literal("asc", "desc") {}

export class ListChatCompletionsParams extends S.Struct({
  "model": S.optionalWith(S.String, { nullable: true }),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListChatCompletionsParamsOrder, { nullable: true, default: () => "asc" as const })
}) {}

export class ChatCompletionListObject extends S.Literal("list") {}

export class ChatCompletionMessageToolCallType extends S.Literal("function") {}

export class ChatCompletionMessageToolCall extends S.Struct({
  "id": S.String,
  "type": ChatCompletionMessageToolCallType,
  "function": S.Struct({
    "name": S.String,
    "arguments": S.String
  })
}) {}

export class ChatCompletionMessageToolCalls extends S.Array(ChatCompletionMessageToolCall) {}

export class ChatCompletionResponseMessageRole extends S.Literal("assistant") {}

export class ChatCompletionResponseMessage extends S.Struct({
  "content": S.NullOr(S.String),
  "refusal": S.NullOr(S.String),
  "tool_calls": S.optionalWith(ChatCompletionMessageToolCalls, { nullable: true }),
  "annotations": S.optionalWith(
    S.Array(S.Struct({
      "type": S.Literal("url_citation"),
      "url_citation": S.Struct({
        "end_index": S.Int,
        "start_index": S.Int,
        "url": S.String,
        "title": S.String
      })
    })),
    { nullable: true }
  ),
  "role": ChatCompletionResponseMessageRole,
  "function_call": S.optionalWith(
    S.Struct({
      "arguments": S.String,
      "name": S.String
    }),
    { nullable: true }
  ),
  "audio": S.optionalWith(
    S.Struct({
      "id": S.String,
      "expires_at": S.Int,
      "data": S.String,
      "transcript": S.String
    }),
    { nullable: true }
  )
}) {}

export class ChatCompletionTokenLogprob extends S.Struct({
  "token": S.String,
  "logprob": S.Number,
  "bytes": S.NullOr(S.Array(S.Int)),
  "top_logprobs": S.Array(S.Struct({
    "token": S.String,
    "logprob": S.Number,
    "bytes": S.NullOr(S.Array(S.Int))
  }))
}) {}

export class CreateChatCompletionResponseServiceTier extends S.Literal("scale", "default") {}

export class CreateChatCompletionResponseObject extends S.Literal("chat.completion") {}

export class CompletionUsage extends S.Struct({
  "completion_tokens": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "prompt_tokens": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "total_tokens": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "completion_tokens_details": S.optionalWith(
    S.Struct({
      "accepted_prediction_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const }),
      "audio_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const }),
      "reasoning_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const }),
      "rejected_prediction_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const })
    }),
    { nullable: true }
  ),
  "prompt_tokens_details": S.optionalWith(
    S.Struct({
      "audio_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const }),
      "cached_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const })
    }),
    { nullable: true }
  )
}) {}

export class CreateChatCompletionResponse extends S.Struct({
  "id": S.String,
  "choices": S.Array(S.Struct({
    "finish_reason": S.Literal("stop", "length", "tool_calls", "content_filter", "function_call"),
    "index": S.Int,
    "message": ChatCompletionResponseMessage,
    // TODO: change this once the following upstream issue has been closed
    //       https://github.com/openai/openai-openapi/issues/433
    "logprobs": S.optionalWith(
      S.Struct({
        "content": S.NullOr(S.Array(ChatCompletionTokenLogprob)),
        "refusal": S.NullOr(S.Array(ChatCompletionTokenLogprob))
      }),
      { nullable: true }
    )
  })),
  "created": S.Int,
  "model": S.String,
  "service_tier": S.optionalWith(CreateChatCompletionResponseServiceTier, { nullable: true }),
  "system_fingerprint": S.optionalWith(S.String, { nullable: true }),
  "object": CreateChatCompletionResponseObject,
  "usage": S.optionalWith(CompletionUsage, { nullable: true })
}) {}

export class ChatCompletionList extends S.Class<ChatCompletionList>("ChatCompletionList")({
  "object": ChatCompletionListObject.pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  "data": S.Array(CreateChatCompletionResponse),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class ChatCompletionRequestMessageContentPartTextType extends S.Literal("text") {}

export class ChatCompletionRequestMessageContentPartText extends S.Struct({
  "type": ChatCompletionRequestMessageContentPartTextType,
  "text": S.String
}) {}

export class ChatCompletionRequestDeveloperMessageRole extends S.Literal("developer") {}

export class ChatCompletionRequestDeveloperMessage extends S.Struct({
  "content": S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestMessageContentPartText)),
  "role": ChatCompletionRequestDeveloperMessageRole,
  "name": S.optionalWith(S.String, { nullable: true })
}) {}

export class ChatCompletionRequestSystemMessageContentPart extends ChatCompletionRequestMessageContentPartText {}

export class ChatCompletionRequestSystemMessageRole extends S.Literal("system") {}

export class ChatCompletionRequestSystemMessage extends S.Struct({
  "content": S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestSystemMessageContentPart)),
  "role": ChatCompletionRequestSystemMessageRole,
  "name": S.optionalWith(S.String, { nullable: true })
}) {}

export class ChatCompletionRequestMessageContentPartImageType extends S.Literal("image_url") {}

export class ChatCompletionRequestMessageContentPartImageImageUrlDetail extends S.Literal("auto", "low", "high") {}

export class ChatCompletionRequestMessageContentPartImage extends S.Struct({
  "type": ChatCompletionRequestMessageContentPartImageType,
  "image_url": S.Struct({
    "url": S.String,
    "detail": S.optionalWith(ChatCompletionRequestMessageContentPartImageImageUrlDetail, {
      nullable: true,
      default: () => "auto" as const
    })
  })
}) {}

export class ChatCompletionRequestMessageContentPartAudioType extends S.Literal("input_audio") {}

export class ChatCompletionRequestMessageContentPartAudioInputAudioFormat extends S.Literal("wav", "mp3") {}

export class ChatCompletionRequestMessageContentPartAudio extends S.Struct({
  "type": ChatCompletionRequestMessageContentPartAudioType,
  "input_audio": S.Struct({
    "data": S.String,
    "format": ChatCompletionRequestMessageContentPartAudioInputAudioFormat
  })
}) {}

export class ChatCompletionRequestMessageContentPartFileType extends S.Literal("file") {}

export class ChatCompletionRequestMessageContentPartFile extends S.Struct({
  "type": ChatCompletionRequestMessageContentPartFileType,
  "file": S.Struct({
    "file_name": S.optionalWith(S.String, { nullable: true }),
    "file_data": S.optionalWith(S.String, { nullable: true }),
    "file_id": S.optionalWith(S.String, { nullable: true })
  })
}) {}

export class ChatCompletionRequestUserMessageContentPart extends S.Union(
  ChatCompletionRequestMessageContentPartText,
  ChatCompletionRequestMessageContentPartImage,
  ChatCompletionRequestMessageContentPartAudio,
  ChatCompletionRequestMessageContentPartFile
) {}

export class ChatCompletionRequestUserMessageRole extends S.Literal("user") {}

export class ChatCompletionRequestUserMessage extends S.Struct({
  "content": S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestUserMessageContentPart)),
  "role": ChatCompletionRequestUserMessageRole,
  "name": S.optionalWith(S.String, { nullable: true })
}) {}

export class ChatCompletionRequestMessageContentPartRefusalType extends S.Literal("refusal") {}

export class ChatCompletionRequestMessageContentPartRefusal extends S.Struct({
  "type": ChatCompletionRequestMessageContentPartRefusalType,
  "refusal": S.String
}) {}

export class ChatCompletionRequestAssistantMessageContentPart
  extends S.Union(ChatCompletionRequestMessageContentPartText, ChatCompletionRequestMessageContentPartRefusal)
{}

export class ChatCompletionRequestAssistantMessageRole extends S.Literal("assistant") {}

export class ChatCompletionRequestAssistantMessage extends S.Struct({
  "content": S.optionalWith(S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestAssistantMessageContentPart)), {
    nullable: true
  }),
  "refusal": S.optionalWith(S.String, { nullable: true }),
  "role": ChatCompletionRequestAssistantMessageRole,
  "name": S.optionalWith(S.String, { nullable: true }),
  "audio": S.optionalWith(
    S.Struct({
      "id": S.String
    }),
    { nullable: true }
  ),
  "tool_calls": S.optionalWith(ChatCompletionMessageToolCalls, { nullable: true }),
  "function_call": S.optionalWith(
    S.Struct({
      "arguments": S.String,
      "name": S.String
    }),
    { nullable: true }
  )
}) {}

export class ChatCompletionRequestToolMessageRole extends S.Literal("tool") {}

export class ChatCompletionRequestToolMessageContentPart extends ChatCompletionRequestMessageContentPartText {}

export class ChatCompletionRequestToolMessage extends S.Struct({
  "role": ChatCompletionRequestToolMessageRole,
  "content": S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestToolMessageContentPart)),
  "tool_call_id": S.String
}) {}

export class ChatCompletionRequestFunctionMessageRole extends S.Literal("function") {}

export class ChatCompletionRequestFunctionMessage extends S.Struct({
  "role": ChatCompletionRequestFunctionMessageRole,
  "content": S.NullOr(S.String),
  "name": S.String
}) {}

export class ChatCompletionRequestMessage extends S.Union(
  ChatCompletionRequestDeveloperMessage,
  ChatCompletionRequestSystemMessage,
  ChatCompletionRequestUserMessage,
  ChatCompletionRequestAssistantMessage,
  ChatCompletionRequestToolMessage,
  ChatCompletionRequestFunctionMessage
) {}

export class ResponseModalities extends S.Array(S.Literal("text", "audio")) {}

export class CreateChatCompletionRequestWebSearchOptionsUserLocationType extends S.Literal("approximate") {}

export class WebSearchLocation extends S.Struct({
  "country": S.optionalWith(S.String, { nullable: true }),
  "region": S.optionalWith(S.String, { nullable: true }),
  "city": S.optionalWith(S.String, { nullable: true }),
  "timezone": S.optionalWith(S.String, { nullable: true })
}) {}

export class WebSearchContextSize extends S.Literal("low", "medium", "high") {}

export class CreateChatCompletionRequestServiceTier extends S.Literal("auto", "default") {}

export class CreateChatCompletionRequestAudioVoice
  extends S.Literal("alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse")
{}

export class CreateChatCompletionRequestAudioFormat extends S.Literal("wav", "mp3", "flac", "opus", "pcm16") {}

export class StopConfiguration extends S.Union(S.String, S.Array(S.String).pipe(S.minItems(1), S.maxItems(4))) {}

export class PredictionContentType extends S.Literal("content") {}

export class PredictionContent extends S.Struct({
  "type": PredictionContentType,
  "content": S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestMessageContentPartText))
}) {}

export class ChatCompletionStreamOptions extends S.Struct({
  "include_usage": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ChatCompletionToolType extends S.Literal("function") {}

export class ChatCompletionTool extends S.Struct({
  "type": ChatCompletionToolType,
  "function": FunctionObject
}) {}

export class ChatCompletionToolChoiceOptionEnum extends S.Literal("none", "auto", "required") {}

export class ChatCompletionNamedToolChoiceType extends S.Literal("function") {}

export class ChatCompletionNamedToolChoice extends S.Struct({
  "type": ChatCompletionNamedToolChoiceType,
  "function": S.Struct({
    "name": S.String
  })
}) {}

export class ChatCompletionToolChoiceOption
  extends S.Union(ChatCompletionToolChoiceOptionEnum, ChatCompletionNamedToolChoice)
{}

export class ParallelToolCalls extends S.Boolean {}

export class CreateChatCompletionRequestFunctionCallEnum extends S.Literal("none", "auto") {}

export class ChatCompletionFunctionCallOption extends S.Struct({
  "name": S.String
}) {}

export class ChatCompletionFunctions extends S.Struct({
  "description": S.optionalWith(S.String, { nullable: true }),
  "name": S.String,
  "parameters": S.optionalWith(FunctionParameters, { nullable: true })
}) {}

export class CreateChatCompletionRequestModelEnum extends S.Literal(
  "o3-mini",
  "o3-mini-2025-01-31",
  "o1",
  "o1-2024-12-17",
  "o1-preview",
  "o1-preview-2024-09-12",
  "o1-mini",
  "o1-mini-2024-09-12",
  "computer-use-preview",
  "computer-use-preview-2025-02-04",
  "computer-use-preview-2025-03-11",
  "gpt-4.5-preview",
  "gpt-4.5-preview-2025-02-27",
  "gpt-4o",
  "gpt-4o-2024-11-20",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "gpt-4o-audio-preview",
  "gpt-4o-audio-preview-2024-10-01",
  "gpt-4o-audio-preview-2024-12-17",
  "gpt-4o-mini-audio-preview",
  "gpt-4o-mini-audio-preview-2024-12-17",
  "chatgpt-4o-latest",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-0125-preview",
  "gpt-4-turbo-preview",
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-0301",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-16k-0613"
) {}

export class CreateChatCompletionRequest extends S.Class<CreateChatCompletionRequest>("CreateChatCompletionRequest")({
  "messages": S.NonEmptyArray(ChatCompletionRequestMessage),
  "modalities": S.optionalWith(ResponseModalities, { nullable: true }),
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  "max_completion_tokens": S.optionalWith(S.Int, { nullable: true }),
  "frequency_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  "presence_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  "web_search_options": S.optionalWith(
    S.Struct({
      "user_location": S.optionalWith(
        S.Struct({
          "type": CreateChatCompletionRequestWebSearchOptionsUserLocationType,
          "approximate": WebSearchLocation
        }),
        { nullable: true }
      ),
      "search_context_size": S.optionalWith(WebSearchContextSize, { nullable: true, default: () => "medium" as const })
    }),
    { nullable: true }
  ),
  "top_logprobs": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)), { nullable: true }),
  "response_format": S.optionalWith(S.Union(ResponseFormatText, ResponseFormatJsonSchema, ResponseFormatJsonObject), {
    nullable: true
  }),
  "service_tier": S.optionalWith(CreateChatCompletionRequestServiceTier, {
    nullable: true,
    default: () => "auto" as const
  }),
  "audio": S.optionalWith(
    S.Struct({
      "voice": CreateChatCompletionRequestAudioVoice,
      "format": CreateChatCompletionRequestAudioFormat
    }),
    { nullable: true }
  ),
  "store": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stop": S.optionalWith(S.NullOr(StopConfiguration), { default: () => null }),
  "logit_bias": S.optionalWith(S.NullOr(S.Record({ key: S.String, value: S.Unknown })), { default: () => null }),
  "logprobs": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "max_tokens": S.optionalWith(S.Int, { nullable: true }),
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(128)), {
    nullable: true,
    default: () => 1 as const
  }),
  "prediction": S.optionalWith(PredictionContent, { nullable: true }),
  "seed": S.optionalWith(
    S.Int.pipe(S.greaterThanOrEqualTo(-9223372036854776000), S.lessThanOrEqualTo(9223372036854776000)),
    { nullable: true }
  ),
  "stream_options": S.optionalWith(S.NullOr(ChatCompletionStreamOptions), { default: () => null }),
  "tools": S.optionalWith(S.Array(ChatCompletionTool), { nullable: true }),
  "tool_choice": S.optionalWith(ChatCompletionToolChoiceOption, { nullable: true }),
  "parallel_tool_calls": S.optionalWith(ParallelToolCalls, { nullable: true, default: () => true as const }),
  "function_call": S.optionalWith(
    S.Union(CreateChatCompletionRequestFunctionCallEnum, ChatCompletionFunctionCallOption),
    { nullable: true }
  ),
  "functions": S.optionalWith(S.Array(ChatCompletionFunctions).pipe(S.minItems(1), S.maxItems(128)), {
    nullable: true
  }),
  "model": S.Union(S.String, CreateChatCompletionRequestModelEnum),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

export class UpdateChatCompletionRequest extends S.Class<UpdateChatCompletionRequest>("UpdateChatCompletionRequest")({
  "metadata": S.NullOr(Metadata)
}) {}

export class ChatCompletionDeletedObject extends S.Literal("chat.completion.deleted") {}

export class ChatCompletionDeleted extends S.Class<ChatCompletionDeleted>("ChatCompletionDeleted")({
  "object": ChatCompletionDeletedObject,
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class GetChatCompletionMessagesParamsOrder extends S.Literal("asc", "desc") {}

export class GetChatCompletionMessagesParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(GetChatCompletionMessagesParamsOrder, { nullable: true, default: () => "asc" as const })
}) {}

export class ChatCompletionMessageListObject extends S.Literal("list") {}

export class ChatCompletionMessageList extends S.Class<ChatCompletionMessageList>("ChatCompletionMessageList")({
  "object": ChatCompletionMessageListObject.pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  "data": S.Array(S.Struct({
    "id": S.String,
    "content": S.NullOr(S.String),
    "refusal": S.NullOr(S.String),
    "tool_calls": S.optionalWith(ChatCompletionMessageToolCalls, { nullable: true }),
    "annotations": S.optionalWith(
      S.Array(S.Struct({
        "type": S.Literal("url_citation"),
        "url_citation": S.Struct({
          "end_index": S.Int,
          "start_index": S.Int,
          "url": S.String,
          "title": S.String
        })
      })),
      { nullable: true }
    ),
    "role": S.Literal("assistant"),
    "function_call": S.optionalWith(
      S.Struct({
        "arguments": S.String,
        "name": S.String
      }),
      { nullable: true }
    ),
    "audio": S.optionalWith(
      S.Struct({
        "id": S.String,
        "expires_at": S.Int,
        "data": S.String,
        "transcript": S.String
      }),
      { nullable: true }
    )
  })),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class CreateCompletionRequestModelEnum
  extends S.Literal("gpt-3.5-turbo-instruct", "davinci-002", "babbage-002")
{}

export class CreateCompletionRequest extends S.Class<CreateCompletionRequest>("CreateCompletionRequest")({
  "model": S.Union(S.String, CreateCompletionRequestModelEnum),
  "prompt": S.NullOr(
    S.Union(S.String, S.Array(S.String), S.NonEmptyArray(S.Int), S.NonEmptyArray(S.NonEmptyArray(S.Int)))
  ).pipe(S.propertySignature, S.withConstructorDefault(() => "<|endoftext|>" as const)),
  "best_of": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)), {
    nullable: true,
    default: () => 1 as const
  }),
  "echo": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "frequency_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  "logit_bias": S.optionalWith(S.NullOr(S.Record({ key: S.String, value: S.Unknown })), { default: () => null }),
  "logprobs": S.optionalWith(S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(5))), {
    default: () => null
  }),
  "max_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true, default: () => 16 as const }),
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(128)), {
    nullable: true,
    default: () => 1 as const
  }),
  "presence_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  "seed": S.optionalWith(S.Int, { nullable: true }),
  "stop": S.optionalWith(S.NullOr(StopConfiguration), { default: () => null }),
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stream_options": S.optionalWith(S.NullOr(ChatCompletionStreamOptions), { default: () => null }),
  "suffix": S.optionalWith(S.NullOr(S.String), { default: () => null }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

export class CreateCompletionResponseObject extends S.Literal("text_completion") {}

export class CreateCompletionResponse extends S.Class<CreateCompletionResponse>("CreateCompletionResponse")({
  "id": S.String,
  "choices": S.Array(S.Struct({
    "finish_reason": S.Literal("stop", "length", "content_filter"),
    "index": S.Int,
    "logprobs": S.NullOr(S.Struct({
      "text_offset": S.optionalWith(S.Array(S.Int), { nullable: true }),
      "token_logprobs": S.optionalWith(S.Array(S.Number), { nullable: true }),
      "tokens": S.optionalWith(S.Array(S.String), { nullable: true }),
      "top_logprobs": S.optionalWith(S.Array(S.Record({ key: S.String, value: S.Unknown })), { nullable: true })
    })),
    "text": S.String
  })),
  "created": S.Int,
  "model": S.String,
  "system_fingerprint": S.optionalWith(S.String, { nullable: true }),
  "object": CreateCompletionResponseObject,
  "usage": S.optionalWith(CompletionUsage, { nullable: true })
}) {}

export class CreateEmbeddingRequestModelEnum
  extends S.Literal("text-embedding-ada-002", "text-embedding-3-small", "text-embedding-3-large")
{}

export class CreateEmbeddingRequestEncodingFormat extends S.Literal("float", "base64") {}

export class CreateEmbeddingRequest extends S.Class<CreateEmbeddingRequest>("CreateEmbeddingRequest")({
  "input": S.Union(
    S.String,
    S.Array(S.String).pipe(S.minItems(1), S.maxItems(2048)),
    S.Array(S.Int).pipe(S.minItems(1), S.maxItems(2048)),
    S.Array(S.NonEmptyArray(S.Int)).pipe(S.minItems(1), S.maxItems(2048))
  ),
  "model": S.Union(S.String, CreateEmbeddingRequestModelEnum),
  "encoding_format": S.optionalWith(CreateEmbeddingRequestEncodingFormat, {
    nullable: true,
    default: () => "float" as const
  }),
  "dimensions": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

export class EmbeddingObject extends S.Literal("embedding") {}

export class Embedding extends S.Struct({
  "index": S.Int,
  "embedding": S.Array(S.Number),
  "object": EmbeddingObject
}) {}

export class CreateEmbeddingResponseObject extends S.Literal("list") {}

export class CreateEmbeddingResponse extends S.Class<CreateEmbeddingResponse>("CreateEmbeddingResponse")({
  "data": S.Array(Embedding),
  "model": S.String,
  "object": CreateEmbeddingResponseObject,
  "usage": S.Struct({
    "prompt_tokens": S.Int,
    "total_tokens": S.Int
  })
}) {}

export class ListFilesParamsOrder extends S.Literal("asc", "desc") {}

export class ListFilesParams extends S.Struct({
  "purpose": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 10000 as const }),
  "order": S.optionalWith(ListFilesParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

export class OpenAIFileObject extends S.Literal("file") {}

export class OpenAIFilePurpose extends S.Literal(
  "assistants",
  "assistants_output",
  "batch",
  "batch_output",
  "fine-tune",
  "fine-tune-results",
  "vision"
) {}

export class OpenAIFileStatus extends S.Literal("uploaded", "processed", "error") {}

export class OpenAIFile extends S.Struct({
  "id": S.String,
  "bytes": S.Int,
  "created_at": S.Int,
  "expires_at": S.optionalWith(S.Int, { nullable: true }),
  "filename": S.String,
  "object": OpenAIFileObject,
  "purpose": OpenAIFilePurpose,
  "status": OpenAIFileStatus,
  "status_details": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListFilesResponse extends S.Class<ListFilesResponse>("ListFilesResponse")({
  "object": S.String,
  "data": S.Array(OpenAIFile),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class DeleteFileResponseObject extends S.Literal("file") {}

export class DeleteFileResponse extends S.Class<DeleteFileResponse>("DeleteFileResponse")({
  "id": S.String,
  "object": DeleteFileResponseObject,
  "deleted": S.Boolean
}) {}

export class DownloadFile200 extends S.String {}

export class ListPaginatedFineTuningJobsParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class FineTuningJobHyperparametersBatchSizeEnum extends S.Literal("auto") {}

export class FineTuningJobHyperparametersLearningRateMultiplierEnum extends S.Literal("auto") {}

export class FineTuningJobHyperparametersNEpochsEnum extends S.Literal("auto") {}

export class FineTuningJobObject extends S.Literal("fine_tuning.job") {}

export class FineTuningJobStatus
  extends S.Literal("validating_files", "queued", "running", "succeeded", "failed", "cancelled")
{}

export class FineTuningIntegrationType extends S.Literal("wandb") {}

export class FineTuningIntegration extends S.Struct({
  "type": FineTuningIntegrationType,
  "wandb": S.Struct({
    "project": S.String,
    "name": S.optionalWith(S.String, { nullable: true }),
    "entity": S.optionalWith(S.String, { nullable: true }),
    "tags": S.optionalWith(S.Array(S.String), { nullable: true })
  })
}) {}

export class FineTuneMethodType extends S.Literal("supervised", "dpo") {}

export class FineTuneSupervisedMethodHyperparametersBatchSizeEnum extends S.Literal("auto") {}

export class FineTuneSupervisedMethodHyperparametersLearningRateMultiplierEnum extends S.Literal("auto") {}

export class FineTuneSupervisedMethodHyperparametersNEpochsEnum extends S.Literal("auto") {}

export class FineTuneSupervisedMethod extends S.Struct({
  "hyperparameters": S.optionalWith(
    S.Struct({
      "batch_size": S.optionalWith(
        S.Union(
          FineTuneSupervisedMethodHyperparametersBatchSizeEnum,
          S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
        ),
        { nullable: true, default: () => "auto" as const }
      ),
      "learning_rate_multiplier": S.optionalWith(
        S.Union(FineTuneSupervisedMethodHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
        {
          nullable: true,
          default: () => "auto" as const
        }
      ),
      "n_epochs": S.optionalWith(
        S.Union(
          FineTuneSupervisedMethodHyperparametersNEpochsEnum,
          S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))
        ),
        { nullable: true, default: () => "auto" as const }
      )
    }),
    { nullable: true }
  )
}) {}

export class FineTuneDPOMethodHyperparametersBetaEnum extends S.Literal("auto") {}

export class FineTuneDPOMethodHyperparametersBatchSizeEnum extends S.Literal("auto") {}

export class FineTuneDPOMethodHyperparametersLearningRateMultiplierEnum extends S.Literal("auto") {}

export class FineTuneDPOMethodHyperparametersNEpochsEnum extends S.Literal("auto") {}

export class FineTuneDPOMethod extends S.Struct({
  "hyperparameters": S.optionalWith(
    S.Struct({
      "beta": S.optionalWith(
        S.Union(FineTuneDPOMethodHyperparametersBetaEnum, S.Number.pipe(S.greaterThan(0), S.lessThanOrEqualTo(2))),
        {
          nullable: true,
          default: () => "auto" as const
        }
      ),
      "batch_size": S.optionalWith(
        S.Union(
          FineTuneDPOMethodHyperparametersBatchSizeEnum,
          S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
        ),
        { nullable: true, default: () => "auto" as const }
      ),
      "learning_rate_multiplier": S.optionalWith(
        S.Union(FineTuneDPOMethodHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
        {
          nullable: true,
          default: () => "auto" as const
        }
      ),
      "n_epochs": S.optionalWith(
        S.Union(
          FineTuneDPOMethodHyperparametersNEpochsEnum,
          S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))
        ),
        { nullable: true, default: () => "auto" as const }
      )
    }),
    { nullable: true }
  )
}) {}

export class FineTuneMethod extends S.Struct({
  "type": S.optionalWith(FineTuneMethodType, { nullable: true }),
  "supervised": S.optionalWith(FineTuneSupervisedMethod, { nullable: true }),
  "dpo": S.optionalWith(FineTuneDPOMethod, { nullable: true })
}) {}

export class FineTuningJob extends S.Struct({
  "id": S.String,
  "created_at": S.Int,
  "error": S.NullOr(S.Struct({
    "code": S.String,
    "message": S.String,
    "param": S.NullOr(S.String)
  })),
  "fine_tuned_model": S.NullOr(S.String),
  "finished_at": S.NullOr(S.Int),
  "hyperparameters": S.Struct({
    "batch_size": S.optionalWith(
      S.Union(
        FineTuningJobHyperparametersBatchSizeEnum,
        S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
      ),
      { nullable: true, default: () => "auto" as const }
    ),
    "learning_rate_multiplier": S.optionalWith(
      S.Union(FineTuningJobHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
      {
        nullable: true,
        default: () => "auto" as const
      }
    ),
    "n_epochs": S.optionalWith(
      S.Union(FineTuningJobHyperparametersNEpochsEnum, S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))),
      {
        nullable: true,
        default: () => "auto" as const
      }
    )
  }),
  "model": S.String,
  "object": FineTuningJobObject,
  "organization_id": S.String,
  "result_files": S.Array(S.String),
  "status": FineTuningJobStatus,
  "trained_tokens": S.NullOr(S.Int),
  "training_file": S.String,
  "validation_file": S.NullOr(S.String),
  "integrations": S.optionalWith(S.Array(FineTuningIntegration).pipe(S.maxItems(5)), { nullable: true }),
  "seed": S.Int,
  "estimated_finish": S.optionalWith(S.Int, { nullable: true }),
  "method": S.optionalWith(FineTuneMethod, { nullable: true }),
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class ListPaginatedFineTuningJobsResponseObject extends S.Literal("list") {}

export class ListPaginatedFineTuningJobsResponse
  extends S.Class<ListPaginatedFineTuningJobsResponse>("ListPaginatedFineTuningJobsResponse")({
    "data": S.Array(FineTuningJob),
    "has_more": S.Boolean,
    "object": ListPaginatedFineTuningJobsResponseObject
  })
{}

export class CreateFineTuningJobRequestModelEnum
  extends S.Literal("babbage-002", "davinci-002", "gpt-3.5-turbo", "gpt-4o-mini")
{}

export class CreateFineTuningJobRequestHyperparametersBatchSizeEnum extends S.Literal("auto") {}

export class CreateFineTuningJobRequestHyperparametersLearningRateMultiplierEnum extends S.Literal("auto") {}

export class CreateFineTuningJobRequestHyperparametersNEpochsEnum extends S.Literal("auto") {}

export class CreateFineTuningJobRequest extends S.Class<CreateFineTuningJobRequest>("CreateFineTuningJobRequest")({
  "model": S.Union(S.String, CreateFineTuningJobRequestModelEnum),
  "training_file": S.String,
  "hyperparameters": S.optionalWith(
    S.Struct({
      "batch_size": S.optionalWith(
        S.Union(
          CreateFineTuningJobRequestHyperparametersBatchSizeEnum,
          S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
        ),
        { nullable: true, default: () => "auto" as const }
      ),
      "learning_rate_multiplier": S.optionalWith(
        S.Union(CreateFineTuningJobRequestHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
        {
          nullable: true,
          default: () => "auto" as const
        }
      ),
      "n_epochs": S.optionalWith(
        S.Union(
          CreateFineTuningJobRequestHyperparametersNEpochsEnum,
          S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))
        ),
        { nullable: true, default: () => "auto" as const }
      )
    }),
    { nullable: true }
  ),
  "suffix": S.optionalWith(S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(64))), { default: () => null }),
  "validation_file": S.optionalWith(S.String, { nullable: true }),
  "integrations": S.optionalWith(
    S.Array(S.Struct({
      "type": S.Literal("wandb"),
      "wandb": S.Struct({
        "project": S.String,
        "name": S.optionalWith(S.String, { nullable: true }),
        "entity": S.optionalWith(S.String, { nullable: true }),
        "tags": S.optionalWith(S.Array(S.String), { nullable: true })
      })
    })),
    { nullable: true }
  ),
  "seed": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2147483647)), { nullable: true }),
  "method": S.optionalWith(FineTuneMethod, { nullable: true }),
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class ListFineTuningJobCheckpointsParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 10 as const })
}) {}

export class FineTuningJobCheckpointObject extends S.Literal("fine_tuning.job.checkpoint") {}

export class FineTuningJobCheckpoint extends S.Struct({
  "id": S.String,
  "created_at": S.Int,
  "fine_tuned_model_checkpoint": S.String,
  "step_number": S.Int,
  "metrics": S.Struct({
    "step": S.optionalWith(S.Number, { nullable: true }),
    "train_loss": S.optionalWith(S.Number, { nullable: true }),
    "train_mean_token_accuracy": S.optionalWith(S.Number, { nullable: true }),
    "valid_loss": S.optionalWith(S.Number, { nullable: true }),
    "valid_mean_token_accuracy": S.optionalWith(S.Number, { nullable: true }),
    "full_valid_loss": S.optionalWith(S.Number, { nullable: true }),
    "full_valid_mean_token_accuracy": S.optionalWith(S.Number, { nullable: true })
  }),
  "fine_tuning_job_id": S.String,
  "object": FineTuningJobCheckpointObject
}) {}

export class ListFineTuningJobCheckpointsResponseObject extends S.Literal("list") {}

export class ListFineTuningJobCheckpointsResponse
  extends S.Class<ListFineTuningJobCheckpointsResponse>("ListFineTuningJobCheckpointsResponse")({
    "data": S.Array(FineTuningJobCheckpoint),
    "object": ListFineTuningJobCheckpointsResponseObject,
    "first_id": S.optionalWith(S.String, { nullable: true }),
    "last_id": S.optionalWith(S.String, { nullable: true }),
    "has_more": S.Boolean
  })
{}

export class ListFineTuningEventsParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const })
}) {}

export class FineTuningJobEventObject extends S.Literal("fine_tuning.job.event") {}

export class FineTuningJobEventLevel extends S.Literal("info", "warn", "error") {}

export class FineTuningJobEventType extends S.Literal("message", "metrics") {}

export class FineTuningJobEvent extends S.Struct({
  "object": FineTuningJobEventObject,
  "id": S.String,
  "created_at": S.Int,
  "level": FineTuningJobEventLevel,
  "message": S.String,
  "type": S.optionalWith(FineTuningJobEventType, { nullable: true }),
  "data": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class ListFineTuningJobEventsResponseObject extends S.Literal("list") {}

export class ListFineTuningJobEventsResponse
  extends S.Class<ListFineTuningJobEventsResponse>("ListFineTuningJobEventsResponse")({
    "data": S.Array(FineTuningJobEvent),
    "object": ListFineTuningJobEventsResponseObject,
    "has_more": S.Boolean
  })
{}

export class Image extends S.Struct({
  "b64_json": S.optionalWith(S.String, { nullable: true }),
  "url": S.optionalWith(S.String, { nullable: true }),
  "revised_prompt": S.optionalWith(S.String, { nullable: true })
}) {}

export class ImagesResponse extends S.Class<ImagesResponse>("ImagesResponse")({
  "created": S.Int,
  "data": S.Array(Image)
}) {}

export class CreateImageRequestModelEnum extends S.Literal("dall-e-2", "dall-e-3") {}

export class CreateImageRequestQuality extends S.Literal("standard", "hd") {}

export class CreateImageRequestResponseFormat extends S.Literal("url", "b64_json") {}

export class CreateImageRequestSize extends S.Literal("256x256", "512x512", "1024x1024", "1792x1024", "1024x1792") {}

export class CreateImageRequestStyle extends S.Literal("vivid", "natural") {}

export class CreateImageRequest extends S.Class<CreateImageRequest>("CreateImageRequest")({
  "prompt": S.String,
  "model": S.optionalWith(S.Union(S.String, CreateImageRequestModelEnum), {
    nullable: true,
    default: () => "dall-e-2" as const
  }),
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(10)), {
    nullable: true,
    default: () => 1 as const
  }),
  "quality": S.optionalWith(CreateImageRequestQuality, { nullable: true, default: () => "standard" as const }),
  "response_format": S.optionalWith(CreateImageRequestResponseFormat, {
    nullable: true,
    default: () => "url" as const
  }),
  "size": S.optionalWith(CreateImageRequestSize, { nullable: true, default: () => "1024x1024" as const }),
  "style": S.optionalWith(CreateImageRequestStyle, { nullable: true, default: () => "vivid" as const }),
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListModelsResponseObject extends S.Literal("list") {}

export class ModelObject extends S.Literal("model") {}

export class Model extends S.Struct({
  "id": S.String,
  "created": S.Int,
  "object": ModelObject,
  "owned_by": S.String
}) {}

export class ListModelsResponse extends S.Class<ListModelsResponse>("ListModelsResponse")({
  "object": ListModelsResponseObject,
  "data": S.Array(Model)
}) {}

export class DeleteModelResponse extends S.Class<DeleteModelResponse>("DeleteModelResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": S.String
}) {}

export class CreateModerationRequestModelEnum extends S.Literal(
  "omni-moderation-latest",
  "omni-moderation-2024-09-26",
  "text-moderation-latest",
  "text-moderation-stable"
) {}

export class CreateModerationRequest extends S.Class<CreateModerationRequest>("CreateModerationRequest")({
  "input": S.Union(
    S.String,
    S.Array(S.String),
    S.Array(S.Union(
      S.Struct({
        "type": S.Literal("image_url"),
        "image_url": S.Struct({
          "url": S.String
        })
      }),
      S.Struct({
        "type": S.Literal("text"),
        "text": S.String
      })
    ))
  ),
  "model": S.optionalWith(S.Union(S.String, CreateModerationRequestModelEnum), {
    nullable: true,
    default: () => "omni-moderation-latest" as const
  })
}) {}

export class CreateModerationResponse extends S.Class<CreateModerationResponse>("CreateModerationResponse")({
  "id": S.String,
  "model": S.String,
  "results": S.Array(S.Struct({
    "flagged": S.Boolean,
    "categories": S.Struct({
      "hate": S.Boolean,
      "hate/threatening": S.Boolean,
      "harassment": S.Boolean,
      "harassment/threatening": S.Boolean,
      "illicit": S.NullOr(S.Boolean),
      "illicit/violent": S.NullOr(S.Boolean),
      "self-harm": S.Boolean,
      "self-harm/intent": S.Boolean,
      "self-harm/instructions": S.Boolean,
      "sexual": S.Boolean,
      "sexual/minors": S.Boolean,
      "violence": S.Boolean,
      "violence/graphic": S.Boolean
    }),
    "category_scores": S.Struct({
      "hate": S.Number,
      "hate/threatening": S.Number,
      "harassment": S.Number,
      "harassment/threatening": S.Number,
      "illicit": S.Number,
      "illicit/violent": S.Number,
      "self-harm": S.Number,
      "self-harm/intent": S.Number,
      "self-harm/instructions": S.Number,
      "sexual": S.Number,
      "sexual/minors": S.Number,
      "violence": S.Number,
      "violence/graphic": S.Number
    }),
    "category_applied_input_types": S.Struct({
      "hate": S.Array(S.Literal("text")),
      "hate/threatening": S.Array(S.Literal("text")),
      "harassment": S.Array(S.Literal("text")),
      "harassment/threatening": S.Array(S.Literal("text")),
      "illicit": S.Array(S.Literal("text")),
      "illicit/violent": S.Array(S.Literal("text")),
      "self-harm": S.Array(S.Literal("text", "image")),
      "self-harm/intent": S.Array(S.Literal("text", "image")),
      "self-harm/instructions": S.Array(S.Literal("text", "image")),
      "sexual": S.Array(S.Literal("text", "image")),
      "sexual/minors": S.Array(S.Literal("text")),
      "violence": S.Array(S.Literal("text", "image")),
      "violence/graphic": S.Array(S.Literal("text", "image"))
    })
  }))
}) {}

export class AdminApiKeysListParamsOrder extends S.Literal("asc", "desc") {}

export class AdminApiKeysListParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(AdminApiKeysListParamsOrder, { nullable: true, default: () => "asc" as const }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const })
}) {}

export class AdminApiKey extends S.Struct({
  "object": S.optionalWith(S.String, { nullable: true }),
  "id": S.optionalWith(S.String, { nullable: true }),
  "name": S.optionalWith(S.String, { nullable: true }),
  "redacted_value": S.optionalWith(S.String, { nullable: true }),
  "value": S.optionalWith(S.String, { nullable: true }),
  "created_at": S.optionalWith(S.Int, { nullable: true }),
  "owner": S.optionalWith(
    S.Struct({
      "type": S.optionalWith(S.String, { nullable: true }),
      "id": S.optionalWith(S.String, { nullable: true }),
      "name": S.optionalWith(S.String, { nullable: true }),
      "created_at": S.optionalWith(S.Int, { nullable: true }),
      "role": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  )
}) {}

export class ApiKeyList extends S.Class<ApiKeyList>("ApiKeyList")({
  "object": S.optionalWith(S.String, { nullable: true }),
  "data": S.optionalWith(S.Array(AdminApiKey), { nullable: true }),
  "has_more": S.optionalWith(S.Boolean, { nullable: true }),
  "first_id": S.optionalWith(S.String, { nullable: true }),
  "last_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class AdminApiKeysCreateRequest extends S.Class<AdminApiKeysCreateRequest>("AdminApiKeysCreateRequest")({
  "name": S.String
}) {}

export class AdminApiKeysDelete200 extends S.Struct({
  "id": S.optionalWith(S.String, { nullable: true }),
  "object": S.optionalWith(S.String, { nullable: true }),
  "deleted": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class AuditLogEventType extends S.Literal(
  "api_key.created",
  "api_key.updated",
  "api_key.deleted",
  "invite.sent",
  "invite.accepted",
  "invite.deleted",
  "login.succeeded",
  "login.failed",
  "logout.succeeded",
  "logout.failed",
  "organization.updated",
  "project.created",
  "project.updated",
  "project.archived",
  "service_account.created",
  "service_account.updated",
  "service_account.deleted",
  "rate_limit.updated",
  "rate_limit.deleted",
  "user.added",
  "user.updated",
  "user.deleted"
) {}

export class ListAuditLogsParams extends S.Struct({
  "effective_at[gt]": S.optionalWith(S.Int, { nullable: true }),
  "effective_at[gte]": S.optionalWith(S.Int, { nullable: true }),
  "effective_at[lt]": S.optionalWith(S.Int, { nullable: true }),
  "effective_at[lte]": S.optionalWith(S.Int, { nullable: true }),
  "project_ids[]": S.optionalWith(S.Array(S.String), { nullable: true }),
  "event_types[]": S.optionalWith(S.Array(AuditLogEventType), { nullable: true }),
  "actor_ids[]": S.optionalWith(S.Array(S.String), { nullable: true }),
  "actor_emails[]": S.optionalWith(S.Array(S.String), { nullable: true }),
  "resource_ids[]": S.optionalWith(S.Array(S.String), { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListAuditLogsResponseObject extends S.Literal("list") {}

export class AuditLogActorType extends S.Literal("session", "api_key") {}

export class AuditLogActorUser extends S.Struct({
  "id": S.optionalWith(S.String, { nullable: true }),
  "email": S.optionalWith(S.String, { nullable: true })
}) {}

export class AuditLogActorSession extends S.Struct({
  "user": S.optionalWith(AuditLogActorUser, { nullable: true }),
  "ip_address": S.optionalWith(S.String, { nullable: true })
}) {}

export class AuditLogActorApiKeyType extends S.Literal("user", "service_account") {}

export class AuditLogActorServiceAccount extends S.Struct({
  "id": S.optionalWith(S.String, { nullable: true })
}) {}

export class AuditLogActorApiKey extends S.Struct({
  "id": S.optionalWith(S.String, { nullable: true }),
  "type": S.optionalWith(AuditLogActorApiKeyType, { nullable: true }),
  "user": S.optionalWith(AuditLogActorUser, { nullable: true }),
  "service_account": S.optionalWith(AuditLogActorServiceAccount, { nullable: true })
}) {}

export class AuditLogActor extends S.Struct({
  "type": S.optionalWith(AuditLogActorType, { nullable: true }),
  "session": S.optionalWith(AuditLogActorSession, { nullable: true }),
  "api_key": S.optionalWith(AuditLogActorApiKey, { nullable: true })
}) {}

export class AuditLog extends S.Struct({
  "id": S.String,
  "type": AuditLogEventType,
  "effective_at": S.Int,
  "project": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "name": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "actor": AuditLogActor,
  "api_key.created": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "data": S.optionalWith(
        S.Struct({
          "scopes": S.optionalWith(S.Array(S.String), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "api_key.updated": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "changes_requested": S.optionalWith(
        S.Struct({
          "scopes": S.optionalWith(S.Array(S.String), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "api_key.deleted": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "invite.sent": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "data": S.optionalWith(
        S.Struct({
          "email": S.optionalWith(S.String, { nullable: true }),
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "invite.accepted": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "invite.deleted": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "login.failed": S.optionalWith(
    S.Struct({
      "error_code": S.optionalWith(S.String, { nullable: true }),
      "error_message": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "logout.failed": S.optionalWith(
    S.Struct({
      "error_code": S.optionalWith(S.String, { nullable: true }),
      "error_message": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "organization.updated": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "changes_requested": S.optionalWith(
        S.Struct({
          "title": S.optionalWith(S.String, { nullable: true }),
          "description": S.optionalWith(S.String, { nullable: true }),
          "name": S.optionalWith(S.String, { nullable: true }),
          "settings": S.optionalWith(
            S.Struct({
              "threads_ui_visibility": S.optionalWith(S.String, { nullable: true }),
              "usage_dashboard_visibility": S.optionalWith(S.String, { nullable: true })
            }),
            { nullable: true }
          )
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "project.created": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "data": S.optionalWith(
        S.Struct({
          "name": S.optionalWith(S.String, { nullable: true }),
          "title": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "project.updated": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "changes_requested": S.optionalWith(
        S.Struct({
          "title": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "project.archived": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "rate_limit.updated": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "changes_requested": S.optionalWith(
        S.Struct({
          "max_requests_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
          "max_tokens_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
          "max_images_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
          "max_audio_megabytes_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
          "max_requests_per_1_day": S.optionalWith(S.Int, { nullable: true }),
          "batch_1_day_max_input_tokens": S.optionalWith(S.Int, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "rate_limit.deleted": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "service_account.created": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "data": S.optionalWith(
        S.Struct({
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "service_account.updated": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "changes_requested": S.optionalWith(
        S.Struct({
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "service_account.deleted": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "user.added": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "data": S.optionalWith(
        S.Struct({
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "user.updated": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "changes_requested": S.optionalWith(
        S.Struct({
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "user.deleted": S.optionalWith(
    S.Struct({
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  )
}) {}

export class ListAuditLogsResponse extends S.Class<ListAuditLogsResponse>("ListAuditLogsResponse")({
  "object": ListAuditLogsResponseObject,
  "data": S.Array(AuditLog),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class UsageCostsParamsBucketWidth extends S.Literal("1d") {}

export class UsageCostsParams extends S.Struct({
  "start_time": S.Int,
  "end_time": S.optionalWith(S.Int, { nullable: true }),
  "bucket_width": S.optionalWith(UsageCostsParamsBucketWidth, { nullable: true, default: () => "1d" as const }),
  "project_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "group_by": S.optionalWith(S.Array(S.Literal("project_id", "line_item")), { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 7 as const }),
  "page": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageResponseObject extends S.Literal("page") {}

export class UsageTimeBucketObject extends S.Literal("bucket") {}

export class UsageCompletionsResultObject extends S.Literal("organization.usage.completions.result") {}

export class UsageCompletionsResult extends S.Struct({
  "object": UsageCompletionsResultObject,
  "input_tokens": S.Int,
  "input_cached_tokens": S.optionalWith(S.Int, { nullable: true }),
  "output_tokens": S.Int,
  "input_audio_tokens": S.optionalWith(S.Int, { nullable: true }),
  "output_audio_tokens": S.optionalWith(S.Int, { nullable: true }),
  "num_model_requests": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true }),
  "batch": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class UsageEmbeddingsResultObject extends S.Literal("organization.usage.embeddings.result") {}

export class UsageEmbeddingsResult extends S.Struct({
  "object": UsageEmbeddingsResultObject,
  "input_tokens": S.Int,
  "num_model_requests": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageModerationsResultObject extends S.Literal("organization.usage.moderations.result") {}

export class UsageModerationsResult extends S.Struct({
  "object": UsageModerationsResultObject,
  "input_tokens": S.Int,
  "num_model_requests": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageImagesResultObject extends S.Literal("organization.usage.images.result") {}

export class UsageImagesResult extends S.Struct({
  "object": UsageImagesResultObject,
  "images": S.Int,
  "num_model_requests": S.Int,
  "source": S.optionalWith(S.String, { nullable: true }),
  "size": S.optionalWith(S.String, { nullable: true }),
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageAudioSpeechesResultObject extends S.Literal("organization.usage.audio_speeches.result") {}

export class UsageAudioSpeechesResult extends S.Struct({
  "object": UsageAudioSpeechesResultObject,
  "characters": S.Int,
  "num_model_requests": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageAudioTranscriptionsResultObject extends S.Literal("organization.usage.audio_transcriptions.result") {}

export class UsageAudioTranscriptionsResult extends S.Struct({
  "object": UsageAudioTranscriptionsResultObject,
  "seconds": S.Int,
  "num_model_requests": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageVectorStoresResultObject extends S.Literal("organization.usage.vector_stores.result") {}

export class UsageVectorStoresResult extends S.Struct({
  "object": UsageVectorStoresResultObject,
  "usage_bytes": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageCodeInterpreterSessionsResultObject
  extends S.Literal("organization.usage.code_interpreter_sessions.result")
{}

export class UsageCodeInterpreterSessionsResult extends S.Struct({
  "object": UsageCodeInterpreterSessionsResultObject,
  "num_sessions": S.optionalWith(S.Int, { nullable: true }),
  "project_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class CostsResultObject extends S.Literal("organization.costs.result") {}

export class CostsResult extends S.Struct({
  "object": CostsResultObject,
  "amount": S.optionalWith(
    S.Struct({
      "value": S.optionalWith(S.Number, { nullable: true }),
      "currency": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "line_item": S.optionalWith(S.String, { nullable: true }),
  "project_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageTimeBucket extends S.Struct({
  "object": UsageTimeBucketObject,
  "start_time": S.Int,
  "end_time": S.Int,
  "result": S.Array(
    S.Union(
      UsageCompletionsResult,
      UsageEmbeddingsResult,
      UsageModerationsResult,
      UsageImagesResult,
      UsageAudioSpeechesResult,
      UsageAudioTranscriptionsResult,
      UsageVectorStoresResult,
      UsageCodeInterpreterSessionsResult,
      CostsResult
    )
  )
}) {}

export class UsageResponse extends S.Class<UsageResponse>("UsageResponse")({
  "object": UsageResponseObject,
  "data": S.Array(UsageTimeBucket),
  "has_more": S.Boolean,
  "next_page": S.String
}) {}

export class ListInvitesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

export class InviteListResponseObject extends S.Literal("list") {}

export class InviteObject extends S.Literal("organization.invite") {}

export class InviteRole extends S.Literal("owner", "reader") {}

export class InviteStatus extends S.Literal("accepted", "expired", "pending") {}

export class Invite extends S.Struct({
  "object": InviteObject,
  "id": S.String,
  "email": S.String,
  "role": InviteRole,
  "status": InviteStatus,
  "invited_at": S.Int,
  "expires_at": S.Int,
  "accepted_at": S.optionalWith(S.Int, { nullable: true }),
  "projects": S.optionalWith(
    S.Array(S.Struct({
      "id": S.optionalWith(S.String, { nullable: true }),
      "role": S.optionalWith(S.Literal("member", "owner"), { nullable: true })
    })),
    { nullable: true }
  )
}) {}

export class InviteListResponse extends S.Class<InviteListResponse>("InviteListResponse")({
  "object": InviteListResponseObject,
  "data": S.Array(Invite),
  "first_id": S.optionalWith(S.String, { nullable: true }),
  "last_id": S.optionalWith(S.String, { nullable: true }),
  "has_more": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class InviteRequestRole extends S.Literal("reader", "owner") {}

export class InviteRequest extends S.Class<InviteRequest>("InviteRequest")({
  "email": S.String,
  "role": InviteRequestRole,
  "projects": S.optionalWith(
    S.Array(S.Struct({
      "id": S.String,
      "role": S.Literal("member", "owner")
    })),
    { nullable: true }
  )
}) {}

export class InviteDeleteResponseObject extends S.Literal("organization.invite.deleted") {}

export class InviteDeleteResponse extends S.Class<InviteDeleteResponse>("InviteDeleteResponse")({
  "object": InviteDeleteResponseObject,
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class ListProjectsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "include_archived": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
}) {}

export class ProjectListResponseObject extends S.Literal("list") {}

export class ProjectObject extends S.Literal("organization.project") {}

export class ProjectStatus extends S.Literal("active", "archived") {}

export class Project extends S.Struct({
  "id": S.String,
  "object": ProjectObject,
  "name": S.String,
  "created_at": S.Int,
  "archived_at": S.optionalWith(S.Int, { nullable: true }),
  "status": ProjectStatus
}) {}

export class ProjectListResponse extends S.Class<ProjectListResponse>("ProjectListResponse")({
  "object": ProjectListResponseObject,
  "data": S.Array(Project),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class ProjectCreateRequest extends S.Class<ProjectCreateRequest>("ProjectCreateRequest")({
  "name": S.String
}) {}

export class ProjectUpdateRequest extends S.Class<ProjectUpdateRequest>("ProjectUpdateRequest")({
  "name": S.String
}) {}

export class Error extends S.Struct({
  "code": S.NullOr(S.String),
  "message": S.String,
  "param": S.NullOr(S.String),
  "type": S.String
}) {}

export class ErrorResponse extends S.Class<ErrorResponse>("ErrorResponse")({
  "error": Error
}) {}

export class ListProjectApiKeysParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

export class ProjectApiKeyListResponseObject extends S.Literal("list") {}

export class ProjectApiKeyObject extends S.Literal("organization.project.api_key") {}

export class ProjectApiKeyOwnerType extends S.Literal("user", "service_account") {}

export class ProjectUserObject extends S.Literal("organization.project.user") {}

export class ProjectUserRole extends S.Literal("owner", "member") {}

export class ProjectUser extends S.Struct({
  "object": ProjectUserObject,
  "id": S.String,
  "name": S.String,
  "email": S.String,
  "role": ProjectUserRole,
  "added_at": S.Int
}) {}

export class ProjectServiceAccountObject extends S.Literal("organization.project.service_account") {}

export class ProjectServiceAccountRole extends S.Literal("owner", "member") {}

export class ProjectServiceAccount extends S.Struct({
  "object": ProjectServiceAccountObject,
  "id": S.String,
  "name": S.String,
  "role": ProjectServiceAccountRole,
  "created_at": S.Int
}) {}

export class ProjectApiKey extends S.Struct({
  "object": ProjectApiKeyObject,
  "redacted_value": S.String,
  "name": S.String,
  "created_at": S.Int,
  "id": S.String,
  "owner": S.Struct({
    "type": S.optionalWith(ProjectApiKeyOwnerType, { nullable: true }),
    "user": S.optionalWith(ProjectUser, { nullable: true }),
    "service_account": S.optionalWith(ProjectServiceAccount, { nullable: true })
  })
}) {}

export class ProjectApiKeyListResponse extends S.Class<ProjectApiKeyListResponse>("ProjectApiKeyListResponse")({
  "object": ProjectApiKeyListResponseObject,
  "data": S.Array(ProjectApiKey),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class ProjectApiKeyDeleteResponseObject extends S.Literal("organization.project.api_key.deleted") {}

export class ProjectApiKeyDeleteResponse extends S.Class<ProjectApiKeyDeleteResponse>("ProjectApiKeyDeleteResponse")({
  "object": ProjectApiKeyDeleteResponseObject,
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class ListProjectRateLimitsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 100 as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

export class ProjectRateLimitListResponseObject extends S.Literal("list") {}

export class ProjectRateLimitObject extends S.Literal("project.rate_limit") {}

export class ProjectRateLimit extends S.Struct({
  "object": ProjectRateLimitObject,
  "id": S.String,
  "model": S.String,
  "max_requests_per_1_minute": S.Int,
  "max_tokens_per_1_minute": S.Int,
  "max_images_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
  "max_audio_megabytes_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
  "max_requests_per_1_day": S.optionalWith(S.Int, { nullable: true }),
  "batch_1_day_max_input_tokens": S.optionalWith(S.Int, { nullable: true })
}) {}

export class ProjectRateLimitListResponse
  extends S.Class<ProjectRateLimitListResponse>("ProjectRateLimitListResponse")({
    "object": ProjectRateLimitListResponseObject,
    "data": S.Array(ProjectRateLimit),
    "first_id": S.String,
    "last_id": S.String,
    "has_more": S.Boolean
  })
{}

export class ProjectRateLimitUpdateRequest
  extends S.Class<ProjectRateLimitUpdateRequest>("ProjectRateLimitUpdateRequest")({
    "max_requests_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
    "max_tokens_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
    "max_images_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
    "max_audio_megabytes_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
    "max_requests_per_1_day": S.optionalWith(S.Int, { nullable: true }),
    "batch_1_day_max_input_tokens": S.optionalWith(S.Int, { nullable: true })
  })
{}

export class ListProjectServiceAccountsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

export class ProjectServiceAccountListResponseObject extends S.Literal("list") {}

export class ProjectServiceAccountListResponse
  extends S.Class<ProjectServiceAccountListResponse>("ProjectServiceAccountListResponse")({
    "object": ProjectServiceAccountListResponseObject,
    "data": S.Array(ProjectServiceAccount),
    "first_id": S.String,
    "last_id": S.String,
    "has_more": S.Boolean
  })
{}

export class ProjectServiceAccountCreateRequest
  extends S.Class<ProjectServiceAccountCreateRequest>("ProjectServiceAccountCreateRequest")({
    "name": S.String
  })
{}

export class ProjectServiceAccountCreateResponseObject extends S.Literal("organization.project.service_account") {}

export class ProjectServiceAccountCreateResponseRole extends S.Literal("member") {}

export class ProjectServiceAccountApiKeyObject extends S.Literal("organization.project.service_account.api_key") {}

export class ProjectServiceAccountApiKey extends S.Struct({
  "object": ProjectServiceAccountApiKeyObject,
  "value": S.String,
  "name": S.String,
  "created_at": S.Int,
  "id": S.String
}) {}

export class ProjectServiceAccountCreateResponse
  extends S.Class<ProjectServiceAccountCreateResponse>("ProjectServiceAccountCreateResponse")({
    "object": ProjectServiceAccountCreateResponseObject,
    "id": S.String,
    "name": S.String,
    "role": ProjectServiceAccountCreateResponseRole,
    "created_at": S.Int,
    "api_key": ProjectServiceAccountApiKey
  })
{}

export class ProjectServiceAccountDeleteResponseObject
  extends S.Literal("organization.project.service_account.deleted")
{}

export class ProjectServiceAccountDeleteResponse
  extends S.Class<ProjectServiceAccountDeleteResponse>("ProjectServiceAccountDeleteResponse")({
    "object": ProjectServiceAccountDeleteResponseObject,
    "id": S.String,
    "deleted": S.Boolean
  })
{}

export class ListProjectUsersParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

export class ProjectUserListResponse extends S.Class<ProjectUserListResponse>("ProjectUserListResponse")({
  "object": S.String,
  "data": S.Array(ProjectUser),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class ProjectUserCreateRequestRole extends S.Literal("owner", "member") {}

export class ProjectUserCreateRequest extends S.Class<ProjectUserCreateRequest>("ProjectUserCreateRequest")({
  "user_id": S.String,
  "role": ProjectUserCreateRequestRole
}) {}

export class ProjectUserUpdateRequestRole extends S.Literal("owner", "member") {}

export class ProjectUserUpdateRequest extends S.Class<ProjectUserUpdateRequest>("ProjectUserUpdateRequest")({
  "role": ProjectUserUpdateRequestRole
}) {}

export class ProjectUserDeleteResponseObject extends S.Literal("organization.project.user.deleted") {}

export class ProjectUserDeleteResponse extends S.Class<ProjectUserDeleteResponse>("ProjectUserDeleteResponse")({
  "object": ProjectUserDeleteResponseObject,
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class UsageAudioSpeechesParamsBucketWidth extends S.Literal("1m", "1h", "1d") {}

export class UsageAudioSpeechesParams extends S.Struct({
  "start_time": S.Int,
  "end_time": S.optionalWith(S.Int, { nullable: true }),
  "bucket_width": S.optionalWith(UsageAudioSpeechesParamsBucketWidth, { nullable: true, default: () => "1d" as const }),
  "project_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "user_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "api_key_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "models": S.optionalWith(S.Array(S.String), { nullable: true }),
  "group_by": S.optionalWith(S.Array(S.Literal("project_id", "user_id", "api_key_id", "model")), { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true }),
  "page": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageAudioTranscriptionsParamsBucketWidth extends S.Literal("1m", "1h", "1d") {}

export class UsageAudioTranscriptionsParams extends S.Struct({
  "start_time": S.Int,
  "end_time": S.optionalWith(S.Int, { nullable: true }),
  "bucket_width": S.optionalWith(UsageAudioTranscriptionsParamsBucketWidth, {
    nullable: true,
    default: () => "1d" as const
  }),
  "project_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "user_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "api_key_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "models": S.optionalWith(S.Array(S.String), { nullable: true }),
  "group_by": S.optionalWith(S.Array(S.Literal("project_id", "user_id", "api_key_id", "model")), { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true }),
  "page": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageCodeInterpreterSessionsParamsBucketWidth extends S.Literal("1m", "1h", "1d") {}

export class UsageCodeInterpreterSessionsParams extends S.Struct({
  "start_time": S.Int,
  "end_time": S.optionalWith(S.Int, { nullable: true }),
  "bucket_width": S.optionalWith(UsageCodeInterpreterSessionsParamsBucketWidth, {
    nullable: true,
    default: () => "1d" as const
  }),
  "project_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "group_by": S.optionalWith(S.Array(S.Literal("project_id")), { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true }),
  "page": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageCompletionsParamsBucketWidth extends S.Literal("1m", "1h", "1d") {}

export class UsageCompletionsParams extends S.Struct({
  "start_time": S.Int,
  "end_time": S.optionalWith(S.Int, { nullable: true }),
  "bucket_width": S.optionalWith(UsageCompletionsParamsBucketWidth, { nullable: true, default: () => "1d" as const }),
  "project_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "user_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "api_key_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "models": S.optionalWith(S.Array(S.String), { nullable: true }),
  "batch": S.optionalWith(S.Boolean, { nullable: true }),
  "group_by": S.optionalWith(S.Array(S.Literal("project_id", "user_id", "api_key_id", "model", "batch")), {
    nullable: true
  }),
  "limit": S.optionalWith(S.Int, { nullable: true }),
  "page": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageEmbeddingsParamsBucketWidth extends S.Literal("1m", "1h", "1d") {}

export class UsageEmbeddingsParams extends S.Struct({
  "start_time": S.Int,
  "end_time": S.optionalWith(S.Int, { nullable: true }),
  "bucket_width": S.optionalWith(UsageEmbeddingsParamsBucketWidth, { nullable: true, default: () => "1d" as const }),
  "project_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "user_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "api_key_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "models": S.optionalWith(S.Array(S.String), { nullable: true }),
  "group_by": S.optionalWith(S.Array(S.Literal("project_id", "user_id", "api_key_id", "model")), { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true }),
  "page": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageImagesParamsBucketWidth extends S.Literal("1m", "1h", "1d") {}

export class UsageImagesParams extends S.Struct({
  "start_time": S.Int,
  "end_time": S.optionalWith(S.Int, { nullable: true }),
  "bucket_width": S.optionalWith(UsageImagesParamsBucketWidth, { nullable: true, default: () => "1d" as const }),
  "sources": S.optionalWith(S.Array(S.Literal("image.generation", "image.edit", "image.variation")), {
    nullable: true
  }),
  "sizes": S.optionalWith(S.Array(S.Literal("256x256", "512x512", "1024x1024", "1792x1792", "1024x1792")), {
    nullable: true
  }),
  "project_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "user_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "api_key_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "models": S.optionalWith(S.Array(S.String), { nullable: true }),
  "group_by": S.optionalWith(S.Array(S.Literal("project_id", "user_id", "api_key_id", "model", "size", "source")), {
    nullable: true
  }),
  "limit": S.optionalWith(S.Int, { nullable: true }),
  "page": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageModerationsParamsBucketWidth extends S.Literal("1m", "1h", "1d") {}

export class UsageModerationsParams extends S.Struct({
  "start_time": S.Int,
  "end_time": S.optionalWith(S.Int, { nullable: true }),
  "bucket_width": S.optionalWith(UsageModerationsParamsBucketWidth, { nullable: true, default: () => "1d" as const }),
  "project_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "user_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "api_key_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "models": S.optionalWith(S.Array(S.String), { nullable: true }),
  "group_by": S.optionalWith(S.Array(S.Literal("project_id", "user_id", "api_key_id", "model")), { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true }),
  "page": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageVectorStoresParamsBucketWidth extends S.Literal("1m", "1h", "1d") {}

export class UsageVectorStoresParams extends S.Struct({
  "start_time": S.Int,
  "end_time": S.optionalWith(S.Int, { nullable: true }),
  "bucket_width": S.optionalWith(UsageVectorStoresParamsBucketWidth, { nullable: true, default: () => "1d" as const }),
  "project_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  "group_by": S.optionalWith(S.Array(S.Literal("project_id")), { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true }),
  "page": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListUsersParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "emails": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

export class UserListResponseObject extends S.Literal("list") {}

export class UserObject extends S.Literal("organization.user") {}

export class UserRole extends S.Literal("owner", "reader") {}

export class User extends S.Struct({
  "object": UserObject,
  "id": S.String,
  "name": S.String,
  "email": S.String,
  "role": UserRole,
  "added_at": S.Int
}) {}

export class UserListResponse extends S.Class<UserListResponse>("UserListResponse")({
  "object": UserListResponseObject,
  "data": S.Array(User),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class UserRoleUpdateRequestRole extends S.Literal("owner", "reader") {}

export class UserRoleUpdateRequest extends S.Class<UserRoleUpdateRequest>("UserRoleUpdateRequest")({
  "role": UserRoleUpdateRequestRole
}) {}

export class UserDeleteResponseObject extends S.Literal("organization.user.deleted") {}

export class UserDeleteResponse extends S.Class<UserDeleteResponse>("UserDeleteResponse")({
  "object": UserDeleteResponseObject,
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class RealtimeSessionCreateRequestModel extends S.Literal(
  "gpt-4o-realtime-preview",
  "gpt-4o-realtime-preview-2024-10-01",
  "gpt-4o-realtime-preview-2024-12-17",
  "gpt-4o-mini-realtime-preview",
  "gpt-4o-mini-realtime-preview-2024-12-17"
) {}

export class RealtimeSessionCreateRequestVoice
  extends S.Literal("alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse")
{}

export class RealtimeSessionCreateRequestInputAudioFormat extends S.Literal("pcm16", "g711_ulaw", "g711_alaw") {}

export class RealtimeSessionCreateRequestOutputAudioFormat extends S.Literal("pcm16", "g711_ulaw", "g711_alaw") {}

export class RealtimeSessionCreateRequestMaxResponseOutputTokensEnum extends S.Literal("inf") {}

export class RealtimeSessionCreateRequest
  extends S.Class<RealtimeSessionCreateRequest>("RealtimeSessionCreateRequest")({
    "model": S.optionalWith(RealtimeSessionCreateRequestModel, { nullable: true }),
    "instructions": S.optionalWith(S.String, { nullable: true }),
    "voice": S.optionalWith(RealtimeSessionCreateRequestVoice, { nullable: true }),
    "input_audio_format": S.optionalWith(RealtimeSessionCreateRequestInputAudioFormat, { nullable: true }),
    "output_audio_format": S.optionalWith(RealtimeSessionCreateRequestOutputAudioFormat, { nullable: true }),
    "input_audio_transcription": S.optionalWith(
      S.Struct({
        "model": S.optionalWith(S.String, { nullable: true }),
        "language": S.optionalWith(S.String, { nullable: true }),
        "prompt": S.optionalWith(S.String, { nullable: true })
      }),
      { nullable: true }
    ),
    "turn_detection": S.optionalWith(
      S.Struct({
        "type": S.optionalWith(S.String, { nullable: true }),
        "threshold": S.optionalWith(S.Number, { nullable: true }),
        "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
        "silence_duration_ms": S.optionalWith(S.Int, { nullable: true }),
        "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
        "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const })
      }),
      { nullable: true }
    ),
    "tools": S.optionalWith(
      S.Array(S.Struct({
        "type": S.optionalWith(S.Literal("function"), { nullable: true }),
        "name": S.optionalWith(S.String, { nullable: true }),
        "description": S.optionalWith(S.String, { nullable: true }),
        "parameters": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
      })),
      { nullable: true }
    ),
    "tool_choice": S.optionalWith(S.String, { nullable: true }),
    "temperature": S.optionalWith(S.Number, { nullable: true }),
    "max_response_output_tokens": S.optionalWith(
      S.Union(S.Int, RealtimeSessionCreateRequestMaxResponseOutputTokensEnum),
      { nullable: true }
    )
  })
{}

export class RealtimeSessionCreateResponseVoice
  extends S.Literal("alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse")
{}

export class RealtimeSessionCreateResponseMaxResponseOutputTokensEnum extends S.Literal("inf") {}

export class RealtimeSessionCreateResponse
  extends S.Class<RealtimeSessionCreateResponse>("RealtimeSessionCreateResponse")({
    "client_secret": S.Struct({
      "value": S.String,
      "expires_at": S.Int
    }),
    "instructions": S.optionalWith(S.String, { nullable: true }),
    "voice": S.optionalWith(RealtimeSessionCreateResponseVoice, { nullable: true }),
    "input_audio_format": S.optionalWith(S.String, { nullable: true }),
    "output_audio_format": S.optionalWith(S.String, { nullable: true }),
    "input_audio_transcription": S.optionalWith(
      S.Struct({
        "model": S.optionalWith(S.String, { nullable: true })
      }),
      { nullable: true }
    ),
    "turn_detection": S.optionalWith(
      S.Struct({
        "type": S.optionalWith(S.String, { nullable: true }),
        "threshold": S.optionalWith(S.Number, { nullable: true }),
        "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
        "silence_duration_ms": S.optionalWith(S.Int, { nullable: true })
      }),
      { nullable: true }
    ),
    "tools": S.optionalWith(
      S.Array(S.Struct({
        "type": S.optionalWith(S.Literal("function"), { nullable: true }),
        "name": S.optionalWith(S.String, { nullable: true }),
        "description": S.optionalWith(S.String, { nullable: true }),
        "parameters": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
      })),
      { nullable: true }
    ),
    "tool_choice": S.optionalWith(S.String, { nullable: true }),
    "temperature": S.optionalWith(S.Number, { nullable: true }),
    "max_response_output_tokens": S.optionalWith(
      S.Union(S.Int, RealtimeSessionCreateResponseMaxResponseOutputTokensEnum),
      { nullable: true }
    )
  })
{}

export class EasyInputMessageRole extends S.Literal("user", "assistant", "system", "developer") {}

export class InputTextType extends S.Literal("input_text") {}

export class InputText extends S.Struct({
  "type": InputTextType,
  "text": S.String
}) {}

export class InputImageType extends S.Literal("input_image") {}

export class InputImageDetail extends S.Literal("high", "low", "auto") {}

export class InputImage extends S.Struct({
  "type": InputImageType,
  "image_url": S.optionalWith(S.String, { nullable: true }),
  "file_id": S.optionalWith(S.String, { nullable: true }),
  "detail": InputImageDetail.pipe(S.propertySignature, S.withConstructorDefault(() => "auto" as const))
}) {}

export class InputFileType extends S.Literal("input_file") {}

export class InputFile extends S.Struct({
  "type": InputFileType,
  "file_id": S.optionalWith(S.String, { nullable: true }),
  "filename": S.optionalWith(S.String, { nullable: true }),
  "file_data": S.optionalWith(S.String, { nullable: true })
}) {}

export class InputContent extends S.Union(InputText, InputImage, InputFile) {}

export class InputMessageContentList extends S.Array(InputContent) {}

export class EasyInputMessageType extends S.Literal("message") {}

export class EasyInputMessage extends S.Struct({
  "role": EasyInputMessageRole,
  "content": S.Union(S.String, InputMessageContentList),
  "type": S.optionalWith(EasyInputMessageType, { nullable: true })
}) {}

export class InputMessageType extends S.Literal("message") {}

export class InputMessageRole extends S.Literal("user", "system", "developer") {}

export class InputMessageStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class InputMessage extends S.Struct({
  "type": S.optionalWith(InputMessageType, { nullable: true }),
  "role": InputMessageRole,
  "status": S.optionalWith(InputMessageStatus, { nullable: true }),
  "content": InputMessageContentList
}) {}

export class OutputMessageType extends S.Literal("message") {}

export class OutputMessageRole extends S.Literal("assistant") {}

export class OutputTextType extends S.Literal("output_text") {}

export class FileCitationType extends S.Literal("file_citation") {}

export class FileCitation extends S.Struct({
  "type": FileCitationType,
  "index": S.Int,
  "file_id": S.String
}) {}

export class UrlCitationType extends S.Literal("url_citation") {}

export class UrlCitation extends S.Struct({
  "url": S.String,
  "title": S.String,
  "type": UrlCitationType,
  "start_index": S.Int,
  "end_index": S.Int
}) {}

export class FilePathType extends S.Literal("file_path") {}

export class FilePath extends S.Struct({
  "type": FilePathType,
  "file_id": S.String,
  "index": S.Int
}) {}

export class Annotation extends S.Union(FileCitation, UrlCitation, FilePath) {}

export class OutputText extends S.Struct({
  "type": OutputTextType,
  "text": S.String,
  "annotations": S.Array(Annotation)
}) {}

export class RefusalType extends S.Literal("refusal") {}

export class Refusal extends S.Struct({
  "type": RefusalType,
  "refusal": S.String
}) {}

export class OutputContent extends S.Union(OutputText, Refusal) {}

export class OutputMessageStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class OutputMessage extends S.Struct({
  "id": S.String,
  "type": OutputMessageType,
  "role": OutputMessageRole,
  "content": S.Array(OutputContent),
  "status": OutputMessageStatus
}) {}

export class FileSearchToolCallType extends S.Literal("file_search_call") {}

export class FileSearchToolCallStatus
  extends S.Literal("in_progress", "searching", "completed", "incomplete", "failed")
{}

export class VectorStoreFileAttributes extends S.Record({ key: S.String, value: S.Unknown }) {}

export class FileSearchToolCall extends S.Struct({
  "id": S.String,
  "type": FileSearchToolCallType,
  "status": FileSearchToolCallStatus,
  "queries": S.Array(S.String),
  "results": S.optionalWith(
    S.Array(S.Struct({
      "file_id": S.optionalWith(S.String, { nullable: true }),
      "text": S.optionalWith(S.String, { nullable: true }),
      "filename": S.optionalWith(S.String, { nullable: true }),
      "attributes": S.optionalWith(VectorStoreFileAttributes, { nullable: true }),
      "score": S.optionalWith(S.Number, { nullable: true })
    })),
    { nullable: true }
  )
}) {}

export class ComputerToolCallType extends S.Literal("computer_call") {}

export class ClickType extends S.Literal("click") {}

export class ClickButton extends S.Literal("left", "right", "wheel", "back", "forward") {}

export class Click extends S.Struct({
  "type": ClickType.pipe(S.propertySignature, S.withConstructorDefault(() => "click" as const)),
  "button": ClickButton,
  "x": S.Int,
  "y": S.Int
}) {}

export class DoubleClickType extends S.Literal("double_click") {}

export class DoubleClick extends S.Struct({
  "type": DoubleClickType.pipe(S.propertySignature, S.withConstructorDefault(() => "double_click" as const)),
  "x": S.Int,
  "y": S.Int
}) {}

export class DragType extends S.Literal("drag") {}

export class Coordinate extends S.Struct({
  "x": S.Int,
  "y": S.Int
}) {}

export class Drag extends S.Struct({
  "type": DragType.pipe(S.propertySignature, S.withConstructorDefault(() => "drag" as const)),
  "path": S.Array(Coordinate)
}) {}

export class KeyPressType extends S.Literal("keypress") {}

export class KeyPress extends S.Struct({
  "type": KeyPressType.pipe(S.propertySignature, S.withConstructorDefault(() => "keypress" as const)),
  "keys": S.Array(S.String)
}) {}

export class MoveType extends S.Literal("move") {}

export class Move extends S.Struct({
  "type": MoveType.pipe(S.propertySignature, S.withConstructorDefault(() => "move" as const)),
  "x": S.Int,
  "y": S.Int
}) {}

export class ScreenshotType extends S.Literal("screenshot") {}

export class Screenshot extends S.Struct({
  "type": ScreenshotType.pipe(S.propertySignature, S.withConstructorDefault(() => "screenshot" as const))
}) {}

export class ScrollType extends S.Literal("scroll") {}

export class Scroll extends S.Struct({
  "type": ScrollType.pipe(S.propertySignature, S.withConstructorDefault(() => "scroll" as const)),
  "x": S.Int,
  "y": S.Int,
  "scroll_x": S.Int,
  "scroll_y": S.Int
}) {}

export class TypeType extends S.Literal("type") {}

export class Type extends S.Struct({
  "type": TypeType.pipe(S.propertySignature, S.withConstructorDefault(() => "type" as const)),
  "text": S.String
}) {}

export class WaitType extends S.Literal("wait") {}

export class Wait extends S.Struct({
  "type": WaitType.pipe(S.propertySignature, S.withConstructorDefault(() => "wait" as const))
}) {}

export class ComputerAction extends S.Union(Click, DoubleClick, Drag, KeyPress, Move, Screenshot, Scroll, Type, Wait) {}

export class ComputerToolCallSafetyCheck extends S.Struct({
  "id": S.String,
  "code": S.String,
  "message": S.String
}) {}

export class ComputerToolCallStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class ComputerToolCall extends S.Struct({
  "type": ComputerToolCallType.pipe(S.propertySignature, S.withConstructorDefault(() => "computer_call" as const)),
  "id": S.String,
  "call_id": S.String,
  "action": ComputerAction,
  "pending_safety_checks": S.Array(ComputerToolCallSafetyCheck),
  "status": ComputerToolCallStatus
}) {}

export class ComputerToolCallOutputType extends S.Literal("computer_call_output") {}

export class ComputerScreenshotImageType extends S.Literal("computer_screenshot") {}

export class ComputerScreenshotImage extends S.Struct({
  "type": ComputerScreenshotImageType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "computer_screenshot" as const)
  ),
  "image_url": S.optionalWith(S.String, { nullable: true }),
  "file_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class ComputerToolCallOutputStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class ComputerToolCallOutput extends S.Struct({
  "type": ComputerToolCallOutputType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "computer_call_output" as const)
  ),
  "id": S.optionalWith(S.String, { nullable: true }),
  "call_id": S.String,
  "acknowledged_safety_checks": S.optionalWith(S.Array(ComputerToolCallSafetyCheck), { nullable: true }),
  "output": ComputerScreenshotImage,
  "status": S.optionalWith(ComputerToolCallOutputStatus, { nullable: true })
}) {}

export class WebSearchToolCallType extends S.Literal("web_search_call") {}

export class WebSearchToolCallStatus extends S.Literal("in_progress", "searching", "completed", "failed") {}

export class WebSearchToolCall extends S.Struct({
  "id": S.String,
  "type": WebSearchToolCallType,
  "status": WebSearchToolCallStatus
}) {}

export class FunctionToolCallType extends S.Literal("function_call") {}

export class FunctionToolCallStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class FunctionToolCall extends S.Struct({
  "id": S.String,
  "type": FunctionToolCallType,
  "call_id": S.String,
  "name": S.String,
  "arguments": S.String,
  "status": S.optionalWith(FunctionToolCallStatus, { nullable: true })
}) {}

export class FunctionToolCallOutputType extends S.Literal("function_call_output") {}

export class FunctionToolCallOutputStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class FunctionToolCallOutput extends S.Struct({
  "id": S.optionalWith(S.String, { nullable: true }),
  "type": FunctionToolCallOutputType,
  "call_id": S.String,
  "output": S.String,
  "status": S.optionalWith(FunctionToolCallOutputStatus, { nullable: true })
}) {}

export class ReasoningItemType extends S.Literal("reasoning") {}

export class ReasoningItemStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class ReasoningItem extends S.Struct({
  "type": ReasoningItemType,
  "id": S.String,
  "content": S.Array(S.Struct({
    "type": S.Literal("reasoning_summary"),
    "text": S.String
  })),
  "status": S.optionalWith(ReasoningItemStatus, { nullable: true })
}) {}

export class Item extends S.Record({ key: S.String, value: S.Unknown }) {}

export class ItemReferenceType extends S.Literal("item_reference") {}

export class ItemReference extends S.Struct({
  "id": S.String,
  "type": ItemReferenceType
}) {}

export class InputItem
  extends S.Union(EasyInputMessage, S.Record({ key: S.String, value: S.Unknown }), ItemReference)
{}

export class Includable extends S.Literal(
  "file_search_call.results",
  "message.input_image.image_url",
  "computer_call_output.output.image_url"
) {}

export class ReasoningGenerateSummary extends S.Literal("concise", "detailed") {}

export class Reasoning extends S.Struct({
  "effort": S.NullOr(ReasoningEffort).pipe(S.propertySignature, S.withConstructorDefault(() => "medium" as const)),
  "generate_summary": S.optionalWith(ReasoningGenerateSummary, { nullable: true })
}) {}

export class TextResponseFormatJsonSchemaType extends S.Literal("json_schema") {}

export class TextResponseFormatJsonSchema extends S.Struct({
  "type": TextResponseFormatJsonSchemaType,
  "description": S.optionalWith(S.String, { nullable: true }),
  "name": S.optionalWith(S.String, { nullable: true }),
  "schema": ResponseFormatJsonSchemaSchema,
  "strict": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
}) {}

export class TextResponseFormatConfiguration
  extends S.Union(ResponseFormatText, TextResponseFormatJsonSchema, ResponseFormatJsonObject)
{}

export class FileSearchToolType extends S.Literal("file_search") {}

export class ComparisonFilterType extends S.Literal("eq", "ne", "gt", "gte", "lt", "lte") {}

export class ComparisonFilter extends S.Struct({
  "type": ComparisonFilterType.pipe(S.propertySignature, S.withConstructorDefault(() => "eq" as const)),
  "key": S.String,
  "value": S.Union(S.String, S.Number, S.Boolean)
}) {}

export class CompoundFilterType extends S.Literal("and", "or") {}

export class CompoundFilter extends S.Struct({
  "type": CompoundFilterType,
  "filters": S.Array(ComparisonFilter)
}) {}

export class FileSearchToolRankingOptionsRanker extends S.Literal("auto", "default-2024-11-15") {}

export class FileSearchTool extends S.Struct({
  "type": FileSearchToolType,
  "vector_store_ids": S.Array(S.String),
  "max_num_results": S.optionalWith(S.Int, { nullable: true }),
  "filters": S.optionalWith(S.Union(ComparisonFilter, CompoundFilter), { nullable: true }),
  "ranking_options": S.optionalWith(
    S.Struct({
      "ranker": S.optionalWith(FileSearchToolRankingOptionsRanker, { nullable: true, default: () => "auto" as const }),
      "score_threshold": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
        nullable: true,
        default: () => 0 as const
      })
    }),
    { nullable: true }
  )
}) {}

export class FunctionToolType extends S.Literal("function") {}

export class FunctionTool extends S.Struct({
  "type": FunctionToolType,
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "parameters": S.Record({ key: S.String, value: S.Unknown }),
  "strict": S.Boolean
}) {}

export class ComputerToolType extends S.Literal("computer-preview") {}

export class ComputerToolEnvironment extends S.Literal("mac", "windows", "ubuntu", "browser") {}

export class ComputerTool extends S.Struct({
  "type": ComputerToolType,
  "display_width": S.Number,
  "display_height": S.Number,
  "environment": ComputerToolEnvironment
}) {}

export class WebSearchToolType extends S.Literal("web_search_preview", "web_search_preview_2025_03_11") {}

export class WebSearchToolUserLocationEnumType extends S.Literal("approximate") {}

export class WebSearchToolUserLocation extends S.Struct({
  "type": S.Literal("approximate"),
  "country": S.optionalWith(S.String, { nullable: true }),
  "region": S.optionalWith(S.String, { nullable: true }),
  "city": S.optionalWith(S.String, { nullable: true }),
  "timezone": S.optionalWith(S.String, { nullable: true })
}) {}

export class WebSearchTool extends S.Struct({
  "type": WebSearchToolType,
  "user_location": S.optionalWith(WebSearchToolUserLocation, { nullable: true }),
  "search_context_size": S.optionalWith(WebSearchContextSize, { nullable: true, default: () => "medium" as const })
}) {}

export class Tool extends S.Union(FileSearchTool, FunctionTool, ComputerTool, WebSearchTool) {}

export class ToolChoiceOptions extends S.Literal("none", "auto", "required") {}

export class ToolChoiceTypesType
  extends S.Literal("file_search", "web_search_preview", "computer_use_preview", "web_search_preview_2025_03_11")
{}

export class ToolChoiceTypes extends S.Struct({
  "type": ToolChoiceTypesType
}) {}

export class ToolChoiceFunctionType extends S.Literal("function") {}

export class ToolChoiceFunction extends S.Struct({
  "type": ToolChoiceFunctionType,
  "name": S.String
}) {}

export class CreateResponseTruncation extends S.Literal("auto", "disabled") {}

export class CreateResponseModelEnum extends S.Literal(
  "o3-mini",
  "o3-mini-2025-01-31",
  "o1",
  "o1-2024-12-17",
  "o1-preview",
  "o1-preview-2024-09-12",
  "o1-mini",
  "o1-mini-2024-09-12",
  "computer-use-preview",
  "computer-use-preview-2025-02-04",
  "computer-use-preview-2025-03-11",
  "gpt-4.5-preview",
  "gpt-4.5-preview-2025-02-27",
  "gpt-4o",
  "gpt-4o-2024-11-20",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "gpt-4o-audio-preview",
  "gpt-4o-audio-preview-2024-10-01",
  "gpt-4o-audio-preview-2024-12-17",
  "gpt-4o-mini-audio-preview",
  "gpt-4o-mini-audio-preview-2024-12-17",
  "chatgpt-4o-latest",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-0125-preview",
  "gpt-4-turbo-preview",
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-0301",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-16k-0613"
) {}

export class CreateResponse extends S.Class<CreateResponse>("CreateResponse")({
  "input": S.Union(S.String, S.Array(InputItem)),
  "include": S.optionalWith(S.Array(Includable), { nullable: true }),
  "parallel_tool_calls": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
  "store": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "previous_response_id": S.optionalWith(S.String, { nullable: true }),
  "reasoning": S.optionalWith(Reasoning, { nullable: true }),
  "max_output_tokens": S.optionalWith(S.Int, { nullable: true }),
  "instructions": S.optionalWith(S.String, { nullable: true }),
  "text": S.optionalWith(
    S.Struct({
      "format": S.optionalWith(TextResponseFormatConfiguration, { nullable: true })
    }),
    { nullable: true }
  ),
  "tools": S.optionalWith(S.Array(Tool), { nullable: true }),
  "tool_choice": S.optionalWith(S.Union(ToolChoiceOptions, ToolChoiceTypes, ToolChoiceFunction), { nullable: true }),
  "truncation": S.optionalWith(CreateResponseTruncation, { nullable: true, default: () => "disabled" as const }),
  "model": S.Union(S.String, CreateResponseModelEnum),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

export class ResponseObject extends S.Literal("response") {}

export class ResponseStatus extends S.Literal("completed", "failed", "in_progress", "incomplete") {}

export class ResponseErrorCode extends S.Literal(
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

export class ResponseError extends S.Struct({
  "code": ResponseErrorCode,
  "message": S.String
}) {}

export class ResponseIncompleteDetailsReason extends S.Literal("max_output_tokens", "content_filter") {}

export class OutputItem extends S.Union(
  OutputMessage,
  FileSearchToolCall,
  FunctionToolCall,
  WebSearchToolCall,
  ComputerToolCall,
  ReasoningItem
) {}

export class ResponseUsage extends S.Struct({
  "input_tokens": S.Int,
  "output_tokens": S.Int,
  "output_tokens_details": S.Struct({
    "reasoning_tokens": S.Int
  }),
  "total_tokens": S.Int
}) {}

export class ResponseTruncation extends S.Literal("auto", "disabled") {}

export class ResponseModelEnum extends S.Literal(
  "o3-mini",
  "o3-mini-2025-01-31",
  "o1",
  "o1-2024-12-17",
  "o1-preview",
  "o1-preview-2024-09-12",
  "o1-mini",
  "o1-mini-2024-09-12",
  "computer-use-preview",
  "computer-use-preview-2025-02-04",
  "computer-use-preview-2025-03-11",
  "gpt-4.5-preview",
  "gpt-4.5-preview-2025-02-27",
  "gpt-4o",
  "gpt-4o-2024-11-20",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "gpt-4o-audio-preview",
  "gpt-4o-audio-preview-2024-10-01",
  "gpt-4o-audio-preview-2024-12-17",
  "gpt-4o-mini-audio-preview",
  "gpt-4o-mini-audio-preview-2024-12-17",
  "chatgpt-4o-latest",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-0125-preview",
  "gpt-4-turbo-preview",
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-0301",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-16k-0613"
) {}

export class Response extends S.Class<Response>("Response")({
  "id": S.String,
  "object": ResponseObject,
  "status": S.optionalWith(ResponseStatus, { nullable: true }),
  "created_at": S.Number,
  "error": S.NullOr(ResponseError),
  "incomplete_details": S.NullOr(S.Struct({
    "reason": S.optionalWith(ResponseIncompleteDetailsReason, { nullable: true })
  })),
  "output": S.Array(OutputItem),
  "output_text": S.optionalWith(S.String, { nullable: true }),
  "usage": S.optionalWith(ResponseUsage, { nullable: true }),
  "parallel_tool_calls": S.Boolean.pipe(S.propertySignature, S.withConstructorDefault(() => true as const)),
  "previous_response_id": S.optionalWith(S.String, { nullable: true }),
  "reasoning": S.optionalWith(Reasoning, { nullable: true }),
  "max_output_tokens": S.optionalWith(S.Int, { nullable: true }),
  "instructions": S.NullOr(S.String),
  "text": S.optionalWith(
    S.Struct({
      "format": S.optionalWith(TextResponseFormatConfiguration, { nullable: true })
    }),
    { nullable: true }
  ),
  "tools": S.Array(Tool),
  "tool_choice": S.Union(ToolChoiceOptions, ToolChoiceTypes, ToolChoiceFunction),
  "truncation": S.optionalWith(ResponseTruncation, { nullable: true, default: () => "disabled" as const }),
  "model": S.Union(S.String, ResponseModelEnum),
  "metadata": S.NullOr(Metadata),
  "temperature": S.NullOr(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2))).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 1 as const)
  ),
  "top_p": S.NullOr(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1))).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 1 as const)
  ),
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

export class GetResponseParams extends S.Struct({
  "include": S.optionalWith(S.Array(Includable), { nullable: true })
}) {}

export class ListInputItemsParamsOrder extends S.Literal("asc", "desc") {}

export class ListInputItemsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListInputItemsParamsOrder, { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

export class ResponseItemListObject extends S.Literal("list") {}

export class InputMessageResourceType extends S.Literal("message") {}

export class InputMessageResourceRole extends S.Literal("user", "system", "developer") {}

export class InputMessageResourceStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class InputMessageResource extends S.Struct({
  "id": S.String,
  "type": S.optionalWith(InputMessageResourceType, { nullable: true }),
  "role": InputMessageResourceRole,
  "status": S.optionalWith(InputMessageResourceStatus, { nullable: true }),
  "content": InputMessageContentList
}) {}

export class ComputerToolCallOutputResourceType extends S.Literal("computer_call_output") {}

export class ComputerToolCallOutputResourceStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class ComputerToolCallOutputResource extends S.Struct({
  "id": S.String,
  "type": ComputerToolCallOutputResourceType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "computer_call_output" as const)
  ),
  "call_id": S.String,
  "acknowledged_safety_checks": S.optionalWith(S.Array(ComputerToolCallSafetyCheck), { nullable: true }),
  "output": ComputerScreenshotImage,
  "status": S.optionalWith(ComputerToolCallOutputResourceStatus, { nullable: true })
}) {}

export class FunctionToolCallOutputResourceType extends S.Literal("function_call_output") {}

export class FunctionToolCallOutputResourceStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class FunctionToolCallOutputResource extends S.Struct({
  "id": S.String,
  "type": FunctionToolCallOutputResourceType,
  "call_id": S.String,
  "output": S.String,
  "status": S.optionalWith(FunctionToolCallOutputResourceStatus, { nullable: true })
}) {}

export class ItemResource extends S.Union(
  InputMessageResource,
  OutputMessage,
  FileSearchToolCall,
  ComputerToolCall,
  ComputerToolCallOutputResource,
  WebSearchToolCall,
  FunctionToolCall,
  FunctionToolCallOutputResource
) {}

export class ResponseItemList extends S.Class<ResponseItemList>("ResponseItemList")({
  "object": ResponseItemListObject,
  "data": S.Array(ItemResource),
  "has_more": S.Boolean,
  "first_id": S.String,
  "last_id": S.String
}) {}

export class CreateMessageRequestRole extends S.Literal("user", "assistant") {}

export class MessageContentImageFileObjectType extends S.Literal("image_file") {}

export class MessageContentImageFileObjectImageFileDetail extends S.Literal("auto", "low", "high") {}

export class MessageContentImageFileObject extends S.Struct({
  "type": MessageContentImageFileObjectType,
  "image_file": S.Struct({
    "file_id": S.String,
    "detail": S.optionalWith(MessageContentImageFileObjectImageFileDetail, {
      nullable: true,
      default: () => "auto" as const
    })
  })
}) {}

export class MessageContentImageUrlObjectType extends S.Literal("image_url") {}

export class MessageContentImageUrlObjectImageUrlDetail extends S.Literal("auto", "low", "high") {}

export class MessageContentImageUrlObject extends S.Struct({
  "type": MessageContentImageUrlObjectType,
  "image_url": S.Struct({
    "url": S.String,
    "detail": S.optionalWith(MessageContentImageUrlObjectImageUrlDetail, {
      nullable: true,
      default: () => "auto" as const
    })
  })
}) {}

export class MessageRequestContentTextObjectType extends S.Literal("text") {}

export class MessageRequestContentTextObject extends S.Struct({
  "type": MessageRequestContentTextObjectType,
  "text": S.String
}) {}

export class AssistantToolsFileSearchTypeOnlyType extends S.Literal("file_search") {}

export class AssistantToolsFileSearchTypeOnly extends S.Struct({
  "type": AssistantToolsFileSearchTypeOnlyType
}) {}

export class CreateMessageRequest extends S.Struct({
  "role": CreateMessageRequestRole,
  "content": S.Union(
    S.String,
    S.NonEmptyArray(
      S.Union(MessageContentImageFileObject, MessageContentImageUrlObject, MessageRequestContentTextObject)
    )
  ),
  "attachments": S.optionalWith(
    S.Array(S.Struct({
      "file_id": S.optionalWith(S.String, { nullable: true }),
      "tools": S.optionalWith(S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearchTypeOnly)), {
        nullable: true
      })
    })),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class CreateThreadRequest extends S.Class<CreateThreadRequest>("CreateThreadRequest")({
  "messages": S.optionalWith(S.Array(CreateMessageRequest), { nullable: true }),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true }),
          "vector_stores": S.optionalWith(
            S.Array(S.Struct({
              "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(10000)), { nullable: true }),
              "chunking_strategy": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
              "metadata": S.optionalWith(Metadata, { nullable: true })
            })).pipe(S.maxItems(1)),
            { nullable: true }
          )
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class ThreadObjectObject extends S.Literal("thread") {}

export class ThreadObject extends S.Class<ThreadObject>("ThreadObject")({
  "id": S.String,
  "object": ThreadObjectObject,
  "created_at": S.Int,
  "tool_resources": S.NullOr(S.Struct({
    "code_interpreter": S.optionalWith(
      S.Struct({
        "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
          nullable: true,
          default: () => [] as const
        })
      }),
      { nullable: true }
    ),
    "file_search": S.optionalWith(
      S.Struct({
        "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
      }),
      { nullable: true }
    )
  })),
  "metadata": S.NullOr(Metadata)
}) {}

export class CreateThreadAndRunRequestModelEnum extends S.Literal(
  "gpt-4o",
  "gpt-4o-2024-11-20",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "gpt-4.5-preview",
  "gpt-4.5-preview-2025-02-27",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-0125-preview",
  "gpt-4-turbo-preview",
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-16k-0613"
) {}

export class CreateThreadAndRunRequestTruncationStrategyEnumType extends S.Literal("auto", "last_messages") {}

export class CreateThreadAndRunRequestTruncationStrategy extends S.Struct({
  "type": S.Literal("auto", "last_messages"),
  "last_messages": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

export class CreateThreadAndRunRequestToolChoiceEnumEnum extends S.Literal("none", "auto", "required") {}

export class AssistantsNamedToolChoiceType extends S.Literal("function", "code_interpreter", "file_search") {}

export class AssistantsNamedToolChoice extends S.Struct({
  "type": AssistantsNamedToolChoiceType,
  "function": S.optionalWith(
    S.Struct({
      "name": S.String
    }),
    { nullable: true }
  )
}) {}

export class CreateThreadAndRunRequestToolChoice
  extends S.Union(S.Literal("none", "auto", "required"), AssistantsNamedToolChoice)
{}

export class CreateThreadAndRunRequest extends S.Class<CreateThreadAndRunRequest>("CreateThreadAndRunRequest")({
  "assistant_id": S.String,
  "thread": S.optionalWith(CreateThreadRequest, { nullable: true }),
  "model": S.optionalWith(S.Union(S.String, CreateThreadAndRunRequestModelEnum), { nullable: true }),
  "instructions": S.optionalWith(S.String, { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(20)),
    { nullable: true }
  ),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  "max_prompt_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(256)), { nullable: true }),
  "max_completion_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(256)), { nullable: true }),
  "truncation_strategy": S.optionalWith(CreateThreadAndRunRequestTruncationStrategy, { nullable: true }),
  "tool_choice": S.optionalWith(CreateThreadAndRunRequestToolChoice, { nullable: true }),
  "parallel_tool_calls": S.optionalWith(ParallelToolCalls, { nullable: true, default: () => true as const }),
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

export class RunObjectObject extends S.Literal("thread.run") {}

export class RunObjectStatus extends S.Literal(
  "queued",
  "in_progress",
  "requires_action",
  "cancelling",
  "cancelled",
  "failed",
  "completed",
  "incomplete",
  "expired"
) {}

export class RunObjectRequiredActionType extends S.Literal("submit_tool_outputs") {}

export class RunToolCallObjectType extends S.Literal("function") {}

export class RunToolCallObject extends S.Struct({
  "id": S.String,
  "type": RunToolCallObjectType,
  "function": S.Struct({
    "name": S.String,
    "arguments": S.String
  })
}) {}

export class RunObjectLastErrorCode extends S.Literal("server_error", "rate_limit_exceeded", "invalid_prompt") {}

export class RunObjectIncompleteDetailsReason extends S.Literal("max_completion_tokens", "max_prompt_tokens") {}

export class RunCompletionUsage extends S.Struct({
  "completion_tokens": S.Int,
  "prompt_tokens": S.Int,
  "total_tokens": S.Int
}) {}

export class RunObjectTruncationStrategyEnumType extends S.Literal("auto", "last_messages") {}

export class RunObjectTruncationStrategy extends S.Struct({
  "type": S.Literal("auto", "last_messages"),
  "last_messages": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

export class RunObjectToolChoiceEnumEnum extends S.Literal("none", "auto", "required") {}

export class RunObjectToolChoice extends S.Union(S.Literal("none", "auto", "required"), AssistantsNamedToolChoice) {}

export class RunObject extends S.Class<RunObject>("RunObject")({
  "id": S.String,
  "object": RunObjectObject,
  "created_at": S.Int,
  "thread_id": S.String,
  "assistant_id": S.String,
  "status": RunObjectStatus,
  "required_action": S.NullOr(S.Struct({
    "type": RunObjectRequiredActionType,
    "submit_tool_outputs": S.Struct({
      "tool_calls": S.Array(RunToolCallObject)
    })
  })),
  "last_error": S.NullOr(S.Struct({
    "code": RunObjectLastErrorCode,
    "message": S.String
  })),
  "expires_at": S.NullOr(S.Int),
  "started_at": S.NullOr(S.Int),
  "cancelled_at": S.NullOr(S.Int),
  "failed_at": S.NullOr(S.Int),
  "completed_at": S.NullOr(S.Int),
  "incomplete_details": S.NullOr(S.Struct({
    "reason": S.optionalWith(RunObjectIncompleteDetailsReason, { nullable: true })
  })),
  "model": S.String,
  "instructions": S.String,
  "tools": S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(20))
    .pipe(S.propertySignature, S.withConstructorDefault(() => [] as const)),
  "metadata": S.NullOr(Metadata),
  "usage": S.NullOr(RunCompletionUsage),
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  "top_p": S.optionalWith(S.Number, { nullable: true }),
  "max_prompt_tokens": S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(256))),
  "max_completion_tokens": S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(256))),
  "truncation_strategy": RunObjectTruncationStrategy,
  "tool_choice": RunObjectToolChoice,
  "parallel_tool_calls": ParallelToolCalls.pipe(S.propertySignature, S.withConstructorDefault(() => true as const)),
  "response_format": AssistantsApiResponseFormatOption
}) {}

export class ModifyThreadRequest extends S.Class<ModifyThreadRequest>("ModifyThreadRequest")({
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class DeleteThreadResponseObject extends S.Literal("thread.deleted") {}

export class DeleteThreadResponse extends S.Class<DeleteThreadResponse>("DeleteThreadResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": DeleteThreadResponseObject
}) {}

export class ListMessagesParamsOrder extends S.Literal("asc", "desc") {}

export class ListMessagesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListMessagesParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true }),
  "run_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageObjectObject extends S.Literal("thread.message") {}

export class MessageObjectStatus extends S.Literal("in_progress", "incomplete", "completed") {}

export class MessageObjectIncompleteDetailsReason
  extends S.Literal("content_filter", "max_tokens", "run_cancelled", "run_expired", "run_failed")
{}

export class MessageObjectRole extends S.Literal("user", "assistant") {}

export class MessageContentTextObjectType extends S.Literal("text") {}

export class MessageContentTextAnnotationsFileCitationObjectType extends S.Literal("file_citation") {}

export class MessageContentTextAnnotationsFileCitationObject extends S.Struct({
  "type": MessageContentTextAnnotationsFileCitationObjectType,
  "text": S.String,
  "file_citation": S.Struct({
    "file_id": S.String
  }),
  "start_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_index": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class MessageContentTextAnnotationsFilePathObjectType extends S.Literal("file_path") {}

export class MessageContentTextAnnotationsFilePathObject extends S.Struct({
  "type": MessageContentTextAnnotationsFilePathObjectType,
  "text": S.String,
  "file_path": S.Struct({
    "file_id": S.String
  }),
  "start_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_index": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class MessageContentTextObject extends S.Struct({
  "type": MessageContentTextObjectType,
  "text": S.Struct({
    "value": S.String,
    "annotations": S.Array(
      S.Union(MessageContentTextAnnotationsFileCitationObject, MessageContentTextAnnotationsFilePathObject)
    )
  })
}) {}

export class MessageContentRefusalObjectType extends S.Literal("refusal") {}

export class MessageContentRefusalObject extends S.Struct({
  "type": MessageContentRefusalObjectType,
  "refusal": S.String
}) {}

export class MessageObject extends S.Struct({
  "id": S.String,
  "object": MessageObjectObject,
  "created_at": S.Int,
  "thread_id": S.String,
  "status": MessageObjectStatus,
  "incomplete_details": S.NullOr(S.Struct({
    "reason": MessageObjectIncompleteDetailsReason
  })),
  "completed_at": S.NullOr(S.Int),
  "incomplete_at": S.NullOr(S.Int),
  "role": MessageObjectRole,
  "content": S.Array(
    S.Union(
      MessageContentImageFileObject,
      MessageContentImageUrlObject,
      MessageContentTextObject,
      MessageContentRefusalObject
    )
  ),
  "assistant_id": S.NullOr(S.String),
  "run_id": S.NullOr(S.String),
  "attachments": S.NullOr(S.Array(S.Struct({
    "file_id": S.optionalWith(S.String, { nullable: true }),
    "tools": S.optionalWith(S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearchTypeOnly)), { nullable: true })
  }))),
  "metadata": S.NullOr(Metadata)
}) {}

export class ListMessagesResponse extends S.Class<ListMessagesResponse>("ListMessagesResponse")({
  "object": S.String,
  "data": S.Array(MessageObject),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class ModifyMessageRequest extends S.Class<ModifyMessageRequest>("ModifyMessageRequest")({
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class DeleteMessageResponseObject extends S.Literal("thread.message.deleted") {}

export class DeleteMessageResponse extends S.Class<DeleteMessageResponse>("DeleteMessageResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": DeleteMessageResponseObject
}) {}

export class ListRunsParamsOrder extends S.Literal("asc", "desc") {}

export class ListRunsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListRunsParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListRunsResponse extends S.Class<ListRunsResponse>("ListRunsResponse")({
  "object": S.String,
  "data": S.Array(RunObject),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class CreateRunParams extends S.Struct({
  "include[]": S.optionalWith(S.Array(S.Literal("step_details.tool_calls[*].file_search.results[*].content")), {
    nullable: true
  })
}) {}

export class CreateRunRequestTruncationStrategyEnumType extends S.Literal("auto", "last_messages") {}

export class CreateRunRequestTruncationStrategy extends S.Struct({
  "type": S.Literal("auto", "last_messages"),
  "last_messages": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

export class CreateRunRequestToolChoiceEnumEnum extends S.Literal("none", "auto", "required") {}

export class CreateRunRequestToolChoice
  extends S.Union(S.Literal("none", "auto", "required"), AssistantsNamedToolChoice)
{}

export class CreateRunRequest extends S.Class<CreateRunRequest>("CreateRunRequest")({
  "assistant_id": S.String,
  "model": S.optionalWith(S.Union(S.String, AssistantSupportedModels), { nullable: true }),
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  "instructions": S.optionalWith(S.String, { nullable: true }),
  "additional_instructions": S.optionalWith(S.String, { nullable: true }),
  "additional_messages": S.optionalWith(S.Array(CreateMessageRequest), { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(20)),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  "max_prompt_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(256)), { nullable: true }),
  "max_completion_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(256)), { nullable: true }),
  "truncation_strategy": S.optionalWith(CreateRunRequestTruncationStrategy, { nullable: true }),
  "tool_choice": S.optionalWith(CreateRunRequestToolChoice, { nullable: true }),
  "parallel_tool_calls": S.optionalWith(ParallelToolCalls, { nullable: true, default: () => true as const }),
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

export class ModifyRunRequest extends S.Class<ModifyRunRequest>("ModifyRunRequest")({
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class ListRunStepsParamsOrder extends S.Literal("asc", "desc") {}

export class ListRunStepsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListRunStepsParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true }),
  "include[]": S.optionalWith(S.Array(S.Literal("step_details.tool_calls[*].file_search.results[*].content")), {
    nullable: true
  })
}) {}

export class RunStepObjectObject extends S.Literal("thread.run.step") {}

export class RunStepObjectType extends S.Literal("message_creation", "tool_calls") {}

export class RunStepObjectStatus extends S.Literal("in_progress", "cancelled", "failed", "completed", "expired") {}

export class RunStepDetailsMessageCreationObjectType extends S.Literal("message_creation") {}

export class RunStepDetailsMessageCreationObject extends S.Struct({
  "type": RunStepDetailsMessageCreationObjectType,
  "message_creation": S.Struct({
    "message_id": S.String
  })
}) {}

export class RunStepDetailsToolCallsObjectType extends S.Literal("tool_calls") {}

export class RunStepDetailsToolCallsCodeObjectType extends S.Literal("code_interpreter") {}

export class RunStepDetailsToolCallsCodeOutputLogsObjectType extends S.Literal("logs") {}

export class RunStepDetailsToolCallsCodeOutputLogsObject extends S.Struct({
  "type": RunStepDetailsToolCallsCodeOutputLogsObjectType,
  "logs": S.String
}) {}

export class RunStepDetailsToolCallsCodeOutputImageObjectType extends S.Literal("image") {}

export class RunStepDetailsToolCallsCodeOutputImageObject extends S.Struct({
  "type": RunStepDetailsToolCallsCodeOutputImageObjectType,
  "image": S.Struct({
    "file_id": S.String
  })
}) {}

export class RunStepDetailsToolCallsCodeObject extends S.Struct({
  "id": S.String,
  "type": RunStepDetailsToolCallsCodeObjectType,
  "code_interpreter": S.Struct({
    "input": S.String,
    "outputs": S.Array(S.Record({ key: S.String, value: S.Unknown }))
  })
}) {}

export class RunStepDetailsToolCallsFileSearchObjectType extends S.Literal("file_search") {}

export class RunStepDetailsToolCallsFileSearchRankingOptionsObject extends S.Struct({
  "ranker": FileSearchRanker,
  "score_threshold": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1))
}) {}

export class RunStepDetailsToolCallsFileSearchResultObject extends S.Struct({
  "file_id": S.String,
  "file_name": S.String,
  "score": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)),
  "content": S.optionalWith(
    S.Array(S.Struct({
      "type": S.optionalWith(S.Literal("text"), { nullable: true }),
      "text": S.optionalWith(S.String, { nullable: true })
    })),
    { nullable: true }
  )
}) {}

export class RunStepDetailsToolCallsFileSearchObject extends S.Struct({
  "id": S.String,
  "type": RunStepDetailsToolCallsFileSearchObjectType,
  "file_search": S.Struct({
    "ranking_options": S.optionalWith(RunStepDetailsToolCallsFileSearchRankingOptionsObject, { nullable: true }),
    "results": S.optionalWith(S.Array(RunStepDetailsToolCallsFileSearchResultObject), { nullable: true })
  })
}) {}

export class RunStepDetailsToolCallsFunctionObjectType extends S.Literal("function") {}

export class RunStepDetailsToolCallsFunctionObject extends S.Struct({
  "id": S.String,
  "type": RunStepDetailsToolCallsFunctionObjectType,
  "function": S.Struct({
    "name": S.String,
    "arguments": S.String,
    "output": S.NullOr(S.String)
  })
}) {}

export class RunStepDetailsToolCallsObject extends S.Struct({
  "type": RunStepDetailsToolCallsObjectType,
  "tool_calls": S.Array(
    S.Union(
      RunStepDetailsToolCallsCodeObject,
      RunStepDetailsToolCallsFileSearchObject,
      RunStepDetailsToolCallsFunctionObject
    )
  )
}) {}

export class RunStepObjectLastErrorCode extends S.Literal("server_error", "rate_limit_exceeded") {}

export class RunStepCompletionUsage extends S.Struct({
  "completion_tokens": S.Int,
  "prompt_tokens": S.Int,
  "total_tokens": S.Int
}) {}

export class RunStepObject extends S.Struct({
  "id": S.String,
  "object": RunStepObjectObject,
  "created_at": S.Int,
  "assistant_id": S.String,
  "thread_id": S.String,
  "run_id": S.String,
  "type": RunStepObjectType,
  "status": RunStepObjectStatus,
  "step_details": S.Record({ key: S.String, value: S.Unknown }),
  "last_error": S.NullOr(S.Struct({
    "code": RunStepObjectLastErrorCode,
    "message": S.String
  })),
  "expired_at": S.NullOr(S.Int),
  "cancelled_at": S.NullOr(S.Int),
  "failed_at": S.NullOr(S.Int),
  "completed_at": S.NullOr(S.Int),
  "metadata": S.NullOr(Metadata),
  "usage": S.NullOr(RunStepCompletionUsage)
}) {}

export class ListRunStepsResponse extends S.Class<ListRunStepsResponse>("ListRunStepsResponse")({
  "object": S.String,
  "data": S.Array(RunStepObject),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class GetRunStepParams extends S.Struct({
  "include[]": S.optionalWith(S.Array(S.Literal("step_details.tool_calls[*].file_search.results[*].content")), {
    nullable: true
  })
}) {}

export class SubmitToolOutputsRunRequest extends S.Class<SubmitToolOutputsRunRequest>("SubmitToolOutputsRunRequest")({
  "tool_outputs": S.Array(S.Struct({
    "tool_call_id": S.optionalWith(S.String, { nullable: true }),
    "output": S.optionalWith(S.String, { nullable: true })
  })),
  "stream": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class CreateUploadRequestPurpose extends S.Literal("assistants", "batch", "fine-tune", "vision") {}

export class CreateUploadRequest extends S.Class<CreateUploadRequest>("CreateUploadRequest")({
  "filename": S.String,
  "purpose": CreateUploadRequestPurpose,
  "bytes": S.Int,
  "mime_type": S.String
}) {}

export class UploadStatus extends S.Literal("pending", "completed", "cancelled", "expired") {}

export class UploadObject extends S.Literal("upload") {}

export class UploadFileEnumObject extends S.Literal("file") {}

export class UploadFileEnumPurpose extends S.Literal(
  "assistants",
  "assistants_output",
  "batch",
  "batch_output",
  "fine-tune",
  "fine-tune-results",
  "vision"
) {}

export class UploadFileEnumStatus extends S.Literal("uploaded", "processed", "error") {}

export class UploadFile extends S.Struct({
  "id": S.String,
  "bytes": S.Int,
  "created_at": S.Int,
  "expires_at": S.optionalWith(S.Int, { nullable: true }),
  "filename": S.String,
  "object": S.Literal("file"),
  "purpose": S.Literal(
    "assistants",
    "assistants_output",
    "batch",
    "batch_output",
    "fine-tune",
    "fine-tune-results",
    "vision"
  ),
  "status": S.Literal("uploaded", "processed", "error"),
  "status_details": S.optionalWith(S.String, { nullable: true })
}) {}

export class Upload extends S.Class<Upload>("Upload")({
  "id": S.String,
  "created_at": S.Int,
  "filename": S.String,
  "bytes": S.Int,
  "purpose": S.String,
  "status": UploadStatus,
  "expires_at": S.Int,
  "object": S.optionalWith(UploadObject, { nullable: true }),
  "file": S.optionalWith(UploadFile, { nullable: true })
}) {}

export class CompleteUploadRequest extends S.Class<CompleteUploadRequest>("CompleteUploadRequest")({
  "part_ids": S.Array(S.String),
  "md5": S.optionalWith(S.String, { nullable: true })
}) {}

export class UploadPartObject extends S.Literal("upload.part") {}

export class UploadPart extends S.Class<UploadPart>("UploadPart")({
  "id": S.String,
  "created_at": S.Int,
  "upload_id": S.String,
  "object": UploadPartObject
}) {}

export class ListVectorStoresParamsOrder extends S.Literal("asc", "desc") {}

export class ListVectorStoresParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListVectorStoresParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

export class VectorStoreObjectObject extends S.Literal("vector_store") {}

export class VectorStoreObjectStatus extends S.Literal("expired", "in_progress", "completed") {}

export class VectorStoreExpirationAfterAnchor extends S.Literal("last_active_at") {}

export class VectorStoreExpirationAfter extends S.Struct({
  "anchor": VectorStoreExpirationAfterAnchor,
  "days": S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(365))
}) {}

export class VectorStoreObject extends S.Struct({
  "id": S.String,
  "object": VectorStoreObjectObject,
  "created_at": S.Int,
  "name": S.String,
  "usage_bytes": S.Int,
  "file_counts": S.Struct({
    "in_progress": S.Int,
    "completed": S.Int,
    "failed": S.Int,
    "cancelled": S.Int,
    "total": S.Int
  }),
  "status": VectorStoreObjectStatus,
  "expires_after": S.optionalWith(VectorStoreExpirationAfter, { nullable: true }),
  "expires_at": S.optionalWith(S.Int, { nullable: true }),
  "last_active_at": S.NullOr(S.Int),
  "metadata": S.NullOr(Metadata)
}) {}

export class ListVectorStoresResponse extends S.Class<ListVectorStoresResponse>("ListVectorStoresResponse")({
  "object": S.String,
  "data": S.Array(VectorStoreObject),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class AutoChunkingStrategyRequestParamType extends S.Literal("auto") {}

export class AutoChunkingStrategyRequestParam extends S.Struct({
  "type": AutoChunkingStrategyRequestParamType
}) {}

export class StaticChunkingStrategyRequestParamType extends S.Literal("static") {}

export class StaticChunkingStrategy extends S.Struct({
  "max_chunk_size_tokens": S.Int.pipe(S.greaterThanOrEqualTo(100), S.lessThanOrEqualTo(4096)),
  "chunk_overlap_tokens": S.Int
}) {}

export class StaticChunkingStrategyRequestParam extends S.Struct({
  "type": StaticChunkingStrategyRequestParamType,
  "static": StaticChunkingStrategy
}) {}

export class CreateVectorStoreRequest extends S.Class<CreateVectorStoreRequest>("CreateVectorStoreRequest")({
  "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(500)), { nullable: true }),
  "name": S.optionalWith(S.String, { nullable: true }),
  "expires_after": S.optionalWith(VectorStoreExpirationAfter, { nullable: true }),
  "chunking_strategy": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class UpdateVectorStoreRequestExpiresAfterEnumAnchor extends S.Literal("last_active_at") {}

export class UpdateVectorStoreRequestExpiresAfter extends S.Struct({
  "anchor": S.Literal("last_active_at"),
  "days": S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(365))
}) {}

export class UpdateVectorStoreRequest extends S.Class<UpdateVectorStoreRequest>("UpdateVectorStoreRequest")({
  "name": S.optionalWith(S.String, { nullable: true }),
  "expires_after": S.optionalWith(UpdateVectorStoreRequestExpiresAfter, { nullable: true }),
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class DeleteVectorStoreResponseObject extends S.Literal("vector_store.deleted") {}

export class DeleteVectorStoreResponse extends S.Class<DeleteVectorStoreResponse>("DeleteVectorStoreResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": DeleteVectorStoreResponseObject
}) {}

export class ChunkingStrategyRequestParam extends S.Record({ key: S.String, value: S.Unknown }) {}

export class CreateVectorStoreFileBatchRequest
  extends S.Class<CreateVectorStoreFileBatchRequest>("CreateVectorStoreFileBatchRequest")({
    "file_ids": S.Array(S.String).pipe(S.minItems(1), S.maxItems(500)),
    "chunking_strategy": S.optionalWith(ChunkingStrategyRequestParam, { nullable: true }),
    "attributes": S.optionalWith(VectorStoreFileAttributes, { nullable: true })
  })
{}

export class VectorStoreFileBatchObjectObject extends S.Literal("vector_store.files_batch") {}

export class VectorStoreFileBatchObjectStatus extends S.Literal("in_progress", "completed", "cancelled", "failed") {}

export class VectorStoreFileBatchObject extends S.Class<VectorStoreFileBatchObject>("VectorStoreFileBatchObject")({
  "id": S.String,
  "object": VectorStoreFileBatchObjectObject,
  "created_at": S.Int,
  "vector_store_id": S.String,
  "status": VectorStoreFileBatchObjectStatus,
  "file_counts": S.Struct({
    "in_progress": S.Int,
    "completed": S.Int,
    "failed": S.Int,
    "cancelled": S.Int,
    "total": S.Int
  })
}) {}

export class ListFilesInVectorStoreBatchParamsOrder extends S.Literal("asc", "desc") {}

export class ListFilesInVectorStoreBatchParamsFilter
  extends S.Literal("in_progress", "completed", "failed", "cancelled")
{}

export class ListFilesInVectorStoreBatchParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListFilesInVectorStoreBatchParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true }),
  "filter": S.optionalWith(ListFilesInVectorStoreBatchParamsFilter, { nullable: true })
}) {}

export class VectorStoreFileObjectObject extends S.Literal("vector_store.file") {}

export class VectorStoreFileObjectStatus extends S.Literal("in_progress", "completed", "cancelled", "failed") {}

export class VectorStoreFileObjectLastErrorCode extends S.Literal("server_error", "unsupported_file", "invalid_file") {}

export class StaticChunkingStrategyResponseParamType extends S.Literal("static") {}

export class StaticChunkingStrategyResponseParam extends S.Struct({
  "type": StaticChunkingStrategyResponseParamType,
  "static": StaticChunkingStrategy
}) {}

export class OtherChunkingStrategyResponseParamType extends S.Literal("other") {}

export class OtherChunkingStrategyResponseParam extends S.Struct({
  "type": OtherChunkingStrategyResponseParamType
}) {}

export class VectorStoreFileObject extends S.Struct({
  "id": S.String,
  "object": VectorStoreFileObjectObject,
  "usage_bytes": S.Int,
  "created_at": S.Int,
  "vector_store_id": S.String,
  "status": VectorStoreFileObjectStatus,
  "last_error": S.NullOr(S.Struct({
    "code": VectorStoreFileObjectLastErrorCode,
    "message": S.String
  })),
  "chunking_strategy": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "attributes": S.optionalWith(VectorStoreFileAttributes, { nullable: true })
}) {}

export class ListVectorStoreFilesResponse
  extends S.Class<ListVectorStoreFilesResponse>("ListVectorStoreFilesResponse")({
    "object": S.String,
    "data": S.Array(VectorStoreFileObject),
    "first_id": S.String,
    "last_id": S.String,
    "has_more": S.Boolean
  })
{}

export class ListVectorStoreFilesParamsOrder extends S.Literal("asc", "desc") {}

export class ListVectorStoreFilesParamsFilter extends S.Literal("in_progress", "completed", "failed", "cancelled") {}

export class ListVectorStoreFilesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListVectorStoreFilesParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true }),
  "filter": S.optionalWith(ListVectorStoreFilesParamsFilter, { nullable: true })
}) {}

export class CreateVectorStoreFileRequest
  extends S.Class<CreateVectorStoreFileRequest>("CreateVectorStoreFileRequest")({
    "file_id": S.String,
    "chunking_strategy": S.optionalWith(ChunkingStrategyRequestParam, { nullable: true }),
    "attributes": S.optionalWith(VectorStoreFileAttributes, { nullable: true })
  })
{}

export class UpdateVectorStoreFileAttributesRequest
  extends S.Class<UpdateVectorStoreFileAttributesRequest>("UpdateVectorStoreFileAttributesRequest")({
    "attributes": S.NullOr(VectorStoreFileAttributes)
  })
{}

export class DeleteVectorStoreFileResponseObject extends S.Literal("vector_store.file.deleted") {}

export class DeleteVectorStoreFileResponse
  extends S.Class<DeleteVectorStoreFileResponse>("DeleteVectorStoreFileResponse")({
    "id": S.String,
    "deleted": S.Boolean,
    "object": DeleteVectorStoreFileResponseObject
  })
{}

export class VectorStoreFileContentResponseObject extends S.Literal("vector_store.file_content.page") {}

export class VectorStoreFileContentResponse
  extends S.Class<VectorStoreFileContentResponse>("VectorStoreFileContentResponse")({
    "object": VectorStoreFileContentResponseObject,
    "data": S.Array(S.Struct({
      "type": S.optionalWith(S.String, { nullable: true }),
      "text": S.optionalWith(S.String, { nullable: true })
    })),
    "has_more": S.Boolean,
    "next_page": S.NullOr(S.String)
  })
{}

export class VectorStoreSearchRequestRankingOptionsRanker extends S.Literal("auto", "default-2024-11-15") {}

export class VectorStoreSearchRequest extends S.Class<VectorStoreSearchRequest>("VectorStoreSearchRequest")({
  "query": S.Union(S.String, S.Array(S.String)),
  "rewrite_query": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "max_num_results": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50)), {
    nullable: true,
    default: () => 10 as const
  }),
  "filters": S.optionalWith(S.Union(ComparisonFilter, CompoundFilter), { nullable: true }),
  "ranking_options": S.optionalWith(
    S.Struct({
      "ranker": S.optionalWith(VectorStoreSearchRequestRankingOptionsRanker, {
        nullable: true,
        default: () => "auto" as const
      }),
      "score_threshold": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
        nullable: true,
        default: () => 0 as const
      })
    }),
    { nullable: true }
  )
}) {}

export class VectorStoreSearchResultsPageObject extends S.Literal("vector_store.search_results.page") {}

export class VectorStoreSearchResultContentObjectType extends S.Literal("text") {}

export class VectorStoreSearchResultContentObject extends S.Struct({
  "type": VectorStoreSearchResultContentObjectType,
  "text": S.String
}) {}

export class VectorStoreSearchResultItem extends S.Struct({
  "file_id": S.String,
  "filename": S.String,
  "score": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)),
  "attributes": S.NullOr(VectorStoreFileAttributes),
  "content": S.Array(VectorStoreSearchResultContentObject)
}) {}

export class VectorStoreSearchResultsPage
  extends S.Class<VectorStoreSearchResultsPage>("VectorStoreSearchResultsPage")({
    "object": VectorStoreSearchResultsPageObject,
    "search_query": S.Array(S.String),
    "data": S.Array(VectorStoreSearchResultItem),
    "has_more": S.Boolean,
    "next_page": S.NullOr(S.String)
  })
{}

export const make = (
  httpClient: HttpClient.HttpClient,
  options: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => Effect.Effect<HttpClient.HttpClient>) | undefined
  } = {}
): Client => {
  const unexpectedStatus = (
    request: HttpClientRequest.HttpClientRequest,
    response: HttpClientResponse.HttpClientResponse
  ) =>
    Effect.flatMap(
      Effect.orElseSucceed(response.text, () => "Unexpected status code"),
      (description) =>
        Effect.fail(
          new HttpClientError.ResponseError({
            request,
            response,
            reason: "StatusCode",
            description
          })
        )
    )
  const applyClientTransform = (client: HttpClient.HttpClient): Effect.Effect<HttpClient.HttpClient> =>
    options.transformClient ? options.transformClient(client) : Effect.succeed(client)
  const decodeError = <A, I, R>(response: HttpClientResponse.HttpClientResponse, schema: S.Schema<A, I, R>) =>
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)(response), Effect.fail)
  return {
    "listAssistants": (options) =>
      HttpClientRequest.make("GET")(`/assistants`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListAssistantsResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createAssistant": (options) =>
      HttpClientRequest.make("POST")(`/assistants`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(AssistantObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "getAssistant": (assistantId) =>
      HttpClientRequest.make("GET")(`/assistants/${assistantId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(AssistantObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "modifyAssistant": (assistantId, options) =>
      HttpClientRequest.make("POST")(`/assistants/${assistantId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(AssistantObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "deleteAssistant": (assistantId) =>
      HttpClientRequest.make("DELETE")(`/assistants/${assistantId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(DeleteAssistantResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createSpeech": (options) =>
      HttpClientRequest.make("POST")(`/audio/speech`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createTranscription": (options) =>
      HttpClientRequest.make("POST")(`/audio/transcriptions`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CreateTranscription200)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createTranslation": (options) =>
      HttpClientRequest.make("POST")(`/audio/translations`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CreateTranslation200)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listBatches": (options) =>
      HttpClientRequest.make("GET")(`/batches`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options["after"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListBatchesResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createBatch": (options) =>
      HttpClientRequest.make("POST")(`/batches`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Batch)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "retrieveBatch": (batchId) =>
      HttpClientRequest.make("GET")(`/batches/${batchId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Batch)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "cancelBatch": (batchId) =>
      HttpClientRequest.make("POST")(`/batches/${batchId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Batch)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listChatCompletions": (options) =>
      HttpClientRequest.make("GET")(`/chat/completions`).pipe(
        HttpClientRequest.setUrlParams({
          "model": options["model"] as UrlParams.Coercible,
          "metadata": options["metadata"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ChatCompletionList)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createChatCompletion": (options) =>
      HttpClientRequest.make("POST")(`/chat/completions`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CreateChatCompletionResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "getChatCompletion": (completionId) =>
      HttpClientRequest.make("GET")(`/chat/completions/${completionId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CreateChatCompletionResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "updateChatCompletion": (completionId, options) =>
      HttpClientRequest.make("POST")(`/chat/completions/${completionId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(CreateChatCompletionResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "deleteChatCompletion": (completionId) =>
      HttpClientRequest.make("DELETE")(`/chat/completions/${completionId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ChatCompletionDeleted)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "getChatCompletionMessages": (completionId, options) =>
      HttpClientRequest.make("GET")(`/chat/completions/${completionId}/messages`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options["after"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ChatCompletionMessageList)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "createCompletion": (options) =>
      HttpClientRequest.make("POST")(`/completions`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CreateCompletionResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createEmbedding": (options) =>
      HttpClientRequest.make("POST")(`/embeddings`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CreateEmbeddingResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listFiles": (options) =>
      HttpClientRequest.make("GET")(`/files`).pipe(
        HttpClientRequest.setUrlParams({
          "purpose": options["purpose"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListFilesResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createFile": (options) =>
      HttpClientRequest.make("POST")(`/files`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(OpenAIFile)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "retrieveFile": (fileId) =>
      HttpClientRequest.make("GET")(`/files/${fileId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(OpenAIFile)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "deleteFile": (fileId) =>
      HttpClientRequest.make("DELETE")(`/files/${fileId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(DeleteFileResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "downloadFile": (fileId) =>
      HttpClientRequest.make("GET")(`/files/${fileId}/content`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(DownloadFile200)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listPaginatedFineTuningJobs": (options) =>
      HttpClientRequest.make("GET")(`/fine_tuning/jobs`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options["after"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "metadata": options["metadata"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListPaginatedFineTuningJobsResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createFineTuningJob": (options) =>
      HttpClientRequest.make("POST")(`/fine_tuning/jobs`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(FineTuningJob)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "retrieveFineTuningJob": (fineTuningJobId) =>
      HttpClientRequest.make("GET")(`/fine_tuning/jobs/${fineTuningJobId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(FineTuningJob)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "cancelFineTuningJob": (fineTuningJobId) =>
      HttpClientRequest.make("POST")(`/fine_tuning/jobs/${fineTuningJobId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(FineTuningJob)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "listFineTuningJobCheckpoints": (fineTuningJobId, options) =>
      HttpClientRequest.make("GET")(`/fine_tuning/jobs/${fineTuningJobId}/checkpoints`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options["after"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ListFineTuningJobCheckpointsResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "listFineTuningEvents": (fineTuningJobId, options) =>
      HttpClientRequest.make("GET")(`/fine_tuning/jobs/${fineTuningJobId}/events`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options["after"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ListFineTuningJobEventsResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "createImageEdit": (options) =>
      HttpClientRequest.make("POST")(`/images/edits`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ImagesResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createImage": (options) =>
      HttpClientRequest.make("POST")(`/images/generations`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ImagesResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createImageVariation": (options) =>
      HttpClientRequest.make("POST")(`/images/variations`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ImagesResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listModels": () =>
      HttpClientRequest.make("GET")(`/models`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListModelsResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "retrieveModel": (model) =>
      HttpClientRequest.make("GET")(`/models/${model}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Model)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "deleteModel": (model) =>
      HttpClientRequest.make("DELETE")(`/models/${model}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(DeleteModelResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createModeration": (options) =>
      HttpClientRequest.make("POST")(`/moderations`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CreateModerationResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "adminApiKeysList": (options) =>
      HttpClientRequest.make("GET")(`/organization/admin_api_keys`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options["after"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ApiKeyList)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "adminApiKeysCreate": (options) =>
      HttpClientRequest.make("POST")(`/organization/admin_api_keys`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(AdminApiKey)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "adminApiKeysGet": (keyId) =>
      HttpClientRequest.make("GET")(`/organization/admin_api_keys/${keyId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(AdminApiKey)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "adminApiKeysDelete": (keyId) =>
      HttpClientRequest.make("DELETE")(`/organization/admin_api_keys/${keyId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(AdminApiKeysDelete200)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listAuditLogs": (options) =>
      HttpClientRequest.make("GET")(`/organization/audit_logs`).pipe(
        HttpClientRequest.setUrlParams({
          "effective_at[gt]": options["effective_at[gt]"] as UrlParams.Coercible,
          "effective_at[gte]": options["effective_at[gte]"] as UrlParams.Coercible,
          "effective_at[lt]": options["effective_at[lt]"] as UrlParams.Coercible,
          "effective_at[lte]": options["effective_at[lte]"] as UrlParams.Coercible,
          "project_ids[]": options["project_ids[]"] as UrlParams.Coercible,
          "event_types[]": options["event_types[]"] as UrlParams.Coercible,
          "actor_ids[]": options["actor_ids[]"] as UrlParams.Coercible,
          "actor_emails[]": options["actor_emails[]"] as UrlParams.Coercible,
          "resource_ids[]": options["resource_ids[]"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListAuditLogsResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "usageCosts": (options) =>
      HttpClientRequest.make("GET")(`/organization/costs`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options["start_time"] as UrlParams.Coercible,
          "end_time": options["end_time"] as UrlParams.Coercible,
          "bucket_width": options["bucket_width"] as UrlParams.Coercible,
          "project_ids": options["project_ids"] as UrlParams.Coercible,
          "group_by": options["group_by"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "page": options["page"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UsageResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listInvites": (options) =>
      HttpClientRequest.make("GET")(`/organization/invites`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(InviteListResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "inviteUser": (options) =>
      HttpClientRequest.make("POST")(`/organization/invites`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Invite)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "retrieveInvite": (inviteId) =>
      HttpClientRequest.make("GET")(`/organization/invites/${inviteId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Invite)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "deleteInvite": (inviteId) =>
      HttpClientRequest.make("DELETE")(`/organization/invites/${inviteId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(InviteDeleteResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listProjects": (options) =>
      HttpClientRequest.make("GET")(`/organization/projects`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "include_archived": options["include_archived"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ProjectListResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createProject": (options) =>
      HttpClientRequest.make("POST")(`/organization/projects`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Project)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "retrieveProject": (projectId) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Project)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "modifyProject": (projectId, options) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Project)(r),
                "400": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listProjectApiKeys": (projectId, options) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/api_keys`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectApiKeyListResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "retrieveProjectApiKey": (projectId, keyId) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/api_keys/${keyId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectApiKey)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "deleteProjectApiKey": (projectId, keyId) =>
      HttpClientRequest.make("DELETE")(`/organization/projects/${projectId}/api_keys/${keyId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectApiKeyDeleteResponse)(r),
                  "400": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "archiveProject": (projectId) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}/archive`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Project)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listProjectRateLimits": (projectId, options) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/rate_limits`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectRateLimitListResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "updateProjectRateLimits": (projectId, rateLimitId, options) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}/rate_limits/${rateLimitId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectRateLimit)(r),
                  "400": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "listProjectServiceAccounts": (projectId, options) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/service_accounts`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectServiceAccountListResponse)(r),
                  "400": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "createProjectServiceAccount": (projectId, options) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}/service_accounts`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectServiceAccountCreateResponse)(r),
                  "400": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "retrieveProjectServiceAccount": (projectId, serviceAccountId) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/service_accounts/${serviceAccountId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectServiceAccount)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "deleteProjectServiceAccount": (projectId, serviceAccountId) =>
      HttpClientRequest.make("DELETE")(`/organization/projects/${projectId}/service_accounts/${serviceAccountId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectServiceAccountDeleteResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "listProjectUsers": (projectId, options) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/users`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUserListResponse)(r),
                  "400": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "createProjectUser": (projectId, options) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}/users`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUser)(r),
                  "400": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "retrieveProjectUser": (projectId, userId) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/users/${userId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUser)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "modifyProjectUser": (projectId, userId, options) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}/users/${userId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUser)(r),
                  "400": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "deleteProjectUser": (projectId, userId) =>
      HttpClientRequest.make("DELETE")(`/organization/projects/${projectId}/users/${userId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUserDeleteResponse)(r),
                  "400": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "usageAudioSpeeches": (options) =>
      HttpClientRequest.make("GET")(`/organization/usage/audio_speeches`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options["start_time"] as UrlParams.Coercible,
          "end_time": options["end_time"] as UrlParams.Coercible,
          "bucket_width": options["bucket_width"] as UrlParams.Coercible,
          "project_ids": options["project_ids"] as UrlParams.Coercible,
          "user_ids": options["user_ids"] as UrlParams.Coercible,
          "api_key_ids": options["api_key_ids"] as UrlParams.Coercible,
          "models": options["models"] as UrlParams.Coercible,
          "group_by": options["group_by"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "page": options["page"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UsageResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "usageAudioTranscriptions": (options) =>
      HttpClientRequest.make("GET")(`/organization/usage/audio_transcriptions`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options["start_time"] as UrlParams.Coercible,
          "end_time": options["end_time"] as UrlParams.Coercible,
          "bucket_width": options["bucket_width"] as UrlParams.Coercible,
          "project_ids": options["project_ids"] as UrlParams.Coercible,
          "user_ids": options["user_ids"] as UrlParams.Coercible,
          "api_key_ids": options["api_key_ids"] as UrlParams.Coercible,
          "models": options["models"] as UrlParams.Coercible,
          "group_by": options["group_by"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "page": options["page"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(UsageResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "usageCodeInterpreterSessions": (options) =>
      HttpClientRequest.make("GET")(`/organization/usage/code_interpreter_sessions`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options["start_time"] as UrlParams.Coercible,
          "end_time": options["end_time"] as UrlParams.Coercible,
          "bucket_width": options["bucket_width"] as UrlParams.Coercible,
          "project_ids": options["project_ids"] as UrlParams.Coercible,
          "group_by": options["group_by"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "page": options["page"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(UsageResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "usageCompletions": (options) =>
      HttpClientRequest.make("GET")(`/organization/usage/completions`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options["start_time"] as UrlParams.Coercible,
          "end_time": options["end_time"] as UrlParams.Coercible,
          "bucket_width": options["bucket_width"] as UrlParams.Coercible,
          "project_ids": options["project_ids"] as UrlParams.Coercible,
          "user_ids": options["user_ids"] as UrlParams.Coercible,
          "api_key_ids": options["api_key_ids"] as UrlParams.Coercible,
          "models": options["models"] as UrlParams.Coercible,
          "batch": options["batch"] as UrlParams.Coercible,
          "group_by": options["group_by"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "page": options["page"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UsageResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "usageEmbeddings": (options) =>
      HttpClientRequest.make("GET")(`/organization/usage/embeddings`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options["start_time"] as UrlParams.Coercible,
          "end_time": options["end_time"] as UrlParams.Coercible,
          "bucket_width": options["bucket_width"] as UrlParams.Coercible,
          "project_ids": options["project_ids"] as UrlParams.Coercible,
          "user_ids": options["user_ids"] as UrlParams.Coercible,
          "api_key_ids": options["api_key_ids"] as UrlParams.Coercible,
          "models": options["models"] as UrlParams.Coercible,
          "group_by": options["group_by"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "page": options["page"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UsageResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "usageImages": (options) =>
      HttpClientRequest.make("GET")(`/organization/usage/images`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options["start_time"] as UrlParams.Coercible,
          "end_time": options["end_time"] as UrlParams.Coercible,
          "bucket_width": options["bucket_width"] as UrlParams.Coercible,
          "sources": options["sources"] as UrlParams.Coercible,
          "sizes": options["sizes"] as UrlParams.Coercible,
          "project_ids": options["project_ids"] as UrlParams.Coercible,
          "user_ids": options["user_ids"] as UrlParams.Coercible,
          "api_key_ids": options["api_key_ids"] as UrlParams.Coercible,
          "models": options["models"] as UrlParams.Coercible,
          "group_by": options["group_by"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "page": options["page"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UsageResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "usageModerations": (options) =>
      HttpClientRequest.make("GET")(`/organization/usage/moderations`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options["start_time"] as UrlParams.Coercible,
          "end_time": options["end_time"] as UrlParams.Coercible,
          "bucket_width": options["bucket_width"] as UrlParams.Coercible,
          "project_ids": options["project_ids"] as UrlParams.Coercible,
          "user_ids": options["user_ids"] as UrlParams.Coercible,
          "api_key_ids": options["api_key_ids"] as UrlParams.Coercible,
          "models": options["models"] as UrlParams.Coercible,
          "group_by": options["group_by"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "page": options["page"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UsageResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "usageVectorStores": (options) =>
      HttpClientRequest.make("GET")(`/organization/usage/vector_stores`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options["start_time"] as UrlParams.Coercible,
          "end_time": options["end_time"] as UrlParams.Coercible,
          "bucket_width": options["bucket_width"] as UrlParams.Coercible,
          "project_ids": options["project_ids"] as UrlParams.Coercible,
          "group_by": options["group_by"] as UrlParams.Coercible,
          "limit": options["limit"] as UrlParams.Coercible,
          "page": options["page"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UsageResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listUsers": (options) =>
      HttpClientRequest.make("GET")(`/organization/users`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "emails": options["emails"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UserListResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "retrieveUser": (userId) =>
      HttpClientRequest.make("GET")(`/organization/users/${userId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(User)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "modifyUser": (userId, options) =>
      HttpClientRequest.make("POST")(`/organization/users/${userId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(User)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "deleteUser": (userId) =>
      HttpClientRequest.make("DELETE")(`/organization/users/${userId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UserDeleteResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createRealtimeSession": (options) =>
      HttpClientRequest.make("POST")(`/realtime/sessions`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(RealtimeSessionCreateResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createResponse": (options) =>
      HttpClientRequest.make("POST")(`/responses`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Response)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "getResponse": (responseId, options) =>
      HttpClientRequest.make("GET")(`/responses/${responseId}`).pipe(
        HttpClientRequest.setUrlParams({ "include": options["include"] as UrlParams.Coercible }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Response)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "deleteResponse": (responseId) =>
      HttpClientRequest.make("DELETE")(`/responses/${responseId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "404": (r) => decodeError(r, Error),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listInputItems": (responseId, options) =>
      HttpClientRequest.make("GET")(`/responses/${responseId}/input_items`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ResponseItemList)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "createThread": (options) =>
      HttpClientRequest.make("POST")(`/threads`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ThreadObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createThreadAndRun": (options) =>
      HttpClientRequest.make("POST")(`/threads/runs`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "getThread": (threadId) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ThreadObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "modifyThread": (threadId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ThreadObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "deleteThread": (threadId) =>
      HttpClientRequest.make("DELETE")(`/threads/${threadId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(DeleteThreadResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listMessages": (threadId, options) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/messages`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible,
          "run_id": options["run_id"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListMessagesResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createMessage": (threadId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/messages`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(MessageObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "getMessage": (threadId, messageId) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/messages/${messageId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(MessageObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "modifyMessage": (threadId, messageId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/messages/${messageId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(MessageObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "deleteMessage": (threadId, messageId) =>
      HttpClientRequest.make("DELETE")(`/threads/${threadId}/messages/${messageId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(DeleteMessageResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "listRuns": (threadId, options) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/runs`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListRunsResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createRun": (threadId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/runs`).pipe(
        HttpClientRequest.setUrlParams({ "include[]": options.params["include[]"] as UrlParams.Coercible }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "getRun": (threadId, runId) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/runs/${runId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "modifyRun": (threadId, runId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/runs/${runId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "cancelRun": (threadId, runId) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/runs/${runId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listRunSteps": (threadId, runId, options) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/runs/${runId}/steps`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible,
          "include[]": options["include[]"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ListRunStepsResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "getRunStep": (threadId, runId, stepId, options) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/runs/${runId}/steps/${stepId}`).pipe(
        HttpClientRequest.setUrlParams({ "include[]": options["include[]"] as UrlParams.Coercible }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(RunStepObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "submitToolOuputsToRun": (threadId, runId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "createUpload": (options) =>
      HttpClientRequest.make("POST")(`/uploads`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Upload)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "cancelUpload": (uploadId) =>
      HttpClientRequest.make("POST")(`/uploads/${uploadId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Upload)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "completeUpload": (uploadId, options) =>
      HttpClientRequest.make("POST")(`/uploads/${uploadId}/complete`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Upload)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "addUploadPart": (uploadId, options) =>
      HttpClientRequest.make("POST")(`/uploads/${uploadId}/parts`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(UploadPart)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listVectorStores": (options) =>
      HttpClientRequest.make("GET")(`/vector_stores`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListVectorStoresResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createVectorStore": (options) =>
      HttpClientRequest.make("POST")(`/vector_stores`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "getVectorStore": (vectorStoreId) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreObject)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "modifyVectorStore": (vectorStoreId, options) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "deleteVectorStore": (vectorStoreId) =>
      HttpClientRequest.make("DELETE")(`/vector_stores/${vectorStoreId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(DeleteVectorStoreResponse)(r),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "createVectorStoreFileBatch": (vectorStoreId, options) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}/file_batches`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileBatchObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "getVectorStoreFileBatch": (vectorStoreId, batchId) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}/file_batches/${batchId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileBatchObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "cancelVectorStoreFileBatch": (vectorStoreId, batchId) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}/file_batches/${batchId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileBatchObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "listFilesInVectorStoreBatch": (vectorStoreId, batchId, options) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}/file_batches/${batchId}/files`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible,
          "filter": options["filter"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ListVectorStoreFilesResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "listVectorStoreFiles": (vectorStoreId, options) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}/files`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"] as UrlParams.Coercible,
          "order": options["order"] as UrlParams.Coercible,
          "after": options["after"] as UrlParams.Coercible,
          "before": options["before"] as UrlParams.Coercible,
          "filter": options["filter"] as UrlParams.Coercible
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(ListVectorStoreFilesResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "createVectorStoreFile": (vectorStoreId, options) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}/files`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "getVectorStoreFile": (vectorStoreId, fileId) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}/files/${fileId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "updateVectorStoreFileAttributes": (vectorStoreId, fileId, options) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}/files/${fileId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileObject)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "deleteVectorStoreFile": (vectorStoreId, fileId) =>
      HttpClientRequest.make("DELETE")(`/vector_stores/${vectorStoreId}/files/${fileId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(DeleteVectorStoreFileResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "retrieveVectorStoreFileContent": (vectorStoreId, fileId) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}/files/${fileId}/content`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileContentResponse)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "searchVectorStore": (vectorStoreId, options) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}/search`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreSearchResultsPage)(r),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      )
  }
}

export interface Client {
  readonly "listAssistants": (
    options: typeof ListAssistantsParams.Encoded
  ) => Effect.Effect<typeof ListAssistantsResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createAssistant": (
    options: typeof CreateAssistantRequest.Encoded
  ) => Effect.Effect<typeof AssistantObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getAssistant": (
    assistantId: string
  ) => Effect.Effect<typeof AssistantObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "modifyAssistant": (
    assistantId: string,
    options: typeof ModifyAssistantRequest.Encoded
  ) => Effect.Effect<typeof AssistantObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteAssistant": (
    assistantId: string
  ) => Effect.Effect<typeof DeleteAssistantResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createSpeech": (
    options: typeof CreateSpeechRequest.Encoded
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  readonly "createTranscription": (
    options: globalThis.FormData
  ) => Effect.Effect<typeof CreateTranscription200.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createTranslation": (
    options: globalThis.FormData
  ) => Effect.Effect<typeof CreateTranslation200.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listBatches": (
    options: typeof ListBatchesParams.Encoded
  ) => Effect.Effect<typeof ListBatchesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createBatch": (
    options: typeof CreateBatchRequest.Encoded
  ) => Effect.Effect<typeof Batch.Type, HttpClientError.HttpClientError | ParseError>
  readonly "retrieveBatch": (
    batchId: string
  ) => Effect.Effect<typeof Batch.Type, HttpClientError.HttpClientError | ParseError>
  readonly "cancelBatch": (
    batchId: string
  ) => Effect.Effect<typeof Batch.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listChatCompletions": (
    options: typeof ListChatCompletionsParams.Encoded
  ) => Effect.Effect<typeof ChatCompletionList.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createChatCompletion": (
    options: typeof CreateChatCompletionRequest.Encoded
  ) => Effect.Effect<typeof CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getChatCompletion": (
    completionId: string
  ) => Effect.Effect<typeof CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "updateChatCompletion": (
    completionId: string,
    options: typeof UpdateChatCompletionRequest.Encoded
  ) => Effect.Effect<typeof CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteChatCompletion": (
    completionId: string
  ) => Effect.Effect<typeof ChatCompletionDeleted.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getChatCompletionMessages": (
    completionId: string,
    options: typeof GetChatCompletionMessagesParams.Encoded
  ) => Effect.Effect<typeof ChatCompletionMessageList.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createCompletion": (
    options: typeof CreateCompletionRequest.Encoded
  ) => Effect.Effect<typeof CreateCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createEmbedding": (
    options: typeof CreateEmbeddingRequest.Encoded
  ) => Effect.Effect<typeof CreateEmbeddingResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listFiles": (
    options: typeof ListFilesParams.Encoded
  ) => Effect.Effect<typeof ListFilesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createFile": (
    options: globalThis.FormData
  ) => Effect.Effect<typeof OpenAIFile.Type, HttpClientError.HttpClientError | ParseError>
  readonly "retrieveFile": (
    fileId: string
  ) => Effect.Effect<typeof OpenAIFile.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteFile": (
    fileId: string
  ) => Effect.Effect<typeof DeleteFileResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "downloadFile": (
    fileId: string
  ) => Effect.Effect<typeof DownloadFile200.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listPaginatedFineTuningJobs": (
    options: typeof ListPaginatedFineTuningJobsParams.Encoded
  ) => Effect.Effect<typeof ListPaginatedFineTuningJobsResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createFineTuningJob": (
    options: typeof CreateFineTuningJobRequest.Encoded
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  readonly "retrieveFineTuningJob": (
    fineTuningJobId: string
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  readonly "cancelFineTuningJob": (
    fineTuningJobId: string
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listFineTuningJobCheckpoints": (
    fineTuningJobId: string,
    options: typeof ListFineTuningJobCheckpointsParams.Encoded
  ) => Effect.Effect<typeof ListFineTuningJobCheckpointsResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listFineTuningEvents": (
    fineTuningJobId: string,
    options: typeof ListFineTuningEventsParams.Encoded
  ) => Effect.Effect<typeof ListFineTuningJobEventsResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createImageEdit": (
    options: globalThis.FormData
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createImage": (
    options: typeof CreateImageRequest.Encoded
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createImageVariation": (
    options: globalThis.FormData
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listModels": () => Effect.Effect<
    typeof ListModelsResponse.Type,
    HttpClientError.HttpClientError | ParseError
  >
  readonly "retrieveModel": (
    model: string
  ) => Effect.Effect<typeof Model.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteModel": (
    model: string
  ) => Effect.Effect<typeof DeleteModelResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createModeration": (
    options: typeof CreateModerationRequest.Encoded
  ) => Effect.Effect<typeof CreateModerationResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "adminApiKeysList": (
    options: typeof AdminApiKeysListParams.Encoded
  ) => Effect.Effect<typeof ApiKeyList.Type, HttpClientError.HttpClientError | ParseError>
  readonly "adminApiKeysCreate": (
    options: typeof AdminApiKeysCreateRequest.Encoded
  ) => Effect.Effect<typeof AdminApiKey.Type, HttpClientError.HttpClientError | ParseError>
  readonly "adminApiKeysGet": (
    keyId: string
  ) => Effect.Effect<typeof AdminApiKey.Type, HttpClientError.HttpClientError | ParseError>
  readonly "adminApiKeysDelete": (
    keyId: string
  ) => Effect.Effect<typeof AdminApiKeysDelete200.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listAuditLogs": (
    options: typeof ListAuditLogsParams.Encoded
  ) => Effect.Effect<typeof ListAuditLogsResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "usageCosts": (
    options: typeof UsageCostsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listInvites": (
    options: typeof ListInvitesParams.Encoded
  ) => Effect.Effect<typeof InviteListResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "inviteUser": (
    options: typeof InviteRequest.Encoded
  ) => Effect.Effect<typeof Invite.Type, HttpClientError.HttpClientError | ParseError>
  readonly "retrieveInvite": (
    inviteId: string
  ) => Effect.Effect<typeof Invite.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteInvite": (
    inviteId: string
  ) => Effect.Effect<typeof InviteDeleteResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listProjects": (
    options: typeof ListProjectsParams.Encoded
  ) => Effect.Effect<typeof ProjectListResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createProject": (
    options: typeof ProjectCreateRequest.Encoded
  ) => Effect.Effect<typeof Project.Type, HttpClientError.HttpClientError | ParseError>
  readonly "retrieveProject": (
    projectId: string
  ) => Effect.Effect<typeof Project.Type, HttpClientError.HttpClientError | ParseError>
  readonly "modifyProject": (
    projectId: string,
    options: typeof ProjectUpdateRequest.Encoded
  ) => Effect.Effect<typeof Project.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "listProjectApiKeys": (
    projectId: string,
    options: typeof ListProjectApiKeysParams.Encoded
  ) => Effect.Effect<typeof ProjectApiKeyListResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "retrieveProjectApiKey": (
    projectId: string,
    keyId: string
  ) => Effect.Effect<typeof ProjectApiKey.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteProjectApiKey": (
    projectId: string,
    keyId: string
  ) => Effect.Effect<
    typeof ProjectApiKeyDeleteResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "archiveProject": (
    projectId: string
  ) => Effect.Effect<typeof Project.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listProjectRateLimits": (
    projectId: string,
    options: typeof ListProjectRateLimitsParams.Encoded
  ) => Effect.Effect<typeof ProjectRateLimitListResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "updateProjectRateLimits": (
    projectId: string,
    rateLimitId: string,
    options: typeof ProjectRateLimitUpdateRequest.Encoded
  ) => Effect.Effect<
    typeof ProjectRateLimit.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "listProjectServiceAccounts": (
    projectId: string,
    options: typeof ListProjectServiceAccountsParams.Encoded
  ) => Effect.Effect<
    typeof ProjectServiceAccountListResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "createProjectServiceAccount": (
    projectId: string,
    options: typeof ProjectServiceAccountCreateRequest.Encoded
  ) => Effect.Effect<
    typeof ProjectServiceAccountCreateResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "retrieveProjectServiceAccount": (
    projectId: string,
    serviceAccountId: string
  ) => Effect.Effect<typeof ProjectServiceAccount.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteProjectServiceAccount": (
    projectId: string,
    serviceAccountId: string
  ) => Effect.Effect<typeof ProjectServiceAccountDeleteResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listProjectUsers": (
    projectId: string,
    options: typeof ListProjectUsersParams.Encoded
  ) => Effect.Effect<
    typeof ProjectUserListResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "createProjectUser": (
    projectId: string,
    options: typeof ProjectUserCreateRequest.Encoded
  ) => Effect.Effect<typeof ProjectUser.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "retrieveProjectUser": (
    projectId: string,
    userId: string
  ) => Effect.Effect<typeof ProjectUser.Type, HttpClientError.HttpClientError | ParseError>
  readonly "modifyProjectUser": (
    projectId: string,
    userId: string,
    options: typeof ProjectUserUpdateRequest.Encoded
  ) => Effect.Effect<typeof ProjectUser.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "deleteProjectUser": (
    projectId: string,
    userId: string
  ) => Effect.Effect<
    typeof ProjectUserDeleteResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "usageAudioSpeeches": (
    options: typeof UsageAudioSpeechesParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "usageAudioTranscriptions": (
    options: typeof UsageAudioTranscriptionsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "usageCodeInterpreterSessions": (
    options: typeof UsageCodeInterpreterSessionsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "usageCompletions": (
    options: typeof UsageCompletionsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "usageEmbeddings": (
    options: typeof UsageEmbeddingsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "usageImages": (
    options: typeof UsageImagesParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "usageModerations": (
    options: typeof UsageModerationsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "usageVectorStores": (
    options: typeof UsageVectorStoresParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listUsers": (
    options: typeof ListUsersParams.Encoded
  ) => Effect.Effect<typeof UserListResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "retrieveUser": (
    userId: string
  ) => Effect.Effect<typeof User.Type, HttpClientError.HttpClientError | ParseError>
  readonly "modifyUser": (
    userId: string,
    options: typeof UserRoleUpdateRequest.Encoded
  ) => Effect.Effect<typeof User.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteUser": (
    userId: string
  ) => Effect.Effect<typeof UserDeleteResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createRealtimeSession": (
    options: typeof RealtimeSessionCreateRequest.Encoded
  ) => Effect.Effect<typeof RealtimeSessionCreateResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createResponse": (
    options: typeof CreateResponse.Encoded
  ) => Effect.Effect<typeof Response.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getResponse": (
    responseId: string,
    options: typeof GetResponseParams.Encoded
  ) => Effect.Effect<typeof Response.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteResponse": (
    responseId: string
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | typeof Error.Type>
  readonly "listInputItems": (
    responseId: string,
    options: typeof ListInputItemsParams.Encoded
  ) => Effect.Effect<typeof ResponseItemList.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createThread": (
    options: typeof CreateThreadRequest.Encoded
  ) => Effect.Effect<typeof ThreadObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createThreadAndRun": (
    options: typeof CreateThreadAndRunRequest.Encoded
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getThread": (
    threadId: string
  ) => Effect.Effect<typeof ThreadObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "modifyThread": (
    threadId: string,
    options: typeof ModifyThreadRequest.Encoded
  ) => Effect.Effect<typeof ThreadObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteThread": (
    threadId: string
  ) => Effect.Effect<typeof DeleteThreadResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listMessages": (
    threadId: string,
    options: typeof ListMessagesParams.Encoded
  ) => Effect.Effect<typeof ListMessagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createMessage": (
    threadId: string,
    options: typeof CreateMessageRequest.Encoded
  ) => Effect.Effect<typeof MessageObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getMessage": (
    threadId: string,
    messageId: string
  ) => Effect.Effect<typeof MessageObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "modifyMessage": (
    threadId: string,
    messageId: string,
    options: typeof ModifyMessageRequest.Encoded
  ) => Effect.Effect<typeof MessageObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteMessage": (
    threadId: string,
    messageId: string
  ) => Effect.Effect<typeof DeleteMessageResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listRuns": (
    threadId: string,
    options: typeof ListRunsParams.Encoded
  ) => Effect.Effect<typeof ListRunsResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createRun": (
    threadId: string,
    options: { readonly params: typeof CreateRunParams.Encoded; readonly payload: typeof CreateRunRequest.Encoded }
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getRun": (
    threadId: string,
    runId: string
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "modifyRun": (
    threadId: string,
    runId: string,
    options: typeof ModifyRunRequest.Encoded
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "cancelRun": (
    threadId: string,
    runId: string
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listRunSteps": (
    threadId: string,
    runId: string,
    options: typeof ListRunStepsParams.Encoded
  ) => Effect.Effect<typeof ListRunStepsResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getRunStep": (
    threadId: string,
    runId: string,
    stepId: string,
    options: typeof GetRunStepParams.Encoded
  ) => Effect.Effect<typeof RunStepObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "submitToolOuputsToRun": (
    threadId: string,
    runId: string,
    options: typeof SubmitToolOutputsRunRequest.Encoded
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createUpload": (
    options: typeof CreateUploadRequest.Encoded
  ) => Effect.Effect<typeof Upload.Type, HttpClientError.HttpClientError | ParseError>
  readonly "cancelUpload": (
    uploadId: string
  ) => Effect.Effect<typeof Upload.Type, HttpClientError.HttpClientError | ParseError>
  readonly "completeUpload": (
    uploadId: string,
    options: typeof CompleteUploadRequest.Encoded
  ) => Effect.Effect<typeof Upload.Type, HttpClientError.HttpClientError | ParseError>
  readonly "addUploadPart": (
    uploadId: string,
    options: globalThis.FormData
  ) => Effect.Effect<typeof UploadPart.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listVectorStores": (
    options: typeof ListVectorStoresParams.Encoded
  ) => Effect.Effect<typeof ListVectorStoresResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createVectorStore": (
    options: typeof CreateVectorStoreRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getVectorStore": (
    vectorStoreId: string
  ) => Effect.Effect<typeof VectorStoreObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "modifyVectorStore": (
    vectorStoreId: string,
    options: typeof UpdateVectorStoreRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteVectorStore": (
    vectorStoreId: string
  ) => Effect.Effect<typeof DeleteVectorStoreResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createVectorStoreFileBatch": (
    vectorStoreId: string,
    options: typeof CreateVectorStoreFileBatchRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreFileBatchObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getVectorStoreFileBatch": (
    vectorStoreId: string,
    batchId: string
  ) => Effect.Effect<typeof VectorStoreFileBatchObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "cancelVectorStoreFileBatch": (
    vectorStoreId: string,
    batchId: string
  ) => Effect.Effect<typeof VectorStoreFileBatchObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listFilesInVectorStoreBatch": (
    vectorStoreId: string,
    batchId: string,
    options: typeof ListFilesInVectorStoreBatchParams.Encoded
  ) => Effect.Effect<typeof ListVectorStoreFilesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listVectorStoreFiles": (
    vectorStoreId: string,
    options: typeof ListVectorStoreFilesParams.Encoded
  ) => Effect.Effect<typeof ListVectorStoreFilesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createVectorStoreFile": (
    vectorStoreId: string,
    options: typeof CreateVectorStoreFileRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreFileObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "getVectorStoreFile": (
    vectorStoreId: string,
    fileId: string
  ) => Effect.Effect<typeof VectorStoreFileObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "updateVectorStoreFileAttributes": (
    vectorStoreId: string,
    fileId: string,
    options: typeof UpdateVectorStoreFileAttributesRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreFileObject.Type, HttpClientError.HttpClientError | ParseError>
  readonly "deleteVectorStoreFile": (
    vectorStoreId: string,
    fileId: string
  ) => Effect.Effect<typeof DeleteVectorStoreFileResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "retrieveVectorStoreFileContent": (
    vectorStoreId: string,
    fileId: string
  ) => Effect.Effect<typeof VectorStoreFileContentResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "searchVectorStore": (
    vectorStoreId: string,
    options: typeof VectorStoreSearchRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreSearchResultsPage.Type, HttpClientError.HttpClientError | ParseError>
}
