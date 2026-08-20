---
"effect": patch
---

Fix shell completion of `Flag.choice` / `Argument.choice` values containing quotes, colons, spaces or other shell metacharacters.

Choice values were interpolated verbatim into the generated completion script, which broke the script as a whole rather than just the affected parameter: zsh and fish refused to load it, bash loaded it but offered no candidates, and fish fell back to listing the current directory.

Escaping the value for the enclosing quotes is not enough, because the word list is parsed a second time — `compgen -W` in bash re-expands it, and fish fully expands the `complete -a` list, so a value such as `(cmd)` was executed as a command substitution when the user pressed TAB. Bash now filters an explicitly quoted list instead of relying on `compgen -W`, while zsh and fish escape values for both rounds using a deny-by-default character class.

Bash additionally contributes only the part of the value that readline will actually replace, escaped for the quoting context the rest of the word leaves open, and splits words on whitespace alone. Without that, a value such as `node:20` was appended to the typed text rather than replacing it (`node:` + TAB produced `node:node:20`), and a positional argument holding a `COMP_WORDBREAKS` character was counted as several arguments.
