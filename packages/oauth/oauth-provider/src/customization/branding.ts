import { z } from 'zod'
import { backgroundsSchema } from './background.js'
import { colorsSchema } from './colors.js'
import { imageUrlSchema } from './image-url.js'
import { linksSchema } from './links.js'
import { textsSchema } from './texts.js'

export const brandingSchema = z.object({
  name: z.string().optional(),
  logo: imageUrlSchema.optional(),
  colors: colorsSchema.optional(),
  background: backgroundsSchema.optional(),
  links: z.array(linksSchema).optional(),
  /**
   * Query parameter added to every http(s) link with the current UI locale
   * (e.g. `lang` turns `/terms` into `/terms?lang=nl`).
   */
  linksLocaleParam: z.string().min(1).optional(),
  texts: textsSchema.optional(),
})
export type BrandingConfig = z.input<typeof brandingSchema>
export type Branding = z.infer<typeof brandingSchema>
