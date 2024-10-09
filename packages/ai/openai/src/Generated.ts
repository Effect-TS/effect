/**
 * @since 1.0.0
 */
import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import type { ParseError } from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Effect from "effect/Effect"

export class ChatCompletionRequestMessageContentPartText extends S.Struct({
  "type": S.Literal("text"),
  "text": S.String
}) {}

export class ChatCompletionRequestSystemMessageContentPart extends ChatCompletionRequestMessageContentPartText {}

export class ChatCompletionRequestSystemMessage extends S.Struct({
  "content": S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestSystemMessageContentPart)),
  "role": S.Literal("system"),
  "name": S.optional(S.String)
}) {}

export class ChatCompletionRequestMessageContentPartImage extends S.Struct({
  "type": S.Literal("image_url"),
  "image_url": S.Struct({
    "url": S.String,
    "detail": S.optionalWith(S.Literal("auto", "low", "high"), { default: () => "auto" as const })
  })
}) {}

export class ChatCompletionRequestUserMessageContentPart
  extends S.Union(ChatCompletionRequestMessageContentPartText, ChatCompletionRequestMessageContentPartImage)
{}

export class ChatCompletionRequestUserMessage extends S.Struct({
  "content": S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestUserMessageContentPart)),
  "role": S.Literal("user"),
  "name": S.optional(S.String)
}) {}

export class ChatCompletionRequestMessageContentPartRefusal extends S.Struct({
  "type": S.Literal("refusal"),
  "refusal": S.String
}) {}

export class ChatCompletionRequestAssistantMessageContentPart
  extends S.Union(ChatCompletionRequestMessageContentPartText, ChatCompletionRequestMessageContentPartRefusal)
{}

export class ChatCompletionMessageToolCall extends S.Struct({
  "id": S.String,
  "type": S.Literal("function"),
  "function": S.Struct({
    "name": S.String,
    "arguments": S.String
  })
}) {}

export class ChatCompletionMessageToolCalls extends S.Array(ChatCompletionMessageToolCall) {}

export class ChatCompletionRequestAssistantMessage extends S.Struct({
  "content": S.optionalWith(S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestAssistantMessageContentPart)), {
    nullable: true
  }),
  "refusal": S.optionalWith(S.String, { nullable: true }),
  "role": S.Literal("assistant"),
  "name": S.optional(S.String),
  "tool_calls": S.optional(ChatCompletionMessageToolCalls),
  "function_call": S.optionalWith(
    S.Struct({
      "arguments": S.String,
      "name": S.String
    }),
    { nullable: true }
  )
}) {}

export class ChatCompletionRequestToolMessageContentPart extends ChatCompletionRequestMessageContentPartText {}

export class ChatCompletionRequestToolMessage extends S.Struct({
  "role": S.Literal("tool"),
  "content": S.Union(S.String, S.NonEmptyArray(ChatCompletionRequestToolMessageContentPart)),
  "tool_call_id": S.String
}) {}

export class ChatCompletionRequestFunctionMessage extends S.Struct({
  "role": S.Literal("function"),
  "content": S.NullOr(S.String),
  "name": S.String
}) {}

export class ChatCompletionRequestMessage extends S.Union(
  ChatCompletionRequestSystemMessage,
  ChatCompletionRequestUserMessage,
  ChatCompletionRequestAssistantMessage,
  ChatCompletionRequestToolMessage,
  ChatCompletionRequestFunctionMessage
) {}

export class ResponseFormatText extends S.Struct({
  "type": S.Literal("text")
}) {}

export class ResponseFormatJsonObject extends S.Struct({
  "type": S.Literal("json_object")
}) {}

export class ResponseFormatJsonSchemaSchema extends S.Record({ key: S.String, value: S.Unknown }) {}

export class ResponseFormatJsonSchema extends S.Struct({
  "type": S.Literal("json_schema"),
  "json_schema": S.Struct({
    "description": S.optional(S.String),
    "name": S.String,
    "schema": S.optional(ResponseFormatJsonSchemaSchema),
    "strict": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
  })
}) {}

export class ChatCompletionStreamOptions extends S.Struct({
  "include_usage": S.optional(S.Boolean)
}) {}

export class FunctionParameters extends S.Record({ key: S.String, value: S.Unknown }) {}

export class FunctionObject extends S.Struct({
  "description": S.optional(S.String),
  "name": S.String,
  "parameters": S.optional(FunctionParameters),
  "strict": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
}) {}

export class ChatCompletionTool extends S.Struct({
  "type": S.Literal("function"),
  "function": FunctionObject
}) {}

export class ChatCompletionNamedToolChoice extends S.Struct({
  "type": S.Literal("function"),
  "function": S.Struct({
    "name": S.String
  })
}) {}

export class ChatCompletionToolChoiceOption
  extends S.Union(S.Literal("none", "auto", "required"), ChatCompletionNamedToolChoice)
{}

export class ParallelToolCalls extends S.Boolean {}

export class ChatCompletionFunctionCallOption extends S.Struct({
  "name": S.String
}) {}

export class ChatCompletionFunctions extends S.Struct({
  "description": S.optional(S.String),
  "name": S.String,
  "parameters": S.optional(FunctionParameters)
}) {}

export class CreateChatCompletionRequest extends S.Class<CreateChatCompletionRequest>("CreateChatCompletionRequest")({
  "messages": S.NonEmptyArray(ChatCompletionRequestMessage),
  "model": S.Union(
    S.String,
    S.Literal(
      "o1-preview",
      "o1-preview-2024-09-12",
      "o1-mini",
      "o1-mini-2024-09-12",
      "gpt-4o",
      "gpt-4o-2024-08-06",
      "gpt-4o-2024-05-13",
      "gpt-4o-2024-08-06",
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
    )
  ),
  "frequency_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  "logit_bias": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "logprobs": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "top_logprobs": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)), { nullable: true }),
  "max_tokens": S.optionalWith(S.Int, { nullable: true }),
  "max_completion_tokens": S.optionalWith(S.Int, { nullable: true }),
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(128)), {
    nullable: true,
    default: () => 1 as const
  }),
  "presence_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  "response_format": S.optional(S.Union(ResponseFormatText, ResponseFormatJsonObject, ResponseFormatJsonSchema)),
  "seed": S.optionalWith(
    S.Int.pipe(S.greaterThanOrEqualTo(-9223372036854776000), S.lessThanOrEqualTo(9223372036854776000)),
    { nullable: true }
  ),
  "service_tier": S.optionalWith(S.Literal("auto", "default"), { nullable: true }),
  "stop": S.optional(S.Union(S.String, S.Array(S.String).pipe(S.minItems(1), S.maxItems(4)))),
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stream_options": S.optionalWith(ChatCompletionStreamOptions, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "tools": S.optional(S.Array(ChatCompletionTool)),
  "tool_choice": S.optional(ChatCompletionToolChoiceOption),
  "parallel_tool_calls": S.optionalWith(ParallelToolCalls, { default: () => true as const }),
  "user": S.optional(S.String),
  "function_call": S.optional(S.Union(S.Literal("none", "auto"), ChatCompletionFunctionCallOption)),
  "functions": S.optional(S.Array(ChatCompletionFunctions).pipe(S.minItems(1), S.maxItems(128)))
}) {}

export class ChatCompletionResponseMessage extends S.Struct({
  "content": S.NullOr(S.String),
  "refusal": S.NullOr(S.String),
  "tool_calls": S.optional(ChatCompletionMessageToolCalls),
  "role": S.Literal("assistant"),
  "function_call": S.optional(S.Struct({
    "arguments": S.String,
    "name": S.String
  }))
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

export class CompletionUsage extends S.Struct({
  "completion_tokens": S.Int,
  "prompt_tokens": S.Int,
  "total_tokens": S.Int,
  "completion_tokens_details": S.optional(S.Struct({
    "reasoning_tokens": S.optional(S.Int)
  }))
}) {}

export class CreateChatCompletionResponse
  extends S.Class<CreateChatCompletionResponse>("CreateChatCompletionResponse")({
    "id": S.String,
    "choices": S.Array(S.Struct({
      "finish_reason": S.Literal("stop", "length", "tool_calls", "content_filter", "function_call"),
      "index": S.Int,
      "message": ChatCompletionResponseMessage,
      "logprobs": S.NullOr(S.Struct({
        "content": S.NullOr(S.Array(ChatCompletionTokenLogprob)),
        "refusal": S.NullOr(S.Array(ChatCompletionTokenLogprob))
      }))
    })),
    "created": S.Int,
    "model": S.String,
    "service_tier": S.optionalWith(S.Literal("scale", "default"), { nullable: true }),
    "system_fingerprint": S.optional(S.String),
    "object": S.Literal("chat.completion"),
    "usage": S.optional(CompletionUsage)
  })
{}

export class CreateCompletionRequest extends S.Class<CreateCompletionRequest>("CreateCompletionRequest")({
  "model": S.Union(S.String, S.Literal("gpt-3.5-turbo-instruct", "davinci-002", "babbage-002")),
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
  "logit_bias": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "logprobs": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(5)), { nullable: true }),
  "max_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true, default: () => 16 as const }),
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(128)), {
    nullable: true,
    default: () => 1 as const
  }),
  "presence_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  "seed": S.optionalWith(
    S.Int.pipe(S.greaterThanOrEqualTo(-9223372036854776000), S.lessThanOrEqualTo(9223372036854776000)),
    { nullable: true }
  ),
  "stop": S.optionalWith(S.Union(S.String, S.Array(S.String).pipe(S.minItems(1), S.maxItems(4))), { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stream_options": S.optionalWith(ChatCompletionStreamOptions, { nullable: true }),
  "suffix": S.optionalWith(S.String, { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "user": S.optional(S.String)
}) {}

export class CreateCompletionResponse extends S.Class<CreateCompletionResponse>("CreateCompletionResponse")({
  "id": S.String,
  "choices": S.Array(S.Struct({
    "finish_reason": S.Literal("stop", "length", "content_filter"),
    "index": S.Int,
    "logprobs": S.NullOr(S.Struct({
      "text_offset": S.optional(S.Array(S.Int)),
      "token_logprobs": S.optional(S.Array(S.Number)),
      "tokens": S.optional(S.Array(S.String)),
      "top_logprobs": S.optional(S.Array(S.Record({ key: S.String, value: S.Unknown })))
    })),
    "text": S.String
  })),
  "created": S.Int,
  "model": S.String,
  "system_fingerprint": S.optional(S.String),
  "object": S.Literal("text_completion"),
  "usage": S.optional(CompletionUsage)
}) {}

export class CreateImageRequest extends S.Class<CreateImageRequest>("CreateImageRequest")({
  "prompt": S.String,
  "model": S.optionalWith(S.Union(S.String, S.Literal("dall-e-2", "dall-e-3")), {
    nullable: true,
    default: () => "dall-e-2" as const
  }),
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(10)), {
    nullable: true,
    default: () => 1 as const
  }),
  "quality": S.optionalWith(S.Literal("standard", "hd"), { default: () => "standard" as const }),
  "response_format": S.optionalWith(S.Literal("url", "b64_json"), { nullable: true, default: () => "url" as const }),
  "size": S.optionalWith(S.Literal("256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"), {
    nullable: true,
    default: () => "1024x1024" as const
  }),
  "style": S.optionalWith(S.Literal("vivid", "natural"), { nullable: true, default: () => "vivid" as const }),
  "user": S.optional(S.String)
}) {}

