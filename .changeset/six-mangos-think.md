---
"effect": patch
---

Schema: Update `Duration` Encoding to a Tagged Union Format.

This changeset fixes the `Duration` schema to support all possible duration types, including finite, infinite, and nanosecond durations. The encoding format has been updated from a tuple (`readonly [seconds: number, nanos: number]`) to a tagged union.

This update introduces a change to the encoding format. The previous tuple representation is replaced with a more expressive tagged union, which accommodates all duration types:

```ts
type DurationEncoded =
  | {
      readonly _tag: "Millis"
      readonly millis: number
    }
  | {
      readonly _tag: "Nanos"
      readonly nanos: string
    }
  | {
      readonly _tag: "Infinity"
    }
```

**Rationale**

The `Duration` schema is primarily used to encode durations for transmission. The new tagged union format ensures clear and precise encoding for:

- Finite durations, such as milliseconds.
- Infinite durations, such as `Duration.infinity`.
- Nanosecond durations.

**Example**

```ts
import { Duration, Schema } from "effect"

// Encoding a finite duration in milliseconds
console.log(Schema.encodeSync(Schema.Duration)(Duration.millis(1000)))
// Output: { _tag: 'Millis', millis: 1000 }

// Encoding an infinite duration
console.log(Schema.encodeSync(Schema.Duration)(Duration.infinity))
// Output: { _tag: 'Infinity' }

// Encoding a duration in nanoseconds
console.log(Schema.encodeSync(Schema.Duration)(Duration.nanos(1000n)))
// Output: { _tag: 'Nanos', nanos: '1000' }
```
