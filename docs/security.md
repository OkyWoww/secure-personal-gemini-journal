# security.md — Threat Model (STRIDE)
## Secure Personal Gemini Journal

Dokumen ini memetakan setiap panah di alur data (`design.md` §2) terhadap kategori ancaman STRIDE dan mitigasinya. Dokumen ini dilampirkan langsung ke submission Ideathon.

## Matriks STRIDE

| Kategori | Komponen/Alur Terancam | Ancaman | Mitigasi |
|---|---|---|---|
| **S — Spoofing Identity** | Request Frontend → Backend | Penyerang menyamar sebagai user lain | Verifikasi Firebase ID token (JWT) di setiap request backend; tolak request tanpa token valid |
| **T — Tampering with Data** | Modifikasi payload entri / dokumen Firestore | Penyerang mengubah isi jurnal user lain atau memalsukan `sentimentTag` | Firestore Security Rules `request.auth.uid == resource.data.userId`; validasi skema input di backend sebelum tulis |
| **R — Repudiation** | Aksi create/read/update jurnal | User menyangkal pernah melakukan aksi tertentu | Cloud Logging di backend mencatat metadata request (userId, timestamp, jenis aksi) — TANPA mencatat isi jurnal |
| **I — Information Disclosure** | Database leak, atau PII terekspos ke Gemini API pihak ketiga | Kebocoran Firestore mengekspos isi jurnal; PII (nama, kontak) ikut terkirim ke LLM tanpa perlu | (1) Field-level encryption (AES-256-GCM) pada `ciphertext`; (2) client-side PII masking sebelum data meninggalkan browser; (3) API key & encryption key hanya di Secret Manager, tidak pernah di client/kode |
| **D — Denial of Service** | Spam request ke backend atau abuse prompt Gemini | Penyerang membanjiri endpoint AI, menghabiskan kuota/biaya | Rate limiting per-uid di backend; pisahkan endpoint sync (create entry) vs async (weekly reflection) agar tidak saling starve |
| **E — Elevation of Privilege** | Akses data jurnal milik user lain | Bug di rules/backend memungkinkan user A membaca data user B | Isolasi struktur data `/users/{uid}/entries/{entryId}`; test eksplisit via Firestore Emulator untuk skenario cross-user access sebelum deploy |

## Prinsip Tambahan

1. **Least privilege**: service account backend hanya diberi akses ke Secret Manager dan Firestore collection yang relevan — bukan project-wide access.
2. **Defense in depth**: PII masking di client BUKAN pengganti field-level encryption di server. Keduanya independen — jika satu gagal, yang lain tetap melindungi.
3. **No security through obscurity**: threat model ini didokumentasikan terbuka di submission, bukan disembunyikan — juri menilai kejujuran analisis, bukan hanya hasil akhir.
4. **Key rotation**: encryption key memakai fitur versioning Secret Manager bawaan, bukan sistem rotasi custom yang rentan salah implementasi.

## Yang Sengaja Tidak Dikerjakan (dan alasannya)

- WebAuthn/passkey: menambah kompleksitas auth yang tidak proporsional dengan waktu pengerjaan hackathon; Firebase Auth + custom claims dianggap cukup untuk MVP+P1 ini.
- E2EE penuh (client tidak pernah kirim plaintext ke backend sama sekali): akan menghalangi fitur AI (sentiment analysis, weekly reflection) karena backend/Gemini tidak akan pernah bisa membaca kontennya. Field-level encryption dengan dekripsi terisolasi di backend dipilih sebagai jalan tengah yang tetap aman tapi tidak menghalangi fitur AI.
