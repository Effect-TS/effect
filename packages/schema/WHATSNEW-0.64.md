# Type Extractors

The `To` and `From` type extractors have been renamed to `Type` and `Encoded` respectively.

Before:

```ts
import * as S from "@effect/schema/Schema";

const schema = S.string;

type SchemaType = S.Schema.To<typeof schema>;
type SchemaEncoded = S.Schema.From<typeof schema>;
```

Now:

```ts
import * as S from "@effect/schema/Schema";

const schema = S.string;

type SchemaType = S.Schema.Type<typeof schema>;
type SchemaEncoded = S.Schema.Encoded<typeof schema>;
```

The reason for this change is that the terms "From" and "To" were too generic and depended on the context. For example, when encoding, the meaning of "From" and "To" were reversed.

As a consequence, the APIs `AST.to`, `AST.from`, `Schema.to`, and `Schema.from` have been renamed respectively to `AST.typeAST`, `AST.encodedAST`, `Schema.typeSchema`, and `Schema.encodedSchema`.

# New `annotations` method

Now, in addition to the `pipe` method, all schemas have a `annotations` method that can be used to add annotations:

```ts
import * as S from "@effect/schema/Schema";

const Name = S.string.annotations({ identifier: "Name" });
```

For backward compatibility and to leverage a pipeline, you can still use the pipeable `S.annotations` API:

```ts
import * as S from "@effect/schema/Schema";

const Name = S.string.pipe(S.annotations({ identifier: "Name" }));
```

# API Interfaces

## What's an API Interface?

An "API Interface" is an `interface` specifically defined for a schema exported from `@effect/schema` or for a particular API exported from `@effect/schema`. Let's see an example with a simple schema:

**Example** (an `Age` schema)

```ts
import * as S from "@effect/schema/Schema";

// API interface
interface Age extends S.Schema<number> {}

const Age: Age = S.number.pipe(S.between(0, 100));

// type AgeType = number
type AgeType = S.Schema.Type<typeof Age>;
// type AgeEncoded = number
type AgeEncoded = S.Schema.Encoded<typeof Age>;
```

The benefit is that when we hover over the `Age` schema, we see `Age` instead of `Schema<number, number, never>`. This is a small improvement if we only think about the `Age` schema, but as we'll see shortly, these improvements in schema visualization add up, resulting in a significant improvement in the readability of our schemas.

Many of the built-in schemas exported from `@effect/schema` have been equipped with API interfaces, for example `number` or `never`.

```ts
import * as S from "@effect/schema/Schema";

// const number: S.$number
S.number;

// const never: S.$never
S.never;
```

**Note**. Notice that we had to add a `$` suffix to the API interface name because we couldn't simply use "number" since it's a reserved name for the TypeScript `number` type.

Now let's see an example with a combinator that, given an input schema for a certain type `A`, returns the schema of the pair `readonly [A, A]`:

**Example** (a `pair` combinator)

```ts
import * as S from "@effect/schema/Schema";

// API interface
export interface pair<S extends S.Schema.Any>
  extends S.Schema<
    readonly [S.Schema.Type<S>, S.Schema.Type<S>],
    readonly [S.Schema.Encoded<S>, S.Schema.Encoded<S>],
    S.Schema.Context<S>
  > {}

// API
export const pair = <S extends S.Schema.Any>(schema: S): pair<S> =>
  S.tuple(S.asSchema(schema), S.asSchema(schema));
```

**Note**: The `S.Schema.Any` helper represents any schema, except for `never`. For more information on the `asSchema` helper, refer to the following section "Understanding Opaque Names".

If we try to use our `pair` combinator, we see that readability is also improved in this case:

```ts
// const Coords: pair<S.$number>
const Coords = pair(S.number);
```

In hover, we simply see `pair<S.$number>` instead of the old:

```ts
// const Coords: S.Schema<readonly [number, number], readonly [number, number], never>
const Coords = S.tuple(S.number, S.number);
```

The new name is not only shorter and more readable but also carries along the origin of the schema, which is a call to the `pair` combinator.

## Understanding Opaque Names

Opaque names generated in this way are very convenient, but sometimes there's a need to see what the underlying types are, perhaps for debugging purposes while you declare your schemas. At any time, you can use the `asSchema` function, which returns an `Schema<A, I, R>` compatible with your opaque definition:

