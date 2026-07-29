# ChurchFoundry

PWA для менеджменту церкви: члени, інвентар, розклад кімнат і служіння.

## Стек

- Vite + React 18 + TypeScript
- React Router v7
- TanStack Query
- React Hook Form + Zod
- Tailwind CSS + shadcn/ui
- vite-plugin-pwa
- react-i18next (uk за замовчуванням, en)
- Biome
- Vitest
- Supabase (`@supabase/supabase-js`)
- pnpm

## Локальний запуск

### 1. Вимоги

- Node.js 20+
- [pnpm](https://pnpm.io/installation)

### 2. Встановлення залежностей

```bash
pnpm install
```

### 3. Налаштування середовища

Скопіюйте приклад змінних і заповніть значеннями з вашого проєкту Supabase:

```bash
cp .env.example .env
```

У `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Dev-сервер

```bash
pnpm dev
```

Відкрийте адресу з терміналу (зазвичай `http://localhost:5173`).

### 5. Корисні команди

```bash
pnpm build          # production build
pnpm preview        # перегляд build
pnpm lint           # biome check
pnpm test           # vitest run
pnpm test:watch     # vitest у watch-режимі
```

## Структура

```
src/
  components/   # UI та спільні компоненти
  pages/        # сторінки застосунку
  hooks/        # React hooks
  lib/          # supabase, i18n, utils
  locales/      # uk.json, en.json
  types/        # TypeScript типи
```
