---
"@effect/schema": minor
---

Changed casing from `Bigint` to `BigInt` in various schema filters & constructors.

Filters:
- `greaterThanBigint` => `greaterThanBigInt`
- `greaterThanOrEqualToBigint` => `greaterThanOrEqualToBigInt`
- `lessThanBigint` => `lessThanBigInt`
- `lessThanOrEqualToBigint` => `lessThanOrEqualToBigInt`
- `betweenBigint` => `betweenBigInt`
- `positiveBigint` => `positiveBigInt`
- `negativeBigint` => `negativeBigInt`
- `nonNegativeBigint` => `nonNegativeBigInt`
- `nonPositiveBigint` => `nonPositiveBigInt`
- `clampBigint` => `clampBigInt`

Constructors:
- `PositiveBigintFromSelf` => `PositiveBigIntFromSelf`
- `PositiveBigint` => `PositiveBigInt`
- `NegativeBigintFromSelf` => `NegativeBigIntFromSelf`
- `NegativeBigint` => `NegativeBigInt`
- `NonPositiveBigintFromSelf` => `NonPositiveBigIntFromSelf`
- `NonPositiveBigint` => `NonPositiveBigInt`
- `NonNegativeBigintFromSelf` => `NonNegativeBigIntFromSelf`
- `BigintFromNumber` => `BigIntFromNumber`
