---
"@effect/platform": patch
---

# Make baseUrl() more defensive in @effect/platform

Sometimes, third party code may patch a missing global `location` to accommodate for non-browser JavaScript
runtimes, e.g. Cloudflare Workers,
Deno. [Such patch](https://github.com/jamsinclair/jSquash/pull/21/files#diff-322ca97cdcdd0d3b85c20a7d5cac703a2f9f3766fc762f98b9f6a9d4c5063ca3R21-R23)
might not yield a fully valid `location`. This could
break `baseUrl()`, which is called by `makeUrl()`.

For example, the following code would log `Invalid URL: '/api/v1/users' with base 'NaN'`.

```js
import { makeUrl } from "@effect/platform/Http/UrlParams"

globalThis.location = {href: ""}

const url = makeUrl("/api/v1/users", [])

// This would log "Invalid URL: '/api/v1/users' with base 'NaN'",
// because location.origin + location.pathname return NaN in baseUrl()
console.log(url.left.message)
```

Arguably, this is not an issue of Effect per se, but it's better to be defensive and handle such cases gracefully.
So this change does that by checking if `location.orign` and `location.pathname` are available before accessing them.
