# Comparisons

## Zod (v3)

Feature-wise, `schema` can do practically everything that `zod` can do.

The main differences are:

1.  `schema` transformations are bidirectional, so it not only decodes like `zod` but also encodes.
2.  `schema` is integrated with `Effect` and inherits some benefits from it (such as dependency tracking in transformations).
3.  `schema` is highly customizable through annotations, allowing users to attach meta-information.
4.  `schema` uses a functional programming style with combinators and transformations (while `zod` provides a chainable API).

### Basic usage

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
import { Schema as S } from "effect"

// creating a schema for strings
const mySchema = S.String

// parsing
S.decodeUnknownSync(mySchema)("tuna") // => "tuna"
S.decodeUnknownSync(mySchema)(12) // => throws ParseError

// "safe" parsing (doesn't throw error if validation fails)
S.decodeUnknownEither(mySchema)("tuna") // => right("tuna")
S.decodeUnknownEither(mySchema)(12) // => left(ParseError)
```

Creating an object schema

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
import { Schema as S } from "effect"

const User = S.Struct({
  username: S.String
})

S.decodeUnknownSync(User)({ username: "Ludwig" })

// extract the inferred type
type User = S.Schema.Type<typeof User>
// { readonly username: string }
```

### Primitives

Zod

```ts
import { z } from "zod"

// primitive values
z.string()
z.number()
z.bigint()
z.boolean()
z.date()
z.symbol()

// empty types
z.undefined()
z.null()
z.void() // accepts undefined

// catch-all types
// allows any value
z.any()
z.unknown()

// never type
// allows no values
z.never()
```

Schema

```ts
import { Schema as S } from "effect"

// primitive values
S.String
S.Number
S.BigInt
S.Boolean
S.Date
S.Symbol

// empty types
S.Undefined
S.Null
S.Void // accepts undefined

// catch-all types
// allows any value
S.Any
S.Unknown

// never type
// allows no values
S.Never
```

### Coercion for primitives

No equivalent.

### Literals

Zod

```ts
const tuna = z.literal("tuna")
const twelve = z.literal(12)
const twobig = z.literal(2n) // bigint literal
const tru = z.literal(true)

const terrificSymbol = Symbol("terrific")
const terrific = z.literal(terrificSymbol)

// retrieve literal value
tuna.value // "tuna"
```

Schema

```ts
import { Schema as S } from "effect"

const tuna = S.Literal("tuna")
const twelve = S.Literal(12)
const twobig = S.Literal(2n) // bigint literal
const tru = S.Literal(true)

const terrificSymbol = Symbol("terrific")
const terrific = S.UniqueSymbolFromSelf(terrificSymbol)

// retrieve literal value
tuna.literals // ["tuna"]
```

### Strings

Zod

```ts
// validations
z.string().max(5)
z.string().min(5)
z.string().length(5)
z.string().email()
z.string().url()
z.string().emoji()
z.string().uuid()
z.string().nanoid()
z.string().cuid()
z.string().cuid2()
z.string().ulid()
z.string().regex(regex)
z.string().includes(string)
z.string().startsWith(string)
z.string().endsWith(string)
z.string().datetime() // ISO 8601; by default only `Z` timezone allowed
z.string().date() // ISO date format (YYYY-MM-DD)
z.string().time() // ISO time format (HH:mm:ss[.SSSSSS])
z.string().duration() // ISO 8601 duration
z.string().ip() // defaults to allow both IPv4 and IPv6
z.string().base64()

// transforms
z.string().trim() // trim whitespace
z.string().toLowerCase() // toLowerCase
z.string().toUpperCase() // toUpperCase
```

Schema

