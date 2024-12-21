---
"effect": patch
---

Schema: refactor annotations:

- Export internal `Uint8` schema
- Export internal `NonNegativeInt` schema
- Remove title annotations that are identical to identifiers
- Avoid setting a title annotation when applying branding
- Add more title annotations to refinements
- Improve `toString` output and provide more precise error messages for refinements:

  Before

  ```ts
  import { Schema } from "effect"

  const schema = Schema.Number.pipe(
    Schema.int({ identifier: "MyInt" }),
    Schema.positive()
  )

  console.log(String(schema))
  // Output: a positive number

  Schema.decodeUnknownSync(schema)(1.1)
  /*
  throws:
  ParseError: a positive number
  └─ From side refinement failure
    └─ MyInt
        └─ Predicate refinement failure
          └─ Expected MyInt, actual 1.1
  */
  ```

  After

  - `toString` now combines all refinements with `" & "` instead of showing only the last one.
  - The last message (`"Expected ..."`) now uses the extended description to make the error message clearer.

  ```ts
  import { Schema } from "effect"

  const schema = Schema.Number.pipe(
    Schema.int({ identifier: "MyInt" }),
    Schema.positive()
  )

  console.log(String(schema))
  // Output: MyInt & positive // <= all the refinements

  Schema.decodeUnknownSync(schema)(1.1)
  /*
  throws:
  ParseError: MyInt & positive
  └─ From side refinement failure
    └─ MyInt
        └─ Predicate refinement failure
          └─ Expected an integer, actual 1.1 // <= extended description
  */
  ```
