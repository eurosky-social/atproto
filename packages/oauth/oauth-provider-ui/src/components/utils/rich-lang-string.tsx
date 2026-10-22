import { Fragment, type ReactNode, useMemo } from 'react'
import type { LangString } from '@atproto/oauth-provider-api'
import { useCustomizationData } from '#/contexts/customization.tsx'
import { getLangString } from '#/lib/lang.ts'
import { parseRichText } from '#/lib/rich-text.ts'
import { useCurrentLocale } from '#/locales/locale-provider.tsx'
import { LinkAnchor } from './link-anchor.tsx'
import { LinkExternal } from './link-external.tsx'

const LINK_CLASS_NAME = 'text-foreground underline'

/**
 * Resolves a deployment-configured {@link LangString} for the current locale
 * (falling back to English, then any translation), rendering its
 * `[label](target)` links. A target names a branding link by `rel`, or one of
 * the {@link extraTargets} (e.g. a client's terms on the consent screen). A
 * target that resolves to nothing renders as its plain label.
 */
export function RichLangString({
  value,
  extraTargets,
}: {
  value: LangString
  extraTargets?: Record<string, string | undefined>
}): ReactNode {
  const locale = useCurrentLocale()
  const { links } = useCustomizationData()

  const text = useMemo(() => resolveLangString(value, locale), [value, locale])

  return parseRichText(text).map((segment, i) => {
    if (segment.type === 'text') {
      return <Fragment key={i}>{segment.text}</Fragment>
    }

    const link = links?.find((l) => l.rel === segment.target)
    if (link) {
      return (
        <LinkAnchor key={i} link={link} className={LINK_CLASS_NAME}>
          {segment.text}
        </LinkAnchor>
      )
    }

    const href = extraTargets?.[segment.target]
    if (href) {
      return (
        <LinkExternal
          key={i}
          href={href}
          rel="nofollow noopener"
          className={LINK_CLASS_NAME}
        >
          {segment.text}
        </LinkExternal>
      )
    }

    return <Fragment key={i}>{segment.text}</Fragment>
  })
}

/** {@link RichLangString} for attributes and labels: plain text, no links. */
export function useLangText(value?: LangString): string | undefined {
  const locale = useCurrentLocale()
  return useMemo(() => {
    if (value == null) return undefined
    return parseRichText(resolveLangString(value, locale))
      .map((s) => s.text)
      .join('')
  }, [value, locale])
}

// The current locale's translation, else English, else any translation.
function resolveLangString(value: LangString, locale: string): string {
  return (
    getLangString(value, locale) ??
    (typeof value === 'object'
      ? (value['en'] ?? Object.values(value).find(Boolean))
      : value) ??
    ''
  )
}
