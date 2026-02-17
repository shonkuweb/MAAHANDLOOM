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

async function runTest() {
    try {
        const token = await getPhonePeToken();
        const orderId = 'ORD-' + Date.now();
        console.log("Testing PAY_PAGE with redirectMode: POST");

        const payload = {
            merchantOrderId: orderId,
            merchantTransactionId: orderId,
            merchantUserId: "MUID-TEST",
            amount: 10000,
            mobileNumber: "9999999999",
            redirectUrl: `${APP_BE_URL}/api/payment/callback`,
            redirectMode: "POST",
            callbackUrl: `${APP_BE_URL}/webhook/phonepe`,
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        const response = await axios.post(`${PHONEPE_HOST_URL}/checkout/v2/pay`, payload, {
            headers: { 'Authorization': `O-Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        console.log("Response Status:", response.status);
        console.log("Response Body:", JSON.stringify(response.data, null, 2));

    } catch (e) {
        console.log("Failed:", e.message);
        if (e.response) console.log(JSON.stringify(e.response.data, null, 2));
    }
}

runTest();
