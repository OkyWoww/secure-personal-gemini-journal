# Secure Personal Gemini Journal 🛡️📓

> A zero-trust, privacy-first personal journal web application powered by **Google Gemini AI**, featuring client-side PII masking, backend field-level AES-256-GCM encryption, prompt injection defense, BOLA/IDOR protection, and real-time security audit observability.

Built for the **Gen AI Ideathon (Google Cloud x Hack2skill, APAC Edition Cohort 3)**.

---

## 🏛️ Architecture & Data Flow Overview

```
+---------------------------------------------------------------------------------------+
|                                    USER BROWSER                                       |
|                                                                                       |
|  +---------------------+        +--------------------------------------------------+  |
|  |   Journal UI Input  | -----> | Client-Side PII Masking Tool (`src/lib/pii-mask`) |  |
|  +---------------------+        +--------------------------------------------------+  |
|             | (Raw Text via HTTPS)                         | (Masked PII Text)        |
+-------------|----------------------------------------------|--------------------------+
              |                                              |
              v                                              v
+---------------------------------------------------------------------------------------+
|                               EXPRESS BACKEND (Cloud Run)                             |
|                                                                                       |
|  1. Firebase JWT Token Verification (`verifyAuth` Middleware)                         |
|  2. Explicit BOLA / IDOR Ownership Verification (`entry.userId === req.auth.uid`)     |
|  3. Field-Level AES-256-GCM Encryption (Key fetched securely from Secret Manager)    |
|  4. Prompt Injection Guarded Gemini AI Engine:                                        |
|     - Sanitizes input and wraps it strictly in `<user_entry>...</user_entry>` tags   |
|     - System instruction hardening treats user entry as passive untrusted data        |
|  5. Structured Security Audit Logger (Streams access metadata to Cloud Logging)       |
+---------------------------------------------------------------------------------------+
       |                                                    |
       v (Encrypted Ciphertext)                             v (Sanitized AI Prompt)
+------------------------------------+             +------------------------------------+
|    FIRESTORE CLOUD DATABASE        |             |         GEMINI API ENGINE          |
|                                    |             |                                    |
| - Subcollection:                   |             | - Zero PII Exposure                |
|   `/users/{uid}/entries/{entryId}` |             | - Server-Side Key (Secret Manager) |
| - Rules: Strict `request.auth.uid` |             +------------------------------------+
+------------------------------------+
```

---

## ✨ Key Features

1. **Client-Side PII Masking & Redaction**:
   - Automatically detects and redacts Personally Identifiable Information (emails, phone numbers, identity cards) in the browser before rendering previews or dispatching AI prompts.
2. **Field-Level AES-256-GCM Encryption**:
   - Journal text is encrypted on the backend using authenticated AES-256-GCM before storage in Firestore. Raw journal content is never stored in plaintext at rest.
3. **Prompt Injection Resistant AI Pipeline**:
   - User inputs to Gemini are sanitized, length-bounded, and wrapped in strict delimiter tags (`<user_entry>...</user_entry>`). Hardened system instructions instruct the model to treat all tagged content as passive data, neutralizing prompt override attacks (e.g., *"ignore previous instructions"*).
4. **BOLA / IDOR Protected Backend**:
   - Explicit ownership validation (`entry.userId === req.auth.uid`) is enforced directly in backend route handlers before querying or mutating data, neutralizing Broken Object Level Authorization attacks.
5. **Admin Security Observability Dashboard**:
   - Built-in audit log monitor visualizing authentication events, journal activity counts, and denied access attempts in real-time without ever exposing journal content.
6. **Resilient 4 UI States & Offline Degradation**:
   - Every data-fetching interface handles **Loading** (skeleton screens), **Empty** (illustrations & CTA), **Error** (actionable retry banners), and **Offline** (connection detection with mutation-locking) states.
7. **Google OAuth 2.0 Pure Authentication**:
   - Seamless sign-in powered exclusively by Firebase Auth Google Sign-In — zero password handling in application code.

---

## 🔥 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile and subcollections are strictly scoped per-UID
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Journal entries subcollection
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### ⚠️ Security Rules & Backend Responsibility Note
These Firestore Security Rules govern client-SDK access directly. 

