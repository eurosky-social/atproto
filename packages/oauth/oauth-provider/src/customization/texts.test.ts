import { describe, expect, it } from 'vitest'
import { brandingSchema } from './branding.js'

describe('branding.texts', () => {
  it('accepts plain and per-locale strings', () => {
    const result = brandingSchema.safeParse({
      texts: {
        signUp: {
          title: { en: 'Welcome!', nl: 'Welkom!' },
          subtitle: '',
          hideHandleChangeNote: true,
          terms: {
            intro: 'Before we begin:',
            rules: ['Be kind.', { en: 'No spam', nl: 'Geen spam' }],
            checkbox: 'I accept the [terms](terms-of-service).',
          },
        },
        consent: {
          intro: { nl: 'Je kunt je account ook elders gebruiken.' },
          notice: 'See the app’s [terms](client-tos).',
          acceptLabel: 'Accept',
          rejectLabel: 'I do not accept',
        },
      },
    })

    expect(result.success).toBe(true)
  })

  it('rejects an invalid locale key', () => {
    const result = brandingSchema.safeParse({
      texts: { signUp: { title: { dutch: 'Welkom!' } } },
    })

    expect(result.success).toBe(false)
  })

  it('rejects a non-string rule', () => {
    const result = brandingSchema.safeParse({
      texts: { signUp: { terms: { rules: [42] } } },
    })

    expect(result.success).toBe(false)
  })
})
