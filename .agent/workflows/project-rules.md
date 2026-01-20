---
description: Zasady ogólne projektu Program P
---
# Zasady Projektu

## Komunikacja
- Język komunikacji: **Polski**

## Technologie
- Framework: Next.js 16 (App Router)
- Baza danych: PostgreSQL + Prisma ORM
- Styling: Tailwind CSS
- UI Components: shadcn/ui (Radix)

## Hosting
- Platforma: **Vercel**
- Repozytorium: GitHub (jozeferized-ui/Program-P)
- Branch produkcyjny: main
- Deployment: automatyczny po git push do main

## Optymalizacja wydajności
- Ciężkie biblioteki (ExcelJS, @react-pdf/renderer) importować dynamicznie
- Mapa (Leaflet) używa dynamic() z ssr: false
- Konfiguracja optymalizacji w next.config.ts

## Wdrożenie zmian
Użyj workflow: `/deploy`