export class Image extends S.Struct({
  "b64_json": S.optional(S.String),
  "url": S.optional(S.String),
  "revised_prompt": S.optional(S.String)
}) {}

export class ImagesResponse extends S.Class<ImagesResponse>("ImagesResponse")({
  "created": S.Int,
  "data": S.Array(Image)
}) {}

export class CreateEmbeddingRequest extends S.Class<CreateEmbeddingRequest>("CreateEmbeddingRequest")({
  "input": S.Union(
    S.String,
    S.Array(S.String).pipe(S.minItems(1), S.maxItems(2048)),
    S.Array(S.Int).pipe(S.minItems(1), S.maxItems(2048)),
    S.Array(S.NonEmptyArray(S.Int)).pipe(S.minItems(1), S.maxItems(2048))
  ),
  "model": S.Union(S.String, S.Literal("text-embedding-ada-002", "text-embedding-3-small", "text-embedding-3-large")),
  "encoding_format": S.optionalWith(S.Literal("float", "base64"), { default: () => "float" as const }),
  "dimensions": S.optional(S.Int.pipe(S.greaterThanOrEqualTo(1))),
  "user": S.optional(S.String)
}) {}

export class Embedding extends S.Struct({
  "index": S.Int,
  "embedding": S.Array(S.Number),
  "object": S.Literal("embedding")
}) {}

export class CreateEmbeddingResponse extends S.Class<CreateEmbeddingResponse>("CreateEmbeddingResponse")({
  "data": S.Array(Embedding),
  "model": S.String,
  "object": S.Literal("list"),
  "usage": S.Struct({
    "prompt_tokens": S.Int,
    "total_tokens": S.Int
  })
}) {}

export class CreateSpeechRequest extends S.Class<CreateSpeechRequest>("CreateSpeechRequest")({
  "model": S.Union(S.String, S.Literal("tts-1", "tts-1-hd")),
  "input": S.String.pipe(S.maxLength(4096)),
  "voice": S.Literal("alloy", "echo", "fable", "onyx", "nova", "shimmer"),
  "response_format": S.optionalWith(S.Literal("mp3", "opus", "aac", "flac", "wav", "pcm"), {
    default: () => "mp3" as const
  }),
  "speed": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0.25), S.lessThanOrEqualTo(4)), {
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
  "duration": S.String,
  "text": S.String,
  "words": S.optional(S.Array(TranscriptionWord)),
  "segments": S.optional(S.Array(TranscriptionSegment))
}) {}

export class CreateTranscription200
  extends S.Union(CreateTranscriptionResponseJson, CreateTranscriptionResponseVerboseJson)
{}

export class CreateTranslationResponseJson extends S.Struct({
  "text": S.String
}) {}

export class CreateTranslationResponseVerboseJson extends S.Struct({
  "language": S.String,
  "duration": S.String,
  "text": S.String,
  "segments": S.optional(S.Array(TranscriptionSegment))
}) {}

export class CreateTranslation200
  extends S.Union(CreateTranslationResponseJson, CreateTranslationResponseVerboseJson)
{}

export class ListFilesParams extends S.Struct({
  "purpose": S.optional(S.String)
}) {}

export class OpenAIFile extends S.Struct({
  "id": S.String,
  "bytes": S.Int,
  "created_at": S.Int,
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
  "status_details": S.optional(S.String)
}) {}

export class ListFilesResponse extends S.Class<ListFilesResponse>("ListFilesResponse")({
  "data": S.Array(OpenAIFile),
  "object": S.Literal("list")
}) {}

export class DeleteFileResponse extends S.Class<DeleteFileResponse>("DeleteFileResponse")({
  "id": S.String,
  "object": S.Literal("file"),
  "deleted": S.Boolean
}) {}

export class DownloadFile200 extends S.String {}

export class CreateUploadRequest extends S.Class<CreateUploadRequest>("CreateUploadRequest")({
  "filename": S.String,
  "purpose": S.Literal("assistants", "batch", "fine-tune", "vision"),
  "bytes": S.Int,
  "mime_type": S.String
}) {}

export class Upload extends S.Class<Upload>("Upload")({
  "id": S.String,
  "created_at": S.Int,
  "filename": S.String,
  "bytes": S.Int,
  "purpose": S.String,
  "status": S.Literal("pending", "completed", "cancelled", "expired"),
  "expires_at": S.Int,
  "object": S.optional(S.Literal("upload")),
  "file": S.optional(OpenAIFile)
}) {}

export class UploadPart extends S.Class<UploadPart>("UploadPart")({
  "id": S.String,
  "created_at": S.Int,
  "upload_id": S.String,
  "object": S.Literal("upload.part")
}) {}

export class CompleteUploadRequest extends S.Class<CompleteUploadRequest>("CompleteUploadRequest")({
  "part_ids": S.Array(S.String),
  "md5": S.optional(S.String)
}) {}

export class ListPaginatedFineTuningJobsParams extends S.Struct({
  "after": S.optional(S.String),
  "limit": S.optionalWith(S.Int, { default: () => 20 as const })
}) {}

export class FineTuningIntegration extends S.Struct({
  "type": S.Literal("wandb"),
  "wandb": S.Struct({
    "project": S.String,
    "name": S.optionalWith(S.String, { nullable: true }),
    "entity": S.optionalWith(S.String, { nullable: true }),
    "tags": S.optional(S.Array(S.String))
  })
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
    "n_epochs": S.Union(S.Literal("auto"), S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))).pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "auto" as const)
    )
  }),
  "model": S.String,
  "object": S.Literal("fine_tuning.job"),
  "organization_id": S.String,
  "result_files": S.Array(S.String),
  "status": S.Literal("validating_files", "queued", "running", "succeeded", "failed", "cancelled"),
  "trained_tokens": S.NullOr(S.Int),
  "training_file": S.String,
  "validation_file": S.NullOr(S.String),
  "integrations": S.optionalWith(S.Array(FineTuningIntegration).pipe(S.maxItems(5)), { nullable: true }),
  "seed": S.Int,
  "estimated_finish": S.optionalWith(S.Int, { nullable: true })
}) {}

export class ListPaginatedFineTuningJobsResponse
  extends S.Class<ListPaginatedFineTuningJobsResponse>("ListPaginatedFineTuningJobsResponse")({
    "data": S.Array(FineTuningJob),
    "has_more": S.Boolean,
    "object": S.Literal("list")
  })
{}

export class CreateFineTuningJobRequest extends S.Class<CreateFineTuningJobRequest>("CreateFineTuningJobRequest")({
  "model": S.Union(S.String, S.Literal("babbage-002", "davinci-002", "gpt-3.5-turbo", "gpt-4o-mini")),
  "training_file": S.String,
  "hyperparameters": S.optional(S.Struct({
    "batch_size": S.optionalWith(
      S.Union(S.Literal("auto"), S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))),
      { default: () => "auto" as const }
    ),
    "learning_rate_multiplier": S.optionalWith(S.Union(S.Literal("auto"), S.Number.pipe(S.greaterThan(0))), {
      default: () => "auto" as const
    }),
    "n_epochs": S.optionalWith(
      S.Union(S.Literal("auto"), S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))),
      { default: () => "auto" as const }
    )
  })),
  "suffix": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(64)), { nullable: true }),
  "validation_file": S.optionalWith(S.String, { nullable: true }),
  "integrations": S.optionalWith(
    S.Array(S.Struct({
      "type": S.Literal("wandb"),
      "wandb": S.Struct({
        "project": S.String,
        "name": S.optionalWith(S.String, { nullable: true }),
        "entity": S.optionalWith(S.String, { nullable: true }),
        "tags": S.optional(S.Array(S.String))
      })
    })),
    { nullable: true }
  ),
  "seed": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2147483647)), { nullable: true })
}) {}

export class ListFineTuningEventsParams extends S.Struct({
  "after": S.optional(S.String),
  "limit": S.optionalWith(S.Int, { default: () => 20 as const })
}) {}

export class FineTuningJobEvent extends S.Struct({
  "id": S.String,
  "created_at": S.Int,
  "level": S.Literal("info", "warn", "error"),
  "message": S.String,
  "object": S.Literal("fine_tuning.job.event")
}) {}

