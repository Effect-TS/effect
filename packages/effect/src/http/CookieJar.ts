/**
 * Client-side cookie storage scoped by domain, path and scheme.
 *
 * A `CookieJar` stores cookies received in `Set-Cookie` response headers and
 * selects the cookies to send with a later request, following the storage and
 * retrieval rules of RFC 6265. Unlike `Cookies`, which is keyed by cookie name,
 * a jar identifies a cookie by its name, domain and path, so cookies with the
 * same name from different hosts are kept independently.
 *
 * **Gotchas**
 *
 * - There is no public suffix list. A `Domain` attribute is accepted whenever
 *   the request host domain-matches it, unless the host is an IP address or the
 *   domain is a single label such as `com`, so `foo.co.uk` can set
 *   `Domain=co.uk`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Duration from "../Duration.ts"
import { dual } from "../Function.ts"
import * as Inspectable from "../Inspectable.ts"
import { type Pipeable, pipeArguments } from "../Pipeable.ts"
import * as Predicate from "../Predicate.ts"
import * as Cookies from "./Cookies.ts"

const TypeId = "~effect/http/CookieJar"

/**
 * Returns `true` when a value is a `CookieJar`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isCookieJar = (u: unknown): u is CookieJar => Predicate.hasProperty(u, TypeId)

/**
 * Immutable client-side cookie store.
 *
 * **Details**
 *
 * Entries are kept in creation order. Replacing a cookie keeps its original
 * position.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface CookieJar extends Pipeable, Inspectable.Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly entries: ReadonlyArray<Entry>
}

/**
 * A stored cookie with the scope resolved when it was received.
 *
 * **Details**
 *
 * `domain` is the request host for host-only cookies and the `Domain`
 * attribute otherwise. `expiresAt` is in epoch milliseconds, or `undefined` for
 * a session cookie.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Entry {
  readonly cookie: Cookies.Cookie
  readonly domain: string
  readonly hostOnly: boolean
  readonly path: string
  readonly expiresAt: number | undefined
}

const Proto: Omit<CookieJar, "entries"> = {
  [TypeId]: TypeId,
  ...Inspectable.BaseProto,
  toJSON(this: CookieJar) {
    return {
      _id: "effect/CookieJar",
      entries: this.entries.map((entry) => ({ ...entry, cookie: entry.cookie.toJSON() }))
    }
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const make = (entries: ReadonlyArray<Entry>): CookieJar => {
  const self = Object.create(Proto)
  self.entries = entries
  return self
}

/**
 * A cookie jar with no cookies.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const empty: CookieJar = make([])

/**
 * Stores the cookies from a response received from `url`.
 *
 * **Details**
 *
 * A cookie without a `Domain` attribute is host-only and is sent back only to
 * the exact request host. A `Domain` attribute is accepted only when the
 * request host domain-matches it. Without a `Path` attribute the cookie uses
 * the default path of `url`. `Max-Age` takes precedence over `Expires`, and
 * `now` (epoch milliseconds) resolves both to an absolute expiry.
 *
 * A cookie replaces the stored cookie with the same name, domain and path,
 * whether or not either is host-only. A cookie that is already expired removes
 * that stored cookie instead. The jar is returned unchanged when `url` is not a
 * valid absolute URL.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const setFromResponse: {
  (url: string | URL, cookies: Cookies.Cookies, now: number): (self: CookieJar) => CookieJar
  (self: CookieJar, url: string | URL, cookies: Cookies.Cookies, now: number): CookieJar
} = dual(4, (self: CookieJar, url: string | URL, cookies: Cookies.Cookies, now: number): CookieJar => {
  const parsed = parseUrl(url)
  if (parsed === undefined) {
    return self
  }
  const entries = self.entries.slice()
  for (const cookie of Object.values(cookies.cookies)) {
    const entry = makeEntry(parsed, cookie, now)
    if (entry === undefined) {
      continue
    }
    const index = entries.findIndex((existing) =>
      existing.cookie.name === cookie.name && existing.domain === entry.domain && existing.path === entry.path
    )
    if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
      if (index !== -1) entries.splice(index, 1)
    } else if (index === -1) {
      entries.push(entry)
    } else {
      entries[index] = entry
    }
  }
  return make(entries)
})

/**
 * Returns the cookies to send with a request to `url` as a `Cookies`
 * collection.
 *
 * **When to use**
 *
 * Use to inspect the cookies for a URL. Use `toCookieHeader` to build the
 * request header, which keeps every matching cookie.
 *
 * **Details**
 *
 * Selects unexpired cookies whose domain and path match `url`, skipping
 * `Secure` cookies unless `url` uses `https`. Because `Cookies` is keyed by
 * name, only the most specific cookie for each name is kept: the one with the
 * longest path, then the earliest stored.
 *
 * @stability unstable
 * @category accessors
 * @since 4.0.0
 */
