import * as Context from "effect/Context"
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"
import * as HttpApiGroup from "effect/http-api/HttpApiGroup"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as SchemaAST from "effect/SchemaAST"

import { OperationHttpConfigurationError } from "../httpOperation/errors.ts"
import { RevealWire } from "../httpOperation/private.ts"
import type { AnyAuthAction, AuthActions } from "../operations/actions.ts"

const transportFailure = <const Reasons extends readonly [string, ...Array<string>]>(
  status: number,
  reasons: Reasons
) =>
  Schema.TaggedStruct("TransportFailure", { reason: Schema.Literals(reasons) }).annotate({
    httpApiStatus: status
  })

const transportErrors = [
  transportFailure(400, [
    "request",
    "credentials",
    "response",
    "network",
    "stale-response",
    "private-output"
  ]),
  transportFailure(403, ["origin", "csrf"]),
  transportFailure(404, ["not-found"]),
  transportFailure(405, ["method"]),
  transportFailure(413, ["too-large"]),
  transportFailure(503, ["unavailable"])
] as const

class EndpointContract extends Context.Service<
  EndpointContract,
  {
    readonly action: AnyAuthAction
    readonly original: Pick<
      HttpApiEndpoint.Top,
      "path" | "method" | "params" | "query" | "headers" | "payload" | "success" | "error"
    >
  }
>()("@effect/auth/http/EndpointContract") {}

/**
 * Only middleware and annotations may wrap the generated endpoint contract.
 *
 * @internal
 */
export const matchesEndpoint = (actual: HttpApiEndpoint.Top, action: AnyAuthAction): boolean => {
  const metadata = Context.getOption(actual.annotations, EndpointContract)

  if (Option.isNone(metadata) || metadata.value.action !== action) return false
  const expected = metadata.value.original

  return (
    actual.path === expected.path &&
    actual.method === expected.method &&
    actual.params === expected.params &&
    actual.query === expected.query &&
    actual.headers === expected.headers &&
    actual.payload === expected.payload &&
    actual.success === expected.success &&
    actual.error === expected.error
  )
}

const endpoint = <const Name extends string, A extends AnyAuthAction>(name: Name, action: A) => {
  const rpc = action.route.operation.rpc

  const encodedPayload = Schema.toEncoded<A["route"]["operation"]["rpc"]["payloadSchema"]>(
    rpc.payloadSchema
  )

  const encodedSuccess = Schema.toEncoded<A["route"]["operation"]["rpc"]["successSchema"]>(
    rpc.successSchema
  )

  const noPayload = SchemaAST.isVoid(encodedPayload.ast) || SchemaAST.isUndefined(encodedPayload.ast)

  const optionalPayload = Schema.is(encodedPayload)(undefined)
  const noValue = SchemaAST.isVoid(encodedSuccess.ast) || SchemaAST.isUndefined(encodedSuccess.ast)
  const optionalValue = Schema.is(encodedSuccess)(undefined)

  const payload = noPayload
    ? Schema.Struct({})
    : optionalPayload
    ? Schema.Struct({ payload: Schema.optionalKey(encodedPayload) })
    : Schema.Struct({ payload: encodedPayload })

  const privateOutput = Schema.optionalKey(Schema.Array(RevealWire))

  const success = noValue
    ? action.route.reveals.length === 0
      ? Schema.TaggedStruct("Success", {})
      : Schema.TaggedStruct("Success", { private: privateOutput })
    : optionalValue
    ? action.route.reveals.length === 0
      ? Schema.TaggedStruct("Success", { value: Schema.optionalKey(encodedSuccess) })
      : Schema.TaggedStruct("Success", {
        value: Schema.optionalKey(encodedSuccess),
        private: privateOutput
      })
    : action.route.reveals.length === 0
    ? Schema.TaggedStruct("Success", { value: encodedSuccess })
    : Schema.TaggedStruct("Success", { value: encodedSuccess, private: privateOutput })

  const failure = Schema.TaggedStruct("Failure", {
    error: Schema.toEncoded<A["route"]["operation"]["rpc"]["errorSchema"]>(rpc.errorSchema)
  }).annotate({ httpApiStatus: 400 })

  const definition = action.route.method === "GET"
    ? HttpApiEndpoint.get(name, action.route.path, {
      success,
      error: [failure, ...transportErrors]
    })
    : HttpApiEndpoint.post(name, action.route.path, {
      payload: Schema.toEncoded(payload),
      success: Schema.toEncoded(success),
      error: [Schema.toEncoded(failure), ...transportErrors]
    })

  return definition.annotate(EndpointContract, { action, original: definition })
}

type Endpoints<Actions extends AuthActions> = {
  readonly [Name in keyof Actions]: ReturnType<
    typeof endpoint<Extract<Name, string>, Actions[Name]>
  >
}[keyof Actions]

/** Native HttpApi projection of the named transport. Public envelopes are exact;
 * private credentials remain cookies/headers, and private reveals retain their envelope.
 * Server handlers use the same bounded operation decoder before schema projection.
 */
export const httpGroup = <Actions extends AuthActions, const Name extends string = "auth">(
  contract: { readonly actions: Actions },
  options?: { readonly name?: Name }
) => {
  const name = (options?.name ?? "auth") as Name

  // Entries preserve each descriptor's name/schema pairing; iteration erases that relationship.
  const endpoints = Object.entries(contract.actions).map(([name, action]) => endpoint(name, action)) as Array<
    Endpoints<Actions>
  >

  const first = endpoints[0]

  if (first === undefined) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous HTTP contract construction requires at least one route.
    throw OperationHttpConfigurationError.make({ reason: "route" })
  }

  return HttpApiGroup.make(name).add(first, ...endpoints.slice(1))
}
