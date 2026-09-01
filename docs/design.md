# design.md — Arsitektur & Alur Data
## Secure Personal Gemini Journal

## 1. Komponen Sistem

| Layer | Komponen | Peran |
|---|---|---|
| Frontend | Web App (React/Next.js) | UI journaling, client-side PII masking, markdown viewer |
| Auth | Firebase Auth | Autentikasi user, terbitkan JWT ID token |
| Backend | Cloud Run atau Cloud Functions | Verifikasi token, ambil secret dari Secret Manager, orkestrasi prompt Gemini, dekripsi/enkripsi field |
| Database | Cloud Firestore | Penyimpanan entri jurnal (field-level encrypted) + metadata, Security Rules per-uid |
| Secret | Secret Manager | Gemini API key, encryption key (dengan rotasi) |
| AI | Gemini API | Sentiment analysis, ringkasan, weekly reflection, auto-tagging |

## 2. Alur Data (Data Flow)

```
Frontend (mask PII)
   │  1. Login request
   ▼
Firebase Auth  ──► terbitkan JWT ID token
   │  2. Request + JWT
   ▼
Backend (Cloud Run/Functions)
   │  3. Verifikasi token, ambil secret
   ├──► Secret Manager (ambil Gemini API key + encryption key)
   │  4. Enkripsi field sensitif sebelum simpan
   ▼
Cloud Firestore (/users/{uid}/entries/{entryId})
   │  5. Backend ambil entri (dekripsi di memory, tidak pernah di client)
   ▼
Gemini API (kirim teks yang SUDAH di-mask PII + didekripsi hanya di backend)
   │  6. Hasil sentiment/ringkasan
   ▼
Kembali ke Frontend (hasil AI, bukan raw encryption key)
```

**Prinsip kunci**: dekripsi konten HANYA terjadi di backend (Cloud Run/Functions), tidak pernah di client, tidak pernah langsung di Firestore. Client hanya pernah melihat plaintext journal miliknya sendiri lewat response API yang sudah diautentikasi — tidak pernah melihat encryption key.

## 3. Struktur Data Firestore

```
/users/{uid}/
  profile: { displayName, createdAt }
  entries/{entryId}/
    ciphertext: string          // field-level encrypted content
    createdAt: timestamp
    sentimentTag: string        // hasil Gemini, non-sensitif, boleh plaintext
    piiMaskedPreview: string    // preview yang sudah di-mask, untuk list view
```

Alasan `piiMaskedPreview` disimpan terpisah dari `ciphertext`: list view di frontend tidak perlu request dekripsi penuh untuk menampilkan preview singkat — mengurangi frekuensi pemanggilan backend decrypt endpoint.

## 4. Firestore Security Rules (prinsip, bukan kode final)

- Setiap dokumen di bawah `/users/{uid}/` hanya boleh dibaca/ditulis jika `request.auth.uid == uid`.
- Field `ciphertext` tidak boleh ditulis langsung oleh client — hanya lewat backend (gunakan custom claim atau validasi schema agar write dari client selain field yang diizinkan ditolak).
- Validasi skema: tolak write yang tidak punya field wajib (`createdAt`, `ciphertext`).

## 5. Backend Endpoint (kontrak API, bukan kode)

| Endpoint | Method | Auth | Fungsi |
|---|---|---|---|
| `/entries` | POST | Firebase ID token | Terima entri (sudah di-mask di client), enkripsi, simpan ke Firestore, panggil Gemini untuk sentiment |
| `/entries` | GET | Firebase ID token | List entri user (preview saja, tanpa dekripsi penuh) |
| `/entries/{id}` | GET | Firebase ID token | Ambil 1 entri, dekripsi di backend, kirim plaintext ke pemilik entri |
| `/reflection/weekly` | GET | Firebase ID token | Agregasi beberapa entri, kirim ke Gemini untuk ringkasan mingguan |

## 6. Batas Tanggung Jawab (Trust Boundary)

- **Tidak dipercaya**: browser pengguna, jaringan publik.
- **Setengah dipercaya**: Firestore (data at rest harus tetap aman meski database bocor — makanya field-level encryption).
- **Dipercaya penuh**: Backend Cloud Run/Functions (satu-satunya yang pegang encryption key & Gemini API key via Secret Manager).

Lihat `security.md` untuk pemetaan STRIDE lengkap terhadap setiap panah di alur data ini.
