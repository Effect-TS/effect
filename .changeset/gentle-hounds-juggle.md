---
"@effect/schema": minor
---

Updated the `MessageAnnotation` type to return `string | Effect<string>`.

You can now return an `Effect<string>` if your message needs some optional service:

```ts
import * as S from "@effect/schema/Schema";
import * as TreeFormatter from "@effect/schema/TreeFormatter";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as Option from "effect/Option";

class Messages extends Context.Tag("Messages")<
  Messages,
  {
    NonEmpty: string;
  }
>() {}

const Name = S.NonEmpty.pipe(
  S.message(() =>
    Effect.gen(function* (_) {
      const service = yield* _(Effect.serviceOption(Messages));
      return Option.match(service, {
        onNone: () => "Invalid string",
        onSome: (messages) => messages.NonEmpty,
      });
    })
  )
);

S.decodeUnknownSync(Name)(""); // => throws "Invalid string"

const result = S.decodeUnknownEither(Name)("").pipe(
  Either.mapLeft((error) =>
    TreeFormatter.formatErrorEffect(error).pipe(
      Effect.provideService(Messages, { NonEmpty: "should be non empty" }),
      Effect.runSync
    )
  )
);

console.log(result); // => { _id: 'Either', _tag: 'Left', left: 'should be non empty' }
```
