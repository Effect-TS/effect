---
"@effect/cli": patch
---

Add `Options.withFallbackPrompt` to CLI

You can now specify that a command-line option should fallback to prompting the
user for a value if no value is specified. 

```ts
import * as Options from "@effect/cli/Options"
import * as Prompt from "@effect/cli/Prompt"

const name = Options.text("name").pipe(
    Options.withFallbackPrompt(Prompt.text({
        message: "Please provide your name"
    }))
)
```
