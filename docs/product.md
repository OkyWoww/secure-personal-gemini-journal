# product.md — Spesifikasi Produk
## Secure Personal Gemini Journal

## 1. Latar Belakang

Proyek untuk Gen AI Ideathon (Google Cloud x Hack2skill, APAC Edition Cohort 3). Studi kasus dan stack wajib sudah ditentukan penyelenggara:
- Studi kasus: web prototype "Secure Personal Gemini Journal"
- Stack wajib: Gemini API, Firebase Authentication, Cloud Firestore, Secret Manager
- Rubrik penilaian: architecture requirements, scoring rubrics, submission guidelines (detail final diumumkan di Explainer Session, Senin 31 Agustus 2026, 16:00–17:00 WIB)
- Deadline submission: mengikuti jadwal resmi Ideathon (cek submission section dashboard)

Diferensiasi produk ini: keamanan bukan fitur tempelan, melainkan core value proposition — "zero-trust personal journal" dengan privacy-first AI processing.

## 2. Target Pengguna & Problem Statement

Pengguna ingin menulis jurnal pribadi dan mendapat insight dari AI (mood trend, refleksi mingguan), tapi khawatir:
- Data jurnal pribadi bocor atau dibaca pihak yang tidak berwenang (termasuk operator sistem).
- Informasi sensitif (nama, kontak, lokasi) ikut terkirim ke LLM pihak ketiga tanpa perlu.

## 3. User Stories

### P0 — MVP Wajib
1. Sebagai pengguna, saya bisa mendaftar dan login dengan email/password via Firebase Auth.
2. Sebagai pengguna, saya bisa menulis entri jurnal baru dan menyimpannya — hanya saya yang bisa membaca entri saya sendiri.
3. Sebagai pengguna, saya bisa melihat daftar entri jurnal saya sebelumnya (list + detail).
4. Sebagai pengguna, setelah menyimpan entri, saya mendapat ringkasan singkat/analisis sentimen sederhana dari Gemini API.
5. Sebagai penilai/juri, saya bisa melihat bahwa API key Gemini tidak pernah ter-expose di client (diverifikasi via Secret Manager + backend proxy).

### P1 — Diferensiasi (dikerjakan setelah P0 selesai & lulus verifikasi)
6. Sebagai pengguna, teks yang berpotensi PII (nama, email, no. HP) otomatis di-mask di client sebelum entri diproses AI.
7. Sebagai pengguna, isi jurnal saya disimpan dalam bentuk terenkripsi di Firestore (field-level encryption), bukan plain text.
8. Sebagai pengguna, saya bisa melihat "Weekly Reflection" — ringkasan tren mood mingguan dari beberapa entri.
9. Sebagai juri, saya bisa membaca dokumen threat model (STRIDE) yang menjelaskan mitigasi tiap komponen sistem.

### P2 — Nice-to-have (hanya jika waktu tersisa)
10. Auto-tagging topik/emosi per entri.
11. Grafik visualisasi mood trend (chart mingguan/bulanan).

## 4. Out of Scope (untuk Ideathon ini)

- Multi-user sharing / kolaborasi jurnal.
- Native mobile app.
- WebAuthn/passkey (dianggap over-engineering untuk timeline hackathon — Firebase Auth + custom claims cukup).
- Offline-first / PWA sync.

## 5. Kriteria Sukses Submission

- Semua P0 berjalan end-to-end dan bisa didemokan live.
- Minimal 2 item P1 selesai dengan bukti (lihat `skill.md` §Definition of Done).
- Dokumen threat model (`security.md`) dilampirkan di submission.
- Diagram arsitektur (`design.md`) dilampirkan di submission.
