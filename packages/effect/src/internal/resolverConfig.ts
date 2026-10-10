// Parsing of `resolv.conf` and hosts files.
import * as Arr from "../Array.ts"
import * as Duration from "../Duration.ts"
import * as Equal from "../Equal.ts"
import type * as DnsClient from "../net/DnsClient.ts"
import * as Host from "../net/Host.ts"
import * as NetAddress from "../net/NetAddress.ts"
import * as Result from "../Result.ts"

const clamp = (value: string, min: number, max: number): number | undefined => {
  const n = Number(value)
  return /^\d+$/.test(value) ? Math.min(Math.max(n, min), max) : undefined
}

/** @internal */
export const parseResolvConf = (text: string): DnsClient.ResolvConf => {
  const nameServers: Array<NetAddress.InetAddress> = []
  let search: ReadonlyArray<Host.DomainName> | undefined
  let ndots: number | undefined
  let timeout: Duration.Duration | undefined
  let attempts: number | undefined
  let rotate: boolean | undefined
  let useTcp: boolean | undefined
  let noAaaa: boolean | undefined
  for (const line of text.split(/\r?\n/)) {
    const [keyword, ...values] = line.trim().split(/\s+/)
    if (keyword === undefined || keyword.startsWith("#") || keyword.startsWith(";")) continue
    switch (keyword) {
      case "nameserver": {
        const value = values[0]
        if (value === undefined || nameServers.length === 3) break
        const address = NetAddress.inetAddressFromString(value.includes(":") ? `[${value}]:53` : `${value}:53`)
        if (Result.isSuccess(address)) nameServers.push(address.success)
        break
      }
      case "domain":
      case "search":
        search = Arr.filterMap(
          keyword === "domain" ? values.slice(0, 1) : values,
          (value) => Host.domainNameFromString(value)
        )
        break
      case "options":
        for (const option of values) {
          const [name, value = ""] = option.split(":", 2)
          switch (name) {
            case "ndots":
              ndots = clamp(value, 0, 15) ?? ndots
              break
            case "timeout": {
              const seconds = clamp(value, 1, 30)
              if (seconds !== undefined) timeout = Duration.seconds(seconds)
              break
            }
            case "attempts":
              attempts = clamp(value, 1, 5) ?? attempts
              break
            case "rotate":
              rotate = true
              break
            case "use-vc":
            case "usevc":
            case "tcp":
              useTcp = true
              break
            case "no-aaaa":
              noAaaa = true
              break
          }
        }
        break
    }
  }
  return { nameServers, search, ndots, timeout, attempts, rotate, useTcp, noAaaa }
}

/** @internal */
export const relative = (name: string): string => name.length > 1 && name.endsWith(".") ? name.slice(0, -1) : name

/** @internal */
export const parseHosts = (text: string): DnsClient.Hosts => {
  const hosts = new Map<Host.DomainName, Array<NetAddress.IpAddress>>()
  for (const line of text.split(/\r?\n/)) {
    const comment = line.indexOf("#")
    const [first, ...names] = (comment === -1 ? line : line.slice(0, comment)).trim().split(/\s+/)
    const address = NetAddress.ipFromString(first)
    if (Result.isFailure(address)) continue
    for (const name of names) {
      const domain = Host.domainNameFromString(name)
      if (Result.isFailure(domain)) continue
      const key = relative(domain.success) as Host.DomainName
      const addresses = hosts.get(key)
      if (addresses === undefined) hosts.set(key, [address.success])
      else if (!addresses.some((existing) => Equal.equals(existing, address.success))) addresses.push(address.success)
    }
  }
  return hosts as unknown as DnsClient.Hosts
}
