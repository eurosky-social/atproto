/**
 * Operator-configured names refused as the first label of handles on the
 * PDS's own domains (`PDS_HANDLE_BLOCKLIST_FILE`).
 *
 * The file holds one entry per line; blank lines and lines starting with `#`
 * are ignored. An entry matches the whole label unless it uses `*`, which
 * matches any run of characters: `nazi` refuses only `nazi.<domain>`,
 * `*nazi*` refuses any label containing it. Case and separators are ignored
 * on both sides, so `Big Cock` also refuses `big-cock` and `bigcock`.
 */

// Handles only allow "-", but list sources also separate words with spaces,
// dots, underscores or apostrophes ("2 girls 1 cup").
const SEPARATORS = /[\s._'-]+/g

const normalize = (value: string): string =>
  value.toLowerCase().replace(SEPARATORS, '')

/**
 * Returns the normalized patterns from a blocklist file's contents. Throws on
 * an entry that could never match a handle, or that is only wildcards and
 * would refuse every handle.
 */
export function parseHandleBlocklist(text: string): string[] {
  const patterns = new Set<string>()
  for (const [i, line] of text.split('\n').entries()) {
    const entry = line.trim()
    if (!entry || entry.startsWith('#')) continue
    const pattern = normalize(entry).replace(/\*+/g, '*')
    if (!/^[a-z0-9*]*[a-z0-9][a-z0-9*]*$/.test(pattern)) {
      throw new Error(`Invalid handle blocklist entry on line ${i + 1}`)
    }
    patterns.add(pattern)
  }
  return [...patterns]
}

/**
 * Compiles patterns from {@link parseHandleBlocklist} into a test for a
 * handle's first label.
 */
export function compileHandleBlocklist(
  patterns: string[],
): (label: string) => boolean {
  const exact = new Set(patterns.filter((p) => !p.includes('*')))
  const wildcards = patterns.filter((p) => p.includes('*'))
  // Patterns are [a-z0-9*] only, so nothing needs escaping.
  const regex = wildcards.length
    ? new RegExp(
        `^(?:${wildcards.map((p) => p.replaceAll('*', '.*')).join('|')})$`,
      )
    : null
  return (label) => {
    const normalized = normalize(label)
    return exact.has(normalized) || (regex?.test(normalized) ?? false)
  }
}