```ts
import { Schema as S } from "effect"

// validations
S.String.pipe(S.maxLength(5))
S.String.pipe(S.minLength(5))
S.String.pipe(S.length(5))
// S.string().email() // No equivalent
S.URL
// S.string().emoji() // No equivalent
S.UUID
// S.string().nanoid() // No equivalent
// S.string().cuid() // No equivalent
// S.string().cuid2() // No equivalent
S.ULID
S.String.pipe(S.pattern(regex))
S.String.pipe(S.includes(string))
S.String.pipe(S.startsWith(string))
S.String.pipe(S.endsWith(string))
// S.string().datetime() // No equivalent
// S.string().date() // No equivalent
// S.string().time() // No equivalent
// S.string().duration() // No equivalent
// S.string().ip() // No equivalent

// transforms
S.Trim // trim whitespace
S.Lowercase // toLowerCase
S.Uppercase // toUpperCase
```

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
const name = S.String.annotations({
  message: () => "Name must be a string"
})
```

When using validation methods, you can pass in an additional argument to provide a custom error message.

Zod

```ts
z.string().min(5, { message: "Must be 5 or more characters long" })
```

Schema

```ts
S.String.pipe(
  S.minLength(5, { message: () => "Must be 5 or more characters long" })
)
```

### Datetimes

No equivalent.

### Dates

Zod

```ts
const date = z.string().date()

date.parse("2020-01-01") // pass
date.parse("2020-1-1") // fail
date.parse("2020-01-32") // fail
```

Schema

```ts
import { Schema as S } from "effect"

S.decodeUnknownSync(S.Date)("2020-01-01") // pass
S.decodeUnknownSync(S.Date)("2020-1-1") // pass
S.decodeUnknownSync(S.Date)("2020-01-32") // fail
```

### Times

No equivalent.

### IP addresses

No equivalent.

### Numbers

Zod

```ts
z.number().gt(5)
z.number().gte(5) // alias .min(5)
z.number().lt(5)
z.number().lte(5) // alias .max(5)

z.number().int() // value must be an integer

z.number().positive() //     > 0
z.number().nonnegative() //  >= 0
z.number().negative() //     < 0
z.number().nonpositive() //  <= 0

z.number().multipleOf(5) // Evenly divisible by 5. Alias .step(5)

z.number().finite() // value must be finite, not Infinity or -Infinity
z.number().safe() // value must be between Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER
```

Schema

```ts
import { Schema as S } from "effect"

S.Number.pipe(S.greaterThan(5))
S.Number.pipe(S.greaterThanOrEqualTo(5))
S.Number.pipe(S.lessThan(5))
S.Number.pipe(S.lessThanOrEqualTo(5))

S.Number.pipe(S.int())

S.Number.pipe(S.positive())
S.Number.pipe(S.nonNegative())
S.Number.pipe(S.negative())
S.Number.pipe(S.nonPositive())

S.Number.pipe(S.multipleOf(5))

S.Number.pipe(S.finite())
// z.number().safe(); // No equivalent
```

Optionally, you can pass in a second argument to provide a custom error message.

Zod

```ts
z.number().lte(5, { message: "this👏is👏too👏big" })
```

Schema

```ts
S.Number.pipe(S.lessThanOrEqualTo(5, { message: () => "this👏is👏too👏big" }))
```

### BigInts

Zod

```ts
z.bigint().gt(5n)
z.bigint().gte(5n) // alias `.min(5n)`
z.bigint().lt(5n)
z.bigint().lte(5n) // alias `.max(5n)`

z.bigint().positive() // > 0n
z.bigint().nonnegative() // >= 0n
z.bigint().negative() // < 0n
z.bigint().nonpositive() // <= 0n

z.bigint().multipleOf(5n) // Evenly divisible by 5n.
```

Schema

```ts
import { Schema as S } from "effect"

S.BigInt.pipe(S.greaterThanBigInt(5n))
S.BigInt.pipe(S.greaterThanOrEqualToBigInt(5n))
S.BigInt.pipe(S.lessThanBigInt(5n))
S.BigInt.pipe(S.lessThanOrEqualToBigInt(5n))

S.BigInt.pipe(S.positiveBigInt())
S.BigInt.pipe(S.nonNegativeBigInt())
S.BigInt.pipe(S.negativeBigInt())
S.BigInt.pipe(S.nonPositiveBigInt())

