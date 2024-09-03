# Introduction

Welcome to the documentation for `@effect/schema`, **a library for defining and using schemas** to validate and transform data in TypeScript.

`@effect/schema` allows you to define a `Schema<Type, Encoded, Context>` that provides a blueprint for describing the structure and data types of your data. Once defined, you can leverage this schema to perform a range of operations, including:

| Operation       | Description                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Decoding        | Transforming data from an input type `Encoded` to an output type `Type`.                                       |
| Encoding        | Converting data from an output type `Type` back to an input type `Encoded`.                                    |
| Asserting       | Verifying that a value adheres to the schema's output type `Type`.                                             |
| Arbitraries     | Generate arbitraries for [fast-check](https://github.com/dubzzz/fast-check) testing.                           |
| JSON Schemas    | Create JSON Schemas based on defined schemas.                                                                  |
| Equivalence     | Create [Equivalences](https://effect-ts.github.io/effect/schema/Equivalence.ts.html) based on defined schemas. |
| Pretty printing | Support pretty printing for data structures.                                                                   |

# Requirements

- TypeScript **5.0** or newer
- The `strict` flag enabled in your `tsconfig.json` file
- The `exactOptionalPropertyTypes` flag enabled in your `tsconfig.json` file
  ```json
  {
    // ...
    "compilerOptions": {
      // ...
      "strict": true,
      "exactOptionalPropertyTypes": true
    }
  }
  ```
- Additionally, make sure to install the following packages, as they are peer dependencies. Note that some package managers might not install peer dependencies by default, so you need to install them manually:
  - `effect` package (peer dependency)
  - [fast-check](https://github.com/dubzzz/fast-check) package (peer dependency)

# Documentation

- [Website Docs](https://effect.website/docs/guides/schema)
- [API Reference](https://effect-ts.github.io/effect/docs/schema)
- Comparisons
  - [zod (v3)](https://github.com/Effect-TS/effect/blob/main/packages/schema/comparisons.md#zod-v3)

# Getting started

To install the **beta** version:

```bash
npm install @effect/schema
```

Additionally, make sure to install the `effect` package, as it's peer dependencies. Note that some package managers might not install peer dependencies by default, so you need to install them manually.

Once you have installed the library, you can import the necessary types and functions from the `@effect/schema/Schema` module.

**Example** (Namespace Import)

```ts
import * as Schema from "@effect/schema/Schema"
```

**Example** (Named Import)

```ts
import { Schema } from "@effect/schema"
```

# Technical overview

A schema is a description of a data structure that can be used to generate various artifacts from a single declaration.

From a technical point of view a schema is just a typed wrapper of an `AST` value:

```ts
interface Schema<A, I, R> {
  readonly ast: AST
}
```

The `AST` type represents a tiny portion of the TypeScript AST, roughly speaking the part describing ADTs (algebraic data types),
i.e. products (like structs and tuples) and unions, plus a custom transformation node.

This means that you can define your own schema constructors / combinators as long as you are able to manipulate the `AST` value accordingly, let's see an example.

Say we want to define a `pair` schema constructor, which takes a `Schema<A, I, R>` as input and returns a `Schema<readonly [A, A], readonly [I, I], R>` as output.

First of all we need to define the signature of `pair`

```ts
import type { Schema } from "@effect/schema"

declare const pair: <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => Schema.Schema<readonly [A, A], readonly [I, I], R>
```

Then we can implement the body using the APIs exported by the `@effect/schema/AST` module:

```ts
import { AST, Schema } from "@effect/schema"

const pair = <A, I, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<readonly [A, A], readonly [I, I], R> => {
  const element = new AST.OptionalType(
    schema.ast, // <= the element type
    false // <= is optional?
  )
  const tuple = new AST.TupleType(
    [element, element], // <= elements definitions
    [], // <= rest element
    true // <= is readonly?
  )
  return Schema.make(tuple) // <= wrap the AST value in a Schema
}
```

This example demonstrates the use of the low-level APIs of the `AST` module, however, the same result can be achieved more easily and conveniently by using the high-level APIs provided by the `Schema` module.

```ts
import { Schema } from "@effect/schema"

const pair = <A, I, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<readonly [A, A], readonly [I, I], R> =>
  Schema.Tuple(schema, schema)
```

# FAQ

## Is it Possible to Extend Functionality Beyond Built-in APIs?

If your needs aren't addressed by the existing built-in APIs, you have the option to craft your own API using the built-in APIs as a foundation. If these still don't suffice, you can delve into the lower-level APIs provided by the `@effect/schema/AST` module.

To develop a robust custom API, you need to address two primary challenges:

1. **Type-level challenge**: Can you define the TypeScript signature for your API?
2. **Runtime-level challenge**: Can you implement your API at runtime using either the `Schema` or `AST` module APIs?

Let's explore a practical example: "Is it possible to make all fields of a struct nullable?"

**Defining the API Signature in TypeScript**

First, let's determine if we can define the API's TypeScript signature:

```ts
import { Schema } from "@effect/schema"

declare const nullableFields: <
  Fields extends { readonly [x: string]: Schema.Schema.Any }
>(
  schema: Schema.Struct<Fields>
) => Schema.Struct<{ [K in keyof Fields]: Schema.NullOr<Fields[K]> }>

// Example use

/*
const schema: Schema.Struct<{
    name: Schema.NullOr<typeof Schema.String>;
    age: Schema.NullOr<typeof Schema.Number>;
}>
*/
const schema = nullableFields(
  Schema.Struct({
    name: Schema.String,
    age: Schema.Number
  })
)
```

You can preliminarily define the signature of `nullableFields` using TypeScript's `declare` keyword, allowing you to immediately test its validity (at the type-level, initially). The example above confirms that the API behaves as expected by inspecting a schema that utilizes this new API.

```ts
const schema: Schema.Struct<{
  name: Schema.NullOr<typeof Schema.String>
  age: Schema.NullOr<typeof Schema.Number>
}>
```

**Implementing the API at Runtime**

```ts
import { Schema } from "@effect/schema"
import { Record } from "effect"

const nullableFields = <
  Fields extends { readonly [x: string]: Schema.Schema.Any }
>(
  schema: Schema.Struct<Fields>
): Schema.Struct<{ [K in keyof Fields]: Schema.NullOr<Fields[K]> }> => {
  return Schema.Struct(
    Record.map(schema.fields, (schema) => Schema.NullOr(schema)) as any as {
      [K in keyof Fields]: Schema.NullOr<Fields[K]>
    }
  )
}

const schema = nullableFields(
  Schema.Struct({
    name: Schema.String,
    age: Schema.Number
  })
)

console.log(Schema.decodeUnknownSync(schema)({ name: "a", age: null }))
/*
Output:
{ name: 'a', age: null }
*/
```

# Credits

This library was inspired by the following projects:

- [io-ts](https://github.com/gcanti/io-ts)
- [zod](https://github.com/colinhacks/zod)
- [zio-schema](https://github.com/zio/zio-schema)

# License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

# Contributing Guidelines

Thank you for considering contributing to our project! Here are some guidelines to help you get started:

## Reporting Bugs

If you have found a bug, please open an issue on our [issue tracker](https://github.com/Effect-TS/effect/issues) and provide as much detail as possible. This should include:

- A clear and concise description of the problem
- Steps to reproduce the problem
- The expected behavior
- The actual behavior
- Any relevant error messages or logs

## Suggesting Enhancements

If you have an idea for an enhancement or a new feature, please open an issue on our [issue tracker](https://github.com/Effect-TS/effect/issues) and provide as much detail as possible. This should include:

- A clear and concise description of the enhancement or feature
- Any potential benefits or use cases
- Any potential drawbacks or trade-offs

## Pull Requests

We welcome contributions via pull requests! Here are some guidelines to help you get started:

1. Fork the repository and clone it to your local machine.
2. Create a new branch for your changes: `git checkout -b my-new-feature`
3. Ensure you have the required dependencies installed by running: `pnpm install` (assuming pnpm version `8.x`).
4. Make your desired changes and, if applicable, include tests to validate your modifications.
5. Run the following commands to ensure the integrity of your changes:
   - `pnpm check`: Verify that the code compiles.
   - `pnpm test`: Execute the tests.
   - `pnpm circular`: Confirm there are no circular imports.
   - `pnpm lint`: Check for code style adherence (if you happen to encounter any errors during this process, you can add the `--fix` option to automatically fix some of these style issues).
   - `pnpm dtslint`: Run type-level tests.
   - `pnpm docgen`: Update the automatically generated documentation.
6. Create a changeset for your changes: before committing your changes, create a changeset to document the modifications. This helps in tracking and communicating the changes effectively. To create a changeset, run the following command: `pnpm changeset`.
7. Commit your changes: after creating the changeset, commit your changes with a descriptive commit message: `git commit -am 'Add some feature'`.
8. Push your changes to your fork: `git push origin my-new-feature`.
9. Open a pull request against our `main` branch.

### Pull Request Guidelines

- Please make sure your changes are consistent with the project's existing style and conventions.
- Please write clear commit messages and include a summary of your changes in the pull request description.
- Please make sure all tests pass and add new tests as necessary.
- If your change requires documentation, please update the relevant documentation.
- Please be patient! We will do our best to review your pull request as soon as possible.
