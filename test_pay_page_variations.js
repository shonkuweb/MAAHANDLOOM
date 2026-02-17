import axios from 'axios';

const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const PHONEPE_CLIENT_ID = "M23KE745L38NT_2602101916";
const PHONEPE_CLIENT_SECRET = "YjczYTZhMjgtN2ZjZi00ODFkLTkwMTctOWQ0OWQ2OTZmZDRh";
const PHONEPE_CLIENT_VERSION = 1;
const APP_BE_URL = "https://indritafabrics.com";

async function getPhonePeToken() {
    const authHeader = Buffer.from(`${PHONEPE_CLIENT_ID}:${PHONEPE_CLIENT_SECRET}`).toString('base64');
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', PHONEPE_CLIENT_ID);
    params.append('client_secret', PHONEPE_CLIENT_SECRET);
    params.append('client_version', PHONEPE_CLIENT_VERSION);
    const response = await axios.post(`${PHONEPE_HOST_URL}/v1/oauth/token`, params, {
        headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data.access_token;
}

async function runTests() {
    const token = await getPhonePeToken();
    console.log("Token Fetched.\n");

    const variations = [
        {
            name: "Standard PAY_PAGE (POST)",
            payload: {
                redirectMode: "POST",
                paymentInstrument: { type: "PAY_PAGE" }
            }
        },
        {
            name: "Standard PAY_PAGE (REDIRECT)",
            payload: {
                redirectMode: "REDIRECT",
                paymentInstrument: { type: "PAY_PAGE" }
            }
        },
        {
            name: "PAY_PAGE with targetApp=WEB",
            payload: {
                redirectMode: "POST",
                paymentInstrument: { type: "PAY_PAGE", targetApp: "WEB" }
            }
        },
        {
            name: "PAY_PAGE with targetApp=ANDROID",
            payload: {
                redirectMode: "POST",
                paymentInstrument: { type: "PAY_PAGE", targetApp: "ANDROID" }
            }
        },
        {
            name: "PAY_PAGE with deviceContext",
            payload: {
                redirectMode: "POST",
                deviceContext: { deviceOS: "WEB" },
                paymentInstrument: { type: "PAY_PAGE" }
            }
        },
        {
            name: "PAY_PAGE with NO callbackUrl",
            payload: {
                redirectMode: "POST",
                omitCallback: true,
                paymentInstrument: { type: "PAY_PAGE" }
            }
        }
    ];

    for (const v of variations) {
        try {
            console.log(`--- Testing: ${v.name} ---`);
            const orderId = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

            const payload = {
                merchantOrderId: orderId,
                merchantTransactionId: orderId,
                merchantUserId: "MUID-TEST",
                amount: 10000,
                mobileNumber: "9999999999",
                redirectUrl: `${APP_BE_URL}/api/payment/callback`,
                ...v.payload
            };

            if (payload.omitCallback) {
                delete payload.callbackUrl;
                delete payload.omitCallback;
            } else {
                payload.callbackUrl = `${APP_BE_URL}/webhook/phonepe`;
            }

            const response = await axios.post(`${PHONEPE_HOST_URL}/checkout/v2/pay`, payload, {
                headers: { 'Authorization': `O-Bearer ${token}`, 'Content-Type': 'application/json' }
            });

            console.log("Status:", response.status);
            const data = response.data;
            let url = null;
            if (data.redirectUrl) url = data.redirectUrl;
            if (data.data?.instrumentResponse?.redirectInfo?.url) url = data.data.instrumentResponse.redirectInfo.url;

            console.log("Redirect URL:", url);

            if (url && url.includes("phonepe.com") && !url.includes("api/payment/callback")) {
                console.log(">>> SUCCESS! FOUND VALID URL <<<");
            }

        } catch (e) {
            console.log("Failed:", e.message);
            if (e.response) console.log(JSON.stringify(e.response.data));
        }
        console.log("\n");
        await new Promise(r => setTimeout(r, 1000)); // Delay
    }
}

runTests();
