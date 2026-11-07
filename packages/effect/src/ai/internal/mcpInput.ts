import * as Context from "../../Context.ts"
import * as SecureRandom from "../../crypto/SecureRandom.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as Schema from "../../Schema.ts"
import * as McpSchema from "../McpSchema.ts"
import * as McpCore from "./mcpCore.ts"
import * as McpProtocol from "./mcpProtocol.ts"
import * as V2024 from "./mcpSchema/v2024_11_05.ts"
import * as March2025 from "./mcpSchema/v2025_03_26.ts"
import * as June2025 from "./mcpSchema/v2025_06_18.ts"
import * as November2025 from "./mcpSchema/v2025_11_25.ts"

/** @internal */
export const MaxRounds = Context.Reference<number>("effect/ai/McpServer/LegacyInputMaxRounds", {
  defaultValue: () => 16
})

/** @internal */
export const InputTimeout = Context.Reference<Duration.Input>("effect/ai/McpServer/LegacyInputTimeout", {
  defaultValue: () => "60 seconds"
})

const rejected = (error: McpSchema.McpErrorBase): McpCore.RequestRejected =>
  new McpCore.RequestRejected({ code: error.code, message: error.message, data: error.data, error })

const invalid = (message: string): McpCore.RequestRejected => rejected(new McpSchema.InvalidParams({ message }))
const internal = (message: string): McpCore.RequestRejected => rejected(new McpSchema.InternalError({ message }))

const reverseError = (
  error: McpSchema.McpReverseOperationError | McpSchema.McpReverseOperationUnsupported | Schema.SchemaError
): McpCore.RequestRejected =>
  error._tag === "McpReverseOperationUnsupported"
    ? invalid(`${error.operation} is not supported by MCP ${error.protocolVersion}: ${error.reason}`)
    : internal("MCP client input request failed")

type PreparedInput = (
  client: McpSchema.McpReverseClient
) => Effect.Effect<McpSchema.McpInputResponse, McpCore.RequestRejected>

const validateSampling = (
  params: Readonly<Record<string, unknown>>,
  version: McpSchema.McpServerClient["Service"]["protocolVersion"]
): Effect.Effect<void, Schema.SchemaError> => {
  switch (version) {
    case "2024-11-05":
      return Schema.decodeUnknownEffect(V2024.CreateMessage.payloadSchema, { onExcessProperty: "error" })(params).pipe(
        Effect.asVoid
      )
    case "2025-03-26":
      return Schema.decodeUnknownEffect(March2025.CreateMessage.payloadSchema, { onExcessProperty: "error" })(params)
        .pipe(Effect.asVoid)
    case "2025-06-18":
      return Schema.decodeUnknownEffect(June2025.CreateMessage.payloadSchema, { onExcessProperty: "error" })(params)
        .pipe(Effect.asVoid)
    case "2025-11-25":
      return Schema.decodeUnknownEffect(November2025.CreateMessage.payloadSchema)(params).pipe(Effect.asVoid)
  }
}

