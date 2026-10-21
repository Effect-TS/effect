/** @internal */
import * as Context from "../../Context.ts"
import type { ServiceClass } from "../../Context.ts"
import type * as McpClientApi from "../McpClient.ts"

export const TransportTypeId = "~effect/ai/McpClient/Transport" as const

export type Transport = McpClientApi.Transport

export const Transport: ServiceClass<
  McpClientApi.Transport,
  "effect/ai/McpClient/Transport",
  McpClientApi.Transport["Service"]
> = Context.Service<McpClientApi.Transport, McpClientApi.Transport["Service"]>()("effect/ai/McpClient/Transport")

export type McpClient = McpClientApi.McpClient

export const McpClient: ServiceClass<McpClientApi.McpClient, "effect/ai/McpClient", McpClientApi.Client> = Context
  .Service<McpClientApi.McpClient, McpClientApi.Client>()("effect/ai/McpClient")
