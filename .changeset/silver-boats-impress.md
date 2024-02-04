---
"@effect/platform": patch
---

remove overloads from ClientRequest.make

This makes it easier to programatically create client request instances:

```
import * as Http from "@effect/platform/HttpClient"

declare const method: "GET" | "POST"
declare const url: string

Http.request.make(method)(url)
```
