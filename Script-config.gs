/**
 * Script-config.gs — Backend для config-crm (авторизація)
 * Google Apps Script + Google Sheets (Config таблиця)
 *
 * Аркуші:
 *   Власник   — обліковки власників
 *   Персонал  — обліковки водіїв та менеджерів
 *   Лог доступів — журнал входів
 *
 * Хешування: SHA-256 через Utilities.computeDigest
 */

// ── Spreadsheet ID Config таблиці (замінити на реальний) ──
var CONFIG_SS_ID = '1GEVqqWCvOZG_RNmVrIGwlrW9d-yjXlXi-v7hX_z5-kc';

// ── Стовпці аркуша «Власник» ──
var OWN = {
  USER_ID: 0, NAME: 1, PHONE: 2, EMAIL: 3,
  LOGIN: 4, PASSWORD_HASH: 5, TOKEN: 6, ROLE: 7,
  TABLES: 8, TWO_FA: 9, STATUS: 10, DATE_CREATED: 11,
  LAST_ACTIVE: 12, DATE_PWD_CHANGE: 13, NOTE: 14
};

// ── Стовпці аркуша «Персонал» ──
var STF = {
  STAFF_ID: 0, NAME: 1, PHONE: 2, EMAIL: 3,
  ROLE: 4, LOGIN: 5, PASSWORD_HASH: 6, CITY: 7,
  AUTO_ID: 8, AUTO_NUM: 9, RATE: 10, RATE_CUR: 11,
  STATUS: 12, DATE_HIRED: 13, LAST_ACTIVE: 14, NOTE: 15
};

// ── Стовпці аркуша «Лог доступів» ──
var LOG = {
  LOG_ID: 0, USER_ID: 1, NAME: 2, ROLE: 3,
  ACTION: 4, TABLE: 5, SHEET: 6, IP: 7,
  DEVICE: 8, DATETIME: 9, STATUS: 10, NOTE: 11
};

// ========================================
// Хешування паролю (SHA-256 → hex)
// ========================================
function hashPassword(password) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  return digest.map(function(b) {
    var hex = (b < 0 ? b + 256 : b).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ========================================
// Отримати всі дані аркуша
// ========================================
function getSheetData(sheetName) {
  var ss = SpreadsheetApp.openById(CONFIG_SS_ID);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return { headers: [], data: [] };
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { headers: [], data: [] };
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
  var data = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return { headers: headers, data: data };
}

// ========================================
// Логування входу
// ========================================
function logAccess(userId, name, role, action, status, note) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG_SS_ID);
    var sh = ss.getSheetByName('Лог доступів');
    if (!sh) return;
    var now = new Date();
    var logId = 'LOG-ACC-' + Utilities.formatDate(now, 'Europe/Kiev', 'yyyyMMddHHmmss');
    sh.appendRow([
      logId, userId, name, role, action,
      '', '', '', '', // table, sheet, IP, device — заповнюються клієнтом або не потрібні
      Utilities.formatDate(now, 'Europe/Kiev', 'dd.MM.yyyy HH:mm:ss'),
      status, note || ''
    ]);
  } catch (e) {
    // Не кидаємо помилку — логування не повинно ламати логін
  }
}

// ========================================
// Оновити «Остання активність»
// ========================================
function updateLastActive(sheetName, colIdx, loginValue, loginCol) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG_SS_ID);
    var sh = ss.getSheetByName(sheetName);
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    var now = Utilities.formatDate(new Date(), 'Europe/Kiev', 'dd.MM.yyyy HH:mm');
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][loginCol]).trim() === loginValue) {
        sh.getRange(i + 1, colIdx + 1).setValue(now);
        break;
      }
    }
  } catch (e) { /* ігноруємо */ }
}

