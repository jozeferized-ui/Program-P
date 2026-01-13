#!/bin/bash
cd "$(dirname "$0")"
# Uruchom serwer developerski w tle
npm run dev &
PID=$!
# Poczekaj chwilę, aż serwer wstanie
sleep 5
# Otwórz przeglądarkę
open -a "Google Chrome" http://localhost:3000
# Czekaj na zakończenie procesu serwera
wait $PID