// S.BigInt.pipe().multipleOf(5n);  // No equivalent
```

### Booleans

Zod

```ts
const isActive = z.boolean({
  required_error: "isActive is required",
  invalid_type_error: "isActive must be a boolean"
})
```

Schema

```ts
const isActive = S.Boolean.annotations({
  message: () => "isActive must be a boolean"
})
```

### Zod enums

You can retrieve the list of options as a tuple with the `.options` property:

Zod

```ts
const FishEnum = z.enum(["Salmon", "Tuna", "Trout"])
type FishEnum = z.infer<typeof FishEnum>
// 'Salmon' | 'Tuna' | 'Trout'
```

Schema

```ts
const FishEnum = S.Literal("Salmon", "Tuna", "Trout")

type FishEnum = typeof FishEnum.Type
// 'Salmon' | 'Tuna' | 'Trout'
```

Alternatively, use `as const` to define your enum values as a tuple of strings:

Zod

```ts
const VALUES = ["Salmon", "Tuna", "Trout"] as const
const FishEnum = z.enum(VALUES)
```

Schema

```ts
const VALUES = ["Salmon", "Tuna", "Trout"] as const
const FishEnum = S.Literal(...VALUES)
```

#### `.options`

Zod

```ts
FishEnum.options // ["Salmon", "Tuna", "Trout"];
```

Schema

```ts
FishEnum.literals // readonly ["Salmon", "Tuna", "Trout"]
```

### Native enums

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
enum Fruits {
  Apple,
  Banana
}

const FruitEnum = S.Enums(Fruits)
type FruitEnum = S.Schema.Type<typeof FruitEnum> // Fruits

S.decodeUnknownSync(FruitEnum)(Fruits.Apple) // passes
S.decodeUnknownSync(FruitEnum)(Fruits.Banana) // passes
S.decodeUnknownSync(FruitEnum)(0) // passes
S.decodeUnknownSync(FruitEnum)(1) // passes
S.decodeUnknownSync(FruitEnum)(3) // fails
```

### Optionals

Zod

```ts
const user = z.object({
  username: z.string().optional()
})
type C = z.infer<typeof user> // { username?: string | undefined };
```

Schema

```ts
const user = S.Struct({
  username: S.optional(S.String)
})
type C = S.Schema.Type<typeof user> // { readonly username?: string | undefined };
```

### Nullables

Zod

```ts
const nullableString = z.nullable(z.string())
nullableString.parse("asdf") // => "asdf"
nullableString.parse(null) // => null
```

Schema

```ts
const nullableString = S.NullOr(S.String)
S.decodeUnknownSync(nullableString)("asdf") // => "asdf"
S.decodeUnknownSync(nullableString)(null) // => null
```

### Objects

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
// all properties are required by default
const Dog = S.Struct({
  name: S.String,
  age: S.Number
})

// extract the inferred type like this
type Dog = S.Schema.Type<typeof Dog>

// equivalent to:
type Dog = {
  readonly name: string
  readonly age: number
}
```

#### shape

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

#### keyof

Zod

```ts
const keySchema = Dog.keyof()
keySchema // ZodEnum<["name", "age"]>
```

Schema

```ts
// const keySchema: S.Schema<"name" | "age", "name" | "age", never>
const keySchema = S.keyof(Dog)
```

#### extend

Zod

```ts
const DogWithBreed = Dog.extend({
  breed: z.string()
})
```

Schema

```ts
const DogWithBreed = Dog.pipe(
  S.extend(
    S.Struct({
      breed: S.String
    })
  )
)

// or (recommended)

const DogWithBreed = S.Struct({
  ...Dog.fields,
  breed: S.String
})
```

#### pick / omit

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
const Recipe = S.Struct({
  id: S.String,
  name: S.String,
  ingredients: S.Array(S.String)
})

const JustTheName = Recipe.pick("name")

const NoIDRecipe = Recipe.omit("id")
```

