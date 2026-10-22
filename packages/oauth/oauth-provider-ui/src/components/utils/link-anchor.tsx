import type { JSX } from 'react'
import type { LinkDefinition } from '@atproto/oauth-provider-api'
import { useCustomizationData } from '#/contexts/customization.tsx'
import { withLocaleParam } from '#/lib/rich-text.ts'
import type { Override } from '#/lib/util.ts'
import { useCurrentLocale } from '#/locales/locale-provider.tsx'
import { LinkExternal } from './link-external.tsx'
import { LinkTitle } from './link-title.tsx'

export type LinkAnchorProps = Override<
  JSX.IntrinsicElements['a'],
  {
    link: LinkDefinition
  }
>
export function LinkAnchor({
  link,

  // a
  children = <LinkTitle link={link} />,
  href = link.href,
  rel = link.rel,
  ...props
}: LinkAnchorProps) {
  // Deployments can ask for their pages to open in the UI's language.
  const { linksLocaleParam } = useCustomizationData()
  const locale = useCurrentLocale()

  return (
    <LinkExternal
      {...props}
      href={withLocaleParam(href, linksLocaleParam, locale)}
      rel={rel}
    >
      {children ?? <LinkTitle link={link} />}
    </LinkExternal>
  )
}
