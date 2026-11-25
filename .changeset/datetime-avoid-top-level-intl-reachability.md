---
"effect": patch
---

Rewrite internal `DateTime` `makeZoned` and `zoneMakeNamed` helpers as plain functions instead of top-level `Option.liftThrowable` calls so AOT compilers (such as `scriptc`) do not treat `Intl` as reachable when `DateTime` time zones are unused.
