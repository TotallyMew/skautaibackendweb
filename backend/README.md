# Skautu Inventoriaus Valdymas Web Backend

This is an independent backend copy for the website. It starts from the mobile backend codebase, but it is allowed to diverge for browser-specific API and deployment needs.

The Android app does not use this backend folder. Android/mobile backend work belongs in `../../skautu-inventoriaus-valdymas-backend/`.

## Shared Data

By default this backend points to the same PostgreSQL database as the mobile backend:

```properties
DB_URL=jdbc:postgresql://localhost:5432/skautu_inventorius
```

That keeps users, inventory, events, and requests shared between Android and web. It also means database migrations are shared-product changes: keep them backward-compatible with the mobile backend unless both backend projects are updated together.

## Local Commands

```powershell
cd skautu-inventoriaus-valdymas-web/backend
.\gradlew.bat compileKotlin --console=plain
.\gradlew.bat test --console=plain
.\gradlew.bat coverageSummary --console=plain
```

The default local port is `8081`. Use `WEB_PORT` to override it.

## Web-Specific Environment

- `WEB_PORT` - preferred local/deployed port for this backend.
- `WEB_CORS_ALLOWED_ORIGINS` - browser origins allowed to call this backend.
- `WEB_UPLOADS_DIR` - upload storage root for this backend process.

The legacy `PORT`, `CORS_ALLOWED_ORIGINS`, and `UPLOADS_DIR` variables still work as fallbacks.
