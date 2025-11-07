---
"@effect/cli": minor
---

Add withConditionalBehavior combinator for composable conditional command behaviors

Introduces a new `withConditionalBehavior` combinator that allows wrapping commands with conditional behaviors based on CLI arguments. This composable approach replaces the need for separate `runWith*` methods and can be used for wizard mode, help display, or any custom behavior.

The combinator accepts Effect's `Predicate` type, enabling the use of predicate combinators like `Predicate.and`, `Predicate.or`, and `Predicate.not` for complex conditional logic.
