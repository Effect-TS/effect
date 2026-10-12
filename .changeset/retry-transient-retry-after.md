---
"effect": patch
---

Honor `Retry-After` in `HttpClient.retryTransient`. A transient response or status code error that carries the header now delays the next attempt by at least that long, in seconds or as an HTTP date. A longer schedule delay still wins, and requests without the header retry as before. The new `maxRetryAfter` option stops retrying when the server asks for a longer wait, for callers with a deadline.