export class ListFineTuningJobEventsResponse
  extends S.Class<ListFineTuningJobEventsResponse>("ListFineTuningJobEventsResponse")({
    "data": S.Array(FineTuningJobEvent),
    "object": S.Literal("list")
  })
{}

export class ListFineTuningJobCheckpointsParams extends S.Struct({
  "after": S.optional(S.String),
  "limit": S.optionalWith(S.Int, { default: () => 10 as const })
}) {}

export class FineTuningJobCheckpoint extends S.Struct({
  "id": S.String,
  "created_at": S.Int,
  "fine_tuned_model_checkpoint": S.String,
  "step_number": S.Int,
  "metrics": S.Struct({
    "step": S.optional(S.Number),
    "train_loss": S.optional(S.Number),
    "train_mean_token_accuracy": S.optional(S.Number),
    "valid_loss": S.optional(S.Number),
    "valid_mean_token_accuracy": S.optional(S.Number),
    "full_valid_loss": S.optional(S.Number),
    "full_valid_mean_token_accuracy": S.optional(S.Number)
  }),
  "fine_tuning_job_id": S.String,
  "object": S.Literal("fine_tuning.job.checkpoint")
}) {}

export class ListFineTuningJobCheckpointsResponse
  extends S.Class<ListFineTuningJobCheckpointsResponse>("ListFineTuningJobCheckpointsResponse")({
    "data": S.Array(FineTuningJobCheckpoint),
    "object": S.Literal("list"),
    "first_id": S.optionalWith(S.String, { nullable: true }),
    "last_id": S.optionalWith(S.String, { nullable: true }),
    "has_more": S.Boolean
  })
{}

export class Model extends S.Struct({
  "id": S.String,
  "created": S.Int,
  "object": S.Literal("model"),
  "owned_by": S.String
}) {}

export class ListModelsResponse extends S.Class<ListModelsResponse>("ListModelsResponse")({
  "object": S.Literal("list"),
  "data": S.Array(Model)
}) {}

export class DeleteModelResponse extends S.Class<DeleteModelResponse>("DeleteModelResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": S.String
}) {}

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
  "model": S.optionalWith(
    S.Union(
      S.String,
      S.Literal(
        "omni-moderation-latest",
        "omni-moderation-2024-09-26",
        "text-moderation-latest",
        "text-moderation-stable"
      )
    ),
    { default: () => "omni-moderation-latest" as const }
  )
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
      "illicit": S.Boolean,
      "illicit/violent": S.Boolean,
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

export class ListAssistantsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "order": S.optionalWith(S.Literal("asc", "desc"), { default: () => "desc" as const }),
  "after": S.optional(S.String),
  "before": S.optional(S.String)
}) {}

export class AssistantToolsCode extends S.Struct({
  "type": S.Literal("code_interpreter")
}) {}

export class FileSearchRankingOptions extends S.Struct({
  "ranker": S.optional(S.Literal("auto", "default_2024_08_21")),
  "score_threshold": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1))
}) {}

export class AssistantToolsFileSearch extends S.Struct({
  "type": S.Literal("file_search"),
  "file_search": S.optional(S.Struct({
    "max_num_results": S.optional(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))),
    "ranking_options": S.optional(FileSearchRankingOptions)
  }))
}) {}

export class AssistantToolsFunction extends S.Struct({
  "type": S.Literal("function"),
  "function": FunctionObject
}) {}

export class AssistantsApiResponseFormatOption
  extends S.Union(S.Literal("auto"), ResponseFormatText, ResponseFormatJsonObject, ResponseFormatJsonSchema)
{}

export class AssistantObject extends S.Struct({
  "id": S.String,
  "object": S.Literal("assistant"),
  "created_at": S.Int,
  "name": S.NullOr(S.String.pipe(S.maxLength(256))),
  "description": S.NullOr(S.String.pipe(S.maxLength(512))),
  "model": S.String,
  "instructions": S.NullOr(S.String.pipe(S.maxLength(256000))),
  "tools": S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(128))
    .pipe(S.propertySignature, S.withConstructorDefault(() => [] as const)),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optional(S.Struct({
        "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), { default: () => [] as const })
      })),
      "file_search": S.optional(S.Struct({
        "vector_store_ids": S.optional(S.Array(S.String).pipe(S.maxItems(1)))
      }))
    }),
    { nullable: true }
  ),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "response_format": S.optional(AssistantsApiResponseFormatOption)
}) {}

export class ListAssistantsResponse extends S.Class<ListAssistantsResponse>("ListAssistantsResponse")({
  "object": S.String,
  "data": S.Array(AssistantObject),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class CreateAssistantRequest extends S.Class<CreateAssistantRequest>("CreateAssistantRequest")({
  "model": S.Union(
    S.String,
    S.Literal(
      "gpt-4o",
      "gpt-4o-2024-08-06",
      "gpt-4o-2024-05-13",
      "gpt-4o-2024-08-06",
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
      "gpt-3.5-turbo-0613",
      "gpt-3.5-turbo-1106",
      "gpt-3.5-turbo-0125",
      "gpt-3.5-turbo-16k-0613"
    )
  ),
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true }),
  "instructions": S.optionalWith(S.String.pipe(S.maxLength(256000)), { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(128)),
    { default: () => [] as const }
  ),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optional(S.Struct({
        "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), { default: () => [] as const })
      })),
      "file_search": S.optional(S.Struct({
        "vector_store_ids": S.optional(S.Array(S.String).pipe(S.maxItems(1))),
        "vector_stores": S.optional(
          S.Array(S.Struct({
            "file_ids": S.optional(S.Array(S.String).pipe(S.maxItems(10000))),
            "chunking_strategy": S.optional(S.Record({ key: S.String, value: S.Unknown })),
            "metadata": S.optional(S.Record({ key: S.String, value: S.Unknown }))
          })).pipe(S.maxItems(1))
        )
      }))
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "response_format": S.optional(AssistantsApiResponseFormatOption)
}) {}

export class ModifyAssistantRequest extends S.Class<ModifyAssistantRequest>("ModifyAssistantRequest")({
  "model": S.optional(S.String),
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true }),
  "instructions": S.optionalWith(S.String.pipe(S.maxLength(256000)), { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(128)),
    { default: () => [] as const }
  ),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optional(S.Struct({
        "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), { default: () => [] as const })
      })),
      "file_search": S.optional(S.Struct({
        "vector_store_ids": S.optional(S.Array(S.String).pipe(S.maxItems(1)))
      }))
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  "response_format": S.optional(AssistantsApiResponseFormatOption)
}) {}

export class DeleteAssistantResponse extends S.Class<DeleteAssistantResponse>("DeleteAssistantResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": S.Literal("assistant.deleted")
}) {}

export class MessageContentImageFileObject extends S.Struct({
  "type": S.Literal("image_file"),
  "image_file": S.Struct({
    "file_id": S.String,
    "detail": S.optionalWith(S.Literal("auto", "low", "high"), { default: () => "auto" as const })
  })
}) {}

export class MessageContentImageUrlObject extends S.Struct({
  "type": S.Literal("image_url"),
  "image_url": S.Struct({
    "url": S.String,
    "detail": S.optionalWith(S.Literal("auto", "low", "high"), { default: () => "auto" as const })
  })
}) {}

export class MessageRequestContentTextObject extends S.Struct({
  "type": S.Literal("text"),
  "text": S.String
}) {}

export class AssistantToolsFileSearchTypeOnly extends S.Struct({
  "type": S.Literal("file_search")
}) {}

export class CreateMessageRequest extends S.Struct({
  "role": S.Literal("user", "assistant"),
  "content": S.Union(
    S.String,
    S.NonEmptyArray(
      S.Union(MessageContentImageFileObject, MessageContentImageUrlObject, MessageRequestContentTextObject)
    )
  ),
  "attachments": S.optionalWith(
    S.Array(S.Struct({
      "file_id": S.optional(S.String),
      "tools": S.optional(S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearchTypeOnly)))
    })),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class CreateThreadRequest extends S.Class<CreateThreadRequest>("CreateThreadRequest")({
  "messages": S.optional(S.Array(CreateMessageRequest)),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optional(S.Struct({
        "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), { default: () => [] as const })
      })),
      "file_search": S.optional(S.Struct({
        "vector_store_ids": S.optional(S.Array(S.String).pipe(S.maxItems(1))),
        "vector_stores": S.optional(
          S.Array(S.Struct({
            "file_ids": S.optional(S.Array(S.String).pipe(S.maxItems(10000))),
            "chunking_strategy": S.optional(S.Record({ key: S.String, value: S.Unknown })),
            "metadata": S.optional(S.Record({ key: S.String, value: S.Unknown }))
          })).pipe(S.maxItems(1))
        )
      }))
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class ThreadObject extends S.Class<ThreadObject>("ThreadObject")({
  "id": S.String,
  "object": S.Literal("thread"),
  "created_at": S.Int,
  "tool_resources": S.NullOr(S.Struct({
    "code_interpreter": S.optional(S.Struct({
      "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), { default: () => [] as const })
    })),
    "file_search": S.optional(S.Struct({
      "vector_store_ids": S.optional(S.Array(S.String).pipe(S.maxItems(1)))
    }))
  })),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown }))
}) {}

export class ModifyThreadRequest extends S.Class<ModifyThreadRequest>("ModifyThreadRequest")({
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optional(S.Struct({
        "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), { default: () => [] as const })
      })),
      "file_search": S.optional(S.Struct({
        "vector_store_ids": S.optional(S.Array(S.String).pipe(S.maxItems(1)))
      }))
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class DeleteThreadResponse extends S.Class<DeleteThreadResponse>("DeleteThreadResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": S.Literal("thread.deleted")
}) {}

export class ListMessagesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "order": S.optionalWith(S.Literal("asc", "desc"), { default: () => "desc" as const }),
  "after": S.optional(S.String),
  "before": S.optional(S.String),
  "run_id": S.optional(S.String)
}) {}