// ========================================
// Обробка логіну
// ========================================
function handleLogin(params) {
  var role = String(params.role || '').toLowerCase().trim();
  var loginInput = String(params.login || '').trim();
  var passwordInput = String(params.password || '').trim();

  if (!loginInput || !passwordInput) {
    return { success: false, error: 'Логін та пароль обов\'язкові' };
  }

  // ── Власник ──
  if (role === 'owner') {
    var ownData = getSheetData('Власник');
    for (var i = 0; i < ownData.data.length; i++) {
      var row = ownData.data[i];
      var rowLogin = String(row[OWN.LOGIN]).trim();
      var rowPwd = String(row[OWN.PASSWORD_HASH]).trim();
      var rowStatus = String(row[OWN.STATUS]).trim();

      if (rowLogin === loginInput) {
        if (rowStatus !== 'Активний') {
          logAccess(row[OWN.USER_ID], row[OWN.NAME], 'Власник', 'Вхід в систему', 'Заблоковано', 'Акаунт неактивний');
          return { success: false, error: 'Акаунт деактивовано' };
        }
        if (rowPwd === passwordInput) {
          logAccess(row[OWN.USER_ID], row[OWN.NAME], 'Власник', 'Вхід в систему', 'Успішно', '');
          updateLastActive('Власник', OWN.LAST_ACTIVE, loginInput, OWN.LOGIN);
          return {
            success: true,
            user: {
              name: String(row[OWN.NAME]).trim(),
              role: 'Власник',
              staffId: String(row[OWN.USER_ID]).trim()
            }
          };
        } else {
          logAccess(row[OWN.USER_ID], row[OWN.NAME], 'Власник', 'Невдала спроба входу', 'Помилка', 'Невірний пароль');
          return { success: false, error: 'Невірний пароль' };
        }
      }
    }
    logAccess('???', loginInput, 'Власник', 'Невдала спроба входу', 'Помилка', 'Логін не знайдено');
    return { success: false, error: 'Користувача не знайдено' };
  }

  // ── Менеджер / Водій ──
  if (role === 'manager' || role === 'driver') {
    var expectedRole = role === 'manager' ? 'Менеджер' : 'Водій';
    var stfData = getSheetData('Персонал');

    for (var j = 0; j < stfData.data.length; j++) {
      var srow = stfData.data[j];
      var sLogin = String(srow[STF.LOGIN]).trim();
      var sPwd = String(srow[STF.PASSWORD_HASH]).trim();
      var sRole = String(srow[STF.ROLE]).trim();
      var sStatus = String(srow[STF.STATUS]).trim();

      if (sLogin === loginInput) {
        // Перевірка ролі
        if (sRole !== expectedRole) {
          logAccess(srow[STF.STAFF_ID], srow[STF.NAME], sRole, 'Невдала спроба входу', 'Помилка', 'Невірна роль: обрано ' + expectedRole);
          return { success: false, error: 'Невірна роль. Ви зареєстровані як ' + sRole };
        }

        if (sStatus !== 'Активний') {
          logAccess(srow[STF.STAFF_ID], srow[STF.NAME], sRole, 'Вхід в систему', 'Заблоковано', 'Акаунт неактивний');
          return { success: false, error: 'Акаунт деактивовано' };
        }

        if (sPwd === passwordInput) {
          logAccess(srow[STF.STAFF_ID], srow[STF.NAME], sRole, 'Вхід в систему', 'Успішно', '');
          updateLastActive('Персонал', STF.LAST_ACTIVE, loginInput, STF.LOGIN);
          return {
            success: true,
            user: {
              name: String(srow[STF.NAME]).trim(),
              role: sRole,
              staffId: String(srow[STF.STAFF_ID]).trim()
            }
          };
        } else {
          logAccess(srow[STF.STAFF_ID], srow[STF.NAME], sRole, 'Невдала спроба входу', 'Помилка', 'Невірний пароль');
          return { success: false, error: 'Невірний пароль' };
        }
      }
    }

    logAccess('???', loginInput, expectedRole, 'Невдала спроба входу', 'Помилка', 'Логін не знайдено');
    return { success: false, error: 'Користувача не знайдено' };
  }

  return { success: false, error: 'Невідома роль: ' + role };
}

// ========================================
// Утиліта: згенерувати хеш для пароля (для адміна)
// Використання: =hashPassword("mypassword")
// ========================================
function generateHash(password) {
  return hashPassword(password);
}

