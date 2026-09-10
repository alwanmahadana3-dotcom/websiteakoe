// ==================== DATA AWAL ====================
const defaultBarang = [
    { id: 1, nama: 'Benang Katun', kategori: 'Benang', warna: 'Putih', ukuran: 'No. 40', stok: 25, satuan: 'cone', harga: 8000 },
    { id: 2, nama: 'Benang Katun', kategori: 'Benang', warna: 'Hitam', ukuran: 'No. 40', stok: 18, satuan: 'cone', harga: 8000 },
    { id: 3, nama: 'Benang Nilon', kategori: 'Benang', warna: 'Bening', ukuran: 'No. 30', stok: 12, satuan: 'roll', harga: 12000 },
    { id: 4, nama: 'Jarum Mesin', kategori: 'Jarum', warna: '-', ukuran: 'No. 14', stok: 50, satuan: 'pcs', harga: 2000 },
    { id: 5, nama: 'Jarum Tangan', kategori: 'Jarum', warna: '-', ukuran: 'No. 9', stok: 30, satuan: 'pcs', harga: 1000 },
    { id: 6, nama: 'Kain Katun', kategori: 'Kain', warna: 'Merah', ukuran: 'Lebar 110cm', stok: 45, satuan: 'meter', harga: 35000 },
    { id: 7, nama: 'Kain Katun', kategori: 'Kain', warna: 'Biru Navy', ukuran: 'Lebar 110cm', stok: 32, satuan: 'meter', harga: 35000 },
    { id: 8, nama: 'Resleting', kategori: 'Aksesoris', warna: 'Hitam', ukuran: '60cm', stok: 40, satuan: 'pcs', harga: 3000 },
    { id: 9, nama: 'Kancing', kategori: 'Aksesoris', warna: 'Putih', ukuran: '12mm', stok: 100, satuan: 'pcs', harga: 500 },
    { id: 10, nama: 'Pita Satin', kategori: 'Aksesoris', warna: 'Merah', ukuran: '1/4 inch', stok: 8, satuan: 'meter', harga: 5000 }
];

let daftarBarang = [];
let riwayat = [];
let keuangan = [];
let idCounter = 11;
let keuIdCounter = 1;
let filterKeu = 'all';

// ==================== INIT ====================
function init() {
    const savedBarang = localStorage.getItem('jahitStok_barang');
    const savedRiwayat = localStorage.getItem('jahitStok_riwayat');
    const savedId = localStorage.getItem('jahitStok_idCounter');
    const savedKeuangan = localStorage.getItem('jahitStok_keuangan');
    const savedKeuId = localStorage.getItem('jahitStok_keuIdCounter');

    daftarBarang = savedBarang ? JSON.parse(savedBarang) : JSON.parse(JSON.stringify(defaultBarang));
    if (!savedBarang) localStorage.setItem('jahitStok_barang', JSON.stringify(daftarBarang));

    riwayat = savedRiwayat ? JSON.parse(savedRiwayat) : [];
    if (!savedRiwayat) localStorage.setItem('jahitStok_riwayat', JSON.stringify(riwayat));

    idCounter = savedId ? parseInt(savedId) : (daftarBarang.length > 0 ? Math.max(...daftarBarang.map(b => b.id)) + 1 : 1);
    if (!savedId) localStorage.setItem('jahitStok_idCounter', String(idCounter));

    keuangan = savedKeuangan ? JSON.parse(savedKeuangan) : [];
    if (!savedKeuangan) localStorage.setItem('jahitStok_keuangan', JSON.stringify(keuangan));

    keuIdCounter = savedKeuId ? parseInt(savedKeuId) : 1;
    if (!savedKeuId) localStorage.setItem('jahitStok_keuIdCounter', String(keuIdCounter));

    renderAll();
    setupEventListeners();
    updateDate();
}

// ==================== RENDER ====================
function renderAll() {
    renderBarang();
    renderDashboard();
    populateSelects();
    renderRiwayatMasuk();
    renderRiwayatKeluar();
    renderRiwayatAll();
    renderKeuangan();
    renderKeuanganSummary();
    renderDashboardKeuangan();
}

