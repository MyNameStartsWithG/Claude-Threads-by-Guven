'use strict';
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ot = require('./lib/oturum');
const dil = require('./lib/dil');

const CALISIYOR_MS = 8000;   // session file this fresh => "working"
const SAKIN_MS = 4000;       // transcript is written once the file has been quiet this long
const TARAMA_MS = 3000;

function ayar(ad) {
  return vscode.workspace.getConfiguration('claudeThreads').get(ad);
}

function t(anahtar, ...degerler) {
  return dil.cevirmen(dil.dilKodu(ayar('language'), vscode.env.language))(anahtar, ...degerler);
}

function yerel() {
  return dil.dilKodu(ayar('language'), vscode.env.language) === 'tr' ? 'tr-TR' : vscode.env.language;
}

function kisalt(metin, n = 50) {
  if (!metin) return '';
  const tek = metin.replace(/\s+/g, ' ').trim();
  return tek.length > n ? tek.slice(0, n - 1) + '…' : tek;
}

function dosyaGuvenli(ad) {
  return ad.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'thread';
}

function kabukGuvenli(ad) {
  return '"' + ad.replace(/["`$%!\r\n]/g, '') + '"';
}

function goreli(ms) {
  const fark = Math.max(0, Date.now() - ms) / 1000;
  if (fark < 60) return t('justNow');
  if (fark < 3600) return t('minAgo', Math.floor(fark / 60));
  if (fark < 86400) return t('hAgo', Math.floor(fark / 3600));
  return t('dAgo', Math.floor(fark / 86400));
}

const ESKI_DURUM = 'durum.json';
const YENI_DURUM = 'threads.json';

class Yonetici {
  constructor(ctx) {
    this.ctx = ctx;
    this.terminaller = new Map();   // thread id -> Terminal
    this.sonAktarim = new Map();    // thread id -> exported mtime
    this.ozetler = new Map();       // id -> session summary
    this.imza = '';
    this.sonYazilan = '';
    this.durum = { threads: {} };
    this._olay = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._olay.event;
    this.yukle();
  }

  // ---------- folders and state ----------
  get ws() {
    const f = vscode.workspace.workspaceFolders;
    return f && f.length ? f[0].uri.fsPath : null;
  }
  get kok() { return path.join(this.ws, ayar('saveFolder') || '.claude-threads'); }

  // Existing state file wins (durum.json or threads.json); a new project gets the UI language's name.
  get durumDosyasi() {
    for (const ad of [ESKI_DURUM, YENI_DURUM]) {
      const yol = path.join(this.kok, ad);
      if (fs.existsSync(yol)) return yol;
    }
    return path.join(this.kok, t('stateFile'));
  }

  yukle() {
    this.durum = { threads: {} };
    if (!this.ws) return;
    let d = null;
    try { d = JSON.parse(fs.readFileSync(this.durumDosyasi, 'utf8')); } catch { /* first run */ }
    if (d && d.threads) this.durum.threads = d.threads;
    // Folder names are fixed per project once chosen, so switching language never splits the records.
    if (d && d.folders) this.durum.folders = d.folders;
    else if (d) this.durum.folders = { acik: 'acik', biten: 'biten' }; // created by v0.1.x
    else this.durum.folders = { acik: t('folderOpen'), biten: t('folderDone') };
  }

  diskOku() {
    try {
      const d = JSON.parse(fs.readFileSync(this.durumDosyasi, 'utf8'));
      return d && d.threads ? d.threads : {};
    } catch { return {}; }
  }

  klasor(durum) { return path.join(this.kok, this.durum.folders[durum]); }

  // Merge with disk before writing so threads added by another window (or by hand) are kept.
  kaydet() {
    fs.mkdirSync(this.klasor('acik'), { recursive: true });
    fs.mkdirSync(this.klasor('biten'), { recursive: true });
    const yol = this.durumDosyasi;
    for (const [id, th] of Object.entries(this.diskOku())) {
      if (!this.durum.threads[id]) this.durum.threads[id] = th;
    }
    const metin = JSON.stringify({ folders: this.durum.folders, threads: this.durum.threads }, null, 2);
    this.sonYazilan = metin;
    fs.writeFileSync(yol, metin, 'utf8');
  }

  // The state file changed outside this window: take the disk version as the truth.
  disaridanYukle() {
    let metin = '';
    try { metin = fs.readFileSync(this.durumDosyasi, 'utf8'); } catch { return; }
    if (metin === this.sonYazilan) return;
    const disk = this.diskOku();
    const yalnizBellekte = Object.fromEntries(Object.entries(this.durum.threads).filter(([id]) => !disk[id]));
    this.durum.threads = { ...yalnizBellekte, ...disk };
    this.terminalleriEslestir();
    this.yenile();
  }

  // ---------- list ----------
  tara() {
    this.ozetler = new Map(this.ws ? ot.oturumlar(this.ws).map((o) => [o.id, o]) : []);
  }

  adi(th) {
    const o = this.ozetler.get(th.id);
    return th.ad || (o && (o.baslik || kisalt(o.ilkMesaj))) || t('newThreadDefault');
  }

  calisiyor(id) {
    const o = this.ozetler.get(id);
    return !!(o && this.terminaller.has(id) && Date.now() - o.degisti < CALISIYOR_MS);
  }

  liste(durum) {
    const sonuc = Object.values(this.durum.threads).filter((th) => th.durum === durum);
    if (durum === 'biten' && ayar('showUntracked')) {
      for (const o of this.ozetler.values()) {
        if (this.durum.threads[o.id]) continue;
        if (!o.ilkMesaj && !o.baslik) continue;
        sonuc.push({ id: o.id, durum: 'biten', izsiz: true });
      }
    }
    const zamani = (th) => (this.ozetler.get(th.id) || {}).degisti || Date.parse(th.olusturma || 0) || 0;
    return sonuc.sort((a, b) => zamani(b) - zamani(a));
  }

  bul(arg) {
    const id = arg && (arg.id || (arg.t && arg.t.id));
    if (!id) return null;
    if (this.durum.threads[id]) return this.durum.threads[id];
    if (this.ozetler.has(id)) return { id, durum: 'biten', izsiz: true };
    return null;
  }

  // Start tracking a session that was created outside the extension.
  sahiplen(th) {
    if (!th.izsiz) return th;
    const o = this.ozetler.get(th.id) || {};
    const yeni = { id: th.id, ad: this.adi(th), durum: th.durum, olusturma: o.baslangic || new Date().toISOString() };
    this.durum.threads[th.id] = yeni;
    return yeni;
  }

  // ---------- TreeDataProvider ----------
  getTreeItem(el) { return el.item; }

  getChildren(el) {
    if (!this.ws) return [];
    if (!el) {
      return ['acik', 'biten'].map((d) => {
        const n = this.liste(d).length;
        const item = new vscode.TreeItem(
          d === 'acik' ? t('groupOpen', n) : t('groupDone', n),
          d === 'acik' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
        );
        item.id = 'grup-' + d;
        item.iconPath = new vscode.ThemeIcon(d === 'acik' ? 'circle-large-filled' : 'archive');
        item.contextValue = 'grup';
        return { grup: d, item };
      });
    }
    if (el.grup) return this.liste(el.grup).map((th) => this.dugum(th));
    return [];
  }

  dugum(th) {
    const o = this.ozetler.get(th.id);
    const item = new vscode.TreeItem(this.adi(th), vscode.TreeItemCollapsibleState.None);
    item.id = 'thread-' + th.id;
    const parcalar = [];
    if (th.durum === 'acik') {
      if (this.calisiyor(th.id)) { item.iconPath = new vscode.ThemeIcon('sync~spin'); parcalar.push(t('working')); }
      else if (this.terminaller.has(th.id)) { item.iconPath = new vscode.ThemeIcon('terminal'); parcalar.push(t('open')); }
      else { item.iconPath = new vscode.ThemeIcon('circle-outline'); parcalar.push(t('idle')); }
    } else {
      item.iconPath = new vscode.ThemeIcon(th.izsiz ? 'history' : 'pass');
    }
    if (o) parcalar.push(goreli(o.degisti));
    item.description = parcalar.join(' · ');
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${this.adi(th)}**\n\n`);
    if (o && o.ilkMesaj) md.appendText(kisalt(o.ilkMesaj, 300) + '\n\n');
    md.appendMarkdown(`\`${th.id}\``);
    if (th.izsiz) md.appendMarkdown('\n\n' + t('untrackedTip'));
    item.tooltip = md;
    item.contextValue = th.durum === 'acik' ? 'thread-acik' : 'thread-biten';
    item.command = { command: 'claudeThreads.open', title: 'Open', arguments: [{ id: th.id }] };
    return { t: th, item };
  }

  yenile() {
    this.tara();
    this._olay.fire();
  }

  // ---------- terminals ----------
  terminalAdi(th) { return `🧵 ${this.adi(th)} [${th.id.slice(0, 8)}]`; }

  // Bind terminals to threads: by the [id8] suffix in the tab name, else by the shell PID
  // stored in the state file (how terminals opened before the extension are adopted).
  async terminalleriEslestir() {
    const threadler = Object.values(this.durum.threads);
    for (const term of vscode.window.terminals) {
      if ([...this.terminaller.values()].includes(term)) continue;
      const m = /\[([0-9a-f]{8})\]$/.exec(term.name);
      let th = m ? threadler.find((x) => x.id.startsWith(m[1])) : null;
      if (!th) {
        let pid;
        try { pid = await term.processId; } catch { pid = undefined; }
        if (pid) th = threadler.find((x) => x.kabukPid === pid);
      }
      if (th && !this.terminaller.has(th.id)) this.terminaller.set(th.id, term);
    }
    this._olay.fire();
  }

  terminalAc(th, yeni) {
    const varolan = this.terminaller.get(th.id);
    if (varolan) { varolan.show(); return; }
    const konum = ayar('terminalLocation') === 'panel'
      ? vscode.TerminalLocation.Panel
      : vscode.TerminalLocation.Editor;
    const term = vscode.window.createTerminal({
      name: this.terminalAdi(th),
      cwd: this.ws,
      location: konum,
      iconPath: new vscode.ThemeIcon('comment-discussion'),
      env: { CLAUDE_THREAD_ID: th.id },
    });
    this.terminaller.set(th.id, term);
    const komut = [
      ayar('claudeCommand') || 'claude',
      yeni ? `--session-id ${th.id} -n ${kabukGuvenli(th.ad)}` : `--resume ${th.id}`,
      ayar('extraArgs') || '',
    ].filter(Boolean).join(' ');
    term.sendText(komut, true);
    term.show();
    this._olay.fire();
  }

  // ---------- transcripts (.md) ----------
  mdYolu(th, durum) {
    if (!th.dosyaAdi) {
      const tarih = (th.olusturma || new Date().toISOString()).slice(0, 10);
      th.dosyaAdi = `${tarih} ${dosyaGuvenli(this.adi(th))} [${th.id.slice(0, 8)}].md`;
    }
    return path.join(this.klasor(durum || th.durum), th.dosyaAdi);
  }

  aktar(th) {
    const o = this.ozetler.get(th.id);
    if (!o) return false;
    const hedef = this.mdYolu(th);
    const diger = this.mdYolu(th, th.durum === 'acik' ? 'biten' : 'acik');
    fs.mkdirSync(path.dirname(hedef), { recursive: true });
    fs.writeFileSync(hedef, ot.dokum(o.dosya, { ...th, ad: this.adi(th) }, t, yerel()), 'utf8');
    if (fs.existsSync(diger)) fs.unlinkSync(diger);
    this.sonAktarim.set(th.id, o.degisti);
    return true;
  }

  // ---------- periodic scan ----------
  tik() {
    if (!this.ws) return;
    this.tara();
    let degisti = false;
    for (const th of Object.values(this.durum.threads)) {
      if (th.durum !== 'acik') continue;
      const o = this.ozetler.get(th.id);
      if (!o || this.sonAktarim.get(th.id) === o.degisti) continue;
      if (Date.now() - o.degisti < SAKIN_MS) continue;
      try { this.aktar(th); degisti = true; } catch (e) { console.error('[claude-threads] export', e); }
    }
    if (degisti) this.kaydet();
    const imza = [...this.ozetler.values()].map((o) => o.id + ':' + o.degisti).sort().join('|')
      + '#' + [...this.terminaller.keys()].map((id) => id + (this.calisiyor(id) ? '*' : '')).join(',');
    if (imza !== this.imza) { this.imza = imza; this._olay.fire(); }
  }

  // ---------- commands ----------
  async yeni() {
    if (!this.ws) return vscode.window.showWarningMessage(t('openFolderFirst'));
    const sayi = Object.keys(this.durum.threads).length + 1;
    const ad = await vscode.window.showInputBox({
      title: t('newThreadTitle'),
      prompt: t('threadName'),
      value: t('threadN', sayi),
      validateInput: (v) => (v.trim() ? null : t('nameEmpty')),
    });
    if (ad === undefined) return;
    const th = { id: crypto.randomUUID(), ad: ad.trim(), durum: 'acik', olusturma: new Date().toISOString() };
    this.durum.threads[th.id] = th;
    this.kaydet();
    this.terminalAc(th, true);
    this.yenile();
  }

  async ac(arg) {
    const th = this.bul(arg);
    if (!th) return;
    if (th.durum === 'acik') return this.terminalAc(th, false);
    // Done: show the transcript; "Reopen" brings the terminal back.
    return this.dokumGoster(arg);
  }

  async kapat(arg) {
    const th = this.bul(arg);
    if (!th || th.durum !== 'acik') return;
    if (this.calisiyor(th.id)) {
      const c = await vscode.window.showWarningMessage(t('stillWorking', this.adi(th)), { modal: true }, t('closeAnyway'));
      if (c !== t('closeAnyway')) return;
    }
    const term = this.terminaller.get(th.id);
    this.terminaller.delete(th.id);
    if (term) term.dispose();
    delete th.kabukPid;
    th.durum = 'biten';
    th.kapanis = new Date().toISOString();
    this.tara();
    try { this.aktar(th); } catch (e) { console.error('[claude-threads] export', e); }
    this.kaydet();
    this.yenile();
    vscode.window.setStatusBarMessage(`✅ ${t('movedToDone', this.adi(th))}`, 4000);
  }

  async aktifiKapat() {
    const aktif = vscode.window.activeTerminal;
    const kayit = [...this.terminaller].find(([, term]) => term === aktif);
    if (!kayit) return vscode.window.showInformationMessage(t('notAThread'));
    return this.kapat({ id: kayit[0] });
  }

  async yenidenAc(arg) {
    let th = this.bul(arg);
    if (!th) return;
    th = this.sahiplen(th);
    th.durum = 'acik';
    delete th.kapanis;
    try { this.aktar(th); } catch { /* no session file yet: fine */ }
    this.kaydet();
    this.terminalAc(th, false);
    this.yenile();
  }

  async yenidenAdlandir(arg) {
    let th = this.bul(arg);
    if (!th) return;
    const ad = await vscode.window.showInputBox({
      title: t('threadName'),
      value: this.adi(th),
      validateInput: (v) => (v.trim() ? null : t('nameEmpty')),
    });
    if (!ad) return;
    th = this.sahiplen(th);
    const eskiYol = th.dosyaAdi ? this.mdYolu(th) : null;
    th.ad = ad.trim();
    if (eskiYol) {
      delete th.dosyaAdi;
      const yeniYol = this.mdYolu(th);
      if (fs.existsSync(eskiYol)) fs.renameSync(eskiYol, yeniYol);
    }
    const term = this.terminaller.get(th.id);
    if (term) {
      term.show();
      await vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', { name: this.terminalAdi(th) });
    }
    this.kaydet();
    this.yenile();
  }

  async dokumGoster(arg) {
    let th = this.bul(arg);
    if (!th) return;
    th = this.sahiplen(th);
    try { this.tara(); this.aktar(th); } catch (e) { console.error('[claude-threads] export', e); }
    this.kaydet();
    const yol = this.mdYolu(th);
    if (!fs.existsSync(yol)) return vscode.window.showInformationMessage(t('noMessagesYet'));
    await vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(yol));
    this.yenile();
  }

  async gec() {
    this.tara();
    const ogeler = [];
    const ekle = (th, aciklama) => ogeler.push({
      label: `${th.durum === 'acik' ? (this.terminaller.has(th.id) ? '$(terminal)' : '$(circle-outline)') : '$(pass)'} ${this.adi(th)}`,
      description: aciklama,
      id: th.id,
    });
    ogeler.push({ label: `$(add) ${t('pickNew')}`, yeni: true });
    const acik = this.liste('acik');
    if (acik.length) ogeler.push({ label: t('pickOpen'), kind: vscode.QuickPickItemKind.Separator });
    for (const th of acik) ekle(th, this.calisiyor(th.id) ? t('working') : '');
    const biten = this.liste('biten').slice(0, 30);
    if (biten.length) ogeler.push({ label: t('pickDone'), kind: vscode.QuickPickItemKind.Separator });
    for (const th of biten) ekle(th, goreli((this.ozetler.get(th.id) || {}).degisti || Date.now()));
    const secim = await vscode.window.showQuickPick(ogeler, { title: t('pickTitle'), placeHolder: t('pickPlaceholder'), matchOnDescription: true });
    if (!secim) return;
    if (secim.yeni) return this.yeni();
    const th = this.bul({ id: secim.id });
    return th.durum === 'acik' ? this.terminalAc(th, false) : this.yenidenAc({ id: th.id });
  }

  kayitKlasoru() {
    if (!this.ws) return;
    this.kaydet();
    vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(this.durumDosyasi));
  }
}

