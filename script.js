// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyCb76gCKYb0uemAcCPYeTKQIaCMi2NQk8k",
    authDomain: "jahitstok.firebaseapp.com",
    projectId: "jahitstok",
    storageBucket: "jahitstok.firebasestorage.app",
    messagingSenderId: "129175331237",
    appId: "1:129175331237:web:a7cc5616b23f52ed06884c"
};

const GOOGLE_CLIENT_ID = "129175331237-d39nldiu6l0kt642rcdsn0jmgvol0l3j.apps.googleusercontent.com";

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==================== STATE ====================
let currentUser = null;
let daftarBarang = [];
let riwayat = [];
let currentFilter = 'all';
let customDari = '';
let customSampai = '';
let listenersAttached = false;

// ==================== INIT ====================
function init() {
    setupGoogleSignIn();

    // Cek status login
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await onLoginSuccess(user);
        } else {
            showLoginPage();
        }
    });
}

// ==================== GOOGLE SIGN-IN ====================
function setupGoogleSignIn() {
    if (typeof google === 'undefined') {
        // Tunggu google object tersedia
        setTimeout(setupGoogleSignIn, 300);
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
    });

    const buttonDiv = document.getElementById("buttonDiv");
    if (buttonDiv) {
        google.accounts.id.renderButton(buttonDiv, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            width: 280,
            logo_alignment: "left"
        });
    }
}

function handleCredentialResponse(response) {
    const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);

    auth.signInWithCredential(credential)
        .then(async (result) => {
            currentUser = result.user;
            await db.collection('users').doc(currentUser.uid).set({
                nama: currentUser.displayName || '',
                email: currentUser.email || '',
                foto: currentUser.photoURL || '',
                lastLogin: new Date().toISOString()
            }, { merge: true });
        })
        .catch((error) => {
            console.error('Login error:', error);
            alert('Gagal login: ' + error.message);
        });
}

async function onLoginSuccess(user) {
    // Update UI
    const elName = document.getElementById('userName');
    const elEmail = document.getElementById('userEmail');
    const elAvatar = document.getElementById('userAvatar');

    if (elName) elName.textContent = user.displayName || 'User';
    if (elEmail) elEmail.textContent = user.email || '';
    if (elAvatar) elAvatar.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User');

    // Tampilkan app, sembunyikan login
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    // Load data user
    await loadUserData(user.uid);

    // Attach event listeners (sekali saja)
    if (!listenersAttached) {
        setupEventListeners();
        listenersAttached = true;
    }

    updateDate();
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    currentUser = null;
    daftarBarang = [];
    riwayat = [];
    listenersAttached = false;
}

function logout() {
    if (!confirm('Yakin ingin logout?')) return;
    auth.signOut().then(() => {
        showLoginPage();
    });
}

// ==================== FIRESTORE ====================
async function loadUserData(uid) {
    const loading = document.getElementById('loadingScreen');
    if (loading) loading.style.display = 'flex';

    try {
        // Load barang
        const barangSnap = await db.collection('users').doc(uid).collection('barang').get();
        daftarBarang = barangSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load riwayat
        const riwayatSnap = await db.collection('users').doc(uid).collection('riwayat').get();
        riwayat = riwayatSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Urutkan riwayat berdasarkan tanggal desc
        riwayat.sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));

        renderAll();
    } catch (error) {
        console.error('Error load data:', error);
        alert('Gagal memuat data: ' + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

async function saveBarang(barang) {
    if (!currentUser) return;
    try {
        const ref = db.collection('users').doc(currentUser.uid).collection('barang').doc();
        const newBarang = { ...barang };
        delete newBarang.id;
        await ref.set(newBarang);
        daftarBarang.push({ id: ref.id, ...newBarang });
        renderAll();
    } catch (error) {
        console.error('Error save barang:', error);
        alert('Gagal menyimpan barang: ' + error.message);
    }
}

async function updateStokBarang(id, stokBaru) {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('barang').doc(id).update({ stok: stokBaru });
        const barang = daftarBarang.find(b => b.id === id);
        if (barang) barang.stok = stokBaru;
    } catch (error) {
        console.error('Error update stok:', error);
    }
}

async function deleteBarangFromDB(id) {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('barang').doc(id).delete();
        daftarBarang = daftarBarang.filter(b => b.id !== id);
        renderAll();
    } catch (error) {
        console.error('Error delete barang:', error);
    }
}

