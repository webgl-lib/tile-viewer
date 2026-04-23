import { useMemo } from "react";

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

  const { canvasRef } = useTileMapRenderer({
    manifest,
    camera,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  });

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
        </div>

        <button
          className="viewer-card__button"
          type="button"
          onClick={fitToWorld}
        >
          Fit to view
        </button>
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