function activate(ctx) {
  const y = new Yonetici(ctx);
  y.tara();
  y.terminalleriEslestir();

  const gorunum = vscode.window.createTreeView('claudeThreads.list', { treeDataProvider: y, showCollapseAll: false });
  const komut = (ad, fn) => ctx.subscriptions.push(vscode.commands.registerCommand(ad, (...a) => fn.apply(y, a)));

  komut('claudeThreads.new', y.yeni);
  komut('claudeThreads.switch', y.gec);
  komut('claudeThreads.closeCurrent', y.aktifiKapat);
  komut('claudeThreads.refresh', y.yenile);
  komut('claudeThreads.openFolder', y.kayitKlasoru);
  komut('claudeThreads.open', y.ac);
  komut('claudeThreads.close', y.kapat);
  komut('claudeThreads.reopen', y.yenidenAc);
  komut('claudeThreads.rename', y.yenidenAdlandir);
  komut('claudeThreads.showTranscript', y.dokumGoster);

  // Watch the state file so hand edits / other windows are picked up.
  const izleyiciKur = () => {
    if (!y.ws) return null;
    const desen = new vscode.RelativePattern(y.ws, `${ayar('saveFolder') || '.claude-threads'}/{${ESKI_DURUM},${YENI_DURUM}}`);
    const iz = vscode.workspace.createFileSystemWatcher(desen);
    iz.onDidChange(() => y.disaridanYukle());
    iz.onDidCreate(() => y.disaridanYukle());
    return iz;
  };
  let izleyici = izleyiciKur();

  ctx.subscriptions.push(
    gorunum,
    vscode.window.onDidCloseTerminal((term) => {
      let kaydet = false;
      for (const [id, tm] of y.terminaller) {
        if (tm !== term) continue;
        y.terminaller.delete(id);
        const th = y.durum.threads[id];
        if (th && th.kabukPid) { delete th.kabukPid; kaydet = true; } // PIDs get reused; don't keep stale ones
      }
      if (kaydet) y.kaydet();
      y._olay.fire();
    }),
    vscode.window.onDidOpenTerminal(() => { y.terminalleriEslestir(); }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (izleyici) izleyici.dispose();
      izleyici = izleyiciKur();
      y.yukle();
      y.terminalleriEslestir();
      y.yenile();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => { if (e.affectsConfiguration('claudeThreads')) y.yenile(); }),
    { dispose: () => { if (izleyici) izleyici.dispose(); } }
  );

  const zamanlayici = setInterval(() => { try { y.tik(); } catch (e) { console.error('[claude-threads]', e); } }, TARAMA_MS);
  ctx.subscriptions.push({ dispose: () => clearInterval(zamanlayici) });
}

function deactivate() {}

module.exports = { activate, deactivate };
