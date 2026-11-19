// function/veyra.js
// Client H2H API untuk Veyra Pay (https://pay.veyra.id)

const axios = require('axios');
const crypto = require('crypto');

function getBaseUrl() {
    return (global.veyraBaseUrl || 'https://pay.veyra.id').replace(/\/+$/, '');
}

function getApiKey() {
    return global.apikeyVeyra || '';
}

function buildHeaders(extraHeaders = {}) {
    return {
        'x-api-key': getApiKey(),
        'Content-Type': 'application/json',
        ...extraHeaders
    };
}

function extractErrorMessage(error) {
    if (error.response && error.response.data) {
        const data = error.response.data;
        if (typeof data === 'string') return data;
        return data.message || data.error || `HTTP ${error.response.status}`;
    }
    return error.message || 'Terjadi kesalahan koneksi ke Veyra Pay';
}

/**
 * Normalisasi status transaksi Veyra Pay ke huruf kapital.
 * Menangani variasi format response (root-level atau nested di .data).
 */
function normalizeStatus(payload) {
    const raw =
        (payload && typeof payload.status === 'string' && payload.status) ||
        (payload && payload.data && typeof payload.data.status === 'string' && payload.data.status) ||
        '';
    return raw.trim().toUpperCase();
}

/**
 * 1. Membuat Transaksi Deposit QRIS
 * POST /api/deposit
 * Headers: x-api-key, Idempotency-Key (wajib)
 * Body: { amount, custom_fee? }
 */
async function createDeposit(amount, options = {}) {
    const numericAmount = Math.round(Number(amount));
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
        return { success: false, message: 'Nominal deposit tidak valid.' };
    }

    const idempotencyKey =
        options.idempotencyKey ||
        `req_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const body = { amount: numericAmount };
    if (options.custom_fee !== undefined && options.custom_fee !== null) {
        body.custom_fee = Number(options.custom_fee);
    }

    try {
        const response = await axios.post(`${getBaseUrl()}/api/deposit`, body, {
            headers: buildHeaders({ 'Idempotency-Key': idempotencyKey }),
            timeout: 20000
        });

        const resData = response.data || {};
        const trxData = resData.data || resData;

        if (resData.success === false || !trxData || !trxData.ref) {
            return {
                success: false,
                message: resData.message || 'Gagal membuat transaksi QRIS di Veyra Pay.',
                raw: resData
            };
        }

        return {
            success: true,
            message: resData.message || 'Deposit berhasil dibuat',
            data: {
                ref: trxData.ref,
                amount: Number(trxData.amount ?? numericAmount),
                total: Number(trxData.total ?? trxData.amount ?? numericAmount),
                fee: Number(trxData.fee ?? 0),
                qr_image: trxData.qr_image || null,
                qr_string: trxData.qr_string || null,
                status: normalizeStatus(trxData) || 'PENDING',
                created_at: trxData.created_at || null,
                expired: trxData.expired || trxData.expired_at || null
            },
            raw: resData
        };
    } catch (error) {
        return {
            success: false,
            statusCode: error.response?.status || null,
            message: extractErrorMessage(error),
            raw: error.response?.data || null
        };
    }
}

/**
 * 2. Mengecek Status Deposit QRIS
 * GET /api/deposit/:ref
 */
async function checkDepositStatus(ref) {
    if (!ref) {
        return { success: false, status: '', message: 'Reference ID kosong.' };
    }

    try {
        const response = await axios.get(
            `${getBaseUrl()}/api/deposit/${encodeURIComponent(ref)}`,
            {
                headers: buildHeaders(),
                timeout: 15000
            }
        );

        const resData = response.data || {};
        const trxData = resData.data && typeof resData.data === 'object' ? resData.data : resData;
        const status = normalizeStatus(resData);

        return {
            success: true,
            ref: trxData.ref || ref,
            amount: Number(trxData.amount ?? 0),
            total: Number(trxData.total ?? trxData.amount ?? 0),
            type: trxData.type || 'deposit',
            status,
            raw: resData
        };
    } catch (error) {
        return {
            success: false,
            statusCode: error.response?.status || null,
            status: '',
            message: extractErrorMessage(error),
            raw: error.response?.data || null
        };
    }
}

/**
 * 3. Membatalkan Deposit QRIS Pending
 * POST /api/deposit/:ref/cancel (fallback ke DELETE /api/deposit/:ref jika 404/405)
 */
async function cancelDeposit(ref) {
    if (!ref) {
        return { success: false, message: 'Reference ID kosong.' };
    }

    const encodedRef = encodeURIComponent(ref);
    try {
        const response = await axios.post(
            `${getBaseUrl()}/api/deposit/${encodedRef}/cancel`,
            {},
            {
                headers: buildHeaders(),
                timeout: 15000
            }
        );

        const resData = response.data || {};
        return {
            success: resData.success !== false,
            message: resData.message || 'Transaksi berhasil dibatalkan',
            data: resData.data || null,
            raw: resData
        };
    } catch (error) {
        const status = error.response?.status;
        if (status === 404 || status === 405) {
            try {
                const delRes = await axios.delete(
                    `${getBaseUrl()}/api/deposit/${encodedRef}`,
                    {
                        headers: buildHeaders(),
                        timeout: 15000
                    }
                );
                const delData = delRes.data || {};
                return {
                    success: delData.success !== false,
                    message: delData.message || 'Transaksi berhasil dibatalkan',
                    data: delData.data || null,
                    raw: delData
                };
            } catch (delErr) {
                return {
                    success: false,
                    statusCode: delErr.response?.status || null,
                    message: extractErrorMessage(delErr),
                    raw: delErr.response?.data || null
                };
            }
        }
        return {
            success: false,
            statusCode: status || null,
            message: extractErrorMessage(error),
            raw: error.response?.data || null
        };
    }
}

/**
 * 4. Cek Profil & Saldo Merchant
 * GET /api/user/me
 */
async function getProfile() {
    try {
        const response = await axios.get(`${getBaseUrl()}/api/user/me`, {
            headers: buildHeaders(),
            timeout: 15000
        });
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            statusCode: error.response?.status || null,
            message: extractErrorMessage(error)
        };
    }
}

/**
 * 5. Riwayat Transaksi Merchant
 * GET /api/user/transactions
 */
async function getTransactions() {
    try {
        const response = await axios.get(`${getBaseUrl()}/api/user/transactions`, {
            headers: buildHeaders(),
            timeout: 15000
        });
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            statusCode: error.response?.status || null,
            message: extractErrorMessage(error)
        };
    }
}

/**
 * 6. Withdraw (Tarik Dana ke E-Wallet atau Rekening Bank)
 * POST /api/withdraw
 * Headers: x-api-key, Content-Type: application/json, Idempotency-Key
 * Body: { method, nomor, amount, pin }
 */
async function createWithdraw(params) {
    // Mendukung pemanggilan objek { method, nomor, amount, pin, idempotencyKey }
    const opts = (params && typeof params === 'object') ? params : { amount: params };
    const method = String(opts.method || '').trim().toLowerCase();
    const nomor = String(opts.nomor || '').trim();
    const numericAmount = Math.round(Number(opts.amount));
    const pin = String(opts.pin || global.veyraWdPin || '').trim();

    if (!method) {
        return { success: false, message: 'Metode pencairan wajib diisi (contoh: dana, gopay, ovo, shopeepay, seabank, bca, bri, bni, mandiri).' };
    }
    if (!nomor || !/^[0-9]{6,25}$/.test(nomor)) {
        return { success: false, message: 'Nomor e-Wallet / rekening tujuan tidak valid (hanya angka 6-25 digit).' };
    }
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
        return { success: false, message: 'Nominal penarikan tidak valid.' };
    }
    if (!pin) {
        return { success: false, message: 'PIN Keamanan Veyra Pay wajib diisi.' };
    }

    const idempotencyKey =
        opts.idempotencyKey ||
        `wd_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    try {
        const response = await axios.post(
            `${getBaseUrl()}/api/withdraw`,
            {
                method,
                nomor,
                amount: numericAmount,
                pin
            },
            {
                headers: buildHeaders({ 'Idempotency-Key': idempotencyKey }),
                timeout: 25000
            }
        );
        const resData = response.data || {};
        return {
            success: resData.success !== false,
            message: resData.message || 'Permintaan withdraw berhasil diproses',
            data: resData.data || resData,
            raw: resData
        };
    } catch (error) {
        return {
            success: false,
            statusCode: error.response?.status || null,
            message: extractErrorMessage(error),
            raw: error.response?.data || null
        };
    }
}

