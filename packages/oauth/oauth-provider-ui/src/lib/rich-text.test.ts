import { describe, expect, it } from 'vitest'
import { parseRichText, withLocaleParam } from './rich-text.ts'

describe(parseRichText, () => {
  it('returns plain text as a single segment', () => {
    expect(parseRichText('Be kind.')).toEqual([
      { type: 'text', text: 'Be kind.' },
    ])
  })

  it('splits links out of the surrounding text', () => {
    expect(
      parseRichText(
        'Read the [terms](terms-of-service) and [privacy](privacy-policy).',
      ),
    ).toEqual([
      { type: 'text', text: 'Read the ' },
      { type: 'link', text: 'terms', target: 'terms-of-service' },
      { type: 'text', text: ' and ' },
      { type: 'link', text: 'privacy', target: 'privacy-policy' },
      { type: 'text', text: '.' },
    ])
  })

  it('keeps malformed link syntax verbatim', () => {
    expect(parseRichText('a [b] (c) [d](e f)')).toEqual([
      { type: 'text', text: 'a [b] (c) [d](e f)' },
    ])
  })

  it('returns no segments for an empty string', () => {
    expect(parseRichText('')).toEqual([])
  })
})

describe(withLocaleParam, () => {
  it('sets the parameter on http(s) URLs', () => {
    expect(withLocaleParam('https://x.test/terms.html', 'lang', 'nl')).toBe(
      'https://x.test/terms.html?lang=nl',
    )
    expect(withLocaleParam('https://x.test/t?lang=en&a=1', 'lang', 'nl')).toBe(
      'https://x.test/t?lang=nl&a=1',
    )
  })

  it('leaves other URLs and an unset parameter alone', () => {
    expect(withLocaleParam('mailto:support@x.test', 'lang', 'nl')).toBe(
      'mailto:support@x.test',
    )
    expect(withLocaleParam('https://x.test/', undefined, 'nl')).toBe(
      'https://x.test/',
    )
  })
})
