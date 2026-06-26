// app.js - Main Application logic, Routing, and Page Renderers for WaliKelas Digital

document.addEventListener('DOMContentLoaded', () => {
  // Check if store loaded
  if (!window.WaliKelasStore) {
    console.error('WaliKelasStore is not loaded!');
    return;
  }
  
  const store = window.WaliKelasStore;
  
  // --- TOAST NOTIFICATION SYSTEM ---
  window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'info') iconClass = 'fa-info-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';

    toast.innerHTML = `
      <i class="fas ${iconClass}"></i>
      <span style="flex: 1; line-height: 1.4;">${message}</span>
      <button class="toast-close"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(toast);

    // Trigger CSS slide-in transition
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Auto dismiss after 3 seconds
    const dismissTimer = setTimeout(() => {
      dismissToast(toast);
    }, 3000);

    // Close button event handler
    toast.querySelector('.toast-close').onclick = () => {
      clearTimeout(dismissTimer);
      dismissToast(toast);
    };
  };

  function dismissToast(toast) {
    toast.classList.remove('show');
    toast.style.opacity = '0';
    toast.style.marginTop = `-${toast.offsetHeight}px`;
    setTimeout(() => {
      toast.remove();
    }, 350);
  }

  // Override native alert with modern toast notifications
  window.alert = function(message) {
    const lower = message.toLowerCase();
    let type = 'info';
    if (lower.includes('berhasil') || lower.includes('sukses') || lower.includes('kembali') || lower.includes('telah')) {
      type = 'success';
    } else if (lower.includes('gagal') || lower.includes('salah') || lower.includes('wajib') || lower.includes('belum') || lower.includes('pilih') || lower.includes('tidak ada')) {
      type = 'warning';
    }
    window.showToast(message, type);
  };

  // DOM Elements
  const appContainer = document.getElementById('app-container');
  const authScreen = document.getElementById('auth-screen');
  const loginForm = document.getElementById('login-form');
  const pinInput = document.getElementById('pin-input');
  const pinToggle = document.getElementById('pin-toggle');
  
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  const menuToggle = document.querySelector('.menu-toggle');
  
  const navLinks = document.querySelectorAll('.menu-item a, .bottom-nav-item');
  const pages = document.querySelectorAll('.page-view');
  
  const headerTitle = document.getElementById('header-title');
  const headerSubtitle = document.getElementById('header-subtitle');
  const classBadge = document.getElementById('class-badge');
  const userNameEl = document.getElementById('user-name');
  
  const logoutBtns = document.querySelectorAll('#logout-btn, #logout-btn-mobile');
  
  // CURRENT STATE VARIABLES
  let currentActivePage = 'dashboard';
  let attendanceSelectedDate = new Date().toISOString().split('T')[0];
  let financeSelectedStudentId = '';
  let gradeGridSubjectId = '';            // currently selected subject in the grid input
  const selectedStudentIds = new Set();   // buku induk bulk-selection state

  // --- AUTHENTICATION FLOW ---
  // PIN/Password visibility toggle
  if (pinToggle) {
    pinToggle.addEventListener('click', () => {
      const type = pinInput.getAttribute('type') === 'password' ? 'text' : 'password';
      pinInput.setAttribute('type', type);
      const icon = pinToggle.querySelector('i');
      if (icon) {
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
      }
    });
  }

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPin = pinInput.value;
      if (store.checkPassword(enteredPin)) {
        // Authenticated!
        authScreen.classList.add('hidden');
        sessionStorage.setItem('authenticated', 'true');
        initApp();
      } else {
        alert('PIN/Password Wali Kelas salah!');
        pinInput.value = '';
        pinInput.focus();
      }
    });
  }

  // Auto Login Check (if session already authenticated)
  if (sessionStorage.getItem('authenticated') === 'true') {
    authScreen.classList.add('hidden');
    initApp();
  }

  // Handle Logout
  logoutBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Apakah Anda ingin mengunci sistem?')) {
          sessionStorage.removeItem('authenticated');
          authScreen.classList.remove('hidden');
          pinInput.value = '';
        }
      });
    }
  });

  // --- APP INITIALIZATION ---
  function initApp() {
    updateHeaderBadge();
    populateSubjectDropdowns();
    
    // Register routing events
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('href').substring(1);
        navigateToPage(targetPage);
        
        // On mobile, close sidebar drawer
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
      });
    });

    // Mobile Sidebar Drawer Toggle
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
      });
    }
    
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
      });
    }

    // Default route
    const hash = window.location.hash.substring(1);
    navigateToPage(hash || 'dashboard');
    
    // Initialize common event listeners once
    initEventListeners();
  }

  function updateHeaderBadge() {
    if (classBadge) {
      classBadge.innerText = `${store.state.settings.className} | ${store.state.settings.academicYear}`;
    }
    if (userNameEl) {
      userNameEl.innerText = store.state.settings.schoolName;
    }
  }

  // --- ROUTING ---
  function navigateToPage(pageId) {
    if (!document.getElementById(pageId)) return;
    
    currentActivePage = pageId;
    window.location.hash = pageId;

    // Update active class on nav links
    navLinks.forEach(link => {
      const href = link.getAttribute('href').substring(1);
      if (href === pageId) {
        link.parentElement.classList.add('active');
        link.classList.add('active'); // Bottom nav uses it directly
      } else {
        link.parentElement.classList.remove('active');
        link.classList.remove('active');
      }
    });

    // Toggle Pages visibility
    pages.forEach(page => {
      if (page.id === pageId) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });

    // Page-specific header text & renders
    let titleText = 'Dashboard';
    let subtitleText = 'Ringkasan aktivitas hari ini';

    switch (pageId) {
      case 'dashboard':
        titleText = 'WaliKelas Dashboard';
        subtitleText = 'Ringkasan aktivitas dan kondisi kelas';
        renderDashboard();
        break;
      case 'students':
        titleText = 'Buku Induk Kelas';
        subtitleText = 'Manajemen profil dan data murid';
        renderStudents();
        break;
      case 'attendance':
        titleText = 'Kehadiran Murid';
        subtitleText = 'Presensi harian dan rekap rapor';
        renderAttendance();
        break;
      case 'grades':
        titleText = 'Nilai & Akademik';
        subtitleText = 'Input nilai tugas harian, ujian & sikap';
        renderGrades();
        break;
      case 'finance':
        titleText = 'Keuangan Kelas';
        subtitleText = 'Manajemen kas kelas dan tabungan siswa';
        renderFinance();
        break;
      case 'schedule':
        titleText = 'Jadwal & Agenda';
        subtitleText = 'Jadwal pelajaran, piket & kalender sekolah';
        renderSchedule();
        break;
      case 'communication':
        titleText = 'Buku Penghubung Digital';
        subtitleText = 'Papan pengumuman & galeri orang tua';
        renderCommunication();
        break;
      case 'settings':
        titleText = 'Pengaturan Aplikasi';
        subtitleText = 'Kelola kurikulum, backup data & profil kelas';
        renderSettings();
        break;
    }

    if (headerTitle) headerTitle.innerText = titleText;
    if (headerSubtitle) headerSubtitle.innerText = subtitleText;
  }

  // --- RENDER PAGE: DASHBOARD ---
  function renderDashboard() {
    const totalStudents = store.state.students.length;
    document.getElementById('dash-stat-students').innerText = totalStudents;

    // Today's attendance percentage or Holiday status
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = store.getAttendance(todayStr);

    if (todayLogs.isHoliday) {
      document.getElementById('dash-stat-attendance').innerText = `Libur (${todayLogs.holidayName})`;
    } else {
      let presentCount = 0;
      Object.keys(todayLogs).forEach(key => {
        if (key !== 'isHoliday' && key !== 'holidayName' && todayLogs[key] === 'H') {
          presentCount++;
        }
      });

      const attPercentage = totalStudents > 0 
        ? Math.round((presentCount / totalStudents) * 100) 
        : 100;

      document.getElementById('dash-stat-attendance').innerText = totalStudents > 0
        ? `${presentCount}/${totalStudents} (${attPercentage}%)`
        : '0 Murid';
    }

    // Savings and Cash balances
    let totalSavings = 0;
    Object.values(store.state.savings).forEach(sav => {
      totalSavings += sav.balance || 0;
    });

    document.getElementById('dash-stat-savings').innerText = formatRupiah(totalSavings);
    document.getElementById('dash-stat-cash').innerText = formatRupiah(store.state.classCash.balance);

    // Dashboard actions click handlers
    document.getElementById('action-absen').onclick = () => navigateToPage('attendance');
    document.getElementById('action-nilai').onclick = () => navigateToPage('grades');
    document.getElementById('action-kas').onclick = () => navigateToPage('finance');
    document.getElementById('action-siswa').onclick = () => {
      navigateToPage('students');
      openModal('modal-student-form');
      document.getElementById('student-form-title').innerText = 'Tambah Murid Baru';
      document.getElementById('student-form').reset();
      document.getElementById('student-id').value = '';
    };

    // Render Recent Logs Feed (simulation of school events and cash changes)
    const feedContainer = document.getElementById('dashboard-feed-list');
    feedContainer.innerHTML = '';

    const feedItems = [];

    // Add recent cash transactions
    store.state.classCash.history.slice(0, 3).forEach(tx => {
      feedItems.push({
        title: tx.note,
        desc: `${tx.type === 'in' ? 'Pemasukan' : 'Pengeluaran'} Kas: ${formatRupiah(tx.amount)}`,
        date: formatDate(tx.date),
        type: tx.type === 'in' ? 'success' : 'warning',
        timestamp: new Date(tx.date).getTime()
      });
    });

    // Add recent announcements
    store.state.announcements.slice(0, 2).forEach(ann => {
      feedItems.push({
        title: `Pengumuman: ${ann.title}`,
        desc: ann.content.substring(0, 60) + '...',
        date: formatDate(ann.date),
        type: 'primary',
        timestamp: new Date(ann.date).getTime()
      });
    });

    // Add calendar events
    store.state.schedule.calendar.slice(0, 2).forEach(event => {
      feedItems.push({
        title: `Agenda: ${event.title}`,
        desc: `Jenis: ${event.type === 'holiday' ? 'Hari Libur' : event.type === 'exam' ? 'Ujian' : 'Kegiatan'}`,
        date: formatDate(event.date),
        type: event.type === 'holiday' ? 'danger' : 'info',
        timestamp: new Date(event.date).getTime()
      });
    });

    // Sort feed items by date desc
    feedItems.sort((a, b) => b.timestamp - a.timestamp);

    if (feedItems.length === 0) {
      feedContainer.innerHTML = '<div class="text-muted text-center py-3">Tidak ada aktivitas baru hari ini.</div>';
    } else {
      feedItems.slice(0, 5).forEach(item => {
        const div = document.createElement('div');
        div.className = `feed-item ${item.type}`;
        div.innerHTML = `
          <div class="feed-content">
            <h4>${item.title}</h4>
            <p>${item.desc}</p>
          </div>
          <div class="feed-date">${item.date}</div>
        `;
        feedContainer.appendChild(div);
      });
    }
  }

  // --- RENDER PAGE: STUDENTS ---
  function renderStudents() {
    const tableBody = document.getElementById('student-list-table-body');
    const searchVal = document.getElementById('search-student').value.toLowerCase();
    tableBody.innerHTML = '';

    const filtered = store.state.students.filter(student => 
      student.name.toLowerCase().includes(searchVal) ||
      (student.nis && student.nis.toLowerCase().includes(searchVal)) ||
      (student.nisn && student.nisn.toLowerCase().includes(searchVal))
    );

    // Drop selections for students no longer present.
    const existingIds = new Set(store.state.students.map(s => s.id));
    Array.from(selectedStudentIds).forEach(id => { if (!existingIds.has(id)) selectedStudentIds.delete(id); });

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">Tidak ada data murid ditemukan.</td></tr>';
      updateStudentsBulkBar();
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    filtered.forEach((student, idx) => {
      const isFemale = student.gender === 'P';
      const tr = document.createElement('tr');
      const isSelected = selectedStudentIds.has(student.id);
      
      // Attendance status today
      const todayLogs = store.getAttendance(todayStr);
      const activeStatus = todayLogs[student.id] || '';

      // Balance
      const balance = store.getSavings(student.id).balance;
      const formatRupiahShort = (val) => {
        if (val >= 1000000) return 'Rp' + (val / 1000000).toFixed(1).replace('.0', '') + 'Jt';
        if (val >= 1000) return 'Rp' + (val / 1000).toFixed(0) + 'Rb';
        return 'Rp' + val;
      };
      
      // Avg Grade (weighted, current subjects only — ignores orphaned data)
      const overallAvg = store.getStudentOverallAverage(student.id);
      const avgGrade = overallAvg === null ? '-' : overallAvg;
      const kkm = store.getKkm();

      // Att Percent
      const attSummary = store.getStudentAttendanceSummary(student.id);
      const attPercent = attSummary.percentage + '%';

      tr.innerHTML = `
        <td data-label="Pilih" style="text-align:center;"><input type="checkbox" class="student-select-cb" ${isSelected ? 'checked' : ''} style="cursor:pointer;"></td>
        <td data-label="No">${idx + 1}</td>
        <td data-label="Nama Murid" data-gender="${student.gender}" data-nis="${student.nis || '-'}">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="student-card-avatar ${isFemale ? 'female' : ''}" style="width: 32px; height: 32px; font-size: 0.85rem; flex-shrink: 0;">
              ${student.name.charAt(0)}
            </div>
            <button type="button" class="student-name-btn" title="Lihat detail murid">${student.name}</button>
          </div>
        </td>
        <td data-label="NIS / NISN">
          <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">NIS: ${student.nis || '-'}</span>
          <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">NISN: ${student.nisn || '-'}</span>
        </td>
        <td data-label="L/P" style="text-align: center;">${student.gender}</td>
        <td data-label="Presensi Hari Ini">
          <div class="attendance-button-group" style="gap: 3px; justify-content: center;">
            <button class="attendance-btn mini h ${activeStatus === 'H' ? 'active' : ''}" data-status="H" style="width: 25px; height: 25px; font-size: 0.7rem;">H</button>
            <button class="attendance-btn mini s ${activeStatus === 'S' ? 'active' : ''}" data-status="S" style="width: 25px; height: 25px; font-size: 0.7rem;">S</button>
            <button class="attendance-btn mini i ${activeStatus === 'I' ? 'active' : ''}" data-status="I" style="width: 25px; height: 25px; font-size: 0.7rem;">I</button>
            <button class="attendance-btn mini a ${activeStatus === 'A' ? 'active' : ''}" data-status="A" style="width: 25px; height: 25px; font-size: 0.7rem;">A</button>
          </div>
        </td>
        <td data-label="Tabungan" style="text-align: center;">
          <button type="button" class="cell-saving-btn" title="Transaksi tabungan ${student.name}" aria-label="Transaksi tabungan ${student.name}">
            ${formatRupiahShort(balance)} <i class="fas fa-plus" style="font-size:0.6rem; opacity:0.55;"></i>
          </button>
        </td>
        <td data-label="Rata Nilai" style="text-align: center;">
          <button type="button" class="cell-grade-btn ${overallAvg === null ? 'empty' : ''} ${overallAvg !== null && overallAvg < kkm ? 'below-kkm' : ''}"
            title="${overallAvg === null ? 'Tambah nilai' : 'Edit nilai'} ${student.name}"
            aria-label="${overallAvg === null ? 'Tambah nilai' : 'Edit nilai'} ${student.name}">
            ${overallAvg === null ? '<i class="fas fa-plus"></i> Nilai' : `${avgGrade} <i class="fas fa-pen" style="font-size:0.62rem; opacity:0.55;"></i>`}
          </button>
        </td>
        <td data-label="Kehadiran" style="text-align: center; font-weight: 600; color: var(--info);">${attPercent}</td>
        <td data-label="Aksi">
          <div class="row-actions">
            <button class="icon-action-btn act-edit edit-btn" title="Edit Murid" aria-label="Edit Murid"><i class="fas fa-edit"></i></button>
            <button class="icon-action-btn act-delete delete-btn" title="Hapus Murid" aria-label="Hapus Murid"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      `;

      // Whole row opens the detail view; interactive children handle themselves.
      tr.style.cursor = 'pointer';
      tr.onclick = (e) => {
        if (e.target.closest('button, input, a')) return;
        showStudentDetails(student.id);
      };

      // Name acts as an accessible link to the detail view.
      tr.querySelector('.student-name-btn').onclick = (e) => {
        e.stopPropagation();
        showStudentDetails(student.id);
      };

      // Interactive data cells: grade & savings
      tr.querySelector('.cell-grade-btn').onclick = (e) => { e.stopPropagation(); showQuickGradeModal(student.id); };
      tr.querySelector('.cell-saving-btn').onclick = (e) => { e.stopPropagation(); showQuickSavingModal(student.id); };

      // Bind Edit action
      tr.querySelector('.edit-btn').onclick = () => showEditStudentForm(student.id);

      // Bind row checkbox selection
      const cb = tr.querySelector('.student-select-cb');
      if (cb) {
        cb.onclick = (e) => e.stopPropagation();
        cb.onchange = () => {
          if (cb.checked) selectedStudentIds.add(student.id);
          else selectedStudentIds.delete(student.id);
          updateStudentsBulkBar();
        };
      }

      // Bind Delete action
      tr.querySelector('.delete-btn').onclick = () => {
        confirmAction({
          title: 'Hapus Murid',
          message: `Hapus murid <strong>${student.name}</strong> secara permanen?`,
          summaryHtml: studentImpactSummary(student.id),
          confirmLabel: 'Hapus Permanen',
          onConfirm: () => {
            const res = store.deleteStudent(student.id);
            if (res.success) {
              selectedStudentIds.delete(student.id);
              alert(`Murid "${student.name}" berhasil dihapus!`);
              renderStudents();
              renderDashboard();
              renderGradesRecap();
            } else {
              alert(`Gagal menghapus murid: ${res.error}`);
            }
          }
        });
      };

      // Bind Today Attendance action buttons
      tr.querySelectorAll('.attendance-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const status = btn.getAttribute('data-status');
          const isAlreadyActive = btn.classList.contains('active');
          const attendanceMap = store.getAttendance(todayStr);

          if (isAlreadyActive) {
            delete attendanceMap[student.id];
          } else {
            attendanceMap[student.id] = status;
          }

          store.saveAttendance(todayStr, attendanceMap);
          renderStudents();
          renderDashboard();
        };
      });

      tableBody.appendChild(tr);
    });

    // Sync select-all checkbox to the currently visible rows.
    const selectAll = document.getElementById('students-select-all');
    if (selectAll) {
      const visibleSelected = filtered.filter(s => selectedStudentIds.has(s.id)).length;
      selectAll.checked = filtered.length > 0 && visibleSelected === filtered.length;
      selectAll.indeterminate = visibleSelected > 0 && visibleSelected < filtered.length;
    }
    updateStudentsBulkBar();
  }

  // Build an impact summary (grades / attendance / savings) for delete dialogs.
  function studentImpactSummary(studentId) {
    const im = store.getStudentImpact(studentId);
    return `<div class="card" style="padding:10px 12px; background: var(--bg-main); font-size:0.82rem; color: var(--text-muted);">
      Ikut terhapus permanen: <strong>${im.gradeCount}</strong> nilai · <strong>${im.attendanceDays}</strong> hari presensi · <strong>${im.savingsTx}</strong> transaksi tabungan.
    </div>`;
  }

  function updateStudentsBulkBar() {
    const bar = document.getElementById('students-bulk-bar');
    const countEl = document.getElementById('students-selected-count');
    if (!bar || !countEl) return;
    const n = selectedStudentIds.size;
    if (n === 0) {
      bar.style.display = 'none';
    } else {
      bar.style.display = 'flex';
      countEl.textContent = `${n} murid dipilih`;
    }
  }

  function showStudentDetails(studentId) {
    const student = store.getStudent(studentId);
    if (!student) return;

    const modal = document.getElementById('modal-student-detail');
    const detailsContainer = document.getElementById('student-detail-content');
    
    // Calculate attendance summary
    const att = store.getStudentAttendanceSummary(studentId);
    
    // Savings balance
    const sav = store.getSavings(studentId);

    // Format dates
    const dobFormatted = `${student.pob}, ${formatDate(student.dob)}`;

    // Academic + character data
    const char = store.getCharacter(studentId);
    const subjects = store.getSubjects();
    const kkm = store.getKkm();
    const overallAvg = store.getStudentOverallAverage(studentId);

    const gradeRows = subjects.map(s => {
      const avg = store.getSubjectAverage(studentId, s.id);
      // Effective breakdown for the current semester (consistent with Nilai Rapor).
      const rataPH = store.getSubjectPhAverage(studentId, s.id);
      const pair = store.getSubjectSasPair(s.id);
      const scoresS = store.getGrades(studentId)[s.id] || {};
      const sasEff = pair.sas ? store._effectiveScore(scoresS, pair.sas.id, pair.resas ? pair.resas.id : null) : null;
      const detail = `RATA PH: ${rataPH === null ? '–' : Math.round(rataPH)} · SAS: ${sasEff === null ? '–' : sasEff}`;
      const color = (avg !== null && avg < kkm) ? 'var(--danger)' : 'var(--primary)';
      const status = avg === null ? '' : (avg < kkm ? ' · Belum Tuntas' : ' · Tuntas');
      return `<div class="details-row"><span class="details-label">${s.name}<br><span style="font-size:0.7rem;color:var(--text-muted);">${detail}</span></span><span class="details-value" style="font-weight:700;color:${color};">${avg === null ? '-' : avg}<span style="font-size:0.7rem;font-weight:500;">${status}</span></span></div>`;
    }).join('');

    const savHistory = (sav.history || []).slice(0, 6).map(tx => {
      const sign = tx.type === 'deposit' ? '+' : '−';
      const c = tx.type === 'deposit' ? 'var(--success)' : 'var(--danger)';
      return `<div class="details-row"><span class="details-label">${formatDate(tx.date)}<br><span style="font-size:0.7rem;color:var(--text-muted);">${tx.note || ''}</span></span><span class="details-value" style="color:${c};font-weight:600;">${sign} ${formatRupiah(tx.amount)}</span></div>`;
    }).join('') || '<p class="text-muted" style="font-size:0.85rem; padding: 6px 0;">Belum ada transaksi tabungan.</p>';

    detailsContainer.innerHTML = `
      <div class="tabs-container" style="margin-bottom:15px;">
        <button class="tab-btn subtab active" data-subtab="subtab-profil">Profil</button>
        <button class="tab-btn subtab" data-subtab="subtab-ortu">Orang Tua</button>
        <button class="tab-btn subtab" data-subtab="subtab-catatan">Catatan/Karakter</button>
        <button class="tab-btn subtab" data-subtab="subtab-akademik">Akademik</button>
      </div>

      <div id="subtab-profil" class="tab-content-panel active">
        <div class="details-list">
          <div class="details-row"><span class="details-label">Nama Lengkap</span><span class="details-value">${student.name}</span></div>
          <div class="details-row"><span class="details-label">NIS / NISN</span><span class="details-value">${student.nis} / ${student.nisn}</span></div>
          <div class="details-row"><span class="details-label">Jenis Kelamin</span><span class="details-value">${student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>
          <div class="details-row"><span class="details-label">TTL</span><span class="details-value">${dobFormatted}</span></div>
          <div class="details-row"><span class="details-label">Agama</span><span class="details-value">${student.religion}</span></div>
          <div class="details-row"><span class="details-label">Alamat Rumah</span><span class="details-value">${student.address}</span></div>
        </div>
      </div>

      <div id="subtab-ortu" class="tab-content-panel">
        <div class="details-list">
          <div class="details-row"><span class="details-label">Nama Orang Tua</span><span class="details-value">${student.parentName}</span></div>
          <div class="details-row"><span class="details-label">Pekerjaan</span><span class="details-value">${student.parentJob || '-'}</span></div>
          <div class="details-row"><span class="details-label">Alamat Wali</span><span class="details-value">${student.parentAddress || student.address}</span></div>
          <div class="details-row"><span class="details-label">No. WhatsApp</span><span class="details-value">+${student.parentPhone}</span></div>
        </div>
        <div style="margin-top: 15px; text-align:right;">
          <a href="https://wa.me/${student.parentPhone}" target="_blank" class="btn btn-success"><i class="fab fa-whatsapp"></i> Chat WhatsApp</a>
        </div>
      </div>

      <div id="subtab-catatan" class="tab-content-panel">
        <h4 style="font-size: 0.9rem; margin-bottom: 8px; color: var(--primary);">Catatan Khusus Wali Kelas:</h4>
        <div class="card" style="padding: 12px; margin-bottom: 15px; font-size: 0.85rem; background-color: var(--bg-main);">
          ${student.notes ? student.notes.replace(/\n/g, '<br>') : 'Tidak ada catatan khusus.'}
        </div>
        
        <h4 style="font-size: 0.9rem; margin-bottom: 8px; color: var(--primary);">Observasi Karakter Sikap:</h4>
        <div class="details-list">
          <div class="details-row"><span class="details-label">Spiritual · Ketaatan Beribadah</span><span class="details-value">${translateRating(char.spiritual.ibadah)}</span></div>
          <div class="details-row"><span class="details-label">Spiritual · Perilaku Bersyukur</span><span class="details-value">${translateRating(char.spiritual.syukur)}</span></div>
          <div class="details-row"><span class="details-label">Sosial · Kejujuran</span><span class="details-value">${translateRating(char.social.jujur)}</span></div>
          <div class="details-row"><span class="details-label">Sosial · Kedisiplinan</span><span class="details-value">${translateRating(char.social.disiplin)}</span></div>
          <div class="details-row"><span class="details-label">Sosial · Tanggung Jawab</span><span class="details-value">${translateRating(char.social.tanggungjawab)}</span></div>
        </div>
        ${(char.spiritual.catatan || char.social.catatan) ? `
        <h4 style="font-size: 0.9rem; margin: 15px 0 8px; color: var(--primary);">Catatan Sikap:</h4>
        <div class="card" style="padding: 12px; font-size: 0.85rem; background-color: var(--bg-main);">
          ${char.spiritual.catatan ? `<p style="margin-bottom:6px;"><strong>Spiritual:</strong> ${char.spiritual.catatan}</p>` : ''}
          ${char.social.catatan ? `<p><strong>Sosial:</strong> ${char.social.catatan}</p>` : ''}
        </div>` : ''}
      </div>

      <div id="subtab-akademik" class="tab-content-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom: 8px;">
          <h4 style="font-size: 0.9rem; color: var(--primary); margin:0;">Rekap Nilai per Mata Pelajaran <span style="font-weight:400;font-size:0.75rem;color:var(--text-muted);">(KKM ${kkm})</span></h4>
          <button type="button" id="clear-student-grades-btn" class="btn btn-outline" style="border:1px dashed var(--danger); color:var(--danger); background:none; padding:4px 10px; font-size:0.75rem;"><i class="fas fa-eraser"></i> Bersihkan Nilai</button>
        </div>
        <div class="details-list" style="margin-bottom: 8px;">
          ${gradeRows || '<p class="text-muted" style="font-size:0.85rem;">Belum ada mata pelajaran.</p>'}
          <div class="details-row" style="border-top: 2px solid var(--border-color);">
            <span class="details-label" style="font-weight:700;">Rata-rata Keseluruhan</span>
            <span class="details-value" style="font-weight:800;font-size:1.05rem;color:${overallAvg !== null && overallAvg < kkm ? 'var(--danger)' : 'var(--primary)'};">${overallAvg === null ? '-' : overallAvg}</span>
          </div>
        </div>

        <h4 style="font-size: 0.9rem; margin: 15px 0 8px; color: var(--primary);">Kehadiran Semester Ini:</h4>
        <div class="attendance-summary-box" style="margin-bottom: 15px;">
          <div class="att-box h"><div class="att-box-val">${att.hadir}</div><div class="att-box-lbl">Hadir</div></div>
          <div class="att-box s"><div class="att-box-val">${att.sakit}</div><div class="att-box-lbl">Sakit</div></div>
          <div class="att-box i"><div class="att-box-val">${att.izin}</div><div class="att-box-lbl">Izin</div></div>
          <div class="att-box a"><div class="att-box-val">${att.alfa}</div><div class="att-box-lbl">Alfa</div></div>
        </div>
        <p class="text-muted" style="font-size:0.8rem;margin-bottom:15px;">Persentase kehadiran: <strong style="color:var(--info);">${att.percentage}%</strong> dari ${att.total} hari tercatat.</p>

        <h4 style="font-size: 0.9rem; margin-bottom: 8px; color: var(--primary);">Tabungan:</h4>
        <div class="details-list">
          <div class="details-row">
            <span class="details-label" style="font-weight:600;">Saldo Saat Ini</span>
            <span class="details-value" style="font-weight: 700; color: var(--success);">${formatRupiah(sav.balance)}</span>
          </div>
          ${savHistory}
        </div>
      </div>
    `;

    // Setup subtabs toggle
    const subtabs = detailsContainer.querySelectorAll('.tab-btn.subtab');
    subtabs.forEach(tab => {
      tab.onclick = () => {
        subtabs.forEach(t => t.classList.remove('active'));
        detailsContainer.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.getAttribute('data-subtab')).classList.add('active');
      };
    });

    // Delete Student binding inside details modal footer
    document.getElementById('delete-student-btn').onclick = () => {
      confirmAction({
        title: 'Hapus Murid',
        message: `Hapus data siswa <strong>${student.name}</strong> secara permanen?`,
        summaryHtml: studentImpactSummary(studentId),
        confirmLabel: 'Hapus Permanen',
        onConfirm: () => {
          store.deleteStudent(studentId);
          selectedStudentIds.delete(studentId);
          closeModal('modal-student-detail');
          alert(`Murid "${student.name}" berhasil dihapus!`);
          renderStudents();
          renderDashboard();
          renderGradesRecap();
        }
      });
    };

    // Clear-grades binding inside the Akademik tab
    const clearGradesBtn = document.getElementById('clear-student-grades-btn');
    if (clearGradesBtn) {
      clearGradesBtn.onclick = () => {
        confirmAction({
          title: 'Bersihkan Nilai Murid',
          message: `Kosongkan <strong>seluruh nilai</strong> milik <strong>${student.name}</strong>? Profil, presensi, dan tabungan tidak terpengaruh.`,
          confirmLabel: 'Bersihkan Nilai',
          onConfirm: () => {
            store.clearStudentGrades(studentId);
            alert('Nilai murid berhasil dikosongkan!');
            showStudentDetails(studentId);
            renderStudents();
            renderGradesRecap();
            renderGradeGrid();
          }
        });
      };
    }

    // Print profile binding
    const printBtn = document.getElementById('print-student-btn');
    if (printBtn) printBtn.onclick = () => printStudentProfile(studentId);

    // Edit profile binding
    const editBtn = document.getElementById('edit-student-detail-btn');
    if (editBtn) {
      editBtn.onclick = () => {
        closeModal('modal-student-detail');
        showEditStudentForm(studentId);
      };
    }

    openModal('modal-student-detail');
  }

  // Build a clean, printable buku induk profile and open the print dialog.
  function printStudentProfile(studentId) {
    const student = store.getStudent(studentId);
    if (!student) return;

    const att = store.getStudentAttendanceSummary(studentId);
    const sav = store.getSavings(studentId);
    const char = store.getCharacter(studentId);
    const subjects = store.getSubjects();
    const kkm = store.getKkm();
    const overallAvg = store.getStudentOverallAverage(studentId);
    const s = store.state.settings;

    const gradeRowsHtml = subjects.map(subj => {
      const avg = store.getSubjectAverage(studentId, subj.id);
      return `<tr><td>${subj.name}</td><td style="text-align:center;">${avg === null ? '-' : avg}</td><td style="text-align:center;">${avg === null ? '-' : (avg < kkm ? 'Belum Tuntas' : 'Tuntas')}</td></tr>`;
    }).join('');

    const row = (label, value) => `<tr><td style="width:38%;color:#555;">${label}</td><td><strong>${value || '-'}</strong></td></tr>`;

    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Buku Induk - ${student.name}</title>
      <style>
        body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:30px;max-width:800px;margin:auto;}
        h1{font-size:18px;margin:0;} h2{font-size:13px;font-weight:400;color:#555;margin:2px 0 18px;}
        h3{font-size:13px;margin:18px 0 6px;border-bottom:2px solid #0f766e;padding-bottom:4px;color:#0f766e;}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;}
        td,th{border:1px solid #ddd;padding:6px 8px;text-align:left;}
        th{background:#f1f5f9;}
        .head{text-align:center;border-bottom:3px double #0f766e;padding-bottom:10px;margin-bottom:16px;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="head"><h1>${s.schoolName || ''}</h1><h2>Buku Induk Murid · ${s.className || ''} · TP ${s.academicYear || ''}</h2></div>
      <h3>Data Pribadi</h3>
      <table>
        ${row('Nama Lengkap', student.name)}
        ${row('NIS / NISN', `${student.nis || '-'} / ${student.nisn || '-'}`)}
        ${row('Jenis Kelamin', student.gender === 'L' ? 'Laki-laki' : 'Perempuan')}
        ${row('Tempat, Tanggal Lahir', `${student.pob || '-'}, ${formatDate(student.dob)}`)}
        ${row('Agama', student.religion)}
        ${row('Alamat', student.address)}
      </table>
      <h3>Data Orang Tua / Wali</h3>
      <table>
        ${row('Nama Orang Tua', student.parentName)}
        ${row('Pekerjaan', student.parentJob)}
        ${row('Alamat Wali', student.parentAddress || student.address)}
        ${row('No. WhatsApp', '+' + student.parentPhone)}
      </table>
      <h3>Rekap Nilai (KKM ${kkm})</h3>
      <table><thead><tr><th>Mata Pelajaran</th><th style="text-align:center;width:20%;">Nilai</th><th style="text-align:center;width:25%;">Keterangan</th></tr></thead>
      <tbody>${gradeRowsHtml}<tr><td><strong>Rata-rata Keseluruhan</strong></td><td style="text-align:center;"><strong>${overallAvg === null ? '-' : overallAvg}</strong></td><td></td></tr></tbody></table>
      <h3>Kehadiran & Karakter</h3>
      <table>
        ${row('Kehadiran', `Hadir ${att.hadir} · Sakit ${att.sakit} · Izin ${att.izin} · Alfa ${att.alfa} (${att.percentage}%)`)}
        ${row('Sikap Spiritual', `Ibadah: ${translateRating(char.spiritual.ibadah)}, Syukur: ${translateRating(char.spiritual.syukur)}`)}
        ${row('Sikap Sosial', `Jujur: ${translateRating(char.social.jujur)}, Disiplin: ${translateRating(char.social.disiplin)}, Tanggung Jawab: ${translateRating(char.social.tanggungjawab)}`)}
        ${row('Saldo Tabungan', formatRupiah(sav.balance))}
        ${student.notes ? row('Catatan Khusus', student.notes) : ''}
      </table>
      <p style="font-size:11px;color:#888;margin-top:20px;">Dicetak pada ${formatDate(new Date().toISOString().split('T')[0])} via WaliKelas Digital.</p>
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      alert('Mohon izinkan pop-up untuk mencetak profil.');
      return;
    }
    w.document.write(html);
    w.document.close();
  }

  function showEditStudentForm(studentId) {
    const student = store.getStudent(studentId);
    if (!student) return;

    document.getElementById('student-form-title').innerText = 'Edit Data Murid';
    
    // Fill form fields
    document.getElementById('student-id').value = student.id;
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-nis').value = student.nis;
    document.getElementById('student-nisn').value = student.nisn;
    document.getElementById('student-gender').value = student.gender;
    document.getElementById('student-religion').value = student.religion;
    document.getElementById('student-pob').value = student.pob;
    document.getElementById('student-dob').value = student.dob;
    document.getElementById('student-address').value = student.address;
    document.getElementById('student-parent-name').value = student.parentName;
    document.getElementById('student-parent-job').value = student.parentJob || '';
    document.getElementById('student-parent-phone').value = student.parentPhone;
    document.getElementById('student-parent-address').value = student.parentAddress || '';
    document.getElementById('student-notes').value = student.notes || '';

    const accordion = document.querySelector('.form-accordion');
    if (accordion) accordion.open = true;

    openModal('modal-student-form');
  }

  // --- RENDER PAGE: PRESENSI (ATTENDANCE) ---
  function renderAttendance() {
    // Set date input value
    document.getElementById('attendance-date').value = attendanceSelectedDate;
    
    const students = store.state.students;
    const attList = document.getElementById('attendance-student-list');
    attList.innerHTML = '';

    if (students.length === 0) {
      attList.innerHTML = '<div class="text-center py-5 text-muted">Belum ada data siswa. Daftarkan siswa terlebih dahulu di tab Siswa.</div>';
      return;
    }

    // Auto-detect calendar holiday
    const calendarHoliday = (store.state.calendar || []).find(e => e.date === attendanceSelectedDate && e.type === 'holiday');
    const currentLogs = store.getAttendance(attendanceSelectedDate);

    if (calendarHoliday && !currentLogs.isHoliday && Object.keys(currentLogs).length === 0) {
      currentLogs.isHoliday = true;
      currentLogs.holidayName = calendarHoliday.title;
      store.saveAttendance(attendanceSelectedDate, currentLogs);
    }

    const setHoliday = () => {
      const name = prompt('Masukkan nama libur hari ini (contoh: Libur Hari Raya, Libur Semester, Rapat Guru):');
      if (name === null) return;
      const holidayName = name.trim() || 'Hari Libur';
      store.saveAttendance(attendanceSelectedDate, { isHoliday: true, holidayName });
      window.showToast(`Berhasil menandai tanggal ${formatDate(attendanceSelectedDate)} sebagai ${holidayName}!`);
      renderAttendance();
      renderDashboard();
    };

    const cancelHoliday = () => {
      if (confirm('Apakah Anda yakin ingin mengubah hari ini kembali menjadi Hari Efektif Sekolah?')) {
        store.saveAttendance(attendanceSelectedDate, {});
        window.showToast('Hari ini telah diubah kembali menjadi hari efektif sekolah.');
        renderAttendance();
        renderDashboard();
      }
    };

    // Toggle holiday button state
    const toggleBtn = document.getElementById('btn-toggle-holiday');
    if (toggleBtn) {
      if (currentLogs.isHoliday) {
        toggleBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Set Hari Efektif';
        toggleBtn.className = 'btn btn-primary';
        toggleBtn.onclick = cancelHoliday;
      } else {
        toggleBtn.innerHTML = '<i class="fas fa-umbrella-beach"></i> Set Hari Libur';
        toggleBtn.className = 'btn btn-outline';
        toggleBtn.onclick = setHoliday;
      }
    }

    if (currentLogs.isHoliday) {
      attList.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%); border: 1px dashed var(--primary); border-radius: var(--radius-lg); margin-top: 15px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 3rem; margin-bottom: 15px;">🏝️</div>
          <h3 style="color: var(--primary); margin-bottom: 8px;">Hari Libur Sekolah</h3>
          <p style="font-weight: 600; font-size: 1.1rem; color: var(--text-color); margin-bottom: 5px;">${currentLogs.holidayName}</p>
          <p class="text-muted" style="font-size: 0.85rem; max-width: 400px; margin: 0 auto 20px auto;">Hari ini ditandai sebagai hari libur. Siswa tidak terhitung absen dan tidak memengaruhi persentase kehadiran rapor.</p>
          <button id="btn-cancel-holiday" class="btn btn-secondary" style="font-size: 0.9rem; padding: 8px 16px;">
            <i class="fas fa-calendar-check"></i> Jadikan Hari Efektif Sekolah
          </button>
        </div>
      `;
      document.getElementById('btn-cancel-holiday').onclick = cancelHoliday;
      return;
    }

    students.forEach(student => {
      const activeStatus = currentLogs[student.id] || ''; // 'H', 'S', 'I', 'A'
      
      const div = document.createElement('div');
      div.className = 'attendance-list-item';
      div.innerHTML = `
        <div class="attendance-student-details">
          <div class="attendance-student-avatar ${student.gender === 'P' ? 'female' : ''}">
            ${student.name.charAt(0)}
          </div>
          <div>
            <div class="attendance-student-name">${student.name}</div>
            <div class="attendance-student-nis">NIS: ${student.nis}</div>
          </div>
        </div>
        <div class="attendance-button-group" data-student="${student.id}">
          <button class="attendance-btn h ${activeStatus === 'H' ? 'active' : ''}" data-status="H">H</button>
          <button class="attendance-btn s ${activeStatus === 'S' ? 'active' : ''}" data-status="S">S</button>
          <button class="attendance-btn i ${activeStatus === 'I' ? 'active' : ''}" data-status="I">I</button>
          <button class="attendance-btn a ${activeStatus === 'A' ? 'active' : ''}" data-status="A">A</button>
        </div>
      `;

      // Button Click Handler
      const buttons = div.querySelectorAll('.attendance-btn');
      buttons.forEach(btn => {
        btn.onclick = () => {
          const status = btn.getAttribute('data-status');
          const isAlreadyActive = btn.classList.contains('active');
          
          // Clear active states in this group
          buttons.forEach(b => b.classList.remove('active'));
          
          const attendanceMap = store.getAttendance(attendanceSelectedDate);
          
          if (isAlreadyActive) {
            // Uncheck status
            delete attendanceMap[student.id];
          } else {
            // Check status
            btn.classList.add('active');
            attendanceMap[student.id] = status;
          }

          store.saveAttendance(attendanceSelectedDate, attendanceMap);
          // Render recap automatically in background
          renderAttendanceRecap();
        };
      });

      attList.appendChild(div);
    });

    renderAttendanceRecap();
  }

  function renderAttendanceRecap() {
    const recapBody = document.getElementById('attendance-recap-table-body');
    recapBody.innerHTML = '';

    const students = store.state.students;
    if (students.length === 0) return;

    students.forEach((student, index) => {
      const summary = store.getStudentAttendanceSummary(student.id);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${student.name}</strong></td>
        <td class="text-center">${summary.hadir}</td>
        <td class="text-center">${summary.sakit}</td>
        <td class="text-center">${summary.izin}</td>
        <td class="text-center">${summary.alfa}</td>
        <td class="text-center"><strong>${summary.percentage}%</strong></td>
      `;
      recapBody.appendChild(tr);
    });
  }

  // --- RENDER PAGE: GRADES (NILAI) ---
  function renderGrades() {
    // Fill select box in grading forms
    const gradeStudentSelect = document.getElementById('grade-student-select');
    const charStudentSelect = document.getElementById('character-student-select');
    
    gradeStudentSelect.innerHTML = '<option value="">-- Pilih Murid --</option>';
    charStudentSelect.innerHTML = '<option value="">-- Pilih Murid --</option>';
    
    store.state.students.forEach(student => {
      const opt1 = document.createElement('option');
      opt1.value = student.id;
      opt1.innerText = `${student.name} (${student.nis})`;
      gradeStudentSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = student.id;
      opt2.innerText = `${student.name} (${student.nis})`;
      charStudentSelect.appendChild(opt2);
    });

    // Curriculum label on the recap card.
    const isMerdeka = store.state.settings.curriculum === 'merdeka';
    const curriculumLabel = document.getElementById('academic-curriculum-label');
    if (curriculumLabel) {
      const kkm = store.getKkm();
      curriculumLabel.innerText = `${isMerdeka ? 'Kurikulum Merdeka' : 'Kurikulum 2013 (K13)'} · KKM/KKTP: ${kkm}`;
    }

    // Keep subject dropdowns in sync every time the grades page opens.
    populateSubjectDropdowns();
    renderGradeGrid();
    renderGradesRecap();

    // On phones, open the comfortable per-student entry first (wide grid is desktop-oriented).
    if (window.matchMedia('(max-width: 768px)').matches && !window.__gradesMobileDefaulted) {
      const perSiswaTabBtn = document.querySelector('.tab-btn[data-tab="tab-grades-input"]');
      if (perSiswaTabBtn) { perSiswaTabBtn.click(); window.__gradesMobileDefaulted = true; }
    }
  }

  function renderGradesRecap() {
    const tableHeaderRow = document.getElementById('grades-recap-header-row');
    const tableBody = document.getElementById('grades-recap-table-body');

    const kkm = store.getKkm();
    const lessonsList = store.getSubjects();
    const lessons = lessonsList.map(s => s.id);

    // Render Headers — always uses the subject's saved name (single source).
    tableHeaderRow.innerHTML = `
      <th>No</th>
      <th>Nama Murid</th>
    `;
    lessons.forEach(l => {
      tableHeaderRow.innerHTML += `<th class="text-center">${store.getSubjectLabel(l)}</th>`;
    });
    tableHeaderRow.innerHTML += `<th class="text-center" style="background-color: var(--primary-light); color: var(--primary);">Rata-rata</th>`;

    // Render Student Grades Row
    tableBody.innerHTML = '';
    const students = store.state.students;

    if (students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="${lessons.length + 3}" class="text-center text-muted py-4">Belum ada data murid.</td></tr>`;
      return;
    }

    const cellColor = (val) => (val !== null && val < kkm) ? ' color: var(--danger);' : '';

    students.forEach((student, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${student.name}</strong></td>
      `;

      lessons.forEach(subject => {
        const avg = store.getSubjectAverage(student.id, subject);
        tr.innerHTML += `<td class="text-center" style="font-weight:600;${cellColor(avg)}">${avg === null ? '-' : avg}</td>`;
      });

      const overallAvg = store.getStudentOverallAverage(student.id);
      tr.innerHTML += `<td class="text-center" style="font-weight: 700; background-color: rgba(15, 118, 110, 0.05);${cellColor(overallAvg)}">${overallAvg === null ? '-' : overallAvg}</td>`;
      tableBody.appendChild(tr);
    });
  }

  // Handle student select change in grading form
  document.getElementById('grade-student-select').onchange = (e) => {
    const studentId = e.target.value;
    const subject = document.getElementById('grade-subject-select').value;
    loadStudentGradesToForm(studentId, subject);
  };

  document.getElementById('grade-subject-select').onchange = (e) => {
    if (e.target.value === 'add_new_subject') {
      handleAddNewSubject(e.target);
    } else {
      const studentId = document.getElementById('grade-student-select').value;
      const subject = e.target.value;
      loadStudentGradesToForm(studentId, subject);
    }
  };

  function loadStudentGradesToForm(studentId, subject) {
    renderDynamicAssessments('main-grade-inputs-container', subject, studentId, 'grade');
    return;
  }

  function renderDynamicAssessments(containerId, subjectId, studentId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!subjectId) {
      container.innerHTML = `<div class="text-muted text-center" style="grid-column: 1/-1; padding: 10px;">Pilih mata pelajaran untuk memuat komponen nilai.</div>`;
      return;
    }
    if (!studentId) {
      container.innerHTML = `<div class="text-muted text-center" style="grid-column: 1/-1; padding: 10px;">Pilih murid untuk memuat komponen nilai.</div>`;
      return;
    }

    const scores = store.getGrades(studentId)[subjectId] || {};
    const numField = (comp, label, muted) => {
      const value = scores[comp.id] !== undefined ? scores[comp.id] : '';
      return `<div class="ps-grade-field">
        <label for="${prefix}-${comp.id}"${muted ? ' style="color:var(--text-muted);"' : ''}>${label}</label>
        <input type="number" id="${prefix}-${comp.id}" min="0" max="100" inputmode="numeric" placeholder="-"
          class="ps-grade-input" data-student="${studentId}" data-subject="${subjectId}" data-comp="${comp.id}" value="${value}">
      </div>`;
    };

    let html = '';
    ['1', '2'].forEach(sem => {
      const slots = store.getSubjectPhSlots(subjectId, sem);
      const pair = store.getSubjectSasPair(subjectId, sem);
      html += `<div class="ps-sem-block"><div class="ps-sem-title">SEMESTER ${sem}</div>`;
      slots.forEach(slot => {
        const materi = slot.materi || '';
        html += `<div class="ps-slot">
          <button type="button" class="ps-materi-btn" data-sem="${sem}" data-ph="${slot.ph.id}"><i class="fas fa-book"></i> ${materi ? materi : 'Tambah materi'}</button>
          ${numField(slot.ph, slot.ph.name, false)}
          ${slot.re ? numField(slot.re, slot.re.name + ' (Remedial)', true) : ''}
        </div>`;
      });
      html += `<button type="button" class="btn btn-secondary ps-add-ph" data-sem="${sem}"><i class="fas fa-plus"></i> Tambah PH Sem ${sem}</button>`;
      if (pair.sas) html += numField(pair.sas, 'SAS · Sumatif Akhir Semester', false);
      if (pair.resas) html += numField(pair.resas, 'ReSAS (Remedial SAS)', true);
      html += `<div class="ps-rapor-preview">Nilai Rapor Sem ${sem}: <strong id="${prefix}-rapor-${sem}">-</strong></div></div>`;
    });
    container.innerHTML = html;

    const updatePreviews = () => {
      ['1', '2'].forEach(sem => {
        const r = store.getSubjectSemesterAverage(studentId, subjectId, sem);
        const el = document.getElementById(`${prefix}-rapor-${sem}`);
        if (el) el.textContent = r === null ? '-' : r;
      });
    };

    container.querySelectorAll('.ps-grade-input').forEach(inp => {
      inp.onchange = () => {
        store.saveGrade(inp.getAttribute('data-student'), inp.getAttribute('data-subject'), inp.getAttribute('data-comp'), inp.value);
        updatePreviews();
        renderGradeGrid();
        renderGradesRecap();
        renderStudents();
      };
    });

    container.querySelectorAll('.ps-add-ph').forEach(btn => {
      btn.onclick = () => {
        const sem = btn.getAttribute('data-sem');
        const res = store.addPhComponent(subjectId, sem);
        if (res.success) {
          window.showToast(`${res.component.name} Sem ${sem} ditambahkan.`, 'success');
          renderDynamicAssessments(containerId, subjectId, studentId, prefix);
          renderGradeGrid();
        }
      };
    });

    container.querySelectorAll('.ps-materi-btn').forEach(btn => {
      btn.onclick = () => {
        const sem = btn.getAttribute('data-sem');
        const phId = btn.getAttribute('data-ph');
        const slot = store.getSubjectPhSlots(subjectId, sem).find(s => s.ph.id === phId);
        promptInput({
          title: 'Deskripsi Materi',
          label: `Materi untuk ${slot ? slot.ph.name : 'PH'} · Semester ${sem}`,
          value: slot ? slot.materi : '',
          placeholder: 'Mis. Bilangan Bulat',
          onSave: (text) => {
            store.setMateri(subjectId, sem, phId, text);
            renderDynamicAssessments(containerId, subjectId, studentId, prefix);
            renderGradeGrid();
          }
        });
      };
    });

    updatePreviews();
  }

  // Handle Character Student Selection change
  document.getElementById('character-student-select').onchange = (e) => {
    const studentId = e.target.value;
    if (!studentId) {
      document.getElementById('char-spiritual-ibadah').value = 'B';
      document.getElementById('char-spiritual-syukur').value = 'B';
      document.getElementById('char-spiritual-notes').value = '';
      document.getElementById('char-social-jujur').value = 'B';
      document.getElementById('char-social-disiplin').value = 'B';
      document.getElementById('char-social-tanggungjawab').value = 'B';
      document.getElementById('char-social-notes').value = '';
      return;
    }

    const char = store.getCharacter(studentId);
    document.getElementById('char-spiritual-ibadah').value = char.spiritual.ibadah || 'B';
    document.getElementById('char-spiritual-syukur').value = char.spiritual.syukur || 'B';
    document.getElementById('char-spiritual-notes').value = char.spiritual.catatan || '';
    document.getElementById('char-social-jujur').value = char.social.jujur || 'B';
    document.getElementById('char-social-disiplin').value = char.social.disiplin || 'B';
    document.getElementById('char-social-tanggungjawab').value = char.social.tanggungjawab || 'B';
    document.getElementById('char-social-notes').value = char.social.catatan || '';
  };

  // --- RENDER PAGE: FINANCE (KEUANGAN) ---
  function renderFinance() {
    // Fill Student select box in savings deposit form
    const savingStudentSelect = document.getElementById('saving-student-select');
    savingStudentSelect.innerHTML = '<option value="">-- Pilih Murid --</option>';
    
    store.state.students.forEach(student => {
      const opt = document.createElement('option');
      opt.value = student.id;
      opt.innerText = `${student.name} (Saldo: ${formatRupiah(store.getSavings(student.id).balance)})`;
      savingStudentSelect.appendChild(opt);
    });

    // Populate Cash book stats
    document.getElementById('cash-balance-total').innerText = formatRupiah(store.state.classCash.balance);

    // Render Cash transaction history
    renderCashHistory();

    // Render Savings Recap Table
    renderSavingsRecap();
  }

  function renderCashHistory() {
    const historyBody = document.getElementById('cash-history-table-body');
    historyBody.innerHTML = '';

    const list = store.state.classCash.history;
    if (list.length === 0) {
      historyBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Belum ada transaksi uang kas kelas.</td></tr>`;
      return;
    }

    list.forEach(tx => {
      const tr = document.createElement('tr');
      
      const typeBadge = tx.type === 'in'
        ? `<span class="btn-success" style="padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Masuk</span>`
        : `<span class="btn-danger" style="padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Keluar</span>`;
      
      const colorStyle = tx.type === 'in' ? 'color: var(--success); font-weight: 600;' : 'color: var(--danger); font-weight: 600;';
      const prefix = tx.type === 'in' ? '+' : '-';

      tr.innerHTML = `
        <td>${formatDate(tx.date)}</td>
        <td>${typeBadge}</td>
        <td>${tx.note}</td>
        <td style="${colorStyle}">${prefix}${formatRupiah(tx.amount)}</td>
        <td>
          <button class="btn btn-secondary delete-cash-tx" data-id="${tx.id}" style="padding: 4px 8px;"><i class="fas fa-trash"></i></button>
        </td>
      `;

      tr.querySelector('.delete-cash-tx').onclick = () => {
        if (confirm('Hapus transaksi kas ini? Saldo kas kelas akan diperbarui kembali.')) {
          store.deleteClassCashTransaction(tx.id);
          renderFinance();
          renderDashboard();
        }
      };

      historyBody.appendChild(tr);
    });
  }

  function renderSavingsRecap() {
    const savingsBody = document.getElementById('savings-recap-table-body');
    savingsBody.innerHTML = '';

    const students = store.state.students;
    if (students.length === 0) {
      savingsBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Belum ada data murid.</td></tr>`;
      return;
    }

    students.forEach((student, index) => {
      const sav = store.getSavings(student.id);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${student.name}</strong></td>
        <td>${formatRupiah(sav.balance)}</td>
        <td>
          <button class="btn btn-primary view-savings-tx" data-id="${student.id}" style="padding: 4px 8px;"><i class="fas fa-history"></i> Riwayat</button>
        </td>
      `;

      tr.querySelector('.view-savings-tx').onclick = () => {
        financeSelectedStudentId = student.id;
        showStudentSavingsHistory(student.id);
      };

      savingsBody.appendChild(tr);
    });
  }

  function showStudentSavingsHistory(studentId) {
    const student = store.getStudent(studentId);
    const sav = store.getSavings(studentId);
    if (!student) return;

    document.getElementById('savings-history-title').innerText = `Riwayat Tabungan: ${student.name}`;
    
    const body = document.getElementById('savings-history-modal-body');
    body.innerHTML = '';

    if (sav.history.length === 0) {
      body.innerHTML = '<p class="text-muted text-center py-4">Belum ada transaksi tabungan untuk siswa ini.</p>';
    } else {
      const table = document.createElement('table');
      table.className = 'table-custom';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Tipe</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      `;

      const tbody = table.querySelector('tbody');
      sav.history.forEach(tx => {
        const typeLabel = tx.type === 'deposit' ? 'Setor' : 'Tarik';
        const typeClass = tx.type === 'deposit' ? 'btn-success' : 'btn-danger';
        const colorStyle = tx.type === 'deposit' ? 'color: var(--success); font-weight: 600;' : 'color: var(--danger); font-weight: 600;';
        const prefix = tx.type === 'deposit' ? '+' : '-';
        
        tbody.innerHTML += `
          <tr>
            <td>${formatDate(tx.date)}</td>
            <td><span class="${typeClass}" style="padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${typeLabel}</span></td>
            <td style="${colorStyle}">${prefix}${formatRupiah(tx.amount)}</td>
            <td style="font-size: 0.8rem;">${tx.note}</td>
          </tr>
        `;
      });

      body.appendChild(table);
    }

    openModal('modal-savings-history');
  }

  // --- RENDER PAGE: SCHEDULE & CALENDAR (AGENDA) ---
  function renderSchedule() {
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    
    // Render lessons
    days.forEach(day => {
      const container = document.getElementById(`lessons-${day}`);
      if (!container) return;
      container.innerHTML = '';

      const list = store.state.schedule.lessons[day] || [];
      if (list.length === 0) {
        container.innerHTML = '<div class="text-muted text-center py-2" style="font-size:0.8rem;">Tidak ada jadwal</div>';
      } else {
        list.forEach((lesson, index) => {
          const div = document.createElement('div');
          div.className = 'lesson-item';
          div.innerHTML = `
            <div class="lesson-time">${lesson.time}</div>
            <div class="lesson-subject">${lesson.subject}</div>
            <div class="lesson-teacher">${lesson.teacher}</div>
            <button class="lesson-delete-btn" data-day="${day}" data-idx="${index}">
              <i class="fas fa-trash-alt"></i>
            </button>
          `;

          div.querySelector('.lesson-delete-btn').onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Hapus jadwal ${lesson.subject} di hari ${day}?`)) {
              store.deleteLesson(day, index);
              renderSchedule();
            }
          };

          container.appendChild(div);
        });
      }

      // Render Piket Group
      const piketList = document.getElementById(`piket-${day}-list`);
      if (piketList) {
        piketList.innerHTML = '';
        const members = store.state.schedule.piket[day] || [];
        if (members.length === 0) {
          piketList.innerHTML = '<span class="text-muted" style="font-size: 0.8rem;">Belum ada jadwal piket</span>';
        } else {
          members.forEach(m => {
            const span = document.createElement('span');
            span.className = 'piket-member-tag';
            span.innerText = m;
            piketList.appendChild(span);
          });
        }
      }
    });

    // Populate Piket editor form names
    const piketSelectContainer = document.getElementById('piket-students-checkboxes');
    if (piketSelectContainer) {
      piketSelectContainer.innerHTML = '';
      store.state.students.forEach(student => {
        piketSelectContainer.innerHTML += `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <input type="checkbox" name="piket-student" value="${student.name}" id="chk-piket-${student.id}">
            <label for="chk-piket-${student.id}" style="font-size: 0.9rem;">${student.name}</label>
          </div>
        `;
      });
    }

    // Render Calendar
    renderCalendar();
  }

  function renderCalendar() {
    const listBody = document.getElementById('calendar-events-list');
    listBody.innerHTML = '';

    const events = store.state.schedule.calendar;
    if (events.length === 0) {
      listBody.innerHTML = '<div class="text-muted text-center py-4">Belum ada agenda sekolah terdaftar.</div>';
      return;
    }

    events.forEach(evt => {
      const row = document.createElement('div');
      row.className = 'feed-item';
      
      let typeClass = 'info';
      let typeLabel = 'Kegiatan';
      
      if (evt.type === 'holiday') {
        typeClass = 'danger';
        typeLabel = 'Libur';
      } else if (evt.type === 'exam') {
        typeClass = 'warning';
        typeLabel = 'Ujian';
      }

      row.classList.add(typeClass);
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      
      row.innerHTML = `
        <div class="feed-content">
          <span class="btn-secondary" style="padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${typeLabel}</span>
          <h4 style="margin-top: 4px;">${evt.title}</h4>
          <p>${formatDate(evt.date)}</p>
        </div>
        <div>
          <button class="btn btn-secondary delete-event-btn" data-id="${evt.id}" style="padding: 6px 10px;"><i class="fas fa-trash"></i></button>
        </div>
      `;

      row.querySelector('.delete-event-btn').onclick = () => {
        if (confirm(`Hapus agenda "${evt.title}"?`)) {
          store.deleteCalendarEvent(evt.id);
          renderCalendar();
          renderDashboard();
        }
      };

      listBody.appendChild(row);
    });
  }

  // --- RENDER PAGE: COMMUNICATION (BUKU PENGHUBUNG) ---
  function renderCommunication() {
    // Fill Announcement Student select box (for Broadcast options)
    const commStudentSelect = document.getElementById('comm-student-select');
    commStudentSelect.innerHTML = '<option value="">-- Pilih Murid --</option>';
    store.state.students.forEach(student => {
      const opt = document.createElement('option');
      opt.value = student.id;
      opt.innerText = student.name;
      commStudentSelect.appendChild(opt);
    });

    // Render Announcement cards
    renderAnnouncementsList();

    // Render Gallery
    renderGalleryList();
  }

  function renderAnnouncementsList() {
    const container = document.getElementById('announcements-list-container');
    container.innerHTML = '';

    const list = store.state.announcements;
    if (list.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-muted card">Belum ada pengumuman kelas dibuat.</div>';
      return;
    }

    list.forEach(ann => {
      const card = document.createElement('div');
      card.className = 'announcement-card';
      card.innerHTML = `
        <div class="announcement-header">
          <h3 class="announcement-title">${ann.title}</h3>
          <span class="announcement-date"><i class="far fa-calendar-alt"></i> ${formatDate(ann.date)}</span>
        </div>
        <p class="announcement-content">${ann.content.replace(/\n/g, '<br>')}</p>
        <div class="announcement-actions">
          <button class="btn btn-success share-wa-ann-btn" data-id="${ann.id}"><i class="fab fa-whatsapp"></i> Bagikan ke Grup</button>
          <button class="btn btn-secondary delete-ann-btn" data-id="${ann.id}"><i class="fas fa-trash"></i> Hapus</button>
        </div>
      `;

      // Share to WA
      card.querySelector('.share-wa-ann-btn').onclick = () => {
        const text = `📢 *PENGUMUMAN WALI KELAS (${store.state.settings.className})*\n\n*${ann.title.toUpperCase()}*\n\n${ann.content}\n\nSalam Hangat,\nWali Kelas\n_${store.state.settings.schoolName}_`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      };

      // Delete
      card.querySelector('.delete-ann-btn').onclick = () => {
        if (confirm(`Hapus pengumuman "${ann.title}"?`)) {
          store.deleteAnnouncement(ann.id);
          renderAnnouncementsList();
          renderDashboard();
        }
      };

      container.appendChild(card);
    });
  }

  function renderGalleryList() {
    const container = document.getElementById('gallery-list-container');
    container.innerHTML = '';

    // Static simulations of photos for demo purposes
    const mockPhotos = [
      { id: 'gal_1', title: 'Belajar Kelompok IPA', date: '2026-06-22', type: 'color1', tag: 'Pelajaran' },
      { id: 'gal_2', title: 'Kebersihan Kelas Jumsih', date: '2026-06-19', type: 'color2', tag: 'Piket' },
      { id: 'gal_3', title: 'Latihan Pramuka Siaga', date: '2026-06-12', type: 'color3', tag: 'Eskul' },
      { id: 'gal_4', title: 'Juara Kelas Lomba Mewarnai', date: '2026-06-05', type: 'color4', tag: 'Prestasi' }
    ];

    mockPhotos.forEach(p => {
      const card = document.createElement('div');
      card.className = `gallery-card ${p.type}`;
      card.innerHTML = `
        <div class="gallery-img-placeholder">
          <i class="fas fa-camera"></i>
        </div>
        <div class="gallery-info">
          <span class="gallery-tag">${p.tag}</span>
          <div class="gallery-title">${p.title}</div>
          <div class="gallery-date">${formatDate(p.date)}</div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // Handle Broadcast Quick message selection
  document.getElementById('comm-student-select').onchange = (e) => {
    const studentId = e.target.value;
    if (!studentId) {
      document.getElementById('broadcast-text-template').value = '';
      return;
    }
    updateBroadcastTemplate();
  };

  document.getElementById('broadcast-type-select').onchange = () => {
    updateBroadcastTemplate();
  };

  function updateBroadcastTemplate() {
    const studentId = document.getElementById('comm-student-select').value;
    const type = document.getElementById('broadcast-type-select').value;
    const textarea = document.getElementById('broadcast-text-template');
    
    if (!studentId) return;

    const student = store.getStudent(studentId);
    if (!student) return;

    let text = '';
    const className = store.state.settings.className;

    switch (type) {
      case 'general':
        text = `Assalamu'alaikum wr. wb. Selamat pagi Bapak/Ibu dari ${student.name}. Saya Wali Kelas dari ${className} ingin menginformasikan mengenai perkembangan belajar anak di sekolah.`;
        break;
      case 'grades':
        const grades = store.getGrades(studentId);
        let gradesList = '';
        Object.keys(grades).forEach(subj => {
          const values = Object.values(grades[subj]);
          const avg = values.length > 0 ? Math.round(values.reduce((a,b)=>a+b, 0)/values.length) : 0;
          gradesList += `- ${subj.toUpperCase()}: ${avg}\n`;
        });
        
        text = `📢 *LAPORAN NILAI RAPOR SEMENTARA*\n\nYth. Wali Murid dari *${student.name}*,\nBerikut adalah rekap nilai rata-rata sementara di ${className}:\n\n${gradesList || 'Belum ada nilai terinput.\n'}\nMohon bantuannya untuk terus mendampingi anak belajar di rumah.\nTerima kasih.`;
        break;
      case 'attendance':
        const att = store.getStudentAttendanceSummary(studentId);
        text = `📢 *REKAP KEHADIRAN SISWA*\n\nYth. Orang Tua dari *${student.name}*,\nBerikut adalah rekap kehadiran siswa pada semester ini di ${className}:\n- Hadir: ${att.hadir} hari\n- Sakit: ${att.sakit} hari\n- Izin: ${att.izin} hari\n- Alfa: ${att.alfa} hari\n- Persentase: *${att.percentage}%*\n\nMohon bantuannya agar anak dapat terus mempertahankan kedisiplinan bersekolah.\nTerima kasih.`;
        break;
      case 'warning':
        text = `⚠️ *PERINGATAN KETIDAKHADIRAN / TUGAS*\n\nYth. Orang Tua dari *${student.name}*,\nSaya Wali Kelas ${className} ingin mengabarkan bahwa *${student.name}* hari ini tidak masuk sekolah tanpa keterangan / belum mengumpulkan tugas penting. Mohon hubungi saya segera untuk konfirmasi.\nTerima kasih.`;
        break;
    }

    textarea.value = text;
  }

  // --- RENDER PAGE: SETTINGS (PENGATURAN) ---
  function renderSettings() {
    // Fill Settings fields
    document.getElementById('settings-classname').value = store.state.settings.className;
    document.getElementById('settings-schoolname').value = store.state.settings.schoolName;
    document.getElementById('settings-curriculum').value = store.state.settings.curriculum;
    document.getElementById('settings-year').value = store.state.settings.academicYear;
    const kkmEl = document.getElementById('settings-kkm');
    if (kkmEl) kkmEl.value = store.getKkm();
    const semEl = document.getElementById('settings-semester');
    if (semEl) semEl.value = store.state.settings.semester || '1';
    renderSettingsSubjectsList();
  }

  function renderSettingsSubjectsList() {
    const listEl = document.getElementById('settings-subjects-list');
    if (!listEl) return;

    const subjects = store.state.settings.subjects || [];

    listEl.innerHTML = subjects.map((s, i) => {
      const compCount = store.getSubjectAssessments(s.id).length;
      return `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background-color: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div>
            <span style="font-weight: 500; font-size: 0.9rem;">${s.name}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); display:block;">${compCount} komponen nilai</span>
          </div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button type="button" class="btn-move-subject" data-id="${s.id}" data-dir="up" ${i === 0 ? 'disabled' : ''} style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; ${i === 0 ? 'opacity:0.3;cursor:not-allowed;' : ''}" title="Naikkan urutan">
              <i class="fas fa-chevron-up"></i>
            </button>
            <button type="button" class="btn-move-subject" data-id="${s.id}" data-dir="down" ${i === subjects.length - 1 ? 'disabled' : ''} style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; ${i === subjects.length - 1 ? 'opacity:0.3;cursor:not-allowed;' : ''}" title="Turunkan urutan">
              <i class="fas fa-chevron-down"></i>
            </button>
            <button type="button" class="btn-edit-subject" data-id="${s.id}" style="background: none; border: none; color: var(--primary); cursor: pointer; padding: 4px;" title="Edit Nama Mata Pelajaran">
              <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn-clear-subject-grades" data-id="${s.id}" style="background: none; border: none; color: var(--warning, #d97706); cursor: pointer; padding: 4px;" title="Kosongkan Nilai Mapel Ini">
              <i class="fas fa-eraser"></i>
            </button>
            <button type="button" class="btn-delete-subject" data-id="${s.id}" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 4px;" title="Hapus Mata Pelajaran">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </li>
      `;
    }).join('');

    // Bind reorder clicks
    listEl.querySelectorAll('.btn-move-subject').forEach(btn => {
      if (btn.hasAttribute('disabled')) return;
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const dir = btn.getAttribute('data-dir');
        const ids = subjects.map(s => s.id);
        const idx = ids.indexOf(id);
        const swapWith = dir === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= ids.length) return;
        [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
        store.reorderSubjects(ids);
        populateSubjectDropdowns();
        renderSettingsSubjectsList();
        renderGradesRecap();
      };
    });

    // Bind edit clicks → open styled modal
    listEl.querySelectorAll('.btn-edit-subject').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const subject = subjects.find(s => s.id === id);
        if (!subject) return;
        document.getElementById('edit-subject-id').value = id;
        document.getElementById('edit-subject-name').value = subject.name;
        const w = store.getCategoryWeights(id);
        document.getElementById('edit-weight-ph').value = w.ph;
        document.getElementById('edit-weight-sas').value = w.sas;
        updateEditWeightTotal();
        openModal('modal-edit-subject');
      };
    });

    // Bind clear-grades (per subject) clicks
    listEl.querySelectorAll('.btn-clear-subject-grades').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const subject = subjects.find(s => s.id === id);
        if (!subject) return;
        confirmAction({
          title: 'Kosongkan Nilai Mapel',
          message: `Kosongkan <strong>seluruh nilai ${subject.name}</strong> untuk semua murid? Mata pelajaran tetap ada, hanya nilainya yang dihapus.`,
          confirmLabel: 'Kosongkan Nilai',
          onConfirm: () => {
            const res = store.clearSubjectGrades(id);
            alert(`Nilai ${subject.name} berhasil dikosongkan (${res.cleared} entri).`);
            renderSettingsSubjectsList();
            renderGradeGrid();
            renderGradesRecap();
            renderStudents();
          }
        });
      };
    });

    // Bind delete clicks
    listEl.querySelectorAll('.btn-delete-subject').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const subject = subjects.find(s => s.id === id);
        if (!subject) return;

        confirmAction({
          title: 'Hapus Mata Pelajaran',
          message: `Hapus mata pelajaran <strong>${subject.name}</strong>? Seluruh nilai murid pada mapel ini akan ikut <strong>terhapus permanen</strong>.`,
          confirmLabel: 'Hapus Mapel',
          onConfirm: () => {
            const res = store.deleteSubject(id);
            if (res.success) {
              alert(`Mata pelajaran "${res.name}" berhasil dihapus!`);
              populateSubjectDropdowns();
              renderSettingsSubjectsList();
              renderGradeGrid();
              renderGradesRecap();
              renderStudents();
            } else {
              alert(`Gagal menghapus: ${res.error}`);
            }
          }
        });
      };
    });
  }

  // --- REGISTRATION OF COMMON EVENT LISTENERS ---
  function initEventListeners() {
    // FORM: TAMBAH MATA PELAJARAN (MODAL)
    const addSubjectForm = document.getElementById('add-subject-form');
    if (addSubjectForm) {
      addSubjectForm.onsubmit = (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('new-subject-name');
        const triggerInput = document.getElementById('add-subject-trigger-select');
        const name = nameInput ? nameInput.value.trim() : '';
        const triggerSelectId = triggerInput ? triggerInput.value : '';
        const selectElement = document.getElementById(triggerSelectId);

        if (!name) return;

        const res = store.addSubject(name);
        if (res.success) {
          alert(`Mata pelajaran "${res.subject.name}" berhasil ditambahkan!`);
          populateSubjectDropdowns();
          closeModal('modal-add-subject');
          
          if (selectElement) {
            selectElement.value = res.subject.id;
            if (selectElement.id === 'quick-grade-subject') {
              const studentId = document.getElementById('quick-grade-student-id').value;
              loadQuickGradeSubjectData(studentId, res.subject.id);
            } else if (selectElement.id === 'grade-subject-select') {
              const studentId = document.getElementById('grade-student-select').value;
              loadStudentGradesToForm(studentId, res.subject.id);
              renderGradesRecap();
            }
          }
        } else {
          alert(`Gagal menambahkan mata pelajaran: ${res.error}`);
          if (selectElement) selectElement.selectedIndex = 0;
        }
      };
    }

    // FORM: TAMBAH MATA PELAJARAN (SETTINGS TAB)
    const settingsAddSubjForm = document.getElementById('settings-add-subject-form');
    if (settingsAddSubjForm) {
      settingsAddSubjForm.onsubmit = (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('settings-new-subject-name');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name) return;

        const res = store.addSubject(name);
        if (res.success) {
          alert(`Mata pelajaran "${res.subject.name}" berhasil ditambahkan!`);
          nameInput.value = '';
          populateSubjectDropdowns();
          renderSettingsSubjectsList();
        } else {
          alert(`Gagal menambahkan mata pelajaran: ${res.error}`);
        }
      };
    }

    // FORM: EDIT MATA PELAJARAN (MODAL)
    const editSubjectForm = document.getElementById('edit-subject-form');
    if (editSubjectForm) {
      editSubjectForm.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-subject-id').value;
        const newName = document.getElementById('edit-subject-name').value.trim();
        if (!id || !newName) return;
        const res = store.updateSubject(id, newName);
        if (!res.success) {
          alert(`Gagal mengubah nama: ${res.error}`);
          return;
        }
        // Save category weights too.
        store.setCategoryWeights(id, {
          ph: document.getElementById('edit-weight-ph').value,
          sas: document.getElementById('edit-weight-sas').value
        });
        closeModal('modal-edit-subject');
        populateSubjectDropdowns();
        renderSettingsSubjectsList();
        renderGradeGrid();
        renderGradesRecap();
        renderStudents();
        window.showToast(`Mata pelajaran "${res.newName}" diperbarui.`, 'success');
      };

      // Live total indicator for the weight inputs.
      document.querySelectorAll('.edit-weight-input').forEach(inp => {
        inp.oninput = updateEditWeightTotal;
      });
    }

    // (Adding grade components is now done inline via the "Tambah PH" buttons
    // in the grid and the per-student form — the old component modal is gone.)

    // SEARCH BAR STUDENT
    const searchStudentInput = document.getElementById('search-student');
    if (searchStudentInput) {
      searchStudentInput.oninput = () => renderStudents();
    }

    // BULK SELECTION: select-all toggles every currently visible (filtered) row
    const selectAllCb = document.getElementById('students-select-all');
    if (selectAllCb) {
      selectAllCb.onchange = () => {
        const searchVal = document.getElementById('search-student').value.toLowerCase();
        const filtered = store.state.students.filter(s =>
          s.name.toLowerCase().includes(searchVal) ||
          (s.nis && s.nis.toLowerCase().includes(searchVal)) ||
          (s.nisn && s.nisn.toLowerCase().includes(searchVal)));
        if (selectAllCb.checked) filtered.forEach(s => selectedStudentIds.add(s.id));
        else filtered.forEach(s => selectedStudentIds.delete(s.id));
        renderStudents();
      };
    }

    const clearSelBtn = document.getElementById('students-clear-selection');
    if (clearSelBtn) {
      clearSelBtn.onclick = () => { selectedStudentIds.clear(); renderStudents(); };
    }

    const delSelBtn = document.getElementById('students-delete-selected');
    if (delSelBtn) {
      delSelBtn.onclick = () => {
        const ids = Array.from(selectedStudentIds);
        if (ids.length === 0) return;
        const names = ids.map(id => { const s = store.getStudent(id); return s ? s.name : ''; }).filter(Boolean);
        const list = names.slice(0, 8).join(', ') + (names.length > 8 ? `, dan ${names.length - 8} lainnya` : '');
        confirmAction({
          title: 'Hapus Murid Terpilih',
          message: `Anda akan menghapus <strong>${ids.length} murid</strong> beserta seluruh nilai, presensi, dan tabungannya secara permanen.`,
          summaryHtml: `<div class="card" style="padding:10px 12px; background: var(--bg-main); font-size:0.82rem; color: var(--text-muted);">${list}</div>`,
          confirmLabel: `Hapus ${ids.length} Murid`,
          requireText: 'HAPUS',
          onConfirm: () => {
            const res = store.deleteStudents(ids);
            selectedStudentIds.clear();
            if (res.success) {
              alert(`${res.count} murid berhasil dihapus!`);
              renderStudents();
              renderDashboard();
              renderGradesRecap();
            } else {
              alert(`Gagal menghapus: ${res.error}`);
            }
          }
        });
      };
    }

    // STUDENT FORM MODAL ACTIONS
    document.getElementById('open-add-student-btn').onclick = () => {
      document.getElementById('student-form-title').innerText = 'Tambah Murid Baru';
      document.getElementById('student-form').reset();
      document.getElementById('student-id').value = '';
      const accordion = document.querySelector('.form-accordion');
      if (accordion) accordion.open = false; // Reset accordion to closed when adding new
      openModal('modal-student-form');
    };

    document.getElementById('student-form').onsubmit = (e) => {
      e.preventDefault();
      const studentId = document.getElementById('student-id').value;
      
      const phoneInput = document.getElementById('student-parent-phone').value;
      const formattedPhone = formatWhatsAppNumber(phoneInput);

      const studentData = {
        name: document.getElementById('student-name').value.trim(),
        nis: document.getElementById('student-nis').value.trim(),
        nisn: document.getElementById('student-nisn').value.trim(),
        gender: document.getElementById('student-gender').value,
        religion: document.getElementById('student-religion').value,
        pob: document.getElementById('student-pob').value.trim(),
        dob: document.getElementById('student-dob').value,
        address: document.getElementById('student-address').value.trim(),
        parentName: document.getElementById('student-parent-name').value.trim(),
        parentJob: document.getElementById('student-parent-job').value.trim(),
        parentPhone: formattedPhone,
        parentAddress: document.getElementById('student-parent-address').value.trim() || document.getElementById('student-address').value.trim(),
        notes: document.getElementById('student-notes').value.trim()
      };

      if (!studentData.name || !studentData.parentPhone) {
        alert('Nama lengkap dan Nomor WhatsApp wajib diisi!');
        return;
      }

      if (studentId) {
        // Edit Mode
        store.updateStudent(studentId, studentData);
        alert('Data murid berhasil diperbarui!');
      } else {
        // Add Mode
        store.addStudent(studentData);
        alert('Murid baru berhasil ditambahkan!');
      }

      closeModal('modal-student-form');
      renderStudents();
      renderDashboard();
    };

    // ATTENDANCE DATE PICKER CHANGE
    document.getElementById('attendance-date').onchange = (e) => {
      attendanceSelectedDate = e.target.value;
      renderAttendance();
    };

    // GRADES FORM SUBMIT
    document.getElementById('grade-form').onsubmit = (e) => {
      e.preventDefault();
      const studentId = document.getElementById('grade-student-select').value;
      const subject = document.getElementById('grade-subject-select').value;
      
      if (!studentId || !subject) {
        alert('Silakan pilih murid dan mata pelajaran terlebih dahulu!');
        return;
      }

      const assessments = store.getSubjectAssessments(subject);
      assessments.forEach(a => {
        const input = document.getElementById(`grade-${a.id}`);
        if (input) {
          store.saveGrade(studentId, subject, a.id, input.value);
        }
      });

      alert('Nilai mata pelajaran berhasil disimpan!');
      renderGradeGrid();
      renderGradesRecap();
    };

    // (Adding PH is now per-semester via the "+" button in each semester header.)

    // GRADE GRID: EDIT WEIGHTS (PH% / SAS%)
    const btnEditWeights = document.getElementById('btn-edit-weights');
    const weightPopover = document.getElementById('weight-popover');
    const weightPh = document.getElementById('weight-ph');
    const weightSas = document.getElementById('weight-sas');
    const weightTotal = document.getElementById('weight-total');
    function refreshWeightTotal() {
      const total = (parseFloat(weightPh.value) || 0) + (parseFloat(weightSas.value) || 0);
      weightTotal.textContent = total === 100
        ? `Total: ${total}% ✓`
        : `Total: ${total}% — idealnya 100% (sistem tetap menormalisasi).`;
    }
    if (btnEditWeights && weightPopover) {
      btnEditWeights.onclick = () => {
        if (!gradeGridSubjectId) { window.showToast('Pilih mata pelajaran dahulu.', 'error'); return; }
        const w = store.getCategoryWeights(gradeGridSubjectId);
        weightPh.value = w.ph; weightSas.value = w.sas; refreshWeightTotal();
        weightPopover.hidden = !weightPopover.hidden;
      };
      weightPh.oninput = refreshWeightTotal;
      weightSas.oninput = refreshWeightTotal;
      document.getElementById('btn-weight-cancel').onclick = () => { weightPopover.hidden = true; };
      document.getElementById('btn-weight-save').onclick = () => {
        store.setCategoryWeights(gradeGridSubjectId, { ph: weightPh.value, sas: weightSas.value });
        weightPopover.hidden = true;
        window.showToast('Bobot disimpan.', 'success');
        renderGradeGrid(); renderGradesRecap(); renderStudents();
      };
    }

    // CHARACTER FORM SUBMIT
    document.getElementById('character-form').onsubmit = (e) => {
      e.preventDefault();
      const studentId = document.getElementById('character-student-select').value;
      
      if (!studentId) {
        alert('Pilih murid terlebih dahulu!');
        return;
      }

      const spIbadah = document.getElementById('char-spiritual-ibadah').value;
      const spSyukur = document.getElementById('char-spiritual-syukur').value;
      const spNotes = document.getElementById('char-spiritual-notes').value.trim();

      const soJujur = document.getElementById('char-social-jujur').value;
      const soDisiplin = document.getElementById('char-social-disiplin').value;
      const soTanggung = document.getElementById('char-social-tanggungjawab').value;
      const soNotes = document.getElementById('char-social-notes').value.trim();

      store.saveCharacter(studentId, 'spiritual', 'ibadah', spIbadah);
      store.saveCharacter(studentId, 'spiritual', 'syukur', spSyukur);
      store.saveCharacter(studentId, 'spiritual', 'catatan', spNotes);

      store.saveCharacter(studentId, 'social', 'jujur', soJujur);
      store.saveCharacter(studentId, 'social', 'disiplin', soDisiplin);
      store.saveCharacter(studentId, 'social', 'tanggungjawab', soTanggung);
      store.saveCharacter(studentId, 'social', 'catatan', soNotes);

      alert('Observasi karakter sikap berhasil disimpan!');
    };

    // FINANCE TAB SYSTEM
    const finTabs = document.querySelectorAll('#finance .tab-btn');
    finTabs.forEach(tab => {
      tab.onclick = () => {
        finTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#finance .tab-content-panel').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
      };
    });

    // GRADES TAB SYSTEM (was missing — tabs could not be switched)
    const gradeTabs = document.querySelectorAll('#grades .tab-btn');
    gradeTabs.forEach(tab => {
      tab.onclick = () => {
        gradeTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#grades .tab-content-panel').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        const panel = document.getElementById(target);
        if (panel) panel.classList.add('active');

        // Refresh the panel being shown so it reflects the latest data.
        if (target === 'tab-grades-grid') renderGradeGrid();
        else if (target === 'tab-grades-recap') renderGradesRecap();
      };
    });

    // ATTENDANCE TAB SYSTEM (was missing — recap tab unreachable)
    const absenTabs = document.querySelectorAll('#attendance .tab-btn');
    absenTabs.forEach(tab => {
      tab.onclick = () => {
        absenTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#attendance .tab-content-panel').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        const panel = document.getElementById(target);
        if (panel) panel.classList.add('active');
        if (target === 'tab-absen-recap' && typeof renderAttendanceRecap === 'function') renderAttendanceRecap();
      };
    });

    // SAVINGS TRANSACTION SUBMIT
    document.getElementById('saving-form').onsubmit = (e) => {
      e.preventDefault();
      const studentId = document.getElementById('saving-student-select').value;
      const type = document.getElementById('saving-tx-type').value; // 'deposit'|'withdraw'
      const amount = document.getElementById('saving-amount').value;
      const note = document.getElementById('saving-notes').value.trim();

      if (!studentId || !amount) {
        alert('Pilih murid dan jumlah transaksi!');
        return;
      }

      const res = store.addSavingTransaction(studentId, type, amount, note);
      
      if (res.success === false) {
        alert(`Gagal transaksi: ${res.error}`);
      } else {
        alert(`Transaksi Tabungan berhasil! Saldo baru: ${formatRupiah(res.balance)}`);
        document.getElementById('saving-form').reset();
        renderFinance();
        renderDashboard();
      }
    };

    // CLASS CASH TRANSACTION SUBMIT
    document.getElementById('cash-form').onsubmit = (e) => {
      e.preventDefault();
      const type = document.getElementById('cash-tx-type').value; // 'in'|'out'
      const amount = document.getElementById('cash-amount').value;
      const note = document.getElementById('cash-notes').value.trim();

      if (!amount || !note) {
        alert('Masukkan jumlah uang dan rincian pengeluaran/pemasukan!');
        return;
      }

      const success = store.addClassCashTransaction(type, amount, note);
      if (success) {
        alert('Transaksi Kas Kelas berhasil dicatat!');
        document.getElementById('cash-form').reset();
        renderFinance();
        renderDashboard();
      } else {
        alert('Gagal menyimpan transaksi kas!');
      }
    };

    // SCHEDULE TAB SYSTEM
    const schTabs = document.querySelectorAll('#schedule .tab-btn');
    schTabs.forEach(tab => {
      tab.onclick = () => {
        schTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#schedule .tab-content-panel').forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
      };
    });

    // LESSON FORM SUBMIT
    document.getElementById('lesson-form').onsubmit = (e) => {
      e.preventDefault();
      const day = document.getElementById('lesson-day').value;
      const start = document.getElementById('lesson-time-start').value;
      const end = document.getElementById('lesson-time-end').value;
      const subject = document.getElementById('lesson-subject').value.trim();
      const teacher = document.getElementById('lesson-teacher').value.trim();

      if (!day || !start || !end || !subject || !teacher) {
        alert('Isi seluruh form mata pelajaran!');
        return;
      }

      const lessonData = {
        time: `${start} - ${end}`,
        subject,
        teacher
      };

      store.saveLesson(day, -1, lessonData);
      alert('Jadwal pelajaran berhasil ditambahkan!');
      document.getElementById('lesson-form').reset();
      renderSchedule();
    };

    // PIKET FORM SUBMIT
    document.getElementById('piket-form').onsubmit = (e) => {
      e.preventDefault();
      const day = document.getElementById('piket-day').value;
      const checkedBoxes = document.querySelectorAll('input[name="piket-student"]:checked');
      
      if (!day) {
        alert('Pilih hari piket!');
        return;
      }

      const list = [];
      checkedBoxes.forEach(cb => {
        list.push(cb.value);
      });

      store.savePiket(day, list);
      alert(`Jadwal piket hari ${day} berhasil diperbarui!`);
      renderSchedule();
    };

    // CALENDAR AGENDA FORM SUBMIT
    document.getElementById('calendar-form').onsubmit = (e) => {
      e.preventDefault();
      const date = document.getElementById('cal-event-date').value;
      const title = document.getElementById('cal-event-title').value.trim();
      const type = document.getElementById('cal-event-type').value;

      if (!date || !title) {
        alert('Tanggal dan Nama agenda wajib diisi!');
        return;
      }

      store.addCalendarEvent(date, title, type);
      alert('Agenda akademik baru berhasil disimpan!');
      document.getElementById('calendar-form').reset();
      renderSchedule();
      renderDashboard();
    };

    // COMMUNICATION TAB SYSTEM
    const commTabs = document.querySelectorAll('#communication .tab-btn');
    commTabs.forEach(tab => {
      tab.onclick = () => {
        commTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#communication .tab-content-panel').forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
      };
    });

    // ANNOUNCEMENT FORM SUBMIT
    document.getElementById('announcement-form').onsubmit = (e) => {
      e.preventDefault();
      const title = document.getElementById('ann-title').value.trim();
      const content = document.getElementById('ann-content').value.trim();

      if (!title || !content) {
        alert('Judul dan Isi Pengumuman wajib diisi!');
        return;
      }

      store.addAnnouncement(title, content);
      alert('Pengumuman baru berhasil diterbitkan!');
      document.getElementById('announcement-form').reset();
      renderAnnouncementsList();
      renderDashboard();
    };

    // BROADCAST / LAPORAN PERSONAL SUBMIT
    document.getElementById('broadcast-form').onsubmit = (e) => {
      e.preventDefault();
      const studentId = document.getElementById('comm-student-select').value;
      const text = document.getElementById('broadcast-text-template').value.trim();

      if (!studentId || !text) {
        alert('Pilih siswa dan masukkan isi laporan!');
        return;
      }

      const student = store.getStudent(studentId);
      if (!student) return;

      // Open WhatsApp URL
      const waUrl = `https://wa.me/${student.parentPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    };

    // CLASS SETTINGS FORM SUBMIT
    document.getElementById('class-settings-form').onsubmit = (e) => {
      e.preventDefault();
      const className = document.getElementById('settings-classname').value.trim();
      const schoolName = document.getElementById('settings-schoolname').value.trim();
      const curriculum = document.getElementById('settings-curriculum').value;
      const year = document.getElementById('settings-year').value.trim();
      const kkm = document.getElementById('settings-kkm').value;
      const semester = document.getElementById('settings-semester').value;

      if (!className || !schoolName || !year) {
        alert('Seluruh kolom profil wajib diisi!');
        return;
      }

      store.updateClassSettings(className, schoolName, curriculum, year, kkm, semester);
      updateHeaderBadge();
      alert('Profil kelas berhasil disimpan!');
      // Refresh views affected by KKM or active semester.
      renderStudents();
      renderGradeGrid();
    };

    // SECURITY PASSWORD CHANGE SUBMIT
    document.getElementById('password-settings-form').onsubmit = (e) => {
      e.preventDefault();
      const oldPass = document.getElementById('settings-old-pass').value;
      const newPass = document.getElementById('settings-new-pass').value;

      if (!oldPass || !newPass) {
        alert('Mohon isi kolom kata sandi lama dan baru!');
        return;
      }

      if (!store.checkPassword(oldPass)) {
        alert('Kata sandi lama salah!');
        return;
      }

      store.updatePassword(newPass);
      alert('Kata sandi keamanan berhasil diperbarui!');
      document.getElementById('password-settings-form').reset();
    };

    // BACKUP & RESTORE TRIGGERS
    document.getElementById('backup-btn').onclick = () => {
      const dataStr = store.exportData();
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Backup_WaliKelas_${store.state.settings.className.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    document.getElementById('restore-btn').onclick = () => {
      document.getElementById('restore-file-input').click();
    };

    document.getElementById('restore-file-input').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = store.importData(evt.target.result);
        if (result.success) {
          alert('Data kelas berhasil dipulihkan!');
          location.reload();
        } else {
          alert(`Gagal memulihkan data: ${result.error}`);
        }
      };
      reader.readAsText(file);
    };

    // LOAD DEMO DATA
    document.getElementById('load-demo-btn').onclick = () => {
      confirmAction({
        title: 'Muat Data Demo',
        message: 'Memuat data demo akan <strong>menimpa seluruh data kelas saat ini</strong>. Disarankan backup dulu. Lanjutkan?',
        confirmLabel: 'Muat Demo',
        danger: false,
        onConfirm: () => {
          store.loadDemoData();
          alert('Data demo sekolah berhasil dimuat!');
          location.reload();
        }
      });
    };

    // RESET ALL DATA
    document.getElementById('reset-data-btn').onclick = () => {
      confirmAction({
        title: 'Hapus Seluruh Data Kelas',
        message: 'Ini akan menghapus <strong>seluruh data siswa, nilai, presensi, kas, dan tabungan</strong> secara permanen dan tidak dapat dibatalkan.',
        summaryHtml: `<div class="card" style="padding:10px 12px; background: var(--bg-main); font-size:0.82rem; color: var(--text-muted);">${store.state.students.length} murid beserta seluruh catatannya akan dihapus.</div>`,
        confirmLabel: 'Hapus Semua',
        requireText: 'HAPUS SEMUA',
        onConfirm: () => {
          store.resetData();
          alert('Aplikasi berhasil dikosongkan!');
          location.reload();
        }
      });
    };

    // GRADES CSV EXPORT
    document.getElementById('export-grades-btn').onclick = () => {
      exportGradesToCSV();
    };

    // QUICK GRADE FORM SUBMIT
    document.getElementById('quick-grade-form').onsubmit = (e) => {
      e.preventDefault();
      const studentId = document.getElementById('quick-grade-student-id').value;
      const subject = document.getElementById('quick-grade-subject').value;
      
      const assessments = store.getSubjectAssessments(subject);
      assessments.forEach(a => {
        const input = document.getElementById(`quick-grade-${a.id}`);
        if (input) {
          store.saveGrade(studentId, subject, a.id, input.value);
        }
      });

      alert('Nilai mata pelajaran berhasil disimpan!');
      closeModal('modal-quick-grade');
      renderStudents();
      renderGradesRecap();
    };

    // QUICK SAVING FORM SUBMIT
    document.getElementById('quick-saving-form').onsubmit = (e) => {
      e.preventDefault();
      const studentId = document.getElementById('quick-saving-student-id').value;
      const type = document.getElementById('quick-saving-type').value; // 'deposit'|'withdraw'
      const amount = parseFloat(document.getElementById('quick-saving-amount').value);
      const note = document.getElementById('quick-saving-notes').value.trim();

      const res = store.addSavingTransaction(studentId, type, amount, note);
      
      if (res.success === false) {
        alert(`Gagal transaksi: ${res.error}`);
      } else {
        alert(`Transaksi Tabungan berhasil! Saldo baru: ${formatRupiah(res.balance)}`);
        closeModal('modal-quick-saving');
        renderStudents();
        renderFinance();
        renderDashboard();
      }
    };

    // Close modals on clicking close buttons or background overlays
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
      const closeBtns = modal.querySelectorAll('.modal-close');
      closeBtns.forEach(btn => {
        btn.onclick = () => closeModal(modal.id);
      });
      
      modal.onclick = (e) => {
        if (e.target === modal) {
          closeModal(modal.id);
        }
      };
    });
  }

  // --- EXPORT GRADES TO CSV FOR EXCEL ---
  function exportGradesToCSV() {
    const students = store.state.students;
    if (students.length === 0) {
      alert('Tidak ada data murid untuk diekspor!');
      return;
    }

    const lessonsList = store.getSubjects();

    // Sanitize cell values for semicolon-separated CSV.
    const esc = (v) => {
      const s = (v === null || v === undefined) ? '' : String(v);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    // Build dynamic header from each subject's actual components.
    let header = 'NIS;NISN;Nama Murid;L/P;';
    const subjectAssessments = {};
    lessonsList.forEach(subj => {
      const assessments = store.getSubjectAssessments(subj.id);
      subjectAssessments[subj.id] = assessments;
      assessments.forEach(a => {
        header += `${esc(subj.name + ' - ' + a.name)};`;
      });
      header += `${esc(subj.name + ' - Rata-rata')};`;
    });
    header += 'Rata_Rata_Umum\n';

    let csvContent = header;

    // Student rows
    students.forEach(student => {
      let row = `${esc(student.nis)};${esc(student.nisn)};${esc(student.name)};${esc(student.gender)};`;

      lessonsList.forEach(subj => {
        const scores = store.getGrades(student.id)[subj.id] || {};
        subjectAssessments[subj.id].forEach(a => {
          const v = scores[a.id];
          row += `${(v === undefined || v === null) ? '' : v};`;
        });
        const avg = store.getSubjectAverage(student.id, subj.id);
        row += `${avg === null ? '' : avg};`;
      });

      const overallAvg = store.getStudentOverallAverage(student.id);
      row += `${overallAvg === null ? '' : overallAvg}\n`;
      csvContent += row;
    });

    // Download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \ufeff solves Indonesian / UTF-8 Excel charset bug
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Nilai_${store.state.settings.className.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- HELPERS ---
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Disable scroll on back
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      
      if (modalId === 'modal-add-subject') {
        const triggerInput = document.getElementById('add-subject-trigger-select');
        if (triggerInput && triggerInput.value) {
          const selectElement = document.getElementById(triggerInput.value);
          if (selectElement && selectElement.value === 'add_new_subject') {
            selectElement.selectedIndex = 0;
          }
        }
      }
    }
  }

  // Reusable, styled single-line text input dialog. Replaces native prompt().
  // opts: { title, label, value, placeholder, onSave(text) }
  function promptInput(opts) {
    const o = opts || {};
    const titleEl = document.getElementById('input-prompt-title');
    const labelEl = document.getElementById('input-prompt-label');
    const field = document.getElementById('input-prompt-field');
    const saveBtn = document.getElementById('input-prompt-save');
    if (!field || !saveBtn) return;
    titleEl.innerHTML = `<i class="fas fa-book"></i> ${o.title || 'Masukkan Teks'}`;
    if (o.label) labelEl.textContent = o.label;
    field.value = o.value || '';
    field.placeholder = o.placeholder || '';
    openModal('modal-input-prompt');
    setTimeout(() => { field.focus(); field.select(); }, 60);

    const submit = () => {
      const val = field.value;
      field.onkeydown = null;
      closeModal('modal-input-prompt');
      if (typeof o.onSave === 'function') o.onSave(val);
    };
    saveBtn.onclick = submit;
    field.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
  }

  // Reusable, styled confirmation dialog. Replaces native confirm().
  // opts: { title, message, summaryHtml, confirmLabel, danger, requireText, onConfirm }
  function confirmAction(opts) {
    const o = opts || {};
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const sumEl = document.getElementById('confirm-summary');
    const reqWrap = document.getElementById('confirm-require-wrap');
    const reqLabel = document.getElementById('confirm-require-label');
    const reqInput = document.getElementById('confirm-require-input');
    const btn = document.getElementById('confirm-action-btn');
    if (!btn) return;

    titleEl.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${o.title || 'Konfirmasi'}`;
    msgEl.innerHTML = o.message || '';
    sumEl.innerHTML = o.summaryHtml || '';
    btn.textContent = o.confirmLabel || 'Hapus';
    btn.className = 'btn ' + (o.danger === false ? 'btn-primary' : 'btn-danger');

    const requireText = o.requireText || null;
    if (requireText) {
      reqWrap.style.display = '';
      reqLabel.textContent = `Ketik "${requireText}" untuk mengonfirmasi:`;
      reqInput.value = '';
      reqInput.placeholder = requireText;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      reqInput.oninput = () => {
        const ok = reqInput.value.trim() === requireText;
        btn.disabled = !ok;
        btn.style.opacity = ok ? '1' : '0.5';
      };
    } else {
      reqWrap.style.display = 'none';
      reqInput.oninput = null;
      btn.disabled = false;
      btn.style.opacity = '1';
    }

    btn.onclick = () => {
      if (requireText && reqInput.value.trim() !== requireText) return;
      closeModal('modal-confirm');
      if (typeof o.onConfirm === 'function') o.onConfirm();
    };

    openModal('modal-confirm');
    if (requireText) setTimeout(() => reqInput.focus(), 60);
  }

  // Human-readable name for a grade category id.
  // Live total feedback for the per-subject weight editor.
  function updateEditWeightTotal() {
    const el = document.getElementById('edit-weight-total');
    if (!el) return;
    const vals = ['ph', 'sas'].map(k => { const elx = document.getElementById('edit-weight-' + k); return elx ? (parseFloat(elx.value) || 0) : 0; });
    const total = vals.reduce((a, b) => a + b, 0);
    if (total === 100) {
      el.innerHTML = `Total bobot: <strong style="color:var(--success);">${total}%</strong> ✓`;
    } else {
      el.innerHTML = `Total bobot: <strong style="color:var(--warning,#d97706);">${total}%</strong> — idealnya 100% (sistem tetap menormalisasi otomatis).`;
    }
  }

  // Formatting currency to Indonesian Rupiah
  function formatRupiah(amount) {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID');
  }

  // Formatting ISO date string to Indonesian style date
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // Translate rating character codes to readable words
  function translateRating(code) {
    const dict = {
      'SB': 'Sangat Baik (SB)',
      'B': 'Baik (B)',
      'C': 'Cukup (C)',
      'PB': 'Perlu Bimbingan (PB)'
    };
    return dict[code] || code;
  }

  // Formatting input number to clean Indonesian Phone number format
  function formatWhatsAppNumber(phone) {
    let cleaned = phone.replace(/\D/g, ''); // numbers only
    
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    
    // Default country fallback if too short
    if (!cleaned.startsWith('62') && cleaned.length > 5) {
      cleaned = '62' + cleaned;
    }
    
    return cleaned || '628';
  }

  // --- QUICK GRADE MODAL FUNCTIONALITY ---
  function showQuickGradeModal(studentId) {
    const student = store.getStudent(studentId);
    if (!student) return;

    document.getElementById('quick-grade-student-id').value = studentId;
    document.getElementById('quick-grade-student-name').innerText = student.name;

    // Load existing grades if any for default subject
    const defaultSubj = (store.state.settings.subjects && store.state.settings.subjects.length > 0) 
      ? store.state.settings.subjects[0].id 
      : 'matematika';
    
    document.getElementById('quick-grade-subject').value = defaultSubj;
    renderDynamicAssessments('quick-grade-inputs-container', defaultSubj, studentId, 'quick-grade');

    // Bind change listener for subject select
    document.getElementById('quick-grade-subject').onchange = (e) => {
      if (e.target.value === 'add_new_subject') {
        handleAddNewSubject(e.target);
      } else {
        renderDynamicAssessments('quick-grade-inputs-container', e.target.value, studentId, 'quick-grade');
      }
    };

    openModal('modal-quick-grade');
  }

  function loadQuickGradeSubjectData(studentId, subject) {
    renderDynamicAssessments('quick-grade-inputs-container', subject, studentId, 'quick-grade');
  }

  // --- QUICK SAVING MODAL FUNCTIONALITY ---
  function showQuickSavingModal(studentId) {
    const student = store.getStudent(studentId);
    if (!student) return;

    const sav = store.getSavings(studentId);

    document.getElementById('quick-saving-student-id').value = studentId;
    document.getElementById('quick-saving-student-name').innerText = student.name;
    document.getElementById('quick-saving-current-balance').innerText = formatRupiah(sav.balance);
    
    // Clear inputs
    document.getElementById('quick-saving-amount').value = '';
    document.getElementById('quick-saving-notes').value = '';
    document.getElementById('quick-saving-type').value = 'deposit';

    openModal('modal-quick-saving');
  }

  // --- GRADE GRID (input nilai sekelas, dua semester berdampingan) ---
  function renderGradeGrid() {
    const table = document.getElementById('grade-grid-table');
    const body = document.getElementById('grade-grid-body');
    const tabContainer = document.getElementById('spreadsheet-subject-tabs');
    if (!table || !body || !tabContainer) return;
    const thead = table.querySelector('thead');

    const subjects = store.getSubjects();
    if (subjects.length === 0) {
      tabContainer.innerHTML = '';
      thead.innerHTML = '';
      body.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Belum ada mata pelajaran. Tambahkan di tab Pengaturan.</td></tr>`;
      return;
    }
    if (!gradeGridSubjectId || !subjects.some(s => s.id === gradeGridSubjectId)) {
      gradeGridSubjectId = subjects[0].id;
    }

    tabContainer.innerHTML = subjects.map(s => `
      <button class="spreadsheet-tab-btn ${s.id === gradeGridSubjectId ? 'active' : ''}" data-subject="${s.id}">
        <i class="fas fa-file-excel" style="color:#107c41;"></i> ${s.name}
      </button>
    `).join('');
    tabContainer.querySelectorAll('.spreadsheet-tab-btn').forEach(btn => {
      btn.onclick = () => { gradeGridSubjectId = btn.getAttribute('data-subject'); renderGradeGrid(); };
    });

    const students = store.state.students;
    const kkm = store.getKkm();
    const SUBJ = gradeGridSubjectId;
    const semesters = ['1', '2'];
    const bd = 'border:1px solid var(--border-color);';
    const semTint = sem => sem === '1' ? 'rgba(13,148,136,0.06)' : 'rgba(8,145,178,0.06)';
    const semRapor = sem => sem === '1' ? 'var(--primary-light)' : 'rgba(8,145,178,0.12)';
    const semAccent = sem => sem === '1' ? 'var(--primary)' : '#0891b2';

    const layout = {};
    semesters.forEach(sem => {
      layout[sem] = { slots: store.getSubjectPhSlots(SUBJ, sem), pair: store.getSubjectSasPair(SUBJ, sem) };
    });
    const semColCount = sem => layout[sem].slots.length * 2 + 4; // PH+Re/slot, RATA, SAS, ReSAS, RAPOR

    // ---- Header (3 rows: group / materi / sub) ----
    let r1 = `
      <th rowspan="3" style="width:34px;text-align:center;${bd}background:var(--bg-main);">No</th>
      <th rowspan="3" style="min-width:150px;text-align:left;${bd}background:var(--bg-main);position:sticky;left:0;z-index:6;">Nama Murid</th>
    `;
    let r2 = '';
    let r3 = '';
    semesters.forEach(sem => {
      r1 += `<th colspan="${semColCount(sem)}" style="${bd}text-align:center;background:${semTint(sem)};color:${semAccent(sem)};font-weight:700;">
        SEMESTER ${sem}
        <button type="button" class="ph-add-btn" data-sem="${sem}" title="Tambah PH Semester ${sem}" style="margin-left:8px;border:none;background:${semAccent(sem)};color:#fff;border-radius:var(--radius-full);width:20px;height:20px;cursor:pointer;font-size:0.72rem;line-height:1;">+</button>
      </th>`;
      layout[sem].slots.forEach(slot => {
        const materi = slot.materi || '';
        const canDelete = layout[sem].slots.length > 1;
        const materiHtml = materi ? materi : '<span style="color:var(--text-muted);font-style:italic;">+ materi</span>';
        r2 += `<th colspan="2" class="materi-head" style="${bd}background:${semTint(sem)};font-size:0.72rem;padding:4px 6px;">
          <span class="materi-text" title="${materi.replace(/"/g, '&quot;')}">${materiHtml}</span>
          <button type="button" class="materi-edit-btn" data-sem="${sem}" data-ph="${slot.ph.id}" title="Edit materi"><i class="fas fa-pen"></i></button>
          ${canDelete ? `<button type="button" class="ph-del-btn" data-sem="${sem}" data-ph="${slot.ph.id}" title="Hapus ${slot.ph.name}"><i class="fas fa-times"></i></button>` : ''}
        </th>`;
        r3 += `<th style="${bd}width:52px;text-align:center;">${slot.ph.name}</th><th style="${bd}width:52px;text-align:center;color:var(--text-muted);">${slot.re ? slot.re.name : 'Re'}</th>`;
      });
      r2 += `<th rowspan="2" style="${bd}width:60px;background:${semTint(sem)};color:${semAccent(sem)};font-weight:bold;">RATA PH</th>`;
      r2 += `<th colspan="2" style="${bd}text-align:center;background:${semTint(sem)};font-size:0.72rem;">Sumatif</th>`;
      r2 += `<th rowspan="2" style="${bd}width:76px;background:${semRapor(sem)};color:${semAccent(sem)};font-weight:bold;">NILAI RAPOR</th>`;
      r3 += `<th style="${bd}width:52px;text-align:center;">SAS</th><th style="${bd}width:58px;text-align:center;color:var(--text-muted);">ReSAS</th>`;
    });
    thead.innerHTML = `<tr>${r1}</tr><tr>${r2}</tr><tr>${r3}</tr>`;

    const totalCols = 2 + semColCount('1') + semColCount('2');

    const cellInput = (studentId, compId, scores) => {
      const val = scores[compId] !== undefined ? scores[compId] : '';
      const under = val !== '' && parseFloat(val) < kkm;
      return `<td style="${bd}padding:2px;text-align:center;"><input type="number" min="0" max="100" inputmode="numeric" class="spreadsheet-cell-input grid-cell ${under ? 'spreadsheet-cell-under-kkm' : ''}" data-student="${studentId}" data-comp="${compId}" value="${val}" placeholder="-"></td>`;
    };

    if (students.length === 0) {
      body.innerHTML = `<tr><td colspan="${totalCols}" class="text-center text-muted py-4">Belum ada data murid. Tambahkan di tab Buku Induk.</td></tr>`;
    } else {
      body.innerHTML = '';
      students.forEach((student, idx) => {
        const scores = (store.getGrades(student.id)[SUBJ]) || {};
        let row = `
          <td style="text-align:center;${bd}font-weight:500;">${idx + 1}</td>
          <td style="${bd}font-weight:600;padding:6px 10px;position:sticky;left:0;background:var(--bg-card);z-index:5;">${student.name}</td>
        `;
        semesters.forEach(sem => {
          layout[sem].slots.forEach(slot => {
            row += cellInput(student.id, slot.ph.id, scores);
            row += slot.re ? cellInput(student.id, slot.re.id, scores) : `<td style="${bd}"></td>`;
          });
          const rataPH = store.getSubjectPhAverage(student.id, SUBJ, sem);
          row += `<td class="text-center" style="${bd}font-weight:bold;color:var(--text-muted);background:${semTint(sem)};">${rataPH === null ? '-' : Math.round(rataPH)}</td>`;
          row += layout[sem].pair.sas ? cellInput(student.id, layout[sem].pair.sas.id, scores) : `<td style="${bd}"></td>`;
          row += layout[sem].pair.resas ? cellInput(student.id, layout[sem].pair.resas.id, scores) : `<td style="${bd}"></td>`;
          const rapor = store.getSubjectSemesterAverage(student.id, SUBJ, sem);
          const ru = rapor !== null && rapor < kkm;
          row += `<td class="text-center ${ru ? 'spreadsheet-cell-under-kkm' : ''}" style="${bd}font-weight:bold;background:${semRapor(sem)};color:${semAccent(sem)};">${rapor === null ? '-' : rapor}</td>`;
        });
        const tr = document.createElement('tr');
        tr.innerHTML = row;
        body.appendChild(tr);
      });

      // RATA-RATA KELAS row
      const avgOf = (fn) => {
        const vals = students.map(fn).filter(v => v !== null && v !== undefined && !isNaN(v));
        return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
      };
      const rawAvg = (compId) => avgOf(st => {
        const s = (store.getGrades(st.id)[SUBJ] || {})[compId];
        return (s === undefined || s === '' || s === null) ? null : parseFloat(s);
      });
      let ar = `
        <td style="${bd}"></td>
        <td style="${bd}padding:8px 10px;position:sticky;left:0;background:var(--bg-main);z-index:5;font-weight:bold;">RATA-RATA KELAS</td>
      `;
      semesters.forEach(sem => {
        layout[sem].slots.forEach(slot => {
          const a1 = rawAvg(slot.ph.id); const a2 = slot.re ? rawAvg(slot.re.id) : null;
          ar += `<td class="text-center" style="${bd}font-weight:bold;">${a1 === null ? '-' : a1}</td><td class="text-center" style="${bd}font-weight:bold;color:var(--text-muted);">${a2 === null ? '-' : a2}</td>`;
        });
        const rataAvg = avgOf(st => store.getSubjectPhAverage(st.id, SUBJ, sem));
        ar += `<td class="text-center" style="${bd}font-weight:bold;color:${semAccent(sem)};background:${semTint(sem)};">${rataAvg === null ? '-' : rataAvg}</td>`;
        const sasAvg = layout[sem].pair.sas ? rawAvg(layout[sem].pair.sas.id) : null;
        const resasAvg = layout[sem].pair.resas ? rawAvg(layout[sem].pair.resas.id) : null;
        ar += `<td class="text-center" style="${bd}font-weight:bold;">${sasAvg === null ? '-' : sasAvg}</td><td class="text-center" style="${bd}font-weight:bold;color:var(--text-muted);">${resasAvg === null ? '-' : resasAvg}</td>`;
        const raporAvg = avgOf(st => store.getSubjectSemesterAverage(st.id, SUBJ, sem));
        ar += `<td class="text-center" style="${bd}font-weight:bold;background:${semRapor(sem)};color:${semAccent(sem)};">${raporAvg === null ? '-' : raporAvg}</td>`;
      });
      const avgTr = document.createElement('tr');
      avgTr.style.background = 'var(--bg-main)';
      avgTr.innerHTML = ar;
      body.appendChild(avgTr);
    }

    // ---- Wiring ----
    body.querySelectorAll('.spreadsheet-cell-input.grid-cell').forEach(inp => {
      inp.onchange = () => {
        store.saveGrade(inp.getAttribute('data-student'), SUBJ, inp.getAttribute('data-comp'), inp.value);
        if (typeof showAutoSavePulse === 'function') showAutoSavePulse();
        renderGradeGrid(); renderGradesRecap(); renderStudents();
      };
    });

    thead.querySelectorAll('.ph-add-btn').forEach(btn => {
      btn.onclick = () => {
        const sem = btn.getAttribute('data-sem');
        const res = store.addPhComponent(SUBJ, sem);
        if (res.success) { window.showToast(`${res.component.name} Semester ${sem} ditambahkan.`, 'success'); renderGradeGrid(); }
      };
    });

    thead.querySelectorAll('.materi-edit-btn').forEach(btn => {
      btn.onclick = () => {
        const sem = btn.getAttribute('data-sem');
        const phId = btn.getAttribute('data-ph');
        const slot = store.getSubjectPhSlots(SUBJ, sem).find(s => s.ph.id === phId);
        promptInput({
          title: 'Deskripsi Materi',
          label: `Materi untuk ${slot ? slot.ph.name : 'PH'} · Semester ${sem}`,
          value: slot ? slot.materi : '',
          placeholder: 'Mis. Bilangan Bulat',
          onSave: (text) => { store.setMateri(SUBJ, sem, phId, text); renderGradeGrid(); }
        });
      };
    });

    thead.querySelectorAll('.ph-del-btn').forEach(btn => {
      btn.onclick = () => {
        const sem = btn.getAttribute('data-sem');
        const phId = btn.getAttribute('data-ph');
        confirmAction({
          title: 'Hapus Kolom PH',
          message: 'Hapus kolom PH ini beserta Remedial-nya? Nilai PH & Re untuk <strong>semua murid</strong> akan terhapus permanen.',
          confirmLabel: 'Hapus PH',
          onConfirm: () => {
            const res = store.deletePhComponent(SUBJ, phId, sem);
            if (!res.success) { window.showToast(res.error, 'error'); return; }
            window.showToast('Kolom PH dihapus.', 'success');
            renderGradeGrid(); renderGradesRecap(); renderStudents();
          }
        });
      };
    });

    const clearBtn = document.getElementById('btn-clear-subject-grades-spreadsheet');
    if (clearBtn) {
      clearBtn.onclick = () => {
        const subName = store.getSubjectLabel(SUBJ);
        if (confirm(`Apakah Anda yakin ingin mengosongkan seluruh nilai pelajaran ${subName}? Data yang terhapus tidak dapat dikembalikan.`)) {
          store.clearSubjectGrades(SUBJ);
          window.showToast(`Berhasil membersihkan nilai pelajaran ${subName}!`);
          renderGradeGrid();
        }
      };
    }
  }

  let saveIndicatorTimeout = null;
  function showAutoSavePulse() {
    const indicator = document.getElementById('grades-autosave-indicator');
    if (!indicator) return;

    indicator.innerHTML = '<i class="fas fa-spinner fa-spin" style="color: var(--primary);"></i> Menyimpan perubahan...';
    indicator.style.opacity = '1';

    if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);
    saveIndicatorTimeout = setTimeout(() => {
      indicator.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i> Semua perubahan disimpan otomatis';
      indicator.style.opacity = '0.85';
    }, 800);
  }

  function populateSubjectDropdowns() {
    const subjects = store.state.settings.subjects || [
      { id: 'matematika', name: 'Matematika' },
      { id: 'indonesia', name: 'Bahasa Indonesia' },
      { id: 'ipa', name: 'IPA / IPAS' },
      { id: 'agama', name: 'Pendidikan Agama' }
    ];

    const quickSelect = document.getElementById('quick-grade-subject');
    const mainSelect = document.getElementById('grade-subject-select');

    if (quickSelect) {
      quickSelect.innerHTML = subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('') + 
        `<option value="add_new_subject" style="font-weight: bold; color: var(--primary);">+ Tambah Mata Pelajaran Baru...</option>`;
    }

    if (mainSelect) {
      mainSelect.innerHTML = `<option value="">-- Pilih Mapel --</option>` + 
        subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('') + 
        `<option value="add_new_subject" style="font-weight: bold; color: var(--primary);">+ Tambah Mata Pelajaran Baru...</option>`;
    }
  }

  function handleAddNewSubject(selectElement) {
    const triggerInput = document.getElementById('add-subject-trigger-select');
    if (triggerInput) triggerInput.value = selectElement.id;
    
    const nameInput = document.getElementById('new-subject-name');
    if (nameInput) nameInput.value = '';

    openModal('modal-add-subject');
  }

  // Handle database sync completed event
  window.addEventListener('walikelas_sync_completed', () => {
    console.log('Database synced from Supabase. Refreshing current view...');
    navigateToPage(currentActivePage);
    updateHeaderBadge();
    populateSubjectDropdowns();
  });
});
