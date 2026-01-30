# Refactoring Project Structure

Refactor the project to clean up the root directory by organizing backend code and static pages into dedicated folders.

## Proposed Changes

### 1. Backend Organization
Move all server-side code to a new `backend/` directory.

#### [NEW] backend/
- Move `server.js`
- Move `database.js`
- Move `database.pg.js`
- Move `server.pg.js`
- Move `seed.js`
- Move `ecosystem.config.cjs`

### 2. Static Pages Organization
Move all Vanilla JS/HTML pages (legacy or secondary entry points) to a `pages/` directory.

#### [NEW] pages/
- Move `about.html`, `admin.html`, `categories.html`, `category.html`, `checkout.html`, `contact.html`, `cotton-varieties.html`, `handloom-special.html`, `product_details.html`, `refund.html`, `shantipuri-special.html`, `surat-silk.html`, `track-order.html`
- Move `admin.js`
- Move `main.js` (Root version, not src/main.jsx)
- Move `style.css`

### 3. Build & Configuration Updates

#### [MODIFY] [vite.config.js](file:///Users/shonkuweb/MAAHANDLOOM-2/vite.config.js)
- Update `rollupOptions.input` paths to point to `pages/*.html`.
- `index.html` stays in root (standard Vite convention).

#### [MODIFY] [package.json](file:///Users/shonkuweb/MAAHANDLOOM-2/package.json)
- Update scripts:
    - `"start": "node backend/server.js"`
    - `"dev:all": "(node backend/server.js) & (vite)"`

#### [MODIFY] [Dockerfile](file:///Users/shonkuweb/MAAHANDLOOM-2/Dockerfile)
- Update `COPY` commands to reflect new structure.
- Update `CMD` to run `backend/server.js`.

### 4. Security Hardening [NEW]
To achieve "world-class" security as requested, we will implement the following layers:

#### [MODIFY] [server.js](file:///Users/shonkuweb/MAAHANDLOOM-2/backend/server.js)
- **Environment Variables**: Move Admin Password to `process.env.ADMIN_PASSCODE`.
- **Security Headers**: Implement `helmet` to set secure HTTP headers (XSS protection, etc.).
- **Rate Limiting**: Implement `express-rate-limit` to prevent brute-force attacks on the `/api/` and especially `/api/auth/login` endpoints.
- **CORS Policy**: Restrict `cors` to only allow requests from the specific frontend domain (and localhost for dev).
- **Secure Comparison**: Use constant-time comparison for passwords to prevent timing attacks.

#### [MODIFY] [package.json](file:///Users/shonkuweb/MAAHANDLOOM-2/package.json)
- Add dependencies:
    - `helmet`
    - `express-rate-limit`

### 5. Documentation
- Create `README.md` with project overview, setup instructions, and security notes.

## Verification Plan

### Automated Tests
1.  Run `npm run build` to verify Vite can find all entry points in `pages/`.
2.  Run `npm run dev:all` to verify server starts and frontend handles requests.

### Manual Verification
1.  **Structure**: Check if `admin.html` loads correctly from `pages/`.
2.  **Security**:
    - Verify Admin Login works with the new `.env` password.
    - Inspect HTTP headers to confirm `helmet` is active.
    - Test rate limiting by sending multiple requests rapidly to `/api/auth/login`.
