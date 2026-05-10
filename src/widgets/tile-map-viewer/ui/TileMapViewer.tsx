import { useMemo, useState } from "react";

import { useTileCamera } from "@/features/tile-camera";
import { useElementSize } from "@/shared/lib/react/useElementSize";

import { getLevelForZoom } from "../lib/tile-pyramid";
import { useTilePyramidManifest } from "../model/useTilePyramidManifest";
import { useTileMapRenderer } from "../model/useTileMapRenderer";

const EMPTY_VIEWPORT = {
  width: 1,
  height: 1,
};

export function TileMapViewer() {
  const [contrastSettings, setContrastSettings] = useState({
    low: 0,
    high: 1,
    gamma: 1,
  });
  const { ref: containerRef, size: viewport } =
    useElementSize<HTMLDivElement>();
  const manifestState = useTilePyramidManifest();
  const manifest = manifestState.manifest;

  const { camera, bind, fitToWorld } = useTileCamera({
    worldWidth: manifest?.worldWidth ?? EMPTY_VIEWPORT.width,
    worldHeight: manifest?.worldHeight ?? EMPTY_VIEWPORT.height,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    resetKey: manifest
      ? `${manifest.worldWidth}:${manifest.worldHeight}:${manifest.levels.length}`
      : "empty",
  });

  const activeLevel = useMemo(() => {
    if (!manifest) {
      return null;
    }

    return getLevelForZoom(manifest, camera.zoom);
  }, [camera.zoom, manifest]);

  const { canvasRef, fps } = useTileMapRenderer({
    manifest,
    camera,
    contrastSettings,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  });

  const updateContrastSetting = (
    key: keyof typeof contrastSettings,
    value: number
  ) => {
    setContrastSettings((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      if (key === "low" && next.low >= next.high) {
        next.high = Math.min(next.low + 0.01, 1);
      }

      if (key === "high" && next.high <= next.low) {
        next.low = Math.max(next.high - 0.01, 0);
      }

      return next;
    });
  };

  return (
    <div className="viewer-card">
      <div className="viewer-card__toolbar">
        <div className="viewer-card__stats">
          <span>
            {manifest
              ? `${manifest.baseColumns} x ${manifest.baseRows}`
              : "tileset..."}
          </span>
          <span>{activeLevel ? `LOD z=${activeLevel.z}` : "LOD --"}</span>
          <span>zoom: {camera.zoom.toFixed(2)}x</span>
          <span>fps: {fps || "--"}</span>
        </div>

        <button
          className="viewer-card__button"
          type="button"
          onClick={fitToWorld}
        >
          Fit to view
        </button>
      </div>

      <div className="viewer-card__contrast-panel">
        <label className="viewer-card__slider">
          <span>low {contrastSettings.low.toFixed(2)}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={contrastSettings.low}
            onChange={(event) =>
              updateContrastSetting("low", Number(event.target.value))
            }
          />
        </label>

        <label className="viewer-card__slider">
          <span>high {contrastSettings.high.toFixed(2)}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={contrastSettings.high}
            onChange={(event) =>
              updateContrastSetting("high", Number(event.target.value))
            }
          />
        </label>

        <label className="viewer-card__slider">
          <span>gamma {contrastSettings.gamma.toFixed(2)}</span>
          <input
            type="range"
            min="0.2"
            max="4"
            step="0.01"
            value={contrastSettings.gamma}
            onChange={(event) =>
              updateContrastSetting("gamma", Number(event.target.value))
            }
          />
        </label>
      </div>

      <div ref={containerRef} className="viewer-card__canvas-shell">
        {manifestState.status === "error" && (
          <div className="viewer-card__overlay">
            Не удалось загрузить tileset: {manifestState.error}
          </div>
        )}

        {manifestState.status === "loading" && (
          <div className="viewer-card__overlay">
            Загрузка Landsat tileset...
          </div>
        )}

        <canvas ref={canvasRef} className="viewer-card__canvas" {...bind} />
      </div>
    </div>
  );
}
