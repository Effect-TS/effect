/**
 * Conversion of forwarding targets to `effect/net` addresses, shared by the
 * SSH backends.
 *
 * @internal
 */
import * as Host from "../../net/Host.ts"
import * as NetAddress from "../../net/NetAddress.ts"
import * as Result from "../../Result.ts"
import { SshChannelError, SshError } from "../SshError.ts"

/**
 * A TCP endpoint or Unix socket path to convert to a forwarding address.
 *
 * @internal
 */
export type TargetInput = Host.HostPortInput | NetAddress.UnixPathAddress | NetAddress.UnixPathAddressParts

/**
 * Converts a forwarding target to a validated endpoint or Unix socket path.
 *
 * @internal
 */
export const targetFromInput = (
  target: TargetInput
): Result.Result<Host.HostPort | NetAddress.UnixPathAddress, SshError> =>
  typeof target === "object" && "path" in target
    ? Result.succeed(NetAddress.isUnixPathAddress(target) ? target : NetAddress.unixPathAddress(target.path))
    : Result.mapError(Host.hostPortFromInput(target), invalidTarget)

/** @internal */
export const invalidTarget = (error: NetAddress.NetAddressError): SshError =>
  new SshError({ reason: new SshChannelError({ description: `invalid forward target: ${error.message}` }) })
