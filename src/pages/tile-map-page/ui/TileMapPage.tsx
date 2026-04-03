import { TileMapViewer } from '@/widgets/tile-map-viewer'

export function TileMapPage() {
  return (
    <main className="page">
      <section className="page__hero">
        <div>
          <span className="page__eyebrow">React + TypeScript + WebGL + FSD</span>
          <h1 className="page__title">Tile map 250 × 250</h1>
          <p className="page__description">
            Карта рендерится через чистый WebGL и текстурный атлас.
            Внутри сохранены ваши наработки: шейдеры, helpers для program/shader
            и математика через Matrix4 / Vector4.
          </p>
        </div>

        <div className="page__summary">
          <div className="page__summary-item">
            <span>Тайлов</span>
            <strong>62 500</strong>
          </div>
          <div className="page__summary-item">
            <span>Технология</span>
            <strong>Pure WebGL</strong>
          </div>
          <div className="page__summary-item">
            <span>Навигация</span>
            <strong>Pan / Zoom</strong>
          </div>
        </div>
      </section>

      <section className="page__viewer">
        <TileMapViewer />
      </section>
    </main>
  )
}
