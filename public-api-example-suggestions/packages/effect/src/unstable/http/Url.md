# Example Suggestions: `effect/unstable/http/Url`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/Url.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 2 recommended, 10 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                    | Line | Kind               | Priority        |
| -------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/Url.UrlError`    |   24 | `root-declaration` | **recommended** |
| `effect/unstable/http/Url.make`        |   38 | `root-declaration` | **recommended** |
| `effect/unstable/http/Url.setHash`     |  167 | `root-declaration` | **optional**    |
| `effect/unstable/http/Url.setHost`     |  178 | `root-declaration` | **optional**    |
| `effect/unstable/http/Url.setHostname` |  189 | `root-declaration` | **optional**    |
| `effect/unstable/http/Url.setHref`     |  200 | `root-declaration` | **optional**    |
| `effect/unstable/http/Url.setPassword` |  211 | `root-declaration` | **optional**    |
| `effect/unstable/http/Url.setPathname` |  227 | `root-declaration` | **optional**    |
| `effect/unstable/http/Url.setPort`     |  238 | `root-declaration` | **optional**    |
| `effect/unstable/http/Url.setProtocol` |  249 | `root-declaration` | **optional**    |
| `effect/unstable/http/Url.setSearch`   |  260 | `root-declaration` | **optional**    |
| `effect/unstable/http/Url.setUsername` |  271 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/http/Url.UrlError`

- **Source:** `packages/effect/src/unstable/http/Url.ts:24`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error returned when constructing a `URL` fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.UrlError`.
- **Suggested snippet:** Create or capture `Url.UrlError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Url.make`

- **Source:** `packages/effect/src/unstable/http/Url.ts:38`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `URL` safely by appending `UrlParams` and an optional hash to a URL string.
- **Signature hint:** `declare function make(url: string, params: UrlParams.UrlParams, hash: string | undefined): Result.Result<URL, UrlError>`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.make`.
- **Suggested snippet:** Call `Url.make` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/Url.setHash`

- **Source:** `packages/effect/src/unstable/http/Url.ts:167`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Updates the hash fragment of the URL.
- **Signature hint:** `declare function setHash(hash: string): (url: URL) => URL declare function setHash(url: URL, hash: string): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setHash`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the hash fragment of the URL. Call `Url.setHash` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Url.setHost`

- **Source:** `packages/effect/src/unstable/http/Url.ts:178`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Updates the host (domain and port) of the URL.
- **Signature hint:** `declare function setHost(host: string): (url: URL) => URL declare function setHost(url: URL, host: string): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setHost`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the host (domain and port) of the URL. Call `Url.setHost` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Url.setHostname`

- **Source:** `packages/effect/src/unstable/http/Url.ts:189`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Updates the domain of the URL without modifying the port.
- **Signature hint:** `declare function setHostname(hostname: string): (url: URL) => URL declare function setHostname(url: URL, hostname: string): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setHostname`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the domain of the URL without modifying the port. Call `Url.setHostname` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Url.setHref`

- **Source:** `packages/effect/src/unstable/http/Url.ts:200`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Replaces the entire URL string.
- **Signature hint:** `declare function setHref(href: string): (url: URL) => URL declare function setHref(url: URL, href: string): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setHref`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Replaces the entire URL string. Call `Url.setHref` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Url.setPassword`

- **Source:** `packages/effect/src/unstable/http/Url.ts:211`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Updates the password used for authentication.
- **Signature hint:** `declare function setPassword(password: string | Redacted.Redacted): (url: URL) => URL declare function setPassword(url: URL, password: string | Redacted.Redacted): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setPassword`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the password used for authentication. Call `Url.setPassword` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Url.setPathname`

- **Source:** `packages/effect/src/unstable/http/Url.ts:227`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Updates the path of the URL.
- **Signature hint:** `declare function setPathname(pathname: string): (url: URL) => URL declare function setPathname(url: URL, pathname: string): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setPathname`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the path of the URL. Call `Url.setPathname` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Url.setPort`

- **Source:** `packages/effect/src/unstable/http/Url.ts:238`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Updates the port of the URL.
- **Signature hint:** `declare function setPort(port: string | number): (url: URL) => URL declare function setPort(url: URL, port: string | number): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setPort`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the port of the URL. Call `Url.setPort` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Url.setProtocol`

- **Source:** `packages/effect/src/unstable/http/Url.ts:249`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Updates the protocol (e.g., `http`, `https`).
- **Signature hint:** `declare function setProtocol(protocol: string): (url: URL) => URL declare function setProtocol(url: URL, protocol: string): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setProtocol`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the protocol (e.g., `http`, `https`). Call `Url.setProtocol` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Url.setSearch`

- **Source:** `packages/effect/src/unstable/http/Url.ts:260`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Updates the query string of the URL.
- **Signature hint:** `declare function setSearch(search: string): (url: URL) => URL declare function setSearch(url: URL, search: string): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setSearch`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the query string of the URL. Call `Url.setSearch` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Url.setUsername`

- **Source:** `packages/effect/src/unstable/http/Url.ts:271`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **optional**
- **Current description:** Updates the username used for authentication.
- **Signature hint:** `declare function setUsername(username: string): (url: URL) => URL declare function setUsername(url: URL, username: string): URL`
- **Import guidance:** Start from `import { Url } from "effect/unstable/http"` and use `Url.setUsername`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the username used for authentication. Call `Url.setUsername` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