// ========================================
// CRUD: Персонал
// ========================================
function handleGetStaff() {
  var d = getSheetData('Персонал');
  var staff = [];
  for (var i = 0; i < d.data.length; i++) {
    var r = d.data[i];
    staff.push({
      rowNum: i + 2,
      staffId: String(r[STF.STAFF_ID] || ''),
      name: String(r[STF.NAME] || ''),
      phone: String(r[STF.PHONE] || ''),
      email: String(r[STF.EMAIL] || ''),
      role: String(r[STF.ROLE] || ''),
      login: String(r[STF.LOGIN] || ''),
      password: String(r[STF.PASSWORD_HASH] || ''),
      city: String(r[STF.CITY] || ''),
      autoId: String(r[STF.AUTO_ID] || ''),
      autoNum: String(r[STF.AUTO_NUM] || ''),
      rate: String(r[STF.RATE] || ''),
      rateCur: String(r[STF.RATE_CUR] || ''),
      status: String(r[STF.STATUS] || ''),
      dateHired: String(r[STF.DATE_HIRED] || ''),
      lastActive: String(r[STF.LAST_ACTIVE] || ''),
      note: String(r[STF.NOTE] || '')
    });
  }
  return { success: true, staff: staff };
}

function handleAddStaff(params) {
  var s = params.staff || {};
  var ss = SpreadsheetApp.openById(CONFIG_SS_ID);
  var sh = ss.getSheetByName('Персонал');
  if (!sh) return { success: false, error: 'Аркуш не знайдено' };

  var now = Utilities.formatDate(new Date(), 'Europe/Kiev', 'dd.MM.yyyy');
  var staffId = 'STF-' + Utilities.formatDate(new Date(), 'Europe/Kiev', 'yyyyMMddHHmmss');

  var row = [];
  row[STF.STAFF_ID] = staffId;
  row[STF.NAME] = s.name || '';
  row[STF.PHONE] = s.phone || '';
  row[STF.EMAIL] = s.email || '';
  row[STF.ROLE] = s.role || 'Водій';
  row[STF.LOGIN] = s.login || '';
  row[STF.PASSWORD_HASH] = s.password || '';
  row[STF.CITY] = s.city || '';
  row[STF.AUTO_ID] = s.autoId || '';
  row[STF.AUTO_NUM] = s.autoNum || '';
  row[STF.RATE] = s.rate || '';
  row[STF.RATE_CUR] = s.rateCur || 'CHF';
  row[STF.STATUS] = s.status || 'Активний';
  row[STF.DATE_HIRED] = now;
  row[STF.LAST_ACTIVE] = '';
  row[STF.NOTE] = s.note || '';

  sh.appendRow(row);
  return { success: true, staffId: staffId };
}

function handleUpdateStaff(params) {
  var s = params.staff || {};
  var staffId = String(s.staffId || '');
  if (!staffId) return { success: false, error: 'staffId обов\'язковий' };

  var ss = SpreadsheetApp.openById(CONFIG_SS_ID);
  var sh = ss.getSheetByName('Персонал');
  if (!sh) return { success: false, error: 'Аркуш не знайдено' };

  var data = sh.getDataRange().getValues();
  var rowNum = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][STF.STAFF_ID]).trim() === staffId) {
      rowNum = i + 1;
      break;
    }
  }
  if (rowNum === -1) return { success: false, error: 'Співробітника не знайдено' };

  var lastCol = sh.getLastColumn();
  var range = sh.getRange(rowNum, 1, 1, lastCol);
  var vals = range.getValues()[0];

  vals[STF.NAME] = s.name || vals[STF.NAME];
  vals[STF.PHONE] = s.phone || vals[STF.PHONE];
  vals[STF.EMAIL] = s.email || vals[STF.EMAIL];
  vals[STF.ROLE] = s.role || vals[STF.ROLE];
  vals[STF.LOGIN] = s.login || vals[STF.LOGIN];
  if (s.password) vals[STF.PASSWORD_HASH] = s.password;
  vals[STF.CITY] = s.city || vals[STF.CITY];
  vals[STF.AUTO_ID] = s.autoId || vals[STF.AUTO_ID];
  vals[STF.AUTO_NUM] = s.autoNum || vals[STF.AUTO_NUM];
  vals[STF.RATE] = s.rate || vals[STF.RATE];
  vals[STF.RATE_CUR] = s.rateCur || vals[STF.RATE_CUR];
  vals[STF.STATUS] = s.status || vals[STF.STATUS];
  vals[STF.NOTE] = s.note !== undefined ? s.note : vals[STF.NOTE];

  range.setValues([vals]);
  return { success: true };
}

