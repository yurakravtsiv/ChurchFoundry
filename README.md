# ChurchFoundry

PWA для менеджменту церкви (члени, інвентар, розклад кімнат, служіння).

## Стек технологій

- **Vite + React 18 + TypeScript**
- **React Router v7**
- **TanStack Query** — data fetching / mutations / cache invalidation
- **TanStack Table** — таблиці інвентарю
- **React Hook Form + Zod** — форми та валідація
- **Tailwind CSS + shadcn/ui**
- **Motion** — анімації UI
- **vite-plugin-pwa** — Progressive Web App
- **react-i18next** — uk / en
- **Biome** — lint + format
- **Vitest** — unit/компонентні тести
- **pnpm**
- **Supabase** — Auth уже використовується; дані інвентарю поки в **localStorage**, з готовою архітектурою переходу на Supabase через TanStack Query хуки

## Реалізований функціонал

- **Автентифікація** — email/password через Supabase Auth
- **Дашборд** — віджети (предмети що потребують ремонту, позичені)
- **Інвентар** (повний модуль):
  - CRUD предметів
  - категорії / підкатегорії / локації зі створенням «на льоту»
  - фільтри та пошук по всіх полях
  - QR-коди для кожного предмета
  - списання / повернення в наявність з історією
  - експорт у XLSX / PDF
  - вибір дат через локалізований DatePicker (місяць/рік)
- **PWA** — іконка на робочий стіл, offline-friendly, pull-to-refresh, сповіщення про нову версію
- **Теми** — світла / темна, автовизначення системної теми
- **Багатомовність** — uk / en
- **Responsive** — mobile-first, окремі layout для десктопу та мобільного

## Заплановано / не реалізовано

- Real-time updates
- Повне тестове покриття (Vitest налаштований, тестів мало)
- Optimistic updates
- Error boundaries
- Accessibility audit
- Розділи **«Люди»** / **«Служіння»** / **«Календар»** — заглушки «Незабаром»

## Запуск локально

### Вимоги

- Node.js 20+
- [pnpm](https://pnpm.io/installation)

### Клонування та залежності

```bash
git clone https://github.com/yurakravtsiv/ChurchFoundry.git
cd ChurchFoundry
pnpm install
```

### Змінні середовища

Скопіюйте [`.env.example`](.env.example) і заповніть значеннями з проєкту Supabase:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Dev-сервер

```bash
pnpm dev
```

Зазвичай: `http://localhost:5173`.

### Опційні команди

```bash
pnpm build          # production build (+ typecheck)
pnpm test           # vitest run
pnpm biome check .  # lint / format check
pnpm preview        # перегляд production build
```

## CI/CD

- **GitHub Actions** на кожен `push` / `pull_request` запускає: Biome (lint) → Vitest → `pnpm build` (у т.ч. типізацію через `tsc -b`).
- **Деплой на Vercel** відбувається **лише якщо** ці перевірки пройшли успішно — не автоматично від прямої Git-інтеграції Vercel без проходження CI.
- **Pre-commit (husky)** локально блокує коміт при помилках lint-staged / тестів / `tsc -b` / build.

## Архітектурні рішення

- **Vite SPA замість Next.js** — внутрішній інструмент без потреби в SSR/SEO.
- **localStorage як тимчасовий шар даних**, обгорнутий у TanStack Query хуки — перехід на реальний backend (Supabase) вимагатиме зміни переважно `queryFn` / `mutationFn`; UI-шар (loading / error / invalidate) лишається тим самим.
- **Zustand / Redux свідомо не додані** — глобальний UI-стан поки не виправданий масштабом проєкту.

## Структура

```
src/
  components/   # UI та доменні компоненти
  pages/        # сторінки застосунку
  hooks/        # React hooks (у т.ч. TanStack Query)
  lib/          # supabase, i18n, storage, export, utils
  locales/      # uk.json, en.json
  types/        # TypeScript типи
```
