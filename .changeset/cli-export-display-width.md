---
"effect": patch
---

cli: export the terminal display-width measure as `CliOutput.displayWidth`

```ts
import { CliOutput } from "effect/cli"

CliOutput.displayWidth("ファイル") // => 8
CliOutput.displayWidth("é") // => 1
CliOutput.displayWidth("1️⃣") // => 2
```

The measure the built-in help and table rendering already use was internal, so custom formatters had to reimplement the grapheme and East Asian Width logic to line up with it. `displayWidth` is that same function, unchanged: ANSI styling is stripped first, so styled and unstyled text measure alike.
