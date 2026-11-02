// Runtime strings (English + Turkish). Command titles live in package.nls*.json.
'use strict';

const METINLER = {
  en: {
    groupOpen: 'Open ({0})',
    groupDone: 'Done ({0})',
    working: 'working',
    open: 'open',
    idle: 'idle',
    justNow: 'just now',
    minAgo: '{0} min ago',
    hAgo: '{0} h ago',
    dAgo: '{0} d ago',
    untrackedTip: '_Session started outside this extension_',
    newThreadDefault: 'New thread',
    threadN: 'Thread {0}',
    newThreadTitle: 'New Claude thread',
    threadName: 'Thread name',
    nameEmpty: 'Name cannot be empty',
    openFolderFirst: 'Open a project folder first.',
    stillWorking: '"{0}" is working right now. Closing it will interrupt the reply.',
    closeAnyway: 'Close anyway',
    movedToDone: '"{0}" moved to Done',
    notAThread: 'The active terminal is not a Claude thread.',
    noMessagesYet: 'This thread has no messages yet.',
    pickTitle: 'Claude threads',
    pickPlaceholder: 'Pick a thread…',
    pickNew: 'New thread',
    pickOpen: 'Open',
    pickDone: 'Done (selecting reopens it)',
    tStatus: 'Status',
    tOpen: 'Open',
    tDone: 'Done',
    tSession: 'Session ID',
    tStarted: 'Started',
    tLast: 'Last activity',
    tClosed: 'Closed',
    tResume: 'Resume',
    tYou: 'You',
    tClaude: 'Claude',
    tTools: 'Tools',
    folderOpen: 'open',
    folderDone: 'done',
    stateFile: 'threads.json',
  },
  tr: {
    groupOpen: 'Açık ({0})',
    groupDone: 'Biten ({0})',
    working: 'çalışıyor',
    open: 'açık',
    idle: 'beklemede',
    justNow: 'az önce',
    minAgo: '{0} dk önce',
    hAgo: '{0} sa önce',
    dAgo: '{0} gün önce',
    untrackedTip: '_Eklenti dışında başlatılmış oturum_',
    newThreadDefault: 'Yeni thread',
    threadN: 'Thread {0}',
    newThreadTitle: 'Yeni Claude thread',
    threadName: 'Thread adı',
    nameEmpty: 'Ad boş olamaz',
    openFolderFirst: 'Önce bir proje klasörü aç.',
    stillWorking: '"{0}" şu an çalışıyor. Kapatırsan cevap yarıda kesilir.',
    closeAnyway: 'Yine de kapat',
    movedToDone: '"{0}" Biten\'e taşındı',
    notAThread: 'Aktif terminal bir Claude thread\'i değil.',
    noMessagesYet: 'Bu thread\'de henüz mesaj yok.',
    pickTitle: 'Claude thread\'leri',
    pickPlaceholder: 'Thread seç…',
    pickNew: 'Yeni thread',
    pickOpen: 'Açık',
    pickDone: 'Biten (seçince yeniden açılır)',
    tStatus: 'Durum',
    tOpen: 'Açık',
    tDone: 'Biten',
    tSession: 'Oturum ID',
    tStarted: 'Başladı',
    tLast: 'Son etkinlik',
    tClosed: 'Kapatıldı',
    tResume: 'Devam ettir',
    tYou: 'Sen',
    tClaude: 'Claude',
    tTools: 'Araçlar',
    folderOpen: 'acik',
    folderDone: 'biten',
    stateFile: 'durum.json',
  },
};

// setting: 'auto' | 'en' | 'tr'; uiLanguage: vscode.env.language (e.g. 'tr', 'en-us')
function dilKodu(setting, uiLanguage) {
  if (setting === 'en' || setting === 'tr') return setting;
  return String(uiLanguage || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

function cevirmen(kod) {
  const tablo = METINLER[kod] || METINLER.en;
  return (anahtar, ...degerler) => {
    const sablon = tablo[anahtar] !== undefined ? tablo[anahtar] : (METINLER.en[anahtar] || anahtar);
    return sablon.replace(/\{(\d+)\}/g, (_, i) => String(degerler[Number(i)]));
  };
}

module.exports = { METINLER, dilKodu, cevirmen };
