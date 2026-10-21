---
"effect": patch
---

Serialize `Cause.Fail` under `error` instead of `failure`, matching its `error` property.

This changes the output of `toJSON`, `JSON.stringify` and Node inspection for causes, including nested `Sequential` / `Parallel` causes and `Exit.Failure`, as well as log messages that contain a `Cause` or `Exit` value. The `cause` field of built-in loggers is rendered with `Cause.pretty` and is unaffected. Code that reads `failure` from serialized causes should read `error` instead.