```ts
// const Coords: pair<S.$number>
const Coords = pair(S.number);

// const NonOpaqueCoords: S.Schema<readonly [number, number], readonly [number, number], never>
const NonOpaqueCoords = S.asSchema(Coords);
```

**Note**. The call to `asSchema` is negligible in terms of overhead since it's nothing more than a glorified identity function.

Many of the built-in combinators exported from `@effect/schema` have been equipped with API interfaces, for example `struct`:

```ts
import * as S from "@effect/schema/Schema";

/*
const Person: S.struct<{
    name: S.$string;
    age: S.$number;
}>
*/
const Person = S.struct({
  name: S.string,
  age: S.number,
});
```

In hover, we simply see:

```ts
const Person: S.struct<{
  name: S.$string;
  age: S.$number;
}>;
```

instead of the old:

```ts
const Person: S.Schema<
  {
    readonly name: string;
    readonly age: number;
  },
  {
    readonly name: string;
    readonly age: number;
  },
  never
>;
```

## Exposing Arguments

The benefits of API interfaces don't end with better readability; in fact, the driving force behind the introduction of API interfaces arises more from the need to expose some important information about the schemas that users generate. Let's see some examples related to literals and structs:

**Example** (exposed literals)

Now when we define literals, we can retrieve them using the `literals` field exposed by the generated schema:

```ts
import * as S from "@effect/schema/Schema";

// const myliterals: S.literal<["A", "B"]>
const myliterals = S.literal("A", "B");

// literals: readonly ["A", "B"]
myliterals.literals;

console.log(myliterals.literals); // Output: [ 'A', 'B' ]
```

**Example** (exposed fields)

Similarly to what we've seen for literals, when we define a struct, we can retrieve its `fields`:

```ts
import * as S from "@effect/schema/Schema";

/*
const Person: S.struct<{
    name: S.$string;
    age: S.$number;
}>
*/
const Person = S.struct({
  name: S.string,
  age: S.number,
});

/*
fields: {
    readonly name: S.$string;
    readonly age: S.$number;
}
*/
Person.fields;

console.log(Person.fields);
/*
{
  name: Schema {
    ast: StringKeyword { _tag: 'StringKeyword', annotations: [Object] },
    ...
  },
  age: Schema {
    ast: NumberKeyword { _tag: 'NumberKeyword', annotations: [Object] },
    ...
  }
}
*/
```

Being able to retrieve the `fields` is particularly advantageous when you want to extend a struct with new fields; now you can do it simply using the spread operator:

```ts
import * as S from "@effect/schema/Schema";

const Person = S.struct({
  name: S.string,
  age: S.number,
});

/*
const PersonWithId: S.struct<{
    id: S.$number;
    name: S.$string;
    age: S.$number;
}>
*/
const PersonWithId = S.struct({
  ...Person.fields,
  id: S.number,
});
```

The list of APIs equipped with API interfaces is extensive; here we provide only the main ones just to give you an idea of the new development possibilities that have opened up:

```ts
import * as S from "@effect/schema/Schema";

// ------------------------
// array value
// ------------------------

// value: S.$string
S.array(S.string).value;

// ------------------------
// record key and value
// ------------------------

// key: S.$string
S.record(S.string, S.number).key;
// value: S.$number
S.record(S.string, S.number).value;

// ------------------------
// union members
// ------------------------

// members: readonly [S.$string, S.$number]
S.union(S.string, S.number).members;

// ------------------------
// tuple elements
// ------------------------

// elements: readonly [S.$string, S.$number]
S.tuple(S.string, S.number).elements;
```

## Annotation Compatibility

All the API interfaces equipped with schemas and built-in combinators are compatible with the `annotations` method, meaning that their type is not lost but remains the original one before annotation:

```ts
import * as S from "@effect/schema/Schema";

// const Name: S.$string
const Name = S.string.annotations({ identifier: "Name" });
```

As you can see, the type of `Name` is still `$string` and has not been lost, becoming `Schema<string, string, never>`.

This doesn't happen by default with API interfaces defined in userland:

```ts
import * as S from "@effect/schema/Schema";

// API interface
interface Age extends S.Schema<number> {}

const Age: Age = S.number.pipe(S.between(0, 100));

// const AnotherAge: S.Schema<number, number, never>
const AnotherAge = Age.annotations({ identifier: "AnotherAge" });
```

However, the fix is very simple; just modify the definition of the `Age` API interface using the `Annotable` interface exported by `@effect/schema`:

```ts
import * as S from "@effect/schema/Schema";

// API interface
interface Age extends S.Annotable<Age, number> {}

const Age: Age = S.number.pipe(S.between(0, 100));

// const AnotherAge: Age
const AnotherAge = Age.annotations({ identifier: "AnotherAge" });
```

# Class APIs

Now, defining a `Class` requires an identifier (to avoid dual package hazard):

```ts
// new required identifier  v
//                          v
class A extends S.Class<A>("A")({ a: S.string }) {}
```

Similar to the case with `struct`, classes now also expose `fields`:

```ts
import * as S from "@effect/schema/Schema";

class A extends S.Class<A>("A")({ a: S.string }) {}

/*
fields: {
    readonly a: S.$string;
}
*/
A.fields;
```

# Enhanced `struct` Constructor

Now the `struct` constructor optionally accepts a list of key/value pairs representing index signatures:

```ts
const struct = (props, ...indexSignatures)
```

**Example**

```ts
import * as S from "@effect/schema/Schema";

/*
const opaque: S.typeLiteral<{
    a: S.$number;
}, readonly [{
    readonly key: S.$string;
    readonly value: S.$number;
}]>
*/
const opaque = S.struct(
  {
    a: S.number,
  },
  { key: S.string, value: S.number }
);

/*
const nonOpaque: S.Schema<{
    readonly [x: string]: number;
    readonly a: number;
}, {
    readonly [x: string]: number;
    readonly a: number;
}, never>
*/
const nonOpaque = S.asSchema(opaque);
```

Since the `record` constructor returns a schema that exposes both the `key` and the `value`, instead of passing a bare object `{ key, value }`, you can use the `record` constructor:

```ts
import * as S from "@effect/schema/Schema";

/*
const opaque: S.typeLiteral<{
    a: S.$number;
}, readonly [S.record<S.$string, S.$number>]>
*/
const opaque = S.struct(
  {
    a: S.number,
  },
  S.record(S.string, S.number)
);

/*
const nonOpaque: S.Schema<{
    readonly [x: string]: number;
    readonly a: number;
}, {
    readonly [x: string]: number;
    readonly a: number;
}, never>
*/
const nonOpaque = S.asSchema(opaque);
```

# Enhanced `tuple` Constructor

The `tuple` constructor has been improved to allow building any variant supported by TypeScript:

## Required Elements

As before, to define a tuple with required elements, simply specify the list of elements:

```ts
import * as S from "@effect/schema/Schema";

// const opaque: S.tuple<[S.$string, S.$number]>
const opaque = S.tuple(S.string, S.number);

// const nonOpaque: S.Schema<readonly [string, number], readonly [string, number], never>
const nonOpaque = S.asSchema(opaque);
```

## Optional Elements

To define an optional element, wrap the schema of the element with the `optionalElement` modifier:

```ts
import * as S from "@effect/schema/Schema";

// const opaque: S.tuple<[S.$string, S.OptionalElement<S.$number>]>
const opaque = S.tuple(S.string, S.optionalElement(S.number));

// const nonOpaque: S.Schema<readonly [string, number?], readonly [string, number?], never>
const nonOpaque = S.asSchema(opaque);
```

## Rest Element

To define rest elements, follow the list of elements (required or optional) with an element for the rest:

```ts
import * as S from "@effect/schema/Schema";

// const opaque: S.tupleType<readonly [S.$string, S.OptionalElement<S.$number>], [S.$boolean]>
const opaque = S.tuple([S.string, S.optionalElement(S.number)], S.boolean);

// const nonOpaque: S.Schema<readonly [string, number?, ...boolean[]], readonly [string, number?, ...boolean[]], never>
const nonOpaque = S.asSchema(opaque);
```

and optionally other elements that follow the rest:

```ts
import * as S from "@effect/schema/Schema";

// const opaque: S.tupleType<readonly [S.$string, S.OptionalElement<S.$number>], [S.$boolean, S.$string]>
const opaque = S.tuple(
  [S.string, S.optionalElement(S.number)],
  S.boolean,
  S.string
);

// const nonOpaque: S.Schema<readonly [string, number | undefined, ...boolean[], string], readonly [string, number | undefined, ...boolean[], string], never>
const nonOpaque = S.asSchema(opaque);
```

## Enhanced `array` Constructor

The `array` constructor has been improved and now optionally accepts rest elements:

```ts
import * as S from "@effect/schema/Schema";

// const opaque: S.tupleType<readonly [], [S.$string, S.$number]>
const opaque = S.array(S.string, S.number);

// const nonOpaque: S.Schema<readonly [...string[], number], readonly [...string[], number], never>
const nonOpaque = S.asSchema(opaque);
```

# Property Signatures

The definition of property signatures has been completely redesigned to allow for any type of transformation. Recall that a `PropertySignature` generally represents a transformation from a "From" field:

```ts
{
  fromKey: fromType;
}
```

to a "To" field:

```ts
{
  toKey: toType;
}
```

Let's start with the simple definition of a property signature that can be used to add annotations:

```ts
import * as S from "@effect/schema/Schema";

/*
const Person: S.struct<{
    name: S.$string;
    age: S.PropertySignature<":", number, never, ":", string, never>;
}>
*/
const Person = S.struct({
  name: S.string,
  age: S.propertySignature(S.NumberFromString).annotations({ title: "Age" }),
});
```

Let's delve into the details of all the information contained in the type of a `PropertySignature`:

```ts
age: PropertySignature<ToToken, ToType, FromKey, FromToken, FromType, Context>;
```

- `age`: is the key of the "To" field
- `ToToken`: either `"?:"` or `":"`, `"?:"` indicates that the "To" field is optional, `":"` indicates that the "To" field is required
- `ToType`: the type of the "To" field
- `FromKey` (optional, default = `never`): indicates the key from the field from which the transformation starts, by default it is equal to the key of the "To" field (i.e., `"age"` in this case)
- `FormToken`: either `"?:"` or `":"`, `"?:"` indicates that the "From" field is optional, `":"` indicates that the "From" field is required
- `FromType`: the type of the "From" field

In our case, the type

```ts
PropertySignature<":", number, never, ":", string, never>;
```

indicates that there is the following transformation:

- `age` is the key of the "To" field
- `ToToken = ":"` indicates that the `age` field is required
- `ToType = number` indicates that the type of the `age` field is `number`
- `FromKey = never` indicates that the decoding occurs from the same field named `age`
- `FormToken = "."` indicates that the decoding occurs from a required `age` field
- `FromType = string` indicates that the decoding occurs from a `string` type `age` field

Let's see an example of decoding:

```ts
console.log(S.decodeUnknownSync(Person)({ name: "name", age: "18" }));
// Output: { name: 'name', age: 18 }
```

Now, suppose the field from which decoding occurs is named `"AGE"`, but for our model, we want to keep the name in lowercase `"age"`. To achieve this result, we need to map the field key from `"AGE"` to `"age"`, and to do that, we can use the `fromKey` combinator:

```ts
import * as S from "@effect/schema/Schema";

/*
const Person: S.struct<{
    name: S.$string;
    age: S.PropertySignature<":", number, "AGE", ":", string, never>;
}>
*/
const Person = S.struct({
  name: S.string,
  age: S.propertySignature(S.NumberFromString).pipe(S.fromKey("AGE")),
});
```

This modification is represented in the type of the created `PropertySignature`:

```ts
// fromKey ----------------------v
PropertySignature<":", number, "AGE", ":", string, never>;
```

Now, let's see an example of decoding:

```ts
console.log(S.decodeUnknownSync(Person)({ name: "name", AGE: "18" }));
// Output: { name: 'name', age: 18 }
```

# Effectful messages

Now messages are not only of type `string` but can return an `Effect` so that they can have dependencies (for example, from an internationalization service). Let's see the outline of a similar situation with a very simplified example for demonstration purposes:

```ts
import * as S from "@effect/schema/Schema";
import * as TreeFormatter from "@effect/schema/TreeFormatter";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as Option from "effect/Option";

// internationalization service
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
