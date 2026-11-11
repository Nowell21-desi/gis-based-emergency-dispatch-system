# Corrected Technical Sections (Chapter 3 and Chapter 4 references)

*Written for: the capstone proponents, for the technical background and architecture sections of the thesis.*

---

## 3.1 Overview of Current Technologies

### 1. Programming Languages
- **TypeScript** is the primary language across the application. It is used for the React user interface and the Cloudflare Worker API, which gives strict type checking across both.
- **JavaScript** runs the browser features, including the service worker that caches the app and queues offline requests.
- **HTML5 and CSS3** provide the page structure and the responsive layouts used on desktop and mobile.

### 2. Frontend Frameworks and User Interface
- **React 18** builds the user interface as reusable components. One application serves citizens, responders, dispatchers, and administrators, and each role sees only its own screens.
- **Vite** builds and bundles the application for production.
- **Tailwind CSS** provides the responsive layouts and the dark theme used across the dashboards.
- **React Router 7** handles navigation between screens and protects role-restricted pages.
- **TanStack React Query** fetches and refreshes live data, such as the incident queue, the responder list, and the map data.
- **Zustand** keeps the signed-in user's session on the device.
- **Progressive Web Application (PWA)** support is provided by **vite-plugin-pwa** and a service worker. The app can be installed on a phone or computer, and it keeps working for short periods without a connection.
- **IndexedDB** stores emergency requests and responder updates made while offline. Each item is marked as sent only after the server confirms it has been received.

### 3. Backend Framework and Security
- **Hono** is the web framework that runs the API on **Cloudflare Workers**, serverless functions that run close to users. It handles about 130 endpoints under `/api/`, covering authentication, incidents, SOS, dispatch, responders, map data, routing, reports, settings, and administration.
- **JSON Web Tokens (JWT)**, using the **jose** library, identify signed-in users. Each token has a short lifetime, and a refresh token renews the session.
- **Password hashing** uses **PBKDF2-SHA256 with 100,000 iterations** through the browser-standard Web Crypto API, with a unique salt for each password.
- **Role-Based Access Control (RBAC)** checks each user's role and permissions on every protected request.
- **Sign-in protection:** after 8 failed sign-in attempts within 15 minutes, further attempts are blocked for 15 minutes.
- **Guest SOS limit:** requests from people without an account are limited per network address, and the person is asked to call the hotline once the limit is reached.
- **Input validation** is applied on the main endpoints. For example, registration checks the Philippine mobile number format, the password policy, and the required consent, and rejects the request before anything is saved.
- **Security headers and schema-based validation** are planned improvements. They use Hono's built-in security headers and the Zod validation library.

### 4. Database and Storage
- **Cloudflare D1** is the production database. It is SQLite-based and stores accounts, incidents, SOS requests, responder assignments, locations, GPS history, attendance, shifts, equipment, transport records, notifications, and audit logs.
- **Schema migrations:** 22 SQL migration files add tables and columns in order, so the production database can be upgraded without losing data.
- **Cloudflare R2** (optional) stores incident photos and other attachments.
- **MongoDB with Mongoose** is the database of the **local development server** (`server/`), which runs on Express for testing outside production. The deployed system uses D1.

### 5. GIS, GPS Mapping, and Live Updates
- **Mapbox GL JS** displays the barangay map, the Sun Valley boundary, National Capital Region hospitals (244 facilities), incident pins, and live responder positions. It supports 2D and 3D views.
- **Mapbox Directions** calculates routes that consider traffic, and offers alternative routes to choose from.
- **Grid A\* routing** calculates a short local path when Mapbox Directions is unavailable. It is a deterministic fallback, not an artificial intelligence method.
- **Live updates** are delivered by polling the server. Responder positions refresh about every second on the map, and the incident queue and status screens refresh every 4 seconds. Polling is used in place of a persistent connection, so updates arrive within a few seconds rather than instantly.
- **Responder GPS** is sent about once per second while the responder's app is open. A unit whose last update is more than 2 minutes old is marked **GPS Offline**.

### 6. Notifications
- **In-app notifications** are stored in the database and shown to each user.
- **Browser push notifications** use the **Web Push** standard with VAPID keys, through the service worker.
- **Email verification codes** are sent through the **Brevo** transactional email service. A verified sender address is used for all codes.
- **SMS verification codes** are supported through **Semaphore** or **Twilio** and are enabled once a provider account and sender name are configured. SMS dispatch alerts are a planned extension.

