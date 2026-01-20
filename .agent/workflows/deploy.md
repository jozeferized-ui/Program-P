---
description: Jak wdrożyć zmiany na serwer produkcyjny (Vercel)
---
# Wdrożenie na Vercel

// turbo-all

## Kroki

1. Upewnij się, że build działa lokalnie:
```bash
npm run build
```

2. Dodaj wszystkie zmiany do Git:
```bash
git add -A
```

3. Utwórz commit z opisem zmian:
```bash
git commit -m "Opis zmian"
```

4. Wypchnij na GitHub (main branch):
```bash
git push origin main
```

5. Vercel automatycznie wykryje zmiany i rozpocznie deployment.

## Weryfikacja

Po push sprawdź status deploymentu na: https://vercel.com/dashboard

## Uwagi
- Projekt jest hostowany na Vercel
- Vercel jest połączony z repozytorium GitHub: jozeferized-ui/Program-P
- Branch produkcyjny: main
- Deployment jest automatyczny po każdym push do main
