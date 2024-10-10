---
"effect": major
---

## Major: Swap type parameters for `Left` and `Right` to align with `Either`

**WHAT the breaking change is:**

- The type parameters for `Left<L, R>` and `Right<L, R>` have been swapped to `Left<R, L>` and `Right<R, L>`, respectively. This brings them in line with the parameter ordering of `Either<R, L>`.

**WHY the change was made:**

- This change ensures consistency across the codebase. In `Either<R, L>`, `R` is used for the "right" value and `L` for the "left" value. Aligning `Left` and `Right` with `Either` reduces confusion.

**HOW a consumer should update their code:**

- Any usage of `Left<L, R>` should be replaced with `Left<R, L>`.
- Any usage of `Right<L, R>` should be replaced with `Right<R, L>`.
- For example:
  - `Left<string, number>` should now be `Left<number, string>`.
  - `Right<string, number>` should now be `Right<number, string>`.
