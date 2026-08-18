/**
 * Static Bash completion script generator.
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

const escapeForBash = (s: string): string => s.replace(/'/g, "'\\''")

const sanitizeFunctionName = (s: string): string => s.replace(/[^a-zA-Z0-9_]/g, "_")

const flagNamesForWordlist = (flag: Completions.FlagDescriptor): Array<string> => {
  const names: Array<string> = [`--${flag.name}`]
  for (const alias of flag.aliases) {
    names.push(alias.length === 1 ? `-${alias}` : `--${alias}`)
  }
  if (flag.type._tag === "Boolean") {
    names.push(`--no-${flag.name}`)
  }
  return names
}

/**
 * Build an associative array mapping each flag form to a group index.
 * At completion time, if any form in a group appears in COMP_WORDS,
 * all forms in that group are removed from the candidate list.
 */
const buildFlagGroupDeclarations = (
  flags: ReadonlyArray<Completions.FlagDescriptor>,
  lines: Array<string>
): void => {
  if (flags.length === 0) return
  lines.push(`  # Build used-flag filter`)
  lines.push(`  local -A _flag_groups`)
  let groupIdx = 0
  for (const flag of flags) {
    const forms = flagNamesForWordlist(flag)
    for (const form of forms) {
      lines.push(`  _flag_groups[${form}]=${groupIdx}`)
    }
    groupIdx++
  }
  lines.push(`  local -A _used_groups`)
  lines.push(`  for ((i = 1; i < cword; i++)); do`)
  lines.push(`    local _g="\${_flag_groups[\${words[i]}]:-}"`)
  lines.push(`    [[ -n "$_g" ]] && _used_groups[$_g]=1`)
  lines.push(`  done`)
  lines.push(`  local _filtered_flags=""`)
  lines.push(`  for _f in ${flags.flatMap(flagNamesForWordlist).join(" ")}; do`)
  lines.push(`    local _g="\${_flag_groups[$_f]:-}"`)
  lines.push(`    [[ -z "$_g" || -z "\${_used_groups[$_g]:-}" ]] && _filtered_flags+=" $_f"`)
  lines.push(`  done`)
  lines.push(``)
}

/**
 * Emit the shared choice-completion helper.
 *
 * `compgen -W` re-expands every word of its list, which mangles values holding
 * quotes, spaces or glob characters, so matches are filtered from an explicitly
 * quoted list instead. Two further readline details are handled here:
 *
 * - Bash inserts COMPREPLY entries verbatim when the word is unquoted, so each
 *   match is requoted with `printf %q`. When the user has opened a quote, bash
 *   quotes the entry itself and requoting would double-escape it.
 * - Readline only replaces the text after the last COMP_WORDBREAKS character
 *   (`:` among them), so that head has to be trimmed off every match or a value
 *   like `node:20` is appended to what was typed rather than replacing it.
 *
 * Prefix matching uses the dequoted word. Dequoting is best effort: it strips
 * one opening quote and any backslash escapes, so a value whose own text
 * contains a backslash will not match once the user types it escaped.
 */
const choicesHelper = (helperName: string, lines: Array<string>): void => {
  lines.push(`${helperName}()`)
  lines.push(`{`)
  lines.push(`  local _cur="$1"; shift`)
  lines.push(`  local _prefix="\${_cur#[\\"\\']}"; _prefix="\${_prefix//\\\\/}"`)
  lines.push(`  local _quoted_word=""`)
  lines.push(`  [[ "$_cur" == [\\"\\']* ]] && _quoted_word=1`)
  lines.push(`  COMPREPLY=()`)
  lines.push(`  local _choice _quoted`)
  lines.push(`  for _choice in "$@"; do`)
  lines.push(`    [[ "$_choice" == "$_prefix"* ]] || continue`)
  lines.push(`    if [[ -n "$_quoted_word" ]]; then`)
  lines.push(`      COMPREPLY+=("$_choice")`)
  lines.push(`    else`)
  lines.push(`      printf -v _quoted '%q' "$_choice"`)
  lines.push(`      COMPREPLY+=("$_quoted")`)
  lines.push(`    fi`)
  lines.push(`  done`)
  lines.push(`  local _head="$_cur"`)
  lines.push(`  while [[ -n "$_head" ]]; do`)
  lines.push(`    [[ "$COMP_WORDBREAKS" == *"\${_head: -1}"* ]] && break`)
  lines.push(`    _head="\${_head%?}"`)
  lines.push(`  done`)
  lines.push(`  if [[ -n "$_head" ]]; then`)
  lines.push(`    local _i`)
  lines.push(`    for ((_i = 0; _i < \${#COMPREPLY[@]}; _i++)); do`)
  lines.push(`      COMPREPLY[_i]="\${COMPREPLY[_i]#"$_head"}"`)
  lines.push(`    done`)
  lines.push(`  fi`)
  lines.push(`}`)
  lines.push(``)
}