/**
 * 7. Set Custom Kode Unik (Khusus VIP Veyra Pay)
 * POST /api/user/custom-unik
 * Body: { min, max } (1 <= min < max <= 999)
 */
async function setCustomUniqueRange(min, max) {
    const minVal = Math.floor(Number(min));
    const maxVal = Math.floor(Number(max));
    if (isNaN(minVal) || isNaN(maxVal) || minVal < 1 || maxVal > 999 || maxVal <= minVal) {
        return {
            success: false,
            message: 'Rentang tidak valid. Pastikan 1 <= min < max <= 999.'
        };
    }

    try {
        const response = await axios.post(
            `${getBaseUrl()}/api/user/custom-unik`,
            { min: minVal, max: maxVal },
            {
                headers: buildHeaders(),
                timeout: 15000
            }
        );
        const resData = response.data || {};
        return {
            success: resData.success !== false,
            message: resData.message || 'Pengaturan rentang kode unik berhasil disimpan!',
            raw: resData
        };
    } catch (error) {
        return {
            success: false,
            statusCode: error.response?.status || null,
            message: extractErrorMessage(error),
            raw: error.response?.data || null
        };
    }
}

/**
 * 8. Berlangganan VIP Veyra Pay (MDR 0% & Custom Kode Unik)
 * POST /api/user/subscribe
 */
async function subscribeVip() {
    try {
        const response = await axios.post(
            `${getBaseUrl()}/api/user/subscribe`,
            {},
            {
                headers: buildHeaders(),
                timeout: 15000
            }
        );
        const resData = response.data || {};
        return {
            success: resData.success !== false,
            payment_required: Boolean(resData.payment_required),
            message: resData.message || 'Permintaan langganan VIP diproses.',
            data: resData.data || null,
            raw: resData
        };
    } catch (error) {
        return {
            success: false,
            statusCode: error.response?.status || null,
            message: extractErrorMessage(error),
            raw: error.response?.data || null
        };
    }
}

/**
 * 9. Verifikasi Signature Webhook Veyra Pay (HMAC SHA-256)
 * Header: X-Webhook-Signature
 */
function verifyWebhookSignature(rawBody, signatureHeader, secret) {
    if (!secret) return true; // Jika secret belum diisi, lewati verifikasi signature
    if (!signatureHeader || !rawBody) return false;

    const cleanSig = String(signatureHeader).replace(/^sha256=/i, '').trim();
    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    const sigBuf = Buffer.from(cleanSig, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, expBuf);
}

module.exports = {
    createDeposit,
    checkDepositStatus,
    cancelDeposit,
    getProfile,
    getTransactions,
    createWithdraw,
    setCustomUniqueRange,
    subscribeVip,
    verifyWebhookSignature,
    normalizeStatus
};
