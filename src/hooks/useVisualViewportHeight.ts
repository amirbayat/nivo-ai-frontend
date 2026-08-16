import { useEffect, useState } from 'react'

/**
 * Tracks window.visualViewport height/offsetTop so layouts can shrink to the space
 * actually visible above the on-screen keyboard on mobile browsers (iOS Safari keeps
 * the layout viewport full-height and overlays the keyboard instead of resizing it,
 * unlike Android Chrome).
 *
 * offsetTop matters too: when the keyboard opens, iOS Safari can shift the visual
 * viewport down relative to the layout viewport (even without the document itself
 * scrolling) to keep the focused field visible. A fixed-position container sized only
 * by height, without compensating for this offset, ends up misaligned — the classic
 * "everything jumps/overlaps" glitch when tapping an input. Consumers should pin their
 * root with `position: fixed; top: <offsetTop>px` alongside `height: <height>px`.
 */
export function useVisualViewportHeight() {
  const [state, setState] = useState(() => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    offsetTop: window.visualViewport?.offsetTop ?? 0,
  }))

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setState({ height: vv.height, offsetTop: vv.offsetTop })
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return state
}