// Validate every request in a round before sending the first one. The reverse
// facade remains responsible for the actual dated projection and response checks.
const prepare = Effect.fnUntraced(function*(
  request: McpSchema.McpInputRequest,
  serverClient: McpSchema.McpServerClient["Service"]
): Effect.fn.Return<PreparedInput, McpCore.RequestRejected> {
  const capabilities = serverClient.clientCapabilities
  const version = serverClient.protocolVersion
  switch (request.method) {
    case "roots/list": {
      if (!Object.hasOwn(capabilities, "roots") || capabilities.roots === undefined) {
        return yield* invalid("Client did not advertise the roots capability")
      }
      const params = yield* Schema.decodeUnknownEffect(McpSchema.ListRoots.payloadSchema)(request.params ?? {}).pipe(
        Effect.mapError(() => internal("Invalid MCP roots input request"))
      )
      return (client) =>
        client.listRoots(params).pipe(
          Effect.flatMap(Schema.encodeEffect(McpSchema.ListRoots.successSchema)),
          Effect.mapError(reverseError)
        )
    }
    case "sampling/createMessage": {
      if (!Object.hasOwn(capabilities, "sampling") || capabilities.sampling === undefined) {
        return yield* invalid("Client did not advertise the sampling capability")
      }
      if (version === "2025-11-25") {
        if (McpProtocol.samplingRequestRequiresTools(request.params) && capabilities.sampling.tools === undefined) {
          return yield* invalid("Client did not advertise the sampling.tools capability")
        }
        if (
          (request.params.includeContext === "thisServer" || request.params.includeContext === "allServers") &&
          capabilities.sampling.context === undefined
        ) {
          return yield* invalid("Client did not advertise the sampling.context capability")
        }
      }
      yield* validateSampling(request.params, version).pipe(
        Effect.mapError(() => invalid(`Sampling input is not representable by MCP ${version}`))
      )
      // Reject the whole round here, before any of its requests is sent.
      if (McpProtocol.samplingMessageError(request.params) !== undefined) {
        return yield* internal("Invalid MCP sampling input request")
      }
      const params = yield* Schema.decodeUnknownEffect(McpSchema.CreateMessage.payloadSchema)(request.params).pipe(
        Effect.mapError(() => internal("Invalid MCP sampling input request"))
      )
      return (client) =>
        client.createMessage(params).pipe(
          Effect.flatMap(Schema.encodeEffect(McpSchema.CreateMessage.successSchema)),
          Effect.mapError(reverseError)
        )
    }
    case "elicitation/create": {
      if (version === "2024-11-05" || version === "2025-03-26") {
        return yield* invalid(`Elicitation is not supported by MCP ${version}`)
      }
      const capability = capabilities.elicitation
      if (!Object.hasOwn(capabilities, "elicitation") || capability === undefined) {
        return yield* invalid("Client did not advertise the elicitation capability")
      }
      const url = request.params.mode === "url"
      if (
        version === "2025-11-25" &&
        (url ? capability.url === undefined : capability.form === undefined && capability.url !== undefined)
      ) {
        return yield* invalid(`Client did not advertise the elicitation.${url ? "url" : "form"} capability`)
      }
      const input = url && request.params.elicitationId === undefined
        ? { ...request.params, elicitationId: SecureRandom.uuidV4Unsafe() }
        : request.params
      if (version === "2025-06-18") {
        const { mode, ...withoutMode } = input
        yield* Schema.decodeUnknownEffect(June2025.Elicit.payloadSchema, { onExcessProperty: "error" })(
          mode === "form" ? withoutMode : input
        ).pipe(Effect.mapError(() => invalid(`Elicitation input is not representable by MCP ${version}`)))
      }
      const params = yield* Schema.decodeUnknownEffect(McpSchema.Elicit.payloadSchema)(input).pipe(
        Effect.mapError(() => internal("Invalid MCP elicitation input request"))
      )
      return (client) =>
        client.elicit(params).pipe(
          Effect.flatMap(Schema.encodeEffect(McpSchema.Elicit.successSchema)),
          Effect.mapError(reverseError)
        )
    }
    default:
      return yield* internal("Invalid MCP client input method")
  }
})

const isInputRequired = (value: unknown): value is McpSchema.InputRequired => Predicate.isTagged(value, "InputRequired")

/**
 * Resolves handler input requirements through an initialized legacy client.
 * Run inside MCP middleware so its timeout, services, and finalizers cover every round.
 *
 * @internal
 */
export const resolve = <A, E, R>(
  handler: Effect.Effect<A, E, R>,
  invocation: McpCore.McpInvocation
): Effect.Effect<A, E | McpCore.RequestRejected, R> => {
  const serverClient = invocation.serverClient
  if (serverClient === undefined) return handler
  return Effect.flatMap(handler, (first) => {
    if (!isInputRequired(first)) return Effect.succeed(first)
    return Effect.scoped(Effect.gen(function*() {
      const maxRounds = yield* MaxRounds
      const inputTimeout = Duration.fromInput(yield* InputTimeout)
      if (!Number.isSafeInteger(maxRounds) || maxRounds <= 0) {
        return yield* internal("Legacy input maximum rounds must be a positive safe integer")
      }
      if (
        Option.isNone(inputTimeout) || !Duration.isFinite(inputTimeout.value) ||
        Duration.toMillis(inputTimeout.value) <= 0
      ) {
        return yield* internal("Legacy input timeout must be finite and positive")
      }
      const timeout = inputTimeout.value
      let outcome: A = first
      let client: McpSchema.McpReverseClient | undefined
      for (let round = 0; isInputRequired(outcome); round++) {
        if (round >= maxRounds) return yield* invalid("Legacy input round limit exceeded")
        const requests = Object.entries(outcome.inputRequests ?? {})
        if (requests.length === 0) {
          return yield* invalid("State-only input requirements are not supported by legacy MCP protocols")
        }
        const prepared = yield* Effect.forEach(
          requests,
          ([key, request]) => prepare(request, serverClient).pipe(Effect.map((run) => [key, run] as const))
        )
        client ??= yield* serverClient.getClient
        const inputResponses: Record<string, McpSchema.McpInputResponse> = Object.create(null)
        for (const [key, run] of prepared) {
          inputResponses[key] = yield* run(client).pipe(Effect.timeoutOrElse({
            duration: timeout,
            orElse: () => Effect.fail(internal("MCP client input request timed out"))
          }))
        }
        const context = { ...invocation.requestContext, requestState: outcome.requestState, inputResponses }
        outcome = yield* Effect.provideService(handler, McpSchema.McpRequestContext, context).pipe(
          Effect.catch((error) => Effect.fail(error instanceof McpSchema.InvalidParams ? rejected(error) : error))
        )
      }
      return outcome
    }))
  })
}
