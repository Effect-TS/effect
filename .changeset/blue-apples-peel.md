---
"@effect/schema": minor
---

- Schema: change `PropertySignature` signature from booleans to `"?" | "!"`

- Schema: rename `Class` interface to `ClassSchema`

- Schema: expose `fields` (`Class` API) and remove `struct`

  ```ts
  import * as S from "@effect/schema/Schema";

  class Person extends S.Class<Person>()({
    name: S.string,
    age: S.number,
  }) {}

  /*
  const personFields: {
      a: S.Schema<string, string, never>;
      b: S.Schema<number, number, never>;
  }
  */
  const personFields = Person.fields;

  // instead of Person.struct
  const struct = S.struct(Person.fields);

  /*
  instead of:
  class PersonWithGender extends Person.extend<PersonWithGender>()({
    gender: S.string
  }) {}
  */
  class PersonWithGender extends S.Class<PersonWithGender>()({
    gender: S.string,
    ...Person.fields,
  }) {}

  /*
  const personWithGenderFields: {
      name: S.Schema<string, string, never>;
      age: S.Schema<number, number, never>;
      gender: S.Schema<string, string, never>;
  }
  */
  const personWithGenderFields = PersonWithGender.fields;
  ```

- Schema: rename `uniqueSymbol` to `uniqueSymbolFromSelf`

- AST: refactor `ExamplesAnnotation` and `DefaultAnnotation` to accept a type parameter

- Schema: use `TreeFormatter` in `BrandSchema`s

- refactor Schema annotations interfaces:

  - add `PropertySignatureAnnotation` (baseline)
  - remove `DocAnnotations`
  - rename `DeclareAnnotations` to `Annotations`

- remove `Format` module

- ParseResult: switch to classes and remove constructors

  Before

  ```ts
  import * as ParseResult from "@effect/schema/ParseResult";

  ParseResult.type(ast, actual);
  ```

  Now

  ```ts
  import * as ParseResult from "@effect/schema/ParseResult";

  new ParseResult.Type(ast, actual);
  ```

- AST: simplify `AST.PropertySignatureTransform`:

  - remove `FinalPropertySignatureTransformation`, `isFinalPropertySignatureTransformation`
  - rename `PropertySignatureTransform` to `PropertySignatureTransformation` and change constructor signature

- AST: remove `format`

  Before

  ```ts
  AST.format(ast, verbose?)
  ```

  Now

  ```ts
  ast.toString(verbose?)
  ```

- Updated the `MessageAnnotation` type to return `string | Effect<string>`.

  TreeFormatter:

  - add `formatErrorEffect`
  - add `formatIssueEffect`
  - remove `formatIssues`

  ArrayFormatter:

  - add `formatErrorEffect`
  - add `formatIssueEffect`
  - remove `formatIssues`

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

- AST: switch to classes and remove constructors

  Before

  ```ts
  import * as AST from "@effect/schema/AST";

  AST.createLiteral("a");
  ```

  Now

  ```ts
  import * as AST from "@effect/schema/AST";

  new AST.Literal("a");
  ```

- AST: remove `setAnnotation` (use `annotations` instead) and rename `mergeAnnotations` to `annotations`

- move `defaultParseOption` from `Parser.ts` to `AST.ts`

- replace `propertySignatureAnnotations` with `asPropertySignature`, add `annotations` method to `PropertySignature` and
  remove all `annotations` parameters to PropertySignature APIs (use the `annotations` method instead)

  Before

  ```ts
  S.string.pipe(S.propertySignatureAnnotations({ description: "description" }));

  S.optional(S.string, {
    exact: true,
    annotations: { description: "description" },
  });
  ```

  Now

  ```ts
  S.asPropertySignature(S.string).annotations({ description: "description" });

  S.optional(S.string, { exact: true }).annotations({
    description: "description",
  });
  ```
