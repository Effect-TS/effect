---
"@effect/schema": patch
---

Add `tag` and `TaggedStruct` constructors.

In TypeScript tags help to enhance type discrimination and pattern matching by providing a simple yet powerful way to define and recognize different data types.

**What is a Tag?**

A tag is a literal value added to data structures, commonly used in structs, to distinguish between various object types or variants within tagged unions. This literal acts as a discriminator, making it easier to handle and process different types of data correctly and efficiently.

**Using the `tag` Constructor**

The `tag` constructor is specifically designed to create a property signature that holds a specific literal value, serving as the discriminator for object types. Here's how you can define a schema with a tag:

```ts
import { Schema } from "@effect/schema"

const User = Schema.Struct({
  _tag: Schema.tag("User"),
  name: Schema.String,
  age: Schema.Number
})

assert.deepStrictEqual(User.make({ name: "John", age: 44 }), {
  _tag: "User",
  name: "John",
  age: 44
})
```

In the example above, `Schema.tag("User")` attaches a `_tag` property to the `User` struct schema, effectively labeling objects of this struct type as "User". This label is automatically applied when using the `make` method to create new instances, simplifying object creation and ensuring consistent tagging.

**Simplifying Tagged Structs with `TaggedStruct`**

The `TaggedStruct` constructor streamlines the process of creating tagged structs by directly integrating the tag into the struct definition. This method provides a clearer and more declarative approach to building data structures with embedded discriminators.

```ts
import { Schema } from "@effect/schema"

const User = Schema.TaggedStruct("User", {
  name: Schema.String,
  age: Schema.Number
})

// `_tag` is optional
const userInstance = User.make({ name: "John", age: 44 })

assert.deepStrictEqual(userInstance, {
  _tag: "User",
  name: "John",
  age: 44
})
```

**Multiple Tags**

While a primary tag is often sufficient, TypeScript allows you to define multiple tags for more complex data structuring needs. Here's an example demonstrating the use of multiple tags within a single struct:

```ts
import { Schema } from "@effect/schema"

const Product = Schema.TaggedStruct("Product", {
  category: Schema.tag("Electronics"),
  name: Schema.String,
  price: Schema.Number
})

// `_tag` and `category` are optional
const productInstance = Product.make({ name: "Smartphone", price: 999 })

assert.deepStrictEqual(productInstance, {
  _tag: "Product",
  category: "Electronics",
  name: "Smartphone",
  price: 999
})
```

This example showcases a product schema that not only categorizes each product under a general tag (`"Product"`) but also specifies a category tag (`"Electronics"`), enhancing the clarity and specificity of the data model.