function handleDeleteStaff(params) {
  var staffId = String(params.staffId || '');
  if (!staffId) return { success: false, error: 'staffId обов\'язковий' };

  var ss = SpreadsheetApp.openById(CONFIG_SS_ID);
  var sh = ss.getSheetByName('Персонал');
  if (!sh) return { success: false, error: 'Аркуш не знайдено' };

  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][STF.STAFF_ID]).trim() === staffId) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Співробітника не знайдено' };
}

// ========================================
// READ: Лог доступів
// ========================================
function handleGetAccessLog() {
  var d = getSheetData('Лог доступів');
  var logs = [];
  for (var i = 0; i < d.data.length; i++) {
    var r = d.data[i];
    logs.push({
      logId: String(r[LOG.LOG_ID] || ''),
      userId: String(r[LOG.USER_ID] || ''),
      name: String(r[LOG.NAME] || ''),
      role: String(r[LOG.ROLE] || ''),
      action: String(r[LOG.ACTION] || ''),
      datetime: String(r[LOG.DATETIME] || ''),
      status: String(r[LOG.STATUS] || ''),
      note: String(r[LOG.NOTE] || '')
    });
  }
  return { success: true, logs: logs };
}

// ========================================
// CRUD: Доступи до маршрутів
// ========================================
var RTE_ACC = {
  ACCESS_ID: 0, STAFF_ID: 1, STAFF_NAME: 2, ROLE: 3,
  ROUTE: 4, RTE_ID: 5, DATE_FROM: 6, DATE_TO: 7,
  LEVEL: 8, GRANTED_BY: 9, DATE_GRANTED: 10, STATUS: 11, NOTE: 12
};

function handleGetRouteAccess() {
  var d = getSheetData('Маршрути_доступ');
  var access = [];
  for (var i = 0; i < d.data.length; i++) {
    var r = d.data[i];
    access.push({
      rowNum: i + 2,
      accessId: String(r[RTE_ACC.ACCESS_ID] || ''),
      staffId: String(r[RTE_ACC.STAFF_ID] || ''),
      staffName: String(r[RTE_ACC.STAFF_NAME] || ''),
      role: String(r[RTE_ACC.ROLE] || ''),
      route: String(r[RTE_ACC.ROUTE] || ''),
      rteId: String(r[RTE_ACC.RTE_ID] || ''),
      dateFrom: String(r[RTE_ACC.DATE_FROM] || ''),
      dateTo: String(r[RTE_ACC.DATE_TO] || ''),
      level: String(r[RTE_ACC.LEVEL] || ''),
      grantedBy: String(r[RTE_ACC.GRANTED_BY] || ''),
      dateGranted: String(r[RTE_ACC.DATE_GRANTED] || ''),
      status: String(r[RTE_ACC.STATUS] || ''),
      note: String(r[RTE_ACC.NOTE] || '')
    });
  }
  return { success: true, access: access };
}

