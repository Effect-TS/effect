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

export class ListOperationsParams extends S.Struct({
  "filter": S.optionalWith(S.String, { nullable: true }),
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true }),
  "returnPartialSuccess": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * The `Status` type defines a logical error model that is suitable for
 * different programming environments, including REST APIs and RPC APIs. It is
 * used by [gRPC](https://github.com/grpc). Each `Status` message contains
 * three pieces of data: error code, error message, and error details.
 *
 * You can find out more about this error model and how to work with it in the
 * [API Design Guide](https://cloud.google.com/apis/design/errors).
 */
export class Status extends S.Class<Status>("Status")({
  /**
   * The status code, which should be an enum value of google.rpc.Code.
   */
  "code": S.optionalWith(S.Int, { nullable: true }),
  /**
   * A developer-facing error message, which should be in English. Any
   * user-facing error message should be localized and sent in the
   * google.rpc.Status.details field, or localized by the client.
   */
  "message": S.optionalWith(S.String, { nullable: true }),
  /**
   * A list of messages that carry the error details.  There is a common set of
   * message types for APIs to use.
   */
  "details": S.optionalWith(S.Array(S.Record({ key: S.String, value: S.Unknown })), { nullable: true })
}) {}

/**
 * This resource represents a long-running operation that is the result of a
 * network API call.
 */
export class Operation extends S.Class<Operation>("Operation")({
  /**
   * Service-specific metadata associated with the operation.  It typically
   * contains progress information and common metadata such as create time.
   * Some services might not provide such metadata.  Any method that returns a
   * long-running operation should document the metadata type, if any.
   */
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * The normal, successful response of the operation.  If the original
   * method returns no data on success, such as `Delete`, the response is
   * `google.protobuf.Empty`.  If the original method is standard
   * `Get`/`Create`/`Update`, the response should be the resource.  For other
   * methods, the response should have the type `XxxResponse`, where `Xxx`
   * is the original method name.  For example, if the original method name
   * is `TakeSnapshot()`, the inferred response type is
   * `TakeSnapshotResponse`.
   */
  "response": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * The server-assigned name, which is only unique within the same service that
   * originally returns it. If you use the default HTTP mapping, the
   * `name` should be a resource name ending with `operations/{unique_id}`.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * If the value is `false`, it means the operation is still in progress.
   * If `true`, the operation is completed, and either `error` or `response` is
   * available.
   */
  "done": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * The error result of the operation in case of failure or cancellation.
   */
  "error": S.optionalWith(Status, { nullable: true })
}) {}

/**
 * The response message for Operations.ListOperations.
 */
export class ListOperationsResponse extends S.Class<ListOperationsResponse>("ListOperationsResponse")({
  /**
   * A list of operations that matches the specified filter in the request.
   */
  "operations": S.optionalWith(S.Array(Operation), { nullable: true }),
  /**
   * The standard List next-page token.
   */
  "nextPageToken": S.optionalWith(S.String, { nullable: true }),
  /**
   * Unordered list. Unreachable resources. Populated when the request sets
   * `ListOperationsRequest.return_partial_success` and reads across
   * collections. For example, when attempting to list all resources across all
   * supported locations.
   */
  "unreachable": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

export class ListOperationsByParams extends S.Struct({
  "filter": S.optionalWith(S.String, { nullable: true }),
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true }),
  "returnPartialSuccess": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListOperationsByModelParams extends S.Struct({
  "filter": S.optionalWith(S.String, { nullable: true }),
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true }),
  "returnPartialSuccess": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * A generic empty message that you can re-use to avoid defining duplicated
 * empty messages in your APIs. A typical example is to use it as the request
 * or the response type of an API method. For instance:
 *
 *     service Foo {
 *       rpc Bar(google.protobuf.Empty) returns (google.protobuf.Empty);
 *     }
 */
export class Empty extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * Raw media bytes.
 *
 * Text should not be sent as raw bytes, use the 'text' field.
 */
export class Blob extends S.Class<Blob>("Blob")({
  /**
   * The IANA standard MIME type of the source data.
   * Examples:
   *   - image/png
   *   - image/jpeg
   * If an unsupported MIME type is provided, an error will be returned. For a
   * complete list of supported types, see [Supported file
   * formats](https://ai.google.dev/gemini-api/docs/prompting_with_media#supported_file_formats).
   */
  "mimeType": S.optionalWith(S.String, { nullable: true }),
  /**
   * Raw bytes for media formats.
   */
  "data": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A predicted `FunctionCall` returned from the model that contains
 * a string representing the `FunctionDeclaration.name` with the
 * arguments and their values.
 */
export class FunctionCall extends S.Class<FunctionCall>("FunctionCall")({
  /**
   * Optional. The unique id of the function call. If populated, the client to execute the
   * `function_call` and return the response with the matching `id`.
   */
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. The name of the function to call.
   * Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum
   * length of 64.
   */
  "name": S.String,
  /**
   * Optional. The function parameters and values in JSON object format.
   */
  "args": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * Raw media bytes for function response.
 *
 * Text should not be sent as raw bytes, use the 'FunctionResponse.response'
 * field.
 */
export class FunctionResponseBlob extends S.Class<FunctionResponseBlob>("FunctionResponseBlob")({
  /**
   * The IANA standard MIME type of the source data.
   * Examples:
   *   - image/png
   *   - image/jpeg
   * If an unsupported MIME type is provided, an error will be returned. For a
   * complete list of supported types, see [Supported file
   * formats](https://ai.google.dev/gemini-api/docs/prompting_with_media#supported_file_formats).
   */
  "mimeType": S.optionalWith(S.String, { nullable: true }),
  /**
   * Raw bytes for media formats.
   */
  "data": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A datatype containing media that is part of a `FunctionResponse` message.
 *
 * A `FunctionResponsePart` consists of data which has an associated datatype. A
 * `FunctionResponsePart` can only contain one of the accepted types in
 * `FunctionResponsePart.data`.
 *
 * A `FunctionResponsePart` must have a fixed IANA MIME type identifying the
 * type and subtype of the media if the `inline_data` field is filled with raw
 * bytes.
 */
export class FunctionResponsePart extends S.Class<FunctionResponsePart>("FunctionResponsePart")({
  /**
   * Inline media bytes.
   */
  "inlineData": S.optionalWith(FunctionResponseBlob, { nullable: true })
}) {}

/**
 * Optional. Specifies how the response should be scheduled in the conversation.
 * Only applicable to NON_BLOCKING function calls, is ignored otherwise.
 * Defaults to WHEN_IDLE.
 */
export class FunctionResponseScheduling
  extends S.Literal("SCHEDULING_UNSPECIFIED", "SILENT", "WHEN_IDLE", "INTERRUPT")
{}

/**
 * The result output from a `FunctionCall` that contains a string
 * representing the `FunctionDeclaration.name` and a structured JSON
 * object containing any output from the function is used as context to
 * the model. This should contain the result of a`FunctionCall` made
 * based on model prediction.
 */
export class FunctionResponse extends S.Class<FunctionResponse>("FunctionResponse")({
  /**
   * Optional. The id of the function call this response is for. Populated by the client
   * to match the corresponding function call `id`.
   */
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. The name of the function to call.
   * Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum
   * length of 64.
   */
  "name": S.String,
  /**
   * Required. The function response in JSON object format.
   * Callers can use any keys of their choice that fit the function's syntax
   * to return the function output, e.g. "output", "result", etc.
   * In particular, if the function call failed to execute, the response can
   * have an "error" key to return error details to the model.
   */
  "response": S.Record({ key: S.String, value: S.Unknown }),
  /**
   * Optional. Ordered `Parts` that constitute a function response. Parts may have
   * different IANA MIME types.
   */
  "parts": S.optionalWith(S.Array(FunctionResponsePart), { nullable: true }),
  /**
   * Optional. Signals that function call continues, and more responses will be
   * returned, turning the function call into a generator.
   * Is only applicable to NON_BLOCKING function calls, is ignored otherwise.
   * If set to false, future responses will not be considered.
   * It is allowed to return empty `response` with `will_continue=False` to
   * signal that the function call is finished. This may still trigger the model
   * generation. To avoid triggering the generation and finish the function
   * call, additionally set `scheduling` to `SILENT`.
   */
  "willContinue": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Optional. Specifies how the response should be scheduled in the conversation.
   * Only applicable to NON_BLOCKING function calls, is ignored otherwise.
   * Defaults to WHEN_IDLE.
   */
  "scheduling": S.optionalWith(FunctionResponseScheduling, { nullable: true })
}) {}

/**
 * URI based data.
 */
export class FileData extends S.Class<FileData>("FileData")({
  /**
   * Optional. The IANA standard MIME type of the source data.
   */
  "mimeType": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. URI.
   */
  "fileUri": S.String
}) {}

/**
 * Required. Programming language of the `code`.
 */
export class ExecutableCodeLanguage extends S.Literal("LANGUAGE_UNSPECIFIED", "PYTHON") {}

/**
 * Code generated by the model that is meant to be executed, and the result
 * returned to the model.
 *
 * Only generated when using the `CodeExecution` tool, in which the code will
 * be automatically executed, and a corresponding `CodeExecutionResult` will
 * also be generated.
 */
export class ExecutableCode extends S.Class<ExecutableCode>("ExecutableCode")({
  /**
   * Required. Programming language of the `code`.
   */
  "language": ExecutableCodeLanguage,
  /**
   * Required. The code to be executed.
   */
  "code": S.String
}) {}

/**
 * Required. Outcome of the code execution.
 */
export class CodeExecutionResultOutcome
  extends S.Literal("OUTCOME_UNSPECIFIED", "OUTCOME_OK", "OUTCOME_FAILED", "OUTCOME_DEADLINE_EXCEEDED")
{}

/**
 * Result of executing the `ExecutableCode`.
 *
 * Only generated when using the `CodeExecution`, and always follows a `part`
 * containing the `ExecutableCode`.
 */
export class CodeExecutionResult extends S.Class<CodeExecutionResult>("CodeExecutionResult")({
  /**
   * Required. Outcome of the code execution.
   */
  "outcome": CodeExecutionResultOutcome,
  /**
   * Optional. Contains stdout when code execution is successful, stderr or other
   * description otherwise.
   */
  "output": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Metadata describes the input video content.
 */
export class VideoMetadata extends S.Class<VideoMetadata>("VideoMetadata")({
  /**
   * Optional. The start offset of the video.
   */
  "startOffset": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. The end offset of the video.
   */
  "endOffset": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. The frame rate of the video sent to the model. If not specified, the
   * default value will be 1.0.
   * The fps range is (0.0, 24.0].
   */
  "fps": S.optionalWith(S.Number, { nullable: true })
}) {}

export class MediaResolutionLevel extends S.Literal(
  "MEDIA_RESOLUTION_UNSPECIFIED",
  "MEDIA_RESOLUTION_LOW",
  "MEDIA_RESOLUTION_MEDIUM",
  "MEDIA_RESOLUTION_HIGH",
  "MEDIA_RESOLUTION_ULTRA_HIGH"
) {}

/**
 * Media resolution for the input media.
 */
export class MediaResolution extends S.Class<MediaResolution>("MediaResolution")({
  "level": S.optionalWith(MediaResolutionLevel, { nullable: true })
}) {}

/**
 * A datatype containing media that is part of a multi-part `Content` message.
 *
 * A `Part` consists of data which has an associated datatype. A `Part` can only
 * contain one of the accepted types in `Part.data`.
 *
 * A `Part` must have a fixed IANA MIME type identifying the type and subtype
 * of the media if the `inline_data` field is filled with raw bytes.
 */
export class Part extends S.Class<Part>("Part")({
  /**
   * Inline text.
   */
  "text": S.optionalWith(S.String, { nullable: true }),
  /**
   * Inline media bytes.
   */
  "inlineData": S.optionalWith(Blob, { nullable: true }),
  /**
   * A predicted `FunctionCall` returned from the model that contains
   * a string representing the `FunctionDeclaration.name` with the
   * arguments and their values.
   */
  "functionCall": S.optionalWith(FunctionCall, { nullable: true }),
  /**
   * The result output of a `FunctionCall` that contains a string
   * representing the `FunctionDeclaration.name` and a structured JSON
   * object containing any output from the function is used as context to
   * the model.
   */
  "functionResponse": S.optionalWith(FunctionResponse, { nullable: true }),
  /**
   * URI based data.
   */
  "fileData": S.optionalWith(FileData, { nullable: true }),
  /**
   * Code generated by the model that is meant to be executed.
   */
  "executableCode": S.optionalWith(ExecutableCode, { nullable: true }),
  /**
   * Result of executing the `ExecutableCode`.
   */
  "codeExecutionResult": S.optionalWith(CodeExecutionResult, { nullable: true }),
  /**
   * Optional. Video metadata. The metadata should only be specified while the video
   * data is presented in inline_data or file_data.
   */
  "videoMetadata": S.optionalWith(VideoMetadata, { nullable: true }),
  /**
   * Optional. Indicates if the part is thought from the model.
   */
  "thought": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Optional. An opaque signature for the thought so it can be reused in subsequent
   * requests.
   */
  "thoughtSignature": S.optionalWith(S.String, { nullable: true }),
  /**
   * Custom metadata associated with the Part.
   * Agents using genai.Part as content representation may need to keep track
   * of the additional information. For example it can be name of a file/source
   * from which the Part originates or a way to multiplex multiple Part streams.
   */
  "partMetadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * Optional. Media resolution for the input media.
   */
  "mediaResolution": S.optionalWith(MediaResolution, { nullable: true })
}) {}

/**
 * The base structured datatype containing multi-part content of a message.
 *
 * A `Content` includes a `role` field designating the producer of the `Content`
 * and a `parts` field containing multi-part data that contains the content of
 * the message turn.
 */
export class Content extends S.Class<Content>("Content")({
  /**
   * Ordered `Parts` that constitute a single message. Parts may have different
   * MIME types.
   */
  "parts": S.optionalWith(S.Array(Part), { nullable: true }),
  /**
   * Optional. The producer of the content. Must be either 'user' or 'model'.
   *
   * Useful to set for multi-turn conversations, otherwise can be left blank
   * or unset.
   */
  "role": S.optionalWith(S.String, { nullable: true })
}) {}

export class Type
  extends S.Literal("TYPE_UNSPECIFIED", "STRING", "NUMBER", "INTEGER", "BOOLEAN", "ARRAY", "OBJECT", "NULL")
{}

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
}) {}

/**
 * Optional. Specifies the function Behavior.
 * Currently only supported by the BidiGenerateContent method.
 */
export class FunctionDeclarationBehavior extends S.Literal("UNSPECIFIED", "BLOCKING", "NON_BLOCKING") {}

/**
 * Structured representation of a function declaration as defined by the
 * [OpenAPI 3.03 specification](https://spec.openapis.org/oas/v3.0.3). Included
 * in this declaration are the function name and parameters. This
 * FunctionDeclaration is a representation of a block of code that can be used
 * as a `Tool` by the model and executed by the client.
 */
export class FunctionDeclaration extends S.Class<FunctionDeclaration>("FunctionDeclaration")({
  /**
   * Required. The name of the function.
   * Must be a-z, A-Z, 0-9, or contain underscores, colons, dots, and dashes,
   * with a maximum length of 64.
   */
  "name": S.String,
  /**
   * Required. A brief description of the function.
   */
  "description": S.String,
  /**
   * Optional. Describes the parameters to this function. Reflects the Open API 3.03
   * Parameter Object string Key: the name of the parameter. Parameter names are
   * case sensitive. Schema Value: the Schema defining the type used for the
   * parameter.
   */
  "parameters": S.optionalWith(Schema, { nullable: true }),
  /**
   * Optional. Describes the output from this function in JSON Schema format. Reflects the
   * Open API 3.03 Response Object. The Schema defines the type used for the
   * response value of the function.
   */
  "response": S.optionalWith(Schema, { nullable: true }),
  /**
   * Optional. Specifies the function Behavior.
   * Currently only supported by the BidiGenerateContent method.
   */
  "behavior": S.optionalWith(FunctionDeclarationBehavior, { nullable: true })
}) {}

/**
 * The mode of the predictor to be used in dynamic retrieval.
 */
export class DynamicRetrievalConfigMode extends S.Literal("MODE_UNSPECIFIED", "MODE_DYNAMIC") {}

/**
 * Describes the options to customize dynamic retrieval.
 */
export class DynamicRetrievalConfig extends S.Class<DynamicRetrievalConfig>("DynamicRetrievalConfig")({
  /**
   * The mode of the predictor to be used in dynamic retrieval.
   */
  "mode": S.optionalWith(DynamicRetrievalConfigMode, { nullable: true }),
  /**
   * The threshold to be used in dynamic retrieval.
   * If not set, a system default value is used.
   */
  "dynamicThreshold": S.optionalWith(S.Number, { nullable: true })
}) {}

/**
 * Tool to retrieve public web data for grounding, powered by Google.
 */
export class GoogleSearchRetrieval extends S.Class<GoogleSearchRetrieval>("GoogleSearchRetrieval")({
  /**
   * Specifies the dynamic retrieval configuration for the given source.
   */
  "dynamicRetrievalConfig": S.optionalWith(DynamicRetrievalConfig, { nullable: true })
}) {}

/**
 * Tool that executes code generated by the model, and automatically returns
 * the result to the model.
 *
 * See also `ExecutableCode` and `CodeExecutionResult` which are only generated
 * when using this tool.
 */
export class CodeExecution extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * Represents a time interval, encoded as a Timestamp start (inclusive) and a
 * Timestamp end (exclusive).
 *
 * The start must be less than or equal to the end.
 * When the start equals the end, the interval is empty (matches no time).
 * When both start and end are unspecified, the interval matches any time.
 */
export class Interval extends S.Class<Interval>("Interval")({
  /**
   * Optional. Inclusive start of the interval.
   *
   * If specified, a Timestamp matching this interval will have to be the same
   * or after the start.
   */
  "startTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Exclusive end of the interval.
   *
   * If specified, a Timestamp matching this interval will have to be before the
   * end.
   */
  "endTime": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * GoogleSearch tool type.
 * Tool to support Google Search in Model. Powered by Google.
 */
export class GoogleSearch extends S.Class<GoogleSearch>("GoogleSearch")({
  /**
   * Optional. Filter search results to a specific time range.
   * If customers set a start time, they must set an end time (and vice
   * versa).
   */
  "timeRangeFilter": S.optionalWith(Interval, { nullable: true })
}) {}

/**
 * Required. The environment being operated.
 */
export class ComputerUseEnvironment extends S.Literal("ENVIRONMENT_UNSPECIFIED", "ENVIRONMENT_BROWSER") {}

/**
 * Computer Use tool type.
 */
export class ComputerUse extends S.Class<ComputerUse>("ComputerUse")({
  /**
   * Required. The environment being operated.
   */
  "environment": ComputerUseEnvironment,
  /**
   * Optional. By default, predefined functions are included in the final model
   * call.
   * Some of them can be explicitly excluded from being automatically
   * included. This can serve two purposes:
   * 1. Using a more restricted / different action space.
   * 2. Improving the definitions / instructions of predefined functions.
   */
  "excludedPredefinedFunctions": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

/**
 * Tool to support URL context retrieval.
 */
export class UrlContext extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * The FileSearch tool that retrieves knowledge from Semantic Retrieval corpora.
 * Files are imported to Semantic Retrieval corpora using the ImportFile API.
 */
export class FileSearch extends S.Class<FileSearch>("FileSearch")({
  /**
   * Required. The names of the file_search_stores to retrieve from.
   * Example: `fileSearchStores/my-file-search-store-123`
   */
  "fileSearchStoreNames": S.Array(S.String),
  /**
   * Optional. The number of semantic retrieval chunks to retrieve.
   */
  "topK": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. Metadata filter to apply to the semantic retrieval documents and chunks.
   */
  "metadataFilter": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A transport that can stream HTTP requests and responses.
 * Next ID: 6
 */
export class StreamableHttpTransport extends S.Class<StreamableHttpTransport>("StreamableHttpTransport")({
  /**
   * The full URL for the MCPServer endpoint.
   * Example: "https://api.example.com/mcp"
   */
  "url": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional: Fields for authentication headers, timeouts, etc., if needed.
   */
  "headers": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  /**
   * HTTP timeout for regular operations.
   */
  "timeout": S.optionalWith(S.String, { nullable: true }),
  /**
   * Timeout for SSE read operations.
   */
  "sseReadTimeout": S.optionalWith(S.String, { nullable: true }),
  /**
   * Whether to close the client session when the transport closes.
   */
  "terminateOnClose": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * A MCPServer is a server that can be called by the model to perform actions.
 * It is a server that implements the MCP protocol.
 * Next ID: 5
 */
export class McpServer extends S.Class<McpServer>("McpServer")({
  /**
   * A transport that can stream HTTP requests and responses.
   */
  "streamableHttpTransport": S.optionalWith(StreamableHttpTransport, { nullable: true }),
  /**
   * The name of the MCPServer.
   */
  "name": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The GoogleMaps Tool that provides geospatial context for the user's query.
 */
export class GoogleMaps extends S.Class<GoogleMaps>("GoogleMaps")({
  /**
   * Optional. Whether to return a widget context token in the GroundingMetadata of the
   * response. Developers can use the widget context token to render a Google
   * Maps widget with geospatial context related to the places that the model
   * references in the response.
   */
  "enableWidget": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * Tool details that the model may use to generate response.
 *
 * A `Tool` is a piece of code that enables the system to interact with
 * external systems to perform an action, or set of actions, outside of
 * knowledge and scope of the model.
 *
 * Next ID: 14
 */
export class Tool extends S.Class<Tool>("Tool")({
  /**
   * Optional. A list of `FunctionDeclarations` available to the model that can be used
   * for function calling.
   *
   * The model or system does not execute the function. Instead the defined
   * function may be returned as a FunctionCall
   * with arguments to the client side for execution. The model may decide to
   * call a subset of these functions by populating
   * FunctionCall in the response. The next
   * conversation turn may contain a
   * FunctionResponse
   * with the Content.role "function" generation context for the next model
   * turn.
   */
  "functionDeclarations": S.optionalWith(S.Array(FunctionDeclaration), { nullable: true }),
  /**
   * Optional. Retrieval tool that is powered by Google search.
   */
  "googleSearchRetrieval": S.optionalWith(GoogleSearchRetrieval, { nullable: true }),
  /**
   * Optional. Enables the model to execute code as part of generation.
   */
  "codeExecution": S.optionalWith(CodeExecution, { nullable: true }),
  /**
   * Optional. GoogleSearch tool type.
   * Tool to support Google Search in Model. Powered by Google.
   */
  "googleSearch": S.optionalWith(GoogleSearch, { nullable: true }),
  /**
   * Optional. Tool to support the model interacting directly with the computer.
   * If enabled, it automatically populates computer-use specific Function
   * Declarations.
   */
  "computerUse": S.optionalWith(ComputerUse, { nullable: true }),
  /**
   * Optional. Tool to support URL context retrieval.
   */
  "urlContext": S.optionalWith(UrlContext, { nullable: true }),
  /**
   * Optional. FileSearch tool type.
   * Tool to retrieve knowledge from Semantic Retrieval corpora.
   */
  "fileSearch": S.optionalWith(FileSearch, { nullable: true }),
  /**
   * Optional. MCP Servers to connect to.
   */
  "mcpServers": S.optionalWith(S.Array(McpServer), { nullable: true }),
  /**
   * Optional. Tool that allows grounding the model's response with geospatial context
   * related to the user's query.
   */
  "googleMaps": S.optionalWith(GoogleMaps, { nullable: true })
}) {}

/**
 * Optional. Specifies the mode in which function calling should execute. If
 * unspecified, the default value will be set to AUTO.
 */
export class FunctionCallingConfigMode extends S.Literal("MODE_UNSPECIFIED", "AUTO", "ANY", "NONE", "VALIDATED") {}

/**
 * Configuration for specifying function calling behavior.
 */
export class FunctionCallingConfig extends S.Class<FunctionCallingConfig>("FunctionCallingConfig")({
  /**
   * Optional. Specifies the mode in which function calling should execute. If
   * unspecified, the default value will be set to AUTO.
   */
  "mode": S.optionalWith(FunctionCallingConfigMode, { nullable: true }),
  /**
   * Optional. A set of function names that, when provided, limits the functions the model
   * will call.
   *
   * This should only be set when the Mode is ANY or VALIDATED. Function names
   * should match [FunctionDeclaration.name]. When set, model will
   * predict a function call from only allowed function names.
   */
  "allowedFunctionNames": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

/**
 * An object that represents a latitude/longitude pair. This is expressed as a
 * pair of doubles to represent degrees latitude and degrees longitude. Unless
 * specified otherwise, this object must conform to the
 * WGS84 standard. Values must be within normalized ranges.
 */
export class LatLng extends S.Class<LatLng>("LatLng")({
  /**
   * The latitude in degrees. It must be in the range [-90.0, +90.0].
   */
  "latitude": S.optionalWith(S.Number, { nullable: true }),
  /**
   * The longitude in degrees. It must be in the range [-180.0, +180.0].
   */
  "longitude": S.optionalWith(S.Number, { nullable: true })
}) {}

/**
 * Retrieval config.
 */
export class RetrievalConfig extends S.Class<RetrievalConfig>("RetrievalConfig")({
  /**
   * Optional. The location of the user.
   */
  "latLng": S.optionalWith(LatLng, { nullable: true }),
  /**
   * Optional. The language code of the user.
   * Language code for content. Use language tags defined by
   * [BCP47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt).
   */
  "languageCode": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The Tool configuration containing parameters for specifying `Tool` use
 * in the request.
 */
export class ToolConfig extends S.Class<ToolConfig>("ToolConfig")({
  /**
   * Optional. Function calling config.
   */
  "functionCallingConfig": S.optionalWith(FunctionCallingConfig, { nullable: true }),
  /**
   * Optional. Retrieval config.
   */
  "retrievalConfig": S.optionalWith(RetrievalConfig, { nullable: true })
}) {}

export class HarmCategory extends S.Literal(
  "HARM_CATEGORY_UNSPECIFIED",
  "HARM_CATEGORY_DEROGATORY",
  "HARM_CATEGORY_TOXICITY",
  "HARM_CATEGORY_VIOLENCE",
  "HARM_CATEGORY_SEXUAL",
  "HARM_CATEGORY_MEDICAL",
  "HARM_CATEGORY_DANGEROUS",
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
  "HARM_CATEGORY_CIVIC_INTEGRITY"
) {}

/**
 * Required. Controls the probability threshold at which harm is blocked.
 */
export class SafetySettingThreshold extends S.Literal(
  "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
  "BLOCK_LOW_AND_ABOVE",
  "BLOCK_MEDIUM_AND_ABOVE",
  "BLOCK_ONLY_HIGH",
  "BLOCK_NONE",
  "OFF"
) {}

/**
 * Safety setting, affecting the safety-blocking behavior.
 *
 * Passing a safety setting for a category changes the allowed probability that
 * content is blocked.
 */
export class SafetySetting extends S.Class<SafetySetting>("SafetySetting")({
  /**
   * Required. The category for this setting.
   */
  "category": HarmCategory,
  /**
   * Required. Controls the probability threshold at which harm is blocked.
   */
  "threshold": SafetySettingThreshold
}) {}

/**
 * The configuration for the prebuilt speaker to use.
 */
export class PrebuiltVoiceConfig extends S.Class<PrebuiltVoiceConfig>("PrebuiltVoiceConfig")({
  /**
   * The name of the preset voice to use.
   */
  "voiceName": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The configuration for the voice to use.
 */
export class VoiceConfig extends S.Class<VoiceConfig>("VoiceConfig")({
  /**
   * The configuration for the prebuilt voice to use.
   */
  "prebuiltVoiceConfig": S.optionalWith(PrebuiltVoiceConfig, { nullable: true })
}) {}

/**
 * The configuration for a single speaker in a multi speaker setup.
 */
export class SpeakerVoiceConfig extends S.Class<SpeakerVoiceConfig>("SpeakerVoiceConfig")({
  /**
   * Required. The name of the speaker to use. Should be the same as in the prompt.
   */
  "speaker": S.String,
  /**
   * Required. The configuration for the voice to use.
   */
  "voiceConfig": VoiceConfig
}) {}

/**
 * The configuration for the multi-speaker setup.
 */
export class MultiSpeakerVoiceConfig extends S.Class<MultiSpeakerVoiceConfig>("MultiSpeakerVoiceConfig")({
  /**
   * Required. All the enabled speaker voices.
   */
  "speakerVoiceConfigs": S.Array(SpeakerVoiceConfig)
}) {}

/**
 * The speech generation config.
 */
export class SpeechConfig extends S.Class<SpeechConfig>("SpeechConfig")({
  /**
   * The configuration in case of single-voice output.
   */
  "voiceConfig": S.optionalWith(VoiceConfig, { nullable: true }),
  /**
   * Optional. The configuration for the multi-speaker setup.
   * It is mutually exclusive with the voice_config field.
   */
  "multiSpeakerVoiceConfig": S.optionalWith(MultiSpeakerVoiceConfig, { nullable: true }),
  /**
   * Optional. Language code (in BCP 47 format, e.g. "en-US") for speech synthesis.
   *
   * Valid values are: de-DE, en-AU, en-GB, en-IN, en-US, es-US, fr-FR, hi-IN,
   * pt-BR, ar-XA, es-ES, fr-CA, id-ID, it-IT, ja-JP, tr-TR, vi-VN, bn-IN,
   * gu-IN, kn-IN, ml-IN, mr-IN, ta-IN, te-IN, nl-NL, ko-KR, cmn-CN, pl-PL,
   * ru-RU, and th-TH.
   */
  "languageCode": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Optional. Controls the maximum depth of the model's internal reasoning process before
 * it produces a response. If not specified, the default is HIGH. Recommended
 * for Gemini 3 or later models. Use with earlier models results in an error.
 */
export class ThinkingConfigThinkingLevel
  extends S.Literal("THINKING_LEVEL_UNSPECIFIED", "MINIMAL", "LOW", "MEDIUM", "HIGH")
{}

/**
 * Config for thinking features.
 */
export class ThinkingConfig extends S.Class<ThinkingConfig>("ThinkingConfig")({
  /**
   * Indicates whether to include thoughts in the response.
   * If true, thoughts are returned only when available.
   */
  "includeThoughts": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * The number of thoughts tokens that the model should generate.
   */
  "thinkingBudget": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. Controls the maximum depth of the model's internal reasoning process before
   * it produces a response. If not specified, the default is HIGH. Recommended
   * for Gemini 3 or later models. Use with earlier models results in an error.
   */
  "thinkingLevel": S.optionalWith(ThinkingConfigThinkingLevel, { nullable: true })
}) {}

/**
 * Config for image generation features.
 */
export class ImageConfig extends S.Class<ImageConfig>("ImageConfig")({
  /**
   * Optional. The aspect ratio of the image to generate. Supported aspect ratios: 1:1,
   * 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9.
   *
   * If not specified, the model will choose a default aspect ratio based on any
   * reference images provided.
   */
  "aspectRatio": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Specifies the size of generated images. Supported values are `1K`, `2K`,
   * `4K`. If not specified, the model will use default value `1K`.
   */
  "imageSize": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Optional. If specified, the media resolution specified will be used.
 */
export class GenerationConfigMediaResolution extends S.Literal(
  "MEDIA_RESOLUTION_UNSPECIFIED",
  "MEDIA_RESOLUTION_LOW",
  "MEDIA_RESOLUTION_MEDIUM",
  "MEDIA_RESOLUTION_HIGH"
) {}

/**
 * Configuration options for model generation and outputs. Not all parameters
 * are configurable for every model.
 */
export class GenerationConfig extends S.Class<GenerationConfig>("GenerationConfig")({
  /**
   * Optional. Number of generated responses to return. If unset, this will default
   * to 1. Please note that this doesn't work for previous generation
   * models (Gemini 1.0 family)
   */
  "candidateCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. The set of character sequences (up to 5) that will stop output generation.
   * If specified, the API will stop at the first appearance of a
   * `stop_sequence`. The stop sequence will not be included as part of the
   * response.
   */
  "stopSequences": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Optional. The maximum number of tokens to include in a response candidate.
   *
   * Note: The default value varies by model, see the `Model.output_token_limit`
   * attribute of the `Model` returned from the `getModel` function.
   */
  "maxOutputTokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. Controls the randomness of the output.
   *
   * Note: The default value varies by model, see the `Model.temperature`
   * attribute of the `Model` returned from the `getModel` function.
   *
   * Values can range from [0.0, 2.0].
   */
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. The maximum cumulative probability of tokens to consider when sampling.
   *
   * The model uses combined Top-k and Top-p (nucleus) sampling.
   *
   * Tokens are sorted based on their assigned probabilities so that only the
   * most likely tokens are considered. Top-k sampling directly limits the
   * maximum number of tokens to consider, while Nucleus sampling limits the
   * number of tokens based on the cumulative probability.
   *
   * Note: The default value varies by `Model` and is specified by
   * the`Model.top_p` attribute returned from the `getModel` function. An empty
   * `top_k` attribute indicates that the model doesn't apply top-k sampling
   * and doesn't allow setting `top_k` on requests.
   */
  "topP": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. The maximum number of tokens to consider when sampling.
   *
   * Gemini models use Top-p (nucleus) sampling or a combination of Top-k and
   * nucleus sampling. Top-k sampling considers the set of `top_k` most probable
   * tokens. Models running with nucleus sampling don't allow top_k setting.
   *
   * Note: The default value varies by `Model` and is specified by
   * the`Model.top_p` attribute returned from the `getModel` function. An empty
   * `top_k` attribute indicates that the model doesn't apply top-k sampling
   * and doesn't allow setting `top_k` on requests.
   */
  "topK": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. Seed used in decoding. If not set, the request uses a randomly generated
   * seed.
   */
  "seed": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. MIME type of the generated candidate text.
   * Supported MIME types are:
   * `text/plain`: (default) Text output.
   * `application/json`: JSON response in the response candidates.
   * `text/x.enum`: ENUM as a string response in the response candidates.
   * Refer to the
   * [docs](https://ai.google.dev/gemini-api/docs/prompting_with_media#plain_text_formats)
   * for a list of all supported text MIME types.
   */
  "responseMimeType": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Output schema of the generated candidate text. Schemas must be a
   * subset of the [OpenAPI schema](https://spec.openapis.org/oas/v3.0.3#schema)
   * and can be objects, primitives or arrays.
   *
   * If set, a compatible `response_mime_type` must also be set.
   * Compatible MIME types:
   * `application/json`: Schema for JSON response.
   * Refer to the [JSON text generation
   * guide](https://ai.google.dev/gemini-api/docs/json-mode) for more details.
   */
  "responseSchema": S.optionalWith(Schema, { nullable: true }),
  /**
   * Optional. Presence penalty applied to the next token's logprobs if the token has
   * already been seen in the response.
   *
   * This penalty is binary on/off and not dependant on the number of times the
   * token is used (after the first). Use
   * frequency_penalty
   * for a penalty that increases with each use.
   *
   * A positive penalty will discourage the use of tokens that have already
   * been used in the response, increasing the vocabulary.
   *
   * A negative penalty will encourage the use of tokens that have already been
   * used in the response, decreasing the vocabulary.
   */
  "presencePenalty": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. Frequency penalty applied to the next token's logprobs, multiplied by the
   * number of times each token has been seen in the respponse so far.
   *
   * A positive penalty will discourage the use of tokens that have already
   * been used, proportional to the number of times the token has been used:
   * The more a token is used, the more difficult it is for the model to use
   * that token again increasing the vocabulary of responses.
   *
   * Caution: A _negative_ penalty will encourage the model to reuse tokens
   * proportional to the number of times the token has been used. Small
   * negative values will reduce the vocabulary of a response. Larger negative
   * values will cause the model to start repeating a common token  until it
   * hits the max_output_tokens
   * limit.
   */
  "frequencyPenalty": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. If true, export the logprobs results in response.
   */
  "responseLogprobs": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Optional. Only valid if response_logprobs=True.
   * This sets the number of top logprobs to return at each decoding step in the
   * Candidate.logprobs_result. The number must be in the range of [0, 20].
   */
  "logprobs": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. Enables enhanced civic answers. It may not be available for all models.
   */
  "enableEnhancedCivicAnswers": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * Optional. The requested modalities of the response. Represents the set of modalities
   * that the model can return, and should be expected in the response. This is
   * an exact match to the modalities of the response.
   *
   * A model may have multiple combinations of supported modalities. If the
   * requested modalities do not match any of the supported combinations, an
   * error will be returned.
   *
   * An empty list is equivalent to requesting only text.
   */
  "responseModalities": S.optionalWith(S.Array(S.Literal("MODALITY_UNSPECIFIED", "TEXT", "IMAGE", "AUDIO")), {
    nullable: true
  }),
  /**
   * Optional. The speech generation config.
   */
  "speechConfig": S.optionalWith(SpeechConfig, { nullable: true }),
  /**
   * Optional. Config for thinking features.
   * An error will be returned if this field is set for models that don't
   * support thinking.
   */
  "thinkingConfig": S.optionalWith(ThinkingConfig, { nullable: true }),
  /**
   * Optional. Config for image generation.
   * An error will be returned if this field is set for models that don't
   * support these config options.
   */
  "imageConfig": S.optionalWith(ImageConfig, { nullable: true }),
  /**
   * Optional. If specified, the media resolution specified will be used.
   */
  "mediaResolution": S.optionalWith(GenerationConfigMediaResolution, { nullable: true })
}) {}

/**
 * Request to generate a completion from the model.
 */
export class GenerateContentRequest extends S.Class<GenerateContentRequest>("GenerateContentRequest")({
  /**
   * Required. The name of the `Model` to use for generating the completion.
   *
   * Format: `models/{model}`.
   */
  "model": S.String,
  /**
   * Optional. Developer set [system
   * instruction(s)](https://ai.google.dev/gemini-api/docs/system-instructions).
   * Currently, text only.
   */
  "systemInstruction": S.optionalWith(Content, { nullable: true }),
  /**
   * Required. The content of the current conversation with the model.
   *
   * For single-turn queries, this is a single instance. For multi-turn queries
   * like [chat](https://ai.google.dev/gemini-api/docs/text-generation#chat),
   * this is a repeated field that contains the conversation history and the
   * latest request.
   */
  "contents": S.Array(Content),
  /**
   * Optional. A list of `Tools` the `Model` may use to generate the next response.
   *
   * A `Tool` is a piece of code that enables the system to interact with
   * external systems to perform an action, or set of actions, outside of
   * knowledge and scope of the `Model`. Supported `Tool`s are `Function` and
   * `code_execution`. Refer to the [Function
   * calling](https://ai.google.dev/gemini-api/docs/function-calling) and the
   * [Code execution](https://ai.google.dev/gemini-api/docs/code-execution)
   * guides to learn more.
   */
  "tools": S.optionalWith(S.Array(Tool), { nullable: true }),
  /**
   * Optional. Tool configuration for any `Tool` specified in the request. Refer to the
   * [Function calling
   * guide](https://ai.google.dev/gemini-api/docs/function-calling#function_calling_mode)
   * for a usage example.
   */
  "toolConfig": S.optionalWith(ToolConfig, { nullable: true }),
  /**
   * Optional. A list of unique `SafetySetting` instances for blocking unsafe content.
   *
   * This will be enforced on the `GenerateContentRequest.contents` and
   * `GenerateContentResponse.candidates`. There should not be more than one
   * setting for each `SafetyCategory` type. The API will block any contents and
   * responses that fail to meet the thresholds set by these settings. This list
   * overrides the default settings for each `SafetyCategory` specified in the
   * safety_settings. If there is no `SafetySetting` for a given
   * `SafetyCategory` provided in the list, the API will use the default safety
   * setting for that category. Harm categories HARM_CATEGORY_HATE_SPEECH,
   * HARM_CATEGORY_SEXUALLY_EXPLICIT, HARM_CATEGORY_DANGEROUS_CONTENT,
   * HARM_CATEGORY_HARASSMENT, HARM_CATEGORY_CIVIC_INTEGRITY are supported.
   * Refer to the [guide](https://ai.google.dev/gemini-api/docs/safety-settings)
   * for detailed information on available safety settings. Also refer to the
   * [Safety guidance](https://ai.google.dev/gemini-api/docs/safety-guidance) to
   * learn how to incorporate safety considerations in your AI applications.
   */
  "safetySettings": S.optionalWith(S.Array(SafetySetting), { nullable: true }),
  /**
   * Optional. Configuration options for model generation and outputs.
   */
  "generationConfig": S.optionalWith(GenerationConfig, { nullable: true }),
  /**
   * Optional. The name of the content
   * [cached](https://ai.google.dev/gemini-api/docs/caching) to use as context
   * to serve the prediction. Format: `cachedContents/{cachedContent}`
   */
  "cachedContent": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Optional. Output only. The reason why the model stopped generating tokens.
 *
 * If empty, the model has not stopped generating tokens.
 */
export class CandidateFinishReason extends S.Literal(
  "FINISH_REASON_UNSPECIFIED",
  "STOP",
  "MAX_TOKENS",
  "SAFETY",
  "RECITATION",
  "LANGUAGE",
  "OTHER",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "MALFORMED_FUNCTION_CALL",
  "IMAGE_SAFETY",
  "IMAGE_PROHIBITED_CONTENT",
  "IMAGE_OTHER",
  "NO_IMAGE",
  "IMAGE_RECITATION",
  "UNEXPECTED_TOOL_CALL",
  "TOO_MANY_TOOL_CALLS",
  "MISSING_THOUGHT_SIGNATURE"
) {}

/**
 * Required. The probability of harm for this content.
 */
export class SafetyRatingProbability
  extends S.Literal("HARM_PROBABILITY_UNSPECIFIED", "NEGLIGIBLE", "LOW", "MEDIUM", "HIGH")
{}

/**
 * Safety rating for a piece of content.
 *
 * The safety rating contains the category of harm and the
 * harm probability level in that category for a piece of content.
 * Content is classified for safety across a number of
 * harm categories and the probability of the harm classification is included
 * here.
 */
export class SafetyRating extends S.Class<SafetyRating>("SafetyRating")({
  /**
   * Required. The category for this rating.
   */
  "category": HarmCategory,
  /**
   * Required. The probability of harm for this content.
   */
  "probability": SafetyRatingProbability,
  /**
   * Was this content blocked because of this rating?
   */
  "blocked": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * A citation to a source for a portion of a specific response.
 */
export class CitationSource extends S.Class<CitationSource>("CitationSource")({
  /**
   * Optional. Start of segment of the response that is attributed to this source.
   *
   * Index indicates the start of the segment, measured in bytes.
   */
  "startIndex": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. End of the attributed segment, exclusive.
   */
  "endIndex": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. URI that is attributed as a source for a portion of the text.
   */
  "uri": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. License for the GitHub project that is attributed as a source for segment.
   *
   * License info is required for code citations.
   */
  "license": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A collection of source attributions for a piece of content.
 */
export class CitationMetadata extends S.Class<CitationMetadata>("CitationMetadata")({
  /**
   * Citations to sources for a specific response.
   */
  "citationSources": S.optionalWith(S.Array(CitationSource), { nullable: true })
}) {}

/**
 * Identifier for a part within a `GroundingPassage`.
 */
export class GroundingPassageId extends S.Class<GroundingPassageId>("GroundingPassageId")({
  /**
   * Output only. ID of the passage matching the `GenerateAnswerRequest`'s
   * `GroundingPassage.id`.
   */
  "passageId": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Index of the part within the `GenerateAnswerRequest`'s
   * `GroundingPassage.content`.
   */
  "partIndex": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * Identifier for a `Chunk` retrieved via Semantic Retriever specified in the
 * `GenerateAnswerRequest` using `SemanticRetrieverConfig`.
 */
export class SemanticRetrieverChunk extends S.Class<SemanticRetrieverChunk>("SemanticRetrieverChunk")({
  /**
   * Output only. Name of the source matching the request's
   * `SemanticRetrieverConfig.source`. Example: `corpora/123` or
   * `corpora/123/documents/abc`
   */
  "source": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Name of the `Chunk` containing the attributed text.
   * Example: `corpora/123/documents/abc/chunks/xyz`
   */
  "chunk": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Identifier for the source contributing to this attribution.
 */
export class AttributionSourceId extends S.Class<AttributionSourceId>("AttributionSourceId")({
  /**
   * Identifier for an inline passage.
   */
  "groundingPassage": S.optionalWith(GroundingPassageId, { nullable: true }),
  /**
   * Identifier for a `Chunk` fetched via Semantic Retriever.
   */
  "semanticRetrieverChunk": S.optionalWith(SemanticRetrieverChunk, { nullable: true })
}) {}

/**
 * Attribution for a source that contributed to an answer.
 */
export class GroundingAttribution extends S.Class<GroundingAttribution>("GroundingAttribution")({
  /**
   * Output only. Identifier for the source contributing to this attribution.
   */
  "sourceId": S.optionalWith(AttributionSourceId, { nullable: true }),
  /**
   * Grounding source content that makes up this attribution.
   */
  "content": S.optionalWith(Content, { nullable: true })
}) {}

/**
 * Google search entry point.
 */
export class SearchEntryPoint extends S.Class<SearchEntryPoint>("SearchEntryPoint")({
  /**
   * Optional. Web content snippet that can be embedded in a web page or an app webview.
   */
  "renderedContent": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Base64 encoded JSON representing array of  tuple.
   */
  "sdkBlob": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Chunk from the web.
 */
export class Web extends S.Class<Web>("Web")({
  /**
   * URI reference of the chunk.
   */
  "uri": S.optionalWith(S.String, { nullable: true }),
  /**
   * Title of the chunk.
   */
  "title": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Chunk from context retrieved by the file search tool.
 */
export class RetrievedContext extends S.Class<RetrievedContext>("RetrievedContext")({
  /**
   * Optional. URI reference of the semantic retrieval document.
   */
  "uri": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Title of the document.
   */
  "title": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Text of the chunk.
   */
  "text": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Name of the `FileSearchStore` containing the document.
   * Example: `fileSearchStores/123`
   */
  "fileSearchStore": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Encapsulates a snippet of a user review that answers a question about
 * the features of a specific place in Google Maps.
 */
export class ReviewSnippet extends S.Class<ReviewSnippet>("ReviewSnippet")({
  /**
   * The ID of the review snippet.
   */
  "reviewId": S.optionalWith(S.String, { nullable: true }),
  /**
   * A link that corresponds to the user review on Google Maps.
   */
  "googleMapsUri": S.optionalWith(S.String, { nullable: true }),
  /**
   * Title of the review.
   */
  "title": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Collection of sources that provide answers about the features of a given
 * place in Google Maps. Each PlaceAnswerSources message corresponds to a
 * specific place in Google Maps. The Google Maps tool used these sources in
 * order to answer questions about features of the place (e.g: "does Bar Foo
 * have Wifi" or "is Foo Bar wheelchair accessible?"). Currently we only
 * support review snippets as sources.
 */
export class PlaceAnswerSources extends S.Class<PlaceAnswerSources>("PlaceAnswerSources")({
  /**
   * Snippets of reviews that are used to generate answers about the
   * features of a given place in Google Maps.
   */
  "reviewSnippets": S.optionalWith(S.Array(ReviewSnippet), { nullable: true })
}) {}

/**
 * A grounding chunk from Google Maps. A Maps chunk corresponds to a single
 * place.
 */
export class Maps extends S.Class<Maps>("Maps")({
  /**
   * URI reference of the place.
   */
  "uri": S.optionalWith(S.String, { nullable: true }),
  /**
   * Title of the place.
   */
  "title": S.optionalWith(S.String, { nullable: true }),
  /**
   * Text description of the place answer.
   */
  "text": S.optionalWith(S.String, { nullable: true }),
  /**
   * This ID of the place, in `places/{place_id}` format. A user can use this
   * ID to look up that place.
   */
  "placeId": S.optionalWith(S.String, { nullable: true }),
  /**
   * Sources that provide answers about the features of a given place in
   * Google Maps.
   */
  "placeAnswerSources": S.optionalWith(PlaceAnswerSources, { nullable: true })
}) {}

/**
 * Grounding chunk.
 */
export class GroundingChunk extends S.Class<GroundingChunk>("GroundingChunk")({
  /**
   * Grounding chunk from the web.
   */
  "web": S.optionalWith(Web, { nullable: true }),
  /**
   * Optional. Grounding chunk from context retrieved by the file search tool.
   */
  "retrievedContext": S.optionalWith(RetrievedContext, { nullable: true }),
  /**
   * Optional. Grounding chunk from Google Maps.
   */
  "maps": S.optionalWith(Maps, { nullable: true })
}) {}

/**
 * Segment of the content.
 */
export class GoogleAiGenerativelanguageV1BetaSegment
  extends S.Class<GoogleAiGenerativelanguageV1BetaSegment>("GoogleAiGenerativelanguageV1BetaSegment")({
    /**
     * The index of a Part object within its parent Content object.
     */
    "partIndex": S.optionalWith(S.Int, { nullable: true }),
    /**
     * Start index in the given Part, measured in bytes. Offset from the start of
     * the Part, inclusive, starting at zero.
     */
    "startIndex": S.optionalWith(S.Int, { nullable: true }),
    /**
     * End index in the given Part, measured in bytes. Offset from the start of
     * the Part, exclusive, starting at zero.
     */
    "endIndex": S.optionalWith(S.Int, { nullable: true }),
    /**
     * The text corresponding to the segment from the response.
     */
    "text": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * Grounding support.
 */
export class GoogleAiGenerativelanguageV1BetaGroundingSupport
  extends S.Class<GoogleAiGenerativelanguageV1BetaGroundingSupport>("GoogleAiGenerativelanguageV1BetaGroundingSupport")(
    {
      /**
       * Segment of the content this support belongs to.
       */
      "segment": S.optionalWith(GoogleAiGenerativelanguageV1BetaSegment, { nullable: true }),
      /**
       * Optional. A list of indices (into 'grounding_chunk') specifying the
       * citations associated with the claim. For instance [1,3,4] means
       * that grounding_chunk[1], grounding_chunk[3],
       * grounding_chunk[4] are the retrieved content attributed to the claim.
       */
      "groundingChunkIndices": S.optionalWith(S.Array(S.Int), { nullable: true }),
      /**
       * Optional. Confidence score of the support references. Ranges from 0 to 1. 1 is the
       * most confident. This list must have the same size as the
       * grounding_chunk_indices.
       */
      "confidenceScores": S.optionalWith(S.Array(S.Number), { nullable: true })
    }
  )
{}

/**
 * Metadata related to retrieval in the grounding flow.
 */
export class RetrievalMetadata extends S.Class<RetrievalMetadata>("RetrievalMetadata")({
  /**
   * Optional. Score indicating how likely information from google search could help
   * answer the prompt. The score is in the range [0, 1], where 0 is the least
   * likely and 1 is the most likely. This score is only populated when
   * google search grounding and dynamic retrieval is enabled. It will be
   * compared to the threshold to determine whether to trigger google search.
   */
  "googleSearchDynamicRetrievalScore": S.optionalWith(S.Number, { nullable: true })
}) {}

/**
 * Metadata returned to client when grounding is enabled.
 */
export class GroundingMetadata extends S.Class<GroundingMetadata>("GroundingMetadata")({
  /**
   * Optional. Google search entry for the following-up web searches.
   */
  "searchEntryPoint": S.optionalWith(SearchEntryPoint, { nullable: true }),
  /**
   * List of supporting references retrieved from specified grounding source.
   */
  "groundingChunks": S.optionalWith(S.Array(GroundingChunk), { nullable: true }),
  /**
   * List of grounding support.
   */
  "groundingSupports": S.optionalWith(S.Array(GoogleAiGenerativelanguageV1BetaGroundingSupport), { nullable: true }),
  /**
   * Metadata related to retrieval in the grounding flow.
   */
  "retrievalMetadata": S.optionalWith(RetrievalMetadata, { nullable: true }),
  /**
   * Web search queries for the following-up web search.
   */
  "webSearchQueries": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Optional. Resource name of the Google Maps widget context token that can be used
   * with the PlacesContextElement widget in order to render contextual data.
   * Only populated in the case that grounding with Google Maps is enabled.
   */
  "googleMapsWidgetContextToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Candidate for the logprobs token and score.
 */
export class LogprobsResultCandidate extends S.Class<LogprobsResultCandidate>("LogprobsResultCandidate")({
  /**
   * The candidate’s token string value.
   */
  "token": S.optionalWith(S.String, { nullable: true }),
  /**
   * The candidate’s token id value.
   */
  "tokenId": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The candidate's log probability.
   */
  "logProbability": S.optionalWith(S.Number, { nullable: true })
}) {}

/**
 * Candidates with top log probabilities at each decoding step.
 */
export class TopCandidates extends S.Class<TopCandidates>("TopCandidates")({
  /**
   * Sorted by log probability in descending order.
   */
  "candidates": S.optionalWith(S.Array(LogprobsResultCandidate), { nullable: true })
}) {}

/**
 * Logprobs Result
 */
export class LogprobsResult extends S.Class<LogprobsResult>("LogprobsResult")({
  /**
   * Sum of log probabilities for all tokens.
   */
  "logProbabilitySum": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Length = total number of decoding steps.
   */
  "topCandidates": S.optionalWith(S.Array(TopCandidates), { nullable: true }),
  /**
   * Length = total number of decoding steps.
   * The chosen candidates may or may not be in top_candidates.
   */
  "chosenCandidates": S.optionalWith(S.Array(LogprobsResultCandidate), { nullable: true })
}) {}

/**
 * Status of the url retrieval.
 */
export class UrlMetadataUrlRetrievalStatus extends S.Literal(
  "URL_RETRIEVAL_STATUS_UNSPECIFIED",
  "URL_RETRIEVAL_STATUS_SUCCESS",
  "URL_RETRIEVAL_STATUS_ERROR",
  "URL_RETRIEVAL_STATUS_PAYWALL",
  "URL_RETRIEVAL_STATUS_UNSAFE"
) {}

/**
 * Context of the a single url retrieval.
 */
export class UrlMetadata extends S.Class<UrlMetadata>("UrlMetadata")({
  /**
   * Retrieved url by the tool.
   */
  "retrievedUrl": S.optionalWith(S.String, { nullable: true }),
  /**
   * Status of the url retrieval.
   */
  "urlRetrievalStatus": S.optionalWith(UrlMetadataUrlRetrievalStatus, { nullable: true })
}) {}

/**
 * Metadata related to url context retrieval tool.
 */
export class UrlContextMetadata extends S.Class<UrlContextMetadata>("UrlContextMetadata")({
  /**
   * List of url context.
   */
  "urlMetadata": S.optionalWith(S.Array(UrlMetadata), { nullable: true })
}) {}

/**
 * A response candidate generated from the model.
 */
export class Candidate extends S.Class<Candidate>("Candidate")({
  /**
   * Output only. Index of the candidate in the list of response candidates.
   */
  "index": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Output only. Generated content returned from the model.
   */
  "content": S.optionalWith(Content, { nullable: true }),
  /**
   * Optional. Output only. The reason why the model stopped generating tokens.
   *
   * If empty, the model has not stopped generating tokens.
   */
  "finishReason": S.optionalWith(CandidateFinishReason, { nullable: true }),
  /**
   * Optional. Output only. Details the reason why the model stopped generating tokens.
   * This is populated only when `finish_reason` is set.
   */
  "finishMessage": S.optionalWith(S.String, { nullable: true }),
  /**
   * List of ratings for the safety of a response candidate.
   *
   * There is at most one rating per category.
   */
  "safetyRatings": S.optionalWith(S.Array(SafetyRating), { nullable: true }),
  /**
   * Output only. Citation information for model-generated candidate.
   *
   * This field may be populated with recitation information for any text
   * included in the `content`. These are passages that are "recited" from
   * copyrighted material in the foundational LLM's training data.
   */
  "citationMetadata": S.optionalWith(CitationMetadata, { nullable: true }),
  /**
   * Output only. Token count for this candidate.
   */
  "tokenCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Output only. Attribution information for sources that contributed to a grounded answer.
   *
   * This field is populated for `GenerateAnswer` calls.
   */
  "groundingAttributions": S.optionalWith(S.Array(GroundingAttribution), { nullable: true }),
  /**
   * Output only. Grounding metadata for the candidate.
   *
   * This field is populated for `GenerateContent` calls.
   */
  "groundingMetadata": S.optionalWith(GroundingMetadata, { nullable: true }),
  /**
   * Output only. Average log probability score of the candidate.
   */
  "avgLogprobs": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Output only. Log-likelihood scores for the response tokens and top tokens
   */
  "logprobsResult": S.optionalWith(LogprobsResult, { nullable: true }),
  /**
   * Output only. Metadata related to url context retrieval tool.
   */
  "urlContextMetadata": S.optionalWith(UrlContextMetadata, { nullable: true })
}) {}

/**
 * Optional. If set, the prompt was blocked and no candidates are returned.
 * Rephrase the prompt.
 */
export class PromptFeedbackBlockReason
  extends S.Literal("BLOCK_REASON_UNSPECIFIED", "SAFETY", "OTHER", "BLOCKLIST", "PROHIBITED_CONTENT", "IMAGE_SAFETY")
{}

/**
 * A set of the feedback metadata the prompt specified in
 * `GenerateContentRequest.content`.
 */
export class PromptFeedback extends S.Class<PromptFeedback>("PromptFeedback")({
  /**
   * Optional. If set, the prompt was blocked and no candidates are returned.
   * Rephrase the prompt.
   */
  "blockReason": S.optionalWith(PromptFeedbackBlockReason, { nullable: true }),
  /**
   * Ratings for safety of the prompt.
   * There is at most one rating per category.
   */
  "safetyRatings": S.optionalWith(S.Array(SafetyRating), { nullable: true })
}) {}

export class GenerativeLanguageModality
  extends S.Literal("MODALITY_UNSPECIFIED", "TEXT", "IMAGE", "VIDEO", "AUDIO", "DOCUMENT")
{}

/**
 * Represents token counting info for a single modality.
 */
export class ModalityTokenCount extends S.Class<ModalityTokenCount>("ModalityTokenCount")({
  /**
   * The modality associated with this token count.
   */
  "modality": S.optionalWith(GenerativeLanguageModality, { nullable: true }),
  /**
   * Number of tokens.
   */
  "tokenCount": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * Metadata on the generation request's token usage.
 */
export class UsageMetadata extends S.Class<UsageMetadata>("UsageMetadata")({
  /**
   * Number of tokens in the prompt. When `cached_content` is set, this is
   * still the total effective prompt size meaning this includes the number of
   * tokens in the cached content.
   */
  "promptTokenCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Number of tokens in the cached part of the prompt (the cached content)
   */
  "cachedContentTokenCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Total number of tokens across all the generated response candidates.
   */
  "candidatesTokenCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Output only. Number of tokens present in tool-use prompt(s).
   */
  "toolUsePromptTokenCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Output only. Number of tokens of thoughts for thinking models.
   */
  "thoughtsTokenCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Total token count for the generation request (prompt + response
   * candidates).
   */
  "totalTokenCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Output only. List of modalities that were processed in the request input.
   */
  "promptTokensDetails": S.optionalWith(S.Array(ModalityTokenCount), { nullable: true }),
  /**
   * Output only. List of modalities of the cached content in the request input.
   */
  "cacheTokensDetails": S.optionalWith(S.Array(ModalityTokenCount), { nullable: true }),
  /**
   * Output only. List of modalities that were returned in the response.
   */
  "candidatesTokensDetails": S.optionalWith(S.Array(ModalityTokenCount), { nullable: true }),
  /**
   * Output only. List of modalities that were processed for tool-use request inputs.
   */
  "toolUsePromptTokensDetails": S.optionalWith(S.Array(ModalityTokenCount), { nullable: true })
}) {}

/**
 * Response from the model supporting multiple candidate responses.
 *
 * Safety ratings and content filtering are reported for both
 * prompt in `GenerateContentResponse.prompt_feedback` and for each candidate
 * in `finish_reason` and in `safety_ratings`. The API:
 *  - Returns either all requested candidates or none of them
 *  - Returns no candidates at all only if there was something wrong with the
 *    prompt (check `prompt_feedback`)
 *  - Reports feedback on each candidate in `finish_reason` and
 *    `safety_ratings`.
 */
export class GenerateContentResponse extends S.Class<GenerateContentResponse>("GenerateContentResponse")({
  /**
   * Candidate responses from the model.
   */
  "candidates": S.optionalWith(S.Array(Candidate), { nullable: true }),
  /**
   * Returns the prompt's feedback related to the content filters.
   */
  "promptFeedback": S.optionalWith(PromptFeedback, { nullable: true }),
  /**
   * Output only. Metadata on the generation requests' token usage.
   */
  "usageMetadata": S.optionalWith(UsageMetadata, { nullable: true }),
  /**
   * Output only. The model version used to generate the response.
   */
  "modelVersion": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. response_id is used to identify each response.
   */
  "responseId": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Passage included inline with a grounding configuration.
 */
export class GroundingPassage extends S.Class<GroundingPassage>("GroundingPassage")({
  /**
   * Identifier for the passage for attributing this passage in grounded
   * answers.
   */
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Content of the passage.
   */
  "content": S.optionalWith(Content, { nullable: true })
}) {}

/**
 * A repeated list of passages.
 */
export class GroundingPassages extends S.Class<GroundingPassages>("GroundingPassages")({
  /**
   * List of passages.
   */
  "passages": S.optionalWith(S.Array(GroundingPassage), { nullable: true })
}) {}

/**
 * Required. Operator applied to the given key-value pair to trigger the condition.
 */
export class ConditionOperation extends S.Literal(
  "OPERATOR_UNSPECIFIED",
  "LESS",
  "LESS_EQUAL",
  "EQUAL",
  "GREATER_EQUAL",
  "GREATER",
  "NOT_EQUAL",
  "INCLUDES",
  "EXCLUDES"
) {}

/**
 * Filter condition applicable to a single key.
 */
export class Condition extends S.Class<Condition>("Condition")({
  /**
   * The string value to filter the metadata on.
   */
  "stringValue": S.optionalWith(S.String, { nullable: true }),
  /**
   * The numeric value to filter the metadata on.
   */
  "numericValue": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Required. Operator applied to the given key-value pair to trigger the condition.
   */
  "operation": ConditionOperation
}) {}

/**
 * User provided filter to limit retrieval based on `Chunk` or `Document` level
 * metadata values.
 * Example (genre = drama OR genre = action):
 *   key = "document.custom_metadata.genre"
 *   conditions = [{string_value = "drama", operation = EQUAL},
 *                 {string_value = "action", operation = EQUAL}]
 */
export class MetadataFilter extends S.Class<MetadataFilter>("MetadataFilter")({
  /**
   * Required. The key of the metadata to filter on.
   */
  "key": S.String,
  /**
   * Required. The `Condition`s for the given key that will trigger this filter. Multiple
   * `Condition`s are joined by logical ORs.
   */
  "conditions": S.Array(Condition)
}) {}

/**
 * Configuration for retrieving grounding content from a `Corpus` or
 * `Document` created using the Semantic Retriever API.
 */
export class SemanticRetrieverConfig extends S.Class<SemanticRetrieverConfig>("SemanticRetrieverConfig")({
  /**
   * Required. Name of the resource for retrieval. Example: `corpora/123` or
   * `corpora/123/documents/abc`.
   */
  "source": S.String,
  /**
   * Required. Query to use for matching `Chunk`s in the given resource by similarity.
   */
  "query": Content,
  /**
   * Optional. Filters for selecting `Document`s and/or `Chunk`s from the resource.
   */
  "metadataFilters": S.optionalWith(S.Array(MetadataFilter), { nullable: true }),
  /**
   * Optional. Maximum number of relevant `Chunk`s to retrieve.
   */
  "maxChunksCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. Minimum relevance score for retrieved relevant `Chunk`s.
   */
  "minimumRelevanceScore": S.optionalWith(S.Number, { nullable: true })
}) {}

/**
 * Required. Style in which answers should be returned.
 */
export class GenerateAnswerRequestAnswerStyle
  extends S.Literal("ANSWER_STYLE_UNSPECIFIED", "ABSTRACTIVE", "EXTRACTIVE", "VERBOSE")
{}

/**
 * Request to generate a grounded answer from the `Model`.
 */
export class GenerateAnswerRequest extends S.Class<GenerateAnswerRequest>("GenerateAnswerRequest")({
  /**
   * Passages provided inline with the request.
   */
  "inlinePassages": S.optionalWith(GroundingPassages, { nullable: true }),
  /**
   * Content retrieved from resources created via the Semantic Retriever
   * API.
   */
  "semanticRetriever": S.optionalWith(SemanticRetrieverConfig, { nullable: true }),
  /**
   * Required. The content of the current conversation with the `Model`. For single-turn
   * queries, this is a single question to answer. For multi-turn queries, this
   * is a repeated field that contains conversation history and the last
   * `Content` in the list containing the question.
   *
   * Note: `GenerateAnswer` only supports queries in English.
   */
  "contents": S.Array(Content),
  /**
   * Required. Style in which answers should be returned.
   */
  "answerStyle": GenerateAnswerRequestAnswerStyle,
  /**
   * Optional. A list of unique `SafetySetting` instances for blocking unsafe content.
   *
   * This will be enforced on the `GenerateAnswerRequest.contents` and
   * `GenerateAnswerResponse.candidate`. There should not be more than one
   * setting for each `SafetyCategory` type. The API will block any contents and
   * responses that fail to meet the thresholds set by these settings. This list
   * overrides the default settings for each `SafetyCategory` specified in the
   * safety_settings. If there is no `SafetySetting` for a given
   * `SafetyCategory` provided in the list, the API will use the default safety
   * setting for that category. Harm categories HARM_CATEGORY_HATE_SPEECH,
   * HARM_CATEGORY_SEXUALLY_EXPLICIT, HARM_CATEGORY_DANGEROUS_CONTENT,
   * HARM_CATEGORY_HARASSMENT are supported.
   * Refer to the
   * [guide](https://ai.google.dev/gemini-api/docs/safety-settings)
   * for detailed information on available safety settings. Also refer to the
   * [Safety guidance](https://ai.google.dev/gemini-api/docs/safety-guidance) to
   * learn how to incorporate safety considerations in your AI applications.
   */
  "safetySettings": S.optionalWith(S.Array(SafetySetting), { nullable: true }),
  /**
   * Optional. Controls the randomness of the output.
   *
   * Values can range from [0.0,1.0], inclusive. A value closer to 1.0 will
   * produce responses that are more varied and creative, while a value closer
   * to 0.0 will typically result in more straightforward responses from the
   * model. A low temperature (~0.2) is usually recommended for
   * Attributed-Question-Answering use cases.
   */
  "temperature": S.optionalWith(S.Number, { nullable: true })
}) {}

/**
 * Optional. If set, the input was blocked and no candidates are returned.
 * Rephrase the input.
 */
export class InputFeedbackBlockReason extends S.Literal("BLOCK_REASON_UNSPECIFIED", "SAFETY", "OTHER") {}

/**
 * Feedback related to the input data used to answer the question, as opposed
 * to the model-generated response to the question.
 */
export class InputFeedback extends S.Class<InputFeedback>("InputFeedback")({
  /**
   * Optional. If set, the input was blocked and no candidates are returned.
   * Rephrase the input.
   */
  "blockReason": S.optionalWith(InputFeedbackBlockReason, { nullable: true }),
  /**
   * Ratings for safety of the input.
   * There is at most one rating per category.
   */
  "safetyRatings": S.optionalWith(S.Array(SafetyRating), { nullable: true })
}) {}

/**
 * Response from the model for a grounded answer.
 */
export class GenerateAnswerResponse extends S.Class<GenerateAnswerResponse>("GenerateAnswerResponse")({
  /**
   * Candidate answer from the model.
   *
   * Note: The model *always* attempts to provide a grounded answer, even when
   * the answer is unlikely to be answerable from the given passages.
   * In that case, a low-quality or ungrounded answer may be provided, along
   * with a low `answerable_probability`.
   */
  "answer": S.optionalWith(Candidate, { nullable: true }),
  /**
   * Output only. The model's estimate of the probability that its answer is correct and
   * grounded in the input passages.
   *
   * A low `answerable_probability` indicates that the answer might not be
   * grounded in the sources.
   *
   * When `answerable_probability` is low, you may want to:
   *
   * * Display a message to the effect of "We couldn’t answer that question" to
   * the user.
   * * Fall back to a general-purpose LLM that answers the question from world
   * knowledge. The threshold and nature of such fallbacks will depend on
   * individual use cases. `0.5` is a good starting threshold.
   */
  "answerableProbability": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Output only. Feedback related to the input data used to answer the question, as opposed
   * to the model-generated response to the question.
   *
   * The input data can be one or more of the following:
   *
   * - Question specified by the last entry in `GenerateAnswerRequest.content`
   * - Conversation history specified by the other entries in
   * `GenerateAnswerRequest.content`
   * - Grounding sources (`GenerateAnswerRequest.semantic_retriever` or
   * `GenerateAnswerRequest.inline_passages`)
   */
  "inputFeedback": S.optionalWith(InputFeedback, { nullable: true })
}) {}

export class TaskType extends S.Literal(
  "TASK_TYPE_UNSPECIFIED",
  "RETRIEVAL_QUERY",
  "RETRIEVAL_DOCUMENT",
  "SEMANTIC_SIMILARITY",
  "CLASSIFICATION",
  "CLUSTERING",
  "QUESTION_ANSWERING",
  "FACT_VERIFICATION",
  "CODE_RETRIEVAL_QUERY"
) {}

/**
 * Request containing the `Content` for the model to embed.
 */
export class EmbedContentRequest extends S.Class<EmbedContentRequest>("EmbedContentRequest")({
  /**
   * Required. The model's resource name. This serves as an ID for the Model to use.
   *
   * This name should match a model name returned by the `ListModels` method.
   *
   * Format: `models/{model}`
   */
  "model": S.String,
  /**
   * Required. The content to embed. Only the `parts.text` fields will be counted.
   */
  "content": Content,
  /**
   * Optional. Optional task type for which the embeddings will be used. Not supported on
   * earlier models (`models/embedding-001`).
   */
  "taskType": S.optionalWith(TaskType, { nullable: true }),
  /**
   * Optional. An optional title for the text. Only applicable when TaskType is
   * `RETRIEVAL_DOCUMENT`.
   *
   * Note: Specifying a `title` for `RETRIEVAL_DOCUMENT` provides better quality
   * embeddings for retrieval.
   */
  "title": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Optional reduced dimension for the output embedding. If set, excessive
   * values in the output embedding are truncated from the end. Supported by
   * newer models since 2024 only. You cannot set this value if using the
   * earlier model (`models/embedding-001`).
   */
  "outputDimensionality": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * A list of floats representing an embedding.
 */
export class ContentEmbedding extends S.Class<ContentEmbedding>("ContentEmbedding")({
  /**
   * The embedding values. This is for 3P users only and will not be populated
   * for 1P calls.
   */
  "values": S.optionalWith(S.Array(S.Number), { nullable: true }),
  /**
   * This field stores the soft tokens tensor frame shape
   * (e.g. [1, 1, 256, 2048]).
   */
  "shape": S.optionalWith(S.Array(S.Int), { nullable: true })
}) {}

/**
 * The response to an `EmbedContentRequest`.
 */
export class EmbedContentResponse extends S.Class<EmbedContentResponse>("EmbedContentResponse")({
  /**
   * Output only. The embedding generated from the input content.
   */
  "embedding": S.optionalWith(ContentEmbedding, { nullable: true })
}) {}

/**
 * Batch request to get embeddings from the model for a list of prompts.
 */
export class BatchEmbedContentsRequest extends S.Class<BatchEmbedContentsRequest>("BatchEmbedContentsRequest")({
  /**
   * Required. Embed requests for the batch. The model in each of these requests must
   * match the model specified `BatchEmbedContentsRequest.model`.
   */
  "requests": S.Array(EmbedContentRequest)
}) {}

/**
 * The response to a `BatchEmbedContentsRequest`.
 */
export class BatchEmbedContentsResponse extends S.Class<BatchEmbedContentsResponse>("BatchEmbedContentsResponse")({
  /**
   * Output only. The embeddings for each request, in the same order as provided in the batch
   * request.
   */
  "embeddings": S.optionalWith(S.Array(ContentEmbedding), { nullable: true })
}) {}

/**
 * Counts the number of tokens in the `prompt` sent to a model.
 *
 * Models may tokenize text differently, so each model may return a different
 * `token_count`.
 */
export class CountTokensRequest extends S.Class<CountTokensRequest>("CountTokensRequest")({
  /**
   * Optional. The input given to the model as a prompt. This field is ignored when
   * `generate_content_request` is set.
   */
  "contents": S.optionalWith(S.Array(Content), { nullable: true }),
  /**
   * Optional. The overall input given to the `Model`. This includes the prompt as well as
   * other model steering information like [system
   * instructions](https://ai.google.dev/gemini-api/docs/system-instructions),
   * and/or function declarations for [function
   * calling](https://ai.google.dev/gemini-api/docs/function-calling).
   * `Model`s/`Content`s and `generate_content_request`s are mutually
   * exclusive. You can either send `Model` + `Content`s or a
   * `generate_content_request`, but never both.
   */
  "generateContentRequest": S.optionalWith(GenerateContentRequest, { nullable: true })
}) {}

/**
 * A response from `CountTokens`.
 *
 * It returns the model's `token_count` for the `prompt`.
 */
export class CountTokensResponse extends S.Class<CountTokensResponse>("CountTokensResponse")({
  /**
   * The number of tokens that the `Model` tokenizes the `prompt` into. Always
   * non-negative.
   */
  "totalTokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Number of tokens in the cached part of the prompt (the cached content).
   */
  "cachedContentTokenCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Output only. List of modalities that were processed in the request input.
   */
  "promptTokensDetails": S.optionalWith(S.Array(ModalityTokenCount), { nullable: true }),
  /**
   * Output only. List of modalities that were processed in the cached content.
   */
  "cacheTokensDetails": S.optionalWith(S.Array(ModalityTokenCount), { nullable: true })
}) {}

/**
 * The request to be processed in the batch.
 */
export class InlinedRequest extends S.Class<InlinedRequest>("InlinedRequest")({
  /**
   * Required. The request to be processed in the batch.
   */
  "request": GenerateContentRequest,
  /**
   * Optional. The metadata to be associated with the request.
   */
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * The requests to be processed in the batch if provided as part of the
 * batch creation request.
 */
export class InlinedRequests extends S.Class<InlinedRequests>("InlinedRequests")({
  /**
   * Required. The requests to be processed in the batch.
   */
  "requests": S.Array(InlinedRequest)
}) {}

/**
 * Configures the input to the batch request.
 */
export class InputConfig extends S.Class<InputConfig>("InputConfig")({
  /**
   * The name of the `File` containing the input requests.
   */
  "fileName": S.optionalWith(S.String, { nullable: true }),
  /**
   * The requests to be processed in the batch.
   */
  "requests": S.optionalWith(InlinedRequests, { nullable: true })
}) {}

/**
 * The response to a single request in the batch.
 */
export class InlinedResponse extends S.Class<InlinedResponse>("InlinedResponse")({
  /**
   * Output only. The error encountered while processing the request.
   */
  "error": S.optionalWith(Status, { nullable: true }),
  /**
   * Output only. The response to the request.
   */
  "response": S.optionalWith(GenerateContentResponse, { nullable: true }),
  /**
   * Output only. The metadata associated with the request.
   */
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * The responses to the requests in the batch.
 */
export class InlinedResponses extends S.Class<InlinedResponses>("InlinedResponses")({
  /**
   * Output only. The responses to the requests in the batch.
   */
  "inlinedResponses": S.optionalWith(S.Array(InlinedResponse), { nullable: true })
}) {}

/**
 * The output of a batch request. This is returned in the
 * `BatchGenerateContentResponse` or the `GenerateContentBatch.output` field.
 */
export class GenerateContentBatchOutput extends S.Class<GenerateContentBatchOutput>("GenerateContentBatchOutput")({
  /**
   * Output only. The file ID of the file containing the responses.
   * The file will be a JSONL file with a single response per line.
   * The responses will be `GenerateContentResponse` messages formatted as
   * JSON.
   * The responses will be written in the same order as the input requests.
   */
  "responsesFile": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The responses to the requests in the batch. Returned when the batch was
   * built using inlined requests. The responses will be in the same order as
   * the input requests.
   */
  "inlinedResponses": S.optionalWith(InlinedResponses, { nullable: true })
}) {}

/**
 * Stats about the batch.
 */
export class BatchStats extends S.Class<BatchStats>("BatchStats")({
  /**
   * Output only. The number of requests in the batch.
   */
  "requestCount": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The number of requests that were successfully processed.
   */
  "successfulRequestCount": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The number of requests that failed to be processed.
   */
  "failedRequestCount": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The number of requests that are still pending processing.
   */
  "pendingRequestCount": S.optionalWith(S.String, { nullable: true })
}) {}

export class BatchState extends S.Literal(
  "BATCH_STATE_UNSPECIFIED",
  "BATCH_STATE_PENDING",
  "BATCH_STATE_RUNNING",
  "BATCH_STATE_SUCCEEDED",
  "BATCH_STATE_FAILED",
  "BATCH_STATE_CANCELLED",
  "BATCH_STATE_EXPIRED"
) {}

/**
 * A resource representing a batch of `GenerateContent` requests.
 */
export class GenerateContentBatch extends S.Class<GenerateContentBatch>("GenerateContentBatch")({
  /**
   * Required. The name of the `Model` to use for generating the completion.
   *
   * Format: `models/{model}`.
   */
  "model": S.String,
  /**
   * Output only. Identifier. Resource name of the batch.
   *
   * Format: `batches/{batch_id}`.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. The user-defined name of this batch.
   */
  "displayName": S.String,
  /**
   * Required. Input configuration of the instances on which batch processing
   * are performed.
   */
  "inputConfig": InputConfig,
  /**
   * Output only. The output of the batch request.
   */
  "output": S.optionalWith(GenerateContentBatchOutput, { nullable: true }),
  /**
   * Output only. The time at which the batch was created.
   */
  "createTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The time at which the batch processing completed.
   */
  "endTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The time at which the batch was last updated.
   */
  "updateTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Stats about the batch.
   */
  "batchStats": S.optionalWith(BatchStats, { nullable: true }),
  /**
   * Output only. The state of the batch.
   */
  "state": S.optionalWith(BatchState, { nullable: true }),
  /**
   * Optional. The priority of the batch. Batches with a higher priority value will be
   * processed before batches with a lower priority value. Negative values are
   * allowed. Default is 0.
   */
  "priority": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Request for a `BatchGenerateContent` operation.
 */
export class BatchGenerateContentRequest extends S.Class<BatchGenerateContentRequest>("BatchGenerateContentRequest")({
  /**
   * Required. The batch to create.
   */
  "batch": GenerateContentBatch
}) {}

/**
 * Response for a `BatchGenerateContent` operation.
 */
export class BatchGenerateContentResponse
  extends S.Class<BatchGenerateContentResponse>("BatchGenerateContentResponse")({
    /**
     * Output only. The output of the batch request.
     */
    "output": S.optionalWith(GenerateContentBatchOutput, { nullable: true })
  })
{}

/**
 * This resource represents a long-running operation that is the result of a
 * network API call.
 */
export class BatchGenerateContentOperation
  extends S.Class<BatchGenerateContentOperation>("BatchGenerateContentOperation")({
    "metadata": S.optionalWith(GenerateContentBatch, { nullable: true }),
    "response": S.optionalWith(BatchGenerateContentResponse, { nullable: true }),
    /**
     * The server-assigned name, which is only unique within the same service that
     * originally returns it. If you use the default HTTP mapping, the
     * `name` should be a resource name ending with `operations/{unique_id}`.
     */
    "name": S.optionalWith(S.String, { nullable: true }),
    /**
     * If the value is `false`, it means the operation is still in progress.
     * If `true`, the operation is completed, and either `error` or `response` is
     * available.
     */
    "done": S.optionalWith(S.Boolean, { nullable: true }),
    /**
     * The error result of the operation in case of failure or cancellation.
     */
    "error": S.optionalWith(Status, { nullable: true })
  })
{}

/**
 * The request to be processed in the batch.
 */
export class InlinedEmbedContentRequest extends S.Class<InlinedEmbedContentRequest>("InlinedEmbedContentRequest")({
  /**
   * Required. The request to be processed in the batch.
   */
  "request": EmbedContentRequest,
  /**
   * Optional. The metadata to be associated with the request.
   */
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * The requests to be processed in the batch if provided as part of the
 * batch creation request.
 */
export class InlinedEmbedContentRequests extends S.Class<InlinedEmbedContentRequests>("InlinedEmbedContentRequests")({
  /**
   * Required. The requests to be processed in the batch.
   */
  "requests": S.Array(InlinedEmbedContentRequest)
}) {}

/**
 * Configures the input to the batch request.
 */
export class InputEmbedContentConfig extends S.Class<InputEmbedContentConfig>("InputEmbedContentConfig")({
  /**
   * The name of the `File` containing the input requests.
   */
  "fileName": S.optionalWith(S.String, { nullable: true }),
  /**
   * The requests to be processed in the batch.
   */
  "requests": S.optionalWith(InlinedEmbedContentRequests, { nullable: true })
}) {}

/**
 * The response to a single request in the batch.
 */
export class InlinedEmbedContentResponse extends S.Class<InlinedEmbedContentResponse>("InlinedEmbedContentResponse")({
  /**
   * Output only. The error encountered while processing the request.
   */
  "error": S.optionalWith(Status, { nullable: true }),
  /**
   * Output only. The response to the request.
   */
  "response": S.optionalWith(EmbedContentResponse, { nullable: true }),
  /**
   * Output only. The metadata associated with the request.
   */
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

/**
 * The responses to the requests in the batch.
 */
export class InlinedEmbedContentResponses
  extends S.Class<InlinedEmbedContentResponses>("InlinedEmbedContentResponses")({
    /**
     * Output only. The responses to the requests in the batch.
     */
    "inlinedResponses": S.optionalWith(S.Array(InlinedEmbedContentResponse), { nullable: true })
  })
{}

/**
 * The output of a batch request. This is returned in the
 * `AsyncBatchEmbedContentResponse` or the `EmbedContentBatch.output` field.
 */
export class EmbedContentBatchOutput extends S.Class<EmbedContentBatchOutput>("EmbedContentBatchOutput")({
  /**
   * Output only. The file ID of the file containing the responses.
   * The file will be a JSONL file with a single response per line.
   * The responses will be `EmbedContentResponse` messages formatted as JSON.
   * The responses will be written in the same order as the input requests.
   */
  "responsesFile": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The responses to the requests in the batch. Returned when the batch was
   * built using inlined requests. The responses will be in the same order as
   * the input requests.
   */
  "inlinedResponses": S.optionalWith(InlinedEmbedContentResponses, { nullable: true })
}) {}

/**
 * Stats about the batch.
 */
export class EmbedContentBatchStats extends S.Class<EmbedContentBatchStats>("EmbedContentBatchStats")({
  /**
   * Output only. The number of requests in the batch.
   */
  "requestCount": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The number of requests that were successfully processed.
   */
  "successfulRequestCount": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The number of requests that failed to be processed.
   */
  "failedRequestCount": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The number of requests that are still pending processing.
   */
  "pendingRequestCount": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A resource representing a batch of `EmbedContent` requests.
 */
export class EmbedContentBatch extends S.Class<EmbedContentBatch>("EmbedContentBatch")({
  /**
   * Required. The name of the `Model` to use for generating the completion.
   *
   * Format: `models/{model}`.
   */
  "model": S.String,
  /**
   * Output only. Identifier. Resource name of the batch.
   *
   * Format: `batches/{batch_id}`.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. The user-defined name of this batch.
   */
  "displayName": S.String,
  /**
   * Required. Input configuration of the instances on which batch processing
   * are performed.
   */
  "inputConfig": InputEmbedContentConfig,
  /**
   * Output only. The output of the batch request.
   */
  "output": S.optionalWith(EmbedContentBatchOutput, { nullable: true }),
  /**
   * Output only. The time at which the batch was created.
   */
  "createTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The time at which the batch processing completed.
   */
  "endTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The time at which the batch was last updated.
   */
  "updateTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Stats about the batch.
   */
  "batchStats": S.optionalWith(EmbedContentBatchStats, { nullable: true }),
  /**
   * Output only. The state of the batch.
   */
  "state": S.optionalWith(BatchState, { nullable: true }),
  /**
   * Optional. The priority of the batch. Batches with a higher priority value will be
   * processed before batches with a lower priority value. Negative values are
   * allowed. Default is 0.
   */
  "priority": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Request for an `AsyncBatchEmbedContent` operation.
 */
export class AsyncBatchEmbedContentRequest
  extends S.Class<AsyncBatchEmbedContentRequest>("AsyncBatchEmbedContentRequest")({
    /**
     * Required. The batch to create.
     */
    "batch": EmbedContentBatch
  })
{}

/**
 * Response for a `BatchGenerateContent` operation.
 */
export class AsyncBatchEmbedContentResponse
  extends S.Class<AsyncBatchEmbedContentResponse>("AsyncBatchEmbedContentResponse")({
    /**
     * Output only. The output of the batch request.
     */
    "output": S.optionalWith(EmbedContentBatchOutput, { nullable: true })
  })
{}

/**
 * This resource represents a long-running operation that is the result of a
 * network API call.
 */
export class AsyncBatchEmbedContentOperation
  extends S.Class<AsyncBatchEmbedContentOperation>("AsyncBatchEmbedContentOperation")({
    "metadata": S.optionalWith(EmbedContentBatch, { nullable: true }),
    "response": S.optionalWith(AsyncBatchEmbedContentResponse, { nullable: true }),
    /**
     * The server-assigned name, which is only unique within the same service that
     * originally returns it. If you use the default HTTP mapping, the
     * `name` should be a resource name ending with `operations/{unique_id}`.
     */
    "name": S.optionalWith(S.String, { nullable: true }),
    /**
     * If the value is `false`, it means the operation is still in progress.
     * If `true`, the operation is completed, and either `error` or `response` is
     * available.
     */
    "done": S.optionalWith(S.Boolean, { nullable: true }),
    /**
     * The error result of the operation in case of failure or cancellation.
     */
    "error": S.optionalWith(Status, { nullable: true })
  })
{}

export class UpdateGenerateContentBatchParams extends S.Struct({
  "updateMask": S.optionalWith(S.String.pipe(S.pattern(new RegExp("^(\\s*[^,\\s.]+(\\s*[,.]\\s*[^,\\s.]+)*)?$"))), {
    nullable: true
  })
}) {}

export class UpdateEmbedContentBatchParams extends S.Struct({
  "updateMask": S.optionalWith(S.String.pipe(S.pattern(new RegExp("^(\\s*[^,\\s.]+(\\s*[,.]\\s*[^,\\s.]+)*)?$"))), {
    nullable: true
  })
}) {}

export class ListCachedContentsParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Metadata on the usage of the cached content.
 */
export class CachedContentUsageMetadata extends S.Class<CachedContentUsageMetadata>("CachedContentUsageMetadata")({
  /**
   * Total number of tokens that the cached content consumes.
   */
  "totalTokenCount": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * Content that has been preprocessed and can be used in subsequent request
 * to GenerativeService.
 *
 * Cached content can be only used with model it was created for.
 */
export class CachedContent extends S.Class<CachedContent>("CachedContent")({
  /**
   * Timestamp in UTC of when this resource is considered expired.
   * This is *always* provided on output, regardless of what was sent
   * on input.
   */
  "expireTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Input only. New TTL for this resource, input only.
   */
  "ttl": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Identifier. The resource name referring to the cached content.
   * Format: `cachedContents/{id}`
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Immutable. The user-generated meaningful display name of the cached content. Maximum
   * 128 Unicode characters.
   */
  "displayName": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. Immutable. The name of the `Model` to use for cached content
   * Format: `models/{model}`
   */
  "model": S.String,
  /**
   * Optional. Input only. Immutable. Developer set system instruction. Currently text only.
   */
  "systemInstruction": S.optionalWith(Content, { nullable: true }),
  /**
   * Optional. Input only. Immutable. The content to cache.
   */
  "contents": S.optionalWith(S.Array(Content), { nullable: true }),
  /**
   * Optional. Input only. Immutable. A list of `Tools` the model may use to generate the next response
   */
  "tools": S.optionalWith(S.Array(Tool), { nullable: true }),
  /**
   * Optional. Input only. Immutable. Tool config. This config is shared for all tools.
   */
  "toolConfig": S.optionalWith(ToolConfig, { nullable: true }),
  /**
   * Output only. Creation time of the cache entry.
   */
  "createTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. When the cache entry was last updated in UTC time.
   */
  "updateTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Metadata on the usage of the cached content.
   */
  "usageMetadata": S.optionalWith(CachedContentUsageMetadata, { nullable: true })
}) {}

/**
 * Response with CachedContents list.
 */
export class ListCachedContentsResponse extends S.Class<ListCachedContentsResponse>("ListCachedContentsResponse")({
  /**
   * List of cached contents.
   */
  "cachedContents": S.optionalWith(S.Array(CachedContent), { nullable: true }),
  /**
   * A token, which can be sent as `page_token` to retrieve the next page.
   * If this field is omitted, there are no subsequent pages.
   */
  "nextPageToken": S.optionalWith(S.String, { nullable: true })
}) {}

export class UpdateCachedContentParams extends S.Struct({
  "updateMask": S.optionalWith(S.String.pipe(S.pattern(new RegExp("^(\\s*[^,\\s.]+(\\s*[,.]\\s*[^,\\s.]+)*)?$"))), {
    nullable: true
  })
}) {}

/**
 * The base unit of structured text.
 *
 * A `Message` includes an `author` and the `content` of
 * the `Message`.
 *
 * The `author` is used to tag messages when they are fed to the
 * model as text.
 */
export class Message extends S.Class<Message>("Message")({
  /**
   * Optional. The author of this Message.
   *
   * This serves as a key for tagging
   * the content of this Message when it is fed to the model as text.
   *
   * The author can be any alphanumeric string.
   */
  "author": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. The text content of the structured `Message`.
   */
  "content": S.String,
  /**
   * Output only. Citation information for model-generated `content` in this `Message`.
   *
   * If this `Message` was generated as output from the model, this field may be
   * populated with attribution information for any text included in the
   * `content`. This field is used only on output.
   */
  "citationMetadata": S.optionalWith(CitationMetadata, { nullable: true })
}) {}

/**
 * An input/output example used to instruct the Model.
 *
 * It demonstrates how the model should respond or format its response.
 */
export class Example extends S.Class<Example>("Example")({
  /**
   * Required. An example of an input `Message` from the user.
   */
  "input": Message,
  /**
   * Required. An example of what the model should output given the input.
   */
  "output": Message
}) {}

/**
 * All of the structured input text passed to the model as a prompt.
 *
 * A `MessagePrompt` contains a structured set of fields that provide context
 * for the conversation, examples of user input/model output message pairs that
 * prime the model to respond in different ways, and the conversation history
 * or list of messages representing the alternating turns of the conversation
 * between the user and the model.
 */
export class MessagePrompt extends S.Class<MessagePrompt>("MessagePrompt")({
  /**
   * Optional. Text that should be provided to the model first to ground the response.
   *
   * If not empty, this `context` will be given to the model first before the
   * `examples` and `messages`. When using a `context` be sure to provide it
   * with every request to maintain continuity.
   *
   * This field can be a description of your prompt to the model to help provide
   * context and guide the responses. Examples: "Translate the phrase from
   * English to French." or "Given a statement, classify the sentiment as happy,
   * sad or neutral."
   *
   * Anything included in this field will take precedence over message history
   * if the total input size exceeds the model's `input_token_limit` and the
   * input request is truncated.
   */
  "context": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Examples of what the model should generate.
   *
   * This includes both user input and the response that the model should
   * emulate.
   *
   * These `examples` are treated identically to conversation messages except
   * that they take precedence over the history in `messages`:
   * If the total input size exceeds the model's `input_token_limit` the input
   * will be truncated. Items will be dropped from `messages` before `examples`.
   */
  "examples": S.optionalWith(S.Array(Example), { nullable: true }),
  /**
   * Required. A snapshot of the recent conversation history sorted chronologically.
   *
   * Turns alternate between two authors.
   *
   * If the total input size exceeds the model's `input_token_limit` the input
   * will be truncated: The oldest items will be dropped from `messages`.
   */
  "messages": S.Array(Message)
}) {}

/**
 * Request to generate a message response from the model.
 */
export class GenerateMessageRequest extends S.Class<GenerateMessageRequest>("GenerateMessageRequest")({
  /**
   * Required. The structured textual input given to the model as a prompt.
   *
   * Given a
   * prompt, the model will return what it predicts is the next message in the
   * discussion.
   */
  "prompt": MessagePrompt,
  /**
   * Optional. Controls the randomness of the output.
   *
   * Values can range over `[0.0,1.0]`,
   * inclusive. A value closer to `1.0` will produce responses that are more
   * varied, while a value closer to `0.0` will typically result in
   * less surprising responses from the model.
   */
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. The number of generated response messages to return.
   *
   * This value must be between
   * `[1, 8]`, inclusive. If unset, this will default to `1`.
   */
  "candidateCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. The maximum cumulative probability of tokens to consider when sampling.
   *
   * The model uses combined Top-k and nucleus sampling.
   *
   * Nucleus sampling considers the smallest set of tokens whose probability
   * sum is at least `top_p`.
   */
  "topP": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. The maximum number of tokens to consider when sampling.
   *
   * The model uses combined Top-k and nucleus sampling.
   *
   * Top-k sampling considers the set of `top_k` most probable tokens.
   */
  "topK": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * The reason content was blocked during request processing.
 */
export class ContentFilterReason extends S.Literal("BLOCKED_REASON_UNSPECIFIED", "SAFETY", "OTHER") {}

/**
 * Content filtering metadata associated with processing a single request.
 *
 * ContentFilter contains a reason and an optional supporting string. The reason
 * may be unspecified.
 */
export class ContentFilter extends S.Class<ContentFilter>("ContentFilter")({
  /**
   * The reason content was blocked during request processing.
   */
  "reason": S.optionalWith(ContentFilterReason, { nullable: true }),
  /**
   * A string that describes the filtering behavior in more detail.
   */
  "message": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The response from the model.
 *
 * This includes candidate messages and
 * conversation history in the form of chronologically-ordered messages.
 */
export class GenerateMessageResponse extends S.Class<GenerateMessageResponse>("GenerateMessageResponse")({
  /**
   * Candidate response messages from the model.
   */
  "candidates": S.optionalWith(S.Array(Message), { nullable: true }),
  /**
   * The conversation history used by the model.
   */
  "messages": S.optionalWith(S.Array(Message), { nullable: true }),
  /**
   * A set of content filtering metadata for the prompt and response
   * text.
   *
   * This indicates which `SafetyCategory`(s) blocked a
   * candidate from this response, the lowest `HarmProbability`
   * that triggered a block, and the HarmThreshold setting for that category.
   */
  "filters": S.optionalWith(S.Array(ContentFilter), { nullable: true })
}) {}

/**
 * Counts the number of tokens in the `prompt` sent to a model.
 *
 * Models may tokenize text differently, so each model may return a different
 * `token_count`.
 */
export class CountMessageTokensRequest extends S.Class<CountMessageTokensRequest>("CountMessageTokensRequest")({
  /**
   * Required. The prompt, whose token count is to be returned.
   */
  "prompt": MessagePrompt
}) {}

/**
 * A response from `CountMessageTokens`.
 *
 * It returns the model's `token_count` for the `prompt`.
 */
export class CountMessageTokensResponse extends S.Class<CountMessageTokensResponse>("CountMessageTokensResponse")({
  /**
   * The number of tokens that the `model` tokenizes the `prompt` into.
   *
   * Always non-negative.
   */
  "tokenCount": S.optionalWith(S.Int, { nullable: true })
}) {}

export class ListFilesParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Metadata for a video `File`.
 */
export class VideoFileMetadata extends S.Class<VideoFileMetadata>("VideoFileMetadata")({
  /**
   * Duration of the video.
   */
  "videoDuration": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Output only. Processing state of the File.
 */
export class FileState extends S.Literal("STATE_UNSPECIFIED", "PROCESSING", "ACTIVE", "FAILED") {}

/**
 * Source of the File.
 */
export class FileSource extends S.Literal("SOURCE_UNSPECIFIED", "UPLOADED", "GENERATED", "REGISTERED") {}

/**
 * A file uploaded to the API.
 * Next ID: 15
 */
export class File extends S.Class<File>("File")({
  /**
   * Output only. Metadata for a video.
   */
  "videoMetadata": S.optionalWith(VideoFileMetadata, { nullable: true }),
  /**
   * Immutable. Identifier. The `File` resource name. The ID (name excluding the "files/" prefix) can
   * contain up to 40 characters that are lowercase alphanumeric or dashes (-).
   * The ID cannot start or end with a dash. If the name is empty on create, a
   * unique name will be generated.
   * Example: `files/123-456`
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. The human-readable display name for the `File`. The display name must be
   * no more than 512 characters in length, including spaces.
   * Example: "Welcome Image"
   */
  "displayName": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. MIME type of the file.
   */
  "mimeType": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Size of the file in bytes.
   */
  "sizeBytes": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The timestamp of when the `File` was created.
   */
  "createTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The timestamp of when the `File` was last updated.
   */
  "updateTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The timestamp of when the `File` will be deleted. Only set if the `File` is
   * scheduled to expire.
   */
  "expirationTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. SHA-256 hash of the uploaded bytes.
   */
  "sha256Hash": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The uri of the `File`.
   */
  "uri": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The download uri of the `File`.
   */
  "downloadUri": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Processing state of the File.
   */
  "state": S.optionalWith(FileState, { nullable: true }),
  /**
   * Source of the File.
   */
  "source": S.optionalWith(FileSource, { nullable: true }),
  /**
   * Output only. Error status if File processing failed.
   */
  "error": S.optionalWith(Status, { nullable: true })
}) {}

/**
 * Response for `ListFiles`.
 */
export class ListFilesResponse extends S.Class<ListFilesResponse>("ListFilesResponse")({
  /**
   * The list of `File`s.
   */
  "files": S.optionalWith(S.Array(File), { nullable: true }),
  /**
   * A token that can be sent as a `page_token` into a subsequent `ListFiles`
   * call.
   */
  "nextPageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Request for `CreateFile`.
 */
export class CreateFileRequest extends S.Class<CreateFileRequest>("CreateFileRequest")({
  /**
   * Optional. Metadata for the file to create.
   */
  "file": S.optionalWith(File, { nullable: true })
}) {}

/**
 * Response for `CreateFile`.
 */
export class CreateFileResponse extends S.Class<CreateFileResponse>("CreateFileResponse")({
  /**
   * Metadata for the created file.
   */
  "file": S.optionalWith(File, { nullable: true })
}) {}

/**
 * Response for `DownloadFile`.
 */
export class DownloadFileResponse extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * Output only. The state of the GeneratedFile.
 */
export class GeneratedFileState extends S.Literal("STATE_UNSPECIFIED", "GENERATING", "GENERATED", "FAILED") {}

/**
 * A file generated on behalf of a user.
 */
export class GeneratedFile extends S.Class<GeneratedFile>("GeneratedFile")({
  /**
   * Identifier. The name of the generated file.
   * Example: `generatedFiles/abc-123`
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * MIME type of the generatedFile.
   */
  "mimeType": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The state of the GeneratedFile.
   */
  "state": S.optionalWith(GeneratedFileState, { nullable: true }),
  /**
   * Error details if the GeneratedFile ends up in the STATE_FAILED state.
   */
  "error": S.optionalWith(Status, { nullable: true })
}) {}

export class ListGeneratedFilesParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Response for `ListGeneratedFiles`.
 */
export class ListGeneratedFilesResponse extends S.Class<ListGeneratedFilesResponse>("ListGeneratedFilesResponse")({
  /**
   * The list of `GeneratedFile`s.
   */
  "generatedFiles": S.optionalWith(S.Array(GeneratedFile), { nullable: true }),
  /**
   * A token that can be sent as a `page_token` into a subsequent
   * `ListGeneratedFiles` call.
   */
  "nextPageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Information about a Generative Language Model.
 */
export class Model extends S.Class<Model>("Model")({
  /**
   * Required. The resource name of the `Model`. Refer to [Model
   * variants](https://ai.google.dev/gemini-api/docs/models/gemini#model-variations)
   * for all allowed values.
   *
   * Format: `models/{model}` with a `{model}` naming convention of:
   *
   * * "{base_model_id}-{version}"
   *
   * Examples:
   *
   * * `models/gemini-1.5-flash-001`
   */
  "name": S.String,
  /**
   * Required. The name of the base model, pass this to the generation request.
   *
   * Examples:
   *
   * * `gemini-1.5-flash`
   */
  "baseModelId": S.String,
  /**
   * Required. The version number of the model.
   *
   * This represents the major version (`1.0` or `1.5`)
   */
  "version": S.String,
  /**
   * The human-readable name of the model. E.g. "Gemini 1.5 Flash".
   *
   * The name can be up to 128 characters long and can consist of any UTF-8
   * characters.
   */
  "displayName": S.optionalWith(S.String, { nullable: true }),
  /**
   * A short description of the model.
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * Maximum number of input tokens allowed for this model.
   */
  "inputTokenLimit": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Maximum number of output tokens available for this model.
   */
  "outputTokenLimit": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The model's supported generation methods.
   *
   * The corresponding API method names are defined as Pascal case
   * strings, such as `generateMessage` and `generateContent`.
   */
  "supportedGenerationMethods": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Controls the randomness of the output.
   *
   * Values can range over `[0.0,max_temperature]`, inclusive. A higher value
   * will produce responses that are more varied, while a value closer to `0.0`
   * will typically result in less surprising responses from the model.
   * This value specifies default to be used by the backend while making the
   * call to the model.
   */
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  /**
   * The maximum temperature this model can use.
   */
  "maxTemperature": S.optionalWith(S.Number, { nullable: true }),
  /**
   * For [Nucleus
   * sampling](https://ai.google.dev/gemini-api/docs/prompting-strategies#top-p).
   *
   * Nucleus sampling considers the smallest set of tokens whose probability
   * sum is at least `top_p`.
   * This value specifies default to be used by the backend while making the
   * call to the model.
   */
  "topP": S.optionalWith(S.Number, { nullable: true }),
  /**
   * For Top-k sampling.
   *
   * Top-k sampling considers the set of `top_k` most probable tokens.
   * This value specifies default to be used by the backend while making the
   * call to the model.
   * If empty, indicates the model doesn't use top-k sampling, and `top_k` isn't
   * allowed as a generation parameter.
   */
  "topK": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Whether the model supports thinking.
   */
  "thinking": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListModelsParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Response from `ListModel` containing a paginated list of Models.
 */
export class ListModelsResponse extends S.Class<ListModelsResponse>("ListModelsResponse")({
  /**
   * The returned Models.
   */
  "models": S.optionalWith(S.Array(Model), { nullable: true }),
  /**
   * A token, which can be sent as `page_token` to retrieve the next page.
   *
   * If this field is omitted, there are no more pages.
   */
  "nextPageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Tuned model as a source for training a new model.
 */
export class TunedModelSource extends S.Class<TunedModelSource>("TunedModelSource")({
  /**
   * Immutable. The name of the `TunedModel` to use as the starting point for
   * training the new model.
   * Example: `tunedModels/my-tuned-model`
   */
  "tunedModel": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The name of the base `Model` this `TunedModel` was tuned from.
   * Example: `models/gemini-1.5-flash-001`
   */
  "baseModel": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Output only. The state of the tuned model.
 */
export class TunedModelState extends S.Literal("STATE_UNSPECIFIED", "CREATING", "ACTIVE", "FAILED") {}

/**
 * Record for a single tuning step.
 */
export class TuningSnapshot extends S.Class<TuningSnapshot>("TuningSnapshot")({
  /**
   * Output only. The tuning step.
   */
  "step": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Output only. The epoch this step was part of.
   */
  "epoch": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Output only. The mean loss of the training examples for this step.
   */
  "meanLoss": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Output only. The timestamp when this metric was computed.
   */
  "computeTime": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A single example for tuning.
 */
export class TuningExample extends S.Class<TuningExample>("TuningExample")({
  /**
   * Optional. Text model input.
   */
  "textInput": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. The expected model output.
   */
  "output": S.String
}) {}

/**
 * A set of tuning examples. Can be training or validation data.
 */
export class TuningExamples extends S.Class<TuningExamples>("TuningExamples")({
  /**
   * The examples. Example input can be for text or discuss, but all examples
   * in a set must be of the same type.
   */
  "examples": S.optionalWith(S.Array(TuningExample), { nullable: true })
}) {}

/**
 * Dataset for training or validation.
 */
export class Dataset extends S.Class<Dataset>("Dataset")({
  /**
   * Optional. Inline examples with simple input/output text.
   */
  "examples": S.optionalWith(TuningExamples, { nullable: true })
}) {}

/**
 * Hyperparameters controlling the tuning process. Read more at
 * https://ai.google.dev/docs/model_tuning_guidance
 */
export class Hyperparameters extends S.Class<Hyperparameters>("Hyperparameters")({
  /**
   * Optional. Immutable. The learning rate hyperparameter for tuning.
   * If not set, a default of 0.001 or 0.0002 will be calculated based on the
   * number of training examples.
   */
  "learningRate": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. Immutable. The learning rate multiplier is used to calculate a final learning_rate
   * based on the default (recommended) value.
   * Actual learning rate := learning_rate_multiplier * default learning rate
   * Default learning rate is dependent on base model and dataset size.
   * If not set, a default of 1.0 will be used.
   */
  "learningRateMultiplier": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Immutable. The number of training epochs. An epoch is one pass through the training
   * data.
   * If not set, a default of 5 will be used.
   */
  "epochCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Immutable. The batch size hyperparameter for tuning.
   * If not set, a default of 4 or 16 will be used based on the number of
   * training examples.
   */
  "batchSize": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * Tuning tasks that create tuned models.
 */
export class TuningTask extends S.Class<TuningTask>("TuningTask")({
  /**
   * Output only. The timestamp when tuning this model started.
   */
  "startTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The timestamp when tuning this model completed.
   */
  "completeTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Metrics collected during tuning.
   */
  "snapshots": S.optionalWith(S.Array(TuningSnapshot), { nullable: true }),
  /**
   * Required. Input only. Immutable. The model training data.
   */
  "trainingData": Dataset,
  /**
   * Immutable. Hyperparameters controlling the tuning process. If not provided, default
   * values will be used.
   */
  "hyperparameters": S.optionalWith(Hyperparameters, { nullable: true })
}) {}

/**
 * A fine-tuned model created using ModelService.CreateTunedModel.
 */
export class TunedModel extends S.Class<TunedModel>("TunedModel")({
  /**
   * Optional. TunedModel to use as the starting point for training the new model.
   */
  "tunedModelSource": S.optionalWith(TunedModelSource, { nullable: true }),
  /**
   * Immutable. The name of the `Model` to tune.
   * Example: `models/gemini-1.5-flash-001`
   */
  "baseModel": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The tuned model name. A unique name will be generated on create.
   * Example: `tunedModels/az2mb0bpw6i`
   * If display_name is set on create, the id portion of the name will be set
   * by concatenating the words of the display_name with hyphens and adding a
   * random portion for uniqueness.
   *
   * Example:
   *
   *  * display_name = `Sentence Translator`
   *  * name = `tunedModels/sentence-translator-u3b7m`
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. The name to display for this model in user interfaces.
   * The display name must be up to 40 characters including spaces.
   */
  "displayName": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. A short description of this model.
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Controls the randomness of the output.
   *
   * Values can range over `[0.0,1.0]`, inclusive. A value closer to `1.0` will
   * produce responses that are more varied, while a value closer to `0.0` will
   * typically result in less surprising responses from the model.
   *
   * This value specifies default to be the one used by the base model while
   * creating the model.
   */
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. For Nucleus sampling.
   *
   * Nucleus sampling considers the smallest set of tokens whose probability
   * sum is at least `top_p`.
   *
   * This value specifies default to be the one used by the base model while
   * creating the model.
   */
  "topP": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. For Top-k sampling.
   *
   * Top-k sampling considers the set of `top_k` most probable tokens.
   * This value specifies default to be used by the backend while making the
   * call to the model.
   *
   * This value specifies default to be the one used by the base model while
   * creating the model.
   */
  "topK": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Output only. The state of the tuned model.
   */
  "state": S.optionalWith(TunedModelState, { nullable: true }),
  /**
   * Output only. The timestamp when this model was created.
   */
  "createTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The timestamp when this model was updated.
   */
  "updateTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. The tuning task that creates the tuned model.
   */
  "tuningTask": TuningTask,
  /**
   * Optional. List of project numbers that have read access to the tuned model.
   */
  "readerProjectNumbers": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

export class UpdateTunedModelParams extends S.Struct({
  "updateMask": S.optionalWith(S.String.pipe(S.pattern(new RegExp("^(\\s*[^,\\s.]+(\\s*[,.]\\s*[^,\\s.]+)*)?$"))), {
    nullable: true
  })
}) {}

export class ListTunedModelsParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true }),
  "filter": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Response from `ListTunedModels` containing a paginated list of Models.
 */
export class ListTunedModelsResponse extends S.Class<ListTunedModelsResponse>("ListTunedModelsResponse")({
  /**
   * The returned Models.
   */
  "tunedModels": S.optionalWith(S.Array(TunedModel), { nullable: true }),
  /**
   * A token, which can be sent as `page_token` to retrieve the next page.
   *
   * If this field is omitted, there are no more pages.
   */
  "nextPageToken": S.optionalWith(S.String, { nullable: true })
}) {}

export class CreateTunedModelParams extends S.Struct({
  "tunedModelId": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Metadata about the state and progress of creating a tuned model returned from
 * the long-running operation
 */
export class CreateTunedModelMetadata extends S.Class<CreateTunedModelMetadata>("CreateTunedModelMetadata")({
  /**
   * Name of the tuned model associated with the tuning operation.
   */
  "tunedModel": S.optionalWith(S.String, { nullable: true }),
  /**
   * The total number of tuning steps.
   */
  "totalSteps": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The number of steps completed.
   */
  "completedSteps": S.optionalWith(S.Int, { nullable: true }),
  /**
   * The completed percentage for the tuning operation.
   */
  "completedPercent": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Metrics collected during tuning.
   */
  "snapshots": S.optionalWith(S.Array(TuningSnapshot), { nullable: true })
}) {}

/**
 * This resource represents a long-running operation that is the result of a
 * network API call.
 */
export class CreateTunedModelOperation extends S.Class<CreateTunedModelOperation>("CreateTunedModelOperation")({
  "metadata": S.optionalWith(CreateTunedModelMetadata, { nullable: true }),
  "response": S.optionalWith(TunedModel, { nullable: true }),
  /**
   * The server-assigned name, which is only unique within the same service that
   * originally returns it. If you use the default HTTP mapping, the
   * `name` should be a resource name ending with `operations/{unique_id}`.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * If the value is `false`, it means the operation is still in progress.
   * If `true`, the operation is completed, and either `error` or `response` is
   * available.
   */
  "done": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * The error result of the operation in case of failure or cancellation.
   */
  "error": S.optionalWith(Status, { nullable: true })
}) {}

export class ListPermissionsParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Optional. Immutable. The type of the grantee.
 */
export class PermissionGranteeType extends S.Literal("GRANTEE_TYPE_UNSPECIFIED", "USER", "GROUP", "EVERYONE") {}

/**
 * Required. The role granted by this permission.
 */
export class PermissionRole extends S.Literal("ROLE_UNSPECIFIED", "OWNER", "WRITER", "READER") {}

/**
 * Permission resource grants user, group or the rest of the world access to the
 * PaLM API resource (e.g. a tuned model, corpus).
 *
 * A role is a collection of permitted operations that allows users to perform
 * specific actions on PaLM API resources. To make them available to users,
 * groups, or service accounts, you assign roles. When you assign a role, you
 * grant permissions that the role contains.
 *
 * There are three concentric roles. Each role is a superset of the previous
 * role's permitted operations:
 *
 * - reader can use the resource (e.g. tuned model, corpus) for inference
 * - writer has reader's permissions and additionally can edit and share
 * - owner has writer's permissions and additionally can delete
 */
export class Permission extends S.Class<Permission>("Permission")({
  /**
   * Output only. Identifier. The permission name. A unique name will be generated on create.
   * Examples:
   *     tunedModels/{tuned_model}/permissions/{permission}
   *     corpora/{corpus}/permissions/{permission}
   * Output only.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. Immutable. The type of the grantee.
   */
  "granteeType": S.optionalWith(PermissionGranteeType, { nullable: true }),
  /**
   * Optional. Immutable. The email address of the user of group which this permission refers.
   * Field is not set when permission's grantee type is EVERYONE.
   */
  "emailAddress": S.optionalWith(S.String, { nullable: true }),
  /**
   * Required. The role granted by this permission.
   */
  "role": PermissionRole
}) {}

/**
 * Response from `ListPermissions` containing a paginated list of
 * permissions.
 */
export class ListPermissionsResponse extends S.Class<ListPermissionsResponse>("ListPermissionsResponse")({
  /**
   * Returned permissions.
   */
  "permissions": S.optionalWith(S.Array(Permission), { nullable: true }),
  /**
   * A token, which can be sent as `page_token` to retrieve the next page.
   *
   * If this field is omitted, there are no more pages.
   */
  "nextPageToken": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListPermissionsByCorpusParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true })
}) {}

export class UpdatePermissionParams extends S.Struct({
  "updateMask": S.String.pipe(S.pattern(new RegExp("^(\\s*[^,\\s.]+(\\s*[,.]\\s*[^,\\s.]+)*)?$")))
}) {}

export class UpdatePermissionByCorpusAndPermissionParams extends S.Struct({
  "updateMask": S.String.pipe(S.pattern(new RegExp("^(\\s*[^,\\s.]+(\\s*[,.]\\s*[^,\\s.]+)*)?$")))
}) {}

/**
 * Request to transfer the ownership of the tuned model.
 */
export class TransferOwnershipRequest extends S.Class<TransferOwnershipRequest>("TransferOwnershipRequest")({
  /**
   * Required. The email address of the user to whom the tuned model is being transferred
   * to.
   */
  "emailAddress": S.String
}) {}

/**
 * Response from `TransferOwnership`.
 */
export class TransferOwnershipResponse extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * Request message for PredictionService.Predict.
 */
export class PredictRequest extends S.Class<PredictRequest>("PredictRequest")({}) {}

/**
 * Response message for [PredictionService.Predict].
 */
export class PredictResponse extends S.Class<PredictResponse>("PredictResponse")({}) {}

/**
 * Request message for [PredictionService.PredictLongRunning].
 */
export class PredictLongRunningRequest extends S.Class<PredictLongRunningRequest>("PredictLongRunningRequest")({}) {}

/**
 * Metadata for PredictLongRunning long running operations.
 */
export class PredictLongRunningMetadata extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * Representation of a video.
 */
export class Video extends S.Class<Video>("Video")({
  /**
   * Raw bytes.
   */
  "video": S.optionalWith(S.String, { nullable: true }),
  /**
   * Path to another storage.
   */
  "uri": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A proto encapsulate various type of media.
 */
export class Media extends S.Class<Media>("Media")({
  /**
   * Video as the only one for now.  This is mimicking Vertex proto.
   */
  "video": S.optionalWith(Video, { nullable: true })
}) {}

/**
 * Veo response.
 */
export class PredictLongRunningGeneratedVideoResponse
  extends S.Class<PredictLongRunningGeneratedVideoResponse>("PredictLongRunningGeneratedVideoResponse")({
    /**
     * The generated samples.
     */
    "generatedSamples": S.optionalWith(S.Array(Media), { nullable: true }),
    /**
     * Returns if any videos were filtered due to RAI policies.
     */
    "raiMediaFilteredCount": S.optionalWith(S.Int, { nullable: true }),
    /**
     * Returns rai failure reasons if any.
     */
    "raiMediaFilteredReasons": S.optionalWith(S.Array(S.String), { nullable: true })
  })
{}

/**
 * Response message for [PredictionService.PredictLongRunning]
 */
export class PredictLongRunningResponse extends S.Class<PredictLongRunningResponse>("PredictLongRunningResponse")({
  /**
   * The response of the video generation prediction.
   */
  "generateVideoResponse": S.optionalWith(PredictLongRunningGeneratedVideoResponse, { nullable: true })
}) {}

/**
 * This resource represents a long-running operation that is the result of a
 * network API call.
 */
export class PredictLongRunningOperation extends S.Class<PredictLongRunningOperation>("PredictLongRunningOperation")({
  "metadata": S.optionalWith(PredictLongRunningMetadata, { nullable: true }),
  "response": S.optionalWith(PredictLongRunningResponse, { nullable: true }),
  /**
   * The server-assigned name, which is only unique within the same service that
   * originally returns it. If you use the default HTTP mapping, the
   * `name` should be a resource name ending with `operations/{unique_id}`.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * If the value is `false`, it means the operation is still in progress.
   * If `true`, the operation is completed, and either `error` or `response` is
   * available.
   */
  "done": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * The error result of the operation in case of failure or cancellation.
   */
  "error": S.optionalWith(Status, { nullable: true })
}) {}

export class ListFileSearchStoresParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A `FileSearchStore` is a collection of `Document`s.
 */
export class FileSearchStore extends S.Class<FileSearchStore>("FileSearchStore")({
  /**
   * Output only. Immutable. Identifier. The `FileSearchStore` resource name. It is an ID (name excluding the
   * "fileSearchStores/" prefix) that can contain up to 40 characters that are
   * lowercase alphanumeric or dashes
   * (-). It is output only. The unique name will be derived from
   * `display_name` along with a 12 character random suffix. Example:
   * `fileSearchStores/my-awesome-file-search-store-123a456b789c`
   * If `display_name` is not provided, the name will be randomly generated.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. The human-readable display name for the `FileSearchStore`. The display name
   * must be no more than 512 characters in length, including spaces. Example:
   * "Docs on Semantic Retriever"
   */
  "displayName": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The Timestamp of when the `FileSearchStore` was created.
   */
  "createTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The Timestamp of when the `FileSearchStore` was last updated.
   */
  "updateTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The number of documents in the `FileSearchStore` that are active and ready
   * for retrieval.
   */
  "activeDocumentsCount": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The number of documents in the `FileSearchStore` that are being processed.
   */
  "pendingDocumentsCount": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The number of documents in the `FileSearchStore` that have failed
   * processing.
   */
  "failedDocumentsCount": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The size of raw bytes ingested into the `FileSearchStore`. This is the
   * total size of all the documents in the `FileSearchStore`.
   */
  "sizeBytes": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Response from `ListFileSearchStores` containing a paginated list of
 * `FileSearchStores`. The results are sorted by ascending
 * `file_search_store.create_time`.
 */
export class ListFileSearchStoresResponse
  extends S.Class<ListFileSearchStoresResponse>("ListFileSearchStoresResponse")({
    /**
     * The returned rag_stores.
     */
    "fileSearchStores": S.optionalWith(S.Array(FileSearchStore), { nullable: true }),
    /**
     * A token, which can be sent as `page_token` to retrieve the next page.
     * If this field is omitted, there are no more pages.
     */
    "nextPageToken": S.optionalWith(S.String, { nullable: true })
  })
{}

export class ListCorporaParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A `Corpus` is a collection of `Document`s.
 * A project can create up to 10 corpora.
 */
export class Corpus extends S.Class<Corpus>("Corpus")({
  /**
   * Output only. Immutable. Identifier. The `Corpus` resource name. The ID (name excluding the "corpora/" prefix)
   * can contain up to 40 characters that are lowercase alphanumeric or dashes
   * (-). The ID cannot start or end with a dash. If the name is empty on
   * create, a unique name will be derived from `display_name` along with a 12
   * character random suffix.
   * Example: `corpora/my-awesome-corpora-123a456b789c`
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. The human-readable display name for the `Corpus`. The display name must be
   * no more than 512 characters in length, including spaces.
   * Example: "Docs on Semantic Retriever"
   */
  "displayName": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The Timestamp of when the `Corpus` was created.
   */
  "createTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The Timestamp of when the `Corpus` was last updated.
   */
  "updateTime": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Response from `ListCorpora` containing a paginated list of `Corpora`.
 * The results are sorted by ascending `corpus.create_time`.
 */
export class ListCorporaResponse extends S.Class<ListCorporaResponse>("ListCorporaResponse")({
  /**
   * The returned corpora.
   */
  "corpora": S.optionalWith(S.Array(Corpus), { nullable: true }),
  /**
   * A token, which can be sent as `page_token` to retrieve the next page.
   * If this field is omitted, there are no more pages.
   */
  "nextPageToken": S.optionalWith(S.String, { nullable: true })
}) {}

export class DeleteFileSearchStoreParams extends S.Struct({
  "force": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class DeleteCorpusParams extends S.Struct({
  "force": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * User provided string values assigned to a single metadata key.
 */
export class StringList extends S.Class<StringList>("StringList")({
  /**
   * The string values of the metadata to store.
   */
  "values": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

/**
 * User provided metadata stored as key-value pairs.
 */
export class CustomMetadata extends S.Class<CustomMetadata>("CustomMetadata")({
  /**
   * The string value of the metadata to store.
   */
  "stringValue": S.optionalWith(S.String, { nullable: true }),
  /**
   * The StringList value of the metadata to store.
   */
  "stringListValue": S.optionalWith(StringList, { nullable: true }),
  /**
   * The numeric value of the metadata to store.
   */
  "numericValue": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Required. The key of the metadata to store.
   */
  "key": S.String
}) {}

/**
 * Output only. Current state of the `Document`.
 */
export class DocumentState extends S.Literal("STATE_UNSPECIFIED", "STATE_PENDING", "STATE_ACTIVE", "STATE_FAILED") {}

/**
 * A `Document` is a collection of `Chunk`s.
 */
export class Document extends S.Class<Document>("Document")({
  /**
   * Immutable. Identifier. The `Document` resource name. The ID (name excluding the
   * "fileSearchStores/ * /documents/" prefix) can contain up to 40 characters
   * that are lowercase alphanumeric or dashes (-). The ID cannot start or end
   * with a dash. If the name is empty on create, a unique name will be derived
   * from `display_name` along with a 12 character random suffix. Example:
   * `fileSearchStores/{file_search_store_id}/documents/my-awesome-doc-123a456b789c`
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. The human-readable display name for the `Document`. The display name must
   * be no more than 512 characters in length, including spaces.
   * Example: "Semantic Retriever Documentation"
   */
  "displayName": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional. User provided custom metadata stored as key-value pairs used for querying.
   * A `Document` can have a maximum of 20 `CustomMetadata`.
   */
  "customMetadata": S.optionalWith(S.Array(CustomMetadata), { nullable: true }),
  /**
   * Output only. The Timestamp of when the `Document` was last updated.
   */
  "updateTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The Timestamp of when the `Document` was created.
   */
  "createTime": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. Current state of the `Document`.
   */
  "state": S.optionalWith(DocumentState, { nullable: true }),
  /**
   * Output only. The size of raw bytes ingested into the Document.
   */
  "sizeBytes": S.optionalWith(S.String, { nullable: true }),
  /**
   * Output only. The mime type of the Document.
   */
  "mimeType": S.optionalWith(S.String, { nullable: true })
}) {}

export class DeleteDocumentParams extends S.Struct({
  "force": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListDocumentsParams extends S.Struct({
  "pageSize": S.optionalWith(S.Int, { nullable: true }),
  "pageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Response from `ListDocuments` containing a paginated list of `Document`s.
 * The `Document`s are sorted by ascending `document.create_time`.
 */
export class ListDocumentsResponse extends S.Class<ListDocumentsResponse>("ListDocumentsResponse")({
  /**
   * The returned `Document`s.
   */
  "documents": S.optionalWith(S.Array(Document), { nullable: true }),
  /**
   * A token, which can be sent as `page_token` to retrieve the next page.
   * If this field is omitted, there are no more pages.
   */
  "nextPageToken": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Configuration for a white space chunking algorithm [white space delimited].
 */
export class WhiteSpaceConfig extends S.Class<WhiteSpaceConfig>("WhiteSpaceConfig")({
  /**
   * Maximum number of tokens per chunk.
   * Tokens are defined as words for this chunking algorithm.
   * Note: we are defining tokens as words split by whitespace as opposed to
   * the output of a tokenizer. The context window of the latest gemini
   * embedding model as of 2025-04-17 is currently 8192 tokens. We assume that
   * the average word is 5 characters. Therefore, we set the upper limit to
   * 2**9, which is 512 words, or 2560 tokens, assuming worst case a
   * character per token. This is a conservative estimate meant to prevent
   * context window overflow.
   */
  "maxTokensPerChunk": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Maximum number of overlapping tokens between two adjacent chunks.
   */
  "maxOverlapTokens": S.optionalWith(S.Int, { nullable: true })
}) {}

/**
 * Parameters for telling the service how to chunk the file.
 * inspired by
 * google3/cloud/ai/platform/extension/lib/retrieval/config/chunker_config.proto
 */
export class ChunkingConfig extends S.Class<ChunkingConfig>("ChunkingConfig")({
  /**
   * White space chunking configuration.
   */
  "whiteSpaceConfig": S.optionalWith(WhiteSpaceConfig, { nullable: true })
}) {}

/**
 * Request for `ImportFile` to import a File API file with a `FileSearchStore`.
 * LINT.IfChange(ImportFileRequest)
 */
export class ImportFileRequest extends S.Class<ImportFileRequest>("ImportFileRequest")({
  /**
   * Required. The name of the `File` to import.
   * Example: `files/abc-123`
   */
  "fileName": S.String,
  /**
   * Custom metadata to be associated with the file.
   */
  "customMetadata": S.optionalWith(S.Array(CustomMetadata), { nullable: true }),
  /**
   * Optional. Config for telling the service how to chunk the file.
   * If not provided, the service will use default parameters.
   */
  "chunkingConfig": S.optionalWith(ChunkingConfig, { nullable: true })
}) {}

/**
 * Metadata for LongRunning ImportFile Operations.
 */
export class ImportFileMetadata extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * Response for `ImportFile` to import a File API file with a `FileSearchStore`.
 */
export class ImportFileResponse extends S.Class<ImportFileResponse>("ImportFileResponse")({
  /**
   * The name of the `FileSearchStore` containing `Document`s.
   * Example: `fileSearchStores/my-file-search-store-123`
   */
  "parent": S.optionalWith(S.String, { nullable: true }),
  /**
   * Immutable. Identifier. The identifier for the `Document` imported.
   * Example:
   * `fileSearchStores/my-file-search-store-123/documents/my-awesome-doc-123a456b789c`
   */
  "documentName": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * This resource represents a long-running operation that is the result of a
 * network API call.
 */
export class ImportFileOperation extends S.Class<ImportFileOperation>("ImportFileOperation")({
  "metadata": S.optionalWith(ImportFileMetadata, { nullable: true }),
  "response": S.optionalWith(ImportFileResponse, { nullable: true }),
  /**
   * The server-assigned name, which is only unique within the same service that
   * originally returns it. If you use the default HTTP mapping, the
   * `name` should be a resource name ending with `operations/{unique_id}`.
   */
  "name": S.optionalWith(S.String, { nullable: true }),
  /**
   * If the value is `false`, it means the operation is still in progress.
   * If `true`, the operation is completed, and either `error` or `response` is
   * available.
   */
  "done": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * The error result of the operation in case of failure or cancellation.
   */
  "error": S.optionalWith(Status, { nullable: true })
}) {}

/**
 * Request for `UploadToFileSearchStore`.
 */
export class UploadToFileSearchStoreRequest
  extends S.Class<UploadToFileSearchStoreRequest>("UploadToFileSearchStoreRequest")({
    /**
     * Optional. Display name of the created document.
     */
    "displayName": S.optionalWith(S.String, { nullable: true }),
    /**
     * Custom metadata to be associated with the data.
     */
    "customMetadata": S.optionalWith(S.Array(CustomMetadata), { nullable: true }),
    /**
     * Optional. Config for telling the service how to chunk the data.
     * If not provided, the service will use default parameters.
     */
    "chunkingConfig": S.optionalWith(ChunkingConfig, { nullable: true }),
    /**
     * Optional. MIME type of the data. If not provided, it will be inferred from the
     * uploaded content.
     */
    "mimeType": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * Metadata for LongRunning UploadToFileSearchStore Operations.
 */
export class UploadToFileSearchStoreMetadata extends S.Record({ key: S.String, value: S.Unknown }) {}

/**
 * Response from UploadToFileSearchStore.
 */
export class UploadToFileSearchStoreResponse
  extends S.Class<UploadToFileSearchStoreResponse>("UploadToFileSearchStoreResponse")({
    /**
     * The name of the `FileSearchStore` containing `Document`s.
     * Example: `fileSearchStores/my-file-search-store-123`
     */
    "parent": S.optionalWith(S.String, { nullable: true }),
    /**
     * Immutable. Identifier. The identifier for the `Document` imported.
     * Example: `fileSearchStores/my-file-search-store-123a456b789c`
     */
    "documentName": S.optionalWith(S.String, { nullable: true }),
    /**
     * MIME type of the file.
     */
    "mimeType": S.optionalWith(S.String, { nullable: true }),
    /**
     * Size of the file in bytes.
     */
    "sizeBytes": S.optionalWith(S.String, { nullable: true })
  })
{}

/**
 * This resource represents a long-running operation that is the result of a
 * network API call.
 */
export class UploadToFileSearchStoreOperation
  extends S.Class<UploadToFileSearchStoreOperation>("UploadToFileSearchStoreOperation")({
    "metadata": S.optionalWith(UploadToFileSearchStoreMetadata, { nullable: true }),
    "response": S.optionalWith(UploadToFileSearchStoreResponse, { nullable: true }),
    /**
     * The server-assigned name, which is only unique within the same service that
     * originally returns it. If you use the default HTTP mapping, the
     * `name` should be a resource name ending with `operations/{unique_id}`.
     */
    "name": S.optionalWith(S.String, { nullable: true }),
    /**
     * If the value is `false`, it means the operation is still in progress.
     * If `true`, the operation is completed, and either `error` or `response` is
     * available.
     */
    "done": S.optionalWith(S.Boolean, { nullable: true }),
    /**
     * The error result of the operation in case of failure or cancellation.
     */
    "error": S.optionalWith(Status, { nullable: true })
  })
{}

/**
 * Text given to the model as a prompt.
 *
 * The Model will use this TextPrompt to Generate a text completion.
 */
export class TextPrompt extends S.Class<TextPrompt>("TextPrompt")({
  /**
   * Required. The prompt text.
   */
  "text": S.String
}) {}

/**
 * Request to generate a text completion response from the model.
 */
export class GenerateTextRequest extends S.Class<GenerateTextRequest>("GenerateTextRequest")({
  /**
   * Required. The free-form input text given to the model as a prompt.
   *
   * Given a prompt, the model will generate a TextCompletion response it
   * predicts as the completion of the input text.
   */
  "prompt": TextPrompt,
  /**
   * Optional. Controls the randomness of the output.
   * Note: The default value varies by model, see the `Model.temperature`
   * attribute of the `Model` returned the `getModel` function.
   *
   * Values can range from [0.0,1.0],
   * inclusive. A value closer to 1.0 will produce responses that are more
   * varied and creative, while a value closer to 0.0 will typically result in
   * more straightforward responses from the model.
   */
  "temperature": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. Number of generated responses to return.
   *
   * This value must be between [1, 8], inclusive. If unset, this will default
   * to 1.
   */
  "candidateCount": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. The maximum number of tokens to include in a candidate.
   *
   * If unset, this will default to output_token_limit specified in the `Model`
   * specification.
   */
  "maxOutputTokens": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. The maximum cumulative probability of tokens to consider when sampling.
   *
   * The model uses combined Top-k and nucleus sampling.
   *
   * Tokens are sorted based on their assigned probabilities so that only the
   * most likely tokens are considered. Top-k sampling directly limits the
   * maximum number of tokens to consider, while Nucleus sampling limits number
   * of tokens based on the cumulative probability.
   *
   * Note: The default value varies by model, see the `Model.top_p`
   * attribute of the `Model` returned the `getModel` function.
   */
  "topP": S.optionalWith(S.Number, { nullable: true }),
  /**
   * Optional. The maximum number of tokens to consider when sampling.
   *
   * The model uses combined Top-k and nucleus sampling.
   *
   * Top-k sampling considers the set of `top_k` most probable tokens.
   * Defaults to 40.
   *
   * Note: The default value varies by model, see the `Model.top_k`
   * attribute of the `Model` returned the `getModel` function.
   */
  "topK": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional. A list of unique `SafetySetting` instances for blocking unsafe content.
   *
   * that will be enforced on the `GenerateTextRequest.prompt` and
   * `GenerateTextResponse.candidates`. There should not be more than one
   * setting for each `SafetyCategory` type. The API will block any prompts and
   * responses that fail to meet the thresholds set by these settings. This list
   * overrides the default settings for each `SafetyCategory` specified in the
   * safety_settings. If there is no `SafetySetting` for a given
   * `SafetyCategory` provided in the list, the API will use the default safety
   * setting for that category. Harm categories HARM_CATEGORY_DEROGATORY,
   * HARM_CATEGORY_TOXICITY, HARM_CATEGORY_VIOLENCE, HARM_CATEGORY_SEXUAL,
   * HARM_CATEGORY_MEDICAL, HARM_CATEGORY_DANGEROUS are supported in text
   * service.
   */
  "safetySettings": S.optionalWith(S.Array(SafetySetting), { nullable: true }),
  /**
   * The set of character sequences (up to 5) that will stop output generation.
   * If specified, the API will stop at the first appearance of a stop
   * sequence. The stop sequence will not be included as part of the response.
   */
  "stopSequences": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

/**
 * Output text returned from a model.
 */
export class TextCompletion extends S.Class<TextCompletion>("TextCompletion")({
  /**
   * Output only. The generated text returned from the model.
   */
  "output": S.optionalWith(S.String, { nullable: true }),
  /**
   * Ratings for the safety of a response.
   *
   * There is at most one rating per category.
   */
  "safetyRatings": S.optionalWith(S.Array(SafetyRating), { nullable: true }),
  /**
   * Output only. Citation information for model-generated `output` in this
   * `TextCompletion`.
   *
   * This field may be populated with attribution information for any text
   * included in the `output`.
   */
  "citationMetadata": S.optionalWith(CitationMetadata, { nullable: true })
}) {}

/**
 * Safety feedback for an entire request.
 *
 * This field is populated if content in the input and/or response is blocked
 * due to safety settings. SafetyFeedback may not exist for every HarmCategory.
 * Each SafetyFeedback will return the safety settings used by the request as
 * well as the lowest HarmProbability that should be allowed in order to return
 * a result.
 */
export class SafetyFeedback extends S.Class<SafetyFeedback>("SafetyFeedback")({
  /**
   * Safety rating evaluated from content.
   */
  "rating": S.optionalWith(SafetyRating, { nullable: true }),
  /**
   * Safety settings applied to the request.
   */
  "setting": S.optionalWith(SafetySetting, { nullable: true })
}) {}

/**
 * The response from the model, including candidate completions.
 */
export class GenerateTextResponse extends S.Class<GenerateTextResponse>("GenerateTextResponse")({
  /**
   * Candidate responses from the model.
   */
  "candidates": S.optionalWith(S.Array(TextCompletion), { nullable: true }),
  /**
   * A set of content filtering metadata for the prompt and response
   * text.
   *
   * This indicates which `SafetyCategory`(s) blocked a
   * candidate from this response, the lowest `HarmProbability`
   * that triggered a block, and the HarmThreshold setting for that category.
   * This indicates the smallest change to the `SafetySettings` that would be
   * necessary to unblock at least 1 response.
   *
   * The blocking is configured by the `SafetySettings` in the request (or the
   * default `SafetySettings` of the API).
   */
  "filters": S.optionalWith(S.Array(ContentFilter), { nullable: true }),
  /**
   * Returns any safety feedback related to content filtering.
   */
  "safetyFeedback": S.optionalWith(S.Array(SafetyFeedback), { nullable: true })
}) {}

/**
 * Request to get a text embedding from the model.
 */
export class EmbedTextRequest extends S.Class<EmbedTextRequest>("EmbedTextRequest")({
  /**
   * Required. The model name to use with the format model=models/{model}.
   */
  "model": S.String,
  /**
   * Optional. The free-form input text that the model will turn into an embedding.
   */
  "text": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * A list of floats representing the embedding.
 */
export class Embedding extends S.Class<Embedding>("Embedding")({
  /**
   * The embedding values.
   */
  "value": S.optionalWith(S.Array(S.Number), { nullable: true })
}) {}

/**
 * The response to a EmbedTextRequest.
 */
export class EmbedTextResponse extends S.Class<EmbedTextResponse>("EmbedTextResponse")({
  /**
   * Output only. The embedding generated from the input text.
   */
  "embedding": S.optionalWith(Embedding, { nullable: true })
}) {}

/**
 * Batch request to get a text embedding from the model.
 */
export class BatchEmbedTextRequest extends S.Class<BatchEmbedTextRequest>("BatchEmbedTextRequest")({
  /**
   * Optional. The free-form input texts that the model will turn into an embedding. The
   * current limit is 100 texts, over which an error will be thrown.
   */
  "texts": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Optional. Embed requests for the batch. Only one of `texts` or `requests` can be set.
   */
  "requests": S.optionalWith(S.Array(EmbedTextRequest), { nullable: true })
}) {}

/**
 * The response to a EmbedTextRequest.
 */
export class BatchEmbedTextResponse extends S.Class<BatchEmbedTextResponse>("BatchEmbedTextResponse")({
  /**
   * Output only. The embeddings generated from the input text.
   */
  "embeddings": S.optionalWith(S.Array(Embedding), { nullable: true })
}) {}

/**
 * Counts the number of tokens in the `prompt` sent to a model.
 *
 * Models may tokenize text differently, so each model may return a different
 * `token_count`.
 */
export class CountTextTokensRequest extends S.Class<CountTextTokensRequest>("CountTextTokensRequest")({
  /**
   * Required. The free-form input text given to the model as a prompt.
   */
  "prompt": TextPrompt
}) {}

/**
 * A response from `CountTextTokens`.
 *
 * It returns the model's `token_count` for the `prompt`.
 */
export class CountTextTokensResponse extends S.Class<CountTextTokensResponse>("CountTextTokensResponse")({
  /**
   * The number of tokens that the `model` tokenizes the `prompt` into.
   *
   * Always non-negative.
   */
  "tokenCount": S.optionalWith(S.Int, { nullable: true })
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
  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const decodeError =
    <const Tag extends string, A, I, R>(tag: Tag, schema: S.Schema<A, I, R>) =>
    (response: HttpClientResponse.HttpClientResponse) =>
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(schema)(response),
        (cause) => Effect.fail(ClientError(tag, cause, response))
      )
  return {
    httpClient,
    "ListOperations": (tunedModel, options) =>
      HttpClientRequest.get(`/v1beta/tunedModels/${tunedModel}/operations`).pipe(
        HttpClientRequest.setUrlParams({
          "filter": options?.["filter"] as any,
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any,
          "returnPartialSuccess": options?.["returnPartialSuccess"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListOperationsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "ListOperationsBy": (options) =>
      HttpClientRequest.get(`/v1beta/batches`).pipe(
        HttpClientRequest.setUrlParams({
          "filter": options?.["filter"] as any,
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any,
          "returnPartialSuccess": options?.["returnPartialSuccess"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListOperationsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "ListOperationsByModel": (model, options) =>
      HttpClientRequest.get(`/v1beta/models/${model}/operations`).pipe(
        HttpClientRequest.setUrlParams({
          "filter": options?.["filter"] as any,
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any,
          "returnPartialSuccess": options?.["returnPartialSuccess"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListOperationsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "GetOperation": (tunedModel, operation) =>
      HttpClientRequest.get(`/v1beta/tunedModels/${tunedModel}/operations/${operation}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Operation),
          orElse: unexpectedStatus
        }))
      ),
    "GetOperationByGeneratedFileAndOperation": (generatedFile, operation) =>
      HttpClientRequest.get(`/v1beta/generatedFiles/${generatedFile}/operations/${operation}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Operation),
          orElse: unexpectedStatus
        }))
      ),
    "GetOperationByGenerateContentBatch": (generateContentBatch) =>
      HttpClientRequest.get(`/v1beta/batches/${generateContentBatch}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Operation),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteOperation": (generateContentBatch) =>
      HttpClientRequest.del(`/v1beta/batches/${generateContentBatch}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "GetOperationByModelAndOperation": (model, operation) =>
      HttpClientRequest.get(`/v1beta/models/${model}/operations/${operation}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Operation),
          orElse: unexpectedStatus
        }))
      ),
    "GetOperationByCorpusAndOperation": (corpus, operation) =>
      HttpClientRequest.get(`/v1beta/corpora/${corpus}/operations/${operation}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Operation),
          orElse: unexpectedStatus
        }))
      ),
    "GetOperationByFileSearchStoreAndOperation": (fileSearchStore, operation) =>
      HttpClientRequest.get(`/v1beta/fileSearchStores/${fileSearchStore}/operations/${operation}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Operation),
          orElse: unexpectedStatus
        }))
      ),
    "GetOperationByFileSearchStoresIdAndOperationsId": (fileSearchStoresId, operationsId) =>
      HttpClientRequest.get(`/v1beta/fileSearchStores/${fileSearchStoresId}/upload/operations/${operationsId}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Operation),
          orElse: unexpectedStatus
        }))
      ),
    "CancelOperation": (generateContentBatch) =>
      HttpClientRequest.post(`/v1beta/batches/${generateContentBatch}:cancel`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "GenerateContent": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:generateContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateContentResponse),
          orElse: unexpectedStatus
        }))
      ),
    "GenerateContentByTunedModel": (tunedModel, options) =>
      HttpClientRequest.post(`/v1beta/tunedModels/${tunedModel}:generateContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateContentResponse),
          orElse: unexpectedStatus
        }))
      ),
    "GenerateContentByDynamicId": (dynamicId, options) =>
      HttpClientRequest.post(`/v1beta/dynamic/${dynamicId}:generateContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateContentResponse),
          orElse: unexpectedStatus
        }))
      ),
    "GenerateAnswer": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:generateAnswer`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateAnswerResponse),
          orElse: unexpectedStatus
        }))
      ),
    "StreamGenerateContent": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:streamGenerateContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateContentResponse),
          orElse: unexpectedStatus
        }))
      ),
    "StreamGenerateContentByTunedModel": (tunedModel, options) =>
      HttpClientRequest.post(`/v1beta/tunedModels/${tunedModel}:streamGenerateContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateContentResponse),
          orElse: unexpectedStatus
        }))
      ),
    "StreamGenerateContentByDynamicId": (dynamicId, options) =>
      HttpClientRequest.post(`/v1beta/dynamic/${dynamicId}:streamGenerateContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateContentResponse),
          orElse: unexpectedStatus
        }))
      ),
    "EmbedContent": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:embedContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EmbedContentResponse),
          orElse: unexpectedStatus
        }))
      ),
    "BatchEmbedContents": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:batchEmbedContents`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BatchEmbedContentsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CountTokens": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:countTokens`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CountTokensResponse),
          orElse: unexpectedStatus
        }))
      ),
    "BatchGenerateContent": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:batchGenerateContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BatchGenerateContentOperation),
          orElse: unexpectedStatus
        }))
      ),
    "BatchGenerateContentByTunedModel": (tunedModel, options) =>
      HttpClientRequest.post(`/v1beta/tunedModels/${tunedModel}:batchGenerateContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BatchGenerateContentOperation),
          orElse: unexpectedStatus
        }))
      ),
    "AsyncBatchEmbedContent": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:asyncBatchEmbedContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(AsyncBatchEmbedContentOperation),
          orElse: unexpectedStatus
        }))
      ),
    "AsyncBatchEmbedContentByTunedModel": (tunedModel, options) =>
      HttpClientRequest.post(`/v1beta/tunedModels/${tunedModel}:asyncBatchEmbedContent`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(AsyncBatchEmbedContentOperation),
          orElse: unexpectedStatus
        }))
      ),
    "UpdateGenerateContentBatch": (generateContentBatch, options) =>
      HttpClientRequest.patch(`/v1beta/batches/${generateContentBatch}:updateGenerateContentBatch`).pipe(
        HttpClientRequest.setUrlParams({ "updateMask": options.params?.["updateMask"] as any }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateContentBatch),
          orElse: unexpectedStatus
        }))
      ),
    "UpdateEmbedContentBatch": (generateContentBatch, options) =>
      HttpClientRequest.patch(`/v1beta/batches/${generateContentBatch}:updateEmbedContentBatch`).pipe(
        HttpClientRequest.setUrlParams({ "updateMask": options.params?.["updateMask"] as any }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EmbedContentBatch),
          orElse: unexpectedStatus
        }))
      ),
    "ListCachedContents": (options) =>
      HttpClientRequest.get(`/v1beta/cachedContents`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListCachedContentsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CreateCachedContent": (options) =>
      HttpClientRequest.post(`/v1beta/cachedContents`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CachedContent),
          orElse: unexpectedStatus
        }))
      ),
    "GetCachedContent": (id) =>
      HttpClientRequest.get(`/v1beta/cachedContents/${id}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CachedContent),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteCachedContent": (id) =>
      HttpClientRequest.del(`/v1beta/cachedContents/${id}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "UpdateCachedContent": (id, options) =>
      HttpClientRequest.patch(`/v1beta/cachedContents/${id}`).pipe(
        HttpClientRequest.setUrlParams({ "updateMask": options.params?.["updateMask"] as any }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CachedContent),
          orElse: unexpectedStatus
        }))
      ),
    "GenerateMessage": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:generateMessage`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateMessageResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CountMessageTokens": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:countMessageTokens`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CountMessageTokensResponse),
          orElse: unexpectedStatus
        }))
      ),
    "ListFiles": (options) =>
      HttpClientRequest.get(`/v1beta/files`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListFilesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CreateFile": (options) =>
      HttpClientRequest.post(`/v1beta/files`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateFileResponse),
          orElse: unexpectedStatus
        }))
      ),
    "GetFile": (file) =>
      HttpClientRequest.get(`/v1beta/files/${file}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(File),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteFile": (file) =>
      HttpClientRequest.del(`/v1beta/files/${file}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "DownloadFile": (file) =>
      HttpClientRequest.get(`/v1beta/files/${file}:download`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DownloadFileResponse),
          orElse: unexpectedStatus
        }))
      ),
    "GetGeneratedFile": (generatedFile) =>
      HttpClientRequest.get(`/v1beta/generatedFiles/${generatedFile}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GeneratedFile),
          orElse: unexpectedStatus
        }))
      ),
    "ListGeneratedFiles": (options) =>
      HttpClientRequest.get(`/v1beta/generatedFiles`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListGeneratedFilesResponse),
          orElse: unexpectedStatus
        }))
      ),
    "GetModel": (model) =>
      HttpClientRequest.get(`/v1beta/models/${model}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Model),
          orElse: unexpectedStatus
        }))
      ),
    "ListModels": (options) =>
      HttpClientRequest.get(`/v1beta/models`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListModelsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "GetTunedModel": (tunedModel) =>
      HttpClientRequest.get(`/v1beta/tunedModels/${tunedModel}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(TunedModel),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteTunedModel": (tunedModel) =>
      HttpClientRequest.del(`/v1beta/tunedModels/${tunedModel}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "UpdateTunedModel": (tunedModel, options) =>
      HttpClientRequest.patch(`/v1beta/tunedModels/${tunedModel}`).pipe(
        HttpClientRequest.setUrlParams({ "updateMask": options.params?.["updateMask"] as any }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(TunedModel),
          orElse: unexpectedStatus
        }))
      ),
    "ListTunedModels": (options) =>
      HttpClientRequest.get(`/v1beta/tunedModels`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any,
          "filter": options?.["filter"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListTunedModelsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CreateTunedModel": (options) =>
      HttpClientRequest.post(`/v1beta/tunedModels`).pipe(
        HttpClientRequest.setUrlParams({ "tunedModelId": options.params?.["tunedModelId"] as any }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateTunedModelOperation),
          orElse: unexpectedStatus
        }))
      ),
    "ListPermissions": (tunedModel, options) =>
      HttpClientRequest.get(`/v1beta/tunedModels/${tunedModel}/permissions`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListPermissionsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CreatePermission": (tunedModel, options) =>
      HttpClientRequest.post(`/v1beta/tunedModels/${tunedModel}/permissions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Permission),
          orElse: unexpectedStatus
        }))
      ),
    "ListPermissionsByCorpus": (corpus, options) =>
      HttpClientRequest.get(`/v1beta/corpora/${corpus}/permissions`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListPermissionsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CreatePermissionByCorpus": (corpus, options) =>
      HttpClientRequest.post(`/v1beta/corpora/${corpus}/permissions`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Permission),
          orElse: unexpectedStatus
        }))
      ),
    "GetPermission": (tunedModel, permission) =>
      HttpClientRequest.get(`/v1beta/tunedModels/${tunedModel}/permissions/${permission}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Permission),
          orElse: unexpectedStatus
        }))
      ),
    "DeletePermission": (tunedModel, permission) =>
      HttpClientRequest.del(`/v1beta/tunedModels/${tunedModel}/permissions/${permission}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "UpdatePermission": (tunedModel, permission, options) =>
      HttpClientRequest.patch(`/v1beta/tunedModels/${tunedModel}/permissions/${permission}`).pipe(
        HttpClientRequest.setUrlParams({ "updateMask": options.params?.["updateMask"] as any }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Permission),
          orElse: unexpectedStatus
        }))
      ),
    "GetPermissionByCorpusAndPermission": (corpus, permission) =>
      HttpClientRequest.get(`/v1beta/corpora/${corpus}/permissions/${permission}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Permission),
          orElse: unexpectedStatus
        }))
      ),
    "DeletePermissionByCorpusAndPermission": (corpus, permission) =>
      HttpClientRequest.del(`/v1beta/corpora/${corpus}/permissions/${permission}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "UpdatePermissionByCorpusAndPermission": (corpus, permission, options) =>
      HttpClientRequest.patch(`/v1beta/corpora/${corpus}/permissions/${permission}`).pipe(
        HttpClientRequest.setUrlParams({ "updateMask": options.params?.["updateMask"] as any }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Permission),
          orElse: unexpectedStatus
        }))
      ),
    "TransferOwnership": (tunedModel, options) =>
      HttpClientRequest.post(`/v1beta/tunedModels/${tunedModel}:transferOwnership`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(TransferOwnershipResponse),
          orElse: unexpectedStatus
        }))
      ),
    "Predict": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:predict`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(PredictResponse),
          orElse: unexpectedStatus
        }))
      ),
    "PredictLongRunning": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:predictLongRunning`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(PredictLongRunningOperation),
          orElse: unexpectedStatus
        }))
      ),
    "ListFileSearchStores": (options) =>
      HttpClientRequest.get(`/v1beta/fileSearchStores`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListFileSearchStoresResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CreateFileSearchStore": (options) =>
      HttpClientRequest.post(`/v1beta/fileSearchStores`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FileSearchStore),
          orElse: unexpectedStatus
        }))
      ),
    "ListCorpora": (options) =>
      HttpClientRequest.get(`/v1beta/corpora`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListCorporaResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CreateCorpus": (options) =>
      HttpClientRequest.post(`/v1beta/corpora`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Corpus),
          orElse: unexpectedStatus
        }))
      ),
    "GetFileSearchStore": (fileSearchStore) =>
      HttpClientRequest.get(`/v1beta/fileSearchStores/${fileSearchStore}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FileSearchStore),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteFileSearchStore": (fileSearchStore, options) =>
      HttpClientRequest.del(`/v1beta/fileSearchStores/${fileSearchStore}`).pipe(
        HttpClientRequest.setUrlParams({ "force": options?.["force"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "GetCorpus": (corpus) =>
      HttpClientRequest.get(`/v1beta/corpora/${corpus}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Corpus),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteCorpus": (corpus, options) =>
      HttpClientRequest.del(`/v1beta/corpora/${corpus}`).pipe(
        HttpClientRequest.setUrlParams({ "force": options?.["force"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "GetDocument": (fileSearchStore, document) =>
      HttpClientRequest.get(`/v1beta/fileSearchStores/${fileSearchStore}/documents/${document}`).pipe(
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Document),
          orElse: unexpectedStatus
        }))
      ),
    "DeleteDocument": (fileSearchStore, document, options) =>
      HttpClientRequest.del(`/v1beta/fileSearchStores/${fileSearchStore}/documents/${document}`).pipe(
        HttpClientRequest.setUrlParams({ "force": options?.["force"] as any }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Empty),
          orElse: unexpectedStatus
        }))
      ),
    "ListDocuments": (fileSearchStore, options) =>
      HttpClientRequest.get(`/v1beta/fileSearchStores/${fileSearchStore}/documents`).pipe(
        HttpClientRequest.setUrlParams({
          "pageSize": options?.["pageSize"] as any,
          "pageToken": options?.["pageToken"] as any
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListDocumentsResponse),
          orElse: unexpectedStatus
        }))
      ),
    "ImportFile": (fileSearchStore, options) =>
      HttpClientRequest.post(`/v1beta/fileSearchStores/${fileSearchStore}:importFile`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ImportFileOperation),
          orElse: unexpectedStatus
        }))
      ),
    "UploadToFileSearchStore": (fileSearchStore, options) =>
      HttpClientRequest.post(`/v1beta/fileSearchStores/${fileSearchStore}:uploadToFileSearchStore`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(UploadToFileSearchStoreOperation),
          orElse: unexpectedStatus
        }))
      ),
    "GenerateText": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:generateText`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateTextResponse),
          orElse: unexpectedStatus
        }))
      ),
    "GenerateTextByTunedModel": (tunedModel, options) =>
      HttpClientRequest.post(`/v1beta/tunedModels/${tunedModel}:generateText`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GenerateTextResponse),
          orElse: unexpectedStatus
        }))
      ),
    "EmbedText": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:embedText`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(EmbedTextResponse),
          orElse: unexpectedStatus
        }))
      ),
    "BatchEmbedText": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:batchEmbedText`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BatchEmbedTextResponse),
          orElse: unexpectedStatus
        }))
      ),
    "CountTextTokens": (model, options) =>
      HttpClientRequest.post(`/v1beta/models/${model}:countTextTokens`).pipe(
        HttpClientRequest.bodyUnsafeJson(options),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CountTextTokensResponse),
          orElse: unexpectedStatus
        }))
      )
  }
}

export interface Client {
  readonly httpClient: HttpClient.HttpClient
  /**
   * Lists operations that match the specified filter in the request. If the
   * server doesn't support this method, it returns `UNIMPLEMENTED`.
   */
  readonly "ListOperations": (
    tunedModel: string,
    options?: typeof ListOperationsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListOperationsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists operations that match the specified filter in the request. If the
   * server doesn't support this method, it returns `UNIMPLEMENTED`.
   */
  readonly "ListOperationsBy": (
    options?: typeof ListOperationsByParams.Encoded | undefined
  ) => Effect.Effect<typeof ListOperationsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists operations that match the specified filter in the request. If the
   * server doesn't support this method, it returns `UNIMPLEMENTED`.
   */
  readonly "ListOperationsByModel": (
    model: string,
    options?: typeof ListOperationsByModelParams.Encoded | undefined
  ) => Effect.Effect<typeof ListOperationsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets the latest state of a long-running operation.  Clients can use this
   * method to poll the operation result at intervals as recommended by the API
   * service.
   */
  readonly "GetOperation": (
    tunedModel: string,
    operation: string
  ) => Effect.Effect<typeof Operation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets the latest state of a long-running operation.  Clients can use this
   * method to poll the operation result at intervals as recommended by the API
   * service.
   */
  readonly "GetOperationByGeneratedFileAndOperation": (
    generatedFile: string,
    operation: string
  ) => Effect.Effect<typeof Operation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets the latest state of a long-running operation.  Clients can use this
   * method to poll the operation result at intervals as recommended by the API
   * service.
   */
  readonly "GetOperationByGenerateContentBatch": (
    generateContentBatch: string
  ) => Effect.Effect<typeof Operation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a long-running operation. This method indicates that the client is
   * no longer interested in the operation result. It does not cancel the
   * operation. If the server doesn't support this method, it returns
   * `google.rpc.Code.UNIMPLEMENTED`.
   */
  readonly "DeleteOperation": (
    generateContentBatch: string
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets the latest state of a long-running operation.  Clients can use this
   * method to poll the operation result at intervals as recommended by the API
   * service.
   */
  readonly "GetOperationByModelAndOperation": (
    model: string,
    operation: string
  ) => Effect.Effect<typeof Operation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets the latest state of a long-running operation.  Clients can use this
   * method to poll the operation result at intervals as recommended by the API
   * service.
   */
  readonly "GetOperationByCorpusAndOperation": (
    corpus: string,
    operation: string
  ) => Effect.Effect<typeof Operation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets the latest state of a long-running operation.  Clients can use this
   * method to poll the operation result at intervals as recommended by the API
   * service.
   */
  readonly "GetOperationByFileSearchStoreAndOperation": (
    fileSearchStore: string,
    operation: string
  ) => Effect.Effect<typeof Operation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets the latest state of a long-running operation.  Clients can use this
   * method to poll the operation result at intervals as recommended by the API
   * service.
   */
  readonly "GetOperationByFileSearchStoresIdAndOperationsId": (
    fileSearchStoresId: string,
    operationsId: string
  ) => Effect.Effect<typeof Operation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Starts asynchronous cancellation on a long-running operation.  The server
   * makes a best effort to cancel the operation, but success is not
   * guaranteed.  If the server doesn't support this method, it returns
   * `google.rpc.Code.UNIMPLEMENTED`.  Clients can use
   * Operations.GetOperation or
   * other methods to check whether the cancellation succeeded or whether the
   * operation completed despite cancellation. On successful cancellation,
   * the operation is not deleted; instead, it becomes an operation with
   * an Operation.error value with a google.rpc.Status.code of `1`,
   * corresponding to `Code.CANCELLED`.
   */
  readonly "CancelOperation": (
    generateContentBatch: string
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a model response given an input `GenerateContentRequest`.
   * Refer to the [text generation
   * guide](https://ai.google.dev/gemini-api/docs/text-generation) for detailed
   * usage information. Input capabilities differ between models, including
   * tuned models. Refer to the [model
   * guide](https://ai.google.dev/gemini-api/docs/models/gemini) and [tuning
   * guide](https://ai.google.dev/gemini-api/docs/model-tuning) for details.
   */
  readonly "GenerateContent": (
    model: string,
    options: typeof GenerateContentRequest.Encoded
  ) => Effect.Effect<typeof GenerateContentResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a model response given an input `GenerateContentRequest`.
   * Refer to the [text generation
   * guide](https://ai.google.dev/gemini-api/docs/text-generation) for detailed
   * usage information. Input capabilities differ between models, including
   * tuned models. Refer to the [model
   * guide](https://ai.google.dev/gemini-api/docs/models/gemini) and [tuning
   * guide](https://ai.google.dev/gemini-api/docs/model-tuning) for details.
   */
  readonly "GenerateContentByTunedModel": (
    tunedModel: string,
    options: typeof GenerateContentRequest.Encoded
  ) => Effect.Effect<typeof GenerateContentResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a model response given an input `GenerateContentRequest`.
   * Refer to the [text generation
   * guide](https://ai.google.dev/gemini-api/docs/text-generation) for detailed
   * usage information. Input capabilities differ between models, including
   * tuned models. Refer to the [model
   * guide](https://ai.google.dev/gemini-api/docs/models/gemini) and [tuning
   * guide](https://ai.google.dev/gemini-api/docs/model-tuning) for details.
   */
  readonly "GenerateContentByDynamicId": (
    dynamicId: string,
    options: typeof GenerateContentRequest.Encoded
  ) => Effect.Effect<typeof GenerateContentResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a grounded answer from the model given an input
   * `GenerateAnswerRequest`.
   */
  readonly "GenerateAnswer": (
    model: string,
    options: typeof GenerateAnswerRequest.Encoded
  ) => Effect.Effect<typeof GenerateAnswerResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a [streamed
   * response](https://ai.google.dev/gemini-api/docs/text-generation?lang=python#generate-a-text-stream)
   * from the model given an input `GenerateContentRequest`.
   */
  readonly "StreamGenerateContent": (
    model: string,
    options: typeof GenerateContentRequest.Encoded
  ) => Effect.Effect<typeof GenerateContentResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a [streamed
   * response](https://ai.google.dev/gemini-api/docs/text-generation?lang=python#generate-a-text-stream)
   * from the model given an input `GenerateContentRequest`.
   */
  readonly "StreamGenerateContentByTunedModel": (
    tunedModel: string,
    options: typeof GenerateContentRequest.Encoded
  ) => Effect.Effect<typeof GenerateContentResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a [streamed
   * response](https://ai.google.dev/gemini-api/docs/text-generation?lang=python#generate-a-text-stream)
   * from the model given an input `GenerateContentRequest`.
   */
  readonly "StreamGenerateContentByDynamicId": (
    dynamicId: string,
    options: typeof GenerateContentRequest.Encoded
  ) => Effect.Effect<typeof GenerateContentResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a text embedding vector from the input `Content` using the
   * specified [Gemini Embedding
   * model](https://ai.google.dev/gemini-api/docs/models/gemini#text-embedding).
   */
  readonly "EmbedContent": (
    model: string,
    options: typeof EmbedContentRequest.Encoded
  ) => Effect.Effect<typeof EmbedContentResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates multiple embedding vectors from the input `Content` which
   * consists of a batch of strings represented as `EmbedContentRequest`
   * objects.
   */
  readonly "BatchEmbedContents": (
    model: string,
    options: typeof BatchEmbedContentsRequest.Encoded
  ) => Effect.Effect<typeof BatchEmbedContentsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Runs a model's tokenizer on input `Content` and returns the token count.
   * Refer to the [tokens guide](https://ai.google.dev/gemini-api/docs/tokens)
   * to learn more about tokens.
   */
  readonly "CountTokens": (
    model: string,
    options: typeof CountTokensRequest.Encoded
  ) => Effect.Effect<typeof CountTokensResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Enqueues a batch of `GenerateContent` requests for batch processing.
   */
  readonly "BatchGenerateContent": (
    model: string,
    options: typeof BatchGenerateContentRequest.Encoded
  ) => Effect.Effect<typeof BatchGenerateContentOperation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Enqueues a batch of `GenerateContent` requests for batch processing.
   */
  readonly "BatchGenerateContentByTunedModel": (
    tunedModel: string,
    options: typeof BatchGenerateContentRequest.Encoded
  ) => Effect.Effect<typeof BatchGenerateContentOperation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Enqueues a batch of `EmbedContent` requests for batch processing.
   * We have a `BatchEmbedContents` handler in `GenerativeService`, but it was
   * synchronized. So we name this one to be `Async` to avoid confusion.
   */
  readonly "AsyncBatchEmbedContent": (
    model: string,
    options: typeof AsyncBatchEmbedContentRequest.Encoded
  ) => Effect.Effect<typeof AsyncBatchEmbedContentOperation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Enqueues a batch of `EmbedContent` requests for batch processing.
   * We have a `BatchEmbedContents` handler in `GenerativeService`, but it was
   * synchronized. So we name this one to be `Async` to avoid confusion.
   */
  readonly "AsyncBatchEmbedContentByTunedModel": (
    tunedModel: string,
    options: typeof AsyncBatchEmbedContentRequest.Encoded
  ) => Effect.Effect<typeof AsyncBatchEmbedContentOperation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates a batch of GenerateContent requests for batch processing.
   */
  readonly "UpdateGenerateContentBatch": (
    generateContentBatch: string,
    options: {
      readonly params?: typeof UpdateGenerateContentBatchParams.Encoded | undefined
      readonly payload: typeof GenerateContentBatch.Encoded
    }
  ) => Effect.Effect<typeof GenerateContentBatch.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates a batch of EmbedContent requests for batch processing.
   */
  readonly "UpdateEmbedContentBatch": (
    generateContentBatch: string,
    options: {
      readonly params?: typeof UpdateEmbedContentBatchParams.Encoded | undefined
      readonly payload: typeof EmbedContentBatch.Encoded
    }
  ) => Effect.Effect<typeof EmbedContentBatch.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists CachedContents.
   */
  readonly "ListCachedContents": (
    options?: typeof ListCachedContentsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListCachedContentsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates CachedContent resource.
   */
  readonly "CreateCachedContent": (
    options: typeof CachedContent.Encoded
  ) => Effect.Effect<typeof CachedContent.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Reads CachedContent resource.
   */
  readonly "GetCachedContent": (
    id: string
  ) => Effect.Effect<typeof CachedContent.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes CachedContent resource.
   */
  readonly "DeleteCachedContent": (
    id: string
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates CachedContent resource (only expiration is updatable).
   */
  readonly "UpdateCachedContent": (
    id: string,
    options: {
      readonly params?: typeof UpdateCachedContentParams.Encoded | undefined
      readonly payload: typeof CachedContent.Encoded
    }
  ) => Effect.Effect<typeof CachedContent.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a response from the model given an input `MessagePrompt`.
   */
  readonly "GenerateMessage": (
    model: string,
    options: typeof GenerateMessageRequest.Encoded
  ) => Effect.Effect<typeof GenerateMessageResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Runs a model's tokenizer on a string and returns the token count.
   */
  readonly "CountMessageTokens": (
    model: string,
    options: typeof CountMessageTokensRequest.Encoded
  ) => Effect.Effect<typeof CountMessageTokensResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the metadata for `File`s owned by the requesting project.
   */
  readonly "ListFiles": (
    options?: typeof ListFilesParams.Encoded | undefined
  ) => Effect.Effect<typeof ListFilesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates a `File`.
   */
  readonly "CreateFile": (
    options: typeof CreateFileRequest.Encoded
  ) => Effect.Effect<typeof CreateFileResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets the metadata for the given `File`.
   */
  readonly "GetFile": (file: string) => Effect.Effect<typeof File.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes the `File`.
   */
  readonly "DeleteFile": (
    file: string
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Download the `File`.
   */
  readonly "DownloadFile": (
    file: string
  ) => Effect.Effect<typeof DownloadFileResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets a generated file. When calling this method via REST, only the metadata
   * of the generated file is returned. To retrieve the file content via REST,
   * add alt=media as a query parameter.
   */
  readonly "GetGeneratedFile": (
    generatedFile: string
  ) => Effect.Effect<typeof GeneratedFile.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the generated files owned by the requesting project.
   */
  readonly "ListGeneratedFiles": (
    options?: typeof ListGeneratedFilesParams.Encoded | undefined
  ) => Effect.Effect<typeof ListGeneratedFilesResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets information about a specific `Model` such as its version number, token
   * limits,
   * [parameters](https://ai.google.dev/gemini-api/docs/models/generative-models#model-parameters)
   * and other metadata. Refer to the [Gemini models
   * guide](https://ai.google.dev/gemini-api/docs/models/gemini) for detailed
   * model information.
   */
  readonly "GetModel": (model: string) => Effect.Effect<typeof Model.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists the [`Model`s](https://ai.google.dev/gemini-api/docs/models/gemini)
   * available through the Gemini API.
   */
  readonly "ListModels": (
    options?: typeof ListModelsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListModelsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets information about a specific TunedModel.
   */
  readonly "GetTunedModel": (
    tunedModel: string
  ) => Effect.Effect<typeof TunedModel.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a tuned model.
   */
  readonly "DeleteTunedModel": (
    tunedModel: string
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates a tuned model.
   */
  readonly "UpdateTunedModel": (
    tunedModel: string,
    options: {
      readonly params?: typeof UpdateTunedModelParams.Encoded | undefined
      readonly payload: typeof TunedModel.Encoded
    }
  ) => Effect.Effect<typeof TunedModel.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists created tuned models.
   */
  readonly "ListTunedModels": (
    options?: typeof ListTunedModelsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListTunedModelsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates a tuned model.
   * Check intermediate tuning progress (if any) through the
   * [google.longrunning.Operations] service.
   *
   * Access status and results through the Operations service.
   * Example:
   *   GET /v1/tunedModels/az2mb0bpw6i/operations/000-111-222
   */
  readonly "CreateTunedModel": (
    options: {
      readonly params?: typeof CreateTunedModelParams.Encoded | undefined
      readonly payload: typeof TunedModel.Encoded
    }
  ) => Effect.Effect<typeof CreateTunedModelOperation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists permissions for the specific resource.
   */
  readonly "ListPermissions": (
    tunedModel: string,
    options?: typeof ListPermissionsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListPermissionsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a permission to a specific resource.
   */
  readonly "CreatePermission": (
    tunedModel: string,
    options: typeof Permission.Encoded
  ) => Effect.Effect<typeof Permission.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists permissions for the specific resource.
   */
  readonly "ListPermissionsByCorpus": (
    corpus: string,
    options?: typeof ListPermissionsByCorpusParams.Encoded | undefined
  ) => Effect.Effect<typeof ListPermissionsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Create a permission to a specific resource.
   */
  readonly "CreatePermissionByCorpus": (
    corpus: string,
    options: typeof Permission.Encoded
  ) => Effect.Effect<typeof Permission.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets information about a specific Permission.
   */
  readonly "GetPermission": (
    tunedModel: string,
    permission: string
  ) => Effect.Effect<typeof Permission.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes the permission.
   */
  readonly "DeletePermission": (
    tunedModel: string,
    permission: string
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates the permission.
   */
  readonly "UpdatePermission": (
    tunedModel: string,
    permission: string,
    options: { readonly params: typeof UpdatePermissionParams.Encoded; readonly payload: typeof Permission.Encoded }
  ) => Effect.Effect<typeof Permission.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets information about a specific Permission.
   */
  readonly "GetPermissionByCorpusAndPermission": (
    corpus: string,
    permission: string
  ) => Effect.Effect<typeof Permission.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes the permission.
   */
  readonly "DeletePermissionByCorpusAndPermission": (
    corpus: string,
    permission: string
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Updates the permission.
   */
  readonly "UpdatePermissionByCorpusAndPermission": (
    corpus: string,
    permission: string,
    options: {
      readonly params: typeof UpdatePermissionByCorpusAndPermissionParams.Encoded
      readonly payload: typeof Permission.Encoded
    }
  ) => Effect.Effect<typeof Permission.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Transfers ownership of the tuned model.
   * This is the only way to change ownership of the tuned model.
   * The current owner will be downgraded to writer role.
   */
  readonly "TransferOwnership": (
    tunedModel: string,
    options: typeof TransferOwnershipRequest.Encoded
  ) => Effect.Effect<typeof TransferOwnershipResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Performs a prediction request.
   */
  readonly "Predict": (
    model: string,
    options: typeof PredictRequest.Encoded
  ) => Effect.Effect<typeof PredictResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Same as Predict but returns an LRO.
   */
  readonly "PredictLongRunning": (
    model: string,
    options: typeof PredictLongRunningRequest.Encoded
  ) => Effect.Effect<typeof PredictLongRunningOperation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists all `FileSearchStores` owned by the user.
   */
  readonly "ListFileSearchStores": (
    options?: typeof ListFileSearchStoresParams.Encoded | undefined
  ) => Effect.Effect<typeof ListFileSearchStoresResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates an empty `FileSearchStore`.
   */
  readonly "CreateFileSearchStore": (
    options: typeof FileSearchStore.Encoded
  ) => Effect.Effect<typeof FileSearchStore.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists all `Corpora` owned by the user.
   */
  readonly "ListCorpora": (
    options?: typeof ListCorporaParams.Encoded | undefined
  ) => Effect.Effect<typeof ListCorporaResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Creates an empty `Corpus`.
   */
  readonly "CreateCorpus": (
    options: typeof Corpus.Encoded
  ) => Effect.Effect<typeof Corpus.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets information about a specific `FileSearchStore`.
   */
  readonly "GetFileSearchStore": (
    fileSearchStore: string
  ) => Effect.Effect<typeof FileSearchStore.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a `FileSearchStore`.
   */
  readonly "DeleteFileSearchStore": (
    fileSearchStore: string,
    options?: typeof DeleteFileSearchStoreParams.Encoded | undefined
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets information about a specific `Corpus`.
   */
  readonly "GetCorpus": (
    corpus: string
  ) => Effect.Effect<typeof Corpus.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a `Corpus`.
   */
  readonly "DeleteCorpus": (
    corpus: string,
    options?: typeof DeleteCorpusParams.Encoded | undefined
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Gets information about a specific `Document`.
   */
  readonly "GetDocument": (
    fileSearchStore: string,
    document: string
  ) => Effect.Effect<typeof Document.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Deletes a `Document`.
   */
  readonly "DeleteDocument": (
    fileSearchStore: string,
    document: string,
    options?: typeof DeleteDocumentParams.Encoded | undefined
  ) => Effect.Effect<typeof Empty.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Lists all `Document`s in a `Corpus`.
   */
  readonly "ListDocuments": (
    fileSearchStore: string,
    options?: typeof ListDocumentsParams.Encoded | undefined
  ) => Effect.Effect<typeof ListDocumentsResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Imports a `File` from File Service to a `FileSearchStore`.
   */
  readonly "ImportFile": (
    fileSearchStore: string,
    options: typeof ImportFileRequest.Encoded
  ) => Effect.Effect<typeof ImportFileOperation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Uploads data to a FileSearchStore, preprocesses and chunks before storing
   * it in a FileSearchStore Document.
   */
  readonly "UploadToFileSearchStore": (
    fileSearchStore: string,
    options: typeof UploadToFileSearchStoreRequest.Encoded
  ) => Effect.Effect<typeof UploadToFileSearchStoreOperation.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a response from the model given an input message.
   */
  readonly "GenerateText": (
    model: string,
    options: typeof GenerateTextRequest.Encoded
  ) => Effect.Effect<typeof GenerateTextResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates a response from the model given an input message.
   */
  readonly "GenerateTextByTunedModel": (
    tunedModel: string,
    options: typeof GenerateTextRequest.Encoded
  ) => Effect.Effect<typeof GenerateTextResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates an embedding from the model given an input message.
   */
  readonly "EmbedText": (
    model: string,
    options: typeof EmbedTextRequest.Encoded
  ) => Effect.Effect<typeof EmbedTextResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Generates multiple embeddings from the model given input text in a
   * synchronous call.
   */
  readonly "BatchEmbedText": (
    model: string,
    options: typeof BatchEmbedTextRequest.Encoded
  ) => Effect.Effect<typeof BatchEmbedTextResponse.Type, HttpClientError.HttpClientError | ParseError>
  /**
   * Runs a model's tokenizer on a text and returns the token count.
   */
  readonly "CountTextTokens": (
    model: string,
    options: typeof CountTextTokensRequest.Encoded
  ) => Effect.Effect<typeof CountTextTokensResponse.Type, HttpClientError.HttpClientError | ParseError>
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
