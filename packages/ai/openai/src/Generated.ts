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
 * See the [file search tool documentation](/docs/assistants/tools/file-search#customizing-file-search-settings) for more information.
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
       * Note that the file search tool may output fewer than `max_num_results` results. See the [file search tool documentation](/docs/assistants/tools/file-search#customizing-file-search-settings) for more information.
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
 * The parameters the functions accepts, described as a JSON Schema object. See the [guide](/docs/guides/function-calling) for examples, and the [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for documentation about the format.
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
  /**
   * Whether to enable strict schema adherence when generating the function call. If set to true, the model will follow the exact schema defined in the `parameters` field. Only a subset of JSON Schema is supported when `strict` is `true`. Learn more about Structured Outputs in the [function calling guide](docs/guides/function-calling).
   */
  "strict": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
}) {}

export class AssistantToolsFunction extends S.Class<AssistantToolsFunction>("AssistantToolsFunction")({
  /**
   * The type of tool being defined: `function`
   */
  "type": AssistantToolsFunctionType,
  "function": FunctionObject
}) {}

/**
 * Set of 16 key-value pairs that can be attached to an object. This can be
 * useful for storing additional information about the object in a structured
 * format, and querying for objects via API or the dashboard.
 *
 * Keys are strings with a maximum length of 64 characters. Values are strings
 * with a maximum length of 512 characters.
 */
export class Metadata extends S.Record({ key: S.String, value: S.Unknown }) {}

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
 * Learn more about [Structured Outputs](/docs/guides/structured-outputs).
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
    /**
     * Whether to enable strict schema adherence when generating the output.
     * If set to true, the model will always follow the exact schema defined
     * in the `schema` field. Only a subset of JSON Schema is supported when
     * `strict` is `true`. To learn more, read the [Structured Outputs
     * guide](/docs/guides/structured-outputs).
     */
    "strict": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
  })
}) {}

/**
 * Specifies the format that the model must output. Compatible with [GPT-4o](/docs/models#gpt-4o), [GPT-4 Turbo](/docs/models#gpt-4-turbo-and-gpt-4), and all GPT-3.5 Turbo models since `gpt-3.5-turbo-1106`.
 *
 * Setting to `{ "type": "json_schema", "json_schema": {...} }` enables Structured Outputs which ensures the model will match your supplied JSON schema. Learn more in the [Structured Outputs guide](/docs/guides/structured-outputs).
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
  /**
   * The name of the assistant. The maximum length is 256 characters.
   */
  "name": S.NullOr(S.String.pipe(S.maxLength(256))),
  /**
   * The description of the assistant. The maximum length is 512 characters.
   */
  "description": S.NullOr(S.String.pipe(S.maxLength(512))),
  /**
   * ID of the model to use. You can use the [List models](/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](/docs/models) for descriptions of them.
   */
  "model": S.String,
  /**
   * The system instructions that the assistant uses. The maximum length is 256,000 characters.
   */
  "instructions": S.NullOr(S.String.pipe(S.maxLength(256000))),
  /**
   * A list of tool enabled on the assistant. There can be a maximum of 128 tools per assistant. Tools can be of types `code_interpreter`, `file_search`, or `function`.
   */
  "tools": S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(128))
    .pipe(S.propertySignature, S.withConstructorDefault(() => [] as const)),
  /**
   * A set of resources that are used by the assistant's tools. The resources are specific to the type of tool. For example, the `code_interpreter` tool requires a list of file IDs, while the `file_search` tool requires a list of vector store IDs.
   */
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * A list of [file](/docs/api-reference/files) IDs made available to the `code_interpreter`` tool. There can be a maximum of 20 files associated with the tool.
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
           * The ID of the [vector store](/docs/api-reference/vector-stores/object) attached to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.NullOr(Metadata),
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
 * **o-series models only**
 *
 * Constrains effort on reasoning for
 * [reasoning models](https://platform.openai.com/docs/guides/reasoning).
 * Currently supported values are `low`, `medium`, and `high`. Reducing
 * reasoning effort can result in faster responses and fewer tokens used
 * on reasoning in a response.
 */
export class ReasoningEffort extends S.Literal("minimal", "low", "medium", "high") {}

export class CreateAssistantRequest extends S.Class<CreateAssistantRequest>("CreateAssistantRequest")({
  /**
   * ID of the model to use. You can use the [List models](/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](/docs/models) for descriptions of them.
   */
  "model": S.Union(S.String, AssistantSupportedModels),
  /**
   * The name of the assistant. The maximum length is 256 characters.
   */
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  /**
   * The description of the assistant. The maximum length is 512 characters.
   */
  "description": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true }),
  /**
   * The system instructions that the assistant uses. The maximum length is 256,000 characters.
   */
  "instructions": S.optionalWith(S.String.pipe(S.maxLength(256000)), { nullable: true }),
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  /**
   * A list of tool enabled on the assistant. There can be a maximum of 128 tools per assistant. Tools can be of types `code_interpreter`, `file_search`, or `function`.
   */
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(128)),
    {
      nullable: true,
      default: () => [] as const
    }
  ),
  /**
   * A set of resources that are used by the assistant's tools. The resources are specific to the type of tool. For example, the `code_interpreter` tool requires a list of file IDs, while the `file_search` tool requires a list of vector store IDs.
   */
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * A list of [file](/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
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
           * The [vector store](/docs/api-reference/vector-stores/object) attached to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true }),
          /**
           * A helper to create a [vector store](/docs/api-reference/vector-stores/object) with file_ids and attach it to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_stores": S.optionalWith(
            S.Array(S.Struct({
              /**
               * A list of [file](/docs/api-reference/files) IDs to add to the vector store. There can be a maximum of 10000 files in a vector store.
               */
              "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(10000)), { nullable: true }),
              /**
               * The chunking strategy used to chunk the file(s). If not set, will use the `auto` strategy.
               */
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
  "response_format": S.optionalWith(AssistantsApiResponseFormatOption, { nullable: true })
}) {}

export class ModifyAssistantRequest extends S.Class<ModifyAssistantRequest>("ModifyAssistantRequest")({
  /**
   * ID of the model to use. You can use the [List models](/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](/docs/models) for descriptions of them.
   */
  "model": S.optionalWith(S.Union(S.String, AssistantSupportedModels), { nullable: true }),
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  /**
   * The name of the assistant. The maximum length is 256 characters.
   */
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  /**
   * The description of the assistant. The maximum length is 512 characters.
   */
  "description": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true }),
  /**
   * The system instructions that the assistant uses. The maximum length is 256,000 characters.
   */
  "instructions": S.optionalWith(S.String.pipe(S.maxLength(256000)), { nullable: true }),
  /**
   * A list of tool enabled on the assistant. There can be a maximum of 128 tools per assistant. Tools can be of types `code_interpreter`, `file_search`, or `function`.
   */
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(128)),
    {
      nullable: true,
      default: () => [] as const
    }
  ),
  /**
   * A set of resources that are used by the assistant's tools. The resources are specific to the type of tool. For example, the `code_interpreter` tool requires a list of file IDs, while the `file_search` tool requires a list of vector store IDs.
   */
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * Overrides the list of [file](/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
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
           * Overrides the [vector store](/docs/api-reference/vector-stores/object) attached to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
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
  extends S.Literal("alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse")
{}

export class VoiceIdsShared extends S.Union(S.String, VoiceIdsSharedEnum) {}

/**
 * The format to audio in. Supported formats are `mp3`, `opus`, `aac`, `flac`, `wav`, and `pcm`.
 */
export class CreateSpeechRequestResponseFormat extends S.Literal("mp3", "opus", "aac", "flac", "wav", "pcm") {}

export class CreateSpeechRequest extends S.Class<CreateSpeechRequest>("CreateSpeechRequest")({
  /**
   * One of the available [TTS models](/docs/models#tts): `tts-1`, `tts-1-hd` or `gpt-4o-mini-tts`.
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
   * The voice to use when generating the audio. Supported voices are `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `onyx`, `nova`, `sage`, `shimmer`, and `verse`. Previews of the voices are available in the [Text to speech guide](/docs/guides/text-to-speech#voice-options).
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
  })
}) {}

export class CreateTranscriptionRequestModelEnum
  extends S.Literal("whisper-1", "gpt-4o-transcribe", "gpt-4o-mini-transcribe")
{}

/**
 * The format of the output, in one of these options: `json`, `text`, `srt`, `verbose_json`, or `vtt`. For `gpt-4o-transcribe` and `gpt-4o-mini-transcribe`, the only supported format is `json`.
 */
export class AudioResponseFormat extends S.Literal("json", "text", "srt", "verbose_json", "vtt") {}

export class TranscriptionInclude extends S.Literal("logprobs") {}

export class CreateTranscriptionRequest extends S.Class<CreateTranscriptionRequest>("CreateTranscriptionRequest")({
  /**
   * The audio file object (not file name) to transcribe, in one of these formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm.
   */
  "file": S.instanceOf(globalThis.Blob),
  /**
   * ID of the model to use. The options are `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and `whisper-1` (which is powered by our open source Whisper V2 model).
   */
  "model": S.Union(S.String, CreateTranscriptionRequestModelEnum),
  /**
   * The language of the input audio. Supplying the input language in [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (e.g. `en`) format will improve accuracy and latency.
   */
  "language": S.optionalWith(S.String, { nullable: true }),
  /**
   * An optional text to guide the model's style or continue a previous audio segment. The [prompt](/docs/guides/speech-to-text#prompting) should match the audio language.
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
   * the models `gpt-4o-transcribe` and `gpt-4o-mini-transcribe`.
   */
  "include[]": S.optionalWith(S.Array(TranscriptionInclude), { nullable: true }),
  /**
   * The timestamp granularities to populate for this transcription. `response_format` must be set `verbose_json` to use timestamp granularities. Either or both of these options are supported: `word`, or `segment`. Note: There is no additional latency for segment timestamps, but generating word timestamps incurs additional latency.
   */
  "timestamp_granularities[]": S.optionalWith(S.Array(S.Literal("word", "segment")), {
    nullable: true,
    default: () => ["segment"] as const
  }),
  /**
   * If set to true, the model response data will be streamed to the client
   * as it is generated using [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
   * See the [Streaming section of the Speech-to-Text guide](/docs/guides/speech-to-text?lang=curl#streaming-transcriptions)
   * for more information.
   *
   * Note: Streaming is not supported for the `whisper-1` model and will be ignored.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
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
    )
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
    "segments": S.optionalWith(S.Array(TranscriptionSegment), { nullable: true })
  })
{}

export class CreateTranscription200
  extends S.Union(CreateTranscriptionResponseVerboseJson, CreateTranscriptionResponseJson)
{}

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
   * An optional text to guide the model's style or continue a previous audio segment. The [prompt](/docs/guides/speech-to-text#prompting) should be in English.
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
  "errors": S.optionalWith(
    S.Struct({
      /**
       * The object type, which is always `list`.
       */
      "object": S.optionalWith(S.String, { nullable: true }),
      "data": S.optionalWith(
        S.Array(S.Struct({
          /**
           * An error code identifying the error type.
           */
          "code": S.optionalWith(S.String, { nullable: true }),
          /**
           * A human-readable message providing more details about the error.
           */
          "message": S.optionalWith(S.String, { nullable: true }),
          /**
           * The name of the parameter that caused the error, if applicable.
           */
          "param": S.optionalWith(S.String, { nullable: true }),
          /**
           * The line number of the input file where the error occurred, if applicable.
           */
          "line": S.optionalWith(S.Int, { nullable: true })
        })),
        { nullable: true }
      )
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
  /**
   * The request counts for different statuses within the batch.
   */
  "request_counts": S.optionalWith(
    S.Struct({
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

/**
 * The endpoint to be used for all requests in the batch. Currently `/v1/responses`, `/v1/chat/completions`, `/v1/embeddings`, and `/v1/completions` are supported. Note that `/v1/embeddings` batches are also restricted to a maximum of 50,000 embedding inputs across all requests in the batch.
 */
export class CreateBatchRequestEndpoint
  extends S.Literal("/v1/responses", "/v1/chat/completions", "/v1/embeddings", "/v1/completions")
{}

/**
 * The time frame within which the batch should be processed. Currently only `24h` is supported.
 */
export class CreateBatchRequestCompletionWindow extends S.Literal("24h") {}

export class CreateBatchRequest extends S.Class<CreateBatchRequest>("CreateBatchRequest")({
  /**
   * The ID of an uploaded file that contains requests for the new batch.
   *
   * See [upload file](/docs/api-reference/files/create) for how to upload a file.
   *
   * Your input file must be formatted as a [JSONL file](/docs/api-reference/batch/request-input), and must be uploaded with the purpose `batch`. The file can contain up to 50,000 requests, and can be up to 200 MB in size.
   */
  "input_file_id": S.String,
  /**
   * The endpoint to be used for all requests in the batch. Currently `/v1/responses`, `/v1/chat/completions`, `/v1/embeddings`, and `/v1/completions` are supported. Note that `/v1/embeddings` batches are also restricted to a maximum of 50,000 embedding inputs across all requests in the batch.
   */
  "endpoint": CreateBatchRequestEndpoint,
  /**
   * The time frame within which the batch should be processed. Currently only `24h` is supported.
   */
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

/**
 * The type of this object. It is always set to "list".
 */
export class ChatCompletionListObject extends S.Literal("list") {}

/**
 * The type of the tool. Currently, only `function` is supported.
 */
export class ChatCompletionMessageToolCallType extends S.Literal("function") {}

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
 * The tool calls generated by the model, such as function calls.
 */
export class ChatCompletionMessageToolCalls extends S.Array(ChatCompletionMessageToolCall) {}

/**
 * The role of the author of this message.
 */
export class ChatCompletionResponseMessageRole extends S.Literal("assistant") {}

/**
 * A chat completion message generated by the model.
 */
export class ChatCompletionResponseMessage
  extends S.Class<ChatCompletionResponseMessage>("ChatCompletionResponseMessage")({
    /**
     * The contents of the message.
     */
    "content": S.NullOr(S.String),
    /**
     * The refusal message generated by the model.
     */
    "refusal": S.NullOr(S.String),
    "tool_calls": S.optionalWith(ChatCompletionMessageToolCalls, { nullable: true }),
    /**
     * Annotations for the message, when applicable, as when using the
     * [web search tool](/docs/guides/tools-web-search?api-mode=chat).
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
    /**
     * If the audio output modality is requested, this object contains data
     * about the audio response from the model. [Learn more](/docs/guides/audio).
     */
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
  /**
   * A list of integers representing the UTF-8 bytes representation of the token. Useful in instances where characters are represented by multiple tokens and their byte representations must be combined to generate the correct text representation. Can be `null` if there is no bytes representation for the token.
   */
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
    /**
     * A list of integers representing the UTF-8 bytes representation of the token. Useful in instances where characters are represented by multiple tokens and their byte representations must be combined to generate the correct text representation. Can be `null` if there is no bytes representation for the token.
     */
    "bytes": S.NullOr(S.Array(S.Int))
  }))
}) {}

/**
 * Specifies the latency tier to use for processing the request. This parameter is relevant for customers subscribed to the scale tier service:
 *   - If set to 'auto', and the Project is Scale tier enabled, the system
 *     will utilize scale tier credits until they are exhausted.
 *   - If set to 'auto', and the Project is not Scale tier enabled, the request will be processed using the default service tier with a lower uptime SLA and no latency guarentee.
 *   - If set to 'default', the request will be processed using the default service tier with a lower uptime SLA and no latency guarentee.
 *   - If set to 'flex', the request will be processed with the Flex Processing service tier. [Learn more](/docs/guides/flex-processing).
 *   - When not set, the default behavior is 'auto'.
 *
 *   When this parameter is set, the response body will include the `service_tier` utilized.
 */
export class ServiceTier extends S.Literal("auto", "default", "flex", "scale") {}

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
      /**
       * Log probability information for the choice.
       */
      "logprobs": S.optional(S.NullOr(S.Struct({
        /**
         * A list of message content tokens with log probability information.
         */
        "content": S.NullOr(S.Array(ChatCompletionTokenLogprob)),
        /**
         * A list of message refusal tokens with log probability information.
         */
        "refusal": S.NullOr(S.Array(ChatCompletionTokenLogprob))
      })))
    })),
    /**
     * The Unix timestamp (in seconds) of when the chat completion was created.
     */
    "created": S.Int,
    /**
     * The model used for the chat completion.
     */
    "model": S.String,
    "service_tier": S.optionalWith(ServiceTier, { nullable: true, default: () => "auto" as const }),
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
 * Learn about [text inputs](/docs/guides/text-generation).
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
 * Specifies the detail level of the image. Learn more in the [Vision guide](/docs/guides/vision#low-or-high-fidelity-image-understanding).
 */
export class ChatCompletionRequestMessageContentPartImageImageUrlDetail extends S.Literal("auto", "low", "high") {}

/**
 * Learn about [image inputs](/docs/guides/vision).
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
       * Specifies the detail level of the image. Learn more in the [Vision guide](/docs/guides/vision#low-or-high-fidelity-image-understanding).
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
 * Learn about [audio inputs](/docs/guides/audio).
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
 * Learn about [file inputs](/docs/guides/text) for text generation.
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
       * An array of content parts with a defined type. Supported options differ based on the [model](/docs/models) being used to generate the response. Can contain text, image, or audio inputs.
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
    /**
     * The contents of the assistant message. Required unless `tool_calls` or `function_call` is specified.
     */
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
    /**
     * The refusal message by the assistant.
     */
    "refusal": S.optionalWith(S.String, { nullable: true }),
    /**
     * The role of the messages author, in this case `assistant`.
     */
    "role": ChatCompletionRequestAssistantMessageRole,
    /**
     * An optional name for the participant. Provides the model information to differentiate between participants of the same role.
     */
    "name": S.optionalWith(S.String, { nullable: true }),
    /**
     * Data about a previous audio response from the model.
     * [Learn more](/docs/guides/audio).
     */
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
    /**
     * The contents of the function message.
     */
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

export class ModelIdsSharedEnum extends S.Literal(
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
  "gpt-4o-mini-audio-preview",
  "gpt-4o-mini-audio-preview-2024-12-17",
  "gpt-4o-search-preview",
  "gpt-4o-mini-search-preview",
  "gpt-4o-search-preview-2025-03-11",
  "gpt-4o-mini-search-preview-2025-03-11",
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

export class ModelIdsShared extends S.Union(S.String, ModelIdsSharedEnum) {}

/**
 * Output types that you would like the model to generate.
 * Most models are capable of generating text, which is the default:
 *
 * `["text"]`
 *
 * The `gpt-4o-audio-preview` model can also be used to
 * [generate audio](/docs/guides/audio). To request that this model generate
 * both text and audio responses, you can use:
 *
 * `["text", "audio"]`
 */
export class ResponseModalities extends S.Array(S.Literal("text", "audio")) {}

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
     * An array of content parts with a defined type. Supported options differ based on the [model](/docs/models) being used to generate the response. Can contain text inputs.
     */
    S.NonEmptyArray(ChatCompletionRequestMessageContentPartText).pipe(S.minItems(1))
  )
}) {}

