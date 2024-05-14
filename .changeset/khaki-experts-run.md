---
"@effect/schema": patch
---

`Schema.optional`: the `default` option now allows setting a default value for **both** the decoding phase and the default constructor. Previously, it only set the decoding default. Closes #2740.

**Example**

```ts
import { Schema } from "@effect/schema"

const Product = Schema.Struct({
  name: Schema.String,
  price: Schema.NumberFromString,
  quantity: Schema.optional(Schema.NumberFromString, { default: () => 1 })
})

// Applying defaults in the decoding phase
console.log(Schema.decodeUnknownSync(Product)({ name: "Laptop", price: "999" })) // { name: 'Laptop', price: 999, quantity: 1 }
console.log(
  Schema.decodeUnknownSync(Product)({
    name: "Laptop",
    price: "999",
    quantity: "2"
  })
) // { name: 'Laptop', price: 999, quantity: 2 }

// Applying defaults in the constructor
console.log(Product.make({ name: "Laptop", price: 999 })) // { name: 'Laptop', price: 999, quantity: 1 }
console.log(Product.make({ name: "Laptop", price: 999, quantity: 2 })) // { name: 'Laptop', price: 999, quantity: 2 }
```
