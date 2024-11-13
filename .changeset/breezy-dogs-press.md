---
"effect": minor
---

`Data.Error#fromCause` and `Data.TaggedError#fromCause` have been added
`fromCause` takes all constructor options except property with name 'cause'
and returns function which accept specified type of cause (unknown by default) and created an instantiate the error
Basically, it is sugar for `(cause) => new MyError({ props: 1, cause })`

```ts
import { Data } from "Effect"

class MyError extends Data.TaggedError("MyError") {}

class MySecondError extends Data.TaggedError("MySecondError")<{
  prop: number
  cause: MyError
}> {}

MyError.fromCause() // (cause: unknown) => MyError
MySecondError.fromCause({ prop: 2 }) // (cause: MyError) => MySecondError

Effect.try({
  try: () => {
    throw new Error("External Error")
  },
  catch: MyError.fromCause()
}).pipe(Effect.mapError(MySecondError.fromCause({ prop: 2 })))
```
