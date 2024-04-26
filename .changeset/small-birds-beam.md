---
"effect": minor
---

add $is & $match helpers to Data.TaggedEnum constructors

```ts
import { Data } from "effect"

type HttpError = Data.TaggedEnum<{
  NotFound: {}
  InternalServerError: { reason: string }
}>
const { $is, $match, InternalServerError, NotFound } =
  Data.taggedEnum<HttpError>()

// create a matcher
const matcher = $match({
  NotFound: () => 0,
  InternalServerError: () => 1
})

// true
$is("NotFound")(NotFound())

// false
$is("NotFound")(InternalServerError({ reason: "fail" }))
```