export class MessageContentTextAnnotationsFileCitationObject extends S.Struct({
  "type": S.Literal("file_citation"),
  "text": S.String,
  "file_citation": S.Struct({
    "file_id": S.String
  }),
  "start_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_index": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class MessageContentTextAnnotationsFilePathObject extends S.Struct({
  "type": S.Literal("file_path"),
  "text": S.String,
  "file_path": S.Struct({
    "file_id": S.String
  }),
  "start_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_index": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class MessageContentTextObject extends S.Struct({
  "type": S.Literal("text"),
  "text": S.Struct({
    "value": S.String,
    "annotations": S.Array(
      S.Union(MessageContentTextAnnotationsFileCitationObject, MessageContentTextAnnotationsFilePathObject)
    )
  })
}) {}

export class MessageContentRefusalObject extends S.Struct({
  "type": S.Literal("refusal"),
  "refusal": S.String
}) {}

export class MessageObject extends S.Struct({
  "id": S.String,
  "object": S.Literal("thread.message"),
  "created_at": S.Int,
  "thread_id": S.String,
  "status": S.Literal("in_progress", "incomplete", "completed"),
  "incomplete_details": S.NullOr(S.Struct({
    "reason": S.Literal("content_filter", "max_tokens", "run_cancelled", "run_expired", "run_failed")
  })),
  "completed_at": S.NullOr(S.Int),
  "incomplete_at": S.NullOr(S.Int),
  "role": S.Literal("user", "assistant"),
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
    "file_id": S.optional(S.String),
    "tools": S.optional(S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearchTypeOnly)))
  }))),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown }))
}) {}

export class ListMessagesResponse extends S.Class<ListMessagesResponse>("ListMessagesResponse")({
  "object": S.String,
  "data": S.Array(MessageObject),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class ModifyMessageRequest extends S.Class<ModifyMessageRequest>("ModifyMessageRequest")({
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class DeleteMessageResponse extends S.Class<DeleteMessageResponse>("DeleteMessageResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": S.Literal("thread.message.deleted")
}) {}

export class TruncationObject extends S.Struct({
  "type": S.Literal("auto", "last_messages"),
  "last_messages": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

export class AssistantsNamedToolChoice extends S.Struct({
  "type": S.Literal("function", "code_interpreter", "file_search"),
  "function": S.optional(S.Struct({
    "name": S.String
  }))
}) {}

export class AssistantsApiToolChoiceOption
  extends S.Union(S.Literal("none", "auto", "required"), AssistantsNamedToolChoice)
{}

export class CreateThreadAndRunRequest extends S.Class<CreateThreadAndRunRequest>("CreateThreadAndRunRequest")({
  "assistant_id": S.String,
  "thread": S.optional(CreateThreadRequest),
  "model": S.optionalWith(
    S.Union(
      S.String,
      S.Literal(
        "gpt-4o",
        "gpt-4o-2024-08-06",
        "gpt-4o-2024-05-13",
        "gpt-4o-2024-08-06",
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
        "gpt-3.5-turbo-0613",
        "gpt-3.5-turbo-1106",
        "gpt-3.5-turbo-0125",
        "gpt-3.5-turbo-16k-0613"
      )
    ),
    { nullable: true }
  ),
  "instructions": S.optionalWith(S.String, { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(20)),
    { nullable: true }
  ),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optional(S.Struct({
        "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), { default: () => [] as const })
      })),
      "file_search": S.optional(S.Struct({
        "vector_store_ids": S.optional(S.Array(S.String).pipe(S.maxItems(1)))
      }))
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
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
  "truncation_strategy": S.optional(TruncationObject),
  "tool_choice": S.optional(AssistantsApiToolChoiceOption),
  "parallel_tool_calls": S.optionalWith(ParallelToolCalls, { default: () => true as const }),
  "response_format": S.optional(AssistantsApiResponseFormatOption)
}) {}

export class RunToolCallObject extends S.Struct({
  "id": S.String,
  "type": S.Literal("function"),
  "function": S.Struct({
    "name": S.String,
    "arguments": S.String
  })
}) {}

export class RunCompletionUsage extends S.Struct({
  "completion_tokens": S.Int,
  "prompt_tokens": S.Int,
  "total_tokens": S.Int
}) {}

export class RunObject extends S.Class<RunObject>("RunObject")({
  "id": S.String,
  "object": S.Literal("thread.run"),
  "created_at": S.Int,
  "thread_id": S.String,
  "assistant_id": S.String,
  "status": S.Literal(
    "queued",
    "in_progress",
    "requires_action",
    "cancelling",
    "cancelled",
    "failed",
    "completed",
    "incomplete",
    "expired"
  ),
  "required_action": S.NullOr(S.Struct({
    "type": S.Literal("submit_tool_outputs"),
    "submit_tool_outputs": S.Struct({
      "tool_calls": S.Array(RunToolCallObject)
    })
  })),
  "last_error": S.NullOr(S.Struct({
    "code": S.Literal("server_error", "rate_limit_exceeded", "invalid_prompt"),
    "message": S.String
  })),
  "expires_at": S.NullOr(S.Int),
  "started_at": S.NullOr(S.Int),
  "cancelled_at": S.NullOr(S.Int),
  "failed_at": S.NullOr(S.Int),
  "completed_at": S.NullOr(S.Int),
  "incomplete_details": S.NullOr(S.Struct({
    "reason": S.optional(S.Literal("max_completion_tokens", "max_prompt_tokens"))
  })),
  "model": S.String,
  "instructions": S.String,
  "tools": S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(20))
    .pipe(S.propertySignature, S.withConstructorDefault(() => [] as const)),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  "usage": S.NullOr(RunCompletionUsage),
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  "top_p": S.optionalWith(S.Number, { nullable: true }),
  "max_prompt_tokens": S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(256))),
  "max_completion_tokens": S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(256))),
  "truncation_strategy": TruncationObject,
  "tool_choice": AssistantsApiToolChoiceOption,
  "parallel_tool_calls": ParallelToolCalls.pipe(S.propertySignature, S.withConstructorDefault(() => true as const)),
  "response_format": AssistantsApiResponseFormatOption
}) {}

export class ListRunsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "order": S.optionalWith(S.Literal("asc", "desc"), { default: () => "desc" as const }),
  "after": S.optional(S.String),
  "before": S.optional(S.String)
}) {}

export class ListRunsResponse extends S.Class<ListRunsResponse>("ListRunsResponse")({
  "object": S.String,
  "data": S.Array(RunObject),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class CreateRunParams extends S.Struct({
  "include[]": S.optional(S.Array(S.Literal("step_details.tool_calls[*].file_search.results[*].content")))
}) {}

export class CreateRunRequest extends S.Class<CreateRunRequest>("CreateRunRequest")({
  "assistant_id": S.String,
  "model": S.optionalWith(
    S.Union(
      S.String,
      S.Literal(
        "gpt-4o",
        "gpt-4o-2024-08-06",
        "gpt-4o-2024-05-13",
        "gpt-4o-2024-08-06",
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
        "gpt-3.5-turbo-0613",
        "gpt-3.5-turbo-1106",
        "gpt-3.5-turbo-0125",
        "gpt-3.5-turbo-16k-0613"
      )
    ),
    { nullable: true }
  ),
  "instructions": S.optionalWith(S.String, { nullable: true }),
  "additional_instructions": S.optionalWith(S.String, { nullable: true }),
  "additional_messages": S.optionalWith(S.Array(CreateMessageRequest), { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(20)),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
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
  "truncation_strategy": S.optional(TruncationObject),
  "tool_choice": S.optional(AssistantsApiToolChoiceOption),
  "parallel_tool_calls": S.optionalWith(ParallelToolCalls, { default: () => true as const }),
  "response_format": S.optional(AssistantsApiResponseFormatOption)
}) {}

export class ModifyRunRequest extends S.Class<ModifyRunRequest>("ModifyRunRequest")({
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class SubmitToolOutputsRunRequest extends S.Class<SubmitToolOutputsRunRequest>("SubmitToolOutputsRunRequest")({
  "tool_outputs": S.Array(S.Struct({
    "tool_call_id": S.optional(S.String),
    "output": S.optional(S.String)
  })),
  "stream": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListRunStepsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "order": S.optionalWith(S.Literal("asc", "desc"), { default: () => "desc" as const }),
  "after": S.optional(S.String),
  "before": S.optional(S.String),
  "include[]": S.optional(S.Array(S.Literal("step_details.tool_calls[*].file_search.results[*].content")))
}) {}

export class RunStepDetailsMessageCreationObject extends S.Struct({
  "type": S.Literal("message_creation"),
  "message_creation": S.Struct({
    "message_id": S.String
  })
}) {}

export class RunStepDetailsToolCallsCodeOutputLogsObject extends S.Struct({
  "type": S.Literal("logs"),
  "logs": S.String
}) {}

export class RunStepDetailsToolCallsCodeOutputImageObject extends S.Struct({
  "type": S.Literal("image"),
  "image": S.Struct({
    "file_id": S.String
  })
}) {}

export class RunStepDetailsToolCallsCodeObject extends S.Struct({
  "id": S.String,
  "type": S.Literal("code_interpreter"),
  "code_interpreter": S.Struct({
    "input": S.String,
    "outputs": S.Array(S.Record({ key: S.String, value: S.Unknown }))
  })
}) {}

export class RunStepDetailsToolCallsFileSearchRankingOptionsObject extends S.Struct({
  "ranker": S.Literal("default_2024_08_21"),
  "score_threshold": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1))
}) {}

export class RunStepDetailsToolCallsFileSearchResultObject extends S.Struct({
  "file_id": S.String,
  "file_name": S.String,
  "score": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)),
  "content": S.optional(S.Array(S.Struct({
    "type": S.optional(S.Literal("text")),
    "text": S.optional(S.String)
  })))
}) {}

export class RunStepDetailsToolCallsFileSearchObject extends S.Struct({
  "id": S.String,
  "type": S.Literal("file_search"),
  "file_search": S.Struct({
    "ranking_options": S.optional(RunStepDetailsToolCallsFileSearchRankingOptionsObject),
    "results": S.optional(S.Array(RunStepDetailsToolCallsFileSearchResultObject))
  })
}) {}

export class RunStepDetailsToolCallsFunctionObject extends S.Struct({
  "id": S.String,
  "type": S.Literal("function"),
  "function": S.Struct({
    "name": S.String,
    "arguments": S.String,
    "output": S.NullOr(S.String)
  })
}) {}

export class RunStepDetailsToolCallsObject extends S.Struct({
  "type": S.Literal("tool_calls"),
  "tool_calls": S.Array(
    S.Union(
      RunStepDetailsToolCallsCodeObject,
      RunStepDetailsToolCallsFileSearchObject,
      RunStepDetailsToolCallsFunctionObject
    )
  )
}) {}

export class RunStepCompletionUsage extends S.Struct({
  "completion_tokens": S.Int,
  "prompt_tokens": S.Int,
  "total_tokens": S.Int
}) {}

export class RunStepObject extends S.Struct({
  "id": S.String,
  "object": S.Literal("thread.run.step"),
  "created_at": S.Int,
  "assistant_id": S.String,
  "thread_id": S.String,
  "run_id": S.String,
  "type": S.Literal("message_creation", "tool_calls"),
  "status": S.Literal("in_progress", "cancelled", "failed", "completed", "expired"),
  "step_details": S.Record({ key: S.String, value: S.Unknown }),
  "last_error": S.NullOr(S.Struct({
    "code": S.Literal("server_error", "rate_limit_exceeded"),
    "message": S.String
  })),
  "expired_at": S.NullOr(S.Int),
  "cancelled_at": S.NullOr(S.Int),
  "failed_at": S.NullOr(S.Int),
  "completed_at": S.NullOr(S.Int),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
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
  "include[]": S.optional(S.Array(S.Literal("step_details.tool_calls[*].file_search.results[*].content")))
}) {}

export class ListVectorStoresParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "order": S.optionalWith(S.Literal("asc", "desc"), { default: () => "desc" as const }),
  "after": S.optional(S.String),
  "before": S.optional(S.String)
}) {}

