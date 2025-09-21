import * as React from 'react'
import { cn } from '@/lib/utils'

export type ResponsiveCardVariant = 'surface' | 'translucent' | 'outline' | 'elevated'
export type ResponsiveCardPadding =
  | 'none'
  | 'sm'
  | 'md'
  | 'lg'
  | 'compact'
  | 'comfortable'
  | 'spacious'
export type ResponsiveCardElevation =
  | 'none'
  | 'sm'
  | 'md'
  | 'lg'
  | 'flat'
  | 'raised'
  | 'floating'
export type ResponsiveCardGlow = 'none' | 'hover' | 'focus' | 'always'

export interface ResponsiveCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
  as?: React.ElementType
  variant?: ResponsiveCardVariant
  padding?: ResponsiveCardPadding
  elevation?: ResponsiveCardElevation
  interactive?: boolean
  bleed?: boolean
  glow?: ResponsiveCardGlow
}

const defaultElement = 'section'

export const ResponsiveCard = React.forwardRef<HTMLElement, ResponsiveCardProps>(
  (
    {
      as: Component = defaultElement,
      variant = 'surface',
      padding = 'md',
      elevation = 'md',
      interactive = false,
      bleed = false,
      glow = 'none',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const element = Component as React.ElementType

    const paddingMap: Record<ResponsiveCardPadding, 'none' | 'sm' | 'md' | 'lg'> = {
      none: 'none',
      sm: 'sm',
      md: 'md',
      lg: 'lg',
      compact: 'sm',
      comfortable: 'md',
      spacious: 'lg'
    }

    const variantMap: Record<ResponsiveCardVariant, 'surface' | 'translucent' | 'outline'> = {
      surface: 'surface',
      translucent: 'translucent',
      outline: 'outline',
      elevated: 'surface'
    }

    const elevationMap: Record<ResponsiveCardElevation, 'none' | 'sm' | 'md' | 'lg'> = {
      none: 'none',
      sm: 'sm',
      md: 'md',
      lg: 'lg',
      flat: 'none',
      raised: 'sm',
      floating: 'lg'
    }

    const normalizedPadding = paddingMap[padding]
    const normalizedVariant = variantMap[variant]
    const normalizedElevation = elevationMap[elevation]
    const effectiveElevation =
      variant === 'elevated' && normalizedElevation === 'md'
        ? 'lg'
        : normalizedElevation

    return React.createElement(
      element,
      {
        ref,
        className: cn(
          'responsive-card',
          interactive && 'responsive-card--interactive',
          bleed && 'responsive-card--bleed',
          className
        ),
        'data-responsive-card': '',
        'data-variant': normalizedVariant,
        'data-padding': normalizedPadding,
        'data-elevation': effectiveElevation,
        'data-glow': glow,
        'data-interactive': interactive || undefined,
        ...props
      },
      children
    )
  }
)
ResponsiveCard.displayName = 'ResponsiveCard'

export type ResponsiveCardHeaderProps = React.HTMLAttributes<HTMLDivElement>

export const ResponsiveCardHeader = React.forwardRef<HTMLDivElement, ResponsiveCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('responsive-card__header', className)}
      data-card-section="header"
      {...props}
    />
  )
)
ResponsiveCardHeader.displayName = 'ResponsiveCardHeader'

export type ResponsiveCardTitleProps = React.HTMLAttributes<HTMLHeadingElement>

export const ResponsiveCardTitle = React.forwardRef<HTMLHeadingElement, ResponsiveCardTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('responsive-card__title', className)}
      data-card-typography="title"
      {...props}
    />
  )
)
ResponsiveCardTitle.displayName = 'ResponsiveCardTitle'

export type ResponsiveCardSubtitleProps = React.HTMLAttributes<HTMLParagraphElement>

export const ResponsiveCardSubtitle = React.forwardRef<
  HTMLParagraphElement,
  ResponsiveCardSubtitleProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('responsive-card__subtitle', className)}
    data-card-typography="subtitle"
    {...props}
  />
))
ResponsiveCardSubtitle.displayName = 'ResponsiveCardSubtitle'

export type ResponsiveCardContentProps = React.HTMLAttributes<HTMLDivElement> & {
  scrollable?: boolean
  padded?: boolean
}

export const ResponsiveCardContent = React.forwardRef<
  HTMLDivElement,
  ResponsiveCardContentProps
>(({ className, scrollable = false, padded = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'responsive-card__content',
      scrollable && 'responsive-card__content--scrollable',
      !padded && 'responsive-card__content--unpadded',
      className
    )}
    data-card-section="content"
    data-scrollable={scrollable || undefined}
    {...props}
  />
))
ResponsiveCardContent.displayName = 'ResponsiveCardContent'

export type ResponsiveCardFooterProps = React.HTMLAttributes<HTMLDivElement>

export const ResponsiveCardFooter = React.forwardRef<HTMLDivElement, ResponsiveCardFooterProps>(
  ({ className, ...props }, ref) => (
    <footer
      ref={ref}
      className={cn('responsive-card__footer', className)}
      data-card-section="footer"
      {...props}
    />
  )
)
ResponsiveCardFooter.displayName = 'ResponsiveCardFooter'

export type ResponsiveCardToolbarProps = React.HTMLAttributes<HTMLDivElement>

export const ResponsiveCardToolbar = React.forwardRef<HTMLDivElement, ResponsiveCardToolbarProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('responsive-card__toolbar', className)}
      data-card-section="toolbar"
      {...props}
    />
  )
)
ResponsiveCardToolbar.displayName = 'ResponsiveCardToolbar'

export type ResponsiveCardMediaProps = React.HTMLAttributes<HTMLDivElement>

export const ResponsiveCardMedia = React.forwardRef<HTMLDivElement, ResponsiveCardMediaProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('responsive-card__media', className)}
      data-card-section="media"
      {...props}
    />
  )
)
ResponsiveCardMedia.displayName = 'ResponsiveCardMedia'

export const ResponsiveCardSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('responsive-card__section', className)}
    data-card-section="section"
    {...props}
  />
))
ResponsiveCardSection.displayName = 'ResponsiveCardSection'

export const ResponsiveCardDivider: React.FC<React.HTMLAttributes<HTMLHRElement>> = ({ className, ...props }) => (
  <hr
    className={cn('responsive-card__divider', className)}
    data-card-divider="true"
    {...props}
  />
)

export const ResponsiveCardMeta = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('responsive-card__meta', className)}
    data-card-section="meta"
    {...props}
  />
))
ResponsiveCardMeta.displayName = 'ResponsiveCardMeta'

export const ResponsiveCardList = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn('responsive-card__list', className)}
    data-card-section="list"
    {...props}
  />
))
ResponsiveCardList.displayName = 'ResponsiveCardList'

export const ResponsiveCardListItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <li
    ref={ref}
    className={cn(
      'responsive-card__list-item',
      interactive && 'responsive-card__list-item--interactive',
      className
    )}
    data-card-list-item="true"
    data-interactive={interactive || undefined}
    {...props}
  />
))
ResponsiveCardListItem.displayName = 'ResponsiveCardListItem'

export const ResponsiveCardAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn('responsive-card__action touch-target', className)}
    data-card-action="true"
    {...props}
  />
))
ResponsiveCardAction.displayName = 'ResponsiveCardAction'

export const ResponsiveCardAnchor = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn('responsive-card__action touch-target', className)}
    data-card-action="true"
    {...props}
  />
))
ResponsiveCardAnchor.displayName = 'ResponsiveCardAnchor'