/**
 * Options for streaming response. Only set this when you set `stream: true`.
 */
export class ChatCompletionStreamOptions extends S.Class<ChatCompletionStreamOptions>("ChatCompletionStreamOptions")({
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
  "include_usage": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * The type of the tool. Currently, only `function` is supported.
 */
export class ChatCompletionToolType extends S.Literal("function") {}

export class ChatCompletionTool extends S.Class<ChatCompletionTool>("ChatCompletionTool")({
  /**
   * The type of the tool. Currently, only `function` is supported.
   */
  "type": ChatCompletionToolType,
  "function": FunctionObject
}) {}

/**
 * `none` means the model will not call any tool and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools.
 */
export class ChatCompletionToolChoiceOptionEnum extends S.Literal("none", "auto", "required") {}

/**
 * The type of the tool. Currently, only `function` is supported.
 */
export class ChatCompletionNamedToolChoiceType extends S.Literal("function") {}

/**
 * Specifies a tool the model should use. Use to force the model to call a specific function.
 */
export class ChatCompletionNamedToolChoice
  extends S.Class<ChatCompletionNamedToolChoice>("ChatCompletionNamedToolChoice")({
    /**
     * The type of the tool. Currently, only `function` is supported.
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
  ChatCompletionNamedToolChoice
) {}

/**
 * Whether to enable [parallel function calling](/docs/guides/function-calling#configuring-parallel-function-calling) during tool use.
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

export class CreateChatCompletionRequest extends S.Class<CreateChatCompletionRequest>("CreateChatCompletionRequest")({
  /**
   * A list of messages comprising the conversation so far. Depending on the
   * [model](/docs/models) you use, different message types (modalities) are
   * supported, like [text](/docs/guides/text-generation),
   * [images](/docs/guides/vision), and [audio](/docs/guides/audio).
   */
  "messages": S.NonEmptyArray(ChatCompletionRequestMessage).pipe(S.minItems(1)),
  /**
   * Model ID used to generate the response, like `gpt-4o` or `o3`. OpenAI
   * offers a wide range of models with different capabilities, performance
   * characteristics, and price points. Refer to the [model guide](/docs/models)
   * to browse and compare available models.
   */
  "model": ModelIdsShared,
  "modalities": S.optionalWith(ResponseModalities, { nullable: true }),
  /**
   * Constrains the verbosity of the model's response. Lower values will result
   * in more concise responseswhile higher values will result in more verbose
   * responses.
   */
  "verbosity": S.optionalWith(S.Literal("low", "medium", "high"), { nullable: true, default: () => "medium" as const }),
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  /**
   * An upper bound for the number of tokens that can be generated for a completion, including visible output tokens and [reasoning tokens](/docs/guides/reasoning).
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
   * Learn more about the [web search tool](/docs/guides/tools-web-search?api-mode=chat).
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
  /**
   * An integer between 0 and 20 specifying the number of most likely tokens to
   * return at each token position, each with an associated log probability.
   * `logprobs` must be set to `true` if this parameter is used.
   */
  "top_logprobs": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)), { nullable: true }),
  /**
   * An object specifying the format that the model must output.
   *
   * Setting to `{ "type": "json_schema", "json_schema": {...} }` enables
   * Structured Outputs which ensures the model will match your supplied JSON
   * schema. Learn more in the [Structured Outputs
   * guide](/docs/guides/structured-outputs).
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
   * `modalities: ["audio"]`. [Learn more](/docs/guides/audio).
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
   * use in our [model distillation](/docs/guides/distillation) or
   * [evals](/docs/guides/evals) products.
   */
  "store": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * If set to true, the model response data will be streamed to the client
   * as it is generated using [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
   * See the [Streaming section below](/docs/api-reference/chat/streaming)
   * for more information, along with the [streaming responses](/docs/guides/streaming-responses)
   * guide for more information on how to handle the streaming events.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stop": S.optionalWith(S.NullOr(StopConfiguration), { default: () => null }),
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
   * not compatible with [o-series models](/docs/guides/reasoning).
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
   * Configuration for a [Predicted Output](/docs/guides/predicted-outputs),
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
  "stream_options": S.optionalWith(S.NullOr(ChatCompletionStreamOptions), { default: () => null }),
  /**
   * A list of tools the model may call. Currently, only functions are supported as a tool. Use this to provide a list of functions the model may generate JSON inputs for. A max of 128 functions are supported.
   */
  "tools": S.optionalWith(S.Array(ChatCompletionTool), { nullable: true }),
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
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
   * We generally recommend altering this or `top_p` but not both.
   */
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * An alternative to sampling with temperature, called nucleus sampling,
   * where the model considers the results of the tokens with top_p probability
   * mass. So 0.1 means only the tokens comprising the top 10% probability mass
   * are considered.
   *
   * We generally recommend altering this or `temperature` but not both.
   */
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](/docs/guides/safety-best-practices#end-user-ids).
   */
  "user": S.optionalWith(S.String, { nullable: true }),
  "service_tier": S.optionalWith(ServiceTier, { nullable: true, default: () => "auto" as const })
}) {}

export class UpdateChatCompletionRequest extends S.Class<UpdateChatCompletionRequest>("UpdateChatCompletionRequest")({
  "metadata": S.NullOr(Metadata)
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
    /**
     * The contents of the message.
     */
    "content": S.NullOr(S.String),
    /**
     * The refusal message generated by the model.
     */
    "refusal": S.NullOr(S.String),
    "tool_calls": S.optionalWith(ChatCompletionMessageToolCalls, { nullable: true }),
    /**
     * Annotations for the message, when applicable, as when using the
     * [web search tool](/docs/guides/tools-web-search?api-mode=chat).
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
    /**
     * If the audio output modality is requested, this object contains data
     * about the audio response from the model. [Learn more](/docs/guides/audio).
     */
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
   * ID of the model to use. You can use the [List models](/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](/docs/models) for descriptions of them.
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
  ).pipe(S.propertySignature, S.withConstructorDefault(() => "<|endoftext|>" as const)),
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
   * [See more information about frequency and presence penalties.](/docs/guides/text-generation)
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
   * [See more information about frequency and presence penalties.](/docs/guides/text-generation)
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
  "stop": S.optionalWith(S.NullOr(StopConfiguration), { default: () => null }),
  /**
   * Whether to stream back partial progress. If set, tokens will be sent as data-only [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format) as they become available, with the stream terminated by a `data: [DONE]` message. [Example Python code](https://cookbook.openai.com/examples/how_to_stream_completions).
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  "stream_options": S.optionalWith(S.NullOr(ChatCompletionStreamOptions), { default: () => null }),
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
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](/docs/guides/safety-best-practices#end-user-ids).
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

export class CreateEmbeddingRequestModelEnum
  extends S.Literal("text-embedding-ada-002", "text-embedding-3-small", "text-embedding-3-large")
{}

/**
 * The format to return the embeddings in. Can be either `float` or [`base64`](https://pypi.org/project/pybase64/).
 */
export class CreateEmbeddingRequestEncodingFormat extends S.Literal("float", "base64") {}

export class CreateEmbeddingRequest extends S.Class<CreateEmbeddingRequest>("CreateEmbeddingRequest")({
  /**
   * Input text to embed, encoded as a string or array of tokens. To embed multiple inputs in a single request, pass an array of strings or array of token arrays. The input must not exceed the max input tokens for the model (8192 tokens for `text-embedding-ada-002`), cannot be an empty string, and any array must be 2048 dimensions or less. [Example Python code](https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken) for counting tokens. Some models may also impose a limit on total number of tokens summed across inputs.
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
   * ID of the model to use. You can use the [List models](/docs/api-reference/models/list) API to see all of your available models, or see our [Model overview](/docs/models) for descriptions of them.
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
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](/docs/guides/safety-best-practices#end-user-ids).
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
   * The embedding vector, which is a list of floats. The length of vector depends on the model as listed in the [embedding guide](/docs/guides/embeddings).
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
 * The type of data source. Always `stored_completions`.
 */
export class EvalStoredCompletionsDataSourceConfigType extends S.Literal("stored_completions") {}

/**
 * A StoredCompletionsDataSourceConfig which specifies the metadata property of your stored completions query.
 * This is usually metadata like `usecase=chatbot` or `prompt-version=v2`, etc.
 * The schema returned by this data source config is used to defined what variables are available in your evals.
 * `item` and `sample` are both defined when using this data source config.
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
    "metadata": S.optionalWith(Metadata, { nullable: true }),
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
export class EvalLabelModelGraderType extends S.Literal("label_model") {}

/**
 * The role of the message input. One of `user`, `assistant`, `system`, or
 * `developer`.
 */
export class EvalItemRole extends S.Literal("user", "assistant", "system", "developer") {}

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
export class EvalItemContentEnumType extends S.Literal("output_text") {}

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
   * Text inputs to the model - can contain template strings.
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
    })
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
export class EvalLabelModelGrader extends S.Class<EvalLabelModelGrader>("EvalLabelModelGrader")({
  /**
   * The object type, which is always `label_model`.
   */
  "type": EvalLabelModelGraderType,
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
export class EvalStringCheckGraderType extends S.Literal("string_check") {}

/**
 * The string check operation to perform. One of `eq`, `ne`, `like`, or `ilike`.
 */
export class EvalStringCheckGraderOperation extends S.Literal("eq", "ne", "like", "ilike") {}

/**
 * A StringCheckGrader object that performs a string comparison between input and reference using a specified operation.
 */
export class EvalStringCheckGrader extends S.Class<EvalStringCheckGrader>("EvalStringCheckGrader")({
  /**
   * The object type, which is always `string_check`.
   */
  "type": EvalStringCheckGraderType,
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
  "operation": EvalStringCheckGraderOperation
}) {}

/**
 * The type of grader.
 */
export class EvalTextSimilarityGraderType extends S.Literal("text_similarity") {}

/**
 * The evaluation metric to use. One of `fuzzy_match`, `bleu`, `gleu`, `meteor`, `rouge_1`, `rouge_2`, `rouge_3`, `rouge_4`, `rouge_5`, or `rouge_l`.
 */
export class EvalTextSimilarityGraderEvaluationMetric extends S.Literal(
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
export class EvalTextSimilarityGrader extends S.Class<EvalTextSimilarityGrader>("EvalTextSimilarityGrader")({
  /**
   * The type of grader.
   */
  "type": EvalTextSimilarityGraderType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "text_similarity" as const)
  ),
  /**
   * The name of the grader.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * The text being graded.
   */
  "input": S.String,
  /**
   * The text being graded against.
   */
  "reference": S.String,
  /**
   * A float score where a value greater than or equal indicates a passing grade.
   */
  "pass_threshold": S.Number,
  /**
   * The evaluation metric to use. One of `fuzzy_match`, `bleu`, `gleu`, `meteor`, `rouge_1`, `rouge_2`, `rouge_3`, `rouge_4`, `rouge_5`, or `rouge_l`.
   */
  "evaluation_metric": EvalTextSimilarityGraderEvaluationMetric
}) {}

/**
 * The object type, which is always `python`.
 */
export class EvalPythonGraderType extends S.Literal("python") {}

/**
 * A PythonGrader object that runs a python script on the input.
 */
export class EvalPythonGrader extends S.Class<EvalPythonGrader>("EvalPythonGrader")({
  /**
   * The object type, which is always `python`.
   */
  "type": EvalPythonGraderType,
  /**
   * The name of the grader.
   */
  "name": S.String,
  /**
   * The source code of the python script.
   */
  "source": S.String,
  /**
   * The threshold for the score.
   */
  "pass_threshold": S.optionalWith(S.Number, { nullable: true }),
  /**
   * The image tag to use for the python script.
   */
  "image_tag": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The object type, which is always `score_model`.
 */
export class EvalScoreModelGraderType extends S.Literal("score_model") {}

/**
 * A ScoreModelGrader object that uses a model to assign a score to the input.
 */
export class EvalScoreModelGrader extends S.Class<EvalScoreModelGrader>("EvalScoreModelGrader")({
  /**
   * The object type, which is always `score_model`.
   */
  "type": EvalScoreModelGraderType,
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
  "sampling_params": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * The input text. This may include template strings.
   */
  "input": S.Array(EvalItem),
  /**
   * The threshold for the score.
   */
  "pass_threshold": S.optionalWith(S.Number, { nullable: true }),
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
 *  - Check if o3-mini is better at my usecase than gpt-4o
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
      EvalLabelModelGrader,
      EvalStringCheckGrader,
      EvalTextSimilarityGrader,
      EvalPythonGrader,
      EvalScoreModelGrader
    )
  ),
  /**
   * The Unix timestamp (in seconds) for when the eval was created.
   */
  "created_at": S.Int,
  "metadata": S.NullOr(Metadata)
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
 * A data source config which specifies the metadata property of your stored completions query.
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
 * The object type, which is always `label_model`.
 */
export class CreateEvalLabelModelGraderType extends S.Literal("label_model") {}

/**
 * A chat message that makes up the prompt or context. May include variable references to the "item" namespace, ie {{item.name}}.
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
   * A list of chat messages forming the prompt or context. May include variable references to the "item" namespace, ie {{item.name}}.
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
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  /**
   * The configuration for the data source used for the evaluation runs.
   */
  "data_source_config": S.Record({ key: S.String, value: S.Unknown }),
  /**
   * A list of graders for all eval runs in this group.
   */
  "testing_criteria": S.Array(
    S.Union(
      CreateEvalLabelModelGrader,
      EvalStringCheckGrader,
      EvalTextSimilarityGrader,
      EvalPythonGrader,
      EvalScoreModelGrader
    )
  )
}) {}

export class UpdateEvalRequest extends S.Class<UpdateEvalRequest>("UpdateEvalRequest")({
  /**
   * Rename the evaluation.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  "metadata": S.optionalWith(Metadata, { nullable: true })
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
 * The role of the message input. One of `user`, `assistant`, `system`, or
 * `developer`.
 */
export class EasyInputMessageRole extends S.Literal("user", "assistant", "system", "developer") {}

/**
 * The type of the input item. Always `input_image`.
 */
export class InputImageContentType extends S.Literal("input_image") {}

/**
 * The detail level of the image to be sent to the model. One of `high`, `low`, or `auto`. Defaults to `auto`.
 */
export class InputImageContentDetail extends S.Literal("low", "high", "auto") {}

/**
 * An image input to the model. Learn about [image inputs](/docs/guides/vision).
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
  "detail": InputImageContentDetail
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
   * The content of the file to be sent to the model.
   */
  "file_data": S.optionalWith(S.String, { nullable: true })
}) {}

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
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  /**
   * An optional model to filter by (e.g., 'gpt-4o').
   */
  "model": S.optionalWith(S.String, { nullable: true }),
  /**
   * An optional Unix timestamp to filter items created after this time.
   */
  "created_after": S.optionalWith(S.Int, { nullable: true }),
  /**
   * An optional Unix timestamp to filter items created before this time.
   */
  "created_before": S.optionalWith(S.Int, { nullable: true }),
  /**
   * An optional maximum number of items to return.
   */
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
    "input_messages": S.optionalWith(
      S.Union(
        S.Struct({
          /**
           * The type of input messages. Always `template`.
           */
          "type": CreateEvalCompletionsRunDataSourceInputMessagesEnumType,
          /**
           * A list of chat messages forming the prompt or context. May include variable references to the "item" namespace, ie {{item.name}}.
           */
          "template": S.Array(S.Union(EasyInputMessage, EvalItem))
        }),
        S.Struct({
          /**
           * The type of input messages. Always `item_reference`.
           */
          "type": CreateEvalCompletionsRunDataSourceInputMessagesEnumType,
          /**
           * A reference to a variable in the "item" namespace. Ie, "item.name"
           */
          "item_reference": S.String
        })
      ),
      { nullable: true }
    ),
    "sampling_params": S.optionalWith(
      S.Struct({
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
        "seed": S.optionalWith(S.Int, { nullable: true, default: () => 42 as const })
      }),
      { nullable: true }
    ),
    /**
     * The name of the model to use for generating completions (e.g. "o3-mini").
     */
    "model": S.optionalWith(S.String, { nullable: true }),
    "source": S.Union(EvalJsonlFileContentSource, EvalJsonlFileIdSource, EvalStoredCompletionsSource)
  })
{}

