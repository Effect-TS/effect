---
"effect": patch
---

Fix shell completion of `Flag.choice` / `Argument.choice` values containing quotes, colons or spaces.

Choice values were interpolated verbatim into the generated completion script, which broke the script as a whole rather than just the affected parameter: zsh and fish refused to load it, bash loaded it but offered no candidates, and fish fell back to listing the current directory.

Escaping the value for the enclosing quotes is not enough, because `compgen -W` (bash) and `complete -a` (fish) re-parse their word list afterwards. Bash now filters an explicitly quoted list instead of relying on `compgen -W`, while zsh and fish escape values for both rounds. Values containing spaces now complete correctly too.
