# Schema vs. Zod: Key Differences and Features

`effect/Schema` provides similar functionality to `zod` (v3), with additional features and key differences that may suit specific use cases. Below is a summary of the main distinctions:

1. **Bidirectional Transformations**
   `effect/Schema` supports both decoding (transforming raw data into validated data) and encoding (transforming validated data back into a format for external use). This makes it suitable for scenarios where data needs to be sent or received over a network. In contrast, `zod` focuses primarily on decoding.

2. **Integration with `effect`**
   `effect/Schema` is designed to integrate with the `effect` library, leveraging features such as dependency tracking during transformations. This integration allows developers to incorporate schemas directly into `effect` workflows.

3. **Customizable Through Annotations**
   Annotations in `effect/Schema` provide a way to attach metadata to schemas. This can include custom error messages, fallback values, or any other additional information to enhance schema behavior. Annotations offer a structured approach to schema customization that goes beyond basic validations.

4. **Functional Programming Style**
   `effect/Schema` uses a style based on combinators and transformations. This approach provides greater flexibility when composing schemas and enables better tree shaking for optimized bundle sizes. On the other hand, `zod` uses a chainable API for defining schemas.

## Parse, don't validate

`effect/Schema` adheres to the principle of [parse, don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/). This means that schemas are designed to parse input data into a validated and usable form, rather than simply checking if the data matches a set of rules. For example, instead of validating that a string conforms to a URL format (like `zod`'s `z.string().url()`), `effect/Schema` provides a schema to parse a string directly into a `URL` object.

The distinction between parsing and validating lies in the outcome:

- Validation checks if data satisfies a set of rules but does not modify or transform it.
- Parsing not only checks validity but also converts the data into a desired format or type.

For instance, `Schema.URL` transforms a string into a `URL` object, enabling direct use in your code without additional processing.

**Example** (Parsing URL strings into `URL` objects)

```ts
import { Schema } from "effect"

//                   ┌─── The output type
//                   │      ┌─── The input type
//                   ▼      ▼
//      ┌─── Schema<URL, string, never>
//      ▼
const schema = Schema.URL

// Parse a valid URL string
console.log(Schema.decodeUnknownSync(Schema.URL)("https://example.com"))
// Output: URL { href: 'https://example.com/', ... } (instance of URL)

// Attempt to parse an invalid URL
console.log(Schema.decodeUnknownSync(Schema.URL)("example.com"))
/*
throws:
ParseError: URL
└─ Transformation process failure
   └─ Unable to decode "example.com" into a URL. Invalid URL
*/
```

## Basic usage

Here are a couple of examples to introduce the basic usage of `zod` and `effect/Schema`.

While both libraries provide similar parsing features, `effect/Schema` uses [Either](https://effect.website/docs/data-types/either/) for safe parsing. The result is either `Either.right` (on success) or `Either.left` (on failure). In contrast, `zod` returns an object with `success` and `error` fields for safe parsing.

**Example** (Creating and using a schema for strings)

Zod

```ts
import { z } from "zod"

// creating a schema for strings
const mySchema = z.string()

// parsing
mySchema.parse("tuna") // => "tuna"
mySchema.parse(12) // => throws ZodError

// "safe" parsing (doesn't throw error if validation fails)
mySchema.safeParse("tuna") // => { success: true; data: "tuna" }
mySchema.safeParse(12) // => { success: false; error: ZodError }
```

Schema

```ts
import { Schema } from "effect"

// creating a schema for strings
const mySchema = Schema.String

// parsing
Schema.decodeUnknownSync(mySchema)("tuna") // => "tuna"
Schema.decodeUnknownSync(mySchema)(12) // => throws ParseError

// "safe" parsing (doesn't throw error if validation fails)
Schema.decodeUnknownEither(mySchema)("tuna") // => Either.right("tuna")
Schema.decodeUnknownEither(mySchema)(12) // => Either.left(ParseError)
```

**Example** (Creating and using a schema for objects)

Zod

```ts
import { z } from "zod"

const User = z.object({
  username: z.string()
})

User.parse({ username: "Ludwig" })

// extract the inferred type
type User = z.infer<typeof User>
// { username: string }
```

Schema

```ts
import { Schema } from "effect"

const User = Schema.Struct({
  username: Schema.String
})

Schema.decodeUnknownSync(User)({ username: "Ludwig" })

// extract the inferred type
type User = typeof User.Type
// { readonly username: string }
```

## Naming Conventions

The naming conventions in `effect/Schema` are designed to be straightforward and logical, **focusing primarily on compatibility with JSON serialization**. This approach simplifies the understanding and use of schemas, especially for developers who are integrating web technologies where JSON is a standard data interchange format.

### Overview of Naming Strategies

**JSON-Compatible Types**

Schemas that naturally serialize to JSON-compatible formats are named directly after their data types.

For instance:

- `Schema.Date`: serializes JavaScript Date objects to ISO-formatted strings, a typical method for representing dates in JSON.
- `Schema.Number`: used directly as it maps precisely to the JSON number type, requiring no special transformation to remain JSON-compatible.

**Non-JSON-Compatible Types**

When dealing with types that do not have a direct representation in JSON, the naming strategy incorporates additional details to indicate the necessary transformation. This helps in setting clear expectations about the schema's behavior:

For instance:

- `Schema.DateFromSelf`: indicates that the schema handles `Date` objects, which are not natively JSON-serializable.
- `Schema.NumberFromString`: this naming suggests that the schema processes numbers that are initially represented as strings, emphasizing the transformation from string to number when decoding.

The primary goal of these schemas is to ensure that domain objects can be easily serialized ("encoded") and deserialized ("decoded") for transmission over network connections, thus facilitating their transfer between different parts of an application or across different applications.

### Rationale

While JSON's ubiquity justifies its primary consideration in naming, the conventions also accommodate serialization for other types of transport. For instance, converting a `Date` to a string is a universally useful method for various communication protocols, not just JSON. Thus, the selected naming conventions serve as sensible defaults that prioritize clarity and ease of use, facilitating the serialization and deserialization processes across diverse technological environments.

## Primitives

| Feature  | Zod           | Schema                  |
| -------- | ------------- | ----------------------- |
| Strings  | `z.string()`  | `Schema.String`         |
| Numbers  | `z.number()`  | `Schema.Number`         |
| BigInts  | `z.bigint()`  | `Schema.BigIntFromSelf` |
| Booleans | `z.boolean()` | `Schema.Boolean`        |
| Dates    | `z.date()`    | `Schema.DateFromSelf`   |
| Symbols  | `z.symbol()`  | `Schema.SymbolFromSelf` |

**Empty Types**

| Feature   | Zod             | Schema             |
| --------- | --------------- | ------------------ |
| Undefined | `z.undefined()` | `Schema.Undefined` |
| Null      | `z.null()`      | `Schema.Null`      |
| Void      | `z.void()`      | `Schema.Void`      |

**Catch-All Types**

| Feature | Zod           | Schema           |
| ------- | ------------- | ---------------- |
| Any     | `z.any()`     | `Schema.Any`     |
| Unknown | `z.unknown()` | `Schema.Unknown` |

**Never Type**

| Feature | Zod         | Schema         |
| ------- | ----------- | -------------- |
| Never   | `z.never()` | `Schema.Never` |

## Coercion for primitives

No direct equivalent in `effect/Schema`.

## Literals

| Feature          | Zod                        | Schema                                       | Differences                                                                                         |
| ---------------- | -------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| String Literal   | `z.literal("tuna")`        | `Schema.Literal("tuna")`                     |                                                                                                     |
| Number Literal   | `z.literal(12)`            | `Schema.Literal(12)`                         |                                                                                                     |
| BigInt Literal   | `z.literal(2n)`            | `Schema.Literal(2n)`                         |                                                                                                     |
| Boolean Literal  | `z.literal(true)`          | `Schema.Literal(true)`                       |                                                                                                     |
| Unique Symbol    | `z.literal(Symbol("foo"))` | `Schema.UniqueSymbolFromSelf(Symbol("foo"))` | Zod uses `z.literal`, while `effect/Schema` has a specific function for unique symbols.             |
| Retrieving Value | `tuna.value // "tuna"`     | `tuna.literals // ["tuna"]`                  | Zod uses `.value` for a single literal, while Schema returns an array of literals with `.literals`. |

## Strings

The following tables compare the string handling features in `zod` and `effect/Schema`.

**String Validations**

| Feature                 | zod                             | effect/Schema                                   | Differences                                                               |
| ----------------------- | ------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| Max Length              | `z.string().max(5)`             | `Schema.String.pipe(Schema.maxLength(5))`       | None                                                                      |
| Min Length              | `z.string().min(5)`             | `Schema.String.pipe(Schema.minLength(5))`       | None                                                                      |
| Exact Length            | `z.string().length(5)`          | `Schema.String.pipe(Schema.length(5))`          | None                                                                      |
| Pattern Matching        | `z.string().regex(regex)`       | `Schema.String.pipe(Schema.pattern(regex))`     | None                                                                      |
| Includes Substring      | `z.string().includes(string)`   | `Schema.String.pipe(Schema.includes(string))`   | None                                                                      |
| Starts With             | `z.string().startsWith(string)` | `Schema.String.pipe(Schema.startsWith(string))` | None                                                                      |
| Ends With               | `z.string().endsWith(string)`   | `Schema.String.pipe(Schema.endsWith(string))`   | None                                                                      |
| UUID Validation         | `z.string().uuid()`             | `Schema.UUID`                                   | None                                                                      |
| ULID Validation         | `z.string().ulid()`             | `Schema.ULID`                                   | None                                                                      |
| Email Validation        | `z.string().email()`            | Not available                                   | `zod` provides built-in email validation, while `effect/Schema` does not. |
| URL Validation          | `z.string().url()`              | Not available (see [URLs](#urls))               | `zod` supports URL validation, while `effect/Schema` does not.            |
| Emoji Validation        | `z.string().emoji()`            | Not available                                   | `zod` provides emoji validation, while `effect/Schema` does not.          |
| Nano ID Validation      | `z.string().nanoid()`           | Not available                                   | `zod` supports Nano ID validation, while `effect/Schema` does not.        |
| CUID Validation         | `z.string().cuid()`             | Not available                                   | `zod` supports CUID validation, while `effect/Schema` does not.           |
| CUID2 Validation        | `z.string().cuid2()`            | Not available                                   | `zod` supports CUID2 validation, while `effect/Schema` does not.          |
| ISO Datetime Validation | `z.string().datetime()`         | Not available (see [Datetimes](#datetimes))     | `zod` supports ISO datetime validation, while `effect/Schema` does not.   |
| `YYYY-MM-DD` format     | `z.string().date()`             | Not available (see [Datetimes](#datetimes))     | `zod` supports ISO date validation, while `effect/Schema` does not.       |
| ISO Time Validation     | `z.string().time()`             | Not available                                   | `zod` supports ISO time validation, while `effect/Schema` does not.       |
| ISO Duration Validation | `z.string().duration()`         | Not available                                   | `zod` supports ISO duration validation, while `effect/Schema` does not.   |
| IP Address Validation   | `z.string().ip()`               | Not available                                   | `zod` supports IP address validation, while `effect/Schema` does not.     |
| Base64 Validation       | `z.string().base64()`           | Not available                                   | `zod` supports base64 validation, while `effect/Schema` does not.         |

**String Transformations**

| Feature         | zod                        | effect/Schema      | Differences                                    |
| --------------- | -------------------------- | ------------------ | ---------------------------------------------- |
| Trim Whitespace | `z.string().trim()`        | `Schema.Trim`      | Syntax differs, but functionality is the same. |
| Lowercase       | `z.string().toLowerCase()` | `Schema.Lowercase` | Syntax differs, but functionality is the same. |
| Uppercase       | `z.string().toUpperCase()` | `Schema.Uppercase` | Syntax differs, but functionality is the same. |

## Custom Error Messages

| Feature                      | zod                                                       | effect/Schema                                                                         | Differences                                          |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Schema-Level Messages        | `z.string({ required_error, invalid_type_error })`        | `Schema.String.annotations({ message: () => "Custom error" })`                        | `effect/Schema` uses annotations for error messages. |
| Validation-Specific Messages | `z.string().min(5, { message: "Must be 5+ characters" })` | `Schema.String.pipe(Schema.minLength(5, { message: () => "Must be 5+ characters" }))` |                                                      |

**Example** (Custom error messages for strings)

You can customize some common error messages when creating a string schema.

Zod

```ts
const name = z.string({
  required_error: "Name is required",
  invalid_type_error: "Name must be a string"
})
```

Schema

```ts
import { Schema } from "effect"

const name = Schema.String.annotations({
  // No direct equivalent for required error
  message: () => "Name must be a string"
})
```

**Example** (Custom error messages for string length)

When using validation methods, you can pass in an additional argument to provide a custom error message.

Zod

```ts
z.string().min(5, { message: "Must be 5 or more characters long" })
```

Schema

```ts
Schema.String.pipe(
  Schema.minLength(5, { message: () => "Must be 5 or more characters long" })
)
```

## URLs

In `zod`, the `z.string().url()` method validates string URLs. In `effect/Schema`, there is no direct equivalent. However, you can use `Schema.URL` to parse string URLs into `URL` objects.

**Example** (Parsing URL strings into `URL` objects)

```ts
import { Schema } from "effect"

// Parse a valid URL string
console.log(Schema.decodeUnknownSync(Schema.URL)("https://example.com"))
// Output: URL { href: 'https://example.com/', ... }

// Attempt to parse an invalid URL
console.log(Schema.decodeUnknownSync(Schema.URL)("example.com"))
/*
throws:
ParseError: URL
└─ Transformation process failure
   └─ Unable to decode "example.com" into a URL. Invalid URL
*/
```

## Datetimes

In `zod`, the `z.string().datetime()` method validates ISO 8601 datetime strings. In `effect/Schema`, there is no direct equivalent. However, you can use `Schema.Date`, which parses a string into a `Date` object using the `new Date()` constructor.

**Example** (Parsing date strings into `Date` objects)

```ts
import { Schema } from "effect"

// Parse a valid ISO 8601 date string
console.log(Schema.decodeUnknownSync(Schema.Date)("2020-01-01"))
// Output: 2020-01-01T00:00:00.000Z (as Date object)

// Parse a less strict date format
console.log(Schema.decodeUnknownSync(Schema.Date)("2020-1-1"))
// Output: 2019-12-31T23:00:00.000Z (as Date object)

// Attempt to parse an invalid date
console.log(Schema.decodeUnknownSync(Schema.Date)("2020-01-32"))
/*
throws:
ParseError: Date
└─ Predicate refinement failure
   └─ Expected a valid Date, actual Invalid Date
*/
```

## Numbers

The following tables provide a detailed comparison of number validations and custom error handling in `zod` and `effect/Schema`.

**Number Validations**

| Feature                  | zod                        | effect/Schema                                        | Differences                                                                  |
| ------------------------ | -------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Greater Than             | `z.number().gt(5)`         | `Schema.Number.pipe(Schema.greaterThan(5))`          | None                                                                         |
| Greater Than or Equal To | `z.number().gte(5)`        | `Schema.Number.pipe(Schema.greaterThanOrEqualTo(5))` | None                                                                         |
| Less Than                | `z.number().lt(5)`         | `Schema.Number.pipe(Schema.lessThan(5))`             | None                                                                         |
| Less Than or Equal To    | `z.number().lte(5)`        | `Schema.Number.pipe(Schema.lessThanOrEqualTo(5))`    | None                                                                         |
| Integer Validation       | `z.number().int()`         | `Schema.Number.pipe(Schema.int())`                   | None                                                                         |
| Positive Numbers         | `z.number().positive()`    | `Schema.Number.pipe(Schema.positive())`              | None                                                                         |
| Non-Negative Numbers     | `z.number().nonnegative()` | `Schema.Number.pipe(Schema.nonNegative())`           | None                                                                         |
| Negative Numbers         | `z.number().negative()`    | `Schema.Number.pipe(Schema.negative())`              | None                                                                         |
| Non-Positive Numbers     | `z.number().nonpositive()` | `Schema.Number.pipe(Schema.nonPositive())`           | None                                                                         |
| Divisible by a Number    | `z.number().multipleOf(5)` | `Schema.Number.pipe(Schema.multipleOf(5))`           | None                                                                         |
| Finite Numbers           | `z.number().finite()`      | `Schema.Number.pipe(Schema.finite())`                | None                                                                         |
| Safe Numbers             | `z.number().safe()`        | Not available                                        | `zod` includes validation for safe integers, while `effect/Schema` does not. |

**Custom Error Messages**

| Feature                     | zod                                            | effect/Schema                                                                      | Differences                                             |
| --------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Custom Error for Validation | `z.number().lte(5, { message: "my message" })` | `Schema.Number.pipe(Schema.lessThanOrEqualTo(5, { message: () => "my message" }))` | Syntax differs between chainable and functional styles. |

**Example** (Custom error messages for numbers)

Zod

```ts
z.number().lte(5, { message: "my message" })
```

Schema

```ts
import { Schema } from "effect"

Schema.Number.pipe(Schema.lessThanOrEqualTo(5, { message: () => "my message" }))
```

## BigInts

| Feature                  | zod                         | effect/Schema                                               | Differences                                                              |
| ------------------------ | --------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Greater Than             | `z.bigint().gt(5n)`         | `Schema.BigInt.pipe(Schema.greaterThanBigInt(5n))`          |                                                                          |
| Greater Than or Equal To | `z.bigint().gte(5n)`        | `Schema.BigInt.pipe(Schema.greaterThanOrEqualToBigInt(5n))` |                                                                          |
| Less Than                | `z.bigint().lt(5n)`         | `Schema.BigInt.pipe(Schema.lessThanBigInt(5n))`             |                                                                          |
| Less Than or Equal To    | `z.bigint().lte(5n)`        | `Schema.BigInt.pipe(Schema.lessThanOrEqualToBigInt(5n))`    |                                                                          |
| Positive                 | `z.bigint().positive()`     | `Schema.BigInt.pipe(Schema.positiveBigInt())`               |                                                                          |
| Non-Negative             | `z.bigint().nonnegative()`  | `Schema.BigInt.pipe(Schema.nonNegativeBigInt())`            |                                                                          |
| Negative                 | `z.bigint().negative()`     | `Schema.BigInt.pipe(Schema.negativeBigInt())`               |                                                                          |
| Non-Positive             | `z.bigint().nonpositive()`  | `Schema.BigInt.pipe(Schema.nonPositiveBigInt())`            |                                                                          |
| Multiple Of              | `z.bigint().multipleOf(5n)` | Not available                                               | `zod` supports `.multipleOf`, which is not available in `effect/Schema`. |

## Zod enums

The table below summarizes the differences between `zod` and `effect/Schema` for enums.

| Feature           | zod                                               | effect/Schema                                               | Differences                                                            |
| ----------------- | ------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Defining an Enum  | `z.enum(["Salmon", "Tuna", "Trout"])`             | `Schema.Literal("Salmon", "Tuna", "Trout")`                 | `zod` accepts an array, while `effect/Schema` uses variadic arguments. |
| Retrieving Values | `FishEnum.options // ["Salmon", "Tuna", "Trout"]` | `FishEnum.literals // readonly ["Salmon", "Tuna", "Trout"]` | `.options` vs `.literals`, with similar behavior.                      |

**Example** (Creating an enum schema)

```ts
const FishEnum = z.enum(["Salmon", "Tuna", "Trout"])

FishEnum.options // ["Salmon", "Tuna", "Trout"];
```

Schema

```ts
import { Schema } from "effect"

const FishEnum = Schema.Literal("Salmon", "Tuna", "Trout")

FishEnum.literals // readonly ["Salmon", "Tuna", "Trout"]
```

## Native enums

Both `zod` and `effect/Schema` support working with native TypeScript `enum`s, enabling validation of enum values.

| Feature               | zod                    | effect/Schema          | Differences |
| --------------------- | ---------------------- | ---------------------- | ----------- |
| Defining Native Enums | `z.nativeEnum(Fruits)` | `Schema.Enums(Fruits)` |             |

**Example** (Creating a schema for a native enum)

Zod

```ts
enum Fruits {
  Apple,
  Banana
}

const FruitEnum = z.nativeEnum(Fruits)

type FruitEnum = z.infer<typeof FruitEnum> // Fruits

FruitEnum.parse(Fruits.Apple) // passes
FruitEnum.parse(Fruits.Banana) // passes
FruitEnum.parse(0) // passes
FruitEnum.parse(1) // passes
FruitEnum.parse(3) // fails
```

Schema

```ts
import { Schema } from "effect"

enum Fruits {
  Apple,
  Banana
}

const FruitEnum = Schema.Enums(Fruits)

type FruitEnum = typeof FruitEnum.Type // Fruits

Schema.decodeUnknownSync(FruitEnum)(Fruits.Apple) // passes
Schema.decodeUnknownSync(FruitEnum)(Fruits.Banana) // passes
Schema.decodeUnknownSync(FruitEnum)(0) // passes
Schema.decodeUnknownSync(FruitEnum)(1) // passes
Schema.decodeUnknownSync(FruitEnum)(3) // fails
```

## Optionals

In both `zod` and `effect/Schema`, you can mark a field as optional, indicating that the property may or may not be present in the object.

**Example** (Defining an optional field)

Zod

```ts
const user = z.object({
  username: z.string().optional()
})

type Type = z.infer<typeof user> // { username?: string | undefined };
```

Schema

```ts
import { Schema } from "effect"

const user = Schema.Struct({
  username: Schema.optional(Schema.String)
})

type Type = typeof user.Type // { readonly username?: string | undefined };
```

## Nullables

Both `zod` and `effect/Schema` allow you to define nullable fields, meaning a value can either have the specified type or be `null`.

**Example** (Defining a nullable string)

Zod

```ts
const nullableString = z.nullable(z.string())

nullableString.parse("asdf") // => "asdf"
nullableString.parse(null) // => null
```

Schema

```ts
import { Schema } from "effect"

const nullableString = Schema.NullOr(Schema.String)

Schema.decodeUnknownSync(nullableString)("asdf") // => "asdf"
Schema.decodeUnknownSync(nullableString)(null) // => null
```

## Objects

Both `zod` and `effect/Schema` support object schemas where all properties are required by default.

**Example** (Defining and inferring types of an object schema)

Zod

```ts
// all properties are required by default
const Dog = z.object({
  name: z.string(),
  age: z.number()
})

// extract the inferred type like this
type Dog = z.infer<typeof Dog>

// equivalent to:
type Dog = {
  name: string
  age: number
}
```

Schema

```ts
import { Schema } from "effect"

// all properties are required by default
const Dog = Schema.Struct({
  name: Schema.String,
  age: Schema.Number
})

// extract the inferred type like this
type Dog = typeof Dog.Type

// equivalent to:
type Dog = {
  readonly name: string
  readonly age: number
}
```

### shape

Both libraries allow access to the individual schemas of object fields.

**Example** (Accessing object field schemas)

Zod

```ts
Dog.shape.name // => string schema
Dog.shape.age // => number schema
```

Schema

```ts
Dog.fields.name // => String schema
Dog.fields.age // => Number schema
```

### keyof

Both libraries allow extracting the keys of an object schema as a new schema.

**Example** (Creating a schema of object keys)

Zod

```ts
const keySchema = Dog.keyof()
keySchema // ZodEnum<["name", "age"]>
```

Schema

```ts
//      ┌─── Schema<"name" | "age", "name" | "age", never>
//      ▼
const keySchema = Schema.keyof(Dog)
```

### extend

Objects can be extended to include additional properties.

**Example** (Extending an object schema)

Zod

```ts
const DogWithBreed = Dog.extend({
  breed: z.string()
})
```

Schema

```ts
const DogWithBreed = Dog.pipe(
  Schema.extend(
    Schema.Struct({
      breed: Schema.String
    })
  )
)

// Recommended alternative when working with structs
const DogWithBreed = Schema.Struct({
  ...Dog.fields,
  breed: Schema.String
})
```

### pick / omit

Fields can be selected or removed from an object schema.

**Example** (Selecting or omitting fields)

Zod

```ts
const Recipe = z.object({
  id: z.string(),
  name: z.string(),
  ingredients: z.array(z.string())
})

const JustTheName = Recipe.pick({ name: true })

const NoIDRecipe = Recipe.omit({ id: true })
```

Schema

```ts
import { Schema } from "effect"

const Recipe = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  ingredients: Schema.Array(Schema.String)
})

const JustTheName = Recipe.pick("name")

const NoIDRecipe = Recipe.omit("id")
```

### partial

All fields in an object schema can be made optional.

**Example** (Making all fields optional)

Zod

```ts
const user = z.object({
  email: z.string(),
  username: z.string()
})

const partialUser = user.partial()
```

Schema

```ts
import { Schema } from "effect"

const user = Schema.Struct({
  email: Schema.String,
  username: Schema.String
})

const partialUser = Schema.partial(user)
```

### deepPartial

There is no direct equivalent for deeply making all fields optional in `effect/Schema`.

### required

Both `zod` and `effect/Schema` allow you to make all fields in an object schema required.

**Example** (Converting optional fields to required)

Zod

```ts
const user = z
  .object({
    email: z.string(),
    username: z.string()
  })
  .partial() // Makes all fields optional

const requiredUser = user.required() // Converts all fields back to required
```

Schema

```ts
import { Schema } from "effect"

const user = Schema.Struct({
  email: Schema.String,
  username: Schema.String
}).pipe(Schema.partial) // Makes all fields optional

const requiredUser = Schema.required(user) // Converts all fields back to required
```

### passthrough

Both `zod` and `effect/Schema` provide mechanisms to handle additional properties that are not explicitly defined in an object schema. By default, both libraries ignore or strip these extra properties, but they also allow configurations to preserve them.

- In `zod`, passthrough behavior is enabled using the `.passthrough()` method.
- In `effect/Schema`, passthrough is achieved by setting the `onExcessProperty` option to `"preserve"` during decoding.

**Example** (Handling additional properties)

Zod

```ts
const person = z.object({
  name: z.string()
})

person.parse({
  name: "bob dylan",
  extraKey: 61
})
// => { name: "bob dylan" }
// extraKey has been stripped

person.passthrough().parse({
  name: "bob dylan",
  extraKey: 61
})
// => { name: "bob dylan", extraKey: 61 }
```

Schema

```ts
import { Schema } from "effect"

const person = Schema.Struct({
  name: Schema.String
})

Schema.decodeUnknownSync(person)(
  {
    name: "bob dylan",
    extraKey: 61
  },
  { onExcessProperty: "preserve" }
)
// => { name: "bob dylan", extraKey: 61 }
```

### strict

Both `zod` and `effect/Schema` offer a way to enforce strict object schemas, meaning that any additional properties not defined in the schema will result in an error.

- In `zod`, strict mode is enabled using the `.strict()` method when defining an object schema.
- In `effect/Schema`, strict behavior is configured during decoding by setting the `onExcessProperty` option to `"error"`.

**Example** (Enforcing strict object validation)

Zod

```ts
const person = z
  .object({
    name: z.string()
  })
  .strict()

person.parse({
  name: "bob dylan",
  extraKey: 61
})
// => throws ZodError
```

Schema

```ts
import { Schema } from "effect"

const person = Schema.Struct({
  name: Schema.String
})

Schema.decodeUnknownSync(person)(
  {
    name: "bob dylan",
    extraKey: 61
  },
  { onExcessProperty: "error" }
)
// => throws ParseError
```

### catch

Both `zod` and `effect/Schema` allow you to define fallback values when parsing fails.

- In `zod`, fallback values are set using the `.catch()` method when defining the schema.
- In `effect/Schema`, fallback values are specified using the `decodingFallback` annotation.

**Example** (Defining a fallback value for parsing failures)

Zod

```ts
import { z } from "zod"

const schema = z.number().catch(42)

console.log(schema.parse(5)) // => 5
console.log(schema.parse("tuna")) // => 42
```

Schema

```ts
import { Either, Schema } from "effect"

const schema = Schema.Number.annotations({
  decodingFallback: () => Either.right(42)
})

console.log(Schema.decodeUnknownSync(schema)(5)) // => 5
console.log(Schema.decodeUnknownSync(schema)("tuna")) // => 42
```

### catchall

Both `zod` and `effect/Schema` allow you to handle additional properties that are not explicitly defined in an object schema by applying a "catchall" schema to validate those properties. This is useful when dealing with objects that may include dynamic keys with uniform value types.

- In `zod`, catchall behavior is enabled using the `.catchall()` method, which applies a specified schema to all additional properties.
- In `effect/Schema`, this is achieved by combining a `Schema.Record` schema with the main object schema. The `Schema.Record` defines the type for dynamic keys and their values.

**Example** (Defining a catchall schema for additional properties)

Zod

````ts
const person = z
  .object({
    name: z.string()
  })
  .catchall(z.string())

person.parse({
  name: "bob dylan",
  validExtraKey: "foo" // works fine
})

person.parse({
  name: "bob dylan",
  validExtraKey: false // fails
})
// => throws ZodError```
````

Schema

```ts
import { Schema } from "effect"

const person = Schema.Struct(
  {
    name: Schema.String
  },
  Schema.Record({ key: Schema.String, value: Schema.String })
)

Schema.decodeUnknownSync(person)({
  name: "bob dylan",
  validExtraKey: "foo" // works fine
})

Schema.decodeUnknownSync(person)({
  name: "bob dylan",
  validExtraKey: true // fails
})
// => throws ParseError
```

## Arrays

Both `zod` and `effect/Schema` provide tools for defining schemas for arrays. These schemas validate that the input is an array and that each element in the array conforms to the specified schema.

- In `zod`, array schemas are created using the `z.array()` method, which takes a schema for the array elements as an argument.
- In `effect/Schema`, array schemas are created using `Schema.Array()`, which also takes the schema for the elements as an argument.

**Example** (Defining an array schema for strings)

Zod

```ts
const stringArray = z.array(z.string())
```

Schema

```ts
import { Schema } from "effect"

const stringArray = Schema.Array(Schema.String)
```

### Accessing the Element Schema

- In `zod`, the `.element` property is used to access the schema for the elements in the array.
- In `effect/Schema`, the `.value` property serves the same purpose.

**Example** (Accessing the schema for array elements)

Zod

```ts
stringArray.element // => string schema
```

Schema

```ts
stringArray.value // => String schema
```

### Defining Non-Empty Arrays

- `zod` provides the `.nonempty()` method for array schemas to enforce that the array has at least one element.
- `effect/Schema` uses `Schema.NonEmptyArray()` for the same functionality.

**Example** (Enforcing arrays to have at least one element)

Zod

```ts
const nonEmptyStrings = z.string().array().nonempty()
// the inferred type is now
// [string, ...string[]]

nonEmptyStrings.parse([]) // throws: "Array cannot be empty"
nonEmptyStrings.parse(["Ariana Grande"]) // passes
```

Schema

```ts
import { Schema } from "effect"

const nonEmptyStrings = Schema.NonEmptyArray(Schema.String)
// the inferred type is now
// [string, ...string[]]

Schema.decodeUnknownSync(nonEmptyStrings)([])
/* throws:
Error: readonly [string, ...string[]]
└─ [0]
   └─ is missing
*/
Schema.decodeUnknownSync(nonEmptyStrings)(["Ariana Grande"]) // passes
```

### Array Length Validations

- In `zod`, methods like `.min()`, `.max()`, and `.length()` are chained to set array length constraints.
- In `effect/Schema`, length validations are applied using `pipe()` with combinators like `Schema.minItems()`, `Schema.maxItems()`, and `Schema.itemsCount()`.

**Example** (Validating array length)

Zod

```ts
z.string().array().min(5) // must contain 5 or more items
z.string().array().max(5) // must contain 5 or fewer items
z.string().array().length(5) // must contain 5 items exactly
```

Schema

```ts
import { Schema } from "effect"

Schema.Array(Schema.String).pipe(Schema.minItems(5)) // must contain 5 or more items
Schema.Array(Schema.String).pipe(Schema.maxItems(5)) // must contain 5 or fewer items
Schema.Array(Schema.String).pipe(Schema.itemsCount(5)) // must contain 5 items exactly
```

## Tuples

Both `zod` and `effect/Schema` support tuples, allowing you to define fixed-length arrays where each element has a specific type.

- In `zod`, tuples are created using the `z.tuple()` method, where the schema for each element is defined in an array.
- In `effect/Schema`, tuples are defined using `Schema.Tuple()` and accept the schemas for the elements as arguments.

Tuples in `effect/Schema` are readonly by default, whereas tuples in `zod` are mutable unless explicitly marked as readonly in TypeScript.

**Example** (Defining a tuple schema)

Zod

```ts
const athleteSchema = z.tuple([
  z.string(), // name
  z.number(), // jersey number
  z.object({
    pointsScored: z.number()
  }) // statistics
])

type Athlete = z.infer<typeof athleteSchema>
// type Athlete = [string, number, { pointsScored: number }]
```

Schema

```ts
import { Schema } from "effect"

const athleteSchema = Schema.Tuple(
  Schema.String, // name
  Schema.Number, // jersey number
  Schema.Struct({
    pointsScored: Schema.Number
  }) // statistics
)

// type Athlete = readonly [string, number, { readonly pointsScored: number }]
type Athlete = typeof athleteSchema.Type
```

### Variadic Tuples

- `zod` supports variadic tuples with the `.rest()` method, allowing the tuple to include additional elements of a specific type.
- `effect/Schema` handles this by combining a fixed tuple schema with a rest schema for additional elements.

**Example** (Defining a variadic tuple schema)

Zod

```ts
const variadicTuple = z.tuple([z.string()]).rest(z.number())
const result = variadicTuple.parse(["hello", 1, 2, 3])
// => [string, ...number[]];
```

Schema

```ts
import { Schema } from "effect"

const variadicTuple = Schema.Tuple([Schema.String], Schema.Number)

const result = Schema.decodeUnknownSync(variadicTuple)(["hello", 1, 2, 3])
// => readonly [string, ...number[]];
```

## Unions

Both `zod` and `effect/Schema` support unions, which allow you to define a schema that accepts multiple types.

- In `zod`, unions are created using the `z.union()` method, where the possible schemas are passed as an array.
- In `effect/Schema`, unions are defined using `Schema.Union()`, where the schemas are passed as arguments.

**Discriminated Unions**

- In `zod`, discriminated unions require explicitly using the `z.discriminatedUnion()` method for better performance and error messages.
- In `effect/Schema`, discriminated unions are automatically detected, so no additional configuration is needed.

**Example** (Defining a union schema)

Zod

```ts
const stringOrNumber = z.union([z.string(), z.number()])

stringOrNumber.parse("foo") // passes
stringOrNumber.parse(14) // passes
```

Schema

```ts
import { Schema } from "effect"

const stringOrNumber = Schema.Union(Schema.String, Schema.Number)

Schema.decodeUnknownSync(stringOrNumber)("foo") // passes
Schema.decodeUnknownSync(stringOrNumber)(14) // passes
```

## Discriminated unions

In `zod`, discriminated unions must be explicitly declared using the `z.discriminatedUnion()` method.
In `effect/Schema`, discriminated unions are automatically detected based on shared properties. No special method is needed to handle them.

## Records

Both `zod` and `effect/Schema` support record schemas, which are used to validate objects with dynamic keys. A record schema ensures that all keys in the object match a specified schema and that their corresponding values also conform to a schema.

`effect/Schema` generates readonly types by default.

**Example** (Defining a record schema)

Zod

```ts
const User = z.object({ name: z.string() })

const UserStore = z.record(z.string(), User)

// type UserStore = Record<string, { name: string }>
type UserStore = z.infer<typeof UserStore>
```

Schema

```ts
import { Schema } from "effect"

const User = Schema.Struct({ name: Schema.String })

const UserStore = Schema.Record({ key: Schema.String, value: User })

// type UserStore = { readonly [x: string]: { readonly name: string; }; }
type UserStore = typeof UserStore.Type
```

## Maps

Both `zod` and `effect/Schema` support schemas for `Map` objects, where keys and values can be validated using specified schemas.

- In `zod`, maps are defined using the `z.map()` method, where the first argument is the key schema and the second is the value schema.
- In `effect/Schema`, maps are defined using `Schema.Map()` or `Schema.ReadonlyMap()` for mutable or readonly maps, respectively. Both require an object specifying the `key` and `value` schemas.

`effect/Schema` provides an explicit `Schema.ReadonlyMap()` schema to generate readonly maps.

**Example** (Defining a schema for maps)

Zod

```ts
const stringNumberMap = z.map(z.string(), z.number())

type StringNumberMap = z.infer<typeof stringNumberMap>
// type StringNumberMap = Map<string, number>
```

Schema

```ts
import { Schema } from "effect"

const map1 = Schema.Map({ key: Schema.String, value: Schema.Number })

// type Map1 = Map<string, number>
type Map1 = typeof map1.Type

const map2 = Schema.ReadonlyMap({ key: Schema.String, value: Schema.Number })

// type Map2 = ReadonlyMap<string, number>
type Map2 = typeof map2.Type
```

## Sets

Both `zod` and `effect/Schema` support schemas for `Set` objects, allowing you to validate sets where all elements conform to a specified schema.

- In `zod`, sets are created using the `z.set()` method, where you pass the schema for the elements of the set.
- In `effect/Schema`, sets are defined using `Schema.Set()` or `Schema.ReadonlySet()` for mutable or readonly sets, respectively. Both require the schema for the elements.

`effect/Schema` includes `Schema.ReadonlySet()` to explicitly define readonly sets.

**Example** (Defining a schema for sets)

Zod

```ts
const numberSet = z.set(z.number())
type NumberSet = z.infer<typeof numberSet>
// type NumberSet = Set<number>
```

Schema

```ts
import { Schema } from "effect"

const set1 = Schema.Set(Schema.Number)

// type Set1 = Set<number>
type Set1 = typeof set1.Type

const set2 = Schema.ReadonlySet(Schema.Number)

// type Set2 = ReadonlySet<number>
type Set2 = typeof set2.Type
```

## Intersections

In `zod`, intersections are used to combine multiple schemas into one, requiring the input to satisfy all the combined schemas.

`effect/Schema` does not have a direct equivalent for intersections. However, similar behavior can be achieved using `Schema.extend()` to merge two or more struct schemas, or by spreading fields from multiple schemas into a new `Schema.Struct()`.

## Recursive types

Both `zod` and `effect/Schema` support defining recursive types, which are types that reference themselves. Recursive types are commonly used for hierarchical data structures such as trees, graphs, or nested categories.

- In `zod`, recursion is achieved using the `z.lazy()` method, which defers the evaluation of the schema until it is referenced.
- In `effect/Schema`, recursion is handled using the `Schema.suspend()` function, which delays the resolution of the schema.

**Example** (Defining a recursive schema for categories)

Zod

```ts
const baseCategorySchema = z.object({
  name: z.string()
})

type Category = z.infer<typeof baseCategorySchema> & {
  subcategories: Category[]
}

const categorySchema: z.ZodType<Category> = baseCategorySchema.extend({
  subcategories: z.lazy(() => categorySchema.array())
})
```

Schema

```ts
import { Schema } from "effect"

const baseCategorySchema = Schema.Struct({
  name: Schema.String
})

type Category = Schema.Schema.Type<typeof baseCategorySchema> & {
  readonly subcategories: ReadonlyArray<Category>
}

const categorySchema: Schema.Schema<Category> = Schema.Struct({
  ...baseCategorySchema.fields,
  subcategories: Schema.suspend(() => Schema.Array(categorySchema))
})
```

## Promises

No direct equivalent in `effect/Schema`.

## Instanceof

Both `zod` and `effect/Schema` support validating instances of classes or constructors using their `instanceof` functionality.

- In `zod`, the `z.instanceof()` method is used to create a schema that validates if an input is an instance of a specified class or constructor.
- In `effect/Schema`, the `Schema.instanceOf()` method provides the same functionality, taking the target class as an argument.

**Example** (Validating instances of a class)

Zod

```ts
class Test {
  name: string = "name"
}

const TestSchema = z.instanceof(Test)

const blob: any = "whatever"
TestSchema.parse(new Test()) // passes
TestSchema.parse(blob) // throws
```

Schema

```ts
import { Schema } from "effect"

class Test {
  name: string = "name"
}

const TestSchema = Schema.instanceOf(Test)

const blob: any = "whatever"

Schema.decodeUnknownSync(TestSchema)(new Test()) // passes
Schema.decodeUnknownSync(TestSchema)(blob) // throws
```

## Functions

No direct equivalent in `effect/Schema`.

## Preprocess

No direct equivalent in `effect/Schema`.

## Custom schemas

Both `zod` and `effect/Schema` allow you to define custom schemas for validation scenarios that fall outside the scope of built-in schema types.

- In `zod`, custom schemas are created using the `z.custom()` method. This method allows you to define a validation function that returns a boolean indicating whether the input is valid.
- In `effect/Schema`, custom schemas are created using the `Schema.declare()` function. This approach provides more flexibility by allowing you to define the input and output types, parsing logic, and error handling.

See the [Schema.declare](https://effect.website/docs/schema/advanced-usage/#declaring-new-data-types) documentation for more details.

## refine / superRefine

Both `zod` and `effect/Schema` allow you to add custom validation rules to existing schemas. These rules are useful for applying constraints that go beyond the basic validation logic provided by the libraries' built-in schema types.

- In `zod`, you can use `.refine()` to apply a single validation rule or `.superRefine()` for more complex validations that require access to the validation context (e.g., adding multiple errors).
- In `effect/Schema`, you can use `Schema.filter()` for simple validations or `Schema.filterEffect()` to include asynchronous or effectful validation logic.

See the [Schema.filter](https://effect.website/docs/schema/filters/) and [Schema.filterEffect](https://effect.website/docs/schema/transformations/#effectful-filters) documentation for more details.

## transform

Both `zod` and `effect/Schema` provide functionality to transform input data into a desired format during parsing. Transformations are useful when you need to derive new values, normalize input, or map raw data into a structure that is more convenient for further processing. While the capabilities of the two libraries overlap, there are differences in how transformations are defined and applied.

- In `zod`, the `.transform()` method is used to apply a transformation function directly to the schema.
- In `effect/Schema`, transformations are applied using `Schema.transform()` or `Schema.transformOrFail()` for additional error handling during the transformation process.

See the [transform](https://effect.website/docs/schema/transformations/#transform) and [transformOrFail](https://effect.website/docs/schema/transformations/#transformorfail) documentation for more details.

## describe

Both `zod` and `effect/Schema` allow you to attach descriptive metadata to schemas. This feature is useful for documentation, error reporting, or providing additional context about a schema's purpose. The description does not affect validation or parsing; it serves purely as a human-readable explanation.

- In `zod`, descriptions are added using the `.describe()` method, which accepts a string describing the schema.
- In `effect/Schema`, descriptions are added using the `annotations()` method, where the `description` is included as a metadata property.

**Example** (Adding a description to a schema)

Zod

```ts
const documentedString = z
  .string()
  .describe("A useful bit of text, if you know what to do with it.")
documentedString.description // A useful bit of text…
```

Schema

```ts
import { Schema, SchemaAST } from "effect"

const documentedString = Schema.String.annotations({
  description: "A useful bit of text, if you know what to do with it."
})

console.log(SchemaAST.getDescriptionAnnotation(documentedString.ast))
/*
Output:
{
  _id: 'Option',
  _tag: 'Some',
  value: 'A useful bit of text, if you know what to do with it.'
}
*/
```

## nullish

Both `zod` and `effect/Schema` provide support for schemas that allow values to be `null` or `undefined` in addition to a specified type.

- In `zod`, you use the `.nullish()` method to extend a schema to allow `null` or `undefined` values in addition to the specified type.
- In `effect/Schema`, the equivalent is achieved with `Schema.NullishOr()`, where you pass the desired type.

**Example** (Defining a schema that allows `null` or `undefined` values)

Zod

```ts
const nullishString = z.string().nullish() // string | null | undefined
```

Schema

```ts
import { Schema } from "effect"

const nullishString = Schema.NullishOr(Schema.String) // string | null | undefined
```

## brand

Both `zod` and `effect/Schema` support branding, a feature that allows you to tag types with a unique identifier without changing their runtime behavior. Branding is useful when you need stronger type distinctions for otherwise identical structures, preventing accidental misuse or mixing of similar types.

- In `zod`, branding is applied using the `.brand<>()` method on a schema, where you specify the brand name as a generic type argument.
- In `effect/Schema`, branding is achieved by using the `Schema.brand()` function in combination with the `pipe()` method.

**Example** (Defining a branded schema)

Zod

```ts
const Cat = z.object({ name: z.string() }).brand<"Cat">()
```

Schema

```ts
import { Schema } from "effect"

const Cat = Schema.Struct({ name: Schema.String }).pipe(Schema.brand("Cat"))
```

## readonly

No equivalent as it's the default behavior.
