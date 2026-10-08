/**
 * Static PowerShell completion script generator.
 *
 * Produces a self-contained completion script from a `CommandDescriptor` —
 * no re-invocation of the CLI at runtime.
 *
 * @internal
 */
import type * as Completions from "../../Completions.ts"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a value for a PowerShell single-quoted string literal. */
const escapePsString = (s: string): string => s.replace(/[\r\n]/g, " ").replace(/'/g, "''")

const quotePs = (s: string): string => `'${escapePsString(s)}'`

const psArray = (items: ReadonlyArray<string>): string =>
  items.length === 0 ? "@()" : `@(${items.map(quotePs).join(", ")})`

/** Sanitize an executable name for use in PowerShell identifiers. */
const sanitize = (s: string): string => s.replace(/[^a-zA-Z0-9_]/g, "_")

const flagForms = (flag: Completions.FlagDescriptor): Array<string> => {
  const forms = [`--${flag.name}`]
  for (const alias of flag.aliases) {
    forms.push(alias.length === 1 ? `-${alias}` : `--${alias}`)
  }
  return forms
}

const flagEntry = (flag: Completions.FlagDescriptor): string =>
  `@{ name = ${quotePs(flag.name)}; forms = ${psArray(flagForms(flag))}; ` +
  `takesValue = $${flag.type._tag !== "Boolean"}; negatable = $${flag.type._tag === "Boolean"}; ` +
  `values = ${flag.type._tag === "Choice" ? psArray(flag.type.values) : "@()"}; ` +
  `pathType = ${flag.type._tag === "Path" ? quotePs(flag.type.pathType) : "$null"}; ` +
  `description = ${flag.description ? quotePs(flag.description) : "$null"} }`

const argumentEntry = (argument: Completions.ArgumentDescriptor): string =>
  `@{ name = ${quotePs(argument.name)}; variadic = $${argument.variadic}; ` +
  `values = ${argument.type._tag === "Choice" ? psArray(argument.type.values) : "@()"}; ` +
  `pathType = ${argument.type._tag === "Path" ? quotePs(argument.type.pathType) : "$null"}; ` +
  `description = ${argument.description ? quotePs(argument.description) : "$null"} }`

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Emit one hashtable entry per command, keyed by the space-joined subcommand
 * path. The root command is keyed by the empty string. `seen` guards against
 * duplicate path keys — a subcommand whose alias collides with a sibling's
 * name would otherwise emit a duplicate hashtable key, which PowerShell
 * rejects as a parse error. PowerShell hash literal keys compare
 * case-insensitively, so the guard normalizes to lowercase.
 */
const generateContexts = (
  descriptor: Completions.CommandDescriptor,
  parentPath: ReadonlyArray<string>,
  lines: Array<string>,
  seen: Set<string>
): void => {
  const key = parentPath.join(" ")
  if (seen.has(key.toLowerCase())) return
  seen.add(key.toLowerCase())
  lines.push(`  ${quotePs(key)} = @{`)
  if (descriptor.subcommands.length === 0) {
    lines.push(`    subcommands = @()`)
  } else {
    lines.push(`    subcommands = @(`)
    for (const sub of descriptor.subcommands) {
      lines.push(
        `      @{ name = ${quotePs(sub.name)}; description = ${sub.description ? quotePs(sub.description) : "$null"} }`
      )
    }
    lines.push(`    )`)
  }
  if (descriptor.flags.length === 0) {
    lines.push(`    flags = @()`)
  } else {
    lines.push(`    flags = @(`)
    for (const flag of descriptor.flags) {
      lines.push(`      ${flagEntry(flag)}`)
    }
    lines.push(`    )`)
  }
  if (descriptor.arguments.length === 0) {
    lines.push(`    arguments = @()`)
  } else {
    lines.push(`    arguments = @(`)
    for (const argument of descriptor.arguments) {
      lines.push(`      ${argumentEntry(argument)}`)
    }
    lines.push(`    )`)
  }
  lines.push(`  }`)
  for (const sub of descriptor.subcommands) {
    generateContexts(sub, [...parentPath, sub.name], lines, seen)
  }
}

/**
 * The completer function walks the command line to rebuild the active
 * subcommand path, the flag currently awaiting a value, the used flags, and
 * the positional argument index. Only PowerShell 5.1 compatible syntax is
 * used so the script works on Windows PowerShell as well as PowerShell 7+.
 */
const completerSource = (functionName: string, dataName: string): string =>
  `function ${functionName} {
  param($wordToComplete, $commandAst, $cursorPosition)
  if ($null -eq $wordToComplete) { $wordToComplete = '' }

  $spec = ${dataName}
  $results = [System.Collections.Generic.List[System.Management.Automation.CompletionResult]]::new()

  $elements = @($commandAst.CommandElements)

  # The engine reports an empty word when the in-progress token contains ','
  # (array operator breaks word splitting). Rebuild it from the last AST
  # element so the state machine below does not consume it as committed.
  if ($wordToComplete -eq '' -and $elements.Count -gt 1) {
    $lastExtent = $elements[$elements.Count - 1].Extent
    if ($cursorPosition -eq $lastExtent.EndOffset) {
      $wordToComplete = $lastExtent.Text
    }
  }
  $wildcard = [System.Management.Automation.WildcardPattern]::Escape($wordToComplete) + '*'

  $quote = {
    param($s)
    # ',' is the array operator and '@' splats at token start, so both must be
    # quoted. '\\' needs no quoting: it is literal in unquoted PowerShell tokens
    # (the escape char is the backtick).
    if ($s -match '[^A-Za-z0-9_./%+=:\\\\-]') { "'" + $s.Replace("'", "''") + "'" } else { $s }
  }

  $add = {
    param($raw, $type, $tooltip)
    if ($raw -like $wildcard) {
      $text = & $quote $raw
      $tip = $tooltip
      if (-not $tip) { $tip = $raw }
      $results.Add([System.Management.Automation.CompletionResult]::new($text, $text, $type, $tip))
    }
  }

  $addPaths = {
    param($word, $pathType, $textPrefix)
    $dirName = ''
    $leafName = $word
    if ($word) {
      $dirName = [System.IO.Path]::GetDirectoryName($word)
      $leafName = [System.IO.Path]::GetFileName($word)
    }
    $root = '.'
    if ($dirName) { $root = $dirName }
    $leafPattern = [System.Management.Automation.WildcardPattern]::Escape($leafName) + '*'
    $children = @()
    try {
      $children = @(Get-ChildItem -LiteralPath $root -ErrorAction Stop)
    } catch {
      $children = @()
    }
    foreach ($child in $children) {
      if ($child.Name -notlike $leafPattern) { continue }
      $text = $child.Name
      if ($dirName) { $text = Join-Path -Path $dirName -ChildPath $child.Name }
      if ($child.PSIsContainer) {
        # Trailing separator so the user can keep completing into the directory.
        $text = $text + '\\'
        $results.Add([System.Management.Automation.CompletionResult]::new($textPrefix + (& $quote $text), $child.Name, 'ProviderContainer', $child.FullName))
      } else {
        if ($pathType -eq 'directory') { continue }
        $results.Add([System.Management.Automation.CompletionResult]::new($textPrefix + (& $quote $text), $child.Name, 'ProviderItem', $child.FullName))
      }
    }
  }

  $words = @()
  for ($i = 1; $i -lt $elements.Count; $i++) {
    $extent = $elements[$i].Extent
    if ($extent.StartOffset -ge $cursorPosition) { break }
    if ($cursorPosition -le $extent.EndOffset -and $wordToComplete -ne '') { break }
    $words += $extent.Text
  }

  $pathKey = ''
  $context = $spec['']
  $usedFlags = @{}
  $expecting = $null
  $endOfOptions = $false
  $argumentIndex = 0

  $flagMap = [hashtable]::new([System.StringComparer]::Ordinal)
  foreach ($f in $context.flags) {
    foreach ($form in $f.forms) { $flagMap[$form] = $f }
  }

  foreach ($w in $words) {
    # Committed tokens keep their quotes in Extent.Text; strip them so quoted
    # subcommands and flag forms still dispatch.
    if ($w.Length -ge 2 -and (($w.StartsWith("'") -and $w.EndsWith("'")) -or ($w.StartsWith('"') -and $w.EndsWith('"')))) {
      $w = $w.Substring(1, $w.Length - 2)
    }
    if ($null -ne $expecting) {
      $expecting = $null
      continue
    }
    if ($endOfOptions) { $argumentIndex += 1; continue }
    if ($w -eq '--') { $endOfOptions = $true; continue }
    if ($w -match '^-') {
      $form = $w
      $takesInlineValue = $false
      if ($form.Contains('=')) {
        $form = $form.Substring(0, $form.IndexOf('='))
        $takesInlineValue = $true
      }
      if (-not $flagMap.ContainsKey($form) -and $form.StartsWith('--no-')) {
        $form = '--' + $form.Substring(5)
      }
      if ($flagMap.ContainsKey($form)) {
        $usedFlags[$flagMap[$form].name] = $true
        if ($flagMap[$form].takesValue -and -not $takesInlineValue) { $expecting = $flagMap[$form] }
      }
    } else {
      $switched = $false
      foreach ($sub in $context.subcommands) {
        if ($sub.name -ceq $w) {
          if ($pathKey) { $pathKey = "$pathKey $w" } else { $pathKey = $w }
          $context = $spec[$pathKey]
          $flagMap = [hashtable]::new([System.StringComparer]::Ordinal)
          foreach ($f in $context.flags) {
            foreach ($form in $f.forms) { $flagMap[$form] = $f }
          }
          $usedFlags = @{}
          $argumentIndex = 0
          $switched = $true
          break
        }
      }
      if (-not $switched) { $argumentIndex += 1 }
    }
  }

  $addFlags = {
    foreach ($f in $context.flags) {
      if ($usedFlags.ContainsKey($f.name)) { continue }
      foreach ($form in $f.forms) {
        & $add $form 'ParameterName' $f.description
      }
      if ($f.negatable) {
        $negTip = $null
        if ($f.description) { $negTip = "Disable $($f.name)" }
        & $add ("--no-" + $f.name) 'ParameterName' $negTip
      }
    }
  }

  if ($null -ne $expecting) {
    foreach ($v in $expecting.values) {
      & $add $v 'ParameterValue' $expecting.description
    }
    if ($expecting.pathType) {
      & $addPaths $wordToComplete $expecting.pathType ''
    }
    # An empty result makes the engine fall back to filesystem completion,
    # which is never a valid candidate for a typed flag value (Int, Date, ...).
    if ($results.Count -eq 0) {
      $tip = $expecting.description
      if (-not $tip) { $tip = 'value for --' + $expecting.name }
      $results.Add([System.Management.Automation.CompletionResult]::new($wordToComplete, $wordToComplete, 'Text', $tip))
    }
    return $results
  }

  if ($wordToComplete -match '^(-[^=]*)=(.*)$') {
    $formPart = $Matches[1]
    $valuePart = $Matches[2]
    if ($flagMap.ContainsKey($formPart)) {
      $flag = $flagMap[$formPart]
      $valuePattern = [System.Management.Automation.WildcardPattern]::Escape($valuePart) + '*'
      foreach ($v in $flag.values) {
        if ($v -like $valuePattern) {
          $text = $formPart + '=' + (& $quote $v)
          $results.Add([System.Management.Automation.CompletionResult]::new($text, $text, 'ParameterValue', $v))
        }
      }
      if ($flag.pathType) {
        & $addPaths $valuePart $flag.pathType ($formPart + '=')
      }
      if ($results.Count -eq 0) {
        $tip = $flag.description
        if (-not $tip) { $tip = 'value for ' + $formPart }
        $results.Add([System.Management.Automation.CompletionResult]::new($wordToComplete, $wordToComplete, 'Text', $tip))
      }
    }
    return $results
  }

  if ($wordToComplete -match '^-') {
    & $addFlags
    return $results
  }

  foreach ($sub in $context.subcommands) {
    & $add $sub.name 'Command' $sub.description
  }
  & $addFlags

  $argumentCount = $context.arguments.Count
  $argument = $null
  if ($argumentIndex -lt $argumentCount) {
    $argument = $context.arguments[$argumentIndex]
  } elseif ($argumentCount -gt 0 -and $context.arguments[-1].variadic) {
    $argument = $context.arguments[-1]
  }
  if ($null -ne $argument) {
    foreach ($v in $argument.values) {
      & $add $v 'ParameterValue' $argument.description
    }
    if ($argument.pathType) {
      & $addPaths $wordToComplete $argument.pathType ''
    }
  }
  return $results
}`

/** @internal */
export const generate = (
  executableName: string,
  descriptor: Completions.CommandDescriptor
): string => {
  const functionName = `_${sanitize(executableName)}_Complete`
  const dataName = `$_${sanitize(executableName)}_Completions`

  const lines: Array<string> = []

  lines.push(`###-begin-${executableName}-completions-###`)
  lines.push(`#`)
  lines.push(`# Static completion script for PowerShell`)
  lines.push(`#`)
  lines.push(`# Installation:`)
  // Point users at a dedicated dot-sourced script instead of appending to
  // $PROFILE directly: `>>` on Windows PowerShell 5.1 re-encodes appended
  // text as UTF-16LE, which corrupts an existing UTF-8/ANSI profile.
  lines.push(`#   ${executableName} --completions powershell > ${executableName}-completion.ps1`)
  lines.push(`#   then add this line to your $PROFILE (use the full path to the file):`)
  lines.push(`#   . <PATH>\\${executableName}-completion.ps1`)
  lines.push(`#`)
  lines.push(``)

  lines.push(`${dataName} = @{`)
  generateContexts(descriptor, [], lines, new Set())
  lines.push(`}`)
  lines.push(``)

  lines.push(...completerSource(functionName, dataName).split("\n"))
  lines.push(``)

  lines.push(`Register-ArgumentCompleter -Native -CommandName ${quotePs(executableName)} -ScriptBlock {`)
  lines.push(`  param($wordToComplete, $commandAst, $cursorPosition)`)
  lines.push(
    `  ${functionName} -wordToComplete $wordToComplete -commandAst $commandAst -cursorPosition $cursorPosition`
  )
  lines.push(`}`)
  lines.push(``)
  lines.push(`###-end-${executableName}-completions-###`)

  return lines.join("\n")
}
