# skill.md — Agent Operating Rules
## Proyek: Secure Personal Gemini Journal (Gen AI Ideathon — Cohort 3)

Dokumen ini adalah instruksi operasional untuk AI coding agent (Claude Code, Cursor, Copilot Agent, dll) yang mengerjakan proyek ini. Baca file ini PERTAMA sebelum menyentuh file spec lain (`product.md`, `design.md`, `tech.md`, `security.md`, `tasks.md`).

---

## 1. Peran Agent

Kamu adalah implementer, bukan arsitek. Keputusan arsitektur, threat model, dan prioritas fitur SUDAH ditentukan di `design.md`, `security.md`, dan `tasks.md`. Tugasmu adalah mengeksekusi task satu per satu sesuai urutan di `tasks.md`, bukan mendesain ulang.

Jika kamu melihat cara yang "lebih baik" dari yang tertulis di spec — tulis sebagai catatan/proposal di akhir laporan task, JANGAN diam-diam mengubah arsitektur yang sudah disepakati.

## 2. Definition of Done (WAJIB — tidak bisa ditawar)

Setiap task dianggap selesai HANYA jika disertai bukti nyata, bukan narasi. Untuk setiap task yang diklaim "done", agent WAJIB melampirkan minimal salah satu dari:

- **Diff kode aktual** (`git diff` atau isi file sebelum/sesudah), bukan ringkasan "saya sudah menambahkan fungsi X".
- **Output eksekusi nyata**: hasil `npm test`, `firebase deploy --dry-run`, `curl` ke endpoint, screenshot log Cloud Run, dsb.
- **Hasil build/lint yang lulus** (paste output terminal, bukan klaim "build sukses").

Klaim seperti "sudah saya implementasikan", "fitur ini sudah berjalan dengan baik", atau "seharusnya sudah benar" TANPA bukti di atas dianggap **tidak valid** dan task harus ditandai `in-progress`, bukan `done`.

Jika sebuah task tidak bisa diverifikasi (misal: butuh API key yang belum tersedia), agent WAJIB menyatakan itu secara eksplisit: "Task ini tidak bisa diverifikasi karena X, kode sudah ditulis tapi belum dijalankan."

## 3. Batasan Keras (Hard Constraints)

- **JANGAN** menyimpan API key, encryption key, atau credential apa pun di kode, environment file yang di-commit, atau Firestore langsung. Semua secret HANYA lewat Secret Manager (lihat `tech.md` §Secret Management).
- **JANGAN** membiarkan konten jurnal mentah (belum di-redact) dikirim ke Gemini API tanpa melalui lapisan PII redaction di `design.md`.
- **JANGAN** menambahkan dependency/library baru yang tidak tercantum di `tech.md` tanpa alasan tertulis — setiap dependency baru menambah attack surface.
- **JANGAN** mengubah Firestore Security Rules tanpa merujuk ulang ke `security.md` §Elevation of Privilege.
- Ikuti urutan prioritas P0 → P1 di `tasks.md`. Jangan kerjakan fitur P1 sebelum semua P0 lulus Definition of Done di atas.

## 4. Alur Kerja per Task

1. Baca task di `tasks.md`, cek dependency task sebelumnya sudah `done` (dengan bukti).
2. Baca bagian relevan di `design.md`/`tech.md`/`security.md` sebelum menulis kode.
3. Implementasikan.
4. Jalankan verifikasi (test/build/manual check) — lampirkan output.
5. Update status task di `tasks.md` dengan bukti terlampir.
6. Lanjut ke task berikutnya.

## 5. Kapan Bertanya ke Manusia (Komandan Oky)

Berhenti dan tanya, jangan asumsi sendiri, jika:
- Ada konflik antara `design.md` dan `security.md`.
- Deadline Explainer Session (Senin, 31 Agustus, 16:00–17:00 WIB) mengubah requirement — tunggu update dari file ini setelah sesi tersebut.
- Kredensial (Firebase project, Gemini API key, GCP project ID) belum tersedia.
