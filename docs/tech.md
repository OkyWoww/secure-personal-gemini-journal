# tech.md — Spesifikasi Teknis
## Secure Personal Gemini Journal

## 1. Stack Wajib (ditentukan penyelenggara)

- **Auth**: Firebase Authentication (email/password minimal, boleh tambah Google Sign-In jika sempat)
- **Database**: Cloud Firestore (native mode)
- **AI**: Gemini API (via Vertex AI atau Generative Language API — pilih salah satu, dokumentasikan alasannya)
- **Secret**: Google Secret Manager

## 2. Stack Pilihan (boleh disesuaikan agent, dengan alasan)

- **Frontend**: React + Vite atau Next.js — pilih Next.js jika ingin API routes sekaligus jadi backend ringan (mengurangi kompleksitas deployment untuk timeline hackathon).
- **Backend**: Cloud Run (kontainer) direkomendasikan dibanding Cloud Functions jika butuh library dekripsi yang lebih berat — lebih fleksibel untuk cold start dan dependency management.
- **Bahasa backend**: Node.js/TypeScript (konsisten dengan frontend, memudahkan sharing tipe data).
- **Enkripsi**: gunakan library standar (misal `node:crypto` AES-256-GCM) — JANGAN implementasi algoritma enkripsi sendiri.

## 3. Dependency yang Diizinkan (tambah di sini jika perlu, jangan diam-diam)

- `firebase` / `firebase-admin`
- `@google-cloud/secret-manager`
- `@google-cloud/firestore`
- `@google/generative-ai` (SDK Gemini) atau `@google-cloud/vertexai`
- Library UI (Tailwind, shadcn/ui, dsb) — bebas dipilih agent, tidak menyentuh security surface.

## 4. Secret Management (WAJIB dibaca sebelum coding)

- Gemini API key: disimpan di Secret Manager, diambil oleh backend saat startup atau per-request (cache di memory, jangan tulis ke disk/log).
- Encryption key (untuk field-level encryption Firestore): disimpan di Secret Manager terpisah dari API key, mendukung rotasi (key versioning Secret Manager sudah built-in — manfaatkan itu, jangan bikin sistem rotasi custom).
- `.env` lokal untuk development HANYA boleh berisi path/project ID Google Cloud, TIDAK BOLEH berisi key asli. `.env` WAJIB masuk `.gitignore`.

## 5. Struktur Folder yang Disarankan

```
/frontend
  /app atau /src
    /components
    /pages (atau /app router jika Next.js)
    /lib
      pii-mask.ts        // heuristic/regex PII redaction, jalan di client
/backend
  /src
    /routes
      entries.ts
      reflection.ts
    /lib
      encryption.ts       // wrapper AES-256-GCM
      secretManager.ts    // ambil key dari Secret Manager
      gemini.ts           // wrapper panggilan Gemini API
    /middleware
      verifyAuth.ts       // verifikasi Firebase ID token
firestore.rules
/docs
  design.md
  security.md
  product.md
```

## 6. Environment & Deployment

- Project GCP terpisah untuk dev vs submission demo jika memungkinkan (mengurangi risiko API key produksi bocor saat demo).
- Deploy backend ke Cloud Run dengan service account minimal-privilege (hanya akses Secret Manager + Firestore yang relevan).
- Firestore Security Rules di-deploy dan ditest (pakai Firebase Emulator Suite untuk verifikasi sebelum deploy — ini juga jadi bukti verifikasi di `skill.md` Definition of Done).

## 7. Testing Minimal yang Diharapkan

- Emulator test: Firestore rule test (user A tidak bisa baca entri user B).
- Manual test: kirim request tanpa token ke backend → harus ditolak 401.
- Manual test: entri yang mengandung PII (email/no. HP dummy) → verifikasi hasil masking sebelum terkirim ke Gemini (bisa via log request, jangan log isi jurnal asli).
