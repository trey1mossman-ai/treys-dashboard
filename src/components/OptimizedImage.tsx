import React, { useState, useEffect, useRef, memo } from 'react'
import { useIntersectionObserver, useNetworkStatus } from '@/hooks/usePerformance'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  srcSet?: string
  sizes?: string
  placeholder?: string
  className?: string
  loading?: 'lazy' | 'eager' | 'auto'
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
  fallback?: string
  blur?: boolean
  aspectRatio?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}

/**
 * Optimized image component with lazy loading, blur-up effect, and responsive loading
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  srcSet,
  sizes,
  placeholder,
  className,
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
  fallback = '/placeholder.svg',
  blur = true,
  aspectRatio,
  objectFit = 'cover'
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '')
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [shouldLoad, setShouldLoad] = useState(priority || loading === 'eager')
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const networkStatus = useNetworkStatus()
  
  // Use intersection observer for lazy loading
  const entry = useIntersectionObserver(containerRef, {
    threshold: 0.01,
    rootMargin: '50px',
    freezeOnceVisible: true
  })
  
  const isIntersecting = entry?.isIntersecting
  
  useEffect(() => {
    if (isIntersecting && !shouldLoad) {
      setShouldLoad(true)
    }
  }, [isIntersecting, shouldLoad])
  
  // Load image based on network conditions
  useEffect(() => {
    if (!shouldLoad) return
    
    // Skip loading in save-data mode for non-priority images
    if (networkStatus.saveData && !priority) {
      setImageSrc(fallback)
      setImageState('loaded')
      return
    }
    
    // Use lower quality for slow connections
    let loadSrc = src
    if (networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g') {
      // If we have a low-quality version, use it
      const url = new URL(src, window.location.origin)
      url.searchParams.set('quality', '30')
      loadSrc = url.toString()
    }
    
    // Preload image
    const img = new Image()
    
    if (srcSet) {
      img.srcset = srcSet
    }
    
    if (sizes) {
      img.sizes = sizes
    }
    
    img.onload = () => {
      setImageSrc(loadSrc)
      setImageState('loaded')
      onLoad?.()
    }
    
    img.onerror = () => {
      setImageSrc(fallback)
      setImageState('error')
      onError?.()
    }
    
    img.src = loadSrc
    
    // Cleanup
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [shouldLoad, src, srcSet, sizes, fallback, priority, networkStatus, onLoad, onError])
  
  // Preload priority images
  useEffect(() => {
    if (priority && src) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      
      if (srcSet) {
        link.setAttribute('imagesrcset', srcSet)
      }
      
      if (sizes) {
        link.setAttribute('imagesizes', sizes)
      }
      
      document.head.appendChild(link)
      
      return () => {
        document.head.removeChild(link)
      }
    }
  }, [priority, src, srcSet, sizes])
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        aspectRatio && 'aspect-ratio',
        className
      )}
      style={{
        aspectRatio: aspectRatio
      }}
    >
      {/* Placeholder/Loading state */}
      {imageState === 'loading' && placeholder && (
        <img
          src={placeholder}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full',
            blur && 'blur-md scale-110',
            'transition-all duration-300'
          )}
          style={{ objectFit }}
          aria-hidden="true"
        />
      )}
      
      {/* Loading skeleton */}
      {imageState === 'loading' && !placeholder && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc || fallback}
        alt={alt}
        srcSet={shouldLoad ? srcSet : undefined}
        sizes={shouldLoad ? sizes : undefined}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
        )}
        style={{ objectFit }}
        onLoad={() => {
          if (imageState !== 'loaded') {
            setImageState('loaded')
            onLoad?.()
          }
        }}
        onError={() => {
          if (imageState !== 'error') {
            setImageState('error')
            setImageSrc(fallback)
            onError?.()
          }
        }}
      />
      
      {/* Error state */}
      {imageState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  )
})

/**
 * Picture component for responsive images with multiple sources
 */
interface PictureProps {
  sources: Array<{
    srcSet: string
    media?: string
    type?: string
    sizes?: string
  }>
  src: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: boolean
}

export const Picture = memo(function Picture({
  sources,
  src,
  alt,
  className,
  loading = 'lazy',
  priority = false
}: PictureProps) {
  return (
    <picture className={className}>
      {sources.map((source, index) => (
        <source
          key={index}
          srcSet={source.srcSet}
          media={source.media}
          type={source.type}
          sizes={source.sizes}
        />
      ))}
      <OptimizedImage
        src={src}
        alt={alt}
        className="w-full h-full"
        loading={loading}
        priority={priority}
      />
    </picture>
  )
})

/**
 * Background image component with lazy loading
 */
interface BackgroundImageProps {
  src: string
  className?: string
  children?: React.ReactNode
  overlay?: boolean
  overlayOpacity?: number
  parallax?: boolean
  blur?: boolean
}

export const BackgroundImage = memo(function BackgroundImage({
  src,
  className,
  children,
  overlay = false,
  overlayOpacity = 0.5,
  parallax = false,
  blur = false
}: BackgroundImageProps) {
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const entry = useIntersectionObserver(containerRef, {
    threshold: 0,
    rootMargin: '100px'
  })
  
  useEffect(() => {
    if (entry?.isIntersecting) {
      const img = new Image()
      img.onload = () => setLoaded(true)
      img.src = src
    }
  }, [entry?.isIntersecting, src])
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        parallax && 'attachment-fixed',
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-center transition-all duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          blur && 'blur-sm',
          parallax && 'bg-fixed'
        )}
        style={{
          backgroundImage: loaded ? `url(${src})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  )
})

/**
 * Avatar component with optimized loading
 */
interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Avatar = memo(function Avatar({
  src,
  alt,
  name,
  size = 'md',
  className
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }
  
  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  if (!src) {
    return (
      <div
        className={cn(
          'rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold',
          sizeClasses[size],
          className
        )}
      >
        {initials || '?'}
      </div>
    )
  }
  
  return (
    <OptimizedImage
      src={src}
      alt={alt || name || 'Avatar'}
      className={cn(
        'rounded-full',
        sizeClasses[size],
        className
      )}
      objectFit="cover"
      loading="lazy"
    />
  )
})