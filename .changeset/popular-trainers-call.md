---
"effect": patch
---

Schema: refactor annotations:

- export internal `Uint8` schema
- export internal `NonNegativeInt` schema
- Remove title annotations that are identical to identifiers
- Avoid setting a title annotation when applying branding
- Add more title annotations to refinements
- Improve `toString` output and provide more precise error messages for refinements:

  Before

  ```ts
  import { Schema } from "effect"

  const schema = Schema.Number.pipe(Schema.int(), Schema.positive())

  console.log(String(schema))
  // Output: a positive number

  Schema.decodeUnknownSync(schema)(1.1)
  /*
  throws:
  ParseError: a positive number
  └─ From side refinement failure
    └─ integer
        └─ Predicate refinement failure
          └─ Expected integer, actual 1.1
  */
  ```

  After

  ```ts
  import { Schema } from "effect"

  const schema = Schema.Number.pipe(Schema.int(), Schema.positive())

  console.log(String(schema))
  // Output: int & positive

  Schema.decodeUnknownSync(schema)(1.1)
  /*
  throws:
  ParseError: int & positive
  └─ From side refinement failure
    └─ int
        └─ Predicate refinement failure
          └─ Expected an integer, actual 1.1
  */
  ```
