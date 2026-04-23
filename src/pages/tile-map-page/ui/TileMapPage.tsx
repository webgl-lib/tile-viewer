import { TileMapViewer } from "@/widgets/tile-map-viewer";

export function TileMapPage() {
  return (
    <main className="page">
      <section className="page__viewer page__viewer--fullscreen">
        <TileMapViewer />
      </section>
    </main>
  );
}
