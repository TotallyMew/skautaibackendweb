# Skautu Inventoriaus Valdymas Web

This folder contains the browser version of the scout inventory system.

- `backend/` is a copied Ktor backend for the website.
- `frontend/` is the React + Vite + TypeScript web client.

Android is intentionally separate and remains in `../skautu-inventoriaus-valdymas-android/`.

The web backend and mobile backend may share the same PostgreSQL database. Treat schema changes as shared-product changes and verify both backends when migrations change.

