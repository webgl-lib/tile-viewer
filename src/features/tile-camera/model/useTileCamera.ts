import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from 'react'

import { createFitCamera } from './create-fit-camera'
import type { TileCamera } from './types'

type UseTileCameraParams = {
  worldWidth: number
  worldHeight: number
  viewportWidth: number
  viewportHeight: number
  minZoom?: number
  maxZoom?: number
  resetKey?: string | number
}

type PointerState = {
  isDragging: boolean
  lastX: number
  lastY: number
}

const DEFAULT_CAMERA: TileCamera = {
  x: 0,
  y: 0,
  zoom: 1
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function useTileCamera({
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  minZoom = 0.05,
  maxZoom = 4,
  resetKey
}: UseTileCameraParams) {
  const [camera, setCamera] = useState<TileCamera>(DEFAULT_CAMERA)
  const pointerStateRef = useRef<PointerState>({
    isDragging: false,
    lastX: 0,
    lastY: 0
  })
  const isInitializedRef = useRef(false)
  const lastResetKeyRef = useRef<string | number | undefined>(resetKey)

  const fitCamera = useMemo(
    () =>
      createFitCamera({
        worldWidth,
        worldHeight,
        viewportWidth,
        viewportHeight
      }),
    [viewportHeight, viewportWidth, worldHeight, worldWidth]
  )

  useEffect(() => {
    if (
      viewportWidth <= 0 ||
      viewportHeight <= 0 ||
      worldWidth <= 0 ||
      worldHeight <= 0
    ) {
      return
    }

    if (!isInitializedRef.current) {
      setCamera(fitCamera)
      isInitializedRef.current = true
      lastResetKeyRef.current = resetKey
      return
    }

    if (resetKey !== lastResetKeyRef.current) {
      setCamera(fitCamera)
      lastResetKeyRef.current = resetKey
    }
  }, [fitCamera, resetKey, viewportHeight, viewportWidth, worldHeight, worldWidth])

  const fitToWorld = useCallback(() => {
    setCamera(fitCamera)
  }, [fitCamera])

  const bind = useMemo(() => {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => {
        pointerStateRef.current.isDragging = true
        pointerStateRef.current.lastX = event.clientX
        pointerStateRef.current.lastY = event.clientY
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!pointerStateRef.current.isDragging) {
          return
        }

        const dx = event.clientX - pointerStateRef.current.lastX
        const dy = event.clientY - pointerStateRef.current.lastY

        pointerStateRef.current.lastX = event.clientX
        pointerStateRef.current.lastY = event.clientY

        setCamera((current) => ({
          ...current,
          x: current.x - dx / current.zoom,
          y: current.y - dy / current.zoom
        }))
      },
      onPointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => {
        pointerStateRef.current.isDragging = false
        event.currentTarget.releasePointerCapture(event.pointerId)
      },
      onPointerLeave: () => {
        pointerStateRef.current.isDragging = false
      },
      onWheel: (event: ReactWheelEvent<HTMLCanvasElement>) => {
        event.preventDefault()

        const rect = event.currentTarget.getBoundingClientRect()
        const pointerX = event.clientX - rect.left
        const pointerY = event.clientY - rect.top

        setCamera((current) => {
          const zoomFactor = Math.exp(-event.deltaY * 0.0015)
          const nextZoom = clamp(current.zoom * zoomFactor, minZoom, maxZoom)

          const worldX = current.x + pointerX / current.zoom
          const worldY = current.y + pointerY / current.zoom

          return {
            x: worldX - pointerX / nextZoom,
            y: worldY - pointerY / nextZoom,
            zoom: nextZoom
          }
        })
      }
    }
  }, [maxZoom, minZoom])

  return {
    camera,
    bind,
    fitToWorld,
    setCamera
  }
}
