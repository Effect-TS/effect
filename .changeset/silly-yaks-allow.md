---
"effect": patch
---

Provides two separate constructors for a `RateLimiter`:
  - `RateLimiter.tokenBucket`: Constructs a `RateLimiter` which will utilize the token-bucket algorithm for limiting requests
  - `RateLimiter.fixedWindow`: Constructs a `RateLimiter` which will utilize the fixed-window algorithm for limiting requests