const choiceCompletion = (helperName: string, values: ReadonlyArray<string>): string =>
  `${helperName} "$cur" ${values.map((value) => `'${escapeForBash(value)}'`).join(" ")}`

const flagValueCompletion = (type: Completions.FlagType, helperName: string): string | undefined => {
  switch (type._tag) {
    case "Boolean":
      return undefined
    case "Choice":
      return choiceCompletion(helperName, type.values)
    case "Path":
      if (type.pathType === "directory") return `COMPREPLY=( $(compgen -d -- "$cur") )`
      return `COMPREPLY=( $(compgen -f -- "$cur") )`
    default:
      return undefined
  }
}

const argCompletion = (type: Completions.ArgumentType, helperName: string): string | undefined => {
  switch (type._tag) {
    case "Choice":
      return choiceCompletion(helperName, type.values)
    case "Path":
      if (type.pathType === "directory") return `COMPREPLY=( $(compgen -d -- "$cur") )`
      return `COMPREPLY=( $(compgen -f -- "$cur") )`
    default:
      return undefined
  }
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

const generateFunction = (
  descriptor: Completions.CommandDescriptor,
  parentPath: ReadonlyArray<string>,
  lines: Array<string>,
  helperName: string
): void => {
  const currentPath = [...parentPath, descriptor.name]
  const funcName = `_${currentPath.map(sanitizeFunctionName).join("_")}`

  lines.push(`${funcName}()`)
  lines.push(`{`)
  lines.push(`  local cur prev words cword i`)
  lines.push(parentPath.length === 0 ? `  local _command_index=0` : `  local _command_index="$1"`)
  lines.push(`  _init_completion || return`)
  lines.push(``)

  // Build flag-value dispatch
  const flagsWithValues = descriptor.flags.filter((f) => f.type._tag !== "Boolean")
  if (flagsWithValues.length > 0) {
    lines.push(`  # Flag value completions`)
    lines.push(`  case "$prev" in`)
    for (const flag of flagsWithValues) {
      const longNames = [`--${flag.name}`]
      for (const alias of flag.aliases) {
        longNames.push(alias.length === 1 ? `-${alias}` : `--${alias}`)
      }
      const completion = flagValueCompletion(flag.type, helperName)
      if (completion) {
        lines.push(`    ${longNames.join("|")})`)
        lines.push(`      ${completion}`)
        lines.push(`      return`)
        lines.push(`      ;;`)
      }
    }
    lines.push(`  esac`)
    lines.push(``)
  }

  // Subcommand dispatch
  if (descriptor.subcommands.length > 0) {
    lines.push(`  # Subcommand dispatch`)
    lines.push(`  local cmd _skip_next=0`)
    lines.push(`  for ((i = _command_index + 1; i < cword; i++)); do`)
    lines.push(`    if (( _skip_next )); then`)
    lines.push(`      _skip_next=0`)
    lines.push(`      continue`)
    lines.push(`    fi`)
    lines.push(`    case "\${words[i]}" in`)
    for (const flag of descriptor.flags) {
      if (flag.type._tag === "Boolean") continue
      const forms = flagNamesForWordlist(flag)
      lines.push(`      ${forms.join("|")}) _skip_next=1 ;;`)
      lines.push(`      ${forms.map((form) => `${form}=*`).join("|")}) ;;`)
    }
    for (const sub of descriptor.subcommands) {
      const subFuncName = `_${[...currentPath, sub.name].map(sanitizeFunctionName).join("_")}`
      lines.push(`      ${sub.name})`)
      lines.push(`        ${subFuncName} "$i"`)
      lines.push(`        return`)
      lines.push(`        ;;`)
    }
    lines.push(`    esac`)
    lines.push(`  done`)
    lines.push(``)
  }

  // Filter already-used flags (entire alias group removed when any form is used)
  buildFlagGroupDeclarations(descriptor.flags, lines)

  if (descriptor.flags.length > 0 || descriptor.subcommands.length > 0) {
    lines.push(`  # Complete flags (filtered) and subcommands`)
    lines.push(`  if [[ "$cur" == -* ]]; then`)
    if (descriptor.flags.length > 0) {
      lines.push(`    COMPREPLY=( $(compgen -W "$_filtered_flags" -- "$cur") )`)
    }
    lines.push(`    return`)
    lines.push(`  fi`)
    lines.push(``)
  }

  // Positional argument completion
  const argsWithCompletions = descriptor.arguments.flatMap((argument, index) => {
    const completion = argCompletion(argument.type, helperName)
    return completion === undefined ? [] : [{ argument, completion, index }]
  })
  if (argsWithCompletions.length > 0) {
    lines.push(`  # Positional argument completions`)
    lines.push(`  local _position=0 _skip_next=0 _end_of_options=0`)
    lines.push(`  for ((i = _command_index + 1; i < cword; i++)); do`)
    lines.push(`    if (( _skip_next )); then`)
    lines.push(`      _skip_next=0`)
    lines.push(`      continue`)
    lines.push(`    fi`)
    lines.push(`    if (( _end_of_options )); then`)
    lines.push(`      ((_position += 1))`)
    lines.push(`      continue`)
    lines.push(`    fi`)
    lines.push(`    case "\${words[i]}" in`)
    lines.push(`      --) _end_of_options=1 ;;`)
    for (const flag of descriptor.flags) {
      const forms = flagNamesForWordlist(flag)
      if (flag.type._tag === "Boolean") {
        lines.push(`      ${forms.join("|")}) ;;`)
      } else {
        lines.push(`      ${forms.join("|")}) _skip_next=1 ;;`)
        lines.push(`      ${forms.map((form) => `${form}=*`).join("|")}) ;;`)
      }
    }
    lines.push(`      -*) ;;`)
    lines.push(`      *) ((_position += 1)) ;;`)
    lines.push(`    esac`)
    lines.push(`  done`)
    lines.push(`  case "$_position" in`)
    for (const { argument, completion, index } of argsWithCompletions) {
      if (argument.variadic) continue
      lines.push(`    ${index})`)
      lines.push(`      ${completion}`)
      lines.push(`      return`)
      lines.push(`      ;;`)
    }
    lines.push(`  esac`)
    const variadic = argsWithCompletions.find(({ argument }) => argument.variadic)
    if (variadic !== undefined) {
      lines.push(`  if (( _position >= ${variadic.index} )); then`)
      lines.push(`    ${variadic.completion}`)
      lines.push(`    return`)
      lines.push(`  fi`)
    }
  } else if (descriptor.subcommands.length > 0) {
    const subNames = descriptor.subcommands.map((s) => s.name)
    lines.push(`  COMPREPLY=( $(compgen -W '${subNames.join(" ")}' -- "$cur") )`)
  }

  lines.push(`}`)
  lines.push(``)

  // Recurse into subcommands
  for (const sub of descriptor.subcommands) {
    generateFunction(sub, currentPath, lines, helperName)
  }
}

/** @internal */
export const generate = (
  executableName: string,
  descriptor: Completions.CommandDescriptor
): string => {
  const lines: Array<string> = []
  const safeName = sanitizeFunctionName(executableName)
  const helperName = `_${safeName}__choices`

  lines.push(`###-begin-${escapeForBash(executableName)}-completions-###`)
  lines.push(`#`)
  lines.push(`# Static completion script for Bash`)
  lines.push(`#`)
  lines.push(`# Installation:`)
  lines.push(`#   ${escapeForBash(executableName)} --completions bash >> ~/.bashrc`)
  lines.push(`#`)
  lines.push(``)

  // Inline minimal _init_completion fallback for environments without
  // bash-completion installed. The real _init_completion handles edge cases
  // (= in options, redirections, etc.) but this covers the common path.
  lines.push(`if ! type _init_completion &>/dev/null; then`)
  lines.push(`  _init_completion()`)
  lines.push(`  {`)
  lines.push(`    COMPREPLY=()`)
  lines.push(`    cur="\${COMP_WORDS[COMP_CWORD]}"`)
  lines.push(`    prev="\${COMP_WORDS[COMP_CWORD-1]}"`)
  lines.push(`    words=("\${COMP_WORDS[@]}")`)
  lines.push(`    cword=$COMP_CWORD`)
  lines.push(`  }`)
  lines.push(`fi`)
  lines.push(``)

  choicesHelper(helperName, lines)
  generateFunction(descriptor, [], lines, helperName)

  lines.push(`complete -F _${safeName} ${escapeForBash(executableName)}`)
  lines.push(`###-end-${escapeForBash(executableName)}-completions-###`)

  return lines.join("\n")
}