async function saveRiwayat(transaksi) {
    if (!currentUser) return;
    try {
        const ref = db.collection('users').doc(currentUser.uid).collection('riwayat').doc();
        const newRiwayat = { ...transaksi };
        delete newRiwayat.id;
        await ref.set(newRiwayat);
        riwayat.unshift({ id: ref.id, ...newRiwayat });
        renderAll();
    } catch (error) {
        console.error('Error save riwayat:', error);
        alert('Gagal menyimpan riwayat: ' + error.message);
    }
}

async function deleteAllRiwayatFromDB() {
    if (!currentUser) return;
    try {
        const batch = db.batch();
        riwayat.forEach(r => {
            batch.delete(db.collection('users').doc(currentUser.uid).collection('riwayat').doc(r.id));
        });
        await batch.commit();
        riwayat = [];
        renderAll();
    } catch (error) {
        console.error('Error delete riwayat:', error);
        alert('Gagal menghapus riwayat: ' + error.message);
    }
}

// ==================== RENDER ====================
function renderAll() {
    renderBarang();
    renderDashboard();
    populateSelects();
    renderRiwayatMasuk();
    renderRiwayatKeluar();
    renderRiwayatAll();
}

function renderBarang() {
    const tbody = document.getElementById('tbodyBarang');
    if (!tbody) return;
    tbody.innerHTML = daftarBarang.map((b, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${b.nama}</strong></td>
            <td><span class="badge">${b.kategori}</span></td>
            <td>${b.warna || '-'}</td>
            <td>${b.ukuran || '-'}</td>
            <td><strong>${b.stok}</strong></td>
            <td>${b.satuan}</td>
            <td>${formatRupiah(b.hargaBeli || 0)}</td>
            <td>${formatRupiah(b.hargaJual || 0)}</td>
            <td><button class="btn-delete" onclick="hapusBarang('${b.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('') || '<tr><td colspan="10" style="text-align:center;color:#94a3b8;padding:20px;">Belum ada barang. Klik "Tambah Barang" untuk mulai.</td></tr>';
}

function renderDashboard() {
    const elTotal = document.getElementById('totalBarang');
    if (elTotal) elTotal.textContent = daftarBarang.length;

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

    // Uang Masuk = dari barang keluar (penjualan)
    const uangMasukBulanIni = keluarBulanIni.reduce((s, r) => s + (r.total || 0), 0);
    // Uang Keluar = dari barang masuk (pembelian)
    const uangKeluarBulanIni = masukBulanIni.reduce((s, r) => s + (r.total || 0), 0);
    const totalUangMasuk = riwayat.filter(r => r.jenis === 'keluar').reduce((s, r) => s + (r.total || 0), 0);
    const totalUangKeluar = riwayat.filter(r => r.jenis === 'masuk').reduce((s, r) => s + (r.total || 0), 0);
    const saldo = totalUangMasuk - totalUangKeluar;

    document.getElementById('dashUangMasuk').textContent = formatRupiah(uangMasukBulanIni);
    document.getElementById('dashUangKeluar').textContent = formatRupiah(uangKeluarBulanIni);
    document.getElementById('dashSaldo').textContent = formatRupiah(saldo);

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

function populateSelects() {
    ['masukBarang', 'keluarBarang'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = daftarBarang.map(b => `
            <option value="${b.id}">${b.nama} ${b.warna ? '('+b.warna+')' : ''} - ${b.stok} ${b.satuan}</option>
        `).join('') || '<option value="">Belum ada barang</option>';
    });
}

function renderRiwayatMasuk() {
    const tbody = document.getElementById('tbodyMasuk');
    if (!tbody) return;
    const data = riwayat.filter(r => r.jenis === 'masuk').slice(0, 10);
    tbody.innerHTML = data.map((r, i) => {
        const barang = daftarBarang.find(b => b.id === r.barangId);
        return `<tr>
            <td>${i + 1}</td>
            <td>${r.namaBarang || (barang ? barang.nama : 'Terhapus')}</td>
            <td><strong>${r.jumlah}</strong></td>
            <td>${formatRupiah(r.harga || 0)}</td>
            <td><strong style="color:#ef4444;">${formatRupiah(r.total || 0)}</strong></td>
            <td>${r.supplier || '-'}</td>
            <td>${formatTanggal(r.tanggal)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">Belum ada riwayat masuk</td></tr>';
}

function renderRiwayatKeluar() {
    const tbody = document.getElementById('tbodyKeluar');
    if (!tbody) return;
    const data = riwayat.filter(r => r.jenis === 'keluar').slice(0, 10);
    tbody.innerHTML = data.map((r, i) => {
        const barang = daftarBarang.find(b => b.id === r.barangId);
        return `<tr>
            <td>${i + 1}</td>
            <td>${r.namaBarang || (barang ? barang.nama : 'Terhapus')}</td>
            <td><strong>${r.jumlah}</strong></td>
            <td>${formatRupiah(r.harga || 0)}</td>
            <td><strong style="color:#10b981;">${formatRupiah(r.total || 0)}</strong></td>
            <td>${r.tujuan || '-'}</td>
            <td>${formatTanggal(r.tanggal)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">Belum ada riwayat keluar</td></tr>';
}

// ==================== RIWAYAT & KEUANGAN ====================
function getFilteredRiwayat() {
    let data = [...riwayat];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (currentFilter === 'today') {
        data = data.filter(r => new Date(r.tanggal) >= today);
    } else if (currentFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        data = data.filter(r => new Date(r.tanggal) >= weekAgo);
    } else if (currentFilter === 'month') {
        data = data.filter(r => {
            const d = new Date(r.tanggal);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    } else if (currentFilter === 'year') {
        data = data.filter(r => new Date(r.tanggal).getFullYear() === now.getFullYear());
    } else if (currentFilter === 'custom') {
        if (customDari) data = data.filter(r => new Date(r.tanggal) >= new Date(customDari));
        if (customSampai) {
            const sampai = new Date(customSampai);
            sampai.setHours(23, 59, 59);
            data = data.filter(r => new Date(r.tanggal) <= sampai);
        }
    }
    return data;
}

function renderRiwayatAll() {
    const data = getFilteredRiwayat().sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const uangMasuk = data.filter(r => r.jenis === 'keluar').reduce((s, r) => s + (r.total || 0), 0);
    const uangKeluar = data.filter(r => r.jenis === 'masuk').reduce((s, r) => s + (r.total || 0), 0);
    const saldo = uangMasuk - uangKeluar;

    document.getElementById('riwayatUangMasuk').textContent = formatRupiah(uangMasuk);
    document.getElementById('riwayatUangKeluar').textContent = formatRupiah(uangKeluar);
    document.getElementById('riwayatSaldo').textContent = formatRupiah(saldo);

    const tbody = document.getElementById('tbodyRiwayat');
    if (!tbody) return;

    tbody.innerHTML = data.map((r, i) => {
        const barang = daftarBarang.find(b => b.id === r.barangId);
        const namaBarang = r.namaBarang || (barang ? barang.nama : 'Terhapus');
        const badge = r.jenis === 'masuk'
            ? '<span class="badge-masuk">📥 Masuk</span>'
            : '<span class="badge-keluar">📤 Keluar</span>';
        const totalClass = r.jenis === 'masuk' ? 'text-keluar' : 'text-masuk';
        const totalPrefix = r.jenis === 'masuk' ? '-' : '+';
        return `<tr>
            <td>${i + 1}</td>
            <td>${formatTanggal(r.tanggal)}</td>
            <td>${badge}</td>
            <td>${namaBarang}</td>
            <td><strong>${r.jumlah}</strong></td>
            <td>${formatRupiah(r.harga || 0)}</td>
            <td class="${totalClass}">${totalPrefix} ${formatRupiah(r.total || 0)}</td>
            <td>${r.keterangan || r.supplier || r.tujuan || '-'}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:20px;">Belum ada transaksi pada periode ini</td></tr>';
}

// ==================== FUNGSI BARANG ====================
async function tambahBarang(nama, kategori, warna, ukuran, stok, satuan, hargaBeli, hargaJual) {
    await saveBarang({
        nama,
        kategori,
        warna: warna || '-',
        ukuran: ukuran || '-',
        stok: parseInt(stok) || 0,
        satuan,
        hargaBeli: parseInt(hargaBeli) || 0,
        hargaJual: parseInt(hargaJual) || 0
    });
}

async function hapusBarang(id) {
    if (!confirm('Yakin hapus barang ini?')) return;
    await deleteBarangFromDB(id);
}

async function catatMasuk(barangId, jumlah, harga, tanggal, supplier, keterangan) {
    const barang = daftarBarang.find(b => b.id === barangId);
    if (!barang) { alert('Barang tidak ditemukan!'); return false; }

    const stokBaru = parseInt(barang.stok) + parseInt(jumlah);
    await updateStokBarang(barangId, stokBaru);

    await saveRiwayat({
        barangId,
        namaBarang: barang.nama + (barang.warna && barang.warna !== '-' ? ' (' + barang.warna + ')' : ''),
        jenis: 'masuk',
        jumlah: parseInt(jumlah),
        harga: parseInt(harga) || 0,
        total: (parseInt(jumlah) || 0) * (parseInt(harga) || 0),
        tanggal: tanggal || new Date().toISOString().split('T')[0],
        supplier: supplier || '',
        keterangan: keterangan || ''
    });
    return true;
}

async function catatKeluar(barangId, jumlah, harga, tanggal, tujuan, keterangan) {
    const barang = daftarBarang.find(b => b.id === barangId);
    if (!barang) { alert('Barang tidak ditemukan!'); return false; }

    if (barang.stok < parseInt(jumlah)) {
        alert(`Stok tidak cukup! Tersisa ${barang.stok} ${barang.satuan}`);
        return false;
    }

    const stokBaru = parseInt(barang.stok) - parseInt(jumlah);
    await updateStokBarang(barangId, stokBaru);

    await saveRiwayat({
        barangId,
        namaBarang: barang.nama + (barang.warna && barang.warna !== '-' ? ' (' + barang.warna + ')' : ''),
        jenis: 'keluar',
        jumlah: parseInt(jumlah),
        harga: parseInt(harga) || 0,
        total: (parseInt(jumlah) || 0) * (parseInt(harga) || 0),
        tanggal: tanggal || new Date().toISOString().split('T')[0],
        tujuan: tujuan || '',
        keterangan: keterangan || ''
    });
    return true;
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

function updatePreviewMasuk() {
    const jumlah = parseInt(document.getElementById('masukJumlah').value) || 0;
    const harga = parseInt(document.getElementById('masukHarga').value) || 0;
    document.getElementById('previewMasuk').textContent = formatRupiah(jumlah * harga);
}

function updatePreviewKeluar() {
    const jumlah = parseInt(document.getElementById('keluarJumlah').value) || 0;
    const harga = parseInt(document.getElementById('keluarHarga').value) || 0;
    document.getElementById('previewKeluar').textContent = formatRupiah(jumlah * harga);
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
    if (ham) ham.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', logout);

    // Modal
    const btnTambah = document.getElementById('btnTambahBarang');
    if (btnTambah) {
        btnTambah.addEventListener('click', () => {
            document.getElementById('modalBarang').classList.add('show');
            document.getElementById('formTambahBarang').reset();
        });
    }

    const modalClose = document.getElementById('modalClose');
    if (modalClose) modalClose.addEventListener('click', () => document.getElementById('modalBarang').classList.remove('show'));

    const modalOverlay = document.getElementById('modalBarang');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('show');
        });
    }

    // Form Tambah Barang
    const formTambah = document.getElementById('formTambahBarang');
    if (formTambah) {
        formTambah.addEventListener('submit', async function(e) {
            e.preventDefault();
            const nama = document.getElementById('fbNama').value.trim();
            const kategori = document.getElementById('fbKategori').value;
            const warna = document.getElementById('fbWarna').value.trim();
            const ukuran = document.getElementById('fbUkuran').value.trim();
            const stok = document.getElementById('fbStok').value || 0;
            const satuan = document.getElementById('fbSatuan').value;
            const hargaBeli = document.getElementById('fbHargaBeli').value || 0;
            const hargaJual = document.getElementById('fbHargaJual').value || 0;

            if (!nama) { alert('Nama barang wajib diisi!'); return; }

            await tambahBarang(nama, kategori, warna, ukuran, stok, satuan, hargaBeli, hargaJual);
            document.getElementById('modalBarang').classList.remove('show');
            this.reset();
            alert('✅ Barang berhasil ditambahkan!');
        });
    }

    // Form Masuk
    const formMasuk = document.getElementById('formMasuk');
    if (formMasuk) {
        formMasuk.addEventListener('submit', async function(e) {
            e.preventDefault();
            const barangId = document.getElementById('masukBarang').value;
            const jumlah = document.getElementById('masukJumlah').value;
            const harga = document.getElementById('masukHarga').value;
            const tanggal = document.getElementById('masukTanggal').value;
            const supplier = document.getElementById('masukSupplier').value.trim();
            const keterangan = document.getElementById('masukKeterangan').value.trim();

            if (!barangId || !jumlah) { alert('Barang dan jumlah wajib diisi!'); return; }

            const ok = await catatMasuk(barangId, jumlah, harga, tanggal, supplier, keterangan);
            if (ok) {
                this.reset();
                document.getElementById('masukTanggal').value = new Date().toISOString().split('T')[0];
                document.getElementById('previewMasuk').textContent = 'Rp 0';
                alert('✅ Barang masuk berhasil dicatat!');
            }
        });
    }

    // Form Keluar
    const formKeluar = document.getElementById('formKeluar');
    if (formKeluar) {
        formKeluar.addEventListener('submit', async function(e) {
            e.preventDefault();
            const barangId = document.getElementById('keluarBarang').value;
            const jumlah = document.getElementById('keluarJumlah').value;
            const harga = document.getElementById('keluarHarga').value;
            const tanggal = document.getElementById('keluarTanggal').value;
            const tujuan = document.getElementById('keluarTujuan').value.trim();
            const keterangan = document.getElementById('keluarKeterangan').value.trim();

            if (!barangId || !jumlah) { alert('Barang dan jumlah wajib diisi!'); return; }

            const ok = await catatKeluar(barangId, jumlah, harga, tanggal, tujuan, keterangan);
            if (ok) {
                this.reset();
                document.getElementById('keluarTanggal').value = new Date().toISOString().split('T')[0];
                document.getElementById('previewKeluar').textContent = 'Rp 0';
                alert('✅ Barang keluar berhasil dicatat!');
            }
        });
    }

    // Preview Total
    ['masukJumlah', 'masukHarga'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreviewMasuk);
    });

    ['keluarJumlah', 'keluarHarga'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreviewKeluar);
    });

    // Auto-isi harga saat pilih barang
    const masukBarang = document.getElementById('masukBarang');
    if (masukBarang) {
        masukBarang.addEventListener('change', function() {
            const barang = daftarBarang.find(b => b.id === this.value);
            if (barang) {
                document.getElementById('masukHarga').value = barang.hargaBeli || 0;
                updatePreviewMasuk();
            }
        });
    }

    const keluarBarang = document.getElementById('keluarBarang');
    if (keluarBarang) {
        keluarBarang.addEventListener('change', function() {
            const barang = daftarBarang.find(b => b.id === this.value);
            if (barang) {
                document.getElementById('keluarHarga').value = barang.hargaJual || 0;
                updatePreviewKeluar();
            }
        });
    }

    // Filter Buttons
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            customDari = '';
            customSampai = '';
            document.getElementById('filterDari').value = '';
            document.getElementById('filterSampai').value = '';
            renderRiwayatAll();
        });
    });

    const btnFilterCustom = document.getElementById('btnFilterCustom');
    if (btnFilterCustom) {
        btnFilterCustom.addEventListener('click', function() {
            customDari = document.getElementById('filterDari').value;
            customSampai = document.getElementById('filterSampai').value;
            if (!customDari && !customSampai) { alert('Isi minimal satu tanggal!'); return; }
            currentFilter = 'custom';
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            renderRiwayatAll();
        });
    }

    // Reset Riwayat
    const btnReset = document.getElementById('btnResetRiwayat');
    if (btnReset) {
        btnReset.addEventListener('click', async function() {
            if (riwayat.length === 0) { alert('📭 Belum ada riwayat!'); return; }
            if (confirm('⚠️ Yakin ingin menghapus SEMUA riwayat transaksi?\n\nData tidak bisa dikembalikan!')) {
                await deleteAllRiwayatFromDB();
                alert('✅ Semua riwayat berhasil dihapus!');
            }
        });
    }
}

// ==================== SET DEFAULT TANGGAL ====================
function setDefaultTanggal() {
    const today = new Date().toISOString().split('T')[0];
    const elMasuk = document.getElementById('masukTanggal');
    const elKeluar = document.getElementById('keluarTanggal');
    if (elMasuk) elMasuk.value = today;
    if (elKeluar) elKeluar.value = today;
}

// ==================== JALANKAN ====================
document.addEventListener('DOMContentLoaded', () => {
    setDefaultTanggal();
    init();
});