#### partial

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
const user = S.Struct({
  email: S.String,
  username: S.String
})

const partialUser = S.partial(user)
```

#### deepPartial

No equivalent

#### required

Zod

```ts
const user = z
  .object({
    email: z.string(),
    username: z.string()
  })
  .partial()

const requiredUser = user.required()
```

Schema

```ts
const user = S.partial(
  S.Struct({
    email: S.String,
    username: S.String
  })
)

const requiredUser = S.required(user)
```

#### passthrough

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
const person = S.Struct({
  name: S.String
})

S.decodeUnknownSync(person)(
  {
    name: "bob dylan",
    extraKey: 61
  },
  { onExcessProperty: "preserve" }
)
// => { name: "bob dylan", extraKey: 61 }
```

#### strict

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
const person = S.Struct({
  name: S.String
})

S.decodeUnknownSync(person)(
  {
    name: "bob dylan",
    extraKey: 61
  },
  { onExcessProperty: "error" }
)
// => throws ParseError
```

#### catch

Zod

```ts
import { z } from "zod"

const schema = z.number().catch(42)

console.log(schema.parse(5)) // => 5
console.log(schema.parse("tuna")) // => 42
```

Schema

```ts
import { Schema } from "effect"
import { Either } from "effect"

const schema = Schema.Number.annotations({
  decodingFallback: () => Either.right(42)
})

console.log(Schema.decodeUnknownSync(schema)(5)) // => 5
console.log(Schema.decodeUnknownSync(schema)("tuna")) // => 42
```

#### catchall

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
const person = S.Struct(
  {
    name: S.String
  },
  S.Record({ key: S.String, value: S.String })
)

S.decodeUnknownSync(person)({
  name: "bob dylan",
  validExtraKey: "foo" // works fine
})

S.decodeUnknownSync(person)({
  name: "bob dylan",
  validExtraKey: true // fails
})
// => throws ParseError
```

### Arrays

Zod

```ts
const stringArray = z.array(z.string())
```

Schema

```ts
const stringArray = S.Array(S.String)
```

#### element

Zod

```ts
stringArray.element // => string schema
```

Schema

```ts
stringArray.value // => String schema
```

#### nonempty

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
const nonEmptyStrings = S.NonEmptyArray(S.String)
// the inferred type is now
// [string, ...string[]]

S.decodeUnknownSync(nonEmptyStrings)([])
/* throws:
Error: readonly [string, ...string[]]
└─ [0]
   └─ is missing
*/
S.decodeUnknownSync(nonEmptyStrings)(["Ariana Grande"]) // passes
```

#### min / max / length

Zod

```ts
z.string().array().min(5) // must contain 5 or more items
z.string().array().max(5) // must contain 5 or fewer items
z.string().array().length(5) // must contain 5 items exactly
```

Schema

```ts
S.Array(S.String).pipe(S.minItems(5)) // must contain 5 or more items
S.Array(S.String).pipe(S.maxItems(5)) // must contain 5 or fewer items
S.Array(S.String).pipe(S.itemsCount(5)) // must contain 5 items exactly
```

### Tuples

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
const athleteSchema = S.Tuple(
  S.String, // name
  S.Number, // jersey number
  S.Struct({
    pointsScored: S.Number
  }) // statistics
)

type Athlete = S.Schema.Type<typeof athleteSchema>
// type Athlete = readonly [string, number, { readonly pointsScored: number }]
```

A variadic ("rest") argument can be added with the .rest method.

Zod

```ts
const variadicTuple = z.tuple([z.string()]).rest(z.number())
const result = variadicTuple.parse(["hello", 1, 2, 3])
// => [string, ...number[]];
```

Schema

```ts
const variadicTuple = S.Tuple([S.String], S.Number)
const result = S.decodeUnknownSync(variadicTuple)(["hello", 1, 2, 3])
// => readonly [string, ...number[]];
```

### Unions

