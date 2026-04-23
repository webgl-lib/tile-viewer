# WebGL Tile Map

Проект показывает пирамиду реальных raster-тайлов в React-приложении через чистый WebGL.

## Запуск

```bash
npm install
npm run dev
```

## Что есть сейчас

- загрузка внешнего tileset через `vite.config.ts`
- выбор подходящего LOD по масштабу камеры
- подгрузка только видимых PNG-тайлов
- `Fit to view`, pan и zoom