function renderBarang() {
    const tbody = document.getElementById('tbodyBarang');
    if (!tbody) return;
    tbody.innerHTML = daftarBarang.map((b, i) => {
        const totalNilai = (b.stok || 0) * (b.harga || 0);
        return `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${b.nama}</strong></td>
            <td><span class="badge">${b.kategori}</span></td>
            <td>${b.warna || '-'}</td>
            <td>${b.ukuran || '-'}</td>
            <td><strong>${b.stok}</strong></td>
            <td>${b.satuan}</td>
            <td>${formatRupiah(b.harga || 0)}</td>
            <td><strong style="color:#4f46e5;">${formatRupiah(totalNilai)}</strong></td>
            <td>
                <button class="btn-delete" onclick="updateHargaBarang(${b.id})" title="Edit Harga" style="background:#dbeafe;color:#1e40af;margin-right:4px;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="hapusBarang(${b.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `}).join('');
}

function renderDashboard() {
    document.getElementById('totalBarang').textContent = daftarBarang.length;

    const bulanIni = new Date().getMonth();
    const tahunIni = new Date().getFullYear();

    const masukBulanIni = riwayat.filter(r => {
        const d = new Date(r.tanggal);
        return r.jenis === 'masuk' && d.getMonth() === bulanIni && d.getFullYear() === tahunIni;
    });
    const keluarBulanIni = riwayat.filter(r => {
        const d = new Date(r.tanggal);
        return r.jenis === 'keluar' && d.getMonth() === bulanIni && d.getFullYear() === tahunIni;
    });

    document.getElementById('totalMasuk').textContent = masukBulanIni.reduce((s, r) => s + r.jumlah, 0);
    document.getElementById('totalKeluar').textContent = keluarBulanIni.reduce((s, r) => s + r.jumlah, 0);

    const menipis = daftarBarang.filter(b => b.stok < 10);
    document.getElementById('totalMenipis').textContent = menipis.length;

    // Total nilai aset gudang
    const totalNilaiAset = daftarBarang.reduce((s, b) => s + (b.stok * (b.harga || 0)), 0);
    const elAset = document.getElementById('totalNilaiAset');
    if (elAset) elAset.textContent = formatRupiah(totalNilaiAset);

    const container = document.getElementById('lowStockList');
    if (menipis.length === 0) {
        container.innerHTML = '<p style="color:#64748b;font-size:14px;">✅ Semua stok aman, tidak ada yang menipis.</p>';
    } else {
        container.innerHTML = menipis.map(b => `
            <div class="low-stock-item">
                <span class="name">${b.nama} ${b.warna ? '('+b.warna+')' : ''}</span>
                <span class="stock">${b.stok} ${b.satuan}</span>
            </div>
        `).join('');
    }
}

function renderDashboardKeuangan() {
    const bulanIni = new Date().getMonth();
    const tahunIni = new Date().getFullYear();

    const masukBulanIni = keuangan.filter(k => {
        const d = new Date(k.tanggal);
        return k.jenis === 'pemasukan' && d.getMonth() === bulanIni && d.getFullYear() === tahunIni;
    });
    const keluarBulanIni = keuangan.filter(k => {
        const d = new Date(k.tanggal);
        return k.jenis === 'pengeluaran' && d.getMonth() === bulanIni && d.getFullYear() === tahunIni;
    });

    const totalMasuk = masukBulanIni.reduce((s, k) => s + k.jumlah, 0);
    const totalKeluar = keluarBulanIni.reduce((s, k) => s + k.jumlah, 0);
    const saldo = keuangan.reduce((s, k) => s + (k.jenis === 'pemasukan' ? k.jumlah : -k.jumlah), 0);

    const el1 = document.getElementById('dashPemasukan');
    const el2 = document.getElementById('dashPengeluaran');
    const el3 = document.getElementById('dashSaldo');
    if (el1) el1.textContent = formatRupiah(totalMasuk);
    if (el2) el2.textContent = formatRupiah(totalKeluar);
    if (el3) el3.textContent = formatRupiah(saldo);
}