Because the backend operates using the **Firebase Admin SDK** (which intentionally bypasses Firestore Security Rules to execute administrative tasks), **explicit ownership checks (`entry.userId === req.auth.uid`) are mandatory and strictly enforced in the Express backend code** for every route accepting a resource ID (see `backend/routes/entries.ts`). This guarantees defense-in-depth against BOLA/IDOR vulnerabilities.

---

## 🔐 Secrets Management

We strictly separate secrets management between local development and production environments:

- **Local Development**: Uses local `.env` configuration file (ignored by Git) for offline development and testing.
- **Production (Cloud Run)**: All sensitive keys (`GEMINI_API_KEY`, `ENCRYPTION_KEY`) are stored in **Google Cloud Secret Manager** and injected into the Cloud Run container runtime via `--set-secrets`. Plaintext keys are **never** committed to Git, baked into Docker images, or exposed to the client.

### Environment Variable Reference

```env
# Gemini API Key (Secret Manager: gemini-api-key)
GEMINI_API_KEY="your-gemini-api-key"

# 32-byte AES-256-GCM Encryption Key (Secret Manager: encryption-key)
ENCRYPTION_KEY="your-super-secret-32-byte-encryption-key"

# Project Configuration
FIREBASE_PROJECT_ID="genai-track3-coffee"
PORT=3000
```

---

## ☁️ Deployment to Cloud Run

Follow these steps to build and deploy the application to Google Cloud Run:

### 1. Build and Submit Container Image
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/secure-gemini-journal
```

### 2. Deploy to Cloud Run with Mandatory Label & Secret Bindings
```bash
gcloud run deploy secure-gemini-journal \
  --image gcr.io/PROJECT_ID/secure-gemini-journal \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --labels dev-tutorial=cloud-run-ai-challenge \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest,ENCRYPTION_KEY=encryption-key:latest
```

> **Mandatory Hackathon Label**: The label `--labels dev-tutorial=cloud-run-ai-challenge` is strictly required for hackathon submission tracking.

### 3. Verify Cloud Run Service & Labels
```bash
# Verify attached labels
gcloud run services describe secure-gemini-journal \
  --region asia-southeast2 \
  --format="value(metadata.labels)"

# Retrieve the live service URL
gcloud run services describe secure-gemini-journal \
  --region asia-southeast2 \
  --format="value(status.url)"
```

---

## 🚀 How to Run Locally

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd secure-gemini-journal
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Fill in GEMINI_API_KEY and ENCRYPTION_KEY in .env
```

### 3. Start Development Server
Starts the Express server with live Vite middleware integration on `http://localhost:3000`:
```bash
npm run dev
```

### 4. Build and Test Production Bundle
```bash
npm run build
npm start
```

### 5. Run Linter & Type Check
```bash
npm run lint
```

---

## 🔒 STRIDE Threat Model & Mitigations

| STRIDE Category | Component / Flow | Threat | Mitigation Implemented |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Client → Backend Auth | Unauthorized impersonation | Google OAuth 2.0 only; JWT token verification (`verifyAuth`) on every request. |
| **Tampering** | API Request Payloads | Data tampering & alteration | Server-side validation, AES-256-GCM auth tags, and user-isolated Firestore writes. |
| **Tampering / Info Disclosure** | Gemini AI Input Stream | Prompt injection overrides | Tag delimitation (`<user_entry>`), tag sanitization, length limits, and system instruction hardening. |
| **Repudiation** | User & Admin Actions | Denial of performed actions | Structured Cloud Logging (`auditLogger.ts`) recording UID, timestamp, action, and status without logging PII/content. |
| **Information Disclosure** | Data at Rest & AI Logs | Database or AI leakage | Client PII redaction + Backend AES-256-GCM encryption + Secrets stored in Secret Manager. |
| **Denial of Service** | Backend AI Endpoints | Quota exhaustion attacks | Payload length restrictions (max 3,000 chars) and async reflection isolation. |
| **Elevation of Privilege / BOLA** | `/api/entries/:id` | Cross-user data access (IDOR) | Explicit in-code ownership check (`entry.userId === req.auth.uid`) on all resource endpoints. |

---

## 📄 License
Created for the **Google Cloud x Hack2skill Gen AI Ideathon (APAC Edition Cohort 3)**.
Licensed under the Apache License 2.0.
