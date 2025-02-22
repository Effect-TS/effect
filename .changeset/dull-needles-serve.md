---
"effect": patch
---

Schema: more precise return types when filters are involved.

**Example** (with `Schema.maxLength`)

Before

```ts
import { Schema } from "effect"

//      ┌─── Schema.filter<Schema.Schema<string, string, never>>
//      ▼
const schema = Schema.String.pipe(Schema.maxLength(10))

// Schema<string, string, never>
schema.from
```

After

```ts
import { Schema } from "effect"

//      ┌─── Schema.filter<typeof Schema.String>
//      ▼
const schema = Schema.String.pipe(Schema.maxLength(10))

// typeof Schema.String
schema.from
```

String filters:

- `maxLength`
- `minLength`
- `length`
- `pattern`
- `startsWith`
- `endsWith`
- `includes`
- `lowercased`
- `capitalized`
- `uncapitalized`
- `uppercased`
- `nonEmptyString`
- `trimmed`

Number filters:

- `finite`
- `greaterThan`
- `greaterThanOrEqualTo`
- `lessThan`
- `lessThanOrEqualTo`
- `int`
- `multipleOf`
- `between`
- `nonNaN`
- `positive`
- `negative`
- `nonPositive`
- `nonNegative`

BigInt filters:

- `greaterThanBigInt`
- `greaterThanOrEqualToBigInt`
- `lessThanBigInt`
- `lessThanOrEqualToBigInt`
- `betweenBigInt`
- `positiveBigInt`
- `negativeBigInt`
- `nonNegativeBigInt`
- `nonPositiveBigInt`

Duration filters:

- `lessThanDuration`
- `lessThanOrEqualToDuration`
- `greaterThanDuration`
- `greaterThanOrEqualToDuration`
- `betweenDuration`

Array filters:

- `minItems`
- `maxItems`
- `itemsCount`

Date filters:

- `validDate`
- `lessThanDate`
- `lessThanOrEqualToDate`
- `greaterThanDate`
- `greaterThanOrEqualToDate`
- `betweenDate`

BigDecimal filters:

- `greaterThanBigDecimal`
- `greaterThanOrEqualToBigDecimal`
- `lessThanBigDecimal`
- `lessThanOrEqualToBigDecimal`
- `positiveBigDecimal`
- `nonNegativeBigDecimal`
- `negativeBigDecimal`
- `nonPositiveBigDecimal`
- `betweenBigDecimal`