/**
 * The type of run data source. Always `completions`.
 */
export class CreateEvalResponsesRunDataSourceType extends S.Literal("completions") {}

/**
 * The type of input messages. Always `item_reference`.
 */
export class CreateEvalResponsesRunDataSourceInputMessagesEnumType extends S.Literal("item_reference") {}

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
  /**
   * Metadata filter for the responses. This is a query parameter used to select responses.
   */
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * The name of the model to find responses for. This is a query parameter used to select responses.
   */
  "model": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional search string for instructions. This is a query parameter used to select responses.
   */
  "instructions_search": S.optionalWith(S.String, { nullable: true }),
  /**
   * Only include items created after this timestamp (inclusive). This is a query parameter used to select responses.
   */
  "created_after": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  /**
   * Only include items created before this timestamp (inclusive). This is a query parameter used to select responses.
   */
  "created_before": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  /**
   * Whether the response has tool calls. This is a query parameter used to select responses.
   */
  "has_tool_calls": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Optional reasoning effort parameter. This is a query parameter used to select responses.
   */
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  /**
   * Sampling temperature. This is a query parameter used to select responses.
   */
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Nucleus sampling parameter. This is a query parameter used to select responses.
   */
  "top_p": S.optionalWith(S.Number, { nullable: true }),
  /**
   * List of user identifiers. This is a query parameter used to select responses.
   */
  "users": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Whether to allow parallel tool calls. This is a query parameter used to select responses.
   */
  "allow_parallel_tool_calls": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * A ResponsesRunDataSource object describing a model sampling configuration.
 */
export class CreateEvalResponsesRunDataSource
  extends S.Class<CreateEvalResponsesRunDataSource>("CreateEvalResponsesRunDataSource")({
    /**
     * The type of run data source. Always `completions`.
     */
    "type": CreateEvalResponsesRunDataSourceType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "completions" as const)
    ),
    "input_messages": S.optionalWith(
      S.Union(
        S.Struct({
          /**
           * The type of input messages. Always `template`.
           */
          "type": CreateEvalResponsesRunDataSourceInputMessagesEnumType,
          /**
           * A list of chat messages forming the prompt or context. May include variable references to the "item" namespace, ie {{item.name}}.
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
           * A reference to a variable in the "item" namespace. Ie, "item.name"
           */
          "item_reference": S.String
        })
      ),
      { nullable: true }
    ),
    "sampling_params": S.optionalWith(
      S.Struct({
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
        "seed": S.optionalWith(S.Int, { nullable: true, default: () => 42 as const })
      }),
      { nullable: true }
    ),
    /**
     * The name of the model to use for generating completions (e.g. "o3-mini").
     */
    "model": S.optionalWith(S.String, { nullable: true }),
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
  "metadata": S.NullOr(Metadata),
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
  "metadata": S.optionalWith(Metadata, { nullable: true }),
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
   * A list of results from the evaluation run.
   */
  "results": S.Array(S.Record({ key: S.String, value: S.Unknown })),
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
 * The intended purpose of the file. Supported values are `assistants`, `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results` and `vision`.
 */
export class OpenAIFilePurpose extends S.Literal(
  "assistants",
  "assistants_output",
  "batch",
  "batch_output",
  "fine-tune",
  "fine-tune-results",
  "vision"
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
   * The intended purpose of the file. Supported values are `assistants`, `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results` and `vision`.
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
export class CreateFileRequestPurpose
  extends S.Literal("assistants", "batch", "fine-tune", "vision", "user_data", "evals")
{}

export class CreateFileRequest extends S.Class<CreateFileRequest>("CreateFileRequest")({
  /**
   * The File object (not file name) to be uploaded.
   */
  "file": S.instanceOf(globalThis.Blob),
  /**
   * The intended purpose of the uploaded file. One of: - `assistants`: Used in the Assistants API - `batch`: Used in the Batch API - `fine-tune`: Used for fine-tuning - `vision`: Images used for vision fine-tuning - `user_data`: Flexible file type for any purpose - `evals`: Used for eval data sets
   */
  "purpose": CreateFileRequestPurpose
}) {}

export class DeleteFileResponseObject extends S.Literal("file") {}

export class DeleteFileResponse extends S.Class<DeleteFileResponse>("DeleteFileResponse")({
  "id": S.String,
  "object": DeleteFileResponseObject,
  "deleted": S.Boolean
}) {}

export class DownloadFile200 extends S.String {}

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
}) {}

/**
 * The type of method. Is either `supervised` or `dpo`.
 */
export class FineTuneMethodType extends S.Literal("supervised", "dpo") {}

export class FineTuneSupervisedMethodHyperparametersBatchSizeEnum extends S.Literal("auto") {}

export class FineTuneSupervisedMethodHyperparametersLearningRateMultiplierEnum extends S.Literal("auto") {}

export class FineTuneSupervisedMethodHyperparametersNEpochsEnum extends S.Literal("auto") {}

/**
 * Configuration for the supervised fine-tuning method.
 */
