import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

const SCRIPT_ID = 'cf-turnstile-script'

interface TurnstileWidgetProps {
  siteKey?: string
  onToken: (token: string) => void
}

export function TurnstileWidget({ siteKey, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false
    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current || widgetRef.current) return
      widgetRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        size: 'flexible',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = SCRIPT_ID
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', render, { once: true })
    }

    return () => {
      cancelled = true
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current)
        widgetRef.current = null
      }
    }
  }, [siteKey, onToken])

  if (!siteKey) return null
  return <div className="turnstile-wrap" ref={containerRef} />
}
