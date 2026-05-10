# WebGL Tile Map

Проект показывает пирамиду больших изображений в React-приложении через чистый WebGL.
Тайлы грузятся из внешнего tileset как `.raw` с 16-битными значениями пикселей.

## Запуск

```bash
npm install
npm run dev
```

## Что есть сейчас

- загрузка внешнего tileset через `vite.config.ts`
- выбор подходящего LOD по масштабу камеры
- подгрузка только видимых raw-тайлов
- сохранение raw-значений в GPU-текстурах: float-текстура при наличии `OES_texture_float`, иначе lossless-pack 16 бит в RGBA8
- контрастирование в fragment shader через `low`, `high` и `gamma`
- `Fit to view`, pan и zoom

## Данные

Dev-сервер отдаёт `/landsat-tiles/index.json` и файлы `/landsat-tiles/{z}_{x}_{y}.raw`
из директории, заданной в `TILESET_DIR` в `vite.config.ts`.
PNG-файлы сейчас используются только для обнаружения размеров уровней пирамиды.