### 7. Analytics and Algorithms
- **K-Means clustering** groups incidents into clusters to show patterns and hotspots in the analytics screens.
- **Grid A\* pathfinding** is used for short local routes (see Section 5 above).
- **Report generation** produces PDF, CSV, and Excel files. Each PDF lists every field of each incident, including caller details, location and coordinates, the timeline, assigned units, and the full description.

### 8. Hosting, Deployment, and Development Tools
- **Cloudflare Workers** hosts the API and the built web application, under one deployment.
- **Wrangler** is the Cloudflare command-line tool. A single command builds the application and deploys it.
- **Git and GitHub** store the source code in a private repository.
- **Testing:** **Vitest** runs the automated unit tests (36 tests across the server and client). **curl** runs the live API checks. **Playwright** provides end-to-end browser tests.

---

## 3.3.2 Software Specifications

- **Operating systems (development):** Windows 11, with macOS or Linux also supported.
- **Client devices:** Windows, macOS, or ChromeOS for the administrator and dispatcher screens. Android or iOS through a supported browser for responders and citizens, installed as a PWA.
- **Runtime and backend:** Cloudflare Workers runtime with the Hono framework. Node.js 20 or newer is required for development and deployment tools.
- **Database:** Cloudflare D1 (production). MongoDB 6 or newer with Mongoose (local development server only).
- **Frontend libraries:** React 18, TypeScript, Vite 6, Tailwind CSS 3, React Router 7, TanStack React Query 5, Zustand 5, sonner, lucide-react, Mapbox GL JS 3.
- **Authentication libraries:** jose (JWT). Local server: jsonwebtoken and bcryptjs.
- **Testing tools:** Vitest 2, Playwright, curl.

---

## 3.3.3 Network and Architecture Specifications

The system uses a **three-tier Progressive Web Application architecture**, deployed on Cloudflare.

**Presentation tier (frontend):** the React application, built with Vite and served by Cloudflare as static assets. Citizens use it to send SOS requests and track them. Responders use it to receive assignments, update their status, share GPS, and navigate. Dispatchers and administrators use it to verify calls, assign units, monitor the map, and manage records.

**Application tier (API):** the Hono API running on Cloudflare Workers. It processes SOS requests, verifies calls, assigns units, records status changes, calculates routes, generates reports, and sends notifications. Requests under `/api/` are handled by the Worker, and everything else is served as the web application.

**Data tier (database and storage):** Cloudflare D1 stores all operational records. Cloudflare R2 holds photos and attachments when enabled.

**External services:** Mapbox (maps and routes), Brevo (verification email), Semaphore or Twilio (verification SMS, once configured), and Web Push (browser alerts).

**Security across tiers:** JWT sessions, role-based access control on every protected request, PBKDF2 password hashing, HTTPS for all traffic (provided by Cloudflare), sign-in attempt limits, guest request limits, and audit logging of important actions.

---

## 4.3 System Design and Modeling: Reference Notes

### 4.3.4 Entity Relationship Diagram (main entities)
- **users** links to **roles**, and to **citizens** or **responders** depending on the role.
- **incidents** links to **incident_types**, **locations**, and the reporting user. Each incident has a status history, a timeline, notes, and media.
- **sos_requests** links each citizen request to an incident.
- **assignments** link an incident to a responder and optionally a vehicle.
- **responders** link to a department, a team, and their current GPS location.
- **attendance**, **shifts**, and **training** link to responders.
- **notifications** and **notification_replies** record alerts and responses.
- **audit_logs** record who did what and when.

### 4.3.5 Data Dictionary (key tables)
- **users:** id, full name, email, contact number, password hash, status, role, email and phone verification flags, pending-verification flag.
- **incidents:** display ID, type, priority, status, caller name and phone, description, reported, verified, dispatched, en route, on-scene, resolved, and closed times, cancel reason.
- **locations:** address, landmark, latitude, and longitude.
- **assignments:** incident, responder, vehicle, assignment status, assigned and accepted times.
- **responders:** user, department, callsign, team, availability status, operational status, last GPS position and time.
- **attendance:** responder, date, check-in and check-out times, status.
- **signup_otps:** user, channel (email or SMS), destination, hashed code, expiry, attempts, used time.
- **audit_logs:** actor, role, action, resource type and ID, timestamp.

The full schema has 43 tables. The 22 migration files record how the schema was built.

---

## Chapter 4 Reference (Testing Results)
- Unit tests: 36 automated tests, all passing (17 server-side, 19 client-side).
- Integration tests (10 scenarios) and system tests (20 scenarios) were executed manually and passed. The results table in the Testing Plan lists each scenario.
- Live security and speed checks: unauthenticated requests are refused, invalid sign-in and registration input is rejected, injection attempts are refused, and the health check responds in about 0.2 seconds on average.
