---
"@effect/schema": minor
---

# Breaking Changes

- The `Format` module has been removed

## `AST` module

- `Tuple` has been refactored to `TupleType`, and its `_tag` has consequently been renamed. The type of its `rest` property has changed from `Option.Option<ReadonlyArray.NonEmptyReadonlyArray<AST>>` to `ReadonlyArray<AST>`.
- `Transform` has been refactored to `Transformation`, and its `_tag` property has consequently been renamed. Its property `transformation` has now the type `TransformationKind = FinalTransformation | ComposeTransformation | TypeLiteralTransformation`.
- `createRecord` has been removed
- `AST.to` has been renamed to `AST.typeAST`
- `AST.from` has been renamed to `AST.encodedAST`
- `ExamplesAnnotation` and `DefaultAnnotation` now accept a type parameter
- `format` has been removed:
  Before

  ```ts
  AST.format(ast, verbose?)
  ```

  Now

  ```ts
  ast.toString(verbose?)
  ```

- `setAnnotation` has been removed (use `annotations` instead)
- `mergeAnnotations` has been renamed to `annotations`
- move `defaultParseOption` from `Parser.ts` to `AST.ts`

## `ParseResult` module

- The `ParseResult` module now uses classes and custom constructors have been removed:
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

- `Transform` has been refactored to `Transformation`, and its `kind` property now accepts `"Encoded"`, `"Transformation"`, or `"Type"` as values

## `Schema` module

- `uniqueSymbol` has been renamed to `uniqueSymbolFromSelf`
- `Schema.Schema.To` has been renamed to `Schema.Schema.Type`, and `Schema.to` to `Schema.typeSchema`
- `Schema.Schema.From` has been renamed to `Schema.Schema.Encoded`, and `Schema.from` to `Schema.encodedSchema`
- The type parameters of `TaggedRequest` have been swapped
- The signature of `PropertySignature` has been changed from `PropertySignature<From, FromOptional, To, ToOptional>` to `PropertySignature<ToToken extends Token, To, Key extends PropertyKey, FromToken extends Token, From, R>`
- Class APIs
  - Class APIs now expose `fields` and require an identifier
    ```diff
    -class A extends S.Class<A>()({ a: S.string }) {}
    +class A extends S.Class<A>("A")({ a: S.string }) {}
    ```
- `element` and `rest` have been removed in favor of `array` and `tuple`:

  Before

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema1 = S.tuple().pipe(S.rest(S.number), S.element(S.boolean));

  const schema2 = S.tuple(S.string).pipe(
    S.rest(S.number),
    S.element(S.boolean)
  );
  ```

  Now

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema1 = S.array(S.number, S.boolean);

  const schema2 = S.tuple([S.string], S.number, S.boolean);
  ```

- `optionalElement` has been refactored:

  Before

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema = S.tuple(S.string).pipe(S.optionalElement(S.number));
  ```

  Now

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema = S.tuple(S.string, S.optionalElement(S.number));
  ```

- use `TreeFormatter` in `BrandSchema`s
- Schema annotations interfaces have been refactored into a namespace `Annotations`
- the `annotations` option of the `optional` constructor has been replaced by the `annotations` method
  Before

  ```ts
  S.optional(S.string, {
    exact: true,
    annotations: { description: "description" },
  });
  ```

  Now

  ```ts
  S.optional(S.string, { exact: true }).annotations({
    description: "description",
  });
  ```

- Updated the `pluck` function to return `Schema<A[K], { readonly [key]: I[K] }>` instead of `Schema<A[K], I>`. Removed the `{ transformation: false }` option in favor of selecting the specific field from the `fields` exposed by a struct.
- Removed `propertySignatureAnnotations`, use `propertySignature(schema).annotations()`

## `Serializable` module

- The type parameters of `SerializableWithResult` and `WithResult` have been swapped
