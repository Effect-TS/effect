/**
 * Static PowerShell completion script generator.
 *
 * Produces a self-contained completion script from a `CommandDescriptor` —
 * no re-invocation of the CLI at runtime. The script only uses syntax and
 * APIs available in Windows PowerShell 5.1.
 *
 * @internal
 */
import type * as Completions from "../../Completions.ts"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Encode a string as an ASCII-only PowerShell expression. Windows PowerShell
 * 5.1 reads a script without a BOM, and native command output, in the ANSI
 * code page, where UTF-8 bytes can decode to the typographic quotes PowerShell
 * also treats as string delimiters. Non-ASCII and control characters are
 * therefore emitted as `[char]` code units.
 */
const quotePs = (s: string): string => {
  const parts: Array<string> = []
  let literal = ""
  for (const char of s) {
    const code = char.charCodeAt(0)
    if (code >= 0x20 && code < 0x80) {
      literal += char === "'" ? "''" : char
      continue
    }
    if (literal !== "" || parts.length === 0) parts.push(`'${literal}'`)
    literal = ""
    for (let i = 0; i < char.length; i++) {
      parts.push(`[char]0x${char.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0")}`)
    }
  }
  if (literal !== "" || parts.length === 0) parts.push(`'${literal}'`)
  return parts.length === 1 ? parts[0] : `(${parts.join(" + ")})`
}

const psArray = (items: ReadonlyArray<string>): string =>
  items.length === 0 ? "@()" : `@(${items.map(quotePs).join(", ")})`

const psOptional = (s: string | undefined): string => s ? quotePs(s) : "$null"

const sanitize = (s: string): string => s.replace(/[^a-zA-Z0-9_]/g, "_")

const flagForms = (flag: Completions.FlagDescriptor): Array<string> => [
  `--${flag.name}`,
  ...flag.aliases.map((alias) => alias.length === 1 ? `-${alias}` : `--${alias}`)
]

const valueFields = (type: Completions.FlagType | Completions.ArgumentType): string =>
  `values = ${type._tag === "Choice" ? psArray(type.values) : "@()"}; ` +
  `pathType = ${type._tag === "Path" ? quotePs(type.pathType) : "$null"}`

const flagEntry = (flag: Completions.FlagDescriptor): string => {
  const isBoolean = flag.type._tag === "Boolean"
  return `@{ name = ${quotePs(flag.name)}; forms = ${psArray(flagForms(flag))}; ` +
    `takesValue = $${!isBoolean}; negatable = $${isBoolean}; ${valueFields(flag.type)}; ` +
    `description = ${psOptional(flag.description)} }`
}

const argumentEntry = (argument: Completions.ArgumentDescriptor): string =>
  `@{ name = ${quotePs(argument.name)}; variadic = $${argument.variadic}; ${valueFields(argument.type)}; ` +
  `description = ${psOptional(argument.description)} }`

const pushList = (lines: Array<string>, field: string, entries: ReadonlyArray<string>): void => {
  if (entries.length === 0) {
    lines.push(`  ${field} = @()`)
    return
  }
  lines.push(`  ${field} = @(`)
  for (const entry of entries) {
    lines.push(`    ${entry}`)
  }
  lines.push(`  )`)
}

/**
 * Emit one context per command, keyed by its space-joined subcommand path.
 * Subcommands are case-sensitive, so the contexts go in an ordinal hashtable
 * rather than a hash literal, whose keys compare case-insensitively. A path
 * repeated in a hand-built descriptor is emitted once.
 */
const generateContexts = (
  dataName: string,
  descriptor: Completions.CommandDescriptor,
  path: ReadonlyArray<string>,
  lines: Array<string>,
  seen: Set<string>
): void => {
  const key = path.join(" ")
  if (seen.has(key)) return
  seen.add(key)
  lines.push(`${dataName}[${quotePs(key)}] = @{`)
  pushList(
    lines,
    "subcommands",
    descriptor.subcommands.map((sub) =>
      `@{ name = ${quotePs(sub.name)}; description = ${psOptional(sub.description)} }`
    )
  )
  pushList(lines, "flags", descriptor.flags.map(flagEntry))
  pushList(lines, "arguments", descriptor.arguments.map(argumentEntry))
  lines.push(`}`)
  for (const sub of descriptor.subcommands) {
    generateContexts(dataName, sub, [...path, sub.name], lines, seen)
  }
}

