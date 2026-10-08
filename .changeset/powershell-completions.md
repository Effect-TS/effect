---
"effect": patch
---

Add a PowerShell completion script generator for CLIs. `--completions powershell` (alias `pwsh`) prints a self-contained `Register-ArgumentCompleter -Native` script that works on Windows PowerShell 5.1 and PowerShell 7+, alongside the existing `bash`, `zsh`, and `fish` generators.
