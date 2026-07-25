import type * as Rpc from "../../rpc/Rpc.ts"
import type * as RpcGroup from "../../rpc/RpcGroup.ts"

/** @internal */
export interface AnyProtocolAdapter {
  readonly protocolVersion: string
  readonly clientRpcs: RpcGroup.Any
  readonly clientNotificationRpcs: RpcGroup.Any
  readonly serverRequestRpcs: RpcGroup.Any
  readonly serverNotificationRpcs: RpcGroup.Any
}

/** @internal */
export interface ProtocolAdapter<
  out Version extends string = string,
  ClientRpcs extends Rpc.Any = Rpc.Any,
  ClientNotificationRpcs extends ClientRpcs = ClientRpcs,
  ServerRequestRpcs extends Rpc.Any = Rpc.Any,
  ServerNotificationRpcs extends Rpc.Any = Rpc.Any
> extends AnyProtocolAdapter {
  readonly protocolVersion: Version
  readonly clientRpcs: RpcGroup.RpcGroup<ClientRpcs>
  readonly clientNotificationRpcs: RpcGroup.RpcGroup<ClientNotificationRpcs>
  readonly serverRequestRpcs: RpcGroup.RpcGroup<ServerRequestRpcs>
  readonly serverNotificationRpcs: RpcGroup.RpcGroup<ServerNotificationRpcs>
}

/** @internal */
export const make = <
  const Version extends string,
  ClientRpcs extends Rpc.Any,
  ClientNotificationRpcs extends ClientRpcs,
  ServerRequestRpcs extends Rpc.Any,
  ServerNotificationRpcs extends Rpc.Any
>(options: {
  readonly protocolVersion: Version
  readonly clientRpcs: RpcGroup.RpcGroup<ClientRpcs>
  readonly clientNotificationRpcs: RpcGroup.RpcGroup<ClientNotificationRpcs>
  readonly serverRequestRpcs: RpcGroup.RpcGroup<ServerRequestRpcs>
  readonly serverNotificationRpcs: RpcGroup.RpcGroup<ServerNotificationRpcs>
}): ProtocolAdapter<
  Version,
  ClientRpcs,
  ClientNotificationRpcs,
  ServerRequestRpcs,
  ServerNotificationRpcs
> => options
