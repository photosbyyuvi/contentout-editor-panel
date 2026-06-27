// The Content Out wordmark + arrow, rendered in currentColor so it adapts to
// the dark/light theme. Pass a size class (logo-sidebar / logo-hero / logo-bar).
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`logo ${className ?? ''}`} aria-label="Content Out" role="img">
      <span className="logo-words" aria-hidden="true">
        <span>Content</span>
        <span>Out</span>
      </span>
      <svg className="logo-arrow" viewBox="0 0 60 40" aria-hidden="true" focusable="false">
        <path d="M0 13 H38 V2 L60 20 L38 38 V27 H0 Z" fill="currentColor" />
      </svg>
    </span>
  )
}
