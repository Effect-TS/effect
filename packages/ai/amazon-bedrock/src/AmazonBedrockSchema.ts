/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"

const prefix = "@effect/ai-amazon-bedrock"

const makeIdentifier = (name: string) => `${prefix}/${name}`

/**
 * The foundation models supported by Amazon Bedrock.
 *
 * An up-to-date list can be generated with the following command:
 *
 * ```sh
 * aws bedrock list-foundation-models --output json | jq '[.modelSummaries[].modelId]'
 * ```
 *
 * @since 1.0.0
 * @category Schemas
 */
export class BedrockFoundationModelId extends Schema.Literal(
  "amazon.titan-tg1-large",
  "amazon.titan-image-generator-v1:0",
  "amazon.titan-image-generator-v1",
  "amazon.titan-image-generator-v2:0",
  "amazon.nova-premier-v1:0:8k",
  "amazon.nova-premier-v1:0:20k",
  "amazon.nova-premier-v1:0:1000k",
  "amazon.nova-premier-v1:0:mm",
  "amazon.nova-premier-v1:0",
  "amazon.titan-text-premier-v1:0",
  "amazon.nova-pro-v1:0:24k",
  "amazon.nova-pro-v1:0:300k",
  "amazon.nova-pro-v1:0",
  "amazon.nova-lite-v1:0:24k",
  "amazon.nova-lite-v1:0:300k",
  "amazon.nova-lite-v1:0",
  "amazon.nova-canvas-v1:0",
  "amazon.nova-reel-v1:0",
  "amazon.nova-reel-v1:1",
  "amazon.nova-micro-v1:0:24k",
  "amazon.nova-micro-v1:0:128k",
  "amazon.nova-micro-v1:0",
  "amazon.nova-sonic-v1:0",
  "amazon.titan-embed-g1-text-02",
  "amazon.titan-text-lite-v1:0:4k",
  "amazon.titan-text-lite-v1",
  "amazon.titan-text-express-v1:0:8k",
  "amazon.titan-text-express-v1",
  "amazon.titan-embed-text-v1:2:8k",
  "amazon.titan-embed-text-v1",
  "amazon.titan-embed-text-v2:0:8k",
  "amazon.titan-embed-text-v2:0",
  "amazon.titan-embed-image-v1:0",
  "amazon.titan-embed-image-v1",
  "stability.stable-diffusion-xl-v1:0",
  "stability.stable-diffusion-xl-v1",
  "ai21.jamba-instruct-v1:0",
  "ai21.jamba-1-5-large-v1:0",
  "ai21.jamba-1-5-mini-v1:0",
  "anthropic.claude-instant-v1:2:100k",
  "anthropic.claude-instant-v1",
  "anthropic.claude-v2:0:18k",
  "anthropic.claude-v2:0:100k",
  "anthropic.claude-v2:1:18k",
  "anthropic.claude-v2:1:200k",
  "anthropic.claude-v2:1",
  "anthropic.claude-v2",
  "anthropic.claude-3-sonnet-20240229-v1:0:28k",
  "anthropic.claude-3-sonnet-20240229-v1:0:200k",
  "anthropic.claude-3-sonnet-20240229-v1:0",
  "anthropic.claude-3-haiku-20240307-v1:0:48k",
  "anthropic.claude-3-haiku-20240307-v1:0:200k",
  "anthropic.claude-3-haiku-20240307-v1:0",
  "anthropic.claude-3-opus-20240229-v1:0:12k",
  "anthropic.claude-3-opus-20240229-v1:0:28k",
  "anthropic.claude-3-opus-20240229-v1:0:200k",
  "anthropic.claude-3-opus-20240229-v1:0",
  "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "anthropic.claude-3-7-sonnet-20250219-v1:0",
  "anthropic.claude-3-5-haiku-20241022-v1:0",
  "anthropic.claude-opus-4-20250514-v1:0",
  "anthropic.claude-sonnet-4-20250514-v1:0",
  "cohere.command-text-v14:7:4k",
  "cohere.command-text-v14",
  "cohere.command-r-v1:0",
  "cohere.command-r-plus-v1:0",
  "cohere.command-light-text-v14:7:4k",
  "cohere.command-light-text-v14",
  "cohere.embed-english-v3:0:512",
  "cohere.embed-english-v3",
  "cohere.embed-multilingual-v3:0:512",
  "cohere.embed-multilingual-v3",
  "deepseek.r1-v1:0",
  "meta.llama3-8b-instruct-v1:0",
  "meta.llama3-70b-instruct-v1:0",
  "meta.llama3-1-8b-instruct-v1:0",
  "meta.llama3-1-70b-instruct-v1:0",
  "meta.llama3-2-11b-instruct-v1:0",
  "meta.llama3-2-90b-instruct-v1:0",
  "meta.llama3-2-1b-instruct-v1:0",
  "meta.llama3-2-3b-instruct-v1:0",
  "meta.llama3-3-70b-instruct-v1:0",
  "meta.llama4-scout-17b-instruct-v1:0",
  "meta.llama4-maverick-17b-instruct-v1:0",
  "mistral.mistral-7b-instruct-v0:2",
  "mistral.mixtral-8x7b-instruct-v0:1",
  "mistral.mistral-large-2402-v1:0",
  "mistral.mistral-small-2402-v1:0",
  "mistral.pixtral-large-2502-v1:0"
) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class CachePointBlock extends Schema.Class<CachePointBlock>(makeIdentifier("CachePointBlock"))({
  type: Schema.Literal("default")
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const DocumentFormat = Schema.Literal(
  "csv",
  "doc",
  "docx",
  "html",
  "md",
  "pdf",
  "txt",
  "xls",
  "xlsx"
)
/**
 * @since 1.0.0
 * @category Schemas
 */
export type DocumentFormat = typeof DocumentFormat.Type

/**
 * @since 1.0.0
 * @category Schemas
 */
export class DocumentBlock extends Schema.Class<DocumentBlock>(makeIdentifier("DocumentBlock"))({
  name: Schema.String.pipe(
    Schema.pattern(/^[a-zA-Z0-9()[\]-]+(?: [a-zA-Z0-9()[\]-]+)*$/),
    Schema.minLength(1),
    Schema.maxLength(200)
  ),
  format: DocumentFormat,
  source: Schema.Struct({
    bytes: Schema.NonEmptyString
  })
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailConverseImageBlock extends Schema.Class<GuardrailConverseImageBlock>(
  makeIdentifier("GuardrailConverseImageBlock")
)({
  format: Schema.Literal("png", "jpg"),
  source: Schema.Struct({
    bytes: Schema.NonEmptyString
  })
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailConverseTextBlock extends Schema.Class<GuardrailConverseTextBlock>(
  makeIdentifier("GuardrailConverseTextBlock")
)({
  text: Schema.String,
  qualifiers: Schema.optional(Schema.Array(Schema.Literal("guard_content", "grounding_source", "query")))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailConverseContentBlock extends Schema.Union(
  GuardrailConverseImageBlock,
  GuardrailConverseTextBlock
) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const ImageFormat = Schema.Literal("gif", "jpeg", "png", "webp")
/**
 * @since 1.0.0
 * @category Schemas
 */
export type ImageFormat = typeof ImageFormat.Type

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ImageBlock extends Schema.Class<ImageBlock>(makeIdentifier("ImageBlock"))({
  format: ImageFormat,
  source: Schema.Struct({
    bytes: Schema.NonEmptyString
  })
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class JsonBlock extends Schema.Class<JsonBlock>(makeIdentifier("JsonBlock"))({
  json: Schema.Unknown
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ReasoningContentBlock extends Schema.Union(
  Schema.Struct({
    reasoningText: Schema.Struct({
      text: Schema.String,
      signature: Schema.optional(Schema.String)
    })
  }).pipe(
    Schema.attachPropertySignature("type", "reasoning"),
    Schema.annotations({ identifier: "ReasoningTextContentBlock" })
  ),
  Schema.Struct({
    redactedContent: Schema.String
  }).pipe(
    Schema.attachPropertySignature("type", "redacted-reasoning"),
    Schema.annotations({ identifier: "RedactedReasoningContentBlock" })
  )
) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class VideoBlock extends Schema.Class<VideoBlock>(makeIdentifier("VideoBlock"))({
  format: Schema.Literal("flv", "mkv", "mov", "mp4", "mpg", "mpeg", "three_gp", "webm"),
  source: Schema.Union(
    Schema.Struct({
      bytes: Schema.NonEmptyString
    }),
    Schema.Struct({
      s3Location: Schema.Struct({
        uri: Schema.String.pipe(
          Schema.pattern(/^s3:\/\/[a-z0-9][.\-a-z0-9]{1,61}[a-z0-9](\/.*)?$/),
          Schema.minLength(1),
          Schema.maxLength(1024)
        ),
        bucketOwner: Schema.String.pipe(
          Schema.pattern(/^[0-9]{12}$/),
          Schema.optional
        )
      })
    })
  )
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ToolResultBlock extends Schema.Class<ToolResultBlock>(makeIdentifier("ToolResultBlock"))({
  content: Schema.Array(Schema.Union(
    Schema.Struct({ document: DocumentBlock }),
    Schema.Struct({ image: ImageBlock }),
    Schema.Struct({ text: Schema.String }),
    Schema.Struct({ json: JsonBlock }),
    Schema.Struct({ video: VideoBlock })
  )),
  toolUseId: Schema.String.pipe(
    Schema.pattern(/^[a-zA-Z0-9_-]+$/),
    Schema.minLength(1),
    Schema.maxLength(64)
  ),
  status: Schema.optional(Schema.Literal("success", "error"))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ToolUseBlock extends Schema.Class<ToolUseBlock>(makeIdentifier("ToolUseBlock"))({
  name: Schema.String.pipe(
    Schema.pattern(/^[a-zA-Z0-9_-]+$/),
    Schema.minLength(1),
    Schema.maxLength(64)
  ),
  input: Schema.Unknown,
  toolUseId: Schema.String.pipe(
    Schema.pattern(/^[a-zA-Z0-9_-]+$/),
    Schema.minLength(1),
    Schema.maxLength(64)
  )
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ContentBlock extends Schema.Union(
  Schema.Struct({ cachePoint: CachePointBlock }).pipe(
    Schema.attachPropertySignature("type", "cachePoint"),
    Schema.annotations({ identifier: "CachePointContentBlock" })
  ),
  Schema.Struct({ document: DocumentBlock }).pipe(
    Schema.attachPropertySignature("type", "document"),
    Schema.annotations({ identifier: "DocumentContentBlock" })
  ),
  Schema.Struct({ guardContent: GuardrailConverseContentBlock }).pipe(
    Schema.attachPropertySignature("type", "guardContent"),
    Schema.annotations({ identifier: "GuardrailContentBlock" })
  ),
  Schema.Struct({ image: ImageBlock }).pipe(
    Schema.attachPropertySignature("type", "image"),
    Schema.annotations({ identifier: "ImageContentBlock" })
  ),
  Schema.Struct({ reasoningContent: ReasoningContentBlock }).pipe(
    Schema.attachPropertySignature("type", "reasoningContent"),
    Schema.annotations({ identifier: "ResponseContentBlock" })
  ),
  Schema.Struct({ text: Schema.String }).pipe(
    Schema.attachPropertySignature("type", "text"),
    Schema.annotations({ identifier: "TextContentBlock" })
  ),
  Schema.Struct({ toolResult: ToolResultBlock }).pipe(
    Schema.attachPropertySignature("type", "toolResult"),
    Schema.annotations({ identifier: "ToolResultContentBlock" })
  ),
  Schema.Struct({ toolUse: ToolUseBlock }).pipe(
    Schema.attachPropertySignature("type", "toolUse"),
    Schema.annotations({ identifier: "ToolUseContentBlock" })
  ),
  Schema.Struct({ video: VideoBlock }).pipe(
    Schema.attachPropertySignature("type", "video"),
    Schema.annotations({ identifier: "VideoContentBlock" })
  )
) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class Message extends Schema.Class<Message>(makeIdentifier("Message"))({
  role: Schema.Literal("user", "assistant"),
  content: Schema.Array(ContentBlock)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ConverseOutput extends Schema.Class<ConverseOutput>(makeIdentifier("ConverseOutput"))({
  message: Message
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ConverseMetrics extends Schema.Class<ConverseMetrics>(makeIdentifier("ConverseMetrics"))({
  latencyMs: Schema.DurationFromMillis
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailContentFilter extends Schema.Class<GuardrailContentFilter>(
  makeIdentifier("GuardrailContentFilter")
)({
  type: Schema.Literal("HATE", "INSULTS", "MISCONDUCT", "PROMPT_ATTACK", "SEXUAL", "VIOLENCE"),
  action: Schema.Literal("BLOCKED", "NONE"),
  confidence: Schema.Literal("NONE", "LOW", "MEDIUM", "HIGH"),
  detected: Schema.optional(Schema.Boolean),
  filterStrength: Schema.optional(Schema.Literal("NONE", "LOW", "MEDIUM", "HIGH"))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailContentPolicyAssessment extends Schema.Class<GuardrailContentPolicyAssessment>(
  makeIdentifier("GuardrailContentPolicyAssessment")
)({
  filters: Schema.Array(GuardrailContentFilter)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailContextualGroundingFilter extends Schema.Class<GuardrailContextualGroundingFilter>(
  makeIdentifier("GuardrailContextualGroundingFilter")
)({
  type: Schema.Literal("GROUNDING", "RELEVANCE"),
  action: Schema.Literal("BLOCKED", "NONE"),
  score: Schema.Number.pipe(Schema.between(0, 1)),
  threshold: Schema.Number.pipe(Schema.between(0, 1)),
  detected: Schema.optional(Schema.Boolean)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailContextualGroundingPolicyAssessment
  extends Schema.Class<GuardrailContextualGroundingPolicyAssessment>(
    makeIdentifier("GuardrailContextualGroundingPolicyAssessment")
  )({
    filters: Schema.optional(Schema.Array(GuardrailContextualGroundingFilter))
  })
{}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailImageCoverage extends Schema.Class<GuardrailImageCoverage>(
  makeIdentifier("GuardrailImageCoverage")
)({
  guarded: Schema.optional(Schema.Int),
  total: Schema.optional(Schema.Int)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailTextCharactersCoverage extends Schema.Class<GuardrailTextCharactersCoverage>(
  makeIdentifier("GuardrailTextCharactersCoverage")
)({
  guarded: Schema.optional(Schema.Int),
  total: Schema.optional(Schema.Int)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailCoverage extends Schema.Class<GuardrailCoverage>(makeIdentifier("GuardrailCoverage"))({
  images: Schema.optional(GuardrailImageCoverage),
  textCharacters: Schema.optional(GuardrailTextCharactersCoverage)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailUsage extends Schema.Class<GuardrailUsage>(makeIdentifier("GuardrailUsage"))({
  contentPolicyUnits: Schema.Int,
  contextualGroundingPolicyUnits: Schema.Int,
  sensitiveInformationPolicyFreeUnits: Schema.Int,
  sensitiveInformationPolicyUnits: Schema.Int,
  topicPolicyUnits: Schema.Int,
  wordPolicyUnits: Schema.Int,
  contentPolicyImageUnits: Schema.optional(Schema.Int)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailInvocationMetrics extends Schema.Class<GuardrailInvocationMetrics>(
  makeIdentifier("GuardrailInvocationMetrics")
)({
  guardrailCoverage: Schema.optional(GuardrailCoverage),
  guardrailProcessingLatency: Schema.optional(Schema.Number),
  usage: Schema.optional(GuardrailUsage)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailPiiEntityFilter extends Schema.Class<GuardrailPiiEntityFilter>(
  makeIdentifier("GuardrailPiiEntityFilter")
)({
  type: Schema.Literal(
    "ADDRESS",
    "AGE",
    "AWS_ACCESS_KEY",
    "AWS_SECRET_KEY",
    "CA_HEALTH_NUMBER",
    "CA_SOCIAL_INSURANCE_NUMBER",
    "CREDIT_DEBIT_CARD_CVV",
    "CREDIT_DEBIT_CARD_EXPIRY",
    "CREDIT_DEBIT_CARD_NUMBER",
    "DRIVER_ID",
    "EMAIL",
    "INTERNATIONAL_BANK_ACCOUNT_NUMBER",
    "IP_ADDRESS",
    "LICENSE_PLATE",
    "MAC_ADDRESS",
    "NAME",
    "PASSWORD",
    "PHONE",
    "PIN",
    "SWIFT_CODE",
    "UK_NATIONAL_HEALTH_SERVICE_NUMBER",
    "UK_NATIONAL_INSURANCE_NUMBER",
    "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER",
    "URL",
    "USERNAME",
    "US_BANK_ACCOUNT_NUMBER",
    "US_BANK_ROUTING_NUMBER",
    "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER",
    "US_PASSPORT_NUMBER",
    "US_SOCIAL_SECURITY_NUMBER",
    "VEHICLE_IDENTIFICATION_NUMBER"
  ),
  action: Schema.Literal("ANONYMIZED", "BLOCKED", "NONE"),
  match: Schema.String,
  detected: Schema.optional(Schema.Boolean)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailRegexFilter extends Schema.Class<GuardrailRegexFilter>(
  makeIdentifier("GuardrailRegexFilter")
)({
  action: Schema.Literal("ANONYMIZED", "BLOCKED", "NONE"),
  name: Schema.optional(Schema.String),
  match: Schema.optional(Schema.String),
  regex: Schema.optional(Schema.String),
  detected: Schema.optional(Schema.Boolean)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailSensitiveInformationPolicyAssessment
  extends Schema.Class<GuardrailSensitiveInformationPolicyAssessment>(
    makeIdentifier("GuardrailSensitiveInformationPolicyAssessment")
  )({
    piiEntities: Schema.Array(GuardrailPiiEntityFilter),
    regexes: Schema.Array(GuardrailRegexFilter)
  })
{}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailTopic extends Schema.Class<GuardrailTopic>(makeIdentifier("GuardrailTopic"))({
  action: Schema.Literal("BLOCKED", "NONE"),
  name: Schema.String,
  type: Schema.Literal("DENY"),
  detected: Schema.optional(Schema.Boolean)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailTopicPolicyAssessment extends Schema.Class<GuardrailTopicPolicyAssessment>(
  makeIdentifier("GuardrailTopicPolicyAssessment")
)({
  topics: Schema.Array(GuardrailTopic)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailCustomWord extends Schema.Class<GuardrailCustomWord>(
  makeIdentifier("GuardrailCustomWord")
)({
  action: Schema.Literal("BLOCKED", "NONE"),
  match: Schema.String,
  detected: Schema.optional(Schema.Boolean)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailManagedWord extends Schema.Class<GuardrailManagedWord>(
  makeIdentifier("GuardrailManagedWord")
)({
  action: Schema.Literal("BLOCKED", "NONE"),
  match: Schema.String,
  type: Schema.Literal("PROFANITY"),
  detected: Schema.optional(Schema.Boolean)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailWordPolicyAssessment extends Schema.Class<GuardrailWordPolicyAssessment>(
  makeIdentifier("GuardrailWordPolicyAssessment")
)({
  customWords: GuardrailCustomWord,
  managedWordLists: GuardrailManagedWord
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailAssessment extends Schema.Class<GuardrailAssessment>(makeIdentifier("GuardrailAssessment"))({
  contentPolicy: Schema.optional(GuardrailContentPolicyAssessment),
  contextualGroundingPolicy: Schema.optional(GuardrailContextualGroundingPolicyAssessment),
  invocationMetrics: Schema.optional(GuardrailInvocationMetrics),
  sensitiveInformationPolicy: Schema.optional(GuardrailSensitiveInformationPolicyAssessment),
  topicPolicy: Schema.optional(GuardrailTopicPolicyAssessment),
  wordPolicy: Schema.optional(GuardrailWordPolicyAssessment)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailTraceAssessment extends Schema.Class<GuardrailTraceAssessment>(
  makeIdentifier("GuardrailTraceAssessment")
)({
  actionReason: Schema.optional(Schema.String),
  inputAssessment: Schema.optional(Schema.Record({
    key: Schema.String,
    value: GuardrailAssessment
  })),
  modelOutput: Schema.optional(Schema.Array(Schema.String)),
  outputAssessments: Schema.optional(Schema.Record({
    key: Schema.String,
    value: GuardrailAssessment
  }))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class PromptRouterTrace extends Schema.Class<PromptRouterTrace>(makeIdentifier("PromptRouterTrace"))({
  invokedModelId: Schema.String.pipe(
    Schema.pattern(
      /^(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}::foundation-model\/[a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([a-z0-9-]{1,63}[.]){0,2}[a-z0-9-]{1,63}([:][a-z0-9-]{1,63}){0,2})|(arn:aws(|-us-gov|-cn|-iso|-iso-b):bedrock:(|[0-9a-z-]{1,20}):(|[0-9]{12}):inference-profile\/[a-zA-Z0-9-:.]+)$/
    ),
    Schema.optional
  )
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ConverseTrace extends Schema.Class<ConverseTrace>(makeIdentifier("ConverseTrace"))({
  guardrail: Schema.optional(GuardrailTraceAssessment),
  promptRouter: Schema.optional(PromptRouterTrace)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const IntZeroOrGreater = Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))

/**
 * @since 1.0.0
 * @category Schemas
 */
export class TokenUsage extends Schema.Class<TokenUsage>(makeIdentifier("TokenUsage"))({
  inputTokens: IntZeroOrGreater,
  outputTokens: IntZeroOrGreater,
  totalTokens: IntZeroOrGreater,
  cacheReadInputTokens: Schema.optional(IntZeroOrGreater),
  cacheWriteInputTokens: Schema.optional(IntZeroOrGreater)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class SystemContentBlock extends Schema.Union(
  Schema.Struct({ cachePoint: CachePointBlock }),
  Schema.Struct({ guardContent: GuardrailConverseContentBlock }),
  Schema.Struct({ text: Schema.String.pipe(Schema.minLength(1)) })
) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class GuardrailConfiguration extends Schema.Class<GuardrailConfiguration>(
  makeIdentifier("GuardrailConfiguration")
)({
  guardrailIdentifier: Schema.String.pipe(
    Schema.minLength(0),
    Schema.maxLength(2048),
    Schema.pattern(/^(([a-z0-9]+)|(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail\/[a-z0-9]+))$/)
  ),
  guardrailVersion: Schema.String.pipe(
    Schema.pattern(/^(([1-9][0-9]{0,7})|(DRAFT))$/)
  ),
  trace: Schema.optional(Schema.Literal("enabled", "disabled", "enabled_full"))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class InferenceConfiguration extends Schema.Class<InferenceConfiguration>(
  makeIdentifier("InferenceConfiguration")
)({
  maxTokens: Schema.optional(Schema.Int.pipe(Schema.greaterThanOrEqualTo(1))),
  stopSequences: Schema.optional(
    Schema.Array(Schema.String.pipe(
      Schema.minLength(1)
    )).pipe(
      Schema.maxItems(4)
    )
  ),
  temperature: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
  topP: Schema.optional(Schema.Number.pipe(Schema.between(0, 1)))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class PerformanceConfiguration extends Schema.Class<PerformanceConfiguration>(
  makeIdentifier("PerformanceConfiguration")
)({
  latency: Schema.optional(Schema.Literal("standard", "optimized"))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ToolSpecification extends Schema.Class<ToolSpecification>(
  makeIdentifier("ToolSpecification")
)({
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(64),
    Schema.pattern(/^[a-zA-Z0-9_-]+$/)
  ),
  inputSchema: Schema.Struct({
    json: Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    })
  }),
  description: Schema.optional(Schema.String.pipe(
    Schema.minLength(1)
  ))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class Tool extends Schema.Class<Tool>(
  makeIdentifier("Tool")
)({
  cachePoint: Schema.optional(CachePointBlock),
  toolSpec: Schema.optional(ToolSpecification)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ToolChoice extends Schema.Union(
  Schema.Struct({ any: Schema.Struct({}) }),
  Schema.Struct({ auto: Schema.Struct({}) }),
  Schema.Struct({
    tool: Schema.Struct({
      name: Schema.String.pipe(
        Schema.minLength(1),
        Schema.maxLength(64),
        Schema.pattern(/^[a-zA-Z0-9_-]+$/)
      )
    })
  })
) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ToolConfiguration extends Schema.Class<ToolConfiguration>(
  makeIdentifier("ToolConfiguration")
)({
  tools: Schema.Array(Tool).pipe(Schema.minItems(1)),
  toolChoice: Schema.optional(ToolChoice)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ConverseRequest extends Schema.Class<ConverseRequest>(makeIdentifier("ConverseRequest"))({
  modelId: Schema.String,
  messages: Schema.Array(Message),
  system: Schema.optional(Schema.Array(SystemContentBlock)),
  toolConfig: Schema.optional(ToolConfiguration),
  guardrailConfig: Schema.optional(GuardrailConfiguration),
  inferenceConfig: Schema.optional(InferenceConfiguration),
  performanceConfig: Schema.optional(PerformanceConfiguration),
  promptVariables: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Struct({ text: Schema.String })
  })),
  requestMetadata: Schema.optional(Schema.Record({
    key: Schema.String.pipe(
      Schema.minLength(1),
      Schema.maxLength(256),
      Schema.pattern(/^[a-zA-Z0-9\s:_@$#=/+,-.]{1,256}$/)
    ),
    value: Schema.String.pipe(
      Schema.minLength(0),
      Schema.maxLength(256),
      Schema.pattern(/^[a-zA-Z0-9\s:_@$#=/+,-.]{0,256}$/)
    )
  })),
  additionalModelRequestFields: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  })),
  additionalModelResponseFieldPaths: Schema.optional(
    Schema.Array(Schema.String.pipe(
      Schema.minLength(1),
      Schema.maxLength(256)
    )).pipe(
      Schema.maxItems(10)
    )
  )
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ConverseResponse extends Schema.Class<ConverseResponse>(makeIdentifier("ConverseResponse"))({
  output: ConverseOutput,
  metrics: ConverseMetrics,
  usage: TokenUsage,
  stopReason: Schema.Literal(
    "content_filtered",
    "end_turn",
    "tool_use",
    "max_tokens",
    "stop_sequence",
    "guardrail_intervened"
  ),
  trace: Schema.optional(ConverseTrace),
  performanceConfig: Schema.optional(Schema.Struct({
    latency: Schema.Literal("standard", "optimized")
  })),
  additionalModelResponseFields: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ReasoningContentBlockDelta extends Schema.Union(
  Schema.Struct({ redactedContent: Schema.String }),
  Schema.Struct({ signature: Schema.String }),
  Schema.Struct({ text: Schema.String })
) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ToolUseBlockStart extends Schema.Class<ToolUseBlockStart>(
  makeIdentifier("ToolUseBlockStart")
)({
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(64),
    Schema.pattern(/^[a-zA-Z0-9_-]+$/)
  ),
  toolUseId: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(64),
    Schema.pattern(/^[a-zA-Z0-9_-]+$/)
  )
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ContentBlockStart extends Schema.Class<ContentBlockStart>(
  makeIdentifier("ContentBlockStart")
)({
  toolUse: Schema.optional(ToolUseBlockStart)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ContentBlockStartEvent extends Schema.Class<ContentBlockStartEvent>(
  makeIdentifier("ContentBlockStartEvent")
)({
  contentBlockIndex: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  start: ContentBlockStart
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ContentBlockStopEvent extends Schema.Class<ContentBlockStopEvent>(
  makeIdentifier("ContentBlockStopEvent")
)({
  contentBlockIndex: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ToolUseBlockDelta extends Schema.Class<ToolUseBlockDelta>(
  makeIdentifier("ToolUseBlockDelta")
)({
  input: Schema.String
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ContentBlockDelta extends Schema.Union(
  Schema.Struct({ reasoningContent: ReasoningContentBlockDelta }).pipe(
    Schema.attachPropertySignature("type", "reasoningContent")
  ),
  Schema.Struct({ text: Schema.String }).pipe(
    Schema.attachPropertySignature("type", "text")
  ),
  Schema.Struct({ toolUse: ToolUseBlockDelta }).pipe(
    Schema.attachPropertySignature("type", "toolUse")
  )
) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ContentBlockDeltaEvent extends Schema.Class<ContentBlockDeltaEvent>(
  makeIdentifier("ContentBlockDeltaEvent")
)({
  contentBlockIndex: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  delta: ContentBlockDelta
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class MessageStartEvent extends Schema.Class<MessageStartEvent>(
  makeIdentifier("MessageStartEvent")
)({
  role: Schema.Literal("user", "assistant")
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const StopReason = Schema.Literal(
  "end_turn",
  "tool_use",
  "max_tokens",
  "stop_sequence",
  "guardrail_intervened",
  "content_filtered"
)
/**
 * @since 1.0.0
 * @category Schemas
 */
export type StopReason = typeof StopReason.Type

/**
 * @since 1.0.0
 * @category Schemas
 */
export class MessageStopEvent extends Schema.Class<MessageStopEvent>(
  makeIdentifier("MessageStopEvent")
)({
  stopReason: StopReason,
  additionalModelResponseFields: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ConverseStreamMetrics extends Schema.Class<ConverseStreamMetrics>(
  makeIdentifier("ConverseStreamMetrics")
)({
  latencyMs: Schema.DurationFromMillis
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ConverseStreamTrace extends Schema.Class<ConverseStreamTrace>(
  makeIdentifier("ConverseStreamTrace")
)({
  guardrail: Schema.optional(GuardrailTraceAssessment),
  promptRouter: Schema.optional(PromptRouterTrace)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ConverseStreamMetadataEvent extends Schema.Class<ConverseStreamMetadataEvent>(
  makeIdentifier("ConverseStreamMetadataEvent")
)({
  metrics: ConverseStreamMetrics,
  usage: TokenUsage,
  performanceConfig: Schema.optional(PerformanceConfiguration),
  trace: Schema.optional(ConverseStreamTrace)
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const ConverseResponseStreamEvent = Schema.Union(
  Schema.Struct({ messageStart: MessageStartEvent }).pipe(
    Schema.attachPropertySignature("type", "messageStart"),
    Schema.annotations({ identifier: "MessageStartEvent" })
  ),
  Schema.Struct({ messageStop: MessageStopEvent }).pipe(
    Schema.attachPropertySignature("type", "messageStop"),
    Schema.annotations({ identifier: "MessageStopEvent" })
  ),
  Schema.Struct({ contentBlockStart: ContentBlockStartEvent }).pipe(
    Schema.attachPropertySignature("type", "contentBlockStart"),
    Schema.annotations({ identifier: "ContentBlockStartEvent" })
  ),
  Schema.Struct({ contentBlockDelta: ContentBlockDeltaEvent }).pipe(
    Schema.attachPropertySignature("type", "contentBlockDelta"),
    Schema.annotations({ identifier: "ContentBlockDeltaEvent" })
  ),
  Schema.Struct({ contentBlockStop: ContentBlockStopEvent }).pipe(
    Schema.attachPropertySignature("type", "contentBlockStop"),
    Schema.annotations({ identifier: "ContentBlockDeltaEvent" })
  ),
  Schema.Struct({ metadata: ConverseStreamMetadataEvent }).pipe(
    Schema.attachPropertySignature("type", "metadata"),
    Schema.annotations({ identifier: "ConverseStreamMetadataEvent" })
  ),
  Schema.Struct({
    internalServerException: Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    })
  }).pipe(
    Schema.attachPropertySignature("type", "internalServerException"),
    Schema.annotations({ identifier: "InternalServerException" })
  ),
  Schema.Struct({
    modelStreamErrorException: Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    })
  }).pipe(
    Schema.attachPropertySignature("type", "modelStreamErrorException"),
    Schema.annotations({ identifier: "ModelStreamErrorException" })
  ),
  Schema.Struct({
    serviceUnavailableException: Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    })
  }).pipe(
    Schema.attachPropertySignature("type", "serviceUnavailableException"),
    Schema.annotations({ identifier: "ServiceUnavailableException" })
  ),
  Schema.Struct({
    throttlingException: Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    })
  }).pipe(
    Schema.attachPropertySignature("type", "throttlingException"),
    Schema.annotations({ identifier: "ThrottlingException" })
  ),
  Schema.Struct({
    validationException: Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    })
  }).pipe(
    Schema.attachPropertySignature("type", "validationException"),
    Schema.annotations({ identifier: "ValidationException" })
  )
).pipe(Schema.asSchema).annotations({ identifier: "ConverseResponseStreamEvent" })

/**
 * @since 1.0.0
 * @category Models
 */
export type ConverseResponseStreamEvent = typeof ConverseResponseStreamEvent.Type
