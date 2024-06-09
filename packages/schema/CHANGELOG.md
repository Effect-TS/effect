# @effect/schema

## 0.67.22

### Patch Changes

- [#2955](https://github.com/Effect-TS/effect/pull/2955) [`d79ca17`](https://github.com/Effect-TS/effect/commit/d79ca17d9fa432571c69714776cab5cf8fef9c34) Thanks @gcanti! - The `minItems` filter now checks for an invalid argument (`n < 1`) and, when valid, refines the type to `NonEmptyReadonlyArray<A>`.

- Updated dependencies [[`eb98c5b`](https://github.com/Effect-TS/effect/commit/eb98c5b79ab50aa0cde239bd4e660dd19dbab612), [`184fed8`](https://github.com/Effect-TS/effect/commit/184fed83ac36cba05a75a5a8013f740f9f696e3b), [`6068e07`](https://github.com/Effect-TS/effect/commit/6068e073d4cc8b3c8583583fd5eb3efe43f7d5ba), [`3a77e20`](https://github.com/Effect-TS/effect/commit/3a77e209783933bac3aaddba1b05ff6a9ac72b36)]:
  - effect@3.3.1

## 0.67.21

### Patch Changes

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f) Thanks @KhraksMamtsov! - Added two related schemas `Redacted` and `RedactedFromSelf`
  `Secret` and `SecretFromSelf` marked as deprecated
- Updated dependencies [[`1f4ac00`](https://github.com/Effect-TS/effect/commit/1f4ac00a91c336c9c9c9b8c3ed9ceb9920ebc9bd), [`9305b76`](https://github.com/Effect-TS/effect/commit/9305b764cceeae4f16564435ae7172f79c2bf822), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`b761ef0`](https://github.com/Effect-TS/effect/commit/b761ef00eaf6c67b7ffe34798b98aae5347ab376), [`b53f69b`](https://github.com/Effect-TS/effect/commit/b53f69bff1452a487b21198cd83961f844e02d36), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`5bd549e`](https://github.com/Effect-TS/effect/commit/5bd549e4bd7144727db438ecca6b8dc9b3ef7e22), [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f)]:
  - effect@3.3.0

## 0.67.20

### Patch Changes

- [#2926](https://github.com/Effect-TS/effect/pull/2926) [`4c6bc7f`](https://github.com/Effect-TS/effect/commit/4c6bc7f190c142dc9db70b365a2bf30715a98e62) Thanks @gcanti! - Add `propertyOrder` option to `ParseOptions` to control the order of keys in the output, closes #2925.

  The `propertyOrder` option provides control over the order of object fields in the output. This feature is particularly useful when the sequence of keys is important for the consuming processes or when maintaining the input order enhances readability and usability.

  By default, the `propertyOrder` option is set to `"none"`. This means that the internal system decides the order of keys to optimize parsing speed. The order of keys in this mode should not be considered stable, and it's recommended not to rely on key ordering as it may change in future updates without notice.

  Setting `propertyOrder` to `"input"` ensures that the keys are ordered as they appear in the input during the decoding/encoding process.

  **Example** (Synchronous Decoding)

  ```ts
  import { Schema } from "@effect/schema";

  const schema = Schema.Struct({
    a: Schema.Number,
    b: Schema.Literal("b"),
    c: Schema.Number,
  });

  // Decoding an object synchronously without specifying the property order
  console.log(Schema.decodeUnknownSync(schema)({ b: "b", c: 2, a: 1 }));
  // Output decided internally: { b: 'b', a: 1, c: 2 }

  // Decoding an object synchronously while preserving the order of properties as in the input
  console.log(
    Schema.decodeUnknownSync(schema)(
      { b: "b", c: 2, a: 1 },
      { propertyOrder: "original" },
    ),
  );
  // Output preserving input order: { b: 'b', c: 2, a: 1 }
  ```

  **Example** (Asynchronous Decoding)

  ```ts
  import { ParseResult, Schema } from "@effect/schema";
  import type { Duration } from "effect";
  import { Effect } from "effect";

  // Function to simulate an asynchronous process within the schema
  const effectify = (duration: Duration.DurationInput) =>
    Schema.Number.pipe(
      Schema.transformOrFail(Schema.Number, {
        decode: (x) =>
          Effect.sleep(duration).pipe(Effect.andThen(ParseResult.succeed(x))),
        encode: ParseResult.succeed,
      }),
    );

  // Define a structure with asynchronous behavior in each field
  const schema = Schema.Struct({
    a: effectify("200 millis"),
    b: effectify("300 millis"),
    c: effectify("100 millis"),
  }).annotations({ concurrency: 3 });

  // Decoding data asynchronously without preserving order
  Schema.decode(schema)({ a: 1, b: 2, c: 3 })
    .pipe(Effect.runPromise)
    .then(console.log);
  // Output decided internally: { c: 3, a: 1, b: 2 }

  // Decoding data asynchronously while preserving the original input order
  Schema.decode(schema)({ a: 1, b: 2, c: 3 }, { propertyOrder: "original" })
    .pipe(Effect.runPromise)
    .then(console.log);
  // Output preserving input order: { a: 1, b: 2, c: 3 }
  ```

## 0.67.19

### Patch Changes

- [#2916](https://github.com/Effect-TS/effect/pull/2916) [`cd7496b`](https://github.com/Effect-TS/effect/commit/cd7496ba214eabac2e3c297f513fcbd5b11f0e91) Thanks @gcanti! - Add support for `AST.Literal` in `Schema.TemplateLiteral`, closes #2913

- [#2915](https://github.com/Effect-TS/effect/pull/2915) [`349a036`](https://github.com/Effect-TS/effect/commit/349a036ffb08351481c060655660a6ccf26473de) Thanks @gcanti! - Align constructors arguments:

  - Refactor `Class` interface to accept options for disabling validation
  - Refactor `TypeLiteral` interface to accept options for disabling validation
  - Refactor `refine` interface to accept options for disabling validation
  - Refactor `BrandSchema` interface to accept options for disabling validation

  Example

  ```ts
  import { Schema } from "@effect/schema";

  const BrandedNumberSchema = Schema.Number.pipe(
    Schema.between(1, 10),
    Schema.brand("MyNumber"),
  );

  BrandedNumberSchema.make(20, { disableValidation: true }); // Bypasses validation and creates the instance without errors
  ```

- Updated dependencies [[`8c5d280`](https://github.com/Effect-TS/effect/commit/8c5d280c0402284a4e58372867a15a431cb99461), [`6ba6d26`](https://github.com/Effect-TS/effect/commit/6ba6d269f5891e6b11aa35c5281dde4bf3273004), [`3f28bf2`](https://github.com/Effect-TS/effect/commit/3f28bf274333611906175446b772243f34f1b6d5), [`5817820`](https://github.com/Effect-TS/effect/commit/58178204a770d1a78c06945ef438f9fffbb50afa)]:
  - effect@3.2.9

## 0.67.18

### Patch Changes

- [#2908](https://github.com/Effect-TS/effect/pull/2908) [`a0dd1c1`](https://github.com/Effect-TS/effect/commit/a0dd1c1ede2a1e856ecb0e67826ec992016fef97) Thanks @gcanti! - TemplateLiteral: fix bug related to ${number} span, closes #2907

## 0.67.17

### Patch Changes

- [#2892](https://github.com/Effect-TS/effect/pull/2892) [`d9d22e7`](https://github.com/Effect-TS/effect/commit/d9d22e7c4d5e31d5b46644c729b027796e467c16) Thanks @gcanti! - Schema

  - add `propertySignature` API interface (with a `from` property)
  - extend `optional` API interface with a `from` property
  - extend `optionalWithOptions` API interface with a `from` property

- [#2901](https://github.com/Effect-TS/effect/pull/2901) [`3c080f7`](https://github.com/Effect-TS/effect/commit/3c080f74b2e2290edb6143c3aa01026e57f87a2a) Thanks @gcanti! - make the `AST.TemplateLiteral` constructor public

- [#2901](https://github.com/Effect-TS/effect/pull/2901) [`3c080f7`](https://github.com/Effect-TS/effect/commit/3c080f74b2e2290edb6143c3aa01026e57f87a2a) Thanks @gcanti! - add support for string literals to `Schema.TemplateLiteral` and `TemplateLiteral` API interface.

  Before

  ```ts
  import { Schema } from "@effect/schema";

  // `https://${string}.com` | `https://${string}.net`
  const MyUrl = Schema.TemplateLiteral(
    Schema.Literal("https://"),
    Schema.String,
    Schema.Literal("."),
    Schema.Literal("com", "net"),
  );
  ```

  Now

  ```ts
  import { Schema } from "@effect/schema";

  // `https://${string}.com` | `https://${string}.net`
  const MyUrl = Schema.TemplateLiteral(
    "https://",
    Schema.String,
    ".",
    Schema.Literal("com", "net"),
  );
  ```

- [#2905](https://github.com/Effect-TS/effect/pull/2905) [`7d6d875`](https://github.com/Effect-TS/effect/commit/7d6d8750077d9c8379f37240745240d7f3b7a4f8) Thanks @gcanti! - add support for unions to `rename`, closes #2904

- [#2897](https://github.com/Effect-TS/effect/pull/2897) [`70cda70`](https://github.com/Effect-TS/effect/commit/70cda704e8e31c80737b95121c8199e726ea132f) Thanks @gcanti! - Add `encodedBoundSchema` API.

  The `encodedBoundSchema` function is similar to `encodedSchema` but preserves the refinements up to the first transformation point in the
  original schema.

  **Function Signature:**

  ```ts
  export const encodedBoundSchema = <A, I, R>(schema: Schema<A, I, R>): Schema<I>
  ```

  The term "bound" in this context refers to the boundary up to which refinements are preserved when extracting the encoded form of a schema. It essentially marks the limit to which initial validations and structure are maintained before any transformations are applied.

  **Example Usage:**

  ```ts
  import { Schema } from "@effect/schema";

  const schema = Schema.Struct({
    foo: Schema.String.pipe(Schema.minLength(3), Schema.compose(Schema.Trim)),
  });

  // The resultingEncodedBoundSchema preserves the minLength(3) refinement,
  // ensuring the string length condition is enforced but omits the Trim transformation.
  const resultingEncodedBoundSchema = Schema.encodedBoundSchema(schema);

  // resultingEncodedBoundSchema is the same as:
  Schema.Struct({
    foo: Schema.String.pipe(Schema.minLength(3)),
  });
  ```

  In the provided example:

  - **Initial Schema**: The schema for `foo` includes a refinement to ensure strings have a minimum length of three characters and a transformation to trim the string.
  - **Resulting Schema**: `resultingEncodedBoundSchema` maintains the `minLength(3)` condition, ensuring that this validation persists. However, it excludes the trimming transformation, focusing solely on the length requirement without altering the string's formatting.

- Updated dependencies [[`fb91f17`](https://github.com/Effect-TS/effect/commit/fb91f17098b48497feca9ec976feb87e4a82451b)]:
  - effect@3.2.8

## 0.67.16

### Patch Changes

- [#2890](https://github.com/Effect-TS/effect/pull/2890) [`5745886`](https://github.com/Effect-TS/effect/commit/57458869859943410221ccc87f8cecfba7c79d92) Thanks @gcanti! - Fix constructor type inference for classes with all optional fields, closes #2888

  This fix addresses an issue where TypeScript incorrectly inferred the constructor parameter type as an empty object {} when all class fields were optional. Now, the constructor properly recognizes arguments as objects with optional fields (e.g., { abc?: number, xyz?: number }).

- Updated dependencies [[`6801fca`](https://github.com/Effect-TS/effect/commit/6801fca44366be3ee1b6b99f54bd4f38a1b5e4f4)]:
  - effect@3.2.7

## 0.67.15

### Patch Changes

- [#2882](https://github.com/Effect-TS/effect/pull/2882) [`e2740fc`](https://github.com/Effect-TS/effect/commit/e2740fc4e212ba85a90541e8c8d85b0bcd5c2e7c) Thanks @gcanti! - add `requiredToOptional` function to `Schema` module, closes #2881

- [#2880](https://github.com/Effect-TS/effect/pull/2880) [`60fe3d5`](https://github.com/Effect-TS/effect/commit/60fe3d5fb2be168dd35c6d0cb8ac8f55deb30fc0) Thanks @gcanti! - add missing `makePropertySignature` constructor

- Updated dependencies [[`cc8ac50`](https://github.com/Effect-TS/effect/commit/cc8ac5080daba8622ca2ff5dab5c37ddfab732ba)]:
  - effect@3.2.6

## 0.67.14

### Patch Changes

- [#2851](https://github.com/Effect-TS/effect/pull/2851) [`c5846e9`](https://github.com/Effect-TS/effect/commit/c5846e99137e9eb02efd31865e26f49f0d2c7c03) Thanks @gcanti! - Add `tag` and `TaggedStruct` constructors.

  In TypeScript tags help to enhance type discrimination and pattern matching by providing a simple yet powerful way to define and recognize different data types.

  **What is a Tag?**

  A tag is a literal value added to data structures, commonly used in structs, to distinguish between various object types or variants within tagged unions. This literal acts as a discriminator, making it easier to handle and process different types of data correctly and efficiently.

  **Using the `tag` Constructor**

  The `tag` constructor is specifically designed to create a property signature that holds a specific literal value, serving as the discriminator for object types. Here's how you can define a schema with a tag:

  ```ts
  import { Schema } from "@effect/schema";

  const User = Schema.Struct({
    _tag: Schema.tag("User"),
    name: Schema.String,
    age: Schema.Number,
  });

  assert.deepStrictEqual(User.make({ name: "John", age: 44 }), {
    _tag: "User",
    name: "John",
    age: 44,
  });
  ```

  In the example above, `Schema.tag("User")` attaches a `_tag` property to the `User` struct schema, effectively labeling objects of this struct type as "User". This label is automatically applied when using the `make` method to create new instances, simplifying object creation and ensuring consistent tagging.

  **Simplifying Tagged Structs with `TaggedStruct`**

  The `TaggedStruct` constructor streamlines the process of creating tagged structs by directly integrating the tag into the struct definition. This method provides a clearer and more declarative approach to building data structures with embedded discriminators.

  ```ts
  import { Schema } from "@effect/schema";

  const User = Schema.TaggedStruct("User", {
    name: Schema.String,
    age: Schema.Number,
  });

  // `_tag` is optional
  const userInstance = User.make({ name: "John", age: 44 });

  assert.deepStrictEqual(userInstance, {
    _tag: "User",
    name: "John",
    age: 44,
  });
  ```

  **Multiple Tags**

  While a primary tag is often sufficient, TypeScript allows you to define multiple tags for more complex data structuring needs. Here's an example demonstrating the use of multiple tags within a single struct:

  ```ts
  import { Schema } from "@effect/schema";

  const Product = Schema.TaggedStruct("Product", {
    category: Schema.tag("Electronics"),
    name: Schema.String,
    price: Schema.Number,
  });

  // `_tag` and `category` are optional
  const productInstance = Product.make({ name: "Smartphone", price: 999 });

  assert.deepStrictEqual(productInstance, {
    _tag: "Product",
    category: "Electronics",
    name: "Smartphone",
    price: 999,
  });
  ```

  This example showcases a product schema that not only categorizes each product under a general tag (`"Product"`) but also specifies a category tag (`"Electronics"`), enhancing the clarity and specificity of the data model.

## 0.67.13

### Patch Changes

- Updated dependencies [[`608b01f`](https://github.com/Effect-TS/effect/commit/608b01fc342dbae2a642b308a67b84ead530ecea), [`031c712`](https://github.com/Effect-TS/effect/commit/031c7122a24ac42e48d6a434646b4f5d279d7442), [`a44e532`](https://github.com/Effect-TS/effect/commit/a44e532cf3a6a498b12a5aacf8124aa267e24ba0)]:
  - effect@3.2.5

## 0.67.12

### Patch Changes

- [#2814](https://github.com/Effect-TS/effect/pull/2814) [`f8038ca`](https://github.com/Effect-TS/effect/commit/f8038cadd5f50d397469e5fdbc70dd8f69671f50) Thanks @gcanti! - Add support for Enums in Record, closes #2811

- [#2816](https://github.com/Effect-TS/effect/pull/2816) [`e376641`](https://github.com/Effect-TS/effect/commit/e3766411b60ebb45d31e9c9d94efa099121d4d58) Thanks @gcanti! - Add support for `Config` module, closes #2346

- Updated dependencies [[`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3), [`e313a01`](https://github.com/Effect-TS/effect/commit/e313a01b7e80f6cb7704055a190e5623c9d22c6d)]:
  - effect@3.2.4

## 0.67.11

### Patch Changes

- [#2803](https://github.com/Effect-TS/effect/pull/2803) [`5af633e`](https://github.com/Effect-TS/effect/commit/5af633eb5ff6560a64d87263d1692bb9c75f7b3c) Thanks @tim-smart! - update dependencies

- Updated dependencies [[`45578e8`](https://github.com/Effect-TS/effect/commit/45578e8faa80ae33d23e08f6f19467f818b7788f)]:
  - effect@3.2.3

## 0.67.10

### Patch Changes

- [#2794](https://github.com/Effect-TS/effect/pull/2794) [`78ffc27`](https://github.com/Effect-TS/effect/commit/78ffc27ee3fa708433c25fa118c53d38d90d08bc) Thanks @gcanti! - add `optional` and `optionalWithOptions` API interfaces

- Updated dependencies [[`5d9266e`](https://github.com/Effect-TS/effect/commit/5d9266e8c740746ac9e186c3df6090a1b57fbe2a), [`9f8122e`](https://github.com/Effect-TS/effect/commit/9f8122e78884ab47c5e5f364d86eee1d1543cc61), [`6a6f670`](https://github.com/Effect-TS/effect/commit/6a6f6706b8613c8c7c10971b8d81a0f9e440a6f2)]:
  - effect@3.2.2

## 0.67.9

### Patch Changes

- [#2775](https://github.com/Effect-TS/effect/pull/2775) [`5432fff`](https://github.com/Effect-TS/effect/commit/5432fff7c9a69d43910426c1053ebfc3b73ebed6) Thanks [@KhraksMamtsov](https://github.com/KhraksMamtsov)! - fix `pattern` in JSONSchemaAnnotation of `Trimmed` schema

## 0.67.8

### Patch Changes

- Updated dependencies [[`c1e991d`](https://github.com/Effect-TS/effect/commit/c1e991dd5ba87901cd0e05697a8b4a267e7e954a)]:
  - effect@3.2.1

## 0.67.7

### Patch Changes

- Updated dependencies [[`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`963b4e7`](https://github.com/Effect-TS/effect/commit/963b4e7ac87e2468feb6a344f7ab4ee4ad711198), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`2cbb76b`](https://github.com/Effect-TS/effect/commit/2cbb76bb52500a3f4bf27d1c91482518cbea56d7), [`870c5fa`](https://github.com/Effect-TS/effect/commit/870c5fa52cd61e745e8e828d38c3f09f00737553), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e)]:
  - effect@3.2.0

## 0.67.6

### Patch Changes

- [#2772](https://github.com/Effect-TS/effect/pull/2772) [`17da864`](https://github.com/Effect-TS/effect/commit/17da864e4a6f80becdb82db7dece2ba583bfdda3) Thanks [@vinassefranche](https://github.com/vinassefranche)! - Add onNoneEncoding for Schema.optional used with {as: "Option"}

- [#2769](https://github.com/Effect-TS/effect/pull/2769) [`ff0efa0`](https://github.com/Effect-TS/effect/commit/ff0efa0a1415a41d4a4312a16cf7a63def86db3f) Thanks [@TylorS](https://github.com/TylorS)! - Point-free usage of Schema.make constructors

- Updated dependencies [[`17fc22e`](https://github.com/Effect-TS/effect/commit/17fc22e132593c5caa563705a4748ba0f04a853c), [`810f222`](https://github.com/Effect-TS/effect/commit/810f222268792b13067c7a7bf317b93a9bb8917b), [`596aaea`](https://github.com/Effect-TS/effect/commit/596aaea022648b2e06fb1ec22f1652043d6fe64e)]:
  - effect@3.1.6

## 0.67.5

### Patch Changes

- [#2757](https://github.com/Effect-TS/effect/pull/2757) [`9c514de`](https://github.com/Effect-TS/effect/commit/9c514de28152696edff008324d2d7e67d55afd56) Thanks [@fubhy](https://github.com/fubhy)! - Re-publishing due to empty root entrypoint

## 0.67.4

### Patch Changes

- [#2756](https://github.com/Effect-TS/effect/pull/2756) [`ee08593`](https://github.com/Effect-TS/effect/commit/ee0859398ecc2589cab0d017bef6a17e00c34dfd) Thanks [@gcanti](https://github.com/gcanti)! - Improving Predicate Usability of `Schema.is`

  Before this update, the `Schema.is(mySchema)` function couldn't be easily used as a predicate or refinement in common array methods like `filter` or `find`. This was because the function's signature was:

  ```ts
  (value: unknown, overrideOptions?: AST.ParseOptions) => value is A
  ```

  Meanwhile, the function expected by methods like `filter` has the following signature:

  ```ts
  (value: unknown, index: number) => value is A
  ```

  To make `Schema.is` compatible with these array methods, we've adjusted the function's signature to accept `number` as a possible value for the second parameter, in which case it is ignored:

  ```diff
  -(value: unknown, overrideOptions?: AST.ParseOptions) => value is A
  +(value: unknown, overrideOptions?: AST.ParseOptions | number) => value is A
  ```

  Here's a practical example comparing the behavior before and after the change:

  **Before:**

  ```ts
  import { Schema } from "@effect/schema";

  declare const array: Array<string | number>;

  /*
  Throws an error:
  No overload matches this call.
  ...
  Types of parameters 'overrideOptions' and 'index' are incompatible.
  */
  const strings = array.filter(Schema.is(Schema.String));
  ```

  **Now:**

  ```ts
  import { Schema } from "@effect/schema";

  declare const array: Array<string | number>;

  // const strings: string[]
  const strings = array.filter(Schema.is(Schema.String));
  ```

  Note that the result has been correctly narrowed to `string[]`.

- [#2746](https://github.com/Effect-TS/effect/pull/2746) [`da6d7d8`](https://github.com/Effect-TS/effect/commit/da6d7d845246e9d04631d64fa7694944b6010d09) Thanks [@gcanti](https://github.com/gcanti)! - `pick`: do not return a `ComposeTransformation` if none of the picked keys are related to a property signature transformation, closes #2743

## 0.67.3

### Patch Changes

- Updated dependencies [[`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610)]:
  - effect@3.1.5

## 0.67.2

### Patch Changes

- [#2738](https://github.com/Effect-TS/effect/pull/2738) [`89a3afb`](https://github.com/Effect-TS/effect/commit/89a3afbe191c83b84b17bfaa95519aff0749afbe) Thanks [@gcanti](https://github.com/gcanti)! - add `cause` in errors thrown by `asserts`, closes #2729

- [#2741](https://github.com/Effect-TS/effect/pull/2741) [`992c8e2`](https://github.com/Effect-TS/effect/commit/992c8e21535db9f0c66e81d32fee8af56a96274f) Thanks [@gcanti](https://github.com/gcanti)! - `Schema.optional`: the `default` option now allows setting a default value for **both** the decoding phase and the default constructor. Previously, it only set the decoding default. Closes #2740.

  **Example**

  ```ts
  import { Schema } from "@effect/schema";

  const Product = Schema.Struct({
    name: Schema.String,
    price: Schema.NumberFromString,
    quantity: Schema.optional(Schema.NumberFromString, { default: () => 1 }),
  });

  // Applying defaults in the decoding phase
  console.log(
    Schema.decodeUnknownSync(Product)({ name: "Laptop", price: "999" }),
  ); // { name: 'Laptop', price: 999, quantity: 1 }
  console.log(
    Schema.decodeUnknownSync(Product)({
      name: "Laptop",
      price: "999",
      quantity: "2",
    }),
  ); // { name: 'Laptop', price: 999, quantity: 2 }

  // Applying defaults in the constructor
  console.log(Product.make({ name: "Laptop", price: 999 })); // { name: 'Laptop', price: 999, quantity: 1 }
  console.log(Product.make({ name: "Laptop", price: 999, quantity: 2 })); // { name: 'Laptop', price: 999, quantity: 2 }
  ```

## 0.67.1

### Patch Changes

- Updated dependencies [[`e41e911`](https://github.com/Effect-TS/effect/commit/e41e91122fa6dd12fc81e50dcad0db891be67146)]:
  - effect@3.1.4

## 0.67.0

### Minor Changes

- [#2634](https://github.com/Effect-TS/effect/pull/2634) [`d7e4997`](https://github.com/Effect-TS/effect/commit/d7e49971fe97b7ee5fb7991f3f5ac4d627a26338) Thanks [@gcanti](https://github.com/gcanti)! - ## Simplifying Type Extraction

  When we work with schemas, it's common to need to extract their types automatically.
  To make this easier, we've made some changes to the `Schema` interface.
  Now, you can easily access `Type` and `Encoded` directly from a schema without the need for `Schema.Schema.Type` and `Schema.Schema.Encoded`.

  ```ts
  import { Schema } from "@effect/schema";

  const PersonSchema = Schema.Struct({
    name: Schema.String,
    age: Schema.NumberFromString,
  });

  // same as type PersonType = Schema.Schema.Type<typeof PersonSchema>
  type PersonType = typeof PersonSchema.Type;

  // same as Schema.Schema.Encoded<typeof PersonSchema>
  type PersonEncoded = typeof PersonSchema.Encoded;
  ```

  ## Default Constructors

  When dealing with data, creating values that match a specific schema is crucial.
  To simplify this process, we've introduced **default constructors** for various types of schemas: `Struct`s, `filter`s, and `brand`s.

  > [!NOTE]
  > Default constructors associated with a schema `Schema<A, I, R>` are specifically related to the `A` type, not the `I` type.

  Let's dive into each of them with some examples to understand better how they work.

  **Example** (`Struct`)

  ```ts
  import { Schema } from "@effect/schema";

  const MyStruct = Schema.Struct({
    name: Schema.NonEmpty,
  });

  MyStruct.make({ name: "a" }); // ok
  MyStruct.make({ name: "" });
  /*
  throws
  Error: { name: NonEmpty }
  └─ ["name"]
     └─ NonEmpty
        └─ Predicate refinement failure
           └─ Expected NonEmpty (a non empty string), actual ""
  */
  ```

  **Example** (`filter`)

  ```ts
  import { Schema } from "@effect/schema";

  const MyNumber = Schema.Number.pipe(Schema.between(1, 10));

  // const n: number
  const n = MyNumber.make(5); // ok
  MyNumber.make(20);
  /*
  throws
  Error: a number between 1 and 10
  └─ Predicate refinement failure
    └─ Expected a number between 1 and 10, actual 20
  */
  ```

  **Example** (`brand`)

  ```ts
  import { Schema } from "@effect/schema";

  const MyBrand = Schema.Number.pipe(
    Schema.between(1, 10),
    Schema.brand("MyNumber"),
  );

  // const n: number & Brand<"MyNumber">
  const n = MyBrand.make(5); // ok
  MyBrand.make(20);
  /*
  throws
  Error: a number between 1 and 10
  └─ Predicate refinement failure
    └─ Expected a number between 1 and 10, actual 20
  */
  ```

  When utilizing our default constructors, it's important to grasp the type of value they generate. In the `MyBrand` example, the return type of the constructor is `number & Brand<"MyNumber">`, indicating that the resulting value is a `number` with the added branding "MyNumber".

  This differs from the filter example where the return type is simply `number`. The branding offers additional insights about the type, facilitating the identification and manipulation of your data.

  Note that default constructors are "unsafe" in the sense that if the input does not conform to the schema, the constructor **throws an error** containing a description of what is wrong. This is because the goal of default constructors is to provide a quick way to create compliant values (for example, for writing tests or configurations, or in any situation where it is assumed that the input passed to the constructors is valid and the opposite situation is exceptional).

  To have a "safe" constructor, you can use `Schema.validateEither`:

  ```ts
  import { Schema } from "@effect/schema";

  const MyNumber = Schema.Number.pipe(Schema.between(1, 10));

  const ctor = Schema.validateEither(MyNumber);

  console.log(ctor(5));
  /*
  { _id: 'Either', _tag: 'Right', right: 5 }
  */

  console.log(ctor(20));
  /*
  {
    _id: 'Either',
    _tag: 'Left',
    left: {
      _id: 'ParseError',
      message: 'a number between 1 and 10\n' +
        '└─ Predicate refinement failure\n' +
        '   └─ Expected a number between 1 and 10, actual 20'
    }
  }
  */
  ```

  ### Default Constructor Values

  When constructing objects, it's common to want to assign default values to certain fields to simplify the creation of new instances.
  Our new `Schema.withConstructorDefault` combinator allows you to effortlessly manage the optionality of a field **in your default constructor**.

  **Example**

  ```ts
  import { Schema } from "@effect/schema";

  const PersonSchema = Schema.Struct({
    name: Schema.NonEmpty,
    age: Schema.Number.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => 0),
    ),
  });

  // The age field is optional and defaults to 0
  console.log(PersonSchema.make({ name: "John" }));
  // => { age: 0, name: 'John' }
  ```

  Defaults are **lazily evaluated**, meaning that a new instance of the default is generated every time the constructor is called:

  ```ts
  import { Schema } from "@effect/schema";

  const PersonSchema = Schema.Struct({
    name: Schema.NonEmpty,
    age: Schema.Number.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => 0),
    ),
    timestamp: Schema.Number.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => new Date().getTime()),
    ),
  });

  console.log(PersonSchema.make({ name: "name1" }));
  // => { age: 0, timestamp: 1714232909221, name: 'name1' }
  console.log(PersonSchema.make({ name: "name2" }));
  // => { age: 0, timestamp: 1714232909227, name: 'name2' }
  ```

  Note how the `timestamp` field varies.

  Defaults can also be applied using the `Class` API:

  ```ts
  import { Schema } from "@effect/schema";

  class Person extends Schema.Class<Person>("Person")({
    name: Schema.NonEmpty,
    age: Schema.Number.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => 0),
    ),
    timestamp: Schema.Number.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => new Date().getTime()),
    ),
  }) {}

  console.log(new Person({ name: "name1" }));
  // => Person { age: 0, timestamp: 1714400867208, name: 'name1' }
  console.log(new Person({ name: "name2" }));
  // => Person { age: 0, timestamp: 1714400867215, name: 'name2' }
  ```

  Default values are also "portable", meaning that if you reuse the same property signature in another schema, the default is carried over:

  ```ts
  import { Schema } from "@effect/schema";

  const PersonSchema = Schema.Struct({
    name: Schema.NonEmpty,
    age: Schema.Number.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => 0),
    ),
    timestamp: Schema.Number.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => new Date().getTime()),
    ),
  });

  const AnotherSchema = Schema.Struct({
    foo: Schema.String,
    age: PersonSchema.fields.age,
  });

  console.log(AnotherSchema.make({ foo: "bar" })); // => { foo: 'bar', age: 0 }
  ```

  Defaults can also be applied using the `Class` API:

  ```ts
  import { Schema } from "@effect/schema";

  class Person extends Schema.Class<Person>("Person")({
    name: Schema.NonEmpty,
    age: Schema.Number.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => 0),
    ),
    timestamp: Schema.Number.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => new Date().getTime()),
    ),
  }) {}

  console.log(new Person({ name: "name1" })); // Person { age: 0, timestamp: 1714400867208, name: 'name1' }
  console.log(new Person({ name: "name2" })); // Person { age: 0, timestamp: 1714400867215, name: 'name2' }
  ```

  ## Default Decoding Values

  Our new `Schema.withDecodingDefault` combinator makes it easy to handle the optionality of a field during the **decoding process**.

  ```ts
  import { Schema } from "@effect/schema";

  const MySchema = Schema.Struct({
    a: Schema.optional(Schema.String).pipe(
      Schema.withDecodingDefault(() => ""),
    ),
  });

  console.log(Schema.decodeUnknownSync(MySchema)({}));
  // => { a: '' }
  console.log(Schema.decodeUnknownSync(MySchema)({ a: undefined }));
  // => { a: '' }
  console.log(Schema.decodeUnknownSync(MySchema)({ a: "a" }));
  // => { a: 'a' }
  ```

  If you want to set default values both for the decoding phase and for the default constructor, you can use `Schema.withDefaults`:

  ```ts
  import { Schema } from "@effect/schema";

  const MySchema = Schema.Struct({
    a: Schema.optional(Schema.String).pipe(
      Schema.withDefaults({
        decoding: () => "",
        constructor: () => "-",
      }),
    ),
  });

  console.log(Schema.decodeUnknownSync(MySchema)({}));
  // => { a: '' }
  console.log(Schema.decodeUnknownSync(MySchema)({ a: undefined }));
  // => { a: '' }
  console.log(Schema.decodeUnknownSync(MySchema)({ a: "a" }));
  // => { a: 'a' }

  console.log(MySchema.make({})); // => { a: '-' }
  console.log(MySchema.make({ a: "a" })); // => { a: 'a' }
  ```

  ## Refactoring of Custom Message System

  We've refactored the system that handles user-defined custom messages to make it more intuitive.

  Now, custom messages no longer have absolute precedence by default. Instead, it becomes an opt-in behavior by explicitly setting a new flag `override` with the value `true`. Let's see an example:

  **Previous Approach**

  ```ts
  import { Schema } from "@effect/schema";

  const MyString = Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(2),
  ).annotations({
    // This message always takes precedence
    // So, for any error, the same message will always be shown
    message: () => "my custom message",
  });

  const decode = Schema.decodeUnknownEither(MyString);

  console.log(decode(null)); // "my custom message"
  console.log(decode("")); // "my custom message"
  console.log(decode("abc")); // "my custom message"
  ```

  As you can see, no matter where the decoding error is raised, the same error message will always be presented because in the previous version, the custom message by default overrides those generated by previous filters.

  Now, let's see how the same schema works with the new system.

  **Current Approach**

  ```ts
  import { Schema } from "@effect/schema";

  const MyString = Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(2),
  ).annotations({
    // This message is shown only if the maxLength filter fails
    message: () => "my custom message",
  });

  const decode = Schema.decodeUnknownEither(MyString);

  console.log(decode(null)); // "Expected a string, actual null"
  console.log(decode("")); // `Expected a string at least 1 character(s) long, actual ""`
  console.log(decode("abc")); // "my custom message"
  ```

  To restore the old behavior (for example, to address the scenario where a user wants to define a single cumulative custom message describing the properties that a valid value must have and does not want to see default messages), you need to set the `override` flag to `true`:

  ```ts
  import { Schema } from "@effect/schema";

  const MyString = Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(2),
  ).annotations({
    // By setting the `override` flag to `true`
    // this message will always be shown for any error
    message: () => ({ message: "my custom message", override: true }),
  });

  const decode = Schema.decodeUnknownEither(MyString);

  console.log(decode(null)); // "my custom message"
  console.log(decode("")); // "my custom message"
  console.log(decode("abc")); // "my custom message"
  ```

  The new system is particularly useful when the schema on which custom messages are defined is more complex than a scalar value (like `string` or `number`), for example, if it's a struct containing a field that is an array of structs. Let's see an example that illustrates how convenient it is to rely on default messages when the decoding error occurs in a nested structure:

  ```ts
  import { Schema } from "@effect/schema";
  import { pipe } from "effect";

  const schema = Schema.Struct({
    outcomes: pipe(
      Schema.Array(
        Schema.Struct({
          id: Schema.String,
          text: pipe(
            Schema.String,
            Schema.message(() => "error_invalid_outcome_type"),
            Schema.minLength(1, { message: () => "error_required_field" }),
            Schema.maxLength(50, { message: () => "error_max_length_field" }),
          ),
        }),
      ),
      Schema.minItems(1, { message: () => "error_min_length_field" }),
    ),
  });

  Schema.decodeUnknownSync(schema, { errors: "all" })({
    outcomes: [],
  });
  /*
  throws
  Error: { outcomes: an array of at least 1 items }
  └─ ["outcomes"]
     └─ error_min_length_field
  */

  Schema.decodeUnknownSync(schema, { errors: "all" })({
    outcomes: [
      { id: "1", text: "" },
      { id: "2", text: "this one is valid" },
      { id: "3", text: "1234567890".repeat(6) },
    ],
  });
  /*
  throws
  Error: { outcomes: an array of at least 1 items }
  └─ ["outcomes"]
     └─ an array of at least 1 items
        └─ From side refinement failure
           └─ ReadonlyArray<{ id: string; text: a string at most 50 character(s) long }>
              ├─ [0]
              │  └─ { id: string; text: a string at most 50 character(s) long }
              │     └─ ["text"]
              │        └─ error_required_field
              └─ [2]
                 └─ { id: string; text: a string at most 50 character(s) long }
                    └─ ["text"]
                       └─ error_max_length_field
  */
  ```

  In the previous version, we would have received the message "error_min_length_field" for any decoding error, which is evidently suboptimal and has now been corrected.

  ## Filter API Interface

  We've introduced a new API interface to the `filter` API. This allows you to access the refined schema using the exposed `from` field:

  ```ts
  import { Schema } from "@effect/schema";

  const MyFilter = Schema.Struct({
    a: Schema.String,
  }).pipe(Schema.filter(() => /* some filter... */ true));

  // const aField: typeof Schema.String
  const aField = MyFilter.from.fields.a;
  ```

  The signature of the `filter` function has been simplified and streamlined to be more ergonomic when setting a default message. In the new signature of `filter`, the type of the predicate passed as an argument is as follows:

  ```ts
  predicate: (a: A, options: ParseOptions, self: AST.Refinement) =>
    undefined | boolean | string | ParseResult.ParseIssue;
  ```

  with the following semantics:

  - `true` means the filter is successful.
  - `false` or `undefined` means the filter fails and no default message is set.
  - `string` means the filter fails and the returned string is used as the default message.
  - `ParseIssue` means the filter fails and the returned ParseIssue is used as an error.

  Let's see an example of how it worked before and how it works now.

  **Before**

  ```ts
  import { Schema, ParseResult } from "@effect/schema";
  import { Option } from "effect";

  const Positive = Schema.Number.pipe(
    Schema.filter((n, _, ast) =>
      n > 0
        ? Option.none()
        : Option.some(new ParseResult.Type(ast, n, "must be positive")),
    ),
  );

  Schema.decodeUnknownSync(Positive)(-1);
  /*
  throws
  Error: <refinement schema>
  └─ Predicate refinement failure
     └─ must be positive
  */
  ```

  **Now**

  ```ts
  import { Schema } from "@effect/schema";

  const Positive = Schema.Number.pipe(
    Schema.filter((n) => (n > 0 ? undefined : "must be positive")),
  );

  Schema.decodeUnknownSync(Positive)(-1);
  /*
  throws
  Error: { number | filter }
  └─ Predicate refinement failure
     └─ must be positive
  */
  ```

  ## JSON Schema Compiler Refactoring

  The JSON Schema compiler has been refactored to be more user-friendly. Now, the `make` API attempts to produce the optimal JSON Schema for the input part of the decoding phase. This means that starting from the most nested schema, it traverses the chain, including each refinement, and stops at the first transformation found.

  Let's see an example:

  ```ts
  import { JSONSchema, Schema } from "@effect/schema";

  const schema = Schema.Struct({
    foo: Schema.String.pipe(Schema.minLength(2)),
    bar: Schema.optional(Schema.NumberFromString, {
      default: () => 0,
    }),
  });

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2));
  ```

  Now, let's compare the JSON Schemas produced in both the previous and new versions.

  **Before**

  ```json
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["bar", "foo"],
    "properties": {
      "bar": {
        "type": "number",
        "description": "a number",
        "title": "number"
      },
      "foo": {
        "type": "string",
        "description": "a string at least 2 character(s) long",
        "title": "string",
        "minLength": 2
      }
    },
    "additionalProperties": false,
    "title": "Struct (Type side)"
  }
  ```

  As you can see, the JSON Schema produced has:

  - a required `foo` field, correctly modeled with a constraint (`"minLength": 2`)
  - a **required numeric `bar` field**

  This happens because in the previous version, the `JSONSchema.make` API by default produces a JSON Schema for the `Type` part of the schema. That is:

  ```ts
  type Type = Schema.Schema.Type<typeof schema>;
  /*
  type Type = {
      readonly foo: string;
      readonly bar: number;
  }
  */
  ```

  However, typically, we are interested in generating a JSON Schema for the input part of the decoding process, i.e., in this case for:

  ```ts
  type Encoded = Schema.Schema.Encoded<typeof schema>;
  /*
  type Encoded = {
      readonly foo: string;
      readonly bar?: string | undefined;
  }
  */
  ```

  At first glance, a possible solution might be to generate the JSON Schema of `Schema.encodedSchema(schema)`:

  ```ts
  console.log(
    JSON.stringify(JSONSchema.make(Schema.encodedSchema(schema)), null, 2),
  );
  ```

  But here's what the result would be:

  ```json
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["foo"],
    "properties": {
      "foo": {
        "type": "string",
        "description": "a string",
        "title": "string"
      },
      "bar": {
        "type": "string",
        "description": "a string",
        "title": "string"
      }
    },
    "additionalProperties": false
  }
  ```

  As you can see, we lost the `"minLength": 2` constraint, which is the useful part of precisely defining our schemas using refinements.

  **After**

  Now, let's see what `JSONSchema.make` API produces by default for the same schema:

  ```json
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["foo"],
    "properties": {
      "foo": {
        "type": "string",
        "description": "a string at least 2 character(s) long",
        "title": "string",
        "minLength": 2
      },
      "bar": {
        "type": "string",
        "description": "a string",
        "title": "string"
      }
    },
    "additionalProperties": false,
    "title": "Struct (Encoded side)"
  }
  ```

  As you can verify, the refinement has been preserved.

  ## Improve `extend` to support refinements and `suspend`ed schemas

  Now `extend` supports extending refinements, so you can do something like this:

  ```ts
  import { Schema } from "@effect/schema";

  const RefinedStruct = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
  }).pipe(
    Schema.filter((value) => {
      if (value.a !== value.b) {
        return "`a` must be equal to `b`";
      }
    }),
  );

  const AnotherStruct = Schema.Struct({
    c: Schema.String,
    d: Schema.String,
  });

  // in the previous version you would receive an error:
  // Extend: cannot extend `<refinement schema>` with `{ c: string; d: string }` (path [])
  const Extended = Schema.extend(RefinedStruct, AnotherStruct);

  console.log(String(Extended));

  console.log(
    Schema.decodeUnknownSync(Extended)({ a: 1, b: 1, c: "c", d: "d" }),
  );
  // => { a: 1, b: 1, c: 'c', d: 'd' }
  console.log(
    Schema.decodeUnknownSync(Extended)({ a: 1, b: 2, c: "c", d: "d" }),
  );
  /*
  throws
  Error: { { readonly a: number; readonly b: number; readonly c: string; readonly d: string } | filter }
  └─ Predicate refinement failure
     └─ `a` must be equal to `b`
  */
  ```

  We've also added support for `Schema.suspend`. Here's an example:

  ```ts
  import { Arbitrary, FastCheck, Schema } from "@effect/schema";

  // Define a recursive list type
  type List =
    | {
        readonly type: "nil";
      }
    | {
        readonly type: "cons";
        readonly tail: {
          readonly value: number;
        } & List; // extend
      };

  // Define a schema for the list type
  const List: Schema.Schema<List> = Schema.Union(
    Schema.Struct({ type: Schema.Literal("nil") }),
    Schema.Struct({
      type: Schema.Literal("cons"),
      tail: Schema.extend(
        Schema.Struct({ value: Schema.Number }),
        Schema.suspend(() => List), // extend
      ),
    }),
  );

  console.log(
    JSON.stringify(FastCheck.sample(Arbitrary.make(List), 5), null, 2),
  );
  /*
  [
    {
      "type": "cons",
      "tail": {
        "type": "cons",
        "value": 4.8301839079380824e+36,
        "tail": {
          "type": "cons",
          "value": 1.5771055128598197e-29,
          "tail": {
            "type": "nil",
            "value": -15237.7763671875
          }
        }
      }
    },
    {
      "type": "cons",
      "tail": {
        "type": "nil",
        "value": 5.808463088527973e-18
      }
    },
    {
      "type": "nil"
    },
    {
      "type": "nil"
    },
    {
      "type": "cons",
      "tail": {
        "type": "cons",
        "value": -0.7920627593994141,
        "tail": {
          "type": "nil",
          "value": 63.837738037109375
        }
      }
    }
  ]
  */
  ```

  ## Patches

  AST

  - fix `AST.toString` to honor `readonly` modifiers
  - improve `AST.toString` for refinements

  Schema

  - return `BrandSchema` from `fromBrand`
  - add `SchemaClass` interface
  - add `AnnotableClass` interface
  - `extend`: add support for refinements, closes #2642
  - add `pattern` json schema annotation to `Trimmed`
  - add `parseNumber` number transformation
  - add `TaggedClass` api interface (exposing a `_tag` field)
  - add `TaggedErrorClass` api interface (exposing a `_tag` field)
  - add `TaggedRequestClass` api interface (exposing a `_tag` field)
  - add `DateFromNumber` schema
  - add `Schema.Schema.AsSchema` type-level helper to facilitate working with generic schemas.

  ## Other Breaking Changes

  - move `fast-check` from `peerDependencies` to `dependencies`

  AST

  - add `path` argument to `Compiler` API

    ```diff
    -export type Compiler<A> = (ast: AST) => A
    +export type Compiler<A> = (ast: AST, path: ReadonlyArray<PropertyKey>) => A
    ```

  - remove `hash` function, you can replace it with the following code:

    ```ts
    import { Hash } from "effect";
    import { AST } from "@effect/schema";

    export const hash = (ast: AST.AST): number =>
      Hash.string(JSON.stringify(ast, null, 2));
    ```

  JSONSchema

  - extend all interfaces with `JsonSchemaAnnotations`

    ```ts
    export interface JsonSchemaAnnotations {
      title?: string;
      description?: string;
      default?: unknown;
      examples?: Array<unknown>;
    }
    ```

  Schema

  - replace numerous API interfaces with class-based schema definitions
  - rename `$Array` API interface to `Array# @effect/schema
  - rename `$Record` API interface to `Record# @effect/schema
  - rename `$ReadonlyMap` API interface to `ReadonlyMap# @effect/schema
  - rename `$Map` API interface to `Map# @effect/schema
  - rename `$ReadonlySet` API interface to `ReadonlySet# @effect/schema
  - rename `$Set` API interface to `Set# @effect/schema
  - remove `asBrandSchema` utility
  - change `BrandSchema` interface
  - remove `hash` function

    from

    ```ts
    export interface BrandSchema<A extends brand_.Brand<any>, I>
      extends Annotable<BrandSchema<A, I>, A, I>,
        Brand.Constructor<A> {}
    ```

    to

    ```ts
    export interface BrandSchema<A extends Brand<any>, I, R>
      extends AnnotableClass<BrandSchema<A, I, R>, A, I, R> {
      make(a: Brand.Unbranded<A>): A;
    }
    ```

    Previously, you could directly use the `Brand.Constructor`, but now you need to use its `make` constructor:

    Before

    ```ts
    import { Schema } from "@effect/schema";

    const UserId = Schema.Number.pipe(Schema.brand("UserId"));

    console.log(UserId(1)); // 1
    ```

    Now

    ```ts
    import { Schema } from "@effect/schema";

    const UserId = Schema.Number.pipe(Schema.brand("UserId"));

    console.log(UserId.make(1)); // 1
    ```

## 0.66.16

### Patch Changes

- Updated dependencies [[`1f6dc96`](https://github.com/Effect-TS/effect/commit/1f6dc96f51c7bb9c8d11415358308604ba7c7c8e)]:
  - effect@3.1.3

## 0.66.15

### Patch Changes

- [#2710](https://github.com/Effect-TS/effect/pull/2710) [`121d6d9`](https://github.com/Effect-TS/effect/commit/121d6d93755138c7510ba3ab4f0019ec0cb91890) Thanks [@gcanti](https://github.com/gcanti)! - Class API: avoid access before initialization when creating a class with suspended props, closes #2709

## 0.66.14

### Patch Changes

- [#2679](https://github.com/Effect-TS/effect/pull/2679) [`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure all type ids are annotated with `unique symbol`

- Updated dependencies [[`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513)]:
  - effect@3.1.2

## 0.66.13

### Patch Changes

- Updated dependencies [[`e5e56d1`](https://github.com/Effect-TS/effect/commit/e5e56d138dbed3204636f605229c6685f89659fc)]:
  - effect@3.1.1

## 0.66.12

### Patch Changes

- Updated dependencies [[`c3c12c6`](https://github.com/Effect-TS/effect/commit/c3c12c6625633fe80e79f9db75a3b8cf8ca8b11d), [`ba64ea6`](https://github.com/Effect-TS/effect/commit/ba64ea6757810c5e74cad3863a7d19d4d38af66b), [`b5de2d2`](https://github.com/Effect-TS/effect/commit/b5de2d2ce5b1afe8be90827bf898a95cec40eb2b), [`a1c7ab8`](https://github.com/Effect-TS/effect/commit/a1c7ab8ffedacd18c1fc784f4ff5844f79498b83), [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85), [`1c9454d`](https://github.com/Effect-TS/effect/commit/1c9454d532eae79b9f759aea77f59332cc6d18ed), [`92d56db`](https://github.com/Effect-TS/effect/commit/92d56dbb3f33e36636c2a2f1030c56492e39cf4d)]:
  - effect@3.1.0

## 0.66.11

### Patch Changes

- [#2656](https://github.com/Effect-TS/effect/pull/2656) [`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- Updated dependencies [[`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c), [`f4ed306`](https://github.com/Effect-TS/effect/commit/f4ed3068a70b50302d078a30d18ca3cfd2bc679c), [`661004f`](https://github.com/Effect-TS/effect/commit/661004f4bf5f8b25f5a0678c21a3a822188ce461), [`e79cb83`](https://github.com/Effect-TS/effect/commit/e79cb83d3b19098bc40a3012e2a059b8426306c2)]:
  - effect@3.0.8

## 0.66.10

### Patch Changes

- Updated dependencies [[`18de56b`](https://github.com/Effect-TS/effect/commit/18de56b4a6b6d1f99230dfabf9147d59ea4dd759)]:
  - effect@3.0.7

## 0.66.9

### Patch Changes

- [#2626](https://github.com/Effect-TS/effect/pull/2626) [`027418e`](https://github.com/Effect-TS/effect/commit/027418edaa6aa6c0ae4861b95832827b45adace4) Thanks [@fubhy](https://github.com/fubhy)! - Reintroduce custom `NoInfer` type

- [#2631](https://github.com/Effect-TS/effect/pull/2631) [`8206529`](https://github.com/Effect-TS/effect/commit/8206529d6a7bbf3e3c6f670afb0381e83176736e) Thanks [@gcanti](https://github.com/gcanti)! - add support for data-last subtype overloads in `compose`

  Before

  ```ts
  import { Schema as S } from "@effect/schema";

  S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString)); // ts error
  S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number))); // ts error
  ```

  Now

  ```ts
  import { Schema as S } from "@effect/schema";

  // $ExpectType Schema<number, string | null, never>
  S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString)); // ok
  // $ExpectType Schema<number | null, string, never>
  S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number))); // ok
  ```

- Updated dependencies [[`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1), [`027418e`](https://github.com/Effect-TS/effect/commit/027418edaa6aa6c0ae4861b95832827b45adace4), [`ac1898e`](https://github.com/Effect-TS/effect/commit/ac1898eb7bc96880f911c276048e2ea3d6fe9c50), [`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1)]:
  - effect@3.0.6

## 0.66.8

### Patch Changes

- Updated dependencies [[`6222404`](https://github.com/Effect-TS/effect/commit/62224044678751829ed2f128e05133a91c6b0569), [`868ed2a`](https://github.com/Effect-TS/effect/commit/868ed2a8fe94ee7f4206a6070f29dcf2a5ba1dc3)]:
  - effect@3.0.5

## 0.66.7

### Patch Changes

- [#2595](https://github.com/Effect-TS/effect/pull/2595) [`dd41c6c`](https://github.com/Effect-TS/effect/commit/dd41c6c725b1c1c980683275d8fa69779902187e) Thanks [@gcanti](https://github.com/gcanti)! - Remove excessive constraint from the pipeable overload of `attachPropertySignature`, closes #2593

- Updated dependencies [[`9a24667`](https://github.com/Effect-TS/effect/commit/9a246672008a2b668d43fbfd2fe5508c54b2b920)]:
  - effect@3.0.4

## 0.66.6

### Patch Changes

- [#2586](https://github.com/Effect-TS/effect/pull/2586) [`9dfc156`](https://github.com/Effect-TS/effect/commit/9dfc156dc13fb4da9c777aae3acece4b5ecf0064) Thanks [@gcanti](https://github.com/gcanti)! - remove non-tree-shakable compiler dependencies from the Schema module:

  - remove dependency from `Arbitrary` compiler
  - remove dependency from `Equivalence` compiler
  - remove dependency from `Pretty` compiler

- [#2583](https://github.com/Effect-TS/effect/pull/2583) [`80271bd`](https://github.com/Effect-TS/effect/commit/80271bdc648e9efa659ce66b2c255754a6a1a8b0) Thanks [@suddenlyGiovanni](https://github.com/suddenlyGiovanni)! - - Fixed a typo in the JSDoc comment of the `BooleanFromUnknown` boolean constructors in `Schema.ts`

  - Fixed a typo in the JSDoc comment of the `split` string transformations combinator in `Schema.ts`

- [#2585](https://github.com/Effect-TS/effect/pull/2585) [`e4ba97d`](https://github.com/Effect-TS/effect/commit/e4ba97d060c16bdf4e3b5bd5db6777f121a6768c) Thanks [@gcanti](https://github.com/gcanti)! - JSONSchema: rearrange handling of surrogate annotations to occur after JSON schema annotations

## 0.66.5

### Patch Changes

- [#2582](https://github.com/Effect-TS/effect/pull/2582) [`b3fe829`](https://github.com/Effect-TS/effect/commit/b3fe829e8b12726afe94086b5375968f41a26411) Thanks [@gcanti](https://github.com/gcanti)! - Add default title annotations to both sides of Struct transformations.

  This simple addition helps make error messages shorter and more understandable.

  Before

  ```ts
  import { Schema } from "@effect/schema";

  const schema = Schema.Struct({
    a: Schema.optional(Schema.String, { exact: true, default: () => "" }),
    b: Schema.String,
    c: Schema.String,
    d: Schema.String,
    e: Schema.String,
    f: Schema.String,
  });

  Schema.decodeUnknownSync(schema)({ a: 1 });
  /*
  throws
  Error: ({ a?: string; b: string; c: string; d: string; e: string; f: string } <-> { a: string; b: string; c: string; d: string; e: string; f: string })
  └─ Encoded side transformation failure
     └─ { a?: string; b: string; c: string; d: string; e: string; f: string }
        └─ ["a"]
           └─ Expected a string, actual 1
  */
  ```

  Now

  ```ts
  import { Schema } from "@effect/schema";

  const schema = Schema.Struct({
    a: Schema.optional(Schema.String, { exact: true, default: () => "" }),
    b: Schema.String,
    c: Schema.String,
    d: Schema.String,
    e: Schema.String,
    f: Schema.String,
  });

  Schema.decodeUnknownSync(schema)({ a: 1 });
  /*
  throws
  Error: (Struct (Encoded side) <-> Struct (Type side))
  └─ Encoded side transformation failure
     └─ Struct (Encoded side)
        └─ ["a"]
           └─ Expected a string, actual 1
  */
  ```

- [#2581](https://github.com/Effect-TS/effect/pull/2581) [`a58b7de`](https://github.com/Effect-TS/effect/commit/a58b7deb8bb1d3b0dd636decf5d16f115f37eb72) Thanks [@gcanti](https://github.com/gcanti)! - Fix formatting for Class and brands AST.

- [#2579](https://github.com/Effect-TS/effect/pull/2579) [`d90e8c3`](https://github.com/Effect-TS/effect/commit/d90e8c3090cbc78e2bc7b51c974df66ffefacdfa) Thanks [@gcanti](https://github.com/gcanti)! - Schema: JSONSchema should support make(Class)

  Before

  ```ts
  import { JSONSchema, Schema } from "@effect/schema";

  class A extends Schema.Class<A>("A")({
    a: Schema.String,
  }) {}

  console.log(JSONSchema.make(A)); // throws MissingAnnotation: cannot build a JSON Schema for a declaration without a JSON Schema annotation
  ```

  Now

  ```ts
  console.log(JSONSchema.make(A));
  /*
  Output:
  {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: [ 'a' ],
    properties: { a: { type: 'string', description: 'a string', title: 'string' } },
    additionalProperties: false
  }
  */
  ```

## 0.66.4

### Patch Changes

- [#2577](https://github.com/Effect-TS/effect/pull/2577) [`773b8e0`](https://github.com/Effect-TS/effect/commit/773b8e01521e8fa7c38ff15d92d21d6fd6dad56f) Thanks [@gcanti](https://github.com/gcanti)! - partial / required: add support for renaming property keys in property signature transformations

  Before

  ```ts
  import { Schema } from "@effect/schema";

  const TestType = Schema.Struct({
    a: Schema.String,
    b: Schema.propertySignature(Schema.String).pipe(Schema.fromKey("c")),
  });

  const PartialTestType = Schema.partial(TestType);
  // throws Error: Partial: cannot handle transformations
  ```

  Now

  ```ts
  import { Schema } from "@effect/schema";

  const TestType = Schema.Struct({
    a: Schema.String,
    b: Schema.propertySignature(Schema.String).pipe(Schema.fromKey("c")),
  });

  const PartialTestType = Schema.partial(TestType);

  console.log(Schema.decodeUnknownSync(PartialTestType)({ a: "a", c: "c" })); // { a: 'a', b: 'c' }
  console.log(Schema.decodeUnknownSync(PartialTestType)({ a: "a" })); // { a: 'a' }

  const RequiredTestType = Schema.required(PartialTestType);

  console.log(Schema.decodeUnknownSync(RequiredTestType)({ a: "a", c: "c" })); // { a: 'a', b: 'c' }
  console.log(Schema.decodeUnknownSync(RequiredTestType)({ a: "a" })); // { a: 'a', b: undefined }
  ```

## 0.66.3

### Patch Changes

- Updated dependencies [[`a7b4b84`](https://github.com/Effect-TS/effect/commit/a7b4b84bd5a25f51aba922f9259c3a58c98c6a4e)]:
  - effect@3.0.3

## 0.66.2

### Patch Changes

- [#2562](https://github.com/Effect-TS/effect/pull/2562) [`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86) Thanks [@fubhy](https://github.com/fubhy)! - Added provenance publishing

- Updated dependencies [[`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86)]:
  - effect@3.0.2

## 0.66.1

### Patch Changes

- [#2550](https://github.com/Effect-TS/effect/pull/2550) [`b2b5d66`](https://github.com/Effect-TS/effect/commit/b2b5d6626b18eb5289f364ffab5240e84b04d085) Thanks [@gcanti](https://github.com/gcanti)! - Fix `transformOrFail` and `transformOrFailFrom` signatures in the exported `Class` interface by adding the missing `annotations` optional argument

- [#2555](https://github.com/Effect-TS/effect/pull/2555) [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b) Thanks [@tim-smart](https://github.com/tim-smart)! - prevent use of `Array` as import name to solve bundler issues

- Updated dependencies [[`3da0cfa`](https://github.com/Effect-TS/effect/commit/3da0cfa12c407fd930dc480be1ecc9217a8058f8), [`570e8d8`](https://github.com/Effect-TS/effect/commit/570e8d87e7c0e9ad4cd2686462fdb9b4812f7716), [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b)]:
  - effect@3.0.1

## 0.66.0

### Minor Changes

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1) Thanks [@github-actions](https://github.com/apps/github-actions)! - replace use of `unit` terminology with `void`

  For all the data types.

  ```ts
  Effect.unit; // => Effect.void
  Stream.unit; // => Stream.void

  // etc
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d) Thanks [@github-actions](https://github.com/apps/github-actions)! - Release Effect 3.0 🎉

### Patch Changes

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`9aeae46`](https://github.com/Effect-TS/effect/commit/9aeae461fdf9265389cf3dfe4e428b037215ba5f) Thanks [@github-actions](https://github.com/apps/github-actions)! - Removed the custom `Simplify` type that was previously introduced to address a bug in TypeScript 5.0

- [#2531](https://github.com/Effect-TS/effect/pull/2531) [`e542371`](https://github.com/Effect-TS/effect/commit/e542371981f8b4b484979feaad8a25b1f45e2df0) Thanks [@gcanti](https://github.com/gcanti)! - add `compose` overloads to enable a subtyping relationship in both directions between `C` and `B`.

- [#2529](https://github.com/Effect-TS/effect/pull/2529) [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `ReadonlyArray` and `ReadonlyRecord` modules for better discoverability.

- Updated dependencies [[`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`d50a652`](https://github.com/Effect-TS/effect/commit/d50a652479f4d1d64f48da05c79fa847e6e51548), [`9a3bd47`](https://github.com/Effect-TS/effect/commit/9a3bd47ebd0750c7e498162734f6d21895de0cb2), [`be9d025`](https://github.com/Effect-TS/effect/commit/be9d025e42355260ace02dd135851a8935a4deba), [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`5c2b561`](https://github.com/Effect-TS/effect/commit/5c2b5614f583b88784ed68126ae939832fb3c092), [`a18f594`](https://github.com/Effect-TS/effect/commit/a18f5948f1439a147232448b2c443472fda0eceb), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`2f96d93`](https://github.com/Effect-TS/effect/commit/2f96d938b90f8c19377583279e3c7afd9b509c50), [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1), [`271b79f`](https://github.com/Effect-TS/effect/commit/271b79fc0b66a6c11e07a8779ff8800493a7eac2), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d), [`53d1c2a`](https://github.com/Effect-TS/effect/commit/53d1c2a77559081fbb89667e343346375c6d6650), [`e7e1bbe`](https://github.com/Effect-TS/effect/commit/e7e1bbe68486fdf31c8f84b0880522d39adcaad3), [`10c169e`](https://github.com/Effect-TS/effect/commit/10c169eadc874e91b4defca3f467b4e6a50fd8f3), [`6424181`](https://github.com/Effect-TS/effect/commit/64241815fe6a939e91e6947253e7dceea1306aa8)]:
  - effect@3.0.0

## 0.65.0

### Minor Changes

For the updates mentioned below, we've released a codemod to simplify the migration process.

To run it, use the following command:

```sh
npx @effect/codemod schema-0.65 src/**/*
```

The codemod is designed to automate many of the changes needed. However, it might not catch everything, so please let us know if you run into any issues (https://github.com/Effect-TS/codemod/issues). **Remember to commit your code changes before running the codemod**, just in case you need to undo anything.

- [#2505](https://github.com/Effect-TS/effect/pull/2505) [`0aee906`](https://github.com/Effect-TS/effect/commit/0aee906f034539344db6fbac08919de3e28eccde) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Re-export FastCheck to simplify usage and to resolve long term issues with ESM/CJS

- [#2440](https://github.com/Effect-TS/effect/pull/2440) [`b3acf47`](https://github.com/Effect-TS/effect/commit/b3acf47f9c9dfae1c99377aa906097aaa2d47d44) Thanks [@gcanti](https://github.com/gcanti)! - ## `AST` module

  - rename `isTransform` to `isTransformation`

  ## `ParseResult` module

  - rename `Tuple` to `TupleType`

  ## `TreeFormatter` module

  - rename `formatIssue` to `formatIssueSync` (This change was made to maintain consistency in API naming across all decoding and encoding APIs.)
  - rename `formatIssueEffect` to `formatIssue`
  - rename `formatError` to `formatErrorSync`
  - rename `formatErrorEffect` to `formatError`

  ## `ArrayFormatter` module

  - rename `formatIssue` to `formatIssueSync`
  - rename `formatIssueEffect` to `formatIssue`
  - rename `formatError` to `formatErrorSync`
  - rename `formatErrorEffect` to `formatError`

  ## `Schema` module

  - consolidate `transform` and `transformOrFail` parameters into an `options` object, #2434
  - consolidate `Class.transformOrFail` and `Class.transformOrFailFrom` parameters into an `options` object
  - consolidate `declare` parameters into an `options` object
  - consolidate `optionalToRequired` parameters into an `options` object
  - consolidate `optionalToOptional` parameters into an `options` object
  - Removed `negateBigDecimal` function (This cleanup was prompted by the realization that numerous functions can be derived from transformations such as negation, Math.abs, increment, etc. However, including all of them in the library is not feasible. Therefore, `negateBigDecimal` was removed)

  ### Renaming

  - rename `uniqueSymbolFromSelf` to `UniqueSymbolFromSelf`
  - rename `undefined` to `Undefined`
  - rename `void` to `Void`
  - rename `null` to `Null`
  - rename `never` to `Never`
  - rename `unknown` to `Unknown`
  - rename `any` to `Any`
  - rename `string` to `String`
  - rename `number` to `Number`
  - rename `boolean` to `Boolean`
  - rename `/bigint/ig` to `BigInt`
  - rename `symbolFromSelf` to `SymbolFromSelf`
  - rename `object` to `Object`
  - rename `union` to `Union`
  - rename `nullable` to `NullOr`
  - rename `orUndefined` to `UndefinedOr`
  - rename `nullish` to `NullishOr`
  - rename `tuple` to `Tuple`
  - rename `array` to `Array`
  - rename `nonEmptyArray` to `NonEmptyArray`
  - rename `struct` to `Struct`
  - rename `record` to `Record`
  - rename `symbol` to `Symbol`
  - rename `optionFromSelf` to `OptionFromSelf`
  - rename `option` to `Option`
  - rename `optionFromNullable` to `OptionFromNullOr`
  - rename `optionFromNullish` to `OptionFromNullishOr`
  - rename `optionFromOrUndefined` to `OptionFromUndefinedOr`
  - rename `eitherFromSelf` to `EitherFromSelf`
  - rename `either` to `Either`
  - rename `eitherFromUnion` to `EitherFromUnion`
  - rename `readonlyMapFromSelf` to `ReadonlyMapFromSelf`
  - rename `mapFromSelf` to `MapFromSelf`
  - rename `readonlyMap` to `ReadonlyMap`
  - rename `map` to `Map`
  - rename `readonlySetFromSelf` to `ReadonlySetFromSelf`
  - rename `setFromSelf` to `SetFromSelf`
  - rename `readonlySet` to `ReadonlySet`
  - rename `set` to `Set`
  - rename `chunkFromSelf` to `ChunkFromSelf`
  - rename `chunk` to `Chunk`
  - rename `dataFromSelf` to `DataFromSelf`
  - rename `data` to `Data`
  - rename `causeFromSelf` to `CauseFromSelf`
  - rename `causeDefectUnknown` to `CauseDefectUnknown`
  - rename `cause` to `Cause`
  - rename `exitFromSelf` to `ExitFromSelf`
  - rename `exit` to `Exit`
  - rename `hashSetFromSelf` to `HashSetFromSelf`
  - rename `hashSet` to `HashSet`
  - rename `hashMapFromSelf` to `HashMapFromSelf`
  - rename `hashMap` to `HashMap`
  - rename `listFromSelf` to `ListFromSelf`
  - rename `list` to `List`
  - rename `sortedSetFromSelf` to `SortedSetFromSelf`
  - rename `sortedSet` to `SortedSet`
  - rename `literal` to `Literal`
  - rename `enums` to `Enums`
  - rename `templateLiteral` to `TemplateLiteral`

- [#2511](https://github.com/Effect-TS/effect/pull/2511) [`0d3231a`](https://github.com/Effect-TS/effect/commit/0d3231a195202635ecc0bf6bbf6a08fc017d0d69) Thanks [@gcanti](https://github.com/gcanti)! - make `AST.pick` correctly handle key renames

- [#2508](https://github.com/Effect-TS/effect/pull/2508) [`c22b019`](https://github.com/Effect-TS/effect/commit/c22b019e5eaf9d3a937a3d99cadbb8f8e9116a70) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Rename Arbitrary.Arbitrary to Arbitrary.LazyArbitrary, rename Arbitrary.make to Arbitrary.makeLazy and introduce Arbitrary.make

  Before

  ```ts
  import { Arbitrary, Schema } from "@effect/schema";
  import * as fc from "fast-check";

  const Person = Schema.struct({
    name: Schema.string,
    age: Schema.string.pipe(
      Schema.compose(Schema.NumberFromString),
      Schema.int(),
    ),
  });

  const arb = Arbitrary.make(Person)(fc);

  console.log(fc.sample(arb, 2));
  ```

  Now

  ```ts
  import { Arbitrary, FastCheck, Schema } from "@effect/schema";

  const Person = Schema.Struct({
    name: Schema.String,
    age: Schema.String.pipe(
      Schema.compose(Schema.NumberFromString),
      Schema.int(),
    ),
  });

  const arb = Arbitrary.make(Person);

  console.log(FastCheck.sample(arb, 2));
  ```

### Patch Changes

- [#2496](https://github.com/Effect-TS/effect/pull/2496) [`4c37001`](https://github.com/Effect-TS/effect/commit/4c370013417e18c4f564818de1341a8fccb43b4c) Thanks [@gcanti](https://github.com/gcanti)! - fix `exitFromSelf` description

- [#2495](https://github.com/Effect-TS/effect/pull/2495) [`8a69b4e`](https://github.com/Effect-TS/effect/commit/8a69b4ef6a3a06d2e21fe2e11a626038beefb4e1) Thanks [@gcanti](https://github.com/gcanti)! - fix `eitherFromSelf` description annotation

- Updated dependencies [[`41c8102`](https://github.com/Effect-TS/effect/commit/41c810228b1a50e4b41f19e735d7c62fe8d36871), [`776ef2b`](https://github.com/Effect-TS/effect/commit/776ef2bb66db9aa9f68b7beab14f6986f9c1288b), [`217147e`](https://github.com/Effect-TS/effect/commit/217147ea67c5c42c96f024775c41e5b070f81e4c), [`90776ec`](https://github.com/Effect-TS/effect/commit/90776ec8e8671d835b65fc33ead1de6c864b81b9), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`232c353`](https://github.com/Effect-TS/effect/commit/232c353c2e6f743f38e57639ee30e324ffa9c2a9), [`0ca835c`](https://github.com/Effect-TS/effect/commit/0ca835cbac8e69072a93ace83b534219faba24e8), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`e983740`](https://github.com/Effect-TS/effect/commit/e9837401145605aff5bc2ec7e73004f397c5d2d1), [`e3e0924`](https://github.com/Effect-TS/effect/commit/e3e09247d46a35430fc60e4aa4032cc50814f212)]:
  - effect@2.4.19

## 0.64.20

### Patch Changes

- [#2483](https://github.com/Effect-TS/effect/pull/2483) [`42b3651`](https://github.com/Effect-TS/effect/commit/42b36519f356bae9258a1ea1d416e2902b973e85) Thanks [@gcanti](https://github.com/gcanti)! - Add `ParseIssueTitle` annotation, closes #2482

  When a decoding or encoding operation fails, it's useful to have additional details in the default error message returned by `TreeFormatter` to understand exactly which value caused the operation to fail. To achieve this, you can set an annotation that depends on the value undergoing the operation and can return an excerpt of it, making it easier to identify the problematic value. A common scenario is when the entity being validated has an `id` field. The `ParseIssueTitle` annotation facilitates this kind of analysis during error handling.

  The type of the annotation is:

  ```ts
  export type ParseIssueTitleAnnotation = (
    issue: ParseIssue,
  ) => string | undefined;
  ```

  If you set this annotation on a schema and the provided function returns a `string`, then that string is used as the title by `TreeFormatter`, unless a `message` annotation (which has the highest priority) has also been set. If the function returns `undefined`, then the default title used by `TreeFormatter` is determined with the following priorities:

  - `identifier`
  - `title`
  - `description`
  - `ast.toString()`

  **Example**

  ```ts
  import type { ParseIssue } from "@effect/schema/ParseResult";
  import * as S from "@effect/schema/Schema";

  const getOrderItemId = ({ actual }: ParseIssue) => {
    if (S.is(S.struct({ id: S.string }))(actual)) {
      return `OrderItem with id: ${actual.id}`;
    }
  };

  const OrderItem = S.struct({
    id: S.string,
    name: S.string,
    price: S.number,
  }).annotations({
    identifier: "OrderItem",
    parseIssueTitle: getOrderItemId,
  });

  const getOrderId = ({ actual }: ParseIssue) => {
    if (S.is(S.struct({ id: S.number }))(actual)) {
      return `Order with id: ${actual.id}`;
    }
  };

  const Order = S.struct({
    id: S.number,
    name: S.string,
    items: S.array(OrderItem),
  }).annotations({
    identifier: "Order",
    parseIssueTitle: getOrderId,
  });

  const decode = S.decodeUnknownSync(Order, { errors: "all" });

  // No id available, so the `identifier` annotation is used as the title
  decode({});
  /*
  throws
  Error: Order
  ├─ ["id"]
  │  └─ is missing
  ├─ ["name"]
  │  └─ is missing
  └─ ["items"]
     └─ is missing
  */

  // An id is available, so the `parseIssueTitle` annotation is used as the title
  decode({ id: 1 });
  /*
  throws
  Error: Order with id: 1
  ├─ ["name"]
  │  └─ is missing
  └─ ["items"]
     └─ is missing
  */

  decode({ id: 1, items: [{ id: "22b", price: "100" }] });
  /*
  throws
  Error: Order with id: 1
  ├─ ["name"]
  │  └─ is missing
  └─ ["items"]
     └─ ReadonlyArray<OrderItem>
        └─ [0]
           └─ OrderItem with id: 22b
              ├─ ["name"]
              │  └─ is missing
              └─ ["price"]
                 └─ Expected a number, actual "100"
  */
  ```

  In the examples above, we can see how the `parseIssueTitle` annotation helps provide meaningful error messages when decoding fails.

## 0.64.19

### Patch Changes

- [#2471](https://github.com/Effect-TS/effect/pull/2471) [`58f66fe`](https://github.com/Effect-TS/effect/commit/58f66fecd4e646c6c8f10995df9faab17022eb8f) Thanks [@gcanti](https://github.com/gcanti)! - Class API: Added default `title` annotation to the encoded side.

  Before:

  ```ts
  import * as S from "@effect/schema/Schema";

  class MySchema extends S.Class<MySchema>("MySchema")({
    a: S.string,
    b: S.number,
  }) {}

  S.decodeUnknownSync(MySchema)({}, { errors: "all" });
  /*
  Error: ({ a: string; b: number } <-> MySchema)
  └─ Encoded side transformation failure
     └─ { a: string; b: number }
        ├─ ["a"]
        │  └─ is missing
        └─ ["b"]
           └─ is missing
  */
  ```

  After:

  ```ts
  import * as S from "@effect/schema/Schema";

  class MySchema extends S.Class<MySchema>("MySchema")({
    a: S.string,
    b: S.number,
  }) {}

  S.decodeUnknownSync(MySchema)({}, { errors: "all" });
  /*
  Error: (MySchema (Encoded side) <-> MySchema)
  └─ Encoded side transformation failure
     └─ MySchema (Encoded side)
        ├─ ["a"]
        │  └─ is missing
        └─ ["b"]
           └─ is missing
  */
  ```

- [#2465](https://github.com/Effect-TS/effect/pull/2465) [`3cad21d`](https://github.com/Effect-TS/effect/commit/3cad21daa5d2332d33692498c87b7ffff979e304) Thanks [@gcanti](https://github.com/gcanti)! - `length` now allows expressing a range

  Example

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema = S.string.pipe(
    S.length({ min: 2, max: 4 }, { identifier: "MyRange" }),
  );

  S.decodeUnknownSync(schema)("");
  /*
  throws:
  Error: MyRange
  └─ Predicate refinement failure
     └─ Expected MyRange (a string at least 2 character(s) and at most 4 character(s) long), actual ""
  */
  ```

- Updated dependencies [[`dadc690`](https://github.com/Effect-TS/effect/commit/dadc6906121c512bc32be22b52adbd1ada834594)]:
  - effect@2.4.18

## 0.64.18

### Patch Changes

- Updated dependencies [[`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`607b2e7`](https://github.com/Effect-TS/effect/commit/607b2e7a7fd9318c57acf4e50ec61747eea74ad7), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`8206caf`](https://github.com/Effect-TS/effect/commit/8206caf7c2d22c68be4313318b61cfdacf6222b6), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`f456ba2`](https://github.com/Effect-TS/effect/commit/f456ba273bae21a6dcf8c966c50c97b5f0897d9f)]:
  - effect@2.4.17

## 0.64.17

### Patch Changes

- [#2446](https://github.com/Effect-TS/effect/pull/2446) [`62a7f23`](https://github.com/Effect-TS/effect/commit/62a7f23937c0dfaca67a7b2f055b85cfde25ed11) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: Add `output` field to `TupleType` and `TypeLiteral`. While the operation may not be entirely successful, it still provides some useful output or information.

  Examples (Tuple)

  ```ts
  import * as S from "@effect/schema/Schema";
  import * as Either from "effect/Either";

  const schema = S.array(S.number);
  const result = S.decodeUnknownEither(schema)([1, "a", 2, "b"], {
    errors: "all",
  });
  if (Either.isLeft(result)) {
    const issue = result.left.error;
    if (issue._tag === "TupleType") {
      console.log(issue.output); // [1, 2]
    }
  }
  ```

  Examples (TypeLiteral)

  ```ts
  import * as S from "@effect/schema/Schema";
  import * as Either from "effect/Either";

  const schema = S.record(S.string, S.number);
  const result = S.decodeUnknownEither(schema)(
    { a: 1, b: "b", c: 2, d: "d" },
    { errors: "all" },
  );
  if (Either.isLeft(result)) {
    const issue = result.left.error;
    if (issue._tag === "TypeLiteral") {
      console.log(issue.output); // { a: 1, c: 2 }
    }
  }
  ```

- [#2453](https://github.com/Effect-TS/effect/pull/2453) [`7cc2b41`](https://github.com/Effect-TS/effect/commit/7cc2b41d6c551fdca2590b06681c5ad9832aba46) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added Schema.BooleanFromUnknown

- [#2456](https://github.com/Effect-TS/effect/pull/2456) [`8b46fde`](https://github.com/Effect-TS/effect/commit/8b46fdebf2c075a74cd2cd29dfb69531d20fc154) Thanks [@gcanti](https://github.com/gcanti)! - add `set`, `setFromSelf`, `map`, `mapFromSelf`

- Updated dependencies [[`5170ce7`](https://github.com/Effect-TS/effect/commit/5170ce708c606283e8a30d273950f1a21c7eddc2)]:
  - effect@2.4.16

## 0.64.16

### Patch Changes

- [#2428](https://github.com/Effect-TS/effect/pull/2428) [`a31917a`](https://github.com/Effect-TS/effect/commit/a31917aa4b05b1189b7a8e0bedb60bb3d49262ad) Thanks [@gcanti](https://github.com/gcanti)! - export `null` from the AST module

- [#2436](https://github.com/Effect-TS/effect/pull/2436) [`4cd2bed`](https://github.com/Effect-TS/effect/commit/4cd2bedf978f864bddd289d1c524c8e868bf587b) Thanks [@patroza](https://github.com/patroza)! - fix: Schema JSDOC and editor click-follow for fields on struct and class

- [#2442](https://github.com/Effect-TS/effect/pull/2442) [`6cc6267`](https://github.com/Effect-TS/effect/commit/6cc6267026d9bfb1a9882cddf534787327e86ec1) Thanks [@gcanti](https://github.com/gcanti)! - Enums are now exposed under an `enums` property of the schema, closes #2441:

  ```ts
  enum Fruits {
    Apple,
    Banana,
  }

  // $ExpectType enums<typeof Fruits>
  S.enums(Fruits);

  // $ExpectType typeof Fruits
  S.enums(Fruits).enums;

  // $ExpectType Fruits.Apple
  S.enums(Fruits).enums.Apple;

  // $ExpectType Fruits.Banana
  S.enums(Fruits).enums.Banana;
  ```

## 0.64.15

### Patch Changes

- [#2424](https://github.com/Effect-TS/effect/pull/2424) [`5ded019`](https://github.com/Effect-TS/effect/commit/5ded019970169e3c1f2a375d0876b95fb1ff67f5) Thanks [@gcanti](https://github.com/gcanti)! - corrected the `optional` signature to exclude invalid options

- Updated dependencies [[`d7688c0`](https://github.com/Effect-TS/effect/commit/d7688c0c72717fe7876c871567f6946dabfc0546), [`b3a4fac`](https://github.com/Effect-TS/effect/commit/b3a4face2acaca422f0b0530436e8f13129f3b3a)]:
  - effect@2.4.15

## 0.64.14

### Patch Changes

- [#2398](https://github.com/Effect-TS/effect/pull/2398) [`a76e5e1`](https://github.com/Effect-TS/effect/commit/a76e5e131a35c88a72771fb745df08f60fbc0e18) Thanks [@gcanti](https://github.com/gcanti)! - extend: un-nest sub-unions

- Updated dependencies [[`6180c0c`](https://github.com/Effect-TS/effect/commit/6180c0cc51dee785cfce72220a52c9fc3b9bf9aa)]:
  - effect@2.4.14

## 0.64.13

### Patch Changes

- Updated dependencies [[`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499), [`54b7c00`](https://github.com/Effect-TS/effect/commit/54b7c0077fa784ad2646b812d6a44641f672edcd), [`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499)]:
  - effect@2.4.13

## 0.64.12

### Patch Changes

- [#2359](https://github.com/Effect-TS/effect/pull/2359) [`9392de6`](https://github.com/Effect-TS/effect/commit/9392de6baa6861662abc2bd3171897145f5ea073) Thanks [@tim-smart](https://github.com/tim-smart)! - preserve defect information in Cause.Die

- [#2385](https://github.com/Effect-TS/effect/pull/2385) [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87) Thanks [@tim-smart](https://github.com/tim-smart)! - align runtime tuple behaviour to ts 5.4:

  from

  ```ts
  // ts 5.3
  type A = readonly [string, ...number[], boolean];
  type B = Required<A>; // readonly [string, ...(number | boolean)[], number | boolean]
  ```

  to

  ```ts
  // ts 5.4
  type A = readonly [string, ...number[], boolean];
  type B = Required<A>; // readonly [string, ...number[], boolean]
  ```

- [#2359](https://github.com/Effect-TS/effect/pull/2359) [`9392de6`](https://github.com/Effect-TS/effect/commit/9392de6baa6861662abc2bd3171897145f5ea073) Thanks [@tim-smart](https://github.com/tim-smart)! - use provided message in Schema.TaggedError .toString

- [#2385](https://github.com/Effect-TS/effect/pull/2385) [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87) Thanks [@tim-smart](https://github.com/tim-smart)! - update typescript to 5.4

- [#2396](https://github.com/Effect-TS/effect/pull/2396) [`d17a427`](https://github.com/Effect-TS/effect/commit/d17a427c4427972fb55c45a058780716dc408631) Thanks [@sukovanej](https://github.com/sukovanej)! - Fix extend with nested union.

- Updated dependencies [[`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87)]:
  - effect@2.4.12

## 0.64.11

### Patch Changes

- [#2384](https://github.com/Effect-TS/effect/pull/2384) [`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- Updated dependencies [[`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8), [`37ca592`](https://github.com/Effect-TS/effect/commit/37ca592a4101ad90adbf8c8b3f727faf3110cae5), [`317b5b8`](https://github.com/Effect-TS/effect/commit/317b5b8e8c8c2207469b3ebfcf72bf3a9f7cbc60)]:
  - effect@2.4.11

## 0.64.10

### Patch Changes

- Updated dependencies [[`9bab1f9`](https://github.com/Effect-TS/effect/commit/9bab1f9fa5b999740755e4e82485cb77c638643a), [`9bbde5b`](https://github.com/Effect-TS/effect/commit/9bbde5be9a0168d1c2a0308bfc27167ed62f3968)]:
  - effect@2.4.10

## 0.64.9

### Patch Changes

- [#2370](https://github.com/Effect-TS/effect/pull/2370) [`dc7e497`](https://github.com/Effect-TS/effect/commit/dc7e49720df416870a7483f48adc40aeb23fe32d) Thanks [@leonitousconforti](https://github.com/leonitousconforti)! - Template literal regex escape special characters

- [#2366](https://github.com/Effect-TS/effect/pull/2366) [`ffaf7c3`](https://github.com/Effect-TS/effect/commit/ffaf7c36514f88496cdd2fdfdf0bc7ba5a2e5cd4) Thanks [@gcanti](https://github.com/gcanti)! - Improve `All` types to encompass additional `any` / `never` combinations.

## 0.64.8

### Patch Changes

- [#2363](https://github.com/Effect-TS/effect/pull/2363) [`e0af20e`](https://github.com/Effect-TS/effect/commit/e0af20ec5f6d0b19d66c5ebf610969d55bfc6c22) Thanks [@gcanti](https://github.com/gcanti)! - make defensive copies of exports

## 0.64.7

### Patch Changes

- Updated dependencies [[`71fd528`](https://github.com/Effect-TS/effect/commit/71fd5287500f9ce155a7d9f0df6ee3e0ac3aeb99)]:
  - effect@2.4.9

## 0.64.6

### Patch Changes

- [#2347](https://github.com/Effect-TS/effect/pull/2347) [`595140a`](https://github.com/Effect-TS/effect/commit/595140a13bda09bf22c669196440868e8a274599) Thanks [@gcanti](https://github.com/gcanti)! - add back `BrandSchema` and introduce `asBrandSchema` utility

- [#2353](https://github.com/Effect-TS/effect/pull/2353) [`5f5fcd9`](https://github.com/Effect-TS/effect/commit/5f5fcd969ae30ed6fe61d566a571498d9e895e16) Thanks [@tim-smart](https://github.com/tim-smart)! - make `optional` dual:

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema = S.struct({
    a: S.string.pipe(S.optional()),
  });

  // same as:
  const schema2 = S.struct({
    a: S.optional(S.string),
  });
  ```

- [#2356](https://github.com/Effect-TS/effect/pull/2356) [`7a45ad0`](https://github.com/Effect-TS/effect/commit/7a45ad0a5f715d64a69b28a8ee3573e5f86909c3) Thanks [@gcanti](https://github.com/gcanti)! - make `partial` dual:

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema = S.struct({ a: S.string }).pipe(S.partial());

  // same as:
  const schema2 = S.partial(S.struct({ a: S.string }));
  ```

- [#2339](https://github.com/Effect-TS/effect/pull/2339) [`5c3b1cc`](https://github.com/Effect-TS/effect/commit/5c3b1ccba182d0f636a973729f9c6bfb12539dc8) Thanks [@gcanti](https://github.com/gcanti)! - use `Simplify` from `effect/Types` in `TaggedClass`, `TaggedError` and `TaggedRequest` to avoid errors in `Schema.d.ts`, closes #1841

- [#2343](https://github.com/Effect-TS/effect/pull/2343) [`6f7dfc9`](https://github.com/Effect-TS/effect/commit/6f7dfc9637bd641beb93b14e027dcfcb5d2c8feb) Thanks [@gcanti](https://github.com/gcanti)! - improve pick/omit and add support for Class

- [#2337](https://github.com/Effect-TS/effect/pull/2337) [`88b8583`](https://github.com/Effect-TS/effect/commit/88b85838e03d4f33036f9d16c9c00a487fa99bd8) Thanks [@gcanti](https://github.com/gcanti)! - JSONSchema: allow overrides through annotations, closes #1823

- [#2348](https://github.com/Effect-TS/effect/pull/2348) [`cb20824`](https://github.com/Effect-TS/effect/commit/cb20824416cbf251188395d0aad3622e3a5d7ff2) Thanks [@gcanti](https://github.com/gcanti)! - feedback: expose Class API `identifier`s

- [#2350](https://github.com/Effect-TS/effect/pull/2350) [`a45a525`](https://github.com/Effect-TS/effect/commit/a45a525e7ccf07704dff1666f1e390282b5bac91) Thanks [@gcanti](https://github.com/gcanti)! - refactor unions: remove sorting, flattening, and unification

- Updated dependencies [[`bb0b69e`](https://github.com/Effect-TS/effect/commit/bb0b69e519698c7c76aa68217de423c78ad16566), [`6b20bad`](https://github.com/Effect-TS/effect/commit/6b20badebb3a7ca4d38857753e8ecaa09d02ccfb), [`4e64e9b`](https://github.com/Effect-TS/effect/commit/4e64e9b9876de6bfcbabe39e18a91a08e5f3fbb0), [`3851a02`](https://github.com/Effect-TS/effect/commit/3851a022c481006aec1db36651e4b4fd727aa742), [`5f5fcd9`](https://github.com/Effect-TS/effect/commit/5f5fcd969ae30ed6fe61d566a571498d9e895e16), [`814e5b8`](https://github.com/Effect-TS/effect/commit/814e5b828f68210b9e8f336fd6ac688646835dd9)]:
  - effect@2.4.8

## 0.64.5

### Patch Changes

- [#2332](https://github.com/Effect-TS/effect/pull/2332) [`d0f56c6`](https://github.com/Effect-TS/effect/commit/d0f56c68e604b1cf8dd4e761a3f3cf3631b3cec1) Thanks [@gcanti](https://github.com/gcanti)! - add missing `Date` api interfaces:

  - `DateFromSelf`
  - `ValidDateFromSelf`
  - `DateFromString`
  - `$Date`

## 0.64.4

### Patch Changes

- Updated dependencies [[`eb93283`](https://github.com/Effect-TS/effect/commit/eb93283985913d7b04ca750e36ac8513e7b6cef6)]:
  - effect@2.4.7

## 0.64.3

### Patch Changes

- [#2320](https://github.com/Effect-TS/effect/pull/2320) [`cfef6ec`](https://github.com/Effect-TS/effect/commit/cfef6ecd1fe801cec1a3cbfb7f064fc394b0ad73) Thanks [@gcanti](https://github.com/gcanti)! - feedback: remove `array` overload to restore pipeability to the API

## 0.64.2

### Patch Changes

- [#2310](https://github.com/Effect-TS/effect/pull/2310) [`89748c9`](https://github.com/Effect-TS/effect/commit/89748c90b36cb5eb880a9ab9323b252338dee848) Thanks [@gcanti](https://github.com/gcanti)! - merge `Parser` module into `ParseResult`:

  - remove `Parser` module
  - remove `internal/parseResult` internal module

- Updated dependencies [[`4f35a7e`](https://github.com/Effect-TS/effect/commit/4f35a7e7c4eba598924aff24d1158b9056bb24be), [`9971186`](https://github.com/Effect-TS/effect/commit/99711862722188fbb5ed3ee75126ad5edf13f72f)]:
  - effect@2.4.6

## 0.64.1

### Patch Changes

- [#2305](https://github.com/Effect-TS/effect/pull/2305) [`d10f876`](https://github.com/Effect-TS/effect/commit/d10f876cd98da275bc5dc5750a91a7fc95e97541) Thanks [@gcanti](https://github.com/gcanti)! - chore: improves the display of `Struct.Type` and `Struct.Encoded` when the parameter is generic

- [#2304](https://github.com/Effect-TS/effect/pull/2304) [`743ae6d`](https://github.com/Effect-TS/effect/commit/743ae6d12b249f0b35b31b65b2f7ec91d83ee387) Thanks [@gcanti](https://github.com/gcanti)! - chore: remove static `struct` from `makeClass` internal constructor

- [#2308](https://github.com/Effect-TS/effect/pull/2308) [`a75bc48`](https://github.com/Effect-TS/effect/commit/a75bc48e0e3278d0f70665fedecc5ae7ec447e24) Thanks [@sukovanej](https://github.com/sukovanej)! - Expose missing types from the `ParseResult` module.

- Updated dependencies [[`bce21c5`](https://github.com/Effect-TS/effect/commit/bce21c5ded2177114666ba229bd5029fa000dee3), [`c7d3036`](https://github.com/Effect-TS/effect/commit/c7d303630b7f0825cb2e584557c5767a67214d9f)]:
  - effect@2.4.5

## 0.64.0

### Minor Changes

- [#2172](https://github.com/Effect-TS/effect/pull/2172) [`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949) Thanks [@gcanti](https://github.com/gcanti)! -

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
- `element` and `rest` have been removed in favor of `tuple`:

  Before

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema1 = S.tuple().pipe(S.rest(S.number), S.element(S.boolean));

  const schema2 = S.tuple(S.string).pipe(
    S.rest(S.number),
    S.element(S.boolean),
  );
  ```

  Now

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema1 = S.tuple([], S.number, S.boolean);

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
- Removed `propertySignatureAnnotations`, use `propertySignature(schema).annotations()`.
- Updated the function name `headOr` to `headOrElse` to align with the standard naming convention.

## `Serializable` module

- The type parameters of `SerializableWithResult` and `WithResult` have been swapped

### Patch Changes

- [#2172](https://github.com/Effect-TS/effect/pull/2172) [`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949) Thanks [@gcanti](https://github.com/gcanti)! - ## `AST` module

  - expose the `getTemplateLiteralRegExp` API

  ## `Schema` module

  - enhance the `struct` API to allow records:
    ```ts
    const schema1 = S.struct(
      { a: S.number },
      { key: S.string, value: S.number },
    );
    // or
    const schema2 = S.struct({ a: S.number }, S.record(S.string, S.number));
    ```
  - enhance the `extend` API to allow nested (non-overlapping) fields:
    ```ts
    const A = S.struct({ a: S.struct({ b: S.string }) });
    const B = S.struct({ a: S.struct({ c: S.number }) });
    const schema = S.extend(A, B);
    /*
    same as:
    const schema = S.struct({
      a: S.struct({
        b: S.string,
        c: S.number
      })
    })
    */
    ```
  - add `Annotable` interface
  - add `asSchema`
  - add add `Schema.Any`, `Schema.All`, `Schema.AnyNoContext` helpers
  - refactor `annotations` API to be a method within the `Schema` interface
  - add support for `AST.keyof`, `AST.getPropertySignatures`, `Parser.getSearchTree` to Classes
  - fix `BrandAnnotation` type and add `getBrandAnnotation`
  - add `annotations?` parameter to Class constructors:

    ```ts
    import * as AST from "@effect/schema/AST";
    import * as S from "@effect/schema/Schema";

    class A extends S.Class<A>("A")(
      {
        a: S.string,
      },
      { description: "some description..." }, // <= annotations
    ) {}
    ```

- Updated dependencies [[`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949), [`817a04c`](https://github.com/Effect-TS/effect/commit/817a04cb2df0f4140984dc97eb3e1bb14a6c4a38), [`d90a99d`](https://github.com/Effect-TS/effect/commit/d90a99d03d074adc7cd2533f15419138264da5a2), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`802674b`](https://github.com/Effect-TS/effect/commit/802674b379b7559ad3ff09b33388891445a9e48b)]:
  - effect@2.4.4

## 0.63.4

### Patch Changes

- Updated dependencies [[`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e), [`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e)]:
  - effect@2.4.3

## 0.63.3

### Patch Changes

- [#2234](https://github.com/Effect-TS/effect/pull/2234) [`465be79`](https://github.com/Effect-TS/effect/commit/465be7926afe98169837d8a4ed5ebc059a732d21) Thanks [@gcanti](https://github.com/gcanti)! - add `BatchingAnnotation`, default value: `false`

  Example:

  ```ts
  const schema = S.struct({
    a: S.string,
    b: S.number,
  }).pipe(S.batching(true /* boolean | "inherit" | undefined */));
  ```

- [#2241](https://github.com/Effect-TS/effect/pull/2241) [`d8e6940`](https://github.com/Effect-TS/effect/commit/d8e694040f67da6fefc0f5c98fc8e15c0b48822e) Thanks [@jessekelly881](https://github.com/jessekelly881)! - add `sortedSet` and `sortedSetFromSeld` combinators

- Updated dependencies [[`e03811e`](https://github.com/Effect-TS/effect/commit/e03811e80c93e986e6348b3b67ac2ed6d5fefff0), [`ac41d84`](https://github.com/Effect-TS/effect/commit/ac41d84776484cdce8165b7ca2c9c9b6377eee2d), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`1bf9f31`](https://github.com/Effect-TS/effect/commit/1bf9f31f07667de677673f7c29a4e7a26ebad3c8), [`e3ff789`](https://github.com/Effect-TS/effect/commit/e3ff789226f89e71eb28ca38ce79f90af6a03f1a), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`507ba40`](https://github.com/Effect-TS/effect/commit/507ba4060ff043c1a8d541dae723fa6940633b00), [`e466afe`](https://github.com/Effect-TS/effect/commit/e466afe32f2de598ceafd8982bd0cfbd388e5671), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`de74eb8`](https://github.com/Effect-TS/effect/commit/de74eb80a79eebde5ff645033765e7a617e92f27)]:
  - effect@2.4.2

## 0.63.2

### Patch Changes

- [#2222](https://github.com/Effect-TS/effect/pull/2222) [`39f583e`](https://github.com/Effect-TS/effect/commit/39f583eaeb29eecd6eaec3b113b24d9d413153df) Thanks [@gcanti](https://github.com/gcanti)! - TaggedClass: ensure constructor parameters don't overwrite the tag

- [#2227](https://github.com/Effect-TS/effect/pull/2227) [`f428198`](https://github.com/Effect-TS/effect/commit/f428198725d4b9e304ecd5ff8bad8f92d871dbe3) Thanks [@gcanti](https://github.com/gcanti)! - add `ConcurrencyAnnotation`, default value: `undefined` (sequential)

  Example:

  ```ts
  const schema = S.struct({
    a: S.string,
    b: S.number,
  }).pipe(S.concurrency(1 /* number | "unbounded" | "inherit" | undefined */));
  ```

- [#2221](https://github.com/Effect-TS/effect/pull/2221) [`c035972`](https://github.com/Effect-TS/effect/commit/c035972dfabdd3cb3372b5ab468aa2fd0d808f4d) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure Schema.Class is compatible without strictNullCheck

- Updated dependencies [[`a4a0006`](https://github.com/Effect-TS/effect/commit/a4a0006c7f19fc261df5cda16963d73457e4d6ac), [`0a37676`](https://github.com/Effect-TS/effect/commit/0a37676aa0eb2a21e17af2e6df9f81f52bbc8831), [`6f503b7`](https://github.com/Effect-TS/effect/commit/6f503b774d893bf2af34f66202e270d8c45d5f31)]:
  - effect@2.4.1

## 0.63.1

### Patch Changes

- [#2209](https://github.com/Effect-TS/effect/pull/2209) [`5d30853`](https://github.com/Effect-TS/effect/commit/5d308534cac6f187227185393c0bac9eb27f90ab) Thanks [@steffanek](https://github.com/steffanek)! - Add `pickLiteral` to Schema so that we can pick values from a Schema literal as follows:

  ```ts
  import * as S from "@effect/schema/Schema";

  const schema = S.literal("a", "b", "c").pipe(S.pickLiteral("a", "b")); // same as S.literal("a", "b")

  S.decodeUnknownSync(schema)("a"); // ok
  S.decodeUnknownSync(schema)("b"); // ok
  S.decodeUnknownSync(schema)("c");
  /*
  Error: "a" | "b"
  ├─ Union member
  │  └─ Expected "a", actual "c"
  └─ Union member
     └─ Expected "b", actual "c"
  */
  ```

- [#2217](https://github.com/Effect-TS/effect/pull/2217) [`6e350ed`](https://github.com/Effect-TS/effect/commit/6e350ed611feb0341e00aafd3c3905cd5ba53f07) Thanks [@gcanti](https://github.com/gcanti)! - JSONSchema: prune `UndefinedKeyword` if the property signature is marked as optional and contains a union that includes `UndefinedKeyword`, closes #2068

## 0.63.0

### Minor Changes

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`54ddbb7`](https://github.com/Effect-TS/effect/commit/54ddbb720aeeb657537b01ae221cdcd5e919c1a6) Thanks [@github-actions](https://github.com/apps/github-actions)! - Updated the `MessageAnnotation` type to accept a `ParseIssue`; it's now `(issue: ParseResult.ParseIssue) => string` to support custom error messages, which can be triggered under any circumstances.

  You can retrieve the actual value by accessing the `actual` property of the `issue` object:

  ```diff
  import * as S from "@effect/schema/Schema";

  const schema = S.string.pipe(
    S.filter((s): s is string => s.length === 1, {
  -    message: (actual) => `invalid value ${actual}`,
  +    message: (issue) => `invalid value ${issue.actual}`,
    })
  );
  ```

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`a025b12`](https://github.com/Effect-TS/effect/commit/a025b121235ba01cfce8d62a775491880c575561) Thanks [@github-actions](https://github.com/apps/github-actions)! - Swap type params of Either from `Either<E, A>` to `Either<R, L = never>`.

  Along the same line of the other changes this allows to shorten the most common types such as:

  ```ts
  import { Either } from "effect";

  const right: Either.Either<string> = Either.right("ok");
  ```

### Patch Changes

- [#2193](https://github.com/Effect-TS/effect/pull/2193) [`b9cb3a9`](https://github.com/Effect-TS/effect/commit/b9cb3a9c9bfdd75536bd70b4e8b557c12d4923ff) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added Number.parse, BigInt.toNumber, ParseResult.fromOption

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`136ef40`](https://github.com/Effect-TS/effect/commit/136ef40fe4a394abfa5c6a7ec103eea57251423e) Thanks [@github-actions](https://github.com/apps/github-actions)! - Equivalence: return `Equal.equals` instead of `Equivalence.strict()` as default

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`f24ac9f`](https://github.com/Effect-TS/effect/commit/f24ac9f0c2c520add58f09fbdcec5defda03bd52) Thanks [@github-actions](https://github.com/apps/github-actions)! - add support for `Equivalence` to class APIs

- Updated dependencies [[`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`489fcf3`](https://github.com/Effect-TS/effect/commit/489fcf363ff2b2a953166b740cb9a62d7fc2a101), [`7d9c3bf`](https://github.com/Effect-TS/effect/commit/7d9c3bff6c18d451e0e4781042945ec5c7be1b9f), [`d8d278b`](https://github.com/Effect-TS/effect/commit/d8d278b2efb2966947029885e01f7b68348a021f), [`14c5711`](https://github.com/Effect-TS/effect/commit/14c57110078f0862b8da5c7a2c5d980f54447484), [`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`b9cb3a9`](https://github.com/Effect-TS/effect/commit/b9cb3a9c9bfdd75536bd70b4e8b557c12d4923ff), [`585fcce`](https://github.com/Effect-TS/effect/commit/585fcce162d0f07a48d7cd984a9b722966fbebbe), [`93b412d`](https://github.com/Effect-TS/effect/commit/93b412d4a9ed762dc9fa5807e51fad0fc78a614a), [`55b26a6`](https://github.com/Effect-TS/effect/commit/55b26a6342b4826f1116e7a1eb660118c274458e), [`a025b12`](https://github.com/Effect-TS/effect/commit/a025b121235ba01cfce8d62a775491880c575561), [`2097739`](https://github.com/Effect-TS/effect/commit/20977393d2383bff709304e81ec7d51cafd57108)]:
  - effect@2.4.0

## 0.62.9

### Patch Changes

- [#2187](https://github.com/Effect-TS/effect/pull/2187) [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf) Thanks [@tim-smart](https://github.com/tim-smart)! - update development dependencies

- Updated dependencies [[`5ad2eec`](https://github.com/Effect-TS/effect/commit/5ad2eece0280b6db6a749d25cac1dcf6d33659a9), [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf)]:
  - effect@2.3.8

## 0.62.8

### Patch Changes

- Updated dependencies [[`bc8404d`](https://github.com/Effect-TS/effect/commit/bc8404d54fd42072d200c0399cb39672837afa9f), [`2c5cbcd`](https://github.com/Effect-TS/effect/commit/2c5cbcd1161b4f40dab184999291e817314107de), [`6565916`](https://github.com/Effect-TS/effect/commit/6565916ef254bf910e47d25fd0ef55e7cb420241)]:
  - effect@2.3.7

## 0.62.7

### Patch Changes

- [#2141](https://github.com/Effect-TS/effect/pull/2141) [`dbff62c`](https://github.com/Effect-TS/effect/commit/dbff62c3026054350a671f6210058ec5844c285e) Thanks [@gcanti](https://github.com/gcanti)! - add `{ exact: true }` optional argument to the `partial` API, mirroring the implementation in the `optional` API, closes #2140

  The `partial` operation allows you to make all properties within a schema optional.

  By default, the `partial` operation adds a union with `undefined` to the types. If you wish to avoid this, you can opt-out by passing a `{ exact: true }` argument to the `partial` operation.

  **Example**

  ```ts
  import * as S from "@effect/schema/Schema";

  /*
  const schema: S.Schema<{
      readonly a?: string | undefined;
  }, {
      readonly a?: string | undefined;
  }, never>
  */
  const schema = S.partial(S.struct({ a: S.string }));

  S.decodeUnknownSync(schema)({ a: "a" }); // ok
  S.decodeUnknownSync(schema)({ a: undefined }); // ok

  /*
  const exact: S.Schema<{
      readonly a?: string;
  }, {
      readonly a?: string;
  }, never>
  */
  const exactSchema = S.partial(S.struct({ a: S.string }), { exact: true });

  S.decodeUnknownSync(exactSchema)({ a: "a" }); // ok
  S.decodeUnknownSync(exactSchema)({ a: undefined });
  /*
  throws:
  Error: { a?: string }
  └─ ["a"]
     └─ Expected a string, actual undefined
  */
  ```

- [#2128](https://github.com/Effect-TS/effect/pull/2128) [`e572b07`](https://github.com/Effect-TS/effect/commit/e572b076e9b4369d9cc8e55414006eef376c93d9) Thanks [@tim-smart](https://github.com/tim-smart)! - allow passing structs when encoding schema classes

  The following will no longer throw an error:

  ```ts
  import * as S from "@effect/schema/Schema";

  class C extends S.Class<C>()({
    n: S.NumberFromString,
  }) {
    get b() {
      return 1;
    }
  }
  class D extends S.Class<D>()({
    n: S.NumberFromString,
    b: S.number,
  }) {}

  console.log(S.encodeSync(D)(new C({ n: 1 })));
  // Output: { b: 1, n: '1' }
  ```

- [#2123](https://github.com/Effect-TS/effect/pull/2123) [`e787a57`](https://github.com/Effect-TS/effect/commit/e787a5772e30d8b840cb98b49d36996e7d659a6c) Thanks [@gcanti](https://github.com/gcanti)! - Refactor the `declare` signature to ensure that the decoding and encoding functions do not utilize context.

  As a result, we can relax the signature of the following functions to accept `R !== never`:

  - `Parser.validateSync`
  - `Parser.validateOption`
  - `Parser.validateEither`
  - `Parser.is`
  - `Parser.asserts`
  - `Schema.validateSync`
  - `Schema.validateOption`
  - `Schema.validateEither`
  - `Schema.is`
  - `Schema.asserts`

  Additionally, the `Class` API no longer requires the optional argument `disableValidation` to be `true` when `R !== never`.

- Updated dependencies [[`b1163b2`](https://github.com/Effect-TS/effect/commit/b1163b2bd67b65bafbbb39fc4c67576e5cbaf444), [`b46b869`](https://github.com/Effect-TS/effect/commit/b46b869e59a6da5aa235a9fcc25e1e0d24e9e8f8), [`de1b226`](https://github.com/Effect-TS/effect/commit/de1b226282b5ab6c2809dd93f3bdb066f24a1333), [`a663390`](https://github.com/Effect-TS/effect/commit/a66339090ae7b960f8a8b90a0dcdc505de5aaf3e), [`ff88f80`](https://github.com/Effect-TS/effect/commit/ff88f808c4ed9947a148045849e7410b00acad0a), [`11be07b`](https://github.com/Effect-TS/effect/commit/11be07bf65d82cfdf994cdb9d8ca937f995cb4f0), [`c568645`](https://github.com/Effect-TS/effect/commit/c5686451c87d26382135a1c63b00ef171bb24f62), [`88835e5`](https://github.com/Effect-TS/effect/commit/88835e575a0bfbeff9a3696a332f32192c940e12), [`b415577`](https://github.com/Effect-TS/effect/commit/b415577f6c576073733929c858e5aac27b6d5880), [`ff8046f`](https://github.com/Effect-TS/effect/commit/ff8046f57dfd073eba60ce6d3144ab060fbf93ce)]:
  - effect@2.3.6

## 0.62.6

### Patch Changes

- [#2121](https://github.com/Effect-TS/effect/pull/2121) [`aef2b8b`](https://github.com/Effect-TS/effect/commit/aef2b8bb636ada07224dc9cf491bebe622c1aeda) Thanks [@gcanti](https://github.com/gcanti)! - Use the `identity` function in the transformation defining a schema class

- [#2124](https://github.com/Effect-TS/effect/pull/2124) [`7eecb1c`](https://github.com/Effect-TS/effect/commit/7eecb1c6cebe36550df3cca85a46867adbcaa2ca) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: add missing `decode` / `encode` exports

- Updated dependencies [[`b881365`](https://github.com/Effect-TS/effect/commit/b8813650355322ea2fc1fbaa4f846bd87a7a05f3)]:
  - effect@2.3.5

## 0.62.5

### Patch Changes

- Updated dependencies [[`17bda66`](https://github.com/Effect-TS/effect/commit/17bda66431c999a546920c10adb205e6c8bea7d1)]:
  - effect@2.3.4

## 0.62.4

### Patch Changes

- [#2108](https://github.com/Effect-TS/effect/pull/2108) [`1c6d18b`](https://github.com/Effect-TS/effect/commit/1c6d18b422b0bd800f2ed036dba9cb78db296c03) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add `transformation: false` option to `pluck`.

  Given a schema `Schema<A, I, R>` and a key `K`, this function extracts a specific field from the `A` type, producing a new schema that represents a transformation from the `I` type to `A[K]`.

  **If the option `{ transformation: false }` is provided**, the returned schema `Schema<A[K], I[K], R>` only represents the value of the field without any transformation.

  **Example**

  ```ts
  import * as S from "@effect/schema/Schema";

  // ---------------------------------------------
  // use case: pull out a single field from a
  // struct through a transformation
  // ---------------------------------------------

  const mytable = S.struct({
    column1: S.NumberFromString,
    column2: S.number,
  });

  // const pullOutColumn1: S.Schema<number, {
  //     readonly column1: string;
  //     readonly column2: number;
  // }, never>
  const pullOutColumn1 = mytable.pipe(S.pluck("column1"));

  console.log(
    S.decode(S.array(pullOutColumn1))([
      { column1: "1", column2: 100 },
      { column1: "2", column2: 300 },
    ]),
  );
  // Output: { _id: 'Either', _tag: 'Right', right: [ 1, 2 ] }

  // ---------------------------------------------
  // use case: pull out a single field from a
  // struct (no transformation)
  // ---------------------------------------------

  // const pullOutColumn1Value: S.Schema<number, string, never>
  const pullOutColumn1Value = mytable.pipe(
    S.pluck("column1", { transformation: false }),
  );

  console.log(S.decode(S.array(pullOutColumn1Value))(["1", "2"]));
  // Output: { _id: 'Either', _tag: 'Right', right: [ 1, 2 ] }
  ```

- [#2110](https://github.com/Effect-TS/effect/pull/2110) [`13d3266`](https://github.com/Effect-TS/effect/commit/13d3266f331f7aa49b55dd244d4e749a82255274) Thanks [@gcanti](https://github.com/gcanti)! - make `headOr` dual

- [#2111](https://github.com/Effect-TS/effect/pull/2111) [`a344b42`](https://github.com/Effect-TS/effect/commit/a344b420862f71532a28c72f00b7ba54776d744d) Thanks [@gcanti](https://github.com/gcanti)! - add support for unions to `keyof`

## 0.62.3

### Patch Changes

- Updated dependencies [[`efd41d8`](https://github.com/Effect-TS/effect/commit/efd41d8131c3d90867608969ef7c4eef490eb5e6), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f)]:
  - effect@2.3.3

## 0.62.2

### Patch Changes

- Updated dependencies [[`6654f5f`](https://github.com/Effect-TS/effect/commit/6654f5f0f6b9d97165ede5e04ca16776e2599328), [`2eb11b4`](https://github.com/Effect-TS/effect/commit/2eb11b47752cedf233ef4c4395d9c4efc9b9e180), [`56c09bd`](https://github.com/Effect-TS/effect/commit/56c09bd369279a6a7785209d172739935818cba6), [`71aa5b1`](https://github.com/Effect-TS/effect/commit/71aa5b1c180dcb8b53aefe232d12a97bd06b5447), [`1700af8`](https://github.com/Effect-TS/effect/commit/1700af8af1131602887da721914c8562b6342393)]:
  - effect@2.3.2

## 0.62.1

### Patch Changes

- Updated dependencies [[`b5a8215`](https://github.com/Effect-TS/effect/commit/b5a8215ee2a97a8865d69ee55ce1b9835948c922)]:
  - effect@2.3.1

## 0.62.0

### Minor Changes

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c) Thanks [@github-actions](https://github.com/apps/github-actions)! - With this change we now require a string key to be provided for all tags and renames the dear old `Tag` to `GenericTag`, so when previously you could do:

  ```ts
  import { Effect, Context } from "effect";
  interface Service {
    readonly _: unique symbol;
  }
  const Service = Context.Tag<
    Service,
    {
      number: Effect.Effect<never, never, number>;
    }
  >();
  ```

  you are now mandated to do:

  ```ts
  import { Effect, Context } from "effect";
  interface Service {
    readonly _: unique symbol;
  }
  const Service = Context.GenericTag<
    Service,
    {
      number: Effect.Effect<never, never, number>;
    }
  >("Service");
  ```

  This makes by default all tags globals and ensures better debuggaility when unexpected errors arise.

  Furthermore we introduce a new way of constructing tags that should be considered the new default:

  ```ts
  import { Effect, Context } from "effect";
  class Service extends Context.Tag("Service")<
    Service,
    {
      number: Effect.Effect<never, never, number>;
    }
  >() {}

  const program = Effect.flatMap(Service, ({ number }) => number).pipe(
    Effect.flatMap((_) => Effect.log(`number: ${_}`)),
  );
  ```

  this will use "Service" as the key and will create automatically an opaque identifier (the class) to be used at the type level, it does something similar to the above in a single shot.

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Effect` type parameters order from `Effect<R, E, A>` to `Effect<A, E = never, R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18) Thanks [@github-actions](https://github.com/apps/github-actions)! - Schema: switch `readonlyMapFromSelf`, `readonlyMap` from positional arguments to a single `options` argument:

  Before:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.readonlyMapFromSelf(S.string, S.number);
  S.readonlyMap(S.string, S.number);
  ```

  Now:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.readonlyMapFromSelf({ key: S.string, value: S.number });
  S.readonlyMap({ key: S.string, value: S.number });
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18) Thanks [@github-actions](https://github.com/apps/github-actions)! - Schema: switch `hashMapFromSelf`, `hashMap` from positional arguments to a single `options` argument:

  Before:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.hashMapFromSelf(S.string, S.number);
  S.hashMap(S.string, S.number);
  ```

  Now:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.hashMapFromSelf({ key: S.string, value: S.number });
  S.hashMap({ key: S.string, value: S.number });
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18) Thanks [@github-actions](https://github.com/apps/github-actions)! - Schema: switch `causeFromSelf`, `cause` from positional arguments to a single `options` argument:

  Before:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.causeFromSelf(S.string);
  S.causeFromSelf(S.string, S.unknown);
  S.cause(S.string);
  S.cause(S.string, S.unknown);
  ```

  Now:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.causeFromSelf({ error: S.string });
  S.causeFromSelf({ error: S.string, defect: S.unknown });
  S.cause({ error: S.string });
  S.cause({ error: S.string, defect: S.unknown });
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18) Thanks [@github-actions](https://github.com/apps/github-actions)! - Schema: switch `exitFromSelf`, `exit` from positional arguments to a single `options` argument:

  Before:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.exitFromSelf(S.string, S.number);
  S.exit(S.string, S.number);
  ```

  Now:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.exitFromSelf({ failure: S.string, success: S.number });
  S.exit({ failure: S.string, success: S.number });
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`a34dbdc`](https://github.com/Effect-TS/effect/commit/a34dbdc1552c73c1b612676f262a0c735ce444a7) Thanks [@github-actions](https://github.com/apps/github-actions)! - - Schema: change type parameters order from `Schema<R, I, A>` to `Schema<A, I = A, R = never>`

  - Serializable: change type parameters order from `Serializable<R, I, A>` to `Serializable<A, I, R>`
  - Class: change type parameters order from `Class<R, I, A, C, Self, Inherited>` to `Class<A, I, R, C, Self, Inherited>`
  - PropertySignature: change type parameters order from `PropertySignature<R, From, FromIsOptional, To, ToIsOptional>` to `PropertySignature<From, FromIsOptional, To, ToIsOptional, R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18) Thanks [@github-actions](https://github.com/apps/github-actions)! - Schema: switch `eitherFromSelf`, `either`, `eitherFromUnion` from positional arguments to a single `options` argument:

  Before:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.eitherFromSelf(S.string, S.number);
  S.either(S.string, S.number);
  S.eitherFromUnion(S.string, S.number);
  ```

  Now:

  ```ts
  import * as S from "@effect/schema/Schema";

  S.eitherFromSelf({ left: S.string, right: S.number });
  S.either({ left: S.string, right: S.number });
  S.eitherFromUnion({ left: S.string, right: S.number });
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18) Thanks [@github-actions](https://github.com/apps/github-actions)! - With this change we remove the `Data.Data` type and we make `Equal.Equal` & `Hash.Hash` implicit traits.

  The main reason is that `Data.Data<A>` was structurally equivalent to `A & Equal.Equal` but extending `Equal.Equal` doesn't mean that the equality is implemented by-value, so the type was simply adding noise without gaining any level of safety.

  The module `Data` remains unchanged at the value level, all the functions previously available are supposed to work in exactly the same manner.

  At the type level instead the functions return `Readonly` variants, so for example we have:

  ```ts
  import { Data } from "effect";

  const obj = Data.struct({
    a: 0,
    b: 1,
  });
  ```

  will have the `obj` typed as:

  ```ts
  declare const obj: {
    readonly a: number;
    readonly b: number;
  };
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c) Thanks [@github-actions](https://github.com/apps/github-actions)! - This change enables `Effect.serviceConstants` and `Effect.serviceMembers` to access any constant in the service, not only the effects, namely it is now possible to do:

  ```ts
  import { Effect, Context } from "effect";

  class NumberRepo extends Context.TagClass("NumberRepo")<
    NumberRepo,
    {
      readonly numbers: Array<number>;
    }
  >() {
    static numbers = Effect.serviceConstants(NumberRepo).numbers;
  }
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`56b8691`](https://github.com/Effect-TS/effect/commit/56b86916bf3da18002f3655d859dbc487eb5a6de) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fix usage of Schema.TaggedError in combination with Unify.

  When used with Unify we previously had:

  ```ts
  import { Schema } from "@effect/schema";
  import type { Unify } from "effect";

  class Err extends Schema.TaggedError<Err>()("Err", {}) {}

  // $ExpectType Effect<unknown, unknown, unknown>
  export type IdErr = Unify.Unify<Err>;
  ```

  With this fix we now have:

  ```ts
  import { Schema } from "@effect/schema";
  import type { Unify } from "effect";

  class Err extends Schema.TaggedError<Err>()("Err", {}) {}

  // $ExpectType Err
  export type IdErr = Unify.Unify<Err>;
  ```

### Patch Changes

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`4cd6e14`](https://github.com/Effect-TS/effect/commit/4cd6e144945b6c398f5f5abe3471ff7fb3372bfd) Thanks [@github-actions](https://github.com/apps/github-actions)! - Rename transform type parameters and de/en-coder param names to be more helpful in IDE hints.

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`9dc04c8`](https://github.com/Effect-TS/effect/commit/9dc04c88a2ea9c68122cb2632a76f0f4be40329a) Thanks [@github-actions](https://github.com/apps/github-actions)! - Introducing Optional Annotations in `optional` API.

  Previously, when adding annotations to an optional field using `optional` API, you needed to use `propertySignatureAnnotations`. However, a new optional argument `annotations` is now available to simplify this process.

  Before:

  ```ts
  import * as S from "@effect/schema/Schema";

  const myschema = S.struct({
    a: S.optional(S.string).pipe(
      S.propertySignatureAnnotations({ description: "my description..." }),
    ),
  });
  ```

  Now:

  ```ts
  import * as S from "@effect/schema/Schema";

  const myschema = S.struct({
    a: S.optional(S.string, {
      annotations: { description: "my description..." },
    }),
  });
  ```

  With this update, you can easily include annotations directly within the `optional` API without the need for additional calls.

- Updated dependencies [[`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`c77f635`](https://github.com/Effect-TS/effect/commit/c77f635f8a26ca6d83cb569d911f8eee79033fd9), [`e343a74`](https://github.com/Effect-TS/effect/commit/e343a74843dd9edf879417fa94cb51de7ed5b402), [`acf1894`](https://github.com/Effect-TS/effect/commit/acf1894f45945dbe5c39451e36aabb4b5092f257), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3), [`c986f0e`](https://github.com/Effect-TS/effect/commit/c986f0e0ce4d22ba08177ed351152718479ab63c), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`70dde23`](https://github.com/Effect-TS/effect/commit/70dde238f81125e353fd7bde5fc24ecd8969bf97), [`81b7425`](https://github.com/Effect-TS/effect/commit/81b7425320cbbe2a6cf547a3e3ab3549cdba14cf), [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18), [`0e56e99`](https://github.com/Effect-TS/effect/commit/0e56e998ab9815c4d096c239a553cb86a0f99af9), [`8b0ded9`](https://github.com/Effect-TS/effect/commit/8b0ded9f10ba0d96fcb9af24eff2dbd9341f85e3), [`8dd83e8`](https://github.com/Effect-TS/effect/commit/8dd83e854bfcaa6dab876994c5f813dcfb486c28), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`d75f6fe`](https://github.com/Effect-TS/effect/commit/d75f6fe6499deb0a5ee9ec94af3b5fd4eb03a2d0), [`7356e5c`](https://github.com/Effect-TS/effect/commit/7356e5cc16e9d70f18c02dee1dcb4ad539fd130a), [`3077cde`](https://github.com/Effect-TS/effect/commit/3077cde08a60246821a940964a84dd7f7c8b9f54), [`be19ce0`](https://github.com/Effect-TS/effect/commit/be19ce0b8bdf1fac80bb8d7e0b06a86986b47409), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`78f47ab`](https://github.com/Effect-TS/effect/commit/78f47abfe3cb0a8bbde818b1c5fc603270538b47), [`52e5d20`](https://github.com/Effect-TS/effect/commit/52e5d2077582bf51f25861c7139fc920c2c24166), [`c6137ec`](https://github.com/Effect-TS/effect/commit/c6137ec62c6b5542d5062ae1a3c936cb915dee22), [`f5ae081`](https://github.com/Effect-TS/effect/commit/f5ae08195e68e76faeac258c565d79da4e01e7d6), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`60686f5`](https://github.com/Effect-TS/effect/commit/60686f5c38bef1b93a3a0dda9b6596d46aceab03), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`8ee2931`](https://github.com/Effect-TS/effect/commit/8ee293159b4f7cb7af8558287a0a047f3a69743d), [`6727474`](https://github.com/Effect-TS/effect/commit/672747497490a30d36dd49c06db19aabf09dc7f0), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e)]:
  - effect@2.3.0

## 0.61.7

### Patch Changes

- Updated dependencies [[`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c), [`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c)]:
  - effect@2.2.5

## 0.61.6

### Patch Changes

- [#2057](https://github.com/Effect-TS/effect/pull/2057) [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70) Thanks [@joepjoosten](https://github.com/joepjoosten)! - Fix for possible stack overflow errors when using Array.push with spread operator arguments

- Updated dependencies [[`d0b911c`](https://github.com/Effect-TS/effect/commit/d0b911c75f284c7aa87f25aa96926e6bde7690d0), [`330e1a4`](https://github.com/Effect-TS/effect/commit/330e1a4e2c1fc0af6c80c80c81dd38c3e50fab78), [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70), [`296bc1c`](https://github.com/Effect-TS/effect/commit/296bc1c9d24986d299d2669115d584cb27b73c60)]:
  - effect@2.2.4

## 0.61.5

### Patch Changes

- [#2011](https://github.com/Effect-TS/effect/pull/2011) [`f1ff44b`](https://github.com/Effect-TS/effect/commit/f1ff44b58cdb1886b38681e8fedc309eb9ac6853) Thanks [@gcanti](https://github.com/gcanti)! - add option to preserve excess properties, closes #2008

- [#2017](https://github.com/Effect-TS/effect/pull/2017) [`13785cf`](https://github.com/Effect-TS/effect/commit/13785cf4a5082d8d9cf8d7c991141dee0d2b4d31) Thanks [@gcanti](https://github.com/gcanti)! - Equivalence: handle transformations

## 0.61.4

### Patch Changes

- [#2005](https://github.com/Effect-TS/effect/pull/2005) [`6bf02c7`](https://github.com/Effect-TS/effect/commit/6bf02c70fe10a04d1b34d6666f95416e42a6225a) Thanks [@gcanti](https://github.com/gcanti)! - optional: rearrange overloads to enhance DX, closes #2002

- Updated dependencies [[`22794e0`](https://github.com/Effect-TS/effect/commit/22794e0ba00e40281f30a22fa84412003c24877d), [`f73e6c0`](https://github.com/Effect-TS/effect/commit/f73e6c033fb0729a9cfa5eb4bc39f79d3126e247)]:
  - effect@2.2.3

## 0.61.3

### Patch Changes

- [#1992](https://github.com/Effect-TS/effect/pull/1992) [`9863e2f`](https://github.com/Effect-TS/effect/commit/9863e2fb3561dc019965aeccd6584a418fc8b401) Thanks [@gcanti](https://github.com/gcanti)! - enhance error messages

## 0.61.2

### Patch Changes

- [#1988](https://github.com/Effect-TS/effect/pull/1988) [`64f710a`](https://github.com/Effect-TS/effect/commit/64f710aa49dec6ffcd33ee23438d0774f5489733) Thanks [@gcanti](https://github.com/gcanti)! - Class constructor: avoid overwriting `props` with `additionalProps`, closes #1987

## 0.61.1

### Patch Changes

- [#1975](https://github.com/Effect-TS/effect/pull/1975) [`c7550f9`](https://github.com/Effect-TS/effect/commit/c7550f96e1006eee832ce5025bf0c197a65935ea) Thanks [@gcanti](https://github.com/gcanti)! - fix templateLiteral signature (R should be never)

- [#1974](https://github.com/Effect-TS/effect/pull/1974) [`8d1f6e4`](https://github.com/Effect-TS/effect/commit/8d1f6e4bb13e221804fb1762ef19e02bcefc8f61) Thanks [@gcanti](https://github.com/gcanti)! - causeFromSelf: add missing type parameter

- [#1977](https://github.com/Effect-TS/effect/pull/1977) [`1a84dee`](https://github.com/Effect-TS/effect/commit/1a84dee0e9ddbfaf2610e4d7c00c7020c427171a) Thanks [@gcanti](https://github.com/gcanti)! - add `hash`

- [#1978](https://github.com/Effect-TS/effect/pull/1978) [`ac30bf4`](https://github.com/Effect-TS/effect/commit/ac30bf4cd53de0663784f65ae6bee8279333df97) Thanks [@gcanti](https://github.com/gcanti)! - Allow non-async Effects to be used with \*Sync combinators, closes #1976

  - `ParseResult`
    - add `ast` and `message` fields to `Forbidden`

- Updated dependencies [[`d404561`](https://github.com/Effect-TS/effect/commit/d404561e47ec2fa5f68709a308ee5d2ee959141d), [`7b84a3c`](https://github.com/Effect-TS/effect/commit/7b84a3c7e4b9c8dc02294b0e3cc3ae3becea977b)]:
  - effect@2.2.2

## 0.61.0

### Minor Changes

- [#1922](https://github.com/Effect-TS/effect/pull/1922) [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764) Thanks [@gcanti](https://github.com/gcanti)! - Refactoring:

  - Schema:
    - refactor `Schema.declare` API to make it safe
    - add `Schema.declare` overloads
    - add `encodeUnknown*` APIs
    - rename `parse*` APIs to `decodeUnknown*`
    - symplify brand implementation
    - rename `params` to `annotation` in `typeId` annotation
    - add optional `{ strict: false }` parameter to `compose`
    - `Class`
      - rename `transform` to `transformOrFail`
      - rename `transformFrom` to `transformOrFailFrom`
    - add `hashSet` and `hashSetFromSelf`
    - add `hashMap` and `hashMapFromSelf`
    - add `list` and `listFromSelf`
  - AST:
    - return `ParseResult.ParseIssue` instead of `ParseResult.ParseError` in all APIs
    - Declaration
      - split `decode` into `decodeUnknown` / `encodeUnknown`
      - remove `type` field
  - ParseResult
    - align `mapBoth` with `Effect` (i.e. onFailure, onSuccess handlers)
    - add missing `Declaration` node in `ParseIssue`

- [#1922](https://github.com/Effect-TS/effect/pull/1922) [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764) Thanks [@gcanti](https://github.com/gcanti)! - add context tracking to Schema, closes #1873

### Patch Changes

- Updated dependencies [[`84da31f`](https://github.com/Effect-TS/effect/commit/84da31f0643e8651b9d311b30526b1e4edfbdfb8), [`645bea2`](https://github.com/Effect-TS/effect/commit/645bea2551129f94a5b0e38347e28067dee531bb)]:
  - effect@2.2.1

## 0.60.7

### Patch Changes

- Updated dependencies [[`202befc`](https://github.com/Effect-TS/effect/commit/202befc2ecbeb117c4fa85ef9b12a3d3a48273d2), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`10df798`](https://github.com/Effect-TS/effect/commit/10df798639e556f9d88265ef7fc3cf8a3bbe3874)]:
  - effect@2.2.0

## 0.60.6

### Patch Changes

- Updated dependencies [[`21b9edd`](https://github.com/Effect-TS/effect/commit/21b9edde464f7c5624ef54ad1b5e264204a37625)]:
  - effect@2.1.2

## 0.60.5

### Patch Changes

- [#1945](https://github.com/Effect-TS/effect/pull/1945) [`3bf67cf`](https://github.com/Effect-TS/effect/commit/3bf67cf64ff27ffaa811b07751875cb161ac3385) Thanks [@gcanti](https://github.com/gcanti)! - fix `getNumberIndexedAccess` signature and implementation

## 0.60.4

### Patch Changes

- [#1939](https://github.com/Effect-TS/effect/pull/1939) [`0d1af1e`](https://github.com/Effect-TS/effect/commit/0d1af1e38c11b94e152beaccd0ff7569a1b3f5b7) Thanks [@gcanti](https://github.com/gcanti)! - fix `head` / `headOr` signatures and add `getNumberIndexedAccess`

- [#1939](https://github.com/Effect-TS/effect/pull/1939) [`0d1af1e`](https://github.com/Effect-TS/effect/commit/0d1af1e38c11b94e152beaccd0ff7569a1b3f5b7) Thanks [@gcanti](https://github.com/gcanti)! - make `pluck` dual

- Updated dependencies [[`a222524`](https://github.com/Effect-TS/effect/commit/a2225247e9de2e013d287320790fde88c081dbbd)]:
  - effect@2.1.1

## 0.60.3

### Patch Changes

- [#1930](https://github.com/Effect-TS/effect/pull/1930) [`d543221`](https://github.com/Effect-TS/effect/commit/d5432213e91ab620aa66e0fd92a6593134d18940) Thanks [@gcanti](https://github.com/gcanti)! - add optionFromOrUndefined

- [#1928](https://github.com/Effect-TS/effect/pull/1928) [`2530d47`](https://github.com/Effect-TS/effect/commit/2530d470b0ad5df7e636921eedfb1cbe42821f94) Thanks [@gcanti](https://github.com/gcanti)! - add head / headOr

- [#1933](https://github.com/Effect-TS/effect/pull/1933) [`f493929`](https://github.com/Effect-TS/effect/commit/f493929ab88d2ea137ca5fbff70bdc6c9d804d80) Thanks [@gcanti](https://github.com/gcanti)! - re-add getPropertySignatures

- [#1932](https://github.com/Effect-TS/effect/pull/1932) [`5911fa9`](https://github.com/Effect-TS/effect/commit/5911fa9c9440dd3bc1ee38542bcd15f8c75a4637) Thanks [@gcanti](https://github.com/gcanti)! - add `pluck`

## 0.60.2

### Patch Changes

- Updated dependencies [[`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02)]:
  - effect@2.1.0

## 0.60.1

### Patch Changes

- Updated dependencies [[`f7f19f6`](https://github.com/Effect-TS/effect/commit/f7f19f66a5fa349baa2412c1f9f15111c437df09)]:
  - effect@2.0.5

## 0.60.0

### Minor Changes

- [#1913](https://github.com/Effect-TS/effect/pull/1913) [`b557a10`](https://github.com/Effect-TS/effect/commit/b557a10b773e321bea77fc4951f0ef171dd193c9) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult refactoring:

  - remove `ParseResult` type
  - rename `mapLeft` to `mapError`
  - rename `bimap` to `mapBoth`

### Patch Changes

- [#1910](https://github.com/Effect-TS/effect/pull/1910) [`ec2bdfa`](https://github.com/Effect-TS/effect/commit/ec2bdfae2da717f28147b9d6820d3494cb240945) Thanks [@gcanti](https://github.com/gcanti)! - refactor `eitherFromUnion` as union of transformations

- [#1892](https://github.com/Effect-TS/effect/pull/1892) [`687e02e`](https://github.com/Effect-TS/effect/commit/687e02e7d84dc06957844160761fda90929470ab) Thanks [@matheuspuel](https://github.com/matheuspuel)! - Schema: fix ParseIssue.actual on transformation

- [#1891](https://github.com/Effect-TS/effect/pull/1891) [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8) Thanks [@gcanti](https://github.com/gcanti)! - fix `pick` behavior when the input is a record

- [#1906](https://github.com/Effect-TS/effect/pull/1906) [`0c397e7`](https://github.com/Effect-TS/effect/commit/0c397e762008a0de40c7526c9d99ff2cfe4f7a6a) Thanks [@matheuspuel](https://github.com/matheuspuel)! - Schema: show error message when throw ParseError

- [#1909](https://github.com/Effect-TS/effect/pull/1909) [`74b9094`](https://github.com/Effect-TS/effect/commit/74b90940e571c73a6b76cafa88ffb8a1c949cb4c) Thanks [@tim-smart](https://github.com/tim-smart)! - fix formatting of suspend before initialization

- [#1904](https://github.com/Effect-TS/effect/pull/1904) [`337e80f`](https://github.com/Effect-TS/effect/commit/337e80f69bc36966f889c439b819db2f84cae496) Thanks [@gcanti](https://github.com/gcanti)! - add more title and identifier annotations

- Updated dependencies [[`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`540b294`](https://github.com/Effect-TS/effect/commit/540b2941dd0a81e9688311583ce7e2e140d6e7a5), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`a3f96d6`](https://github.com/Effect-TS/effect/commit/a3f96d615b8b3e238dbfa01ef713c87e6f4532be), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`25adce7`](https://github.com/Effect-TS/effect/commit/25adce7ae76ce834096dca1ed70a60ad1a349217), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51)]:
  - effect@2.0.4

## 0.59.1

### Patch Changes

- [#1888](https://github.com/Effect-TS/effect/pull/1888) [`5b46e99`](https://github.com/Effect-TS/effect/commit/5b46e996d30e2497eb23095e2c21eee04438edf5) Thanks [@gcanti](https://github.com/gcanti)! - Schema: treat missing properties as `undefined` (excluding `is` and `asserts`), closes #1882

- [#1794](https://github.com/Effect-TS/effect/pull/1794) [`210d27e`](https://github.com/Effect-TS/effect/commit/210d27e999e066ea9b907301150c65f9ff080b39) Thanks [@matheuspuel](https://github.com/matheuspuel)! - add eitherFromUnion

- Updated dependencies [[`87f7ef2`](https://github.com/Effect-TS/effect/commit/87f7ef28a3c27e2e4f2fcfa465f85bb2a45a3d6b), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0)]:
  - effect@2.0.3

## 0.59.0

### Minor Changes

- [#1878](https://github.com/Effect-TS/effect/pull/1878) [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f) Thanks [@gcanti](https://github.com/gcanti)! - Schema: remove `from`/`to` API in favour of `make` in:

  - Equivalence
  - JSONSchema
  - Pretty

### Patch Changes

- [#1878](https://github.com/Effect-TS/effect/pull/1878) [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f) Thanks [@gcanti](https://github.com/gcanti)! - Schema: Pretty add `pretty` annotation API

- [#1878](https://github.com/Effect-TS/effect/pull/1878) [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f) Thanks [@gcanti](https://github.com/gcanti)! - Schema: Arbitrary add `arbitrary` annotation

- [#1878](https://github.com/Effect-TS/effect/pull/1878) [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f) Thanks [@gcanti](https://github.com/gcanti)! - Schema: Equivalence add `equivalence` annotation

## 0.58.0

### Minor Changes

- [#1877](https://github.com/Effect-TS/effect/pull/1877) [`a904a73`](https://github.com/Effect-TS/effect/commit/a904a739459bfd0fa7844b00b902d2fa984fb014) Thanks [@gcanti](https://github.com/gcanti)! - Schema: Arbitrary remove `from`/`to` API in favour of `make`

- [#1842](https://github.com/Effect-TS/effect/pull/1842) [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c) Thanks [@fubhy](https://github.com/fubhy)! - Schema: simplify `AST.createRefinement` return type

- [#1842](https://github.com/Effect-TS/effect/pull/1842) [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c) Thanks [@fubhy](https://github.com/fubhy)! - Schema: refactor `ParseResult` module:

  - add `Union` issue, and replace `UnionMember` with `Union`
  - add `Tuple` issue, and replace `Index` with `Tuple`
  - add `TypeLiteral` issue
  - add `Transform` issue
  - add `Refinement` issue
  - add `ast` field to `Member`
  - rename `UnionMember` to `Member`
  - `Type`: rename `expected` to `ast`
  - `ParseError` replace `errors` field with `error` field and refactor `parseError` constructor accordingly
  - `Index` replace `errors` field with `error` field
  - `Key` replace `errors` field with `error` field
  - `Member` replace `errors` field with `error` field
  - `ParseError` replace `errors` field with `error` field
  - make `ParseError` a `Data.TaggedError`
  - `Forbidden`: add `actual` field

### Patch Changes

- [#1842](https://github.com/Effect-TS/effect/pull/1842) [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c) Thanks [@fubhy](https://github.com/fubhy)! - Schema: add more description annotations to built-in schemas

- [#1842](https://github.com/Effect-TS/effect/pull/1842) [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c) Thanks [@fubhy](https://github.com/fubhy)! - Schema: add `Format` module

- [#1842](https://github.com/Effect-TS/effect/pull/1842) [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c) Thanks [@fubhy](https://github.com/fubhy)! - Schema: add outer `option` arg to parse/decode/encode/validation/asserts/is APIs

## 0.57.2

### Patch Changes

- Updated dependencies [[`d5a1949`](https://github.com/Effect-TS/effect/commit/d5a19499aac7c1d147674a35ac69992177c7536c)]:
  - effect@2.0.2

## 0.57.1

### Patch Changes

- Updated dependencies [[`16bd87d`](https://github.com/Effect-TS/effect/commit/16bd87d32611b966dc42ea4fc979764f97a49071)]:
  - effect@2.0.1

## 0.57.0

### Minor Changes

- [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch to monorepo structure

### Patch Changes

- [`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch effect dependency to caret

- [#1848](https://github.com/Effect-TS/effect/pull/1848) [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7) Thanks [@fubhy](https://github.com/fubhy)! - Avoid default parameter initilization

- Updated dependencies [[`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa), [`7b5eaa3`](https://github.com/Effect-TS/effect/commit/7b5eaa3838c79bf4bdccf91b94d61bbc38a2ec95), [`0724211`](https://github.com/Effect-TS/effect/commit/072421149c36010748ff6b6ee19c15c6cffefe09), [`9f2bc5a`](https://github.com/Effect-TS/effect/commit/9f2bc5a19e0b678a0a85e84daac290922b0fd57d), [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7), [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233), [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa), [`6299b84`](https://github.com/Effect-TS/effect/commit/6299b84c11e5d1fe79fa538df8935018c7613747)]:
  - effect@2.0.0

## 0.56.1

### Patch Changes

- [#684](https://github.com/Effect-TS/schema/pull/684) [`6b9585b`](https://github.com/Effect-TS/schema/commit/6b9585b8aba659c5e86f2f8ebc01b1bf8d26143b) Thanks [@patroza](https://github.com/patroza)! - improve: Actually use Arbitrary interface in to/from/unsafe signature

- [#679](https://github.com/Effect-TS/schema/pull/679) [`0f8a8f1`](https://github.com/Effect-TS/schema/commit/0f8a8f14e21a72b503ee3304a30aa4b6c2d6e1ff) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add annotations argument to `attachPropertySignature`

## 0.56.0

### Minor Changes

- [#673](https://github.com/Effect-TS/schema/pull/673) [`0508ac5`](https://github.com/Effect-TS/schema/commit/0508ac5a3be5ca8927e088c80f93aa1122e62286) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.55.0

### Minor Changes

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: should throw on declarations without annotations

- [#669](https://github.com/Effect-TS/schema/pull/669) [`294dfad`](https://github.com/Effect-TS/schema/commit/294dfad1076f10da53096925e02821a69fbad60e) Thanks [@gcanti](https://github.com/gcanti)! - Schema: refactor `parseJson` to replace `ParseJson` and `fromJson`

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: refactor `S.optional` API.

  Upgrade Guide:

  - `S.optional(schema, { exact: true })` replaces the old `S.optional(schema)`
  - `S.optional(schema, { exact: true, default: () => A })` replaces the old `S.optional(schema).withDefault(() => A)`
  - `S.optional(schema, { exact: true, as: "Option" })` replaces the old `S.optional(schema).toOption()`

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: replace `propertySignature` constructor with `propertySignatureAnnotations` combinator

- [#669](https://github.com/Effect-TS/schema/pull/669) [`294dfad`](https://github.com/Effect-TS/schema/commit/294dfad1076f10da53096925e02821a69fbad60e) Thanks [@gcanti](https://github.com/gcanti)! - Schema: simplify `split` parameters to only accept `separator`

- [#669](https://github.com/Effect-TS/schema/pull/669) [`294dfad`](https://github.com/Effect-TS/schema/commit/294dfad1076f10da53096925e02821a69fbad60e) Thanks [@gcanti](https://github.com/gcanti)! - Schema: remove useless combinators

  - `lowercase`
  - `uppercase`
  - `trim`
  - `numberFromString`
  - `symbolFromString`
  - `bigintFromString`
  - `bigintFromNumber`
  - `secret`
  - `durationFromHrTime`
  - `durationFromMillis`
  - `durationFromNanos`
  - `uint8ArrayFromNumbers`
  - `base64`
  - `base64url`
  - `hex`
  - `dateFromString`
  - `bigDecimalFromNumber`
  - `bigDecimalFromString`
  - `not`

### Patch Changes

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: fix declarations (`type` field)

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add `nullish`

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add `orUndefined`

## 0.54.1

### Patch Changes

- [#665](https://github.com/Effect-TS/schema/pull/665) [`a238f20`](https://github.com/Effect-TS/schema/commit/a238f207be74f481313f0cffdebc3a985da3b312) Thanks [@gcanti](https://github.com/gcanti)! - AST: make Annotations readonly

- [#665](https://github.com/Effect-TS/schema/pull/665) [`a238f20`](https://github.com/Effect-TS/schema/commit/a238f207be74f481313f0cffdebc3a985da3b312) Thanks [@gcanti](https://github.com/gcanti)! - AST: make getAnnotation dual

- [#665](https://github.com/Effect-TS/schema/pull/665) [`a238f20`](https://github.com/Effect-TS/schema/commit/a238f207be74f481313f0cffdebc3a985da3b312) Thanks [@gcanti](https://github.com/gcanti)! - Schema: remove Mutable helper in favour of Types.Mutable

- [#665](https://github.com/Effect-TS/schema/pull/665) [`a238f20`](https://github.com/Effect-TS/schema/commit/a238f207be74f481313f0cffdebc3a985da3b312) Thanks [@gcanti](https://github.com/gcanti)! - AST: preserve identifier annotations when calling `from`

## 0.54.0

### Minor Changes

- [#662](https://github.com/Effect-TS/schema/pull/662) [`7f448dd`](https://github.com/Effect-TS/schema/commit/7f448dd437d64452a2818fdfae610a69f8ce2099) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.53.3

### Patch Changes

- [#654](https://github.com/Effect-TS/schema/pull/654) [`a5950d1`](https://github.com/Effect-TS/schema/commit/a5950d14e5868aa88e1c263d14e305185debbc30) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added S.Secret

## 0.53.2

### Patch Changes

- [#656](https://github.com/Effect-TS/schema/pull/656) [`5da1d36`](https://github.com/Effect-TS/schema/commit/5da1d36241889bdb333c001aaa512573541328be) Thanks [@gcanti](https://github.com/gcanti)! - Schema: fix `DocAnnotations` definition

## 0.53.1

### Patch Changes

- [#655](https://github.com/Effect-TS/schema/pull/655) [`54f61d6`](https://github.com/Effect-TS/schema/commit/54f61d60cf495d486d30f9f04f518b49d89d89df) Thanks [@tim-smart](https://github.com/tim-smart)! - fix for never error types in TaggedRequest.Any

- [#604](https://github.com/Effect-TS/schema/pull/604) [`88f61cc`](https://github.com/Effect-TS/schema/commit/88f61ccfaa615a189bf8851c1bddd3b779b20883) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added filters for Duration

- [#605](https://github.com/Effect-TS/schema/pull/605) [`c728880`](https://github.com/Effect-TS/schema/commit/c728880a9d8a996bc5ea5624a7241f7f3f3b90dc) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added toString for schema classes

## 0.53.0

### Minor Changes

- [#635](https://github.com/Effect-TS/schema/pull/635) [`30802d5`](https://github.com/Effect-TS/schema/commit/30802d5280ad6cab154c98c00076d37451b1fbdd) Thanks [@gcanti](https://github.com/gcanti)! - JSONSchema: rename `JsonSchema7Top` to `JsonSchema7Root`

- [#650](https://github.com/Effect-TS/schema/pull/650) [`05c2275`](https://github.com/Effect-TS/schema/commit/05c22753171e67e42956b8f63b744ef855afde40) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- [#640](https://github.com/Effect-TS/schema/pull/640) [`8dcf12c`](https://github.com/Effect-TS/schema/commit/8dcf12cec004fb04495a6726474d10ecd065a2e0) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: rename `ParseErrors` to `ParseIssue`

- [#636](https://github.com/Effect-TS/schema/pull/636) [`deddf6e`](https://github.com/Effect-TS/schema/commit/deddf6e2a88acea89e7eb96b8ff0720ed2bc7077) Thanks [@gcanti](https://github.com/gcanti)! - Schema: rename lazy to suspend (to align with Effect.suspend)

### Patch Changes

- [#645](https://github.com/Effect-TS/schema/pull/645) [`ece6128`](https://github.com/Effect-TS/schema/commit/ece6128e79d23311491a1eb4e6cf18523e8f7c09) Thanks [@gcanti](https://github.com/gcanti)! - ensure that JSON Schema annotations can be exclusively applied to refinements

## 0.52.0

### Minor Changes

- [#632](https://github.com/Effect-TS/schema/pull/632) [`ad220dd`](https://github.com/Effect-TS/schema/commit/ad220dd29e94e1a3ae047680a5de87fb77966ec4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#609](https://github.com/Effect-TS/schema/pull/609) [`8ca0220`](https://github.com/Effect-TS/schema/commit/8ca0220568b9d86dabebbb4f7df352aedea704ee) Thanks [@tim-smart](https://github.com/tim-smart)! - add Serializable module

- [#609](https://github.com/Effect-TS/schema/pull/609) [`8ca0220`](https://github.com/Effect-TS/schema/commit/8ca0220568b9d86dabebbb4f7df352aedea704ee) Thanks [@tim-smart](https://github.com/tim-smart)! - add FiberId schema

- [#609](https://github.com/Effect-TS/schema/pull/609) [`8ca0220`](https://github.com/Effect-TS/schema/commit/8ca0220568b9d86dabebbb4f7df352aedea704ee) Thanks [@tim-smart](https://github.com/tim-smart)! - add Exit schema

- [#609](https://github.com/Effect-TS/schema/pull/609) [`8ca0220`](https://github.com/Effect-TS/schema/commit/8ca0220568b9d86dabebbb4f7df352aedea704ee) Thanks [@tim-smart](https://github.com/tim-smart)! - add Cause schema

## 0.51.5

### Patch Changes

- [#629](https://github.com/Effect-TS/schema/pull/629) [`f690ebe`](https://github.com/Effect-TS/schema/commit/f690ebe28549181d80c985048784f9190e17bdaf) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add filter overloading returning Option<ParseError>

  For more complex scenarios, you can return an `Option<ParseError>` type instead of a boolean. In this context, `None` indicates success, and `Some(error)` rejects the input with a specific error

## 0.51.4

### Patch Changes

- [#623](https://github.com/Effect-TS/schema/pull/623) [`3a56b06`](https://github.com/Effect-TS/schema/commit/3a56b069eac9ecbbff3c0448590f7137afc11fbc) Thanks [@sukovanej](https://github.com/sukovanej)! - Export `JsonSchema7` types.

- [#626](https://github.com/Effect-TS/schema/pull/626) [`67c154e`](https://github.com/Effect-TS/schema/commit/67c154e92bd2a7a0d70faa14442fae6e6a7216ad) Thanks [@gcanti](https://github.com/gcanti)! - S.rename: handle field transformations, closes #625

## 0.51.3

### Patch Changes

- [#621](https://github.com/Effect-TS/schema/pull/621) [`c97aad8`](https://github.com/Effect-TS/schema/commit/c97aad8f83e434bcd7fd7b738a917f8a937772b0) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add `fromJson` combinator

## 0.51.2

### Patch Changes

- [#618](https://github.com/Effect-TS/schema/pull/618) [`95a0354`](https://github.com/Effect-TS/schema/commit/95a03549ead66f3fb0fea76e68445c14718ca3e7) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: remove runtime dependency from Schema module

- [#617](https://github.com/Effect-TS/schema/pull/617) [`0cd3262`](https://github.com/Effect-TS/schema/commit/0cd326237cff52e2b0973850b1e167b2782fefa2) Thanks [@matheuspuel](https://github.com/matheuspuel)! - add Schema.transformLiteral and Schema.transformLiterals

- [#618](https://github.com/Effect-TS/schema/pull/618) [`95a0354`](https://github.com/Effect-TS/schema/commit/95a03549ead66f3fb0fea76e68445c14718ca3e7) Thanks [@gcanti](https://github.com/gcanti)! - Pretty: remove runtime dependency from Schema module

## 0.51.1

### Patch Changes

- [#615](https://github.com/Effect-TS/schema/pull/615) [`f851621`](https://github.com/Effect-TS/schema/commit/f851621eb3c89e813aa0527832ec552b97defddf) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.51.0

### Minor Changes

- [#613](https://github.com/Effect-TS/schema/pull/613) [`2af3914`](https://github.com/Effect-TS/schema/commit/2af39143de6d4a1d83d092ef7311ecd2d3194d85) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#612](https://github.com/Effect-TS/schema/pull/612) [`7596197`](https://github.com/Effect-TS/schema/commit/7596197345c709f3fbab3e4e92b70747018b9c61) Thanks [@patroza](https://github.com/patroza)! - doc: fix S.split README sample

## 0.50.0

### Minor Changes

- [#593](https://github.com/Effect-TS/schema/pull/593) [`cbc2e3f`](https://github.com/Effect-TS/schema/commit/cbc2e3f8d3657d545fbe41d791049f5e6dfb57c6) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: merge failure APIs into `fail`

- [#607](https://github.com/Effect-TS/schema/pull/607) [`e85aefb`](https://github.com/Effect-TS/schema/commit/e85aefb7cb0f5ea7532fc2a0abb13595d3330140) Thanks [@gcanti](https://github.com/gcanti)! - Bug Fix: align index signature behaviour to TypeScript

- [#589](https://github.com/Effect-TS/schema/pull/589) [`3b99569`](https://github.com/Effect-TS/schema/commit/3b99569c8bd3f6fa748ae0d81f7992e8899f8ef6) Thanks [@gcanti](https://github.com/gcanti)! - - remove `ValidDate` (which is just an alias of `Date`)

  - add `DateFromString` (decodes from string, output: possibly invalid Date)

- [#593](https://github.com/Effect-TS/schema/pull/593) [`cbc2e3f`](https://github.com/Effect-TS/schema/commit/cbc2e3f8d3657d545fbe41d791049f5e6dfb57c6) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: rename `success` to `succeed` (standard naming)

### Patch Changes

- [#597](https://github.com/Effect-TS/schema/pull/597) [`caeed29`](https://github.com/Effect-TS/schema/commit/caeed29b9c3cef804009046347777d6041d5a47e) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added BigDecimal

- [#585](https://github.com/Effect-TS/schema/pull/585) [`5b27f03`](https://github.com/Effect-TS/schema/commit/5b27f03d490d6da2583562189e82d8ed70460a27) Thanks [@gcanti](https://github.com/gcanti)! - improve JSON Schema output:

  - rename `dependencies` to `$defs`
  - remove `"type"` from const schemas
  - use `"oneOf"` for enums and add `"title"`s
  - add support for `record(pattern, number)`
  - add `"$id"` and `"$comment"` properties
  - literals should be converted to `enum` instead of `anyOf`, closes #579

- [#603](https://github.com/Effect-TS/schema/pull/603) [`8e21d7e`](https://github.com/Effect-TS/schema/commit/8e21d7ec6acf7a16c17dd57e52c5720391c6a954) Thanks [@gcanti](https://github.com/gcanti)! - TreeFormatter: enhance `formatActual` for data types with a custom `toString` implementation, closes #600

## 0.49.4

### Patch Changes

- [#595](https://github.com/Effect-TS/schema/pull/595) [`931b557`](https://github.com/Effect-TS/schema/commit/931b5577e3ce4cd08f35f37b084c974e3b75d2c4) Thanks [@tim-smart](https://github.com/tim-smart)! - add \_tag to TaggedRequest.Base

## 0.49.3

### Patch Changes

- [#592](https://github.com/Effect-TS/schema/pull/592) [`c2b0e6b`](https://github.com/Effect-TS/schema/commit/c2b0e6b07898bf265bb1a38aa3ab359c576ede95) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added ParseResult.try

- [#582](https://github.com/Effect-TS/schema/pull/582) [`bc6595c`](https://github.com/Effect-TS/schema/commit/bc6595c1a271d9ff2e1bf3439d99565c97424e59) Thanks [@fubhy](https://github.com/fubhy)! - Added support for `Duration`

- [#590](https://github.com/Effect-TS/schema/pull/590) [`0d0f0be`](https://github.com/Effect-TS/schema/commit/0d0f0be5891b78b21542fe2ab18b11bbecdd5e0b) Thanks [@gcanti](https://github.com/gcanti)! - Parser: should use the original ast to generate a more informative error message when an incorrect data type is provided

## 0.49.2

### Patch Changes

- [#587](https://github.com/Effect-TS/schema/pull/587) [`64fe91f`](https://github.com/Effect-TS/schema/commit/64fe91f54050a4aadab26df7c5a875dd8de0588a) Thanks [@gcanti](https://github.com/gcanti)! - DateFromSelf: its arbitrary should also generate "Invalid Date"s

## 0.49.1

### Patch Changes

- [#580](https://github.com/Effect-TS/schema/pull/580) [`4491e75`](https://github.com/Effect-TS/schema/commit/4491e75e07db07944e8fda9fa08d3ef0ca1a56d1) Thanks [@tim-smart](https://github.com/tim-smart)! - fix missing class .struct schema

## 0.49.0

### Minor Changes

- [#577](https://github.com/Effect-TS/schema/pull/577) [`9653cf4`](https://github.com/Effect-TS/schema/commit/9653cf4bc5e25a3b98ddb52c15ca72811ed89156) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#574](https://github.com/Effect-TS/schema/pull/574) [`2ed5f8e`](https://github.com/Effect-TS/schema/commit/2ed5f8ef1584f23962de646a317e536309db744b) Thanks [@tim-smart](https://github.com/tim-smart)! - add TaggedRequest class

## 0.48.4

### Patch Changes

- [#572](https://github.com/Effect-TS/schema/pull/572) [`b135781`](https://github.com/Effect-TS/schema/commit/b135781bf0d1991048f01c92ef2cda60f3aefdf2) Thanks [@gcanti](https://github.com/gcanti)! - Effect.catchTag can be used to catch ParseError

## 0.48.3

### Patch Changes

- [#570](https://github.com/Effect-TS/schema/pull/570) [`20c1a67`](https://github.com/Effect-TS/schema/commit/20c1a679c840381ef86531f31f2b344fab4016e4) Thanks [@gcanti](https://github.com/gcanti)! - make ParseError Inspectable

## 0.48.2

### Patch Changes

- [#568](https://github.com/Effect-TS/schema/pull/568) [`573419e`](https://github.com/Effect-TS/schema/commit/573419e5b1bda634ee0c27ed785bbce4557e6094) Thanks [@tim-smart](https://github.com/tim-smart)! - add Schema.TaggedError

- [#568](https://github.com/Effect-TS/schema/pull/568) [`573419e`](https://github.com/Effect-TS/schema/commit/573419e5b1bda634ee0c27ed785bbce4557e6094) Thanks [@tim-smart](https://github.com/tim-smart)! - add Schema.TaggedClass

## 0.48.1

### Patch Changes

- [#566](https://github.com/Effect-TS/schema/pull/566) [`1c1d5a5`](https://github.com/Effect-TS/schema/commit/1c1d5a523b37118507fd234170aad693e3b416ce) Thanks [@matheuspuel](https://github.com/matheuspuel)! - add dual api to Schema.rename

- [#566](https://github.com/Effect-TS/schema/pull/566) [`1c1d5a5`](https://github.com/Effect-TS/schema/commit/1c1d5a523b37118507fd234170aad693e3b416ce) Thanks [@matheuspuel](https://github.com/matheuspuel)! - forbid excess properties on Schema.rename

- [#564](https://github.com/Effect-TS/schema/pull/564) [`8440e1e`](https://github.com/Effect-TS/schema/commit/8440e1eb9b973b2820be9e36a62ebcc85efe190e) Thanks [@fubhy](https://github.com/fubhy)! - Use `sideEffects: []` to circumvent bundler issues

## 0.48.0

### Minor Changes

- [#561](https://github.com/Effect-TS/schema/pull/561) [`ec63224`](https://github.com/Effect-TS/schema/commit/ec6322430fbbe51696bf764893074a8af29efbd9) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.47.7

### Patch Changes

- [#557](https://github.com/Effect-TS/schema/pull/557) [`e399df1`](https://github.com/Effect-TS/schema/commit/e399df1d7685bacd8061a2eeda5ff1cffb094ee4) Thanks [@gcanti](https://github.com/gcanti)! - Equivalence: ignore excess properties, closes #556

## 0.47.6

### Patch Changes

- [#552](https://github.com/Effect-TS/schema/pull/552) [`fc1638e`](https://github.com/Effect-TS/schema/commit/fc1638e68a23fe7865a4f63a79b0ff72093246e2) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add rename API

## 0.47.5

### Patch Changes

- [#553](https://github.com/Effect-TS/schema/pull/553) [`522161a`](https://github.com/Effect-TS/schema/commit/522161a8bf5368f7f3afc09a47bd2e0839aaf60d) Thanks [@gcanti](https://github.com/gcanti)! - Fix bug in property signature transformations when used for renaming (old key/value pair was not removed)

## 0.47.4

### Patch Changes

- [#550](https://github.com/Effect-TS/schema/pull/550) [`5167e2d`](https://github.com/Effect-TS/schema/commit/5167e2dbf99282097d93bb0e9be0d3fa9cdcd214) Thanks [@gcanti](https://github.com/gcanti)! - attachPropertySignature: add support for symbols as values

## 0.47.3

### Patch Changes

- [#546](https://github.com/Effect-TS/schema/pull/546) [`b6e8e12`](https://github.com/Effect-TS/schema/commit/b6e8e1232f90f8d01519eb90c43eaa5c6422503a) Thanks [@rjdellecese](https://github.com/rjdellecese)! - added S.uppercased, S.uppercase, and S.Uppercase

## 0.47.2

### Patch Changes

- [#542](https://github.com/Effect-TS/schema/pull/542) [`23c2ecc`](https://github.com/Effect-TS/schema/commit/23c2ecc8f585190aa0d5df0a7aef6a796d8fa634) Thanks [@gcanti](https://github.com/gcanti)! - Chore: use Chunk.getEquivalence

## 0.47.1

### Patch Changes

- [#540](https://github.com/Effect-TS/schema/pull/540) [`85526bf`](https://github.com/Effect-TS/schema/commit/85526bf6e6a1e833d4ae43716c6c27a7c38fb874) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.47.0

### Minor Changes

- [#538](https://github.com/Effect-TS/schema/pull/538) [`c8a8b79`](https://github.com/Effect-TS/schema/commit/c8a8b79d4866f5471ad4e549bbed8837fe369c11) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.46.4

### Patch Changes

- [#532](https://github.com/Effect-TS/schema/pull/532) [`1e115af`](https://github.com/Effect-TS/schema/commit/1e115afab16c79841f683f73b51357805d8bf39e) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: add BigIntConstraints support

- [#533](https://github.com/Effect-TS/schema/pull/533) [`6973032`](https://github.com/Effect-TS/schema/commit/697303291d6777d230c9105aa775f033534968b4) Thanks [@gcanti](https://github.com/gcanti)! - expose Equivalence compiler

- [#530](https://github.com/Effect-TS/schema/pull/530) [`23b1e1c`](https://github.com/Effect-TS/schema/commit/23b1e1cded1aa95224555fadcae8de9ab7bc1fdb) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: merge ArrayConstraints

## 0.46.3

### Patch Changes

- [#527](https://github.com/Effect-TS/schema/pull/527) [`02cb140`](https://github.com/Effect-TS/schema/commit/02cb1406d258b679a3e99cb9c977237431dbdf22) Thanks [@gcanti](https://github.com/gcanti)! - add default annotation

## 0.46.2

### Patch Changes

- [#523](https://github.com/Effect-TS/schema/pull/523) [`dca107a`](https://github.com/Effect-TS/schema/commit/dca107a48dae48824b4f3f2888d4beecc56127aa) Thanks [@jessekelly881](https://github.com/jessekelly881)! - Replaced TreeFormatter with ArrayFormatter for BrandErrors when using Schema.brand

## 0.46.1

### Patch Changes

- [#519](https://github.com/Effect-TS/schema/pull/519) [`9fe7693`](https://github.com/Effect-TS/schema/commit/9fe7693e253d8dac3ace625a5fa7aeb79cb578b4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.46.0

### Minor Changes

- [#515](https://github.com/Effect-TS/schema/pull/515) [`c9bf451`](https://github.com/Effect-TS/schema/commit/c9bf4513236f9ef3985d96219c0c3d2b9037d636) Thanks [@sukovanej](https://github.com/sukovanej)! - Update effect and fast-check.

## 0.45.8

### Patch Changes

- [#514](https://github.com/Effect-TS/schema/pull/514) [`3acbc38`](https://github.com/Effect-TS/schema/commit/3acbc381dbf9bc6636a611efed073ff79878427c) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: handle array constraints

- [#514](https://github.com/Effect-TS/schema/pull/514) [`3acbc38`](https://github.com/Effect-TS/schema/commit/3acbc381dbf9bc6636a611efed073ff79878427c) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: fix recursive generation (memory issues)

## 0.45.7

### Patch Changes

- [#512](https://github.com/Effect-TS/schema/pull/512) [`c1beed7`](https://github.com/Effect-TS/schema/commit/c1beed71328876f942665800888f98e738693380) Thanks [@gcanti](https://github.com/gcanti)! - Schema: `split` should support subtypes of `string`

## 0.45.6

### Patch Changes

- [#508](https://github.com/Effect-TS/schema/pull/508) [`618b1b5`](https://github.com/Effect-TS/schema/commit/618b1b5cb9f41cbe6410d5deaf266f6be4b2d552) Thanks [@matheuspuel](https://github.com/matheuspuel)! - fix encode discriminated union with transformation

## 0.45.5

### Patch Changes

- [#503](https://github.com/Effect-TS/schema/pull/503) [`b9a8748`](https://github.com/Effect-TS/schema/commit/b9a874834905938c07ff5ee4efc090733242f89a) Thanks [@gcanti](https://github.com/gcanti)! - expose JSON Schema compiler

## 0.45.4

### Patch Changes

- [#493](https://github.com/Effect-TS/schema/pull/493) [`b8410b7`](https://github.com/Effect-TS/schema/commit/b8410b7fefa0644e42554aa9f2144ac7718a95e4) Thanks [@gcanti](https://github.com/gcanti)! - expose JSON Schema compiler

## 0.45.3

### Patch Changes

- [#500](https://github.com/Effect-TS/schema/pull/500) [`e9ff876`](https://github.com/Effect-TS/schema/commit/e9ff876930e4daa1aebb58ab6aaef1a45feaedca) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: remove NaN while generating numeric template literals

## 0.45.2

### Patch Changes

- [#498](https://github.com/Effect-TS/schema/pull/498) [`4b522a3`](https://github.com/Effect-TS/schema/commit/4b522a3d6d724aa5dbb6e4d9166f249900dfe3fb) Thanks [@gcanti](https://github.com/gcanti)! - fix regexp for numeric template literals

## 0.45.1

### Patch Changes

- [#496](https://github.com/Effect-TS/schema/pull/496) [`ff360c6`](https://github.com/Effect-TS/schema/commit/ff360c6a5c68d4c9541f4d6678e24671245eaa87) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: fix issue with generating optional tuple elements

## 0.45.0

### Minor Changes

- [#491](https://github.com/Effect-TS/schema/pull/491) [`135072e`](https://github.com/Effect-TS/schema/commit/135072e16f64f4ac6752f5496a2c40468dcc7cdb) Thanks [@gcanti](https://github.com/gcanti)! - Make transformations strict by default (and allow relaxing constraints with `strict: false` option)

- [#495](https://github.com/Effect-TS/schema/pull/495) [`c02334c`](https://github.com/Effect-TS/schema/commit/c02334c9bf4d40a2fa594433a11fd730662fbb4d) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#475](https://github.com/Effect-TS/schema/pull/475) [`46dcfeb`](https://github.com/Effect-TS/schema/commit/46dcfeba229ccb7a17555691856d066b22ea1d8d) Thanks [@tim-smart](https://github.com/tim-smart)! - memoize the Parser per AST

## 0.44.0

### Minor Changes

- [#488](https://github.com/Effect-TS/schema/pull/488) [`e00491c`](https://github.com/Effect-TS/schema/commit/e00491cd0ddb32ed0be78341664cab7cd846570b) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.43.2

### Patch Changes

- [#485](https://github.com/Effect-TS/schema/pull/485) [`0a20788`](https://github.com/Effect-TS/schema/commit/0a2078800f05b335b30c88d9cf06d988c826bdef) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: use Math.fround when creating number constraints, closes #484

## 0.43.1

### Patch Changes

- [#483](https://github.com/Effect-TS/schema/pull/483) [`c80c94f`](https://github.com/Effect-TS/schema/commit/c80c94f397668d20fa52ad929a0f25394039213d) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add jsonSchema annotation helper

- [#481](https://github.com/Effect-TS/schema/pull/481) [`56f5ac0`](https://github.com/Effect-TS/schema/commit/56f5ac0653851ef667cd24d7eca5f7246eb56273) Thanks [@gcanti](https://github.com/gcanti)! - AST/Schema: add mutable combinator

## 0.43.0

### Minor Changes

- [#476](https://github.com/Effect-TS/schema/pull/476) [`1fb1002`](https://github.com/Effect-TS/schema/commit/1fb1002fe3c76865401183cb093654c7e72c0193) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.42.0

### Minor Changes

- [#472](https://github.com/Effect-TS/schema/pull/472) [`e3d79fe`](https://github.com/Effect-TS/schema/commit/e3d79fe2cd237e55bc89046be07794447655e4e8) Thanks [@gcanti](https://github.com/gcanti)! - update effect

## 0.41.1

### Patch Changes

- [#470](https://github.com/Effect-TS/schema/pull/470) [`a5bf46b`](https://github.com/Effect-TS/schema/commit/a5bf46b85255f01b33e9320e7e0db53b478f38ac) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: add orElse

## 0.41.0

### Minor Changes

- [#468](https://github.com/Effect-TS/schema/pull/468) [`da7a851`](https://github.com/Effect-TS/schema/commit/da7a85122032ff58024b8f2f0738756a255bdcfa) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.40.2

### Patch Changes

- [#465](https://github.com/Effect-TS/schema/pull/465) [`8452aef`](https://github.com/Effect-TS/schema/commit/8452aef39a20fa8f6a984606e0b65351e07a2d69) Thanks [@gcanti](https://github.com/gcanti)! - Add support for ParseOptions and AST to transform

## 0.40.1

### Patch Changes

- [#459](https://github.com/Effect-TS/schema/pull/459) [`f2d0fc5`](https://github.com/Effect-TS/schema/commit/f2d0fc5b21b8ebdbab21722cdbf5655806ea5bf9) Thanks [@gcanti](https://github.com/gcanti)! - add ArrayFormatter

- [#461](https://github.com/Effect-TS/schema/pull/461) [`2d3a234`](https://github.com/Effect-TS/schema/commit/2d3a234737251e17e7cccf871579a5040aa7ceb9) Thanks [@gcanti](https://github.com/gcanti)! - move fast-check to peer dependencies, closes #458

## 0.40.0

### Minor Changes

- [#457](https://github.com/Effect-TS/schema/pull/457) [`693b81f`](https://github.com/Effect-TS/schema/commit/693b81f69e1c3a2191582165499587cbd50291b2) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- [#457](https://github.com/Effect-TS/schema/pull/457) [`693b81f`](https://github.com/Effect-TS/schema/commit/693b81f69e1c3a2191582165499587cbd50291b2) Thanks [@tim-smart](https://github.com/tim-smart)! - use preconstruct for builds

## 0.39.2

### Patch Changes

- [#454](https://github.com/Effect-TS/schema/pull/454) [`f8a9c57`](https://github.com/Effect-TS/schema/commit/f8a9c577c82ddf12c83717c34c5984e1d3f81924) Thanks [@fubhy](https://github.com/fubhy)! - Fix effect peer dependency version range

## 0.39.1

### Patch Changes

- [#452](https://github.com/Effect-TS/schema/pull/452) [`ca65e43`](https://github.com/Effect-TS/schema/commit/ca65e43a750322a2134b96823efbbb534eea49b5) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.39.0

### Minor Changes

- [#449](https://github.com/Effect-TS/schema/pull/449) [`5950b14`](https://github.com/Effect-TS/schema/commit/5950b14a31518798133a1b702c4bc57afa803485) Thanks [@tim-smart](https://github.com/tim-smart)! - update to use unified "effect" package

## 0.38.0

### Minor Changes

- [#439](https://github.com/Effect-TS/schema/pull/439) [`2197496`](https://github.com/Effect-TS/schema/commit/21974960d957abad178c858b855bf9bd34c18d30) Thanks [@gcanti](https://github.com/gcanti)! - Schema: remove \*Result APIs

  - decodeResult (use decode instead)
  - encodeResult (use encode instead)
  - parseResult (use parse instead)
  - validateResult (use validate instead)

### Patch Changes

- [#447](https://github.com/Effect-TS/schema/pull/447) [`0252143`](https://github.com/Effect-TS/schema/commit/0252143fd081de940bc3fad7d6e1420ba016b3f0) Thanks [@gcanti](https://github.com/gcanti)! - int filter: use Number.isSafeInteger instead of Number.isInteger

## 0.37.2

### Patch Changes

- [#445](https://github.com/Effect-TS/schema/pull/445) [`e90d43b`](https://github.com/Effect-TS/schema/commit/e90d43badcfa577492766dfcfd3ab3910dacd41f) Thanks [@gcanti](https://github.com/gcanti)! - remove internal tag from MissingSelfGeneric utility type

## 0.37.1

### Patch Changes

- [#443](https://github.com/Effect-TS/schema/pull/443) [`3269600`](https://github.com/Effect-TS/schema/commit/32696007e208894d148950d36da12db3f3691214) Thanks [@fubhy](https://github.com/fubhy)! - update `/io`

## 0.37.0

### Minor Changes

- [#441](https://github.com/Effect-TS/schema/pull/441) [`63f1149`](https://github.com/Effect-TS/schema/commit/63f1149926a239411e781398ea2458b514b873b5) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data & /io

## 0.36.5

### Patch Changes

- [#436](https://github.com/Effect-TS/schema/pull/436) [`3a660d3`](https://github.com/Effect-TS/schema/commit/3a660d3c1fecd3f4acd0dbb99e2aed2d6e266189) Thanks [@gcanti](https://github.com/gcanti)! - add pretty to FilterAnnotations

## 0.36.4

### Patch Changes

- [#434](https://github.com/Effect-TS/schema/pull/434) [`994a37e`](https://github.com/Effect-TS/schema/commit/994a37e61fc12bffe36145e01b7708e18e213f36) Thanks [@gcanti](https://github.com/gcanti)! - Exclude property signatures from index signatures validations, fix #433

## 0.36.3

### Patch Changes

- [#430](https://github.com/Effect-TS/schema/pull/430) [`de5d649`](https://github.com/Effect-TS/schema/commit/de5d6493095460fa413e70a83a87aaabadabcf57) Thanks [@fubhy](https://github.com/fubhy)! - Enforce explicit `Schema.Class` type parameters

## 0.36.2

### Patch Changes

- [#428](https://github.com/Effect-TS/schema/pull/428) [`73a8424`](https://github.com/Effect-TS/schema/commit/73a842493079893898495fdb92ef3592a33176a7) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Class transform helper types

## 0.36.1

### Patch Changes

- [#425](https://github.com/Effect-TS/schema/pull/425) [`d952db8`](https://github.com/Effect-TS/schema/commit/d952db8a635f1ffeeb24b37518c44475a49af591) Thanks [@gcanti](https://github.com/gcanti)! - Class: add support for Arbitrary, closes #424

## 0.36.0

### Minor Changes

- [#420](https://github.com/Effect-TS/schema/pull/420) [`3a46cbc`](https://github.com/Effect-TS/schema/commit/3a46cbc3af2592e39619f193dd6972aa3a5ce04f) Thanks [@tim-smart](https://github.com/tim-smart)! - have Schema.Class constructors implement Schema directly

- [#422](https://github.com/Effect-TS/schema/pull/422) [`295561b`](https://github.com/Effect-TS/schema/commit/295561b46256444498202959852abdef8d6f4c0c) Thanks [@gcanti](https://github.com/gcanti)! - move ToAsserts utility type to Schema namespace

## 0.35.1

### Patch Changes

- [#418](https://github.com/Effect-TS/schema/pull/418) [`9cd24ac`](https://github.com/Effect-TS/schema/commit/9cd24acbde6c366ebecb48aff3c78eb74d0d48b9) Thanks [@gcanti](https://github.com/gcanti)! - update dependencies

- [#416](https://github.com/Effect-TS/schema/pull/416) [`f932832`](https://github.com/Effect-TS/schema/commit/f932832984af0b059f4dd7493f62510e2a551ed2) Thanks [@fubhy](https://github.com/fubhy)! - Use `Predicate.isUint8Array` and update `/data`

## 0.35.0

### Minor Changes

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - backport AST changes from POC:

  - change decode in Declaration- change decode in Refinement (to filter)
  - remove isReversed from Refinement
  - add transformation to Transform (and remove decode, encode, propertySignatureTransformations)
  - refactor PropertySignature

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - refactor annotations: keys must be symbols

- [#411](https://github.com/Effect-TS/schema/pull/411) [`2f6c4d1`](https://github.com/Effect-TS/schema/commit/2f6c4d116eb5c935710cf6dadbc5d500010c95d4) Thanks [@gcanti](https://github.com/gcanti)! - rename `symbol` to `symbolFromSelf` and add `symbol` which decodes/encodes from/to `string`

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - remove Spread in favour of /data/Types#Simplify

- [#413](https://github.com/Effect-TS/schema/pull/413) [`20ef377`](https://github.com/Effect-TS/schema/commit/20ef377fc0fc6adb92896c926fb5cc77430e0e1e) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - fix fromBrand definition (self is a Schema<I, A> now instead of Schema<A>)

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - rename `bigint` to `bigintFromSelf` and `BigintFromString` to `bigint`

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - change transformation display in error messages (from A -> B to A <-> B)

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - move From, To to Schema namespace (conforming to the ecosystem standard)

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - rename `transformResult` to `transformOrFail` and change signature (add additional ast parameter to transformations)

### Patch Changes

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - record: add support for branded keys

- [#407](https://github.com/Effect-TS/schema/pull/407) [`9a1b8de`](https://github.com/Effect-TS/schema/commit/9a1b8de5b8ff8f93c8a564bfdfc0f4c327d6a6aa) Thanks [@fubhy](https://github.com/fubhy)! - Add support for `base64`, `base64url` and `hex` encoding

- [#412](https://github.com/Effect-TS/schema/pull/412) [`3768461`](https://github.com/Effect-TS/schema/commit/37684611899d2bee1110d30c8d3136d74f6c5dcf) Thanks [@gcanti](https://github.com/gcanti)! - relax transform / transformOrFail / compose constraints

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - TreeFormatter: should not collapse union members

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - add description annotations to: string, number, boolean, symbol, bigint, object

- [#405](https://github.com/Effect-TS/schema/pull/405) [`0e24b7d`](https://github.com/Effect-TS/schema/commit/0e24b7dea40e625d466d4922ed94433a09867dfb) Thanks [@fubhy](https://github.com/fubhy)! - Add support for `Uint8Array`

## 0.34.0

### Minor Changes

- [#403](https://github.com/Effect-TS/schema/pull/403) [`da52c2b`](https://github.com/Effect-TS/schema/commit/da52c2b9ca0945ca49ce57bd227f773aab1fc3c9) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data & /io

### Patch Changes

- [#397](https://github.com/Effect-TS/schema/pull/397) [`376fc3d`](https://github.com/Effect-TS/schema/commit/376fc3d89061c9db6aca2841f96dfd3f48bc4a50) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added S.Lowercase

- [#382](https://github.com/Effect-TS/schema/pull/382) [`d79309b`](https://github.com/Effect-TS/schema/commit/d79309b00f0028089858a8db8c98b6ecdf9c624c) Thanks [@fubhy](https://github.com/fubhy)! - Added `bigintFromNumber` transform

## 0.33.2

### Patch Changes

- [#392](https://github.com/Effect-TS/schema/pull/392) [`4c1ed27`](https://github.com/Effect-TS/schema/commit/4c1ed27026e3be65bb441d7d8a6a989db420e28d) Thanks [@gcanti](https://github.com/gcanti)! - pattern filter: set default Arbitrary

- [#388](https://github.com/Effect-TS/schema/pull/388) [`27a78bb`](https://github.com/Effect-TS/schema/commit/27a78bb7fbb08e6c2ad9cd29b21c59f41d2dfe28) Thanks [@gcanti](https://github.com/gcanti)! - compose: allow forcing decoding / encoding

- [#388](https://github.com/Effect-TS/schema/pull/388) [`27a78bb`](https://github.com/Effect-TS/schema/commit/27a78bb7fbb08e6c2ad9cd29b21c59f41d2dfe28) Thanks [@gcanti](https://github.com/gcanti)! - add parseJson combinator

- [#388](https://github.com/Effect-TS/schema/pull/388) [`27a78bb`](https://github.com/Effect-TS/schema/commit/27a78bb7fbb08e6c2ad9cd29b21c59f41d2dfe28) Thanks [@gcanti](https://github.com/gcanti)! - add ParseJson codec

## 0.33.1

### Patch Changes

- [#372](https://github.com/Effect-TS/schema/pull/372) [`9c30196`](https://github.com/Effect-TS/schema/commit/9c3019669b63245dd19b84939326f62e652277d2) Thanks [@fubhy](https://github.com/fubhy)! - Added `Class` to `Schema` module

## 0.33.0

### Minor Changes

- [#376](https://github.com/Effect-TS/schema/pull/376) [`64c2567`](https://github.com/Effect-TS/schema/commit/64c256769a69bce03fdb00b9fa4f7abdab794261) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

### Patch Changes

- [#375](https://github.com/Effect-TS/schema/pull/375) [`bd61bcf`](https://github.com/Effect-TS/schema/commit/bd61bcf94a82b65a2a5285ac57a31e7b3342ba33) Thanks [@tim-smart](https://github.com/tim-smart)! - update build tools

- [#373](https://github.com/Effect-TS/schema/pull/373) [`e74455e`](https://github.com/Effect-TS/schema/commit/e74455e82aa0219f236a884b84117d69bac6de57) Thanks [@tim-smart](https://github.com/tim-smart)! - use peer deps for /data and /io

## 0.32.0

### Minor Changes

- [#370](https://github.com/Effect-TS/schema/pull/370) [`70e4fff`](https://github.com/Effect-TS/schema/commit/70e4fff4fdc20ffe03b7c73416fdf286a218fe9c) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data and /io

## 0.31.0

### Minor Changes

- [#366](https://github.com/Effect-TS/schema/pull/366) [`77fffed`](https://github.com/Effect-TS/schema/commit/77fffedf4ffc69ed8e463e06510108351df164b3) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data and /io

## 0.30.4

### Patch Changes

- [#350](https://github.com/Effect-TS/schema/pull/350) [`00f6898`](https://github.com/Effect-TS/schema/commit/00f68980d57ecd5b8bb6568cc7e743530f79191d) Thanks [@vecerek](https://github.com/vecerek)! - Add schema for BigintFromString

- [#359](https://github.com/Effect-TS/schema/pull/359) [`cb00668`](https://github.com/Effect-TS/schema/commit/cb006688e45330eee4dc4321fa2437c1ab9d2f3f) Thanks [@vecerek](https://github.com/vecerek)! - Adds combinator that splits a string into an array of strings

- [#361](https://github.com/Effect-TS/schema/pull/361) [`60affeb`](https://github.com/Effect-TS/schema/commit/60affeb3a304439ca6fb4e5556afe7a6560f8b65) Thanks [@vecerek](https://github.com/vecerek)! - Adds `compose`: a combinator that composes Schema<A, B> with Schema<B, C> into Schema<A, C>.

## 0.30.3

### Patch Changes

- [#357](https://github.com/Effect-TS/schema/pull/357) [`00c2a47`](https://github.com/Effect-TS/schema/commit/00c2a47aae82a975755a90cb14ce27727efcfb21) Thanks [@sukovanej](https://github.com/sukovanej)! - Update /data.

- [#357](https://github.com/Effect-TS/schema/pull/357) [`00c2a47`](https://github.com/Effect-TS/schema/commit/00c2a47aae82a975755a90cb14ce27727efcfb21) Thanks [@sukovanej](https://github.com/sukovanej)! - Add `_id` to `Schema`. Add `isSchema` guard.

## 0.30.2

### Patch Changes

- [#355](https://github.com/Effect-TS/schema/pull/355) [`d6930c1`](https://github.com/Effect-TS/schema/commit/d6930c1a2194afe4700389a65f0d741cc8eed9f1) Thanks [@IMax153](https://github.com/IMax153)! - upgrade to `@effect/data@0.16.1` and `@effect/io@0.35.2`

## 0.30.1

### Patch Changes

- [#346](https://github.com/Effect-TS/schema/pull/346) [`68c58bf`](https://github.com/Effect-TS/schema/commit/68c58bf4de406e4df934eaea17bcff7cf1fffaea) Thanks [@gcanti](https://github.com/gcanti)! - instanceOf: fix annotations

## 0.30.0

### Minor Changes

- [#343](https://github.com/Effect-TS/schema/pull/343) [`6d3c7d9`](https://github.com/Effect-TS/schema/commit/6d3c7d9903e5dab27270736fbb119a44da1e78f0) Thanks [@gcanti](https://github.com/gcanti)! - remove json schema and related types

## 0.29.1

### Patch Changes

- [#341](https://github.com/Effect-TS/schema/pull/341) [`a73a943`](https://github.com/Effect-TS/schema/commit/a73a943e3612ddfc08e591048a83c52c34862b2e) Thanks [@gcanti](https://github.com/gcanti)! - fix trimmed definition, closes #340

## 0.29.0

### Minor Changes

- [#338](https://github.com/Effect-TS/schema/pull/338) [`b2560df`](https://github.com/Effect-TS/schema/commit/b2560dfa3b8bcb0c225aa09e95a43dd1783d1f50) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 0.28.0

### Minor Changes

- [#334](https://github.com/Effect-TS/schema/pull/334) [`5a6d733`](https://github.com/Effect-TS/schema/commit/5a6d733d51999a86dd03789275ab1dc920034ca3) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

## 0.27.0

### Minor Changes

- [#332](https://github.com/Effect-TS/schema/pull/332) [`9f0fa5d`](https://github.com/Effect-TS/schema/commit/9f0fa5df2853cae0de7151d3702320a69b10ac3d) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.26.1

### Patch Changes

- [#329](https://github.com/Effect-TS/schema/pull/329) [`d5da8bf`](https://github.com/Effect-TS/schema/commit/d5da8bf413dde42ed826ab561976f6c460687e95) Thanks [@gcanti](https://github.com/gcanti)! - make getWeight smarter

## 0.26.0

### Minor Changes

- [#324](https://github.com/Effect-TS/schema/pull/324) [`c6749d1`](https://github.com/Effect-TS/schema/commit/c6749d170ca00a8c6849b9c207a4a0d86ca66fce) Thanks [@gcanti](https://github.com/gcanti)! - add pipe method to Schema (and upgrade deps)

## 0.25.0

### Minor Changes

- [#322](https://github.com/Effect-TS/schema/pull/322) [`5f5bcb5`](https://github.com/Effect-TS/schema/commit/5f5bcb5ba62eda9b4454a1f5ffb74d90581459de) Thanks [@tim-smart](https://github.com/tim-smart)! - rename \*Effect parser methods

## 0.24.0

### Minor Changes

- [#318](https://github.com/Effect-TS/schema/pull/318) [`0c6cc97`](https://github.com/Effect-TS/schema/commit/0c6cc978616e7942fa1f2fafcdb8412c96f80b97) Thanks [@vecerek](https://github.com/vecerek)! - Add schema for [ULID](https://github.com/ulid/spec)

- [#321](https://github.com/Effect-TS/schema/pull/321) [`7f0e5bd`](https://github.com/Effect-TS/schema/commit/7f0e5bdaa9e2a92847cea98db77f39ecb1ee5afe) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest versions

### Patch Changes

- [#320](https://github.com/Effect-TS/schema/pull/320) [`8f09893`](https://github.com/Effect-TS/schema/commit/8f09893fcbfee209081a6e78246b08be8b3891f0) Thanks [@gcanti](https://github.com/gcanti)! - UUID: add title annotation

## 0.23.0

### Minor Changes

- [#316](https://github.com/Effect-TS/schema/pull/316) [`7c9e0ae`](https://github.com/Effect-TS/schema/commit/7c9e0ae48d01ff687e93992ecfbc86fed2e803cd) Thanks [@gcanti](https://github.com/gcanti)! - update effect/io

## 0.22.0

### Minor Changes

- [#314](https://github.com/Effect-TS/schema/pull/314) [`81f2529`](https://github.com/Effect-TS/schema/commit/81f2529e71da2b8dcd00c903ff72fbabbe346fca) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest deps

## 0.21.1

### Patch Changes

- [#312](https://github.com/Effect-TS/schema/pull/312) [`217a3ba`](https://github.com/Effect-TS/schema/commit/217a3ba9807dcdc71b5ab5a7b8bf6bac76c9a7be) Thanks [@gcanti](https://github.com/gcanti)! - struct should allow a "constructor" field name

## 0.21.0

### Minor Changes

- [#310](https://github.com/Effect-TS/schema/pull/310) [`10f8457`](https://github.com/Effect-TS/schema/commit/10f845702fb5017ec1635214c0f995c2da4f3188) Thanks [@sukovanej](https://github.com/sukovanej)! - Update /data and /io.

## 0.20.3

### Patch Changes

- [#307](https://github.com/Effect-TS/schema/pull/307) [`a325816`](https://github.com/Effect-TS/schema/commit/a32581607fc3941825a8d09fb4a70a04ea37e97d) Thanks [@gcanti](https://github.com/gcanti)! - extend should support transformations as both operands

## 0.20.2

### Patch Changes

- [#303](https://github.com/Effect-TS/schema/pull/303) [`0f70b22`](https://github.com/Effect-TS/schema/commit/0f70b22f9d0e6643a2c87a994f18ed4dd7775eda) Thanks [@sukovanej](https://github.com/sukovanej)! - Update @effect/data and fast-check.

## 0.20.1

### Patch Changes

- [#297](https://github.com/Effect-TS/schema/pull/297) [`8bfddc3`](https://github.com/Effect-TS/schema/commit/8bfddc3c45a1a2bf2d1470c40569f165a2ed9ff4) Thanks [@gcanti](https://github.com/gcanti)! - numberFromString should use `Number` instead of `parseFloat`

## 0.20.0

### Minor Changes

- [#292](https://github.com/Effect-TS/schema/pull/292) [`bd33211`](https://github.com/Effect-TS/schema/commit/bd33211772d8c10cd557045a8161a8fa571948f7) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest /io

## 0.19.3

### Patch Changes

- [#285](https://github.com/Effect-TS/schema/pull/285) [`39d3c55`](https://github.com/Effect-TS/schema/commit/39d3c55e77463169ce3ea6071f656c03c0fff393) Thanks [@gcanti](https://github.com/gcanti)! - AST: memoize createLazy

- [#285](https://github.com/Effect-TS/schema/pull/285) [`39d3c55`](https://github.com/Effect-TS/schema/commit/39d3c55e77463169ce3ea6071f656c03c0fff393) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: fix maximum call stack size exceeded when producing nested arrays and records that are too deep

## 0.19.2

### Patch Changes

- [#282](https://github.com/Effect-TS/schema/pull/282) [`9b9c3ee`](https://github.com/Effect-TS/schema/commit/9b9c3ee9d27c20a5bcb422f6d8ec3f46b648409a) Thanks [@gcanti](https://github.com/gcanti)! - handle excess properties for records

## 0.19.1

### Patch Changes

- [#280](https://github.com/Effect-TS/schema/pull/280) [`ec375dd`](https://github.com/Effect-TS/schema/commit/ec375dd23c061fedca370f73096cae9fba4b0cc1) Thanks [@gcanti](https://github.com/gcanti)! - Json should exclude NaN, +Infinity, -Infinity

## 0.19.0

### Minor Changes

- [#277](https://github.com/Effect-TS/schema/pull/277) [`1ac3d06`](https://github.com/Effect-TS/schema/commit/1ac3d06c90dc952b0beff9a722cfaace5162bb21) Thanks [@gcanti](https://github.com/gcanti)! - remove undefined from optionFromNullable

## 0.18.0

### Minor Changes

- [#274](https://github.com/Effect-TS/schema/pull/274) [`eae1614`](https://github.com/Effect-TS/schema/commit/eae16146096c42dabce8b06e28c9173f71924238) Thanks [@gcanti](https://github.com/gcanti)! - remove Schema.reverse API

- [#274](https://github.com/Effect-TS/schema/pull/274) [`eae1614`](https://github.com/Effect-TS/schema/commit/eae16146096c42dabce8b06e28c9173f71924238) Thanks [@gcanti](https://github.com/gcanti)! - remove getPropertySignatures API

- [#274](https://github.com/Effect-TS/schema/pull/274) [`eae1614`](https://github.com/Effect-TS/schema/commit/eae16146096c42dabce8b06e28c9173f71924238) Thanks [@gcanti](https://github.com/gcanti)! - rename AST.getTo -> to, AST.getFrom -> from

- [#274](https://github.com/Effect-TS/schema/pull/274) [`eae1614`](https://github.com/Effect-TS/schema/commit/eae16146096c42dabce8b06e28c9173f71924238) Thanks [@gcanti](https://github.com/gcanti)! - remove AST.reverse API

## 0.17.5

### Patch Changes

- [#272](https://github.com/Effect-TS/schema/pull/272) [`d91a7a7`](https://github.com/Effect-TS/schema/commit/d91a7a72eb4ca28633d2b9cfc3afdd07afadd98b) Thanks [@gcanti](https://github.com/gcanti)! - pick / omit: add support for structs with property signature transformations

## 0.17.4

### Patch Changes

- [#267](https://github.com/Effect-TS/schema/pull/267) [`8369823`](https://github.com/Effect-TS/schema/commit/83698237ee5098cfa4c04757b29cd9c8c71966c2) Thanks [@gcanti](https://github.com/gcanti)! - make extend dual

## 0.17.3

### Patch Changes

- [#264](https://github.com/Effect-TS/schema/pull/264) [`4488c09`](https://github.com/Effect-TS/schema/commit/4488c0933c3286aa99a4e18aa071fab18a582ad1) Thanks [@gcanti](https://github.com/gcanti)! - add arbitrary to AnnotationOptions

## 0.17.2

### Patch Changes

- [#258](https://github.com/Effect-TS/schema/pull/258) [`1b65e53`](https://github.com/Effect-TS/schema/commit/1b65e5348c7a93b2294e3429b4eddc78d054052e) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Try publishing again

## 0.17.1

### Patch Changes

- [#256](https://github.com/Effect-TS/schema/pull/256) [`162e099`](https://github.com/Effect-TS/schema/commit/162e099b33d6092eca2a14f8a1c1c73a72621361) Thanks [@gcanti](https://github.com/gcanti)! - leverage annotations (e.g. maxLength, int, between) to improve fast-check performance

## 0.17.0

### Minor Changes

- [#254](https://github.com/Effect-TS/schema/pull/254) [`32e987a`](https://github.com/Effect-TS/schema/commit/32e987a8a82c0770def55835b3253e8e62017241) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update effect/io, make parsing fields of records and tuples parallel

## 0.16.0

### Minor Changes

- [#249](https://github.com/Effect-TS/schema/pull/249) [`ccee34e`](https://github.com/Effect-TS/schema/commit/ccee34ef87e9f0879ec674feaac1854ecb327614) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest effect/io

## 0.15.0

### Minor Changes

- [#247](https://github.com/Effect-TS/schema/pull/247) [`28c7484`](https://github.com/Effect-TS/schema/commit/28c7484c53976657b84e72a1a4573d85920ba38d) Thanks [@gcanti](https://github.com/gcanti)! - update to latest @effect/io

- [#247](https://github.com/Effect-TS/schema/pull/247) [`28c7484`](https://github.com/Effect-TS/schema/commit/28c7484c53976657b84e72a1a4573d85920ba38d) Thanks [@gcanti](https://github.com/gcanti)! - refactor optional APIs (Default values and Optional fields as `Option`s)

## 0.14.1

### Patch Changes

- [#245](https://github.com/Effect-TS/schema/pull/245) [`6a7d7be`](https://github.com/Effect-TS/schema/commit/6a7d7be5a94139846e32d26667a24c662a306f84) Thanks [@gcanti](https://github.com/gcanti)! - add `never` handling to struct API

## 0.14.0

### Minor Changes

- [#238](https://github.com/Effect-TS/schema/pull/238) [`f4ce344`](https://github.com/Effect-TS/schema/commit/f4ce34472bb8a4371826c1bd4c310c50e7b1cd4e) Thanks [@sukovanej](https://github.com/sukovanej)! - update @effect/io dependency

- [#239](https://github.com/Effect-TS/schema/pull/239) [`58be561`](https://github.com/Effect-TS/schema/commit/58be5617395c7c77ff8bdbb2058524c4439ebdbd) Thanks [@gcanti](https://github.com/gcanti)! - refactor optional

- [#239](https://github.com/Effect-TS/schema/pull/239) [`58be561`](https://github.com/Effect-TS/schema/commit/58be5617395c7c77ff8bdbb2058524c4439ebdbd) Thanks [@gcanti](https://github.com/gcanti)! - rename date to DateFromSelf

- [#240](https://github.com/Effect-TS/schema/pull/240) [`87cb2f4`](https://github.com/Effect-TS/schema/commit/87cb2f4793824e478175b020775346d3d8342713) Thanks [@gcanti](https://github.com/gcanti)! - rename date to Date

- [#243](https://github.com/Effect-TS/schema/pull/243) [`87382ae`](https://github.com/Effect-TS/schema/commit/87382ae472f2b2f437dd8abf80caa04421e223ba) Thanks [@gcanti](https://github.com/gcanti)! - narrow down IndexSignature type

- [#239](https://github.com/Effect-TS/schema/pull/239) [`58be561`](https://github.com/Effect-TS/schema/commit/58be5617395c7c77ff8bdbb2058524c4439ebdbd) Thanks [@gcanti](https://github.com/gcanti)! - rename DateFromString to date

### Patch Changes

- [#243](https://github.com/Effect-TS/schema/pull/243) [`87382ae`](https://github.com/Effect-TS/schema/commit/87382ae472f2b2f437dd8abf80caa04421e223ba) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: should throw on effectful refinements

- [#231](https://github.com/Effect-TS/schema/pull/231) [`2c2d749`](https://github.com/Effect-TS/schema/commit/2c2d7497c61e7a0f8704947d22a27e43059fe8da) Thanks [@tim-smart](https://github.com/tim-smart)! - add isValidDate filter

- [#217](https://github.com/Effect-TS/schema/pull/217) [`7911525`](https://github.com/Effect-TS/schema/commit/7911525f756e64c1c75fa7820489af1a9dbe0e4d) Thanks [@jessekelly881](https://github.com/jessekelly881)! - data/Boolean: added S.not transform

- [#243](https://github.com/Effect-TS/schema/pull/243) [`87382ae`](https://github.com/Effect-TS/schema/commit/87382ae472f2b2f437dd8abf80caa04421e223ba) Thanks [@gcanti](https://github.com/gcanti)! - createRecord: should throw on unsupported literals

- [#237](https://github.com/Effect-TS/schema/pull/237) [`2a911ef`](https://github.com/Effect-TS/schema/commit/2a911ef56abf5193a3f7f8b8c9d3f1d6fd9c920c) Thanks [@gcanti](https://github.com/gcanti)! - export ValidDateFromSelf and rename validDate filter

## 0.13.1

### Patch Changes

- [#234](https://github.com/Effect-TS/schema/pull/234) [`9ed0ee2`](https://github.com/Effect-TS/schema/commit/9ed0ee25d0287ca72a2584278bab67643d332009) Thanks [@gcanti](https://github.com/gcanti)! - attachPropertySignature as PropertySignatureTransformation

## 0.13.0

### Minor Changes

- [#232](https://github.com/Effect-TS/schema/pull/232) [`49ebaba`](https://github.com/Effect-TS/schema/commit/49ebabae7a8b2194f021670d65a227f9ef39e139) Thanks [@gcanti](https://github.com/gcanti)! - update to latest effect/io

- [#232](https://github.com/Effect-TS/schema/pull/232) [`49ebaba`](https://github.com/Effect-TS/schema/commit/49ebabae7a8b2194f021670d65a227f9ef39e139) Thanks [@gcanti](https://github.com/gcanti)! - rename OptionalSchema to PropertySignature

- [#232](https://github.com/Effect-TS/schema/pull/232) [`49ebaba`](https://github.com/Effect-TS/schema/commit/49ebabae7a8b2194f021670d65a227f9ef39e139) Thanks [@gcanti](https://github.com/gcanti)! - simplify keyof and getPropertySignatures implementations

- [#232](https://github.com/Effect-TS/schema/pull/232) [`49ebaba`](https://github.com/Effect-TS/schema/commit/49ebabae7a8b2194f021670d65a227f9ef39e139) Thanks [@gcanti](https://github.com/gcanti)! - remove optionsFromOptionals API

## 0.12.1

### Patch Changes

- [#229](https://github.com/Effect-TS/schema/pull/229) [`3ab5df0`](https://github.com/Effect-TS/schema/commit/3ab5df06f8d8b85e94f8f597569c27f8abc6cc00) Thanks [@gcanti](https://github.com/gcanti)! - add missing Forbidden handling

## 0.12.0

### Minor Changes

- [#227](https://github.com/Effect-TS/schema/pull/227) [`8ae866d`](https://github.com/Effect-TS/schema/commit/8ae866d3e767b9654901dc9564136159adacbd4d) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest deps

## 0.11.1

### Patch Changes

- [#224](https://github.com/Effect-TS/schema/pull/224) [`6bf7243`](https://github.com/Effect-TS/schema/commit/6bf72435faa12a74c630a2e20792d18b36c471d1) Thanks [@gcanti](https://github.com/gcanti)! - move missing keys checks to improve perfs

## 0.11.0

### Minor Changes

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - rename isEnum to isEnums

- [#215](https://github.com/Effect-TS/schema/pull/215) [`b47e8ab`](https://github.com/Effect-TS/schema/commit/b47e8ab2e66e90963787e51f6af1d47b46a93ade) Thanks [@tsteckenborn](https://github.com/tsteckenborn)! - aligns usage of dateFromString with numberFromString

- [#221](https://github.com/Effect-TS/schema/pull/221) [`0e3eabd`](https://github.com/Effect-TS/schema/commit/0e3eabd427ba05ef03eaab0c0a7c3d3b5ff83ece) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to effect/io 0.18.0

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - refactor Refinement AST

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - remove hasTransformation optimisations

- [#223](https://github.com/Effect-TS/schema/pull/223) [`6cc1a56`](https://github.com/Effect-TS/schema/commit/6cc1a56e5b4c0e08d6e13f57742f67758ffe0180) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest /data and /io

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - keyof cannot handle refinements nor transformations

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - fix transformation signatures

### Patch Changes

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - cannot build an Arbitrary for transformations

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - fix AST.getTo implementation for Transform

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - export NumberFromString schema

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - export Trim schema

- [#218](https://github.com/Effect-TS/schema/pull/218) [`c6c96a4`](https://github.com/Effect-TS/schema/commit/c6c96a4bada0ac54a028fd5319fdcf345b4362ec) Thanks [@OlaoluwaM](https://github.com/OlaoluwaM)! - Added missing assertion functions for some AST nodes

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - export DateFromString schema

## 0.10.0

### Minor Changes

- [#211](https://github.com/Effect-TS/schema/pull/211) [`45c322b`](https://github.com/Effect-TS/schema/commit/45c322b455dd06a7eb55a5d03533fbac3575d57f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update effect/data and effect/io

## 0.9.1

### Patch Changes

- [#209](https://github.com/Effect-TS/schema/pull/209) [`5affbf6`](https://github.com/Effect-TS/schema/commit/5affbf63671a3d16702fd67d1db36b65d031c17b) Thanks [@gcanti](https://github.com/gcanti)! - fix Spread definition

## 0.9.0

### Minor Changes

- [#206](https://github.com/Effect-TS/schema/pull/206) [`39da1cb`](https://github.com/Effect-TS/schema/commit/39da1cb794d7218674c14542d2c3b3a8f386d03b) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update effect/data and effect/io

## 0.8.3

### Patch Changes

- [#204](https://github.com/Effect-TS/schema/pull/204) [`c40237c`](https://github.com/Effect-TS/schema/commit/c40237cde61597272b376dcb3e784d72867c9c60) Thanks [@gcanti](https://github.com/gcanti)! - remove Spread from filter return type

## 0.8.2

### Patch Changes

- [#201](https://github.com/Effect-TS/schema/pull/201) [`5aa2d78`](https://github.com/Effect-TS/schema/commit/5aa2d78a527cbc488b7f330d1ad7afd3fb177127) Thanks [@gcanti](https://github.com/gcanti)! - cannot compute property signatures for refinements

- [#202](https://github.com/Effect-TS/schema/pull/202) [`6f51084`](https://github.com/Effect-TS/schema/commit/6f5108459534ba4c33ae54a79e4b2a1e06ad9af0) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add support for never to From / To utility types

## 0.8.1

### Patch Changes

- [#199](https://github.com/Effect-TS/schema/pull/199) [`143a6a4`](https://github.com/Effect-TS/schema/commit/143a6a49f011bd5d46d15b9431c7f4e8daeacc79) Thanks [@gcanti](https://github.com/gcanti)! - improve filter signature

## 0.8.0

### Minor Changes

- [#197](https://github.com/Effect-TS/schema/pull/197) [`4f1b043`](https://github.com/Effect-TS/schema/commit/4f1b04325e9821b43920aeb858f8614573b88eb7) Thanks [@gcanti](https://github.com/gcanti)! - update to latest deps

- [#196](https://github.com/Effect-TS/schema/pull/196) [`96e5bf5`](https://github.com/Effect-TS/schema/commit/96e5bf519c91da759290aeaf21d7de1b951afe5c) Thanks [@gcanti](https://github.com/gcanti)! - tuples should always fail on excess indexes

- [#196](https://github.com/Effect-TS/schema/pull/196) [`96e5bf5`](https://github.com/Effect-TS/schema/commit/96e5bf519c91da759290aeaf21d7de1b951afe5c) Thanks [@gcanti](https://github.com/gcanti)! - refactor ParseOptions, closes #163

### Patch Changes

- [#173](https://github.com/Effect-TS/schema/pull/173) [`4090099`](https://github.com/Effect-TS/schema/commit/4090099799b4cea4ad633d83323e32d95c8be86a) Thanks [@jessekelly881](https://github.com/jessekelly881)! - Schema: added S.required

## 0.7.1

### Patch Changes

- [#190](https://github.com/Effect-TS/schema/pull/190) [`c52da9a`](https://github.com/Effect-TS/schema/commit/c52da9a6b2d249e2c823bbe8f4f7aaa51bd975a3) Thanks [@gcanti](https://github.com/gcanti)! - struct({}) should go in last position in a union

## 0.7.0

### Minor Changes

- [#188](https://github.com/Effect-TS/schema/pull/188) [`bb31acb`](https://github.com/Effect-TS/schema/commit/bb31acbfad0bd994914937bcd9da44fe0990df9a) Thanks [@gcanti](https://github.com/gcanti)! - getPropertySignatures: cannot compute property signatures for transformations

- [#188](https://github.com/Effect-TS/schema/pull/188) [`bb31acb`](https://github.com/Effect-TS/schema/commit/bb31acbfad0bd994914937bcd9da44fe0990df9a) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest @effect/data @effect/io

- [#188](https://github.com/Effect-TS/schema/pull/188) [`bb31acb`](https://github.com/Effect-TS/schema/commit/bb31acbfad0bd994914937bcd9da44fe0990df9a) Thanks [@gcanti](https://github.com/gcanti)! - `partial` cannot handle refinement or transformations

## 0.6.0

### Minor Changes

- [#180](https://github.com/Effect-TS/schema/pull/180) [`25cbf46`](https://github.com/Effect-TS/schema/commit/25cbf46d62f97981534ec5c384618bc6b7af43b2) Thanks [@gcanti](https://github.com/gcanti)! - Allow symbols in Brand

### Patch Changes

- [#184](https://github.com/Effect-TS/schema/pull/184) [`b0b6423`](https://github.com/Effect-TS/schema/commit/b0b6423ae9368de246a6c0982cad8c4bbcbab2da) Thanks [@gcanti](https://github.com/gcanti)! - make optionsFromOptionals composable

- [#182](https://github.com/Effect-TS/schema/pull/182) [`f7899b7`](https://github.com/Effect-TS/schema/commit/f7899b7cbe930c133e1f764b4722df46998dfc07) Thanks [@gcanti](https://github.com/gcanti)! - optionsFromOptionals: ensure non overlapping property signatures

- [#181](https://github.com/Effect-TS/schema/pull/181) [`0062b25`](https://github.com/Effect-TS/schema/commit/0062b251cd20e4a29d75aca2287b0206c6e302a7) Thanks [@gcanti](https://github.com/gcanti)! - fix optionsFromOptionals implementation

## 0.5.0

### Minor Changes

- [#178](https://github.com/Effect-TS/schema/pull/178) [`f60341f`](https://github.com/Effect-TS/schema/commit/f60341f1c626145455c3ccd89c34b42905853bb5) Thanks [@gcanti](https://github.com/gcanti)! - merge transformEither and transformEffect into transformResult

## 0.4.0

### Minor Changes

- [#174](https://github.com/Effect-TS/schema/pull/174) [`c3a1230`](https://github.com/Effect-TS/schema/commit/c3a1230d9bd42b5779f8986e48571735b666b7a9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Only run effects when allowed

### Patch Changes

- [#172](https://github.com/Effect-TS/schema/pull/172) [`6277f5a`](https://github.com/Effect-TS/schema/commit/6277f5ac91422a3fe9584b80a184ebecc92ad610) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Optimize ParseResult conditional functions

- [#176](https://github.com/Effect-TS/schema/pull/176) [`dbb0a59`](https://github.com/Effect-TS/schema/commit/dbb0a5976bbf16e89006d435bed44cd671168215) Thanks [@gcanti](https://github.com/gcanti)! - Optimize internal validations

## 0.3.1

### Patch Changes

- [#169](https://github.com/Effect-TS/schema/pull/169) [`6b0a45f`](https://github.com/Effect-TS/schema/commit/6b0a45f5fb33bbc9db7175573544903ab65d2e07) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add back missing commits from wrong rebase.

## 0.3.0

### Minor Changes

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - AST: remove isReversed from Transform

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - make ParseError tagged

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - ParseResult: add optional message to Type error

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - remove useless options argument from is

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Integrate Effect into Parser

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - simplify dateFromString

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Schema: add reverse API

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - rename decodeFromInput to decode and decode to parse

### Patch Changes

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - add parse, parseOption, parseEither

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - fix trim, clamp, clampBigint definition

## 0.2.1

### Patch Changes

- [#155](https://github.com/Effect-TS/schema/pull/155) [`0b86081`](https://github.com/Effect-TS/schema/commit/0b860818820d9b22ca17946175379c2334ec6a5a) Thanks [@gcanti](https://github.com/gcanti)! - fix attachPropertySignature bug ref #153

## 0.2.0

### Minor Changes

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename encodeOrThrow -> encode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - AST: rename typeAlis to Declaration

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename `transformOrFail` to `transformEither`

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename encode -> encodeEither

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - AST: change Refinement definition form predicate to decode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - move /formatter/Tree up and rename to TreeFormatter

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /annotation/Hook module

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - refactor instanceOf as Declaration

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename decodeOrThrow -> decode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - AST: refactor typeAlias adding decode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename getOption -> decodeOption

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /data folder

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /annotation/AST module

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /index module

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename decode -> decodeEither

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - formatErrors/ should collapse trees that have a branching factor of 1

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - simplify Arbitrary implementation

### Patch Changes

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - add validate, validateOption, validateEither

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - add encodeOption

## 0.1.0

### Minor Changes

- [#145](https://github.com/Effect-TS/schema/pull/145) [`cc05ffe`](https://github.com/Effect-TS/schema/commit/cc05ffea0f9844b58e7d3bf2e05fed6f827679e7) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data to 0.4.1

### Patch Changes

- [#142](https://github.com/Effect-TS/schema/pull/142) [`bc30196`](https://github.com/Effect-TS/schema/commit/bc3019642d1c0620d82de9462d8dbd134a58c59f) Thanks [@gcanti](https://github.com/gcanti)! - add /data/Option/parseOptionals

## 0.0.5

### Patch Changes

- [#131](https://github.com/Effect-TS/schema/pull/131) [`d07b0f1`](https://github.com/Effect-TS/schema/commit/d07b0f1945d2153610e4ca2572113758af950de3) Thanks [@gcanti](https://github.com/gcanti)! - Pretty: use formatActual as default formatter

- [#134](https://github.com/Effect-TS/schema/pull/134) [`c935ff2`](https://github.com/Effect-TS/schema/commit/c935ff20d415c0baae92e113f64ac0cbb77f7d11) Thanks [@gcanti](https://github.com/gcanti)! - add BrandSchema, getOption

## 0.0.4

### Patch Changes

- [#115](https://github.com/Effect-TS/schema/pull/115) [`1555a81`](https://github.com/Effect-TS/schema/commit/1555a81fb814f612f7ad973add6e29c68f5635dc) Thanks [@gcanti](https://github.com/gcanti)! - Optimize decoding of unions using a heuristic based on literals

## 0.0.3

### Patch Changes

- [#127](https://github.com/Effect-TS/schema/pull/127) [`fd87ac6`](https://github.com/Effect-TS/schema/commit/fd87ac600e98b60da8de6d5792727e2ec8acb6dc) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix release for github

## 0.0.2

### Patch Changes

- [#125](https://github.com/Effect-TS/schema/pull/125) [`41841a3`](https://github.com/Effect-TS/schema/commit/41841a379a97a80e298312d23a1985cc31336834) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - update release

## 0.0.1

### Patch Changes

- [#119](https://github.com/Effect-TS/schema/pull/119) [`62ed1b0`](https://github.com/Effect-TS/schema/commit/62ed1b0b5e7a3e91c62a40f258dbe185a8354b20) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Move to the @effect org

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - refactor custom types

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - move parseNumber to /data/Number

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest effect/data

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - /data/Option rename fromNullable to parseNullable

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - move parseDate to /data/Date

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - refactor instanceOf (to a constructor)

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - Added clamp transform to Number and Bigint
