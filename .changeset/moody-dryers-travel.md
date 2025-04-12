---
"effect": minor
---

Added two new modules to the standard library:

- **Integer**: A module for working with whole numbers (positive, negative, and zero). Provides a comprehensive set of mathematical operations, predicates, and utilities for integers with guaranteed type safety. Ideal for modeling quantities that must be whole numbers but can be negative (e.g., temperature, position, account balances).

- **NaturalNumber**: A module for working with non-negative integers (zero and positive whole numbers). Offers operations that preserve the non-negative property with appropriate error handling for boundary cases. Perfect for modeling quantities that cannot logically be negative (e.g., counts, ages, inventory).

Additionally, refactored and enhanced the **Number** module with improved documentation and consistent APIs that align with the new numeric type modules.

No breaking changes were introduced in this release, ensuring compatibility with existing codebases. The new modules are designed to be intuitive and easy to use, providing a seamless experience for developers working with numeric types in their applications.
