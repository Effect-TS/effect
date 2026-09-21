# @effect/release-spike-fixture

Disposable package that exists only so the Effect maintainers can probe npm
staged publishing (upload, scan status, approval, provenance) without touching a
real package. It has no runtime content and is never a dependency of anything.

Every version staged or published from here is throwaway. See `../RUNBOOK.md`.
