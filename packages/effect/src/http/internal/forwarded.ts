import * as IpNetwork from "../../net/IpNetwork.ts"
import * as NetAddress from "../../net/NetAddress.ts"
import * as Option from "../../Option.ts"
import type { Predicate } from "../../Predicate.ts"
import * as Result from "../../Result.ts"
import * as Headers from "../Headers.ts"
import type { HttpServerRequest } from "../HttpServerRequest.ts"

/** @internal */
export type TrustedProxies = ReadonlyArray<IpNetwork.IpNetwork> | Predicate<NetAddress.IpAddress>

/** @internal */
export interface Hop {
  readonly for: string | undefined
  readonly host?: string | undefined
  readonly proto?: string | undefined
}

/** @internal */
export const makeIsTrusted = (trusted: TrustedProxies): Predicate<NetAddress.IpAddress> =>
  typeof trusted === "function"
    ? trusted
    : (address) => trusted.some((network) => IpNetwork.contains(network, address))

const parseNode = (node: string | undefined): NetAddress.IpAddress | undefined => {
  if (node === undefined) return undefined
  const ip = NetAddress.ipFromString(
    node.startsWith("[") && node.endsWith("]") ? node.slice(1, -1) : node
  )
  if (Result.isSuccess(ip)) {
    return NetAddress.toCanonical(ip.success)
  }
  const inet = NetAddress.inetAddressFromString(node)
  return Result.isSuccess(inet) ? NetAddress.toCanonical(inet.success.address) : undefined
}

const validHost = /^(?:\[[0-9a-f:.]+\]|[a-z0-9._-]+)(?::\d{1,5})?$/i

/**
 * Applies the hop selected by walking the chain from the right. The transport
 * peer must be trusted; trusted hops are skipped and the first untrusted one is
 * the client. If every hop is trusted, the leftmost one is the client. An
 * unparseable hop leaves the request unchanged.
 *
 * @internal
 */
export const apply = (
  request: HttpServerRequest,
  isTrusted: Predicate<NetAddress.IpAddress>,
  getHops: (headers: Headers.Headers) => ReadonlyArray<Hop>
): HttpServerRequest => {
  const peer = parseNode(Option.getOrUndefined(request.remoteAddress))
  if (peer === undefined || !isTrusted(peer)) return request
  const hops = getHops(request.headers)
  let index = hops.length - 1
  let address: NetAddress.IpAddress | undefined
  for (; index >= 0; index--) {
    address = parseNode(hops[index].for)
    if (address === undefined) return request
    if (index === 0 || !isTrusted(address)) break
  }
  if (address === undefined) return request
  const { host, proto } = hops[index]
  const protocol = proto?.toLowerCase()
  return request.modify({
    remoteAddress: Option.some(NetAddress.formatIp(address)),
    peerAddress: request.peerAddress,
    ...(host !== undefined && validHost.test(host) ? { headers: Headers.set(request.headers, "host", host) } : {}),
    ...(protocol === "http" || protocol === "https" ? { protocol } : {})
  })
}

const splitList = (value: string | undefined): Array<string> | undefined => value?.split(",").map((_) => _.trim())

/**
 * `X-Forwarded-Host` and `X-Forwarded-Proto` are only associated with a hop
 * when they list exactly one value per `X-Forwarded-For` entry.
 *
 * @internal
 */
export const xForwardedHops = (headers: Headers.Headers): ReadonlyArray<Hop> => {
  const addresses = splitList(headers["x-forwarded-for"])
  if (addresses === undefined) return []
  const aligned = (list: Array<string> | undefined) => list?.length === addresses.length ? list : undefined
  const hosts = aligned(splitList(headers["x-forwarded-host"]))
  const protos = aligned(splitList(headers["x-forwarded-proto"]))
  return addresses.map((address, i) => ({ for: address, host: hosts?.[i], proto: protos?.[i] }))
}

const token = /^[!#$%&'*+.^_`|~0-9a-z-]+$/i

const addPair = (params: Map<string, string> | undefined, text: string): Map<string, string> | undefined => {
  text = text.trim()
  if (params === undefined || text === "") return params
  const separator = text.indexOf("=")
  if (separator <= 0) return undefined
  const name = text.slice(0, separator).trim().toLowerCase()
  let value = text.slice(separator + 1).trim()
  if (value.startsWith("\"")) {
    if (value.length < 2 || !value.endsWith("\"")) return undefined
    value = value.slice(1, -1).replace(/\\(.)/g, "$1")
  } else if (!token.test(value)) {
    return undefined
  }
  if (params.has(name)) return undefined
  return params.set(name, value)
}

const toHop = (params: Map<string, string> | undefined): Hop =>
  params === undefined
    ? { for: undefined }
    : { for: params.get("for"), host: params.get("host"), proto: params.get("proto") }

/**
 * Parses an RFC 7239 `Forwarded` header. Malformed elements become hops
 * without an address, which stops the chain walk.
 *
 * @internal
 */
export const forwardedHops = (headers: Headers.Headers): ReadonlyArray<Hop> => {
  const value = headers.forwarded
  if (value === undefined) return []
  const hops: Array<Hop> = []
  let params: Map<string, string> | undefined = new Map()
  let start = 0
  let quoted = false
  for (let i = 0; i <= value.length; i++) {
    const char = value[i]
    if (quoted) {
      if (char === "\\") i++
      else if (char === "\"") quoted = false
      continue
    }
    if (char === "\"") {
      quoted = true
    } else if (char === ";" || char === "," || i === value.length) {
      params = addPair(params, value.slice(start, i))
      start = i + 1
      if (char !== ";") {
        hops.push(toHop(params))
        params = new Map()
      }
    }
  }
  if (quoted) hops.push({ for: undefined })
  return hops
}
