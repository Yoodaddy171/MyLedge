# Database Migration Guide - Enhanced Schema

## 🔒 Safety Guarantee

**PENTING:** Migration ini 100% aman untuk data yang sudah ada!

✅ **Hanya menambah field baru** (tidak mengubah/menghapus yang lama)
✅ **Semua field baru nullable atau punya default value**
✅ **Data existing tetap valid dan tidak akan corrupt**
✅ **Website akan tetap berjalan seperti biasa**

---

## 📊 Yang Ditambahkan

### 1. **Transactions Table - Enhanced**
**Field Baru:**
- `project_id` → Link transaksi ke project tertentu
- `debt_id` → Track pembayaran hutang
- `notes` → Catatan tambahan per transaksi
- `updated_at` → Tracking kapan terakhir diupdate

**Manfaat:**
- Bisa track spending per project
- Otomatis update `remaining_amount` di debts saat bayar
- Lebih detail notes per transaksi

---

### 2. **Projects Table - Enhanced**
**Field Baru:**
- `spent_amount` → Berapa yang sudah dipakai (auto-calculated)
- `status` → planning | in_progress | completed | on_hold | cancelled
- `deadline` → Target completion date
- `description` → Deskripsi detail project
- `created_at` & `updated_at` → Audit trail

**Manfaat:**
- Track progress project dengan jelas
- Budget vs Actual spending comparison
- Project lifecycle management

---

### 3. **Wallets Table - Enhanced**
**Field Baru:**
- `initial_balance` → Saldo awal waktu buat wallet
- `currency` → IDR, USD, dll (default: IDR)
- `is_active` → Bisa disable wallet tanpa delete
- `updated_at` → Tracking perubahan

**Manfaat:**
- Multi-currency support
- Archive old accounts tanpa kehilangan data
- Balance calculation lebih akurat

---

### 4. **Debts Table - Enhanced**
**Field Baru:**
- `monthly_payment` → Cicilan per bulan
- `interest_rate` → Suku bunga (%)
- `creditor` → Nama pemberi pinjaman
- `updated_at` → Tracking perubahan

**Manfaat:**
- Tracking installment lebih detail
- Hitung interest otomatis
- Lebih organized debt management

---

### 5. **Assets Table - Enhanced**
**Field Baru:**
- `purchase_date` → Tanggal beli (untuk tax reporting)
- `notes` → Strategy/notes per investment
- `created_at` & `updated_at` → Audit trail

**Manfaat:**
- Better cost basis tracking
- Investment notes & strategy
- Tax reporting support

---

## 🆕 Tabel Baru

### 1. **recurring_transactions**
**Purpose:** Auto-generate transaksi berulang (gaji, bills, subscription)

**Fields:**
- `frequency`: daily | weekly | monthly | yearly
- `start_date`, `end_date`
- `next_occurrence`: kapan execute berikutnya
- `is_active`: bisa pause tanpa delete

**Use Cases:**
- Gaji bulanan otomatis
- Netflix subscription
- Listrik, air, internet

---

### 2. **financial_goals**
**Purpose:** Track target keuangan (saving, investment goals)

**Fields:**
- `target_amount`: target yang mau dicapai
- `current_amount`: progress sekarang
- `deadline`: target tanggal
- `is_achieved`: sudah tercapai atau belum

**Use Cases:**
- Target nabung 100 juta
- Emergency fund 6 bulan
- Down payment rumah

---

### 3. **transaction_tags**
**Purpose:** Flexible tagging system (lebih fleksibel dari category)

**Fields:**
- `name`: nama tag (contoh: "Tax Deductible", "Business", "Personal")
- `color`: warna untuk UI

**Use Cases:**
- Tag transaksi untuk tax reporting
- Business vs Personal expenses
- Custom grouping

---

### 4. **budget_alerts**
**Purpose:** Notifikasi otomatis kalau budget hampir/sudah terlampaui

**Fields:**
- `alert_type`: warning | exceeded | approaching
- `threshold_percentage`: alert kalau sudah pakai 80% budget
- `last_triggered_at`: tracking kapan terakhir alert

**Use Cases:**
- Alert kalau spending groceries sudah 80%
- Warning kalau budget exceeded
- Proactive budget management

---

### 5. **asset_transactions**
**Purpose:** History buy/sell/dividend untuk investments

**Fields:**
- `transaction_type`: buy | sell | dividend
- `quantity`, `price_per_unit`, `total_amount`
- `transaction_date`

**Use Cases:**
- Track setiap kali buy/sell saham
- Calculate average cost
- Tax reporting (capital gains)

---

## 📈 Views untuk Analytics

### 1. **project_spending_summary**
```sql
SELECT * FROM project_spending_summary;
```
**Returns:**
- Actual spent vs Budget
- Remaining budget
- Percentage used
- Status & deadline

### 2. **wallet_balances**
```sql
SELECT * FROM wallet_balances;
```
**Returns:**
- Initial balance
- Total income & expense
- **Current balance** (calculated)
- Currency

---

## 🚀 Cara Menjalankan Migration

### Opsi 1: Via Supabase Dashboard (Recommended)
1. Login ke Supabase Dashboard
2. Pilih project Anda
3. Klik **SQL Editor**
4. Copy-paste isi file `database_migration_enhanced.sql`
5. Klik **Run**
6. ✅ Done! Semua enhancement aktif

### Opsi 2: Via Script
```bash
# Nanti bisa saya buatkan script automation
npm run migrate
```

---

## 🔄 Rollback Strategy

**Jika ada masalah**, migration ini bisa di-rollback dengan aman karena:
1. **Tidak mengubah data existing**
2. **Hanya menambah column/table baru**
3. **Column baru bisa di-drop tanpa affect data lama**

**Rollback Command** (if needed):
```sql
-- Drop new tables
DROP TABLE IF EXISTS public.asset_transactions;
DROP TABLE IF EXISTS public.budget_alerts;
DROP TABLE IF EXISTS public.transaction_tag_assignments;
DROP TABLE IF EXISTS public.transaction_tags;
DROP TABLE IF EXISTS public.financial_goals;
DROP TABLE IF EXISTS public.recurring_transactions;

-- Drop new columns (optional, bisa dibiarkan juga tidak masalah)
ALTER TABLE public.transactions DROP COLUMN IF EXISTS project_id;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS debt_id;
-- dst...
```

---

## ✅ Post-Migration Checklist

Setelah migration berhasil:

1. ✅ Cek website masih jalan normal
2. ✅ Test create/edit/delete transaksi
3. ✅ Test semua existing features
4. ✅ (Optional) Update UI untuk gunakan fitur baru:
   - Link transaksi ke project
   - Budget alerts
   - Recurring transactions
   - Financial goals

---

## 🎯 Next Steps (Optional)

Setelah migration sukses, kamu bisa:

1. **Update UI** untuk manfaatkan fitur baru
2. **Add recurring transaction UI** untuk auto-generate transaksi
3. **Add financial goals page** untuk track savings
4. **Add budget alerts** untuk notifikasi
5. **Update seed script** untuk include data baru

Mau saya bantuin untuk salah satu dari ini?

---

## 📞 Support

Jika ada pertanyaan atau error saat migration:
1. Screenshot error message
2. Cek Supabase logs
3. Contact developer

**Remember:** Migration ini 100% safe dan backward compatible! 🎉