export const cookiesFor: {
  (url: string | URL, now: number): (self: CookieJar) => Cookies.Cookies
  (self: CookieJar, url: string | URL, now: number): Cookies.Cookies
} = dual(3, (self: CookieJar, url: string | URL, now: number): Cookies.Cookies => {
  const seen = new Set<string>()
  const cookies: Array<Cookies.Cookie> = []
  for (const cookie of matching(self, url, now)) {
    if (!seen.has(cookie.name)) {
      seen.add(cookie.name)
      cookies.push(cookie)
    }
  }
  return Cookies.fromIterable(cookies)
})

/**
 * Serializes the cookies to send with a request to `url` into a `Cookie`
 * header value.
 *
 * **Details**
 *
 * Uses the same selection as `cookiesFor`, but keeps every matching cookie,
 * including cookies with the same name and different paths or domains, ordered
 * by longest path first. Returns `undefined` when no cookie matches.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const toCookieHeader: {
  (url: string | URL, now: number): (self: CookieJar) => string | undefined
  (self: CookieJar, url: string | URL, now: number): string | undefined
} = dual(3, (self: CookieJar, url: string | URL, now: number): string | undefined => {
  const cookies = matching(self, url, now)
  return cookies.length === 0
    ? undefined
    : cookies.map((cookie) => `${cookie.name}=${cookie.valueEncoded}`).join("; ")
})

const parseUrl = (url: string | URL): URL | undefined => {
  if (typeof url !== "string") {
    return url
  }
  try {
    return new URL(url)
  } catch {
    return undefined
  }
}

const isIpAddress = (host: string): boolean => host.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(host)

const domainMatches = (host: string, domain: string): boolean =>
  host === domain || (host.endsWith("." + domain) && !isIpAddress(host))

const pathMatches = (requestPath: string, cookiePath: string): boolean =>
  requestPath === cookiePath ||
  (requestPath.startsWith(cookiePath) &&
    (cookiePath.endsWith("/") || requestPath[cookiePath.length] === "/"))

const defaultPath = (pathname: string): string => {
  const index = pathname.lastIndexOf("/")
  return index <= 0 ? "/" : pathname.slice(0, index)
}

const makeEntry = (url: URL, cookie: Cookies.Cookie, now: number): Entry | undefined => {
  const host = url.hostname
  const options = cookie.options
  let domain = host
  let hostOnly = true
  const attribute = options?.domain?.replace(/^\./, "").toLowerCase()
  if (attribute) {
    if (isIpAddress(host) || !domainMatches(host, attribute)) {
      return undefined
    }
    if (attribute.includes(".")) {
      domain = attribute
      hostOnly = false
    } else if (attribute !== host) {
      // a single-label domain such as "com" is treated like a public suffix
      return undefined
    }
  }
  return {
    cookie,
    domain,
    hostOnly,
    path: options?.path?.startsWith("/") ? options.path : defaultPath(url.pathname),
    expiresAt: options?.maxAge !== undefined ? now + Duration.toMillis(options.maxAge) : options?.expires?.getTime()
  }
}

const matching = (self: CookieJar, url: string | URL, now: number): Array<Cookies.Cookie> => {
  const parsed = parseUrl(url)
  if (parsed === undefined) {
    return []
  }
  const host = parsed.hostname
  const secure = parsed.protocol === "https:"
  return self.entries
    .filter((entry) =>
      (entry.expiresAt === undefined || entry.expiresAt > now) &&
      (entry.hostOnly ? host === entry.domain : domainMatches(host, entry.domain)) &&
      pathMatches(parsed.pathname, entry.path) &&
      (secure || !entry.cookie.options?.secure)
    )
    .sort((a, b) => b.path.length - a.path.length)
    .map((entry) => entry.cookie)
}
