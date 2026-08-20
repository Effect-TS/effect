---
"effect": patch
---

Generate a bash completion script that runs on bash 3.2, the version macOS ships as `/bin/bash`.

The script declared its used-flag filter with `local -A`, an associative array that bash only gained in 4.0. On bash 3.2 that aborted the completion function before it reached flag-name and positional completion, so only flag values completed. Which flag form belongs to which alias group is known when the script is generated, so the runtime map has been replaced by a generated `case`.