/**
 * The completer replays the committed words with the CLI's own rules: `--`
 * ends option parsing, short flags cluster (`-abc`), `--flag=value` carries
 * its value inline, a boolean flag may consume a following boolean literal,
 * negative numbers are values, and only the first value at a level can select
 * a subcommand.
 */
const completer = (dataName: string): string =>
  String.raw`  param($wordToComplete, $commandAst, $cursorPosition)

  $spec = ${dataName}
  $results = [System.Collections.Generic.List[System.Management.Automation.CompletionResult]]::new()
  $booleanLiterals = @('true', 'yes', 'on', '1', 'y', 'false', 'no', 'off', '0', 'n')

  $index = {
    param($context)
    $lookup = [hashtable]::new([System.StringComparer]::Ordinal)
    foreach ($flag in $context.flags) {
      foreach ($form in $flag.forms) { $lookup[$form] = $flag }
    }
    $lookup
  }

  $quote = {
    param([string]$value)
    if ($value -match '^[\w./:%+=\\-]+$') { return $value }
    "'" + ($value -replace "['\u2018-\u201b]", '$0$0') + "'"
  }

  $add = {
    param([string]$value, [string]$type, $tooltip, [string]$typed, [string]$textPrefix)
    if (-not $value.StartsWith($typed, [System.StringComparison]::OrdinalIgnoreCase)) { return }
    $text = $textPrefix + (& $quote $value)
    $label = $value
    if (-not $label) { $label = $text }
    if (-not $tooltip) { $tooltip = $label }
    $results.Add([System.Management.Automation.CompletionResult]::new($text, $label, $type, $tooltip))
  }

  $addValues = {
    param($entry, [string]$typed, [string]$textPrefix)
    foreach ($value in $entry.values) {
      & $add $value 'ParameterValue' $entry.description $typed $textPrefix
    }
    if ($entry.pathType) {
      foreach ($file in [System.Management.Automation.CompletionCompleters]::CompleteFilename($typed)) {
        if ($entry.pathType -eq 'directory' -and $file.ResultType -ne 'ProviderContainer') { continue }
        $results.Add([System.Management.Automation.CompletionResult]::new($textPrefix + $file.CompletionText, $file.ListItemText, $file.ResultType, $file.ToolTip))
      }
    }
  }

  $addFlags = {
    param([string]$typed)
    foreach ($flag in $context.flags) {
      if ($used.ContainsKey($flag.name)) { continue }
      foreach ($form in $flag.forms) {
        & $add $form 'ParameterName' $flag.description $typed ''
      }
      if ($flag.negatable) {
        $tooltip = $null
        if ($flag.description) { $tooltip = 'Disable ' + $flag.name }
        & $add ('--no-' + $flag.name) 'ParameterName' $tooltip $typed ''
      }
    }
  }

  # A typed value that has no candidates completes to itself, so the engine
  # does not fall back to listing files.
  $keepTyped = {
    if ($results.Count -eq 0 -and $current) {
      $results.Add([System.Management.Automation.CompletionResult]::new($current, $current, 'ParameterValue', $current))
    }
  }

  $path = ''
  $context = $spec[$path]
  $lookup = & $index $context
  $used = @{}
  $expecting = $null
  $afterBoolean = $false
  $endOfOptions = $false
  $position = 0

  # The engine strips the quotes from a quoted word.
  $typed = [string]$wordToComplete
  if ($typed -match '^([''"])(.*?)\1?$') { $typed = $Matches[2] }
  $current = $null

  $elements = $commandAst.CommandElements
  for ($i = 1; $i -lt $elements.Count; $i++) {
    $element = $elements[$i]
    $word = $element.Extent.Text
    if ($element -is [System.Management.Automation.Language.StringConstantExpressionAst]) { $word = $element.Value }
    if ($element.Extent.EndOffset -ge $cursorPosition) {
      if ($element -is [System.Management.Automation.Language.ConstantExpressionAst] -and $element.Extent.StartOffset -le $cursorPosition) {
        $current = $element.Extent.Text
        if ($element.Extent.EndOffset -eq $cursorPosition) { $typed = $word }
      }
      break
    }

    # A pending flag value is never an option or '--'.
    $isOption = $word -match '^-.' -and $word -notmatch '^-(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$'
    if ($null -ne $expecting) {
      $expecting = $null
      if (-not $isOption) { continue }
    }
    if ($afterBoolean) {
      $afterBoolean = $false
      if ($booleanLiterals -ccontains $word) { continue }
    }
    if ($endOfOptions) { $position++; continue }
    if ($word -ceq '--') { $endOfOptions = $true; continue }

    if ($isOption) {
      $forms = @($word)
      $hasValue = $word.Contains('=')
      if ($hasValue) {
        $forms = @($word.Substring(0, $word.IndexOf('=')))
      } elseif (-not $word.StartsWith('--')) {
        $forms = @($word.Substring(1).ToCharArray() | ForEach-Object { '-' + $_ })
      }
      foreach ($form in $forms) {
        $expecting = $null
        $afterBoolean = $false
        $flag = $lookup[$form]
        if ($null -eq $flag) {
          if ($form.StartsWith('--no-')) {
            $flag = $lookup['--' + $form.Substring(5)]
            if ($null -ne $flag -and $flag.negatable -and $flag.name -ceq $form.Substring(5)) { $used[$flag.name] = $true }
          }
          continue
        }
        $used[$flag.name] = $true
        if ($hasValue) { continue }
        if ($flag.takesValue) { $expecting = $flag } else { $afterBoolean = $true }
      }
      continue
    }

    if ($position -eq 0) {
      $subcommand = $null
      foreach ($sub in $context.subcommands) {
        if ($sub.name -ceq $word) { $subcommand = $sub; break }
      }
      if ($null -ne $subcommand) {
        if ($path) { $path = $path + ' ' + $word } else { $path = $word }
        $context = $spec[$path]
        $lookup = & $index $context
        $used = @{}
        continue
      }
    }
    $position++
  }

  if ($null -ne $expecting) {
    & $addValues $expecting $typed ''
    & $keepTyped
    return $results
  }

  if (-not $endOfOptions) {
    if ($typed -match '^(-[^=]+)=(.*)$') {
      $form = $Matches[1]
      $value = $Matches[2]
      $flag = $lookup[$form]
      if ($null -ne $flag -and $flag.takesValue) {
        & $addValues $flag $value ($form + '=')
        & $keepTyped
      }
      return $results
    }
    if ($typed.StartsWith('-')) {
      & $addFlags $typed
      return $results
    }
    if ($position -eq 0) {
      foreach ($sub in $context.subcommands) {
        & $add $sub.name 'Command' $sub.description $typed ''
      }
    }
  }

  $arguments = @($context.arguments)
  $argument = $null
  if ($position -lt $arguments.Count) {
    $argument = $arguments[$position]
  } elseif ($arguments.Count -gt 0 -and $arguments[-1].variadic) {
    $argument = $arguments[-1]
  }
  if ($null -ne $argument) {
    & $addValues $argument $typed ''
  }

  if (-not $endOfOptions) {
    & $addFlags $typed
  }
  return $results`

