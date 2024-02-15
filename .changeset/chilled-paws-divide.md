---
"effect": minor
---

- swap `Schedule` type parameters from `Schedule<out Env, in In, out Out>` to `Schedule<out Out, in In = unknown, out R = never>`, closes #2154
- swap `ScheduleDriver` type parameters from `ScheduleDriver<out Env, in In, out Out>` to `ScheduleDriver<out Out, in In = unknown, out R = never>`
