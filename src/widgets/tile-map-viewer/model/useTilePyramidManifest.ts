import { startTransition, useEffect, useState } from 'react'

import { loadTilePyramidManifest } from '../lib/load-tile-pyramid-manifest'
import type { TilePyramidManifest } from '../lib/tile-pyramid'

type TilePyramidManifestState =
  | {
      status: 'loading'
      manifest: null
      error: null
    }
  | {
      status: 'ready'
      manifest: TilePyramidManifest
      error: null
    }
  | {
      status: 'error'
      manifest: null
      error: string
    }

const INITIAL_STATE: TilePyramidManifestState = {
  status: 'loading',
  manifest: null,
  error: null
}

export function useTilePyramidManifest() {
  const [state, setState] = useState<TilePyramidManifestState>(INITIAL_STATE)

  useEffect(() => {
    const abortController = new AbortController()

    loadTilePyramidManifest(abortController.signal)
      .then((manifest) => {
        startTransition(() => {
          setState({
            status: 'ready',
            manifest,
            error: null
          })
        })
      })
      .catch((error: Error) => {
        if (abortController.signal.aborted) {
          return
        }

        setState({
          status: 'error',
          manifest: null,
          error: error.message
        })
      })

    return () => {
      abortController.abort()
    }
  }, [])

  return state
}
