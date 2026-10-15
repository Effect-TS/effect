---
title: AiError.ts
nav_order: 1
parent: Modules
---

## AiError.ts overview

Defines shared errors for AI operations.

`AiError` records where a failure happened and stores the detailed reason in a
`reason` field. Those reasons cover transport problems, provider responses,
rate limits, authentication, content policy failures, invalid requests,
invalid output, unsupported schemas, tool failures, invalid user input, and
unknown failures. This module also includes metadata schemas, guards,
constructors, and helpers for converting HTTP response information into AI
error reasons.

Since v4.0.0

---

## Exports Grouped by Category

- [configuration](#configuration)
  - [AuthenticationErrorMetadata (interface)](#authenticationerrormetadata-interface)
  - [ContentPolicyErrorMetadata (interface)](#contentpolicyerrormetadata-interface)
  - [InternalProviderErrorMetadata (interface)](#internalprovidererrormetadata-interface)
  - [InvalidOutputErrorMetadata (interface)](#invalidoutputerrormetadata-interface)
  - [InvalidRequestErrorMetadata (interface)](#invalidrequesterrormetadata-interface)
  - [QuotaExhaustedErrorMetadata (interface)](#quotaexhaustederrormetadata-interface)
  - [RateLimitErrorMetadata (interface)](#ratelimiterrormetadata-interface)
  - [StructuredOutputErrorMetadata (interface)](#structuredoutputerrormetadata-interface)
  - [UnknownErrorMetadata (interface)](#unknownerrormetadata-interface)
  - [UnsupportedSchemaErrorMetadata (interface)](#unsupportedschemaerrormetadata-interface)
- [constructors](#constructors)
  - [make](#make)
  - [reasonFromHttpStatus](#reasonfromhttpstatus)
- [errors](#errors)
  - [AiErrorReason (type alias)](#aierrorreason-type-alias)
  - [AuthenticationError (class)](#authenticationerror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property)
  - [ContentPolicyError (class)](#contentpolicyerror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-1)
  - [InternalProviderError (class)](#internalprovidererror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-2)
  - [InvalidOutputError (class)](#invalidoutputerror-class)
    - [fromSchemaError (static method)](#fromschemaerror-static-method)
    - [[ReasonTypeId] (property)](#reasontypeid-property-3)
  - [InvalidRequestError (class)](#invalidrequesterror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-4)
  - [InvalidToolResultError (class)](#invalidtoolresulterror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-5)
  - [InvalidUserInputError (class)](#invaliduserinputerror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-6)
  - [NetworkError (class)](#networkerror-class)
    - [fromRequestError (static method)](#fromrequesterror-static-method)
    - [[ReasonTypeId] (property)](#reasontypeid-property-7)
  - [QuotaExhaustedError (class)](#quotaexhaustederror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-8)
  - [RateLimitError (class)](#ratelimiterror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-9)
  - [StructuredOutputError (class)](#structuredoutputerror-class)
    - [fromSchemaError (static method)](#fromschemaerror-static-method-1)
    - [[ReasonTypeId] (property)](#reasontypeid-property-10)
  - [ToolConfigurationError (class)](#toolconfigurationerror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-11)
  - [ToolNotFoundError (class)](#toolnotfounderror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-12)
  - [ToolParameterValidationError (class)](#toolparametervalidationerror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-13)
  - [ToolResultEncodingError (class)](#toolresultencodingerror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-14)
  - [ToolkitRequiredError (class)](#toolkitrequirederror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-15)
  - [UnknownError (class)](#unknownerror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-16)
  - [UnsupportedSchemaError (class)](#unsupportedschemaerror-class)
    - [[ReasonTypeId] (property)](#reasontypeid-property-17)
- [guards](#guards)
  - [isAiError](#isaierror)
  - [isAiErrorReason](#isaierrorreason)
- [models](#models)
  - [ProviderMetadata (type alias)](#providermetadata-type-alias)
- [schemas](#schemas)
  - [AiError (class)](#aierror-class)
    - [[TypeId] (property)](#typeid-property)
    - [cause (property)](#cause-property)
  - [AiErrorEncoded (type alias)](#aierrorencoded-type-alias)
  - [AiErrorReason](#aierrorreason)
  - [HttpContext](#httpcontext)
  - [HttpRequestDetails](#httprequestdetails)
  - [HttpResponseDetails](#httpresponsedetails)
  - [ProviderMetadata](#providermetadata)
  - [UsageInfo](#usageinfo)
- [utilities](#utilities)
  - [buildErrorDescription](#builderrordescription)

---

# configuration

## AuthenticationErrorMetadata (interface)

Provider-specific metadata attached to `AuthenticationError`.

**Signature**

```ts
export interface AuthenticationErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L324)

Since v4.0.0

## ContentPolicyErrorMetadata (interface)

Provider-specific metadata attached to `ContentPolicyError`.

**Signature**

```ts
export interface ContentPolicyErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L333)

Since v4.0.0

## InternalProviderErrorMetadata (interface)

Provider-specific metadata attached to `InternalProviderError`.

**Signature**

```ts
export interface InternalProviderErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L351)

Since v4.0.0

## InvalidOutputErrorMetadata (interface)

Provider-specific metadata attached to `InvalidOutputError`.

**Signature**

```ts
export interface InvalidOutputErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L360)

Since v4.0.0

## InvalidRequestErrorMetadata (interface)

Provider-specific metadata attached to `InvalidRequestError`.

**Signature**

```ts
export interface InvalidRequestErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L342)

Since v4.0.0

## QuotaExhaustedErrorMetadata (interface)

Provider-specific metadata attached to `QuotaExhaustedError`.

**Signature**

```ts
export interface QuotaExhaustedErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L315)

Since v4.0.0

## RateLimitErrorMetadata (interface)

Provider-specific metadata attached to `RateLimitError`.

**Signature**

```ts
export interface RateLimitErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L306)

Since v4.0.0

## StructuredOutputErrorMetadata (interface)

Provider-specific metadata attached to `StructuredOutputError`.

**Signature**

```ts
export interface StructuredOutputErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L369)

Since v4.0.0

## UnknownErrorMetadata (interface)

Provider-specific metadata attached to `UnknownError`.

**Signature**

```ts
export interface UnknownErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L387)

Since v4.0.0

## UnsupportedSchemaErrorMetadata (interface)

Provider-specific metadata attached to `UnsupportedSchemaError`.

**Signature**

```ts
export interface UnsupportedSchemaErrorMetadata extends ProviderMetadata {}
```

[Source](https://effect.website/blob/main/src/AiError.ts#L378)

Since v4.0.0

# constructors

## make

Creates an `AiError` with the given reason.

**Example** (Creating an AI error)

```ts
import { Duration } from "effect"
import { AiError } from "effect/ai"

const error = AiError.make({
  module: "OpenAI",
  method: "completion",
  reason: new AiError.RateLimitError({
    retryAfter: Duration.seconds(60)
  })
})

const result = [error.module, error.method, error.reason._tag] // => ["OpenAI", "completion", "RateLimitError"]
```

**Signature**

```ts
declare const make: (params: {
  readonly module: string
  readonly method: string
  readonly reason: AiErrorReason
}) => AiError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1755)

Since v4.0.0

## reasonFromHttpStatus

Maps HTTP status codes to semantic error reasons.

**When to use**

Use as the base mapping when provider packages translate HTTP status codes into
provider-specific error reasons.

**Example** (Mapping an HTTP status to a reason)

```ts
import { AiError } from "effect/ai"

const reason = AiError.reasonFromHttpStatus({
  status: 429,
  body: { error: "Rate limit exceeded" }
})

reason._tag // => "RateLimitError"
```

**Signature**

```ts
declare const reasonFromHttpStatus: (params: {
  readonly status: number
  readonly body?: unknown
  readonly http?: typeof HttpContext.Type
  readonly metadata?: ProviderMetadata
  readonly description?: string | undefined
}) => AiErrorReason
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1786)

Since v4.0.0

# errors

## AiErrorReason (type alias)

Union type of all semantic error reasons that can occur during AI operations.

**Details**

Every reason carries a semantic `_tag`, a human-readable message, and an
`isRetryable` getter. Provider-facing reasons may also include retry timing,
provider metadata, usage information, or HTTP context.

**Signature**

```ts
type AiErrorReason =
  | RateLimitError
  | QuotaExhaustedError
  | AuthenticationError
  | ContentPolicyError
  | InvalidRequestError
  | InternalProviderError
  | NetworkError
  | InvalidOutputError
  | StructuredOutputError
  | UnsupportedSchemaError
  | UnknownError
  | ToolNotFoundError
  | ToolParameterValidationError
  | InvalidToolResultError
  | ToolResultEncodingError
  | ToolConfigurationError
  | ToolkitRequiredError
  | InvalidUserInputError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1517)

Since v4.0.0

## AuthenticationError (class)

Error indicating authentication or authorization failure.

**Details**

Authentication errors are never retryable without credential changes.

**Example** (Creating an authentication error)

```ts
import { AiError } from "effect/ai"

const authError = new AiError.AuthenticationError({
  kind: "InvalidKey"
})

const result = [authError.kind, authError.isRetryable] // => ["InvalidKey", false]

const detailed = new AiError.AuthenticationError({
  kind: "InsufficientPermissions",
  description: "Token expired"
})

detailed.message // => "InsufficientPermissions: Your API key lacks required permissions. Token expired"
```

**Signature**

```ts
declare class AuthenticationError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L626)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `AuthenticationError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L641)

Since v4.0.0

## ContentPolicyError (class)

Error indicating content policy violation.

**Details**

Content policy errors are never retryable without content changes.

**Example** (Creating a content policy error)

```ts
import { AiError } from "effect/ai"

const policyError = new AiError.ContentPolicyError({
  description: "Input contains prohibited content"
})

const result = [policyError.description, policyError.isRetryable] // => ["Input contains prohibited content", false]
```

**Signature**

```ts
declare class ContentPolicyError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L690)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `ContentPolicyError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L704)

Since v4.0.0

## InternalProviderError (class)

Error indicating the AI provider experienced an internal error.

**Details**

Internal provider errors are typically transient and are retryable.

**Example** (Creating an internal provider error)

```ts
import { AiError } from "effect/ai"

const providerError = new AiError.InternalProviderError({
  description: "Server encountered an unexpected error"
})

const result = [providerError.description, providerError.isRetryable] // => ["Server encountered an unexpected error", true]
```

**Signature**

```ts
declare class InternalProviderError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L806)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `InternalProviderError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L820)

Since v4.0.0

## InvalidOutputError (class)

Error indicating failure to parse or validate LLM output.

**Details**

Invalid output errors are retryable since LLM outputs are non-deterministic.

**Example** (Creating an invalid output error)

```ts
import { AiError } from "effect/ai"

const parseError = new AiError.InvalidOutputError({
  description: "Expected a string but received a number"
})

const result = [parseError.description, parseError.isRetryable] // => ["Expected a string but received a number", true]
```

**Signature**

```ts
declare class InvalidOutputError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L860)

Since v4.0.0

### fromSchemaError (static method)

Creates an InvalidOutputError from a Schema error.

**Example** (Creating an invalid output error from a schema error)

```ts
import { Effect, Schema } from "effect"
import { AiError } from "effect/ai"

const schemaError = await Effect.runPromise(Schema.decodeUnknownEffect(Schema.Number)("not a number").pipe(Effect.flip))
const parseError = AiError.InvalidOutputError.fromSchemaError(schemaError)
parseError.description // => "Expected number"
```

**Signature**

```ts
declare const fromSchemaError: (error: Schema.SchemaError) => InvalidOutputError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L905)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `InvalidOutputError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L874)

Since v4.0.0

## InvalidRequestError (class)

Error indicating the request had invalid or malformed parameters.

**Details**

Invalid request errors require fixing the request and are not retryable.

**Example** (Creating an invalid request error)

```ts
import { AiError } from "effect/ai"

const invalidRequestError = new AiError.InvalidRequestError({
  parameter: "temperature",
  constraint: "must be between 0 and 2",
  description: "Temperature value 5 is out of range"
})

const result = [invalidRequestError.parameter, invalidRequestError.isRetryable] // => ["temperature", false]
```

**Signature**

```ts
declare class InvalidRequestError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L746)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `InvalidRequestError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L762)

Since v4.0.0

## InvalidToolResultError (class)

Error indicating the tool handler returned an invalid result that does not
match the tool's schema.

**Details**

This error is not retryable because invalid results indicate a bug in the
tool handler implementation.

**Example** (Creating an invalid tool result error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.InvalidToolResultError({
  toolName: "GetWeather",
  description: "Tool handler returned invalid result: missing 'temperature' field"
})

const result = [error.toolName, error.isRetryable] // => ["GetWeather", false]
```

**Signature**

```ts
declare class InvalidToolResultError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1249)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `InvalidToolResultError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1262)

Since v4.0.0

## InvalidUserInputError (class)

Error indicating the user provided invalid input in their prompt.

**Details**

This error is raised when the prompt contains content that is structurally
valid but not supported by the provider (e.g., unsupported media types,
unsupported file formats, etc.).

**Example** (Creating an invalid user input error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.InvalidUserInputError({
  description: "Unsupported media type 'video/mp4'. Supported types include images, application/pdf, text/plain"
})

const result = [error._tag, error.isRetryable] // => ["InvalidUserInputError", false]
```

**Signature**

```ts
declare class InvalidUserInputError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1471)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `InvalidUserInputError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1483)

Since v4.0.0

## NetworkError (class)

Error indicating a network-level failure before receiving a response.

**Details**

This error is raised when issues arise before receiving an HTTP response,
such as network connectivity problems, request encoding issues, or invalid
URLs.

**Example** (Creating a network error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.NetworkError({
  reason: "TransportError",
  request: {
    method: "POST",
    url: "https://api.openai.com/v1/completions",
    urlParams: [],
    hash: undefined,
    headers: { "Content-Type": "application/json" }
  },
  description: "Connection timeout after 30 seconds"
})

const result = [error.reason, error.isRetryable] // => ["TransportError", true]
```

**Signature**

```ts
declare class NetworkError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L151)

Since v4.0.0

### fromRequestError (static method)

Creates a NetworkError from a platform HttpClientError.RequestError.

**Example** (Creating a network error from a request error)

```ts
import { AiError } from "effect/ai"
import { HttpClientError, HttpClientRequest } from "effect/http"

const platformError = new HttpClientError.TransportError({
  request: HttpClientRequest.get("https://example.com/models"),
  description: "Connection refused"
})

const aiError = AiError.NetworkError.fromRequestError(platformError)
aiError.reason // => "TransportError"
```

**Signature**

```ts
declare const fromRequestError: (error: HttpClientError.RequestError) => NetworkError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L198)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `NetworkError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L165)

Since v4.0.0

## QuotaExhaustedError (class)

Error indicating account or billing limits have been reached.

**Details**

Quota exhausted errors are not retryable without user action.

**Example** (Creating a quota exhausted error)

```ts
import { AiError } from "effect/ai"

const quotaError = new AiError.QuotaExhaustedError({})

const result = [quotaError._tag, quotaError.isRetryable] // => ["QuotaExhaustedError", false]
```

**Signature**

```ts
declare class QuotaExhaustedError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L563)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `QuotaExhaustedError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L577)

Since v4.0.0

## RateLimitError (class)

Error indicating the request was rate limited.

**Details**

Rate limit errors are always retryable. When `retryAfter` is provided,
callers should wait that duration before retrying.

**Example** (Creating a rate limit error)

```ts
import { Duration } from "effect"
import { AiError } from "effect/ai"

const rateLimitError = new AiError.RateLimitError({
  retryAfter: Duration.seconds(60)
})

const result = [rateLimitError._tag, rateLimitError.isRetryable] // => ["RateLimitError", true]
```

**Signature**

```ts
declare class RateLimitError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L509)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `RateLimitError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L523)

Since v4.0.0

## StructuredOutputError (class)

Error indicating the LLM generated text that does not conform to the
requested structured output schema.

**Details**

Structured output errors are retryable since LLM outputs are non-deterministic.

**Example** (Creating a structured output error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.StructuredOutputError({
  description: "Expected a valid JSON object",
  responseText: '{"foo":}'
})

const result = [error.description, error.responseText, error.isRetryable] // => ["Expected a valid JSON object", '{"foo":}', true]
```

**Signature**

```ts
declare class StructuredOutputError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L941)

Since v4.0.0

### fromSchemaError (static method)

Creates a StructuredOutputError from a Schema error.

**Example** (Creating a structured output error from a schema error)

```ts
import { Effect, Schema } from "effect"
import { AiError } from "effect/ai"

const schemaError = await Effect.runPromise(
  Schema.decodeUnknownEffect(Schema.Struct({ name: Schema.String }))({}).pipe(Effect.flip)
)
const parseError = AiError.StructuredOutputError.fromSchemaError(schemaError, "{}")
parseError.responseText // => "{}"
```

**Signature**

```ts
declare const fromSchemaError: (error: Schema.SchemaError, responseText: string) => StructuredOutputError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L987)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `StructuredOutputError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L956)

Since v4.0.0

## ToolConfigurationError (class)

Error indicating a provider-defined tool was configured with invalid arguments.

**Details**

This error is not retryable because it indicates a programming error in the
tool configuration that must be fixed in code.

**Example** (Creating a tool configuration error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.ToolConfigurationError({
  toolName: "OpenAiCodeInterpreter",
  description: "Invalid container ID format"
})

const result = [error.toolName, error.description, error.isRetryable] // => ["OpenAiCodeInterpreter", "Invalid container ID format", false]
```

**Signature**

```ts
declare class ToolConfigurationError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1361)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `ToolConfigurationError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1374)

Since v4.0.0

## ToolNotFoundError (class)

Error indicating the model requested a tool that doesn't exist in the toolkit.

**Details**

This error is retryable because the model may self-correct when provided
with the list of available tools.

**Example** (Creating a tool not found error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.ToolNotFoundError({
  toolName: "unknownTool",
  availableTools: ["GetWeather", "GetTime"]
})

const result = [error.toolName, error.availableTools, error.isRetryable] // => ["unknownTool", ["GetWeather", "GetTime"], true]
```

**Signature**

```ts
declare class ToolNotFoundError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1137)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `ToolNotFoundError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1150)

Since v4.0.0

## ToolParameterValidationError (class)

Error indicating the model's tool call parameters failed schema validation.

**Details**

This error is retryable because the model may correct its parameters
on subsequent attempts.

**Example** (Creating a tool parameter validation error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.ToolParameterValidationError({
  toolName: "GetWeather",
  description: "Expected string, got number"
})

const result = [error.toolName, error.description, error.isRetryable] // => ["GetWeather", "Expected string, got number", true]
```

**Signature**

```ts
declare class ToolParameterValidationError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1193)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `ToolParameterValidationError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1206)

Since v4.0.0

## ToolResultEncodingError (class)

Error indicating the tool result cannot be encoded for sending back to the model.

**Details**

This error is not retryable because encoding failures indicate a bug in the
tool schema definitions.

**Example** (Creating a tool result encoding error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.ToolResultEncodingError({
  toolName: "GetWeather",
  toolResult: { temperature: 72n },
  description: "Cannot encode bigint values as JSON"
})

const result = [error.toolName, error.description, error.isRetryable] // => ["GetWeather", "Cannot encode bigint values as JSON", false]
```

**Signature**

```ts
declare class ToolResultEncodingError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1305)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `ToolResultEncodingError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1319)

Since v4.0.0

## ToolkitRequiredError (class)

Error indicating an operation requires a toolkit but none was provided.

**Details**

This error occurs when tool approval responses are present in the prompt
but no toolkit was provided to resolve them.

**Example** (Creating a toolkit required error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.ToolkitRequiredError({
  pendingApprovals: ["GetWeather", "SendEmail"]
})

const result = [error.pendingApprovals, error.isRetryable] // => [["GetWeather", "SendEmail"], false]
```

**Signature**

```ts
declare class ToolkitRequiredError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1415)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `ToolkitRequiredError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1428)

Since v4.0.0

## UnknownError (class)

Error data for unknown or unexpected AI failures.

**Details**

Unknown errors are not retryable by default since the cause is unknown.

**Example** (Creating an unknown error)

```ts
import { AiError } from "effect/ai"

const unknownError = new AiError.UnknownError({
  description: "An unexpected error occurred"
})

const result = [unknownError.description, unknownError.isRetryable] // => ["An unexpected error occurred", false]
```

**Signature**

```ts
declare class UnknownError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1077)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `UnknownError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1091)

Since v4.0.0

## UnsupportedSchemaError (class)

Error indicating a codec transformer rejected a schema because it contains
unsupported constructs.

**Details**

Unsupported schema errors are not retryable because they indicate a
programmer error where the schema is incompatible with the provider.

**Example** (Creating an unsupported schema error)

```ts
import { AiError } from "effect/ai"

const error = new AiError.UnsupportedSchemaError({
  description: "Unions are not supported in Anthropic structured output"
})

const result = [error.description, error.isRetryable] // => ["Unions are not supported in Anthropic structured output", false]
```

**Signature**

```ts
declare class UnsupportedSchemaError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1024)

Since v4.0.0

### [ReasonTypeId] (property)

Marks `UnsupportedSchemaError` as a semantic AI error reason for runtime guards.

**Signature**

```ts
readonly [ReasonTypeId]: "~effect/ai/AiError/Reason"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1037)

Since v4.0.0

# guards

## isAiError

Type guard to check if a value is an `AiError`.

**Example** (Checking for an AI error)

```ts
import { AiError } from "effect/ai"

const someError = new Error("generic error")
const aiError = AiError.make({
  module: "Test",
  method: "example",
  reason: new AiError.RateLimitError({})
})

const result = [AiError.isAiError(someError), AiError.isAiError(aiError)] // => [false, true]
```

**Signature**

```ts
declare const isAiError: (u: unknown) => u is AiError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1709)

Since v4.0.0

## isAiErrorReason

Type guard to check if a value is an `AiErrorReason`.

**Example** (Checking for an AI error reason)

```ts
import { AiError } from "effect/ai"

const rateLimitError = new AiError.RateLimitError({})
const genericError = new Error("generic error")

const result = [AiError.isAiErrorReason(rateLimitError), AiError.isAiErrorReason(genericError)] // => [true, false]
```

**Signature**

```ts
declare const isAiErrorReason: (u: unknown) => u is AiErrorReason
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1729)

Since v4.0.0

# models

## ProviderMetadata (type alias)

Type of provider-specific metadata attached to AI error reasons.

**Details**

Metadata is keyed by provider name, and each provider value is either mutable
JSON metadata or `null`.

**Signature**

```ts
type ProviderMetadata = typeof ProviderMetadata.Type
```

[Source](https://effect.website/blob/main/src/AiError.ts#L297)

Since v4.0.0

# schemas

## AiError (class)

Schema for the top-level AI error wrapper using the `reason` pattern.

**When to use**

Use when you need AI errors that can be handled by semantic reason with
`Effect.catchReason`.

**Details**

This error stores `module` and `method` context, the semantic `reason`, and
delegates `isRetryable` and `retryAfter` to the underlying reason.

**Example** (Handling an AI error by tag)

```ts
import { Duration, Effect } from "effect"
import { AiError } from "effect/ai"

const aiOperation = Effect.fail(
  new AiError.AiError({
    module: "OpenAI",
    method: "generateText",
    reason: new AiError.RateLimitError({ retryAfter: Duration.seconds(30) })
  })
)

// Handle specific reason types
const handled = aiOperation.pipe(
  Effect.catchTag("AiError", (error) => {
    if (error.reason._tag === "RateLimitError") {
      return Effect.succeed(`Retry after ${error.retryAfter}`)
    }
    return Effect.fail(error)
  })
)

await Effect.runPromise(handled) // => "Retry after 30000 millis"
```

**Signature**

```ts
declare class AiError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1642)

Since v4.0.0

### [TypeId] (property)

**Signature**

```ts
readonly [TypeId]: "~effect/ai/AiError"
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1650)

### cause (property)

**Signature**

```ts
readonly cause: RateLimitError | QuotaExhaustedError | AuthenticationError | ContentPolicyError | InvalidRequestError | InternalProviderError | NetworkError | InvalidOutputError | StructuredOutputError | UnsupportedSchemaError | UnknownError | ToolNotFoundError | ToolParameterValidationError | InvalidToolResultError | ToolResultEncodingError | ToolConfigurationError | ToolkitRequiredError | InvalidUserInputError
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1651)

## AiErrorEncoded (type alias)

The encoded (serialized) form of an `AiError`.

**Signature**

```ts
type AiErrorEncoded = (typeof AiError)["Encoded"]
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1685)

Since v4.0.0

## AiErrorReason

Schema for validating and parsing AI error reasons.

**When to use**

Use when decoding or validating unknown AI error reason values with Schema.

**Details**

This runtime schema is the union of the concrete AI error reason classes.

**See**

- `isAiErrorReason` for checking an existing value without Schema decoding

**Signature**

```ts
declare const AiErrorReason: Schema.Union<
  [
    typeof RateLimitError,
    typeof QuotaExhaustedError,
    typeof AuthenticationError,
    typeof ContentPolicyError,
    typeof InvalidRequestError,
    typeof InternalProviderError,
    typeof NetworkError,
    typeof InvalidOutputError,
    typeof StructuredOutputError,
    typeof UnsupportedSchemaError,
    typeof UnknownError,
    typeof ToolNotFoundError,
    typeof ToolParameterValidationError,
    typeof InvalidToolResultError,
    typeof ToolResultEncodingError,
    typeof ToolConfigurationError,
    typeof ToolkitRequiredError,
    typeof InvalidUserInputError
  ]
>
```

[Source](https://effect.website/blob/main/src/AiError.ts#L1554)

Since v4.0.0

## HttpContext

Schema for the combined HTTP context used in error reporting.

**When to use**

Use to attach request details, optional response details, and optional body
text to AI provider errors.

**Details**

Includes the required request details plus optional response details and raw
response body.

**See**

- `HttpRequestDetails` for captured request details
- `HttpResponseDetails` for captured response details

**Signature**

```ts
declare const HttpContext: Schema.Struct<{
  readonly request: Schema.Struct<{
    readonly method: Schema.String
    readonly url: Schema.String
    readonly urlParams: Schema.$Array<
      Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Redacted<Schema.String>]>]>
    >
    readonly hash: Schema.optional<Schema.String>
    readonly headers: Schema.$Record<
      Schema.String,
      Schema.Union<readonly [Schema.String, Schema.Redacted<Schema.String>]>
    >
  }>
  readonly response: Schema.optional<
    Schema.Struct<{
      readonly status: Schema.Int
      readonly headers: Schema.$Record<
        Schema.String,
        Schema.Union<readonly [Schema.String, Schema.Redacted<Schema.String>]>
      >
    }>
  >
  readonly body: Schema.optional<Schema.String>
}>
```

[Source](https://effect.website/blob/main/src/AiError.ts#L427)

Since v4.0.0

## HttpRequestDetails

Schema for HTTP requests to an AI provider.

**Example** (Describing an HTTP request)

```ts
import type { AiError } from "effect/ai"

const requestDetails: typeof AiError.HttpRequestDetails.Type = {
  method: "POST",
  url: "https://api.openai.com/v1/responses",
  urlParams: [],
  hash: undefined,
  headers: { "Content-Type": "application/json" }
}
const result = [requestDetails.method, requestDetails.urlParams] // => ["POST", []]
```

**Signature**

```ts
declare const HttpRequestDetails: Schema.Struct<{
  readonly method: Schema.String
  readonly url: Schema.String
  readonly urlParams: Schema.$Array<
    Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Redacted<Schema.String>]>]>
  >
  readonly hash: Schema.optional<Schema.String>
  readonly headers: Schema.$Record<
    Schema.String,
    Schema.Union<readonly [Schema.String, Schema.Redacted<Schema.String>]>
  >
}>
```

[Source](https://effect.website/blob/main/src/AiError.ts#L47)

Since v4.0.0

## HttpResponseDetails

Schema for HTTP responses from an AI provider.

**Example** (Describing an HTTP response)

```ts
import type { AiError } from "effect/ai"

const responseDetails: typeof AiError.HttpResponseDetails.Type = {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "X-Request-Id": "req_abc123"
  }
}
const result = [responseDetails.status, responseDetails.headers["X-Request-Id"]] // => [200, "req_abc123"]
```

**Signature**

```ts
declare const HttpResponseDetails: Schema.Struct<{
  readonly status: Schema.Int
  readonly headers: Schema.$Record<
    Schema.String,
    Schema.Union<readonly [Schema.String, Schema.Redacted<Schema.String>]>
  >
}>
```

[Source](https://effect.website/blob/main/src/AiError.ts#L85)

Since v4.0.0

## ProviderMetadata

Schema for provider-specific metadata which can be attached to error reasons.

**Details**

Provider-specific metadata is namespaced by provider name. Each provider
value can contain arbitrary mutable JSON metadata or `null`.

**Example** (Inspecting metadata shape)

```ts
const metadata = {
  openai: {
    errorCode: "rate_limit_exceeded",
    requestId: "req_123"
  },
  anthropic: null
}

Array.of(metadata.openai.errorCode, metadata.anthropic) // => ["rate_limit_exceeded", null]
```

**Signature**

```ts
declare const ProviderMetadata: Schema.$Record<
  Schema.String,
  Schema.NullOr<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>>
>
```

[Source](https://effect.website/blob/main/src/AiError.ts#L280)

Since v4.0.0

## UsageInfo

Schema for token usage information from AI operations.

**Details**

Schema for optional provider-reported token counts for prompt tokens,
completion tokens, and total tokens.

**Signature**

```ts
declare const UsageInfo: Schema.Struct<{
  readonly promptTokens: Schema.optional<Schema.Int>
  readonly completionTokens: Schema.optional<Schema.Int>
  readonly totalTokens: Schema.optional<Schema.Int>
}>
```

[Source](https://effect.website/blob/main/src/AiError.ts#L401)

Since v4.0.0

# utilities

## buildErrorDescription

Builds a description for an HTTP error returned by an AI provider.

**Signature**

```ts
declare const buildErrorDescription: (params: {
  readonly status: number
  readonly message: string | undefined
  readonly method: string
  readonly url: string
  readonly errorCode?: string | number | null | undefined
  readonly errorType?: string | null | undefined
  readonly requestId?: string | null | undefined
  readonly body: string | undefined
}) => string
```

[Source](https://effect.website/blob/main/src/AiError.ts#L440)

Since v4.0.0
