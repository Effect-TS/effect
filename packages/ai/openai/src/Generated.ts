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

export class ListAssistantsParamsOrder extends S.Literal("asc", "desc") {}

export class ListAssistantsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListAssistantsParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always `assistant`.
 */
export class AssistantObjectObject extends S.Literal("assistant") {}

/**
 * The type of tool being defined: `code_interpreter`
 */
export class AssistantToolsCodeType extends S.Literal("code_interpreter") {}

export class AssistantToolsCode extends S.Class<AssistantToolsCode>("AssistantToolsCode")({
  /**
   * The type of tool being defined: `code_interpreter`
   */
  "type": AssistantToolsCodeType
}) {}

/**
 * The type of tool being defined: `file_search`
 */
export class AssistantToolsFileSearchType extends S.Literal("file_search") {}

/**
 * The ranker to use for the file search. If not specified will use the `auto` ranker.
 */
export class FileSearchRanker extends S.Literal("auto", "default_2024_08_21") {}

/**
 * The ranking options for the file search. If not specified, the file search tool will use the `auto` ranker and a score_threshold of 0.
 *
 * See the [file search tool documentation](https://platform.openai.com/docs/assistants/tools/file-search#customizing-file-search-settings) for more information.
 */
export class FileSearchRankingOptions extends S.Class<FileSearchRankingOptions>("FileSearchRankingOptions")({
  "ranker": S.optionalWith(FileSearchRanker, { nullable: true }),
  /**
   * The score threshold for the file search. All values must be a floating point number between 0 and 1.
   */
  "score_threshold": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1))
}) {}

export class AssistantToolsFileSearch extends S.Class<AssistantToolsFileSearch>("AssistantToolsFileSearch")({
  /**
   * The type of tool being defined: `file_search`
   */
  "type": AssistantToolsFileSearchType,
  /**
   * Overrides for the file search tool.
   */
  "file_search": S.optionalWith(
    S.Struct({
      /**
       * The maximum number of results the file search tool should output. The default is 20 for `gpt-4*` models and 5 for `gpt-3.5-turbo`. This number should be between 1 and 50 inclusive.
       *
       * Note that the file search tool may output fewer than `max_num_results` results. See the [file search tool documentation](https://platform.openai.com/docs/assistants/tools/file-search#customizing-file-search-settings) for more information.
       */
      "max_num_results": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50)), {
        nullable: true
      }),
      "ranking_options": S.optionalWith(FileSearchRankingOptions, { nullable: true })
    }),
    { nullable: true }
  )
}) {}

/**
 * The type of tool being defined: `function`
 */
export class AssistantToolsFunctionType extends S.Literal("function") {}

/**
 * The parameters the functions accepts, described as a JSON Schema object. See the [guide](https://platform.openai.com/docs/guides/function-calling) for examples, and the [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for documentation about the format.
 *
 * Omitting `parameters` defines a function with an empty parameter list.
 */
export class FunctionParameters extends S.Record({ key: S.String, value: S.Unknown }) {}

export class FunctionObject extends S.Class<FunctionObject>("FunctionObject")({
  /**
   * A description of what the function does, used by the model to choose when and how to call the function.
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.
   */
  "name": S.String,
  "parameters": S.optionalWith(FunctionParameters, { nullable: true }),
  "strict": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class AssistantToolsFunction extends S.Class<AssistantToolsFunction>("AssistantToolsFunction")({
  /**
   * The type of tool being defined: `function`
   */
  "type": AssistantToolsFunctionType,
  "function": FunctionObject
}) {}

export class AssistantTool extends S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction) {}

export class Metadata extends S.Union(
  /**
   * Set of 16 key-value pairs that can be attached to an object. This can be
   * useful for storing additional information about the object in a structured
   * format, and querying for objects via API or the dashboard.
   *
   * Keys are strings with a maximum length of 64 characters. Values are strings
   * with a maximum length of 512 characters.
   */
  S.Record({ key: S.String, value: S.Unknown }),
  S.Null
) {}

/**
 * `auto` is the default value
 */
export class AssistantsApiResponseFormatOptionEnum extends S.Literal("auto") {}

/**
 * The type of response format being defined. Always `text`.
 */
export class ResponseFormatTextType extends S.Literal("text") {}

/**
 * Default response format. Used to generate text responses.
 */
export class ResponseFormatText extends S.Class<ResponseFormatText>("ResponseFormatText")({
  /**
   * The type of response format being defined. Always `text`.
   */
  "type": ResponseFormatTextType
}) {}

/**
 * The type of response format being defined. Always `json_object`.
 */
export class ResponseFormatJsonObjectType extends S.Literal("json_object") {}

/**
 * JSON object response format. An older method of generating JSON responses.
 * Using `json_schema` is recommended for models that support it. Note that the
 * model will not generate JSON without a system or user message instructing it
 * to do so.
 */
export class ResponseFormatJsonObject extends S.Class<ResponseFormatJsonObject>("ResponseFormatJsonObject")({
  /**
   * The type of response format being defined. Always `json_object`.
   */
  "type": ResponseFormatJsonObjectType
}) {}

/**
 * The type of response format being defined. Always `json_schema`.
 */
export class ResponseFormatJsonSchemaType extends S.Literal("json_schema") {}

/**
 * The schema for the response format, described as a JSON Schema object.
 * Learn how to build JSON schemas [here](https://json-schema.org/).
 */
export class ResponseFormatJsonSchemaSchema extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * JSON Schema response format. Used to generate structured JSON responses.
 * Learn more about [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs).
 */
export class ResponseFormatJsonSchema extends S.Class<ResponseFormatJsonSchema>("ResponseFormatJsonSchema")({
  /**
   * The type of response format being defined. Always `json_schema`.
   */
  "type": ResponseFormatJsonSchemaType,
  /**
   * Structured Outputs configuration options, including a JSON Schema.
   */
  "json_schema": S.Struct({
    /**
     * A description of what the response format is for, used by the model to
     * determine how to respond in the format.
     */
    "description": S.optionalWith(S.String, { nullable: true }),
    /**
     * The name of the response format. Must be a-z, A-Z, 0-9, or contain
     * underscores and dashes, with a maximum length of 64.
     */
    "name": S.String,
    "schema": S.optionalWith(ResponseFormatJsonSchemaSchema, { nullable: true }),
    "strict": S.optionalWith(S.Boolean, { nullable: true })
  })
}) {}

/**
 * Specifies the format that the model must output. Compatible with [GPT-4o](https://platform.openai.com/docs/models#gpt-4o), [GPT-4 Turbo](https://platform.openai.com/docs/models#gpt-4-turbo-and-gpt-4), and all GPT-3.5 Turbo models since `gpt-3.5-turbo-1106`.
 *
 * Setting to `{ "type": "json_schema", "json_schema": {...} }` enables Structured Outputs which ensures the model will match your supplied JSON schema. Learn more in the [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs).
 *
 * Setting to `{ "type": "json_object" }` enables JSON mode, which ensures the message the model generates is valid JSON.
 *
 * **Important:** when using JSON mode, you **must** also instruct the model to produce JSON yourself via a system or user message. Without this, the model may generate an unending stream of whitespace until the generation reaches the token limit, resulting in a long-running and seemingly "stuck" request. Also note that the message content may be partially cut off if `finish_reason="length"`, which indicates the generation exceeded `max_tokens` or the conversation exceeded the max context length.
 */
export class AssistantsApiResponseFormatOption extends S.Union(
  /**
   * `auto` is the default value
   */
  AssistantsApiResponseFormatOptionEnum,
  ResponseFormatText,
  ResponseFormatJsonObject,
  ResponseFormatJsonSchema
) {}

/**
 * Represents an `assistant` that can call the model and use tools.
 */
export class AssistantObject extends S.Class<AssistantObject>("AssistantObject")({
  /**
   * The identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The object type, which is always `assistant`.
   */
  "object": AssistantObjectObject,
  /**
   * The Unix timestamp (in seconds) for when the assistant was created.
   */
  "created_at": S.Int,
  "name": S.NullOr(S.String.pipe(S.maxLength(256))),
  "description": S.NullOr(S.String.pipe(S.maxLength(512))),
  /**
   * ID of the model to use. You can use the [List models](https://platform.openai.com/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](https://platform.openai.com/docs/models) for descriptions of them.
   */
  "model": S.String,
  "instructions": S.NullOr(S.String.pipe(S.maxLength(256000))),
  /**
   * A list of tool enabled on the assistant. There can be a maximum of 128 tools per assistant. Tools can be of types `code_interpreter`, `file_search`, or `function`.
   */
  "tools": S.Array(AssistantTool).pipe(S.maxItems(128)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => [] as const)
  ),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * A list of [file](https://platform.openai.com/docs/api-reference/files) IDs made available to the `code_interpreter`` tool. There can be a maximum of 20 files associated with the tool.
           */
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          /**
           * The ID of the [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) attached to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
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
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5-2025-08-07",
  "gpt-5-mini-2025-08-07",
  "gpt-5-nano-2025-08-07",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4.1-2025-04-14",
  "gpt-4.1-mini-2025-04-14",
  "gpt-4.1-nano-2025-04-14",
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

/**
 * Constrains effort on reasoning for
 * [reasoning models](https://platform.openai.com/docs/guides/reasoning).
 * Currently supported values are `none`, `minimal`, `low`, `medium`, and `high`. Reducing
 * reasoning effort can result in faster responses and fewer tokens used
 * on reasoning in a response.
 *
 * - `gpt-5.1` defaults to `none`, which does not perform reasoning. The supported reasoning values for `gpt-5.1` are `none`, `low`, `medium`, and `high`. Tool calls are supported for all reasoning values in gpt-5.1.
 * - All models before `gpt-5.1` default to `medium` reasoning effort, and do not support `none`.
 * - The `gpt-5-pro` model defaults to (and only supports) `high` reasoning effort.
 */
export class ReasoningEffortEnum extends S.Literal("none", "minimal", "low", "medium", "high") {}

export class ReasoningEffort extends S.Union(
  /**
   * Constrains effort on reasoning for
   * [reasoning models](https://platform.openai.com/docs/guides/reasoning).
   * Currently supported values are `none`, `minimal`, `low`, `medium`, and `high`. Reducing
   * reasoning effort can result in faster responses and fewer tokens used
   * on reasoning in a response.
   *
   * - `gpt-5.1` defaults to `none`, which does not perform reasoning. The supported reasoning values for `gpt-5.1` are `none`, `low`, `medium`, and `high`. Tool calls are supported for all reasoning values in gpt-5.1.
   * - All models before `gpt-5.1` default to `medium` reasoning effort, and do not support `none`.
   * - The `gpt-5-pro` model defaults to (and only supports) `high` reasoning effort.
   */
  ReasoningEffortEnum,
  S.Null
) {}

export class CreateAssistantRequest extends S.Class<CreateAssistantRequest>("CreateAssistantRequest")({
  /**
   * ID of the model to use. You can use the [List models](https://platform.openai.com/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](https://platform.openai.com/docs/models) for descriptions of them.
   */
  "model": S.Union(S.String, AssistantSupportedModels),
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true }),
  "instructions": S.optionalWith(S.String.pipe(S.maxLength(256000)), { nullable: true }),
  "reasoning_effort": S.optionalWith(S.Literal("none", "minimal", "low", "medium", "high"), { nullable: true }),
  /**
   * A list of tool enabled on the assistant. There can be a maximum of 128 tools per assistant. Tools can be of types `code_interpreter`, `file_search`, or `function`.
   */
  "tools": S.optionalWith(S.Array(AssistantTool).pipe(S.maxItems(128)), { nullable: true, default: () => [] as const }),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * A list of [file](https://platform.openai.com/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
           */
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          /**
           * The [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) attached to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true }),
          /**
           * A helper to create a [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) with file_ids and attach it to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_stores": S.optionalWith(
            S.Array(S.Struct({
              /**
               * A list of [file](https://platform.openai.com/docs/api-reference/files) IDs to add to the vector store. There can be a maximum of 10000 files in a vector store.
               */
              "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(10000)), { nullable: true }),
              /**
               * The chunking strategy used to chunk the file(s). If not set, will use the `auto` strategy.
               */
              "chunking_strategy": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
              "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
            })).pipe(S.maxItems(1)),
            { nullable: true }
          )
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

export class ModifyAssistantRequest extends S.Class<ModifyAssistantRequest>("ModifyAssistantRequest")({
  /**
   * ID of the model to use. You can use the [List models](https://platform.openai.com/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](https://platform.openai.com/docs/models) for descriptions of them.
   */
  "model": S.optionalWith(S.Union(S.String, AssistantSupportedModels), { nullable: true }),
  "reasoning_effort": S.optionalWith(S.Literal("none", "minimal", "low", "medium", "high"), { nullable: true }),
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true }),
  "instructions": S.optionalWith(S.String.pipe(S.maxLength(256000)), { nullable: true }),
  /**
   * A list of tool enabled on the assistant. There can be a maximum of 128 tools per assistant. Tools can be of types `code_interpreter`, `file_search`, or `function`.
   */
  "tools": S.optionalWith(S.Array(AssistantTool).pipe(S.maxItems(128)), { nullable: true, default: () => [] as const }),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * Overrides the list of [file](https://platform.openai.com/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
           */
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          /**
           * Overrides the [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) attached to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

export class DeleteAssistantResponseObject extends S.Literal("assistant.deleted") {}

export class DeleteAssistantResponse extends S.Class<DeleteAssistantResponse>("DeleteAssistantResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": DeleteAssistantResponseObject
}) {}

export class CreateSpeechRequestModelEnum extends S.Literal("tts-1", "tts-1-hd", "gpt-4o-mini-tts") {}

export class VoiceIdsSharedEnum
  extends S.Literal("alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar")
{}

export class VoiceIdsShared extends S.Union(S.String, VoiceIdsSharedEnum) {}

/**
 * The format to audio in. Supported formats are `mp3`, `opus`, `aac`, `flac`, `wav`, and `pcm`.
 */
export class CreateSpeechRequestResponseFormat extends S.Literal("mp3", "opus", "aac", "flac", "wav", "pcm") {}

/**
 * The format to stream the audio in. Supported formats are `sse` and `audio`. `sse` is not supported for `tts-1` or `tts-1-hd`.
 */
export class CreateSpeechRequestStreamFormat extends S.Literal("sse", "audio") {}

export class CreateSpeechRequest extends S.Class<CreateSpeechRequest>("CreateSpeechRequest")({
  /**
   * One of the available [TTS models](https://platform.openai.com/docs/models#tts): `tts-1`, `tts-1-hd` or `gpt-4o-mini-tts`.
   */
  "model": S.Union(S.String, CreateSpeechRequestModelEnum),
  /**
   * The text to generate audio for. The maximum length is 4096 characters.
   */
  "input": S.String.pipe(S.maxLength(4096)),
  /**
   * Control the voice of your generated audio with additional instructions. Does not work with `tts-1` or `tts-1-hd`.
   */
  "instructions": S.optionalWith(S.String.pipe(S.maxLength(4096)), { nullable: true }),
  /**
   * The voice to use when generating the audio. Supported voices are `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `onyx`, `nova`, `sage`, `shimmer`, and `verse`. Previews of the voices are available in the [Text to speech guide](https://platform.openai.com/docs/guides/text-to-speech#voice-options).
   */
  "voice": VoiceIdsShared,
  /**
   * The format to audio in. Supported formats are `mp3`, `opus`, `aac`, `flac`, `wav`, and `pcm`.
   */
  "response_format": S.optionalWith(CreateSpeechRequestResponseFormat, {
    nullable: true,
    default: () => "mp3" as const
  }),
  /**
   * The speed of the generated audio. Select a value from `0.25` to `4.0`. `1.0` is the default.
   */
  "speed": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0.25), S.lessThanOrEqualTo(4)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * The format to stream the audio in. Supported formats are `sse` and `audio`. `sse` is not supported for `tts-1` or `tts-1-hd`.
   */
  "stream_format": S.optionalWith(CreateSpeechRequestStreamFormat, { nullable: true, default: () => "audio" as const })
}) {}

export class CreateTranscriptionRequestModelEnum
  extends S.Literal("whisper-1", "gpt-4o-transcribe", "gpt-4o-mini-transcribe", "gpt-4o-transcribe-diarize")
{}

/**
 * The format of the output, in one of these options: `json`, `text`, `srt`, `verbose_json`, `vtt`, or `diarized_json`. For `gpt-4o-transcribe` and `gpt-4o-mini-transcribe`, the only supported format is `json`. For `gpt-4o-transcribe-diarize`, the supported formats are `json`, `text`, and `diarized_json`, with `diarized_json` required to receive speaker annotations.
 */
export class AudioResponseFormat extends S.Literal("json", "text", "srt", "verbose_json", "vtt", "diarized_json") {}

export class TranscriptionInclude extends S.Literal("logprobs") {}

/**
 * Automatically set chunking parameters based on the audio. Must be set to `"auto"`.
 */
export class TranscriptionChunkingStrategyEnum extends S.Literal("auto") {}

/**
 * Must be set to `server_vad` to enable manual chunking using server side VAD.
 */
export class VadConfigType extends S.Literal("server_vad") {}

export class VadConfig extends S.Class<VadConfig>("VadConfig")({
  /**
   * Must be set to `server_vad` to enable manual chunking using server side VAD.
   */
  "type": VadConfigType,
  /**
   * Amount of audio to include before the VAD detected speech (in
   * milliseconds).
   */
  "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true, default: () => 300 as const }),
  /**
   * Duration of silence to detect speech stop (in milliseconds).
   * With shorter values the model will respond more quickly,
   * but may jump in on short pauses from the user.
   */
  "silence_duration_ms": S.optionalWith(S.Int, { nullable: true, default: () => 200 as const }),
  /**
   * Sensitivity threshold (0.0 to 1.0) for voice activity detection. A
   * higher threshold will require louder audio to activate the model, and
   * thus might perform better in noisy environments.
   */
  "threshold": S.optionalWith(S.Number, { nullable: true, default: () => 0.5 as const })
}) {}

export class TranscriptionChunkingStrategy extends S.Union(
  /**
   * Controls how the audio is cut into chunks. When set to `"auto"`, the server first normalizes loudness and then uses voice activity detection (VAD) to choose boundaries. `server_vad` object can be provided to tweak VAD detection parameters manually. If unset, the audio is transcribed as a single block. Required when using `gpt-4o-transcribe-diarize` for inputs longer than 30 seconds.
   */
  S.Union(
    /**
     * Automatically set chunking parameters based on the audio. Must be set to `"auto"`.
     */
    S.Literal("auto"),
    VadConfig
  ),
  S.Null
) {}

export class CreateTranscriptionRequest extends S.Class<CreateTranscriptionRequest>("CreateTranscriptionRequest")({
  /**
   * The audio file object (not file name) to transcribe, in one of these formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm.
   */
  "file": S.instanceOf(globalThis.Blob),
  /**
   * ID of the model to use. The options are `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `whisper-1` (which is powered by our open source Whisper V2 model), and `gpt-4o-transcribe-diarize`.
   */
  "model": S.Union(S.String, CreateTranscriptionRequestModelEnum),
  /**
   * The language of the input audio. Supplying the input language in [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (e.g. `en`) format will improve accuracy and latency.
   */
  "language": S.optionalWith(S.String, { nullable: true }),
  /**
   * An optional text to guide the model's style or continue a previous audio segment. The [prompt](https://platform.openai.com/docs/guides/speech-to-text#prompting) should match the audio language. This field is not supported when using `gpt-4o-transcribe-diarize`.
   */
  "prompt": S.optionalWith(S.String, { nullable: true }),
  "response_format": S.optionalWith(AudioResponseFormat, { nullable: true, default: () => "json" as const }),
  /**
   * The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use [log probability](https://en.wikipedia.org/wiki/Log_probability) to automatically increase the temperature until certain thresholds are hit.
   */
  "temperature": S.optionalWith(S.Number, { nullable: true, default: () => 0 as const }),
  /**
   * Additional information to include in the transcription response.
   * `logprobs` will return the log probabilities of the tokens in the
   * response to understand the model's confidence in the transcription.
   * `logprobs` only works with response_format set to `json` and only with
   * the models `gpt-4o-transcribe` and `gpt-4o-mini-transcribe`. This field is not supported when using `gpt-4o-transcribe-diarize`.
   */
  "include": S.optionalWith(S.Array(TranscriptionInclude), { nullable: true }),
  /**
   * The timestamp granularities to populate for this transcription. `response_format` must be set `verbose_json` to use timestamp granularities. Either or both of these options are supported: `word`, or `segment`. Note: There is no additional latency for segment timestamps, but generating word timestamps incurs additional latency.
   * This option is not available for `gpt-4o-transcribe-diarize`.
   */
  "timestamp_granularities": S.optionalWith(S.Array(S.Literal("word", "segment")), {
    nullable: true,
    default: () => ["segment"] as const
  }),
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  "chunking_strategy": S.optionalWith(
    S.Union(
      /**
       * Automatically set chunking parameters based on the audio. Must be set to `"auto"`.
       */
      S.Literal("auto"),
      VadConfig
    ),
    { nullable: true }
  ),
  /**
   * Optional list of speaker names that correspond to the audio samples provided in `known_speaker_references[]`. Each entry should be a short identifier (for example `customer` or `agent`). Up to 4 speakers are supported.
   */
  "known_speaker_names": S.optionalWith(S.Array(S.String).pipe(S.maxItems(4)), { nullable: true }),
  /**
   * Optional list of audio samples (as [data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs)) that contain known speaker references matching `known_speaker_names[]`. Each sample must be between 2 and 10 seconds, and can use any of the same input audio formats supported by `file`.
   */
  "known_speaker_references": S.optionalWith(S.Array(S.String).pipe(S.maxItems(4)), { nullable: true })
}) {}

/**
 * The type of the usage object. Always `tokens` for this variant.
 */
export class TranscriptTextUsageTokensType extends S.Literal("tokens") {}

/**
 * Usage statistics for models billed by token usage.
 */
export class TranscriptTextUsageTokens extends S.Class<TranscriptTextUsageTokens>("TranscriptTextUsageTokens")({
  /**
   * The type of the usage object. Always `tokens` for this variant.
   */
  "type": TranscriptTextUsageTokensType,
  /**
   * Number of input tokens billed for this request.
   */
  "input_tokens": S.Int,
  /**
   * Details about the input tokens billed for this request.
   */
  "input_token_details": S.optionalWith(
    S.Struct({
      /**
       * Number of text tokens billed for this request.
       */
      "text_tokens": S.optionalWith(S.Int, { nullable: true }),
      /**
       * Number of audio tokens billed for this request.
       */
      "audio_tokens": S.optionalWith(S.Int, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * Number of output tokens generated.
   */
  "output_tokens": S.Int,
  /**
   * Total number of tokens used (input + output).
   */
  "total_tokens": S.Int
}) {}

/**
 * The type of the usage object. Always `duration` for this variant.
 */
export class TranscriptTextUsageDurationType extends S.Literal("duration") {}

/**
 * Usage statistics for models billed by audio input duration.
 */
export class TranscriptTextUsageDuration extends S.Class<TranscriptTextUsageDuration>("TranscriptTextUsageDuration")({
  /**
   * The type of the usage object. Always `duration` for this variant.
   */
  "type": TranscriptTextUsageDurationType,
  /**
   * Duration of the input audio in seconds.
   */
  "seconds": S.Number
}) {}

/**
 * Represents a transcription response returned by model, based on the provided input.
 */
export class CreateTranscriptionResponseJson
  extends S.Class<CreateTranscriptionResponseJson>("CreateTranscriptionResponseJson")({
    /**
     * The transcribed text.
     */
    "text": S.String,
    /**
     * The log probabilities of the tokens in the transcription. Only returned with the models `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` if `logprobs` is added to the `include` array.
     */
    "logprobs": S.optionalWith(
      S.Array(S.Struct({
        /**
         * The token in the transcription.
         */
        "token": S.optionalWith(S.String, { nullable: true }),
        /**
         * The log probability of the token.
         */
        "logprob": S.optionalWith(S.Number, { nullable: true }),
        /**
         * The bytes of the token.
         */
        "bytes": S.optionalWith(S.Array(S.Number), { nullable: true })
      })),
      { nullable: true }
    ),
    /**
     * Token usage statistics for the request.
     */
    "usage": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * The type of task that was run. Always `transcribe`.
 */
export class CreateTranscriptionResponseDiarizedJsonTask extends S.Literal("transcribe") {}

/**
 * The type of the segment. Always `transcript.text.segment`.
 */
export class TranscriptionDiarizedSegmentType extends S.Literal("transcript.text.segment") {}

/**
 * A segment of diarized transcript text with speaker metadata.
 */
export class TranscriptionDiarizedSegment
  extends S.Class<TranscriptionDiarizedSegment>("TranscriptionDiarizedSegment")({
    /**
     * The type of the segment. Always `transcript.text.segment`.
     */
    "type": TranscriptionDiarizedSegmentType,
    /**
     * Unique identifier for the segment.
     */
    "id": S.String,
    /**
     * Start timestamp of the segment in seconds.
     */
    "start": S.Number,
    /**
     * End timestamp of the segment in seconds.
     */
    "end": S.Number,
    /**
     * Transcript text for this segment.
     */
    "text": S.String,
    /**
     * Speaker label for this segment. When known speakers are provided, the label matches `known_speaker_names[]`. Otherwise speakers are labeled sequentially using capital letters (`A`, `B`, ...).
     */
    "speaker": S.String
  })
{}

/**
 * Represents a diarized transcription response returned by the model, including the combined transcript and speaker-segment annotations.
 */
export class CreateTranscriptionResponseDiarizedJson
  extends S.Class<CreateTranscriptionResponseDiarizedJson>("CreateTranscriptionResponseDiarizedJson")({
    /**
     * The type of task that was run. Always `transcribe`.
     */
    "task": CreateTranscriptionResponseDiarizedJsonTask,
    /**
     * Duration of the input audio in seconds.
     */
    "duration": S.Number,
    /**
     * The concatenated transcript text for the entire audio input.
     */
    "text": S.String,
    /**
     * Segments of the transcript annotated with timestamps and speaker labels.
     */
    "segments": S.Array(TranscriptionDiarizedSegment),
    /**
     * Token or duration usage statistics for the request.
     */
    "usage": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

export class TranscriptionWord extends S.Class<TranscriptionWord>("TranscriptionWord")({
  /**
   * The text content of the word.
   */
  "word": S.String,
  /**
   * Start time of the word in seconds.
   */
  "start": S.Number,
  /**
   * End time of the word in seconds.
   */
  "end": S.Number
}) {}

export class TranscriptionSegment extends S.Class<TranscriptionSegment>("TranscriptionSegment")({
  /**
   * Unique identifier of the segment.
   */
  "id": S.Int,
  /**
   * Seek offset of the segment.
   */
  "seek": S.Int,
  /**
   * Start time of the segment in seconds.
   */
  "start": S.Number,
  /**
   * End time of the segment in seconds.
   */
  "end": S.Number,
  /**
   * Text content of the segment.
   */
  "text": S.String,
  /**
   * Array of token IDs for the text content.
   */
  "tokens": S.Array(S.Int),
  /**
   * Temperature parameter used for generating the segment.
   */
  "temperature": S.Number,
  /**
   * Average logprob of the segment. If the value is lower than -1, consider the logprobs failed.
   */
  "avg_logprob": S.Number,
  /**
   * Compression ratio of the segment. If the value is greater than 2.4, consider the compression failed.
   */
  "compression_ratio": S.Number,
  /**
   * Probability of no speech in the segment. If the value is higher than 1.0 and the `avg_logprob` is below -1, consider this segment silent.
   */
  "no_speech_prob": S.Number
}) {}

/**
 * Represents a verbose json transcription response returned by model, based on the provided input.
 */
export class CreateTranscriptionResponseVerboseJson
  extends S.Class<CreateTranscriptionResponseVerboseJson>("CreateTranscriptionResponseVerboseJson")({
    /**
     * The language of the input audio.
     */
    "language": S.String,
    /**
     * The duration of the input audio.
     */
    "duration": S.Number,
    /**
     * The transcribed text.
     */
    "text": S.String,
    /**
     * Extracted words and their corresponding timestamps.
     */
    "words": S.optionalWith(S.Array(TranscriptionWord), { nullable: true }),
    /**
     * Segments of the transcribed text and their corresponding details.
     */
    "segments": S.optionalWith(S.Array(TranscriptionSegment), { nullable: true }),
    "usage": S.optionalWith(TranscriptTextUsageDuration, { nullable: true })
  })
{}

export class CreateTranscription200 extends S.Union(
  CreateTranscriptionResponseVerboseJson,
  CreateTranscriptionResponseDiarizedJson,
  CreateTranscriptionResponseJson
) {}

export class CreateTranslationRequestModelEnum extends S.Literal("whisper-1") {}

/**
 * The format of the output, in one of these options: `json`, `text`, `srt`, `verbose_json`, or `vtt`.
 */
export class CreateTranslationRequestResponseFormat extends S.Literal("json", "text", "srt", "verbose_json", "vtt") {}

export class CreateTranslationRequest extends S.Class<CreateTranslationRequest>("CreateTranslationRequest")({
  /**
   * The audio file object (not file name) translate, in one of these formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm.
   */
  "file": S.instanceOf(globalThis.Blob),
  /**
   * ID of the model to use. Only `whisper-1` (which is powered by our open source Whisper V2 model) is currently available.
   */
  "model": S.Union(S.String, CreateTranslationRequestModelEnum),
  /**
   * An optional text to guide the model's style or continue a previous audio segment. The [prompt](https://platform.openai.com/docs/guides/speech-to-text#prompting) should be in English.
   */
  "prompt": S.optionalWith(S.String, { nullable: true }),
  /**
   * The format of the output, in one of these options: `json`, `text`, `srt`, `verbose_json`, or `vtt`.
   */
  "response_format": S.optionalWith(CreateTranslationRequestResponseFormat, {
    nullable: true,
    default: () => "json" as const
  }),
  /**
   * The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use [log probability](https://en.wikipedia.org/wiki/Log_probability) to automatically increase the temperature until certain thresholds are hit.
   */
  "temperature": S.optionalWith(S.Number, { nullable: true, default: () => 0 as const })
}) {}

export class CreateTranslationResponseJson
  extends S.Class<CreateTranslationResponseJson>("CreateTranslationResponseJson")({
    "text": S.String
  })
{}

export class CreateTranslationResponseVerboseJson
  extends S.Class<CreateTranslationResponseVerboseJson>("CreateTranslationResponseVerboseJson")({
    /**
     * The language of the output translation (always `english`).
     */
    "language": S.String,
    /**
     * The duration of the input audio.
     */
    "duration": S.Number,
    /**
     * The translated text.
     */
    "text": S.String,
    /**
     * Segments of the translated text and their corresponding details.
     */
    "segments": S.optionalWith(S.Array(TranscriptionSegment), { nullable: true })
  })
{}

export class CreateTranslation200
  extends S.Union(CreateTranslationResponseJson, CreateTranslationResponseVerboseJson)
{}

export class ListBatchesParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const })
}) {}

/**
 * The object type, which is always `batch`.
 */
export class BatchObject extends S.Literal("batch") {}

export class BatchError extends S.Class<BatchError>("BatchError")({
  /**
   * An error code identifying the error type.
   */
  "code": S.optionalWith(S.String, { nullable: true }),
  /**
   * A human-readable message providing more details about the error.
   */
  "message": S.optionalWith(S.String, { nullable: true }),
  "param": S.optionalWith(S.String, { nullable: true }),
  "line": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * The current status of the batch.
 */
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

/**
 * The request counts for different statuses within the batch.
 */
export class BatchRequestCounts extends S.Class<BatchRequestCounts>("BatchRequestCounts")({
  /**
   * Total number of requests in the batch.
   */
  "total": S.Int,
  /**
   * Number of requests that have been completed successfully.
   */
  "completed": S.Int,
  /**
   * Number of requests that have failed.
   */
  "failed": S.Int
}) {}

export class Batch extends S.Class<Batch>("Batch")({
  "id": S.String,
  /**
   * The object type, which is always `batch`.
   */
  "object": BatchObject,
  /**
   * The OpenAI API endpoint used by the batch.
   */
  "endpoint": S.String,
  /**
   * Model ID used to process the batch, like `gpt-5-2025-08-07`. OpenAI
   * offers a wide range of models with different capabilities, performance
   * characteristics, and price points. Refer to the [model
   * guide](https://platform.openai.com/docs/models) to browse and compare available models.
   */
  "model": S.optionalWith(S.String, { nullable: true }),
  "errors": S.optionalWith(
    S.Struct({
      /**
       * The object type, which is always `list`.
       */
      "object": S.optionalWith(S.String, { nullable: true }),
      "data": S.optionalWith(S.Array(BatchError), { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The ID of the input file for the batch.
   */
  "input_file_id": S.String,
  /**
   * The time frame within which the batch should be processed.
   */
  "completion_window": S.String,
  /**
   * The current status of the batch.
   */
  "status": BatchStatus,
  /**
   * The ID of the file containing the outputs of successfully executed requests.
   */
  "output_file_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The ID of the file containing the outputs of requests with errors.
   */
  "error_file_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) for when the batch was created.
   */
  "created_at": S.Int,
  /**
   * The Unix timestamp (in seconds) for when the batch started processing.
   */
  "in_progress_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) for when the batch will expire.
   */
  "expires_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) for when the batch started finalizing.
   */
  "finalizing_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) for when the batch was completed.
   */
  "completed_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) for when the batch failed.
   */
  "failed_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) for when the batch expired.
   */
  "expired_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) for when the batch started cancelling.
   */
  "cancelling_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) for when the batch was cancelled.
   */
  "cancelled_at": S.optionalWith(S.Int, { nullable: true }),
  "request_counts": S.optionalWith(BatchRequestCounts, { nullable: true }),
  /**
   * Represents token usage details including input tokens, output tokens, a
   * breakdown of output tokens, and the total tokens used. Only populated on
   * batches created after September 7, 2025.
   */
  "usage": S.optionalWith(
    S.Struct({
      /**
       * The number of input tokens.
       */
      "input_tokens": S.Int,
      /**
       * A detailed breakdown of the input tokens.
       */
      "input_tokens_details": S.Struct({
        /**
         * The number of tokens that were retrieved from the cache. [More on
         * prompt caching](https://platform.openai.com/docs/guides/prompt-caching).
         */
        "cached_tokens": S.Int
      }),
      /**
       * The number of output tokens.
       */
      "output_tokens": S.Int,
      /**
       * A detailed breakdown of the output tokens.
       */
      "output_tokens_details": S.Struct({
        /**
         * The number of reasoning tokens.
         */
        "reasoning_tokens": S.Int
      }),
      /**
       * The total number of tokens used.
       */
      "total_tokens": S.Int
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class ListBatchesResponseObject extends S.Literal("list") {}

export class ListBatchesResponse extends S.Class<ListBatchesResponse>("ListBatchesResponse")({
  "data": S.Array(Batch),
  "first_id": S.optionalWith(S.String, { nullable: true }),
  "last_id": S.optionalWith(S.String, { nullable: true }),
  "has_more": S.Boolean,
  "object": ListBatchesResponseObject
}) {}

/**
 * The endpoint to be used for all requests in the batch. Currently `/v1/responses`, `/v1/chat/completions`, `/v1/embeddings`, `/v1/completions`, and `/v1/moderations` are supported. Note that `/v1/embeddings` batches are also restricted to a maximum of 50,000 embedding inputs across all requests in the batch.
 */
export class CreateBatchRequestEndpoint
  extends S.Literal("/v1/responses", "/v1/chat/completions", "/v1/embeddings", "/v1/completions", "/v1/moderations")
{}

/**
 * The time frame within which the batch should be processed. Currently only `24h` is supported.
 */
export class CreateBatchRequestCompletionWindow extends S.Literal("24h") {}

/**
 * Anchor timestamp after which the expiration policy applies. Supported anchors: `created_at`. Note that the anchor is the file creation time, not the time the batch is created.
 */
export class BatchFileExpirationAfterAnchor extends S.Literal("created_at") {}

/**
 * The expiration policy for the output and/or error file that are generated for a batch.
 */
export class BatchFileExpirationAfter extends S.Class<BatchFileExpirationAfter>("BatchFileExpirationAfter")({
  /**
   * Anchor timestamp after which the expiration policy applies. Supported anchors: `created_at`. Note that the anchor is the file creation time, not the time the batch is created.
   */
  "anchor": BatchFileExpirationAfterAnchor,
  /**
   * The number of seconds after the anchor time that the file will expire. Must be between 3600 (1 hour) and 2592000 (30 days).
   */
  "seconds": S.Int.pipe(S.greaterThanOrEqualTo(3600), S.lessThanOrEqualTo(2592000))
}) {}

export class CreateBatchRequest extends S.Class<CreateBatchRequest>("CreateBatchRequest")({
  /**
   * The ID of an uploaded file that contains requests for the new batch.
   *
   * See [upload file](https://platform.openai.com/docs/api-reference/files/create) for how to upload a file.
   *
   * Your input file must be formatted as a [JSONL file](https://platform.openai.com/docs/api-reference/batch/request-input), and must be uploaded with the purpose `batch`. The file can contain up to 50,000 requests, and can be up to 200 MB in size.
   */
  "input_file_id": S.String,
  /**
   * The endpoint to be used for all requests in the batch. Currently `/v1/responses`, `/v1/chat/completions`, `/v1/embeddings`, `/v1/completions`, and `/v1/moderations` are supported. Note that `/v1/embeddings` batches are also restricted to a maximum of 50,000 embedding inputs across all requests in the batch.
   */
  "endpoint": CreateBatchRequestEndpoint,
  /**
   * The time frame within which the batch should be processed. Currently only `24h` is supported.
   */
  "completion_window": CreateBatchRequestCompletionWindow,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "output_expires_after": S.optionalWith(BatchFileExpirationAfter, { nullable: true })
}) {}

export class ListChatCompletionsParamsOrder extends S.Literal("asc", "desc") {}

export class ListChatCompletionsParams extends S.Struct({
  "model": S.optionalWith(S.String, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListChatCompletionsParamsOrder, { nullable: true, default: () => "asc" as const })
}) {}

/**
 * The type of this object. It is always set to "list".
 */
export class ChatCompletionListObject extends S.Literal("list") {}

/**
 * The type of the tool. Currently, only `function` is supported.
 */
export class ChatCompletionMessageToolCallType extends S.Literal("function") {}

/**
 * A call to a function tool created by the model.
 */
export class ChatCompletionMessageToolCall
  extends S.Class<ChatCompletionMessageToolCall>("ChatCompletionMessageToolCall")({
    /**
     * The ID of the tool call.
     */
    "id": S.String,
    /**
     * The type of the tool. Currently, only `function` is supported.
     */
    "type": ChatCompletionMessageToolCallType,
    /**
     * The function that the model called.
     */
    "function": S.Struct({
      /**
       * The name of the function to call.
       */
      "name": S.String,
      /**
       * The arguments to call the function with, as generated by the model in JSON format. Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your function schema. Validate the arguments in your code before calling your function.
       */
      "arguments": S.String
    })
  })
{}

/**
 * The type of the tool. Always `custom`.
 */
export class ChatCompletionMessageCustomToolCallType extends S.Literal("custom") {}

/**
 * A call to a custom tool created by the model.
 */
export class ChatCompletionMessageCustomToolCall
  extends S.Class<ChatCompletionMessageCustomToolCall>("ChatCompletionMessageCustomToolCall")({
    /**
     * The ID of the tool call.
     */
    "id": S.String,
    /**
     * The type of the tool. Always `custom`.
     */
    "type": ChatCompletionMessageCustomToolCallType,
    /**
     * The custom tool that the model called.
     */
    "custom": S.Struct({
      /**
       * The name of the custom tool to call.
       */
      "name": S.String,
      /**
       * The input for the custom tool call generated by the model.
       */
      "input": S.String
    })
  })
{}

/**
 * The tool calls generated by the model, such as function calls.
 */
export class ChatCompletionMessageToolCalls
  extends S.Array(S.Union(ChatCompletionMessageToolCall, ChatCompletionMessageCustomToolCall))
{}

/**
 * The role of the author of this message.
 */
export class ChatCompletionResponseMessageRole extends S.Literal("assistant") {}

/**
 * A chat completion message generated by the model.
 */
export class ChatCompletionResponseMessage
  extends S.Class<ChatCompletionResponseMessage>("ChatCompletionResponseMessage")({
    "content": S.NullOr(S.String),
    "refusal": S.NullOr(S.String),
    "tool_calls": S.optionalWith(ChatCompletionMessageToolCalls, { nullable: true }),
    /**
     * Annotations for the message, when applicable, as when using the
     * [web search tool](https://platform.openai.com/docs/guides/tools-web-search?api-mode=chat).
     */
    "annotations": S.optionalWith(
      S.Array(S.Struct({
        /**
         * The type of the URL citation. Always `url_citation`.
         */
        "type": S.Literal("url_citation"),
        /**
         * A URL citation when using web search.
         */
        "url_citation": S.Struct({
          /**
           * The index of the last character of the URL citation in the message.
           */
          "end_index": S.Int,
          /**
           * The index of the first character of the URL citation in the message.
           */
          "start_index": S.Int,
          /**
           * The URL of the web resource.
           */
          "url": S.String,
          /**
           * The title of the web resource.
           */
          "title": S.String
        })
      })),
      { nullable: true }
    ),
    /**
     * The role of the author of this message.
     */
    "role": ChatCompletionResponseMessageRole,
    /**
     * Deprecated and replaced by `tool_calls`. The name and arguments of a function that should be called, as generated by the model.
     */
    "function_call": S.optionalWith(
      S.Struct({
        /**
         * The arguments to call the function with, as generated by the model in JSON format. Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your function schema. Validate the arguments in your code before calling your function.
         */
        "arguments": S.String,
        /**
         * The name of the function to call.
         */
        "name": S.String
      }),
      { nullable: true }
    ),
    "audio": S.optionalWith(
      S.Struct({
        /**
         * Unique identifier for this audio response.
         */
        "id": S.String,
        /**
         * The Unix timestamp (in seconds) for when this audio response will
         * no longer be accessible on the server for use in multi-turn
         * conversations.
         */
        "expires_at": S.Int,
        /**
         * Base64 encoded audio bytes generated by the model, in the format
         * specified in the request.
         */
        "data": S.String,
        /**
         * Transcript of the audio generated by the model.
         */
        "transcript": S.String
      }),
      { nullable: true }
    )
  })
{}

export class ChatCompletionTokenLogprob extends S.Class<ChatCompletionTokenLogprob>("ChatCompletionTokenLogprob")({
  /**
   * The token.
   */
  "token": S.String,
  /**
   * The log probability of this token, if it is within the top 20 most likely tokens. Otherwise, the value `-9999.0` is used to signify that the token is very unlikely.
   */
  "logprob": S.Number,
  "bytes": S.NullOr(S.Array(S.Int)),
  /**
   * List of the most likely tokens and their log probability, at this token position. In rare cases, there may be fewer than the number of requested `top_logprobs` returned.
   */
  "top_logprobs": S.Array(S.Struct({
    /**
     * The token.
     */
    "token": S.String,
    /**
     * The log probability of this token, if it is within the top 20 most likely tokens. Otherwise, the value `-9999.0` is used to signify that the token is very unlikely.
     */
    "logprob": S.Number,
    "bytes": S.NullOr(S.Array(S.Int))
  }))
}) {}

/**
 * Specifies the processing type used for serving the request.
 *   - If set to 'auto', then the request will be processed with the service tier configured in the Project settings. Unless otherwise configured, the Project will use 'default'.
 *   - If set to 'default', then the request will be processed with the standard pricing and performance for the selected model.
 *   - If set to '[flex](https://platform.openai.com/docs/guides/flex-processing)' or '[priority](https://openai.com/api-priority-processing/)', then the request will be processed with the corresponding service tier.
 *   - When not set, the default behavior is 'auto'.
 *
 *   When the `service_tier` parameter is set, the response body will include the `service_tier` value based on the processing mode actually used to serve the request. This response value may be different from the value set in the parameter.
 */
export class ServiceTierEnum extends S.Literal("auto", "default", "flex", "scale", "priority") {}

export class ServiceTier extends S.Union(
  /**
   * Specifies the processing type used for serving the request.
   *   - If set to 'auto', then the request will be processed with the service tier configured in the Project settings. Unless otherwise configured, the Project will use 'default'.
   *   - If set to 'default', then the request will be processed with the standard pricing and performance for the selected model.
   *   - If set to '[flex](https://platform.openai.com/docs/guides/flex-processing)' or '[priority](https://openai.com/api-priority-processing/)', then the request will be processed with the corresponding service tier.
   *   - When not set, the default behavior is 'auto'.
   *
   *   When the `service_tier` parameter is set, the response body will include the `service_tier` value based on the processing mode actually used to serve the request. This response value may be different from the value set in the parameter.
   */
  ServiceTierEnum,
  S.Null
) {}

/**
 * The object type, which is always `chat.completion`.
 */
export class CreateChatCompletionResponseObject extends S.Literal("chat.completion") {}

/**
 * Usage statistics for the completion request.
 */
export class CompletionUsage extends S.Class<CompletionUsage>("CompletionUsage")({
  /**
   * Number of tokens in the generated completion.
   */
  "completion_tokens": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Number of tokens in the prompt.
   */
  "prompt_tokens": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Total number of tokens used in the request (prompt + completion).
   */
  "total_tokens": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Breakdown of tokens used in a completion.
   */
  "completion_tokens_details": S.optionalWith(
    S.Struct({
      /**
       * When using Predicted Outputs, the number of tokens in the
       * prediction that appeared in the completion.
       */
      "accepted_prediction_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const }),
      /**
       * Audio input tokens generated by the model.
       */
      "audio_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const }),
      /**
       * Tokens generated by the model for reasoning.
       */
      "reasoning_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const }),
      /**
       * When using Predicted Outputs, the number of tokens in the
       * prediction that did not appear in the completion. However, like
       * reasoning tokens, these tokens are still counted in the total
       * completion tokens for purposes of billing, output, and context window
       * limits.
       */
      "rejected_prediction_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const })
    }),
    { nullable: true }
  ),
  /**
   * Breakdown of tokens used in the prompt.
   */
  "prompt_tokens_details": S.optionalWith(
    S.Struct({
      /**
       * Audio input tokens present in the prompt.
       */
      "audio_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const }),
      /**
       * Cached tokens present in the prompt.
       */
      "cached_tokens": S.optionalWith(S.Int, { nullable: true, default: () => 0 as const })
    }),
    { nullable: true }
  )
}) {}

/**
 * Represents a chat completion response returned by model, based on the provided input.
 */
export class CreateChatCompletionResponse
  extends S.Class<CreateChatCompletionResponse>("CreateChatCompletionResponse")({
    /**
     * A unique identifier for the chat completion.
     */
    "id": S.String,
    /**
     * A list of chat completion choices. Can be more than one if `n` is greater than 1.
     */
    "choices": S.Array(S.Struct({
      /**
       * The reason the model stopped generating tokens. This will be `stop` if the model hit a natural stop point or a provided stop sequence,
       * `length` if the maximum number of tokens specified in the request was reached,
       * `content_filter` if content was omitted due to a flag from our content filters,
       * `tool_calls` if the model called a tool, or `function_call` (deprecated) if the model called a function.
       */
      "finish_reason": S.Literal("stop", "length", "tool_calls", "content_filter", "function_call"),
      /**
       * The index of the choice in the list of choices.
       */
      "index": S.Int,
      "message": ChatCompletionResponseMessage,
      "logprobs": S.NullOr(S.Struct({
        "content": S.NullOr(S.Array(ChatCompletionTokenLogprob)),
        "refusal": S.NullOr(S.Array(ChatCompletionTokenLogprob))
      }))
    })),
    /**
     * The Unix timestamp (in seconds) of when the chat completion was created.
     */
    "created": S.Int,
    /**
     * The model used for the chat completion.
     */
    "model": S.String,
    "service_tier": S.optionalWith(S.Literal("auto", "default", "flex", "scale", "priority"), { nullable: true }),
    /**
     * This fingerprint represents the backend configuration that the model runs with.
     *
     * Can be used in conjunction with the `seed` request parameter to understand when backend changes have been made that might impact determinism.
     */
    "system_fingerprint": S.optionalWith(S.String, { nullable: true }),
    /**
     * The object type, which is always `chat.completion`.
     */
    "object": CreateChatCompletionResponseObject,
    "usage": S.optionalWith(CompletionUsage, { nullable: true })
  })
{}

/**
 * An object representing a list of Chat Completions.
 */
export class ChatCompletionList extends S.Class<ChatCompletionList>("ChatCompletionList")({
  /**
   * The type of this object. It is always set to "list".
   */
  "object": ChatCompletionListObject.pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  /**
   * An array of chat completion objects.
   */
  "data": S.Array(CreateChatCompletionResponse),
  /**
   * The identifier of the first chat completion in the data array.
   */
  "first_id": S.String,
  /**
   * The identifier of the last chat completion in the data array.
   */
  "last_id": S.String,
  /**
   * Indicates whether there are more Chat Completions available.
   */
  "has_more": S.Boolean
}) {}

/**
 * The type of the content part.
 */
export class ChatCompletionRequestMessageContentPartTextType extends S.Literal("text") {}

/**
 * Learn about [text inputs](https://platform.openai.com/docs/guides/text-generation).
 */
export class ChatCompletionRequestMessageContentPartText
  extends S.Class<ChatCompletionRequestMessageContentPartText>("ChatCompletionRequestMessageContentPartText")({
    /**
     * The type of the content part.
     */
    "type": ChatCompletionRequestMessageContentPartTextType,
    /**
     * The text content.
     */
    "text": S.String
  })
{}

/**
 * The role of the messages author, in this case `developer`.
 */
export class ChatCompletionRequestDeveloperMessageRole extends S.Literal("developer") {}

/**
 * Developer-provided instructions that the model should follow, regardless of
 * messages sent by the user. With o1 models and newer, `developer` messages
 * replace the previous `system` messages.
 */
export class ChatCompletionRequestDeveloperMessage
  extends S.Class<ChatCompletionRequestDeveloperMessage>("ChatCompletionRequestDeveloperMessage")({
    /**
     * The contents of the developer message.
     */
    "content": S.Union(
      /**
       * The contents of the developer message.
       */
      S.String,
      /**
       * An array of content parts with a defined type. For developer messages, only type `text` is supported.
       */
      S.NonEmptyArray(ChatCompletionRequestMessageContentPartText).pipe(S.minItems(1))
    ),
    /**
     * The role of the messages author, in this case `developer`.
     */
    "role": ChatCompletionRequestDeveloperMessageRole,
    /**
     * An optional name for the participant. Provides the model information to differentiate between participants of the same role.
     */
    "name": S.optionalWith(S.String, { nullable: true })
  })
{}

export class ChatCompletionRequestSystemMessageContentPart extends ChatCompletionRequestMessageContentPartText {}

/**
 * The role of the messages author, in this case `system`.
 */
export class ChatCompletionRequestSystemMessageRole extends S.Literal("system") {}

/**
 * Developer-provided instructions that the model should follow, regardless of
 * messages sent by the user. With o1 models and newer, use `developer` messages
 * for this purpose instead.
 */
export class ChatCompletionRequestSystemMessage
  extends S.Class<ChatCompletionRequestSystemMessage>("ChatCompletionRequestSystemMessage")({
    /**
     * The contents of the system message.
     */
    "content": S.Union(
      /**
       * The contents of the system message.
       */
      S.String,
      /**
       * An array of content parts with a defined type. For system messages, only type `text` is supported.
       */
      S.NonEmptyArray(ChatCompletionRequestSystemMessageContentPart).pipe(S.minItems(1))
    ),
    /**
     * The role of the messages author, in this case `system`.
     */
    "role": ChatCompletionRequestSystemMessageRole,
    /**
     * An optional name for the participant. Provides the model information to differentiate between participants of the same role.
     */
    "name": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * The type of the content part.
 */
export class ChatCompletionRequestMessageContentPartImageType extends S.Literal("image_url") {}

/**
 * Specifies the detail level of the image. Learn more in the [Vision guide](https://platform.openai.com/docs/guides/vision#low-or-high-fidelity-image-understanding).
 */
export class ChatCompletionRequestMessageContentPartImageImageUrlDetail extends S.Literal("auto", "low", "high") {}

/**
 * Learn about [image inputs](https://platform.openai.com/docs/guides/vision).
 */
export class ChatCompletionRequestMessageContentPartImage
  extends S.Class<ChatCompletionRequestMessageContentPartImage>("ChatCompletionRequestMessageContentPartImage")({
    /**
     * The type of the content part.
     */
    "type": ChatCompletionRequestMessageContentPartImageType,
    "image_url": S.Struct({
      /**
       * Either a URL of the image or the base64 encoded image data.
       */
      "url": S.String,
      /**
       * Specifies the detail level of the image. Learn more in the [Vision guide](https://platform.openai.com/docs/guides/vision#low-or-high-fidelity-image-understanding).
       */
      "detail": S.optionalWith(ChatCompletionRequestMessageContentPartImageImageUrlDetail, {
        nullable: true,
        default: () => "auto" as const
      })
    })
  })
{}

/**
 * The type of the content part. Always `input_audio`.
 */
export class ChatCompletionRequestMessageContentPartAudioType extends S.Literal("input_audio") {}

/**
 * The format of the encoded audio data. Currently supports "wav" and "mp3".
 */
export class ChatCompletionRequestMessageContentPartAudioInputAudioFormat extends S.Literal("wav", "mp3") {}

/**
 * Learn about [audio inputs](https://platform.openai.com/docs/guides/audio).
 */
export class ChatCompletionRequestMessageContentPartAudio
  extends S.Class<ChatCompletionRequestMessageContentPartAudio>("ChatCompletionRequestMessageContentPartAudio")({
    /**
     * The type of the content part. Always `input_audio`.
     */
    "type": ChatCompletionRequestMessageContentPartAudioType,
    "input_audio": S.Struct({
      /**
       * Base64 encoded audio data.
       */
      "data": S.String,
      /**
       * The format of the encoded audio data. Currently supports "wav" and "mp3".
       */
      "format": ChatCompletionRequestMessageContentPartAudioInputAudioFormat
    })
  })
{}

/**
 * The type of the content part. Always `file`.
 */
export class ChatCompletionRequestMessageContentPartFileType extends S.Literal("file") {}

/**
 * Learn about [file inputs](https://platform.openai.com/docs/guides/text) for text generation.
 */
export class ChatCompletionRequestMessageContentPartFile
  extends S.Class<ChatCompletionRequestMessageContentPartFile>("ChatCompletionRequestMessageContentPartFile")({
    /**
     * The type of the content part. Always `file`.
     */
    "type": ChatCompletionRequestMessageContentPartFileType,
    "file": S.Struct({
      /**
       * The name of the file, used when passing the file to the model as a
       * string.
       */
      "filename": S.optionalWith(S.String, { nullable: true }),
      /**
       * The base64 encoded file data, used when passing the file to the model
       * as a string.
       */
      "file_data": S.optionalWith(S.String, { nullable: true }),
      /**
       * The ID of an uploaded file to use as input.
       */
      "file_id": S.optionalWith(S.String, { nullable: true })
    })
  })
{}

export class ChatCompletionRequestUserMessageContentPart extends S.Union(
  ChatCompletionRequestMessageContentPartText,
  ChatCompletionRequestMessageContentPartImage,
  ChatCompletionRequestMessageContentPartAudio,
  ChatCompletionRequestMessageContentPartFile
) {}

/**
 * The role of the messages author, in this case `user`.
 */
export class ChatCompletionRequestUserMessageRole extends S.Literal("user") {}

/**
 * Messages sent by an end user, containing prompts or additional context
 * information.
 */
export class ChatCompletionRequestUserMessage
  extends S.Class<ChatCompletionRequestUserMessage>("ChatCompletionRequestUserMessage")({
    /**
     * The contents of the user message.
     */
    "content": S.Union(
      /**
       * The text contents of the message.
       */
      S.String,
      /**
       * An array of content parts with a defined type. Supported options differ based on the [model](https://platform.openai.com/docs/models) being used to generate the response. Can contain text, image, or audio inputs.
       */
      S.NonEmptyArray(ChatCompletionRequestUserMessageContentPart).pipe(S.minItems(1))
    ),
    /**
     * The role of the messages author, in this case `user`.
     */
    "role": ChatCompletionRequestUserMessageRole,
    /**
     * An optional name for the participant. Provides the model information to differentiate between participants of the same role.
     */
    "name": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * The type of the content part.
 */
export class ChatCompletionRequestMessageContentPartRefusalType extends S.Literal("refusal") {}

export class ChatCompletionRequestMessageContentPartRefusal
  extends S.Class<ChatCompletionRequestMessageContentPartRefusal>("ChatCompletionRequestMessageContentPartRefusal")({
    /**
     * The type of the content part.
     */
    "type": ChatCompletionRequestMessageContentPartRefusalType,
    /**
     * The refusal message generated by the model.
     */
    "refusal": S.String
  })
{}

export class ChatCompletionRequestAssistantMessageContentPart
  extends S.Union(ChatCompletionRequestMessageContentPartText, ChatCompletionRequestMessageContentPartRefusal)
{}

/**
 * The role of the messages author, in this case `assistant`.
 */
export class ChatCompletionRequestAssistantMessageRole extends S.Literal("assistant") {}

/**
 * Messages sent by the model in response to user messages.
 */
export class ChatCompletionRequestAssistantMessage
  extends S.Class<ChatCompletionRequestAssistantMessage>("ChatCompletionRequestAssistantMessage")({
    "content": S.optionalWith(
      S.Union(
        /**
         * The contents of the assistant message.
         */
        S.String,
        /**
         * An array of content parts with a defined type. Can be one or more of type `text`, or exactly one of type `refusal`.
         */
        S.NonEmptyArray(ChatCompletionRequestAssistantMessageContentPart).pipe(S.minItems(1))
      ),
      { nullable: true }
    ),
    "refusal": S.optionalWith(S.String, { nullable: true }),
    /**
     * The role of the messages author, in this case `assistant`.
     */
    "role": ChatCompletionRequestAssistantMessageRole,
    /**
     * An optional name for the participant. Provides the model information to differentiate between participants of the same role.
     */
    "name": S.optionalWith(S.String, { nullable: true }),
    "audio": S.optionalWith(
      S.Struct({
        /**
         * Unique identifier for a previous audio response from the model.
         */
        "id": S.String
      }),
      { nullable: true }
    ),
    "tool_calls": S.optionalWith(ChatCompletionMessageToolCalls, { nullable: true }),
    "function_call": S.optionalWith(
      S.Struct({
        /**
         * The arguments to call the function with, as generated by the model in JSON format. Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your function schema. Validate the arguments in your code before calling your function.
         */
        "arguments": S.String,
        /**
         * The name of the function to call.
         */
        "name": S.String
      }),
      { nullable: true }
    )
  })
{}

/**
 * The role of the messages author, in this case `tool`.
 */
export class ChatCompletionRequestToolMessageRole extends S.Literal("tool") {}

export class ChatCompletionRequestToolMessageContentPart extends ChatCompletionRequestMessageContentPartText {}

export class ChatCompletionRequestToolMessage
  extends S.Class<ChatCompletionRequestToolMessage>("ChatCompletionRequestToolMessage")({
    /**
     * The role of the messages author, in this case `tool`.
     */
    "role": ChatCompletionRequestToolMessageRole,
    /**
     * The contents of the tool message.
     */
    "content": S.Union(
      /**
       * The contents of the tool message.
       */
      S.String,
      /**
       * An array of content parts with a defined type. For tool messages, only type `text` is supported.
       */
      S.NonEmptyArray(ChatCompletionRequestToolMessageContentPart).pipe(S.minItems(1))
    ),
    /**
     * Tool call that this message is responding to.
     */
    "tool_call_id": S.String
  })
{}

/**
 * The role of the messages author, in this case `function`.
 */
export class ChatCompletionRequestFunctionMessageRole extends S.Literal("function") {}

export class ChatCompletionRequestFunctionMessage
  extends S.Class<ChatCompletionRequestFunctionMessage>("ChatCompletionRequestFunctionMessage")({
    /**
     * The role of the messages author, in this case `function`.
     */
    "role": ChatCompletionRequestFunctionMessageRole,
    "content": S.NullOr(S.String),
    /**
     * The name of the function to call.
     */
    "name": S.String
  })
{}

export class ChatCompletionRequestMessage extends S.Union(
  ChatCompletionRequestDeveloperMessage,
  ChatCompletionRequestSystemMessage,
  ChatCompletionRequestUserMessage,
  ChatCompletionRequestAssistantMessage,
  ChatCompletionRequestToolMessage,
  ChatCompletionRequestFunctionMessage
) {}

export class ChatModel extends S.Literal(
  "gpt-5.1",
  "gpt-5.1-2025-11-13",
  "gpt-5.1-codex",
  "gpt-5.1-mini",
  "gpt-5.1-chat-latest",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5-2025-08-07",
  "gpt-5-mini-2025-08-07",
  "gpt-5-nano-2025-08-07",
  "gpt-5-chat-latest",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4.1-2025-04-14",
  "gpt-4.1-mini-2025-04-14",
  "gpt-4.1-nano-2025-04-14",
  "o4-mini",
  "o4-mini-2025-04-16",
  "o3",
  "o3-2025-04-16",
  "o3-mini",
  "o3-mini-2025-01-31",
  "o1",
  "o1-2024-12-17",
  "o1-preview",
  "o1-preview-2024-09-12",
  "o1-mini",
  "o1-mini-2024-09-12",
  "gpt-4o",
  "gpt-4o-2024-11-20",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "gpt-4o-audio-preview",
  "gpt-4o-audio-preview-2024-10-01",
  "gpt-4o-audio-preview-2024-12-17",
  "gpt-4o-audio-preview-2025-06-03",
  "gpt-4o-mini-audio-preview",
  "gpt-4o-mini-audio-preview-2024-12-17",
  "gpt-4o-search-preview",
  "gpt-4o-mini-search-preview",
  "gpt-4o-search-preview-2025-03-11",
  "gpt-4o-mini-search-preview-2025-03-11",
  "chatgpt-4o-latest",
  "codex-mini-latest",
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

export class ModelIdsShared extends S.Union(S.String, ChatModel) {}

export class ResponseModalities extends S.Union(
  /**
   * Output types that you would like the model to generate.
   * Most models are capable of generating text, which is the default:
   *
   * `["text"]`
   *
   * The `gpt-4o-audio-preview` model can also be used to
   * [generate audio](https://platform.openai.com/docs/guides/audio). To request that this model generate
   * both text and audio responses, you can use:
   *
   * `["text", "audio"]`
   */
  S.Array(S.Literal("text", "audio")),
  S.Null
) {}

/**
 * Constrains the verbosity of the model's response. Lower values will result in
 * more concise responses, while higher values will result in more verbose responses.
 * Currently supported values are `low`, `medium`, and `high`.
 */
export class VerbosityEnum extends S.Literal("low", "medium", "high") {}

export class Verbosity extends S.Union(
  /**
   * Constrains the verbosity of the model's response. Lower values will result in
   * more concise responses, while higher values will result in more verbose responses.
   * Currently supported values are `low`, `medium`, and `high`.
   */
  VerbosityEnum,
  S.Null
) {}

/**
 * The type of location approximation. Always `approximate`.
 */
export class CreateChatCompletionRequestWebSearchOptionsUserLocationType extends S.Literal("approximate") {}

/**
 * Approximate location parameters for the search.
 */
export class WebSearchLocation extends S.Class<WebSearchLocation>("WebSearchLocation")({
  /**
   * The two-letter
   * [ISO country code](https://en.wikipedia.org/wiki/ISO_3166-1) of the user,
   * e.g. `US`.
   */
  "country": S.optionalWith(S.String, { nullable: true }),
  /**
   * Free text input for the region of the user, e.g. `California`.
   */
  "region": S.optionalWith(S.String, { nullable: true }),
  /**
   * Free text input for the city of the user, e.g. `San Francisco`.
   */
  "city": S.optionalWith(S.String, { nullable: true }),
  /**
   * The [IANA timezone](https://timeapi.io/documentation/iana-timezones)
   * of the user, e.g. `America/Los_Angeles`.
   */
  "timezone": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * High level guidance for the amount of context window space to use for the
 * search. One of `low`, `medium`, or `high`. `medium` is the default.
 */
export class WebSearchContextSize extends S.Literal("low", "medium", "high") {}

/**
 * Specifies the output audio format. Must be one of `wav`, `mp3`, `flac`,
 * `opus`, or `pcm16`.
 */
export class CreateChatCompletionRequestAudioFormat extends S.Literal("wav", "aac", "mp3", "flac", "opus", "pcm16") {}

/**
 * Not supported with latest reasoning models `o3` and `o4-mini`.
 *
 * Up to 4 sequences where the API will stop generating further tokens. The
 * returned text will not contain the stop sequence.
 */
export class StopConfiguration
  extends S.Union(S.String, S.NonEmptyArray(S.String).pipe(S.minItems(1), S.maxItems(4)))
{}

/**
 * The type of the predicted content you want to provide. This type is
 * currently always `content`.
 */
export class PredictionContentType extends S.Literal("content") {}

/**
 * Static predicted output content, such as the content of a text file that is
 * being regenerated.
 */
export class PredictionContent extends S.Class<PredictionContent>("PredictionContent")({
  /**
   * The type of the predicted content you want to provide. This type is
   * currently always `content`.
   */
  "type": PredictionContentType,
  /**
   * The content that should be matched when generating a model response.
   * If generated tokens would match this content, the entire model response
   * can be returned much more quickly.
   */
  "content": S.Union(
    /**
     * The content used for a Predicted Output. This is often the
     * text of a file you are regenerating with minor changes.
     */
    S.String,
    /**
     * An array of content parts with a defined type. Supported options differ based on the [model](https://platform.openai.com/docs/models) being used to generate the response. Can contain text inputs.
     */
    S.NonEmptyArray(ChatCompletionRequestMessageContentPartText).pipe(S.minItems(1))
  )
}) {}

export class ChatCompletionStreamOptions extends S.Union(
  /**
   * Options for streaming response. Only set this when you set `stream: true`.
   */
  S.Struct({
    /**
     * If set, an additional chunk will be streamed before the `data: [DONE]`
     * message. The `usage` field on this chunk shows the token usage statistics
     * for the entire request, and the `choices` field will always be an empty
     * array.
     *
     * All other chunks will also include a `usage` field, but with a null
     * value. **NOTE:** If the stream is interrupted, you may not receive the
     * final usage chunk which contains the total token usage for the request.
     */
    "include_usage": S.optionalWith(S.Boolean, { nullable: true }),
    /**
     * When true, stream obfuscation will be enabled. Stream obfuscation adds
     * random characters to an `obfuscation` field on streaming delta events to
     * normalize payload sizes as a mitigation to certain side-channel attacks.
     * These obfuscation fields are included by default, but add a small amount
     * of overhead to the data stream. You can set `include_obfuscation` to
     * false to optimize for bandwidth if you trust the network links between
     * your application and the OpenAI API.
     */
    "include_obfuscation": S.optionalWith(S.Boolean, { nullable: true })
  }),
  S.Null
) {}

/**
 * The type of the tool. Currently, only `function` is supported.
 */
export class ChatCompletionToolType extends S.Literal("function") {}

/**
 * A function tool that can be used to generate a response.
 */
export class ChatCompletionTool extends S.Class<ChatCompletionTool>("ChatCompletionTool")({
  /**
   * The type of the tool. Currently, only `function` is supported.
   */
  "type": ChatCompletionToolType,
  "function": FunctionObject
}) {}

/**
 * The type of the custom tool. Always `custom`.
 */
export class CustomToolChatCompletionsType extends S.Literal("custom") {}

/**
 * Grammar format. Always `grammar`.
 */
export class CustomToolChatCompletionsCustomFormatEnumType extends S.Literal("grammar") {}

/**
 * The syntax of the grammar definition. One of `lark` or `regex`.
 */
export class CustomToolChatCompletionsCustomFormatEnumGrammarSyntax extends S.Literal("lark", "regex") {}

/**
 * A custom tool that processes input using a specified format.
 */
export class CustomToolChatCompletions extends S.Class<CustomToolChatCompletions>("CustomToolChatCompletions")({
  /**
   * The type of the custom tool. Always `custom`.
   */
  "type": CustomToolChatCompletionsType,
  /**
   * Properties of the custom tool.
   */
  "custom": S.Struct({
    /**
     * The name of the custom tool, used to identify it in tool calls.
     */
    "name": S.String,
    /**
     * Optional description of the custom tool, used to provide more context.
     */
    "description": S.optionalWith(S.String, { nullable: true }),
    /**
     * The input format for the custom tool. Default is unconstrained text.
     */
    "format": S.optionalWith(
      S.Union(
        /**
         * Unconstrained free-form text.
         */
        S.Struct({
          /**
           * Unconstrained text format. Always `text`.
           */
          "type": CustomToolChatCompletionsCustomFormatEnumType
        }),
        /**
         * A grammar defined by the user.
         */
        S.Struct({
          /**
           * Grammar format. Always `grammar`.
           */
          "type": CustomToolChatCompletionsCustomFormatEnumType,
          /**
           * Your chosen grammar.
           */
          "grammar": S.Struct({
            /**
             * The grammar definition.
             */
            "definition": S.String,
            /**
             * The syntax of the grammar definition. One of `lark` or `regex`.
             */
            "syntax": CustomToolChatCompletionsCustomFormatEnumGrammarSyntax
          })
        })
      ),
      { nullable: true }
    )
  })
}) {}

/**
 * `none` means the model will not call any tool and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools.
 */
export class ChatCompletionToolChoiceOptionEnum extends S.Literal("none", "auto", "required") {}

/**
 * Allowed tool configuration type. Always `allowed_tools`.
 */
export class ChatCompletionAllowedToolsChoiceType extends S.Literal("allowed_tools") {}

/**
 * Constrains the tools available to the model to a pre-defined set.
 *
 * `auto` allows the model to pick from among the allowed tools and generate a
 * message.
 *
 * `required` requires the model to call one or more of the allowed tools.
 */
export class ChatCompletionAllowedToolsMode extends S.Literal("auto", "required") {}

/**
 * Constrains the tools available to the model to a pre-defined set.
 */
export class ChatCompletionAllowedTools extends S.Class<ChatCompletionAllowedTools>("ChatCompletionAllowedTools")({
  /**
   * Constrains the tools available to the model to a pre-defined set.
   *
   * `auto` allows the model to pick from among the allowed tools and generate a
   * message.
   *
   * `required` requires the model to call one or more of the allowed tools.
   */
  "mode": ChatCompletionAllowedToolsMode,
  /**
   * A list of tool definitions that the model should be allowed to call.
   *
   * For the Chat Completions API, the list of tool definitions might look like:
   * ```json
   * [
   *   { "type": "function", "function": { "name": "get_weather" } },
   *   { "type": "function", "function": { "name": "get_time" } }
   * ]
   * ```
   */
  "tools": S.Array(S.Record({ key: S.String, value: S.Unknown }))
}) {}

/**
 * Constrains the tools available to the model to a pre-defined set.
 */
export class ChatCompletionAllowedToolsChoice
  extends S.Class<ChatCompletionAllowedToolsChoice>("ChatCompletionAllowedToolsChoice")({
    /**
     * Allowed tool configuration type. Always `allowed_tools`.
     */
    "type": ChatCompletionAllowedToolsChoiceType,
    "allowed_tools": ChatCompletionAllowedTools
  })
{}

/**
 * For function calling, the type is always `function`.
 */
export class ChatCompletionNamedToolChoiceType extends S.Literal("function") {}

/**
 * Specifies a tool the model should use. Use to force the model to call a specific function.
 */
export class ChatCompletionNamedToolChoice
  extends S.Class<ChatCompletionNamedToolChoice>("ChatCompletionNamedToolChoice")({
    /**
     * For function calling, the type is always `function`.
     */
    "type": ChatCompletionNamedToolChoiceType,
    "function": S.Struct({
      /**
       * The name of the function to call.
       */
      "name": S.String
    })
  })
{}

/**
 * For custom tool calling, the type is always `custom`.
 */
export class ChatCompletionNamedToolChoiceCustomType extends S.Literal("custom") {}

/**
 * Specifies a tool the model should use. Use to force the model to call a specific custom tool.
 */
export class ChatCompletionNamedToolChoiceCustom
  extends S.Class<ChatCompletionNamedToolChoiceCustom>("ChatCompletionNamedToolChoiceCustom")({
    /**
     * For custom tool calling, the type is always `custom`.
     */
    "type": ChatCompletionNamedToolChoiceCustomType,
    "custom": S.Struct({
      /**
       * The name of the custom tool to call.
       */
      "name": S.String
    })
  })
{}

/**
 * Controls which (if any) tool is called by the model.
 * `none` means the model will not call any tool and instead generates a message.
 * `auto` means the model can pick between generating a message or calling one or more tools.
 * `required` means the model must call one or more tools.
 * Specifying a particular tool via `{"type": "function", "function": {"name": "my_function"}}` forces the model to call that tool.
 *
 * `none` is the default when no tools are present. `auto` is the default if tools are present.
 */
export class ChatCompletionToolChoiceOption extends S.Union(
  /**
   * `none` means the model will not call any tool and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools.
   */
  ChatCompletionToolChoiceOptionEnum,
  ChatCompletionAllowedToolsChoice,
  ChatCompletionNamedToolChoice,
  ChatCompletionNamedToolChoiceCustom
) {}

/**
 * Whether to enable [parallel function calling](https://platform.openai.com/docs/guides/function-calling#configuring-parallel-function-calling) during tool use.
 */
export class ParallelToolCalls extends S.Boolean {}

/**
 * `none` means the model will not call a function and instead generates a message. `auto` means the model can pick between generating a message or calling a function.
 */
export class CreateChatCompletionRequestFunctionCallEnum extends S.Literal("none", "auto") {}

/**
 * Specifying a particular function via `{"name": "my_function"}` forces the model to call that function.
 */
export class ChatCompletionFunctionCallOption
  extends S.Class<ChatCompletionFunctionCallOption>("ChatCompletionFunctionCallOption")({
    /**
     * The name of the function to call.
     */
    "name": S.String
  })
{}

export class ChatCompletionFunctions extends S.Class<ChatCompletionFunctions>("ChatCompletionFunctions")({
  /**
   * A description of what the function does, used by the model to choose when and how to call the function.
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.
   */
  "name": S.String,
  "parameters": S.optionalWith(FunctionParameters, { nullable: true })
}) {}

/**
 * The retention policy for the prompt cache. Set to `24h` to enable extended prompt caching, which keeps cached prefixes active for longer, up to a maximum of 24 hours. [Learn more](https://platform.openai.com/docs/guides/prompt-caching#prompt-cache-retention).
 */
export class CreateChatCompletionRequestPromptCacheRetentionEnum extends S.Literal("in-memory", "24h") {}

export class CreateChatCompletionRequest extends S.Class<CreateChatCompletionRequest>("CreateChatCompletionRequest")({
  /**
   * A list of messages comprising the conversation so far. Depending on the
   * [model](https://platform.openai.com/docs/models) you use, different message types (modalities) are
   * supported, like [text](https://platform.openai.com/docs/guides/text-generation),
   * [images](https://platform.openai.com/docs/guides/vision), and [audio](https://platform.openai.com/docs/guides/audio).
   */
  "messages": S.NonEmptyArray(ChatCompletionRequestMessage).pipe(S.minItems(1)),
  /**
   * Model ID used to generate the response, like `gpt-4o` or `o3`. OpenAI
   * offers a wide range of models with different capabilities, performance
   * characteristics, and price points. Refer to the [model guide](https://platform.openai.com/docs/models)
   * to browse and compare available models.
   */
  "model": ModelIdsShared,
  "modalities": S.optionalWith(S.Array(S.Literal("text", "audio")), { nullable: true }),
  "verbosity": S.optionalWith(S.Literal("low", "medium", "high"), { nullable: true }),
  "reasoning_effort": S.optionalWith(S.Literal("none", "minimal", "low", "medium", "high"), { nullable: true }),
  /**
   * An upper bound for the number of tokens that can be generated for a completion, including visible output tokens and [reasoning tokens](https://platform.openai.com/docs/guides/reasoning).
   */
  "max_completion_tokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on
   * their existing frequency in the text so far, decreasing the model's
   * likelihood to repeat the same line verbatim.
   */
  "frequency_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on
   * whether they appear in the text so far, increasing the model's likelihood
   * to talk about new topics.
   */
  "presence_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  /**
   * This tool searches the web for relevant results to use in a response.
   * Learn more about the [web search tool](https://platform.openai.com/docs/guides/tools-web-search?api-mode=chat).
   */
  "web_search_options": S.optionalWith(
    S.Struct({
      /**
       * Approximate location parameters for the search.
       */
      "user_location": S.optionalWith(
        S.Struct({
          /**
           * The type of location approximation. Always `approximate`.
           */
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
  /**
   * An object specifying the format that the model must output.
   *
   * Setting to `{ "type": "json_schema", "json_schema": {...} }` enables
   * Structured Outputs which ensures the model will match your supplied JSON
   * schema. Learn more in the [Structured Outputs
   * guide](https://platform.openai.com/docs/guides/structured-outputs).
   *
   * Setting to `{ "type": "json_object" }` enables the older JSON mode, which
   * ensures the message the model generates is valid JSON. Using `json_schema`
   * is preferred for models that support it.
   */
  "response_format": S.optionalWith(S.Union(ResponseFormatText, ResponseFormatJsonSchema, ResponseFormatJsonObject), {
    nullable: true
  }),
  /**
   * Parameters for audio output. Required when audio output is requested with
   * `modalities: ["audio"]`. [Learn more](https://platform.openai.com/docs/guides/audio).
   */
  "audio": S.optionalWith(
    S.Struct({
      /**
       * The voice the model uses to respond. Supported voices are
       * `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, and `shimmer`.
       */
      "voice": VoiceIdsShared,
      /**
       * Specifies the output audio format. Must be one of `wav`, `mp3`, `flac`,
       * `opus`, or `pcm16`.
       */
      "format": CreateChatCompletionRequestAudioFormat
    }),
    { nullable: true }
  ),
  /**
   * Whether or not to store the output of this chat completion request for
   * use in our [model distillation](https://platform.openai.com/docs/guides/distillation) or
   * [evals](https://platform.openai.com/docs/guides/evals) products.
   *
   * Supports text and image inputs. Note: image inputs over 8MB will be dropped.
   */
  "store": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * If set to true, the model response data will be streamed to the client
   * as it is generated using [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
   * See the [Streaming section below](https://platform.openai.com/docs/api-reference/chat/streaming)
   * for more information, along with the [streaming responses](https://platform.openai.com/docs/guides/streaming-responses)
   * guide for more information on how to handle the streaming events.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stop": S.optionalWith(StopConfiguration, { nullable: true }),
  /**
   * Modify the likelihood of specified tokens appearing in the completion.
   *
   * Accepts a JSON object that maps tokens (specified by their token ID in the
   * tokenizer) to an associated bias value from -100 to 100. Mathematically,
   * the bias is added to the logits generated by the model prior to sampling.
   * The exact effect will vary per model, but values between -1 and 1 should
   * decrease or increase likelihood of selection; values like -100 or 100
   * should result in a ban or exclusive selection of the relevant token.
   */
  "logit_bias": S.optionalWith(S.NullOr(S.Record({ key: S.String, value: S.Unknown })), { default: () => null }),
  /**
   * Whether to return log probabilities of the output tokens or not. If true,
   * returns the log probabilities of each output token returned in the
   * `content` of `message`.
   */
  "logprobs": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * The maximum number of [tokens](/tokenizer) that can be generated in the
   * chat completion. This value can be used to control
   * [costs](https://openai.com/api/pricing/) for text generated via API.
   *
   * This value is now deprecated in favor of `max_completion_tokens`, and is
   * not compatible with [o-series models](https://platform.openai.com/docs/guides/reasoning).
   */
  "max_tokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * How many chat completion choices to generate for each input message. Note that you will be charged based on the number of generated tokens across all of the choices. Keep `n` as `1` to minimize costs.
   */
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(128)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * Configuration for a [Predicted Output](https://platform.openai.com/docs/guides/predicted-outputs),
   * which can greatly improve response times when large parts of the model
   * response are known ahead of time. This is most common when you are
   * regenerating a file with only minor changes to most of the content.
   */
  "prediction": S.optionalWith(PredictionContent, { nullable: true }),
  /**
   * This feature is in Beta.
   * If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same `seed` and parameters should return the same result.
   * Determinism is not guaranteed, and you should refer to the `system_fingerprint` response parameter to monitor changes in the backend.
   */
  "seed": S.optionalWith(
    S.Int.pipe(S.greaterThanOrEqualTo(-9223372036854776000), S.lessThanOrEqualTo(9223372036854776000)),
    { nullable: true }
  ),
  "stream_options": S.optionalWith(
    S.Struct({
      /**
       * If set, an additional chunk will be streamed before the `data: [DONE]`
       * message. The `usage` field on this chunk shows the token usage statistics
       * for the entire request, and the `choices` field will always be an empty
       * array.
       *
       * All other chunks will also include a `usage` field, but with a null
       * value. **NOTE:** If the stream is interrupted, you may not receive the
       * final usage chunk which contains the total token usage for the request.
       */
      "include_usage": S.optionalWith(S.Boolean, { nullable: true }),
      /**
       * When true, stream obfuscation will be enabled. Stream obfuscation adds
       * random characters to an `obfuscation` field on streaming delta events to
       * normalize payload sizes as a mitigation to certain side-channel attacks.
       * These obfuscation fields are included by default, but add a small amount
       * of overhead to the data stream. You can set `include_obfuscation` to
       * false to optimize for bandwidth if you trust the network links between
       * your application and the OpenAI API.
       */
      "include_obfuscation": S.optionalWith(S.Boolean, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * A list of tools the model may call. You can provide either
   * [custom tools](https://platform.openai.com/docs/guides/function-calling#custom-tools) or
   * [function tools](https://platform.openai.com/docs/guides/function-calling).
   */
  "tools": S.optionalWith(S.Array(S.Union(ChatCompletionTool, CustomToolChatCompletions)), { nullable: true }),
  "tool_choice": S.optionalWith(ChatCompletionToolChoiceOption, { nullable: true }),
  "parallel_tool_calls": S.optionalWith(ParallelToolCalls, { nullable: true, default: () => true as const }),
  /**
   * Deprecated in favor of `tool_choice`.
   *
   * Controls which (if any) function is called by the model.
   *
   * `none` means the model will not call a function and instead generates a
   * message.
   *
   * `auto` means the model can pick between generating a message or calling a
   * function.
   *
   * Specifying a particular function via `{"name": "my_function"}` forces the
   * model to call that function.
   *
   * `none` is the default when no functions are present. `auto` is the default
   * if functions are present.
   */
  "function_call": S.optionalWith(
    S.Union(
      /**
       * `none` means the model will not call a function and instead generates a message. `auto` means the model can pick between generating a message or calling a function.
       */
      CreateChatCompletionRequestFunctionCallEnum,
      ChatCompletionFunctionCallOption
    ),
    { nullable: true }
  ),
  /**
   * Deprecated in favor of `tools`.
   *
   * A list of functions the model may generate JSON inputs for.
   */
  "functions": S.optionalWith(S.NonEmptyArray(ChatCompletionFunctions).pipe(S.minItems(1), S.maxItems(128)), {
    nullable: true
  }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  /**
   * This field is being replaced by `safety_identifier` and `prompt_cache_key`. Use `prompt_cache_key` instead to maintain caching optimizations.
   * A stable identifier for your end-users.
   * Used to boost cache hit rates by better bucketing similar requests and  to help OpenAI detect and prevent abuse. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#safety-identifiers).
   */
  "user": S.optionalWith(S.String, { nullable: true }),
  /**
   * A stable identifier used to help detect users of your application that may be violating OpenAI's usage policies.
   * The IDs should be a string that uniquely identifies each user. We recommend hashing their username or email address, in order to avoid sending us any identifying information. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#safety-identifiers).
   */
  "safety_identifier": S.optionalWith(S.String, { nullable: true }),
  /**
   * Used by OpenAI to cache responses for similar requests to optimize your cache hit rates. Replaces the `user` field. [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
   */
  "prompt_cache_key": S.optionalWith(S.String, { nullable: true }),
  "service_tier": S.optionalWith(S.Literal("auto", "default", "flex", "scale", "priority"), { nullable: true }),
  "prompt_cache_retention": S.optionalWith(CreateChatCompletionRequestPromptCacheRetentionEnum, { nullable: true })
}) {}

export class UpdateChatCompletionRequest extends S.Class<UpdateChatCompletionRequest>("UpdateChatCompletionRequest")({
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown }))
}) {}

/**
 * The type of object being deleted.
 */
export class ChatCompletionDeletedObject extends S.Literal("chat.completion.deleted") {}

export class ChatCompletionDeleted extends S.Class<ChatCompletionDeleted>("ChatCompletionDeleted")({
  /**
   * The type of object being deleted.
   */
  "object": ChatCompletionDeletedObject,
  /**
   * The ID of the chat completion that was deleted.
   */
  "id": S.String,
  /**
   * Whether the chat completion was deleted.
   */
  "deleted": S.Boolean
}) {}

export class GetChatCompletionMessagesParamsOrder extends S.Literal("asc", "desc") {}

export class GetChatCompletionMessagesParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(GetChatCompletionMessagesParamsOrder, { nullable: true, default: () => "asc" as const })
}) {}

/**
 * The type of this object. It is always set to "list".
 */
export class ChatCompletionMessageListObject extends S.Literal("list") {}

/**
 * An object representing a list of chat completion messages.
 */
export class ChatCompletionMessageList extends S.Class<ChatCompletionMessageList>("ChatCompletionMessageList")({
  /**
   * The type of this object. It is always set to "list".
   */
  "object": ChatCompletionMessageListObject.pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  /**
   * An array of chat completion message objects.
   */
  "data": S.Array(S.Struct({
    /**
     * The identifier of the chat message.
     */
    "id": S.String,
    "content_parts": S.optionalWith(
      S.Array(S.Union(ChatCompletionRequestMessageContentPartText, ChatCompletionRequestMessageContentPartImage)),
      { nullable: true }
    ),
    "content": S.NullOr(S.String),
    "refusal": S.NullOr(S.String),
    "tool_calls": S.optionalWith(ChatCompletionMessageToolCalls, { nullable: true }),
    /**
     * Annotations for the message, when applicable, as when using the
     * [web search tool](https://platform.openai.com/docs/guides/tools-web-search?api-mode=chat).
     */
    "annotations": S.optionalWith(
      S.Array(S.Struct({
        /**
         * The type of the URL citation. Always `url_citation`.
         */
        "type": S.Literal("url_citation"),
        /**
         * A URL citation when using web search.
         */
        "url_citation": S.Struct({
          /**
           * The index of the last character of the URL citation in the message.
           */
          "end_index": S.Int,
          /**
           * The index of the first character of the URL citation in the message.
           */
          "start_index": S.Int,
          /**
           * The URL of the web resource.
           */
          "url": S.String,
          /**
           * The title of the web resource.
           */
          "title": S.String
        })
      })),
      { nullable: true }
    ),
    /**
     * The role of the author of this message.
     */
    "role": S.Literal("assistant"),
    /**
     * Deprecated and replaced by `tool_calls`. The name and arguments of a function that should be called, as generated by the model.
     */
    "function_call": S.optionalWith(
      S.Struct({
        /**
         * The arguments to call the function with, as generated by the model in JSON format. Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your function schema. Validate the arguments in your code before calling your function.
         */
        "arguments": S.String,
        /**
         * The name of the function to call.
         */
        "name": S.String
      }),
      { nullable: true }
    ),
    "audio": S.optionalWith(
      S.Struct({
        /**
         * Unique identifier for this audio response.
         */
        "id": S.String,
        /**
         * The Unix timestamp (in seconds) for when this audio response will
         * no longer be accessible on the server for use in multi-turn
         * conversations.
         */
        "expires_at": S.Int,
        /**
         * Base64 encoded audio bytes generated by the model, in the format
         * specified in the request.
         */
        "data": S.String,
        /**
         * Transcript of the audio generated by the model.
         */
        "transcript": S.String
      }),
      { nullable: true }
    )
  })),
  /**
   * The identifier of the first chat message in the data array.
   */
  "first_id": S.String,
  /**
   * The identifier of the last chat message in the data array.
   */
  "last_id": S.String,
  /**
   * Indicates whether there are more chat messages available.
   */
  "has_more": S.Boolean
}) {}

export class CreateCompletionRequestModelEnum
  extends S.Literal("gpt-3.5-turbo-instruct", "davinci-002", "babbage-002")
{}

export class CreateCompletionRequest extends S.Class<CreateCompletionRequest>("CreateCompletionRequest")({
  /**
   * ID of the model to use. You can use the [List models](https://platform.openai.com/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](https://platform.openai.com/docs/models) for descriptions of them.
   */
  "model": S.Union(S.String, CreateCompletionRequestModelEnum),
  /**
   * The prompt(s) to generate completions for, encoded as a string, array of strings, array of tokens, or array of token arrays.
   *
   * Note that <|endoftext|> is the document separator that the model sees during training, so if a prompt is not specified the model will generate as if from the beginning of a new document.
   */
  "prompt": S.NullOr(
    S.Union(
      S.String,
      S.Array(S.String),
      S.NonEmptyArray(S.Int).pipe(S.minItems(1)),
      S.NonEmptyArray(S.NonEmptyArray(S.Int).pipe(S.minItems(1))).pipe(S.minItems(1))
    )
  ),
  /**
   * Generates `best_of` completions server-side and returns the "best" (the one with the highest log probability per token). Results cannot be streamed.
   *
   * When used with `n`, `best_of` controls the number of candidate completions and `n` specifies how many to return – `best_of` must be greater than `n`.
   *
   * **Note:** Because this parameter generates many completions, it can quickly consume your token quota. Use carefully and ensure that you have reasonable settings for `max_tokens` and `stop`.
   */
  "best_of": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * Echo back the prompt in addition to the completion
   */
  "echo": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
   *
   * [See more information about frequency and presence penalties.](https://platform.openai.com/docs/guides/text-generation)
   */
  "frequency_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  /**
   * Modify the likelihood of specified tokens appearing in the completion.
   *
   * Accepts a JSON object that maps tokens (specified by their token ID in the GPT tokenizer) to an associated bias value from -100 to 100. You can use this [tokenizer tool](/tokenizer?view=bpe) to convert text to token IDs. Mathematically, the bias is added to the logits generated by the model prior to sampling. The exact effect will vary per model, but values between -1 and 1 should decrease or increase likelihood of selection; values like -100 or 100 should result in a ban or exclusive selection of the relevant token.
   *
   * As an example, you can pass `{"50256": -100}` to prevent the <|endoftext|> token from being generated.
   */
  "logit_bias": S.optionalWith(S.NullOr(S.Record({ key: S.String, value: S.Unknown })), { default: () => null }),
  /**
   * Include the log probabilities on the `logprobs` most likely output tokens, as well the chosen tokens. For example, if `logprobs` is 5, the API will return a list of the 5 most likely tokens. The API will always return the `logprob` of the sampled token, so there may be up to `logprobs+1` elements in the response.
   *
   * The maximum value for `logprobs` is 5.
   */
  "logprobs": S.optionalWith(S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(5))), {
    default: () => null
  }),
  /**
   * The maximum number of [tokens](/tokenizer) that can be generated in the completion.
   *
   * The token count of your prompt plus `max_tokens` cannot exceed the model's context length. [Example Python code](https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken) for counting tokens.
   */
  "max_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true, default: () => 16 as const }),
  /**
   * How many completions to generate for each prompt.
   *
   * **Note:** Because this parameter generates many completions, it can quickly consume your token quota. Use carefully and ensure that you have reasonable settings for `max_tokens` and `stop`.
   */
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(128)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.
   *
   * [See more information about frequency and presence penalties.](https://platform.openai.com/docs/guides/text-generation)
   */
  "presence_penalty": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(-2), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 0 as const
  }),
  /**
   * If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same `seed` and parameters should return the same result.
   *
   * Determinism is not guaranteed, and you should refer to the `system_fingerprint` response parameter to monitor changes in the backend.
   */
  "seed": S.optionalWith(S.Int, { nullable: true }),
  "stop": S.optionalWith(StopConfiguration, { nullable: true }),
  /**
   * Whether to stream back partial progress. If set, tokens will be sent as data-only [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format) as they become available, with the stream terminated by a `data: [DONE]` message. [Example Python code](https://cookbook.openai.com/examples/how_to_stream_completions).
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stream_options": S.optionalWith(
    S.Struct({
      /**
       * If set, an additional chunk will be streamed before the `data: [DONE]`
       * message. The `usage` field on this chunk shows the token usage statistics
       * for the entire request, and the `choices` field will always be an empty
       * array.
       *
       * All other chunks will also include a `usage` field, but with a null
       * value. **NOTE:** If the stream is interrupted, you may not receive the
       * final usage chunk which contains the total token usage for the request.
       */
      "include_usage": S.optionalWith(S.Boolean, { nullable: true }),
      /**
       * When true, stream obfuscation will be enabled. Stream obfuscation adds
       * random characters to an `obfuscation` field on streaming delta events to
       * normalize payload sizes as a mitigation to certain side-channel attacks.
       * These obfuscation fields are included by default, but add a small amount
       * of overhead to the data stream. You can set `include_obfuscation` to
       * false to optimize for bandwidth if you trust the network links between
       * your application and the OpenAI API.
       */
      "include_obfuscation": S.optionalWith(S.Boolean, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The suffix that comes after a completion of inserted text.
   *
   * This parameter is only supported for `gpt-3.5-turbo-instruct`.
   */
  "suffix": S.optionalWith(S.NullOr(S.String), { default: () => null }),
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
   *
   * We generally recommend altering this or `top_p` but not both.
   */
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.
   *
   * We generally recommend altering this or `temperature` but not both.
   */
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids).
   */
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always "text_completion"
 */
export class CreateCompletionResponseObject extends S.Literal("text_completion") {}

/**
 * Represents a completion response from the API. Note: both the streamed and non-streamed response objects share the same shape (unlike the chat endpoint).
 */
export class CreateCompletionResponse extends S.Class<CreateCompletionResponse>("CreateCompletionResponse")({
  /**
   * A unique identifier for the completion.
   */
  "id": S.String,
  /**
   * The list of completion choices the model generated for the input prompt.
   */
  "choices": S.Array(S.Struct({
    /**
     * The reason the model stopped generating tokens. This will be `stop` if the model hit a natural stop point or a provided stop sequence,
     * `length` if the maximum number of tokens specified in the request was reached,
     * or `content_filter` if content was omitted due to a flag from our content filters.
     */
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
  /**
   * The Unix timestamp (in seconds) of when the completion was created.
   */
  "created": S.Int,
  /**
   * The model used for completion.
   */
  "model": S.String,
  /**
   * This fingerprint represents the backend configuration that the model runs with.
   *
   * Can be used in conjunction with the `seed` request parameter to understand when backend changes have been made that might impact determinism.
   */
  "system_fingerprint": S.optionalWith(S.String, { nullable: true }),
  /**
   * The object type, which is always "text_completion"
   */
  "object": CreateCompletionResponseObject,
  "usage": S.optionalWith(CompletionUsage, { nullable: true })
}) {}

export class ListContainersParamsOrder extends S.Literal("asc", "desc") {}

export class ListContainersParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListContainersParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The reference point for the expiration.
 */
export class ContainerResourceExpiresAfterAnchor extends S.Literal("last_active_at") {}

export class ContainerResource extends S.Class<ContainerResource>("ContainerResource")({
  /**
   * Unique identifier for the container.
   */
  "id": S.String,
  /**
   * The type of this object.
   */
  "object": S.String,
  /**
   * Name of the container.
   */
  "name": S.String,
  /**
   * Unix timestamp (in seconds) when the container was created.
   */
  "created_at": S.Int,
  /**
   * Status of the container (e.g., active, deleted).
   */
  "status": S.String,
  /**
   * The container will expire after this time period.
   * The anchor is the reference point for the expiration.
   * The minutes is the number of minutes after the anchor before the container expires.
   */
  "expires_after": S.optionalWith(
    S.Struct({
      /**
       * The reference point for the expiration.
       */
      "anchor": S.optionalWith(ContainerResourceExpiresAfterAnchor, { nullable: true }),
      /**
       * The number of minutes after the anchor before the container expires.
       */
      "minutes": S.optionalWith(S.Int, { nullable: true })
    }),
    { nullable: true }
  )
}) {}

export class ContainerListResource extends S.Class<ContainerListResource>("ContainerListResource")({
  /**
   * The type of object returned, must be 'list'.
   */
  "object": S.Literal("list"),
  /**
   * A list of containers.
   */
  "data": S.Array(ContainerResource),
  /**
   * The ID of the first container in the list.
   */
  "first_id": S.String,
  /**
   * The ID of the last container in the list.
   */
  "last_id": S.String,
  /**
   * Whether there are more containers available.
   */
  "has_more": S.Boolean
}) {}

/**
 * Time anchor for the expiration time. Currently only 'last_active_at' is supported.
 */
export class CreateContainerBodyExpiresAfterAnchor extends S.Literal("last_active_at") {}

export class CreateContainerBody extends S.Class<CreateContainerBody>("CreateContainerBody")({
  /**
   * Name of the container to create.
   */
  "name": S.String,
  /**
   * IDs of files to copy to the container.
   */
  "file_ids": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Container expiration time in seconds relative to the 'anchor' time.
   */
  "expires_after": S.optionalWith(
    S.Struct({
      /**
       * Time anchor for the expiration time. Currently only 'last_active_at' is supported.
       */
      "anchor": CreateContainerBodyExpiresAfterAnchor,
      "minutes": S.Int
    }),
    { nullable: true }
  )
}) {}

export class ListContainerFilesParamsOrder extends S.Literal("asc", "desc") {}

export class ListContainerFilesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListContainerFilesParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

export class ContainerFileResource extends S.Class<ContainerFileResource>("ContainerFileResource")({
  /**
   * Unique identifier for the file.
   */
  "id": S.String,
  /**
   * The type of this object (`container.file`).
   */
  "object": S.Literal("container.file"),
  /**
   * The container this file belongs to.
   */
  "container_id": S.String,
  /**
   * Unix timestamp (in seconds) when the file was created.
   */
  "created_at": S.Int,
  /**
   * Size of the file in bytes.
   */
  "bytes": S.Int,
  /**
   * Path of the file in the container.
   */
  "path": S.String,
  /**
   * Source of the file (e.g., `user`, `assistant`).
   */
  "source": S.String
}) {}

export class ContainerFileListResource extends S.Class<ContainerFileListResource>("ContainerFileListResource")({
  /**
   * The type of object returned, must be 'list'.
   */
  "object": S.Literal("list"),
  /**
   * A list of container files.
   */
  "data": S.Array(ContainerFileResource),
  /**
   * The ID of the first file in the list.
   */
  "first_id": S.String,
  /**
   * The ID of the last file in the list.
   */
  "last_id": S.String,
  /**
   * Whether there are more files available.
   */
  "has_more": S.Boolean
}) {}

export class CreateContainerFileBody extends S.Class<CreateContainerFileBody>("CreateContainerFileBody")({
  /**
   * Name of the file to create.
   */
  "file_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The File object (not file name) to be uploaded.
   */
  "file": S.optionalWith(S.instanceOf(globalThis.Blob), { nullable: true })
}) {}

export class ListConversationItemsParamsOrder extends S.Literal("asc", "desc") {}

/**
 * Specify additional output data to include in the model response. Currently supported values are:
 * - `web_search_call.action.sources`: Include the sources of the web search tool call.
 * - `code_interpreter_call.outputs`: Includes the outputs of python code execution in code interpreter tool call items.
 * - `computer_call_output.output.image_url`: Include image urls from the computer call output.
 * - `file_search_call.results`: Include the search results of the file search tool call.
 * - `message.input_image.image_url`: Include image urls from the input message.
 * - `message.output_text.logprobs`: Include logprobs with assistant messages.
 * - `reasoning.encrypted_content`: Includes an encrypted version of reasoning tokens in reasoning item outputs. This enables reasoning items to be used in multi-turn conversations when using the Responses API statelessly (like when the `store` parameter is set to `false`, or when an organization is enrolled in the zero data retention program).
 */
export class IncludeEnum extends S.Literal(
  "file_search_call.results",
  "web_search_call.results",
  "web_search_call.action.sources",
  "message.input_image.image_url",
  "computer_call_output.output.image_url",
  "code_interpreter_call.outputs",
  "reasoning.encrypted_content",
  "message.output_text.logprobs"
) {}

export class ListConversationItemsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListConversationItemsParamsOrder, { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "include": S.optionalWith(S.Array(IncludeEnum), { nullable: true })
}) {}

/**
 * The type of the message. Always set to `message`.
 */
export class MessageType extends S.Literal("message") {}

export class MessageStatus extends S.Literal("in_progress", "completed", "incomplete") {}

export class MessageRole
  extends S.Literal("unknown", "user", "assistant", "system", "critic", "discriminator", "developer", "tool")
{}

/**
 * The type of the input item. Always `input_text`.
 */
export class InputTextContentType extends S.Literal("input_text") {}

/**
 * A text input to the model.
 */
export class InputTextContent extends S.Class<InputTextContent>("InputTextContent")({
  /**
   * The type of the input item. Always `input_text`.
   */
  "type": InputTextContentType.pipe(S.propertySignature, S.withConstructorDefault(() => "input_text" as const)),
  /**
   * The text input to the model.
   */
  "text": S.String
}) {}

/**
 * The type of the output text. Always `output_text`.
 */
export class OutputTextContentType extends S.Literal("output_text") {}

/**
 * The type of the file citation. Always `file_citation`.
 */
export class FileCitationBodyType extends S.Literal("file_citation") {}

/**
 * A citation to a file.
 */
export class FileCitationBody extends S.Class<FileCitationBody>("FileCitationBody")({
  /**
   * The type of the file citation. Always `file_citation`.
   */
  "type": FileCitationBodyType.pipe(S.propertySignature, S.withConstructorDefault(() => "file_citation" as const)),
  /**
   * The ID of the file.
   */
  "file_id": S.String,
  /**
   * The index of the file in the list of files.
   */
  "index": S.Int,
  /**
   * The filename of the file cited.
   */
  "filename": S.String
}) {}

/**
 * The type of the URL citation. Always `url_citation`.
 */
export class UrlCitationBodyType extends S.Literal("url_citation") {}

/**
 * A citation for a web resource used to generate a model response.
 */
export class UrlCitationBody extends S.Class<UrlCitationBody>("UrlCitationBody")({
  /**
   * The type of the URL citation. Always `url_citation`.
   */
  "type": UrlCitationBodyType.pipe(S.propertySignature, S.withConstructorDefault(() => "url_citation" as const)),
  /**
   * The URL of the web resource.
   */
  "url": S.String,
  /**
   * The index of the first character of the URL citation in the message.
   */
  "start_index": S.Int,
  /**
   * The index of the last character of the URL citation in the message.
   */
  "end_index": S.Int,
  /**
   * The title of the web resource.
   */
  "title": S.String
}) {}

/**
 * The type of the container file citation. Always `container_file_citation`.
 */
export class ContainerFileCitationBodyType extends S.Literal("container_file_citation") {}

/**
 * A citation for a container file used to generate a model response.
 */
export class ContainerFileCitationBody extends S.Class<ContainerFileCitationBody>("ContainerFileCitationBody")({
  /**
   * The type of the container file citation. Always `container_file_citation`.
   */
  "type": ContainerFileCitationBodyType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "container_file_citation" as const)
  ),
  /**
   * The ID of the container file.
   */
  "container_id": S.String,
  /**
   * The ID of the file.
   */
  "file_id": S.String,
  /**
   * The index of the first character of the container file citation in the message.
   */
  "start_index": S.Int,
  /**
   * The index of the last character of the container file citation in the message.
   */
  "end_index": S.Int,
  /**
   * The filename of the container file cited.
   */
  "filename": S.String
}) {}

/**
 * The type of the file path. Always `file_path`.
 */
export class FilePathType extends S.Literal("file_path") {}

/**
 * A path to a file.
 */
export class FilePath extends S.Class<FilePath>("FilePath")({
  /**
   * The type of the file path. Always `file_path`.
   */
  "type": FilePathType,
  /**
   * The ID of the file.
   */
  "file_id": S.String,
  /**
   * The index of the file in the list of files.
   */
  "index": S.Int
}) {}

export class Annotation extends S.Union(FileCitationBody, UrlCitationBody, ContainerFileCitationBody, FilePath) {}

/**
 * The top log probability of a token.
 */
export class TopLogProb extends S.Class<TopLogProb>("TopLogProb")({
  "token": S.String,
  "logprob": S.Number,
  "bytes": S.Array(S.Int)
}) {}

/**
 * The log probability of a token.
 */
export class LogProb extends S.Class<LogProb>("LogProb")({
  "token": S.String,
  "logprob": S.Number,
  "bytes": S.Array(S.Int),
  "top_logprobs": S.Array(TopLogProb)
}) {}

/**
 * A text output from the model.
 */
export class OutputTextContent extends S.Class<OutputTextContent>("OutputTextContent")({
  /**
   * The type of the output text. Always `output_text`.
   */
  "type": OutputTextContentType.pipe(S.propertySignature, S.withConstructorDefault(() => "output_text" as const)),
  /**
   * The text output from the model.
   */
  "text": S.String,
  /**
   * The annotations of the text output.
   */
  "annotations": S.Array(Annotation),
  "logprobs": S.optionalWith(S.Array(LogProb), { nullable: true })
}) {}

export class TextContentType extends S.Literal("text") {}

/**
 * A text content.
 */
export class TextContent extends S.Class<TextContent>("TextContent")({
  "type": TextContentType.pipe(S.propertySignature, S.withConstructorDefault(() => "text" as const)),
  "text": S.String
}) {}

/**
 * The type of the object. Always `summary_text`.
 */
export class SummaryTextContentType extends S.Literal("summary_text") {}

/**
 * A summary text from the model.
 */
export class SummaryTextContent extends S.Class<SummaryTextContent>("SummaryTextContent")({
  /**
   * The type of the object. Always `summary_text`.
   */
  "type": SummaryTextContentType.pipe(S.propertySignature, S.withConstructorDefault(() => "summary_text" as const)),
  /**
   * A summary of the reasoning output from the model so far.
   */
  "text": S.String
}) {}

/**
 * The type of the reasoning text. Always `reasoning_text`.
 */
export class ReasoningTextContentType extends S.Literal("reasoning_text") {}

/**
 * Reasoning text from the model.
 */
export class ReasoningTextContent extends S.Class<ReasoningTextContent>("ReasoningTextContent")({
  /**
   * The type of the reasoning text. Always `reasoning_text`.
   */
  "type": ReasoningTextContentType.pipe(S.propertySignature, S.withConstructorDefault(() => "reasoning_text" as const)),
  /**
   * The reasoning text from the model.
   */
  "text": S.String
}) {}

/**
 * The type of the refusal. Always `refusal`.
 */
export class RefusalContentType extends S.Literal("refusal") {}

/**
 * A refusal from the model.
 */
export class RefusalContent extends S.Class<RefusalContent>("RefusalContent")({
  /**
   * The type of the refusal. Always `refusal`.
   */
  "type": RefusalContentType.pipe(S.propertySignature, S.withConstructorDefault(() => "refusal" as const)),
  /**
   * The refusal explanation from the model.
   */
  "refusal": S.String
}) {}

/**
 * The type of the input item. Always `input_image`.
 */
export class InputImageContentType extends S.Literal("input_image") {}

export class ImageDetail extends S.Literal("low", "high", "auto") {}

/**
 * An image input to the model. Learn about [image inputs](https://platform.openai.com/docs/guides/vision).
 */
export class InputImageContent extends S.Class<InputImageContent>("InputImageContent")({
  /**
   * The type of the input item. Always `input_image`.
   */
  "type": InputImageContentType.pipe(S.propertySignature, S.withConstructorDefault(() => "input_image" as const)),
  "image_url": S.optionalWith(S.String, { nullable: true }),
  "file_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The detail level of the image to be sent to the model. One of `high`, `low`, or `auto`. Defaults to `auto`.
   */
  "detail": ImageDetail
}) {}

/**
 * Specifies the event type. For a computer screenshot, this property is always set to `computer_screenshot`.
 */
export class ComputerScreenshotContentType extends S.Literal("computer_screenshot") {}

/**
 * A screenshot of a computer.
 */
export class ComputerScreenshotContent extends S.Class<ComputerScreenshotContent>("ComputerScreenshotContent")({
  /**
   * Specifies the event type. For a computer screenshot, this property is always set to `computer_screenshot`.
   */
  "type": ComputerScreenshotContentType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "computer_screenshot" as const)
  ),
  "image_url": S.NullOr(S.String),
  "file_id": S.NullOr(S.String)
}) {}

/**
 * The type of the input item. Always `input_file`.
 */
export class InputFileContentType extends S.Literal("input_file") {}

/**
 * A file input to the model.
 */
export class InputFileContent extends S.Class<InputFileContent>("InputFileContent")({
  /**
   * The type of the input item. Always `input_file`.
   */
  "type": InputFileContentType.pipe(S.propertySignature, S.withConstructorDefault(() => "input_file" as const)),
  "file_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The name of the file to be sent to the model.
   */
  "filename": S.optionalWith(S.String, { nullable: true }),
  /**
   * The URL of the file to be sent to the model.
   */
  "file_url": S.optionalWith(S.String, { nullable: true }),
  /**
   * The content of the file to be sent to the model.
   */
  "file_data": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A message to or from the model.
 */
export class Message extends S.Class<Message>("Message")({
  /**
   * The type of the message. Always set to `message`.
   */
  "type": MessageType.pipe(S.propertySignature, S.withConstructorDefault(() => "message" as const)),
  /**
   * The unique ID of the message.
   */
  "id": S.String,
  /**
   * The status of item. One of `in_progress`, `completed`, or `incomplete`. Populated when items are returned via API.
   */
  "status": MessageStatus,
  /**
   * The role of the message. One of `unknown`, `user`, `assistant`, `system`, `critic`, `discriminator`, `developer`, or `tool`.
   */
  "role": MessageRole,
  /**
   * The content of the message
   */
  "content": S.Array(
    S.Union(
      InputTextContent,
      OutputTextContent,
      TextContent,
      SummaryTextContent,
      ReasoningTextContent,
      RefusalContent,
      InputImageContent,
      ComputerScreenshotContent,
      InputFileContent
    )
  )
}) {}

/**
 * The type of the function tool call. Always `function_call`.
 */
export class FunctionToolCallResourceType extends S.Literal("function_call") {}

/**
 * The status of the item. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when items are returned via API.
 */
export class FunctionToolCallResourceStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A tool call to run a function. See the
 * [function calling guide](https://platform.openai.com/docs/guides/function-calling) for more information.
 */
export class FunctionToolCallResource extends S.Class<FunctionToolCallResource>("FunctionToolCallResource")({
  /**
   * The unique ID of the function tool call.
   */
  "id": S.String,
  /**
   * The type of the function tool call. Always `function_call`.
   */
  "type": FunctionToolCallResourceType,
  /**
   * The unique ID of the function tool call generated by the model.
   */
  "call_id": S.String,
  /**
   * The name of the function to run.
   */
  "name": S.String,
  /**
   * A JSON string of the arguments to pass to the function.
   */
  "arguments": S.String,
  /**
   * The status of the item. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when items are returned via API.
   */
  "status": S.optionalWith(FunctionToolCallResourceStatus, { nullable: true })
}) {}

/**
 * The type of the function tool call output. Always `function_call_output`.
 */
export class FunctionToolCallOutputResourceType extends S.Literal("function_call_output") {}

export class FunctionAndCustomToolCallOutput extends S.Union(InputTextContent, InputImageContent, InputFileContent) {}

/**
 * The status of the item. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when items are returned via API.
 */
export class FunctionToolCallOutputResourceStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * The output of a function tool call.
 */
export class FunctionToolCallOutputResource
  extends S.Class<FunctionToolCallOutputResource>("FunctionToolCallOutputResource")({
    /**
     * The unique ID of the function tool call output. Populated when this item
     * is returned via API.
     */
    "id": S.String,
    /**
     * The type of the function tool call output. Always `function_call_output`.
     */
    "type": FunctionToolCallOutputResourceType,
    /**
     * The unique ID of the function tool call generated by the model.
     */
    "call_id": S.String,
    /**
     * The output from the function call generated by your code.
     * Can be a string or an list of output content.
     */
    "output": S.Union(
      /**
       * A string of the output of the function call.
       */
      S.String,
      /**
       * Text, image, or file output of the function call.
       */
      S.Array(FunctionAndCustomToolCallOutput)
    ),
    /**
     * The status of the item. One of `in_progress`, `completed`, or
     * `incomplete`. Populated when items are returned via API.
     */
    "status": S.optionalWith(FunctionToolCallOutputResourceStatus, { nullable: true })
  })
{}

/**
 * The type of the file search tool call. Always `file_search_call`.
 */
export class FileSearchToolCallType extends S.Literal("file_search_call") {}

/**
 * The status of the file search tool call. One of `in_progress`,
 * `searching`, `incomplete` or `failed`,
 */
export class FileSearchToolCallStatus
  extends S.Literal("in_progress", "searching", "completed", "incomplete", "failed")
{}

export class VectorStoreFileAttributes extends S.Union(
  /**
   * Set of 16 key-value pairs that can be attached to an object. This can be
   * useful for storing additional information about the object in a structured
   * format, and querying for objects via API or the dashboard. Keys are strings
   * with a maximum length of 64 characters. Values are strings with a maximum
   * length of 512 characters, booleans, or numbers.
   */
  S.Record({ key: S.String, value: S.Unknown }),
  S.Null
) {}

/**
 * The results of a file search tool call. See the
 * [file search guide](https://platform.openai.com/docs/guides/tools-file-search) for more information.
 */
export class FileSearchToolCall extends S.Class<FileSearchToolCall>("FileSearchToolCall")({
  /**
   * The unique ID of the file search tool call.
   */
  "id": S.String,
  /**
   * The type of the file search tool call. Always `file_search_call`.
   */
  "type": FileSearchToolCallType,
  /**
   * The status of the file search tool call. One of `in_progress`,
   * `searching`, `incomplete` or `failed`,
   */
  "status": FileSearchToolCallStatus,
  /**
   * The queries used to search for files.
   */
  "queries": S.Array(S.String),
  "results": S.optionalWith(
    S.Array(S.Struct({
      /**
       * The unique ID of the file.
       */
      "file_id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The text that was retrieved from the file.
       */
      "text": S.optionalWith(S.String, { nullable: true }),
      /**
       * The name of the file.
       */
      "filename": S.optionalWith(S.String, { nullable: true }),
      "attributes": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
      /**
       * The relevance score of the file - a value between 0 and 1.
       */
      "score": S.optionalWith(S.Number, { nullable: true })
    })),
    { nullable: true }
  )
}) {}

/**
 * The type of the web search tool call. Always `web_search_call`.
 */
export class WebSearchToolCallType extends S.Literal("web_search_call") {}

/**
 * The status of the web search tool call.
 */
export class WebSearchToolCallStatus extends S.Literal("in_progress", "searching", "completed", "failed") {}

/**
 * The action type.
 */
export class WebSearchActionSearchType extends S.Literal("search") {}

/**
 * Action type "search" - Performs a web search query.
 */
export class WebSearchActionSearch extends S.Class<WebSearchActionSearch>("WebSearchActionSearch")({
  /**
   * The action type.
   */
  "type": WebSearchActionSearchType,
  /**
   * The search query.
   */
  "query": S.String,
  /**
   * The sources used in the search.
   */
  "sources": S.optionalWith(
    S.Array(S.Struct({
      /**
       * The type of source. Always `url`.
       */
      "type": S.Literal("url"),
      /**
       * The URL of the source.
       */
      "url": S.String
    })),
    { nullable: true }
  )
}) {}

/**
 * The action type.
 */
export class WebSearchActionOpenPageType extends S.Literal("open_page") {}

/**
 * Action type "open_page" - Opens a specific URL from search results.
 */
export class WebSearchActionOpenPage extends S.Class<WebSearchActionOpenPage>("WebSearchActionOpenPage")({
  /**
   * The action type.
   */
  "type": WebSearchActionOpenPageType,
  /**
   * The URL opened by the model.
   */
  "url": S.String
}) {}

/**
 * The action type.
 */
export class WebSearchActionFindType extends S.Literal("find") {}

/**
 * Action type "find": Searches for a pattern within a loaded page.
 */
export class WebSearchActionFind extends S.Class<WebSearchActionFind>("WebSearchActionFind")({
  /**
   * The action type.
   */
  "type": WebSearchActionFindType,
  /**
   * The URL of the page searched for the pattern.
   */
  "url": S.String,
  /**
   * The pattern or text to search for within the page.
   */
  "pattern": S.String
}) {}

/**
 * The results of a web search tool call. See the
 * [web search guide](https://platform.openai.com/docs/guides/tools-web-search) for more information.
 */
export class WebSearchToolCall extends S.Class<WebSearchToolCall>("WebSearchToolCall")({
  /**
   * The unique ID of the web search tool call.
   */
  "id": S.String,
  /**
   * The type of the web search tool call. Always `web_search_call`.
   */
  "type": WebSearchToolCallType,
  /**
   * The status of the web search tool call.
   */
  "status": WebSearchToolCallStatus,
  /**
   * An object describing the specific action taken in this web search call.
   * Includes details on how the model used the web (search, open_page, find).
   */
  "action": S.Record({ key: S.String, value: S.Unknown })
}) {}

/**
 * The type of the image generation call. Always `image_generation_call`.
 */
export class ImageGenToolCallType extends S.Literal("image_generation_call") {}

/**
 * The status of the image generation call.
 */
export class ImageGenToolCallStatus extends S.Literal("in_progress", "completed", "generating", "failed") {}

/**
 * An image generation request made by the model.
 */
export class ImageGenToolCall extends S.Class<ImageGenToolCall>("ImageGenToolCall")({
  /**
   * The type of the image generation call. Always `image_generation_call`.
   */
  "type": ImageGenToolCallType,
  /**
   * The unique ID of the image generation call.
   */
  "id": S.String,
  /**
   * The status of the image generation call.
   */
  "status": ImageGenToolCallStatus,
  "result": S.NullOr(S.String)
}) {}

/**
 * The type of the computer call. Always `computer_call`.
 */
export class ComputerToolCallType extends S.Literal("computer_call") {}

/**
 * Specifies the event type. For a click action, this property is always `click`.
 */
export class ClickParamType extends S.Literal("click") {}

export class ClickButtonType extends S.Literal("left", "right", "wheel", "back", "forward") {}

/**
 * A click action.
 */
export class ClickParam extends S.Class<ClickParam>("ClickParam")({
  /**
   * Specifies the event type. For a click action, this property is always `click`.
   */
  "type": ClickParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "click" as const)),
  /**
   * Indicates which mouse button was pressed during the click. One of `left`, `right`, `wheel`, `back`, or `forward`.
   */
  "button": ClickButtonType,
  /**
   * The x-coordinate where the click occurred.
   */
  "x": S.Int,
  /**
   * The y-coordinate where the click occurred.
   */
  "y": S.Int
}) {}

/**
 * Specifies the event type. For a double click action, this property is always set to `double_click`.
 */
export class DoubleClickActionType extends S.Literal("double_click") {}

/**
 * A double click action.
 */
export class DoubleClickAction extends S.Class<DoubleClickAction>("DoubleClickAction")({
  /**
   * Specifies the event type. For a double click action, this property is always set to `double_click`.
   */
  "type": DoubleClickActionType.pipe(S.propertySignature, S.withConstructorDefault(() => "double_click" as const)),
  /**
   * The x-coordinate where the double click occurred.
   */
  "x": S.Int,
  /**
   * The y-coordinate where the double click occurred.
   */
  "y": S.Int
}) {}

/**
 * Specifies the event type. For a drag action, this property is
 * always set to `drag`.
 */
export class DragType extends S.Literal("drag") {}

/**
 * An x/y coordinate pair, e.g. `{ x: 100, y: 200 }`.
 */
export class DragPoint extends S.Class<DragPoint>("DragPoint")({
  /**
   * The x-coordinate.
   */
  "x": S.Int,
  /**
   * The y-coordinate.
   */
  "y": S.Int
}) {}

/**
 * A drag action.
 */
export class Drag extends S.Class<Drag>("Drag")({
  /**
   * Specifies the event type. For a drag action, this property is
   * always set to `drag`.
   */
  "type": DragType.pipe(S.propertySignature, S.withConstructorDefault(() => "drag" as const)),
  /**
   * An array of coordinates representing the path of the drag action. Coordinates will appear as an array
   * of objects, eg
   * ```
   * [
   *   { x: 100, y: 200 },
   *   { x: 200, y: 300 }
   * ]
   * ```
   */
  "path": S.Array(DragPoint)
}) {}

/**
 * Specifies the event type. For a keypress action, this property is always set to `keypress`.
 */
export class KeyPressActionType extends S.Literal("keypress") {}

/**
 * A collection of keypresses the model would like to perform.
 */
export class KeyPressAction extends S.Class<KeyPressAction>("KeyPressAction")({
  /**
   * Specifies the event type. For a keypress action, this property is always set to `keypress`.
   */
  "type": KeyPressActionType.pipe(S.propertySignature, S.withConstructorDefault(() => "keypress" as const)),
  /**
   * The combination of keys the model is requesting to be pressed. This is an array of strings, each representing a key.
   */
  "keys": S.Array(S.String)
}) {}

/**
 * Specifies the event type. For a move action, this property is
 * always set to `move`.
 */
export class MoveType extends S.Literal("move") {}

/**
 * A mouse move action.
 */
export class Move extends S.Class<Move>("Move")({
  /**
   * Specifies the event type. For a move action, this property is
   * always set to `move`.
   */
  "type": MoveType.pipe(S.propertySignature, S.withConstructorDefault(() => "move" as const)),
  /**
   * The x-coordinate to move to.
   */
  "x": S.Int,
  /**
   * The y-coordinate to move to.
   */
  "y": S.Int
}) {}

/**
 * Specifies the event type. For a screenshot action, this property is
 * always set to `screenshot`.
 */
export class ScreenshotType extends S.Literal("screenshot") {}

/**
 * A screenshot action.
 */
export class Screenshot extends S.Class<Screenshot>("Screenshot")({
  /**
   * Specifies the event type. For a screenshot action, this property is
   * always set to `screenshot`.
   */
  "type": ScreenshotType.pipe(S.propertySignature, S.withConstructorDefault(() => "screenshot" as const))
}) {}

/**
 * Specifies the event type. For a scroll action, this property is
 * always set to `scroll`.
 */
export class ScrollType extends S.Literal("scroll") {}

/**
 * A scroll action.
 */
export class Scroll extends S.Class<Scroll>("Scroll")({
  /**
   * Specifies the event type. For a scroll action, this property is
   * always set to `scroll`.
   */
  "type": ScrollType.pipe(S.propertySignature, S.withConstructorDefault(() => "scroll" as const)),
  /**
   * The x-coordinate where the scroll occurred.
   */
  "x": S.Int,
  /**
   * The y-coordinate where the scroll occurred.
   */
  "y": S.Int,
  /**
   * The horizontal scroll distance.
   */
  "scroll_x": S.Int,
  /**
   * The vertical scroll distance.
   */
  "scroll_y": S.Int
}) {}

/**
 * Specifies the event type. For a type action, this property is
 * always set to `type`.
 */
export class TypeType extends S.Literal("type") {}

/**
 * An action to type in text.
 */
export class Type extends S.Class<Type>("Type")({
  /**
   * Specifies the event type. For a type action, this property is
   * always set to `type`.
   */
  "type": TypeType.pipe(S.propertySignature, S.withConstructorDefault(() => "type" as const)),
  /**
   * The text to type.
   */
  "text": S.String
}) {}

/**
 * Specifies the event type. For a wait action, this property is
 * always set to `wait`.
 */
export class WaitType extends S.Literal("wait") {}

/**
 * A wait action.
 */
export class Wait extends S.Class<Wait>("Wait")({
  /**
   * Specifies the event type. For a wait action, this property is
   * always set to `wait`.
   */
  "type": WaitType.pipe(S.propertySignature, S.withConstructorDefault(() => "wait" as const))
}) {}

export class ComputerAction
  extends S.Union(ClickParam, DoubleClickAction, Drag, KeyPressAction, Move, Screenshot, Scroll, Type, Wait)
{}

/**
 * A pending safety check for the computer call.
 */
export class ComputerCallSafetyCheckParam
  extends S.Class<ComputerCallSafetyCheckParam>("ComputerCallSafetyCheckParam")({
    /**
     * The ID of the pending safety check.
     */
    "id": S.String,
    "code": S.optionalWith(S.String, { nullable: true }),
    "message": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * The status of the item. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when items are returned via API.
 */
export class ComputerToolCallStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A tool call to a computer use tool. See the
 * [computer use guide](https://platform.openai.com/docs/guides/tools-computer-use) for more information.
 */
export class ComputerToolCall extends S.Class<ComputerToolCall>("ComputerToolCall")({
  /**
   * The type of the computer call. Always `computer_call`.
   */
  "type": ComputerToolCallType.pipe(S.propertySignature, S.withConstructorDefault(() => "computer_call" as const)),
  /**
   * The unique ID of the computer call.
   */
  "id": S.String,
  /**
   * An identifier used when responding to the tool call with output.
   */
  "call_id": S.String,
  "action": ComputerAction,
  /**
   * The pending safety checks for the computer call.
   */
  "pending_safety_checks": S.Array(ComputerCallSafetyCheckParam),
  /**
   * The status of the item. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when items are returned via API.
   */
  "status": ComputerToolCallStatus
}) {}

/**
 * The type of the computer tool call output. Always `computer_call_output`.
 */
export class ComputerToolCallOutputResourceType extends S.Literal("computer_call_output") {}

/**
 * Specifies the event type. For a computer screenshot, this property is
 * always set to `computer_screenshot`.
 */
export class ComputerScreenshotImageType extends S.Literal("computer_screenshot") {}

/**
 * A computer screenshot image used with the computer use tool.
 */
export class ComputerScreenshotImage extends S.Class<ComputerScreenshotImage>("ComputerScreenshotImage")({
  /**
   * Specifies the event type. For a computer screenshot, this property is
   * always set to `computer_screenshot`.
   */
  "type": ComputerScreenshotImageType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "computer_screenshot" as const)
  ),
  /**
   * The URL of the screenshot image.
   */
  "image_url": S.optionalWith(S.String, { nullable: true }),
  /**
   * The identifier of an uploaded file that contains the screenshot.
   */
  "file_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The status of the message input. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when input items are returned via API.
 */
export class ComputerToolCallOutputResourceStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * The output of a computer tool call.
 */
export class ComputerToolCallOutputResource
  extends S.Class<ComputerToolCallOutputResource>("ComputerToolCallOutputResource")({
    /**
     * The ID of the computer tool call output.
     */
    "id": S.String,
    /**
     * The type of the computer tool call output. Always `computer_call_output`.
     */
    "type": ComputerToolCallOutputResourceType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "computer_call_output" as const)
    ),
    /**
     * The ID of the computer tool call that produced the output.
     */
    "call_id": S.String,
    /**
     * The safety checks reported by the API that have been acknowledged by the
     * developer.
     */
    "acknowledged_safety_checks": S.optionalWith(S.Array(ComputerCallSafetyCheckParam), { nullable: true }),
    "output": ComputerScreenshotImage,
    /**
     * The status of the message input. One of `in_progress`, `completed`, or
     * `incomplete`. Populated when input items are returned via API.
     */
    "status": S.optionalWith(ComputerToolCallOutputResourceStatus, { nullable: true })
  })
{}

/**
 * The type of the object. Always `reasoning`.
 */
export class ReasoningItemType extends S.Literal("reasoning") {}

/**
 * The type of the object. Always `summary_text`.
 */
export class SummaryType extends S.Literal("summary_text") {}

/**
 * A summary text from the model.
 */
export class Summary extends S.Class<Summary>("Summary")({
  /**
   * The type of the object. Always `summary_text`.
   */
  "type": SummaryType.pipe(S.propertySignature, S.withConstructorDefault(() => "summary_text" as const)),
  /**
   * A summary of the reasoning output from the model so far.
   */
  "text": S.String
}) {}

/**
 * The status of the item. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when items are returned via API.
 */
export class ReasoningItemStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A description of the chain of thought used by a reasoning model while generating
 * a response. Be sure to include these items in your `input` to the Responses API
 * for subsequent turns of a conversation if you are manually
 * [managing context](https://platform.openai.com/docs/guides/conversation-state).
 */
export class ReasoningItem extends S.Class<ReasoningItem>("ReasoningItem")({
  /**
   * The type of the object. Always `reasoning`.
   */
  "type": ReasoningItemType,
  /**
   * The unique identifier of the reasoning content.
   */
  "id": S.String,
  "encrypted_content": S.optionalWith(S.String, { nullable: true }),
  /**
   * Reasoning summary content.
   */
  "summary": S.Array(Summary),
  /**
   * Reasoning text content.
   */
  "content": S.optionalWith(S.Array(ReasoningTextContent), { nullable: true }),
  /**
   * The status of the item. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when items are returned via API.
   */
  "status": S.optionalWith(ReasoningItemStatus, { nullable: true })
}) {}

/**
 * The type of the code interpreter tool call. Always `code_interpreter_call`.
 */
export class CodeInterpreterToolCallType extends S.Literal("code_interpreter_call") {}

/**
 * The status of the code interpreter tool call. Valid values are `in_progress`, `completed`, `incomplete`, `interpreting`, and `failed`.
 */
export class CodeInterpreterToolCallStatus
  extends S.Literal("in_progress", "completed", "incomplete", "interpreting", "failed")
{}

/**
 * The type of the output. Always `logs`.
 */
export class CodeInterpreterOutputLogsType extends S.Literal("logs") {}

/**
 * The logs output from the code interpreter.
 */
export class CodeInterpreterOutputLogs extends S.Class<CodeInterpreterOutputLogs>("CodeInterpreterOutputLogs")({
  /**
   * The type of the output. Always `logs`.
   */
  "type": CodeInterpreterOutputLogsType.pipe(S.propertySignature, S.withConstructorDefault(() => "logs" as const)),
  /**
   * The logs output from the code interpreter.
   */
  "logs": S.String
}) {}

/**
 * The type of the output. Always `image`.
 */
export class CodeInterpreterOutputImageType extends S.Literal("image") {}

/**
 * The image output from the code interpreter.
 */
export class CodeInterpreterOutputImage extends S.Class<CodeInterpreterOutputImage>("CodeInterpreterOutputImage")({
  /**
   * The type of the output. Always `image`.
   */
  "type": CodeInterpreterOutputImageType.pipe(S.propertySignature, S.withConstructorDefault(() => "image" as const)),
  /**
   * The URL of the image output from the code interpreter.
   */
  "url": S.String
}) {}

/**
 * A tool call to run code.
 */
export class CodeInterpreterToolCall extends S.Class<CodeInterpreterToolCall>("CodeInterpreterToolCall")({
  /**
   * The type of the code interpreter tool call. Always `code_interpreter_call`.
   */
  "type": CodeInterpreterToolCallType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "code_interpreter_call" as const)
  ),
  /**
   * The unique ID of the code interpreter tool call.
   */
  "id": S.String,
  /**
   * The status of the code interpreter tool call. Valid values are `in_progress`, `completed`, `incomplete`, `interpreting`, and `failed`.
   */
  "status": CodeInterpreterToolCallStatus,
  /**
   * The ID of the container used to run the code.
   */
  "container_id": S.String,
  "code": S.NullOr(S.String),
  "outputs": S.NullOr(S.Array(S.Union(CodeInterpreterOutputLogs, CodeInterpreterOutputImage)))
}) {}

/**
 * The type of the local shell call. Always `local_shell_call`.
 */
export class LocalShellToolCallType extends S.Literal("local_shell_call") {}

/**
 * The type of the local shell action. Always `exec`.
 */
export class LocalShellExecActionType extends S.Literal("exec") {}

/**
 * Execute a shell command on the server.
 */
export class LocalShellExecAction extends S.Class<LocalShellExecAction>("LocalShellExecAction")({
  /**
   * The type of the local shell action. Always `exec`.
   */
  "type": LocalShellExecActionType.pipe(S.propertySignature, S.withConstructorDefault(() => "exec" as const)),
  /**
   * The command to run.
   */
  "command": S.Array(S.String),
  "timeout_ms": S.optionalWith(S.Int, { nullable: true }),
  "working_directory": S.optionalWith(S.String, { nullable: true }),
  /**
   * Environment variables to set for the command.
   */
  "env": S.Record({ key: S.String, value: S.Unknown }),
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The status of the local shell call.
 */
export class LocalShellToolCallStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A tool call to run a command on the local shell.
 */
export class LocalShellToolCall extends S.Class<LocalShellToolCall>("LocalShellToolCall")({
  /**
   * The type of the local shell call. Always `local_shell_call`.
   */
  "type": LocalShellToolCallType,
  /**
   * The unique ID of the local shell call.
   */
  "id": S.String,
  /**
   * The unique ID of the local shell tool call generated by the model.
   */
  "call_id": S.String,
  "action": LocalShellExecAction,
  /**
   * The status of the local shell call.
   */
  "status": LocalShellToolCallStatus
}) {}

/**
 * The type of the local shell tool call output. Always `local_shell_call_output`.
 */
export class LocalShellToolCallOutputType extends S.Literal("local_shell_call_output") {}

/**
 * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
 */
export class LocalShellToolCallOutputStatusEnum extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * The output of a local shell tool call.
 */
export class LocalShellToolCallOutput extends S.Class<LocalShellToolCallOutput>("LocalShellToolCallOutput")({
  /**
   * The type of the local shell tool call output. Always `local_shell_call_output`.
   */
  "type": LocalShellToolCallOutputType,
  /**
   * The unique ID of the local shell tool call generated by the model.
   */
  "id": S.String,
  /**
   * A JSON string of the output of the local shell tool call.
   */
  "output": S.String,
  "status": S.optionalWith(LocalShellToolCallOutputStatusEnum, { nullable: true })
}) {}

/**
 * The type of the item. Always `shell_call`.
 */
export class FunctionShellCallType extends S.Literal("shell_call") {}

/**
 * Execute a shell command.
 */
export class FunctionShellAction extends S.Class<FunctionShellAction>("FunctionShellAction")({
  "commands": S.Array(S.String),
  "timeout_ms": S.NullOr(S.Int),
  "max_output_length": S.NullOr(S.Int)
}) {}

export class LocalShellCallStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A tool call that executes one or more shell commands in a managed environment.
 */
export class FunctionShellCall extends S.Class<FunctionShellCall>("FunctionShellCall")({
  /**
   * The type of the item. Always `shell_call`.
   */
  "type": FunctionShellCallType.pipe(S.propertySignature, S.withConstructorDefault(() => "shell_call" as const)),
  /**
   * The unique ID of the function shell tool call. Populated when this item is returned via API.
   */
  "id": S.String,
  /**
   * The unique ID of the function shell tool call generated by the model.
   */
  "call_id": S.String,
  /**
   * The shell commands and limits that describe how to run the tool call.
   */
  "action": FunctionShellAction,
  /**
   * The status of the shell call. One of `in_progress`, `completed`, or `incomplete`.
   */
  "status": LocalShellCallStatus,
  /**
   * The ID of the entity that created this tool call.
   */
  "created_by": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The type of the shell call output. Always `shell_call_output`.
 */
export class FunctionShellCallOutputType extends S.Literal("shell_call_output") {}

/**
 * The outcome type. Always `timeout`.
 */
export class FunctionShellCallOutputTimeoutOutcomeType extends S.Literal("timeout") {}

/**
 * Indicates that the function shell call exceeded its configured time limit.
 */
export class FunctionShellCallOutputTimeoutOutcome
  extends S.Class<FunctionShellCallOutputTimeoutOutcome>("FunctionShellCallOutputTimeoutOutcome")({
    /**
     * The outcome type. Always `timeout`.
     */
    "type": FunctionShellCallOutputTimeoutOutcomeType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "timeout" as const)
    )
  })
{}

/**
 * The outcome type. Always `exit`.
 */
export class FunctionShellCallOutputExitOutcomeType extends S.Literal("exit") {}

/**
 * Indicates that the shell commands finished and returned an exit code.
 */
export class FunctionShellCallOutputExitOutcome
  extends S.Class<FunctionShellCallOutputExitOutcome>("FunctionShellCallOutputExitOutcome")({
    /**
     * The outcome type. Always `exit`.
     */
    "type": FunctionShellCallOutputExitOutcomeType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "exit" as const)
    ),
    /**
     * Exit code from the shell process.
     */
    "exit_code": S.Int
  })
{}

/**
 * The content of a shell call output.
 */
export class FunctionShellCallOutputContent
  extends S.Class<FunctionShellCallOutputContent>("FunctionShellCallOutputContent")({
    "stdout": S.String,
    "stderr": S.String,
    /**
     * Represents either an exit outcome (with an exit code) or a timeout outcome for a shell call output chunk.
     */
    "outcome": S.Union(FunctionShellCallOutputTimeoutOutcome, FunctionShellCallOutputExitOutcome),
    "created_by": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * The output of a shell tool call.
 */
export class FunctionShellCallOutput extends S.Class<FunctionShellCallOutput>("FunctionShellCallOutput")({
  /**
   * The type of the shell call output. Always `shell_call_output`.
   */
  "type": FunctionShellCallOutputType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "shell_call_output" as const)
  ),
  /**
   * The unique ID of the shell call output. Populated when this item is returned via API.
   */
  "id": S.String,
  /**
   * The unique ID of the shell tool call generated by the model.
   */
  "call_id": S.String,
  /**
   * An array of shell call output contents
   */
  "output": S.Array(FunctionShellCallOutputContent),
  "max_output_length": S.NullOr(S.Int),
  "created_by": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The type of the item. Always `apply_patch_call`.
 */
export class ApplyPatchToolCallType extends S.Literal("apply_patch_call") {}

export class ApplyPatchCallStatus extends S.Literal("in_progress", "completed") {}

/**
 * Create a new file with the provided diff.
 */
export class ApplyPatchCreateFileOperationType extends S.Literal("create_file") {}

/**
 * Instruction describing how to create a file via the apply_patch tool.
 */
export class ApplyPatchCreateFileOperation
  extends S.Class<ApplyPatchCreateFileOperation>("ApplyPatchCreateFileOperation")({
    /**
     * Create a new file with the provided diff.
     */
    "type": ApplyPatchCreateFileOperationType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "create_file" as const)
    ),
    /**
     * Path of the file to create.
     */
    "path": S.String,
    /**
     * Diff to apply.
     */
    "diff": S.String
  })
{}

/**
 * Delete the specified file.
 */
export class ApplyPatchDeleteFileOperationType extends S.Literal("delete_file") {}

/**
 * Instruction describing how to delete a file via the apply_patch tool.
 */
export class ApplyPatchDeleteFileOperation
  extends S.Class<ApplyPatchDeleteFileOperation>("ApplyPatchDeleteFileOperation")({
    /**
     * Delete the specified file.
     */
    "type": ApplyPatchDeleteFileOperationType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "delete_file" as const)
    ),
    /**
     * Path of the file to delete.
     */
    "path": S.String
  })
{}

/**
 * Update an existing file with the provided diff.
 */
export class ApplyPatchUpdateFileOperationType extends S.Literal("update_file") {}

/**
 * Instruction describing how to update a file via the apply_patch tool.
 */
export class ApplyPatchUpdateFileOperation
  extends S.Class<ApplyPatchUpdateFileOperation>("ApplyPatchUpdateFileOperation")({
    /**
     * Update an existing file with the provided diff.
     */
    "type": ApplyPatchUpdateFileOperationType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "update_file" as const)
    ),
    /**
     * Path of the file to update.
     */
    "path": S.String,
    /**
     * Diff to apply.
     */
    "diff": S.String
  })
{}

/**
 * A tool call that applies file diffs by creating, deleting, or updating files.
 */
export class ApplyPatchToolCall extends S.Class<ApplyPatchToolCall>("ApplyPatchToolCall")({
  /**
   * The type of the item. Always `apply_patch_call`.
   */
  "type": ApplyPatchToolCallType.pipe(S.propertySignature, S.withConstructorDefault(() => "apply_patch_call" as const)),
  /**
   * The unique ID of the apply patch tool call. Populated when this item is returned via API.
   */
  "id": S.String,
  /**
   * The unique ID of the apply patch tool call generated by the model.
   */
  "call_id": S.String,
  /**
   * The status of the apply patch tool call. One of `in_progress` or `completed`.
   */
  "status": ApplyPatchCallStatus,
  /**
   * One of the create_file, delete_file, or update_file operations applied via apply_patch.
   */
  "operation": S.Union(ApplyPatchCreateFileOperation, ApplyPatchDeleteFileOperation, ApplyPatchUpdateFileOperation),
  /**
   * The ID of the entity that created this tool call.
   */
  "created_by": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The type of the item. Always `apply_patch_call_output`.
 */
export class ApplyPatchToolCallOutputType extends S.Literal("apply_patch_call_output") {}

export class ApplyPatchCallOutputStatus extends S.Literal("completed", "failed") {}

/**
 * The output emitted by an apply patch tool call.
 */
export class ApplyPatchToolCallOutput extends S.Class<ApplyPatchToolCallOutput>("ApplyPatchToolCallOutput")({
  /**
   * The type of the item. Always `apply_patch_call_output`.
   */
  "type": ApplyPatchToolCallOutputType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "apply_patch_call_output" as const)
  ),
  /**
   * The unique ID of the apply patch tool call output. Populated when this item is returned via API.
   */
  "id": S.String,
  /**
   * The unique ID of the apply patch tool call generated by the model.
   */
  "call_id": S.String,
  /**
   * The status of the apply patch tool call output. One of `completed` or `failed`.
   */
  "status": ApplyPatchCallOutputStatus,
  "output": S.optionalWith(S.String, { nullable: true }),
  /**
   * The ID of the entity that created this tool call output.
   */
  "created_by": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The type of the item. Always `mcp_list_tools`.
 */
export class MCPListToolsType extends S.Literal("mcp_list_tools") {}

/**
 * A tool available on an MCP server.
 */
export class MCPListToolsTool extends S.Class<MCPListToolsTool>("MCPListToolsTool")({
  /**
   * The name of the tool.
   */
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * The JSON schema describing the tool's input.
   */
  "input_schema": S.Record({ key: S.String, value: S.Unknown }),
  "annotations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * A list of tools available on an MCP server.
 */
export class MCPListTools extends S.Class<MCPListTools>("MCPListTools")({
  /**
   * The type of the item. Always `mcp_list_tools`.
   */
  "type": MCPListToolsType,
  /**
   * The unique ID of the list.
   */
  "id": S.String,
  /**
   * The label of the MCP server.
   */
  "server_label": S.String,
  /**
   * The tools available on the server.
   */
  "tools": S.Array(MCPListToolsTool),
  "error": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The type of the item. Always `mcp_approval_request`.
 */
export class MCPApprovalRequestType extends S.Literal("mcp_approval_request") {}

/**
 * A request for human approval of a tool invocation.
 */
export class MCPApprovalRequest extends S.Class<MCPApprovalRequest>("MCPApprovalRequest")({
  /**
   * The type of the item. Always `mcp_approval_request`.
   */
  "type": MCPApprovalRequestType,
  /**
   * The unique ID of the approval request.
   */
  "id": S.String,
  /**
   * The label of the MCP server making the request.
   */
  "server_label": S.String,
  /**
   * The name of the tool to run.
   */
  "name": S.String,
  /**
   * A JSON string of arguments for the tool.
   */
  "arguments": S.String
}) {}

/**
 * The type of the item. Always `mcp_approval_response`.
 */
export class MCPApprovalResponseResourceType extends S.Literal("mcp_approval_response") {}

/**
 * A response to an MCP approval request.
 */
export class MCPApprovalResponseResource extends S.Class<MCPApprovalResponseResource>("MCPApprovalResponseResource")({
  /**
   * The type of the item. Always `mcp_approval_response`.
   */
  "type": MCPApprovalResponseResourceType,
  /**
   * The unique ID of the approval response
   */
  "id": S.String,
  /**
   * The ID of the approval request being answered.
   */
  "approval_request_id": S.String,
  /**
   * Whether the request was approved.
   */
  "approve": S.Boolean,
  "reason": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The type of the item. Always `mcp_call`.
 */
export class MCPToolCallType extends S.Literal("mcp_call") {}

export class MCPToolCallStatus extends S.Literal("in_progress", "completed", "incomplete", "calling", "failed") {}

/**
 * An invocation of a tool on an MCP server.
 */
export class MCPToolCall extends S.Class<MCPToolCall>("MCPToolCall")({
  /**
   * The type of the item. Always `mcp_call`.
   */
  "type": MCPToolCallType,
  /**
   * The unique ID of the tool call.
   */
  "id": S.String,
  /**
   * The label of the MCP server running the tool.
   */
  "server_label": S.String,
  /**
   * The name of the tool that was run.
   */
  "name": S.String,
  /**
   * A JSON string of the arguments passed to the tool.
   */
  "arguments": S.String,
  "output": S.optionalWith(S.String, { nullable: true }),
  "error": S.optionalWith(S.String, { nullable: true }),
  /**
   * The status of the tool call. One of `in_progress`, `completed`, `incomplete`, `calling`, or `failed`.
   */
  "status": S.optionalWith(MCPToolCallStatus, { nullable: true }),
  "approval_request_id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The type of the custom tool call. Always `custom_tool_call`.
 */
export class CustomToolCallType extends S.Literal("custom_tool_call") {}

/**
 * A call to a custom tool created by the model.
 */
export class CustomToolCall extends S.Class<CustomToolCall>("CustomToolCall")({
  /**
   * The type of the custom tool call. Always `custom_tool_call`.
   */
  "type": CustomToolCallType,
  /**
   * The unique ID of the custom tool call in the OpenAI platform.
   */
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * An identifier used to map this custom tool call to a tool call output.
   */
  "call_id": S.String,
  /**
   * The name of the custom tool being called.
   */
  "name": S.String,
  /**
   * The input for the custom tool call generated by the model.
   */
  "input": S.String
}) {}

/**
 * The type of the custom tool call output. Always `custom_tool_call_output`.
 */
export class CustomToolCallOutputType extends S.Literal("custom_tool_call_output") {}

/**
 * The output of a custom tool call from your code, being sent back to the model.
 */
export class CustomToolCallOutput extends S.Class<CustomToolCallOutput>("CustomToolCallOutput")({
  /**
   * The type of the custom tool call output. Always `custom_tool_call_output`.
   */
  "type": CustomToolCallOutputType,
  /**
   * The unique ID of the custom tool call output in the OpenAI platform.
   */
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The call ID, used to map this custom tool call output to a custom tool call.
   */
  "call_id": S.String,
  /**
   * The output from the custom tool call generated by your code.
   * Can be a string or an list of output content.
   */
  "output": S.Union(
    /**
     * A string of the output of the custom tool call.
     */
    S.String,
    /**
     * Text, image, or file output of the custom tool call.
     */
    S.Array(FunctionAndCustomToolCallOutput)
  )
}) {}

/**
 * A single item within a conversation. The set of possible types are the same as the `output` type of a [Response object](https://platform.openai.com/docs/api-reference/responses/object#responses/object-output).
 */
export class ConversationItem extends S.Union(
  Message,
  FunctionToolCallResource,
  FunctionToolCallOutputResource,
  FileSearchToolCall,
  WebSearchToolCall,
  ImageGenToolCall,
  ComputerToolCall,
  ComputerToolCallOutputResource,
  ReasoningItem,
  CodeInterpreterToolCall,
  LocalShellToolCall,
  LocalShellToolCallOutput,
  FunctionShellCall,
  FunctionShellCallOutput,
  ApplyPatchToolCall,
  ApplyPatchToolCallOutput,
  MCPListTools,
  MCPApprovalRequest,
  MCPApprovalResponseResource,
  MCPToolCall,
  CustomToolCall,
  CustomToolCallOutput
) {}

/**
 * A list of Conversation items.
 */
export class ConversationItemList extends S.Class<ConversationItemList>("ConversationItemList")({
  /**
   * The type of object returned, must be `list`.
   */
  "object": S.Literal("list"),
  /**
   * A list of conversation items.
   */
  "data": S.Array(ConversationItem),
  /**
   * Whether there are more items available.
   */
  "has_more": S.Boolean,
  /**
   * The ID of the first item in the list.
   */
  "first_id": S.String,
  /**
   * The ID of the last item in the list.
   */
  "last_id": S.String
}) {}

export class CreateConversationItemsParams extends S.Struct({
  "include": S.optionalWith(S.Array(IncludeEnum), { nullable: true })
}) {}

/**
 * The role of the message input. One of `user`, `assistant`, `system`, or
 * `developer`.
 */
export class EasyInputMessageRole extends S.Literal("user", "assistant", "system", "developer") {}

export class InputContent extends S.Union(InputTextContent, InputImageContent, InputFileContent) {}

/**
 * A list of one or many input items to the model, containing different content
 * types.
 */
export class InputMessageContentList extends S.Array(InputContent) {}

/**
 * The type of the message input. Always `message`.
 */
export class EasyInputMessageType extends S.Literal("message") {}

/**
 * A message input to the model with a role indicating instruction following
 * hierarchy. Instructions given with the `developer` or `system` role take
 * precedence over instructions given with the `user` role. Messages with the
 * `assistant` role are presumed to have been generated by the model in previous
 * interactions.
 */
export class EasyInputMessage extends S.Class<EasyInputMessage>("EasyInputMessage")({
  /**
   * The role of the message input. One of `user`, `assistant`, `system`, or
   * `developer`.
   */
  "role": EasyInputMessageRole,
  /**
   * Text, image, or audio input to the model, used to generate a response.
   * Can also contain previous assistant responses.
   */
  "content": S.Union(
    /**
     * A text input to the model.
     */
    S.String,
    InputMessageContentList
  ),
  /**
   * The type of the message input. Always `message`.
   */
  "type": S.optionalWith(EasyInputMessageType, { nullable: true })
}) {}

/**
 * The type of the message input. Always set to `message`.
 */
export class InputMessageType extends S.Literal("message") {}

/**
 * The role of the message input. One of `user`, `system`, or `developer`.
 */
export class InputMessageRole extends S.Literal("user", "system", "developer") {}

/**
 * The status of item. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when items are returned via API.
 */
export class InputMessageStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A message input to the model with a role indicating instruction following
 * hierarchy. Instructions given with the `developer` or `system` role take
 * precedence over instructions given with the `user` role.
 */
export class InputMessage extends S.Class<InputMessage>("InputMessage")({
  /**
   * The type of the message input. Always set to `message`.
   */
  "type": S.optionalWith(InputMessageType, { nullable: true }),
  /**
   * The role of the message input. One of `user`, `system`, or `developer`.
   */
  "role": InputMessageRole,
  /**
   * The status of item. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when items are returned via API.
   */
  "status": S.optionalWith(InputMessageStatus, { nullable: true }),
  "content": InputMessageContentList
}) {}

/**
 * The type of the output message. Always `message`.
 */
export class OutputMessageType extends S.Literal("message") {}

/**
 * The role of the output message. Always `assistant`.
 */
export class OutputMessageRole extends S.Literal("assistant") {}

export class OutputMessageContent extends S.Union(OutputTextContent, RefusalContent) {}

/**
 * The status of the message input. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when input items are returned via API.
 */
export class OutputMessageStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * An output message from the model.
 */
export class OutputMessage extends S.Class<OutputMessage>("OutputMessage")({
  /**
   * The unique ID of the output message.
   */
  "id": S.String,
  /**
   * The type of the output message. Always `message`.
   */
  "type": OutputMessageType,
  /**
   * The role of the output message. Always `assistant`.
   */
  "role": OutputMessageRole,
  /**
   * The content of the output message.
   */
  "content": S.Array(OutputMessageContent),
  /**
   * The status of the message input. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when input items are returned via API.
   */
  "status": OutputMessageStatus
}) {}

/**
 * The type of the computer tool call output. Always `computer_call_output`.
 */
export class ComputerCallOutputItemParamType extends S.Literal("computer_call_output") {}

export class FunctionCallItemStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * The output of a computer tool call.
 */
export class ComputerCallOutputItemParam extends S.Class<ComputerCallOutputItemParam>("ComputerCallOutputItemParam")({
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The ID of the computer tool call that produced the output.
   */
  "call_id": S.String.pipe(S.minLength(1), S.maxLength(64)),
  /**
   * The type of the computer tool call output. Always `computer_call_output`.
   */
  "type": ComputerCallOutputItemParamType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "computer_call_output" as const)
  ),
  "output": ComputerScreenshotImage,
  "acknowledged_safety_checks": S.optionalWith(S.Array(ComputerCallSafetyCheckParam), { nullable: true }),
  "status": S.optionalWith(FunctionCallItemStatus, { nullable: true })
}) {}

/**
 * The type of the function tool call. Always `function_call`.
 */
export class FunctionToolCallType extends S.Literal("function_call") {}

/**
 * The status of the item. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when items are returned via API.
 */
export class FunctionToolCallStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A tool call to run a function. See the
 * [function calling guide](https://platform.openai.com/docs/guides/function-calling) for more information.
 */
export class FunctionToolCall extends S.Class<FunctionToolCall>("FunctionToolCall")({
  /**
   * The unique ID of the function tool call.
   */
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The type of the function tool call. Always `function_call`.
   */
  "type": FunctionToolCallType,
  /**
   * The unique ID of the function tool call generated by the model.
   */
  "call_id": S.String,
  /**
   * The name of the function to run.
   */
  "name": S.String,
  /**
   * A JSON string of the arguments to pass to the function.
   */
  "arguments": S.String,
  /**
   * The status of the item. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when items are returned via API.
   */
  "status": S.optionalWith(FunctionToolCallStatus, { nullable: true })
}) {}

/**
 * The type of the function tool call output. Always `function_call_output`.
 */
export class FunctionCallOutputItemParamType extends S.Literal("function_call_output") {}

/**
 * The type of the input item. Always `input_text`.
 */
export class InputTextContentParamType extends S.Literal("input_text") {}

/**
 * A text input to the model.
 */
export class InputTextContentParam extends S.Class<InputTextContentParam>("InputTextContentParam")({
  /**
   * The type of the input item. Always `input_text`.
   */
  "type": InputTextContentParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "input_text" as const)),
  /**
   * The text input to the model.
   */
  "text": S.String.pipe(S.maxLength(10485760))
}) {}

/**
 * The type of the input item. Always `input_image`.
 */
export class InputImageContentParamAutoParamType extends S.Literal("input_image") {}

export class DetailEnum extends S.Literal("low", "high", "auto") {}

/**
 * An image input to the model. Learn about [image inputs](https://platform.openai.com/docs/guides/vision)
 */
export class InputImageContentParamAutoParam
  extends S.Class<InputImageContentParamAutoParam>("InputImageContentParamAutoParam")({
    /**
     * The type of the input item. Always `input_image`.
     */
    "type": InputImageContentParamAutoParamType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "input_image" as const)
    ),
    "image_url": S.optionalWith(S.String.pipe(S.maxLength(20971520)), { nullable: true }),
    "file_id": S.optionalWith(S.String, { nullable: true }),
    "detail": S.optionalWith(DetailEnum, { nullable: true })
  })
{}

/**
 * The type of the input item. Always `input_file`.
 */
export class InputFileContentParamType extends S.Literal("input_file") {}

/**
 * A file input to the model.
 */
export class InputFileContentParam extends S.Class<InputFileContentParam>("InputFileContentParam")({
  /**
   * The type of the input item. Always `input_file`.
   */
  "type": InputFileContentParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "input_file" as const)),
  "file_id": S.optionalWith(S.String, { nullable: true }),
  "filename": S.optionalWith(S.String, { nullable: true }),
  "file_data": S.optionalWith(S.String.pipe(S.maxLength(33554432)), { nullable: true }),
  "file_url": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The output of a function tool call.
 */
export class FunctionCallOutputItemParam extends S.Class<FunctionCallOutputItemParam>("FunctionCallOutputItemParam")({
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The unique ID of the function tool call generated by the model.
   */
  "call_id": S.String.pipe(S.minLength(1), S.maxLength(64)),
  /**
   * The type of the function tool call output. Always `function_call_output`.
   */
  "type": FunctionCallOutputItemParamType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "function_call_output" as const)
  ),
  /**
   * Text, image, or file output of the function tool call.
   */
  "output": S.Union(
    /**
     * A JSON string of the output of the function tool call.
     */
    S.String.pipe(S.maxLength(10485760)),
    S.Array(S.Union(InputTextContentParam, InputImageContentParamAutoParam, InputFileContentParam))
  ),
  "status": S.optionalWith(FunctionCallItemStatus, { nullable: true })
}) {}

/**
 * The type of the item. Always `function_shell_call`.
 */
export class FunctionShellCallItemParamType extends S.Literal("shell_call") {}

/**
 * Commands and limits describing how to run the function shell tool call.
 */
export class FunctionShellActionParam extends S.Class<FunctionShellActionParam>("FunctionShellActionParam")({
  /**
   * Ordered shell commands for the execution environment to run.
   */
  "commands": S.Array(S.String),
  "timeout_ms": S.optionalWith(S.Int, { nullable: true }),
  "max_output_length": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * Status values reported for function shell tool calls.
 */
export class FunctionShellCallItemStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A tool representing a request to execute one or more shell commands.
 */
export class FunctionShellCallItemParam extends S.Class<FunctionShellCallItemParam>("FunctionShellCallItemParam")({
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The unique ID of the function shell tool call generated by the model.
   */
  "call_id": S.String.pipe(S.minLength(1), S.maxLength(64)),
  /**
   * The type of the item. Always `function_shell_call`.
   */
  "type": FunctionShellCallItemParamType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "shell_call" as const)
  ),
  /**
   * The shell commands and limits that describe how to run the tool call.
   */
  "action": FunctionShellActionParam,
  "status": S.optionalWith(FunctionShellCallItemStatus, { nullable: true })
}) {}

/**
 * The type of the item. Always `function_shell_call_output`.
 */
export class FunctionShellCallOutputItemParamType extends S.Literal("shell_call_output") {}

/**
 * The outcome type. Always `timeout`.
 */
export class FunctionShellCallOutputTimeoutOutcomeParamType extends S.Literal("timeout") {}

/**
 * Indicates that the function shell call exceeded its configured time limit.
 */
export class FunctionShellCallOutputTimeoutOutcomeParam
  extends S.Class<FunctionShellCallOutputTimeoutOutcomeParam>("FunctionShellCallOutputTimeoutOutcomeParam")({
    /**
     * The outcome type. Always `timeout`.
     */
    "type": FunctionShellCallOutputTimeoutOutcomeParamType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "timeout" as const)
    )
  })
{}

/**
 * The outcome type. Always `exit`.
 */
export class FunctionShellCallOutputExitOutcomeParamType extends S.Literal("exit") {}

/**
 * Indicates that the shell commands finished and returned an exit code.
 */
export class FunctionShellCallOutputExitOutcomeParam
  extends S.Class<FunctionShellCallOutputExitOutcomeParam>("FunctionShellCallOutputExitOutcomeParam")({
    /**
     * The outcome type. Always `exit`.
     */
    "type": FunctionShellCallOutputExitOutcomeParamType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "exit" as const)
    ),
    /**
     * The exit code returned by the shell process.
     */
    "exit_code": S.Int
  })
{}

/**
 * The exit or timeout outcome associated with this chunk.
 */
export class FunctionShellCallOutputOutcomeParam
  extends S.Union(FunctionShellCallOutputTimeoutOutcomeParam, FunctionShellCallOutputExitOutcomeParam)
{}

/**
 * Captured stdout and stderr for a portion of a function shell tool call output.
 */
export class FunctionShellCallOutputContentParam
  extends S.Class<FunctionShellCallOutputContentParam>("FunctionShellCallOutputContentParam")({
    /**
     * Captured stdout output for this chunk of the shell call.
     */
    "stdout": S.String.pipe(S.maxLength(10485760)),
    /**
     * Captured stderr output for this chunk of the shell call.
     */
    "stderr": S.String.pipe(S.maxLength(10485760)),
    /**
     * The exit or timeout outcome associated with this chunk.
     */
    "outcome": FunctionShellCallOutputOutcomeParam
  })
{}

/**
 * The streamed output items emitted by a function shell tool call.
 */
export class FunctionShellCallOutputItemParam
  extends S.Class<FunctionShellCallOutputItemParam>("FunctionShellCallOutputItemParam")({
    "id": S.optionalWith(S.String, { nullable: true }),
    /**
     * The unique ID of the function shell tool call generated by the model.
     */
    "call_id": S.String.pipe(S.minLength(1), S.maxLength(64)),
    /**
     * The type of the item. Always `function_shell_call_output`.
     */
    "type": FunctionShellCallOutputItemParamType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "shell_call_output" as const)
    ),
    /**
     * Captured chunks of stdout and stderr output, along with their associated outcomes.
     */
    "output": S.Array(FunctionShellCallOutputContentParam),
    "max_output_length": S.optionalWith(S.Int, { nullable: true })
  })
{}

/**
 * The type of the item. Always `apply_patch_call`.
 */
export class ApplyPatchToolCallItemParamType extends S.Literal("apply_patch_call") {}

/**
 * Status values reported for apply_patch tool calls.
 */
export class ApplyPatchCallStatusParam extends S.Literal("in_progress", "completed") {}

/**
 * The operation type. Always `create_file`.
 */
export class ApplyPatchCreateFileOperationParamType extends S.Literal("create_file") {}

/**
 * Instruction for creating a new file via the apply_patch tool.
 */
export class ApplyPatchCreateFileOperationParam
  extends S.Class<ApplyPatchCreateFileOperationParam>("ApplyPatchCreateFileOperationParam")({
    /**
     * The operation type. Always `create_file`.
     */
    "type": ApplyPatchCreateFileOperationParamType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "create_file" as const)
    ),
    /**
     * Path of the file to create relative to the workspace root.
     */
    "path": S.String.pipe(S.minLength(1)),
    /**
     * Unified diff content to apply when creating the file.
     */
    "diff": S.String.pipe(S.maxLength(10485760))
  })
{}

/**
 * The operation type. Always `delete_file`.
 */
export class ApplyPatchDeleteFileOperationParamType extends S.Literal("delete_file") {}

/**
 * Instruction for deleting an existing file via the apply_patch tool.
 */
export class ApplyPatchDeleteFileOperationParam
  extends S.Class<ApplyPatchDeleteFileOperationParam>("ApplyPatchDeleteFileOperationParam")({
    /**
     * The operation type. Always `delete_file`.
     */
    "type": ApplyPatchDeleteFileOperationParamType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "delete_file" as const)
    ),
    /**
     * Path of the file to delete relative to the workspace root.
     */
    "path": S.String.pipe(S.minLength(1))
  })
{}

/**
 * The operation type. Always `update_file`.
 */
export class ApplyPatchUpdateFileOperationParamType extends S.Literal("update_file") {}

/**
 * Instruction for updating an existing file via the apply_patch tool.
 */
export class ApplyPatchUpdateFileOperationParam
  extends S.Class<ApplyPatchUpdateFileOperationParam>("ApplyPatchUpdateFileOperationParam")({
    /**
     * The operation type. Always `update_file`.
     */
    "type": ApplyPatchUpdateFileOperationParamType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "update_file" as const)
    ),
    /**
     * Path of the file to update relative to the workspace root.
     */
    "path": S.String.pipe(S.minLength(1)),
    /**
     * Unified diff content to apply to the existing file.
     */
    "diff": S.String.pipe(S.maxLength(10485760))
  })
{}

/**
 * One of the create_file, delete_file, or update_file operations supplied to the apply_patch tool.
 */
export class ApplyPatchOperationParam extends S.Union(
  ApplyPatchCreateFileOperationParam,
  ApplyPatchDeleteFileOperationParam,
  ApplyPatchUpdateFileOperationParam
) {}

/**
 * A tool call representing a request to create, delete, or update files using diff patches.
 */
export class ApplyPatchToolCallItemParam extends S.Class<ApplyPatchToolCallItemParam>("ApplyPatchToolCallItemParam")({
  /**
   * The type of the item. Always `apply_patch_call`.
   */
  "type": ApplyPatchToolCallItemParamType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "apply_patch_call" as const)
  ),
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The unique ID of the apply patch tool call generated by the model.
   */
  "call_id": S.String.pipe(S.minLength(1), S.maxLength(64)),
  /**
   * The status of the apply patch tool call. One of `in_progress` or `completed`.
   */
  "status": ApplyPatchCallStatusParam,
  /**
   * The specific create, delete, or update instruction for the apply_patch tool call.
   */
  "operation": ApplyPatchOperationParam
}) {}

/**
 * The type of the item. Always `apply_patch_call_output`.
 */
export class ApplyPatchToolCallOutputItemParamType extends S.Literal("apply_patch_call_output") {}

/**
 * Outcome values reported for apply_patch tool call outputs.
 */
export class ApplyPatchCallOutputStatusParam extends S.Literal("completed", "failed") {}

/**
 * The streamed output emitted by an apply patch tool call.
 */
export class ApplyPatchToolCallOutputItemParam
  extends S.Class<ApplyPatchToolCallOutputItemParam>("ApplyPatchToolCallOutputItemParam")({
    /**
     * The type of the item. Always `apply_patch_call_output`.
     */
    "type": ApplyPatchToolCallOutputItemParamType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "apply_patch_call_output" as const)
    ),
    "id": S.optionalWith(S.String, { nullable: true }),
    /**
     * The unique ID of the apply patch tool call generated by the model.
     */
    "call_id": S.String.pipe(S.minLength(1), S.maxLength(64)),
    /**
     * The status of the apply patch tool call output. One of `completed` or `failed`.
     */
    "status": ApplyPatchCallOutputStatusParam,
    "output": S.optionalWith(S.String.pipe(S.maxLength(10485760)), { nullable: true })
  })
{}

/**
 * The type of the item. Always `mcp_approval_response`.
 */
export class MCPApprovalResponseType extends S.Literal("mcp_approval_response") {}

/**
 * A response to an MCP approval request.
 */
export class MCPApprovalResponse extends S.Class<MCPApprovalResponse>("MCPApprovalResponse")({
  /**
   * The type of the item. Always `mcp_approval_response`.
   */
  "type": MCPApprovalResponseType,
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The ID of the approval request being answered.
   */
  "approval_request_id": S.String,
  /**
   * Whether the request was approved.
   */
  "approve": S.Boolean,
  "reason": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Content item used to generate a response.
 */
export class Item extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * The type of item to reference. Always `item_reference`.
 */
export class ItemReferenceParamTypeEnum extends S.Literal("item_reference") {}

/**
 * An internal identifier for an item to reference.
 */
export class ItemReferenceParam extends S.Class<ItemReferenceParam>("ItemReferenceParam")({
  "type": S.optionalWith(ItemReferenceParamTypeEnum, { nullable: true }),
  /**
   * The ID of the item to reference.
   */
  "id": S.String
}) {}

export class InputItem extends S.Union(
  EasyInputMessage,
  /**
   * An item representing part of the context for the response to be
   * generated by the model. Can contain text, images, and audio inputs,
   * as well as previous assistant responses and tool call outputs.
   */
  S.Record({ key: S.String, value: S.Unknown }),
  ItemReferenceParam
) {}

export class CreateConversationItemsRequest
  extends S.Class<CreateConversationItemsRequest>("CreateConversationItemsRequest")({
    /**
     * The items to add to the conversation. You may add up to 20 items at a time.
     */
    "items": S.Array(InputItem).pipe(S.maxItems(20))
  })
{}

export class GetConversationItemParams extends S.Struct({
  "include": S.optionalWith(S.Array(IncludeEnum), { nullable: true })
}) {}

/**
 * The object type, which is always `conversation`.
 */
export class ConversationResourceObject extends S.Literal("conversation") {}

export class ConversationResource extends S.Class<ConversationResource>("ConversationResource")({
  /**
   * The unique ID of the conversation.
   */
  "id": S.String,
  /**
   * The object type, which is always `conversation`.
   */
  "object": ConversationResourceObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "conversation" as const)
  ),
  /**
   * The time at which the conversation was created, measured in seconds since the Unix epoch.
   */
  "created_at": S.Int
}) {}

export class CreateEmbeddingRequestModelEnum
  extends S.Literal("text-embedding-ada-002", "text-embedding-3-small", "text-embedding-3-large")
{}

/**
 * The format to return the embeddings in. Can be either `float` or [`base64`](https://pypi.org/project/pybase64/).
 */
export class CreateEmbeddingRequestEncodingFormat extends S.Literal("float", "base64") {}

export class CreateEmbeddingRequest extends S.Class<CreateEmbeddingRequest>("CreateEmbeddingRequest")({
  /**
   * Input text to embed, encoded as a string or array of tokens. To embed multiple inputs in a single request, pass an array of strings or array of token arrays. The input must not exceed the max input tokens for the model (8192 tokens for all embedding models), cannot be an empty string, and any array must be 2048 dimensions or less. [Example Python code](https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken) for counting tokens. In addition to the per-input token limit, all embedding  models enforce a maximum of 300,000 tokens summed across all inputs in a  single request.
   */
  "input": S.Union(
    /**
     * The string that will be turned into an embedding.
     */
    S.String,
    /**
     * The array of strings that will be turned into an embedding.
     */
    S.NonEmptyArray(S.String).pipe(S.minItems(1), S.maxItems(2048)),
    /**
     * The array of integers that will be turned into an embedding.
     */
    S.NonEmptyArray(S.Int).pipe(S.minItems(1), S.maxItems(2048)),
    /**
     * The array of arrays containing integers that will be turned into an embedding.
     */
    S.NonEmptyArray(S.NonEmptyArray(S.Int).pipe(S.minItems(1))).pipe(S.minItems(1), S.maxItems(2048))
  ),
  /**
   * ID of the model to use. You can use the [List models](https://platform.openai.com/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](https://platform.openai.com/docs/models) for descriptions of them.
   */
  "model": S.Union(S.String, CreateEmbeddingRequestModelEnum),
  /**
   * The format to return the embeddings in. Can be either `float` or [`base64`](https://pypi.org/project/pybase64/).
   */
  "encoding_format": S.optionalWith(CreateEmbeddingRequestEncodingFormat, {
    nullable: true,
    default: () => "float" as const
  }),
  /**
   * The number of dimensions the resulting output embeddings should have. Only supported in `text-embedding-3` and later models.
   */
  "dimensions": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids).
   */
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always "embedding".
 */
export class EmbeddingObject extends S.Literal("embedding") {}

/**
 * Represents an embedding vector returned by embedding endpoint.
 */
export class Embedding extends S.Class<Embedding>("Embedding")({
  /**
   * The index of the embedding in the list of embeddings.
   */
  "index": S.Int,
  /**
   * The embedding vector, which is a list of floats. The length of vector depends on the model as listed in the [embedding guide](https://platform.openai.com/docs/guides/embeddings).
   */
  "embedding": S.Array(S.Number),
  /**
   * The object type, which is always "embedding".
   */
  "object": EmbeddingObject
}) {}

/**
 * The object type, which is always "list".
 */
export class CreateEmbeddingResponseObject extends S.Literal("list") {}

export class CreateEmbeddingResponse extends S.Class<CreateEmbeddingResponse>("CreateEmbeddingResponse")({
  /**
   * The list of embeddings generated by the model.
   */
  "data": S.Array(Embedding),
  /**
   * The name of the model used to generate the embedding.
   */
  "model": S.String,
  /**
   * The object type, which is always "list".
   */
  "object": CreateEmbeddingResponseObject,
  /**
   * The usage information for the request.
   */
  "usage": S.Struct({
    /**
     * The number of tokens used by the prompt.
     */
    "prompt_tokens": S.Int,
    /**
     * The total number of tokens used by the request.
     */
    "total_tokens": S.Int
  })
}) {}

export class ListEvalsParamsOrder extends S.Literal("asc", "desc") {}

export class ListEvalsParamsOrderBy extends S.Literal("created_at", "updated_at") {}

export class ListEvalsParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListEvalsParamsOrder, { nullable: true, default: () => "asc" as const }),
  "order_by": S.optionalWith(ListEvalsParamsOrderBy, { nullable: true, default: () => "created_at" as const })
}) {}

/**
 * The type of this object. It is always set to "list".
 */
export class EvalListObject extends S.Literal("list") {}

/**
 * The object type.
 */
export class EvalObject extends S.Literal("eval") {}

/**
 * The type of data source. Always `custom`.
 */
export class EvalCustomDataSourceConfigType extends S.Literal("custom") {}

/**
 * A CustomDataSourceConfig which specifies the schema of your `item` and optionally `sample` namespaces.
 * The response schema defines the shape of the data that will be:
 * - Used to define your testing criteria and
 * - What data is required when creating a run
 */
export class EvalCustomDataSourceConfig extends S.Class<EvalCustomDataSourceConfig>("EvalCustomDataSourceConfig")({
  /**
   * The type of data source. Always `custom`.
   */
  "type": EvalCustomDataSourceConfigType.pipe(S.propertySignature, S.withConstructorDefault(() => "custom" as const)),
  /**
   * The json schema for the run data source items.
   * Learn how to build JSON schemas [here](https://json-schema.org/).
   */
  "schema": S.Record({ key: S.String, value: S.Unknown })
}) {}

/**
 * The type of data source. Always `logs`.
 */
export class EvalLogsDataSourceConfigType extends S.Literal("logs") {}

/**
 * A LogsDataSourceConfig which specifies the metadata property of your logs query.
 * This is usually metadata like `usecase=chatbot` or `prompt-version=v2`, etc.
 * The schema returned by this data source config is used to defined what variables are available in your evals.
 * `item` and `sample` are both defined when using this data source config.
 */
export class EvalLogsDataSourceConfig extends S.Class<EvalLogsDataSourceConfig>("EvalLogsDataSourceConfig")({
  /**
   * The type of data source. Always `logs`.
   */
  "type": EvalLogsDataSourceConfigType.pipe(S.propertySignature, S.withConstructorDefault(() => "logs" as const)),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * The json schema for the run data source items.
   * Learn how to build JSON schemas [here](https://json-schema.org/).
   */
  "schema": S.Record({ key: S.String, value: S.Unknown })
}) {}

/**
 * The type of data source. Always `stored_completions`.
 */
export class EvalStoredCompletionsDataSourceConfigType extends S.Literal("stored_completions") {}

/**
 * Deprecated in favor of LogsDataSourceConfig.
 */
export class EvalStoredCompletionsDataSourceConfig
  extends S.Class<EvalStoredCompletionsDataSourceConfig>("EvalStoredCompletionsDataSourceConfig")({
    /**
     * The type of data source. Always `stored_completions`.
     */
    "type": EvalStoredCompletionsDataSourceConfigType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "stored_completions" as const)
    ),
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
    /**
     * The json schema for the run data source items.
     * Learn how to build JSON schemas [here](https://json-schema.org/).
     */
    "schema": S.Record({ key: S.String, value: S.Unknown })
  })
{}

/**
 * The object type, which is always `label_model`.
 */
export class EvalGraderLabelModelType extends S.Literal("label_model") {}

/**
 * The role of the message input. One of `user`, `assistant`, `system`, or
 * `developer`.
 */
export class EvalItemRole extends S.Literal("user", "assistant", "system", "developer") {}

/**
 * The type of the image input. Always `input_image`.
 */
export class EvalItemContentEnumType extends S.Literal("input_image") {}

/**
 * The type of the input item. Always `input_audio`.
 */
export class InputAudioType extends S.Literal("input_audio") {}

/**
 * The format of the audio data. Currently supported formats are `mp3` and
 * `wav`.
 */
export class InputAudioInputAudioFormat extends S.Literal("mp3", "wav") {}

/**
 * An audio input to the model.
 */
export class InputAudio extends S.Class<InputAudio>("InputAudio")({
  /**
   * The type of the input item. Always `input_audio`.
   */
  "type": InputAudioType,
  "input_audio": S.Struct({
    /**
     * Base64-encoded audio data.
     */
    "data": S.String,
    /**
     * The format of the audio data. Currently supported formats are `mp3` and
     * `wav`.
     */
    "format": InputAudioInputAudioFormat
  })
}) {}

/**
 * The type of the message input. Always `message`.
 */
export class EvalItemType extends S.Literal("message") {}

/**
 * A message input to the model with a role indicating instruction following
 * hierarchy. Instructions given with the `developer` or `system` role take
 * precedence over instructions given with the `user` role. Messages with the
 * `assistant` role are presumed to have been generated by the model in previous
 * interactions.
 */
export class EvalItem extends S.Class<EvalItem>("EvalItem")({
  /**
   * The role of the message input. One of `user`, `assistant`, `system`, or
   * `developer`.
   */
  "role": EvalItemRole,
  /**
   * Inputs to the model - can contain template strings.
   */
  "content": S.Union(
    /**
     * A text input to the model.
     */
    S.String,
    InputTextContent,
    /**
     * A text output from the model.
     */
    S.Struct({
      /**
       * The type of the output text. Always `output_text`.
       */
      "type": EvalItemContentEnumType,
      /**
       * The text output from the model.
       */
      "text": S.String
    }),
    /**
     * An image input to the model.
     */
    S.Struct({
      /**
       * The type of the image input. Always `input_image`.
       */
      "type": EvalItemContentEnumType,
      /**
       * The URL of the image input.
       */
      "image_url": S.String,
      /**
       * The detail level of the image to be sent to the model. One of `high`, `low`, or `auto`. Defaults to `auto`.
       */
      "detail": S.optionalWith(S.String, { nullable: true })
    }),
    InputAudio
  ),
  /**
   * The type of the message input. Always `message`.
   */
  "type": S.optionalWith(EvalItemType, { nullable: true })
}) {}

/**
 * A LabelModelGrader object which uses a model to assign labels to each item
 * in the evaluation.
 */
export class EvalGraderLabelModel extends S.Class<EvalGraderLabelModel>("EvalGraderLabelModel")({
  /**
   * The object type, which is always `label_model`.
   */
  "type": EvalGraderLabelModelType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The model to use for the evaluation. Must support structured outputs.
   */
  "model": S.String,
  "input": S.Array(EvalItem),
  /**
   * The labels to assign to each item in the evaluation.
   */
  "labels": S.Array(S.String),
  /**
   * The labels that indicate a passing result. Must be a subset of labels.
   */
  "passing_labels": S.Array(S.String)
}) {}

/**
 * The object type, which is always `string_check`.
 */
export class EvalGraderStringCheckType extends S.Literal("string_check") {}

/**
 * The string check operation to perform. One of `eq`, `ne`, `like`, or `ilike`.
 */
export class EvalGraderStringCheckOperation extends S.Literal("eq", "ne", "like", "ilike") {}

/**
 * A StringCheckGrader object that performs a string comparison between input and reference using a specified operation.
 */
export class EvalGraderStringCheck extends S.Class<EvalGraderStringCheck>("EvalGraderStringCheck")({
  /**
   * The object type, which is always `string_check`.
   */
  "type": EvalGraderStringCheckType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The input text. This may include template strings.
   */
  "input": S.String,
  /**
   * The reference text. This may include template strings.
   */
  "reference": S.String,
  /**
   * The string check operation to perform. One of `eq`, `ne`, `like`, or `ilike`.
   */
  "operation": EvalGraderStringCheckOperation
}) {}

/**
 * The type of grader.
 */
export class EvalGraderTextSimilarityType extends S.Literal("text_similarity") {}

/**
 * The evaluation metric to use. One of `cosine`, `fuzzy_match`, `bleu`,
 * `gleu`, `meteor`, `rouge_1`, `rouge_2`, `rouge_3`, `rouge_4`, `rouge_5`,
 * or `rouge_l`.
 */
export class EvalGraderTextSimilarityEvaluationMetric extends S.Literal(
  "cosine",
  "fuzzy_match",
  "bleu",
  "gleu",
  "meteor",
  "rouge_1",
  "rouge_2",
  "rouge_3",
  "rouge_4",
  "rouge_5",
  "rouge_l"
) {}

/**
 * A TextSimilarityGrader object which grades text based on similarity metrics.
 */
export class EvalGraderTextSimilarity extends S.Class<EvalGraderTextSimilarity>("EvalGraderTextSimilarity")({
  /**
   * The threshold for the score.
   */
  "pass_threshold": S.Number,
  /**
   * The type of grader.
   */
  "type": EvalGraderTextSimilarityType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "text_similarity" as const)
  ),
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The text being graded.
   */
  "input": S.String,
  /**
   * The text being graded against.
   */
  "reference": S.String,
  /**
   * The evaluation metric to use. One of `cosine`, `fuzzy_match`, `bleu`,
   * `gleu`, `meteor`, `rouge_1`, `rouge_2`, `rouge_3`, `rouge_4`, `rouge_5`,
   * or `rouge_l`.
   */
  "evaluation_metric": EvalGraderTextSimilarityEvaluationMetric
}) {}

/**
 * The object type, which is always `python`.
 */
export class EvalGraderPythonType extends S.Literal("python") {}

/**
 * A PythonGrader object that runs a python script on the input.
 */
export class EvalGraderPython extends S.Class<EvalGraderPython>("EvalGraderPython")({
  /**
   * The threshold for the score.
   */
  "pass_threshold": S.optionalWith(S.Number, { nullable: true }),
  /**
   * The object type, which is always `python`.
   */
  "type": EvalGraderPythonType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The source code of the python script.
   */
  "source": S.String,
  /**
   * The image tag to use for the python script.
   */
  "image_tag": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always `score_model`.
 */
export class EvalGraderScoreModelType extends S.Literal("score_model") {}

/**
 * A ScoreModelGrader object that uses a model to assign a score to the input.
 */
export class EvalGraderScoreModel extends S.Class<EvalGraderScoreModel>("EvalGraderScoreModel")({
  /**
   * The threshold for the score.
   */
  "pass_threshold": S.optionalWith(S.Number, { nullable: true }),
  /**
   * The object type, which is always `score_model`.
   */
  "type": EvalGraderScoreModelType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The model to use for the evaluation.
   */
  "model": S.String,
  /**
   * The sampling parameters for the model.
   */
  "sampling_params": S.optionalWith(
    S.Struct({
      "seed": S.optionalWith(S.Int, { nullable: true }),
      "top_p": S.optionalWith(S.Number, { nullable: true }),
      "temperature": S.optionalWith(S.Number, { nullable: true }),
      "max_completions_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
      "reasoning_effort": S.optionalWith(S.Literal("none", "minimal", "low", "medium", "high"), { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The input text. This may include template strings.
   */
  "input": S.Array(EvalItem),
  /**
   * The range of the score. Defaults to `[0, 1]`.
   */
  "range": S.optionalWith(S.Array(S.Number), { nullable: true })
}) {}

/**
 * An Eval object with a data source config and testing criteria.
 * An Eval represents a task to be done for your LLM integration.
 * Like:
 *  - Improve the quality of my chatbot
 *  - See how well my chatbot handles customer support
 *  - Check if o4-mini is better at my usecase than gpt-4o
 */
export class Eval extends S.Class<Eval>("Eval")({
  /**
   * The object type.
   */
  "object": EvalObject.pipe(S.propertySignature, S.withConstructorDefault(() => "eval" as const)),
  /**
   * Unique identifier for the evaluation.
   */
  "id": S.String,
  /**
   * The name of the evaluation.
   */
  "name": S.String,
  /**
   * Configuration of data sources used in runs of the evaluation.
   */
  "data_source_config": S.Record({ key: S.String, value: S.Unknown }),
  /**
   * A list of testing criteria.
   */
  "testing_criteria": S.Array(
    S.Union(
      EvalGraderLabelModel,
      EvalGraderStringCheck,
      EvalGraderTextSimilarity,
      EvalGraderPython,
      EvalGraderScoreModel
    )
  ),
  /**
   * The Unix timestamp (in seconds) for when the eval was created.
   */
  "created_at": S.Int,
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown }))
}) {}

/**
 * An object representing a list of evals.
 */
export class EvalList extends S.Class<EvalList>("EvalList")({
  /**
   * The type of this object. It is always set to "list".
   */
  "object": EvalListObject.pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  /**
   * An array of eval objects.
   */
  "data": S.Array(Eval),
  /**
   * The identifier of the first eval in the data array.
   */
  "first_id": S.String,
  /**
   * The identifier of the last eval in the data array.
   */
  "last_id": S.String,
  /**
   * Indicates whether there are more evals available.
   */
  "has_more": S.Boolean
}) {}

/**
 * The type of data source. Always `custom`.
 */
export class CreateEvalCustomDataSourceConfigType extends S.Literal("custom") {}

/**
 * A CustomDataSourceConfig object that defines the schema for the data source used for the evaluation runs.
 * This schema is used to define the shape of the data that will be:
 * - Used to define your testing criteria and
 * - What data is required when creating a run
 */
export class CreateEvalCustomDataSourceConfig
  extends S.Class<CreateEvalCustomDataSourceConfig>("CreateEvalCustomDataSourceConfig")({
    /**
     * The type of data source. Always `custom`.
     */
    "type": CreateEvalCustomDataSourceConfigType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "custom" as const)
    ),
    /**
     * The json schema for each row in the data source.
     */
    "item_schema": S.Record({ key: S.String, value: S.Unknown }),
    /**
     * Whether the eval should expect you to populate the sample namespace (ie, by generating responses off of your data source)
     */
    "include_sample_schema": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
  })
{}

/**
 * The type of data source. Always `logs`.
 */
export class CreateEvalLogsDataSourceConfigType extends S.Literal("logs") {}

/**
 * A data source config which specifies the metadata property of your logs query.
 * This is usually metadata like `usecase=chatbot` or `prompt-version=v2`, etc.
 */
export class CreateEvalLogsDataSourceConfig
  extends S.Class<CreateEvalLogsDataSourceConfig>("CreateEvalLogsDataSourceConfig")({
    /**
     * The type of data source. Always `logs`.
     */
    "type": CreateEvalLogsDataSourceConfigType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "logs" as const)
    ),
    /**
     * Metadata filters for the logs data source.
     */
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * The type of data source. Always `stored_completions`.
 */
export class CreateEvalStoredCompletionsDataSourceConfigType extends S.Literal("stored_completions") {}

/**
 * Deprecated in favor of LogsDataSourceConfig.
 */
export class CreateEvalStoredCompletionsDataSourceConfig
  extends S.Class<CreateEvalStoredCompletionsDataSourceConfig>("CreateEvalStoredCompletionsDataSourceConfig")({
    /**
     * The type of data source. Always `stored_completions`.
     */
    "type": CreateEvalStoredCompletionsDataSourceConfigType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "stored_completions" as const)
    ),
    /**
     * Metadata filters for the stored completions data source.
     */
    "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * The object type, which is always `label_model`.
 */
export class CreateEvalLabelModelGraderType extends S.Literal("label_model") {}

/**
 * A chat message that makes up the prompt or context. May include variable references to the `item` namespace, ie {{item.name}}.
 */
export class CreateEvalItem extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * A LabelModelGrader object which uses a model to assign labels to each item
 * in the evaluation.
 */
export class CreateEvalLabelModelGrader extends S.Class<CreateEvalLabelModelGrader>("CreateEvalLabelModelGrader")({
  /**
   * The object type, which is always `label_model`.
   */
  "type": CreateEvalLabelModelGraderType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The model to use for the evaluation. Must support structured outputs.
   */
  "model": S.String,
  /**
   * A list of chat messages forming the prompt or context. May include variable references to the `item` namespace, ie {{item.name}}.
   */
  "input": S.Array(CreateEvalItem),
  /**
   * The labels to classify to each item in the evaluation.
   */
  "labels": S.Array(S.String),
  /**
   * The labels that indicate a passing result. Must be a subset of labels.
   */
  "passing_labels": S.Array(S.String)
}) {}

export class CreateEvalRequest extends S.Class<CreateEvalRequest>("CreateEvalRequest")({
  /**
   * The name of the evaluation.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * The configuration for the data source used for the evaluation runs. Dictates the schema of the data used in the evaluation.
   */
  "data_source_config": S.Record({ key: S.String, value: S.Unknown }),
  /**
   * A list of graders for all eval runs in this group. Graders can reference variables in the data source using double curly braces notation, like `{{item.variable_name}}`. To reference the model's output, use the `sample` namespace (ie, `{{sample.output_text}}`).
   */
  "testing_criteria": S.Array(
    S.Union(
      CreateEvalLabelModelGrader,
      EvalGraderStringCheck,
      EvalGraderTextSimilarity,
      EvalGraderPython,
      EvalGraderScoreModel
    )
  )
}) {}

export class UpdateEvalRequest extends S.Class<UpdateEvalRequest>("UpdateEvalRequest")({
  /**
   * Rename the evaluation.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class DeleteEval200 extends S.Struct({
  "object": S.String,
  "deleted": S.Boolean,
  "eval_id": S.String
}) {}

export class Error extends S.Class<Error>("Error")({
  "code": S.NullOr(S.String),
  "message": S.String,
  "param": S.NullOr(S.String),
  "type": S.String
}) {}

export class GetEvalRunsParamsOrder extends S.Literal("asc", "desc") {}

export class GetEvalRunsParamsStatus extends S.Literal("queued", "in_progress", "completed", "canceled", "failed") {}

export class GetEvalRunsParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(GetEvalRunsParamsOrder, { nullable: true, default: () => "asc" as const }),
  "status": S.optionalWith(GetEvalRunsParamsStatus, { nullable: true })
}) {}

/**
 * The type of this object. It is always set to "list".
 */
export class EvalRunListObject extends S.Literal("list") {}

/**
 * The type of the object. Always "eval.run".
 */
export class EvalRunObject extends S.Literal("eval.run") {}

/**
 * The type of data source. Always `jsonl`.
 */
export class CreateEvalJsonlRunDataSourceType extends S.Literal("jsonl") {}

/**
 * The type of jsonl source. Always `file_content`.
 */
export class EvalJsonlFileContentSourceType extends S.Literal("file_content") {}

export class EvalJsonlFileContentSource extends S.Class<EvalJsonlFileContentSource>("EvalJsonlFileContentSource")({
  /**
   * The type of jsonl source. Always `file_content`.
   */
  "type": EvalJsonlFileContentSourceType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "file_content" as const)
  ),
  /**
   * The content of the jsonl file.
   */
  "content": S.Array(S.Struct({
    "item": S.Record({ key: S.String, value: S.Unknown }),
    "sample": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  }))
}) {}

/**
 * The type of jsonl source. Always `file_id`.
 */
export class EvalJsonlFileIdSourceType extends S.Literal("file_id") {}

export class EvalJsonlFileIdSource extends S.Class<EvalJsonlFileIdSource>("EvalJsonlFileIdSource")({
  /**
   * The type of jsonl source. Always `file_id`.
   */
  "type": EvalJsonlFileIdSourceType.pipe(S.propertySignature, S.withConstructorDefault(() => "file_id" as const)),
  /**
   * The identifier of the file.
   */
  "id": S.String
}) {}

/**
 * A JsonlRunDataSource object with that specifies a JSONL file that matches the eval
 */
export class CreateEvalJsonlRunDataSource
  extends S.Class<CreateEvalJsonlRunDataSource>("CreateEvalJsonlRunDataSource")({
    /**
     * The type of data source. Always `jsonl`.
     */
    "type": CreateEvalJsonlRunDataSourceType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "jsonl" as const)
    ),
    /**
     * Determines what populates the `item` namespace in the data source.
     */
    "source": S.Union(EvalJsonlFileContentSource, EvalJsonlFileIdSource)
  })
{}

/**
 * The type of run data source. Always `completions`.
 */
export class CreateEvalCompletionsRunDataSourceType extends S.Literal("completions") {}

/**
 * The type of input messages. Always `item_reference`.
 */
export class CreateEvalCompletionsRunDataSourceInputMessagesEnumType extends S.Literal("item_reference") {}

/**
 * The type of source. Always `stored_completions`.
 */
export class EvalStoredCompletionsSourceType extends S.Literal("stored_completions") {}

/**
 * A StoredCompletionsRunDataSource configuration describing a set of filters
 */
export class EvalStoredCompletionsSource extends S.Class<EvalStoredCompletionsSource>("EvalStoredCompletionsSource")({
  /**
   * The type of source. Always `stored_completions`.
   */
  "type": EvalStoredCompletionsSourceType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "stored_completions" as const)
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true }),
  "created_after": S.optionalWith(S.Int, { nullable: true }),
  "created_before": S.optionalWith(S.Int, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * A CompletionsRunDataSource object describing a model sampling configuration.
 */
export class CreateEvalCompletionsRunDataSource
  extends S.Class<CreateEvalCompletionsRunDataSource>("CreateEvalCompletionsRunDataSource")({
    /**
     * The type of run data source. Always `completions`.
     */
    "type": CreateEvalCompletionsRunDataSourceType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "completions" as const)
    ),
    /**
     * Used when sampling from a model. Dictates the structure of the messages passed into the model. Can either be a reference to a prebuilt trajectory (ie, `item.input_trajectory`), or a template with variable references to the `item` namespace.
     */
    "input_messages": S.optionalWith(
      S.Union(
        S.Struct({
          /**
           * The type of input messages. Always `template`.
           */
          "type": CreateEvalCompletionsRunDataSourceInputMessagesEnumType,
          /**
           * A list of chat messages forming the prompt or context. May include variable references to the `item` namespace, ie {{item.name}}.
           */
          "template": S.Array(S.Union(EasyInputMessage, EvalItem))
        }),
        S.Struct({
          /**
           * The type of input messages. Always `item_reference`.
           */
          "type": CreateEvalCompletionsRunDataSourceInputMessagesEnumType,
          /**
           * A reference to a variable in the `item` namespace. Ie, "item.input_trajectory"
           */
          "item_reference": S.String
        })
      ),
      { nullable: true }
    ),
    "sampling_params": S.optionalWith(
      S.Struct({
        "reasoning_effort": S.optionalWith(S.Literal("none", "minimal", "low", "medium", "high"), { nullable: true }),
        /**
         * A higher temperature increases randomness in the outputs.
         */
        "temperature": S.optionalWith(S.Number, { nullable: true, default: () => 1 as const }),
        /**
         * The maximum number of tokens in the generated output.
         */
        "max_completion_tokens": S.optionalWith(S.Int, { nullable: true }),
        /**
         * An alternative to temperature for nucleus sampling; 1.0 includes all tokens.
         */
        "top_p": S.optionalWith(S.Number, { nullable: true, default: () => 1 as const }),
        /**
         * A seed value to initialize the randomness, during sampling.
         */
        "seed": S.optionalWith(S.Int, { nullable: true, default: () => 42 as const }),
        /**
         * An object specifying the format that the model must output.
         *
         * Setting to `{ "type": "json_schema", "json_schema": {...} }` enables
         * Structured Outputs which ensures the model will match your supplied JSON
         * schema. Learn more in the [Structured Outputs
         * guide](https://platform.openai.com/docs/guides/structured-outputs).
         *
         * Setting to `{ "type": "json_object" }` enables the older JSON mode, which
         * ensures the message the model generates is valid JSON. Using `json_schema`
         * is preferred for models that support it.
         */
        "response_format": S.optionalWith(
          S.Union(ResponseFormatText, ResponseFormatJsonSchema, ResponseFormatJsonObject),
          { nullable: true }
        ),
        /**
         * A list of tools the model may call. Currently, only functions are supported as a tool. Use this to provide a list of functions the model may generate JSON inputs for. A max of 128 functions are supported.
         */
        "tools": S.optionalWith(S.Array(ChatCompletionTool), { nullable: true })
      }),
      { nullable: true }
    ),
    /**
     * The name of the model to use for generating completions (e.g. "o3-mini").
     */
    "model": S.optionalWith(S.String, { nullable: true }),
    /**
     * Determines what populates the `item` namespace in this run's data source.
     */
    "source": S.Union(EvalJsonlFileContentSource, EvalJsonlFileIdSource, EvalStoredCompletionsSource)
  })
{}

/**
 * The type of run data source. Always `responses`.
 */
export class CreateEvalResponsesRunDataSourceType extends S.Literal("responses") {}

/**
 * The type of input messages. Always `item_reference`.
 */
export class CreateEvalResponsesRunDataSourceInputMessagesEnumType extends S.Literal("item_reference") {}

/**
 * The type of the function tool. Always `function`.
 */
export class FunctionToolType extends S.Literal("function") {}

/**
 * Defines a function in your own code the model can choose to call. Learn more about [function calling](https://platform.openai.com/docs/guides/function-calling).
 */
export class FunctionTool extends S.Class<FunctionTool>("FunctionTool")({
  /**
   * The type of the function tool. Always `function`.
   */
  "type": FunctionToolType.pipe(S.propertySignature, S.withConstructorDefault(() => "function" as const)),
  /**
   * The name of the function to call.
   */
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "parameters": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  "strict": S.NullOr(S.Boolean)
}) {}

/**
 * The type of the file search tool. Always `file_search`.
 */
export class FileSearchToolType extends S.Literal("file_search") {}

export class RankerVersionType extends S.Literal("auto", "default-2024-11-15") {}

export class HybridSearchOptions extends S.Class<HybridSearchOptions>("HybridSearchOptions")({
  /**
   * The weight of the embedding in the reciprocal ranking fusion.
   */
  "embedding_weight": S.Number,
  /**
   * The weight of the text in the reciprocal ranking fusion.
   */
  "text_weight": S.Number
}) {}

export class RankingOptions extends S.Class<RankingOptions>("RankingOptions")({
  /**
   * The ranker to use for the file search.
   */
  "ranker": S.optionalWith(RankerVersionType, { nullable: true }),
  /**
   * The score threshold for the file search, a number between 0 and 1. Numbers closer to 1 will attempt to return only the most relevant results, but may return fewer results.
   */
  "score_threshold": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Weights that control how reciprocal rank fusion balances semantic embedding matches versus sparse keyword matches when hybrid search is enabled.
   */
  "hybrid_search": S.optionalWith(HybridSearchOptions, { nullable: true })
}) {}

/**
 * Specifies the comparison operator: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`.
 * - `eq`: equals
 * - `ne`: not equal
 * - `gt`: greater than
 * - `gte`: greater than or equal
 * - `lt`: less than
 * - `lte`: less than or equal
 * - `in`: in
 * - `nin`: not in
 */
export class ComparisonFilterType extends S.Literal("eq", "ne", "gt", "gte", "lt", "lte") {}

export class ComparisonFilterValueItems extends S.Union(S.String, S.Number) {}

/**
 * A filter used to compare a specified attribute key to a given value using a defined comparison operation.
 */
export class ComparisonFilter extends S.Class<ComparisonFilter>("ComparisonFilter")({
  /**
   * Specifies the comparison operator: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`.
   * - `eq`: equals
   * - `ne`: not equal
   * - `gt`: greater than
   * - `gte`: greater than or equal
   * - `lt`: less than
   * - `lte`: less than or equal
   * - `in`: in
   * - `nin`: not in
   */
  "type": ComparisonFilterType.pipe(S.propertySignature, S.withConstructorDefault(() => "eq" as const)),
  /**
   * The key to compare against the value.
   */
  "key": S.String,
  /**
   * The value to compare against the attribute key; supports string, number, or boolean types.
   */
  "value": S.Union(S.String, S.Number, S.Boolean, S.Array(ComparisonFilterValueItems))
}) {}

/**
 * Type of operation: `and` or `or`.
 */
export class CompoundFilterType extends S.Literal("and", "or") {}

/**
 * Combine multiple filters using `and` or `or`.
 */
export class CompoundFilter extends S.Class<CompoundFilter>("CompoundFilter")({
  /**
   * Type of operation: `and` or `or`.
   */
  "type": CompoundFilterType,
  /**
   * Array of filters to combine. Items can be `ComparisonFilter` or `CompoundFilter`.
   */
  "filters": S.Array(ComparisonFilter)
}) {}

export class Filters extends S.Union(ComparisonFilter, CompoundFilter) {}

/**
 * A tool that searches for relevant content from uploaded files. Learn more about the [file search tool](https://platform.openai.com/docs/guides/tools-file-search).
 */
export class FileSearchTool extends S.Class<FileSearchTool>("FileSearchTool")({
  /**
   * The type of the file search tool. Always `file_search`.
   */
  "type": FileSearchToolType.pipe(S.propertySignature, S.withConstructorDefault(() => "file_search" as const)),
  /**
   * The IDs of the vector stores to search.
   */
  "vector_store_ids": S.Array(S.String),
  /**
   * The maximum number of results to return. This number should be between 1 and 50 inclusive.
   */
  "max_num_results": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Ranking options for search.
   */
  "ranking_options": S.optionalWith(RankingOptions, { nullable: true }),
  "filters": S.optionalWith(Filters, { nullable: true })
}) {}

/**
 * The type of the computer use tool. Always `computer_use_preview`.
 */
export class ComputerUsePreviewToolType extends S.Literal("computer_use_preview") {}

export class ComputerEnvironment extends S.Literal("windows", "mac", "linux", "ubuntu", "browser") {}

/**
 * A tool that controls a virtual computer. Learn more about the [computer tool](https://platform.openai.com/docs/guides/tools-computer-use).
 */
export class ComputerUsePreviewTool extends S.Class<ComputerUsePreviewTool>("ComputerUsePreviewTool")({
  /**
   * The type of the computer use tool. Always `computer_use_preview`.
   */
  "type": ComputerUsePreviewToolType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "computer_use_preview" as const)
  ),
  /**
   * The type of computer environment to control.
   */
  "environment": ComputerEnvironment,
  /**
   * The width of the computer display.
   */
  "display_width": S.Int,
  /**
   * The height of the computer display.
   */
  "display_height": S.Int
}) {}

/**
 * The type of the web search tool. One of `web_search` or `web_search_2025_08_26`.
 */
export class WebSearchToolType extends S.Literal("web_search", "web_search_2025_08_26") {}

/**
 * The type of location approximation. Always `approximate`.
 */
export class WebSearchApproximateLocationEnumType extends S.Literal("approximate") {}

export class WebSearchApproximateLocation extends S.Union(
  /**
   * The approximate location of the user.
   */
  S.Struct({
    /**
     * The type of location approximation. Always `approximate`.
     */
    "type": S.optionalWith(WebSearchApproximateLocationEnumType, {
      nullable: true,
      default: () => "approximate" as const
    }),
    "country": S.optionalWith(S.String, { nullable: true }),
    "region": S.optionalWith(S.String, { nullable: true }),
    "city": S.optionalWith(S.String, { nullable: true }),
    "timezone": S.optionalWith(S.String, { nullable: true })
  }),
  S.Null
) {}

/**
 * High level guidance for the amount of context window space to use for the search. One of `low`, `medium`, or `high`. `medium` is the default.
 */
export class WebSearchToolSearchContextSize extends S.Literal("low", "medium", "high") {}

/**
 * Search the Internet for sources related to the prompt. Learn more about the
 * [web search tool](https://platform.openai.com/docs/guides/tools-web-search).
 */
export class WebSearchTool extends S.Class<WebSearchTool>("WebSearchTool")({
  /**
   * The type of the web search tool. One of `web_search` or `web_search_2025_08_26`.
   */
  "type": WebSearchToolType.pipe(S.propertySignature, S.withConstructorDefault(() => "web_search" as const)),
  "filters": S.optionalWith(
    S.Struct({
      "allowed_domains": S.optionalWith(S.Array(S.String), { nullable: true })
    }),
    { nullable: true }
  ),
  "user_location": S.optionalWith(
    S.Struct({
      /**
       * The type of location approximation. Always `approximate`.
       */
      "type": S.optionalWith(S.Literal("approximate"), { nullable: true, default: () => "approximate" as const }),
      "country": S.optionalWith(S.String, { nullable: true }),
      "region": S.optionalWith(S.String, { nullable: true }),
      "city": S.optionalWith(S.String, { nullable: true }),
      "timezone": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * High level guidance for the amount of context window space to use for the search. One of `low`, `medium`, or `high`. `medium` is the default.
   */
  "search_context_size": S.optionalWith(WebSearchToolSearchContextSize, {
    nullable: true,
    default: () => "medium" as const
  })
}) {}

/**
 * The type of the MCP tool. Always `mcp`.
 */
export class MCPToolType extends S.Literal("mcp") {}

/**
 * Identifier for service connectors, like those available in ChatGPT. One of
 * `server_url` or `connector_id` must be provided. Learn more about service
 * connectors [here](https://platform.openai.com/docs/guides/tools-remote-mcp#connectors).
 *
 * Currently supported `connector_id` values are:
 *
 * - Dropbox: `connector_dropbox`
 * - Gmail: `connector_gmail`
 * - Google Calendar: `connector_googlecalendar`
 * - Google Drive: `connector_googledrive`
 * - Microsoft Teams: `connector_microsoftteams`
 * - Outlook Calendar: `connector_outlookcalendar`
 * - Outlook Email: `connector_outlookemail`
 * - SharePoint: `connector_sharepoint`
 */
export class MCPToolConnectorId extends S.Literal(
  "connector_dropbox",
  "connector_gmail",
  "connector_googlecalendar",
  "connector_googledrive",
  "connector_microsoftteams",
  "connector_outlookcalendar",
  "connector_outlookemail",
  "connector_sharepoint"
) {}

/**
 * A filter object to specify which tools are allowed.
 */
export class MCPToolFilter extends S.Class<MCPToolFilter>("MCPToolFilter")({
  /**
   * List of allowed tool names.
   */
  "tool_names": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Indicates whether or not a tool modifies data or is read-only. If an
   * MCP server is [annotated with `readOnlyHint`](https://modelcontextprotocol.io/specification/2025-06-18/schema#toolannotations-readonlyhint),
   * it will match this filter.
   */
  "read_only": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * Specify a single approval policy for all tools. One of `always` or
 * `never`. When set to `always`, all tools will require approval. When
 * set to `never`, all tools will not require approval.
 */
export class MCPToolRequireApprovalEnum extends S.Literal("always", "never") {}

/**
 * Give the model access to additional tools via remote Model Context Protocol
 * (MCP) servers. [Learn more about MCP](https://platform.openai.com/docs/guides/tools-remote-mcp).
 */
export class MCPTool extends S.Class<MCPTool>("MCPTool")({
  /**
   * The type of the MCP tool. Always `mcp`.
   */
  "type": MCPToolType,
  /**
   * A label for this MCP server, used to identify it in tool calls.
   */
  "server_label": S.String,
  /**
   * The URL for the MCP server. One of `server_url` or `connector_id` must be
   * provided.
   */
  "server_url": S.optionalWith(S.String, { nullable: true }),
  /**
   * Identifier for service connectors, like those available in ChatGPT. One of
   * `server_url` or `connector_id` must be provided. Learn more about service
   * connectors [here](https://platform.openai.com/docs/guides/tools-remote-mcp#connectors).
   *
   * Currently supported `connector_id` values are:
   *
   * - Dropbox: `connector_dropbox`
   * - Gmail: `connector_gmail`
   * - Google Calendar: `connector_googlecalendar`
   * - Google Drive: `connector_googledrive`
   * - Microsoft Teams: `connector_microsoftteams`
   * - Outlook Calendar: `connector_outlookcalendar`
   * - Outlook Email: `connector_outlookemail`
   * - SharePoint: `connector_sharepoint`
   */
  "connector_id": S.optionalWith(MCPToolConnectorId, { nullable: true }),
  /**
   * An OAuth access token that can be used with a remote MCP server, either
   * with a custom MCP server URL or a service connector. Your application
   * must handle the OAuth authorization flow and provide the token here.
   */
  "authorization": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional description of the MCP server, used to provide more context.
   */
  "server_description": S.optionalWith(S.String, { nullable: true }),
  "headers": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "allowed_tools": S.optionalWith(
    S.Union(
      /**
       * A string array of allowed tool names
       */
      S.Array(S.String),
      MCPToolFilter
    ),
    { nullable: true }
  ),
  "require_approval": S.optionalWith(
    S.Union(
      /**
       * Specify which of the MCP server's tools require approval. Can be
       * `always`, `never`, or a filter object associated with tools
       * that require approval.
       */
      S.Struct({
        "always": S.optionalWith(MCPToolFilter, { nullable: true }),
        "never": S.optionalWith(MCPToolFilter, { nullable: true })
      }),
      /**
       * Specify a single approval policy for all tools. One of `always` or
       * `never`. When set to `always`, all tools will require approval. When
       * set to `never`, all tools will not require approval.
       */
      MCPToolRequireApprovalEnum
    ),
    { nullable: true }
  )
}) {}

/**
 * The type of the code interpreter tool. Always `code_interpreter`.
 */
export class CodeInterpreterToolType extends S.Literal("code_interpreter") {}

/**
 * Always `auto`.
 */
export class CodeInterpreterContainerAutoType extends S.Literal("auto") {}

export class ContainerMemoryLimit extends S.Literal("1g", "4g", "16g", "64g") {}

/**
 * Configuration for a code interpreter container. Optionally specify the IDs of the files to run the code on.
 */
export class CodeInterpreterContainerAuto
  extends S.Class<CodeInterpreterContainerAuto>("CodeInterpreterContainerAuto")({
    /**
     * Always `auto`.
     */
    "type": CodeInterpreterContainerAutoType.pipe(S.propertySignature, S.withConstructorDefault(() => "auto" as const)),
    /**
     * An optional list of uploaded files to make available to your code.
     */
    "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(50)), { nullable: true }),
    "memory_limit": S.optionalWith(ContainerMemoryLimit, { nullable: true })
  })
{}

/**
 * A tool that runs Python code to help generate a response to a prompt.
 */
export class CodeInterpreterTool extends S.Class<CodeInterpreterTool>("CodeInterpreterTool")({
  /**
   * The type of the code interpreter tool. Always `code_interpreter`.
   */
  "type": CodeInterpreterToolType,
  /**
   * The code interpreter container. Can be a container ID or an object that
   * specifies uploaded file IDs to make available to your code.
   */
  "container": S.Union(
    /**
     * The container ID.
     */
    S.String,
    CodeInterpreterContainerAuto
  )
}) {}

/**
 * The type of the image generation tool. Always `image_generation`.
 */
export class ImageGenToolType extends S.Literal("image_generation") {}

/**
 * The image generation model to use. Default: `gpt-image-1`.
 */
export class ImageGenToolModel extends S.Literal("gpt-image-1", "gpt-image-1-mini") {}

/**
 * The quality of the generated image. One of `low`, `medium`, `high`,
 * or `auto`. Default: `auto`.
 */
export class ImageGenToolQuality extends S.Literal("low", "medium", "high", "auto") {}

/**
 * The size of the generated image. One of `1024x1024`, `1024x1536`,
 * `1536x1024`, or `auto`. Default: `auto`.
 */
export class ImageGenToolSize extends S.Literal("1024x1024", "1024x1536", "1536x1024", "auto") {}

/**
 * The output format of the generated image. One of `png`, `webp`, or
 * `jpeg`. Default: `png`.
 */
export class ImageGenToolOutputFormat extends S.Literal("png", "webp", "jpeg") {}

/**
 * Moderation level for the generated image. Default: `auto`.
 */
export class ImageGenToolModeration extends S.Literal("auto", "low") {}

/**
 * Background type for the generated image. One of `transparent`,
 * `opaque`, or `auto`. Default: `auto`.
 */
export class ImageGenToolBackground extends S.Literal("transparent", "opaque", "auto") {}

/**
 * Control how much effort the model will exert to match the style and features, especially facial features, of input images. This parameter is only supported for `gpt-image-1`. Unsupported for `gpt-image-1-mini`. Supports `high` and `low`. Defaults to `low`.
 */
export class InputFidelity extends S.Literal("high", "low") {}

/**
 * A tool that generates images using a model like `gpt-image-1`.
 */
export class ImageGenTool extends S.Class<ImageGenTool>("ImageGenTool")({
  /**
   * The type of the image generation tool. Always `image_generation`.
   */
  "type": ImageGenToolType,
  /**
   * The image generation model to use. Default: `gpt-image-1`.
   */
  "model": S.optionalWith(ImageGenToolModel, { nullable: true, default: () => "gpt-image-1" as const }),
  /**
   * The quality of the generated image. One of `low`, `medium`, `high`,
   * or `auto`. Default: `auto`.
   */
  "quality": S.optionalWith(ImageGenToolQuality, { nullable: true, default: () => "auto" as const }),
  /**
   * The size of the generated image. One of `1024x1024`, `1024x1536`,
   * `1536x1024`, or `auto`. Default: `auto`.
   */
  "size": S.optionalWith(ImageGenToolSize, { nullable: true, default: () => "auto" as const }),
  /**
   * The output format of the generated image. One of `png`, `webp`, or
   * `jpeg`. Default: `png`.
   */
  "output_format": S.optionalWith(ImageGenToolOutputFormat, { nullable: true, default: () => "png" as const }),
  /**
   * Compression level for the output image. Default: 100.
   */
  "output_compression": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(100)), {
    nullable: true,
    default: () => 100 as const
  }),
  /**
   * Moderation level for the generated image. Default: `auto`.
   */
  "moderation": S.optionalWith(ImageGenToolModeration, { nullable: true, default: () => "auto" as const }),
  /**
   * Background type for the generated image. One of `transparent`,
   * `opaque`, or `auto`. Default: `auto`.
   */
  "background": S.optionalWith(ImageGenToolBackground, { nullable: true, default: () => "auto" as const }),
  "input_fidelity": S.optionalWith(InputFidelity, { nullable: true }),
  /**
   * Optional mask for inpainting. Contains `image_url`
   * (string, optional) and `file_id` (string, optional).
   */
  "input_image_mask": S.optionalWith(
    S.Struct({
      /**
       * Base64-encoded mask image.
       */
      "image_url": S.optionalWith(S.String, { nullable: true }),
      /**
       * File ID for the mask image.
       */
      "file_id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * Number of partial images to generate in streaming mode, from 0 (default value) to 3.
   */
  "partial_images": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(3)), {
    nullable: true,
    default: () => 0 as const
  })
}) {}

/**
 * The type of the local shell tool. Always `local_shell`.
 */
export class LocalShellToolParamType extends S.Literal("local_shell") {}

/**
 * A tool that allows the model to execute shell commands in a local environment.
 */
export class LocalShellToolParam extends S.Class<LocalShellToolParam>("LocalShellToolParam")({
  /**
   * The type of the local shell tool. Always `local_shell`.
   */
  "type": LocalShellToolParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "local_shell" as const))
}) {}

/**
 * The type of the shell tool. Always `shell`.
 */
export class FunctionShellToolParamType extends S.Literal("shell") {}

/**
 * A tool that allows the model to execute shell commands.
 */
export class FunctionShellToolParam extends S.Class<FunctionShellToolParam>("FunctionShellToolParam")({
  /**
   * The type of the shell tool. Always `shell`.
   */
  "type": FunctionShellToolParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "shell" as const))
}) {}

/**
 * The type of the custom tool. Always `custom`.
 */
export class CustomToolParamType extends S.Literal("custom") {}

/**
 * Unconstrained text format. Always `text`.
 */
export class CustomTextFormatParamType extends S.Literal("text") {}

/**
 * Unconstrained free-form text.
 */
export class CustomTextFormatParam extends S.Class<CustomTextFormatParam>("CustomTextFormatParam")({
  /**
   * Unconstrained text format. Always `text`.
   */
  "type": CustomTextFormatParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "text" as const))
}) {}

/**
 * Grammar format. Always `grammar`.
 */
export class CustomGrammarFormatParamType extends S.Literal("grammar") {}

export class GrammarSyntax1 extends S.Literal("lark", "regex") {}

/**
 * A grammar defined by the user.
 */
export class CustomGrammarFormatParam extends S.Class<CustomGrammarFormatParam>("CustomGrammarFormatParam")({
  /**
   * Grammar format. Always `grammar`.
   */
  "type": CustomGrammarFormatParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "grammar" as const)),
  /**
   * The syntax of the grammar definition. One of `lark` or `regex`.
   */
  "syntax": GrammarSyntax1,
  /**
   * The grammar definition.
   */
  "definition": S.String
}) {}

/**
 * A custom tool that processes input using a specified format. Learn more about   [custom tools](https://platform.openai.com/docs/guides/function-calling#custom-tools)
 */
export class CustomToolParam extends S.Class<CustomToolParam>("CustomToolParam")({
  /**
   * The type of the custom tool. Always `custom`.
   */
  "type": CustomToolParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "custom" as const)),
  /**
   * The name of the custom tool, used to identify it in tool calls.
   */
  "name": S.String,
  /**
   * Optional description of the custom tool, used to provide more context.
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * The input format for the custom tool. Default is unconstrained text.
   */
  "format": S.optionalWith(S.Union(CustomTextFormatParam, CustomGrammarFormatParam), { nullable: true })
}) {}

/**
 * The type of the web search tool. One of `web_search_preview` or `web_search_preview_2025_03_11`.
 */
export class WebSearchPreviewToolType extends S.Literal("web_search_preview", "web_search_preview_2025_03_11") {}

/**
 * The type of location approximation. Always `approximate`.
 */
export class ApproximateLocationType extends S.Literal("approximate") {}

export class ApproximateLocation extends S.Class<ApproximateLocation>("ApproximateLocation")({
  /**
   * The type of location approximation. Always `approximate`.
   */
  "type": ApproximateLocationType.pipe(S.propertySignature, S.withConstructorDefault(() => "approximate" as const)),
  "country": S.optionalWith(S.String, { nullable: true }),
  "region": S.optionalWith(S.String, { nullable: true }),
  "city": S.optionalWith(S.String, { nullable: true }),
  "timezone": S.optionalWith(S.String, { nullable: true })
}) {}

export class SearchContextSize extends S.Literal("low", "medium", "high") {}

/**
 * This tool searches the web for relevant results to use in a response. Learn more about the [web search tool](https://platform.openai.com/docs/guides/tools-web-search).
 */
export class WebSearchPreviewTool extends S.Class<WebSearchPreviewTool>("WebSearchPreviewTool")({
  /**
   * The type of the web search tool. One of `web_search_preview` or `web_search_preview_2025_03_11`.
   */
  "type": WebSearchPreviewToolType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "web_search_preview" as const)
  ),
  "user_location": S.optionalWith(ApproximateLocation, { nullable: true }),
  /**
   * High level guidance for the amount of context window space to use for the search. One of `low`, `medium`, or `high`. `medium` is the default.
   */
  "search_context_size": S.optionalWith(SearchContextSize, { nullable: true })
}) {}

/**
 * The type of the tool. Always `apply_patch`.
 */
export class ApplyPatchToolParamType extends S.Literal("apply_patch") {}

/**
 * Allows the assistant to create, delete, or update files using unified diffs.
 */
export class ApplyPatchToolParam extends S.Class<ApplyPatchToolParam>("ApplyPatchToolParam")({
  /**
   * The type of the tool. Always `apply_patch`.
   */
  "type": ApplyPatchToolParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "apply_patch" as const))
}) {}

/**
 * A tool that can be used to generate a response.
 */
export class Tool extends S.Union(
  FunctionTool,
  FileSearchTool,
  ComputerUsePreviewTool,
  WebSearchTool,
  MCPTool,
  CodeInterpreterTool,
  ImageGenTool,
  LocalShellToolParam,
  FunctionShellToolParam,
  CustomToolParam,
  WebSearchPreviewTool,
  ApplyPatchToolParam
) {}

/**
 * The type of response format being defined. Always `json_schema`.
 */
export class TextResponseFormatJsonSchemaType extends S.Literal("json_schema") {}

/**
 * JSON Schema response format. Used to generate structured JSON responses.
 * Learn more about [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs).
 */
export class TextResponseFormatJsonSchema
  extends S.Class<TextResponseFormatJsonSchema>("TextResponseFormatJsonSchema")({
    /**
     * The type of response format being defined. Always `json_schema`.
     */
    "type": TextResponseFormatJsonSchemaType,
    /**
     * A description of what the response format is for, used by the model to
     * determine how to respond in the format.
     */
    "description": S.optionalWith(S.String, { nullable: true }),
    /**
     * The name of the response format. Must be a-z, A-Z, 0-9, or contain
     * underscores and dashes, with a maximum length of 64.
     */
    "name": S.String,
    "schema": ResponseFormatJsonSchemaSchema,
    "strict": S.optionalWith(S.Boolean, { nullable: true })
  })
{}

/**
 * An object specifying the format that the model must output.
 *
 * Configuring `{ "type": "json_schema" }` enables Structured Outputs,
 * which ensures the model will match your supplied JSON schema. Learn more in the
 * [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs).
 *
 * The default format is `{ "type": "text" }` with no additional options.
 *
 * **Not recommended for gpt-4o and newer models:**
 *
 * Setting to `{ "type": "json_object" }` enables the older JSON mode, which
 * ensures the message the model generates is valid JSON. Using `json_schema`
 * is preferred for models that support it.
 */
export class TextResponseFormatConfiguration
  extends S.Union(ResponseFormatText, TextResponseFormatJsonSchema, ResponseFormatJsonObject)
{}

/**
 * The type of run data source. Always `responses`.
 */
export class EvalResponsesSourceType extends S.Literal("responses") {}

/**
 * A EvalResponsesSource object describing a run data source configuration.
 */
export class EvalResponsesSource extends S.Class<EvalResponsesSource>("EvalResponsesSource")({
  /**
   * The type of run data source. Always `responses`.
   */
  "type": EvalResponsesSourceType,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true }),
  "instructions_search": S.optionalWith(S.String, { nullable: true }),
  "created_after": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "created_before": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true }),
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  "top_p": S.optionalWith(S.Number, { nullable: true }),
  "users": S.optionalWith(S.Array(S.String), { nullable: true }),
  "tools": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

/**
 * A ResponsesRunDataSource object describing a model sampling configuration.
 */
export class CreateEvalResponsesRunDataSource
  extends S.Class<CreateEvalResponsesRunDataSource>("CreateEvalResponsesRunDataSource")({
    /**
     * The type of run data source. Always `responses`.
     */
    "type": CreateEvalResponsesRunDataSourceType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "responses" as const)
    ),
    /**
     * Used when sampling from a model. Dictates the structure of the messages passed into the model. Can either be a reference to a prebuilt trajectory (ie, `item.input_trajectory`), or a template with variable references to the `item` namespace.
     */
    "input_messages": S.optionalWith(
      S.Union(
        S.Struct({
          /**
           * The type of input messages. Always `template`.
           */
          "type": CreateEvalResponsesRunDataSourceInputMessagesEnumType,
          /**
           * A list of chat messages forming the prompt or context. May include variable references to the `item` namespace, ie {{item.name}}.
           */
          "template": S.Array(S.Union(
            S.Struct({
              /**
               * The role of the message (e.g. "system", "assistant", "user").
               */
              "role": S.String,
              /**
               * The content of the message.
               */
              "content": S.String
            }),
            EvalItem
          ))
        }),
        S.Struct({
          /**
           * The type of input messages. Always `item_reference`.
           */
          "type": CreateEvalResponsesRunDataSourceInputMessagesEnumType,
          /**
           * A reference to a variable in the `item` namespace. Ie, "item.name"
           */
          "item_reference": S.String
        })
      ),
      { nullable: true }
    ),
    "sampling_params": S.optionalWith(
      S.Struct({
        "reasoning_effort": S.optionalWith(S.Literal("none", "minimal", "low", "medium", "high"), { nullable: true }),
        /**
         * A higher temperature increases randomness in the outputs.
         */
        "temperature": S.optionalWith(S.Number, { nullable: true, default: () => 1 as const }),
        /**
         * The maximum number of tokens in the generated output.
         */
        "max_completion_tokens": S.optionalWith(S.Int, { nullable: true }),
        /**
         * An alternative to temperature for nucleus sampling; 1.0 includes all tokens.
         */
        "top_p": S.optionalWith(S.Number, { nullable: true, default: () => 1 as const }),
        /**
         * A seed value to initialize the randomness, during sampling.
         */
        "seed": S.optionalWith(S.Int, { nullable: true, default: () => 42 as const }),
        /**
         * An array of tools the model may call while generating a response. You
         * can specify which tool to use by setting the `tool_choice` parameter.
         *
         * The two categories of tools you can provide the model are:
         *
         * - **Built-in tools**: Tools that are provided by OpenAI that extend the
         *   model's capabilities, like [web search](https://platform.openai.com/docs/guides/tools-web-search)
         *   or [file search](https://platform.openai.com/docs/guides/tools-file-search). Learn more about
         *   [built-in tools](https://platform.openai.com/docs/guides/tools).
         * - **Function calls (custom tools)**: Functions that are defined by you,
         *   enabling the model to call your own code. Learn more about
         *   [function calling](https://platform.openai.com/docs/guides/function-calling).
         */
        "tools": S.optionalWith(S.Array(Tool), { nullable: true }),
        /**
         * Configuration options for a text response from the model. Can be plain
         * text or structured JSON data. Learn more:
         * - [Text inputs and outputs](https://platform.openai.com/docs/guides/text)
         * - [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
         */
        "text": S.optionalWith(
          S.Struct({
            "format": S.optionalWith(TextResponseFormatConfiguration, { nullable: true })
          }),
          { nullable: true }
        )
      }),
      { nullable: true }
    ),
    /**
     * The name of the model to use for generating completions (e.g. "o3-mini").
     */
    "model": S.optionalWith(S.String, { nullable: true }),
    /**
     * Determines what populates the `item` namespace in this run's data source.
     */
    "source": S.Union(EvalJsonlFileContentSource, EvalJsonlFileIdSource, EvalResponsesSource)
  })
{}

/**
 * An object representing an error response from the Eval API.
 */
export class EvalApiError extends S.Class<EvalApiError>("EvalApiError")({
  /**
   * The error code.
   */
  "code": S.String,
  /**
   * The error message.
   */
  "message": S.String
}) {}

/**
 * A schema representing an evaluation run.
 */
export class EvalRun extends S.Class<EvalRun>("EvalRun")({
  /**
   * The type of the object. Always "eval.run".
   */
  "object": EvalRunObject.pipe(S.propertySignature, S.withConstructorDefault(() => "eval.run" as const)),
  /**
   * Unique identifier for the evaluation run.
   */
  "id": S.String,
  /**
   * The identifier of the associated evaluation.
   */
  "eval_id": S.String,
  /**
   * The status of the evaluation run.
   */
  "status": S.String,
  /**
   * The model that is evaluated, if applicable.
   */
  "model": S.String,
  /**
   * The name of the evaluation run.
   */
  "name": S.String,
  /**
   * Unix timestamp (in seconds) when the evaluation run was created.
   */
  "created_at": S.Int,
  /**
   * The URL to the rendered evaluation run report on the UI dashboard.
   */
  "report_url": S.String,
  /**
   * Counters summarizing the outcomes of the evaluation run.
   */
  "result_counts": S.Struct({
    /**
     * Total number of executed output items.
     */
    "total": S.Int,
    /**
     * Number of output items that resulted in an error.
     */
    "errored": S.Int,
    /**
     * Number of output items that failed to pass the evaluation.
     */
    "failed": S.Int,
    /**
     * Number of output items that passed the evaluation.
     */
    "passed": S.Int
  }),
  /**
   * Usage statistics for each model during the evaluation run.
   */
  "per_model_usage": S.Array(S.Struct({
    /**
     * The name of the model.
     */
    "model_name": S.String,
    /**
     * The number of invocations.
     */
    "invocation_count": S.Int,
    /**
     * The number of prompt tokens used.
     */
    "prompt_tokens": S.Int,
    /**
     * The number of completion tokens generated.
     */
    "completion_tokens": S.Int,
    /**
     * The total number of tokens used.
     */
    "total_tokens": S.Int,
    /**
     * The number of tokens retrieved from cache.
     */
    "cached_tokens": S.Int
  })),
  /**
   * Results per testing criteria applied during the evaluation run.
   */
  "per_testing_criteria_results": S.Array(S.Struct({
    /**
     * A description of the testing criteria.
     */
    "testing_criteria": S.String,
    /**
     * Number of tests passed for this criteria.
     */
    "passed": S.Int,
    /**
     * Number of tests failed for this criteria.
     */
    "failed": S.Int
  })),
  /**
   * Information about the run's data source.
   */
  "data_source": S.Record({ key: S.String, value: S.Unknown }),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  "error": EvalApiError
}) {}

/**
 * An object representing a list of runs for an evaluation.
 */
export class EvalRunList extends S.Class<EvalRunList>("EvalRunList")({
  /**
   * The type of this object. It is always set to "list".
   */
  "object": EvalRunListObject.pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  /**
   * An array of eval run objects.
   */
  "data": S.Array(EvalRun),
  /**
   * The identifier of the first eval run in the data array.
   */
  "first_id": S.String,
  /**
   * The identifier of the last eval run in the data array.
   */
  "last_id": S.String,
  /**
   * Indicates whether there are more evals available.
   */
  "has_more": S.Boolean
}) {}

export class CreateEvalRunRequest extends S.Class<CreateEvalRunRequest>("CreateEvalRunRequest")({
  /**
   * The name of the run.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * Details about the run's data source.
   */
  "data_source": S.Record({ key: S.String, value: S.Unknown })
}) {}

export class DeleteEvalRun200 extends S.Struct({
  "object": S.optionalWith(S.String, { nullable: true }),
  "deleted": S.optionalWith(S.Boolean, { nullable: true }),
  "run_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class GetEvalRunOutputItemsParamsStatus extends S.Literal("fail", "pass") {}

export class GetEvalRunOutputItemsParamsOrder extends S.Literal("asc", "desc") {}

export class GetEvalRunOutputItemsParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "status": S.optionalWith(GetEvalRunOutputItemsParamsStatus, { nullable: true }),
  "order": S.optionalWith(GetEvalRunOutputItemsParamsOrder, { nullable: true, default: () => "asc" as const })
}) {}

/**
 * The type of this object. It is always set to "list".
 */
export class EvalRunOutputItemListObject extends S.Literal("list") {}

/**
 * The type of the object. Always "eval.run.output_item".
 */
export class EvalRunOutputItemObject extends S.Literal("eval.run.output_item") {}

/**
 * A single grader result for an evaluation run output item.
 */
export class EvalRunOutputItemResult extends S.Class<EvalRunOutputItemResult>("EvalRunOutputItemResult")({
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The grader type (for example, "string-check-grader").
   */
  "type": S.optionalWith(S.String, { nullable: true }),
  /**
   * The numeric score produced by the grader.
   */
  "score": S.Number,
  /**
   * Whether the grader considered the output a pass.
   */
  "passed": S.Boolean,
  /**
   * Optional sample or intermediate data produced by the grader.
   */
  "sample": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * A schema representing an evaluation run output item.
 */
export class EvalRunOutputItem extends S.Class<EvalRunOutputItem>("EvalRunOutputItem")({
  /**
   * The type of the object. Always "eval.run.output_item".
   */
  "object": EvalRunOutputItemObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "eval.run.output_item" as const)
  ),
  /**
   * Unique identifier for the evaluation run output item.
   */
  "id": S.String,
  /**
   * The identifier of the evaluation run associated with this output item.
   */
  "run_id": S.String,
  /**
   * The identifier of the evaluation group.
   */
  "eval_id": S.String,
  /**
   * Unix timestamp (in seconds) when the evaluation run was created.
   */
  "created_at": S.Int,
  /**
   * The status of the evaluation run.
   */
  "status": S.String,
  /**
   * The identifier for the data source item.
   */
  "datasource_item_id": S.Int,
  /**
   * Details of the input data source item.
   */
  "datasource_item": S.Record({ key: S.String, value: S.Unknown }),
  /**
   * A list of grader results for this output item.
   */
  "results": S.Array(EvalRunOutputItemResult),
  /**
   * A sample containing the input and output of the evaluation run.
   */
  "sample": S.Struct({
    /**
     * An array of input messages.
     */
    "input": S.Array(S.Struct({
      /**
       * The role of the message sender (e.g., system, user, developer).
       */
      "role": S.String,
      /**
       * The content of the message.
       */
      "content": S.String
    })),
    /**
     * An array of output messages.
     */
    "output": S.Array(S.Struct({
      /**
       * The role of the message (e.g. "system", "assistant", "user").
       */
      "role": S.optionalWith(S.String, { nullable: true }),
      /**
       * The content of the message.
       */
      "content": S.optionalWith(S.String, { nullable: true })
    })),
    /**
     * The reason why the sample generation was finished.
     */
    "finish_reason": S.String,
    /**
     * The model used for generating the sample.
     */
    "model": S.String,
    /**
     * Token usage details for the sample.
     */
    "usage": S.Struct({
      /**
       * The total number of tokens used.
       */
      "total_tokens": S.Int,
      /**
       * The number of completion tokens generated.
       */
      "completion_tokens": S.Int,
      /**
       * The number of prompt tokens used.
       */
      "prompt_tokens": S.Int,
      /**
       * The number of tokens retrieved from cache.
       */
      "cached_tokens": S.Int
    }),
    "error": EvalApiError,
    /**
     * The sampling temperature used.
     */
    "temperature": S.Number,
    /**
     * The maximum number of tokens allowed for completion.
     */
    "max_completion_tokens": S.Int,
    /**
     * The top_p value used for sampling.
     */
    "top_p": S.Number,
    /**
     * The seed used for generating the sample.
     */
    "seed": S.Int
  })
}) {}

/**
 * An object representing a list of output items for an evaluation run.
 */
export class EvalRunOutputItemList extends S.Class<EvalRunOutputItemList>("EvalRunOutputItemList")({
  /**
   * The type of this object. It is always set to "list".
   */
  "object": EvalRunOutputItemListObject.pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  /**
   * An array of eval run output item objects.
   */
  "data": S.Array(EvalRunOutputItem),
  /**
   * The identifier of the first eval run output item in the data array.
   */
  "first_id": S.String,
  /**
   * The identifier of the last eval run output item in the data array.
   */
  "last_id": S.String,
  /**
   * Indicates whether there are more eval run output items available.
   */
  "has_more": S.Boolean
}) {}

export class ListFilesParamsOrder extends S.Literal("asc", "desc") {}

export class ListFilesParams extends S.Struct({
  "purpose": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 10000 as const }),
  "order": S.optionalWith(ListFilesParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always `file`.
 */
export class OpenAIFileObject extends S.Literal("file") {}

/**
 * The intended purpose of the file. Supported values are `assistants`, `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results`, `vision`, and `user_data`.
 */
export class OpenAIFilePurpose extends S.Literal(
  "assistants",
  "assistants_output",
  "batch",
  "batch_output",
  "fine-tune",
  "fine-tune-results",
  "vision",
  "user_data"
) {}

/**
 * Deprecated. The current status of the file, which can be either `uploaded`, `processed`, or `error`.
 */
export class OpenAIFileStatus extends S.Literal("uploaded", "processed", "error") {}

/**
 * The `File` object represents a document that has been uploaded to OpenAI.
 */
export class OpenAIFile extends S.Class<OpenAIFile>("OpenAIFile")({
  /**
   * The file identifier, which can be referenced in the API endpoints.
   */
  "id": S.String,
  /**
   * The size of the file, in bytes.
   */
  "bytes": S.Int,
  /**
   * The Unix timestamp (in seconds) for when the file was created.
   */
  "created_at": S.Int,
  /**
   * The Unix timestamp (in seconds) for when the file will expire.
   */
  "expires_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The name of the file.
   */
  "filename": S.String,
  /**
   * The object type, which is always `file`.
   */
  "object": OpenAIFileObject,
  /**
   * The intended purpose of the file. Supported values are `assistants`, `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results`, `vision`, and `user_data`.
   */
  "purpose": OpenAIFilePurpose,
  /**
   * Deprecated. The current status of the file, which can be either `uploaded`, `processed`, or `error`.
   */
  "status": OpenAIFileStatus,
  /**
   * Deprecated. For details on why a fine-tuning training file failed validation, see the `error` field on `fine_tuning.job`.
   */
  "status_details": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListFilesResponse extends S.Class<ListFilesResponse>("ListFilesResponse")({
  "object": S.String,
  "data": S.Array(OpenAIFile),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

/**
 * The intended purpose of the uploaded file. One of: - `assistants`: Used in the Assistants API - `batch`: Used in the Batch API - `fine-tune`: Used for fine-tuning - `vision`: Images used for vision fine-tuning - `user_data`: Flexible file type for any purpose - `evals`: Used for eval data sets
 */
export class FilePurpose extends S.Literal("assistants", "batch", "fine-tune", "vision", "user_data", "evals") {}

/**
 * Anchor timestamp after which the expiration policy applies. Supported anchors: `created_at`.
 */
export class FileExpirationAfterAnchor extends S.Literal("created_at") {}

/**
 * The expiration policy for a file. By default, files with `purpose=batch` expire after 30 days and all other files are persisted until they are manually deleted.
 */
export class FileExpirationAfter extends S.Class<FileExpirationAfter>("FileExpirationAfter")({
  /**
   * Anchor timestamp after which the expiration policy applies. Supported anchors: `created_at`.
   */
  "anchor": FileExpirationAfterAnchor,
  /**
   * The number of seconds after the anchor time that the file will expire. Must be between 3600 (1 hour) and 2592000 (30 days).
   */
  "seconds": S.Int.pipe(S.greaterThanOrEqualTo(3600), S.lessThanOrEqualTo(2592000))
}) {}

export class CreateFileRequest extends S.Class<CreateFileRequest>("CreateFileRequest")({
  /**
   * The File object (not file name) to be uploaded.
   */
  "file": S.instanceOf(globalThis.Blob),
  "purpose": FilePurpose,
  "expires_after": S.optionalWith(FileExpirationAfter, { nullable: true })
}) {}

export class DeleteFileResponseObject extends S.Literal("file") {}

export class DeleteFileResponse extends S.Class<DeleteFileResponse>("DeleteFileResponse")({
  "id": S.String,
  "object": DeleteFileResponseObject,
  "deleted": S.Boolean
}) {}

export class DownloadFile200 extends S.String {}

/**
 * The object type, which is always `string_check`.
 */
export class GraderStringCheckType extends S.Literal("string_check") {}

/**
 * The string check operation to perform. One of `eq`, `ne`, `like`, or `ilike`.
 */
export class GraderStringCheckOperation extends S.Literal("eq", "ne", "like", "ilike") {}

/**
 * A StringCheckGrader object that performs a string comparison between input and reference using a specified operation.
 */
export class GraderStringCheck extends S.Class<GraderStringCheck>("GraderStringCheck")({
  /**
   * The object type, which is always `string_check`.
   */
  "type": GraderStringCheckType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The input text. This may include template strings.
   */
  "input": S.String,
  /**
   * The reference text. This may include template strings.
   */
  "reference": S.String,
  /**
   * The string check operation to perform. One of `eq`, `ne`, `like`, or `ilike`.
   */
  "operation": GraderStringCheckOperation
}) {}

/**
 * The type of grader.
 */
export class GraderTextSimilarityType extends S.Literal("text_similarity") {}

/**
 * The evaluation metric to use. One of `cosine`, `fuzzy_match`, `bleu`,
 * `gleu`, `meteor`, `rouge_1`, `rouge_2`, `rouge_3`, `rouge_4`, `rouge_5`,
 * or `rouge_l`.
 */
export class GraderTextSimilarityEvaluationMetric extends S.Literal(
  "cosine",
  "fuzzy_match",
  "bleu",
  "gleu",
  "meteor",
  "rouge_1",
  "rouge_2",
  "rouge_3",
  "rouge_4",
  "rouge_5",
  "rouge_l"
) {}

/**
 * A TextSimilarityGrader object which grades text based on similarity metrics.
 */
export class GraderTextSimilarity extends S.Class<GraderTextSimilarity>("GraderTextSimilarity")({
  /**
   * The type of grader.
   */
  "type": GraderTextSimilarityType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "text_similarity" as const)
  ),
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The text being graded.
   */
  "input": S.String,
  /**
   * The text being graded against.
   */
  "reference": S.String,
  /**
   * The evaluation metric to use. One of `cosine`, `fuzzy_match`, `bleu`,
   * `gleu`, `meteor`, `rouge_1`, `rouge_2`, `rouge_3`, `rouge_4`, `rouge_5`,
   * or `rouge_l`.
   */
  "evaluation_metric": GraderTextSimilarityEvaluationMetric
}) {}

/**
 * The object type, which is always `python`.
 */
export class GraderPythonType extends S.Literal("python") {}

/**
 * A PythonGrader object that runs a python script on the input.
 */
export class GraderPython extends S.Class<GraderPython>("GraderPython")({
  /**
   * The object type, which is always `python`.
   */
  "type": GraderPythonType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The source code of the python script.
   */
  "source": S.String,
  /**
   * The image tag to use for the python script.
   */
  "image_tag": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always `score_model`.
 */
export class GraderScoreModelType extends S.Literal("score_model") {}

/**
 * A ScoreModelGrader object that uses a model to assign a score to the input.
 */
export class GraderScoreModel extends S.Class<GraderScoreModel>("GraderScoreModel")({
  /**
   * The object type, which is always `score_model`.
   */
  "type": GraderScoreModelType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The model to use for the evaluation.
   */
  "model": S.String,
  /**
   * The sampling parameters for the model.
   */
  "sampling_params": S.optionalWith(
    S.Struct({
      "seed": S.optionalWith(S.Int, { nullable: true }),
      "top_p": S.optionalWith(S.Number, { nullable: true }),
      "temperature": S.optionalWith(S.Number, { nullable: true }),
      "max_completions_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
      "reasoning_effort": S.optionalWith(S.Literal("none", "minimal", "low", "medium", "high"), { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The input text. This may include template strings.
   */
  "input": S.Array(EvalItem),
  /**
   * The range of the score. Defaults to `[0, 1]`.
   */
  "range": S.optionalWith(S.Array(S.Number), { nullable: true })
}) {}

/**
 * The object type, which is always `multi`.
 */
export class GraderMultiType extends S.Literal("multi") {}

/**
 * The object type, which is always `label_model`.
 */
export class GraderLabelModelType extends S.Literal("label_model") {}

/**
 * A LabelModelGrader object which uses a model to assign labels to each item
 * in the evaluation.
 */
export class GraderLabelModel extends S.Class<GraderLabelModel>("GraderLabelModel")({
  /**
   * The object type, which is always `label_model`.
   */
  "type": GraderLabelModelType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The model to use for the evaluation. Must support structured outputs.
   */
  "model": S.String,
  "input": S.Array(EvalItem),
  /**
   * The labels to assign to each item in the evaluation.
   */
  "labels": S.Array(S.String),
  /**
   * The labels that indicate a passing result. Must be a subset of labels.
   */
  "passing_labels": S.Array(S.String)
}) {}

/**
 * A MultiGrader object combines the output of multiple graders to produce a single score.
 */
export class GraderMulti extends S.Class<GraderMulti>("GraderMulti")({
  /**
   * The object type, which is always `multi`.
   */
  "type": GraderMultiType.pipe(S.propertySignature, S.withConstructorDefault(() => "multi" as const)),
  /**
   * The name of the grader.
   */
  "name": S.String,
  "graders": S.Union(GraderStringCheck, GraderTextSimilarity, GraderPython, GraderScoreModel, GraderLabelModel),
  /**
   * A formula to calculate the output based on grader results.
   */
  "calculate_output": S.String
}) {}

export class RunGraderRequest extends S.Class<RunGraderRequest>("RunGraderRequest")({
  /**
   * The grader used for the fine-tuning job.
   */
  "grader": S.Record({ key: S.String, value: S.Unknown }),
  /**
   * The dataset item provided to the grader. This will be used to populate
   * the `item` namespace. See [the guide](https://platform.openai.com/docs/guides/graders) for more details.
   */
  "item": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * The model sample to be evaluated. This value will be used to populate
   * the `sample` namespace. See [the guide](https://platform.openai.com/docs/guides/graders) for more details.
   * The `output_json` variable will be populated if the model sample is a
   * valid JSON string.
   */
  "model_sample": S.String
}) {}

export class RunGraderResponse extends S.Class<RunGraderResponse>("RunGraderResponse")({
  "reward": S.Number,
  "metadata": S.Struct({
    "name": S.String,
    "type": S.String,
    "errors": S.Struct({
      "formula_parse_error": S.Boolean,
      "sample_parse_error": S.Boolean,
      "truncated_observation_error": S.Boolean,
      "unresponsive_reward_error": S.Boolean,
      "invalid_variable_error": S.Boolean,
      "other_error": S.Boolean,
      "python_grader_server_error": S.Boolean,
      "python_grader_server_error_type": S.NullOr(S.String),
      "python_grader_runtime_error": S.Boolean,
      "python_grader_runtime_error_details": S.NullOr(S.String),
      "model_grader_server_error": S.Boolean,
      "model_grader_refusal_error": S.Boolean,
      "model_grader_parse_error": S.Boolean,
      "model_grader_server_error_details": S.NullOr(S.String)
    }),
    "execution_time": S.Number,
    "scores": S.Record({ key: S.String, value: S.Unknown }),
    "token_usage": S.NullOr(S.Int),
    "sampled_model_name": S.NullOr(S.String)
  }),
  "sub_rewards": S.Record({ key: S.String, value: S.Unknown }),
  "model_grader_token_usage_per_model": S.Record({ key: S.String, value: S.Unknown })
}) {}

export class ValidateGraderRequest extends S.Class<ValidateGraderRequest>("ValidateGraderRequest")({
  /**
   * The grader used for the fine-tuning job.
   */
  "grader": S.Record({ key: S.String, value: S.Unknown })
}) {}

export class ValidateGraderResponse extends S.Class<ValidateGraderResponse>("ValidateGraderResponse")({
  /**
   * The grader used for the fine-tuning job.
   */
  "grader": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class ListFineTuningCheckpointPermissionsParamsOrder extends S.Literal("ascending", "descending") {}

export class ListFineTuningCheckpointPermissionsParams extends S.Struct({
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 10 as const }),
  "order": S.optionalWith(ListFineTuningCheckpointPermissionsParamsOrder, {
    nullable: true,
    default: () => "descending" as const
  })
}) {}

/**
 * The object type, which is always "checkpoint.permission".
 */
export class FineTuningCheckpointPermissionObject extends S.Literal("checkpoint.permission") {}

/**
 * The `checkpoint.permission` object represents a permission for a fine-tuned model checkpoint.
 */
export class FineTuningCheckpointPermission
  extends S.Class<FineTuningCheckpointPermission>("FineTuningCheckpointPermission")({
    /**
     * The permission identifier, which can be referenced in the API endpoints.
     */
    "id": S.String,
    /**
     * The Unix timestamp (in seconds) for when the permission was created.
     */
    "created_at": S.Int,
    /**
     * The project identifier that the permission is for.
     */
    "project_id": S.String,
    /**
     * The object type, which is always "checkpoint.permission".
     */
    "object": FineTuningCheckpointPermissionObject
  })
{}

export class ListFineTuningCheckpointPermissionResponseObject extends S.Literal("list") {}

export class ListFineTuningCheckpointPermissionResponse
  extends S.Class<ListFineTuningCheckpointPermissionResponse>("ListFineTuningCheckpointPermissionResponse")({
    "data": S.Array(FineTuningCheckpointPermission),
    "object": ListFineTuningCheckpointPermissionResponseObject,
    "first_id": S.optionalWith(S.String, { nullable: true }),
    "last_id": S.optionalWith(S.String, { nullable: true }),
    "has_more": S.Boolean
  })
{}

export class CreateFineTuningCheckpointPermissionRequest
  extends S.Class<CreateFineTuningCheckpointPermissionRequest>("CreateFineTuningCheckpointPermissionRequest")({
    /**
     * The project identifiers to grant access to.
     */
    "project_ids": S.Array(S.String)
  })
{}

/**
 * The object type, which is always "checkpoint.permission".
 */
export class DeleteFineTuningCheckpointPermissionResponseObject extends S.Literal("checkpoint.permission") {}

export class DeleteFineTuningCheckpointPermissionResponse
  extends S.Class<DeleteFineTuningCheckpointPermissionResponse>("DeleteFineTuningCheckpointPermissionResponse")({
    /**
     * The ID of the fine-tuned model checkpoint permission that was deleted.
     */
    "id": S.String,
    /**
     * The object type, which is always "checkpoint.permission".
     */
    "object": DeleteFineTuningCheckpointPermissionResponseObject,
    /**
     * Whether the fine-tuned model checkpoint permission was successfully deleted.
     */
    "deleted": S.Boolean
  })
{}

export class ListPaginatedFineTuningJobsParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class FineTuningJobHyperparametersBatchSizeEnum extends S.Literal("auto") {}

export class FineTuningJobHyperparametersLearningRateMultiplierEnum extends S.Literal("auto") {}

export class FineTuningJobHyperparametersNEpochsEnum extends S.Literal("auto") {}

/**
 * The object type, which is always "fine_tuning.job".
 */
export class FineTuningJobObject extends S.Literal("fine_tuning.job") {}

/**
 * The current status of the fine-tuning job, which can be either `validating_files`, `queued`, `running`, `succeeded`, `failed`, or `cancelled`.
 */
export class FineTuningJobStatus
  extends S.Literal("validating_files", "queued", "running", "succeeded", "failed", "cancelled")
{}

/**
 * The type of the integration being enabled for the fine-tuning job
 */
export class FineTuningIntegrationType extends S.Literal("wandb") {}

export class FineTuningIntegration extends S.Class<FineTuningIntegration>("FineTuningIntegration")({
  /**
   * The type of the integration being enabled for the fine-tuning job
   */
  "type": FineTuningIntegrationType,
  /**
   * The settings for your integration with Weights and Biases. This payload specifies the project that
   * metrics will be sent to. Optionally, you can set an explicit display name for your run, add tags
   * to your run, and set a default entity (team, username, etc) to be associated with your run.
   */
  "wandb": S.Struct({
    /**
     * The name of the project that the new run will be created under.
     */
    "project": S.String,
    "name": S.optionalWith(S.String, { nullable: true }),
    "entity": S.optionalWith(S.String, { nullable: true }),
    /**
     * A list of tags to be attached to the newly created run. These tags are passed through directly to WandB. Some
     * default tags are generated by OpenAI: "openai/finetune", "openai/{base-model}", "openai/{ftjob-abcdef}".
     */
    "tags": S.optionalWith(S.Array(S.String), { nullable: true })
  })
}) {}

/**
 * The type of method. Is either `supervised`, `dpo`, or `reinforcement`.
 */
export class FineTuneMethodType extends S.Literal("supervised", "dpo", "reinforcement") {}

export class FineTuneSupervisedHyperparametersBatchSizeEnum extends S.Literal("auto") {}

export class FineTuneSupervisedHyperparametersLearningRateMultiplierEnum extends S.Literal("auto") {}

export class FineTuneSupervisedHyperparametersNEpochsEnum extends S.Literal("auto") {}

/**
 * The hyperparameters used for the fine-tuning job.
 */
export class FineTuneSupervisedHyperparameters
  extends S.Class<FineTuneSupervisedHyperparameters>("FineTuneSupervisedHyperparameters")({
    /**
     * Number of examples in each batch. A larger batch size means that model parameters are updated less frequently, but with lower variance.
     */
    "batch_size": S.optionalWith(
      S.Union(
        FineTuneSupervisedHyperparametersBatchSizeEnum,
        S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
      ),
      { nullable: true, default: () => "auto" as const }
    ),
    /**
     * Scaling factor for the learning rate. A smaller learning rate may be useful to avoid overfitting.
     */
    "learning_rate_multiplier": S.optionalWith(
      S.Union(FineTuneSupervisedHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
      { nullable: true }
    ),
    /**
     * The number of epochs to train the model for. An epoch refers to one full cycle through the training dataset.
     */
    "n_epochs": S.optionalWith(
      S.Union(
        FineTuneSupervisedHyperparametersNEpochsEnum,
        S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))
      ),
      { nullable: true, default: () => "auto" as const }
    )
  })
{}

/**
 * Configuration for the supervised fine-tuning method.
 */
export class FineTuneSupervisedMethod extends S.Class<FineTuneSupervisedMethod>("FineTuneSupervisedMethod")({
  "hyperparameters": S.optionalWith(FineTuneSupervisedHyperparameters, { nullable: true })
}) {}

export class FineTuneDPOHyperparametersBetaEnum extends S.Literal("auto") {}

export class FineTuneDPOHyperparametersBatchSizeEnum extends S.Literal("auto") {}

export class FineTuneDPOHyperparametersLearningRateMultiplierEnum extends S.Literal("auto") {}

export class FineTuneDPOHyperparametersNEpochsEnum extends S.Literal("auto") {}

/**
 * The hyperparameters used for the DPO fine-tuning job.
 */
export class FineTuneDPOHyperparameters extends S.Class<FineTuneDPOHyperparameters>("FineTuneDPOHyperparameters")({
  /**
   * The beta value for the DPO method. A higher beta value will increase the weight of the penalty between the policy and reference model.
   */
  "beta": S.optionalWith(
    S.Union(FineTuneDPOHyperparametersBetaEnum, S.Number.pipe(S.greaterThan(0), S.lessThanOrEqualTo(2))),
    { nullable: true }
  ),
  /**
   * Number of examples in each batch. A larger batch size means that model parameters are updated less frequently, but with lower variance.
   */
  "batch_size": S.optionalWith(
    S.Union(FineTuneDPOHyperparametersBatchSizeEnum, S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))),
    {
      nullable: true,
      default: () => "auto" as const
    }
  ),
  /**
   * Scaling factor for the learning rate. A smaller learning rate may be useful to avoid overfitting.
   */
  "learning_rate_multiplier": S.optionalWith(
    S.Union(FineTuneDPOHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
    { nullable: true }
  ),
  /**
   * The number of epochs to train the model for. An epoch refers to one full cycle through the training dataset.
   */
  "n_epochs": S.optionalWith(
    S.Union(FineTuneDPOHyperparametersNEpochsEnum, S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))),
    {
      nullable: true,
      default: () => "auto" as const
    }
  )
}) {}

/**
 * Configuration for the DPO fine-tuning method.
 */
export class FineTuneDPOMethod extends S.Class<FineTuneDPOMethod>("FineTuneDPOMethod")({
  "hyperparameters": S.optionalWith(FineTuneDPOHyperparameters, { nullable: true })
}) {}

export class FineTuneReinforcementHyperparametersBatchSizeEnum extends S.Literal("auto") {}

export class FineTuneReinforcementHyperparametersLearningRateMultiplierEnum extends S.Literal("auto") {}

export class FineTuneReinforcementHyperparametersNEpochsEnum extends S.Literal("auto") {}

/**
 * Level of reasoning effort.
 */
export class FineTuneReinforcementHyperparametersReasoningEffort
  extends S.Literal("default", "low", "medium", "high")
{}

export class FineTuneReinforcementHyperparametersComputeMultiplierEnum extends S.Literal("auto") {}

export class FineTuneReinforcementHyperparametersEvalIntervalEnum extends S.Literal("auto") {}

export class FineTuneReinforcementHyperparametersEvalSamplesEnum extends S.Literal("auto") {}

/**
 * The hyperparameters used for the reinforcement fine-tuning job.
 */
export class FineTuneReinforcementHyperparameters
  extends S.Class<FineTuneReinforcementHyperparameters>("FineTuneReinforcementHyperparameters")({
    /**
     * Number of examples in each batch. A larger batch size means that model parameters are updated less frequently, but with lower variance.
     */
    "batch_size": S.optionalWith(
      S.Union(
        FineTuneReinforcementHyperparametersBatchSizeEnum,
        S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
      ),
      { nullable: true, default: () => "auto" as const }
    ),
    /**
     * Scaling factor for the learning rate. A smaller learning rate may be useful to avoid overfitting.
     */
    "learning_rate_multiplier": S.optionalWith(
      S.Union(FineTuneReinforcementHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
      { nullable: true }
    ),
    /**
     * The number of epochs to train the model for. An epoch refers to one full cycle through the training dataset.
     */
    "n_epochs": S.optionalWith(
      S.Union(
        FineTuneReinforcementHyperparametersNEpochsEnum,
        S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))
      ),
      { nullable: true, default: () => "auto" as const }
    ),
    /**
     * Level of reasoning effort.
     */
    "reasoning_effort": S.optionalWith(FineTuneReinforcementHyperparametersReasoningEffort, {
      nullable: true,
      default: () => "default" as const
    }),
    /**
     * Multiplier on amount of compute used for exploring search space during training.
     */
    "compute_multiplier": S.optionalWith(
      S.Union(
        FineTuneReinforcementHyperparametersComputeMultiplierEnum,
        S.Number.pipe(S.greaterThan(0.00001), S.lessThanOrEqualTo(10))
      ),
      { nullable: true }
    ),
    /**
     * The number of training steps between evaluation runs.
     */
    "eval_interval": S.optionalWith(
      S.Union(FineTuneReinforcementHyperparametersEvalIntervalEnum, S.Int.pipe(S.greaterThanOrEqualTo(1))),
      {
        nullable: true,
        default: () => "auto" as const
      }
    ),
    /**
     * Number of evaluation samples to generate per training step.
     */
    "eval_samples": S.optionalWith(
      S.Union(FineTuneReinforcementHyperparametersEvalSamplesEnum, S.Int.pipe(S.greaterThanOrEqualTo(1))),
      {
        nullable: true,
        default: () => "auto" as const
      }
    )
  })
{}

/**
 * Configuration for the reinforcement fine-tuning method.
 */
export class FineTuneReinforcementMethod extends S.Class<FineTuneReinforcementMethod>("FineTuneReinforcementMethod")({
  /**
   * The grader used for the fine-tuning job.
   */
  "grader": S.Record({ key: S.String, value: S.Unknown }),
  "hyperparameters": S.optionalWith(FineTuneReinforcementHyperparameters, { nullable: true })
}) {}

/**
 * The method used for fine-tuning.
 */
export class FineTuneMethod extends S.Class<FineTuneMethod>("FineTuneMethod")({
  /**
   * The type of method. Is either `supervised`, `dpo`, or `reinforcement`.
   */
  "type": FineTuneMethodType,
  "supervised": S.optionalWith(FineTuneSupervisedMethod, { nullable: true }),
  "dpo": S.optionalWith(FineTuneDPOMethod, { nullable: true }),
  "reinforcement": S.optionalWith(FineTuneReinforcementMethod, { nullable: true })
}) {}

/**
 * The `fine_tuning.job` object represents a fine-tuning job that has been created through the API.
 */
export class FineTuningJob extends S.Class<FineTuningJob>("FineTuningJob")({
  /**
   * The object identifier, which can be referenced in the API endpoints.
   */
  "id": S.String,
  /**
   * The Unix timestamp (in seconds) for when the fine-tuning job was created.
   */
  "created_at": S.Int,
  "error": S.NullOr(S.Struct({
    /**
     * A machine-readable error code.
     */
    "code": S.String,
    /**
     * A human-readable error message.
     */
    "message": S.String,
    "param": S.NullOr(S.String)
  })),
  "fine_tuned_model": S.NullOr(S.String),
  "finished_at": S.NullOr(S.Int),
  /**
   * The hyperparameters used for the fine-tuning job. This value will only be returned when running `supervised` jobs.
   */
  "hyperparameters": S.Struct({
    "batch_size": S.optionalWith(
      S.Union(
        FineTuningJobHyperparametersBatchSizeEnum,
        S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
      ),
      { nullable: true }
    ),
    /**
     * Scaling factor for the learning rate. A smaller learning rate may be useful to avoid
     * overfitting.
     */
    "learning_rate_multiplier": S.optionalWith(
      S.Union(FineTuningJobHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
      { nullable: true }
    ),
    /**
     * The number of epochs to train the model for. An epoch refers to one full cycle
     * through the training dataset.
     */
    "n_epochs": S.optionalWith(
      S.Union(FineTuningJobHyperparametersNEpochsEnum, S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50))),
      {
        nullable: true,
        default: () => "auto" as const
      }
    )
  }),
  /**
   * The base model that is being fine-tuned.
   */
  "model": S.String,
  /**
   * The object type, which is always "fine_tuning.job".
   */
  "object": FineTuningJobObject,
  /**
   * The organization that owns the fine-tuning job.
   */
  "organization_id": S.String,
  /**
   * The compiled results file ID(s) for the fine-tuning job. You can retrieve the results with the [Files API](https://platform.openai.com/docs/api-reference/files/retrieve-contents).
   */
  "result_files": S.Array(S.String),
  /**
   * The current status of the fine-tuning job, which can be either `validating_files`, `queued`, `running`, `succeeded`, `failed`, or `cancelled`.
   */
  "status": FineTuningJobStatus,
  "trained_tokens": S.NullOr(S.Int),
  /**
   * The file ID used for training. You can retrieve the training data with the [Files API](https://platform.openai.com/docs/api-reference/files/retrieve-contents).
   */
  "training_file": S.String,
  "validation_file": S.NullOr(S.String),
  "integrations": S.optionalWith(S.Array(FineTuningIntegration).pipe(S.maxItems(5)), { nullable: true }),
  /**
   * The seed used for the fine-tuning job.
   */
  "seed": S.Int,
  "estimated_finish": S.optionalWith(S.Int, { nullable: true }),
  "method": S.optionalWith(FineTuneMethod, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
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
  /**
   * The name of the model to fine-tune. You can select one of the
   * [supported models](https://platform.openai.com/docs/guides/fine-tuning#which-models-can-be-fine-tuned).
   */
  "model": S.Union(S.String, CreateFineTuningJobRequestModelEnum),
  /**
   * The ID of an uploaded file that contains training data.
   *
   * See [upload file](https://platform.openai.com/docs/api-reference/files/create) for how to upload a file.
   *
   * Your dataset must be formatted as a JSONL file. Additionally, you must upload your file with the purpose `fine-tune`.
   *
   * The contents of the file should differ depending on if the model uses the [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input), [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input) format, or if the fine-tuning method uses the [preference](https://platform.openai.com/docs/api-reference/fine-tuning/preference-input) format.
   *
   * See the [fine-tuning guide](https://platform.openai.com/docs/guides/model-optimization) for more details.
   */
  "training_file": S.String,
  /**
   * The hyperparameters used for the fine-tuning job.
   * This value is now deprecated in favor of `method`, and should be passed in under the `method` parameter.
   */
  "hyperparameters": S.optionalWith(
    S.Struct({
      /**
       * Number of examples in each batch. A larger batch size means that model parameters
       * are updated less frequently, but with lower variance.
       */
      "batch_size": S.optionalWith(
        S.Union(
          CreateFineTuningJobRequestHyperparametersBatchSizeEnum,
          S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
        ),
        { nullable: true, default: () => "auto" as const }
      ),
      /**
       * Scaling factor for the learning rate. A smaller learning rate may be useful to avoid
       * overfitting.
       */
      "learning_rate_multiplier": S.optionalWith(
        S.Union(CreateFineTuningJobRequestHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
        { nullable: true }
      ),
      /**
       * The number of epochs to train the model for. An epoch refers to one full cycle
       * through the training dataset.
       */
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
  /**
   * A string of up to 64 characters that will be added to your fine-tuned model name.
   *
   * For example, a `suffix` of "custom-model-name" would produce a model name like `ft:gpt-4o-mini:openai:custom-model-name:7p4lURel`.
   */
  "suffix": S.optionalWith(S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(64))), { default: () => null }),
  /**
   * The ID of an uploaded file that contains validation data.
   *
   * If you provide this file, the data is used to generate validation
   * metrics periodically during fine-tuning. These metrics can be viewed in
   * the fine-tuning results file.
   * The same data should not be present in both train and validation files.
   *
   * Your dataset must be formatted as a JSONL file. You must upload your file with the purpose `fine-tune`.
   *
   * See the [fine-tuning guide](https://platform.openai.com/docs/guides/model-optimization) for more details.
   */
  "validation_file": S.optionalWith(S.String, { nullable: true }),
  /**
   * A list of integrations to enable for your fine-tuning job.
   */
  "integrations": S.optionalWith(
    S.Array(S.Struct({
      /**
       * The type of integration to enable. Currently, only "wandb" (Weights and Biases) is supported.
       */
      "type": S.Literal("wandb"),
      /**
       * The settings for your integration with Weights and Biases. This payload specifies the project that
       * metrics will be sent to. Optionally, you can set an explicit display name for your run, add tags
       * to your run, and set a default entity (team, username, etc) to be associated with your run.
       */
      "wandb": S.Struct({
        /**
         * The name of the project that the new run will be created under.
         */
        "project": S.String,
        /**
         * A display name to set for the run. If not set, we will use the Job ID as the name.
         */
        "name": S.optionalWith(S.String, { nullable: true }),
        /**
         * The entity to use for the run. This allows you to set the team or username of the WandB user that you would
         * like associated with the run. If not set, the default entity for the registered WandB API key is used.
         */
        "entity": S.optionalWith(S.String, { nullable: true }),
        /**
         * A list of tags to be attached to the newly created run. These tags are passed through directly to WandB. Some
         * default tags are generated by OpenAI: "openai/finetune", "openai/{base-model}", "openai/{ftjob-abcdef}".
         */
        "tags": S.optionalWith(S.Array(S.String), { nullable: true })
      })
    })),
    { nullable: true }
  ),
  /**
   * The seed controls the reproducibility of the job. Passing in the same seed and job parameters should produce the same results, but may differ in rare cases.
   * If a seed is not specified, one will be generated for you.
   */
  "seed": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2147483647)), { nullable: true }),
  "method": S.optionalWith(FineTuneMethod, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class ListFineTuningJobCheckpointsParams extends S.Struct({
  "after": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 10 as const })
}) {}

/**
 * The object type, which is always "fine_tuning.job.checkpoint".
 */
export class FineTuningJobCheckpointObject extends S.Literal("fine_tuning.job.checkpoint") {}

/**
 * The `fine_tuning.job.checkpoint` object represents a model checkpoint for a fine-tuning job that is ready to use.
 */
export class FineTuningJobCheckpoint extends S.Class<FineTuningJobCheckpoint>("FineTuningJobCheckpoint")({
  /**
   * The checkpoint identifier, which can be referenced in the API endpoints.
   */
  "id": S.String,
  /**
   * The Unix timestamp (in seconds) for when the checkpoint was created.
   */
  "created_at": S.Int,
  /**
   * The name of the fine-tuned checkpoint model that is created.
   */
  "fine_tuned_model_checkpoint": S.String,
  /**
   * The step number that the checkpoint was created at.
   */
  "step_number": S.Int,
  /**
   * Metrics at the step number during the fine-tuning job.
   */
  "metrics": S.Struct({
    "step": S.optionalWith(S.Number, { nullable: true }),
    "train_loss": S.optionalWith(S.Number, { nullable: true }),
    "train_mean_token_accuracy": S.optionalWith(S.Number, { nullable: true }),
    "valid_loss": S.optionalWith(S.Number, { nullable: true }),
    "valid_mean_token_accuracy": S.optionalWith(S.Number, { nullable: true }),
    "full_valid_loss": S.optionalWith(S.Number, { nullable: true }),
    "full_valid_mean_token_accuracy": S.optionalWith(S.Number, { nullable: true })
  }),
  /**
   * The name of the fine-tuning job that this checkpoint was created from.
   */
  "fine_tuning_job_id": S.String,
  /**
   * The object type, which is always "fine_tuning.job.checkpoint".
   */
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

/**
 * The object type, which is always "fine_tuning.job.event".
 */
export class FineTuningJobEventObject extends S.Literal("fine_tuning.job.event") {}

/**
 * The log level of the event.
 */
export class FineTuningJobEventLevel extends S.Literal("info", "warn", "error") {}

/**
 * The type of event.
 */
export class FineTuningJobEventType extends S.Literal("message", "metrics") {}

/**
 * Fine-tuning job event object
 */
export class FineTuningJobEvent extends S.Class<FineTuningJobEvent>("FineTuningJobEvent")({
  /**
   * The object type, which is always "fine_tuning.job.event".
   */
  "object": FineTuningJobEventObject,
  /**
   * The object identifier.
   */
  "id": S.String,
  /**
   * The Unix timestamp (in seconds) for when the fine-tuning job was created.
   */
  "created_at": S.Int,
  /**
   * The log level of the event.
   */
  "level": FineTuningJobEventLevel,
  /**
   * The message of the event.
   */
  "message": S.String,
  /**
   * The type of event.
   */
  "type": S.optionalWith(FineTuningJobEventType, { nullable: true }),
  /**
   * The data associated with the event.
   */
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

/**
 * Allows to set transparency for the background of the generated image(s).
 * This parameter is only supported for `gpt-image-1`. Must be one of
 * `transparent`, `opaque` or `auto` (default value). When `auto` is used, the
 * model will automatically determine the best background for the image.
 *
 * If `transparent`, the output format needs to support transparency, so it
 * should be set to either `png` (default value) or `webp`.
 */
export class CreateImageEditRequestBackground extends S.Literal("transparent", "opaque", "auto") {}

export class CreateImageEditRequestModelEnum extends S.Literal("dall-e-2", "gpt-image-1", "gpt-image-1-mini") {}

/**
 * The size of the generated images. Must be one of `1024x1024`, `1536x1024` (landscape), `1024x1536` (portrait), or `auto` (default value) for `gpt-image-1`, and one of `256x256`, `512x512`, or `1024x1024` for `dall-e-2`.
 */
export class CreateImageEditRequestSize
  extends S.Literal("256x256", "512x512", "1024x1024", "1536x1024", "1024x1536", "auto")
{}

/**
 * The format in which the generated images are returned. Must be one of `url` or `b64_json`. URLs are only valid for 60 minutes after the image has been generated. This parameter is only supported for `dall-e-2`, as `gpt-image-1` will always return base64-encoded images.
 */
export class CreateImageEditRequestResponseFormat extends S.Literal("url", "b64_json") {}

/**
 * The format in which the generated images are returned. This parameter is
 * only supported for `gpt-image-1`. Must be one of `png`, `jpeg`, or `webp`.
 * The default value is `png`.
 */
export class CreateImageEditRequestOutputFormat extends S.Literal("png", "jpeg", "webp") {}

export class PartialImages extends S.Union(
  /**
   * The number of partial images to generate. This parameter is used for
   * streaming responses that return partial images. Value must be between 0 and 3.
   * When set to 0, the response will be a single image sent in one streaming event.
   *
   * Note that the final image may be sent before the full number of partial images
   * are generated if the full image is generated more quickly.
   */
  S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(3)),
  S.Null
) {}

/**
 * The quality of the image that will be generated. `high`, `medium` and `low` are only supported for `gpt-image-1`. `dall-e-2` only supports `standard` quality. Defaults to `auto`.
 */
export class CreateImageEditRequestQuality extends S.Literal("standard", "low", "medium", "high", "auto") {}

export class CreateImageEditRequest extends S.Class<CreateImageEditRequest>("CreateImageEditRequest")({
  /**
   * The image(s) to edit. Must be a supported image file or an array of images.
   *
   * For `gpt-image-1`, each image should be a `png`, `webp`, or `jpg` file less
   * than 50MB. You can provide up to 16 images.
   *
   * For `dall-e-2`, you can only provide one image, and it should be a square
   * `png` file less than 4MB.
   */
  "image": S.Union(S.instanceOf(globalThis.Blob), S.Array(S.instanceOf(globalThis.Blob)).pipe(S.maxItems(16))),
  /**
   * A text description of the desired image(s). The maximum length is 1000 characters for `dall-e-2`, and 32000 characters for `gpt-image-1`.
   */
  "prompt": S.String,
  /**
   * An additional image whose fully transparent areas (e.g. where alpha is zero) indicate where `image` should be edited. If there are multiple images provided, the mask will be applied on the first image. Must be a valid PNG file, less than 4MB, and have the same dimensions as `image`.
   */
  "mask": S.optionalWith(S.instanceOf(globalThis.Blob), { nullable: true }),
  /**
   * Allows to set transparency for the background of the generated image(s).
   * This parameter is only supported for `gpt-image-1`. Must be one of
   * `transparent`, `opaque` or `auto` (default value). When `auto` is used, the
   * model will automatically determine the best background for the image.
   *
   * If `transparent`, the output format needs to support transparency, so it
   * should be set to either `png` (default value) or `webp`.
   */
  "background": S.optionalWith(CreateImageEditRequestBackground, { nullable: true, default: () => "auto" as const }),
  /**
   * The model to use for image generation. Only `dall-e-2` and `gpt-image-1` are supported. Defaults to `dall-e-2` unless a parameter specific to `gpt-image-1` is used.
   */
  "model": S.optionalWith(S.Union(S.String, CreateImageEditRequestModelEnum), { nullable: true }),
  /**
   * The number of images to generate. Must be between 1 and 10.
   */
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(10)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * The size of the generated images. Must be one of `1024x1024`, `1536x1024` (landscape), `1024x1536` (portrait), or `auto` (default value) for `gpt-image-1`, and one of `256x256`, `512x512`, or `1024x1024` for `dall-e-2`.
   */
  "size": S.optionalWith(CreateImageEditRequestSize, { nullable: true, default: () => "1024x1024" as const }),
  /**
   * The format in which the generated images are returned. Must be one of `url` or `b64_json`. URLs are only valid for 60 minutes after the image has been generated. This parameter is only supported for `dall-e-2`, as `gpt-image-1` will always return base64-encoded images.
   */
  "response_format": S.optionalWith(CreateImageEditRequestResponseFormat, {
    nullable: true,
    default: () => "url" as const
  }),
  /**
   * The format in which the generated images are returned. This parameter is
   * only supported for `gpt-image-1`. Must be one of `png`, `jpeg`, or `webp`.
   * The default value is `png`.
   */
  "output_format": S.optionalWith(CreateImageEditRequestOutputFormat, {
    nullable: true,
    default: () => "png" as const
  }),
  /**
   * The compression level (0-100%) for the generated images. This parameter
   * is only supported for `gpt-image-1` with the `webp` or `jpeg` output
   * formats, and defaults to 100.
   */
  "output_compression": S.optionalWith(S.Int, { nullable: true, default: () => 100 as const }),
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids).
   */
  "user": S.optionalWith(S.String, { nullable: true }),
  "input_fidelity": S.optionalWith(InputFidelity, { nullable: true }),
  /**
   * Edit the image in streaming mode. Defaults to `false`. See the
   * [Image generation guide](https://platform.openai.com/docs/guides/image-generation) for more information.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "partial_images": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(3)), { nullable: true }),
  /**
   * The quality of the image that will be generated. `high`, `medium` and `low` are only supported for `gpt-image-1`. `dall-e-2` only supports `standard` quality. Defaults to `auto`.
   */
  "quality": S.optionalWith(CreateImageEditRequestQuality, { nullable: true, default: () => "auto" as const })
}) {}

/**
 * Represents the content or the URL of an image generated by the OpenAI API.
 */
export class Image extends S.Class<Image>("Image")({
  /**
   * The base64-encoded JSON of the generated image. Default value for `gpt-image-1`, and only present if `response_format` is set to `b64_json` for `dall-e-2` and `dall-e-3`.
   */
  "b64_json": S.optionalWith(S.String, { nullable: true }),
  /**
   * When using `dall-e-2` or `dall-e-3`, the URL of the generated image if `response_format` is set to `url` (default value). Unsupported for `gpt-image-1`.
   */
  "url": S.optionalWith(S.String, { nullable: true }),
  /**
   * For `dall-e-3` only, the revised prompt that was used to generate the image.
   */
  "revised_prompt": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The background parameter used for the image generation. Either `transparent` or `opaque`.
 */
export class ImagesResponseBackground extends S.Literal("transparent", "opaque") {}

/**
 * The output format of the image generation. Either `png`, `webp`, or `jpeg`.
 */
export class ImagesResponseOutputFormat extends S.Literal("png", "webp", "jpeg") {}

/**
 * The size of the image generated. Either `1024x1024`, `1024x1536`, or `1536x1024`.
 */
export class ImagesResponseSize extends S.Literal("1024x1024", "1024x1536", "1536x1024") {}

/**
 * The quality of the image generated. Either `low`, `medium`, or `high`.
 */
export class ImagesResponseQuality extends S.Literal("low", "medium", "high") {}

/**
 * The input tokens detailed information for the image generation.
 */
export class ImageGenInputUsageDetails extends S.Class<ImageGenInputUsageDetails>("ImageGenInputUsageDetails")({
  /**
   * The number of text tokens in the input prompt.
   */
  "text_tokens": S.Int,
  /**
   * The number of image tokens in the input prompt.
   */
  "image_tokens": S.Int
}) {}

/**
 * For `gpt-image-1` only, the token usage information for the image generation.
 */
export class ImageGenUsage extends S.Class<ImageGenUsage>("ImageGenUsage")({
  /**
   * The number of tokens (images and text) in the input prompt.
   */
  "input_tokens": S.Int,
  /**
   * The total number of tokens (images and text) used for the image generation.
   */
  "total_tokens": S.Int,
  /**
   * The number of output tokens generated by the model.
   */
  "output_tokens": S.Int,
  "input_tokens_details": ImageGenInputUsageDetails
}) {}

/**
 * The response from the image generation endpoint.
 */
export class ImagesResponse extends S.Class<ImagesResponse>("ImagesResponse")({
  /**
   * The Unix timestamp (in seconds) of when the image was created.
   */
  "created": S.Int,
  /**
   * The list of generated images.
   */
  "data": S.optionalWith(S.Array(Image), { nullable: true }),
  /**
   * The background parameter used for the image generation. Either `transparent` or `opaque`.
   */
  "background": S.optionalWith(ImagesResponseBackground, { nullable: true }),
  /**
   * The output format of the image generation. Either `png`, `webp`, or `jpeg`.
   */
  "output_format": S.optionalWith(ImagesResponseOutputFormat, { nullable: true }),
  /**
   * The size of the image generated. Either `1024x1024`, `1024x1536`, or `1536x1024`.
   */
  "size": S.optionalWith(ImagesResponseSize, { nullable: true }),
  /**
   * The quality of the image generated. Either `low`, `medium`, or `high`.
   */
  "quality": S.optionalWith(ImagesResponseQuality, { nullable: true }),
  "usage": S.optionalWith(ImageGenUsage, { nullable: true })
}) {}

export class CreateImageRequestModelEnum extends S.Literal("dall-e-2", "dall-e-3", "gpt-image-1", "gpt-image-1-mini") {}

/**
 * The quality of the image that will be generated.
 *
 * - `auto` (default value) will automatically select the best quality for the given model.
 * - `high`, `medium` and `low` are supported for `gpt-image-1`.
 * - `hd` and `standard` are supported for `dall-e-3`.
 * - `standard` is the only option for `dall-e-2`.
 */
export class CreateImageRequestQuality extends S.Literal("standard", "hd", "low", "medium", "high", "auto") {}

/**
 * The format in which generated images with `dall-e-2` and `dall-e-3` are returned. Must be one of `url` or `b64_json`. URLs are only valid for 60 minutes after the image has been generated. This parameter isn't supported for `gpt-image-1` which will always return base64-encoded images.
 */
export class CreateImageRequestResponseFormat extends S.Literal("url", "b64_json") {}

/**
 * The format in which the generated images are returned. This parameter is only supported for `gpt-image-1`. Must be one of `png`, `jpeg`, or `webp`.
 */
export class CreateImageRequestOutputFormat extends S.Literal("png", "jpeg", "webp") {}

/**
 * The size of the generated images. Must be one of `1024x1024`, `1536x1024` (landscape), `1024x1536` (portrait), or `auto` (default value) for `gpt-image-1`, one of `256x256`, `512x512`, or `1024x1024` for `dall-e-2`, and one of `1024x1024`, `1792x1024`, or `1024x1792` for `dall-e-3`.
 */
export class CreateImageRequestSize
  extends S.Literal("auto", "1024x1024", "1536x1024", "1024x1536", "256x256", "512x512", "1792x1024", "1024x1792")
{}

/**
 * Control the content-moderation level for images generated by `gpt-image-1`. Must be either `low` for less restrictive filtering or `auto` (default value).
 */
export class CreateImageRequestModeration extends S.Literal("low", "auto") {}

/**
 * Allows to set transparency for the background of the generated image(s).
 * This parameter is only supported for `gpt-image-1`. Must be one of
 * `transparent`, `opaque` or `auto` (default value). When `auto` is used, the
 * model will automatically determine the best background for the image.
 *
 * If `transparent`, the output format needs to support transparency, so it
 * should be set to either `png` (default value) or `webp`.
 */
export class CreateImageRequestBackground extends S.Literal("transparent", "opaque", "auto") {}

/**
 * The style of the generated images. This parameter is only supported for `dall-e-3`. Must be one of `vivid` or `natural`. Vivid causes the model to lean towards generating hyper-real and dramatic images. Natural causes the model to produce more natural, less hyper-real looking images.
 */
export class CreateImageRequestStyle extends S.Literal("vivid", "natural") {}

export class CreateImageRequest extends S.Class<CreateImageRequest>("CreateImageRequest")({
  /**
   * A text description of the desired image(s). The maximum length is 32000 characters for `gpt-image-1`, 1000 characters for `dall-e-2` and 4000 characters for `dall-e-3`.
   */
  "prompt": S.String,
  /**
   * The model to use for image generation. One of `dall-e-2`, `dall-e-3`, or `gpt-image-1`. Defaults to `dall-e-2` unless a parameter specific to `gpt-image-1` is used.
   */
  "model": S.optionalWith(S.Union(S.String, CreateImageRequestModelEnum), { nullable: true }),
  /**
   * The number of images to generate. Must be between 1 and 10. For `dall-e-3`, only `n=1` is supported.
   */
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(10)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * The quality of the image that will be generated.
   *
   * - `auto` (default value) will automatically select the best quality for the given model.
   * - `high`, `medium` and `low` are supported for `gpt-image-1`.
   * - `hd` and `standard` are supported for `dall-e-3`.
   * - `standard` is the only option for `dall-e-2`.
   */
  "quality": S.optionalWith(CreateImageRequestQuality, { nullable: true, default: () => "auto" as const }),
  /**
   * The format in which generated images with `dall-e-2` and `dall-e-3` are returned. Must be one of `url` or `b64_json`. URLs are only valid for 60 minutes after the image has been generated. This parameter isn't supported for `gpt-image-1` which will always return base64-encoded images.
   */
  "response_format": S.optionalWith(CreateImageRequestResponseFormat, {
    nullable: true,
    default: () => "url" as const
  }),
  /**
   * The format in which the generated images are returned. This parameter is only supported for `gpt-image-1`. Must be one of `png`, `jpeg`, or `webp`.
   */
  "output_format": S.optionalWith(CreateImageRequestOutputFormat, { nullable: true, default: () => "png" as const }),
  /**
   * The compression level (0-100%) for the generated images. This parameter is only supported for `gpt-image-1` with the `webp` or `jpeg` output formats, and defaults to 100.
   */
  "output_compression": S.optionalWith(S.Int, { nullable: true, default: () => 100 as const }),
  /**
   * Generate the image in streaming mode. Defaults to `false`. See the
   * [Image generation guide](https://platform.openai.com/docs/guides/image-generation) for more information.
   * This parameter is only supported for `gpt-image-1`.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "partial_images": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(3)), { nullable: true }),
  /**
   * The size of the generated images. Must be one of `1024x1024`, `1536x1024` (landscape), `1024x1536` (portrait), or `auto` (default value) for `gpt-image-1`, one of `256x256`, `512x512`, or `1024x1024` for `dall-e-2`, and one of `1024x1024`, `1792x1024`, or `1024x1792` for `dall-e-3`.
   */
  "size": S.optionalWith(CreateImageRequestSize, { nullable: true, default: () => "auto" as const }),
  /**
   * Control the content-moderation level for images generated by `gpt-image-1`. Must be either `low` for less restrictive filtering or `auto` (default value).
   */
  "moderation": S.optionalWith(CreateImageRequestModeration, { nullable: true, default: () => "auto" as const }),
  /**
   * Allows to set transparency for the background of the generated image(s).
   * This parameter is only supported for `gpt-image-1`. Must be one of
   * `transparent`, `opaque` or `auto` (default value). When `auto` is used, the
   * model will automatically determine the best background for the image.
   *
   * If `transparent`, the output format needs to support transparency, so it
   * should be set to either `png` (default value) or `webp`.
   */
  "background": S.optionalWith(CreateImageRequestBackground, { nullable: true, default: () => "auto" as const }),
  /**
   * The style of the generated images. This parameter is only supported for `dall-e-3`. Must be one of `vivid` or `natural`. Vivid causes the model to lean towards generating hyper-real and dramatic images. Natural causes the model to produce more natural, less hyper-real looking images.
   */
  "style": S.optionalWith(CreateImageRequestStyle, { nullable: true, default: () => "vivid" as const }),
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids).
   */
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

export class CreateImageVariationRequestModelEnum extends S.Literal("dall-e-2") {}

/**
 * The format in which the generated images are returned. Must be one of `url` or `b64_json`. URLs are only valid for 60 minutes after the image has been generated.
 */
export class CreateImageVariationRequestResponseFormat extends S.Literal("url", "b64_json") {}

/**
 * The size of the generated images. Must be one of `256x256`, `512x512`, or `1024x1024`.
 */
export class CreateImageVariationRequestSize extends S.Literal("256x256", "512x512", "1024x1024") {}

export class CreateImageVariationRequest extends S.Class<CreateImageVariationRequest>("CreateImageVariationRequest")({
  /**
   * The image to use as the basis for the variation(s). Must be a valid PNG file, less than 4MB, and square.
   */
  "image": S.instanceOf(globalThis.Blob),
  /**
   * The model to use for image generation. Only `dall-e-2` is supported at this time.
   */
  "model": S.optionalWith(S.Union(S.String, CreateImageVariationRequestModelEnum), { nullable: true }),
  /**
   * The number of images to generate. Must be between 1 and 10.
   */
  "n": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(10)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * The format in which the generated images are returned. Must be one of `url` or `b64_json`. URLs are only valid for 60 minutes after the image has been generated.
   */
  "response_format": S.optionalWith(CreateImageVariationRequestResponseFormat, {
    nullable: true,
    default: () => "url" as const
  }),
  /**
   * The size of the generated images. Must be one of `256x256`, `512x512`, or `1024x1024`.
   */
  "size": S.optionalWith(CreateImageVariationRequestSize, { nullable: true, default: () => "1024x1024" as const }),
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids).
   */
  "user": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListModelsResponseObject extends S.Literal("list") {}

/**
 * The object type, which is always "model".
 */
export class ModelObject extends S.Literal("model") {}

/**
 * Describes an OpenAI model offering that can be used with the API.
 */
export class Model extends S.Class<Model>("Model")({
  /**
   * The model identifier, which can be referenced in the API endpoints.
   */
  "id": S.String,
  /**
   * The Unix timestamp (in seconds) when the model was created.
   */
  "created": S.Int,
  /**
   * The object type, which is always "model".
   */
  "object": ModelObject,
  /**
   * The organization that owns the model.
   */
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

/**
 * Always `image_url`.
 */
export class ModerationImageURLInputType extends S.Literal("image_url") {}

/**
 * An object describing an image to classify.
 */
export class ModerationImageURLInput extends S.Class<ModerationImageURLInput>("ModerationImageURLInput")({
  /**
   * Always `image_url`.
   */
  "type": ModerationImageURLInputType,
  /**
   * Contains either an image URL or a data URL for a base64 encoded image.
   */
  "image_url": S.Struct({
    /**
     * Either a URL of the image or the base64 encoded image data.
     */
    "url": S.String
  })
}) {}

/**
 * Always `text`.
 */
export class ModerationTextInputType extends S.Literal("text") {}

/**
 * An object describing text to classify.
 */
export class ModerationTextInput extends S.Class<ModerationTextInput>("ModerationTextInput")({
  /**
   * Always `text`.
   */
  "type": ModerationTextInputType,
  /**
   * A string of text to classify.
   */
  "text": S.String
}) {}

export class CreateModerationRequestModelEnum extends S.Literal(
  "omni-moderation-latest",
  "omni-moderation-2024-09-26",
  "text-moderation-latest",
  "text-moderation-stable"
) {}

export class CreateModerationRequest extends S.Class<CreateModerationRequest>("CreateModerationRequest")({
  /**
   * Input (or inputs) to classify. Can be a single string, an array of strings, or
   * an array of multi-modal input objects similar to other models.
   */
  "input": S.Union(
    /**
     * A string of text to classify for moderation.
     */
    S.String,
    /**
     * An array of strings to classify for moderation.
     */
    S.Array(S.String),
    /**
     * An array of multi-modal inputs to the moderation model.
     */
    S.Array(S.Union(ModerationImageURLInput, ModerationTextInput))
  ),
  /**
   * The content moderation model you would like to use. Learn more in
   * [the moderation guide](https://platform.openai.com/docs/guides/moderation), and learn about
   * available models [here](https://platform.openai.com/docs/models#moderation).
   */
  "model": S.optionalWith(S.Union(S.String, CreateModerationRequestModelEnum), { nullable: true })
}) {}

/**
 * Represents if a given text input is potentially harmful.
 */
export class CreateModerationResponse extends S.Class<CreateModerationResponse>("CreateModerationResponse")({
  /**
   * The unique identifier for the moderation request.
   */
  "id": S.String,
  /**
   * The model used to generate the moderation results.
   */
  "model": S.String,
  /**
   * A list of moderation objects.
   */
  "results": S.Array(S.Struct({
    /**
     * Whether any of the below categories are flagged.
     */
    "flagged": S.Boolean,
    /**
     * A list of the categories, and whether they are flagged or not.
     */
    "categories": S.Struct({
      /**
       * Content that expresses, incites, or promotes hate based on race, gender, ethnicity, religion, nationality, sexual orientation, disability status, or caste. Hateful content aimed at non-protected groups (e.g., chess players) is harassment.
       */
      "hate": S.Boolean,
      /**
       * Hateful content that also includes violence or serious harm towards the targeted group based on race, gender, ethnicity, religion, nationality, sexual orientation, disability status, or caste.
       */
      "hate/threatening": S.Boolean,
      /**
       * Content that expresses, incites, or promotes harassing language towards any target.
       */
      "harassment": S.Boolean,
      /**
       * Harassment content that also includes violence or serious harm towards any target.
       */
      "harassment/threatening": S.Boolean,
      "illicit": S.NullOr(S.Boolean),
      "illicit/violent": S.NullOr(S.Boolean),
      /**
       * Content that promotes, encourages, or depicts acts of self-harm, such as suicide, cutting, and eating disorders.
       */
      "self-harm": S.Boolean,
      /**
       * Content where the speaker expresses that they are engaging or intend to engage in acts of self-harm, such as suicide, cutting, and eating disorders.
       */
      "self-harm/intent": S.Boolean,
      /**
       * Content that encourages performing acts of self-harm, such as suicide, cutting, and eating disorders, or that gives instructions or advice on how to commit such acts.
       */
      "self-harm/instructions": S.Boolean,
      /**
       * Content meant to arouse sexual excitement, such as the description of sexual activity, or that promotes sexual services (excluding sex education and wellness).
       */
      "sexual": S.Boolean,
      /**
       * Sexual content that includes an individual who is under 18 years old.
       */
      "sexual/minors": S.Boolean,
      /**
       * Content that depicts death, violence, or physical injury.
       */
      "violence": S.Boolean,
      /**
       * Content that depicts death, violence, or physical injury in graphic detail.
       */
      "violence/graphic": S.Boolean
    }),
    /**
     * A list of the categories along with their scores as predicted by model.
     */
    "category_scores": S.Struct({
      /**
       * The score for the category 'hate'.
       */
      "hate": S.Number,
      /**
       * The score for the category 'hate/threatening'.
       */
      "hate/threatening": S.Number,
      /**
       * The score for the category 'harassment'.
       */
      "harassment": S.Number,
      /**
       * The score for the category 'harassment/threatening'.
       */
      "harassment/threatening": S.Number,
      /**
       * The score for the category 'illicit'.
       */
      "illicit": S.Number,
      /**
       * The score for the category 'illicit/violent'.
       */
      "illicit/violent": S.Number,
      /**
       * The score for the category 'self-harm'.
       */
      "self-harm": S.Number,
      /**
       * The score for the category 'self-harm/intent'.
       */
      "self-harm/intent": S.Number,
      /**
       * The score for the category 'self-harm/instructions'.
       */
      "self-harm/instructions": S.Number,
      /**
       * The score for the category 'sexual'.
       */
      "sexual": S.Number,
      /**
       * The score for the category 'sexual/minors'.
       */
      "sexual/minors": S.Number,
      /**
       * The score for the category 'violence'.
       */
      "violence": S.Number,
      /**
       * The score for the category 'violence/graphic'.
       */
      "violence/graphic": S.Number
    }),
    /**
     * A list of the categories along with the input type(s) that the score applies to.
     */
    "category_applied_input_types": S.Struct({
      /**
       * The applied input type(s) for the category 'hate'.
       */
      "hate": S.Array(S.Literal("text")),
      /**
       * The applied input type(s) for the category 'hate/threatening'.
       */
      "hate/threatening": S.Array(S.Literal("text")),
      /**
       * The applied input type(s) for the category 'harassment'.
       */
      "harassment": S.Array(S.Literal("text")),
      /**
       * The applied input type(s) for the category 'harassment/threatening'.
       */
      "harassment/threatening": S.Array(S.Literal("text")),
      /**
       * The applied input type(s) for the category 'illicit'.
       */
      "illicit": S.Array(S.Literal("text")),
      /**
       * The applied input type(s) for the category 'illicit/violent'.
       */
      "illicit/violent": S.Array(S.Literal("text")),
      /**
       * The applied input type(s) for the category 'self-harm'.
       */
      "self-harm": S.Array(S.Literal("text", "image")),
      /**
       * The applied input type(s) for the category 'self-harm/intent'.
       */
      "self-harm/intent": S.Array(S.Literal("text", "image")),
      /**
       * The applied input type(s) for the category 'self-harm/instructions'.
       */
      "self-harm/instructions": S.Array(S.Literal("text", "image")),
      /**
       * The applied input type(s) for the category 'sexual'.
       */
      "sexual": S.Array(S.Literal("text", "image")),
      /**
       * The applied input type(s) for the category 'sexual/minors'.
       */
      "sexual/minors": S.Array(S.Literal("text")),
      /**
       * The applied input type(s) for the category 'violence'.
       */
      "violence": S.Array(S.Literal("text", "image")),
      /**
       * The applied input type(s) for the category 'violence/graphic'.
       */
      "violence/graphic": S.Array(S.Literal("text", "image"))
    })
  }))
}) {}

/**
 * Order results by creation time, ascending or descending.
 */
export class AdminApiKeysListParamsOrder extends S.Literal("asc", "desc") {}

export class AdminApiKeysListParams extends S.Struct({
  /**
   * Return keys with IDs that come after this ID in the pagination order.
   */
  "after": S.optionalWith(S.String, { nullable: true }),
  /**
   * Order results by creation time, ascending or descending.
   */
  "order": S.optionalWith(AdminApiKeysListParamsOrder, { nullable: true, default: () => "asc" as const }),
  /**
   * Maximum number of keys to return.
   */
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const })
}) {}

/**
 * Represents an individual Admin API key in an org.
 */
export class AdminApiKey extends S.Class<AdminApiKey>("AdminApiKey")({
  /**
   * The object type, which is always `organization.admin_api_key`
   */
  "object": S.String,
  /**
   * The identifier, which can be referenced in API endpoints
   */
  "id": S.String,
  /**
   * The name of the API key
   */
  "name": S.String,
  /**
   * The redacted value of the API key
   */
  "redacted_value": S.String,
  /**
   * The value of the API key. Only shown on create.
   */
  "value": S.optionalWith(S.String, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) of when the API key was created
   */
  "created_at": S.Int,
  "last_used_at": S.NullOr(S.Int),
  "owner": S.Struct({
    /**
     * Always `user`
     */
    "type": S.optionalWith(S.String, { nullable: true }),
    /**
     * The object type, which is always organization.user
     */
    "object": S.optionalWith(S.String, { nullable: true }),
    /**
     * The identifier, which can be referenced in API endpoints
     */
    "id": S.optionalWith(S.String, { nullable: true }),
    /**
     * The name of the user
     */
    "name": S.optionalWith(S.String, { nullable: true }),
    /**
     * The Unix timestamp (in seconds) of when the user was created
     */
    "created_at": S.optionalWith(S.Int, { nullable: true }),
    /**
     * Always `owner`
     */
    "role": S.optionalWith(S.String, { nullable: true })
  })
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

/**
 * The event type.
 */
export class AuditLogEventType extends S.Literal(
  "api_key.created",
  "api_key.updated",
  "api_key.deleted",
  "certificate.created",
  "certificate.updated",
  "certificate.deleted",
  "certificates.activated",
  "certificates.deactivated",
  "checkpoint.permission.created",
  "checkpoint.permission.deleted",
  "external_key.registered",
  "external_key.removed",
  "group.created",
  "group.updated",
  "group.deleted",
  "invite.sent",
  "invite.accepted",
  "invite.deleted",
  "ip_allowlist.created",
  "ip_allowlist.updated",
  "ip_allowlist.deleted",
  "ip_allowlist.config.activated",
  "ip_allowlist.config.deactivated",
  "login.succeeded",
  "login.failed",
  "logout.succeeded",
  "logout.failed",
  "organization.updated",
  "project.created",
  "project.updated",
  "project.archived",
  "project.deleted",
  "rate_limit.updated",
  "rate_limit.deleted",
  "resource.deleted",
  "role.created",
  "role.updated",
  "role.deleted",
  "role.assignment.created",
  "role.assignment.deleted",
  "scim.enabled",
  "scim.disabled",
  "service_account.created",
  "service_account.updated",
  "service_account.deleted",
  "user.added",
  "user.updated",
  "user.deleted"
) {}

export class ListAuditLogsParams extends S.Struct({
  /**
   * Return only events whose `effective_at` (Unix seconds) is greater than this value.
   */
  "effective_at[gt]": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Return only events whose `effective_at` (Unix seconds) is greater than or equal to this value.
   */
  "effective_at[gte]": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Return only events whose `effective_at` (Unix seconds) is less than this value.
   */
  "effective_at[lt]": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Return only events whose `effective_at` (Unix seconds) is less than or equal to this value.
   */
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

/**
 * The type of actor. Is either `session` or `api_key`.
 */
export class AuditLogActorType extends S.Literal("session", "api_key") {}

/**
 * The user who performed the audit logged action.
 */
export class AuditLogActorUser extends S.Class<AuditLogActorUser>("AuditLogActorUser")({
  /**
   * The user id.
   */
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The user email.
   */
  "email": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The session in which the audit logged action was performed.
 */
export class AuditLogActorSession extends S.Class<AuditLogActorSession>("AuditLogActorSession")({
  "user": S.optionalWith(AuditLogActorUser, { nullable: true }),
  /**
   * The IP address from which the action was performed.
   */
  "ip_address": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The type of API key. Can be either `user` or `service_account`.
 */
export class AuditLogActorApiKeyType extends S.Literal("user", "service_account") {}

/**
 * The service account that performed the audit logged action.
 */
export class AuditLogActorServiceAccount extends S.Class<AuditLogActorServiceAccount>("AuditLogActorServiceAccount")({
  /**
   * The service account id.
   */
  "id": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The API Key used to perform the audit logged action.
 */
export class AuditLogActorApiKey extends S.Class<AuditLogActorApiKey>("AuditLogActorApiKey")({
  /**
   * The tracking id of the API key.
   */
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The type of API key. Can be either `user` or `service_account`.
   */
  "type": S.optionalWith(AuditLogActorApiKeyType, { nullable: true }),
  "user": S.optionalWith(AuditLogActorUser, { nullable: true }),
  "service_account": S.optionalWith(AuditLogActorServiceAccount, { nullable: true })
}) {}

/**
 * The actor who performed the audit logged action.
 */
export class AuditLogActor extends S.Class<AuditLogActor>("AuditLogActor")({
  /**
   * The type of actor. Is either `session` or `api_key`.
   */
  "type": S.optionalWith(AuditLogActorType, { nullable: true }),
  "session": S.optionalWith(AuditLogActorSession, { nullable: true }),
  "api_key": S.optionalWith(AuditLogActorApiKey, { nullable: true })
}) {}

/**
 * A log of a user action or configuration change within this organization.
 */
export class AuditLog extends S.Class<AuditLog>("AuditLog")({
  /**
   * The ID of this log.
   */
  "id": S.String,
  "type": AuditLogEventType,
  /**
   * The Unix timestamp (in seconds) of the event.
   */
  "effective_at": S.Int,
  /**
   * The project that the action was scoped to. Absent for actions not scoped to projects. Note that any admin actions taken via Admin API keys are associated with the default project.
   */
  "project": S.optionalWith(
    S.Struct({
      /**
       * The project ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The project title.
       */
      "name": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "actor": AuditLogActor,
  /**
   * The details for events with this `type`.
   */
  "api_key.created": S.optionalWith(
    S.Struct({
      /**
       * The tracking ID of the API key.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to create the API key.
       */
      "data": S.optionalWith(
        S.Struct({
          /**
           * A list of scopes allowed for the API key, e.g. `["api.model.request"]`
           */
          "scopes": S.optionalWith(S.Array(S.String), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "api_key.updated": S.optionalWith(
    S.Struct({
      /**
       * The tracking ID of the API key.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to update the API key.
       */
      "changes_requested": S.optionalWith(
        S.Struct({
          /**
           * A list of scopes allowed for the API key, e.g. `["api.model.request"]`
           */
          "scopes": S.optionalWith(S.Array(S.String), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "api_key.deleted": S.optionalWith(
    S.Struct({
      /**
       * The tracking ID of the API key.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The project and fine-tuned model checkpoint that the checkpoint permission was created for.
   */
  "checkpoint.permission.created": S.optionalWith(
    S.Struct({
      /**
       * The ID of the checkpoint permission.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to create the checkpoint permission.
       */
      "data": S.optionalWith(
        S.Struct({
          /**
           * The ID of the project that the checkpoint permission was created for.
           */
          "project_id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The ID of the fine-tuned model checkpoint.
           */
          "fine_tuned_model_checkpoint": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "checkpoint.permission.deleted": S.optionalWith(
    S.Struct({
      /**
       * The ID of the checkpoint permission.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "external_key.registered": S.optionalWith(
    S.Struct({
      /**
       * The ID of the external key configuration.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The configuration for the external key.
       */
      "data": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "external_key.removed": S.optionalWith(
    S.Struct({
      /**
       * The ID of the external key configuration.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "group.created": S.optionalWith(
    S.Struct({
      /**
       * The ID of the group.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * Information about the created group.
       */
      "data": S.optionalWith(
        S.Struct({
          /**
           * The group name.
           */
          "group_name": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "group.updated": S.optionalWith(
    S.Struct({
      /**
       * The ID of the group.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to update the group.
       */
      "changes_requested": S.optionalWith(
        S.Struct({
          /**
           * The updated group name.
           */
          "group_name": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "group.deleted": S.optionalWith(
    S.Struct({
      /**
       * The ID of the group.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "scim.enabled": S.optionalWith(
    S.Struct({
      /**
       * The ID of the SCIM was enabled for.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "scim.disabled": S.optionalWith(
    S.Struct({
      /**
       * The ID of the SCIM was disabled for.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "invite.sent": S.optionalWith(
    S.Struct({
      /**
       * The ID of the invite.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to create the invite.
       */
      "data": S.optionalWith(
        S.Struct({
          /**
           * The email invited to the organization.
           */
          "email": S.optionalWith(S.String, { nullable: true }),
          /**
           * The role the email was invited to be. Is either `owner` or `member`.
           */
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "invite.accepted": S.optionalWith(
    S.Struct({
      /**
       * The ID of the invite.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "invite.deleted": S.optionalWith(
    S.Struct({
      /**
       * The ID of the invite.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "ip_allowlist.created": S.optionalWith(
    S.Struct({
      /**
       * The ID of the IP allowlist configuration.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The name of the IP allowlist configuration.
       */
      "name": S.optionalWith(S.String, { nullable: true }),
      /**
       * The IP addresses or CIDR ranges included in the configuration.
       */
      "allowed_ips": S.optionalWith(S.Array(S.String), { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "ip_allowlist.updated": S.optionalWith(
    S.Struct({
      /**
       * The ID of the IP allowlist configuration.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The updated set of IP addresses or CIDR ranges in the configuration.
       */
      "allowed_ips": S.optionalWith(S.Array(S.String), { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "ip_allowlist.deleted": S.optionalWith(
    S.Struct({
      /**
       * The ID of the IP allowlist configuration.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The name of the IP allowlist configuration.
       */
      "name": S.optionalWith(S.String, { nullable: true }),
      /**
       * The IP addresses or CIDR ranges that were in the configuration.
       */
      "allowed_ips": S.optionalWith(S.Array(S.String), { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "ip_allowlist.config.activated": S.optionalWith(
    S.Struct({
      /**
       * The configurations that were activated.
       */
      "configs": S.optionalWith(
        S.Array(S.Struct({
          /**
           * The ID of the IP allowlist configuration.
           */
          "id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The name of the IP allowlist configuration.
           */
          "name": S.optionalWith(S.String, { nullable: true })
        })),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "ip_allowlist.config.deactivated": S.optionalWith(
    S.Struct({
      /**
       * The configurations that were deactivated.
       */
      "configs": S.optionalWith(
        S.Array(S.Struct({
          /**
           * The ID of the IP allowlist configuration.
           */
          "id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The name of the IP allowlist configuration.
           */
          "name": S.optionalWith(S.String, { nullable: true })
        })),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * This event has no additional fields beyond the standard audit log attributes.
   */
  "login.succeeded": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * The details for events with this `type`.
   */
  "login.failed": S.optionalWith(
    S.Struct({
      /**
       * The error code of the failure.
       */
      "error_code": S.optionalWith(S.String, { nullable: true }),
      /**
       * The error message of the failure.
       */
      "error_message": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * This event has no additional fields beyond the standard audit log attributes.
   */
  "logout.succeeded": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * The details for events with this `type`.
   */
  "logout.failed": S.optionalWith(
    S.Struct({
      /**
       * The error code of the failure.
       */
      "error_code": S.optionalWith(S.String, { nullable: true }),
      /**
       * The error message of the failure.
       */
      "error_message": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "organization.updated": S.optionalWith(
    S.Struct({
      /**
       * The organization ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to update the organization settings.
       */
      "changes_requested": S.optionalWith(
        S.Struct({
          /**
           * The organization title.
           */
          "title": S.optionalWith(S.String, { nullable: true }),
          /**
           * The organization description.
           */
          "description": S.optionalWith(S.String, { nullable: true }),
          /**
           * The organization name.
           */
          "name": S.optionalWith(S.String, { nullable: true }),
          /**
           * Visibility of the threads page which shows messages created with the Assistants API and Playground. One of `ANY_ROLE`, `OWNERS`, or `NONE`.
           */
          "threads_ui_visibility": S.optionalWith(S.String, { nullable: true }),
          /**
           * Visibility of the usage dashboard which shows activity and costs for your organization. One of `ANY_ROLE` or `OWNERS`.
           */
          "usage_dashboard_visibility": S.optionalWith(S.String, { nullable: true }),
          /**
           * How your organization logs data from supported API calls. One of `disabled`, `enabled_per_call`, `enabled_for_all_projects`, or `enabled_for_selected_projects`
           */
          "api_call_logging": S.optionalWith(S.String, { nullable: true }),
          /**
           * The list of project ids if api_call_logging is set to `enabled_for_selected_projects`
           */
          "api_call_logging_project_ids": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "project.created": S.optionalWith(
    S.Struct({
      /**
       * The project ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to create the project.
       */
      "data": S.optionalWith(
        S.Struct({
          /**
           * The project name.
           */
          "name": S.optionalWith(S.String, { nullable: true }),
          /**
           * The title of the project as seen on the dashboard.
           */
          "title": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "project.updated": S.optionalWith(
    S.Struct({
      /**
       * The project ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to update the project.
       */
      "changes_requested": S.optionalWith(
        S.Struct({
          /**
           * The title of the project as seen on the dashboard.
           */
          "title": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "project.archived": S.optionalWith(
    S.Struct({
      /**
       * The project ID.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "project.deleted": S.optionalWith(
    S.Struct({
      /**
       * The project ID.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "rate_limit.updated": S.optionalWith(
    S.Struct({
      /**
       * The rate limit ID
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to update the rate limits.
       */
      "changes_requested": S.optionalWith(
        S.Struct({
          /**
           * The maximum requests per minute.
           */
          "max_requests_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
          /**
           * The maximum tokens per minute.
           */
          "max_tokens_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
          /**
           * The maximum images per minute. Only relevant for certain models.
           */
          "max_images_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
          /**
           * The maximum audio megabytes per minute. Only relevant for certain models.
           */
          "max_audio_megabytes_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
          /**
           * The maximum requests per day. Only relevant for certain models.
           */
          "max_requests_per_1_day": S.optionalWith(S.Int, { nullable: true }),
          /**
           * The maximum batch input tokens per day. Only relevant for certain models.
           */
          "batch_1_day_max_input_tokens": S.optionalWith(S.Int, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "rate_limit.deleted": S.optionalWith(
    S.Struct({
      /**
       * The rate limit ID
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "role.created": S.optionalWith(
    S.Struct({
      /**
       * The role ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The name of the role.
       */
      "role_name": S.optionalWith(S.String, { nullable: true }),
      /**
       * The permissions granted by the role.
       */
      "permissions": S.optionalWith(S.Array(S.String), { nullable: true }),
      /**
       * The type of resource the role belongs to.
       */
      "resource_type": S.optionalWith(S.String, { nullable: true }),
      /**
       * The resource the role is scoped to.
       */
      "resource_id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "role.updated": S.optionalWith(
    S.Struct({
      /**
       * The role ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to update the role.
       */
      "changes_requested": S.optionalWith(
        S.Struct({
          /**
           * The updated role name, when provided.
           */
          "role_name": S.optionalWith(S.String, { nullable: true }),
          /**
           * The resource the role is scoped to.
           */
          "resource_id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The type of resource the role belongs to.
           */
          "resource_type": S.optionalWith(S.String, { nullable: true }),
          /**
           * The permissions added to the role.
           */
          "permissions_added": S.optionalWith(S.Array(S.String), { nullable: true }),
          /**
           * The permissions removed from the role.
           */
          "permissions_removed": S.optionalWith(S.Array(S.String), { nullable: true }),
          /**
           * The updated role description, when provided.
           */
          "description": S.optionalWith(S.String, { nullable: true }),
          /**
           * Additional metadata stored on the role.
           */
          "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "role.deleted": S.optionalWith(
    S.Struct({
      /**
       * The role ID.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "role.assignment.created": S.optionalWith(
    S.Struct({
      /**
       * The identifier of the role assignment.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The principal (user or group) that received the role.
       */
      "principal_id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The type of principal (user or group) that received the role.
       */
      "principal_type": S.optionalWith(S.String, { nullable: true }),
      /**
       * The resource the role assignment is scoped to.
       */
      "resource_id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The type of resource the role assignment is scoped to.
       */
      "resource_type": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "role.assignment.deleted": S.optionalWith(
    S.Struct({
      /**
       * The identifier of the role assignment.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The principal (user or group) that had the role removed.
       */
      "principal_id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The type of principal (user or group) that had the role removed.
       */
      "principal_type": S.optionalWith(S.String, { nullable: true }),
      /**
       * The resource the role assignment was scoped to.
       */
      "resource_id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The type of resource the role assignment was scoped to.
       */
      "resource_type": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "service_account.created": S.optionalWith(
    S.Struct({
      /**
       * The service account ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to create the service account.
       */
      "data": S.optionalWith(
        S.Struct({
          /**
           * The role of the service account. Is either `owner` or `member`.
           */
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "service_account.updated": S.optionalWith(
    S.Struct({
      /**
       * The service account ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to updated the service account.
       */
      "changes_requested": S.optionalWith(
        S.Struct({
          /**
           * The role of the service account. Is either `owner` or `member`.
           */
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "service_account.deleted": S.optionalWith(
    S.Struct({
      /**
       * The service account ID.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "user.added": S.optionalWith(
    S.Struct({
      /**
       * The user ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to add the user to the project.
       */
      "data": S.optionalWith(
        S.Struct({
          /**
           * The role of the user. Is either `owner` or `member`.
           */
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "user.updated": S.optionalWith(
    S.Struct({
      /**
       * The project ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The payload used to update the user.
       */
      "changes_requested": S.optionalWith(
        S.Struct({
          /**
           * The role of the user. Is either `owner` or `member`.
           */
          "role": S.optionalWith(S.String, { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "user.deleted": S.optionalWith(
    S.Struct({
      /**
       * The user ID.
       */
      "id": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "certificate.created": S.optionalWith(
    S.Struct({
      /**
       * The certificate ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The name of the certificate.
       */
      "name": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "certificate.updated": S.optionalWith(
    S.Struct({
      /**
       * The certificate ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The name of the certificate.
       */
      "name": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "certificate.deleted": S.optionalWith(
    S.Struct({
      /**
       * The certificate ID.
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The name of the certificate.
       */
      "name": S.optionalWith(S.String, { nullable: true }),
      /**
       * The certificate content in PEM format.
       */
      "certificate": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "certificates.activated": S.optionalWith(
    S.Struct({
      "certificates": S.optionalWith(
        S.Array(S.Struct({
          /**
           * The certificate ID.
           */
          "id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The name of the certificate.
           */
          "name": S.optionalWith(S.String, { nullable: true })
        })),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  /**
   * The details for events with this `type`.
   */
  "certificates.deactivated": S.optionalWith(
    S.Struct({
      "certificates": S.optionalWith(
        S.Array(S.Struct({
          /**
           * The certificate ID.
           */
          "id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The name of the certificate.
           */
          "name": S.optionalWith(S.String, { nullable: true })
        })),
        { nullable: true }
      )
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

export class ListOrganizationCertificatesParamsOrder extends S.Literal("asc", "desc") {}

export class ListOrganizationCertificatesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListOrganizationCertificatesParamsOrder, { nullable: true, default: () => "desc" as const })
}) {}

/**
 * The object type.
 *
 * - If creating, updating, or getting a specific certificate, the object type is `certificate`.
 * - If listing, activating, or deactivating certificates for the organization, the object type is `organization.certificate`.
 * - If listing, activating, or deactivating certificates for a project, the object type is `organization.project.certificate`.
 */
export class CertificateObject
  extends S.Literal("certificate", "organization.certificate", "organization.project.certificate")
{}

/**
 * Represents an individual `certificate` uploaded to the organization.
 */
export class Certificate extends S.Class<Certificate>("Certificate")({
  /**
   * The object type.
   *
   * - If creating, updating, or getting a specific certificate, the object type is `certificate`.
   * - If listing, activating, or deactivating certificates for the organization, the object type is `organization.certificate`.
   * - If listing, activating, or deactivating certificates for a project, the object type is `organization.project.certificate`.
   */
  "object": CertificateObject,
  /**
   * The identifier, which can be referenced in API endpoints
   */
  "id": S.String,
  /**
   * The name of the certificate.
   */
  "name": S.String,
  /**
   * The Unix timestamp (in seconds) of when the certificate was uploaded.
   */
  "created_at": S.Int,
  "certificate_details": S.Struct({
    /**
     * The Unix timestamp (in seconds) of when the certificate becomes valid.
     */
    "valid_at": S.optionalWith(S.Int, { nullable: true }),
    /**
     * The Unix timestamp (in seconds) of when the certificate expires.
     */
    "expires_at": S.optionalWith(S.Int, { nullable: true }),
    /**
     * The content of the certificate in PEM format.
     */
    "content": S.optionalWith(S.String, { nullable: true })
  }),
  /**
   * Whether the certificate is currently active at the specified scope. Not returned when getting details for a specific certificate.
   */
  "active": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListCertificatesResponseObject extends S.Literal("list") {}

export class ListCertificatesResponse extends S.Class<ListCertificatesResponse>("ListCertificatesResponse")({
  "data": S.Array(Certificate),
  "first_id": S.optionalWith(S.String, { nullable: true }),
  "last_id": S.optionalWith(S.String, { nullable: true }),
  "has_more": S.Boolean,
  "object": ListCertificatesResponseObject
}) {}

export class UploadCertificateRequest extends S.Class<UploadCertificateRequest>("UploadCertificateRequest")({
  /**
   * An optional name for the certificate
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * The certificate content in PEM format
   */
  "content": S.String
}) {}

export class ToggleCertificatesRequest extends S.Class<ToggleCertificatesRequest>("ToggleCertificatesRequest")({
  "certificate_ids": S.NonEmptyArray(S.String).pipe(S.minItems(1), S.maxItems(10))
}) {}

export class GetCertificateParams extends S.Struct({
  "include": S.optionalWith(S.Array(S.Literal("content")), { nullable: true })
}) {}

export class ModifyCertificateRequest extends S.Class<ModifyCertificateRequest>("ModifyCertificateRequest")({
  /**
   * The updated name for the certificate
   */
  "name": S.String
}) {}

export class DeleteCertificateResponse extends S.Class<DeleteCertificateResponse>("DeleteCertificateResponse")({
  /**
   * The object type, must be `certificate.deleted`.
   */
  "object": S.Literal("certificate.deleted"),
  /**
   * The ID of the certificate that was deleted.
   */
  "id": S.String
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

/**
 * The aggregated completions usage details of the specific time bucket.
 */
export class UsageCompletionsResult extends S.Class<UsageCompletionsResult>("UsageCompletionsResult")({
  "object": UsageCompletionsResultObject,
  /**
   * The aggregated number of text input tokens used, including cached tokens. For customers subscribe to scale tier, this includes scale tier tokens.
   */
  "input_tokens": S.Int,
  /**
   * The aggregated number of text input tokens that has been cached from previous requests. For customers subscribe to scale tier, this includes scale tier tokens.
   */
  "input_cached_tokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The aggregated number of text output tokens used. For customers subscribe to scale tier, this includes scale tier tokens.
   */
  "output_tokens": S.Int,
  /**
   * The aggregated number of audio input tokens used, including cached tokens.
   */
  "input_audio_tokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The aggregated number of audio output tokens used.
   */
  "output_audio_tokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The count of requests made to the model.
   */
  "num_model_requests": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true }),
  "batch": S.optionalWith(S.Boolean, { nullable: true }),
  "service_tier": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageEmbeddingsResultObject extends S.Literal("organization.usage.embeddings.result") {}

/**
 * The aggregated embeddings usage details of the specific time bucket.
 */
export class UsageEmbeddingsResult extends S.Class<UsageEmbeddingsResult>("UsageEmbeddingsResult")({
  "object": UsageEmbeddingsResultObject,
  /**
   * The aggregated number of input tokens used.
   */
  "input_tokens": S.Int,
  /**
   * The count of requests made to the model.
   */
  "num_model_requests": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageModerationsResultObject extends S.Literal("organization.usage.moderations.result") {}

/**
 * The aggregated moderations usage details of the specific time bucket.
 */
export class UsageModerationsResult extends S.Class<UsageModerationsResult>("UsageModerationsResult")({
  "object": UsageModerationsResultObject,
  /**
   * The aggregated number of input tokens used.
   */
  "input_tokens": S.Int,
  /**
   * The count of requests made to the model.
   */
  "num_model_requests": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageImagesResultObject extends S.Literal("organization.usage.images.result") {}

/**
 * The aggregated images usage details of the specific time bucket.
 */
export class UsageImagesResult extends S.Class<UsageImagesResult>("UsageImagesResult")({
  "object": UsageImagesResultObject,
  /**
   * The number of images processed.
   */
  "images": S.Int,
  /**
   * The count of requests made to the model.
   */
  "num_model_requests": S.Int,
  "source": S.optionalWith(S.String, { nullable: true }),
  "size": S.optionalWith(S.String, { nullable: true }),
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageAudioSpeechesResultObject extends S.Literal("organization.usage.audio_speeches.result") {}

/**
 * The aggregated audio speeches usage details of the specific time bucket.
 */
export class UsageAudioSpeechesResult extends S.Class<UsageAudioSpeechesResult>("UsageAudioSpeechesResult")({
  "object": UsageAudioSpeechesResultObject,
  /**
   * The number of characters processed.
   */
  "characters": S.Int,
  /**
   * The count of requests made to the model.
   */
  "num_model_requests": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true }),
  "user_id": S.optionalWith(S.String, { nullable: true }),
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  "model": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageAudioTranscriptionsResultObject extends S.Literal("organization.usage.audio_transcriptions.result") {}

/**
 * The aggregated audio transcriptions usage details of the specific time bucket.
 */
export class UsageAudioTranscriptionsResult
  extends S.Class<UsageAudioTranscriptionsResult>("UsageAudioTranscriptionsResult")({
    "object": UsageAudioTranscriptionsResultObject,
    /**
     * The number of seconds processed.
     */
    "seconds": S.Int,
    /**
     * The count of requests made to the model.
     */
    "num_model_requests": S.Int,
    "project_id": S.optionalWith(S.String, { nullable: true }),
    "user_id": S.optionalWith(S.String, { nullable: true }),
    "api_key_id": S.optionalWith(S.String, { nullable: true }),
    "model": S.optionalWith(S.String, { nullable: true })
  })
{}

export class UsageVectorStoresResultObject extends S.Literal("organization.usage.vector_stores.result") {}

/**
 * The aggregated vector stores usage details of the specific time bucket.
 */
export class UsageVectorStoresResult extends S.Class<UsageVectorStoresResult>("UsageVectorStoresResult")({
  "object": UsageVectorStoresResultObject,
  /**
   * The vector stores usage in bytes.
   */
  "usage_bytes": S.Int,
  "project_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageCodeInterpreterSessionsResultObject
  extends S.Literal("organization.usage.code_interpreter_sessions.result")
{}

/**
 * The aggregated code interpreter sessions usage details of the specific time bucket.
 */
export class UsageCodeInterpreterSessionsResult
  extends S.Class<UsageCodeInterpreterSessionsResult>("UsageCodeInterpreterSessionsResult")({
    "object": UsageCodeInterpreterSessionsResultObject,
    /**
     * The number of code interpreter sessions.
     */
    "num_sessions": S.optionalWith(S.Int, { nullable: true }),
    "project_id": S.optionalWith(S.String, { nullable: true })
  })
{}

export class CostsResultObject extends S.Literal("organization.costs.result") {}

/**
 * The aggregated costs details of the specific time bucket.
 */
export class CostsResult extends S.Class<CostsResult>("CostsResult")({
  "object": CostsResultObject,
  /**
   * The monetary value in its associated currency.
   */
  "amount": S.optionalWith(
    S.Struct({
      /**
       * The numeric value of the cost.
       */
      "value": S.optionalWith(S.Number, { nullable: true }),
      /**
       * Lowercase ISO-4217 currency e.g. "usd"
       */
      "currency": S.optionalWith(S.String, { nullable: true })
    }),
    { nullable: true }
  ),
  "line_item": S.optionalWith(S.String, { nullable: true }),
  "project_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class UsageTimeBucket extends S.Class<UsageTimeBucket>("UsageTimeBucket")({
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

export class ListGroupsParamsOrder extends S.Literal("asc", "desc") {}

export class ListGroupsParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 100 as const
  }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListGroupsParamsOrder, { nullable: true, default: () => "asc" as const })
}) {}

/**
 * Always `list`.
 */
export class GroupListResourceObject extends S.Literal("list") {}

/**
 * Details about an organization group.
 */
export class GroupResponse extends S.Class<GroupResponse>("GroupResponse")({
  /**
   * Identifier for the group.
   */
  "id": S.String,
  /**
   * Display name of the group.
   */
  "name": S.String,
  /**
   * Unix timestamp (in seconds) when the group was created.
   */
  "created_at": S.Int,
  /**
   * Whether the group is managed through SCIM and controlled by your identity provider.
   */
  "is_scim_managed": S.Boolean
}) {}

/**
 * Paginated list of organization groups.
 */
export class GroupListResource extends S.Class<GroupListResource>("GroupListResource")({
  /**
   * Always `list`.
   */
  "object": GroupListResourceObject,
  /**
   * Groups returned in the current page.
   */
  "data": S.Array(GroupResponse),
  /**
   * Whether additional groups are available when paginating.
   */
  "has_more": S.Boolean,
  /**
   * Cursor to fetch the next page of results, or `null` if there are no more results.
   */
  "next": S.NullOr(S.String)
}) {}

/**
 * Request payload for creating a new group in the organization.
 */
export class CreateGroupBody extends S.Class<CreateGroupBody>("CreateGroupBody")({
  /**
   * Human readable name for the group.
   */
  "name": S.String.pipe(S.minLength(1), S.maxLength(255))
}) {}

/**
 * Request payload for updating the details of an existing group.
 */
export class UpdateGroupBody extends S.Class<UpdateGroupBody>("UpdateGroupBody")({
  /**
   * New display name for the group.
   */
  "name": S.String.pipe(S.minLength(1), S.maxLength(255))
}) {}

/**
 * Response returned after updating a group.
 */
export class GroupResourceWithSuccess extends S.Class<GroupResourceWithSuccess>("GroupResourceWithSuccess")({
  /**
   * Identifier for the group.
   */
  "id": S.String,
  /**
   * Updated display name for the group.
   */
  "name": S.String,
  /**
   * Unix timestamp (in seconds) when the group was created.
   */
  "created_at": S.Int,
  /**
   * Whether the group is managed through SCIM and controlled by your identity provider.
   */
  "is_scim_managed": S.Boolean
}) {}

/**
 * Always `group.deleted`.
 */
export class GroupDeletedResourceObject extends S.Literal("group.deleted") {}

/**
 * Confirmation payload returned after deleting a group.
 */
export class GroupDeletedResource extends S.Class<GroupDeletedResource>("GroupDeletedResource")({
  /**
   * Always `group.deleted`.
   */
  "object": GroupDeletedResourceObject,
  /**
   * Identifier of the deleted group.
   */
  "id": S.String,
  /**
   * Whether the group was deleted.
   */
  "deleted": S.Boolean
}) {}

export class ListGroupRoleAssignmentsParamsOrder extends S.Literal("asc", "desc") {}

export class ListGroupRoleAssignmentsParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListGroupRoleAssignmentsParamsOrder, { nullable: true })
}) {}

/**
 * Always `list`.
 */
export class RoleListResourceObject extends S.Literal("list") {}

/**
 * Detailed information about a role assignment entry returned when listing assignments.
 */
export class AssignedRoleDetails extends S.Class<AssignedRoleDetails>("AssignedRoleDetails")({
  /**
   * Identifier for the role.
   */
  "id": S.String,
  /**
   * Name of the role.
   */
  "name": S.String,
  /**
   * Permissions associated with the role.
   */
  "permissions": S.Array(S.String),
  /**
   * Resource type the role applies to.
   */
  "resource_type": S.String,
  /**
   * Whether the role is predefined by OpenAI.
   */
  "predefined_role": S.Boolean,
  /**
   * Description of the role.
   */
  "description": S.NullOr(S.String),
  /**
   * When the role was created.
   */
  "created_at": S.NullOr(S.Int),
  /**
   * When the role was last updated.
   */
  "updated_at": S.NullOr(S.Int),
  /**
   * Identifier of the actor who created the role.
   */
  "created_by": S.NullOr(S.String),
  /**
   * User details for the actor that created the role, when available.
   */
  "created_by_user_obj": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  /**
   * Arbitrary metadata stored on the role.
   */
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown }))
}) {}

/**
 * Paginated list of roles assigned to a principal.
 */
export class RoleListResource extends S.Class<RoleListResource>("RoleListResource")({
  /**
   * Always `list`.
   */
  "object": RoleListResourceObject,
  /**
   * Role assignments returned in the current page.
   */
  "data": S.Array(AssignedRoleDetails),
  /**
   * Whether additional assignments are available when paginating.
   */
  "has_more": S.Boolean,
  /**
   * Cursor to fetch the next page of results, or `null` when there are no more assignments.
   */
  "next": S.NullOr(S.String)
}) {}

/**
 * Request payload for assigning a role to a group or user.
 */
export class PublicAssignOrganizationGroupRoleBody
  extends S.Class<PublicAssignOrganizationGroupRoleBody>("PublicAssignOrganizationGroupRoleBody")({
    /**
     * Identifier of the role to assign.
     */
    "role_id": S.String
  })
{}

/**
 * Always `group.role`.
 */
export class GroupRoleAssignmentObject extends S.Literal("group.role") {}

/**
 * Always `group`.
 */
export class GroupObject extends S.Literal("group") {}

/**
 * Summary information about a group returned in role assignment responses.
 */
export class Group extends S.Class<Group>("Group")({
  /**
   * Always `group`.
   */
  "object": GroupObject,
  /**
   * Identifier for the group.
   */
  "id": S.String,
  /**
   * Display name of the group.
   */
  "name": S.String,
  /**
   * Unix timestamp (in seconds) when the group was created.
   */
  "created_at": S.Int,
  /**
   * Whether the group is managed through SCIM.
   */
  "scim_managed": S.Boolean
}) {}

/**
 * Always `role`.
 */
export class RoleObject extends S.Literal("role") {}

/**
 * Details about a role that can be assigned through the public Roles API.
 */
export class Role extends S.Class<Role>("Role")({
  /**
   * Always `role`.
   */
  "object": RoleObject,
  /**
   * Identifier for the role.
   */
  "id": S.String,
  /**
   * Unique name for the role.
   */
  "name": S.String,
  /**
   * Optional description of the role.
   */
  "description": S.NullOr(S.String),
  /**
   * Permissions granted by the role.
   */
  "permissions": S.Array(S.String),
  /**
   * Resource type the role is bound to (for example `api.organization` or `api.project`).
   */
  "resource_type": S.String,
  /**
   * Whether the role is predefined and managed by OpenAI.
   */
  "predefined_role": S.Boolean
}) {}

/**
 * Role assignment linking a group to a role.
 */
export class GroupRoleAssignment extends S.Class<GroupRoleAssignment>("GroupRoleAssignment")({
  /**
   * Always `group.role`.
   */
  "object": GroupRoleAssignmentObject,
  "group": Group,
  "role": Role
}) {}

/**
 * Confirmation payload returned after unassigning a role.
 */
export class DeletedRoleAssignmentResource
  extends S.Class<DeletedRoleAssignmentResource>("DeletedRoleAssignmentResource")({
    /**
     * Identifier for the deleted assignment, such as `group.role.deleted` or `user.role.deleted`.
     */
    "object": S.String,
    /**
     * Whether the assignment was removed.
     */
    "deleted": S.Boolean
  })
{}

export class ListGroupUsersParamsOrder extends S.Literal("asc", "desc") {}

export class ListGroupUsersParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 100 as const
  }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListGroupUsersParamsOrder, { nullable: true, default: () => "desc" as const })
}) {}

/**
 * Always `list`.
 */
export class UserListResourceObject extends S.Literal("list") {}

/**
 * The object type, which is always `organization.user`
 */
export class UserObject extends S.Literal("organization.user") {}

/**
 * `owner` or `reader`
 */
export class UserRole extends S.Literal("owner", "reader") {}

/**
 * Represents an individual `user` within an organization.
 */
export class User extends S.Class<User>("User")({
  /**
   * The object type, which is always `organization.user`
   */
  "object": UserObject,
  /**
   * The identifier, which can be referenced in API endpoints
   */
  "id": S.String,
  /**
   * The name of the user
   */
  "name": S.String,
  /**
   * The email address of the user
   */
  "email": S.String,
  /**
   * `owner` or `reader`
   */
  "role": UserRole,
  /**
   * The Unix timestamp (in seconds) of when the user was added.
   */
  "added_at": S.Int
}) {}

/**
 * Paginated list of user objects returned when inspecting group membership.
 */
export class UserListResource extends S.Class<UserListResource>("UserListResource")({
  /**
   * Always `list`.
   */
  "object": UserListResourceObject,
  /**
   * Users in the current page.
   */
  "data": S.Array(User),
  /**
   * Whether more users are available when paginating.
   */
  "has_more": S.Boolean,
  /**
   * Cursor to fetch the next page of results, or `null` when no further users are available.
   */
  "next": S.NullOr(S.String)
}) {}

/**
 * Request payload for adding a user to a group.
 */
export class CreateGroupUserBody extends S.Class<CreateGroupUserBody>("CreateGroupUserBody")({
  /**
   * Identifier of the user to add to the group.
   */
  "user_id": S.String
}) {}

/**
 * Always `group.user`.
 */
export class GroupUserAssignmentObject extends S.Literal("group.user") {}

/**
 * Confirmation payload returned after adding a user to a group.
 */
export class GroupUserAssignment extends S.Class<GroupUserAssignment>("GroupUserAssignment")({
  /**
   * Always `group.user`.
   */
  "object": GroupUserAssignmentObject,
  /**
   * Identifier of the user that was added.
   */
  "user_id": S.String,
  /**
   * Identifier of the group the user was added to.
   */
  "group_id": S.String
}) {}

/**
 * Always `group.user.deleted`.
 */
export class GroupUserDeletedResourceObject extends S.Literal("group.user.deleted") {}

/**
 * Confirmation payload returned after removing a user from a group.
 */
export class GroupUserDeletedResource extends S.Class<GroupUserDeletedResource>("GroupUserDeletedResource")({
  /**
   * Always `group.user.deleted`.
   */
  "object": GroupUserDeletedResourceObject,
  /**
   * Whether the group membership was removed.
   */
  "deleted": S.Boolean
}) {}

export class ListInvitesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always `list`
 */
export class InviteListResponseObject extends S.Literal("list") {}

/**
 * The object type, which is always `organization.invite`
 */
export class InviteObject extends S.Literal("organization.invite") {}

/**
 * `owner` or `reader`
 */
export class InviteRole extends S.Literal("owner", "reader") {}

/**
 * `accepted`,`expired`, or `pending`
 */
export class InviteStatus extends S.Literal("accepted", "expired", "pending") {}

/**
 * Represents an individual `invite` to the organization.
 */
export class Invite extends S.Class<Invite>("Invite")({
  /**
   * The object type, which is always `organization.invite`
   */
  "object": InviteObject,
  /**
   * The identifier, which can be referenced in API endpoints
   */
  "id": S.String,
  /**
   * The email address of the individual to whom the invite was sent
   */
  "email": S.String,
  /**
   * `owner` or `reader`
   */
  "role": InviteRole,
  /**
   * `accepted`,`expired`, or `pending`
   */
  "status": InviteStatus,
  /**
   * The Unix timestamp (in seconds) of when the invite was sent.
   */
  "invited_at": S.Int,
  /**
   * The Unix timestamp (in seconds) of when the invite expires.
   */
  "expires_at": S.Int,
  /**
   * The Unix timestamp (in seconds) of when the invite was accepted.
   */
  "accepted_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The projects that were granted membership upon acceptance of the invite.
   */
  "projects": S.optionalWith(
    S.Array(S.Struct({
      /**
       * Project's public ID
       */
      "id": S.optionalWith(S.String, { nullable: true }),
      /**
       * Project membership role
       */
      "role": S.optionalWith(S.Literal("member", "owner"), { nullable: true })
    })),
    { nullable: true }
  )
}) {}

export class InviteListResponse extends S.Class<InviteListResponse>("InviteListResponse")({
  /**
   * The object type, which is always `list`
   */
  "object": InviteListResponseObject,
  "data": S.Array(Invite),
  /**
   * The first `invite_id` in the retrieved `list`
   */
  "first_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The last `invite_id` in the retrieved `list`
   */
  "last_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * The `has_more` property is used for pagination to indicate there are additional results.
   */
  "has_more": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * `owner` or `reader`
 */
export class InviteRequestRole extends S.Literal("reader", "owner") {}

export class InviteRequest extends S.Class<InviteRequest>("InviteRequest")({
  /**
   * Send an email to this address
   */
  "email": S.String,
  /**
   * `owner` or `reader`
   */
  "role": InviteRequestRole,
  /**
   * An array of projects to which membership is granted at the same time the org invite is accepted. If omitted, the user will be invited to the default project for compatibility with legacy behavior.
   */
  "projects": S.optionalWith(
    S.Array(S.Struct({
      /**
       * Project's public ID
       */
      "id": S.String,
      /**
       * Project membership role
       */
      "role": S.Literal("member", "owner")
    })),
    { nullable: true }
  )
}) {}

/**
 * The object type, which is always `organization.invite.deleted`
 */
export class InviteDeleteResponseObject extends S.Literal("organization.invite.deleted") {}

export class InviteDeleteResponse extends S.Class<InviteDeleteResponse>("InviteDeleteResponse")({
  /**
   * The object type, which is always `organization.invite.deleted`
   */
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

/**
 * The object type, which is always `organization.project`
 */
export class ProjectObject extends S.Literal("organization.project") {}

/**
 * `active` or `archived`
 */
export class ProjectStatus extends S.Literal("active", "archived") {}

/**
 * Represents an individual project.
 */
export class Project extends S.Class<Project>("Project")({
  /**
   * The identifier, which can be referenced in API endpoints
   */
  "id": S.String,
  /**
   * The object type, which is always `organization.project`
   */
  "object": ProjectObject,
  /**
   * The name of the project. This appears in reporting.
   */
  "name": S.String,
  /**
   * The Unix timestamp (in seconds) of when the project was created.
   */
  "created_at": S.Int,
  "archived_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * `active` or `archived`
   */
  "status": ProjectStatus
}) {}

export class ProjectListResponse extends S.Class<ProjectListResponse>("ProjectListResponse")({
  "object": ProjectListResponseObject,
  "data": S.Array(Project),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

/**
 * Create the project with the specified data residency region. Your organization must have access to Data residency functionality in order to use. See [data residency controls](https://platform.openai.com/docs/guides/your-data#data-residency-controls) to review the functionality and limitations of setting this field.
 */
export class ProjectCreateRequestGeography extends S.Literal("US", "EU", "JP", "IN", "KR", "CA", "AU", "SG") {}

export class ProjectCreateRequest extends S.Class<ProjectCreateRequest>("ProjectCreateRequest")({
  /**
   * The friendly name of the project, this name appears in reports.
   */
  "name": S.String,
  /**
   * Create the project with the specified data residency region. Your organization must have access to Data residency functionality in order to use. See [data residency controls](https://platform.openai.com/docs/guides/your-data#data-residency-controls) to review the functionality and limitations of setting this field.
   */
  "geography": S.optionalWith(ProjectCreateRequestGeography, { nullable: true })
}) {}

export class ProjectUpdateRequest extends S.Class<ProjectUpdateRequest>("ProjectUpdateRequest")({
  /**
   * The updated name of the project, this name appears in reports.
   */
  "name": S.String
}) {}

export class ErrorResponse extends S.Class<ErrorResponse>("ErrorResponse")({
  "error": Error
}) {}

export class ListProjectApiKeysParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

export class ProjectApiKeyListResponseObject extends S.Literal("list") {}

/**
 * The object type, which is always `organization.project.api_key`
 */
export class ProjectApiKeyObject extends S.Literal("organization.project.api_key") {}

/**
 * `user` or `service_account`
 */
export class ProjectApiKeyOwnerType extends S.Literal("user", "service_account") {}

/**
 * The object type, which is always `organization.project.user`
 */
export class ProjectUserObject extends S.Literal("organization.project.user") {}

/**
 * `owner` or `member`
 */
export class ProjectUserRole extends S.Literal("owner", "member") {}

/**
 * Represents an individual user in a project.
 */
export class ProjectUser extends S.Class<ProjectUser>("ProjectUser")({
  /**
   * The object type, which is always `organization.project.user`
   */
  "object": ProjectUserObject,
  /**
   * The identifier, which can be referenced in API endpoints
   */
  "id": S.String,
  /**
   * The name of the user
   */
  "name": S.String,
  /**
   * The email address of the user
   */
  "email": S.String,
  /**
   * `owner` or `member`
   */
  "role": ProjectUserRole,
  /**
   * The Unix timestamp (in seconds) of when the project was added.
   */
  "added_at": S.Int
}) {}

/**
 * The object type, which is always `organization.project.service_account`
 */
export class ProjectServiceAccountObject extends S.Literal("organization.project.service_account") {}

/**
 * `owner` or `member`
 */
export class ProjectServiceAccountRole extends S.Literal("owner", "member") {}

/**
 * Represents an individual service account in a project.
 */
export class ProjectServiceAccount extends S.Class<ProjectServiceAccount>("ProjectServiceAccount")({
  /**
   * The object type, which is always `organization.project.service_account`
   */
  "object": ProjectServiceAccountObject,
  /**
   * The identifier, which can be referenced in API endpoints
   */
  "id": S.String,
  /**
   * The name of the service account
   */
  "name": S.String,
  /**
   * `owner` or `member`
   */
  "role": ProjectServiceAccountRole,
  /**
   * The Unix timestamp (in seconds) of when the service account was created
   */
  "created_at": S.Int
}) {}

/**
 * Represents an individual API key in a project.
 */
export class ProjectApiKey extends S.Class<ProjectApiKey>("ProjectApiKey")({
  /**
   * The object type, which is always `organization.project.api_key`
   */
  "object": ProjectApiKeyObject,
  /**
   * The redacted value of the API key
   */
  "redacted_value": S.String,
  /**
   * The name of the API key
   */
  "name": S.String,
  /**
   * The Unix timestamp (in seconds) of when the API key was created
   */
  "created_at": S.Int,
  /**
   * The Unix timestamp (in seconds) of when the API key was last used.
   */
  "last_used_at": S.Int,
  /**
   * The identifier, which can be referenced in API endpoints
   */
  "id": S.String,
  "owner": S.Struct({
    /**
     * `user` or `service_account`
     */
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

export class ListProjectCertificatesParamsOrder extends S.Literal("asc", "desc") {}

export class ListProjectCertificatesParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListProjectCertificatesParamsOrder, { nullable: true, default: () => "desc" as const })
}) {}

export class ListProjectGroupsParamsOrder extends S.Literal("asc", "desc") {}

export class ListProjectGroupsParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(100)), {
    nullable: true,
    default: () => 20 as const
  }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListProjectGroupsParamsOrder, { nullable: true, default: () => "asc" as const })
}) {}

/**
 * Always `list`.
 */
export class ProjectGroupListResourceObject extends S.Literal("list") {}

/**
 * Always `project.group`.
 */
export class ProjectGroupObject extends S.Literal("project.group") {}

/**
 * Details about a group's membership in a project.
 */
export class ProjectGroup extends S.Class<ProjectGroup>("ProjectGroup")({
  /**
   * Always `project.group`.
   */
  "object": ProjectGroupObject,
  /**
   * Identifier of the project.
   */
  "project_id": S.String,
  /**
   * Identifier of the group that has access to the project.
   */
  "group_id": S.String,
  /**
   * Display name of the group.
   */
  "group_name": S.String,
  /**
   * Unix timestamp (in seconds) when the group was granted project access.
   */
  "created_at": S.Int
}) {}

/**
 * Paginated list of groups that have access to a project.
 */
export class ProjectGroupListResource extends S.Class<ProjectGroupListResource>("ProjectGroupListResource")({
  /**
   * Always `list`.
   */
  "object": ProjectGroupListResourceObject,
  /**
   * Project group memberships returned in the current page.
   */
  "data": S.Array(ProjectGroup),
  /**
   * Whether additional project group memberships are available.
   */
  "has_more": S.Boolean,
  /**
   * Cursor to fetch the next page of results, or `null` when there are no more results.
   */
  "next": S.NullOr(S.String)
}) {}

/**
 * Request payload for granting a group access to a project.
 */
export class InviteProjectGroupBody extends S.Class<InviteProjectGroupBody>("InviteProjectGroupBody")({
  /**
   * Identifier of the group to add to the project.
   */
  "group_id": S.String,
  /**
   * Identifier of the project role to grant to the group.
   */
  "role": S.String
}) {}

/**
 * Always `project.group.deleted`.
 */
export class ProjectGroupDeletedResourceObject extends S.Literal("project.group.deleted") {}

/**
 * Confirmation payload returned after removing a group from a project.
 */
export class ProjectGroupDeletedResource extends S.Class<ProjectGroupDeletedResource>("ProjectGroupDeletedResource")({
  /**
   * Always `project.group.deleted`.
   */
  "object": ProjectGroupDeletedResourceObject,
  /**
   * Whether the group membership in the project was removed.
   */
  "deleted": S.Boolean
}) {}

export class ListProjectRateLimitsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 100 as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

export class ProjectRateLimitListResponseObject extends S.Literal("list") {}

/**
 * The object type, which is always `project.rate_limit`
 */
export class ProjectRateLimitObject extends S.Literal("project.rate_limit") {}

/**
 * Represents a project rate limit config.
 */
export class ProjectRateLimit extends S.Class<ProjectRateLimit>("ProjectRateLimit")({
  /**
   * The object type, which is always `project.rate_limit`
   */
  "object": ProjectRateLimitObject,
  /**
   * The identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The model this rate limit applies to.
   */
  "model": S.String,
  /**
   * The maximum requests per minute.
   */
  "max_requests_per_1_minute": S.Int,
  /**
   * The maximum tokens per minute.
   */
  "max_tokens_per_1_minute": S.Int,
  /**
   * The maximum images per minute. Only present for relevant models.
   */
  "max_images_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The maximum audio megabytes per minute. Only present for relevant models.
   */
  "max_audio_megabytes_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The maximum requests per day. Only present for relevant models.
   */
  "max_requests_per_1_day": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The maximum batch input tokens per day. Only present for relevant models.
   */
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
    /**
     * The maximum requests per minute.
     */
    "max_requests_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
    /**
     * The maximum tokens per minute.
     */
    "max_tokens_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
    /**
     * The maximum images per minute. Only relevant for certain models.
     */
    "max_images_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
    /**
     * The maximum audio megabytes per minute. Only relevant for certain models.
     */
    "max_audio_megabytes_per_1_minute": S.optionalWith(S.Int, { nullable: true }),
    /**
     * The maximum requests per day. Only relevant for certain models.
     */
    "max_requests_per_1_day": S.optionalWith(S.Int, { nullable: true }),
    /**
     * The maximum batch input tokens per day. Only relevant for certain models.
     */
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
    /**
     * The name of the service account being created.
     */
    "name": S.String
  })
{}

export class ProjectServiceAccountCreateResponseObject extends S.Literal("organization.project.service_account") {}

/**
 * Service accounts can only have one role of type `member`
 */
export class ProjectServiceAccountCreateResponseRole extends S.Literal("member") {}

/**
 * The object type, which is always `organization.project.service_account.api_key`
 */
export class ProjectServiceAccountApiKeyObject extends S.Literal("organization.project.service_account.api_key") {}

export class ProjectServiceAccountApiKey extends S.Class<ProjectServiceAccountApiKey>("ProjectServiceAccountApiKey")({
  /**
   * The object type, which is always `organization.project.service_account.api_key`
   */
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
    /**
     * Service accounts can only have one role of type `member`
     */
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

/**
 * `owner` or `member`
 */
export class ProjectUserCreateRequestRole extends S.Literal("owner", "member") {}

export class ProjectUserCreateRequest extends S.Class<ProjectUserCreateRequest>("ProjectUserCreateRequest")({
  /**
   * The ID of the user.
   */
  "user_id": S.String,
  /**
   * `owner` or `member`
   */
  "role": ProjectUserCreateRequestRole
}) {}

/**
 * `owner` or `member`
 */
export class ProjectUserUpdateRequestRole extends S.Literal("owner", "member") {}

export class ProjectUserUpdateRequest extends S.Class<ProjectUserUpdateRequest>("ProjectUserUpdateRequest")({
  /**
   * `owner` or `member`
   */
  "role": ProjectUserUpdateRequestRole
}) {}

export class ProjectUserDeleteResponseObject extends S.Literal("organization.project.user.deleted") {}

export class ProjectUserDeleteResponse extends S.Class<ProjectUserDeleteResponse>("ProjectUserDeleteResponse")({
  "object": ProjectUserDeleteResponseObject,
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class ListRolesParamsOrder extends S.Literal("asc", "desc") {}

export class ListRolesParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 1000 as const
  }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListRolesParamsOrder, { nullable: true, default: () => "asc" as const })
}) {}

/**
 * Always `list`.
 */
export class PublicRoleListResourceObject extends S.Literal("list") {}

/**
 * Paginated list of roles available on an organization or project.
 */
export class PublicRoleListResource extends S.Class<PublicRoleListResource>("PublicRoleListResource")({
  /**
   * Always `list`.
   */
  "object": PublicRoleListResourceObject,
  /**
   * Roles returned in the current page.
   */
  "data": S.Array(Role),
  /**
   * Whether more roles are available when paginating.
   */
  "has_more": S.Boolean,
  /**
   * Cursor to fetch the next page of results, or `null` when there are no additional roles.
   */
  "next": S.NullOr(S.String)
}) {}

/**
 * Request payload for creating a custom role.
 */
export class PublicCreateOrganizationRoleBody
  extends S.Class<PublicCreateOrganizationRoleBody>("PublicCreateOrganizationRoleBody")({
    /**
     * Unique name for the role.
     */
    "role_name": S.String,
    /**
     * Permissions to grant to the role.
     */
    "permissions": S.Array(S.String),
    /**
     * Optional description of the role.
     */
    "description": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * Request payload for updating an existing role.
 */
export class PublicUpdateOrganizationRoleBody
  extends S.Class<PublicUpdateOrganizationRoleBody>("PublicUpdateOrganizationRoleBody")({
    /**
     * Updated set of permissions for the role.
     */
    "permissions": S.optionalWith(S.Array(S.String), { nullable: true }),
    /**
     * New description for the role.
     */
    "description": S.optionalWith(S.String, { nullable: true }),
    /**
     * New name for the role.
     */
    "role_name": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * Always `role.deleted`.
 */
export class RoleDeletedResourceObject extends S.Literal("role.deleted") {}

/**
 * Confirmation payload returned after deleting a role.
 */
export class RoleDeletedResource extends S.Class<RoleDeletedResource>("RoleDeletedResource")({
  /**
   * Always `role.deleted`.
   */
  "object": RoleDeletedResourceObject,
  /**
   * Identifier of the deleted role.
   */
  "id": S.String,
  /**
   * Whether the role was deleted.
   */
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
  "group_by": S.optionalWith(
    S.Array(S.Literal("project_id", "user_id", "api_key_id", "model", "batch", "service_tier")),
    { nullable: true }
  ),
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

export class UserListResponse extends S.Class<UserListResponse>("UserListResponse")({
  "object": UserListResponseObject,
  "data": S.Array(User),
  "first_id": S.String,
  "last_id": S.String,
  "has_more": S.Boolean
}) {}

/**
 * `owner` or `reader`
 */
export class UserRoleUpdateRequestRole extends S.Literal("owner", "reader") {}

export class UserRoleUpdateRequest extends S.Class<UserRoleUpdateRequest>("UserRoleUpdateRequest")({
  /**
   * `owner` or `reader`
   */
  "role": UserRoleUpdateRequestRole
}) {}

export class UserDeleteResponseObject extends S.Literal("organization.user.deleted") {}

export class UserDeleteResponse extends S.Class<UserDeleteResponse>("UserDeleteResponse")({
  "object": UserDeleteResponseObject,
  "id": S.String,
  "deleted": S.Boolean
}) {}

export class ListUserRoleAssignmentsParamsOrder extends S.Literal("asc", "desc") {}

export class ListUserRoleAssignmentsParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListUserRoleAssignmentsParamsOrder, { nullable: true })
}) {}

/**
 * Always `user.role`.
 */
export class UserRoleAssignmentObject extends S.Literal("user.role") {}

/**
 * Role assignment linking a user to a role.
 */
export class UserRoleAssignment extends S.Class<UserRoleAssignment>("UserRoleAssignment")({
  /**
   * Always `user.role`.
   */
  "object": UserRoleAssignmentObject,
  "user": User,
  "role": Role
}) {}

export class ListProjectGroupRoleAssignmentsParamsOrder extends S.Literal("asc", "desc") {}

export class ListProjectGroupRoleAssignmentsParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListProjectGroupRoleAssignmentsParamsOrder, { nullable: true })
}) {}

export class ListProjectRolesParamsOrder extends S.Literal("asc", "desc") {}

export class ListProjectRolesParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 1000 as const
  }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListProjectRolesParamsOrder, { nullable: true, default: () => "asc" as const })
}) {}

export class ListProjectUserRoleAssignmentsParamsOrder extends S.Literal("asc", "desc") {}

export class ListProjectUserRoleAssignmentsParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "order": S.optionalWith(ListProjectUserRoleAssignmentsParamsOrder, { nullable: true })
}) {}

/**
 * The type of session to create. Always `realtime` for the Realtime API.
 */
export class RealtimeSessionCreateRequestGAType extends S.Literal("realtime") {}

export class RealtimeSessionCreateRequestGAModelEnum extends S.Literal(
  "gpt-realtime",
  "gpt-realtime-2025-08-28",
  "gpt-4o-realtime-preview",
  "gpt-4o-realtime-preview-2024-10-01",
  "gpt-4o-realtime-preview-2024-12-17",
  "gpt-4o-realtime-preview-2025-06-03",
  "gpt-4o-mini-realtime-preview",
  "gpt-4o-mini-realtime-preview-2024-12-17",
  "gpt-realtime-mini",
  "gpt-realtime-mini-2025-10-06",
  "gpt-audio-mini",
  "gpt-audio-mini-2025-10-06"
) {}

/**
 * The audio format. Always `audio/pcma`.
 */
export class RealtimeAudioFormatsEnumType extends S.Literal("audio/pcma") {}

/**
 * The sample rate of the audio. Always `24000`.
 */
export class RealtimeAudioFormatsEnumRate extends S.Literal(24000) {}

export class RealtimeAudioFormats extends S.Union(
  /**
   * The PCM audio format. Only a 24kHz sample rate is supported.
   */
  S.Struct({
    /**
     * The audio format. Always `audio/pcm`.
     */
    "type": S.optionalWith(RealtimeAudioFormatsEnumType, { nullable: true }),
    /**
     * The sample rate of the audio. Always `24000`.
     */
    "rate": S.optionalWith(RealtimeAudioFormatsEnumRate, { nullable: true })
  }),
  /**
   * The G.711 μ-law format.
   */
  S.Struct({
    /**
     * The audio format. Always `audio/pcmu`.
     */
    "type": S.optionalWith(RealtimeAudioFormatsEnumType, { nullable: true })
  }),
  /**
   * The G.711 A-law format.
   */
  S.Struct({
    /**
     * The audio format. Always `audio/pcma`.
     */
    "type": S.optionalWith(RealtimeAudioFormatsEnumType, { nullable: true })
  })
) {}

/**
 * The model to use for transcription. Current options are `whisper-1`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, and `gpt-4o-transcribe-diarize`. Use `gpt-4o-transcribe-diarize` when you need diarization with speaker labels.
 */
export class AudioTranscriptionModel
  extends S.Literal("whisper-1", "gpt-4o-mini-transcribe", "gpt-4o-transcribe", "gpt-4o-transcribe-diarize")
{}

export class AudioTranscription extends S.Class<AudioTranscription>("AudioTranscription")({
  /**
   * The model to use for transcription. Current options are `whisper-1`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, and `gpt-4o-transcribe-diarize`. Use `gpt-4o-transcribe-diarize` when you need diarization with speaker labels.
   */
  "model": S.optionalWith(AudioTranscriptionModel, { nullable: true }),
  /**
   * The language of the input audio. Supplying the input language in
   * [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (e.g. `en`) format
   * will improve accuracy and latency.
   */
  "language": S.optionalWith(S.String, { nullable: true }),
  /**
   * An optional text to guide the model's style or continue a previous audio
   * segment.
   * For `whisper-1`, the [prompt is a list of keywords](https://platform.openai.com/docs/guides/speech-to-text#prompting).
   * For `gpt-4o-transcribe` models (excluding `gpt-4o-transcribe-diarize`), the prompt is a free text string, for example "expect words related to technology".
   */
  "prompt": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Type of noise reduction. `near_field` is for close-talking microphones such as headphones, `far_field` is for far-field microphones such as laptop or conference room microphones.
 */
export class NoiseReductionType extends S.Literal("near_field", "far_field") {}

/**
 * Used only for `semantic_vad` mode. The eagerness of the model to respond. `low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`. `low`, `medium`, and `high` have max timeouts of 8s, 4s, and 2s respectively.
 */
export class RealtimeTurnDetectionEnumEagerness extends S.Literal("low", "medium", "high", "auto") {}

export class RealtimeTurnDetection extends S.Union(
  /**
   * Configuration for turn detection, ether Server VAD or Semantic VAD. This can be set to `null` to turn off, in which case the client must manually trigger model response.
   *
   * Server VAD means that the model will detect the start and end of speech based on audio volume and respond at the end of user speech.
   *
   * Semantic VAD is more advanced and uses a turn detection model (in conjunction with VAD) to semantically estimate whether the user has finished speaking, then dynamically sets a timeout based on this probability. For example, if user audio trails off with "uhhm", the model will score a low probability of turn end and wait longer for the user to continue speaking. This can be useful for more natural conversations, but may have a higher latency.
   */
  S.Union(
    /**
     * Server-side voice activity detection (VAD) which flips on when user speech is detected and off after a period of silence.
     */
    S.Struct({
      /**
       * Type of turn detection, `server_vad` to turn on simple Server VAD.
       */
      "type": S.Literal("server_vad").pipe(S.propertySignature, S.withConstructorDefault(() => "server_vad" as const)),
      /**
       * Used only for `server_vad` mode. Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A
       * higher threshold will require louder audio to activate the model, and
       * thus might perform better in noisy environments.
       */
      "threshold": S.optionalWith(S.Number, { nullable: true }),
      /**
       * Used only for `server_vad` mode. Amount of audio to include before the VAD detected speech (in
       * milliseconds). Defaults to 300ms.
       */
      "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
      /**
       * Used only for `server_vad` mode. Duration of silence to detect speech stop (in milliseconds). Defaults
       * to 500ms. With shorter values the model will respond more quickly,
       * but may jump in on short pauses from the user.
       */
      "silence_duration_ms": S.optionalWith(S.Int, { nullable: true }),
      /**
       * Whether or not to automatically generate a response when a VAD stop event occurs.
       */
      "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
      /**
       * Whether or not to automatically interrupt any ongoing response with output to the default
       * conversation (i.e. `conversation` of `auto`) when a VAD start event occurs.
       */
      "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
      "idle_timeout_ms": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(5000), S.lessThanOrEqualTo(30000)), {
        nullable: true
      })
    }),
    /**
     * Server-side semantic turn detection which uses a model to determine when the user has finished speaking.
     */
    S.Struct({
      /**
       * Type of turn detection, `semantic_vad` to turn on Semantic VAD.
       */
      "type": S.Literal("semantic_vad"),
      /**
       * Used only for `semantic_vad` mode. The eagerness of the model to respond. `low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`. `low`, `medium`, and `high` have max timeouts of 8s, 4s, and 2s respectively.
       */
      "eagerness": S.optionalWith(S.Literal("low", "medium", "high", "auto"), {
        nullable: true,
        default: () => "auto" as const
      }),
      /**
       * Whether or not to automatically generate a response when a VAD stop event occurs.
       */
      "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
      /**
       * Whether or not to automatically interrupt any ongoing response with output to the default
       * conversation (i.e. `conversation` of `auto`) when a VAD start event occurs.
       */
      "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const })
    })
  ),
  S.Null
) {}

/**
 * Enables tracing and sets default values for tracing configuration options. Always `auto`.
 */
export class RealtimeSessionCreateRequestGATracingEnum extends S.Literal("auto") {}

/**
 * The type of the tool, i.e. `function`.
 */
export class RealtimeFunctionToolType extends S.Literal("function") {}

export class RealtimeFunctionTool extends S.Class<RealtimeFunctionTool>("RealtimeFunctionTool")({
  /**
   * The type of the tool, i.e. `function`.
   */
  "type": S.optionalWith(RealtimeFunctionToolType, { nullable: true }),
  /**
   * The name of the function.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * The description of the function, including guidance on when and how
   * to call it, and guidance about what to tell the user when calling
   * (if anything).
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * Parameters of the function in JSON Schema.
   */
  "parameters": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * Controls which (if any) tool is called by the model.
 *
 * `none` means the model will not call any tool and instead generates a message.
 *
 * `auto` means the model can pick between generating a message or calling one or
 * more tools.
 *
 * `required` means the model must call one or more tools.
 */
export class ToolChoiceOptions extends S.Literal("none", "auto", "required") {}

/**
 * For function calling, the type is always `function`.
 */
export class ToolChoiceFunctionType extends S.Literal("function") {}

/**
 * Use this option to force the model to call a specific function.
 */
export class ToolChoiceFunction extends S.Class<ToolChoiceFunction>("ToolChoiceFunction")({
  /**
   * For function calling, the type is always `function`.
   */
  "type": ToolChoiceFunctionType,
  /**
   * The name of the function to call.
   */
  "name": S.String
}) {}

/**
 * For MCP tools, the type is always `mcp`.
 */
export class ToolChoiceMCPType extends S.Literal("mcp") {}

/**
 * Use this option to force the model to call a specific tool on a remote MCP server.
 */
export class ToolChoiceMCP extends S.Class<ToolChoiceMCP>("ToolChoiceMCP")({
  /**
   * For MCP tools, the type is always `mcp`.
   */
  "type": ToolChoiceMCPType,
  /**
   * The label of the MCP server to use.
   */
  "server_label": S.String,
  "name": S.optionalWith(S.String, { nullable: true })
}) {}

export class RealtimeSessionCreateRequestGAMaxOutputTokensEnum extends S.Literal("inf") {}

/**
 * The truncation strategy to use for the session. `auto` is the default truncation strategy. `disabled` will disable truncation and emit errors when the conversation exceeds the input token limit.
 */
export class RealtimeTruncationEnum extends S.Literal("auto", "disabled") {}

/**
 * Use retention ratio truncation.
 */
export class RealtimeTruncationEnumType extends S.Literal("retention_ratio") {}

/**
 * When the number of tokens in a conversation exceeds the model's input token limit, the conversation be truncated, meaning messages (starting from the oldest) will not be included in the model's context. A 32k context model with 4,096 max output tokens can only include 28,224 tokens in the context before truncation occurs.
 * Clients can configure truncation behavior to truncate with a lower max token limit, which is an effective way to control token usage and cost.
 * Truncation will reduce the number of cached tokens on the next turn (busting the cache), since messages are dropped from the beginning of the context. However, clients can also configure truncation to retain messages up to a fraction of the maximum context size, which will reduce the need for future truncations and thus improve the cache rate.
 * Truncation can be disabled entirely, which means the server will never truncate but would instead return an error if the conversation exceeds the model's input token limit.
 */
export class RealtimeTruncation extends S.Union(
  /**
   * The truncation strategy to use for the session. `auto` is the default truncation strategy. `disabled` will disable truncation and emit errors when the conversation exceeds the input token limit.
   */
  RealtimeTruncationEnum,
  /**
   * Retain a fraction of the conversation tokens when the conversation exceeds the input token limit. This allows you to amortize truncations across multiple turns, which can help improve cached token usage.
   */
  S.Struct({
    /**
     * Use retention ratio truncation.
     */
    "type": RealtimeTruncationEnumType,
    /**
     * Fraction of post-instruction conversation tokens to retain (`0.0` - `1.0`) when the conversation exceeds the input token limit. Setting this to `0.8` means that messages will be dropped until 80% of the maximum allowed tokens are used. This helps reduce the frequency of truncations and improve cache rates.
     */
    "retention_ratio": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)),
    /**
     * Optional custom token limits for this truncation strategy. If not provided, the model's default token limits will be used.
     */
    "token_limits": S.optionalWith(
      S.Struct({
        /**
         * Maximum tokens allowed in the conversation after instructions (which including tool definitions). For example, setting this to 5,000 would mean that truncation would occur when the conversation exceeds 5,000 tokens after instructions. This cannot be higher than the model's context window size minus the maximum output tokens.
         */
        "post_instructions": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true })
      }),
      { nullable: true }
    )
  })
) {}

export class ResponsePromptVariables extends S.Union(
  /**
   * Optional map of values to substitute in for variables in your
   * prompt. The substitution values can either be strings, or other
   * Response input types like images or files.
   */
  S.Record({ key: S.String, value: S.Unknown }),
  S.Null
) {}

export class Prompt extends S.Union(
  /**
   * Reference to a prompt template and its variables.
   * [Learn more](https://platform.openai.com/docs/guides/text?api-mode=responses#reusable-prompts).
   */
  S.Struct({
    /**
     * The unique identifier of the prompt template to use.
     */
    "id": S.String,
    "version": S.optionalWith(S.String, { nullable: true }),
    "variables": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  }),
  S.Null
) {}

/**
 * Realtime session object configuration.
 */
export class RealtimeSessionCreateRequestGA
  extends S.Class<RealtimeSessionCreateRequestGA>("RealtimeSessionCreateRequestGA")({
    /**
     * The type of session to create. Always `realtime` for the Realtime API.
     */
    "type": RealtimeSessionCreateRequestGAType,
    /**
     * The set of modalities the model can respond with. It defaults to `["audio"]`, indicating
     * that the model will respond with audio plus a transcript. `["text"]` can be used to make
     * the model respond with text only. It is not possible to request both `text` and `audio` at the same time.
     */
    "output_modalities": S.optionalWith(S.Array(S.Literal("text", "audio")), {
      nullable: true,
      default: () => ["audio"] as const
    }),
    /**
     * The Realtime model used for this session.
     */
    "model": S.optionalWith(S.Union(S.String, RealtimeSessionCreateRequestGAModelEnum), { nullable: true }),
    /**
     * The default system instructions (i.e. system message) prepended to model calls. This field allows the client to guide the model on desired responses. The model can be instructed on response content and format, (e.g. "be extremely succinct", "act friendly", "here are examples of good responses") and on audio behavior (e.g. "talk quickly", "inject emotion into your voice", "laugh frequently"). The instructions are not guaranteed to be followed by the model, but they provide guidance to the model on the desired behavior.
     *
     * Note that the server sets default instructions which will be used if this field is not set and are visible in the `session.created` event at the start of the session.
     */
    "instructions": S.optionalWith(S.String, { nullable: true }),
    /**
     * Configuration for input and output audio.
     */
    "audio": S.optionalWith(
      S.Struct({
        "input": S.optionalWith(
          S.Struct({
            /**
             * The format of the input audio.
             */
            "format": S.optionalWith(RealtimeAudioFormats, { nullable: true }),
            /**
             * Configuration for input audio transcription, defaults to off and can be set to `null` to turn off once on. Input audio transcription is not native to the model, since the model consumes audio directly. Transcription runs asynchronously through [the /audio/transcriptions endpoint](https://platform.openai.com/docs/api-reference/audio/createTranscription) and should be treated as guidance of input audio content rather than precisely what the model heard. The client can optionally set the language and prompt for transcription, these offer additional guidance to the transcription service.
             */
            "transcription": S.optionalWith(AudioTranscription, { nullable: true }),
            /**
             * Configuration for input audio noise reduction. This can be set to `null` to turn off.
             * Noise reduction filters audio added to the input audio buffer before it is sent to VAD and the model.
             * Filtering the audio can improve VAD and turn detection accuracy (reducing false positives) and model performance by improving perception of the input audio.
             */
            "noise_reduction": S.optionalWith(
              S.Struct({
                "type": S.optionalWith(NoiseReductionType, { nullable: true })
              }),
              { nullable: true }
            ),
            "turn_detection": S.optionalWith(
              S.Union(
                /**
                 * Server-side voice activity detection (VAD) which flips on when user speech is detected and off after a period of silence.
                 */
                S.Struct({
                  /**
                   * Type of turn detection, `server_vad` to turn on simple Server VAD.
                   */
                  "type": S.Literal("server_vad").pipe(
                    S.propertySignature,
                    S.withConstructorDefault(() => "server_vad" as const)
                  ),
                  /**
                   * Used only for `server_vad` mode. Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A
                   * higher threshold will require louder audio to activate the model, and
                   * thus might perform better in noisy environments.
                   */
                  "threshold": S.optionalWith(S.Number, { nullable: true }),
                  /**
                   * Used only for `server_vad` mode. Amount of audio to include before the VAD detected speech (in
                   * milliseconds). Defaults to 300ms.
                   */
                  "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
                  /**
                   * Used only for `server_vad` mode. Duration of silence to detect speech stop (in milliseconds). Defaults
                   * to 500ms. With shorter values the model will respond more quickly,
                   * but may jump in on short pauses from the user.
                   */
                  "silence_duration_ms": S.optionalWith(S.Int, { nullable: true }),
                  /**
                   * Whether or not to automatically generate a response when a VAD stop event occurs.
                   */
                  "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
                  /**
                   * Whether or not to automatically interrupt any ongoing response with output to the default
                   * conversation (i.e. `conversation` of `auto`) when a VAD start event occurs.
                   */
                  "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
                  "idle_timeout_ms": S.optionalWith(
                    S.Int.pipe(S.greaterThanOrEqualTo(5000), S.lessThanOrEqualTo(30000)),
                    { nullable: true }
                  )
                }),
                /**
                 * Server-side semantic turn detection which uses a model to determine when the user has finished speaking.
                 */
                S.Struct({
                  /**
                   * Type of turn detection, `semantic_vad` to turn on Semantic VAD.
                   */
                  "type": S.Literal("semantic_vad"),
                  /**
                   * Used only for `semantic_vad` mode. The eagerness of the model to respond. `low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`. `low`, `medium`, and `high` have max timeouts of 8s, 4s, and 2s respectively.
                   */
                  "eagerness": S.optionalWith(S.Literal("low", "medium", "high", "auto"), {
                    nullable: true,
                    default: () => "auto" as const
                  }),
                  /**
                   * Whether or not to automatically generate a response when a VAD stop event occurs.
                   */
                  "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
                  /**
                   * Whether or not to automatically interrupt any ongoing response with output to the default
                   * conversation (i.e. `conversation` of `auto`) when a VAD start event occurs.
                   */
                  "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const })
                })
              ),
              { nullable: true }
            )
          }),
          { nullable: true }
        ),
        "output": S.optionalWith(
          S.Struct({
            /**
             * The format of the output audio.
             */
            "format": S.optionalWith(RealtimeAudioFormats, { nullable: true }),
            /**
             * The voice the model uses to respond. Voice cannot be changed during the
             * session once the model has responded with audio at least once. Current
             * voice options are `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`,
             * `shimmer`, `verse`, `marin`, and `cedar`. We recommend `marin` and `cedar` for
             * best quality.
             */
            "voice": S.optionalWith(VoiceIdsShared, { nullable: true }),
            /**
             * The speed of the model's spoken response as a multiple of the original speed.
             * 1.0 is the default speed. 0.25 is the minimum speed. 1.5 is the maximum speed. This value can only be changed in between model turns, not while a response is in progress.
             *
             * This parameter is a post-processing adjustment to the audio after it is generated, it's
             * also possible to prompt the model to speak faster or slower.
             */
            "speed": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0.25), S.lessThanOrEqualTo(1.5)), {
              nullable: true,
              default: () => 1 as const
            })
          }),
          { nullable: true }
        )
      }),
      { nullable: true }
    ),
    /**
     * Additional fields to include in server outputs.
     *
     * `item.input_audio_transcription.logprobs`: Include logprobs for input audio transcription.
     */
    "include": S.optionalWith(S.Array(S.Literal("item.input_audio_transcription.logprobs")), { nullable: true }),
    /**
     * Realtime API can write session traces to the [Traces Dashboard](/logs?api=traces). Set to null to disable tracing. Once
     * tracing is enabled for a session, the configuration cannot be modified.
     *
     * `auto` will create a trace for the session with default values for the
     * workflow name, group id, and metadata.
     */
    "tracing": S.optionalWith(
      S.Union(
        /**
         * Enables tracing and sets default values for tracing configuration options. Always `auto`.
         */
        RealtimeSessionCreateRequestGATracingEnum,
        /**
         * Granular configuration for tracing.
         */
        S.Struct({
          /**
           * The name of the workflow to attach to this trace. This is used to
           * name the trace in the Traces Dashboard.
           */
          "workflow_name": S.optionalWith(S.String, { nullable: true }),
          /**
           * The group id to attach to this trace to enable filtering and
           * grouping in the Traces Dashboard.
           */
          "group_id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The arbitrary metadata to attach to this trace to enable
           * filtering in the Traces Dashboard.
           */
          "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
        })
      ),
      { nullable: true }
    ),
    /**
     * Tools available to the model.
     */
    "tools": S.optionalWith(S.Array(S.Union(RealtimeFunctionTool, MCPTool)), { nullable: true }),
    /**
     * How the model chooses tools. Provide one of the string modes or force a specific
     * function/MCP tool.
     */
    "tool_choice": S.optionalWith(S.Union(ToolChoiceOptions, ToolChoiceFunction, ToolChoiceMCP), {
      nullable: true,
      default: () => "auto" as const
    }),
    /**
     * Maximum number of output tokens for a single assistant response,
     * inclusive of tool calls. Provide an integer between 1 and 4096 to
     * limit output tokens, or `inf` for the maximum available tokens for a
     * given model. Defaults to `inf`.
     */
    "max_output_tokens": S.optionalWith(S.Union(S.Int, RealtimeSessionCreateRequestGAMaxOutputTokensEnum), {
      nullable: true
    }),
    "truncation": S.optionalWith(RealtimeTruncation, { nullable: true }),
    "prompt": S.optionalWith(
      S.Struct({
        /**
         * The unique identifier of the prompt template to use.
         */
        "id": S.String,
        "version": S.optionalWith(S.String, { nullable: true }),
        "variables": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
      }),
      { nullable: true }
    )
  })
{}

/**
 * Parameters required to initiate a realtime call and receive the SDP answer
 * needed to complete a WebRTC peer connection. Provide an SDP offer generated
 * by your client and optionally configure the session that will answer the call.
 */
export class RealtimeCallCreateRequest extends S.Class<RealtimeCallCreateRequest>("RealtimeCallCreateRequest")({
  /**
   * WebRTC Session Description Protocol (SDP) offer generated by the caller.
   */
  "sdp": S.String,
  /**
   * Optional session configuration to apply before the realtime session is
   * created. Use the same parameters you would send in a [`create client secret`](https://platform.openai.com/docs/api-reference/realtime-sessions/create-realtime-client-secret)
   * request.
   */
  "session": S.optionalWith(RealtimeSessionCreateRequestGA, { nullable: true })
}) {}

/**
 * Parameters required to transfer a SIP call to a new destination using the
 * Realtime API.
 */
export class RealtimeCallReferRequest extends S.Class<RealtimeCallReferRequest>("RealtimeCallReferRequest")({
  /**
   * URI that should appear in the SIP Refer-To header. Supports values like
   * `tel:+14155550123` or `sip:agent@example.com`.
   */
  "target_uri": S.String
}) {}

/**
 * Parameters used to decline an incoming SIP call handled by the Realtime API.
 */
export class RealtimeCallRejectRequest extends S.Class<RealtimeCallRejectRequest>("RealtimeCallRejectRequest")({
  /**
   * SIP response code to send back to the caller. Defaults to `603` (Decline)
   * when omitted.
   */
  "status_code": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * The anchor point for the client secret expiration, meaning that `seconds` will be added to the `created_at` time of the client secret to produce an expiration timestamp. Only `created_at` is currently supported.
 */
export class RealtimeCreateClientSecretRequestExpiresAfterAnchor extends S.Literal("created_at") {}

/**
 * The type of session to create. Always `transcription` for transcription sessions.
 */
export class RealtimeTranscriptionSessionCreateRequestGAType extends S.Literal("transcription") {}

/**
 * Realtime transcription session object configuration.
 */
export class RealtimeTranscriptionSessionCreateRequestGA
  extends S.Class<RealtimeTranscriptionSessionCreateRequestGA>("RealtimeTranscriptionSessionCreateRequestGA")({
    /**
     * The type of session to create. Always `transcription` for transcription sessions.
     */
    "type": RealtimeTranscriptionSessionCreateRequestGAType,
    /**
     * Configuration for input and output audio.
     */
    "audio": S.optionalWith(
      S.Struct({
        "input": S.optionalWith(
          S.Struct({
            "format": S.optionalWith(RealtimeAudioFormats, { nullable: true }),
            /**
             * Configuration for input audio transcription, defaults to off and can be set to `null` to turn off once on. Input audio transcription is not native to the model, since the model consumes audio directly. Transcription runs asynchronously through [the /audio/transcriptions endpoint](https://platform.openai.com/docs/api-reference/audio/createTranscription) and should be treated as guidance of input audio content rather than precisely what the model heard. The client can optionally set the language and prompt for transcription, these offer additional guidance to the transcription service.
             */
            "transcription": S.optionalWith(AudioTranscription, { nullable: true }),
            /**
             * Configuration for input audio noise reduction. This can be set to `null` to turn off.
             * Noise reduction filters audio added to the input audio buffer before it is sent to VAD and the model.
             * Filtering the audio can improve VAD and turn detection accuracy (reducing false positives) and model performance by improving perception of the input audio.
             */
            "noise_reduction": S.optionalWith(
              S.Struct({
                "type": S.optionalWith(NoiseReductionType, { nullable: true })
              }),
              { nullable: true }
            ),
            "turn_detection": S.optionalWith(
              S.Union(
                /**
                 * Server-side voice activity detection (VAD) which flips on when user speech is detected and off after a period of silence.
                 */
                S.Struct({
                  /**
                   * Type of turn detection, `server_vad` to turn on simple Server VAD.
                   */
                  "type": S.Literal("server_vad").pipe(
                    S.propertySignature,
                    S.withConstructorDefault(() => "server_vad" as const)
                  ),
                  /**
                   * Used only for `server_vad` mode. Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A
                   * higher threshold will require louder audio to activate the model, and
                   * thus might perform better in noisy environments.
                   */
                  "threshold": S.optionalWith(S.Number, { nullable: true }),
                  /**
                   * Used only for `server_vad` mode. Amount of audio to include before the VAD detected speech (in
                   * milliseconds). Defaults to 300ms.
                   */
                  "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
                  /**
                   * Used only for `server_vad` mode. Duration of silence to detect speech stop (in milliseconds). Defaults
                   * to 500ms. With shorter values the model will respond more quickly,
                   * but may jump in on short pauses from the user.
                   */
                  "silence_duration_ms": S.optionalWith(S.Int, { nullable: true }),
                  /**
                   * Whether or not to automatically generate a response when a VAD stop event occurs.
                   */
                  "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
                  /**
                   * Whether or not to automatically interrupt any ongoing response with output to the default
                   * conversation (i.e. `conversation` of `auto`) when a VAD start event occurs.
                   */
                  "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
                  "idle_timeout_ms": S.optionalWith(
                    S.Int.pipe(S.greaterThanOrEqualTo(5000), S.lessThanOrEqualTo(30000)),
                    { nullable: true }
                  )
                }),
                /**
                 * Server-side semantic turn detection which uses a model to determine when the user has finished speaking.
                 */
                S.Struct({
                  /**
                   * Type of turn detection, `semantic_vad` to turn on Semantic VAD.
                   */
                  "type": S.Literal("semantic_vad"),
                  /**
                   * Used only for `semantic_vad` mode. The eagerness of the model to respond. `low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`. `low`, `medium`, and `high` have max timeouts of 8s, 4s, and 2s respectively.
                   */
                  "eagerness": S.optionalWith(S.Literal("low", "medium", "high", "auto"), {
                    nullable: true,
                    default: () => "auto" as const
                  }),
                  /**
                   * Whether or not to automatically generate a response when a VAD stop event occurs.
                   */
                  "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
                  /**
                   * Whether or not to automatically interrupt any ongoing response with output to the default
                   * conversation (i.e. `conversation` of `auto`) when a VAD start event occurs.
                   */
                  "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const })
                })
              ),
              { nullable: true }
            )
          }),
          { nullable: true }
        )
      }),
      { nullable: true }
    ),
    /**
     * Additional fields to include in server outputs.
     *
     * `item.input_audio_transcription.logprobs`: Include logprobs for input audio transcription.
     */
    "include": S.optionalWith(S.Array(S.Literal("item.input_audio_transcription.logprobs")), { nullable: true })
  })
{}

/**
 * Create a session and client secret for the Realtime API. The request can specify
 * either a realtime or a transcription session configuration.
 * [Learn more about the Realtime API](https://platform.openai.com/docs/guides/realtime).
 */
export class RealtimeCreateClientSecretRequest
  extends S.Class<RealtimeCreateClientSecretRequest>("RealtimeCreateClientSecretRequest")({
    /**
     * Configuration for the client secret expiration. Expiration refers to the time after which
     * a client secret will no longer be valid for creating sessions. The session itself may
     * continue after that time once started. A secret can be used to create multiple sessions
     * until it expires.
     */
    "expires_after": S.optionalWith(
      S.Struct({
        /**
         * The anchor point for the client secret expiration, meaning that `seconds` will be added to the `created_at` time of the client secret to produce an expiration timestamp. Only `created_at` is currently supported.
         */
        "anchor": S.optionalWith(RealtimeCreateClientSecretRequestExpiresAfterAnchor, {
          nullable: true,
          default: () => "created_at" as const
        }),
        /**
         * The number of seconds from the anchor point to the expiration. Select a value between `10` and `7200` (2 hours). This default to 600 seconds (10 minutes) if not specified.
         */
        "seconds": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(10), S.lessThanOrEqualTo(7200)), {
          nullable: true,
          default: () => 600 as const
        })
      }),
      { nullable: true }
    ),
    /**
     * Session configuration to use for the client secret. Choose either a realtime
     * session or a transcription session.
     */
    "session": S.optionalWith(S.Union(RealtimeSessionCreateRequestGA, RealtimeTranscriptionSessionCreateRequestGA), {
      nullable: true
    })
  })
{}

/**
 * The type of session to create. Always `realtime` for the Realtime API.
 */
export class RealtimeSessionCreateResponseGAType extends S.Literal("realtime") {}

export class RealtimeSessionCreateResponseGAModelEnum extends S.Literal(
  "gpt-realtime",
  "gpt-realtime-2025-08-28",
  "gpt-4o-realtime-preview",
  "gpt-4o-realtime-preview-2024-10-01",
  "gpt-4o-realtime-preview-2024-12-17",
  "gpt-4o-realtime-preview-2025-06-03",
  "gpt-4o-mini-realtime-preview",
  "gpt-4o-mini-realtime-preview-2024-12-17",
  "gpt-realtime-mini",
  "gpt-realtime-mini-2025-10-06",
  "gpt-audio-mini",
  "gpt-audio-mini-2025-10-06"
) {}

/**
 * Enables tracing and sets default values for tracing configuration options. Always `auto`.
 */
export class RealtimeSessionCreateResponseGATracingEnum extends S.Literal("auto") {}

export class RealtimeSessionCreateResponseGAMaxOutputTokensEnum extends S.Literal("inf") {}

/**
 * A new Realtime session configuration, with an ephemeral key. Default TTL
 * for keys is one minute.
 */
export class RealtimeSessionCreateResponseGA
  extends S.Class<RealtimeSessionCreateResponseGA>("RealtimeSessionCreateResponseGA")({
    /**
     * Ephemeral key returned by the API.
     */
    "client_secret": S.Struct({
      /**
       * Ephemeral key usable in client environments to authenticate connections to the Realtime API. Use this in client-side environments rather than a standard API token, which should only be used server-side.
       */
      "value": S.String,
      /**
       * Timestamp for when the token expires. Currently, all tokens expire
       * after one minute.
       */
      "expires_at": S.Int
    }),
    /**
     * The type of session to create. Always `realtime` for the Realtime API.
     */
    "type": RealtimeSessionCreateResponseGAType,
    /**
     * The set of modalities the model can respond with. It defaults to `["audio"]`, indicating
     * that the model will respond with audio plus a transcript. `["text"]` can be used to make
     * the model respond with text only. It is not possible to request both `text` and `audio` at the same time.
     */
    "output_modalities": S.optionalWith(S.Array(S.Literal("text", "audio")), {
      nullable: true,
      default: () => ["audio"] as const
    }),
    /**
     * The Realtime model used for this session.
     */
    "model": S.optionalWith(S.Union(S.String, RealtimeSessionCreateResponseGAModelEnum), { nullable: true }),
    /**
     * The default system instructions (i.e. system message) prepended to model calls. This field allows the client to guide the model on desired responses. The model can be instructed on response content and format, (e.g. "be extremely succinct", "act friendly", "here are examples of good responses") and on audio behavior (e.g. "talk quickly", "inject emotion into your voice", "laugh frequently"). The instructions are not guaranteed to be followed by the model, but they provide guidance to the model on the desired behavior.
     *
     * Note that the server sets default instructions which will be used if this field is not set and are visible in the `session.created` event at the start of the session.
     */
    "instructions": S.optionalWith(S.String, { nullable: true }),
    /**
     * Configuration for input and output audio.
     */
    "audio": S.optionalWith(
      S.Struct({
        "input": S.optionalWith(
          S.Struct({
            /**
             * The format of the input audio.
             */
            "format": S.optionalWith(RealtimeAudioFormats, { nullable: true }),
            /**
             * Configuration for input audio transcription, defaults to off and can be set to `null` to turn off once on. Input audio transcription is not native to the model, since the model consumes audio directly. Transcription runs asynchronously through [the /audio/transcriptions endpoint](https://platform.openai.com/docs/api-reference/audio/createTranscription) and should be treated as guidance of input audio content rather than precisely what the model heard. The client can optionally set the language and prompt for transcription, these offer additional guidance to the transcription service.
             */
            "transcription": S.optionalWith(AudioTranscription, { nullable: true }),
            /**
             * Configuration for input audio noise reduction. This can be set to `null` to turn off.
             * Noise reduction filters audio added to the input audio buffer before it is sent to VAD and the model.
             * Filtering the audio can improve VAD and turn detection accuracy (reducing false positives) and model performance by improving perception of the input audio.
             */
            "noise_reduction": S.optionalWith(
              S.Struct({
                "type": S.optionalWith(NoiseReductionType, { nullable: true })
              }),
              { nullable: true }
            ),
            "turn_detection": S.optionalWith(
              S.Union(
                /**
                 * Server-side voice activity detection (VAD) which flips on when user speech is detected and off after a period of silence.
                 */
                S.Struct({
                  /**
                   * Type of turn detection, `server_vad` to turn on simple Server VAD.
                   */
                  "type": S.Literal("server_vad").pipe(
                    S.propertySignature,
                    S.withConstructorDefault(() => "server_vad" as const)
                  ),
                  /**
                   * Used only for `server_vad` mode. Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A
                   * higher threshold will require louder audio to activate the model, and
                   * thus might perform better in noisy environments.
                   */
                  "threshold": S.optionalWith(S.Number, { nullable: true }),
                  /**
                   * Used only for `server_vad` mode. Amount of audio to include before the VAD detected speech (in
                   * milliseconds). Defaults to 300ms.
                   */
                  "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
                  /**
                   * Used only for `server_vad` mode. Duration of silence to detect speech stop (in milliseconds). Defaults
                   * to 500ms. With shorter values the model will respond more quickly,
                   * but may jump in on short pauses from the user.
                   */
                  "silence_duration_ms": S.optionalWith(S.Int, { nullable: true }),
                  /**
                   * Whether or not to automatically generate a response when a VAD stop event occurs.
                   */
                  "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
                  /**
                   * Whether or not to automatically interrupt any ongoing response with output to the default
                   * conversation (i.e. `conversation` of `auto`) when a VAD start event occurs.
                   */
                  "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
                  "idle_timeout_ms": S.optionalWith(
                    S.Int.pipe(S.greaterThanOrEqualTo(5000), S.lessThanOrEqualTo(30000)),
                    { nullable: true }
                  )
                }),
                /**
                 * Server-side semantic turn detection which uses a model to determine when the user has finished speaking.
                 */
                S.Struct({
                  /**
                   * Type of turn detection, `semantic_vad` to turn on Semantic VAD.
                   */
                  "type": S.Literal("semantic_vad"),
                  /**
                   * Used only for `semantic_vad` mode. The eagerness of the model to respond. `low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`. `low`, `medium`, and `high` have max timeouts of 8s, 4s, and 2s respectively.
                   */
                  "eagerness": S.optionalWith(S.Literal("low", "medium", "high", "auto"), {
                    nullable: true,
                    default: () => "auto" as const
                  }),
                  /**
                   * Whether or not to automatically generate a response when a VAD stop event occurs.
                   */
                  "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
                  /**
                   * Whether or not to automatically interrupt any ongoing response with output to the default
                   * conversation (i.e. `conversation` of `auto`) when a VAD start event occurs.
                   */
                  "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const })
                })
              ),
              { nullable: true }
            )
          }),
          { nullable: true }
        ),
        "output": S.optionalWith(
          S.Struct({
            /**
             * The format of the output audio.
             */
            "format": S.optionalWith(RealtimeAudioFormats, { nullable: true }),
            /**
             * The voice the model uses to respond. Voice cannot be changed during the
             * session once the model has responded with audio at least once. Current
             * voice options are `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`,
             * `shimmer`, `verse`, `marin`, and `cedar`. We recommend `marin` and `cedar` for
             * best quality.
             */
            "voice": S.optionalWith(VoiceIdsShared, { nullable: true }),
            /**
             * The speed of the model's spoken response as a multiple of the original speed.
             * 1.0 is the default speed. 0.25 is the minimum speed. 1.5 is the maximum speed. This value can only be changed in between model turns, not while a response is in progress.
             *
             * This parameter is a post-processing adjustment to the audio after it is generated, it's
             * also possible to prompt the model to speak faster or slower.
             */
            "speed": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0.25), S.lessThanOrEqualTo(1.5)), {
              nullable: true,
              default: () => 1 as const
            })
          }),
          { nullable: true }
        )
      }),
      { nullable: true }
    ),
    /**
     * Additional fields to include in server outputs.
     *
     * `item.input_audio_transcription.logprobs`: Include logprobs for input audio transcription.
     */
    "include": S.optionalWith(S.Array(S.Literal("item.input_audio_transcription.logprobs")), { nullable: true }),
    "tracing": S.optionalWith(
      S.Union(
        /**
         * Enables tracing and sets default values for tracing configuration options. Always `auto`.
         */
        RealtimeSessionCreateResponseGATracingEnum,
        /**
         * Granular configuration for tracing.
         */
        S.Struct({
          /**
           * The name of the workflow to attach to this trace. This is used to
           * name the trace in the Traces Dashboard.
           */
          "workflow_name": S.optionalWith(S.String, { nullable: true }),
          /**
           * The group id to attach to this trace to enable filtering and
           * grouping in the Traces Dashboard.
           */
          "group_id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The arbitrary metadata to attach to this trace to enable
           * filtering in the Traces Dashboard.
           */
          "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
        })
      ),
      { nullable: true }
    ),
    /**
     * Tools available to the model.
     */
    "tools": S.optionalWith(S.Array(S.Union(RealtimeFunctionTool, MCPTool)), { nullable: true }),
    /**
     * How the model chooses tools. Provide one of the string modes or force a specific
     * function/MCP tool.
     */
    "tool_choice": S.optionalWith(S.Union(ToolChoiceOptions, ToolChoiceFunction, ToolChoiceMCP), {
      nullable: true,
      default: () => "auto" as const
    }),
    /**
     * Maximum number of output tokens for a single assistant response,
     * inclusive of tool calls. Provide an integer between 1 and 4096 to
     * limit output tokens, or `inf` for the maximum available tokens for a
     * given model. Defaults to `inf`.
     */
    "max_output_tokens": S.optionalWith(S.Union(S.Int, RealtimeSessionCreateResponseGAMaxOutputTokensEnum), {
      nullable: true
    }),
    "truncation": S.optionalWith(RealtimeTruncation, { nullable: true }),
    "prompt": S.optionalWith(
      S.Struct({
        /**
         * The unique identifier of the prompt template to use.
         */
        "id": S.String,
        "version": S.optionalWith(S.String, { nullable: true }),
        "variables": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
      }),
      { nullable: true }
    )
  })
{}

/**
 * The type of session. Always `transcription` for transcription sessions.
 */
export class RealtimeTranscriptionSessionCreateResponseGAType extends S.Literal("transcription") {}

/**
 * A Realtime transcription session configuration object.
 */
export class RealtimeTranscriptionSessionCreateResponseGA
  extends S.Class<RealtimeTranscriptionSessionCreateResponseGA>("RealtimeTranscriptionSessionCreateResponseGA")({
    /**
     * The type of session. Always `transcription` for transcription sessions.
     */
    "type": RealtimeTranscriptionSessionCreateResponseGAType,
    /**
     * Unique identifier for the session that looks like `sess_1234567890abcdef`.
     */
    "id": S.String,
    /**
     * The object type. Always `realtime.transcription_session`.
     */
    "object": S.String,
    /**
     * Expiration timestamp for the session, in seconds since epoch.
     */
    "expires_at": S.optionalWith(S.Int, { nullable: true }),
    /**
     * Additional fields to include in server outputs.
     * - `item.input_audio_transcription.logprobs`: Include logprobs for input audio transcription.
     */
    "include": S.optionalWith(S.Array(S.Literal("item.input_audio_transcription.logprobs")), { nullable: true }),
    /**
     * Configuration for input audio for the session.
     */
    "audio": S.optionalWith(
      S.Struct({
        "input": S.optionalWith(
          S.Struct({
            "format": S.optionalWith(RealtimeAudioFormats, { nullable: true }),
            /**
             * Configuration of the transcription model.
             */
            "transcription": S.optionalWith(AudioTranscription, { nullable: true }),
            /**
             * Configuration for input audio noise reduction.
             */
            "noise_reduction": S.optionalWith(
              S.Struct({
                "type": S.optionalWith(NoiseReductionType, { nullable: true })
              }),
              { nullable: true }
            ),
            /**
             * Configuration for turn detection. Can be set to `null` to turn off. Server
             * VAD means that the model will detect the start and end of speech based on
             * audio volume and respond at the end of user speech.
             */
            "turn_detection": S.optionalWith(
              S.Struct({
                /**
                 * Type of turn detection, only `server_vad` is currently supported.
                 */
                "type": S.optionalWith(S.String, { nullable: true }),
                /**
                 * Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A
                 * higher threshold will require louder audio to activate the model, and
                 * thus might perform better in noisy environments.
                 */
                "threshold": S.optionalWith(S.Number, { nullable: true }),
                /**
                 * Amount of audio to include before the VAD detected speech (in
                 * milliseconds). Defaults to 300ms.
                 */
                "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
                /**
                 * Duration of silence to detect speech stop (in milliseconds). Defaults
                 * to 500ms. With shorter values the model will respond more quickly,
                 * but may jump in on short pauses from the user.
                 */
                "silence_duration_ms": S.optionalWith(S.Int, { nullable: true })
              }),
              { nullable: true }
            )
          }),
          { nullable: true }
        )
      }),
      { nullable: true }
    )
  })
{}

/**
 * Response from creating a session and client secret for the Realtime API.
 */
export class RealtimeCreateClientSecretResponse
  extends S.Class<RealtimeCreateClientSecretResponse>("RealtimeCreateClientSecretResponse")({
    /**
     * The generated client secret value.
     */
    "value": S.String,
    /**
     * Expiration timestamp for the client secret, in seconds since epoch.
     */
    "expires_at": S.Int,
    /**
     * The session configuration for either a realtime or transcription session.
     */
    "session": S.Union(RealtimeSessionCreateResponseGA, RealtimeTranscriptionSessionCreateResponseGA)
  })
{}

/**
 * Default tracing mode for the session.
 */
export class RealtimeSessionCreateRequestTracingEnum extends S.Literal("auto") {}

export class RealtimeSessionCreateRequestMaxResponseOutputTokensEnum extends S.Literal("inf") {}

/**
 * A new Realtime session configuration, with an ephemeral key. Default TTL
 * for keys is one minute.
 */
export class RealtimeSessionCreateRequest
  extends S.Class<RealtimeSessionCreateRequest>("RealtimeSessionCreateRequest")({
    /**
     * Ephemeral key returned by the API.
     */
    "client_secret": S.Struct({
      /**
       * Ephemeral key usable in client environments to authenticate connections
       * to the Realtime API. Use this in client-side environments rather than
       * a standard API token, which should only be used server-side.
       */
      "value": S.String,
      /**
       * Timestamp for when the token expires. Currently, all tokens expire
       * after one minute.
       */
      "expires_at": S.Int
    }),
    /**
     * The default system instructions (i.e. system message) prepended to model calls. This field allows the client to guide the model on desired responses. The model can be instructed on response content and format, (e.g. "be extremely succinct", "act friendly", "here are examples of good responses") and on audio behavior (e.g. "talk quickly", "inject emotion into your voice", "laugh frequently"). The instructions are not guaranteed to be followed by the model, but they provide guidance to the model on the desired behavior.
     * Note that the server sets default instructions which will be used if this field is not set and are visible in the `session.created` event at the start of the session.
     */
    "instructions": S.optionalWith(S.String, { nullable: true }),
    /**
     * The voice the model uses to respond. Voice cannot be changed during the
     * session once the model has responded with audio at least once. Current
     * voice options are `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`,
     * `shimmer`, and `verse`.
     */
    "voice": S.optionalWith(VoiceIdsShared, { nullable: true }),
    /**
     * The format of input audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
     */
    "input_audio_format": S.optionalWith(S.String, { nullable: true }),
    /**
     * The format of output audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
     */
    "output_audio_format": S.optionalWith(S.String, { nullable: true }),
    /**
     * Configuration for input audio transcription, defaults to off and can be
     * set to `null` to turn off once on. Input audio transcription is not native
     * to the model, since the model consumes audio directly. Transcription runs
     * asynchronously and should be treated as rough guidance
     * rather than the representation understood by the model.
     */
    "input_audio_transcription": S.optionalWith(
      S.Struct({
        /**
         * The model to use for transcription.
         */
        "model": S.optionalWith(S.String, { nullable: true })
      }),
      { nullable: true }
    ),
    /**
     * The speed of the model's spoken response. 1.0 is the default speed. 0.25 is
     * the minimum speed. 1.5 is the maximum speed. This value can only be changed
     * in between model turns, not while a response is in progress.
     */
    "speed": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0.25), S.lessThanOrEqualTo(1.5)), {
      nullable: true,
      default: () => 1 as const
    }),
    /**
     * Configuration options for tracing. Set to null to disable tracing. Once
     * tracing is enabled for a session, the configuration cannot be modified.
     *
     * `auto` will create a trace for the session with default values for the
     * workflow name, group id, and metadata.
     */
    "tracing": S.optionalWith(
      S.Union(
        /**
         * Default tracing mode for the session.
         */
        RealtimeSessionCreateRequestTracingEnum,
        /**
         * Granular configuration for tracing.
         */
        S.Struct({
          /**
           * The name of the workflow to attach to this trace. This is used to
           * name the trace in the traces dashboard.
           */
          "workflow_name": S.optionalWith(S.String, { nullable: true }),
          /**
           * The group id to attach to this trace to enable filtering and
           * grouping in the traces dashboard.
           */
          "group_id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The arbitrary metadata to attach to this trace to enable
           * filtering in the traces dashboard.
           */
          "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
        })
      ),
      { nullable: true }
    ),
    /**
     * Configuration for turn detection. Can be set to `null` to turn off. Server
     * VAD means that the model will detect the start and end of speech based on
     * audio volume and respond at the end of user speech.
     */
    "turn_detection": S.optionalWith(
      S.Struct({
        /**
         * Type of turn detection, only `server_vad` is currently supported.
         */
        "type": S.optionalWith(S.String, { nullable: true }),
        /**
         * Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A
         * higher threshold will require louder audio to activate the model, and
         * thus might perform better in noisy environments.
         */
        "threshold": S.optionalWith(S.Number, { nullable: true }),
        /**
         * Amount of audio to include before the VAD detected speech (in
         * milliseconds). Defaults to 300ms.
         */
        "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
        /**
         * Duration of silence to detect speech stop (in milliseconds). Defaults
         * to 500ms. With shorter values the model will respond more quickly,
         * but may jump in on short pauses from the user.
         */
        "silence_duration_ms": S.optionalWith(S.Int, { nullable: true })
      }),
      { nullable: true }
    ),
    /**
     * Tools (functions) available to the model.
     */
    "tools": S.optionalWith(
      S.Array(S.Struct({
        /**
         * The type of the tool, i.e. `function`.
         */
        "type": S.optionalWith(S.Literal("function"), { nullable: true }),
        /**
         * The name of the function.
         */
        "name": S.optionalWith(S.String, { nullable: true }),
        /**
         * The description of the function, including guidance on when and how
         * to call it, and guidance about what to tell the user when calling
         * (if anything).
         */
        "description": S.optionalWith(S.String, { nullable: true }),
        /**
         * Parameters of the function in JSON Schema.
         */
        "parameters": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
      })),
      { nullable: true }
    ),
    /**
     * How the model chooses tools. Options are `auto`, `none`, `required`, or
     * specify a function.
     */
    "tool_choice": S.optionalWith(S.String, { nullable: true }),
    /**
     * Sampling temperature for the model, limited to [0.6, 1.2]. Defaults to 0.8.
     */
    "temperature": S.optionalWith(S.Number, { nullable: true }),
    /**
     * Maximum number of output tokens for a single assistant response,
     * inclusive of tool calls. Provide an integer between 1 and 4096 to
     * limit output tokens, or `inf` for the maximum available tokens for a
     * given model. Defaults to `inf`.
     */
    "max_response_output_tokens": S.optionalWith(
      S.Union(S.Int, RealtimeSessionCreateRequestMaxResponseOutputTokensEnum),
      { nullable: true }
    ),
    "truncation": S.optionalWith(RealtimeTruncation, { nullable: true }),
    "prompt": S.optionalWith(
      S.Struct({
        /**
         * The unique identifier of the prompt template to use.
         */
        "id": S.String,
        "version": S.optionalWith(S.String, { nullable: true }),
        "variables": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
      }),
      { nullable: true }
    )
  })
{}

/**
 * Default tracing mode for the session.
 */
export class RealtimeSessionCreateResponseTracingEnum extends S.Literal("auto") {}

export class RealtimeSessionCreateResponseMaxOutputTokensEnum extends S.Literal("inf") {}

/**
 * A Realtime session configuration object.
 */
export class RealtimeSessionCreateResponse
  extends S.Class<RealtimeSessionCreateResponse>("RealtimeSessionCreateResponse")({
    /**
     * Unique identifier for the session that looks like `sess_1234567890abcdef`.
     */
    "id": S.optionalWith(S.String, { nullable: true }),
    /**
     * The object type. Always `realtime.session`.
     */
    "object": S.optionalWith(S.String, { nullable: true }),
    /**
     * Expiration timestamp for the session, in seconds since epoch.
     */
    "expires_at": S.optionalWith(S.Int, { nullable: true }),
    /**
     * Additional fields to include in server outputs.
     * - `item.input_audio_transcription.logprobs`: Include logprobs for input audio transcription.
     */
    "include": S.optionalWith(S.Array(S.Literal("item.input_audio_transcription.logprobs")), { nullable: true }),
    /**
     * The Realtime model used for this session.
     */
    "model": S.optionalWith(S.String, { nullable: true }),
    /**
     * The default system instructions (i.e. system message) prepended to model
     * calls. This field allows the client to guide the model on desired
     * responses. The model can be instructed on response content and format,
     * (e.g. "be extremely succinct", "act friendly", "here are examples of good
     * responses") and on audio behavior (e.g. "talk quickly", "inject emotion
     * into your voice", "laugh frequently"). The instructions are not guaranteed
     * to be followed by the model, but they provide guidance to the model on the
     * desired behavior.
     *
     * Note that the server sets default instructions which will be used if this
     * field is not set and are visible in the `session.created` event at the
     * start of the session.
     */
    "instructions": S.optionalWith(S.String, { nullable: true }),
    /**
     * Configuration for input and output audio for the session.
     */
    "audio": S.optionalWith(
      S.Struct({
        "input": S.optionalWith(
          S.Struct({
            "format": S.optionalWith(RealtimeAudioFormats, { nullable: true }),
            /**
             * Configuration for input audio transcription.
             */
            "transcription": S.optionalWith(AudioTranscription, { nullable: true }),
            /**
             * Configuration for input audio noise reduction.
             */
            "noise_reduction": S.optionalWith(
              S.Struct({
                "type": S.optionalWith(NoiseReductionType, { nullable: true })
              }),
              { nullable: true }
            ),
            /**
             * Configuration for turn detection.
             */
            "turn_detection": S.optionalWith(
              S.Struct({
                /**
                 * Type of turn detection, only `server_vad` is currently supported.
                 */
                "type": S.optionalWith(S.String, { nullable: true }),
                "threshold": S.optionalWith(S.Number, { nullable: true }),
                "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
                "silence_duration_ms": S.optionalWith(S.Int, { nullable: true })
              }),
              { nullable: true }
            )
          }),
          { nullable: true }
        ),
        "output": S.optionalWith(
          S.Struct({
            "format": S.optionalWith(RealtimeAudioFormats, { nullable: true }),
            "voice": S.optionalWith(VoiceIdsShared, { nullable: true }),
            "speed": S.optionalWith(S.Number, { nullable: true })
          }),
          { nullable: true }
        )
      }),
      { nullable: true }
    ),
    /**
     * Configuration options for tracing. Set to null to disable tracing. Once
     * tracing is enabled for a session, the configuration cannot be modified.
     *
     * `auto` will create a trace for the session with default values for the
     * workflow name, group id, and metadata.
     */
    "tracing": S.optionalWith(
      S.Union(
        /**
         * Default tracing mode for the session.
         */
        RealtimeSessionCreateResponseTracingEnum,
        /**
         * Granular configuration for tracing.
         */
        S.Struct({
          /**
           * The name of the workflow to attach to this trace. This is used to
           * name the trace in the traces dashboard.
           */
          "workflow_name": S.optionalWith(S.String, { nullable: true }),
          /**
           * The group id to attach to this trace to enable filtering and
           * grouping in the traces dashboard.
           */
          "group_id": S.optionalWith(S.String, { nullable: true }),
          /**
           * The arbitrary metadata to attach to this trace to enable
           * filtering in the traces dashboard.
           */
          "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
        })
      ),
      { nullable: true }
    ),
    /**
     * Configuration for turn detection. Can be set to `null` to turn off. Server
     * VAD means that the model will detect the start and end of speech based on
     * audio volume and respond at the end of user speech.
     */
    "turn_detection": S.optionalWith(
      S.Struct({
        /**
         * Type of turn detection, only `server_vad` is currently supported.
         */
        "type": S.optionalWith(S.String, { nullable: true }),
        /**
         * Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A
         * higher threshold will require louder audio to activate the model, and
         * thus might perform better in noisy environments.
         */
        "threshold": S.optionalWith(S.Number, { nullable: true }),
        /**
         * Amount of audio to include before the VAD detected speech (in
         * milliseconds). Defaults to 300ms.
         */
        "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
        /**
         * Duration of silence to detect speech stop (in milliseconds). Defaults
         * to 500ms. With shorter values the model will respond more quickly,
         * but may jump in on short pauses from the user.
         */
        "silence_duration_ms": S.optionalWith(S.Int, { nullable: true })
      }),
      { nullable: true }
    ),
    /**
     * Tools (functions) available to the model.
     */
    "tools": S.optionalWith(S.Array(RealtimeFunctionTool), { nullable: true }),
    /**
     * How the model chooses tools. Options are `auto`, `none`, `required`, or
     * specify a function.
     */
    "tool_choice": S.optionalWith(S.String, { nullable: true }),
    /**
     * Maximum number of output tokens for a single assistant response,
     * inclusive of tool calls. Provide an integer between 1 and 4096 to
     * limit output tokens, or `inf` for the maximum available tokens for a
     * given model. Defaults to `inf`.
     */
    "max_output_tokens": S.optionalWith(S.Union(S.Int, RealtimeSessionCreateResponseMaxOutputTokensEnum), {
      nullable: true
    })
  })
{}

/**
 * Type of turn detection. Only `server_vad` is currently supported for transcription sessions.
 */
export class RealtimeTranscriptionSessionCreateRequestTurnDetectionType extends S.Literal("server_vad") {}

/**
 * The format of input audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
 * For `pcm16`, input audio must be 16-bit PCM at a 24kHz sample rate,
 * single channel (mono), and little-endian byte order.
 */
export class RealtimeTranscriptionSessionCreateRequestInputAudioFormat
  extends S.Literal("pcm16", "g711_ulaw", "g711_alaw")
{}

/**
 * Realtime transcription session object configuration.
 */
export class RealtimeTranscriptionSessionCreateRequest
  extends S.Class<RealtimeTranscriptionSessionCreateRequest>("RealtimeTranscriptionSessionCreateRequest")({
    /**
     * Configuration for turn detection. Can be set to `null` to turn off. Server VAD means that the model will detect the start and end of speech based on audio volume and respond at the end of user speech.
     */
    "turn_detection": S.optionalWith(
      S.Struct({
        /**
         * Type of turn detection. Only `server_vad` is currently supported for transcription sessions.
         */
        "type": S.optionalWith(RealtimeTranscriptionSessionCreateRequestTurnDetectionType, { nullable: true }),
        /**
         * Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A
         * higher threshold will require louder audio to activate the model, and
         * thus might perform better in noisy environments.
         */
        "threshold": S.optionalWith(S.Number, { nullable: true }),
        /**
         * Amount of audio to include before the VAD detected speech (in
         * milliseconds). Defaults to 300ms.
         */
        "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
        /**
         * Duration of silence to detect speech stop (in milliseconds). Defaults
         * to 500ms. With shorter values the model will respond more quickly,
         * but may jump in on short pauses from the user.
         */
        "silence_duration_ms": S.optionalWith(S.Int, { nullable: true })
      }),
      { nullable: true }
    ),
    /**
     * Configuration for input audio noise reduction. This can be set to `null` to turn off.
     * Noise reduction filters audio added to the input audio buffer before it is sent to VAD and the model.
     * Filtering the audio can improve VAD and turn detection accuracy (reducing false positives) and model performance by improving perception of the input audio.
     */
    "input_audio_noise_reduction": S.optionalWith(
      S.Struct({
        "type": S.optionalWith(NoiseReductionType, { nullable: true })
      }),
      { nullable: true }
    ),
    /**
     * The format of input audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
     * For `pcm16`, input audio must be 16-bit PCM at a 24kHz sample rate,
     * single channel (mono), and little-endian byte order.
     */
    "input_audio_format": S.optionalWith(RealtimeTranscriptionSessionCreateRequestInputAudioFormat, {
      nullable: true,
      default: () => "pcm16" as const
    }),
    /**
     * Configuration for input audio transcription. The client can optionally set the language and prompt for transcription, these offer additional guidance to the transcription service.
     */
    "input_audio_transcription": S.optionalWith(AudioTranscription, { nullable: true }),
    /**
     * The set of items to include in the transcription. Current available items are:
     * `item.input_audio_transcription.logprobs`
     */
    "include": S.optionalWith(S.Array(S.Literal("item.input_audio_transcription.logprobs")), { nullable: true })
  })
{}

/**
 * A new Realtime transcription session configuration.
 *
 * When a session is created on the server via REST API, the session object
 * also contains an ephemeral key. Default TTL for keys is 10 minutes. This
 * property is not present when a session is updated via the WebSocket API.
 */
export class RealtimeTranscriptionSessionCreateResponse
  extends S.Class<RealtimeTranscriptionSessionCreateResponse>("RealtimeTranscriptionSessionCreateResponse")({
    /**
     * Ephemeral key returned by the API. Only present when the session is
     * created on the server via REST API.
     */
    "client_secret": S.Struct({
      /**
       * Ephemeral key usable in client environments to authenticate connections
       * to the Realtime API. Use this in client-side environments rather than
       * a standard API token, which should only be used server-side.
       */
      "value": S.String,
      /**
       * Timestamp for when the token expires. Currently, all tokens expire
       * after one minute.
       */
      "expires_at": S.Int
    }),
    /**
     * The format of input audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
     */
    "input_audio_format": S.optionalWith(S.String, { nullable: true }),
    /**
     * Configuration of the transcription model.
     */
    "input_audio_transcription": S.optionalWith(AudioTranscription, { nullable: true }),
    /**
     * Configuration for turn detection. Can be set to `null` to turn off. Server
     * VAD means that the model will detect the start and end of speech based on
     * audio volume and respond at the end of user speech.
     */
    "turn_detection": S.optionalWith(
      S.Struct({
        /**
         * Type of turn detection, only `server_vad` is currently supported.
         */
        "type": S.optionalWith(S.String, { nullable: true }),
        /**
         * Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A
         * higher threshold will require louder audio to activate the model, and
         * thus might perform better in noisy environments.
         */
        "threshold": S.optionalWith(S.Number, { nullable: true }),
        /**
         * Amount of audio to include before the VAD detected speech (in
         * milliseconds). Defaults to 300ms.
         */
        "prefix_padding_ms": S.optionalWith(S.Int, { nullable: true }),
        /**
         * Duration of silence to detect speech stop (in milliseconds). Defaults
         * to 500ms. With shorter values the model will respond more quickly,
         * but may jump in on short pauses from the user.
         */
        "silence_duration_ms": S.optionalWith(S.Int, { nullable: true })
      }),
      { nullable: true }
    )
  })
{}

/**
 * Text, image, or file inputs to the model, used to generate a response.
 *
 * Learn more:
 * - [Text inputs and outputs](https://platform.openai.com/docs/guides/text)
 * - [Image inputs](https://platform.openai.com/docs/guides/images)
 * - [File inputs](https://platform.openai.com/docs/guides/pdf-files)
 * - [Conversation state](https://platform.openai.com/docs/guides/conversation-state)
 * - [Function calling](https://platform.openai.com/docs/guides/function-calling)
 */
export class InputParam extends S.Union(
  /**
   * A text input to the model, equivalent to a text input with the
   * `user` role.
   */
  S.String,
  /**
   * A list of one or many input items to the model, containing
   * different content types.
   */
  S.Array(InputItem)
) {}

export class ResponseStreamOptions extends S.Union(
  /**
   * Options for streaming responses. Only set this when you set `stream: true`.
   */
  S.Struct({
    /**
     * When true, stream obfuscation will be enabled. Stream obfuscation adds
     * random characters to an `obfuscation` field on streaming delta events to
     * normalize payload sizes as a mitigation to certain side-channel attacks.
     * These obfuscation fields are included by default, but add a small amount
     * of overhead to the data stream. You can set `include_obfuscation` to
     * false to optimize for bandwidth if you trust the network links between
     * your application and the OpenAI API.
     */
    "include_obfuscation": S.optionalWith(S.Boolean, { nullable: true })
  }),
  S.Null
) {}

/**
 * The conversation that this response belongs to.
 */
export class ConversationParam2 extends S.Class<ConversationParam2>("ConversationParam2")({
  /**
   * The unique ID of the conversation.
   */
  "id": S.String
}) {}

/**
 * The conversation that this response belongs to. Items from this conversation are prepended to `input_items` for this response request.
 * Input items and output items from this response are automatically added to this conversation after this response completes.
 */
export class ConversationParam extends S.Union(
  /**
   * The unique ID of the conversation.
   */
  S.String,
  ConversationParam2
) {}

export class ModelIdsResponsesEnum extends S.Literal(
  "o1-pro",
  "o1-pro-2025-03-19",
  "o3-pro",
  "o3-pro-2025-06-10",
  "o3-deep-research",
  "o3-deep-research-2025-06-26",
  "o4-mini-deep-research",
  "o4-mini-deep-research-2025-06-26",
  "computer-use-preview",
  "computer-use-preview-2025-03-11",
  "gpt-5-codex",
  "gpt-5-pro",
  "gpt-5-pro-2025-10-06"
) {}

export class ModelIdsResponses extends S.Union(ModelIdsShared, ModelIdsResponsesEnum) {}

/**
 * A summary of the reasoning performed by the model. This can be
 * useful for debugging and understanding the model's reasoning process.
 * One of `auto`, `concise`, or `detailed`.
 *
 * `concise` is only supported for `computer-use-preview` models.
 */
export class ReasoningSummaryEnum extends S.Literal("auto", "concise", "detailed") {}

/**
 * **Deprecated:** use `summary` instead.
 *
 * A summary of the reasoning performed by the model. This can be
 * useful for debugging and understanding the model's reasoning process.
 * One of `auto`, `concise`, or `detailed`.
 */
export class ReasoningGenerateSummaryEnum extends S.Literal("auto", "concise", "detailed") {}

/**
 * **gpt-5 and o-series models only**
 *
 * Configuration options for
 * [reasoning models](https://platform.openai.com/docs/guides/reasoning).
 */
export class Reasoning extends S.Class<Reasoning>("Reasoning")({
  "effort": S.optionalWith(ReasoningEffortEnum, { nullable: true }),
  "summary": S.optionalWith(ReasoningSummaryEnum, { nullable: true }),
  "generate_summary": S.optionalWith(ReasoningGenerateSummaryEnum, { nullable: true })
}) {}

/**
 * Configuration options for a text response from the model. Can be plain
 * text or structured JSON data. Learn more:
 * - [Text inputs and outputs](https://platform.openai.com/docs/guides/text)
 * - [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
 */
export class ResponseTextParam extends S.Class<ResponseTextParam>("ResponseTextParam")({
  "format": S.optionalWith(TextResponseFormatConfiguration, { nullable: true }),
  "verbosity": S.optionalWith(S.Literal("low", "medium", "high"), { nullable: true })
}) {}

/**
 * An array of tools the model may call while generating a response. You
 * can specify which tool to use by setting the `tool_choice` parameter.
 *
 * We support the following categories of tools:
 * - **Built-in tools**: Tools that are provided by OpenAI that extend the
 *   model's capabilities, like [web search](https://platform.openai.com/docs/guides/tools-web-search)
 *   or [file search](https://platform.openai.com/docs/guides/tools-file-search). Learn more about
 *   [built-in tools](https://platform.openai.com/docs/guides/tools).
 * - **MCP Tools**: Integrations with third-party systems via custom MCP servers
 *   or predefined connectors such as Google Drive and SharePoint. Learn more about
 *   [MCP Tools](https://platform.openai.com/docs/guides/tools-connectors-mcp).
 * - **Function calls (custom tools)**: Functions that are defined by you,
 *   enabling the model to call your own code with strongly typed arguments
 *   and outputs. Learn more about
 *   [function calling](https://platform.openai.com/docs/guides/function-calling). You can also use
 *   custom tools to call your own code.
 */
export class ToolsArray extends S.Array(Tool) {}

/**
 * Allowed tool configuration type. Always `allowed_tools`.
 */
export class ToolChoiceAllowedType extends S.Literal("allowed_tools") {}

/**
 * Constrains the tools available to the model to a pre-defined set.
 *
 * `auto` allows the model to pick from among the allowed tools and generate a
 * message.
 *
 * `required` requires the model to call one or more of the allowed tools.
 */
export class ToolChoiceAllowedMode extends S.Literal("auto", "required") {}

/**
 * Constrains the tools available to the model to a pre-defined set.
 */
export class ToolChoiceAllowed extends S.Class<ToolChoiceAllowed>("ToolChoiceAllowed")({
  /**
   * Allowed tool configuration type. Always `allowed_tools`.
   */
  "type": ToolChoiceAllowedType,
  /**
   * Constrains the tools available to the model to a pre-defined set.
   *
   * `auto` allows the model to pick from among the allowed tools and generate a
   * message.
   *
   * `required` requires the model to call one or more of the allowed tools.
   */
  "mode": ToolChoiceAllowedMode,
  /**
   * A list of tool definitions that the model should be allowed to call.
   *
   * For the Responses API, the list of tool definitions might look like:
   * ```json
   * [
   *   { "type": "function", "name": "get_weather" },
   *   { "type": "mcp", "server_label": "deepwiki" },
   *   { "type": "image_generation" }
   * ]
   * ```
   */
  "tools": S.Array(S.Record({ key: S.String, value: S.Unknown }))
}) {}

/**
 * The type of hosted tool the model should to use. Learn more about
 * [built-in tools](https://platform.openai.com/docs/guides/tools).
 *
 * Allowed values are:
 * - `file_search`
 * - `web_search_preview`
 * - `computer_use_preview`
 * - `code_interpreter`
 * - `image_generation`
 */
export class ToolChoiceTypesType extends S.Literal(
  "file_search",
  "web_search_preview",
  "computer_use_preview",
  "web_search_preview_2025_03_11",
  "image_generation",
  "code_interpreter"
) {}

/**
 * Indicates that the model should use a built-in tool to generate a response.
 * [Learn more about built-in tools](https://platform.openai.com/docs/guides/tools).
 */
export class ToolChoiceTypes extends S.Class<ToolChoiceTypes>("ToolChoiceTypes")({
  /**
   * The type of hosted tool the model should to use. Learn more about
   * [built-in tools](https://platform.openai.com/docs/guides/tools).
   *
   * Allowed values are:
   * - `file_search`
   * - `web_search_preview`
   * - `computer_use_preview`
   * - `code_interpreter`
   * - `image_generation`
   */
  "type": ToolChoiceTypesType
}) {}

/**
 * For custom tool calling, the type is always `custom`.
 */
export class ToolChoiceCustomType extends S.Literal("custom") {}

/**
 * Use this option to force the model to call a specific custom tool.
 */
export class ToolChoiceCustom extends S.Class<ToolChoiceCustom>("ToolChoiceCustom")({
  /**
   * For custom tool calling, the type is always `custom`.
   */
  "type": ToolChoiceCustomType,
  /**
   * The name of the custom tool to call.
   */
  "name": S.String
}) {}

/**
 * The tool to call. Always `apply_patch`.
 */
export class SpecificApplyPatchParamType extends S.Literal("apply_patch") {}

/**
 * Forces the model to call the apply_patch tool when executing a tool call.
 */
export class SpecificApplyPatchParam extends S.Class<SpecificApplyPatchParam>("SpecificApplyPatchParam")({
  /**
   * The tool to call. Always `apply_patch`.
   */
  "type": SpecificApplyPatchParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "apply_patch" as const))
}) {}

/**
 * The tool to call. Always `shell`.
 */
export class SpecificFunctionShellParamType extends S.Literal("shell") {}

/**
 * Forces the model to call the function shell tool when a tool call is required.
 */
export class SpecificFunctionShellParam extends S.Class<SpecificFunctionShellParam>("SpecificFunctionShellParam")({
  /**
   * The tool to call. Always `shell`.
   */
  "type": SpecificFunctionShellParamType.pipe(S.propertySignature, S.withConstructorDefault(() => "shell" as const))
}) {}

/**
 * How the model should select which tool (or tools) to use when generating
 * a response. See the `tools` parameter to see how to specify which tools
 * the model can call.
 */
export class ToolChoiceParam extends S.Union(
  ToolChoiceOptions,
  ToolChoiceAllowed,
  ToolChoiceTypes,
  ToolChoiceFunction,
  ToolChoiceMCP,
  ToolChoiceCustom,
  SpecificApplyPatchParam,
  SpecificFunctionShellParam
) {}

/**
 * The truncation strategy to use for the model response.
 * - `auto`: If the input to this Response exceeds
 *   the model's context window size, the model will truncate the
 *   response to fit the context window by dropping items from the beginning of the conversation.
 * - `disabled` (default): If the input size will exceed the context window
 *   size for a model, the request will fail with a 400 error.
 */
export class CreateResponseTruncationEnum extends S.Literal("auto", "disabled") {}

/**
 * The retention policy for the prompt cache. Set to `24h` to enable extended prompt caching, which keeps cached prefixes active for longer, up to a maximum of 24 hours. [Learn more](https://platform.openai.com/docs/guides/prompt-caching#prompt-cache-retention).
 */
export class CreateResponsePromptCacheRetentionEnum extends S.Literal("in-memory", "24h") {}

export class CreateResponse extends S.Class<CreateResponse>("CreateResponse")({
  "input": S.optionalWith(InputParam, { nullable: true }),
  "include": S.optionalWith(S.Array(IncludeEnum), { nullable: true }),
  "parallel_tool_calls": S.optionalWith(S.Boolean, { nullable: true }),
  "store": S.optionalWith(S.Boolean, { nullable: true }),
  "instructions": S.optionalWith(S.String, { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  "stream_options": S.optionalWith(
    S.Struct({
      /**
       * When true, stream obfuscation will be enabled. Stream obfuscation adds
       * random characters to an `obfuscation` field on streaming delta events to
       * normalize payload sizes as a mitigation to certain side-channel attacks.
       * These obfuscation fields are included by default, but add a small amount
       * of overhead to the data stream. You can set `include_obfuscation` to
       * false to optimize for bandwidth if you trust the network links between
       * your application and the OpenAI API.
       */
      "include_obfuscation": S.optionalWith(S.Boolean, { nullable: true })
    }),
    { nullable: true }
  ),
  "conversation": S.optionalWith(ConversationParam, { nullable: true }),
  "previous_response_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Model ID used to generate the response, like `gpt-4o` or `o3`. OpenAI
   * offers a wide range of models with different capabilities, performance
   * characteristics, and price points. Refer to the [model guide](https://platform.openai.com/docs/models)
   * to browse and compare available models.
   */
  "model": S.optionalWith(ModelIdsResponses, { nullable: true }),
  "reasoning": S.optionalWith(Reasoning, { nullable: true }),
  "background": S.optionalWith(S.Boolean, { nullable: true }),
  "max_output_tokens": S.optionalWith(S.Int, { nullable: true }),
  "max_tool_calls": S.optionalWith(S.Int, { nullable: true }),
  "text": S.optionalWith(ResponseTextParam, { nullable: true }),
  "tools": S.optionalWith(ToolsArray, { nullable: true }),
  "tool_choice": S.optionalWith(ToolChoiceParam, { nullable: true }),
  "prompt": S.optionalWith(
    S.Struct({
      /**
       * The unique identifier of the prompt template to use.
       */
      "id": S.String,
      "version": S.optionalWith(S.String, { nullable: true }),
      "variables": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
    }),
    { nullable: true }
  ),
  "truncation": S.optionalWith(CreateResponseTruncationEnum, { nullable: true }),
  "top_logprobs": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)), { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  /**
   * This field is being replaced by `safety_identifier` and `prompt_cache_key`. Use `prompt_cache_key` instead to maintain caching optimizations.
   * A stable identifier for your end-users.
   * Used to boost cache hit rates by better bucketing similar requests and  to help OpenAI detect and prevent abuse. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#safety-identifiers).
   */
  "user": S.optionalWith(S.String, { nullable: true }),
  /**
   * A stable identifier used to help detect users of your application that may be violating OpenAI's usage policies.
   * The IDs should be a string that uniquely identifies each user. We recommend hashing their username or email address, in order to avoid sending us any identifying information. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#safety-identifiers).
   */
  "safety_identifier": S.optionalWith(S.String, { nullable: true }),
  /**
   * Used by OpenAI to cache responses for similar requests to optimize your cache hit rates. Replaces the `user` field. [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
   */
  "prompt_cache_key": S.optionalWith(S.String, { nullable: true }),
  "service_tier": S.optionalWith(S.Literal("auto", "default", "flex", "scale", "priority"), { nullable: true }),
  "prompt_cache_retention": S.optionalWith(CreateResponsePromptCacheRetentionEnum, { nullable: true })
}) {}

/**
 * The object type of this resource - always set to `response`.
 */
export class ResponseObject extends S.Literal("response") {}

/**
 * The status of the response generation. One of `completed`, `failed`,
 * `in_progress`, `cancelled`, `queued`, or `incomplete`.
 */
export class ResponseStatus
  extends S.Literal("completed", "failed", "in_progress", "cancelled", "queued", "incomplete")
{}

/**
 * The error code for the response.
 */
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

export class ResponseError extends S.Union(
  /**
   * An error object returned when the model fails to generate a Response.
   */
  S.Struct({
    "code": ResponseErrorCode,
    /**
     * A human-readable description of the error.
     */
    "message": S.String
  }),
  S.Null
) {}

/**
 * The reason why the response is incomplete.
 */
export class ResponseIncompleteDetailsEnumReason extends S.Literal("max_output_tokens", "content_filter") {}

export class OutputItem extends S.Union(
  OutputMessage,
  FileSearchToolCall,
  FunctionToolCall,
  WebSearchToolCall,
  ComputerToolCall,
  ReasoningItem,
  ImageGenToolCall,
  CodeInterpreterToolCall,
  LocalShellToolCall,
  FunctionShellCall,
  FunctionShellCallOutput,
  ApplyPatchToolCall,
  ApplyPatchToolCallOutput,
  MCPToolCall,
  MCPListTools,
  MCPApprovalRequest,
  CustomToolCall
) {}

/**
 * Represents token usage details including input tokens, output tokens,
 * a breakdown of output tokens, and the total tokens used.
 */
export class ResponseUsage extends S.Class<ResponseUsage>("ResponseUsage")({
  /**
   * The number of input tokens.
   */
  "input_tokens": S.Int,
  /**
   * A detailed breakdown of the input tokens.
   */
  "input_tokens_details": S.Struct({
    /**
     * The number of tokens that were retrieved from the cache.
     * [More on prompt caching](https://platform.openai.com/docs/guides/prompt-caching).
     */
    "cached_tokens": S.Int
  }),
  /**
   * The number of output tokens.
   */
  "output_tokens": S.Int,
  /**
   * A detailed breakdown of the output tokens.
   */
  "output_tokens_details": S.Struct({
    /**
     * The number of reasoning tokens.
     */
    "reasoning_tokens": S.Int
  }),
  /**
   * The total number of tokens used.
   */
  "total_tokens": S.Int
}) {}

/**
 * The conversation that this response belongs to. Input items and output items from this response are automatically added to this conversation.
 */
export class Conversation2 extends S.Class<Conversation2>("Conversation2")({
  /**
   * The unique ID of the conversation.
   */
  "id": S.String
}) {}

/**
 * The truncation strategy to use for the model response.
 * - `auto`: If the input to this Response exceeds
 *   the model's context window size, the model will truncate the
 *   response to fit the context window by dropping items from the beginning of the conversation.
 * - `disabled` (default): If the input size will exceed the context window
 *   size for a model, the request will fail with a 400 error.
 */
export class ResponseTruncationEnum extends S.Literal("auto", "disabled") {}

/**
 * The retention policy for the prompt cache. Set to `24h` to enable extended prompt caching, which keeps cached prefixes active for longer, up to a maximum of 24 hours. [Learn more](https://platform.openai.com/docs/guides/prompt-caching#prompt-cache-retention).
 */
export class ResponsePromptCacheRetentionEnum extends S.Literal("in-memory", "24h") {}

export class Response extends S.Class<Response>("Response")({
  /**
   * Unique identifier for this Response.
   */
  "id": S.String,
  /**
   * The object type of this resource - always set to `response`.
   */
  "object": ResponseObject,
  /**
   * The status of the response generation. One of `completed`, `failed`,
   * `in_progress`, `cancelled`, `queued`, or `incomplete`.
   */
  "status": S.optionalWith(ResponseStatus, { nullable: true }),
  /**
   * Unix timestamp (in seconds) of when this Response was created.
   */
  "created_at": S.Number,
  "error": S.NullOr(S.Struct({
    "code": ResponseErrorCode,
    /**
     * A human-readable description of the error.
     */
    "message": S.String
  })),
  "incomplete_details": S.NullOr(S.Struct({
    /**
     * The reason why the response is incomplete.
     */
    "reason": S.optionalWith(S.Literal("max_output_tokens", "content_filter"), { nullable: true })
  })),
  /**
   * An array of content items generated by the model.
   *
   * - The length and order of items in the `output` array is dependent
   *   on the model's response.
   * - Rather than accessing the first item in the `output` array and
   *   assuming it's an `assistant` message with the content generated by
   *   the model, you might consider using the `output_text` property where
   *   supported in SDKs.
   */
  "output": S.Array(OutputItem),
  "instructions": S.NullOr(S.Union(
    /**
     * A text input to the model, equivalent to a text input with the
     * `developer` role.
     */
    S.String,
    /**
     * A list of one or many input items to the model, containing
     * different content types.
     */
    S.Array(InputItem)
  )),
  "output_text": S.optionalWith(S.String, { nullable: true }),
  "usage": S.optionalWith(ResponseUsage, { nullable: true }),
  /**
   * Whether to allow the model to run tool calls in parallel.
   */
  "parallel_tool_calls": S.Boolean.pipe(S.propertySignature, S.withConstructorDefault(() => true as const)),
  "conversation": S.optionalWith(Conversation2, { nullable: true }),
  "previous_response_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Model ID used to generate the response, like `gpt-4o` or `o3`. OpenAI
   * offers a wide range of models with different capabilities, performance
   * characteristics, and price points. Refer to the [model guide](https://platform.openai.com/docs/models)
   * to browse and compare available models.
   */
  "model": ModelIdsResponses,
  "reasoning": S.optionalWith(Reasoning, { nullable: true }),
  "background": S.optionalWith(S.Boolean, { nullable: true }),
  "max_output_tokens": S.optionalWith(S.Int, { nullable: true }),
  "max_tool_calls": S.optionalWith(S.Int, { nullable: true }),
  "text": S.optionalWith(ResponseTextParam, { nullable: true }),
  "tools": ToolsArray,
  "tool_choice": ToolChoiceParam,
  "prompt": S.optionalWith(
    S.Struct({
      /**
       * The unique identifier of the prompt template to use.
       */
      "id": S.String,
      "version": S.optionalWith(S.String, { nullable: true }),
      "variables": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
    }),
    { nullable: true }
  ),
  "truncation": S.optionalWith(ResponseTruncationEnum, { nullable: true }),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  "top_logprobs": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)), { nullable: true }),
  "temperature": S.NullOr(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2))),
  "top_p": S.NullOr(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1))),
  /**
   * This field is being replaced by `safety_identifier` and `prompt_cache_key`. Use `prompt_cache_key` instead to maintain caching optimizations.
   * A stable identifier for your end-users.
   * Used to boost cache hit rates by better bucketing similar requests and  to help OpenAI detect and prevent abuse. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#safety-identifiers).
   */
  "user": S.optionalWith(S.String, { nullable: true }),
  /**
   * A stable identifier used to help detect users of your application that may be violating OpenAI's usage policies.
   * The IDs should be a string that uniquely identifies each user. We recommend hashing their username or email address, in order to avoid sending us any identifying information. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#safety-identifiers).
   */
  "safety_identifier": S.optionalWith(S.String, { nullable: true }),
  /**
   * Used by OpenAI to cache responses for similar requests to optimize your cache hit rates. Replaces the `user` field. [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
   */
  "prompt_cache_key": S.optionalWith(S.String, { nullable: true }),
  "service_tier": S.optionalWith(S.Literal("auto", "default", "flex", "scale", "priority"), { nullable: true }),
  "prompt_cache_retention": S.optionalWith(ResponsePromptCacheRetentionEnum, { nullable: true })
}) {}

export class GetResponseParams extends S.Struct({
  "include": S.optionalWith(S.Array(IncludeEnum), { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  "starting_after": S.optionalWith(S.Int, { nullable: true }),
  "include_obfuscation": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListInputItemsParamsOrder extends S.Literal("asc", "desc") {}

export class ListInputItemsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListInputItemsParamsOrder, { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "include": S.optionalWith(S.Array(IncludeEnum), { nullable: true })
}) {}

/**
 * The type of the message input. Always set to `message`.
 */
export class InputMessageResourceType extends S.Literal("message") {}

/**
 * The role of the message input. One of `user`, `system`, or `developer`.
 */
export class InputMessageResourceRole extends S.Literal("user", "system", "developer") {}

/**
 * The status of item. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when items are returned via API.
 */
export class InputMessageResourceStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A message input to the model with a role indicating instruction following
 * hierarchy. Instructions given with the `developer` or `system` role take
 * precedence over instructions given with the `user` role.
 */
export class InputMessageResource extends S.Class<InputMessageResource>("InputMessageResource")({
  /**
   * The unique ID of the message input.
   */
  "id": S.String,
  /**
   * The type of the message input. Always set to `message`.
   */
  "type": S.optionalWith(InputMessageResourceType, { nullable: true }),
  /**
   * The role of the message input. One of `user`, `system`, or `developer`.
   */
  "role": InputMessageResourceRole,
  /**
   * The status of item. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when items are returned via API.
   */
  "status": S.optionalWith(InputMessageResourceStatus, { nullable: true }),
  "content": InputMessageContentList
}) {}

/**
 * Content item used to generate a response.
 */
export class ItemResource extends S.Union(
  InputMessageResource,
  OutputMessage,
  FileSearchToolCall,
  ComputerToolCall,
  ComputerToolCallOutputResource,
  WebSearchToolCall,
  FunctionToolCallResource,
  FunctionToolCallOutputResource,
  ImageGenToolCall,
  CodeInterpreterToolCall,
  LocalShellToolCall,
  LocalShellToolCallOutput,
  FunctionShellCall,
  FunctionShellCallOutput,
  ApplyPatchToolCall,
  ApplyPatchToolCallOutput,
  MCPListTools,
  MCPApprovalRequest,
  MCPApprovalResponseResource,
  MCPToolCall
) {}

/**
 * A list of Response items.
 */
export class ResponseItemList extends S.Class<ResponseItemList>("ResponseItemList")({
  /**
   * The type of object returned, must be `list`.
   */
  "object": S.Literal("list"),
  /**
   * A list of items used to generate this response.
   */
  "data": S.Array(ItemResource),
  /**
   * Whether there are more items available.
   */
  "has_more": S.Boolean,
  /**
   * The ID of the first item in the list.
   */
  "first_id": S.String,
  /**
   * The ID of the last item in the list.
   */
  "last_id": S.String
}) {}

/**
 * The role of the entity that is creating the message. Allowed values include:
 * - `user`: Indicates the message is sent by an actual user and should be used in most cases to represent user-generated messages.
 * - `assistant`: Indicates the message is generated by the assistant. Use this value to insert messages from the assistant into the conversation.
 */
export class CreateMessageRequestRole extends S.Literal("user", "assistant") {}

/**
 * Always `image_file`.
 */
export class MessageContentImageFileObjectType extends S.Literal("image_file") {}

/**
 * Specifies the detail level of the image if specified by the user. `low` uses fewer tokens, you can opt in to high resolution using `high`.
 */
export class MessageContentImageFileObjectImageFileDetail extends S.Literal("auto", "low", "high") {}

/**
 * References an image [File](https://platform.openai.com/docs/api-reference/files) in the content of a message.
 */
export class MessageContentImageFileObject
  extends S.Class<MessageContentImageFileObject>("MessageContentImageFileObject")({
    /**
     * Always `image_file`.
     */
    "type": MessageContentImageFileObjectType,
    "image_file": S.Struct({
      /**
       * The [File](https://platform.openai.com/docs/api-reference/files) ID of the image in the message content. Set `purpose="vision"` when uploading the File if you need to later display the file content.
       */
      "file_id": S.String,
      /**
       * Specifies the detail level of the image if specified by the user. `low` uses fewer tokens, you can opt in to high resolution using `high`.
       */
      "detail": S.optionalWith(MessageContentImageFileObjectImageFileDetail, {
        nullable: true,
        default: () => "auto" as const
      })
    })
  })
{}

/**
 * The type of the content part.
 */
export class MessageContentImageUrlObjectType extends S.Literal("image_url") {}

/**
 * Specifies the detail level of the image. `low` uses fewer tokens, you can opt in to high resolution using `high`. Default value is `auto`
 */
export class MessageContentImageUrlObjectImageUrlDetail extends S.Literal("auto", "low", "high") {}

/**
 * References an image URL in the content of a message.
 */
export class MessageContentImageUrlObject
  extends S.Class<MessageContentImageUrlObject>("MessageContentImageUrlObject")({
    /**
     * The type of the content part.
     */
    "type": MessageContentImageUrlObjectType,
    "image_url": S.Struct({
      /**
       * The external URL of the image, must be a supported image types: jpeg, jpg, png, gif, webp.
       */
      "url": S.String,
      /**
       * Specifies the detail level of the image. `low` uses fewer tokens, you can opt in to high resolution using `high`. Default value is `auto`
       */
      "detail": S.optionalWith(MessageContentImageUrlObjectImageUrlDetail, {
        nullable: true,
        default: () => "auto" as const
      })
    })
  })
{}

/**
 * Always `text`.
 */
export class MessageRequestContentTextObjectType extends S.Literal("text") {}

/**
 * The text content that is part of a message.
 */
export class MessageRequestContentTextObject
  extends S.Class<MessageRequestContentTextObject>("MessageRequestContentTextObject")({
    /**
     * Always `text`.
     */
    "type": MessageRequestContentTextObjectType,
    /**
     * Text content to be sent to the model
     */
    "text": S.String
  })
{}

/**
 * The type of tool being defined: `file_search`
 */
export class AssistantToolsFileSearchTypeOnlyType extends S.Literal("file_search") {}

export class AssistantToolsFileSearchTypeOnly
  extends S.Class<AssistantToolsFileSearchTypeOnly>("AssistantToolsFileSearchTypeOnly")({
    /**
     * The type of tool being defined: `file_search`
     */
    "type": AssistantToolsFileSearchTypeOnlyType
  })
{}

export class CreateMessageRequest extends S.Class<CreateMessageRequest>("CreateMessageRequest")({
  /**
   * The role of the entity that is creating the message. Allowed values include:
   * - `user`: Indicates the message is sent by an actual user and should be used in most cases to represent user-generated messages.
   * - `assistant`: Indicates the message is generated by the assistant. Use this value to insert messages from the assistant into the conversation.
   */
  "role": CreateMessageRequestRole,
  "content": S.Union(
    /**
     * The text contents of the message.
     */
    S.String,
    /**
     * An array of content parts with a defined type, each can be of type `text` or images can be passed with `image_url` or `image_file`. Image types are only supported on [Vision-compatible models](https://platform.openai.com/docs/models).
     */
    S.NonEmptyArray(
      S.Union(MessageContentImageFileObject, MessageContentImageUrlObject, MessageRequestContentTextObject)
    ).pipe(S.minItems(1))
  ),
  "attachments": S.optionalWith(
    S.Array(S.Struct({
      /**
       * The ID of the file to attach to the message.
       */
      "file_id": S.optionalWith(S.String, { nullable: true }),
      /**
       * The tools to add this file to.
       */
      "tools": S.optionalWith(S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearchTypeOnly)), {
        nullable: true
      })
    })),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * Options to create a new thread. If no thread is provided when running a
 * request, an empty thread will be created.
 */
export class CreateThreadRequest extends S.Class<CreateThreadRequest>("CreateThreadRequest")({
  /**
   * A list of [messages](https://platform.openai.com/docs/api-reference/messages) to start the thread with.
   */
  "messages": S.optionalWith(S.Array(CreateMessageRequest), { nullable: true }),
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * A list of [file](https://platform.openai.com/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
           */
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          /**
           * The [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) attached to this thread. There can be a maximum of 1 vector store attached to the thread.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true }),
          /**
           * A helper to create a [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) with file_ids and attach it to this thread. There can be a maximum of 1 vector store attached to the thread.
           */
          "vector_stores": S.optionalWith(
            S.Array(S.Struct({
              /**
               * A list of [file](https://platform.openai.com/docs/api-reference/files) IDs to add to the vector store. There can be a maximum of 10000 files in a vector store.
               */
              "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(10000)), { nullable: true }),
              /**
               * The chunking strategy used to chunk the file(s). If not set, will use the `auto` strategy.
               */
              "chunking_strategy": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
              "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
            })).pipe(S.maxItems(1)),
            { nullable: true }
          )
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * The object type, which is always `thread`.
 */
export class ThreadObjectObject extends S.Literal("thread") {}

/**
 * Represents a thread that contains [messages](https://platform.openai.com/docs/api-reference/messages).
 */
export class ThreadObject extends S.Class<ThreadObject>("ThreadObject")({
  /**
   * The identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The object type, which is always `thread`.
   */
  "object": ThreadObjectObject,
  /**
   * The Unix timestamp (in seconds) for when the thread was created.
   */
  "created_at": S.Int,
  "tool_resources": S.NullOr(S.Struct({
    "code_interpreter": S.optionalWith(
      S.Struct({
        /**
         * A list of [file](https://platform.openai.com/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
         */
        "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
          nullable: true,
          default: () => [] as const
        })
      }),
      { nullable: true }
    ),
    "file_search": S.optionalWith(
      S.Struct({
        /**
         * The [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) attached to this thread. There can be a maximum of 1 vector store attached to the thread.
         */
        "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
      }),
      { nullable: true }
    )
  })),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown }))
}) {}

export class CreateThreadAndRunRequestModelEnum extends S.Literal(
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5-2025-08-07",
  "gpt-5-mini-2025-08-07",
  "gpt-5-nano-2025-08-07",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4.1-2025-04-14",
  "gpt-4.1-mini-2025-04-14",
  "gpt-4.1-nano-2025-04-14",
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

/**
 * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
 */
export class CreateThreadAndRunRequestTruncationStrategyEnumType extends S.Literal("auto", "last_messages") {}

/**
 * Controls for how a thread will be truncated prior to the run. Use this to control the initial context window of the run.
 */
export class CreateThreadAndRunRequestTruncationStrategy extends S.Struct({
  /**
   * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
   */
  "type": S.Literal("auto", "last_messages"),
  "last_messages": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

/**
 * `none` means the model will not call any tools and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools before responding to the user.
 */
export class CreateThreadAndRunRequestToolChoiceEnum extends S.Literal("none", "auto", "required") {}

/**
 * The type of the tool. If type is `function`, the function name must be set
 */
export class AssistantsNamedToolChoiceType extends S.Literal("function", "code_interpreter", "file_search") {}

/**
 * Specifies a tool the model should use. Use to force the model to call a specific tool.
 */
export class AssistantsNamedToolChoice extends S.Class<AssistantsNamedToolChoice>("AssistantsNamedToolChoice")({
  /**
   * The type of the tool. If type is `function`, the function name must be set
   */
  "type": AssistantsNamedToolChoiceType,
  "function": S.optionalWith(
    S.Struct({
      /**
       * The name of the function to call.
       */
      "name": S.String
    }),
    { nullable: true }
  )
}) {}

/**
 * Controls which (if any) tool is called by the model.
 * `none` means the model will not call any tools and instead generates a message.
 * `auto` is the default value and means the model can pick between generating a message or calling one or more tools.
 * `required` means the model must call one or more tools before responding to the user.
 * Specifying a particular tool like `{"type": "file_search"}` or `{"type": "function", "function": {"name": "my_function"}}` forces the model to call that tool.
 */
export class CreateThreadAndRunRequestToolChoice extends S.Union(
  /**
   * `none` means the model will not call any tools and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools before responding to the user.
   */
  CreateThreadAndRunRequestToolChoiceEnum,
  AssistantsNamedToolChoice
) {}

export class CreateThreadAndRunRequest extends S.Class<CreateThreadAndRunRequest>("CreateThreadAndRunRequest")({
  /**
   * The ID of the [assistant](https://platform.openai.com/docs/api-reference/assistants) to use to execute this run.
   */
  "assistant_id": S.String,
  "thread": S.optionalWith(CreateThreadRequest, { nullable: true }),
  /**
   * The ID of the [Model](https://platform.openai.com/docs/api-reference/models) to be used to execute this run. If a value is provided here, it will override the model associated with the assistant. If not, the model associated with the assistant will be used.
   */
  "model": S.optionalWith(S.Union(S.String, CreateThreadAndRunRequestModelEnum), { nullable: true }),
  /**
   * Override the default system message of the assistant. This is useful for modifying the behavior on a per-run basis.
   */
  "instructions": S.optionalWith(S.String, { nullable: true }),
  /**
   * Override the tools the assistant can use for this run. This is useful for modifying the behavior on a per-run basis.
   */
  "tools": S.optionalWith(S.Array(AssistantTool).pipe(S.maxItems(20)), { nullable: true }),
  /**
   * A set of resources that are used by the assistant's tools. The resources are specific to the type of tool. For example, the `code_interpreter` tool requires a list of file IDs, while the `file_search` tool requires a list of vector store IDs.
   */
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * A list of [file](https://platform.openai.com/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
           */
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          /**
           * The ID of the [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) attached to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
   */
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.
   *
   * We generally recommend altering this or temperature but not both.
   */
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * If `true`, returns a stream of events that happen during the Run as server-sent events, terminating when the Run enters a terminal state with a `data: [DONE]` message.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * The maximum number of prompt tokens that may be used over the course of the run. The run will make a best effort to use only the number of prompt tokens specified, across multiple turns of the run. If the run exceeds the number of prompt tokens specified, the run will end with status `incomplete`. See `incomplete_details` for more info.
   */
  "max_prompt_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(256)), { nullable: true }),
  /**
   * The maximum number of completion tokens that may be used over the course of the run. The run will make a best effort to use only the number of completion tokens specified, across multiple turns of the run. If the run exceeds the number of completion tokens specified, the run will end with status `incomplete`. See `incomplete_details` for more info.
   */
  "max_completion_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(256)), { nullable: true }),
  "truncation_strategy": S.optionalWith(CreateThreadAndRunRequestTruncationStrategy, { nullable: true }),
  "tool_choice": S.optionalWith(CreateThreadAndRunRequestToolChoice, { nullable: true }),
  "parallel_tool_calls": S.optionalWith(ParallelToolCalls, { nullable: true, default: () => true as const }),
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

/**
 * The object type, which is always `thread.run`.
 */
export class RunObjectObject extends S.Literal("thread.run") {}

/**
 * The status of the run, which can be either `queued`, `in_progress`, `requires_action`, `cancelling`, `cancelled`, `failed`, `completed`, `incomplete`, or `expired`.
 */
export class RunStatus extends S.Literal(
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

/**
 * For now, this is always `submit_tool_outputs`.
 */
export class RunObjectRequiredActionType extends S.Literal("submit_tool_outputs") {}

/**
 * The type of tool call the output is required for. For now, this is always `function`.
 */
export class RunToolCallObjectType extends S.Literal("function") {}

/**
 * Tool call objects
 */
export class RunToolCallObject extends S.Class<RunToolCallObject>("RunToolCallObject")({
  /**
   * The ID of the tool call. This ID must be referenced when you submit the tool outputs in using the [Submit tool outputs to run](https://platform.openai.com/docs/api-reference/runs/submitToolOutputs) endpoint.
   */
  "id": S.String,
  /**
   * The type of tool call the output is required for. For now, this is always `function`.
   */
  "type": RunToolCallObjectType,
  /**
   * The function definition.
   */
  "function": S.Struct({
    /**
     * The name of the function.
     */
    "name": S.String,
    /**
     * The arguments that the model expects you to pass to the function.
     */
    "arguments": S.String
  })
}) {}

/**
 * One of `server_error`, `rate_limit_exceeded`, or `invalid_prompt`.
 */
export class RunObjectLastErrorCode extends S.Literal("server_error", "rate_limit_exceeded", "invalid_prompt") {}

/**
 * The reason why the run is incomplete. This will point to which specific token limit was reached over the course of the run.
 */
export class RunObjectIncompleteDetailsReason extends S.Literal("max_completion_tokens", "max_prompt_tokens") {}

export class RunCompletionUsage extends S.Union(
  /**
   * Usage statistics related to the run. This value will be `null` if the run is not in a terminal state (i.e. `in_progress`, `queued`, etc.).
   */
  S.Struct({
    /**
     * Number of completion tokens used over the course of the run.
     */
    "completion_tokens": S.Int,
    /**
     * Number of prompt tokens used over the course of the run.
     */
    "prompt_tokens": S.Int,
    /**
     * Total number of tokens used (prompt + completion).
     */
    "total_tokens": S.Int
  }),
  S.Null
) {}

/**
 * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
 */
export class RunObjectTruncationStrategyEnumType extends S.Literal("auto", "last_messages") {}

/**
 * Controls for how a thread will be truncated prior to the run. Use this to control the initial context window of the run.
 */
export class RunObjectTruncationStrategy extends S.Struct({
  /**
   * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
   */
  "type": S.Literal("auto", "last_messages"),
  "last_messages": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

/**
 * `none` means the model will not call any tools and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools before responding to the user.
 */
export class RunObjectToolChoiceEnum extends S.Literal("none", "auto", "required") {}

/**
 * Controls which (if any) tool is called by the model.
 * `none` means the model will not call any tools and instead generates a message.
 * `auto` is the default value and means the model can pick between generating a message or calling one or more tools.
 * `required` means the model must call one or more tools before responding to the user.
 * Specifying a particular tool like `{"type": "file_search"}` or `{"type": "function", "function": {"name": "my_function"}}` forces the model to call that tool.
 */
export class RunObjectToolChoice extends S.Union(
  /**
   * `none` means the model will not call any tools and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools before responding to the user.
   */
  RunObjectToolChoiceEnum,
  AssistantsNamedToolChoice
) {}

/**
 * Represents an execution run on a [thread](https://platform.openai.com/docs/api-reference/threads).
 */
export class RunObject extends S.Class<RunObject>("RunObject")({
  /**
   * The identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The object type, which is always `thread.run`.
   */
  "object": RunObjectObject,
  /**
   * The Unix timestamp (in seconds) for when the run was created.
   */
  "created_at": S.Int,
  /**
   * The ID of the [thread](https://platform.openai.com/docs/api-reference/threads) that was executed on as a part of this run.
   */
  "thread_id": S.String,
  /**
   * The ID of the [assistant](https://platform.openai.com/docs/api-reference/assistants) used for execution of this run.
   */
  "assistant_id": S.String,
  "status": RunStatus,
  /**
   * Details on the action required to continue the run. Will be `null` if no action is required.
   */
  "required_action": S.NullOr(S.Struct({
    /**
     * For now, this is always `submit_tool_outputs`.
     */
    "type": RunObjectRequiredActionType,
    /**
     * Details on the tool outputs needed for this run to continue.
     */
    "submit_tool_outputs": S.Struct({
      /**
       * A list of the relevant tool calls.
       */
      "tool_calls": S.Array(RunToolCallObject)
    })
  })),
  /**
   * The last error associated with this run. Will be `null` if there are no errors.
   */
  "last_error": S.NullOr(S.Struct({
    /**
     * One of `server_error`, `rate_limit_exceeded`, or `invalid_prompt`.
     */
    "code": RunObjectLastErrorCode,
    /**
     * A human-readable description of the error.
     */
    "message": S.String
  })),
  /**
   * The Unix timestamp (in seconds) for when the run will expire.
   */
  "expires_at": S.NullOr(S.Int),
  /**
   * The Unix timestamp (in seconds) for when the run was started.
   */
  "started_at": S.NullOr(S.Int),
  /**
   * The Unix timestamp (in seconds) for when the run was cancelled.
   */
  "cancelled_at": S.NullOr(S.Int),
  /**
   * The Unix timestamp (in seconds) for when the run failed.
   */
  "failed_at": S.NullOr(S.Int),
  /**
   * The Unix timestamp (in seconds) for when the run was completed.
   */
  "completed_at": S.NullOr(S.Int),
  /**
   * Details on why the run is incomplete. Will be `null` if the run is not incomplete.
   */
  "incomplete_details": S.NullOr(S.Struct({
    /**
     * The reason why the run is incomplete. This will point to which specific token limit was reached over the course of the run.
     */
    "reason": S.optionalWith(RunObjectIncompleteDetailsReason, { nullable: true })
  })),
  /**
   * The model that the [assistant](https://platform.openai.com/docs/api-reference/assistants) used for this run.
   */
  "model": S.String,
  /**
   * The instructions that the [assistant](https://platform.openai.com/docs/api-reference/assistants) used for this run.
   */
  "instructions": S.String,
  /**
   * The list of tools that the [assistant](https://platform.openai.com/docs/api-reference/assistants) used for this run.
   */
  "tools": S.Array(AssistantTool).pipe(S.maxItems(20)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => [] as const)
  ),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  "usage": S.NullOr(S.Struct({
    /**
     * Number of completion tokens used over the course of the run.
     */
    "completion_tokens": S.Int,
    /**
     * Number of prompt tokens used over the course of the run.
     */
    "prompt_tokens": S.Int,
    /**
     * Total number of tokens used (prompt + completion).
     */
    "total_tokens": S.Int
  })),
  /**
   * The sampling temperature used for this run. If not set, defaults to 1.
   */
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  /**
   * The nucleus sampling value used for this run. If not set, defaults to 1.
   */
  "top_p": S.optionalWith(S.Number, { nullable: true }),
  /**
   * The maximum number of prompt tokens specified to have been used over the course of the run.
   */
  "max_prompt_tokens": S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(256))),
  /**
   * The maximum number of completion tokens specified to have been used over the course of the run.
   */
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
          /**
           * A list of [file](https://platform.openai.com/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
           */
          "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(20)), {
            nullable: true,
            default: () => [] as const
          })
        }),
        { nullable: true }
      ),
      "file_search": S.optionalWith(
        S.Struct({
          /**
           * The [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) attached to this thread. There can be a maximum of 1 vector store attached to the thread.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
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

/**
 * The object type, which is always `thread.message`.
 */
export class MessageObjectObject extends S.Literal("thread.message") {}

/**
 * The status of the message, which can be either `in_progress`, `incomplete`, or `completed`.
 */
export class MessageObjectStatus extends S.Literal("in_progress", "incomplete", "completed") {}

/**
 * The reason the message is incomplete.
 */
export class MessageObjectIncompleteDetailsEnumReason
  extends S.Literal("content_filter", "max_tokens", "run_cancelled", "run_expired", "run_failed")
{}

/**
 * The entity that produced the message. One of `user` or `assistant`.
 */
export class MessageObjectRole extends S.Literal("user", "assistant") {}

/**
 * Always `text`.
 */
export class MessageContentTextObjectType extends S.Literal("text") {}

/**
 * Always `file_citation`.
 */
export class MessageContentTextAnnotationsFileCitationObjectType extends S.Literal("file_citation") {}

/**
 * A citation within the message that points to a specific quote from a specific File associated with the assistant or the message. Generated when the assistant uses the "file_search" tool to search files.
 */
export class MessageContentTextAnnotationsFileCitationObject
  extends S.Class<MessageContentTextAnnotationsFileCitationObject>("MessageContentTextAnnotationsFileCitationObject")({
    /**
     * Always `file_citation`.
     */
    "type": MessageContentTextAnnotationsFileCitationObjectType,
    /**
     * The text in the message content that needs to be replaced.
     */
    "text": S.String,
    "file_citation": S.Struct({
      /**
       * The ID of the specific File the citation is from.
       */
      "file_id": S.String
    }),
    "start_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "end_index": S.Int.pipe(S.greaterThanOrEqualTo(0))
  })
{}

/**
 * Always `file_path`.
 */
export class MessageContentTextAnnotationsFilePathObjectType extends S.Literal("file_path") {}

/**
 * A URL for the file that's generated when the assistant used the `code_interpreter` tool to generate a file.
 */
export class MessageContentTextAnnotationsFilePathObject
  extends S.Class<MessageContentTextAnnotationsFilePathObject>("MessageContentTextAnnotationsFilePathObject")({
    /**
     * Always `file_path`.
     */
    "type": MessageContentTextAnnotationsFilePathObjectType,
    /**
     * The text in the message content that needs to be replaced.
     */
    "text": S.String,
    "file_path": S.Struct({
      /**
       * The ID of the file that was generated.
       */
      "file_id": S.String
    }),
    "start_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "end_index": S.Int.pipe(S.greaterThanOrEqualTo(0))
  })
{}

export class TextAnnotation
  extends S.Union(MessageContentTextAnnotationsFileCitationObject, MessageContentTextAnnotationsFilePathObject)
{}

/**
 * The text content that is part of a message.
 */
export class MessageContentTextObject extends S.Class<MessageContentTextObject>("MessageContentTextObject")({
  /**
   * Always `text`.
   */
  "type": MessageContentTextObjectType,
  "text": S.Struct({
    /**
     * The data that makes up the text.
     */
    "value": S.String,
    "annotations": S.Array(TextAnnotation)
  })
}) {}

/**
 * Always `refusal`.
 */
export class MessageContentRefusalObjectType extends S.Literal("refusal") {}

/**
 * The refusal content generated by the assistant.
 */
export class MessageContentRefusalObject extends S.Class<MessageContentRefusalObject>("MessageContentRefusalObject")({
  /**
   * Always `refusal`.
   */
  "type": MessageContentRefusalObjectType,
  "refusal": S.String
}) {}

export class MessageContent extends S.Union(
  MessageContentImageFileObject,
  MessageContentImageUrlObject,
  MessageContentTextObject,
  MessageContentRefusalObject
) {}

/**
 * Represents a message within a [thread](https://platform.openai.com/docs/api-reference/threads).
 */
export class MessageObject extends S.Class<MessageObject>("MessageObject")({
  /**
   * The identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The object type, which is always `thread.message`.
   */
  "object": MessageObjectObject,
  /**
   * The Unix timestamp (in seconds) for when the message was created.
   */
  "created_at": S.Int,
  /**
   * The [thread](https://platform.openai.com/docs/api-reference/threads) ID that this message belongs to.
   */
  "thread_id": S.String,
  /**
   * The status of the message, which can be either `in_progress`, `incomplete`, or `completed`.
   */
  "status": MessageObjectStatus,
  "incomplete_details": S.NullOr(S.Struct({
    /**
     * The reason the message is incomplete.
     */
    "reason": S.Literal("content_filter", "max_tokens", "run_cancelled", "run_expired", "run_failed")
  })),
  "completed_at": S.NullOr(S.Int),
  "incomplete_at": S.NullOr(S.Int),
  /**
   * The entity that produced the message. One of `user` or `assistant`.
   */
  "role": MessageObjectRole,
  /**
   * The content of the message in array of text and/or images.
   */
  "content": S.Array(MessageContent),
  "assistant_id": S.NullOr(S.String),
  "run_id": S.NullOr(S.String),
  "attachments": S.NullOr(S.Array(S.Struct({
    /**
     * The ID of the file to attach to the message.
     */
    "file_id": S.optionalWith(S.String, { nullable: true }),
    /**
     * The tools to add this file to.
     */
    "tools": S.optionalWith(S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearchTypeOnly)), { nullable: true })
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

/**
 * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
 */
export class CreateRunRequestTruncationStrategyEnumType extends S.Literal("auto", "last_messages") {}

/**
 * Controls for how a thread will be truncated prior to the run. Use this to control the initial context window of the run.
 */
export class CreateRunRequestTruncationStrategy extends S.Struct({
  /**
   * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
   */
  "type": S.Literal("auto", "last_messages"),
  "last_messages": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

/**
 * `none` means the model will not call any tools and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools before responding to the user.
 */
export class CreateRunRequestToolChoiceEnum extends S.Literal("none", "auto", "required") {}

/**
 * Controls which (if any) tool is called by the model.
 * `none` means the model will not call any tools and instead generates a message.
 * `auto` is the default value and means the model can pick between generating a message or calling one or more tools.
 * `required` means the model must call one or more tools before responding to the user.
 * Specifying a particular tool like `{"type": "file_search"}` or `{"type": "function", "function": {"name": "my_function"}}` forces the model to call that tool.
 */
export class CreateRunRequestToolChoice extends S.Union(
  /**
   * `none` means the model will not call any tools and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools before responding to the user.
   */
  CreateRunRequestToolChoiceEnum,
  AssistantsNamedToolChoice
) {}

export class CreateRunRequest extends S.Class<CreateRunRequest>("CreateRunRequest")({
  /**
   * The ID of the [assistant](https://platform.openai.com/docs/api-reference/assistants) to use to execute this run.
   */
  "assistant_id": S.String,
  /**
   * The ID of the [Model](https://platform.openai.com/docs/api-reference/models) to be used to execute this run. If a value is provided here, it will override the model associated with the assistant. If not, the model associated with the assistant will be used.
   */
  "model": S.optionalWith(S.Union(S.String, AssistantSupportedModels), { nullable: true }),
  "reasoning_effort": S.optionalWith(S.Literal("none", "minimal", "low", "medium", "high"), { nullable: true }),
  /**
   * Overrides the [instructions](https://platform.openai.com/docs/api-reference/assistants/createAssistant) of the assistant. This is useful for modifying the behavior on a per-run basis.
   */
  "instructions": S.optionalWith(S.String, { nullable: true }),
  /**
   * Appends additional instructions at the end of the instructions for the run. This is useful for modifying the behavior on a per-run basis without overriding other instructions.
   */
  "additional_instructions": S.optionalWith(S.String, { nullable: true }),
  /**
   * Adds additional messages to the thread before creating the run.
   */
  "additional_messages": S.optionalWith(S.Array(CreateMessageRequest), { nullable: true }),
  /**
   * Override the tools the assistant can use for this run. This is useful for modifying the behavior on a per-run basis.
   */
  "tools": S.optionalWith(S.Array(AssistantTool).pipe(S.maxItems(20)), { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
   */
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.
   *
   * We generally recommend altering this or temperature but not both.
   */
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * If `true`, returns a stream of events that happen during the Run as server-sent events, terminating when the Run enters a terminal state with a `data: [DONE]` message.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * The maximum number of prompt tokens that may be used over the course of the run. The run will make a best effort to use only the number of prompt tokens specified, across multiple turns of the run. If the run exceeds the number of prompt tokens specified, the run will end with status `incomplete`. See `incomplete_details` for more info.
   */
  "max_prompt_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(256)), { nullable: true }),
  /**
   * The maximum number of completion tokens that may be used over the course of the run. The run will make a best effort to use only the number of completion tokens specified, across multiple turns of the run. If the run exceeds the number of completion tokens specified, the run will end with status `incomplete`. See `incomplete_details` for more info.
   */
  "max_completion_tokens": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(256)), { nullable: true }),
  "truncation_strategy": S.optionalWith(CreateRunRequestTruncationStrategy, { nullable: true }),
  "tool_choice": S.optionalWith(CreateRunRequestToolChoice, { nullable: true }),
  "parallel_tool_calls": S.optionalWith(ParallelToolCalls, { nullable: true, default: () => true as const }),
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

export class ModifyRunRequest extends S.Class<ModifyRunRequest>("ModifyRunRequest")({
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
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

/**
 * The object type, which is always `thread.run.step`.
 */
export class RunStepObjectObject extends S.Literal("thread.run.step") {}

/**
 * The type of run step, which can be either `message_creation` or `tool_calls`.
 */
export class RunStepObjectType extends S.Literal("message_creation", "tool_calls") {}

/**
 * The status of the run step, which can be either `in_progress`, `cancelled`, `failed`, `completed`, or `expired`.
 */
export class RunStepObjectStatus extends S.Literal("in_progress", "cancelled", "failed", "completed", "expired") {}

/**
 * Always `message_creation`.
 */
export class RunStepDetailsMessageCreationObjectType extends S.Literal("message_creation") {}

/**
 * Details of the message creation by the run step.
 */
export class RunStepDetailsMessageCreationObject
  extends S.Class<RunStepDetailsMessageCreationObject>("RunStepDetailsMessageCreationObject")({
    /**
     * Always `message_creation`.
     */
    "type": RunStepDetailsMessageCreationObjectType,
    "message_creation": S.Struct({
      /**
       * The ID of the message that was created by this run step.
       */
      "message_id": S.String
    })
  })
{}

/**
 * Always `tool_calls`.
 */
export class RunStepDetailsToolCallsObjectType extends S.Literal("tool_calls") {}

/**
 * The type of tool call. This is always going to be `code_interpreter` for this type of tool call.
 */
export class RunStepDetailsToolCallsCodeObjectType extends S.Literal("code_interpreter") {}

/**
 * Always `logs`.
 */
export class RunStepDetailsToolCallsCodeOutputLogsObjectType extends S.Literal("logs") {}

/**
 * Text output from the Code Interpreter tool call as part of a run step.
 */
export class RunStepDetailsToolCallsCodeOutputLogsObject
  extends S.Class<RunStepDetailsToolCallsCodeOutputLogsObject>("RunStepDetailsToolCallsCodeOutputLogsObject")({
    /**
     * Always `logs`.
     */
    "type": RunStepDetailsToolCallsCodeOutputLogsObjectType,
    /**
     * The text output from the Code Interpreter tool call.
     */
    "logs": S.String
  })
{}

/**
 * Always `image`.
 */
export class RunStepDetailsToolCallsCodeOutputImageObjectType extends S.Literal("image") {}

export class RunStepDetailsToolCallsCodeOutputImageObject
  extends S.Class<RunStepDetailsToolCallsCodeOutputImageObject>("RunStepDetailsToolCallsCodeOutputImageObject")({
    /**
     * Always `image`.
     */
    "type": RunStepDetailsToolCallsCodeOutputImageObjectType,
    "image": S.Struct({
      /**
       * The [file](https://platform.openai.com/docs/api-reference/files) ID of the image.
       */
      "file_id": S.String
    })
  })
{}

/**
 * Details of the Code Interpreter tool call the run step was involved in.
 */
export class RunStepDetailsToolCallsCodeObject
  extends S.Class<RunStepDetailsToolCallsCodeObject>("RunStepDetailsToolCallsCodeObject")({
    /**
     * The ID of the tool call.
     */
    "id": S.String,
    /**
     * The type of tool call. This is always going to be `code_interpreter` for this type of tool call.
     */
    "type": RunStepDetailsToolCallsCodeObjectType,
    /**
     * The Code Interpreter tool call definition.
     */
    "code_interpreter": S.Struct({
      /**
       * The input to the Code Interpreter tool call.
       */
      "input": S.String,
      /**
       * The outputs from the Code Interpreter tool call. Code Interpreter can output one or more items, including text (`logs`) or images (`image`). Each of these are represented by a different object type.
       */
      "outputs": S.Array(S.Record({ key: S.String, value: S.Unknown }))
    })
  })
{}

/**
 * The type of tool call. This is always going to be `file_search` for this type of tool call.
 */
export class RunStepDetailsToolCallsFileSearchObjectType extends S.Literal("file_search") {}

/**
 * The ranking options for the file search.
 */
export class RunStepDetailsToolCallsFileSearchRankingOptionsObject
  extends S.Class<RunStepDetailsToolCallsFileSearchRankingOptionsObject>(
    "RunStepDetailsToolCallsFileSearchRankingOptionsObject"
  )({
    "ranker": FileSearchRanker,
    /**
     * The score threshold for the file search. All values must be a floating point number between 0 and 1.
     */
    "score_threshold": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1))
  })
{}

/**
 * A result instance of the file search.
 */
export class RunStepDetailsToolCallsFileSearchResultObject
  extends S.Class<RunStepDetailsToolCallsFileSearchResultObject>("RunStepDetailsToolCallsFileSearchResultObject")({
    /**
     * The ID of the file that result was found in.
     */
    "file_id": S.String,
    /**
     * The name of the file that result was found in.
     */
    "file_name": S.String,
    /**
     * The score of the result. All values must be a floating point number between 0 and 1.
     */
    "score": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)),
    /**
     * The content of the result that was found. The content is only included if requested via the include query parameter.
     */
    "content": S.optionalWith(
      S.Array(S.Struct({
        /**
         * The type of the content.
         */
        "type": S.optionalWith(S.Literal("text"), { nullable: true }),
        /**
         * The text content of the file.
         */
        "text": S.optionalWith(S.String, { nullable: true })
      })),
      { nullable: true }
    )
  })
{}

export class RunStepDetailsToolCallsFileSearchObject
  extends S.Class<RunStepDetailsToolCallsFileSearchObject>("RunStepDetailsToolCallsFileSearchObject")({
    /**
     * The ID of the tool call object.
     */
    "id": S.String,
    /**
     * The type of tool call. This is always going to be `file_search` for this type of tool call.
     */
    "type": RunStepDetailsToolCallsFileSearchObjectType,
    /**
     * For now, this is always going to be an empty object.
     */
    "file_search": S.Struct({
      "ranking_options": S.optionalWith(RunStepDetailsToolCallsFileSearchRankingOptionsObject, { nullable: true }),
      /**
       * The results of the file search.
       */
      "results": S.optionalWith(S.Array(RunStepDetailsToolCallsFileSearchResultObject), { nullable: true })
    })
  })
{}

/**
 * The type of tool call. This is always going to be `function` for this type of tool call.
 */
export class RunStepDetailsToolCallsFunctionObjectType extends S.Literal("function") {}

export class RunStepDetailsToolCallsFunctionObject
  extends S.Class<RunStepDetailsToolCallsFunctionObject>("RunStepDetailsToolCallsFunctionObject")({
    /**
     * The ID of the tool call object.
     */
    "id": S.String,
    /**
     * The type of tool call. This is always going to be `function` for this type of tool call.
     */
    "type": RunStepDetailsToolCallsFunctionObjectType,
    /**
     * The definition of the function that was called.
     */
    "function": S.Struct({
      /**
       * The name of the function.
       */
      "name": S.String,
      /**
       * The arguments passed to the function.
       */
      "arguments": S.String,
      "output": S.NullOr(S.String)
    })
  })
{}

export class RunStepDetailsToolCall extends S.Union(
  RunStepDetailsToolCallsCodeObject,
  RunStepDetailsToolCallsFileSearchObject,
  RunStepDetailsToolCallsFunctionObject
) {}

/**
 * Details of the tool call.
 */
export class RunStepDetailsToolCallsObject
  extends S.Class<RunStepDetailsToolCallsObject>("RunStepDetailsToolCallsObject")({
    /**
     * Always `tool_calls`.
     */
    "type": RunStepDetailsToolCallsObjectType,
    /**
     * An array of tool calls the run step was involved in. These can be associated with one of three types of tools: `code_interpreter`, `file_search`, or `function`.
     */
    "tool_calls": S.Array(RunStepDetailsToolCall)
  })
{}

/**
 * One of `server_error` or `rate_limit_exceeded`.
 */
export class RunStepObjectLastErrorEnumCode extends S.Literal("server_error", "rate_limit_exceeded") {}

export class RunStepCompletionUsage extends S.Union(
  /**
   * Usage statistics related to the run step. This value will be `null` while the run step's status is `in_progress`.
   */
  S.Struct({
    /**
     * Number of completion tokens used over the course of the run step.
     */
    "completion_tokens": S.Int,
    /**
     * Number of prompt tokens used over the course of the run step.
     */
    "prompt_tokens": S.Int,
    /**
     * Total number of tokens used (prompt + completion).
     */
    "total_tokens": S.Int
  }),
  S.Null
) {}

/**
 * Represents a step in execution of a run.
 */
export class RunStepObject extends S.Class<RunStepObject>("RunStepObject")({
  /**
   * The identifier of the run step, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The object type, which is always `thread.run.step`.
   */
  "object": RunStepObjectObject,
  /**
   * The Unix timestamp (in seconds) for when the run step was created.
   */
  "created_at": S.Int,
  /**
   * The ID of the [assistant](https://platform.openai.com/docs/api-reference/assistants) associated with the run step.
   */
  "assistant_id": S.String,
  /**
   * The ID of the [thread](https://platform.openai.com/docs/api-reference/threads) that was run.
   */
  "thread_id": S.String,
  /**
   * The ID of the [run](https://platform.openai.com/docs/api-reference/runs) that this run step is a part of.
   */
  "run_id": S.String,
  /**
   * The type of run step, which can be either `message_creation` or `tool_calls`.
   */
  "type": RunStepObjectType,
  /**
   * The status of the run step, which can be either `in_progress`, `cancelled`, `failed`, `completed`, or `expired`.
   */
  "status": RunStepObjectStatus,
  /**
   * The details of the run step.
   */
  "step_details": S.Record({ key: S.String, value: S.Unknown }),
  "last_error": S.NullOr(S.Struct({
    /**
     * One of `server_error` or `rate_limit_exceeded`.
     */
    "code": S.Literal("server_error", "rate_limit_exceeded"),
    /**
     * A human-readable description of the error.
     */
    "message": S.String
  })),
  "expired_at": S.NullOr(S.Int),
  "cancelled_at": S.NullOr(S.Int),
  "failed_at": S.NullOr(S.Int),
  "completed_at": S.NullOr(S.Int),
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  "usage": S.NullOr(S.Struct({
    /**
     * Number of completion tokens used over the course of the run step.
     */
    "completion_tokens": S.Int,
    /**
     * Number of prompt tokens used over the course of the run step.
     */
    "prompt_tokens": S.Int,
    /**
     * Total number of tokens used (prompt + completion).
     */
    "total_tokens": S.Int
  }))
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
  /**
   * A list of tools for which the outputs are being submitted.
   */
  "tool_outputs": S.Array(S.Struct({
    /**
     * The ID of the tool call in the `required_action` object within the run object the output is being submitted for.
     */
    "tool_call_id": S.optionalWith(S.String, { nullable: true }),
    /**
     * The output of the tool call to be submitted to continue the run.
     */
    "output": S.optionalWith(S.String, { nullable: true })
  })),
  "stream": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * The intended purpose of the uploaded file.
 *
 * See the [documentation on File purposes](https://platform.openai.com/docs/api-reference/files/create#files-create-purpose).
 */
export class CreateUploadRequestPurpose extends S.Literal("assistants", "batch", "fine-tune", "vision") {}

export class CreateUploadRequest extends S.Class<CreateUploadRequest>("CreateUploadRequest")({
  /**
   * The name of the file to upload.
   */
  "filename": S.String,
  /**
   * The intended purpose of the uploaded file.
   *
   * See the [documentation on File purposes](https://platform.openai.com/docs/api-reference/files/create#files-create-purpose).
   */
  "purpose": CreateUploadRequestPurpose,
  /**
   * The number of bytes in the file you are uploading.
   */
  "bytes": S.Int,
  /**
   * The MIME type of the file.
   *
   * This must fall within the supported MIME types for your file purpose. See the supported MIME types for assistants and vision.
   */
  "mime_type": S.String,
  "expires_after": S.optionalWith(FileExpirationAfter, { nullable: true })
}) {}

/**
 * The status of the Upload.
 */
export class UploadStatus extends S.Literal("pending", "completed", "cancelled", "expired") {}

/**
 * The object type, which is always "upload".
 */
export class UploadObject extends S.Literal("upload") {}

/**
 * The object type, which is always `file`.
 */
export class UploadFileEnumObject extends S.Literal("file") {}

/**
 * The intended purpose of the file. Supported values are `assistants`, `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results`, `vision`, and `user_data`.
 */
export class UploadFileEnumPurpose extends S.Literal(
  "assistants",
  "assistants_output",
  "batch",
  "batch_output",
  "fine-tune",
  "fine-tune-results",
  "vision",
  "user_data"
) {}

/**
 * Deprecated. The current status of the file, which can be either `uploaded`, `processed`, or `error`.
 */
export class UploadFileEnumStatus extends S.Literal("uploaded", "processed", "error") {}

/**
 * The ready File object after the Upload is completed.
 */
export class UploadFile extends S.Struct({
  /**
   * The file identifier, which can be referenced in the API endpoints.
   */
  "id": S.String,
  /**
   * The size of the file, in bytes.
   */
  "bytes": S.Int,
  /**
   * The Unix timestamp (in seconds) for when the file was created.
   */
  "created_at": S.Int,
  /**
   * The Unix timestamp (in seconds) for when the file will expire.
   */
  "expires_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The name of the file.
   */
  "filename": S.String,
  /**
   * The object type, which is always `file`.
   */
  "object": S.Literal("file"),
  /**
   * The intended purpose of the file. Supported values are `assistants`, `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results`, `vision`, and `user_data`.
   */
  "purpose": S.Literal(
    "assistants",
    "assistants_output",
    "batch",
    "batch_output",
    "fine-tune",
    "fine-tune-results",
    "vision",
    "user_data"
  ),
  /**
   * Deprecated. The current status of the file, which can be either `uploaded`, `processed`, or `error`.
   */
  "status": S.Literal("uploaded", "processed", "error"),
  /**
   * Deprecated. For details on why a fine-tuning training file failed validation, see the `error` field on `fine_tuning.job`.
   */
  "status_details": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The Upload object can accept byte chunks in the form of Parts.
 */
export class Upload extends S.Class<Upload>("Upload")({
  /**
   * The Upload unique identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The Unix timestamp (in seconds) for when the Upload was created.
   */
  "created_at": S.Int,
  /**
   * The name of the file to be uploaded.
   */
  "filename": S.String,
  /**
   * The intended number of bytes to be uploaded.
   */
  "bytes": S.Int,
  /**
   * The intended purpose of the file. [Please refer here](https://platform.openai.com/docs/api-reference/files/object#files/object-purpose) for acceptable values.
   */
  "purpose": S.String,
  /**
   * The status of the Upload.
   */
  "status": UploadStatus,
  /**
   * The Unix timestamp (in seconds) for when the Upload will expire.
   */
  "expires_at": S.Int,
  /**
   * The object type, which is always "upload".
   */
  "object": UploadObject,
  "file": S.optionalWith(UploadFile, { nullable: true })
}) {}

export class CompleteUploadRequest extends S.Class<CompleteUploadRequest>("CompleteUploadRequest")({
  /**
   * The ordered list of Part IDs.
   */
  "part_ids": S.Array(S.String),
  /**
   * The optional md5 checksum for the file contents to verify if the bytes uploaded matches what you expect.
   */
  "md5": S.optionalWith(S.String, { nullable: true })
}) {}

export class AddUploadPartRequest extends S.Class<AddUploadPartRequest>("AddUploadPartRequest")({
  /**
   * The chunk of bytes for this Part.
   */
  "data": S.instanceOf(globalThis.Blob)
}) {}

/**
 * The object type, which is always `upload.part`.
 */
export class UploadPartObject extends S.Literal("upload.part") {}

/**
 * The upload Part represents a chunk of bytes we can add to an Upload object.
 */
export class UploadPart extends S.Class<UploadPart>("UploadPart")({
  /**
   * The upload Part unique identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The Unix timestamp (in seconds) for when the Part was created.
   */
  "created_at": S.Int,
  /**
   * The ID of the Upload object that this Part was added to.
   */
  "upload_id": S.String,
  /**
   * The object type, which is always `upload.part`.
   */
  "object": UploadPartObject
}) {}

export class ListVectorStoresParamsOrder extends S.Literal("asc", "desc") {}

export class ListVectorStoresParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListVectorStoresParamsOrder, { nullable: true, default: () => "desc" as const }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always `vector_store`.
 */
export class VectorStoreObjectObject extends S.Literal("vector_store") {}

/**
 * The status of the vector store, which can be either `expired`, `in_progress`, or `completed`. A status of `completed` indicates that the vector store is ready for use.
 */
export class VectorStoreObjectStatus extends S.Literal("expired", "in_progress", "completed") {}

/**
 * Anchor timestamp after which the expiration policy applies. Supported anchors: `last_active_at`.
 */
export class VectorStoreExpirationAfterAnchor extends S.Literal("last_active_at") {}

/**
 * The expiration policy for a vector store.
 */
export class VectorStoreExpirationAfter extends S.Class<VectorStoreExpirationAfter>("VectorStoreExpirationAfter")({
  /**
   * Anchor timestamp after which the expiration policy applies. Supported anchors: `last_active_at`.
   */
  "anchor": VectorStoreExpirationAfterAnchor,
  /**
   * The number of days after the anchor time that the vector store will expire.
   */
  "days": S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(365))
}) {}

/**
 * A vector store is a collection of processed files can be used by the `file_search` tool.
 */
export class VectorStoreObject extends S.Class<VectorStoreObject>("VectorStoreObject")({
  /**
   * The identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The object type, which is always `vector_store`.
   */
  "object": VectorStoreObjectObject,
  /**
   * The Unix timestamp (in seconds) for when the vector store was created.
   */
  "created_at": S.Int,
  /**
   * The name of the vector store.
   */
  "name": S.String,
  /**
   * The total number of bytes used by the files in the vector store.
   */
  "usage_bytes": S.Int,
  "file_counts": S.Struct({
    /**
     * The number of files that are currently being processed.
     */
    "in_progress": S.Int,
    /**
     * The number of files that have been successfully processed.
     */
    "completed": S.Int,
    /**
     * The number of files that have failed to process.
     */
    "failed": S.Int,
    /**
     * The number of files that were cancelled.
     */
    "cancelled": S.Int,
    /**
     * The total number of files.
     */
    "total": S.Int
  }),
  /**
   * The status of the vector store, which can be either `expired`, `in_progress`, or `completed`. A status of `completed` indicates that the vector store is ready for use.
   */
  "status": VectorStoreObjectStatus,
  "expires_after": S.optionalWith(VectorStoreExpirationAfter, { nullable: true }),
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

/**
 * Always `auto`.
 */
export class AutoChunkingStrategyRequestParamType extends S.Literal("auto") {}

/**
 * The default strategy. This strategy currently uses a `max_chunk_size_tokens` of `800` and `chunk_overlap_tokens` of `400`.
 */
export class AutoChunkingStrategyRequestParam
  extends S.Class<AutoChunkingStrategyRequestParam>("AutoChunkingStrategyRequestParam")({
    /**
     * Always `auto`.
     */
    "type": AutoChunkingStrategyRequestParamType
  })
{}

/**
 * Always `static`.
 */
export class StaticChunkingStrategyRequestParamType extends S.Literal("static") {}

export class StaticChunkingStrategy extends S.Class<StaticChunkingStrategy>("StaticChunkingStrategy")({
  /**
   * The maximum number of tokens in each chunk. The default value is `800`. The minimum value is `100` and the maximum value is `4096`.
   */
  "max_chunk_size_tokens": S.Int.pipe(S.greaterThanOrEqualTo(100), S.lessThanOrEqualTo(4096)),
  /**
   * The number of tokens that overlap between chunks. The default value is `400`.
   *
   * Note that the overlap must not exceed half of `max_chunk_size_tokens`.
   */
  "chunk_overlap_tokens": S.Int
}) {}

/**
 * Customize your own chunking strategy by setting chunk size and chunk overlap.
 */
export class StaticChunkingStrategyRequestParam
  extends S.Class<StaticChunkingStrategyRequestParam>("StaticChunkingStrategyRequestParam")({
    /**
     * Always `static`.
     */
    "type": StaticChunkingStrategyRequestParamType,
    "static": StaticChunkingStrategy
  })
{}

/**
 * The chunking strategy used to chunk the file(s). If not set, will use the `auto` strategy. Only applicable if `file_ids` is non-empty.
 */
export class ChunkingStrategyRequestParam extends S.Record({ key: S.String, value: S.Unknown }) {}

export class CreateVectorStoreRequest extends S.Class<CreateVectorStoreRequest>("CreateVectorStoreRequest")({
  /**
   * A list of [File](https://platform.openai.com/docs/api-reference/files) IDs that the vector store should use. Useful for tools like `file_search` that can access files.
   */
  "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(500)), { nullable: true }),
  /**
   * The name of the vector store.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * A description for the vector store. Can be used to describe the vector store's purpose.
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  "expires_after": S.optionalWith(VectorStoreExpirationAfter, { nullable: true }),
  "chunking_strategy": S.optionalWith(ChunkingStrategyRequestParam, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * Anchor timestamp after which the expiration policy applies. Supported anchors: `last_active_at`.
 */
export class UpdateVectorStoreRequestExpiresAfterEnumAnchor extends S.Literal("last_active_at") {}

/**
 * The expiration policy for a vector store.
 */
export class UpdateVectorStoreRequestExpiresAfter extends S.Struct({
  /**
   * Anchor timestamp after which the expiration policy applies. Supported anchors: `last_active_at`.
   */
  "anchor": S.Literal("last_active_at"),
  /**
   * The number of days after the anchor time that the vector store will expire.
   */
  "days": S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(365))
}) {}

export class UpdateVectorStoreRequest extends S.Class<UpdateVectorStoreRequest>("UpdateVectorStoreRequest")({
  /**
   * The name of the vector store.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  "expires_after": S.optionalWith(UpdateVectorStoreRequestExpiresAfter, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class DeleteVectorStoreResponseObject extends S.Literal("vector_store.deleted") {}

export class DeleteVectorStoreResponse extends S.Class<DeleteVectorStoreResponse>("DeleteVectorStoreResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": DeleteVectorStoreResponseObject
}) {}

export class CreateVectorStoreFileRequest
  extends S.Class<CreateVectorStoreFileRequest>("CreateVectorStoreFileRequest")({
    /**
     * A [File](https://platform.openai.com/docs/api-reference/files) ID that the vector store should use. Useful for tools like `file_search` that can access files.
     */
    "file_id": S.String,
    "chunking_strategy": S.optionalWith(ChunkingStrategyRequestParam, { nullable: true }),
    "attributes": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

export class CreateVectorStoreFileBatchRequest
  extends S.Class<CreateVectorStoreFileBatchRequest>("CreateVectorStoreFileBatchRequest")({
    /**
     * A list of [File](https://platform.openai.com/docs/api-reference/files) IDs that the vector store should use. Useful for tools like `file_search` that can access files.  If `attributes` or `chunking_strategy` are provided, they will be  applied to all files in the batch. Mutually exclusive with `files`.
     */
    "file_ids": S.optionalWith(S.NonEmptyArray(S.String).pipe(S.minItems(1), S.maxItems(500)), { nullable: true }),
    /**
     * A list of objects that each include a `file_id` plus optional `attributes` or `chunking_strategy`. Use this when you need to override metadata for specific files. The global `attributes` or `chunking_strategy` will be ignored and must be specified for each file. Mutually exclusive with `file_ids`.
     */
    "files": S.optionalWith(S.NonEmptyArray(CreateVectorStoreFileRequest).pipe(S.minItems(1), S.maxItems(500)), {
      nullable: true
    }),
    "chunking_strategy": S.optionalWith(ChunkingStrategyRequestParam, { nullable: true }),
    "attributes": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
  })
{}

/**
 * The object type, which is always `vector_store.file_batch`.
 */
export class VectorStoreFileBatchObjectObject extends S.Literal("vector_store.files_batch") {}

/**
 * The status of the vector store files batch, which can be either `in_progress`, `completed`, `cancelled` or `failed`.
 */
export class VectorStoreFileBatchObjectStatus extends S.Literal("in_progress", "completed", "cancelled", "failed") {}

/**
 * A batch of files attached to a vector store.
 */
export class VectorStoreFileBatchObject extends S.Class<VectorStoreFileBatchObject>("VectorStoreFileBatchObject")({
  /**
   * The identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The object type, which is always `vector_store.file_batch`.
   */
  "object": VectorStoreFileBatchObjectObject,
  /**
   * The Unix timestamp (in seconds) for when the vector store files batch was created.
   */
  "created_at": S.Int,
  /**
   * The ID of the [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) that the [File](https://platform.openai.com/docs/api-reference/files) is attached to.
   */
  "vector_store_id": S.String,
  /**
   * The status of the vector store files batch, which can be either `in_progress`, `completed`, `cancelled` or `failed`.
   */
  "status": VectorStoreFileBatchObjectStatus,
  "file_counts": S.Struct({
    /**
     * The number of files that are currently being processed.
     */
    "in_progress": S.Int,
    /**
     * The number of files that have been processed.
     */
    "completed": S.Int,
    /**
     * The number of files that have failed to process.
     */
    "failed": S.Int,
    /**
     * The number of files that where cancelled.
     */
    "cancelled": S.Int,
    /**
     * The total number of files.
     */
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

/**
 * The object type, which is always `vector_store.file`.
 */
export class VectorStoreFileObjectObject extends S.Literal("vector_store.file") {}

/**
 * The status of the vector store file, which can be either `in_progress`, `completed`, `cancelled`, or `failed`. The status `completed` indicates that the vector store file is ready for use.
 */
export class VectorStoreFileObjectStatus extends S.Literal("in_progress", "completed", "cancelled", "failed") {}

/**
 * One of `server_error`, `unsupported_file`, or `invalid_file`.
 */
export class VectorStoreFileObjectLastErrorEnumCode
  extends S.Literal("server_error", "unsupported_file", "invalid_file")
{}

/**
 * Always `static`.
 */
export class StaticChunkingStrategyResponseParamType extends S.Literal("static") {}

export class StaticChunkingStrategyResponseParam
  extends S.Class<StaticChunkingStrategyResponseParam>("StaticChunkingStrategyResponseParam")({
    /**
     * Always `static`.
     */
    "type": StaticChunkingStrategyResponseParamType,
    "static": StaticChunkingStrategy
  })
{}

/**
 * Always `other`.
 */
export class OtherChunkingStrategyResponseParamType extends S.Literal("other") {}

/**
 * This is returned when the chunking strategy is unknown. Typically, this is because the file was indexed before the `chunking_strategy` concept was introduced in the API.
 */
export class OtherChunkingStrategyResponseParam
  extends S.Class<OtherChunkingStrategyResponseParam>("OtherChunkingStrategyResponseParam")({
    /**
     * Always `other`.
     */
    "type": OtherChunkingStrategyResponseParamType
  })
{}

/**
 * The strategy used to chunk the file.
 */
export class ChunkingStrategyResponse extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * A list of files attached to a vector store.
 */
export class VectorStoreFileObject extends S.Class<VectorStoreFileObject>("VectorStoreFileObject")({
  /**
   * The identifier, which can be referenced in API endpoints.
   */
  "id": S.String,
  /**
   * The object type, which is always `vector_store.file`.
   */
  "object": VectorStoreFileObjectObject,
  /**
   * The total vector store usage in bytes. Note that this may be different from the original file size.
   */
  "usage_bytes": S.Int,
  /**
   * The Unix timestamp (in seconds) for when the vector store file was created.
   */
  "created_at": S.Int,
  /**
   * The ID of the [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object) that the [File](https://platform.openai.com/docs/api-reference/files) is attached to.
   */
  "vector_store_id": S.String,
  /**
   * The status of the vector store file, which can be either `in_progress`, `completed`, `cancelled`, or `failed`. The status `completed` indicates that the vector store file is ready for use.
   */
  "status": VectorStoreFileObjectStatus,
  "last_error": S.NullOr(S.Struct({
    /**
     * One of `server_error`, `unsupported_file`, or `invalid_file`.
     */
    "code": S.Literal("server_error", "unsupported_file", "invalid_file"),
    /**
     * A human-readable description of the error.
     */
    "message": S.String
  })),
  "chunking_strategy": S.optionalWith(ChunkingStrategyResponse, { nullable: true }),
  "attributes": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
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

export class UpdateVectorStoreFileAttributesRequest
  extends S.Class<UpdateVectorStoreFileAttributesRequest>("UpdateVectorStoreFileAttributesRequest")({
    "attributes": S.NullOr(S.Record({ key: S.String, value: S.Unknown }))
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

/**
 * The object type, which is always `vector_store.file_content.page`
 */
export class VectorStoreFileContentResponseObject extends S.Literal("vector_store.file_content.page") {}

/**
 * Represents the parsed content of a vector store file.
 */
export class VectorStoreFileContentResponse
  extends S.Class<VectorStoreFileContentResponse>("VectorStoreFileContentResponse")({
    /**
     * The object type, which is always `vector_store.file_content.page`
     */
    "object": VectorStoreFileContentResponseObject,
    /**
     * Parsed content of the file.
     */
    "data": S.Array(S.Struct({
      /**
       * The content type (currently only `"text"`)
       */
      "type": S.optionalWith(S.String, { nullable: true }),
      /**
       * The text content
       */
      "text": S.optionalWith(S.String, { nullable: true })
    })),
    /**
     * Indicates if there are more content pages to fetch.
     */
    "has_more": S.Boolean,
    "next_page": S.NullOr(S.String)
  })
{}

/**
 * Enable re-ranking; set to `none` to disable, which can help reduce latency.
 */
export class VectorStoreSearchRequestRankingOptionsRanker extends S.Literal("none", "auto", "default-2024-11-15") {}

export class VectorStoreSearchRequest extends S.Class<VectorStoreSearchRequest>("VectorStoreSearchRequest")({
  /**
   * A query string for a search
   */
  "query": S.Union(S.String, S.Array(S.String)),
  /**
   * Whether to rewrite the natural language query for vector search.
   */
  "rewrite_query": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * The maximum number of results to return. This number should be between 1 and 50 inclusive.
   */
  "max_num_results": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50)), {
    nullable: true,
    default: () => 10 as const
  }),
  /**
   * A filter to apply based on file attributes.
   */
  "filters": S.optionalWith(S.Union(ComparisonFilter, CompoundFilter), { nullable: true }),
  /**
   * Ranking options for search.
   */
  "ranking_options": S.optionalWith(
    S.Struct({
      /**
       * Enable re-ranking; set to `none` to disable, which can help reduce latency.
       */
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

/**
 * The object type, which is always `vector_store.search_results.page`
 */
export class VectorStoreSearchResultsPageObject extends S.Literal("vector_store.search_results.page") {}

/**
 * The type of content.
 */
export class VectorStoreSearchResultContentObjectType extends S.Literal("text") {}

export class VectorStoreSearchResultContentObject
  extends S.Class<VectorStoreSearchResultContentObject>("VectorStoreSearchResultContentObject")({
    /**
     * The type of content.
     */
    "type": VectorStoreSearchResultContentObjectType,
    /**
     * The text content returned from search.
     */
    "text": S.String
  })
{}

export class VectorStoreSearchResultItem extends S.Class<VectorStoreSearchResultItem>("VectorStoreSearchResultItem")({
  /**
   * The ID of the vector store file.
   */
  "file_id": S.String,
  /**
   * The name of the vector store file.
   */
  "filename": S.String,
  /**
   * The similarity score for the result.
   */
  "score": S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)),
  "attributes": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  /**
   * Content chunks from the file.
   */
  "content": S.Array(VectorStoreSearchResultContentObject)
}) {}

export class VectorStoreSearchResultsPage
  extends S.Class<VectorStoreSearchResultsPage>("VectorStoreSearchResultsPage")({
    /**
     * The object type, which is always `vector_store.search_results.page`
     */
    "object": VectorStoreSearchResultsPageObject,
    "search_query": S.Array(S.String),
    /**
     * The list of search result items.
     */
    "data": S.Array(VectorStoreSearchResultItem),
    /**
     * Indicates if there are more results to fetch.
     */
    "has_more": S.Boolean,
    "next_page": S.NullOr(S.String)
  })
{}

export class CreateConversationBody extends S.Class<CreateConversationBody>("CreateConversationBody")({
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "items": S.optionalWith(S.Array(InputItem).pipe(S.maxItems(20)), { nullable: true })
}) {}

export class UpdateConversationBody extends S.Class<UpdateConversationBody>("UpdateConversationBody")({
  /**
   * Set of 16 key-value pairs that can be attached to an object. This can be         useful for storing additional information about the object in a structured         format, and querying for objects via API or the dashboard.
   *         Keys are strings with a maximum length of 64 characters. Values are strings         with a maximum length of 512 characters.
   */
  "metadata": S.NullOr(S.Record({ key: S.String, value: S.Unknown }))
}) {}

export class DeletedConversationResourceObject extends S.Literal("conversation.deleted") {}

export class DeletedConversationResource extends S.Class<DeletedConversationResource>("DeletedConversationResource")({
  "object": DeletedConversationResourceObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "conversation.deleted" as const)
  ),
  "deleted": S.Boolean,
  "id": S.String
}) {}

export class OrderEnum extends S.Literal("asc", "desc") {}

export class ListVideosParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(100)), { nullable: true }),
  "order": S.optionalWith(OrderEnum, { nullable: true }),
  /**
   * Identifier for the last item from the previous pagination request
   */
  "after": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always `video`.
 */
export class VideoResourceObject extends S.Literal("video") {}

export class VideoModel extends S.Literal("sora-2", "sora-2-pro") {}

export class VideoStatus extends S.Literal("queued", "in_progress", "completed", "failed") {}

export class VideoSize extends S.Literal("720x1280", "1280x720", "1024x1792", "1792x1024") {}

export class VideoSeconds extends S.Literal("4", "8", "12") {}

export class Error2 extends S.Class<Error2>("Error2")({
  "code": S.String,
  "message": S.String
}) {}

/**
 * Structured information describing a generated video job.
 */
export class VideoResource extends S.Class<VideoResource>("VideoResource")({
  /**
   * Unique identifier for the video job.
   */
  "id": S.String,
  /**
   * The object type, which is always `video`.
   */
  "object": VideoResourceObject.pipe(S.propertySignature, S.withConstructorDefault(() => "video" as const)),
  /**
   * The video generation model that produced the job.
   */
  "model": VideoModel,
  /**
   * Current lifecycle status of the video job.
   */
  "status": VideoStatus,
  /**
   * Approximate completion percentage for the generation task.
   */
  "progress": S.Int,
  /**
   * Unix timestamp (seconds) for when the job was created.
   */
  "created_at": S.Int,
  "completed_at": S.NullOr(S.Int),
  "expires_at": S.NullOr(S.Int),
  "prompt": S.NullOr(S.String),
  /**
   * The resolution of the generated video.
   */
  "size": VideoSize,
  /**
   * Duration of the generated clip in seconds.
   */
  "seconds": VideoSeconds,
  "remixed_from_video_id": S.NullOr(S.String),
  "error": S.NullOr(Error2)
}) {}

export class VideoListResource extends S.Class<VideoListResource>("VideoListResource")({
  /**
   * The type of object returned, must be `list`.
   */
  "object": S.Literal("list").pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  /**
   * A list of items
   */
  "data": S.Array(VideoResource),
  "first_id": S.NullOr(S.String),
  "last_id": S.NullOr(S.String),
  /**
   * Whether there are more items available.
   */
  "has_more": S.Boolean
}) {}

/**
 * Parameters for creating a new video generation job.
 */
export class CreateVideoBody extends S.Class<CreateVideoBody>("CreateVideoBody")({
  /**
   * The video generation model to use. Defaults to `sora-2`.
   */
  "model": S.optionalWith(VideoModel, { nullable: true }),
  /**
   * Text prompt that describes the video to generate.
   */
  "prompt": S.String.pipe(S.minLength(1), S.maxLength(32000)),
  /**
   * Optional image reference that guides generation.
   */
  "input_reference": S.optionalWith(S.instanceOf(globalThis.Blob), { nullable: true }),
  /**
   * Clip duration in seconds. Defaults to 4 seconds.
   */
  "seconds": S.optionalWith(VideoSeconds, { nullable: true }),
  /**
   * Output resolution formatted as width x height. Defaults to 720x1280.
   */
  "size": S.optionalWith(VideoSize, { nullable: true })
}) {}

/**
 * The object type that signals the deletion response.
 */
export class DeletedVideoResourceObject extends S.Literal("video.deleted") {}

/**
 * Confirmation payload returned after deleting a video.
 */
export class DeletedVideoResource extends S.Class<DeletedVideoResource>("DeletedVideoResource")({
  /**
   * The object type that signals the deletion response.
   */
  "object": DeletedVideoResourceObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "video.deleted" as const)
  ),
  /**
   * Indicates that the video resource was deleted.
   */
  "deleted": S.Boolean,
  /**
   * Identifier of the deleted video.
   */
  "id": S.String
}) {}

export class VideoContentVariant extends S.Literal("video", "thumbnail", "spritesheet") {}

export class RetrieveVideoContentParams extends S.Struct({
  "variant": S.optionalWith(VideoContentVariant, { nullable: true })
}) {}

export class RetrieveVideoContent200 extends S.String {}

/**
 * Parameters for remixing an existing generated video.
 */
export class CreateVideoRemixBody extends S.Class<CreateVideoRemixBody>("CreateVideoRemixBody")({
  /**
   * Updated text prompt that directs the remix generation.
   */
  "prompt": S.String.pipe(S.minLength(1), S.maxLength(32000))
}) {}

export class TruncationEnum extends S.Literal("auto", "disabled") {}

export class TokenCountsBody extends S.Class<TokenCountsBody>("TokenCountsBody")({
  "model": S.optionalWith(S.String, { nullable: true }),
  "input": S.optionalWith(
    S.Union(
      /**
       * A text input to the model, equivalent to a text input with the `user` role.
       */
      S.String.pipe(S.maxLength(10485760)),
      S.Array(InputItem)
    ),
    { nullable: true }
  ),
  "previous_response_id": S.optionalWith(S.String, { nullable: true }),
  "tools": S.optionalWith(S.Array(Tool), { nullable: true }),
  "text": S.optionalWith(ResponseTextParam, { nullable: true }),
  "reasoning": S.optionalWith(Reasoning, { nullable: true }),
  /**
   * The truncation strategy to use for the model response. - `auto`: If the input to this Response exceeds the model's context window size, the model will truncate the response to fit the context window by dropping items from the beginning of the conversation. - `disabled` (default): If the input size will exceed the context window size for a model, the request will fail with a 400 error.
   */
  "truncation": S.optionalWith(TruncationEnum, { nullable: true }),
  "instructions": S.optionalWith(S.String, { nullable: true }),
  "conversation": S.optionalWith(ConversationParam, { nullable: true }),
  "tool_choice": S.optionalWith(ToolChoiceParam, { nullable: true }),
  "parallel_tool_calls": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class TokenCountsResourceObject extends S.Literal("response.input_tokens") {}

export class TokenCountsResource extends S.Class<TokenCountsResource>("TokenCountsResource")({
  "object": TokenCountsResourceObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "response.input_tokens" as const)
  ),
  "input_tokens": S.Int
}) {}

/**
 * Type discriminator that is always `chatkit.session`.
 */
export class ChatSessionResourceObject extends S.Literal("chatkit.session") {}

/**
 * Controls diagnostic tracing during the session.
 */
export class ChatkitWorkflowTracing extends S.Class<ChatkitWorkflowTracing>("ChatkitWorkflowTracing")({
  /**
   * Indicates whether tracing is enabled.
   */
  "enabled": S.Boolean
}) {}

/**
 * Workflow metadata and state returned for the session.
 */
export class ChatkitWorkflow extends S.Class<ChatkitWorkflow>("ChatkitWorkflow")({
  /**
   * Identifier of the workflow backing the session.
   */
  "id": S.String,
  "version": S.NullOr(S.String),
  "state_variables": S.NullOr(S.Record({ key: S.String, value: S.Unknown })),
  /**
   * Tracing settings applied to the workflow.
   */
  "tracing": ChatkitWorkflowTracing
}) {}

/**
 * Active per-minute request limit for the session.
 */
export class ChatSessionRateLimits extends S.Class<ChatSessionRateLimits>("ChatSessionRateLimits")({
  /**
   * Maximum allowed requests per one-minute window.
   */
  "max_requests_per_1_minute": S.Int
}) {}

export class ChatSessionStatus extends S.Literal("active", "expired", "cancelled") {}

/**
 * Automatic thread title preferences for the session.
 */
export class ChatSessionAutomaticThreadTitling
  extends S.Class<ChatSessionAutomaticThreadTitling>("ChatSessionAutomaticThreadTitling")({
    /**
     * Whether automatic thread titling is enabled.
     */
    "enabled": S.Boolean
  })
{}

/**
 * Upload permissions and limits applied to the session.
 */
export class ChatSessionFileUpload extends S.Class<ChatSessionFileUpload>("ChatSessionFileUpload")({
  /**
   * Indicates if uploads are enabled for the session.
   */
  "enabled": S.Boolean,
  "max_file_size": S.NullOr(S.Int),
  "max_files": S.NullOr(S.Int)
}) {}

/**
 * History retention preferences returned for the session.
 */
export class ChatSessionHistory extends S.Class<ChatSessionHistory>("ChatSessionHistory")({
  /**
   * Indicates if chat history is persisted for the session.
   */
  "enabled": S.Boolean,
  "recent_threads": S.NullOr(S.Int)
}) {}

/**
 * ChatKit configuration for the session.
 */
export class ChatSessionChatkitConfiguration
  extends S.Class<ChatSessionChatkitConfiguration>("ChatSessionChatkitConfiguration")({
    /**
     * Automatic thread titling preferences.
     */
    "automatic_thread_titling": ChatSessionAutomaticThreadTitling,
    /**
     * Upload settings for the session.
     */
    "file_upload": ChatSessionFileUpload,
    /**
     * History retention configuration.
     */
    "history": ChatSessionHistory
  })
{}

/**
 * Represents a ChatKit session and its resolved configuration.
 */
export class ChatSessionResource extends S.Class<ChatSessionResource>("ChatSessionResource")({
  /**
   * Identifier for the ChatKit session.
   */
  "id": S.String,
  /**
   * Type discriminator that is always `chatkit.session`.
   */
  "object": ChatSessionResourceObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.session" as const)
  ),
  /**
   * Unix timestamp (in seconds) for when the session expires.
   */
  "expires_at": S.Int,
  /**
   * Ephemeral client secret that authenticates session requests.
   */
  "client_secret": S.String,
  /**
   * Workflow metadata for the session.
   */
  "workflow": ChatkitWorkflow,
  /**
   * User identifier associated with the session.
   */
  "user": S.String,
  /**
   * Resolved rate limit values.
   */
  "rate_limits": ChatSessionRateLimits,
  /**
   * Convenience copy of the per-minute request limit.
   */
  "max_requests_per_1_minute": S.Int,
  /**
   * Current lifecycle state of the session.
   */
  "status": ChatSessionStatus,
  /**
   * Resolved ChatKit feature configuration for the session.
   */
  "chatkit_configuration": ChatSessionChatkitConfiguration
}) {}

/**
 * Controls diagnostic tracing during the session.
 */
export class WorkflowTracingParam extends S.Class<WorkflowTracingParam>("WorkflowTracingParam")({
  /**
   * Whether tracing is enabled during the session. Defaults to true.
   */
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * Workflow reference and overrides applied to the chat session.
 */
export class WorkflowParam extends S.Class<WorkflowParam>("WorkflowParam")({
  /**
   * Identifier for the workflow invoked by the session.
   */
  "id": S.String,
  /**
   * Specific workflow version to run. Defaults to the latest deployed version.
   */
  "version": S.optionalWith(S.String, { nullable: true }),
  /**
   * State variables forwarded to the workflow. Keys may be up to 64 characters, values must be primitive types, and the map defaults to an empty object.
   */
  "state_variables": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * Optional tracing overrides for the workflow invocation. When omitted, tracing is enabled by default.
   */
  "tracing": S.optionalWith(WorkflowTracingParam, { nullable: true })
}) {}

/**
 * Base timestamp used to calculate expiration. Currently fixed to `created_at`.
 */
export class ExpiresAfterParamAnchor extends S.Literal("created_at") {}

/**
 * Controls when the session expires relative to an anchor timestamp.
 */
export class ExpiresAfterParam extends S.Class<ExpiresAfterParam>("ExpiresAfterParam")({
  /**
   * Base timestamp used to calculate expiration. Currently fixed to `created_at`.
   */
  "anchor": ExpiresAfterParamAnchor.pipe(S.propertySignature, S.withConstructorDefault(() => "created_at" as const)),
  /**
   * Number of seconds after the anchor when the session expires.
   */
  "seconds": S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(600))
}) {}

/**
 * Controls request rate limits for the session.
 */
export class RateLimitsParam extends S.Class<RateLimitsParam>("RateLimitsParam")({
  /**
   * Maximum number of requests allowed per minute for the session. Defaults to 10.
   */
  "max_requests_per_1_minute": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

/**
 * Controls whether ChatKit automatically generates thread titles.
 */
export class AutomaticThreadTitlingParam extends S.Class<AutomaticThreadTitlingParam>("AutomaticThreadTitlingParam")({
  /**
   * Enable automatic thread title generation. Defaults to true.
   */
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * Controls whether users can upload files.
 */
export class FileUploadParam extends S.Class<FileUploadParam>("FileUploadParam")({
  /**
   * Enable uploads for this session. Defaults to false.
   */
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Maximum size in megabytes for each uploaded file. Defaults to 512 MB, which is the maximum allowable size.
   */
  "max_file_size": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(512)), { nullable: true }),
  /**
   * Maximum number of files that can be uploaded to the session. Defaults to 10.
   */
  "max_files": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

/**
 * Controls how much historical context is retained for the session.
 */
export class HistoryParam extends S.Class<HistoryParam>("HistoryParam")({
  /**
   * Enables chat users to access previous ChatKit threads. Defaults to true.
   */
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Number of recent ChatKit threads users have access to. Defaults to unlimited when unset.
   */
  "recent_threads": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true })
}) {}

/**
 * Optional per-session configuration settings for ChatKit behavior.
 */
export class ChatkitConfigurationParam extends S.Class<ChatkitConfigurationParam>("ChatkitConfigurationParam")({
  /**
   * Configuration for automatic thread titling. When omitted, automatic thread titling is enabled by default.
   */
  "automatic_thread_titling": S.optionalWith(AutomaticThreadTitlingParam, { nullable: true }),
  /**
   * Configuration for upload enablement and limits. When omitted, uploads are disabled by default (max_files 10, max_file_size 512 MB).
   */
  "file_upload": S.optionalWith(FileUploadParam, { nullable: true }),
  /**
   * Configuration for chat history retention. When omitted, history is enabled by default with no limit on recent_threads (null).
   */
  "history": S.optionalWith(HistoryParam, { nullable: true })
}) {}

/**
 * Parameters for provisioning a new ChatKit session.
 */
export class CreateChatSessionBody extends S.Class<CreateChatSessionBody>("CreateChatSessionBody")({
  /**
   * Workflow that powers the session.
   */
  "workflow": WorkflowParam,
  /**
   * A free-form string that identifies your end user; ensures this Session can access other objects that have the same `user` scope.
   */
  "user": S.String.pipe(S.minLength(1)),
  /**
   * Optional override for session expiration timing in seconds from creation. Defaults to 10 minutes.
   */
  "expires_after": S.optionalWith(ExpiresAfterParam, { nullable: true }),
  /**
   * Optional override for per-minute request limits. When omitted, defaults to 10.
   */
  "rate_limits": S.optionalWith(RateLimitsParam, { nullable: true }),
  /**
   * Optional overrides for ChatKit runtime configuration features
   */
  "chatkit_configuration": S.optionalWith(ChatkitConfigurationParam, { nullable: true })
}) {}

export class ListThreadItemsMethodParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(100)), { nullable: true }),
  "order": S.optionalWith(OrderEnum, { nullable: true }),
  /**
   * List items created after this thread item ID. Defaults to null for the first page.
   */
  "after": S.optionalWith(S.String, { nullable: true }),
  /**
   * List items created before this thread item ID. Defaults to null for the newest results.
   */
  "before": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Type discriminator that is always `chatkit.thread_item`.
 */
export class UserMessageItemObject extends S.Literal("chatkit.thread_item") {}

export class UserMessageItemType extends S.Literal("chatkit.user_message") {}

/**
 * Type discriminator that is always `input_text`.
 */
export class UserMessageInputTextType extends S.Literal("input_text") {}

/**
 * Text block that a user contributed to the thread.
 */
export class UserMessageInputText extends S.Class<UserMessageInputText>("UserMessageInputText")({
  /**
   * Type discriminator that is always `input_text`.
   */
  "type": UserMessageInputTextType.pipe(S.propertySignature, S.withConstructorDefault(() => "input_text" as const)),
  /**
   * Plain-text content supplied by the user.
   */
  "text": S.String
}) {}

/**
 * Type discriminator that is always `quoted_text`.
 */
export class UserMessageQuotedTextType extends S.Literal("quoted_text") {}

/**
 * Quoted snippet that the user referenced in their message.
 */
export class UserMessageQuotedText extends S.Class<UserMessageQuotedText>("UserMessageQuotedText")({
  /**
   * Type discriminator that is always `quoted_text`.
   */
  "type": UserMessageQuotedTextType.pipe(S.propertySignature, S.withConstructorDefault(() => "quoted_text" as const)),
  /**
   * Quoted text content.
   */
  "text": S.String
}) {}

export class AttachmentType extends S.Literal("image", "file") {}

/**
 * Attachment metadata included on thread items.
 */
export class Attachment extends S.Class<Attachment>("Attachment")({
  /**
   * Attachment discriminator.
   */
  "type": AttachmentType,
  /**
   * Identifier for the attachment.
   */
  "id": S.String,
  /**
   * Original display name for the attachment.
   */
  "name": S.String,
  /**
   * MIME type of the attachment.
   */
  "mime_type": S.String,
  "preview_url": S.NullOr(S.String)
}) {}

/**
 * Tool selection that the assistant should honor when executing the item.
 */
export class ToolChoice extends S.Class<ToolChoice>("ToolChoice")({
  /**
   * Identifier of the requested tool.
   */
  "id": S.String
}) {}

/**
 * Model and tool overrides applied when generating the assistant response.
 */
export class InferenceOptions extends S.Class<InferenceOptions>("InferenceOptions")({
  "tool_choice": S.NullOr(ToolChoice),
  "model": S.NullOr(S.String)
}) {}

/**
 * User-authored messages within a thread.
 */
export class UserMessageItem extends S.Class<UserMessageItem>("UserMessageItem")({
  /**
   * Identifier of the thread item.
   */
  "id": S.String,
  /**
   * Type discriminator that is always `chatkit.thread_item`.
   */
  "object": UserMessageItemObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.thread_item" as const)
  ),
  /**
   * Unix timestamp (in seconds) for when the item was created.
   */
  "created_at": S.Int,
  /**
   * Identifier of the parent thread.
   */
  "thread_id": S.String,
  "type": UserMessageItemType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.user_message" as const)
  ),
  /**
   * Ordered content elements supplied by the user.
   */
  "content": S.Array(S.Union(UserMessageInputText, UserMessageQuotedText)),
  /**
   * Attachments associated with the user message. Defaults to an empty list.
   */
  "attachments": S.Array(Attachment),
  "inference_options": S.NullOr(InferenceOptions)
}) {}

/**
 * Type discriminator that is always `chatkit.thread_item`.
 */
export class AssistantMessageItemObject extends S.Literal("chatkit.thread_item") {}

/**
 * Type discriminator that is always `chatkit.assistant_message`.
 */
export class AssistantMessageItemType extends S.Literal("chatkit.assistant_message") {}

/**
 * Type discriminator that is always `output_text`.
 */
export class ResponseOutputTextType extends S.Literal("output_text") {}

/**
 * Type discriminator that is always `file` for this annotation.
 */
export class FileAnnotationType extends S.Literal("file") {}

/**
 * Type discriminator that is always `file`.
 */
export class FileAnnotationSourceType extends S.Literal("file") {}

/**
 * Attachment source referenced by an annotation.
 */
export class FileAnnotationSource extends S.Class<FileAnnotationSource>("FileAnnotationSource")({
  /**
   * Type discriminator that is always `file`.
   */
  "type": FileAnnotationSourceType.pipe(S.propertySignature, S.withConstructorDefault(() => "file" as const)),
  /**
   * Filename referenced by the annotation.
   */
  "filename": S.String
}) {}

/**
 * Annotation that references an uploaded file.
 */
export class FileAnnotation extends S.Class<FileAnnotation>("FileAnnotation")({
  /**
   * Type discriminator that is always `file` for this annotation.
   */
  "type": FileAnnotationType.pipe(S.propertySignature, S.withConstructorDefault(() => "file" as const)),
  /**
   * File attachment referenced by the annotation.
   */
  "source": FileAnnotationSource
}) {}

/**
 * Type discriminator that is always `url` for this annotation.
 */
export class UrlAnnotationType extends S.Literal("url") {}

/**
 * Type discriminator that is always `url`.
 */
export class UrlAnnotationSourceType extends S.Literal("url") {}

/**
 * URL backing an annotation entry.
 */
export class UrlAnnotationSource extends S.Class<UrlAnnotationSource>("UrlAnnotationSource")({
  /**
   * Type discriminator that is always `url`.
   */
  "type": UrlAnnotationSourceType.pipe(S.propertySignature, S.withConstructorDefault(() => "url" as const)),
  /**
   * URL referenced by the annotation.
   */
  "url": S.String
}) {}

/**
 * Annotation that references a URL.
 */
export class UrlAnnotation extends S.Class<UrlAnnotation>("UrlAnnotation")({
  /**
   * Type discriminator that is always `url` for this annotation.
   */
  "type": UrlAnnotationType.pipe(S.propertySignature, S.withConstructorDefault(() => "url" as const)),
  /**
   * URL referenced by the annotation.
   */
  "source": UrlAnnotationSource
}) {}

/**
 * Assistant response text accompanied by optional annotations.
 */
export class ResponseOutputText extends S.Class<ResponseOutputText>("ResponseOutputText")({
  /**
   * Type discriminator that is always `output_text`.
   */
  "type": ResponseOutputTextType.pipe(S.propertySignature, S.withConstructorDefault(() => "output_text" as const)),
  /**
   * Assistant generated text.
   */
  "text": S.String,
  /**
   * Ordered list of annotations attached to the response text.
   */
  "annotations": S.Array(S.Union(FileAnnotation, UrlAnnotation))
}) {}

/**
 * Assistant-authored message within a thread.
 */
export class AssistantMessageItem extends S.Class<AssistantMessageItem>("AssistantMessageItem")({
  /**
   * Identifier of the thread item.
   */
  "id": S.String,
  /**
   * Type discriminator that is always `chatkit.thread_item`.
   */
  "object": AssistantMessageItemObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.thread_item" as const)
  ),
  /**
   * Unix timestamp (in seconds) for when the item was created.
   */
  "created_at": S.Int,
  /**
   * Identifier of the parent thread.
   */
  "thread_id": S.String,
  /**
   * Type discriminator that is always `chatkit.assistant_message`.
   */
  "type": AssistantMessageItemType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.assistant_message" as const)
  ),
  /**
   * Ordered assistant response segments.
   */
  "content": S.Array(ResponseOutputText)
}) {}

/**
 * Type discriminator that is always `chatkit.thread_item`.
 */
export class WidgetMessageItemObject extends S.Literal("chatkit.thread_item") {}

/**
 * Type discriminator that is always `chatkit.widget`.
 */
export class WidgetMessageItemType extends S.Literal("chatkit.widget") {}

/**
 * Thread item that renders a widget payload.
 */
export class WidgetMessageItem extends S.Class<WidgetMessageItem>("WidgetMessageItem")({
  /**
   * Identifier of the thread item.
   */
  "id": S.String,
  /**
   * Type discriminator that is always `chatkit.thread_item`.
   */
  "object": WidgetMessageItemObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.thread_item" as const)
  ),
  /**
   * Unix timestamp (in seconds) for when the item was created.
   */
  "created_at": S.Int,
  /**
   * Identifier of the parent thread.
   */
  "thread_id": S.String,
  /**
   * Type discriminator that is always `chatkit.widget`.
   */
  "type": WidgetMessageItemType.pipe(S.propertySignature, S.withConstructorDefault(() => "chatkit.widget" as const)),
  /**
   * Serialized widget payload rendered in the UI.
   */
  "widget": S.String
}) {}

/**
 * Type discriminator that is always `chatkit.thread_item`.
 */
export class ClientToolCallItemObject extends S.Literal("chatkit.thread_item") {}

/**
 * Type discriminator that is always `chatkit.client_tool_call`.
 */
export class ClientToolCallItemType extends S.Literal("chatkit.client_tool_call") {}

export class ClientToolCallStatus extends S.Literal("in_progress", "completed") {}

/**
 * Record of a client side tool invocation initiated by the assistant.
 */
export class ClientToolCallItem extends S.Class<ClientToolCallItem>("ClientToolCallItem")({
  /**
   * Identifier of the thread item.
   */
  "id": S.String,
  /**
   * Type discriminator that is always `chatkit.thread_item`.
   */
  "object": ClientToolCallItemObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.thread_item" as const)
  ),
  /**
   * Unix timestamp (in seconds) for when the item was created.
   */
  "created_at": S.Int,
  /**
   * Identifier of the parent thread.
   */
  "thread_id": S.String,
  /**
   * Type discriminator that is always `chatkit.client_tool_call`.
   */
  "type": ClientToolCallItemType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.client_tool_call" as const)
  ),
  /**
   * Execution status for the tool call.
   */
  "status": ClientToolCallStatus,
  /**
   * Identifier for the client tool call.
   */
  "call_id": S.String,
  /**
   * Tool name that was invoked.
   */
  "name": S.String,
  /**
   * JSON-encoded arguments that were sent to the tool.
   */
  "arguments": S.String,
  "output": S.NullOr(S.String)
}) {}

/**
 * Type discriminator that is always `chatkit.thread_item`.
 */
export class TaskItemObject extends S.Literal("chatkit.thread_item") {}

/**
 * Type discriminator that is always `chatkit.task`.
 */
export class TaskItemType extends S.Literal("chatkit.task") {}

export class TaskType extends S.Literal("custom", "thought") {}

/**
 * Task emitted by the workflow to show progress and status updates.
 */
export class TaskItem extends S.Class<TaskItem>("TaskItem")({
  /**
   * Identifier of the thread item.
   */
  "id": S.String,
  /**
   * Type discriminator that is always `chatkit.thread_item`.
   */
  "object": TaskItemObject.pipe(S.propertySignature, S.withConstructorDefault(() => "chatkit.thread_item" as const)),
  /**
   * Unix timestamp (in seconds) for when the item was created.
   */
  "created_at": S.Int,
  /**
   * Identifier of the parent thread.
   */
  "thread_id": S.String,
  /**
   * Type discriminator that is always `chatkit.task`.
   */
  "type": TaskItemType.pipe(S.propertySignature, S.withConstructorDefault(() => "chatkit.task" as const)),
  /**
   * Subtype for the task.
   */
  "task_type": TaskType,
  "heading": S.NullOr(S.String),
  "summary": S.NullOr(S.String)
}) {}

/**
 * Type discriminator that is always `chatkit.thread_item`.
 */
export class TaskGroupItemObject extends S.Literal("chatkit.thread_item") {}

/**
 * Type discriminator that is always `chatkit.task_group`.
 */
export class TaskGroupItemType extends S.Literal("chatkit.task_group") {}

/**
 * Task entry that appears within a TaskGroup.
 */
export class TaskGroupTask extends S.Class<TaskGroupTask>("TaskGroupTask")({
  /**
   * Subtype for the grouped task.
   */
  "type": TaskType,
  "heading": S.NullOr(S.String),
  "summary": S.NullOr(S.String)
}) {}

/**
 * Collection of workflow tasks grouped together in the thread.
 */
export class TaskGroupItem extends S.Class<TaskGroupItem>("TaskGroupItem")({
  /**
   * Identifier of the thread item.
   */
  "id": S.String,
  /**
   * Type discriminator that is always `chatkit.thread_item`.
   */
  "object": TaskGroupItemObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.thread_item" as const)
  ),
  /**
   * Unix timestamp (in seconds) for when the item was created.
   */
  "created_at": S.Int,
  /**
   * Identifier of the parent thread.
   */
  "thread_id": S.String,
  /**
   * Type discriminator that is always `chatkit.task_group`.
   */
  "type": TaskGroupItemType.pipe(S.propertySignature, S.withConstructorDefault(() => "chatkit.task_group" as const)),
  /**
   * Tasks included in the group.
   */
  "tasks": S.Array(TaskGroupTask)
}) {}

export class ThreadItem
  extends S.Union(UserMessageItem, AssistantMessageItem, WidgetMessageItem, ClientToolCallItem, TaskItem, TaskGroupItem)
{}

/**
 * A paginated list of thread items rendered for the ChatKit API.
 */
export class ThreadItemListResource extends S.Class<ThreadItemListResource>("ThreadItemListResource")({
  /**
   * The type of object returned, must be `list`.
   */
  "object": S.Literal("list").pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  /**
   * A list of items
   */
  "data": S.Array(ThreadItem),
  "first_id": S.NullOr(S.String),
  "last_id": S.NullOr(S.String),
  /**
   * Whether there are more items available.
   */
  "has_more": S.Boolean
}) {}

/**
 * Type discriminator that is always `chatkit.thread`.
 */
export class ThreadResourceObject extends S.Literal("chatkit.thread") {}

/**
 * Status discriminator that is always `active`.
 */
export class ActiveStatusType extends S.Literal("active") {}

/**
 * Indicates that a thread is active.
 */
export class ActiveStatus extends S.Class<ActiveStatus>("ActiveStatus")({
  /**
   * Status discriminator that is always `active`.
   */
  "type": ActiveStatusType.pipe(S.propertySignature, S.withConstructorDefault(() => "active" as const))
}) {}

/**
 * Status discriminator that is always `locked`.
 */
export class LockedStatusType extends S.Literal("locked") {}

/**
 * Indicates that a thread is locked and cannot accept new input.
 */
export class LockedStatus extends S.Class<LockedStatus>("LockedStatus")({
  /**
   * Status discriminator that is always `locked`.
   */
  "type": LockedStatusType.pipe(S.propertySignature, S.withConstructorDefault(() => "locked" as const)),
  "reason": S.NullOr(S.String)
}) {}

/**
 * Status discriminator that is always `closed`.
 */
export class ClosedStatusType extends S.Literal("closed") {}

/**
 * Indicates that a thread has been closed.
 */
export class ClosedStatus extends S.Class<ClosedStatus>("ClosedStatus")({
  /**
   * Status discriminator that is always `closed`.
   */
  "type": ClosedStatusType.pipe(S.propertySignature, S.withConstructorDefault(() => "closed" as const)),
  "reason": S.NullOr(S.String)
}) {}

/**
 * Represents a ChatKit thread and its current status.
 */
export class ThreadResource extends S.Class<ThreadResource>("ThreadResource")({
  /**
   * Identifier of the thread.
   */
  "id": S.String,
  /**
   * Type discriminator that is always `chatkit.thread`.
   */
  "object": ThreadResourceObject.pipe(S.propertySignature, S.withConstructorDefault(() => "chatkit.thread" as const)),
  /**
   * Unix timestamp (in seconds) for when the thread was created.
   */
  "created_at": S.Int,
  "title": S.NullOr(S.String),
  /**
   * Current status for the thread. Defaults to `active` for newly created threads.
   */
  "status": S.Union(ActiveStatus, LockedStatus, ClosedStatus),
  /**
   * Free-form string that identifies your end user who owns the thread.
   */
  "user": S.String
}) {}

/**
 * Type discriminator that is always `chatkit.thread.deleted`.
 */
export class DeletedThreadResourceObject extends S.Literal("chatkit.thread.deleted") {}

/**
 * Confirmation payload returned after deleting a thread.
 */
export class DeletedThreadResource extends S.Class<DeletedThreadResource>("DeletedThreadResource")({
  /**
   * Identifier of the deleted thread.
   */
  "id": S.String,
  /**
   * Type discriminator that is always `chatkit.thread.deleted`.
   */
  "object": DeletedThreadResourceObject.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "chatkit.thread.deleted" as const)
  ),
  /**
   * Indicates that the thread has been deleted.
   */
  "deleted": S.Boolean
}) {}

export class ListThreadsMethodParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(100)), { nullable: true }),
  "order": S.optionalWith(OrderEnum, { nullable: true }),
  /**
   * List items created after this thread item ID. Defaults to null for the first page.
   */
  "after": S.optionalWith(S.String, { nullable: true }),
  /**
   * List items created before this thread item ID. Defaults to null for the newest results.
   */
  "before": S.optionalWith(S.String, { nullable: true }),
  /**
   * Filter threads that belong to this user identifier. Defaults to null to return all users.
   */
  "user": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(512)), { nullable: true })
}) {}

/**
 * A paginated list of ChatKit threads.
 */
export class ThreadListResource extends S.Class<ThreadListResource>("ThreadListResource")({
  /**
   * The type of object returned, must be `list`.
   */
  "object": S.Literal("list").pipe(S.propertySignature, S.withConstructorDefault(() => "list" as const)),
  /**
   * A list of items
   */
  "data": S.Array(ThreadResource),
  "first_id": S.NullOr(S.String),
  "last_id": S.NullOr(S.String),
  /**
   * Whether there are more items available.
   */
  "has_more": S.Boolean
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
    "listAssistants": (options) =>
      HttpClientRequest.get(`/assistants`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListAssistantsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createAssistant": (options) =>
      HttpClientRequest.post(`/assistants`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(AssistantObject),
          orElse: unexpectedStatus
        }))
      ),
    "getAssistant": (assistantId) =>
      HttpClientRequest.get(`/assistants/${assistantId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(AssistantObject),
          orElse: unexpectedStatus
        }))
      ),
    "modifyAssistant": (assistantId, options) =>
      HttpClientRequest.post(`/assistants/${assistantId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(AssistantObject),
          orElse: unexpectedStatus
        }))
      ),
    "deleteAssistant": (assistantId) =>
      HttpClientRequest.del(`/assistants/${assistantId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteAssistantResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createSpeech": (options) =>
      HttpClientRequest.post(`/audio/speech`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          orElse: unexpectedStatus
        }))
      ),
    "createTranscription": (options) =>
      HttpClientRequest.post(`/audio/transcriptions`).pipe(
        HttpClientRequest.bodyFormDataRecord(options as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateTranscription200),
          orElse: unexpectedStatus
        }))
      ),
    "createTranslation": (options) =>
      HttpClientRequest.post(`/audio/translations`).pipe(
        HttpClientRequest.bodyFormDataRecord(options as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateTranslation200),
          orElse: unexpectedStatus
        }))
      ),
    "listBatches": (options) =>
      HttpClientRequest.get(`/batches`).pipe(
        HttpClientRequest.setUrlParams({ "after": options?.["after"] as any, "limit": options?.["limit"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListBatchesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createBatch": (options) =>
      HttpClientRequest.post(`/batches`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Batch),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveBatch": (batchId) =>
      HttpClientRequest.get(`/batches/${batchId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Batch),
          orElse: unexpectedStatus
        }))
      ),
    "cancelBatch": (batchId) =>
      HttpClientRequest.post(`/batches/${batchId}/cancel`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Batch),
          orElse: unexpectedStatus
        }))
      ),
    "listChatCompletions": (options) =>
      HttpClientRequest.get(`/chat/completions`).pipe(
        HttpClientRequest.setUrlParams({
          "model": options?.["model"] as any,
          "metadata": options?.["metadata"] as any,
          "after": options?.["after"] as any,
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ChatCompletionList),
          orElse: unexpectedStatus
        }))
      ),
    "createChatCompletion": (options) =>
      HttpClientRequest.post(`/chat/completions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateChatCompletionResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getChatCompletion": (completionId) =>
      HttpClientRequest.get(`/chat/completions/${completionId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateChatCompletionResponse),
          orElse: unexpectedStatus
        }))
      ),
    "updateChatCompletion": (completionId, options) =>
      HttpClientRequest.post(`/chat/completions/${completionId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateChatCompletionResponse),
          orElse: unexpectedStatus
        }))
      ),
    "deleteChatCompletion": (completionId) =>
      HttpClientRequest.del(`/chat/completions/${completionId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ChatCompletionDeleted),
          orElse: unexpectedStatus
        }))
      ),
    "getChatCompletionMessages": (completionId, options) =>
      HttpClientRequest.get(`/chat/completions/${completionId}/messages`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options?.["after"] as any,
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ChatCompletionMessageList),
          orElse: unexpectedStatus
        }))
      ),
    "createCompletion": (options) =>
      HttpClientRequest.post(`/completions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateCompletionResponse),
          orElse: unexpectedStatus
        }))
      ),
    "ListContainers": (options) =>
      HttpClientRequest.get(`/containers`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ContainerListResource),
          orElse: unexpectedStatus
        }))
      ),
    "CreateContainer": (options) =>
      HttpClientRequest.post(`/containers`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ContainerResource),
          orElse: unexpectedStatus
        }))
      ),
    "RetrieveContainer": (containerId) =>
      HttpClientRequest.get(`/containers/${containerId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ContainerResource),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteContainer": (containerId) =>
      HttpClientRequest.del(`/containers/${containerId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "200": () => Effect.void,
          orElse: unexpectedStatus
        }))
      ),
    "ListContainerFiles": (containerId, options) =>
      HttpClientRequest.get(`/containers/${containerId}/files`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ContainerFileListResource),
          orElse: unexpectedStatus
        }))
      ),
    "CreateContainerFile": (containerId, options) =>
      HttpClientRequest.post(`/containers/${containerId}/files`).pipe(
        HttpClientRequest.bodyFormDataRecord(options as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ContainerFileResource),
          orElse: unexpectedStatus
        }))
      ),
    "RetrieveContainerFile": (containerId, fileId) =>
      HttpClientRequest.get(`/containers/${containerId}/files/${fileId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ContainerFileResource),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteContainerFile": (containerId, fileId) =>
      HttpClientRequest.del(`/containers/${containerId}/files/${fileId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "200": () => Effect.void,
          orElse: unexpectedStatus
        }))
      ),
    "RetrieveContainerFileContent": (containerId, fileId) =>
      HttpClientRequest.get(`/containers/${containerId}/files/${fileId}/content`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "200": () => Effect.void,
          orElse: unexpectedStatus
        }))
      ),
    "listConversationItems": (conversationId, options) =>
      HttpClientRequest.get(`/conversations/${conversationId}/items`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "include": options?.["include"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ConversationItemList),
          orElse: unexpectedStatus
        }))
      ),
    "createConversationItems": (conversationId, options) =>
      HttpClientRequest.post(`/conversations/${conversationId}/items`).pipe(
        HttpClientRequest.setUrlParams({ "include": options.params?.["include"] as any }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ConversationItemList),
          orElse: unexpectedStatus
        }))
      ),
    "getConversationItem": (conversationId, itemId, options) =>
      HttpClientRequest.get(`/conversations/${conversationId}/items/${itemId}`).pipe(
        HttpClientRequest.setUrlParams({ "include": options?.["include"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ConversationItem),
          orElse: unexpectedStatus
        }))
      ),
    "deleteConversationItem": (conversationId, itemId) =>
      HttpClientRequest.del(`/conversations/${conversationId}/items/${itemId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ConversationResource),
          orElse: unexpectedStatus
        }))
      ),
    "createEmbedding": (options) =>
      HttpClientRequest.post(`/embeddings`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateEmbeddingResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listEvals": (options) =>
      HttpClientRequest.get(`/evals`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options?.["after"] as any,
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "order_by": options?.["order_by"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EvalList),
          orElse: unexpectedStatus
        }))
      ),
    "createEval": (options) =>
      HttpClientRequest.post(`/evals`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Eval),
          orElse: unexpectedStatus
        }))
      ),
    "getEval": (evalId) =>
      HttpClientRequest.get(`/evals/${evalId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Eval),
          orElse: unexpectedStatus
        }))
      ),
    "updateEval": (evalId, options) =>
      HttpClientRequest.post(`/evals/${evalId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Eval),
          orElse: unexpectedStatus
        }))
      ),
    "deleteEval": (evalId) =>
      HttpClientRequest.del(`/evals/${evalId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteEval200),
          "404": decodeError("Error", Error),
          orElse: unexpectedStatus
        }))
      ),
    "getEvalRuns": (evalId, options) =>
      HttpClientRequest.get(`/evals/${evalId}/runs`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options?.["after"] as any,
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "status": options?.["status"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EvalRunList),
          orElse: unexpectedStatus
        }))
      ),
    "createEvalRun": (evalId, options) =>
      HttpClientRequest.post(`/evals/${evalId}/runs`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EvalRun),
          "400": decodeError("Error", Error),
          orElse: unexpectedStatus
        }))
      ),
    "getEvalRun": (evalId, runId) =>
      HttpClientRequest.get(`/evals/${evalId}/runs/${runId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EvalRun),
          orElse: unexpectedStatus
        }))
      ),
    "cancelEvalRun": (evalId, runId) =>
      HttpClientRequest.post(`/evals/${evalId}/runs/${runId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EvalRun),
          orElse: unexpectedStatus
        }))
      ),
    "deleteEvalRun": (evalId, runId) =>
      HttpClientRequest.del(`/evals/${evalId}/runs/${runId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteEvalRun200),
          "404": decodeError("Error", Error),
          orElse: unexpectedStatus
        }))
      ),
    "getEvalRunOutputItems": (evalId, runId, options) =>
      HttpClientRequest.get(`/evals/${evalId}/runs/${runId}/output_items`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options?.["after"] as any,
          "limit": options?.["limit"] as any,
          "status": options?.["status"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EvalRunOutputItemList),
          orElse: unexpectedStatus
        }))
      ),
    "getEvalRunOutputItem": (evalId, runId, outputItemId) =>
      HttpClientRequest.get(`/evals/${evalId}/runs/${runId}/output_items/${outputItemId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EvalRunOutputItem),
          orElse: unexpectedStatus
        }))
      ),
    "listFiles": (options) =>
      HttpClientRequest.get(`/files`).pipe(
        HttpClientRequest.setUrlParams({
          "purpose": options?.["purpose"] as any,
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListFilesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createFile": (options) =>
      HttpClientRequest.post(`/files`).pipe(
        HttpClientRequest.bodyFormDataRecord(options as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(OpenAIFile),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveFile": (fileId) =>
      HttpClientRequest.get(`/files/${fileId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(OpenAIFile),
          orElse: unexpectedStatus
        }))
      ),
    "deleteFile": (fileId) =>
      HttpClientRequest.del(`/files/${fileId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteFileResponse),
          orElse: unexpectedStatus
        }))
      ),
    "downloadFile": (fileId) =>
      HttpClientRequest.get(`/files/${fileId}/content`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DownloadFile200),
          orElse: unexpectedStatus
        }))
      ),
    "runGrader": (options) =>
      HttpClientRequest.post(`/fine_tuning/alpha/graders/run`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RunGraderResponse),
          orElse: unexpectedStatus
        }))
      ),
    "validateGrader": (options) =>
      HttpClientRequest.post(`/fine_tuning/alpha/graders/validate`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ValidateGraderResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listFineTuningCheckpointPermissions": (fineTunedModelCheckpoint, options) =>
      HttpClientRequest.get(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`).pipe(
        HttpClientRequest.setUrlParams({
          "project_id": options?.["project_id"] as any,
          "after": options?.["after"] as any,
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListFineTuningCheckpointPermissionResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createFineTuningCheckpointPermission": (fineTunedModelCheckpoint, options) =>
      HttpClientRequest.post(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListFineTuningCheckpointPermissionResponse),
          orElse: unexpectedStatus
        }))
      ),
    "deleteFineTuningCheckpointPermission": (fineTunedModelCheckpoint, permissionId) =>
      HttpClientRequest.del(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions/${permissionId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteFineTuningCheckpointPermissionResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listPaginatedFineTuningJobs": (options) =>
      HttpClientRequest.get(`/fine_tuning/jobs`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options?.["after"] as any,
          "limit": options?.["limit"] as any,
          "metadata": options?.["metadata"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListPaginatedFineTuningJobsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createFineTuningJob": (options) =>
      HttpClientRequest.post(`/fine_tuning/jobs`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FineTuningJob),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveFineTuningJob": (fineTuningJobId) =>
      HttpClientRequest.get(`/fine_tuning/jobs/${fineTuningJobId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FineTuningJob),
          orElse: unexpectedStatus
        }))
      ),
    "cancelFineTuningJob": (fineTuningJobId) =>
      HttpClientRequest.post(`/fine_tuning/jobs/${fineTuningJobId}/cancel`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FineTuningJob),
          orElse: unexpectedStatus
        }))
      ),
    "listFineTuningJobCheckpoints": (fineTuningJobId, options) =>
      HttpClientRequest.get(`/fine_tuning/jobs/${fineTuningJobId}/checkpoints`).pipe(
        HttpClientRequest.setUrlParams({ "after": options?.["after"] as any, "limit": options?.["limit"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListFineTuningJobCheckpointsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listFineTuningEvents": (fineTuningJobId, options) =>
      HttpClientRequest.get(`/fine_tuning/jobs/${fineTuningJobId}/events`).pipe(
        HttpClientRequest.setUrlParams({ "after": options?.["after"] as any, "limit": options?.["limit"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListFineTuningJobEventsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "pauseFineTuningJob": (fineTuningJobId) =>
      HttpClientRequest.post(`/fine_tuning/jobs/${fineTuningJobId}/pause`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FineTuningJob),
          orElse: unexpectedStatus
        }))
      ),
    "resumeFineTuningJob": (fineTuningJobId) =>
      HttpClientRequest.post(`/fine_tuning/jobs/${fineTuningJobId}/resume`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FineTuningJob),
          orElse: unexpectedStatus
        }))
      ),
    "createImageEdit": (options) =>
      HttpClientRequest.post(`/images/edits`).pipe(
        HttpClientRequest.bodyFormDataRecord(options as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ImagesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createImage": (options) =>
      HttpClientRequest.post(`/images/generations`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ImagesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createImageVariation": (options) =>
      HttpClientRequest.post(`/images/variations`).pipe(
        HttpClientRequest.bodyFormDataRecord(options as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ImagesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listModels": () =>
      HttpClientRequest.get(`/models`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListModelsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveModel": (model) =>
      HttpClientRequest.get(`/models/${model}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Model),
          orElse: unexpectedStatus
        }))
      ),
    "deleteModel": (model) =>
      HttpClientRequest.del(`/models/${model}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteModelResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createModeration": (options) =>
      HttpClientRequest.post(`/moderations`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateModerationResponse),
          orElse: unexpectedStatus
        }))
      ),
    "adminApiKeysList": (options) =>
      HttpClientRequest.get(`/organization/admin_api_keys`).pipe(
        HttpClientRequest.setUrlParams({
          "after": options?.["after"] as any,
          "order": options?.["order"] as any,
          "limit": options?.["limit"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ApiKeyList),
          orElse: unexpectedStatus
        }))
      ),
    "adminApiKeysCreate": (options) =>
      HttpClientRequest.post(`/organization/admin_api_keys`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(AdminApiKey),
          orElse: unexpectedStatus
        }))
      ),
    "adminApiKeysGet": (keyId) =>
      HttpClientRequest.get(`/organization/admin_api_keys/${keyId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(AdminApiKey),
          orElse: unexpectedStatus
        }))
      ),
    "adminApiKeysDelete": (keyId) =>
      HttpClientRequest.del(`/organization/admin_api_keys/${keyId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(AdminApiKeysDelete200),
          orElse: unexpectedStatus
        }))
      ),
    "listAuditLogs": (options) =>
      HttpClientRequest.get(`/organization/audit_logs`).pipe(
        HttpClientRequest.setUrlParams({
          "effective_at[gt]": options?.["effective_at[gt]"] as any,
          "effective_at[gte]": options?.["effective_at[gte]"] as any,
          "effective_at[lt]": options?.["effective_at[lt]"] as any,
          "effective_at[lte]": options?.["effective_at[lte]"] as any,
          "project_ids[]": options?.["project_ids[]"] as any,
          "event_types[]": options?.["event_types[]"] as any,
          "actor_ids[]": options?.["actor_ids[]"] as any,
          "actor_emails[]": options?.["actor_emails[]"] as any,
          "resource_ids[]": options?.["resource_ids[]"] as any,
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListAuditLogsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listOrganizationCertificates": (options) =>
      HttpClientRequest.get(`/organization/certificates`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListCertificatesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "uploadCertificate": (options) =>
      HttpClientRequest.post(`/organization/certificates`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Certificate),
          orElse: unexpectedStatus
        }))
      ),
    "activateOrganizationCertificates": (options) =>
      HttpClientRequest.post(`/organization/certificates/activate`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListCertificatesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "deactivateOrganizationCertificates": (options) =>
      HttpClientRequest.post(`/organization/certificates/deactivate`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListCertificatesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getCertificate": (certificateId, options) =>
      HttpClientRequest.get(`/organization/certificates/${certificateId}`).pipe(
        HttpClientRequest.setUrlParams({ "include": options?.["include"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Certificate),
          orElse: unexpectedStatus
        }))
      ),
    "modifyCertificate": (certificateId, options) =>
      HttpClientRequest.post(`/organization/certificates/${certificateId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Certificate),
          orElse: unexpectedStatus
        }))
      ),
    "deleteCertificate": (certificateId) =>
      HttpClientRequest.del(`/organization/certificates/${certificateId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteCertificateResponse),
          orElse: unexpectedStatus
        }))
      ),
    "usageCosts": (options) =>
      HttpClientRequest.get(`/organization/costs`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options?.["start_time"] as any,
          "end_time": options?.["end_time"] as any,
          "bucket_width": options?.["bucket_width"] as any,
          "project_ids": options?.["project_ids"] as any,
          "group_by": options?.["group_by"] as any,
          "limit": options?.["limit"] as any,
          "page": options?.["page"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UsageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listGroups": (options) =>
      HttpClientRequest.get(`/organization/groups`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GroupListResource),
          orElse: unexpectedStatus
        }))
      ),
    "createGroup": (options) =>
      HttpClientRequest.post(`/organization/groups`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GroupResponse),
          orElse: unexpectedStatus
        }))
      ),
    "updateGroup": (groupId, options) =>
      HttpClientRequest.post(`/organization/groups/${groupId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GroupResourceWithSuccess),
          orElse: unexpectedStatus
        }))
      ),
    "deleteGroup": (groupId) =>
      HttpClientRequest.del(`/organization/groups/${groupId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GroupDeletedResource),
          orElse: unexpectedStatus
        }))
      ),
    "listGroupRoleAssignments": (groupId, options) =>
      HttpClientRequest.get(`/organization/groups/${groupId}/roles`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RoleListResource),
          orElse: unexpectedStatus
        }))
      ),
    "assignGroupRole": (groupId, options) =>
      HttpClientRequest.post(`/organization/groups/${groupId}/roles`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GroupRoleAssignment),
          orElse: unexpectedStatus
        }))
      ),
    "unassignGroupRole": (groupId, roleId) =>
      HttpClientRequest.del(`/organization/groups/${groupId}/roles/${roleId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeletedRoleAssignmentResource),
          orElse: unexpectedStatus
        }))
      ),
    "listGroupUsers": (groupId, options) =>
      HttpClientRequest.get(`/organization/groups/${groupId}/users`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UserListResource),
          orElse: unexpectedStatus
        }))
      ),
    "addGroupUser": (groupId, options) =>
      HttpClientRequest.post(`/organization/groups/${groupId}/users`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GroupUserAssignment),
          orElse: unexpectedStatus
        }))
      ),
    "removeGroupUser": (groupId, userId) =>
      HttpClientRequest.del(`/organization/groups/${groupId}/users/${userId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GroupUserDeletedResource),
          orElse: unexpectedStatus
        }))
      ),
    "listInvites": (options) =>
      HttpClientRequest.get(`/organization/invites`).pipe(
        HttpClientRequest.setUrlParams({ "limit": options?.["limit"] as any, "after": options?.["after"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(InviteListResponse),
          orElse: unexpectedStatus
        }))
      ),
    "inviteUser": (options) =>
      HttpClientRequest.post(`/organization/invites`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Invite),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveInvite": (inviteId) =>
      HttpClientRequest.get(`/organization/invites/${inviteId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Invite),
          orElse: unexpectedStatus
        }))
      ),
    "deleteInvite": (inviteId) =>
      HttpClientRequest.del(`/organization/invites/${inviteId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(InviteDeleteResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listProjects": (options) =>
      HttpClientRequest.get(`/organization/projects`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "include_archived": options?.["include_archived"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectListResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createProject": (options) =>
      HttpClientRequest.post(`/organization/projects`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Project),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveProject": (projectId) =>
      HttpClientRequest.get(`/organization/projects/${projectId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Project),
          orElse: unexpectedStatus
        }))
      ),
    "modifyProject": (projectId, options) =>
      HttpClientRequest.post(`/organization/projects/${projectId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Project),
          "400": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listProjectApiKeys": (projectId, options) =>
      HttpClientRequest.get(`/organization/projects/${projectId}/api_keys`).pipe(
        HttpClientRequest.setUrlParams({ "limit": options?.["limit"] as any, "after": options?.["after"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectApiKeyListResponse),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveProjectApiKey": (projectId, keyId) =>
      HttpClientRequest.get(`/organization/projects/${projectId}/api_keys/${keyId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectApiKey),
          orElse: unexpectedStatus
        }))
      ),
    "deleteProjectApiKey": (projectId, keyId) =>
      HttpClientRequest.del(`/organization/projects/${projectId}/api_keys/${keyId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectApiKeyDeleteResponse),
          "400": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "archiveProject": (projectId) =>
      HttpClientRequest.post(`/organization/projects/${projectId}/archive`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Project),
          orElse: unexpectedStatus
        }))
      ),
    "listProjectCertificates": (projectId, options) =>
      HttpClientRequest.get(`/organization/projects/${projectId}/certificates`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListCertificatesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "activateProjectCertificates": (projectId, options) =>
      HttpClientRequest.post(`/organization/projects/${projectId}/certificates/activate`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListCertificatesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "deactivateProjectCertificates": (projectId, options) =>
      HttpClientRequest.post(`/organization/projects/${projectId}/certificates/deactivate`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListCertificatesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listProjectGroups": (projectId, options) =>
      HttpClientRequest.get(`/organization/projects/${projectId}/groups`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectGroupListResource),
          orElse: unexpectedStatus
        }))
      ),
    "addProjectGroup": (projectId, options) =>
      HttpClientRequest.post(`/organization/projects/${projectId}/groups`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectGroup),
          orElse: unexpectedStatus
        }))
      ),
    "removeProjectGroup": (projectId, groupId) =>
      HttpClientRequest.del(`/organization/projects/${projectId}/groups/${groupId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectGroupDeletedResource),
          orElse: unexpectedStatus
        }))
      ),
    "listProjectRateLimits": (projectId, options) =>
      HttpClientRequest.get(`/organization/projects/${projectId}/rate_limits`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectRateLimitListResponse),
          orElse: unexpectedStatus
        }))
      ),
    "updateProjectRateLimits": (projectId, rateLimitId, options) =>
      HttpClientRequest.post(`/organization/projects/${projectId}/rate_limits/${rateLimitId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectRateLimit),
          "400": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listProjectServiceAccounts": (projectId, options) =>
      HttpClientRequest.get(`/organization/projects/${projectId}/service_accounts`).pipe(
        HttpClientRequest.setUrlParams({ "limit": options?.["limit"] as any, "after": options?.["after"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectServiceAccountListResponse),
          "400": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createProjectServiceAccount": (projectId, options) =>
      HttpClientRequest.post(`/organization/projects/${projectId}/service_accounts`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectServiceAccountCreateResponse),
          "400": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveProjectServiceAccount": (projectId, serviceAccountId) =>
      HttpClientRequest.get(`/organization/projects/${projectId}/service_accounts/${serviceAccountId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectServiceAccount),
          orElse: unexpectedStatus
        }))
      ),
    "deleteProjectServiceAccount": (projectId, serviceAccountId) =>
      HttpClientRequest.del(`/organization/projects/${projectId}/service_accounts/${serviceAccountId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectServiceAccountDeleteResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listProjectUsers": (projectId, options) =>
      HttpClientRequest.get(`/organization/projects/${projectId}/users`).pipe(
        HttpClientRequest.setUrlParams({ "limit": options?.["limit"] as any, "after": options?.["after"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectUserListResponse),
          "400": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createProjectUser": (projectId, options) =>
      HttpClientRequest.post(`/organization/projects/${projectId}/users`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectUser),
          "400": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveProjectUser": (projectId, userId) =>
      HttpClientRequest.get(`/organization/projects/${projectId}/users/${userId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectUser),
          orElse: unexpectedStatus
        }))
      ),
    "modifyProjectUser": (projectId, userId, options) =>
      HttpClientRequest.post(`/organization/projects/${projectId}/users/${userId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectUser),
          "400": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "deleteProjectUser": (projectId, userId) =>
      HttpClientRequest.del(`/organization/projects/${projectId}/users/${userId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ProjectUserDeleteResponse),
          "400": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listRoles": (options) =>
      HttpClientRequest.get(`/organization/roles`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(PublicRoleListResource),
          orElse: unexpectedStatus
        }))
      ),
    "createRole": (options) =>
      HttpClientRequest.post(`/organization/roles`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Role),
          orElse: unexpectedStatus
        }))
      ),
    "updateRole": (roleId, options) =>
      HttpClientRequest.post(`/organization/roles/${roleId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Role),
          orElse: unexpectedStatus
        }))
      ),
    "deleteRole": (roleId) =>
      HttpClientRequest.del(`/organization/roles/${roleId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RoleDeletedResource),
          orElse: unexpectedStatus
        }))
      ),
    "usageAudioSpeeches": (options) =>
      HttpClientRequest.get(`/organization/usage/audio_speeches`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options?.["start_time"] as any,
          "end_time": options?.["end_time"] as any,
          "bucket_width": options?.["bucket_width"] as any,
          "project_ids": options?.["project_ids"] as any,
          "user_ids": options?.["user_ids"] as any,
          "api_key_ids": options?.["api_key_ids"] as any,
          "models": options?.["models"] as any,
          "group_by": options?.["group_by"] as any,
          "limit": options?.["limit"] as any,
          "page": options?.["page"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UsageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "usageAudioTranscriptions": (options) =>
      HttpClientRequest.get(`/organization/usage/audio_transcriptions`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options?.["start_time"] as any,
          "end_time": options?.["end_time"] as any,
          "bucket_width": options?.["bucket_width"] as any,
          "project_ids": options?.["project_ids"] as any,
          "user_ids": options?.["user_ids"] as any,
          "api_key_ids": options?.["api_key_ids"] as any,
          "models": options?.["models"] as any,
          "group_by": options?.["group_by"] as any,
          "limit": options?.["limit"] as any,
          "page": options?.["page"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UsageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "usageCodeInterpreterSessions": (options) =>
      HttpClientRequest.get(`/organization/usage/code_interpreter_sessions`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options?.["start_time"] as any,
          "end_time": options?.["end_time"] as any,
          "bucket_width": options?.["bucket_width"] as any,
          "project_ids": options?.["project_ids"] as any,
          "group_by": options?.["group_by"] as any,
          "limit": options?.["limit"] as any,
          "page": options?.["page"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UsageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "usageCompletions": (options) =>
      HttpClientRequest.get(`/organization/usage/completions`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options?.["start_time"] as any,
          "end_time": options?.["end_time"] as any,
          "bucket_width": options?.["bucket_width"] as any,
          "project_ids": options?.["project_ids"] as any,
          "user_ids": options?.["user_ids"] as any,
          "api_key_ids": options?.["api_key_ids"] as any,
          "models": options?.["models"] as any,
          "batch": options?.["batch"] as any,
          "group_by": options?.["group_by"] as any,
          "limit": options?.["limit"] as any,
          "page": options?.["page"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UsageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "usageEmbeddings": (options) =>
      HttpClientRequest.get(`/organization/usage/embeddings`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options?.["start_time"] as any,
          "end_time": options?.["end_time"] as any,
          "bucket_width": options?.["bucket_width"] as any,
          "project_ids": options?.["project_ids"] as any,
          "user_ids": options?.["user_ids"] as any,
          "api_key_ids": options?.["api_key_ids"] as any,
          "models": options?.["models"] as any,
          "group_by": options?.["group_by"] as any,
          "limit": options?.["limit"] as any,
          "page": options?.["page"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UsageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "usageImages": (options) =>
      HttpClientRequest.get(`/organization/usage/images`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options?.["start_time"] as any,
          "end_time": options?.["end_time"] as any,
          "bucket_width": options?.["bucket_width"] as any,
          "sources": options?.["sources"] as any,
          "sizes": options?.["sizes"] as any,
          "project_ids": options?.["project_ids"] as any,
          "user_ids": options?.["user_ids"] as any,
          "api_key_ids": options?.["api_key_ids"] as any,
          "models": options?.["models"] as any,
          "group_by": options?.["group_by"] as any,
          "limit": options?.["limit"] as any,
          "page": options?.["page"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UsageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "usageModerations": (options) =>
      HttpClientRequest.get(`/organization/usage/moderations`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options?.["start_time"] as any,
          "end_time": options?.["end_time"] as any,
          "bucket_width": options?.["bucket_width"] as any,
          "project_ids": options?.["project_ids"] as any,
          "user_ids": options?.["user_ids"] as any,
          "api_key_ids": options?.["api_key_ids"] as any,
          "models": options?.["models"] as any,
          "group_by": options?.["group_by"] as any,
          "limit": options?.["limit"] as any,
          "page": options?.["page"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UsageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "usageVectorStores": (options) =>
      HttpClientRequest.get(`/organization/usage/vector_stores`).pipe(
        HttpClientRequest.setUrlParams({
          "start_time": options?.["start_time"] as any,
          "end_time": options?.["end_time"] as any,
          "bucket_width": options?.["bucket_width"] as any,
          "project_ids": options?.["project_ids"] as any,
          "group_by": options?.["group_by"] as any,
          "limit": options?.["limit"] as any,
          "page": options?.["page"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UsageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listUsers": (options) =>
      HttpClientRequest.get(`/organization/users`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "emails": options?.["emails"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UserListResponse),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveUser": (userId) =>
      HttpClientRequest.get(`/organization/users/${userId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(User),
          orElse: unexpectedStatus
        }))
      ),
    "modifyUser": (userId, options) =>
      HttpClientRequest.post(`/organization/users/${userId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(User),
          orElse: unexpectedStatus
        }))
      ),
    "deleteUser": (userId) =>
      HttpClientRequest.del(`/organization/users/${userId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UserDeleteResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listUserRoleAssignments": (userId, options) =>
      HttpClientRequest.get(`/organization/users/${userId}/roles`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RoleListResource),
          orElse: unexpectedStatus
        }))
      ),
    "assignUserRole": (userId, options) =>
      HttpClientRequest.post(`/organization/users/${userId}/roles`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UserRoleAssignment),
          orElse: unexpectedStatus
        }))
      ),
    "unassignUserRole": (userId, roleId) =>
      HttpClientRequest.del(`/organization/users/${userId}/roles/${roleId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeletedRoleAssignmentResource),
          orElse: unexpectedStatus
        }))
      ),
    "listProjectGroupRoleAssignments": (projectId, groupId, options) =>
      HttpClientRequest.get(`/projects/${projectId}/groups/${groupId}/roles`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RoleListResource),
          orElse: unexpectedStatus
        }))
      ),
    "assignProjectGroupRole": (projectId, groupId, options) =>
      HttpClientRequest.post(`/projects/${projectId}/groups/${groupId}/roles`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GroupRoleAssignment),
          orElse: unexpectedStatus
        }))
      ),
    "unassignProjectGroupRole": (projectId, groupId, roleId) =>
      HttpClientRequest.del(`/projects/${projectId}/groups/${groupId}/roles/${roleId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeletedRoleAssignmentResource),
          orElse: unexpectedStatus
        }))
      ),
    "listProjectRoles": (projectId, options) =>
      HttpClientRequest.get(`/projects/${projectId}/roles`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(PublicRoleListResource),
          orElse: unexpectedStatus
        }))
      ),
    "createProjectRole": (projectId, options) =>
      HttpClientRequest.post(`/projects/${projectId}/roles`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Role),
          orElse: unexpectedStatus
        }))
      ),
    "updateProjectRole": (projectId, roleId, options) =>
      HttpClientRequest.post(`/projects/${projectId}/roles/${roleId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Role),
          orElse: unexpectedStatus
        }))
      ),
    "deleteProjectRole": (projectId, roleId) =>
      HttpClientRequest.del(`/projects/${projectId}/roles/${roleId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RoleDeletedResource),
          orElse: unexpectedStatus
        }))
      ),
    "listProjectUserRoleAssignments": (projectId, userId, options) =>
      HttpClientRequest.get(`/projects/${projectId}/users/${userId}/roles`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "after": options?.["after"] as any,
          "order": options?.["order"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RoleListResource),
          orElse: unexpectedStatus
        }))
      ),
    "assignProjectUserRole": (projectId, userId, options) =>
      HttpClientRequest.post(`/projects/${projectId}/users/${userId}/roles`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UserRoleAssignment),
          orElse: unexpectedStatus
        }))
      ),
    "unassignProjectUserRole": (projectId, userId, roleId) =>
      HttpClientRequest.del(`/projects/${projectId}/users/${userId}/roles/${roleId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeletedRoleAssignmentResource),
          orElse: unexpectedStatus
        }))
      ),
    "createRealtimeCall": (options) =>
      HttpClientRequest.post(`/realtime/calls`).pipe(
        HttpClientRequest.bodyFormDataRecord(options as any),
        withResponse(HttpClientResponse.matchStatus({
          orElse: unexpectedStatus
        }))
      ),
    "acceptRealtimeCall": (callId, options) =>
      HttpClientRequest.post(`/realtime/calls/${callId}/accept`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "200": () => Effect.void,
          orElse: unexpectedStatus
        }))
      ),
    "hangupRealtimeCall": (callId) =>
      HttpClientRequest.post(`/realtime/calls/${callId}/hangup`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "200": () => Effect.void,
          orElse: unexpectedStatus
        }))
      ),
    "referRealtimeCall": (callId, options) =>
      HttpClientRequest.post(`/realtime/calls/${callId}/refer`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "200": () => Effect.void,
          orElse: unexpectedStatus
        }))
      ),
    "rejectRealtimeCall": (callId, options) =>
      HttpClientRequest.post(`/realtime/calls/${callId}/reject`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "200": () => Effect.void,
          orElse: unexpectedStatus
        }))
      ),
    "createRealtimeClientSecret": (options) =>
      HttpClientRequest.post(`/realtime/client_secrets`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RealtimeCreateClientSecretResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createRealtimeSession": (options) =>
      HttpClientRequest.post(`/realtime/sessions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RealtimeSessionCreateResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createRealtimeTranscriptionSession": (options) =>
      HttpClientRequest.post(`/realtime/transcription_sessions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RealtimeTranscriptionSessionCreateResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createResponse": (options) =>
      HttpClientRequest.post(`/responses`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Response),
          orElse: unexpectedStatus
        }))
      ),
    "getResponse": (responseId, options) =>
      HttpClientRequest.get(`/responses/${responseId}`).pipe(
        HttpClientRequest.setUrlParams({
          "include": options?.["include"] as any,
          "stream": options?.["stream"] as any,
          "starting_after": options?.["starting_after"] as any,
          "include_obfuscation": options?.["include_obfuscation"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Response),
          orElse: unexpectedStatus
        }))
      ),
    "deleteResponse": (responseId) =>
      HttpClientRequest.del(`/responses/${responseId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "404": decodeError("Error", Error),
          "200": () => Effect.void,
          orElse: unexpectedStatus
        }))
      ),
    "cancelResponse": (responseId) =>
      HttpClientRequest.post(`/responses/${responseId}/cancel`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Response),
          "404": decodeError("Error", Error),
          orElse: unexpectedStatus
        }))
      ),
    "listInputItems": (responseId, options) =>
      HttpClientRequest.get(`/responses/${responseId}/input_items`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "include": options?.["include"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ResponseItemList),
          orElse: unexpectedStatus
        }))
      ),
    "createThread": (options) =>
      HttpClientRequest.post(`/threads`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ThreadObject),
          orElse: unexpectedStatus
        }))
      ),
    "createThreadAndRun": (options) =>
      HttpClientRequest.post(`/threads/runs`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RunObject),
          orElse: unexpectedStatus
        }))
      ),
    "getThread": (threadId) =>
      HttpClientRequest.get(`/threads/${threadId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ThreadObject),
          orElse: unexpectedStatus
        }))
      ),
    "modifyThread": (threadId, options) =>
      HttpClientRequest.post(`/threads/${threadId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ThreadObject),
          orElse: unexpectedStatus
        }))
      ),
    "deleteThread": (threadId) =>
      HttpClientRequest.del(`/threads/${threadId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteThreadResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listMessages": (threadId, options) =>
      HttpClientRequest.get(`/threads/${threadId}/messages`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any,
          "run_id": options?.["run_id"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListMessagesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createMessage": (threadId, options) =>
      HttpClientRequest.post(`/threads/${threadId}/messages`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(MessageObject),
          orElse: unexpectedStatus
        }))
      ),
    "getMessage": (threadId, messageId) =>
      HttpClientRequest.get(`/threads/${threadId}/messages/${messageId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(MessageObject),
          orElse: unexpectedStatus
        }))
      ),
    "modifyMessage": (threadId, messageId, options) =>
      HttpClientRequest.post(`/threads/${threadId}/messages/${messageId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(MessageObject),
          orElse: unexpectedStatus
        }))
      ),
    "deleteMessage": (threadId, messageId) =>
      HttpClientRequest.del(`/threads/${threadId}/messages/${messageId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteMessageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listRuns": (threadId, options) =>
      HttpClientRequest.get(`/threads/${threadId}/runs`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListRunsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createRun": (threadId, options) =>
      HttpClientRequest.post(`/threads/${threadId}/runs`).pipe(
        HttpClientRequest.setUrlParams({ "include[]": options.params?.["include[]"] as any }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RunObject),
          orElse: unexpectedStatus
        }))
      ),
    "getRun": (threadId, runId) =>
      HttpClientRequest.get(`/threads/${threadId}/runs/${runId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RunObject),
          orElse: unexpectedStatus
        }))
      ),
    "modifyRun": (threadId, runId, options) =>
      HttpClientRequest.post(`/threads/${threadId}/runs/${runId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RunObject),
          orElse: unexpectedStatus
        }))
      ),
    "cancelRun": (threadId, runId) =>
      HttpClientRequest.post(`/threads/${threadId}/runs/${runId}/cancel`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RunObject),
          orElse: unexpectedStatus
        }))
      ),
    "listRunSteps": (threadId, runId, options) =>
      HttpClientRequest.get(`/threads/${threadId}/runs/${runId}/steps`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any,
          "include[]": options?.["include[]"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListRunStepsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getRunStep": (threadId, runId, stepId, options) =>
      HttpClientRequest.get(`/threads/${threadId}/runs/${runId}/steps/${stepId}`).pipe(
        HttpClientRequest.setUrlParams({ "include[]": options?.["include[]"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RunStepObject),
          orElse: unexpectedStatus
        }))
      ),
    "submitToolOuputsToRun": (threadId, runId, options) =>
      HttpClientRequest.post(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RunObject),
          orElse: unexpectedStatus
        }))
      ),
    "createUpload": (options) =>
      HttpClientRequest.post(`/uploads`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Upload),
          orElse: unexpectedStatus
        }))
      ),
    "cancelUpload": (uploadId) =>
      HttpClientRequest.post(`/uploads/${uploadId}/cancel`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Upload),
          orElse: unexpectedStatus
        }))
      ),
    "completeUpload": (uploadId, options) =>
      HttpClientRequest.post(`/uploads/${uploadId}/complete`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Upload),
          orElse: unexpectedStatus
        }))
      ),
    "addUploadPart": (uploadId, options) =>
      HttpClientRequest.post(`/uploads/${uploadId}/parts`).pipe(
        HttpClientRequest.bodyFormDataRecord(options as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UploadPart),
          orElse: unexpectedStatus
        }))
      ),
    "listVectorStores": (options) =>
      HttpClientRequest.get(`/vector_stores`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListVectorStoresResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createVectorStore": (options) =>
      HttpClientRequest.post(`/vector_stores`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreObject),
          orElse: unexpectedStatus
        }))
      ),
    "getVectorStore": (vectorStoreId) =>
      HttpClientRequest.get(`/vector_stores/${vectorStoreId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreObject),
          orElse: unexpectedStatus
        }))
      ),
    "modifyVectorStore": (vectorStoreId, options) =>
      HttpClientRequest.post(`/vector_stores/${vectorStoreId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreObject),
          orElse: unexpectedStatus
        }))
      ),
    "deleteVectorStore": (vectorStoreId) =>
      HttpClientRequest.del(`/vector_stores/${vectorStoreId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteVectorStoreResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createVectorStoreFileBatch": (vectorStoreId, options) =>
      HttpClientRequest.post(`/vector_stores/${vectorStoreId}/file_batches`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreFileBatchObject),
          orElse: unexpectedStatus
        }))
      ),
    "getVectorStoreFileBatch": (vectorStoreId, batchId) =>
      HttpClientRequest.get(`/vector_stores/${vectorStoreId}/file_batches/${batchId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreFileBatchObject),
          orElse: unexpectedStatus
        }))
      ),
    "cancelVectorStoreFileBatch": (vectorStoreId, batchId) =>
      HttpClientRequest.post(`/vector_stores/${vectorStoreId}/file_batches/${batchId}/cancel`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreFileBatchObject),
          orElse: unexpectedStatus
        }))
      ),
    "listFilesInVectorStoreBatch": (vectorStoreId, batchId, options) =>
      HttpClientRequest.get(`/vector_stores/${vectorStoreId}/file_batches/${batchId}/files`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any,
          "filter": options?.["filter"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListVectorStoreFilesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listVectorStoreFiles": (vectorStoreId, options) =>
      HttpClientRequest.get(`/vector_stores/${vectorStoreId}/files`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any,
          "filter": options?.["filter"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListVectorStoreFilesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createVectorStoreFile": (vectorStoreId, options) =>
      HttpClientRequest.post(`/vector_stores/${vectorStoreId}/files`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreFileObject),
          orElse: unexpectedStatus
        }))
      ),
    "getVectorStoreFile": (vectorStoreId, fileId) =>
      HttpClientRequest.get(`/vector_stores/${vectorStoreId}/files/${fileId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreFileObject),
          orElse: unexpectedStatus
        }))
      ),
    "updateVectorStoreFileAttributes": (vectorStoreId, fileId, options) =>
      HttpClientRequest.post(`/vector_stores/${vectorStoreId}/files/${fileId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreFileObject),
          orElse: unexpectedStatus
        }))
      ),
    "deleteVectorStoreFile": (vectorStoreId, fileId) =>
      HttpClientRequest.del(`/vector_stores/${vectorStoreId}/files/${fileId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteVectorStoreFileResponse),
          orElse: unexpectedStatus
        }))
      ),
    "retrieveVectorStoreFileContent": (vectorStoreId, fileId) =>
      HttpClientRequest.get(`/vector_stores/${vectorStoreId}/files/${fileId}/content`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreFileContentResponse),
          orElse: unexpectedStatus
        }))
      ),
    "searchVectorStore": (vectorStoreId, options) =>
      HttpClientRequest.post(`/vector_stores/${vectorStoreId}/search`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VectorStoreSearchResultsPage),
          orElse: unexpectedStatus
        }))
      ),
    "createConversation": (options) =>
      HttpClientRequest.post(`/conversations`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ConversationResource),
          orElse: unexpectedStatus
        }))
      ),
    "getConversation": (conversationId) =>
      HttpClientRequest.get(`/conversations/${conversationId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ConversationResource),
          orElse: unexpectedStatus
        }))
      ),
    "updateConversation": (conversationId, options) =>
      HttpClientRequest.post(`/conversations/${conversationId}`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ConversationResource),
          orElse: unexpectedStatus
        }))
      ),
    "deleteConversation": (conversationId) =>
      HttpClientRequest.del(`/conversations/${conversationId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeletedConversationResource),
          orElse: unexpectedStatus
        }))
      ),
    "ListVideos": (options) =>
      HttpClientRequest.get(`/videos`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VideoListResource),
          orElse: unexpectedStatus
        }))
      ),
    "createVideo": (options) =>
      HttpClientRequest.post(`/videos`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VideoResource),
          orElse: unexpectedStatus
        }))
      ),
    "GetVideo": (videoId) =>
      HttpClientRequest.get(`/videos/${videoId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VideoResource),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteVideo": (videoId) =>
      HttpClientRequest.del(`/videos/${videoId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeletedVideoResource),
          orElse: unexpectedStatus
        }))
      ),
    "RetrieveVideoContent": (videoId, options) =>
      HttpClientRequest.get(`/videos/${videoId}/content`).pipe(
        HttpClientRequest.setUrlParams({ "variant": options?.["variant"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(RetrieveVideoContent200),
          orElse: unexpectedStatus
        }))
      ),
    "CreateVideoRemix": (videoId, options) =>
      HttpClientRequest.post(`/videos/${videoId}/remix`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(VideoResource),
          orElse: unexpectedStatus
        }))
      ),
    "Getinputtokencounts": (options) =>
      HttpClientRequest.post(`/responses/input_tokens`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(TokenCountsResource),
          orElse: unexpectedStatus
        }))
      ),
    "CancelChatSessionMethod": (sessionId) =>
      HttpClientRequest.post(`/chatkit/sessions/${sessionId}/cancel`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ChatSessionResource),
          orElse: unexpectedStatus
        }))
      ),
    "CreateChatSessionMethod": (options) =>
      HttpClientRequest.post(`/chatkit/sessions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ChatSessionResource),
          orElse: unexpectedStatus
        }))
      ),
    "ListThreadItemsMethod": (threadId, options) =>
      HttpClientRequest.get(`/chatkit/threads/${threadId}/items`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ThreadItemListResource),
          orElse: unexpectedStatus
        }))
      ),
    "GetThreadMethod": (threadId) =>
      HttpClientRequest.get(`/chatkit/threads/${threadId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ThreadResource),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteThreadMethod": (threadId) =>
      HttpClientRequest.del(`/chatkit/threads/${threadId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeletedThreadResource),
          orElse: unexpectedStatus
        }))
      ),
    "ListThreadsMethod": (options) =>
      HttpClientRequest.get(`/chatkit/threads`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any,
          "user": options?.["user"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ThreadListResource),
          orElse: unexpectedStatus
        }))
      )
  }
}

export interface Client {
  readonly httpClient: HttpClient.HttpClient
  /**
   * Returns a list of assistants.
   */
  readonly "listAssistants": (
    options?: typeof ListAssistantsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListAssistantsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create an assistant with a model and instructions.
   */
  readonly "createAssistant": (
    options: typeof CreateAssistantRequest.Encoded
  ) => Effect.Effect<typeof AssistantObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves an assistant.
   */
  readonly "getAssistant": (
    assistantId: string
  ) => Effect.Effect<typeof AssistantObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modifies an assistant.
   */
  readonly "modifyAssistant": (
    assistantId: string,
    options: typeof ModifyAssistantRequest.Encoded
  ) => Effect.Effect<typeof AssistantObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete an assistant.
   */
  readonly "deleteAssistant": (
    assistantId: string
  ) => Effect.Effect<typeof DeleteAssistantResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates audio from the input text.
   */
  readonly "createSpeech": (
    options: typeof CreateSpeechRequest.Encoded
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * Transcribes audio into the input language.
   */
  readonly "createTranscription": (
    options: typeof CreateTranscriptionRequest.Encoded
  ) => Effect.Effect<typeof CreateTranscription200.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Translates audio into English.
   */
  readonly "createTranslation": (
    options: typeof CreateTranslationRequest.Encoded
  ) => Effect.Effect<typeof CreateTranslation200.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List your organization's batches.
   */
  readonly "listBatches": (
    options?: typeof ListBatchesParams.Encoded | undefined
  ) => Effect.Effect<typeof ListBatchesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates and executes a batch from an uploaded file of requests
   */
  readonly "createBatch": (
    options: typeof CreateBatchRequest.Encoded
  ) => Effect.Effect<typeof Batch.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a batch.
   */
  readonly "retrieveBatch": (
    batchId: string
  ) => Effect.Effect<typeof Batch.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Cancels an in-progress batch. The batch will be in status `cancelling` for up to 10 minutes, before changing to `cancelled`, where it will have partial results (if any) available in the output file.
   */
  readonly "cancelBatch": (
    batchId: string
  ) => Effect.Effect<typeof Batch.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List stored Chat Completions. Only Chat Completions that have been stored
   * with the `store` parameter set to `true` will be returned.
   */
  readonly "listChatCompletions": (
    options?: typeof ListChatCompletionsParams.Encoded | undefined
  ) => Effect.Effect<typeof ChatCompletionList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * **Starting a new project?** We recommend trying [Responses](https://platform.openai.com/docs/api-reference/responses)
   * to take advantage of the latest OpenAI platform features. Compare
   * [Chat Completions with Responses](https://platform.openai.com/docs/guides/responses-vs-chat-completions?api-mode=responses).
   *
   * ---
   *
   * Creates a model response for the given chat conversation. Learn more in the
   * [text generation](https://platform.openai.com/docs/guides/text-generation), [vision](https://platform.openai.com/docs/guides/vision),
   * and [audio](https://platform.openai.com/docs/guides/audio) guides.
   *
   * Parameter support can differ depending on the model used to generate the
   * response, particularly for newer reasoning models. Parameters that are only
   * supported for reasoning models are noted below. For the current state of
   * unsupported parameters in reasoning models,
   * [refer to the reasoning guide](https://platform.openai.com/docs/guides/reasoning).
   */
  readonly "createChatCompletion": (
    options: typeof CreateChatCompletionRequest.Encoded
  ) => Effect.Effect<typeof CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` will be returned.
   */
  readonly "getChatCompletion": (
    completionId: string
  ) => Effect.Effect<typeof CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modify a stored chat completion. Only Chat Completions that have been
   * created with the `store` parameter set to `true` can be modified. Currently,
   * the only supported modification is to update the `metadata` field.
   */
  readonly "updateChatCompletion": (
    completionId: string,
    options: typeof UpdateChatCompletionRequest.Encoded
  ) => Effect.Effect<typeof CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a stored chat completion. Only Chat Completions that have been
   * created with the `store` parameter set to `true` can be deleted.
   */
  readonly "deleteChatCompletion": (
    completionId: string
  ) => Effect.Effect<typeof ChatCompletionDeleted.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get the messages in a stored chat completion. Only Chat Completions that
   * have been created with the `store` parameter set to `true` will be
   * returned.
   */
  readonly "getChatCompletionMessages": (
    completionId: string,
    options?: typeof GetChatCompletionMessagesParams.Encoded | undefined
  ) => Effect.Effect<typeof ChatCompletionMessageList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates a completion for the provided prompt and parameters.
   */
  readonly "createCompletion": (
    options: typeof CreateCompletionRequest.Encoded
  ) => Effect.Effect<typeof CreateCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List Containers
   */
  readonly "ListContainers": (
    options?: typeof ListContainersParams.Encoded | undefined
  ) => Effect.Effect<typeof ContainerListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create Container
   */
  readonly "CreateContainer": (
    options: typeof CreateContainerBody.Encoded
  ) => Effect.Effect<typeof ContainerResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieve Container
   */
  readonly "RetrieveContainer": (
    containerId: string
  ) => Effect.Effect<typeof ContainerResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete Container
   */
  readonly "DeleteContainer": (containerId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * List Container files
   */
  readonly "ListContainerFiles": (
    containerId: string,
    options?: typeof ListContainerFilesParams.Encoded | undefined
  ) => Effect.Effect<typeof ContainerFileListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a Container File
   *
   * You can send either a multipart/form-data request with the raw file content, or a JSON request with a file ID.
   */
  readonly "CreateContainerFile": (
    containerId: string,
    options: typeof CreateContainerFileBody.Encoded
  ) => Effect.Effect<typeof ContainerFileResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieve Container File
   */
  readonly "RetrieveContainerFile": (
    containerId: string,
    fileId: string
  ) => Effect.Effect<typeof ContainerFileResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete Container File
   */
  readonly "DeleteContainerFile": (
    containerId: string,
    fileId: string
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieve Container File Content
   */
  readonly "RetrieveContainerFileContent": (
    containerId: string,
    fileId: string
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * List all items for a conversation with the given ID.
   */
  readonly "listConversationItems": (
    conversationId: string,
    options?: typeof ListConversationItemsParams.Encoded | undefined
  ) => Effect.Effect<typeof ConversationItemList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create items in a conversation with the given ID.
   */
  readonly "createConversationItems": (
    conversationId: string,
    options: {
      readonly params?: typeof CreateConversationItemsParams.Encoded | undefined
      readonly payload: typeof CreateConversationItemsRequest.Encoded
    }
  ) => Effect.Effect<typeof ConversationItemList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get a single item from a conversation with the given IDs.
   */
  readonly "getConversationItem": (
    conversationId: string,
    itemId: string,
    options?: typeof GetConversationItemParams.Encoded | undefined
  ) => Effect.Effect<typeof ConversationItem.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete an item from a conversation with the given IDs.
   */
  readonly "deleteConversationItem": (
    conversationId: string,
    itemId: string
  ) => Effect.Effect<typeof ConversationResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates an embedding vector representing the input text.
   */
  readonly "createEmbedding": (
    options: typeof CreateEmbeddingRequest.Encoded
  ) => Effect.Effect<typeof CreateEmbeddingResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List evaluations for a project.
   */
  readonly "listEvals": (
    options?: typeof ListEvalsParams.Encoded | undefined
  ) => Effect.Effect<typeof EvalList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create the structure of an evaluation that can be used to test a model's performance.
   * An evaluation is a set of testing criteria and the config for a data source, which dictates the schema of the data used in the evaluation. After creating an evaluation, you can run it on different models and model parameters. We support several types of graders and datasources.
   * For more information, see the [Evals guide](https://platform.openai.com/docs/guides/evals).
   */
  readonly "createEval": (
    options: typeof CreateEvalRequest.Encoded
  ) => Effect.Effect<typeof Eval.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get an evaluation by ID.
   */
  readonly "getEval": (evalId: string) => Effect.Effect<typeof Eval.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Update certain properties of an evaluation.
   */
  readonly "updateEval": (
    evalId: string,
    options: typeof UpdateEvalRequest.Encoded
  ) => Effect.Effect<typeof Eval.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete an evaluation.
   */
  readonly "deleteEval": (
    evalId: string
  ) => Effect.Effect<
    typeof DeleteEval200.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"Error", typeof Error.Type>
  >
  /**
   * Get a list of runs for an evaluation.
   */
  readonly "getEvalRuns": (
    evalId: string,
    options?: typeof GetEvalRunsParams.Encoded | undefined
  ) => Effect.Effect<typeof EvalRunList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Kicks off a new run for a given evaluation, specifying the data source, and what model configuration to use to test. The datasource will be validated against the schema specified in the config of the evaluation.
   */
  readonly "createEvalRun": (
    evalId: string,
    options: typeof CreateEvalRunRequest.Encoded
  ) => Effect.Effect<
    typeof EvalRun.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"Error", typeof Error.Type>
  >
  /**
   * Get an evaluation run by ID.
   */
  readonly "getEvalRun": (
    evalId: string,
    runId: string
  ) => Effect.Effect<typeof EvalRun.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Cancel an ongoing evaluation run.
   */
  readonly "cancelEvalRun": (
    evalId: string,
    runId: string
  ) => Effect.Effect<typeof EvalRun.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete an eval run.
   */
  readonly "deleteEvalRun": (
    evalId: string,
    runId: string
  ) => Effect.Effect<
    typeof DeleteEvalRun200.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"Error", typeof Error.Type>
  >
  /**
   * Get a list of output items for an evaluation run.
   */
  readonly "getEvalRunOutputItems": (
    evalId: string,
    runId: string,
    options?: typeof GetEvalRunOutputItemsParams.Encoded | undefined
  ) => Effect.Effect<typeof EvalRunOutputItemList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get an evaluation run output item by ID.
   */
  readonly "getEvalRunOutputItem": (
    evalId: string,
    runId: string,
    outputItemId: string
  ) => Effect.Effect<typeof EvalRunOutputItem.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of files.
   */
  readonly "listFiles": (
    options?: typeof ListFilesParams.Encoded | undefined
  ) => Effect.Effect<typeof ListFilesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Upload a file that can be used across various endpoints. Individual files
   * can be up to 512 MB, and the size of all files uploaded by one organization
   * can be up to 1 TB.
   *
   * - The Assistants API supports files up to 2 million tokens and of specific
   *   file types. See the [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools) for
   *   details.
   * - The Fine-tuning API only supports `.jsonl` files. The input also has
   *   certain required formats for fine-tuning
   *   [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input) or
   *   [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input) models.
   * - The Batch API only supports `.jsonl` files up to 200 MB in size. The input
   *   also has a specific required
   *   [format](https://platform.openai.com/docs/api-reference/batch/request-input).
   *
   * Please [contact us](https://help.openai.com/) if you need to increase these
   * storage limits.
   */
  readonly "createFile": (
    options: typeof CreateFileRequest.Encoded
  ) => Effect.Effect<typeof OpenAIFile.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns information about a specific file.
   */
  readonly "retrieveFile": (
    fileId: string
  ) => Effect.Effect<typeof OpenAIFile.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a file and remove it from all vector stores.
   */
  readonly "deleteFile": (
    fileId: string
  ) => Effect.Effect<typeof DeleteFileResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns the contents of the specified file.
   */
  readonly "downloadFile": (
    fileId: string
  ) => Effect.Effect<typeof DownloadFile200.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Run a grader.
   */
  readonly "runGrader": (
    options: typeof RunGraderRequest.Encoded
  ) => Effect.Effect<typeof RunGraderResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Validate a grader.
   */
  readonly "validateGrader": (
    options: typeof ValidateGraderRequest.Encoded
  ) => Effect.Effect<typeof ValidateGraderResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to view all permissions for a fine-tuned model checkpoint.
   */
  readonly "listFineTuningCheckpointPermissions": (
    fineTunedModelCheckpoint: string,
    options?: typeof ListFineTuningCheckpointPermissionsParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ListFineTuningCheckpointPermissionResponse.Type,
    HttpClientError.HttpClientError | ParseError
  >
  /**
   * **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
   *
   * This enables organization owners to share fine-tuned models with other projects in their organization.
   */
  readonly "createFineTuningCheckpointPermission": (
    fineTunedModelCheckpoint: string,
    options: typeof CreateFineTuningCheckpointPermissionRequest.Encoded
  ) => Effect.Effect<
    typeof ListFineTuningCheckpointPermissionResponse.Type,
    HttpClientError.HttpClientError | ParseError
  >
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to delete a permission for a fine-tuned model checkpoint.
   */
  readonly "deleteFineTuningCheckpointPermission": (
    fineTunedModelCheckpoint: string,
    permissionId: string
  ) => Effect.Effect<
    typeof DeleteFineTuningCheckpointPermissionResponse.Type,
    HttpClientError.HttpClientError | ParseError
  >
  /**
   * List your organization's fine-tuning jobs
   */
  readonly "listPaginatedFineTuningJobs": (
    options?: typeof ListPaginatedFineTuningJobsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListPaginatedFineTuningJobsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates a fine-tuning job which begins the process of creating a new model from a given dataset.
   *
   * Response includes details of the enqueued job including job status and the name of the fine-tuned models once complete.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   */
  readonly "createFineTuningJob": (
    options: typeof CreateFineTuningJobRequest.Encoded
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get info about a fine-tuning job.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   */
  readonly "retrieveFineTuningJob": (
    fineTuningJobId: string
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Immediately cancel a fine-tune job.
   */
  readonly "cancelFineTuningJob": (
    fineTuningJobId: string
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List checkpoints for a fine-tuning job.
   */
  readonly "listFineTuningJobCheckpoints": (
    fineTuningJobId: string,
    options?: typeof ListFineTuningJobCheckpointsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListFineTuningJobCheckpointsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get status updates for a fine-tuning job.
   */
  readonly "listFineTuningEvents": (
    fineTuningJobId: string,
    options?: typeof ListFineTuningEventsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListFineTuningJobEventsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Pause a fine-tune job.
   */
  readonly "pauseFineTuningJob": (
    fineTuningJobId: string
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Resume a fine-tune job.
   */
  readonly "resumeFineTuningJob": (
    fineTuningJobId: string
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates an edited or extended image given one or more source images and a prompt. This endpoint only supports `gpt-image-1` and `dall-e-2`.
   */
  readonly "createImageEdit": (
    options: typeof CreateImageEditRequest.Encoded
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates an image given a prompt. [Learn more](https://platform.openai.com/docs/guides/images).
   */
  readonly "createImage": (
    options: typeof CreateImageRequest.Encoded
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates a variation of a given image. This endpoint only supports `dall-e-2`.
   */
  readonly "createImageVariation": (
    options: typeof CreateImageVariationRequest.Encoded
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the currently available models, and provides basic information about each one such as the owner and availability.
   */
  readonly "listModels": () => Effect.Effect<
    typeof ListModelsResponse.Type,
    HttpClientError.HttpClientError | ParseError
  >
  /**
   * Retrieves a model instance, providing basic information about the model such as the owner and permissioning.
   */
  readonly "retrieveModel": (
    model: string
  ) => Effect.Effect<typeof Model.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a fine-tuned model. You must have the Owner role in your organization to delete a model.
   */
  readonly "deleteModel": (
    model: string
  ) => Effect.Effect<typeof DeleteModelResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Classifies if text and/or image inputs are potentially harmful. Learn
   * more in the [moderation guide](https://platform.openai.com/docs/guides/moderation).
   */
  readonly "createModeration": (
    options: typeof CreateModerationRequest.Encoded
  ) => Effect.Effect<typeof CreateModerationResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List organization API keys
   */
  readonly "adminApiKeysList": (
    options?: typeof AdminApiKeysListParams.Encoded | undefined
  ) => Effect.Effect<typeof ApiKeyList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create an organization admin API key
   */
  readonly "adminApiKeysCreate": (
    options: typeof AdminApiKeysCreateRequest.Encoded
  ) => Effect.Effect<typeof AdminApiKey.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieve a single organization API key
   */
  readonly "adminApiKeysGet": (
    keyId: string
  ) => Effect.Effect<typeof AdminApiKey.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete an organization admin API key
   */
  readonly "adminApiKeysDelete": (
    keyId: string
  ) => Effect.Effect<typeof AdminApiKeysDelete200.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List user actions and configuration changes within this organization.
   */
  readonly "listAuditLogs": (
    options?: typeof ListAuditLogsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListAuditLogsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List uploaded certificates for this organization.
   */
  readonly "listOrganizationCertificates": (
    options?: typeof ListOrganizationCertificatesParams.Encoded | undefined
  ) => Effect.Effect<typeof ListCertificatesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Upload a certificate to the organization. This does **not** automatically activate the certificate.
   *
   * Organizations can upload up to 50 certificates.
   */
  readonly "uploadCertificate": (
    options: typeof UploadCertificateRequest.Encoded
  ) => Effect.Effect<typeof Certificate.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Activate certificates at the organization level.
   *
   * You can atomically and idempotently activate up to 10 certificates at a time.
   */
  readonly "activateOrganizationCertificates": (
    options: typeof ToggleCertificatesRequest.Encoded
  ) => Effect.Effect<typeof ListCertificatesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deactivate certificates at the organization level.
   *
   * You can atomically and idempotently deactivate up to 10 certificates at a time.
   */
  readonly "deactivateOrganizationCertificates": (
    options: typeof ToggleCertificatesRequest.Encoded
  ) => Effect.Effect<typeof ListCertificatesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get a certificate that has been uploaded to the organization.
   *
   * You can get a certificate regardless of whether it is active or not.
   */
  readonly "getCertificate": (
    certificateId: string,
    options?: typeof GetCertificateParams.Encoded | undefined
  ) => Effect.Effect<typeof Certificate.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modify a certificate. Note that only the name can be modified.
   */
  readonly "modifyCertificate": (
    certificateId: string,
    options: typeof ModifyCertificateRequest.Encoded
  ) => Effect.Effect<typeof Certificate.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a certificate from the organization.
   *
   * The certificate must be inactive for the organization and all projects.
   */
  readonly "deleteCertificate": (
    certificateId: string
  ) => Effect.Effect<typeof DeleteCertificateResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get costs details for the organization.
   */
  readonly "usageCosts": (
    options: typeof UsageCostsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists all groups in the organization.
   */
  readonly "listGroups": (
    options?: typeof ListGroupsParams.Encoded | undefined
  ) => Effect.Effect<typeof GroupListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates a new group in the organization.
   */
  readonly "createGroup": (
    options: typeof CreateGroupBody.Encoded
  ) => Effect.Effect<typeof GroupResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates a group's information.
   */
  readonly "updateGroup": (
    groupId: string,
    options: typeof UpdateGroupBody.Encoded
  ) => Effect.Effect<typeof GroupResourceWithSuccess.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a group from the organization.
   */
  readonly "deleteGroup": (
    groupId: string
  ) => Effect.Effect<typeof GroupDeletedResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the organization roles assigned to a group within the organization.
   */
  readonly "listGroupRoleAssignments": (
    groupId: string,
    options?: typeof ListGroupRoleAssignmentsParams.Encoded | undefined
  ) => Effect.Effect<typeof RoleListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Assigns an organization role to a group within the organization.
   */
  readonly "assignGroupRole": (
    groupId: string,
    options: typeof PublicAssignOrganizationGroupRoleBody.Encoded
  ) => Effect.Effect<typeof GroupRoleAssignment.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Unassigns an organization role from a group within the organization.
   */
  readonly "unassignGroupRole": (
    groupId: string,
    roleId: string
  ) => Effect.Effect<typeof DeletedRoleAssignmentResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the users assigned to a group.
   */
  readonly "listGroupUsers": (
    groupId: string,
    options?: typeof ListGroupUsersParams.Encoded | undefined
  ) => Effect.Effect<typeof UserListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Adds a user to a group.
   */
  readonly "addGroupUser": (
    groupId: string,
    options: typeof CreateGroupUserBody.Encoded
  ) => Effect.Effect<typeof GroupUserAssignment.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Removes a user from a group.
   */
  readonly "removeGroupUser": (
    groupId: string,
    userId: string
  ) => Effect.Effect<typeof GroupUserDeletedResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of invites in the organization.
   */
  readonly "listInvites": (
    options?: typeof ListInvitesParams.Encoded | undefined
  ) => Effect.Effect<typeof InviteListResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create an invite for a user to the organization. The invite must be accepted by the user before they have access to the organization.
   */
  readonly "inviteUser": (
    options: typeof InviteRequest.Encoded
  ) => Effect.Effect<typeof Invite.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves an invite.
   */
  readonly "retrieveInvite": (
    inviteId: string
  ) => Effect.Effect<typeof Invite.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete an invite. If the invite has already been accepted, it cannot be deleted.
   */
  readonly "deleteInvite": (
    inviteId: string
  ) => Effect.Effect<typeof InviteDeleteResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of projects.
   */
  readonly "listProjects": (
    options?: typeof ListProjectsParams.Encoded | undefined
  ) => Effect.Effect<typeof ProjectListResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a new project in the organization. Projects can be created and archived, but cannot be deleted.
   */
  readonly "createProject": (
    options: typeof ProjectCreateRequest.Encoded
  ) => Effect.Effect<typeof Project.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a project.
   */
  readonly "retrieveProject": (
    projectId: string
  ) => Effect.Effect<typeof Project.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modifies a project in the organization.
   */
  readonly "modifyProject": (
    projectId: string,
    options: typeof ProjectUpdateRequest.Encoded
  ) => Effect.Effect<
    typeof Project.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Returns a list of API keys in the project.
   */
  readonly "listProjectApiKeys": (
    projectId: string,
    options?: typeof ListProjectApiKeysParams.Encoded | undefined
  ) => Effect.Effect<typeof ProjectApiKeyListResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves an API key in the project.
   */
  readonly "retrieveProjectApiKey": (
    projectId: string,
    keyId: string
  ) => Effect.Effect<typeof ProjectApiKey.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes an API key from the project.
   */
  readonly "deleteProjectApiKey": (
    projectId: string,
    keyId: string
  ) => Effect.Effect<
    typeof ProjectApiKeyDeleteResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Archives a project in the organization. Archived projects cannot be used or updated.
   */
  readonly "archiveProject": (
    projectId: string
  ) => Effect.Effect<typeof Project.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List certificates for this project.
   */
  readonly "listProjectCertificates": (
    projectId: string,
    options?: typeof ListProjectCertificatesParams.Encoded | undefined
  ) => Effect.Effect<typeof ListCertificatesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Activate certificates at the project level.
   *
   * You can atomically and idempotently activate up to 10 certificates at a time.
   */
  readonly "activateProjectCertificates": (
    projectId: string,
    options: typeof ToggleCertificatesRequest.Encoded
  ) => Effect.Effect<typeof ListCertificatesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deactivate certificates at the project level. You can atomically and
   * idempotently deactivate up to 10 certificates at a time.
   */
  readonly "deactivateProjectCertificates": (
    projectId: string,
    options: typeof ToggleCertificatesRequest.Encoded
  ) => Effect.Effect<typeof ListCertificatesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the groups that have access to a project.
   */
  readonly "listProjectGroups": (
    projectId: string,
    options?: typeof ListProjectGroupsParams.Encoded | undefined
  ) => Effect.Effect<typeof ProjectGroupListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Grants a group access to a project.
   */
  readonly "addProjectGroup": (
    projectId: string,
    options: typeof InviteProjectGroupBody.Encoded
  ) => Effect.Effect<typeof ProjectGroup.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Revokes a group's access to a project.
   */
  readonly "removeProjectGroup": (
    projectId: string,
    groupId: string
  ) => Effect.Effect<typeof ProjectGroupDeletedResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns the rate limits per model for a project.
   */
  readonly "listProjectRateLimits": (
    projectId: string,
    options?: typeof ListProjectRateLimitsParams.Encoded | undefined
  ) => Effect.Effect<typeof ProjectRateLimitListResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates a project rate limit.
   */
  readonly "updateProjectRateLimits": (
    projectId: string,
    rateLimitId: string,
    options: typeof ProjectRateLimitUpdateRequest.Encoded
  ) => Effect.Effect<
    typeof ProjectRateLimit.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Returns a list of service accounts in the project.
   */
  readonly "listProjectServiceAccounts": (
    projectId: string,
    options?: typeof ListProjectServiceAccountsParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ProjectServiceAccountListResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Creates a new service account in the project. This also returns an unredacted API key for the service account.
   */
  readonly "createProjectServiceAccount": (
    projectId: string,
    options: typeof ProjectServiceAccountCreateRequest.Encoded
  ) => Effect.Effect<
    typeof ProjectServiceAccountCreateResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Retrieves a service account in the project.
   */
  readonly "retrieveProjectServiceAccount": (
    projectId: string,
    serviceAccountId: string
  ) => Effect.Effect<typeof ProjectServiceAccount.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a service account from the project.
   */
  readonly "deleteProjectServiceAccount": (
    projectId: string,
    serviceAccountId: string
  ) => Effect.Effect<typeof ProjectServiceAccountDeleteResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of users in the project.
   */
  readonly "listProjectUsers": (
    projectId: string,
    options?: typeof ListProjectUsersParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ProjectUserListResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Adds a user to the project. Users must already be members of the organization to be added to a project.
   */
  readonly "createProjectUser": (
    projectId: string,
    options: typeof ProjectUserCreateRequest.Encoded
  ) => Effect.Effect<
    typeof ProjectUser.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Retrieves a user in the project.
   */
  readonly "retrieveProjectUser": (
    projectId: string,
    userId: string
  ) => Effect.Effect<typeof ProjectUser.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modifies a user's role in the project.
   */
  readonly "modifyProjectUser": (
    projectId: string,
    userId: string,
    options: typeof ProjectUserUpdateRequest.Encoded
  ) => Effect.Effect<
    typeof ProjectUser.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Deletes a user from the project.
   */
  readonly "deleteProjectUser": (
    projectId: string,
    userId: string
  ) => Effect.Effect<
    typeof ProjectUserDeleteResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Lists the roles configured for the organization.
   */
  readonly "listRoles": (
    options?: typeof ListRolesParams.Encoded | undefined
  ) => Effect.Effect<typeof PublicRoleListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates a custom role for the organization.
   */
  readonly "createRole": (
    options: typeof PublicCreateOrganizationRoleBody.Encoded
  ) => Effect.Effect<typeof Role.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates an existing organization role.
   */
  readonly "updateRole": (
    roleId: string,
    options: typeof PublicUpdateOrganizationRoleBody.Encoded
  ) => Effect.Effect<typeof Role.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a custom role from the organization.
   */
  readonly "deleteRole": (
    roleId: string
  ) => Effect.Effect<typeof RoleDeletedResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get audio speeches usage details for the organization.
   */
  readonly "usageAudioSpeeches": (
    options: typeof UsageAudioSpeechesParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get audio transcriptions usage details for the organization.
   */
  readonly "usageAudioTranscriptions": (
    options: typeof UsageAudioTranscriptionsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get code interpreter sessions usage details for the organization.
   */
  readonly "usageCodeInterpreterSessions": (
    options: typeof UsageCodeInterpreterSessionsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get completions usage details for the organization.
   */
  readonly "usageCompletions": (
    options: typeof UsageCompletionsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get embeddings usage details for the organization.
   */
  readonly "usageEmbeddings": (
    options: typeof UsageEmbeddingsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get images usage details for the organization.
   */
  readonly "usageImages": (
    options: typeof UsageImagesParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get moderations usage details for the organization.
   */
  readonly "usageModerations": (
    options: typeof UsageModerationsParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get vector stores usage details for the organization.
   */
  readonly "usageVectorStores": (
    options: typeof UsageVectorStoresParams.Encoded
  ) => Effect.Effect<typeof UsageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists all of the users in the organization.
   */
  readonly "listUsers": (
    options?: typeof ListUsersParams.Encoded | undefined
  ) => Effect.Effect<typeof UserListResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a user by their identifier.
   */
  readonly "retrieveUser": (
    userId: string
  ) => Effect.Effect<typeof User.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modifies a user's role in the organization.
   */
  readonly "modifyUser": (
    userId: string,
    options: typeof UserRoleUpdateRequest.Encoded
  ) => Effect.Effect<typeof User.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a user from the organization.
   */
  readonly "deleteUser": (
    userId: string
  ) => Effect.Effect<typeof UserDeleteResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the organization roles assigned to a user within the organization.
   */
  readonly "listUserRoleAssignments": (
    userId: string,
    options?: typeof ListUserRoleAssignmentsParams.Encoded | undefined
  ) => Effect.Effect<typeof RoleListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Assigns an organization role to a user within the organization.
   */
  readonly "assignUserRole": (
    userId: string,
    options: typeof PublicAssignOrganizationGroupRoleBody.Encoded
  ) => Effect.Effect<typeof UserRoleAssignment.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Unassigns an organization role from a user within the organization.
   */
  readonly "unassignUserRole": (
    userId: string,
    roleId: string
  ) => Effect.Effect<typeof DeletedRoleAssignmentResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the project roles assigned to a group within a project.
   */
  readonly "listProjectGroupRoleAssignments": (
    projectId: string,
    groupId: string,
    options?: typeof ListProjectGroupRoleAssignmentsParams.Encoded | undefined
  ) => Effect.Effect<typeof RoleListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Assigns a project role to a group within a project.
   */
  readonly "assignProjectGroupRole": (
    projectId: string,
    groupId: string,
    options: typeof PublicAssignOrganizationGroupRoleBody.Encoded
  ) => Effect.Effect<typeof GroupRoleAssignment.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Unassigns a project role from a group within a project.
   */
  readonly "unassignProjectGroupRole": (
    projectId: string,
    groupId: string,
    roleId: string
  ) => Effect.Effect<typeof DeletedRoleAssignmentResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the roles configured for a project.
   */
  readonly "listProjectRoles": (
    projectId: string,
    options?: typeof ListProjectRolesParams.Encoded | undefined
  ) => Effect.Effect<typeof PublicRoleListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates a custom role for a project.
   */
  readonly "createProjectRole": (
    projectId: string,
    options: typeof PublicCreateOrganizationRoleBody.Encoded
  ) => Effect.Effect<typeof Role.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates an existing project role.
   */
  readonly "updateProjectRole": (
    projectId: string,
    roleId: string,
    options: typeof PublicUpdateOrganizationRoleBody.Encoded
  ) => Effect.Effect<typeof Role.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a custom role from a project.
   */
  readonly "deleteProjectRole": (
    projectId: string,
    roleId: string
  ) => Effect.Effect<typeof RoleDeletedResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the project roles assigned to a user within a project.
   */
  readonly "listProjectUserRoleAssignments": (
    projectId: string,
    userId: string,
    options?: typeof ListProjectUserRoleAssignmentsParams.Encoded | undefined
  ) => Effect.Effect<typeof RoleListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Assigns a project role to a user within a project.
   */
  readonly "assignProjectUserRole": (
    projectId: string,
    userId: string,
    options: typeof PublicAssignOrganizationGroupRoleBody.Encoded
  ) => Effect.Effect<typeof UserRoleAssignment.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Unassigns a project role from a user within a project.
   */
  readonly "unassignProjectUserRole": (
    projectId: string,
    userId: string,
    roleId: string
  ) => Effect.Effect<typeof DeletedRoleAssignmentResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a new Realtime API call over WebRTC and receive the SDP answer needed
   * to complete the peer connection.
   */
  readonly "createRealtimeCall": (
    options: typeof RealtimeCallCreateRequest.Encoded
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * Accept an incoming SIP call and configure the realtime session that will
   * handle it.
   */
  readonly "acceptRealtimeCall": (
    callId: string,
    options: typeof RealtimeSessionCreateRequestGA.Encoded
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * End an active Realtime API call, whether it was initiated over SIP or
   * WebRTC.
   */
  readonly "hangupRealtimeCall": (callId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * Transfer an active SIP call to a new destination using the SIP REFER verb.
   */
  readonly "referRealtimeCall": (
    callId: string,
    options: typeof RealtimeCallReferRequest.Encoded
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * Decline an incoming SIP call by returning a SIP status code to the caller.
   */
  readonly "rejectRealtimeCall": (
    callId: string,
    options: typeof RealtimeCallRejectRequest.Encoded
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a Realtime client secret with an associated session configuration.
   */
  readonly "createRealtimeClientSecret": (
    options: typeof RealtimeCreateClientSecretRequest.Encoded
  ) => Effect.Effect<typeof RealtimeCreateClientSecretResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API. Can be configured with the same session parameters as the
   * `session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains
   * a usable ephemeral API token that can be used to authenticate browser clients
   * for the Realtime API.
   */
  readonly "createRealtimeSession": (
    options: typeof RealtimeSessionCreateRequest.Encoded
  ) => Effect.Effect<typeof RealtimeSessionCreateResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API specifically for realtime transcriptions.
   * Can be configured with the same session parameters as the `transcription_session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains
   * a usable ephemeral API token that can be used to authenticate browser clients
   * for the Realtime API.
   */
  readonly "createRealtimeTranscriptionSession": (
    options: typeof RealtimeTranscriptionSessionCreateRequest.Encoded
  ) => Effect.Effect<
    typeof RealtimeTranscriptionSessionCreateResponse.Type,
    HttpClientError.HttpClientError | ParseError
  >
  /**
   * Creates a model response. Provide [text](https://platform.openai.com/docs/guides/text) or
   * [image](https://platform.openai.com/docs/guides/images) inputs to generate [text](https://platform.openai.com/docs/guides/text)
   * or [JSON](https://platform.openai.com/docs/guides/structured-outputs) outputs. Have the model call
   * your own [custom code](https://platform.openai.com/docs/guides/function-calling) or use built-in
   * [tools](https://platform.openai.com/docs/guides/tools) like [web search](https://platform.openai.com/docs/guides/tools-web-search)
   * or [file search](https://platform.openai.com/docs/guides/tools-file-search) to use your own data
   * as input for the model's response.
   */
  readonly "createResponse": (
    options: typeof CreateResponse.Encoded
  ) => Effect.Effect<typeof Response.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a model response with the given ID.
   */
  readonly "getResponse": (
    responseId: string,
    options?: typeof GetResponseParams.Encoded | undefined
  ) => Effect.Effect<typeof Response.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a model response with the given ID.
   */
  readonly "deleteResponse": (
    responseId: string
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"Error", typeof Error.Type>>
  /**
   * Cancels a model response with the given ID. Only responses created with
   * the `background` parameter set to `true` can be cancelled.
   * [Learn more](https://platform.openai.com/docs/guides/background).
   */
  readonly "cancelResponse": (
    responseId: string
  ) => Effect.Effect<
    typeof Response.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"Error", typeof Error.Type>
  >
  /**
   * Returns a list of input items for a given response.
   */
  readonly "listInputItems": (
    responseId: string,
    options?: typeof ListInputItemsParams.Encoded | undefined
  ) => Effect.Effect<typeof ResponseItemList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a thread.
   */
  readonly "createThread": (
    options: typeof CreateThreadRequest.Encoded
  ) => Effect.Effect<typeof ThreadObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a thread and run it in one request.
   */
  readonly "createThreadAndRun": (
    options: typeof CreateThreadAndRunRequest.Encoded
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a thread.
   */
  readonly "getThread": (
    threadId: string
  ) => Effect.Effect<typeof ThreadObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modifies a thread.
   */
  readonly "modifyThread": (
    threadId: string,
    options: typeof ModifyThreadRequest.Encoded
  ) => Effect.Effect<typeof ThreadObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a thread.
   */
  readonly "deleteThread": (
    threadId: string
  ) => Effect.Effect<typeof DeleteThreadResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of messages for a given thread.
   */
  readonly "listMessages": (
    threadId: string,
    options?: typeof ListMessagesParams.Encoded | undefined
  ) => Effect.Effect<typeof ListMessagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a message.
   */
  readonly "createMessage": (
    threadId: string,
    options: typeof CreateMessageRequest.Encoded
  ) => Effect.Effect<typeof MessageObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieve a message.
   */
  readonly "getMessage": (
    threadId: string,
    messageId: string
  ) => Effect.Effect<typeof MessageObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modifies a message.
   */
  readonly "modifyMessage": (
    threadId: string,
    messageId: string,
    options: typeof ModifyMessageRequest.Encoded
  ) => Effect.Effect<typeof MessageObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a message.
   */
  readonly "deleteMessage": (
    threadId: string,
    messageId: string
  ) => Effect.Effect<typeof DeleteMessageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of runs belonging to a thread.
   */
  readonly "listRuns": (
    threadId: string,
    options?: typeof ListRunsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListRunsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a run.
   */
  readonly "createRun": (
    threadId: string,
    options: {
      readonly params?: typeof CreateRunParams.Encoded | undefined
      readonly payload: typeof CreateRunRequest.Encoded
    }
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a run.
   */
  readonly "getRun": (
    threadId: string,
    runId: string
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modifies a run.
   */
  readonly "modifyRun": (
    threadId: string,
    runId: string,
    options: typeof ModifyRunRequest.Encoded
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Cancels a run that is `in_progress`.
   */
  readonly "cancelRun": (
    threadId: string,
    runId: string
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of run steps belonging to a run.
   */
  readonly "listRunSteps": (
    threadId: string,
    runId: string,
    options?: typeof ListRunStepsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListRunStepsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a run step.
   */
  readonly "getRunStep": (
    threadId: string,
    runId: string,
    stepId: string,
    options?: typeof GetRunStepParams.Encoded | undefined
  ) => Effect.Effect<typeof RunStepObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * When a run has the `status: "requires_action"` and `required_action.type` is `submit_tool_outputs`, this endpoint can be used to submit the outputs from the tool calls once they're all completed. All outputs must be submitted in a single request.
   */
  readonly "submitToolOuputsToRun": (
    threadId: string,
    runId: string,
    options: typeof SubmitToolOutputsRunRequest.Encoded
  ) => Effect.Effect<typeof RunObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates an intermediate [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object
   * that you can add [Parts](https://platform.openai.com/docs/api-reference/uploads/part-object) to.
   * Currently, an Upload can accept at most 8 GB in total and expires after an
   * hour after you create it.
   *
   * Once you complete the Upload, we will create a
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that contains all the parts
   * you uploaded. This File is usable in the rest of our platform as a regular
   * File object.
   *
   * For certain `purpose` values, the correct `mime_type` must be specified.
   * Please refer to documentation for the
   * [supported MIME types for your use case](https://platform.openai.com/docs/assistants/tools/file-search#supported-files).
   *
   * For guidance on the proper filename extensions for each purpose, please
   * follow the documentation on [creating a
   * File](https://platform.openai.com/docs/api-reference/files/create).
   */
  readonly "createUpload": (
    options: typeof CreateUploadRequest.Encoded
  ) => Effect.Effect<typeof Upload.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Cancels the Upload. No Parts may be added after an Upload is cancelled.
   */
  readonly "cancelUpload": (
    uploadId: string
  ) => Effect.Effect<typeof Upload.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Completes the [Upload](https://platform.openai.com/docs/api-reference/uploads/object).
   *
   * Within the returned Upload object, there is a nested [File](https://platform.openai.com/docs/api-reference/files/object) object that is ready to use in the rest of the platform.
   *
   * You can specify the order of the Parts by passing in an ordered list of the Part IDs.
   *
   * The number of bytes uploaded upon completion must match the number of bytes initially specified when creating the Upload object. No Parts may be added after an Upload is completed.
   */
  readonly "completeUpload": (
    uploadId: string,
    options: typeof CompleteUploadRequest.Encoded
  ) => Effect.Effect<typeof Upload.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Adds a [Part](https://platform.openai.com/docs/api-reference/uploads/part-object) to an [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object. A Part represents a chunk of bytes from the file you are trying to upload.
   *
   * Each Part can be at most 64 MB, and you can add Parts until you hit the Upload maximum of 8 GB.
   *
   * It is possible to add multiple Parts in parallel. You can decide the intended order of the Parts when you [complete the Upload](https://platform.openai.com/docs/api-reference/uploads/complete).
   */
  readonly "addUploadPart": (
    uploadId: string,
    options: typeof AddUploadPartRequest.Encoded
  ) => Effect.Effect<typeof UploadPart.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of vector stores.
   */
  readonly "listVectorStores": (
    options?: typeof ListVectorStoresParams.Encoded | undefined
  ) => Effect.Effect<typeof ListVectorStoresResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a vector store.
   */
  readonly "createVectorStore": (
    options: typeof CreateVectorStoreRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a vector store.
   */
  readonly "getVectorStore": (
    vectorStoreId: string
  ) => Effect.Effect<typeof VectorStoreObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Modifies a vector store.
   */
  readonly "modifyVectorStore": (
    vectorStoreId: string,
    options: typeof UpdateVectorStoreRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a vector store.
   */
  readonly "deleteVectorStore": (
    vectorStoreId: string
  ) => Effect.Effect<typeof DeleteVectorStoreResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a vector store file batch.
   */
  readonly "createVectorStoreFileBatch": (
    vectorStoreId: string,
    options: typeof CreateVectorStoreFileBatchRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreFileBatchObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a vector store file batch.
   */
  readonly "getVectorStoreFileBatch": (
    vectorStoreId: string,
    batchId: string
  ) => Effect.Effect<typeof VectorStoreFileBatchObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Cancel a vector store file batch. This attempts to cancel the processing of files in this batch as soon as possible.
   */
  readonly "cancelVectorStoreFileBatch": (
    vectorStoreId: string,
    batchId: string
  ) => Effect.Effect<typeof VectorStoreFileBatchObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of vector store files in a batch.
   */
  readonly "listFilesInVectorStoreBatch": (
    vectorStoreId: string,
    batchId: string,
    options?: typeof ListFilesInVectorStoreBatchParams.Encoded | undefined
  ) => Effect.Effect<typeof ListVectorStoreFilesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Returns a list of vector store files.
   */
  readonly "listVectorStoreFiles": (
    vectorStoreId: string,
    options?: typeof ListVectorStoreFilesParams.Encoded | undefined
  ) => Effect.Effect<typeof ListVectorStoreFilesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a vector store file by attaching a [File](https://platform.openai.com/docs/api-reference/files) to a [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object).
   */
  readonly "createVectorStoreFile": (
    vectorStoreId: string,
    options: typeof CreateVectorStoreFileRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreFileObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieves a vector store file.
   */
  readonly "getVectorStoreFile": (
    vectorStoreId: string,
    fileId: string
  ) => Effect.Effect<typeof VectorStoreFileObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Update attributes on a vector store file.
   */
  readonly "updateVectorStoreFileAttributes": (
    vectorStoreId: string,
    fileId: string,
    options: typeof UpdateVectorStoreFileAttributesRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreFileObject.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a vector store file. This will remove the file from the vector store but the file itself will not be deleted. To delete the file, use the [delete file](https://platform.openai.com/docs/api-reference/files/delete) endpoint.
   */
  readonly "deleteVectorStoreFile": (
    vectorStoreId: string,
    fileId: string
  ) => Effect.Effect<typeof DeleteVectorStoreFileResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieve the parsed contents of a vector store file.
   */
  readonly "retrieveVectorStoreFileContent": (
    vectorStoreId: string,
    fileId: string
  ) => Effect.Effect<typeof VectorStoreFileContentResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Search a vector store for relevant chunks based on a query and file attributes filter.
   */
  readonly "searchVectorStore": (
    vectorStoreId: string,
    options: typeof VectorStoreSearchRequest.Encoded
  ) => Effect.Effect<typeof VectorStoreSearchResultsPage.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a conversation.
   */
  readonly "createConversation": (
    options: typeof CreateConversationBody.Encoded
  ) => Effect.Effect<typeof ConversationResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get a conversation
   */
  readonly "getConversation": (
    conversationId: string
  ) => Effect.Effect<typeof ConversationResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Update a conversation
   */
  readonly "updateConversation": (
    conversationId: string,
    options: typeof UpdateConversationBody.Encoded
  ) => Effect.Effect<typeof ConversationResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a conversation. Items in the conversation will not be deleted.
   */
  readonly "deleteConversation": (
    conversationId: string
  ) => Effect.Effect<typeof DeletedConversationResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List videos
   */
  readonly "ListVideos": (
    options?: typeof ListVideosParams.Encoded | undefined
  ) => Effect.Effect<typeof VideoListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a video
   */
  readonly "createVideo": (
    options: typeof CreateVideoBody.Encoded
  ) => Effect.Effect<typeof VideoResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieve a video
   */
  readonly "GetVideo": (
    videoId: string
  ) => Effect.Effect<typeof VideoResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a video
   */
  readonly "DeleteVideo": (
    videoId: string
  ) => Effect.Effect<typeof DeletedVideoResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Download video content
   */
  readonly "RetrieveVideoContent": (
    videoId: string,
    options?: typeof RetrieveVideoContentParams.Encoded | undefined
  ) => Effect.Effect<typeof RetrieveVideoContent200.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a video remix
   */
  readonly "CreateVideoRemix": (
    videoId: string,
    options: typeof CreateVideoRemixBody.Encoded
  ) => Effect.Effect<typeof VideoResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get input token counts
   */
  readonly "Getinputtokencounts": (
    options: typeof TokenCountsBody.Encoded
  ) => Effect.Effect<typeof TokenCountsResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Cancel a ChatKit session
   */
  readonly "CancelChatSessionMethod": (
    sessionId: string
  ) => Effect.Effect<typeof ChatSessionResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a ChatKit session
   */
  readonly "CreateChatSessionMethod": (
    options: typeof CreateChatSessionBody.Encoded
  ) => Effect.Effect<typeof ChatSessionResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List ChatKit thread items
   */
  readonly "ListThreadItemsMethod": (
    threadId: string,
    options?: typeof ListThreadItemsMethodParams.Encoded | undefined
  ) => Effect.Effect<typeof ThreadItemListResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieve a ChatKit thread
   */
  readonly "GetThreadMethod": (
    threadId: string
  ) => Effect.Effect<typeof ThreadResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete a ChatKit thread
   */
  readonly "DeleteThreadMethod": (
    threadId: string
  ) => Effect.Effect<typeof DeletedThreadResource.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * List ChatKit threads
   */
  readonly "ListThreadsMethod": (
    options?: typeof ListThreadsMethodParams.Encoded | undefined
  ) => Effect.Effect<typeof ThreadListResource.Type, HttpClientError.HttpClientError | ParseError>
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
