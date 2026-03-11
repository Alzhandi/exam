## ИГА Prep (PDF → банк вопросов)

Этот проект строит банк вопросов **строго из вашего PDF** (`[ГОС v1] ИГА (590).pdf`), затем предоставляет веб‑приложение для подготовки: банк, поиск, практика и пробный экзамен, прогресс/избранное/ошибки — всё локально.

### Структура

- `tools/parse_gos_pdf.py`: парсер PDF → `questions.json`
- `web/`: Next.js + TypeScript + Tailwind
  - `src/data/questions.json`: сгенерированный датасет
  - `src/app/*`: страницы (банк/практика/экзамен/прогресс)
- `simple/index.html`: **простой вариант без React/Next** (один HTML + JS)

### Требования

- Python 3 (для парсинга PDF)
- Node.js 20+ (для запуска веб‑приложения)

### 1) Подготовка датасета из PDF

Скопируйте ваш PDF в папку `exam-prep/source/` (создайте её) с именем:

- `exam-prep/source/[ГОС v1] ИГА (590).pdf`

Затем:

```bash
cd exam-prep/web
python3 ../tools/parse_gos_pdf.py --pdf "../source/[ГОС v1] ИГА (590).pdf" --out "./src/data/questions.json"
```

Примечание: парсер пытается автоматически разделять “Основной банк” и “Консультацию”. Записи с `parserFlags` стоит просматривать выборочно — это пометки на случай неоднозначностей.

### 2) Запуск веб‑приложения

```bash
cd exam-prep/web
npm install
npm run dev
```

Откройте `http://localhost:3000`.

### 2a) Самый простой запуск (один HTML, без Node)

Этот вариант использует уже сгенерированный датасет `web/src/data/questions.json`.

```bash
cd exam-prep
python3 -m http.server 8000
```

Откройте `http://localhost:8000/simple/index.html`.

### Данные и прогресс

- **Вопросы**: `web/src/data/questions.json`
- **Прогресс**: хранится в `localStorage` браузера (кнопка “Сбросить прогресс” на странице “Прогресс”).