function renderKeuanganSummary() {
    const totalMasuk = keuangan.filter(k => k.jenis === 'pemasukan').reduce((s, k) => s + k.jumlah, 0);
    const totalKeluar = keuangan.filter(k => k.jenis === 'pengeluaran').reduce((s, k) => s + k.jumlah, 0);
    const saldo = totalMasuk - totalKeluar;

    const el1 = document.getElementById('keuTotalMasuk');
    const el2 = document.getElementById('keuTotalKeluar');
    const el3 = document.getElementById('keuSaldo');
    if (el1) el1.textContent = formatRupiah(totalMasuk);
    if (el2) el2.textContent = formatRupiah(totalKeluar);
    if (el3) el3.textContent = formatRupiah(saldo);
}

function renderKeuangan() {
    const tbody = document.getElementById('tbodyKeuangan');
    if (!tbody) return;

    let data = [...keuangan].reverse();
    if (filterKeu === 'pemasukan') data = data.filter(k => k.jenis === 'pemasukan');
    if (filterKeu === 'pengeluaran') data = data.filter(k => k.jenis === 'pengeluaran');

    tbody.innerHTML = data.map((k, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${formatTanggal(k.tanggal)}</td>
            <td><span class="${k.jenis === 'pemasukan' ? 'badge-masuk' : 'badge-keluar'}">${k.jenis === 'pemasukan' ? '💰 Pemasukan' : '💸 Pengeluaran'}</span></td>
            <td>${k.kategori}</td>
            <td class="${k.jenis === 'pemasukan' ? 'keu-masuk' : 'keu-keluar'}">${k.jenis === 'pemasukan' ? '+' : '-'} ${formatRupiah(k.jumlah)}</td>
            <td>${k.keterangan || '-'}</td>
            <td><button class="btn-delete" onclick="hapusKeuangan(${k.id})"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">Belum ada transaksi keuangan</td></tr>';
}

function populateSelects() {
    ['masukBarang', 'keluarBarang'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = daftarBarang.map(b => `
            <option value="${b.id}">${b.nama} ${b.warna ? '('+b.warna+')' : ''} - ${b.stok} ${b.satuan}</option>
        `).join('');
    });
}

function renderRiwayatMasuk() {
    const tbody = document.getElementById('tbodyMasuk');
    if (!tbody) return;
    const data = riwayat.filter(r => r.jenis === 'masuk').slice(-10).reverse();
    tbody.innerHTML = data.map((r, i) => {
        const barang = daftarBarang.find(b => b.id === r.barangId);
        return `<tr>
            <td>${i + 1}</td>
            <td>${barang ? barang.nama : 'Terhapus'}</td>
            <td><strong>${r.jumlah}</strong></td>
            <td>${r.supplier || '-'}</td>
            <td>${formatTanggal(r.tanggal)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Belum ada riwayat masuk</td></tr>';
}

function renderRiwayatKeluar() {
    const tbody = document.getElementById('tbodyKeluar');
    if (!tbody) return;
    const data = riwayat.filter(r => r.jenis === 'keluar').slice(-10).reverse();
    tbody.innerHTML = data.map((r, i) => {
        const barang = daftarBarang.find(b => b.id === r.barangId);
        return `<tr>
            <td>${i + 1}</td>
            <td>${barang ? barang.nama : 'Terhapus'}</td>
            <td><strong>${r.jumlah}</strong></td>
            <td>${r.tujuan || '-'}</td>
            <td>${formatTanggal(r.tanggal)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Belum ada riwayat keluar</td></tr>';
}

function renderRiwayatAll() {
    const tbody = document.getElementById('tbodyRiwayat');
    if (!tbody) return;
    const data = [...riwayat].reverse();
    tbody.innerHTML = data.map((r, i) => {
        const barang = daftarBarang.find(b => b.id === r.barangId);
        const jenisLabel = r.jenis === 'masuk' ? '📥 Masuk' : '📤 Keluar';
        const warna = r.jenis === 'masuk' ? '#10b981' : '#f59e0b';
        return `<tr>
            <td>${i + 1}</td>
            <td>${formatTanggal(r.tanggal)}</td>
            <td>${barang ? barang.nama : 'Terhapus'}</td>
            <td><span style="color:${warna};font-weight:600;">${jenisLabel}</span></td>
            <td><strong>${r.jumlah}</strong></td>
            <td>${r.keterangan || r.supplier || r.tujuan || '-'}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;">Belum ada transaksi</td></tr>';
}

// ==================== FUNGSI BARANG ====================
function tambahBarang(nama, kategori, warna, ukuran, stok, satuan, harga) {
    daftarBarang.push({
        id: idCounter++,
        nama: nama,
        kategori: kategori,
        warna: warna || '-',
        ukuran: ukuran || '-',
        stok: parseInt(stok) || 0,
        satuan: satuan,
        harga: parseInt(harga) || 0
    });
    localStorage.setItem('jahitStok_barang', JSON.stringify(daftarBarang));
    localStorage.setItem('jahitStok_idCounter', String(idCounter));
    renderAll();
}

function hapusBarang(id) {
    if (!confirm('Yakin hapus barang ini?')) return;
    daftarBarang = daftarBarang.filter(b => b.id !== id);
    localStorage.setItem('jahitStok_barang', JSON.stringify(daftarBarang));
    renderAll();
}

function updateHargaBarang(id) {
    const barang = daftarBarang.find(b => b.id === id);
    if (!barang) return;
    const hargaBaru = prompt(
        `Harga baru untuk "${barang.nama}" ${barang.warna ? '(' + barang.warna + ')' : ''}\n\nHarga saat ini: ${formatRupiah(barang.harga || 0)}`,
        barang.harga || 0
    );
    if (hargaBaru === null) return;
    const harga = parseInt(hargaBaru);
    if (isNaN(harga) || harga < 0) { alert('Harga tidak valid!'); return; }
    barang.harga = harga;
    localStorage.setItem('jahitStok_barang', JSON.stringify(daftarBarang));
    renderAll();
    alert('✅ Harga berhasil diupdate!');
}

function catatMasuk(barangId, jumlah, tanggal, supplier, keterangan) {
    const barang = daftarBarang.find(b => b.id === parseInt(barangId));
    if (!barang) { alert('Barang tidak ditemukan!'); return false; }

    barang.stok += parseInt(jumlah);
    localStorage.setItem('jahitStok_barang', JSON.stringify(daftarBarang));

    riwayat.push({
        barangId: parseInt(barangId),
        jenis: 'masuk',
        jumlah: parseInt(jumlah),
        tanggal: tanggal || new Date().toISOString().split('T')[0],
        supplier: supplier || '',
        keterangan: keterangan || ''
    });
    localStorage.setItem('jahitStok_riwayat', JSON.stringify(riwayat));
    renderAll();
    return true;
}

function catatKeluar(barangId, jumlah, tanggal, tujuan, keterangan) {
    const barang = daftarBarang.find(b => b.id === parseInt(barangId));
    if (!barang) { alert('Barang tidak ditemukan!'); return false; }

    if (barang.stok < parseInt(jumlah)) {
        alert(`Stok tidak cukup! Tersisa ${barang.stok} ${barang.satuan}`);
        return false;
    }

    barang.stok -= parseInt(jumlah);
    localStorage.setItem('jahitStok_barang', JSON.stringify(daftarBarang));

    riwayat.push({
        barangId: parseInt(barangId),
        jenis: 'keluar',
        jumlah: parseInt(jumlah),
        tanggal: tanggal || new Date().toISOString().split('T')[0],
        tujuan: tujuan || '',
        keterangan: keterangan || ''
    });
    localStorage.setItem('jahitStok_riwayat', JSON.stringify(riwayat));
    renderAll();
    return true;
}

// ==================== FUNGSI KEUANGAN ====================
function tambahKeuangan(jenis, kategori, jumlah, tanggal, keterangan) {
    keuangan.push({
        id: keuIdCounter++,
        jenis: jenis,
        kategori: kategori,
        jumlah: parseInt(jumlah) || 0,
        tanggal: tanggal || new Date().toISOString().split('T')[0],
        keterangan: keterangan || ''
    });
    localStorage.setItem('jahitStok_keuangan', JSON.stringify(keuangan));
    localStorage.setItem('jahitStok_keuIdCounter', String(keuIdCounter));
    renderAll();
}

function hapusKeuangan(id) {
    if (!confirm('Yakin hapus transaksi ini?')) return;
    keuangan = keuangan.filter(k => k.id !== id);
    localStorage.setItem('jahitStok_keuangan', JSON.stringify(keuangan));
    renderAll();
}

// ==================== UTILITY ====================
function formatTanggal(tanggal) {
    if (!tanggal) return '-';
    const d = new Date(tanggal);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRupiah(angka) {
    return 'Rp ' + (angka || 0).toLocaleString('id-ID');
}

function updateDate() {
    const now = new Date();
    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    const el = document.getElementById('dateDisplay');
    if (el) el.textContent = now.toLocaleDateString('id-ID', options);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Navigasi
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            const page = this.dataset.page;
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById(`page-${page}`);
            if (target) target.classList.add('active');
            document.getElementById('page-title').textContent = this.textContent.trim();
            document.getElementById('sidebar').classList.remove('open');
        });
    });

    // Hamburger
    const ham = document.getElementById('hamburger');
    if (ham) {
        ham.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    // Modal Tambah Barang
    const btnTambah = document.getElementById('btnTambahBarang');
    if (btnTambah) {
        btnTambah.addEventListener('click', function() {
            document.getElementById('modalBarang').classList.add('show');
            document.getElementById('formTambahBarang').reset();
        });
    }

    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            document.getElementById('modalBarang').classList.remove('show');
        });
    }

    const modalOverlay = document.getElementById('modalBarang');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('show');
        });
    }

    // Form Tambah Barang
    const formTambah = document.getElementById('formTambahBarang');
    if (formTambah) {
        formTambah.addEventListener('submit', function(e) {
            e.preventDefault();
            const nama = document.getElementById('fbNama').value.trim();
            const kategori = document.getElementById('fbKategori').value;
            const warna = document.getElementById('fbWarna').value.trim();
            const ukuran = document.getElementById('fbUkuran').value.trim();
            const stok = document.getElementById('fbStok').value || 0;
            const satuan = document.getElementById('fbSatuan').value;
            const harga = document.getElementById('fbHarga') ? document.getElementById('fbHarga').value : 0;

            if (!nama) { alert('Nama barang wajib diisi!'); return; }

            tambahBarang(nama, kategori, warna, ukuran, stok, satuan, harga);
            document.getElementById('modalBarang').classList.remove('show');
            this.reset();
            alert('✅ Barang berhasil ditambahkan!');
        });
    }

    // Form Masuk
    const formMasuk = document.getElementById('formMasuk');
    if (formMasuk) {
        formMasuk.addEventListener('submit', function(e) {
            e.preventDefault();
            const barangId = document.getElementById('masukBarang').value;
            const jumlah = document.getElementById('masukJumlah').value;
            const tanggal = document.getElementById('masukTanggal').value;
            const supplier = document.getElementById('masukSupplier').value.trim();
            const keterangan = document.getElementById('masukKeterangan').value.trim();

            if (!barangId || !jumlah) { alert('Barang dan jumlah wajib diisi!'); return; }

            if (catatMasuk(barangId, jumlah, tanggal, supplier, keterangan)) {
                this.reset();
                alert('✅ Barang masuk berhasil dicatat!');
            }
        });
    }

    // Form Keluar
    const formKeluar = document.getElementById('formKeluar');
    if (formKeluar) {
        formKeluar.addEventListener('submit', function(e) {
            e.preventDefault();
            const barangId = document.getElementById('keluarBarang').value;
            const jumlah = document.getElementById('keluarJumlah').value;
            const tanggal = document.getElementById('keluarTanggal').value;
            const tujuan = document.getElementById('keluarTujuan').value.trim();
            const keterangan = document.getElementById('keluarKeterangan').value.trim();

            if (!barangId || !jumlah) { alert('Barang dan jumlah wajib diisi!'); return; }

            if (catatKeluar(barangId, jumlah, tanggal, tujuan, keterangan)) {
                this.reset();
                alert('✅ Barang keluar berhasil dicatat!');
            }
        });
    }

    // Form Keuangan
    const formKeuangan = document.getElementById('formKeuangan');
    if (formKeuangan) {
        formKeuangan.addEventListener('submit', function(e) {
            e.preventDefault();
            const jenis = document.getElementById('keuJenis').value;
            const kategori = document.getElementById('keuKategori').value;
            const jumlah = document.getElementById('keuJumlah').value;
            const tanggal = document.getElementById('keuTanggal').value;
            const keterangan = document.getElementById('keuKeterangan').value.trim();

            if (!jumlah || parseInt(jumlah) <= 0) { alert('Jumlah harus lebih dari 0!'); return; }
            if (!tanggal) { alert('Tanggal wajib diisi!'); return; }

            tambahKeuangan(jenis, kategori, jumlah, tanggal, keterangan);
            this.reset();
            alert(`✅ Transaksi ${jenis} berhasil dicatat!`);
        });
    }

    // Filter Keuangan
    const btnAll = document.getElementById('btnFilterKeuAll');
    if (btnAll) {
        btnAll.addEventListener('click', function() {
            filterKeu = 'all';
            renderKeuangan();
            updateFilterButtons();
        });
    }
    const btnIn = document.getElementById('btnFilterKeuMasuk');
    if (btnIn) {
        btnIn.addEventListener('click', function() {
            filterKeu = 'pemasukan';
            renderKeuangan();
            updateFilterButtons();
        });
    }
    const btnOut = document.getElementById('btnFilterKeuKeluar');
    if (btnOut) {
        btnOut.addEventListener('click', function() {
            filterKeu = 'pengeluaran';
            renderKeuangan();
            updateFilterButtons();
        });
    }

    // Hapus Semua Keuangan
    const btnHapusKeu = document.getElementById('btnHapusKeu');
    if (btnHapusKeu) {
        btnHapusKeu.addEventListener('click', function() {
            if (keuangan.length === 0) { alert('📭 Belum ada transaksi keuangan!'); return; }
            if (confirm('⚠️ Yakin ingin menghapus SEMUA transaksi keuangan?\n\nData tidak bisa dikembalikan!')) {
                keuangan = [];
                localStorage.setItem('jahitStok_keuangan', JSON.stringify(keuangan));
                renderAll();
                alert('✅ Semua transaksi keuangan berhasil dihapus!');
            }
        });
    }

    // Reset Riwayat Barang
    const btnResetRiwayat = document.getElementById('btnResetRiwayat');
    if (btnResetRiwayat) {
        btnResetRiwayat.addEventListener('click', function() {
            if (riwayat.length === 0) { alert('📭 Belum ada riwayat yang bisa direset!'); return; }
            if (confirm('⚠️ Yakin ingin menghapus SEMUA riwayat transaksi barang?\n\nData tidak bisa dikembalikan!')) {
                riwayat = [];
                localStorage.setItem('jahitStok_riwayat', JSON.stringify(riwayat));
                renderAll();
                alert('✅ Semua riwayat berhasil dihapus!');
            }
        });
    }
}

function updateFilterButtons() {
    ['btnFilterKeuAll', 'btnFilterKeuMasuk', 'btnFilterKeuKeluar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('filter-btn-active');
    });
    if (filterKeu === 'all') document.getElementById('btnFilterKeuAll').classList.add('filter-btn-active');
    if (filterKeu === 'pemasukan') document.getElementById('btnFilterKeuMasuk').classList.add('filter-btn-active');
    if (filterKeu === 'pengeluaran') document.getElementById('btnFilterKeuKeluar').classList.add('filter-btn-active');
}

// ==================== JALANKAN ====================
document.addEventListener('DOMContentLoaded', init);