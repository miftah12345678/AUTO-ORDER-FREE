// test/run-tests.js (Free / Open Source Edition)
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const AdmZip = require('adm-zip');

const rootDir = path.resolve(__dirname, '..');
const { loadEnv } = require(path.join(rootDir, 'function', 'env'));
const Database = require(path.join(rootDir, 'function', 'database'));
const veyra = require(path.join(rootDir, 'function', 'veyra'));
const features = require(path.join(rootDir, 'function', 'features'));
const forcesub = require(path.join(rootDir, 'function', 'forcesub'));
const guides = require(path.join(rootDir, 'function', 'guides'));

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('Syntax check semua file .js di AUTO-ORDER-FREE', () => {
    const files = [
        'ham.js', 'setting.js', 'main.js', 'index.js', 'ecosystem.config.js',
        'function/env.js', 'function/database.js', 'function/veyra.js',
        'function/features.js', 'function/forcesub.js', 'function/guides.js',
        'function/myfunc.js', 'function/respon-testi.js'
    ];
    for (const rel of files) {
        const full = path.join(rootDir, rel);
        assert.ok(fs.existsSync(full), `Missing file: ${rel}`);
        execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
    }
    // Pastikan tidak ada file rahasia .env atau modul Pro (smscode/nokos)
    assert.ok(!fs.existsSync(path.join(rootDir, '.env')), '.env rahasia TIDAK BOLEH ada di repo Open Source!');
    assert.ok(!fs.existsSync(path.join(rootDir, 'function', 'smscode.js')), 'smscode.js khusus versi Pro!');
    assert.ok(!fs.existsSync(path.join(rootDir, 'function', 'nokos-handler.js')), 'nokos-handler.js khusus versi Pro!');
});

test('.env loader & Database SQLite auto-migrasi dari JSON', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'free-db-'));
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'FREE_TEST_KEY=hello\n', 'utf8');
    assert.strictEqual(loadEnv(envFile).FREE_TEST_KEY, 'hello');

    const jsonPath = path.join(tmpDir, 'database.json');
    fs.writeFileSync(jsonPath, JSON.stringify({ user: [{ id: '1', balance: 5000 }] }), 'utf8');
    const db1 = new Database(jsonPath, null, 2);
    assert.strictEqual(db1.data.user[0].balance, 5000);
    db1.data.user[0].balance = 9000;
    db1.close();

    const db2 = new Database(jsonPath, null, 2);
    assert.strictEqual(db2.data.user[0].balance, 9000);
    db2.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Veyra Pay Full API helpers (HMAC signature, status, & validasi withdraw PIN)', async () => {
    const raw = JSON.stringify({ ref: 'INV1', status: 'SUCCESS' });
    const sig = crypto.createHmac('sha256', 'sec').update(raw).digest('hex');
    assert.strictEqual(veyra.verifyWebhookSignature(raw, sig, 'sec'), true);
    assert.strictEqual(veyra.verifyWebhookSignature(raw, 'bad', 'sec'), false);
    assert.strictEqual(veyra.normalizeStatus({ data: { status: 'canceled' } }), 'CANCELED');
    assert.strictEqual((await veyra.createWithdraw({ method: 'dana', nomor: '0812345678', amount: 10000, pin: '' })).success, false);
});

test('Force Subscribe real-time + micro-cache 15 detik + deteksi keluar', async () => {
    global.FORCE_SUB_ENABLED = true;
    global.FORCE_SUB_CHANNEL_ENABLED = true;
    global.FORCE_SUB_CHANNEL = '@channel_test';
    global.FORCE_SUB_CHANNEL_URL = 'https://t.me/channel_test';
    global.FORCE_SUB_GROUP_ENABLED = false;
    forcesub.clearMembershipCache();

    let status = 'left';
    const tg = { getChatMember: async () => ({ status }) };
    assert.strictEqual((await forcesub.checkUserMembership(tg, '1', {})).allowed, false);
    status = 'member';
    assert.strictEqual((await forcesub.checkUserMembership(tg, '1', {}, { bypassCache: true })).allowed, true);
    status = 'left';
    assert.strictEqual((await forcesub.checkUserMembership(tg, '1', {}, { bypassCache: true })).allowed, false);
});

test('Promo dasar, Profil User, Validasi Owner, Panduan Free, & Backup adm-zip', () => {
    global.OWNER_ID = '111';
    assert.strictEqual(features.isOwnerUser('111', 'any'), true);
    assert.strictEqual(features.isOwnerUser('222', 'other'), false);

    const p = features.validateAndApplyPromo({ type: 'persen', value: 10, uses_left: 2, max_discount: 5000 }, 100000);
    assert.strictEqual(p.valid, true);
    assert.strictEqual(p.discount, 5000);

    assert.strictEqual(guides.getUserGuideMenu('1').buttons.length, 3);
    assert.strictEqual(guides.getAdminGuideMenu('1').buttons.length, 4);

    const zipOut = path.join(os.tmpdir(), `free-backup-${Date.now()}.zip`);
    features.createBackupZip(rootDir, zipOut);
    const names = new AdmZip(zipOut).getEntries().map(e => e.entryName);
    assert.ok(names.includes('main.js'));
    assert.ok(!names.some(n => n === '.env'));
    fs.unlinkSync(zipOut);
});

(async () => {
    console.log('\n=== AUTOMATED TEST SUITE: AUTO-ORDER-FREE (OPEN SOURCE) ===\n');
    let passed = 0, failed = 0;
    for (const t of tests) {
        try { await t.fn(); console.log(`  [PASS] ${t.name}`); passed++; }
        catch (e) { console.error(`  [FAIL] ${t.name}\n         ${e.stack || e.message}`); failed++; }
    }
    console.log(`\n=== HASIL: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed > 0) process.exit(1);
})();
