import { useCallback, useRef, useState } from 'react'

type ElementSize = {
  width: number
  height: number
}

const INITIAL_SIZE: ElementSize = {
  width: 1,
  height: 1
}

function resolveElementSize(element: Element): ElementSize {
  const rect = element.getBoundingClientRect()

  return {
    width: Math.max(rect.width, 1),
    height: Math.max(rect.height, 1)
  }
}

export function useElementSize<TElement extends Element>() {
  const observerRef = useRef<ResizeObserver | null>(null)
  const [size, setSize] = useState<ElementSize>(INITIAL_SIZE)

  const ref = useCallback((node: TElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null

    if (!node) {
      return
    }

    setSize(resolveElementSize(node))

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(entry.contentRect.width, 1),
        height: Math.max(entry.contentRect.height, 1)
      })
    })

    observer.observe(node)
    observerRef.current = observer
  }, [])

  return {
    ref,
    size
  }
}