export class FineTuneSupervisedMethod extends S.Class<FineTuneSupervisedMethod>("FineTuneSupervisedMethod")({
  /**
   * The hyperparameters used for the fine-tuning job.
   */
  "hyperparameters": S.optionalWith(
    S.Struct({
      /**
       * Number of examples in each batch. A larger batch size means that model parameters are updated less frequently, but with lower variance.
       */
      "batch_size": S.optionalWith(
        S.Union(
          FineTuneSupervisedMethodHyperparametersBatchSizeEnum,
          S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
        ),
        { nullable: true, default: () => "auto" as const }
      ),
      /**
       * Scaling factor for the learning rate. A smaller learning rate may be useful to avoid overfitting.
       */
      "learning_rate_multiplier": S.optionalWith(
        S.Union(FineTuneSupervisedMethodHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
        {
          nullable: true,
          default: () => "auto" as const
        }
      ),
      /**
       * The number of epochs to train the model for. An epoch refers to one full cycle through the training dataset.
       */
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

/**
 * Configuration for the DPO fine-tuning method.
 */
export class FineTuneDPOMethod extends S.Class<FineTuneDPOMethod>("FineTuneDPOMethod")({
  /**
   * The hyperparameters used for the fine-tuning job.
   */
  "hyperparameters": S.optionalWith(
    S.Struct({
      /**
       * The beta value for the DPO method. A higher beta value will increase the weight of the penalty between the policy and reference model.
       */
      "beta": S.optionalWith(
        S.Union(FineTuneDPOMethodHyperparametersBetaEnum, S.Number.pipe(S.greaterThan(0), S.lessThanOrEqualTo(2))),
        {
          nullable: true,
          default: () => "auto" as const
        }
      ),
      /**
       * Number of examples in each batch. A larger batch size means that model parameters are updated less frequently, but with lower variance.
       */
      "batch_size": S.optionalWith(
        S.Union(
          FineTuneDPOMethodHyperparametersBatchSizeEnum,
          S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
        ),
        { nullable: true, default: () => "auto" as const }
      ),
      /**
       * Scaling factor for the learning rate. A smaller learning rate may be useful to avoid overfitting.
       */
      "learning_rate_multiplier": S.optionalWith(
        S.Union(FineTuneDPOMethodHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
        {
          nullable: true,
          default: () => "auto" as const
        }
      ),
      /**
       * The number of epochs to train the model for. An epoch refers to one full cycle through the training dataset.
       */
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

/**
 * The method used for fine-tuning.
 */
export class FineTuneMethod extends S.Class<FineTuneMethod>("FineTuneMethod")({
  /**
   * The type of method. Is either `supervised` or `dpo`.
   */
  "type": S.optionalWith(FineTuneMethodType, { nullable: true }),
  "supervised": S.optionalWith(FineTuneSupervisedMethod, { nullable: true }),
  "dpo": S.optionalWith(FineTuneDPOMethod, { nullable: true })
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
  /**
   * For fine-tuning jobs that have `failed`, this will contain more information on the cause of the failure.
   */
  "error": S.NullOr(S.Struct({
    /**
     * A machine-readable error code.
     */
    "code": S.String,
    /**
     * A human-readable error message.
     */
    "message": S.String,
    /**
     * The parameter that was invalid, usually `training_file` or `validation_file`. This field will be null if the failure was not parameter-specific.
     */
    "param": S.NullOr(S.String)
  })),
  /**
   * The name of the fine-tuned model that is being created. The value will be null if the fine-tuning job is still running.
   */
  "fine_tuned_model": S.NullOr(S.String),
  /**
   * The Unix timestamp (in seconds) for when the fine-tuning job was finished. The value will be null if the fine-tuning job is still running.
   */
  "finished_at": S.NullOr(S.Int),
  /**
   * The hyperparameters used for the fine-tuning job. This value will only be returned when running `supervised` jobs.
   */
  "hyperparameters": S.Struct({
    /**
     * Number of examples in each batch. A larger batch size means that model parameters
     * are updated less frequently, but with lower variance.
     */
    "batch_size": S.optionalWith(
      S.Union(
        FineTuningJobHyperparametersBatchSizeEnum,
        S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(256))
      ),
      { nullable: true, default: () => "auto" as const }
    ),
    /**
     * Scaling factor for the learning rate. A smaller learning rate may be useful to avoid
     * overfitting.
     */
    "learning_rate_multiplier": S.optionalWith(
      S.Union(FineTuningJobHyperparametersLearningRateMultiplierEnum, S.Number.pipe(S.greaterThan(0))),
      {
        nullable: true,
        default: () => "auto" as const
      }
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
   * The compiled results file ID(s) for the fine-tuning job. You can retrieve the results with the [Files API](/docs/api-reference/files/retrieve-contents).
   */
  "result_files": S.Array(S.String),
  /**
   * The current status of the fine-tuning job, which can be either `validating_files`, `queued`, `running`, `succeeded`, `failed`, or `cancelled`.
   */
  "status": FineTuningJobStatus,
  /**
   * The total number of billable tokens processed by this fine-tuning job. The value will be null if the fine-tuning job is still running.
   */
  "trained_tokens": S.NullOr(S.Int),
  /**
   * The file ID used for training. You can retrieve the training data with the [Files API](/docs/api-reference/files/retrieve-contents).
   */
  "training_file": S.String,
  /**
   * The file ID used for validation. You can retrieve the validation results with the [Files API](/docs/api-reference/files/retrieve-contents).
   */
  "validation_file": S.NullOr(S.String),
  /**
   * A list of integrations to enable for this fine-tuning job.
   */
  "integrations": S.optionalWith(S.Array(FineTuningIntegration).pipe(S.maxItems(5)), { nullable: true }),
  /**
   * The seed used for the fine-tuning job.
   */
  "seed": S.Int,
  /**
   * The Unix timestamp (in seconds) for when the fine-tuning job is estimated to finish. The value will be null if the fine-tuning job is not running.
   */
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
  /**
   * The name of the model to fine-tune. You can select one of the
   * [supported models](/docs/guides/fine-tuning#which-models-can-be-fine-tuned).
   */
  "model": S.Union(S.String, CreateFineTuningJobRequestModelEnum),
  /**
   * The ID of an uploaded file that contains training data.
   *
   * See [upload file](/docs/api-reference/files/create) for how to upload a file.
   *
   * Your dataset must be formatted as a JSONL file. Additionally, you must upload your file with the purpose `fine-tune`.
   *
   * The contents of the file should differ depending on if the model uses the [chat](/docs/api-reference/fine-tuning/chat-input), [completions](/docs/api-reference/fine-tuning/completions-input) format, or if the fine-tuning method uses the [preference](/docs/api-reference/fine-tuning/preference-input) format.
   *
   * See the [fine-tuning guide](/docs/guides/fine-tuning) for more details.
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
        {
          nullable: true,
          default: () => "auto" as const
        }
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
   * See the [fine-tuning guide](/docs/guides/fine-tuning) for more details.
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
  "metadata": S.optionalWith(Metadata, { nullable: true })
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

export class CreateImageEditRequestModelEnum extends S.Literal("dall-e-2", "gpt-image-1") {}

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
 * The quality of the image that will be generated. `high`, `medium` and `low` are only supported for `gpt-image-1`. `dall-e-2` only supports `standard` quality. Defaults to `auto`.
 */
export class CreateImageEditRequestQuality extends S.Literal("standard", "low", "medium", "high", "auto") {}

export class CreateImageEditRequest extends S.Class<CreateImageEditRequest>("CreateImageEditRequest")({
  /**
   * The image(s) to edit. Must be a supported image file or an array of images.
   *
   * For `gpt-image-1`, each image should be a `png`, `webp`, or `jpg` file less
   * than 25MB. You can provide up to 16 images.
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
   * The model to use for image generation. Only `dall-e-2` and `gpt-image-1` are supported. Defaults to `dall-e-2` unless a parameter specific to `gpt-image-1` is used.
   */
  "model": S.optionalWith(S.Union(S.String, CreateImageEditRequestModelEnum), {
    nullable: true,
    default: () => "dall-e-2" as const
  }),
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
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](/docs/guides/safety-best-practices#end-user-ids).
   */
  "user": S.optionalWith(S.String, { nullable: true }),
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
   * For `gpt-image-1` only, the token usage information for the image generation.
   */
  "usage": S.optionalWith(
    S.Struct({
      /**
       * The total number of tokens (images and text) used for the image generation.
       */
      "total_tokens": S.Int,
      /**
       * The number of tokens (images and text) in the input prompt.
       */
      "input_tokens": S.Int,
      /**
       * The number of image tokens in the output image.
       */
      "output_tokens": S.Int,
      /**
       * The input tokens detailed information for the image generation.
       */
      "input_tokens_details": S.Struct({
        /**
         * The number of text tokens in the input prompt.
         */
        "text_tokens": S.Int,
        /**
         * The number of image tokens in the input prompt.
         */
        "image_tokens": S.Int
      })
    }),
    { nullable: true }
  )
}) {}

export class CreateImageRequestModelEnum extends S.Literal("dall-e-2", "dall-e-3", "gpt-image-1") {}

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
  "model": S.optionalWith(S.Union(S.String, CreateImageRequestModelEnum), {
    nullable: true,
    default: () => "dall-e-2" as const
  }),
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
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](/docs/guides/safety-best-practices#end-user-ids).
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
  "model": S.optionalWith(S.Union(S.String, CreateImageVariationRequestModelEnum), {
    nullable: true,
    default: () => "dall-e-2" as const
  }),
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
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](/docs/guides/safety-best-practices#end-user-ids).
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
    S.Array(S.Union(
      /**
       * An object describing an image to classify.
       */
      S.Struct({
        /**
         * Always `image_url`.
         */
        "type": S.Literal("image_url"),
        /**
         * Contains either an image URL or a data URL for a base64 encoded image.
         */
        "image_url": S.Struct({
          /**
           * Either a URL of the image or the base64 encoded image data.
           */
          "url": S.String
        })
      }),
      /**
       * An object describing text to classify.
       */
      S.Struct({
        /**
         * Always `text`.
         */
        "type": S.Literal("text"),
        /**
         * A string of text to classify.
         */
        "text": S.String
      })
    ))
  ),
  /**
   * The content moderation model you would like to use. Learn more in
   * [the moderation guide](/docs/guides/moderation), and learn about
   * available models [here](/docs/models#moderation).
   */
  "model": S.optionalWith(S.Union(S.String, CreateModerationRequestModelEnum), {
    nullable: true,
    default: () => "omni-moderation-latest" as const
  })
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
      /**
       * Content that includes instructions or advice that facilitate the planning or execution of wrongdoing, or that gives advice or instruction on how to commit illicit acts. For example, "how to shoplift" would fit this category.
       */
      "illicit": S.NullOr(S.Boolean),
      /**
       * Content that includes instructions or advice that facilitate the planning or execution of wrongdoing that also includes violence, or that gives advice or instruction on the procurement of any weapon.
       */
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
  /**
   * The Unix timestamp (in seconds) of when the API key was last used
   */
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
  "checkpoint_permission.created",
  "checkpoint_permission.deleted",
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
   * The project that the action was scoped to. Absent for actions not scoped to projects.
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
  "checkpoint_permission.created": S.optionalWith(
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
  "checkpoint_permission.deleted": S.optionalWith(
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
          "settings": S.optionalWith(
            S.Struct({
              /**
               * Visibility of the threads page which shows messages created with the Assistants API and Playground. One of `ANY_ROLE`, `OWNERS`, or `NONE`.
               */
              "threads_ui_visibility": S.optionalWith(S.String, { nullable: true }),
              /**
               * Visibility of the usage dashboard which shows activity and costs for your organization. One of `ANY_ROLE` or `OWNERS`.
               */
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

/**
 * The object type, must be `certificate.deleted`.
 */
export class DeleteCertificateResponseObject extends S.Literal("certificate.deleted") {}

export class DeleteCertificateResponse extends S.Class<DeleteCertificateResponse>("DeleteCertificateResponse")({
  /**
   * The object type, must be `certificate.deleted`.
   */
  "object": DeleteCertificateResponseObject,
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
  /**
   * When `group_by=project_id`, this field provides the project ID of the grouped usage result.
   */
  "project_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=user_id`, this field provides the user ID of the grouped usage result.
   */
  "user_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=api_key_id`, this field provides the API key ID of the grouped usage result.
   */
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=model`, this field provides the model name of the grouped usage result.
   */
  "model": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=batch`, this field tells whether the grouped usage result is batch or not.
   */
  "batch": S.optionalWith(S.Boolean, { nullable: true })
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
  /**
   * When `group_by=project_id`, this field provides the project ID of the grouped usage result.
   */
  "project_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=user_id`, this field provides the user ID of the grouped usage result.
   */
  "user_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=api_key_id`, this field provides the API key ID of the grouped usage result.
   */
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=model`, this field provides the model name of the grouped usage result.
   */
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
  /**
   * When `group_by=project_id`, this field provides the project ID of the grouped usage result.
   */
  "project_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=user_id`, this field provides the user ID of the grouped usage result.
   */
  "user_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=api_key_id`, this field provides the API key ID of the grouped usage result.
   */
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=model`, this field provides the model name of the grouped usage result.
   */
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
  /**
   * When `group_by=source`, this field provides the source of the grouped usage result, possible values are `image.generation`, `image.edit`, `image.variation`.
   */
  "source": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=size`, this field provides the image size of the grouped usage result.
   */
  "size": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=project_id`, this field provides the project ID of the grouped usage result.
   */
  "project_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=user_id`, this field provides the user ID of the grouped usage result.
   */
  "user_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=api_key_id`, this field provides the API key ID of the grouped usage result.
   */
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=model`, this field provides the model name of the grouped usage result.
   */
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
  /**
   * When `group_by=project_id`, this field provides the project ID of the grouped usage result.
   */
  "project_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=user_id`, this field provides the user ID of the grouped usage result.
   */
  "user_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=api_key_id`, this field provides the API key ID of the grouped usage result.
   */
  "api_key_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=model`, this field provides the model name of the grouped usage result.
   */
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
    /**
     * When `group_by=project_id`, this field provides the project ID of the grouped usage result.
     */
    "project_id": S.optionalWith(S.String, { nullable: true }),
    /**
     * When `group_by=user_id`, this field provides the user ID of the grouped usage result.
     */
    "user_id": S.optionalWith(S.String, { nullable: true }),
    /**
     * When `group_by=api_key_id`, this field provides the API key ID of the grouped usage result.
     */
    "api_key_id": S.optionalWith(S.String, { nullable: true }),
    /**
     * When `group_by=model`, this field provides the model name of the grouped usage result.
     */
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
  /**
   * When `group_by=project_id`, this field provides the project ID of the grouped usage result.
   */
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
    /**
     * When `group_by=project_id`, this field provides the project ID of the grouped usage result.
     */
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
  /**
   * When `group_by=line_item`, this field provides the line item of the grouped costs result.
   */
  "line_item": S.optionalWith(S.String, { nullable: true }),
  /**
   * When `group_by=project_id`, this field provides the project ID of the grouped costs result.
   */
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
  /**
   * The Unix timestamp (in seconds) of when the project was archived or `null`.
   */
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

export class ProjectCreateRequest extends S.Class<ProjectCreateRequest>("ProjectCreateRequest")({
  /**
   * The friendly name of the project, this name appears in reports.
   */
  "name": S.String
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

/**
 * The Realtime model used for this session.
 */
export class RealtimeSessionCreateRequestModel extends S.Literal(
  "gpt-4o-realtime-preview",
  "gpt-4o-realtime-preview-2024-10-01",
  "gpt-4o-realtime-preview-2024-12-17",
  "gpt-4o-mini-realtime-preview",
  "gpt-4o-mini-realtime-preview-2024-12-17"
) {}

/**
 * The format of input audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
 * For `pcm16`, input audio must be 16-bit PCM at a 24kHz sample rate,
 * single channel (mono), and little-endian byte order.
 */
export class RealtimeSessionCreateRequestInputAudioFormat extends S.Literal("pcm16", "g711_ulaw", "g711_alaw") {}

/**
 * The format of output audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
 * For `pcm16`, output audio is sampled at a rate of 24kHz.
 */
export class RealtimeSessionCreateRequestOutputAudioFormat extends S.Literal("pcm16", "g711_ulaw", "g711_alaw") {}

/**
 * Type of turn detection.
 */
export class RealtimeSessionCreateRequestTurnDetectionType extends S.Literal("server_vad", "semantic_vad") {}

/**
 * Used only for `semantic_vad` mode. The eagerness of the model to respond. `low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`.
 */
export class RealtimeSessionCreateRequestTurnDetectionEagerness extends S.Literal("low", "medium", "high", "auto") {}

/**
 * Type of noise reduction. `near_field` is for close-talking microphones such as headphones, `far_field` is for far-field microphones such as laptop or conference room microphones.
 */
export class RealtimeSessionCreateRequestInputAudioNoiseReductionType extends S.Literal("near_field", "far_field") {}

export class RealtimeSessionCreateRequestMaxResponseOutputTokensEnum extends S.Literal("inf") {}

/**
 * Realtime session object configuration.
 */
export class RealtimeSessionCreateRequest
  extends S.Class<RealtimeSessionCreateRequest>("RealtimeSessionCreateRequest")({
    /**
     * The Realtime model used for this session.
     */
    "model": S.optionalWith(RealtimeSessionCreateRequestModel, { nullable: true }),
    /**
     * The default system instructions (i.e. system message) prepended to model  calls. This field allows the client to guide the model on desired  responses. The model can be instructed on response content and format,  (e.g. "be extremely succinct", "act friendly", "here are examples of good  responses") and on audio behavior (e.g. "talk quickly", "inject emotion  into your voice", "laugh frequently"). The instructions are not guaranteed  to be followed by the model, but they provide guidance to the model on the desired behavior.
     *
     * Note that the server sets default instructions which will be used if this  field is not set and are visible in the `session.created` event at the  start of the session.
     */
    "instructions": S.optionalWith(S.String, { nullable: true }),
    /**
     * The voice the model uses to respond. Voice cannot be changed during the
     * session once the model has responded with audio at least once. Current
     * voice options are `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`,
     * `onyx`, `nova`, `sage`, `shimmer`, and `verse`.
     */
    "voice": S.optionalWith(VoiceIdsShared, { nullable: true }),
    /**
     * The format of input audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
     * For `pcm16`, input audio must be 16-bit PCM at a 24kHz sample rate,
     * single channel (mono), and little-endian byte order.
     */
    "input_audio_format": S.optionalWith(RealtimeSessionCreateRequestInputAudioFormat, {
      nullable: true,
      default: () => "pcm16" as const
    }),
    /**
     * The format of output audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
     * For `pcm16`, output audio is sampled at a rate of 24kHz.
     */
    "output_audio_format": S.optionalWith(RealtimeSessionCreateRequestOutputAudioFormat, {
      nullable: true,
      default: () => "pcm16" as const
    }),
    /**
     * Configuration for input audio transcription, defaults to off and can be  set to `null` to turn off once on. Input audio transcription is not native to the model, since the model consumes audio directly. Transcription runs  asynchronously through [the /audio/transcriptions endpoint](https://platform.openai.com/docs/api-reference/audio/createTranscription) and should be treated as guidance of input audio content rather than precisely what the model heard. The client can optionally set the language and prompt for transcription, these offer additional guidance to the transcription service.
     */
    "input_audio_transcription": S.optionalWith(
      S.Struct({
        /**
         * The model to use for transcription, current options are `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and `whisper-1`.
         */
        "model": S.optionalWith(S.String, { nullable: true }),
        /**
         * The language of the input audio. Supplying the input language in
         * [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (e.g. `en`) format
         * will improve accuracy and latency.
         */
        "language": S.optionalWith(S.String, { nullable: true }),
        /**
         * An optional text to guide the model's style or continue a previous audio
         * segment.
         * For `whisper-1`, the [prompt is a list of keywords](/docs/guides/speech-to-text#prompting).
         * For `gpt-4o-transcribe` models, the prompt is a free text string, for example "expect words related to technology".
         */
        "prompt": S.optionalWith(S.String, { nullable: true })
      }),
      { nullable: true }
    ),
    /**
     * Configuration for turn detection, ether Server VAD or Semantic VAD. This can be set to `null` to turn off, in which case the client must manually trigger model response.
     * Server VAD means that the model will detect the start and end of speech based on audio volume and respond at the end of user speech.
     * Semantic VAD is more advanced and uses a turn detection model (in conjuction with VAD) to semantically estimate whether the user has finished speaking, then dynamically sets a timeout based on this probability. For example, if user audio trails off with "uhhm", the model will score a low probability of turn end and wait longer for the user to continue speaking. This can be useful for more natural conversations, but may have a higher latency.
     */
    "turn_detection": S.optionalWith(
      S.Struct({
        /**
         * Type of turn detection.
         */
        "type": S.optionalWith(RealtimeSessionCreateRequestTurnDetectionType, {
          nullable: true,
          default: () => "server_vad" as const
        }),
        /**
         * Used only for `semantic_vad` mode. The eagerness of the model to respond. `low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`.
         */
        "eagerness": S.optionalWith(RealtimeSessionCreateRequestTurnDetectionEagerness, {
          nullable: true,
          default: () => "auto" as const
        }),
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
        "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const })
      }),
      { nullable: true }
    ),
    /**
     * Configuration for input audio noise reduction. This can be set to `null` to turn off.
     * Noise reduction filters audio added to the input audio buffer before it is sent to VAD and the model.
     * Filtering the audio can improve VAD and turn detection accuracy (reducing false positives) and model performance by improving perception of the input audio.
     */
    "input_audio_noise_reduction": S.optionalWith(
      S.NullOr(S.Struct({
        /**
         * Type of noise reduction. `near_field` is for close-talking microphones such as headphones, `far_field` is for far-field microphones such as laptop or conference room microphones.
         */
        "type": S.optionalWith(RealtimeSessionCreateRequestInputAudioNoiseReductionType, { nullable: true })
      })),
      { default: () => null }
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
    "tool_choice": S.optionalWith(S.String, { nullable: true, default: () => "auto" as const }),
    /**
     * Sampling temperature for the model, limited to [0.6, 1.2]. For audio models a temperature of 0.8 is highly recommended for best performance.
     */
    "temperature": S.optionalWith(S.Number, { nullable: true, default: () => 0.8 as const }),
    /**
     * Maximum number of output tokens for a single assistant response,
     * inclusive of tool calls. Provide an integer between 1 and 4096 to
     * limit output tokens, or `inf` for the maximum available tokens for a
     * given model. Defaults to `inf`.
     */
    "max_response_output_tokens": S.optionalWith(
      S.Union(S.Int, RealtimeSessionCreateRequestMaxResponseOutputTokensEnum),
      { nullable: true }
    )
  })
{}

export class RealtimeSessionCreateResponseMaxResponseOutputTokensEnum extends S.Literal("inf") {}

/**
 * A new Realtime session configuration, with an ephermeral key. Default TTL
 * for keys is one minute.
 */
export class RealtimeSessionCreateResponse
  extends S.Class<RealtimeSessionCreateResponse>("RealtimeSessionCreateResponse")({
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
     * The voice the model uses to respond. Voice cannot be changed during the
     * session once the model has responded with audio at least once. Current
     * voice options are `alloy`, `ash`, `ballad`, `coral`, `echo` `sage`,
     * `shimmer` and `verse`.
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
     * asynchronously through Whisper and should be treated as rough guidance
     * rather than the representation understood by the model.
     */
    "input_audio_transcription": S.optionalWith(
      S.Struct({
        /**
         * The model to use for transcription, `whisper-1` is the only currently
         * supported model.
         */
        "model": S.optionalWith(S.String, { nullable: true })
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
      S.Union(S.Int, RealtimeSessionCreateResponseMaxResponseOutputTokensEnum),
      { nullable: true }
    )
  })
{}

/**
 * The format of input audio. Options are `pcm16`, `g711_ulaw`, or `g711_alaw`.
 * For `pcm16`, input audio must be 16-bit PCM at a 24kHz sample rate,
 * single channel (mono), and little-endian byte order.
 */
export class RealtimeTranscriptionSessionCreateRequestInputAudioFormat
  extends S.Literal("pcm16", "g711_ulaw", "g711_alaw")
{}

/**
 * The model to use for transcription, current options are `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and `whisper-1`.
 */
export class RealtimeTranscriptionSessionCreateRequestInputAudioTranscriptionModel
  extends S.Literal("gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1")
{}

/**
 * Type of turn detection.
 */
export class RealtimeTranscriptionSessionCreateRequestTurnDetectionType
  extends S.Literal("server_vad", "semantic_vad")
{}

/**
 * Used only for `semantic_vad` mode. The eagerness of the model to respond. `low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`.
 */
export class RealtimeTranscriptionSessionCreateRequestTurnDetectionEagerness
  extends S.Literal("low", "medium", "high", "auto")
{}

/**
 * Type of noise reduction. `near_field` is for close-talking microphones such as headphones, `far_field` is for far-field microphones such as laptop or conference room microphones.
 */
export class RealtimeTranscriptionSessionCreateRequestInputAudioNoiseReductionType
  extends S.Literal("near_field", "far_field")
{}

/**
 * Realtime transcription session object configuration.
 */
export class RealtimeTranscriptionSessionCreateRequest
  extends S.Class<RealtimeTranscriptionSessionCreateRequest>("RealtimeTranscriptionSessionCreateRequest")({
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
    "input_audio_transcription": S.optionalWith(
      S.Struct({
        /**
         * The model to use for transcription, current options are `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and `whisper-1`.
         */
        "model": S.optionalWith(RealtimeTranscriptionSessionCreateRequestInputAudioTranscriptionModel, {
          nullable: true
        }),
        /**
         * The language of the input audio. Supplying the input language in
         * [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (e.g. `en`) format
         * will improve accuracy and latency.
         */
        "language": S.optionalWith(S.String, { nullable: true }),
        /**
         * An optional text to guide the model's style or continue a previous audio
         * segment.
         * For `whisper-1`, the [prompt is a list of keywords](/docs/guides/speech-to-text#prompting).
         * For `gpt-4o-transcribe` models, the prompt is a free text string, for example "expect words related to technology".
         */
        "prompt": S.optionalWith(S.String, { nullable: true })
      }),
      { nullable: true }
    ),
    /**
     * Configuration for turn detection, ether Server VAD or Semantic VAD. This can be set to `null` to turn off, in which case the client must manually trigger model response.
     * Server VAD means that the model will detect the start and end of speech based on audio volume and respond at the end of user speech.
     * Semantic VAD is more advanced and uses a turn detection model (in conjuction with VAD) to semantically estimate whether the user has finished speaking, then dynamically sets a timeout based on this probability. For example, if user audio trails off with "uhhm", the model will score a low probability of turn end and wait longer for the user to continue speaking. This can be useful for more natural conversations, but may have a higher latency.
     */
    "turn_detection": S.optionalWith(
      S.Struct({
        /**
         * Type of turn detection.
         */
        "type": S.optionalWith(RealtimeTranscriptionSessionCreateRequestTurnDetectionType, {
          nullable: true,
          default: () => "server_vad" as const
        }),
        /**
         * Used only for `semantic_vad` mode. The eagerness of the model to respond. `low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`.
         */
        "eagerness": S.optionalWith(RealtimeTranscriptionSessionCreateRequestTurnDetectionEagerness, {
          nullable: true,
          default: () => "auto" as const
        }),
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
         * Whether or not to automatically generate a response when a VAD stop event occurs. Not available for transcription sessions.
         */
        "create_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
        /**
         * Whether or not to automatically interrupt any ongoing response with output to the default
         * conversation (i.e. `conversation` of `auto`) when a VAD start event occurs. Not available for transcription sessions.
         */
        "interrupt_response": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const })
      }),
      { nullable: true }
    ),
    /**
     * Configuration for input audio noise reduction. This can be set to `null` to turn off.
     * Noise reduction filters audio added to the input audio buffer before it is sent to VAD and the model.
     * Filtering the audio can improve VAD and turn detection accuracy (reducing false positives) and model performance by improving perception of the input audio.
     */
    "input_audio_noise_reduction": S.optionalWith(
      S.NullOr(S.Struct({
        /**
         * Type of noise reduction. `near_field` is for close-talking microphones such as headphones, `far_field` is for far-field microphones such as laptop or conference room microphones.
         */
        "type": S.optionalWith(RealtimeTranscriptionSessionCreateRequestInputAudioNoiseReductionType, {
          nullable: true
        })
      })),
      { default: () => null }
    ),
    /**
     * The set of items to include in the transcription. Current available items are:
     * - `item.input_audio_transcription.logprobs`
     */
    "include": S.optionalWith(S.Array(S.String), { nullable: true })
  })
{}

/**
 * The model to use for transcription. Can be `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, or `whisper-1`.
 */
export class RealtimeTranscriptionSessionCreateResponseInputAudioTranscriptionModel
  extends S.Literal("gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1")
{}

/**
 * A new Realtime transcription session configuration.
 *
 * When a session is created on the server via REST API, the session object
 * also contains an ephemeral key. Default TTL for keys is one minute. This
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
    "input_audio_transcription": S.optionalWith(
      S.Struct({
        /**
         * The model to use for transcription. Can be `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, or `whisper-1`.
         */
        "model": S.optionalWith(RealtimeTranscriptionSessionCreateResponseInputAudioTranscriptionModel, {
          nullable: true
        }),
        /**
         * The language of the input audio. Supplying the input language in
         * [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (e.g. `en`) format
         * will improve accuracy and latency.
         */
        "language": S.optionalWith(S.String, { nullable: true }),
        /**
         * An optional text to guide the model's style or continue a previous audio
         * segment. The [prompt](/docs/guides/speech-to-text#prompting) should match
         * the audio language.
         */
        "prompt": S.optionalWith(S.String, { nullable: true })
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
  })
{}

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
  "index": S.Int
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

export class Annotation extends S.Union(FileCitationBody, UrlCitationBody, FilePath) {}

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
  "annotations": S.Array(Annotation)
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
   * The refusal explanationfrom the model.
   */
  "refusal": S.String
}) {}

export class OutputContent extends S.Union(OutputTextContent, RefusalContent) {}

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
  "content": S.Array(OutputContent),
  /**
   * The status of the message input. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when input items are returned via API.
   */
  "status": OutputMessageStatus
}) {}

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

/**
 * Set of 16 key-value pairs that can be attached to an object. This can be
 * useful for storing additional information about the object in a structured
 * format, and querying for objects via API or the dashboard. Keys are strings
 * with a maximum length of 64 characters. Values are strings with a maximum
 * length of 512 characters, booleans, or numbers.
 */
export class VectorStoreFileAttributes extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * The results of a file search tool call. See the
 * [file search guide](/docs/guides/tools-file-search) for more information.
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
  /**
   * The results of the file search tool call.
   */
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
      "attributes": S.optionalWith(VectorStoreFileAttributes, { nullable: true }),
      /**
       * The relevance score of the file - a value between 0 and 1.
       */
      "score": S.optionalWith(S.Number, { nullable: true })
    })),
    { nullable: true }
  )
}) {}

/**
 * The type of the computer call. Always `computer_call`.
 */
export class ComputerToolCallType extends S.Literal("computer_call") {}

/**
 * Specifies the event type. For a click action, this property is
 * always set to `click`.
 */
export class ClickType extends S.Literal("click") {}

/**
 * Indicates which mouse button was pressed during the click. One of `left`, `right`, `wheel`, `back`, or `forward`.
 */
export class ClickButton extends S.Literal("left", "right", "wheel", "back", "forward") {}

/**
 * A click action.
 */
export class Click extends S.Class<Click>("Click")({
  /**
   * Specifies the event type. For a click action, this property is
   * always set to `click`.
   */
  "type": ClickType.pipe(S.propertySignature, S.withConstructorDefault(() => "click" as const)),
  /**
   * Indicates which mouse button was pressed during the click. One of `left`, `right`, `wheel`, `back`, or `forward`.
   */
  "button": ClickButton,
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
 * Specifies the event type. For a double click action, this property is
 * always set to `double_click`.
 */
export class DoubleClickType extends S.Literal("double_click") {}

/**
 * A double click action.
 */
export class DoubleClick extends S.Class<DoubleClick>("DoubleClick")({
  /**
   * Specifies the event type. For a double click action, this property is
   * always set to `double_click`.
   */
  "type": DoubleClickType.pipe(S.propertySignature, S.withConstructorDefault(() => "double_click" as const)),
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
export class Coordinate extends S.Class<Coordinate>("Coordinate")({
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
  "path": S.Array(Coordinate)
}) {}

/**
 * Specifies the event type. For a keypress action, this property is
 * always set to `keypress`.
 */
export class KeyPressType extends S.Literal("keypress") {}

/**
 * A collection of keypresses the model would like to perform.
 */
export class KeyPress extends S.Class<KeyPress>("KeyPress")({
  /**
   * Specifies the event type. For a keypress action, this property is
   * always set to `keypress`.
   */
  "type": KeyPressType.pipe(S.propertySignature, S.withConstructorDefault(() => "keypress" as const)),
  /**
   * The combination of keys the model is requesting to be pressed. This is an
   * array of strings, each representing a key.
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

export class ComputerAction extends S.Union(Click, DoubleClick, Drag, KeyPress, Move, Screenshot, Scroll, Type, Wait) {}

/**
 * A pending safety check for the computer call.
 */
export class ComputerToolCallSafetyCheck extends S.Class<ComputerToolCallSafetyCheck>("ComputerToolCallSafetyCheck")({
  /**
   * The ID of the pending safety check.
   */
  "id": S.String,
  /**
   * The type of the pending safety check.
   */
  "code": S.String,
  /**
   * Details about the pending safety check.
   */
  "message": S.String
}) {}

/**
 * The status of the item. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when items are returned via API.
 */
export class ComputerToolCallStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A tool call to a computer use tool. See the
 * [computer use guide](/docs/guides/tools-computer-use) for more information.
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
  "pending_safety_checks": S.Array(ComputerToolCallSafetyCheck),
  /**
   * The status of the item. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when items are returned via API.
   */
  "status": ComputerToolCallStatus
}) {}

/**
 * The type of the computer tool call output. Always `computer_call_output`.
 */
export class ComputerCallOutputItemParamType extends S.Literal("computer_call_output") {}

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
 * The status of the message input. One of `in_progress`, `completed`, or `incomplete`. Populated when input items are returned via API.
 */
export class ComputerCallOutputItemParamStatusEnum extends S.Literal("in_progress", "completed", "incomplete") {}

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
  "status": S.optionalWith(ComputerCallOutputItemParamStatusEnum, { nullable: true })
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
 * The results of a web search tool call. See the
 * [web search guide](/docs/guides/tools-web-search) for more information.
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
  "status": WebSearchToolCallStatus
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
 * [function calling guide](/docs/guides/function-calling) for more information.
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
 * The status of the item. One of `in_progress`, `completed`, or `incomplete`. Populated when items are returned via API.
 */
export class FunctionCallOutputItemParamStatusEnum extends S.Literal("in_progress", "completed", "incomplete") {}

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
   * A JSON string of the output of the function tool call.
   */
  "output": S.String.pipe(S.maxLength(10485760)),
  "status": S.optionalWith(FunctionCallOutputItemParamStatusEnum, { nullable: true })
}) {}

/**
 * The type of the object. Always `reasoning`.
 */
export class ReasoningItemType extends S.Literal("reasoning") {}

/**
 * The status of the item. One of `in_progress`, `completed`, or
 * `incomplete`. Populated when items are returned via API.
 */
export class ReasoningItemStatus extends S.Literal("in_progress", "completed", "incomplete") {}

/**
 * A description of the chain of thought used by a reasoning model while generating
 * a response.
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
  /**
   * Reasoning text contents.
   */
  "summary": S.Array(S.Struct({
    /**
     * The type of the object. Always `summary_text`.
     */
    "type": S.Literal("summary_text"),
    /**
     * A short summary of the reasoning used by the model when generating
     * the response.
     */
    "text": S.String
  })),
  /**
   * The status of the item. One of `in_progress`, `completed`, or
   * `incomplete`. Populated when items are returned via API.
   */
  "status": S.optionalWith(ReasoningItemStatus, { nullable: true })
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

/**
 * Specify additional output data to include in the model response. Currently
 * supported values are:
 * - `file_search_call.results`: Include the search results of
 *   the file search tool call.
 * - `message.input_image.image_url`: Include image urls from the input message.
 * - `computer_call_output.output.image_url`: Include image urls from the computer call output.
 */
export class Includable extends S.Literal(
  "file_search_call.results",
  "message.input_image.image_url",
  "computer_call_output.output.image_url"
) {}

export class ModelIdsResponsesEnum
  extends S.Literal("o1-pro", "o1-pro-2025-03-19", "computer-use-preview", "computer-use-preview-2025-03-11")
{}

export class ModelIdsResponses extends S.Union(ModelIdsShared, ModelIdsResponsesEnum) {}

/**
 * A summary of the reasoning performed by the model. This can be
 * useful for debugging and understanding the model's reasoning process.
 * One of `auto`, `concise`, or `detailed`.
 */
export class ReasoningSummary extends S.Literal("auto", "concise", "detailed") {}

/**
 * **Deprecated:** use `summary` instead.
 *
 * A summary of the reasoning performed by the model. This can be
 * useful for debugging and understanding the model's reasoning process.
 * One of `auto`, `concise`, or `detailed`.
 */
export class ReasoningGenerateSummary extends S.Literal("auto", "concise", "detailed") {}

/**
 * **o-series models only**
 *
 * Configuration options for
 * [reasoning models](https://platform.openai.com/docs/guides/reasoning).
 */
export class Reasoning extends S.Class<Reasoning>("Reasoning")({
  "effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  /**
   * A summary of the reasoning performed by the model. This can be
   * useful for debugging and understanding the model's reasoning process.
   * One of `auto`, `concise`, or `detailed`.
   */
  "summary": S.optionalWith(ReasoningSummary, { nullable: true }),
  /**
   * **Deprecated:** use `summary` instead.
   *
   * A summary of the reasoning performed by the model. This can be
   * useful for debugging and understanding the model's reasoning process.
   * One of `auto`, `concise`, or `detailed`.
   */
  "generate_summary": S.optionalWith(ReasoningGenerateSummary, { nullable: true })
}) {}

/**
 * The type of response format being defined. Always `json_schema`.
 */
export class TextResponseFormatJsonSchemaType extends S.Literal("json_schema") {}

/**
 * JSON Schema response format. Used to generate structured JSON responses.
 * Learn more about [Structured Outputs](/docs/guides/structured-outputs).
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
    /**
     * Whether to enable strict schema adherence when generating the output.
     * If set to true, the model will always follow the exact schema defined
     * in the `schema` field. Only a subset of JSON Schema is supported when
     * `strict` is `true`. To learn more, read the [Structured Outputs
     * guide](/docs/guides/structured-outputs).
     */
    "strict": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const })
  })
{}

/**
 * An object specifying the format that the model must output.
 *
 * Configuring `{ "type": "json_schema" }` enables Structured Outputs,
 * which ensures the model will match your supplied JSON schema. Learn more in the
 * [Structured Outputs guide](/docs/guides/structured-outputs).
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
 * The type of the file search tool. Always `file_search`.
 */
export class FileSearchToolType extends S.Literal("file_search") {}

/**
 * The ranker to use for the file search.
 */
export class RankingOptionsRanker extends S.Literal("auto", "default-2024-11-15") {}

export class RankingOptions extends S.Class<RankingOptions>("RankingOptions")({
  /**
   * The ranker to use for the file search.
   */
  "ranker": S.optionalWith(RankingOptionsRanker, { nullable: true }),
  /**
   * The score threshold for the file search, a number between 0 and 1. Numbers closer to 1 will attempt to return only the most relevant results, but may return fewer results.
   */
  "score_threshold": S.optionalWith(S.Number, { nullable: true })
}) {}

/**
 * Specifies the comparison operator: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.
 * - `eq`: equals
 * - `ne`: not equal
 * - `gt`: greater than
 * - `gte`: greater than or equal
 * - `lt`: less than
 * - `lte`: less than or equal
 */
export class ComparisonFilterType extends S.Literal("eq", "ne", "gt", "gte", "lt", "lte") {}

/**
 * A filter used to compare a specified attribute key to a given value using a defined comparison operation.
 */
export class ComparisonFilter extends S.Class<ComparisonFilter>("ComparisonFilter")({
  /**
   * Specifies the comparison operator: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.
   * - `eq`: equals
   * - `ne`: not equal
   * - `gt`: greater than
   * - `gte`: greater than or equal
   * - `lt`: less than
   * - `lte`: less than or equal
   */
  "type": ComparisonFilterType.pipe(S.propertySignature, S.withConstructorDefault(() => "eq" as const)),
  /**
   * The key to compare against the value.
   */
  "key": S.String,
  /**
   * The value to compare against the attribute key; supports string, number, or boolean types.
   */
  "value": S.Union(S.String, S.Number, S.Boolean)
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

/**
 * High level guidance for the amount of context window space to use for the search. One of `low`, `medium`, or `high`. `medium` is the default.
 */
export class WebSearchPreviewToolSearchContextSize extends S.Literal("low", "medium", "high") {}

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
  "search_context_size": S.optionalWith(WebSearchPreviewToolSearchContextSize, { nullable: true })
}) {}

/**
 * The type of the computer use tool. Always `computer_use_preview`.
 */
export class ComputerUsePreviewToolType extends S.Literal("computer_use_preview") {}

/**
 * The type of computer environment to control.
 */
export class ComputerUsePreviewToolEnvironment extends S.Literal("windows", "mac", "linux", "ubuntu", "browser") {}

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
  "environment": ComputerUsePreviewToolEnvironment,
  /**
   * The width of the computer display.
   */
  "display_width": S.Int,
  /**
   * The height of the computer display.
   */
  "display_height": S.Int
}) {}

export class Tool extends S.Union(FileSearchTool, FunctionTool, WebSearchPreviewTool, ComputerUsePreviewTool) {}

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
 * The type of hosted tool the model should to use. Learn more about
 * [built-in tools](/docs/guides/tools).
 *
 * Allowed values are:
 * - `file_search`
 * - `web_search_preview`
 * - `computer_use_preview`
 */
export class ToolChoiceTypesType
  extends S.Literal("file_search", "web_search_preview", "computer_use_preview", "web_search_preview_2025_03_11")
{}

/**
 * Indicates that the model should use a built-in tool to generate a response.
 * [Learn more about built-in tools](/docs/guides/tools).
 */
export class ToolChoiceTypes extends S.Class<ToolChoiceTypes>("ToolChoiceTypes")({
  /**
   * The type of hosted tool the model should to use. Learn more about
   * [built-in tools](/docs/guides/tools).
   *
   * Allowed values are:
   * - `file_search`
   * - `web_search_preview`
   * - `computer_use_preview`
   */
  "type": ToolChoiceTypesType
}) {}

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
 * The truncation strategy to use for the model response.
 * - `auto`: If the context of this response and previous ones exceeds
 *   the model's context window size, the model will truncate the
 *   response to fit the context window by dropping input items in the
 *   middle of the conversation.
 * - `disabled` (default): If a model response will exceed the context window
 *   size for a model, the request will fail with a 400 error.
 */
export class CreateResponseTruncation extends S.Literal("auto", "disabled") {}

export class CreateResponse extends S.Class<CreateResponse>("CreateResponse")({
  /**
   * Text, image, or file inputs to the model, used to generate a response.
   *
   * Learn more:
   * - [Text inputs and outputs](/docs/guides/text)
   * - [Image inputs](/docs/guides/images)
   * - [File inputs](/docs/guides/pdf-files)
   * - [Conversation state](/docs/guides/conversation-state)
   * - [Function calling](/docs/guides/function-calling)
   */
  "input": S.Union(
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
  ),
  /**
   * Specify additional output data to include in the model response. Currently
   * supported values are:
   * - `file_search_call.results`: Include the search results of
   *   the file search tool call.
   * - `message.input_image.image_url`: Include image urls from the input message.
   * - `computer_call_output.output.image_url`: Include image urls from the computer call output.
   */
  "include": S.optionalWith(S.Array(Includable), { nullable: true }),
  /**
   * Whether to allow the model to run tool calls in parallel.
   */
  "parallel_tool_calls": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
  /**
   * Whether to store the generated model response for later retrieval via
   * API.
   */
  "store": S.optionalWith(S.Boolean, { nullable: true, default: () => true as const }),
  /**
   * If set to true, the model response data will be streamed to the client
   * as it is generated using [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
   * See the [Streaming section below](/docs/api-reference/responses-streaming)
   * for more information.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * The unique ID of the previous response to the model. Use this to
   * create multi-turn conversations. Learn more about
   * [conversation state](/docs/guides/conversation-state).
   */
  "previous_response_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Model ID used to generate the response, like `gpt-4o` or `o3`. OpenAI
   * offers a wide range of models with different capabilities, performance
   * characteristics, and price points. Refer to the [model guide](/docs/models)
   * to browse and compare available models.
   */
  "model": ModelIdsResponses,
  "reasoning": S.optionalWith(Reasoning, { nullable: true }),
  /**
   * An upper bound for the number of tokens that can be generated for a response, including visible output tokens and [reasoning tokens](/docs/guides/reasoning).
   */
  "max_output_tokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Inserts a system (or developer) message as the first item in the model's context.
   *
   * When using along with `previous_response_id`, the instructions from a previous
   * response will not be carried over to the next response. This makes it simple
   * to swap out system (or developer) messages in new responses.
   */
  "instructions": S.optionalWith(S.String, { nullable: true }),
  /**
   * Configuration options for a text response from the model. Can be plain
   * text or structured JSON data. Learn more:
   * - [Text inputs and outputs](/docs/guides/text)
   * - [Structured Outputs](/docs/guides/structured-outputs)
   */
  "text": S.optionalWith(
    S.Struct({
      "format": S.optionalWith(TextResponseFormatConfiguration, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * An array of tools the model may call while generating a response. You
   * can specify which tool to use by setting the `tool_choice` parameter.
   *
   * The two categories of tools you can provide the model are:
   *
   * - **Built-in tools**: Tools that are provided by OpenAI that extend the
   *   model's capabilities, like [web search](/docs/guides/tools-web-search)
   *   or [file search](/docs/guides/tools-file-search). Learn more about
   *   [built-in tools](/docs/guides/tools).
   * - **Function calls (custom tools)**: Functions that are defined by you,
   *   enabling the model to call your own code. Learn more about
   *   [function calling](/docs/guides/function-calling).
   */
  "tools": S.optionalWith(S.Array(Tool), { nullable: true }),
  /**
   * How the model should select which tool (or tools) to use when generating
   * a response. See the `tools` parameter to see how to specify which tools
   * the model can call.
   */
  "tool_choice": S.optionalWith(S.Union(ToolChoiceOptions, ToolChoiceTypes, ToolChoiceFunction), { nullable: true }),
  /**
   * The truncation strategy to use for the model response.
   * - `auto`: If the context of this response and previous ones exceeds
   *   the model's context window size, the model will truncate the
   *   response to fit the context window by dropping input items in the
   *   middle of the conversation.
   * - `disabled` (default): If a model response will exceed the context window
   *   size for a model, the request will fail with a 400 error.
   */
  "truncation": S.optionalWith(CreateResponseTruncation, { nullable: true, default: () => "disabled" as const }),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
   * We generally recommend altering this or `top_p` but not both.
   */
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * An alternative to sampling with temperature, called nucleus sampling,
   * where the model considers the results of the tokens with top_p probability
   * mass. So 0.1 means only the tokens comprising the top 10% probability mass
   * are considered.
   *
   * We generally recommend altering this or `temperature` but not both.
   */
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), {
    nullable: true,
    default: () => 1 as const
  }),
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](/docs/guides/safety-best-practices#end-user-ids).
   */
  "user": S.optionalWith(S.String, { nullable: true }),
  "service_tier": S.optionalWith(ServiceTier, { nullable: true, default: () => "auto" as const })
}) {}

/**
 * The object type of this resource - always set to `response`.
 */
export class ResponseObject extends S.Literal("response") {}

/**
 * The status of the response generation. One of `completed`, `failed`,
 * `in_progress`, or `incomplete`.
 */
export class ResponseStatus extends S.Literal("completed", "failed", "in_progress", "incomplete") {}

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

/**
 * An error object returned when the model fails to generate a Response.
 */
export class ResponseError extends S.Class<ResponseError>("ResponseError")({
  "code": ResponseErrorCode,
  /**
   * A human-readable description of the error.
   */
  "message": S.String
}) {}

/**
 * The reason why the response is incomplete.
 */
export class ResponseIncompleteDetailsReason extends S.Literal("max_output_tokens", "content_filter") {}

export class OutputItem extends S.Union(
  OutputMessage,
  FileSearchToolCall,
  FunctionToolCall,
  WebSearchToolCall,
  ComputerToolCall,
  ReasoningItem
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
     * [More on prompt caching](/docs/guides/prompt-caching).
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
 * The truncation strategy to use for the model response.
 * - `auto`: If the context of this response and previous ones exceeds
 *   the model's context window size, the model will truncate the
 *   response to fit the context window by dropping input items in the
 *   middle of the conversation.
 * - `disabled` (default): If a model response will exceed the context window
 *   size for a model, the request will fail with a 400 error.
 */
export class ResponseTruncation extends S.Literal("auto", "disabled") {}

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
   * `in_progress`, or `incomplete`.
   */
  "status": S.optionalWith(ResponseStatus, { nullable: true }),
  /**
   * Unix timestamp (in seconds) of when this Response was created.
   */
  "created_at": S.Number,
  "error": S.NullOr(ResponseError),
  /**
   * Details about why the response is incomplete.
   */
  "incomplete_details": S.NullOr(S.Struct({
    /**
     * The reason why the response is incomplete.
     */
    "reason": S.optionalWith(ResponseIncompleteDetailsReason, { nullable: true })
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
  /**
   * SDK-only convenience property that contains the aggregated text output
   * from all `output_text` items in the `output` array, if any are present.
   * Supported in the Python and JavaScript SDKs.
   */
  "output_text": S.optionalWith(S.String, { nullable: true }),
  "usage": S.optionalWith(ResponseUsage, { nullable: true }),
  /**
   * Whether to allow the model to run tool calls in parallel.
   */
  "parallel_tool_calls": S.Boolean.pipe(S.propertySignature, S.withConstructorDefault(() => true as const)),
  /**
   * The unique ID of the previous response to the model. Use this to
   * create multi-turn conversations. Learn more about
   * [conversation state](/docs/guides/conversation-state).
   */
  "previous_response_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Model ID used to generate the response, like `gpt-4o` or `o3`. OpenAI
   * offers a wide range of models with different capabilities, performance
   * characteristics, and price points. Refer to the [model guide](/docs/models)
   * to browse and compare available models.
   */
  "model": ModelIdsResponses,
  "reasoning": S.optionalWith(Reasoning, { nullable: true }),
  /**
   * An upper bound for the number of tokens that can be generated for a response, including visible output tokens and [reasoning tokens](/docs/guides/reasoning).
   */
  "max_output_tokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Inserts a system (or developer) message as the first item in the model's context.
   *
   * When using along with `previous_response_id`, the instructions from a previous
   * response will not be carried over to the next response. This makes it simple
   * to swap out system (or developer) messages in new responses.
   */
  "instructions": S.NullOr(S.String),
  /**
   * Configuration options for a text response from the model. Can be plain
   * text or structured JSON data. Learn more:
   * - [Text inputs and outputs](/docs/guides/text)
   * - [Structured Outputs](/docs/guides/structured-outputs)
   */
  "text": S.optionalWith(
    S.Struct({
      "format": S.optionalWith(TextResponseFormatConfiguration, { nullable: true })
    }),
    { nullable: true }
  ),
  /**
   * An array of tools the model may call while generating a response. You
   * can specify which tool to use by setting the `tool_choice` parameter.
   *
   * The two categories of tools you can provide the model are:
   *
   * - **Built-in tools**: Tools that are provided by OpenAI that extend the
   *   model's capabilities, like [web search](/docs/guides/tools-web-search)
   *   or [file search](/docs/guides/tools-file-search). Learn more about
   *   [built-in tools](/docs/guides/tools).
   * - **Function calls (custom tools)**: Functions that are defined by you,
   *   enabling the model to call your own code. Learn more about
   *   [function calling](/docs/guides/function-calling).
   */
  "tools": S.Array(Tool),
  /**
   * How the model should select which tool (or tools) to use when generating
   * a response. See the `tools` parameter to see how to specify which tools
   * the model can call.
   */
  "tool_choice": S.Union(ToolChoiceOptions, ToolChoiceTypes, ToolChoiceFunction),
  /**
   * The truncation strategy to use for the model response.
   * - `auto`: If the context of this response and previous ones exceeds
   *   the model's context window size, the model will truncate the
   *   response to fit the context window by dropping input items in the
   *   middle of the conversation.
   * - `disabled` (default): If a model response will exceed the context window
   *   size for a model, the request will fail with a 400 error.
   */
  "truncation": S.optionalWith(ResponseTruncation, { nullable: true, default: () => "disabled" as const }),
  "metadata": S.NullOr(Metadata),
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
   * We generally recommend altering this or `top_p` but not both.
   */
  "temperature": S.NullOr(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2))).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 1 as const)
  ),
  /**
   * An alternative to sampling with temperature, called nucleus sampling,
   * where the model considers the results of the tokens with top_p probability
   * mass. So 0.1 means only the tokens comprising the top 10% probability mass
   * are considered.
   *
   * We generally recommend altering this or `temperature` but not both.
   */
  "top_p": S.NullOr(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1))).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 1 as const)
  ),
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](/docs/guides/safety-best-practices#end-user-ids).
   */
  "user": S.optionalWith(S.String, { nullable: true }),
  "service_tier": S.optionalWith(ServiceTier, { nullable: true, default: () => "auto" as const })
}) {}

export class GetResponseParams extends S.Struct({
  "include": S.optionalWith(S.Array(Includable), { nullable: true })
}) {}

export class ListInputItemsParamsOrder extends S.Literal("asc", "desc") {}

export class ListInputItemsParams extends S.Struct({
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  "order": S.optionalWith(ListInputItemsParamsOrder, { nullable: true }),
  "after": S.optionalWith(S.String, { nullable: true }),
  "before": S.optionalWith(S.String, { nullable: true }),
  "include": S.optionalWith(S.Array(Includable), { nullable: true })
}) {}

/**
 * The type of object returned, must be `list`.
 */
export class ResponseItemListObject extends S.Literal("list") {}

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
 * The type of the computer tool call output. Always `computer_call_output`.
 */
export class ComputerToolCallOutputResourceType extends S.Literal("computer_call_output") {}

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
    "acknowledged_safety_checks": S.optionalWith(S.Array(ComputerToolCallSafetyCheck), { nullable: true }),
    "output": ComputerScreenshotImage,
    /**
     * The status of the message input. One of `in_progress`, `completed`, or
     * `incomplete`. Populated when input items are returned via API.
     */
    "status": S.optionalWith(ComputerToolCallOutputResourceStatus, { nullable: true })
  })
{}

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
 * [function calling guide](/docs/guides/function-calling) for more information.
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
     * A JSON string of the output of the function tool call.
     */
    "output": S.String,
    /**
     * The status of the item. One of `in_progress`, `completed`, or
     * `incomplete`. Populated when items are returned via API.
     */
    "status": S.optionalWith(FunctionToolCallOutputResourceStatus, { nullable: true })
  })
{}

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
  FunctionToolCallOutputResource
) {}

