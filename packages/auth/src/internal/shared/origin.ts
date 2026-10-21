import * as Schema from "effect/Schema"

/** @internal */
export const origin = Schema.String.check(
  Schema.makeFilter((value) => {
    try {
      const url = new URL(value)

      return (
        url.origin === value &&
        (url.protocol === "https:" ||
          (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
      )
    } catch {
      return false
    }
  })
)

/** @internal */
export const httpsOrigin = origin.check(
  Schema.makeFilter(
    (value) => value.startsWith("https:") && !new URL(value).hostname.includes("*")
  )
)

/**
 * Bare DNS host; cookie domains never contain a leading dot or URL components.
 *
 * @internal
 */
export const cookieDomain = Schema.String.check(
  Schema.isMaxLength(253),
  Schema.isPattern(
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/
  )
)

/** @internal */
export const originWithinDomain = (value: string, domain: string) => {
  const host = new URL(value).hostname
  const normalized = domain.toLowerCase()

  return host === normalized || host.endsWith(`.${normalized}`)
}