function handleAddRouteAccess(params) {
  var a = params.access || {};
  var ss = SpreadsheetApp.openById(CONFIG_SS_ID);
  var sh = ss.getSheetByName('Маршрути_доступ');
  if (!sh) return { success: false, error: 'Аркуш не знайдено' };

  var now = Utilities.formatDate(new Date(), 'Europe/Kiev', 'dd.MM.yyyy HH:mm');
  var accessId = 'ACC-' + Utilities.formatDate(new Date(), 'Europe/Kiev', 'yyyyMMddHHmmss');

  var row = [];
  row[RTE_ACC.ACCESS_ID] = accessId;
  row[RTE_ACC.STAFF_ID] = '';
  row[RTE_ACC.STAFF_NAME] = a.staffName || '';
  row[RTE_ACC.ROLE] = a.role || 'Водій';
  row[RTE_ACC.ROUTE] = a.route || '';
  row[RTE_ACC.RTE_ID] = '';
  row[RTE_ACC.DATE_FROM] = now;
  row[RTE_ACC.DATE_TO] = '';
  row[RTE_ACC.LEVEL] = a.level || 'Читання';
  row[RTE_ACC.GRANTED_BY] = 'Власник';
  row[RTE_ACC.DATE_GRANTED] = now;
  row[RTE_ACC.STATUS] = a.status || 'Активний';
  row[RTE_ACC.NOTE] = a.note || '';

  sh.appendRow(row);
  return { success: true, accessId: accessId };
}

function handleDeleteRouteAccess(params) {
  var accessId = String(params.accessId || '');
  if (!accessId) return { success: false, error: 'accessId обов\'язковий' };

  var ss = SpreadsheetApp.openById(CONFIG_SS_ID);
  var sh = ss.getSheetByName('Маршрути_доступ');
  if (!sh) return { success: false, error: 'Аркуш не знайдено' };

  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][RTE_ACC.ACCESS_ID]).trim() === accessId) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Доступ не знайдено' };
}

// ========================================
// READ: Хто онлайн (на основі lastActive)
// ========================================
function handleGetOnlineUsers() {
  var d = getSheetData('Персонал');
  var users = [];
  var now = new Date().getTime();
  var ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 хвилин

  for (var i = 0; i < d.data.length; i++) {
    var r = d.data[i];
    var status = String(r[STF.STATUS] || '');
    if (status !== 'Активний') continue;

    var lastActiveStr = String(r[STF.LAST_ACTIVE] || '');
    var isOnline = false;

    if (lastActiveStr) {
      // Parse "dd.MM.yyyy HH:mm"
      var parts = lastActiveStr.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
      if (parts) {
        var lastDate = new Date(
          parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]),
          parseInt(parts[4]), parseInt(parts[5])
        );
        isOnline = (now - lastDate.getTime()) < ONLINE_THRESHOLD;
      }
    }

    users.push({
      staffId: String(r[STF.STAFF_ID] || ''),
      name: String(r[STF.NAME] || ''),
      role: String(r[STF.ROLE] || ''),
      lastActive: lastActiveStr,
      status: status,
      city: String(r[STF.CITY] || ''),
      isOnline: isOnline
    });
  }

  // Sort: online first, then by lastActive desc
  users.sort(function(a, b) {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return 0;
  });

  return { success: true, users: users };
}

// ========================================
// CORS + doPost / doGet
// ========================================
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond({ success: false, error: 'Invalid JSON' });
  }

  var action = String(body.action || '');
  var result;

  switch (action) {
    case 'login':
      result = handleLogin(body);
      break;

    case 'hashPassword':
      result = { success: true, hash: hashPassword(String(body.password || '')) };
      break;

    // Staff CRUD
    case 'getStaff':
      result = handleGetStaff();
      break;
    case 'addStaff':
      result = handleAddStaff(body);
      break;
    case 'updateStaff':
      result = handleUpdateStaff(body);
      break;
    case 'deleteStaff':
      result = handleDeleteStaff(body);
      break;

    // Access log
    case 'getAccessLog':
      result = handleGetAccessLog();
      break;

    // Route access CRUD
    case 'getRouteAccess':
      result = handleGetRouteAccess();
      break;
    case 'addRouteAccess':
      result = handleAddRouteAccess(body);
      break;
    case 'deleteRouteAccess':
      result = handleDeleteRouteAccess(body);
      break;

    // Online users
    case 'getOnlineUsers':
      result = handleGetOnlineUsers();
      break;

    default:
      result = { success: false, error: 'Unknown action: ' + action };
  }

  return respond(result);
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';

  if (action === 'ping') {
    return respond({ success: true, message: 'Config API is alive', timestamp: new Date().toISOString() });
  }

  return respond({ success: false, error: 'Use POST for API calls' });
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
