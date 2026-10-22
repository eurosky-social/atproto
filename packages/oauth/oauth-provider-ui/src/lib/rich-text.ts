export type RichTextSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; target: string }

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g

/**
 * Splits operator-configured copy into plain text and `[label](target)` links.
 * The target is resolved by the caller (e.g. a link `rel`); anything that does
 * not match the syntax is kept verbatim.
 */
export function parseRichText(input: string): RichTextSegment[] {
  const segments: RichTextSegment[] = []
  let last = 0
  for (const match of input.matchAll(LINK_PATTERN)) {
    if (match.index > last) {
      segments.push({ type: 'text', text: input.slice(last, match.index) })
    }
    segments.push({ type: 'link', text: match[1], target: match[2] })
    last = match.index + match[0].length
  }
  if (last < input.length) {
    segments.push({ type: 'text', text: input.slice(last) })
  }
  return segments
}

/**
 * Sets {@link param} to {@link locale} on http(s) URLs, leaving any other URL
 * (mailto:, relative, invalid) untouched.
 */
export function withLocaleParam(
  href: string,
  param: string | undefined,
  locale: string,
): string {
  if (!param) return href
  try {
    const url = new URL(href)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return href
    url.searchParams.set(param, locale)
    return url.href
  } catch {
    return href
  }
}
