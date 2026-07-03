"use client"

import { useEffect, useCallback } from 'react'

/**
 * Global cleanup for Radix UI side effects (aria-hidden, pointer-events) that get
 * stuck when a Dialog/Popover/ContextMenu is unmounted during its closing animation.
 *
 * Radix's DismissableLayer uses a module-level `originalBodyPointerEvents` variable that
 * gets overwritten with "none" when a Dialog opens while another overlay is still closing.
 * When the Dialog later closes, it restores pointerEvents to the saved "none" value,
 * permanently freezing the UI.
 *
 * This hook installs a MutationObserver and a periodic fallback to clean up stuck state.
 */
export function useRadixCleanup() {
  const cleanupRadixSideEffects = useCallback(() => {
    const hasOpenOverlay =
      document.querySelector('[data-radix-popper-content-wrapper]:not([data-state="closed"])') ||
      document.querySelector('[role="dialog"][data-state="open"]') ||
      document.querySelector('[data-radix-overlay]:not([data-state="closed"])')

    if (!hasOpenOverlay) {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = ''
      }
      // Remove stuck aria-hidden from main containers
      document.querySelectorAll('[data-aria-hidden="true"]').forEach(el => {
        // Skip Radix popper wrappers - they manage their own aria-hidden
        if (el.hasAttribute('data-radix-popper-content-wrapper')) return
        el.removeAttribute('aria-hidden')
        el.removeAttribute('data-aria-hidden')
      })
    }
  }, [])

  // MutationObserver: fires when aria-hidden attributes change on any element
  useEffect(() => {
    const observer = new MutationObserver(() => {
      cleanupRadixSideEffects()
    })
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'data-aria-hidden'],
      subtree: true,
    })
    return () => observer.disconnect()
  }, [cleanupRadixSideEffects])

  // Fallback: periodically check for stuck pointer-events
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.body.style.pointerEvents === 'none') {
        const hasOpenOverlay =
          document.querySelector('[data-radix-popper-content-wrapper]:not([data-state="closed"])') ||
          document.querySelector('[role="dialog"][data-state="open"]') ||
          document.querySelector('[data-radix-overlay]:not([data-state="closed"])')
        if (!hasOpenOverlay) {
          document.body.style.pointerEvents = ''
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])
}
