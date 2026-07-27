import type { NonEmptyReadonlyArray } from "../../../Array.ts"
import * as Cause from "../../../Cause.ts"
import * as Effect from "../../../Effect.ts"
import type * as RpcGroup from "../../rpc/RpcGroup.ts"
import type * as RpcMessage from "../../rpc/RpcMessage.ts"
import type * as McpProtocol from "./mcpProtocol.ts"

type AnyRpcGroup = RpcGroup.RpcGroup<any>

const prefix = (protocol: McpProtocol.AnyProtocolAdapter): string =>
  `@effect/mcp/${encodeURIComponent(protocol.protocolVersion)}/`

const asRpcGroup = (group: RpcGroup.Any): AnyRpcGroup => group as unknown as AnyRpcGroup

/** @internal */
export interface ProtocolRegistry<
  Protocol extends McpProtocol.AnyProtocolAdapter = McpProtocol.AnyProtocolAdapter
> {
  readonly protocols: NonEmptyReadonlyArray<Protocol>
  readonly clientRpcs: AnyRpcGroup
  readonly select: (offeredVersion: string) => Protocol
  readonly routeClientRequest: (
    protocol: Protocol,
    request: RpcMessage.RequestEncoded
  ) => RpcMessage.RequestEncoded
}

/** @internal */
export const make = Effect.fnUntraced(function*<
  const Protocols extends NonEmptyReadonlyArray<McpProtocol.AnyProtocolAdapter>
>(
  protocols: Protocols
) {
  type Protocol = Protocols[number]

  if (protocols.length === 0) {
    return yield* new Cause.IllegalArgumentError(
      "MCP protocol declaration must contain at least one MCP protocol"
    )
  }

  const snapshot = Object.freeze(Array.from(protocols)) as NonEmptyReadonlyArray<Protocol>
  const byVersion = new Map<string, Protocol>()
  for (const protocol of snapshot) {
    if (byVersion.has(protocol.protocolVersion)) {
      return yield* new Cause.IllegalArgumentError(
        `Duplicate MCP protocol version: ${protocol.protocolVersion}`
      )
    }
    byVersion.set(protocol.protocolVersion, protocol)
  }

  let clientRpcs = asRpcGroup(snapshot[0].clientRpcs).prefix(prefix(snapshot[0]))
  for (let i = 1; i < snapshot.length; i++) {
    clientRpcs = clientRpcs.merge(asRpcGroup(snapshot[i].clientRpcs).prefix(prefix(snapshot[i])))
  }

  return {
    protocols: snapshot,
    clientRpcs,
    select: (offeredVersion: string) => byVersion.get(offeredVersion) ?? snapshot[0],
    routeClientRequest: (
      protocol: Protocol,
      request: RpcMessage.RequestEncoded
    ) => ({
      ...request,
      tag: `${prefix(protocol)}${request.tag}`
    })
  } satisfies ProtocolRegistry<Protocol>
})