/** @internal */
export const generate = (
  executableName: string,
  descriptor: Completions.CommandDescriptor
): string => {
  const dataName = `$global:_${sanitize(executableName)}_Completions`
  const lines: Array<string> = []

  lines.push(`###-begin-${executableName}-completions-###`)
  lines.push(`#`)
  lines.push(`# Static completion script for PowerShell`)
  lines.push(`#`)
  lines.push(`# Installation:`)
  // Appending with `>>` on Windows PowerShell 5.1 writes UTF-16LE, which
  // corrupts an existing UTF-8 profile, so the script goes in its own file.
  lines.push(`#   ${executableName} --completions powershell > ${executableName}-completion.ps1`)
  lines.push(`#   then add this line to your $PROFILE (use the full path to the file):`)
  lines.push(`#   . <PATH>\\${executableName}-completion.ps1`)
  lines.push(`#`)
  lines.push(``)
  lines.push(`${dataName} = [hashtable]::new([System.StringComparer]::Ordinal)`)
  generateContexts(dataName, descriptor, [], lines, new Set())
  lines.push(``)
  lines.push(`Register-ArgumentCompleter -Native -CommandName ${quotePs(executableName)} -ScriptBlock {`)
  lines.push(completer(dataName))
  lines.push(`}`)
  lines.push(``)
  lines.push(`###-end-${executableName}-completions-###`)

  return lines.join("\n")
}