/**
 * A list of Response items.
 */
export class ResponseItemList extends S.Class<ResponseItemList>("ResponseItemList")({
  /**
   * The type of object returned, must be `list`.
   */
  "object": ResponseItemListObject,
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
 * References an image [File](/docs/api-reference/files) in the content of a message.
 */
export class MessageContentImageFileObject
  extends S.Class<MessageContentImageFileObject>("MessageContentImageFileObject")({
    /**
     * Always `image_file`.
     */
    "type": MessageContentImageFileObjectType,
    "image_file": S.Struct({
      /**
       * The [File](/docs/api-reference/files) ID of the image in the message content. Set `purpose="vision"` when uploading the File if you need to later display the file content.
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
     * An array of content parts with a defined type, each can be of type `text` or images can be passed with `image_url` or `image_file`. Image types are only supported on [Vision-compatible models](/docs/models).
     */
    S.NonEmptyArray(
      S.Union(MessageContentImageFileObject, MessageContentImageUrlObject, MessageRequestContentTextObject)
    ).pipe(S.minItems(1))
  ),
  /**
   * A list of files attached to the message, and the tools they should be added to.
   */
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
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

/**
 * Options to create a new thread. If no thread is provided when running a
 * request, an empty thread will be created.
 */
export class CreateThreadRequest extends S.Class<CreateThreadRequest>("CreateThreadRequest")({
  /**
   * A list of [messages](/docs/api-reference/messages) to start the thread with.
   */
  "messages": S.optionalWith(S.Array(CreateMessageRequest), { nullable: true }),
  /**
   * A set of resources that are made available to the assistant's tools in this thread. The resources are specific to the type of tool. For example, the `code_interpreter` tool requires a list of file IDs, while the `file_search` tool requires a list of vector store IDs.
   */
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * A list of [file](/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
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
           * The [vector store](/docs/api-reference/vector-stores/object) attached to this thread. There can be a maximum of 1 vector store attached to the thread.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true }),
          /**
           * A helper to create a [vector store](/docs/api-reference/vector-stores/object) with file_ids and attach it to this thread. There can be a maximum of 1 vector store attached to the thread.
           */
          "vector_stores": S.optionalWith(
            S.Array(S.Struct({
              /**
               * A list of [file](/docs/api-reference/files) IDs to add to the vector store. There can be a maximum of 10000 files in a vector store.
               */
              "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(10000)), { nullable: true }),
              /**
               * The chunking strategy used to chunk the file(s). If not set, will use the `auto` strategy.
               */
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

/**
 * The object type, which is always `thread`.
 */
export class ThreadObjectObject extends S.Literal("thread") {}

/**
 * Represents a thread that contains [messages](/docs/api-reference/messages).
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
  /**
   * A set of resources that are made available to the assistant's tools in this thread. The resources are specific to the type of tool. For example, the `code_interpreter` tool requires a list of file IDs, while the `file_search` tool requires a list of vector store IDs.
   */
  "tool_resources": S.NullOr(S.Struct({
    "code_interpreter": S.optionalWith(
      S.Struct({
        /**
         * A list of [file](/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
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
         * The [vector store](/docs/api-reference/vector-stores/object) attached to this thread. There can be a maximum of 1 vector store attached to the thread.
         */
        "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
      }),
      { nullable: true }
    )
  })),
  "metadata": S.NullOr(Metadata)
}) {}

export class CreateThreadAndRunRequestModelEnum extends S.Literal(
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
 * Controls for how a thread will be truncated prior to the run. Use this to control the intial context window of the run.
 */
export class CreateThreadAndRunRequestTruncationStrategy extends S.Struct({
  /**
   * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
   */
  "type": S.Literal("auto", "last_messages"),
  /**
   * The number of most recent messages from the thread when constructing the context for the run.
   */
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
   * The ID of the [assistant](/docs/api-reference/assistants) to use to execute this run.
   */
  "assistant_id": S.String,
  "thread": S.optionalWith(CreateThreadRequest, { nullable: true }),
  /**
   * The ID of the [Model](/docs/api-reference/models) to be used to execute this run. If a value is provided here, it will override the model associated with the assistant. If not, the model associated with the assistant will be used.
   */
  "model": S.optionalWith(S.Union(S.String, CreateThreadAndRunRequestModelEnum), { nullable: true }),
  /**
   * Override the default system message of the assistant. This is useful for modifying the behavior on a per-run basis.
   */
  "instructions": S.optionalWith(S.String, { nullable: true }),
  /**
   * Override the tools the assistant can use for this run. This is useful for modifying the behavior on a per-run basis.
   */
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(20)),
    { nullable: true }
  ),
  /**
   * A set of resources that are used by the assistant's tools. The resources are specific to the type of tool. For example, the `code_interpreter` tool requires a list of file IDs, while the `file_search` tool requires a list of vector store IDs.
   */
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * A list of [file](/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
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
           * The ID of the [vector store](/docs/api-reference/vector-stores/object) attached to this assistant. There can be a maximum of 1 vector store attached to the assistant.
           */
          "vector_store_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(1)), { nullable: true })
        }),
        { nullable: true }
      )
    }),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
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
   * The ID of the tool call. This ID must be referenced when you submit the tool outputs in using the [Submit tool outputs to run](/docs/api-reference/runs/submitToolOutputs) endpoint.
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

/**
 * Usage statistics related to the run. This value will be `null` if the run is not in a terminal state (i.e. `in_progress`, `queued`, etc.).
 */
export class RunCompletionUsage extends S.Class<RunCompletionUsage>("RunCompletionUsage")({
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
}) {}

/**
 * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
 */
export class RunObjectTruncationStrategyEnumType extends S.Literal("auto", "last_messages") {}

/**
 * Controls for how a thread will be truncated prior to the run. Use this to control the intial context window of the run.
 */
export class RunObjectTruncationStrategy extends S.Struct({
  /**
   * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
   */
  "type": S.Literal("auto", "last_messages"),
  /**
   * The number of most recent messages from the thread when constructing the context for the run.
   */
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
 * Represents an execution run on a [thread](/docs/api-reference/threads).
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
   * The ID of the [thread](/docs/api-reference/threads) that was executed on as a part of this run.
   */
  "thread_id": S.String,
  /**
   * The ID of the [assistant](/docs/api-reference/assistants) used for execution of this run.
   */
  "assistant_id": S.String,
  /**
   * The status of the run, which can be either `queued`, `in_progress`, `requires_action`, `cancelling`, `cancelled`, `failed`, `completed`, `incomplete`, or `expired`.
   */
  "status": RunObjectStatus,
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
   * The model that the [assistant](/docs/api-reference/assistants) used for this run.
   */
  "model": S.String,
  /**
   * The instructions that the [assistant](/docs/api-reference/assistants) used for this run.
   */
  "instructions": S.String,
  /**
   * The list of tools that the [assistant](/docs/api-reference/assistants) used for this run.
   */
  "tools": S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(20))
    .pipe(S.propertySignature, S.withConstructorDefault(() => [] as const)),
  "metadata": S.NullOr(Metadata),
  "usage": S.NullOr(RunCompletionUsage),
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
  /**
   * A set of resources that are made available to the assistant's tools in this thread. The resources are specific to the type of tool. For example, the `code_interpreter` tool requires a list of file IDs, while the `file_search` tool requires a list of vector store IDs.
   */
  "tool_resources": S.optionalWith(
    S.Struct({
      "code_interpreter": S.optionalWith(
        S.Struct({
          /**
           * A list of [file](/docs/api-reference/files) IDs made available to the `code_interpreter` tool. There can be a maximum of 20 files associated with the tool.
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
           * The [vector store](/docs/api-reference/vector-stores/object) attached to this thread. There can be a maximum of 1 vector store attached to the thread.
           */
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
export class MessageObjectIncompleteDetailsReason
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
    "annotations": S.Array(
      S.Union(MessageContentTextAnnotationsFileCitationObject, MessageContentTextAnnotationsFilePathObject)
    )
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

/**
 * Represents a message within a [thread](/docs/api-reference/threads).
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
   * The [thread](/docs/api-reference/threads) ID that this message belongs to.
   */
  "thread_id": S.String,
  /**
   * The status of the message, which can be either `in_progress`, `incomplete`, or `completed`.
   */
  "status": MessageObjectStatus,
  /**
   * On an incomplete message, details about why the message is incomplete.
   */
  "incomplete_details": S.NullOr(S.Struct({
    /**
     * The reason the message is incomplete.
     */
    "reason": MessageObjectIncompleteDetailsReason
  })),
  /**
   * The Unix timestamp (in seconds) for when the message was completed.
   */
  "completed_at": S.NullOr(S.Int),
  /**
   * The Unix timestamp (in seconds) for when the message was marked as incomplete.
   */
  "incomplete_at": S.NullOr(S.Int),
  /**
   * The entity that produced the message. One of `user` or `assistant`.
   */
  "role": MessageObjectRole,
  /**
   * The content of the message in array of text and/or images.
   */
  "content": S.Array(
    S.Union(
      MessageContentImageFileObject,
      MessageContentImageUrlObject,
      MessageContentTextObject,
      MessageContentRefusalObject
    )
  ),
  /**
   * If applicable, the ID of the [assistant](/docs/api-reference/assistants) that authored this message.
   */
  "assistant_id": S.NullOr(S.String),
  /**
   * The ID of the [run](/docs/api-reference/runs) associated with the creation of this message. Value is `null` when messages are created manually using the create message or create thread endpoints.
   */
  "run_id": S.NullOr(S.String),
  /**
   * A list of files attached to the message, and the tools they were added to.
   */
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

/**
 * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
 */
export class CreateRunRequestTruncationStrategyEnumType extends S.Literal("auto", "last_messages") {}

/**
 * Controls for how a thread will be truncated prior to the run. Use this to control the intial context window of the run.
 */
export class CreateRunRequestTruncationStrategy extends S.Struct({
  /**
   * The truncation strategy to use for the thread. The default is `auto`. If set to `last_messages`, the thread will be truncated to the n most recent messages in the thread. When set to `auto`, messages in the middle of the thread will be dropped to fit the context length of the model, `max_prompt_tokens`.
   */
  "type": S.Literal("auto", "last_messages"),
  /**
   * The number of most recent messages from the thread when constructing the context for the run.
   */
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
   * The ID of the [assistant](/docs/api-reference/assistants) to use to execute this run.
   */
  "assistant_id": S.String,
  /**
   * The ID of the [Model](/docs/api-reference/models) to be used to execute this run. If a value is provided here, it will override the model associated with the assistant. If not, the model associated with the assistant will be used.
   */
  "model": S.optionalWith(S.Union(S.String, AssistantSupportedModels), { nullable: true }),
  "reasoning_effort": S.optionalWith(ReasoningEffort, { nullable: true, default: () => "medium" as const }),
  /**
   * Overrides the [instructions](/docs/api-reference/assistants/createAssistant) of the assistant. This is useful for modifying the behavior on a per-run basis.
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
  "tools": S.optionalWith(
    S.Array(S.Union(AssistantToolsCode, AssistantToolsFileSearch, AssistantToolsFunction)).pipe(S.maxItems(20)),
    { nullable: true }
  ),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
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
       * The [file](/docs/api-reference/files) ID of the image.
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
      /**
       * The output of the function. This will be `null` if the outputs have not been [submitted](/docs/api-reference/runs/submitToolOutputs) yet.
       */
      "output": S.NullOr(S.String)
    })
  })
{}

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
    "tool_calls": S.Array(
      S.Union(
        RunStepDetailsToolCallsCodeObject,
        RunStepDetailsToolCallsFileSearchObject,
        RunStepDetailsToolCallsFunctionObject
      )
    )
  })
{}

/**
 * One of `server_error` or `rate_limit_exceeded`.
 */
export class RunStepObjectLastErrorCode extends S.Literal("server_error", "rate_limit_exceeded") {}

/**
 * Usage statistics related to the run step. This value will be `null` while the run step's status is `in_progress`.
 */
export class RunStepCompletionUsage extends S.Class<RunStepCompletionUsage>("RunStepCompletionUsage")({
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
}) {}

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
   * The ID of the [assistant](/docs/api-reference/assistants) associated with the run step.
   */
  "assistant_id": S.String,
  /**
   * The ID of the [thread](/docs/api-reference/threads) that was run.
   */
  "thread_id": S.String,
  /**
   * The ID of the [run](/docs/api-reference/runs) that this run step is a part of.
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
  /**
   * The last error associated with this run step. Will be `null` if there are no errors.
   */
  "last_error": S.NullOr(S.Struct({
    /**
     * One of `server_error` or `rate_limit_exceeded`.
     */
    "code": RunStepObjectLastErrorCode,
    /**
     * A human-readable description of the error.
     */
    "message": S.String
  })),
  /**
   * The Unix timestamp (in seconds) for when the run step expired. A step is considered expired if the parent run is expired.
   */
  "expired_at": S.NullOr(S.Int),
  /**
   * The Unix timestamp (in seconds) for when the run step was cancelled.
   */
  "cancelled_at": S.NullOr(S.Int),
  /**
   * The Unix timestamp (in seconds) for when the run step failed.
   */
  "failed_at": S.NullOr(S.Int),
  /**
   * The Unix timestamp (in seconds) for when the run step completed.
   */
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
  /**
   * If `true`, returns a stream of events that happen during the Run as server-sent events, terminating when the Run enters a terminal state with a `data: [DONE]` message.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * The intended purpose of the uploaded file.
 *
 * See the [documentation on File purposes](/docs/api-reference/files/create#files-create-purpose).
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
   * See the [documentation on File purposes](/docs/api-reference/files/create#files-create-purpose).
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
  "mime_type": S.String
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
 * The intended purpose of the file. Supported values are `assistants`, `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results` and `vision`.
 */
export class UploadFileEnumPurpose extends S.Literal(
  "assistants",
  "assistants_output",
  "batch",
  "batch_output",
  "fine-tune",
  "fine-tune-results",
  "vision"
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
   * The intended purpose of the file. Supported values are `assistants`, `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results` and `vision`.
   */
  "purpose": S.Literal(
    "assistants",
    "assistants_output",
    "batch",
    "batch_output",
    "fine-tune",
    "fine-tune-results",
    "vision"
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
   * The intended purpose of the file. [Please refer here](/docs/api-reference/files/object#files/object-purpose) for acceptable values.
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
  "object": S.optionalWith(UploadObject, { nullable: true }),
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
  /**
   * The Unix timestamp (in seconds) for when the vector store will expire.
   */
  "expires_at": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The Unix timestamp (in seconds) for when the vector store was last active.
   */
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

export class CreateVectorStoreRequest extends S.Class<CreateVectorStoreRequest>("CreateVectorStoreRequest")({
  /**
   * A list of [File](/docs/api-reference/files) IDs that the vector store should use. Useful for tools like `file_search` that can access files.
   */
  "file_ids": S.optionalWith(S.Array(S.String).pipe(S.maxItems(500)), { nullable: true }),
  /**
   * The name of the vector store.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  "expires_after": S.optionalWith(VectorStoreExpirationAfter, { nullable: true }),
  /**
   * The chunking strategy used to chunk the file(s). If not set, will use the `auto` strategy. Only applicable if `file_ids` is non-empty.
   */
  "chunking_strategy": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "metadata": S.optionalWith(Metadata, { nullable: true })
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
  "metadata": S.optionalWith(Metadata, { nullable: true })
}) {}

export class DeleteVectorStoreResponseObject extends S.Literal("vector_store.deleted") {}

export class DeleteVectorStoreResponse extends S.Class<DeleteVectorStoreResponse>("DeleteVectorStoreResponse")({
  "id": S.String,
  "deleted": S.Boolean,
  "object": DeleteVectorStoreResponseObject
}) {}

/**
 * The chunking strategy used to chunk the file(s). If not set, will use the `auto` strategy.
 */
export class ChunkingStrategyRequestParam extends S.Record({ key: S.String, value: S.Unknown }) {}

export class CreateVectorStoreFileBatchRequest
  extends S.Class<CreateVectorStoreFileBatchRequest>("CreateVectorStoreFileBatchRequest")({
    /**
     * A list of [File](/docs/api-reference/files) IDs that the vector store should use. Useful for tools like `file_search` that can access files.
     */
    "file_ids": S.NonEmptyArray(S.String).pipe(S.minItems(1), S.maxItems(500)),
    "chunking_strategy": S.optionalWith(ChunkingStrategyRequestParam, { nullable: true }),
    "attributes": S.optionalWith(VectorStoreFileAttributes, { nullable: true })
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
   * The ID of the [vector store](/docs/api-reference/vector-stores/object) that the [File](/docs/api-reference/files) is attached to.
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
 * One of `server_error` or `rate_limit_exceeded`.
 */
export class VectorStoreFileObjectLastErrorCode extends S.Literal("server_error", "unsupported_file", "invalid_file") {}

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
   * The ID of the [vector store](/docs/api-reference/vector-stores/object) that the [File](/docs/api-reference/files) is attached to.
   */
  "vector_store_id": S.String,
  /**
   * The status of the vector store file, which can be either `in_progress`, `completed`, `cancelled`, or `failed`. The status `completed` indicates that the vector store file is ready for use.
   */
  "status": VectorStoreFileObjectStatus,
  /**
   * The last error associated with this vector store file. Will be `null` if there are no errors.
   */
  "last_error": S.NullOr(S.Struct({
    /**
     * One of `server_error` or `rate_limit_exceeded`.
     */
    "code": VectorStoreFileObjectLastErrorCode,
    /**
     * A human-readable description of the error.
     */
    "message": S.String
  })),
  /**
   * The strategy used to chunk the file.
   */
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
    /**
     * A [File](/docs/api-reference/files) ID that the vector store should use. Useful for tools like `file_search` that can access files.
     */
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
    /**
     * The token for the next page, if any.
     */
    "next_page": S.NullOr(S.String)
  })
{}

export class VectorStoreSearchRequestRankingOptionsRanker extends S.Literal("auto", "default-2024-11-15") {}

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
  "attributes": S.NullOr(VectorStoreFileAttributes),
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
    /**
     * The token for the next page, if any.
     */
    "next_page": S.NullOr(S.String)
  })
{}

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
        HttpClientRequest.setUrlParams({ "include": options?.["include"] as any }),
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
    "listInputItems": (responseId, options) =>
      HttpClientRequest.get(`/responses/${responseId}/input_items`).pipe(
        HttpClientRequest.setUrlParams({
          "limit": options?.["limit"] as any,
          "order": options?.["order"] as any,
          "after": options?.["after"] as any,
          "before": options?.["before"] as any,
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
   * **Starting a new project?** We recommend trying [Responses](/docs/api-reference/responses)
   * to take advantage of the latest OpenAI platform features. Compare
   * [Chat Completions with Responses](/docs/guides/responses-vs-chat-completions?api-mode=responses).
   *
   * ---
   *
   * Creates a model response for the given chat conversation. Learn more in the
   * [text generation](/docs/guides/text-generation), [vision](/docs/guides/vision),
   * and [audio](/docs/guides/audio) guides.
   *
   * Parameter support can differ depending on the model used to generate the
   * response, particularly for newer reasoning models. Parameters that are only
   * supported for reasoning models are noted below. For the current state of
   * unsupported parameters in reasoning models,
   * [refer to the reasoning guide](/docs/guides/reasoning).
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
   * An evaluation is a set of testing criteria and a datasource. After creating an evaluation, you can run it on different models and model parameters. We support several types of graders and datasources.
   * For more information, see the [Evals guide](/docs/guides/evals).
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
   * Create a new evaluation run. This is the endpoint that will kick off grading.
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
   * Upload a file that can be used across various endpoints. Individual files can be up to 512 MB, and the size of all files uploaded by one organization can be up to 100 GB.
   *
   * The Assistants API supports files up to 2 million tokens and of specific file types. See the [Assistants Tools guide](/docs/assistants/tools) for details.
   *
   * The Fine-tuning API only supports `.jsonl` files. The input also has certain required formats for fine-tuning [chat](/docs/api-reference/fine-tuning/chat-input) or [completions](/docs/api-reference/fine-tuning/completions-input) models.
   *
   * The Batch API only supports `.jsonl` files up to 200 MB in size. The input also has a specific required [format](/docs/api-reference/batch/request-input).
   *
   * Please [contact us](https://help.openai.com/) if you need to increase these storage limits.
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
   * Delete a file.
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
   * [Learn more about fine-tuning](/docs/guides/fine-tuning)
   */
  readonly "createFineTuningJob": (
    options: typeof CreateFineTuningJobRequest.Encoded
  ) => Effect.Effect<typeof FineTuningJob.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get info about a fine-tuning job.
   *
   * [Learn more about fine-tuning](/docs/guides/fine-tuning)
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
   * Creates an edited or extended image given one or more source images and a prompt. This endpoint only supports `gpt-image-1` and `dall-e-2`.
   */
  readonly "createImageEdit": (
    options: typeof CreateImageEditRequest.Encoded
  ) => Effect.Effect<typeof ImagesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates an image given a prompt. [Learn more](/docs/guides/images).
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
   * more in the [moderation guide](/docs/guides/moderation).
   */
  readonly "createModeration": (
    options: typeof CreateModerationRequest.Encoded
  ) => Effect.Effect<typeof CreateModerationResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Retrieve a paginated list of organization admin API keys.
   */
  readonly "adminApiKeysList": (
    options?: typeof AdminApiKeysListParams.Encoded | undefined
  ) => Effect.Effect<typeof ApiKeyList.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a new admin-level API key for the organization.
   */
  readonly "adminApiKeysCreate": (
    options: typeof AdminApiKeysCreateRequest.Encoded
  ) => Effect.Effect<typeof AdminApiKey.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Get details for a specific organization API key by its ID.
   */
  readonly "adminApiKeysGet": (
    keyId: string
  ) => Effect.Effect<typeof AdminApiKey.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Delete the specified admin API key.
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
   * Deactivate certificates at the project level.
   *
   * You can atomically and idempotently deactivate up to 10 certificates at a time.
   */
  readonly "deactivateProjectCertificates": (
    projectId: string,
    options: typeof ToggleCertificatesRequest.Encoded
  ) => Effect.Effect<typeof ListCertificatesResponse.Type, HttpClientError.HttpClientError | ParseError>
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
   * Creates a model response. Provide [text](/docs/guides/text) or
   * [image](/docs/guides/images) inputs to generate [text](/docs/guides/text)
   * or [JSON](/docs/guides/structured-outputs) outputs. Have the model call
   * your own [custom code](/docs/guides/function-calling) or use built-in
   * [tools](/docs/guides/tools) like [web search](/docs/guides/tools-web-search)
   * or [file search](/docs/guides/tools-file-search) to use your own data
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
   * Creates an intermediate [Upload](/docs/api-reference/uploads/object) object
   * that you can add [Parts](/docs/api-reference/uploads/part-object) to.
   * Currently, an Upload can accept at most 8 GB in total and expires after an
   * hour after you create it.
   *
   * Once you complete the Upload, we will create a
   * [File](/docs/api-reference/files/object) object that contains all the parts
   * you uploaded. This File is usable in the rest of our platform as a regular
   * File object.
   *
   * For certain `purpose` values, the correct `mime_type` must be specified.
   * Please refer to documentation for the
   * [supported MIME types for your use case](/docs/assistants/tools/file-search#supported-files).
   *
   * For guidance on the proper filename extensions for each purpose, please
   * follow the documentation on [creating a
   * File](/docs/api-reference/files/create).
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
   * Completes the [Upload](/docs/api-reference/uploads/object).
   *
   * Within the returned Upload object, there is a nested [File](/docs/api-reference/files/object) object that is ready to use in the rest of the platform.
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
   * Adds a [Part](/docs/api-reference/uploads/part-object) to an [Upload](/docs/api-reference/uploads/object) object. A Part represents a chunk of bytes from the file you are trying to upload.
   *
   * Each Part can be at most 64 MB, and you can add Parts until you hit the Upload maximum of 8 GB.
   *
   * It is possible to add multiple Parts in parallel. You can decide the intended order of the Parts when you [complete the Upload](/docs/api-reference/uploads/complete).
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
   * Create a vector store file by attaching a [File](/docs/api-reference/files) to a [vector store](/docs/api-reference/vector-stores/object).
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
   * Delete a vector store file. This will remove the file from the vector store but the file itself will not be deleted. To delete the file, use the [delete file](/docs/api-reference/files/delete) endpoint.
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