export class VectorStoreExpirationAfter extends S.Struct({
  "anchor": S.Literal("last_active_at"),
  "days": S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(365))
}) {}

export class VectorStoreObject extends S.Struct({
  "id": S.String,
  "object": S.Literal("vector_store"),
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
  "status": S.Literal("expired", "in_progress", "completed"),
  "expires_after": S.optional(VectorStoreExpirationAfter),
  "expires_at": S.optionalWith(S.Int, { nullable: true }),
  "last_active_at": S.NullOr(S.Int),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown }))
}) {}

export class ListVectorStoresResponse extends S.Class<ListVectorStoresResponse>("ListVectorStoresResponse")({
  "object": S.String,
  "data": S.Array(VectorStoreObject),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class AutoChunkingStrategyRequestParam extends S.Struct({
  "type": S.Literal("auto")
}) {}

export class StaticChunkingStrategy extends S.Struct({
  "max_chunk_size_tokens": S.Int.pipe(S.greaterThanOrEqualTo(100), S.lessThanOrEqualTo(4096)),
  "chunk_overlap_tokens": S.Int
}) {}

export class StaticChunkingStrategyRequestParam extends S.Struct({
  "type": S.Literal("static"),
  "static": StaticChunkingStrategy
}) {}

export class CreateVectorStoreRequest extends S.Class<CreateVectorStoreRequest>("CreateVectorStoreRequest")({
  "file_ids": S.optional(S.Array(S.String).pipe(S.maxItems(500))),
  "name": S.optional(S.String),
  "expires_after": S.optional(VectorStoreExpirationAfter),
  "chunking_strategy": S.optional(S.Record({ key: S.String, value: S.Unknown })),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class UpdateVectorStoreRequest extends S.Class<UpdateVectorStoreRequest>("UpdateVectorStoreRequest")({
  "name": S.optionalWith(S.String, { nullable: true }),
  "expires_after": S.optional(VectorStoreExpirationAfter),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class DeleteVectorStoreResponse extends S.Class<DeleteVectorStoreResponse>("DeleteVectorStoreResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": S.Literal("vector_store.deleted")
}) {}

export class ListVectorStoreFilesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "order": S.optionalWith(S.Literal("asc", "desc"), { default: () => "desc" as const }),
  "after": S.optional(S.String),
  "before": S.optional(S.String),
  "filter": S.optional(S.Literal("in_progress", "completed", "failed", "cancelled"))
}) {}

export class StaticChunkingStrategyResponseParam extends S.Struct({
  "type": S.Literal("static"),
  "static": StaticChunkingStrategy
}) {}

export class OtherChunkingStrategyResponseParam extends S.Struct({
  "type": S.Literal("other")
}) {}

export class VectorStoreFileObject extends S.Struct({
  "id": S.String,
  "object": S.Literal("vector_store.file"),
  "usage_bytes": S.Int,
  "created_at": S.Int,
  "vector_store_id": S.String,
  "status": S.Literal("in_progress", "completed", "cancelled", "failed"),
  "last_error": S.NullOr(S.Struct({
    "code": S.Literal("server_error", "unsupported_file", "invalid_file"),
    "message": S.String
  })),
  "chunking_strategy": S.optional(S.Record({ key: S.String, value: S.Unknown }))
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

export class ChunkingStrategyRequestParam extends S.Record({ key: S.String, value: S.Unknown }) {}

export class CreateVectorStoreFileRequest
  extends S.Class<CreateVectorStoreFileRequest>("CreateVectorStoreFileRequest")({
    "file_id": S.String,
    "chunking_strategy": S.optional(ChunkingStrategyRequestParam)
  })
{}

export class DeleteVectorStoreFileResponse
  extends S.Class<DeleteVectorStoreFileResponse>("DeleteVectorStoreFileResponse")({
    "id": S.String,
    "deleted": S.Boolean,
    "object": S.Literal("vector_store.file.deleted")
  })
{}

export class CreateVectorStoreFileBatchRequest
  extends S.Class<CreateVectorStoreFileBatchRequest>("CreateVectorStoreFileBatchRequest")({
    "file_ids": S.Array(S.String).pipe(S.minItems(1), S.maxItems(500)),
    "chunking_strategy": S.optional(ChunkingStrategyRequestParam)
  })
{}

export class VectorStoreFileBatchObject extends S.Class<VectorStoreFileBatchObject>("VectorStoreFileBatchObject")({
  "id": S.String,
  "object": S.Literal("vector_store.files_batch"),
  "created_at": S.Int,
  "vector_store_id": S.String,
  "status": S.Literal("in_progress", "completed", "cancelled", "failed"),
  "file_counts": S.Struct({
    "in_progress": S.Int,
    "completed": S.Int,
    "failed": S.Int,
    "cancelled": S.Int,
    "total": S.Int
  })
}) {}

export class ListFilesInVectorStoreBatchParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "order": S.optionalWith(S.Literal("asc", "desc"), { default: () => "desc" as const }),
  "after": S.optional(S.String),
  "before": S.optional(S.String),
  "filter": S.optional(S.Literal("in_progress", "completed", "failed", "cancelled"))
}) {}

export class ListBatchesParams extends S.Struct({
  "after": S.optional(S.String),
  "limit": S.optionalWith(S.Int, { default: () => 20 as const })
}) {}

export class Batch extends S.Struct({
  "id": S.String,
  "object": S.Literal("batch"),
  "endpoint": S.String,
  "errors": S.optional(S.Struct({
    "object": S.optional(S.String),
    "data": S.optional(S.Array(S.Struct({
      "code": S.optional(S.String),
      "message": S.optional(S.String),
      "param": S.optionalWith(S.String, { nullable: true }),
      "line": S.optionalWith(S.Int, { nullable: true })
    })))
  })),
  "input_file_id": S.String,
  "completion_window": S.String,
  "status": S.Literal(
    "validating",
    "failed",
    "in_progress",
    "finalizing",
    "completed",
    "expired",
    "cancelling",
    "cancelled"
  ),
  "output_file_id": S.optional(S.String),
  "error_file_id": S.optional(S.String),
  "created_at": S.Int,
  "in_progress_at": S.optional(S.Int),
  "expires_at": S.optional(S.Int),
  "finalizing_at": S.optional(S.Int),
  "completed_at": S.optional(S.Int),
  "failed_at": S.optional(S.Int),
  "expired_at": S.optional(S.Int),
  "cancelling_at": S.optional(S.Int),
  "cancelled_at": S.optional(S.Int),
  "request_counts": S.optional(S.Struct({
    "total": S.Int,
    "completed": S.Int,
    "failed": S.Int
  })),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class ListBatchesResponse extends S.Class<ListBatchesResponse>("ListBatchesResponse")({
  "data": S.Array(Batch),
  "first_id": S.optional(S.String),
  "last_id": S.optional(S.String),
  "has_more": S.Boolean,
  "object": S.Literal("list")
}) {}

export class CreateBatchRequest extends S.Class<CreateBatchRequest>("CreateBatchRequest")({
  "input_file_id": S.String,
  "endpoint": S.Literal("/v1/chat/completions", "/v1/embeddings", "/v1/completions"),
  "completion_window": S.Literal("24h"),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
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
  "user.added",
  "user.updated",
  "user.deleted"
) {}

export class ListAuditLogsParams extends S.Struct({
  "effective_at[gt]": S.optional(S.Int),
  "effective_at[gte]": S.optional(S.Int),
  "effective_at[lt]": S.optional(S.Int),
  "effective_at[lte]": S.optional(S.Int),
  "project_ids[]": S.optional(S.Array(S.String)),
  "event_types[]": S.optional(S.Array(AuditLogEventType)),
  "actor_ids[]": S.optional(S.Array(S.String)),
  "actor_emails[]": S.optional(S.Array(S.String)),
  "resource_ids[]": S.optional(S.Array(S.String)),
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "after": S.optional(S.String),
  "before": S.optional(S.String)
}) {}

export class AuditLogActorUser extends S.Struct({
  "id": S.optional(S.String),
  "email": S.optional(S.String)
}) {}

export class AuditLogActorSession extends S.Struct({
  "user": S.optional(AuditLogActorUser),
  "ip_address": S.optional(S.String)
}) {}

export class AuditLogActorServiceAccount extends S.Struct({
  "id": S.optional(S.String)
}) {}

export class AuditLogActorApiKey extends S.Struct({
  "id": S.optional(S.String),
  "type": S.optional(S.Literal("user", "service_account")),
  "user": S.optional(AuditLogActorUser),
  "service_account": S.optional(AuditLogActorServiceAccount)
}) {}

export class AuditLogActor extends S.Struct({
  "type": S.optional(S.Literal("session", "api_key")),
  "session": S.optional(S.Record({ key: S.String, value: S.Unknown })),
  "api_key": S.optional(S.Record({ key: S.String, value: S.Unknown }))
}) {}

export class AuditLog extends S.Struct({
  "id": S.String,
  "type": AuditLogEventType,
  "effective_at": S.Int,
  "project": S.optional(S.Struct({
    "id": S.optional(S.String),
    "name": S.optional(S.String)
  })),
  "actor": AuditLogActor,
  "api_key.created": S.optional(S.Struct({
    "id": S.optional(S.String),
    "data": S.optional(S.Struct({
      "scopes": S.optional(S.Array(S.String))
    }))
  })),
  "api_key.updated": S.optional(S.Struct({
    "id": S.optional(S.String),
    "changes_requested": S.optional(S.Struct({
      "scopes": S.optional(S.Array(S.String))
    }))
  })),
  "api_key.deleted": S.optional(S.Struct({
    "id": S.optional(S.String)
  })),
  "invite.sent": S.optional(S.Struct({
    "id": S.optional(S.String),
    "data": S.optional(S.Struct({
      "email": S.optional(S.String),
      "role": S.optional(S.String)
    }))
  })),
  "invite.accepted": S.optional(S.Struct({
    "id": S.optional(S.String)
  })),
  "invite.deleted": S.optional(S.Struct({
    "id": S.optional(S.String)
  })),
  "login.failed": S.optional(S.Struct({
    "error_code": S.optional(S.String),
    "error_message": S.optional(S.String)
  })),
  "logout.failed": S.optional(S.Struct({
    "error_code": S.optional(S.String),
    "error_message": S.optional(S.String)
  })),
  "organization.updated": S.optional(S.Struct({
    "id": S.optional(S.String),
    "changes_requested": S.optional(S.Struct({
      "title": S.optional(S.String),
      "description": S.optional(S.String),
      "name": S.optional(S.String),
      "settings": S.optional(S.Struct({
        "threads_ui_visibility": S.optional(S.String),
        "usage_dashboard_visibility": S.optional(S.String)
      }))
    }))
  })),
  "project.created": S.optional(S.Struct({
    "id": S.optional(S.String),
    "data": S.optional(S.Struct({
      "name": S.optional(S.String),
      "title": S.optional(S.String)
    }))
  })),
  "project.updated": S.optional(S.Struct({
    "id": S.optional(S.String),
    "changes_requested": S.optional(S.Struct({
      "title": S.optional(S.String)
    }))
  })),
  "project.archived": S.optional(S.Struct({
    "id": S.optional(S.String)
  })),
  "service_account.created": S.optional(S.Struct({
    "id": S.optional(S.String),
    "data": S.optional(S.Struct({
      "role": S.optional(S.String)
    }))
  })),
  "service_account.updated": S.optional(S.Struct({
    "id": S.optional(S.String),
    "changes_requested": S.optional(S.Struct({
      "role": S.optional(S.String)
    }))
  })),
  "service_account.deleted": S.optional(S.Struct({
    "id": S.optional(S.String)
  })),
  "user.added": S.optional(S.Struct({
    "id": S.optional(S.String),
    "data": S.optional(S.Struct({
      "role": S.optional(S.String)
    }))
  })),
  "user.updated": S.optional(S.Struct({
    "id": S.optional(S.String),
    "changes_requested": S.optional(S.Struct({
      "role": S.optional(S.String)
    }))
  })),
  "user.deleted": S.optional(S.Struct({
    "id": S.optional(S.String)
  }))
}) {}

export class ListAuditLogsResponse extends S.Class<ListAuditLogsResponse>("ListAuditLogsResponse")({
  "object": S.Literal("list"),
  "data": S.Array(AuditLog),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class ListInvitesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "after": S.optional(S.String)
}) {}

export class Invite extends S.Struct({
  "object": S.Literal("organization.invite"),
  "id": S.String,
  "email": S.String,
  "role": S.Literal("owner", "reader"),
  "status": S.Literal("accepted", "expired", "pending"),
  "invited_at": S.Int,
  "expires_at": S.Int,
  "accepted_at": S.optional(S.Int)
}) {}

export class InviteListResponse extends S.Class<InviteListResponse>("InviteListResponse")({
  "object": S.Literal("list"),
  "data": S.Array(Invite),
  "first_id": S.optional(S.String),
  "last_id": S.optional(S.String),
  "has_more": S.optional(S.Boolean)
}) {}

export class InviteRequest extends S.Class<InviteRequest>("InviteRequest")({
  "email": S.String,
  "role": S.Literal("reader", "owner")
}) {}

export class InviteDeleteResponse extends S.Class<InviteDeleteResponse>("InviteDeleteResponse")({
  "object": S.Literal("organization.invite.deleted"),
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class ListUsersParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "after": S.optional(S.String)
}) {}

export class User extends S.Struct({
  "object": S.Literal("organization.user"),
  "id": S.String,
  "name": S.String,
  "email": S.String,
  "role": S.Literal("owner", "reader"),
  "added_at": S.Int
}) {}

export class UserListResponse extends S.Class<UserListResponse>("UserListResponse")({
  "object": S.Literal("list"),
  "data": S.Array(User),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class UserRoleUpdateRequest extends S.Class<UserRoleUpdateRequest>("UserRoleUpdateRequest")({
  "role": S.Literal("owner", "reader")
}) {}

export class UserDeleteResponse extends S.Class<UserDeleteResponse>("UserDeleteResponse")({
  "object": S.Literal("organization.user.deleted"),
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class ListProjectsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "after": S.optional(S.String),
  "include_archived": S.optionalWith(S.Boolean, { default: () => false as const })
}) {}

export class Project extends S.Struct({
  "id": S.String,
  "object": S.Literal("organization.project"),
  "name": S.String,
  "created_at": S.Int,
  "archived_at": S.optionalWith(S.Int, { nullable: true }),
  "status": S.Literal("active", "archived")
}) {}

export class ProjectListResponse extends S.Class<ProjectListResponse>("ProjectListResponse")({
  "object": S.Literal("list"),
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

export class ListProjectUsersParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "after": S.optional(S.String)
}) {}

export class ProjectUser extends S.Struct({
  "object": S.Literal("organization.project.user"),
  "id": S.String,
  "name": S.String,
  "email": S.String,
  "role": S.Literal("owner", "member"),
  "added_at": S.Int
}) {}

export class ProjectUserListResponse extends S.Class<ProjectUserListResponse>("ProjectUserListResponse")({
  "object": S.String,
  "data": S.Array(ProjectUser),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class ProjectUserCreateRequest extends S.Class<ProjectUserCreateRequest>("ProjectUserCreateRequest")({
  "user_id": S.String,
  "role": S.Literal("owner", "member")
}) {}

export class ProjectUserUpdateRequest extends S.Class<ProjectUserUpdateRequest>("ProjectUserUpdateRequest")({
  "role": S.Literal("owner", "member")
}) {}

export class ProjectUserDeleteResponse extends S.Class<ProjectUserDeleteResponse>("ProjectUserDeleteResponse")({
  "object": S.Literal("organization.project.user.deleted"),
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class ListProjectServiceAccountsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "after": S.optional(S.String)
}) {}

export class ProjectServiceAccount extends S.Struct({
  "object": S.Literal("organization.project.service_account"),
  "id": S.String,
  "name": S.String,
  "role": S.Literal("owner", "member"),
  "created_at": S.Int
}) {}

export class ProjectServiceAccountListResponse
  extends S.Class<ProjectServiceAccountListResponse>("ProjectServiceAccountListResponse")({
    "object": S.Literal("list"),
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

export class ProjectServiceAccountApiKey extends S.Struct({
  "object": S.Literal("organization.project.service_account.api_key"),
  "value": S.String,
  "name": S.String,
  "created_at": S.Int,
  "id": S.String
}) {}

export class ProjectServiceAccountCreateResponse
  extends S.Class<ProjectServiceAccountCreateResponse>("ProjectServiceAccountCreateResponse")({
    "object": S.Literal("organization.project.service_account"),
    "id": S.String,
    "name": S.String,
    "role": S.Literal("member"),
    "created_at": S.Int,
    "api_key": ProjectServiceAccountApiKey
  })
{}

export class ProjectServiceAccountDeleteResponse
  extends S.Class<ProjectServiceAccountDeleteResponse>("ProjectServiceAccountDeleteResponse")({
    "object": S.Literal("organization.project.service_account.deleted"),
    "id": S.String,
    "deleted": S.Boolean
  })
{}

export class ListProjectApiKeysParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { default: () => 20 as const }),
  "after": S.optional(S.String)
}) {}

export class ProjectApiKey extends S.Struct({
  "object": S.Literal("organization.project.api_key"),
  "redacted_value": S.String,
  "name": S.String,
  "created_at": S.Int,
  "id": S.String,
  "owner": S.Struct({
    "type": S.optional(S.Literal("user", "service_account")),
    "user": S.optional(ProjectUser),
    "service_account": S.optional(ProjectServiceAccount)
  })
}) {}

export class ProjectApiKeyListResponse extends S.Class<ProjectApiKeyListResponse>("ProjectApiKeyListResponse")({
  "object": S.Literal("list"),
  "data": S.Array(ProjectApiKey),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

export class ProjectApiKeyDeleteResponse extends S.Class<ProjectApiKeyDeleteResponse>("ProjectApiKeyDeleteResponse")({
  "object": S.Literal("organization.project.api_key.deleted"),
  "id": S.String,
  "deleted": S.Boolean
}) {}

export const make = (httpClient: HttpClient.HttpClient): Client => {
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
  const decodeError = <A, I, R>(response: HttpClientResponse.HttpClientResponse, schema: S.Schema<A, I, R>) =>
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)(response), Effect.fail)
  return {
    "createChatCompletion": (options) =>
      HttpClientRequest.make("POST")(`/chat/completions`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(CreateChatCompletionResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createCompletion": (options) =>
      HttpClientRequest.make("POST")(`/completions`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(CreateCompletionResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createImage": (options) =>
      HttpClientRequest.make("POST")(`/images/generations`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ImagesResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createImageEdit": (options) =>
      HttpClientRequest.make("POST")(`/images/edits`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ImagesResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createImageVariation": (options) =>
      HttpClientRequest.make("POST")(`/images/variations`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ImagesResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createEmbedding": (options) =>
      HttpClientRequest.make("POST")(`/embeddings`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(CreateEmbeddingResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createSpeech": (options) =>
      HttpClientRequest.make("POST")(`/audio/speech`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createTranscription": (options) =>
      HttpClientRequest.make("POST")(`/audio/transcriptions`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(CreateTranscription200)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createTranslation": (options) =>
      HttpClientRequest.make("POST")(`/audio/translations`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(CreateTranslation200)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listFiles": (options) =>
      HttpClientRequest.make("GET")(`/files`).pipe(
        HttpClientRequest.setUrlParams({ "purpose": options["purpose"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListFilesResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createFile": (options) =>
      HttpClientRequest.make("POST")(`/files`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(OpenAIFile)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveFile": (fileId) =>
      HttpClientRequest.make("GET")(`/files/${fileId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(OpenAIFile)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteFile": (fileId) =>
      HttpClientRequest.make("DELETE")(`/files/${fileId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(DeleteFileResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "downloadFile": (fileId) =>
      HttpClientRequest.make("GET")(`/files/${fileId}/content`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(DownloadFile200)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createUpload": (options) =>
      HttpClientRequest.make("POST")(`/uploads`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Upload)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "addUploadPart": (uploadId, options) =>
      HttpClientRequest.make("POST")(`/uploads/${uploadId}/parts`).pipe(
        HttpClientRequest.bodyFormData(options),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(UploadPart)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "completeUpload": (uploadId, options) =>
      HttpClientRequest.make("POST")(`/uploads/${uploadId}/complete`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Upload)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "cancelUpload": (uploadId) =>
      HttpClientRequest.make("POST")(`/uploads/${uploadId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Upload)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listPaginatedFineTuningJobs": (options) =>
      HttpClientRequest.make("GET")(`/fine_tuning/jobs`).pipe(
        HttpClientRequest.setUrlParams({ "after": options["after"], "limit": options["limit"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListPaginatedFineTuningJobsResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createFineTuningJob": (options) =>
      HttpClientRequest.make("POST")(`/fine_tuning/jobs`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(FineTuningJob)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveFineTuningJob": (fineTuningJobId) =>
      HttpClientRequest.make("GET")(`/fine_tuning/jobs/${fineTuningJobId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(FineTuningJob)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listFineTuningEvents": (fineTuningJobId, options) =>
      HttpClientRequest.make("GET")(`/fine_tuning/jobs/${fineTuningJobId}/events`).pipe(
        HttpClientRequest.setUrlParams({ "after": options["after"], "limit": options["limit"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListFineTuningJobEventsResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "cancelFineTuningJob": (fineTuningJobId) =>
      HttpClientRequest.make("POST")(`/fine_tuning/jobs/${fineTuningJobId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(FineTuningJob)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listFineTuningJobCheckpoints": (fineTuningJobId, options) =>
      HttpClientRequest.make("GET")(`/fine_tuning/jobs/${fineTuningJobId}/checkpoints`).pipe(
        HttpClientRequest.setUrlParams({ "after": options["after"], "limit": options["limit"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListFineTuningJobCheckpointsResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listModels": () =>
      HttpClientRequest.make("GET")(`/models`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListModelsResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveModel": (model) =>
      HttpClientRequest.make("GET")(`/models/${model}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Model)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteModel": (model) =>
      HttpClientRequest.make("DELETE")(`/models/${model}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(DeleteModelResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createModeration": (options) =>
      HttpClientRequest.make("POST")(`/moderations`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(CreateModerationResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listAssistants": (options) =>
      HttpClientRequest.make("GET")(`/assistants`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"],
          "order": options["order"],
          "after": options["after"],
          "before": options["before"]
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListAssistantsResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createAssistant": (options) =>
      HttpClientRequest.make("POST")(`/assistants`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(AssistantObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "getAssistant": (assistantId) =>
      HttpClientRequest.make("GET")(`/assistants/${assistantId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(AssistantObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "modifyAssistant": (assistantId, options) =>
      HttpClientRequest.make("POST")(`/assistants/${assistantId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(AssistantObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteAssistant": (assistantId) =>
      HttpClientRequest.make("DELETE")(`/assistants/${assistantId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(DeleteAssistantResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createThread": (options) =>
      HttpClientRequest.make("POST")(`/threads`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ThreadObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "getThread": (threadId) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ThreadObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "modifyThread": (threadId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ThreadObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteThread": (threadId) =>
      HttpClientRequest.make("DELETE")(`/threads/${threadId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(DeleteThreadResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listMessages": (threadId, options) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/messages`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"],
          "order": options["order"],
          "after": options["after"],
          "before": options["before"],
          "run_id": options["run_id"]
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListMessagesResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createMessage": (threadId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/messages`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(MessageObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "getMessage": (threadId, messageId) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/messages/${messageId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(MessageObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "modifyMessage": (threadId, messageId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/messages/${messageId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(MessageObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteMessage": (threadId, messageId) =>
      HttpClientRequest.make("DELETE")(`/threads/${threadId}/messages/${messageId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(DeleteMessageResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createThreadAndRun": (options) =>
      HttpClientRequest.make("POST")(`/threads/runs`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listRuns": (threadId, options) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/runs`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"],
          "order": options["order"],
          "after": options["after"],
          "before": options["before"]
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListRunsResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createRun": (threadId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/runs`).pipe(
        HttpClientRequest.setUrlParams({ "include[]": options.params["include[]"] }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "getRun": (threadId, runId) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/runs/${runId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "modifyRun": (threadId, runId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/runs/${runId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "submitToolOuputsToRun": (threadId, runId, options) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "cancelRun": (threadId, runId) =>
      HttpClientRequest.make("POST")(`/threads/${threadId}/runs/${runId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(RunObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listRunSteps": (threadId, runId, options) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/runs/${runId}/steps`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"],
          "order": options["order"],
          "after": options["after"],
          "before": options["before"],
          "include[]": options["include[]"]
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListRunStepsResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "getRunStep": (threadId, runId, stepId, options) =>
      HttpClientRequest.make("GET")(`/threads/${threadId}/runs/${runId}/steps/${stepId}`).pipe(
        HttpClientRequest.setUrlParams({ "include[]": options["include[]"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(RunStepObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listVectorStores": (options) =>
      HttpClientRequest.make("GET")(`/vector_stores`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"],
          "order": options["order"],
          "after": options["after"],
          "before": options["before"]
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListVectorStoresResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createVectorStore": (options) =>
      HttpClientRequest.make("POST")(`/vector_stores`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "getVectorStore": (vectorStoreId) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "modifyVectorStore": (vectorStoreId, options) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteVectorStore": (vectorStoreId) =>
      HttpClientRequest.make("DELETE")(`/vector_stores/${vectorStoreId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(DeleteVectorStoreResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listVectorStoreFiles": (vectorStoreId, options) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}/files`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"],
          "order": options["order"],
          "after": options["after"],
          "before": options["before"],
          "filter": options["filter"]
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListVectorStoreFilesResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createVectorStoreFile": (vectorStoreId, options) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}/files`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "getVectorStoreFile": (vectorStoreId, fileId) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}/files/${fileId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteVectorStoreFile": (vectorStoreId, fileId) =>
      HttpClientRequest.make("DELETE")(`/vector_stores/${vectorStoreId}/files/${fileId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(DeleteVectorStoreFileResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createVectorStoreFileBatch": (vectorStoreId, options) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}/file_batches`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileBatchObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "getVectorStoreFileBatch": (vectorStoreId, batchId) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}/file_batches/${batchId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileBatchObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "cancelVectorStoreFileBatch": (vectorStoreId, batchId) =>
      HttpClientRequest.make("POST")(`/vector_stores/${vectorStoreId}/file_batches/${batchId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(VectorStoreFileBatchObject)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listFilesInVectorStoreBatch": (vectorStoreId, batchId, options) =>
      HttpClientRequest.make("GET")(`/vector_stores/${vectorStoreId}/file_batches/${batchId}/files`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"],
          "order": options["order"],
          "after": options["after"],
          "before": options["before"],
          "filter": options["filter"]
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListVectorStoreFilesResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listBatches": (options) =>
      HttpClientRequest.make("GET")(`/batches`).pipe(
        HttpClientRequest.setUrlParams({ "after": options["after"], "limit": options["limit"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListBatchesResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createBatch": (options) =>
      HttpClientRequest.make("POST")(`/batches`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Batch)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveBatch": (batchId) =>
      HttpClientRequest.make("GET")(`/batches/${batchId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Batch)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "cancelBatch": (batchId) =>
      HttpClientRequest.make("POST")(`/batches/${batchId}/cancel`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Batch)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listAuditLogs": (options) =>
      HttpClientRequest.make("GET")(`/organization/audit_logs`).pipe(
        HttpClientRequest.setUrlParams({
          "effective_at[gt]": options["effective_at[gt]"],
          "effective_at[gte]": options["effective_at[gte]"],
          "effective_at[lt]": options["effective_at[lt]"],
          "effective_at[lte]": options["effective_at[lte]"],
          "project_ids[]": options["project_ids[]"],
          "event_types[]": options["event_types[]"],
          "actor_ids[]": options["actor_ids[]"],
          "actor_emails[]": options["actor_emails[]"],
          "resource_ids[]": options["resource_ids[]"],
          "limit": options["limit"],
          "after": options["after"],
          "before": options["before"]
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ListAuditLogsResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listInvites": (options) =>
      HttpClientRequest.make("GET")(`/organization/invites`).pipe(
        HttpClientRequest.setUrlParams({ "limit": options["limit"], "after": options["after"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(InviteListResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "inviteUser": (options) =>
      HttpClientRequest.make("POST")(`/organization/invites`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Invite)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveInvite": (inviteId) =>
      HttpClientRequest.make("GET")(`/organization/invites/${inviteId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Invite)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteInvite": (inviteId) =>
      HttpClientRequest.make("DELETE")(`/organization/invites/${inviteId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(InviteDeleteResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listUsers": (options) =>
      HttpClientRequest.make("GET")(`/organization/users`).pipe(
        HttpClientRequest.setUrlParams({ "limit": options["limit"], "after": options["after"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(UserListResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveUser": (userId) =>
      HttpClientRequest.make("GET")(`/organization/users/${userId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(User)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "modifyUser": (userId, options) =>
      HttpClientRequest.make("POST")(`/organization/users/${userId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(User)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteUser": (userId) =>
      HttpClientRequest.make("DELETE")(`/organization/users/${userId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(UserDeleteResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listProjects": (options) =>
      HttpClientRequest.make("GET")(`/organization/projects`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options["limit"],
          "after": options["after"],
          "include_archived": options["include_archived"]
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectListResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createProject": (options) =>
      HttpClientRequest.make("POST")(`/organization/projects`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Project)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveProject": (projectId) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Project)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "modifyProject": (projectId, options) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Project)(r),
              "400": (r) => decodeError(r, ErrorResponse),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "archiveProject": (projectId) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}/archive`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(Project)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listProjectUsers": (projectId, options) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/users`).pipe(
        HttpClientRequest.setUrlParams({ "limit": options["limit"], "after": options["after"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUserListResponse)(r),
              "400": (r) => decodeError(r, ErrorResponse),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createProjectUser": (projectId, options) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}/users`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUser)(r),
              "400": (r) => decodeError(r, ErrorResponse),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveProjectUser": (projectId, userId) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/users/${userId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUser)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "modifyProjectUser": (projectId, userId, options) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}/users/${userId}`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUser)(r),
              "400": (r) => decodeError(r, ErrorResponse),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteProjectUser": (projectId, userId) =>
      HttpClientRequest.make("DELETE")(`/organization/projects/${projectId}/users/${userId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectUserDeleteResponse)(r),
              "400": (r) => decodeError(r, ErrorResponse),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listProjectServiceAccounts": (projectId, options) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/service_accounts`).pipe(
        HttpClientRequest.setUrlParams({ "limit": options["limit"], "after": options["after"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectServiceAccountListResponse)(r),
              "400": (r) => decodeError(r, ErrorResponse),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "createProjectServiceAccount": (projectId, options) =>
      HttpClientRequest.make("POST")(`/organization/projects/${projectId}/service_accounts`).pipe(
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectServiceAccountCreateResponse)(r),
              "400": (r) => decodeError(r, ErrorResponse),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveProjectServiceAccount": (projectId, serviceAccountId) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/service_accounts/${serviceAccountId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectServiceAccount)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteProjectServiceAccount": (projectId, serviceAccountId) =>
      HttpClientRequest.make("DELETE")(`/organization/projects/${projectId}/service_accounts/${serviceAccountId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectServiceAccountDeleteResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "listProjectApiKeys": (projectId, options) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/api_keys`).pipe(
        HttpClientRequest.setUrlParams({ "limit": options["limit"], "after": options["after"] }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectApiKeyListResponse)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "retrieveProjectApiKey": (projectId, keyId) =>
      HttpClientRequest.make("GET")(`/organization/projects/${projectId}/api_keys/${keyId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectApiKey)(r),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      ),
    "deleteProjectApiKey": (projectId, keyId) =>
      HttpClientRequest.make("DELETE")(`/organization/projects/${projectId}/api_keys/${keyId}`).pipe(
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            httpClient.execute(request),
            HttpClientResponse.matchStatus({
              "200": (r) => HttpClientResponse.schemaBodyJson(ProjectApiKeyDeleteResponse)(r),
              "400": (r) => decodeError(r, ErrorResponse),
              orElse: (response) => unexpectedStatus(request, response)
            })
          )
        ),
        Effect.scoped
      )
  }
}

export interface Client {
  readonly "createChatCompletion": (
    options: typeof CreateChatCompletionRequest.Encoded
  ) => Effect.Effect<typeof CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createCompletion": (
    options: typeof CreateCompletionRequest.Encoded
  ) => Effect.Effect<typeof CreateCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createImage": (
    options: typeof CreateImageRequest.Encoded
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createImageEdit": (
    options: globalThis.FormData
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createImageVariation": (
    options: globalThis.FormData
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createEmbedding": (
    options: typeof CreateEmbeddingRequest.Encoded
  ) => Effect.Effect<typeof CreateEmbeddingResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createSpeech": (
    options: typeof CreateSpeechRequest.Encoded
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  readonly "createTranscription": (
    options: globalThis.FormData
  ) => Effect.Effect<typeof CreateTranscription200.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createTranslation": (
    options: globalThis.FormData
  ) => Effect.Effect<typeof CreateTranslation200.Type, HttpClientError.HttpClientError | ParseError>
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
  readonly "createUpload": (
    options: typeof CreateUploadRequest.Encoded
  ) => Effect.Effect<typeof Upload.Type, HttpClientError.HttpClientError | ParseError>
  readonly "addUploadPart": (
    uploadId: string,
    options: globalThis.FormData
  ) => Effect.Effect<typeof UploadPart.Type, HttpClientError.HttpClientError | ParseError>
  readonly "completeUpload": (
    uploadId: string,
    options: typeof CompleteUploadRequest.Encoded
  ) => Effect.Effect<typeof Upload.Type, HttpClientError.HttpClientError | ParseError>
  readonly "cancelUpload": (
    uploadId: string
  ) => Effect.Effect<typeof Upload.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listPaginatedFineTuningJobs": (
    options: typeof ListPaginatedFineTuningJobsParams.Encoded
  ) => Effect.Effect<typeof ListPaginatedFineTuningJobsResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "createFineTuningJob": (
    options: typeof CreateFineTuningJobRequest.Encoded
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  readonly "retrieveFineTuningJob": (
    fineTuningJobId: string
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listFineTuningEvents": (
    fineTuningJobId: string,
    options: typeof ListFineTuningEventsParams.Encoded
  ) => Effect.Effect<typeof ListFineTuningJobEventsResponse.Type, HttpClientError.HttpClientError | ParseError>
  readonly "cancelFineTuningJob": (
    fineTuningJobId: string
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  readonly "listFineTuningJobCheckpoints": (
    fineTuningJobId: string,
    options: typeof ListFineTuningJobCheckpointsParams.Encoded
  ) => Effect.Effect<typeof ListFineTuningJobCheckpointsResponse.Type, HttpClientError.HttpClientError | ParseError>
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
  readonly "createThread": (
    options: typeof CreateThreadRequest.Encoded
  ) => Effect.Effect<typeof ThreadObject.Type, HttpClientError.HttpClientError | ParseError>
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
  readonly "createThreadAndRun": (
    options: typeof CreateThreadAndRunRequest.Encoded
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
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
  readonly "submitToolOuputsToRun": (
    threadId: string,
    runId: string,
    options: typeof SubmitToolOutputsRunRequest.Encoded
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
  readonly "deleteVectorStoreFile": (
    vectorStoreId: string,
    fileId: string
  ) => Effect.Effect<typeof DeleteVectorStoreFileResponse.Type, HttpClientError.HttpClientError | ParseError>
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
  readonly "listAuditLogs": (
    options: typeof ListAuditLogsParams.Encoded
  ) => Effect.Effect<typeof ListAuditLogsResponse.Type, HttpClientError.HttpClientError | ParseError>
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
  readonly "archiveProject": (
    projectId: string
  ) => Effect.Effect<typeof Project.Type, HttpClientError.HttpClientError | ParseError>
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
}