Zod

```ts
const stringOrNumber = z.union([z.string(), z.number()])

stringOrNumber.parse("foo") // passes
stringOrNumber.parse(14) // passes
```

Schema

```ts
const stringOrNumber = S.Union(S.String, S.Number)

S.decodeUnknownSync(stringOrNumber)("foo") // passes
S.decodeUnknownSync(stringOrNumber)(14) // passes
```

### Discriminated unions

No equivalent needed as discriminated unions are automatically detected.

### Records

Zod

```ts
const User = z.object({ name: z.string() })

const UserStore = z.record(z.string(), User)
type UserStore = z.infer<typeof UserStore>
// => Record<string, { name: string }>
```

Schema

```ts
const User = S.Struct({ name: S.String })

const UserStore = S.Record({ key: S.String, value: User })
type UserStore = S.Schema.Type<typeof UserStore>
// => type UserStore = { readonly [x: string]: { readonly name: string; }; }
```

### Maps

Zod

```ts
const stringNumberMap = z.map(z.string(), z.number())

type StringNumberMap = z.infer<typeof stringNumberMap>
// type StringNumberMap = Map<string, number>
```

Schema

```ts
const stringNumberMap = S.Map({ key: S.String, value: S.Number })

type StringNumberMap = S.Schema.Type<typeof stringNumberMap>
// type StringNumberMap = Map<string, number>
```

### Sets

Zod

```ts
const numberSet = z.set(z.number())
type NumberSet = z.infer<typeof numberSet>
// type NumberSet = Set<number>
```

Schema

```ts
const numberSet = S.Set(S.Number)

type NumberSet = S.Schema.Type<typeof numberSet>
// type NumberSet = Set<number>
```

### Intersections

No equivalent.

### Recursive types

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
const baseCategorySchema = S.Struct({
  name: S.String
})

type Category = S.Schema.Type<typeof baseCategorySchema> & {
  readonly subcategories: ReadonlyArray<Category>
}

const categorySchema: S.Schema<Category> = S.Struct({
  ...baseCategorySchema.fields,
  subcategories: S.suspend(() => S.Array(categorySchema))
})
```

### Promises

No equivalent.

### Instanceof

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
class Test {
  name: string = "name"
}

const TestSchema = S.instanceOf(Test)

const blob: any = "whatever"

S.decodeUnknownSync(TestSchema)(new Test()) // passes
S.decodeUnknownSync(TestSchema)(blob) // throws
```

### Functions

No equivalent.

### Preprocess

No equivalent.

### Custom schemas

Zod

```ts
z.custom
```

Schema

[`S.declare`](#declaring-new-data-types) function

### refine / superRefine

Zod

`.refine()` / `.superRefine()` methods

Schema

[`S.filter`](#filters) / [`S.filterEffect`](#effectful-filters) functions

### transform

Zod

`.transform()` method

Schema

[`S.transform`](#transform) / [`S.transformOrFail`](#transformorfail) functions

### describe

Zod

```ts
const documentedString = z
  .string()
  .describe("A useful bit of text, if you know what to do with it.")
documentedString.description // A useful bit of text…
```

Schema

```ts
import { AST, Schema as S } from "effect"

const documentedString = S.String.annotations({
  description: "A useful bit of text, if you know what to do with it."
})

console.log(AST.getDescriptionAnnotation(documentedString.ast))
/*
Output:
{
  _id: 'Option',
  _tag: 'Some',
  value: 'A useful bit of text, if you know what to do with it.'
}
*/
```

### nullish

Zod

```ts
const nullishString = z.string().nullish() // string | null | undefined
```

Schema

```ts
const nullishString = S.NullishOr(S.String) // string | null | undefined
```

### brand

Zod

```ts
const Cat = z.object({ name: z.string() }).brand<"Cat">()
```

Schema

```ts
const Cat = S.Struct({ name: S.String }).pipe(S.brand("Cat"))
```

### readonly

No equivalent as it's the default behavior.
