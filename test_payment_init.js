import axios from 'axios';

// Credentials from .env
const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const PHONEPE_CLIENT_ID = "M23KE745L38NT_2602101916";
const PHONEPE_CLIENT_SECRET = "YjczYTZhMjgtN2ZjZi00ODFkLTkwMTctOWQ0OWQ2OTZmZDRh";
const PHONEPE_CLIENT_VERSION = 1;
const APP_BE_URL = "https://indritafabrics.com";

async function getPhonePeToken() {
    try {
        const authHeader = Buffer.from(`${PHONEPE_CLIENT_ID}:${PHONEPE_CLIENT_SECRET}`).toString('base64');
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', PHONEPE_CLIENT_ID);
        params.append('client_secret', PHONEPE_CLIENT_SECRET);
        params.append('client_version', PHONEPE_CLIENT_VERSION);

        const response = await axios.post(`${PHONEPE_HOST_URL}/v1/oauth/token`, params, {
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Token Error:", error.response?.data || error.message);
        throw error;
    }
}

async function testPaymentInit() {
    try {
        console.log("Fetching Token...");
        const token = await getPhonePeToken();
        console.log("Token Fetched.");

        const merchantOrderId = 'ORD-' + Date.now();
        const amountPaise = 10000;

        // V2 Payload
        const payload = {
            merchantOrderId: merchantOrderId,
            merchantTransactionId: merchantOrderId,
            merchantUserId: "MUID-TEST-123",
            amount: amountPaise,
            mobileNumber: "9999999999",
            redirectUrl: `${APP_BE_URL}/api/payment/callback`,
            redirectMode: "POST",
            callbackUrl: `${APP_BE_URL}/webhook/phonepe`,
            paymentInstrument: {
                type: "PAY_PAGE",
                targetApp: "WEB"
            }
        };

        console.log("Sending V2 Payload...");
        const response = await axios.post(`${PHONEPE_HOST_URL}/checkout/v2/pay`, payload, {
            headers: {
                'Authorization': `O-Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        const orderId = data.orderId;
        console.log("Created Order ID:", orderId);

        if (orderId) {
            // Test URL variations for Browser Redirect
            const variations = [
                // Standard V2 ?
                `${PHONEPE_HOST_URL}/checkout/v2/${orderId}`,
                `https://api-preprod.phonepe.com/checkout/v2/${orderId}`,

                // Common Sandbox UI Host (Mercury)
                `https://mercury-uat.phonepe.com/transact/checkout?token=${orderId}`, // V1 style?
                `https://mercury-uat.phonepe.com/process/payment/v2/${orderId}`,
                `https://mercury-uat.phonepe.com/checkout/v2/${orderId}`
            ];

            console.log("\nProbing URLs...");

            for (const url of variations) {
                try {
                    console.log(`Checking: ${url}`);
                    const res = await axios.get(url, { validateStatus: () => true });
                    console.log(`Status: ${res.status}`);
                    console.log(`Content-Type: ${res.headers['content-type']}`);

                    if (res.status === 200 && res.headers['content-type'] && res.headers['content-type'].includes('text/html')) {
                        console.log(">>> POSSIBLY VALID PAGE! <<<");
                    }
                } catch (e) {
                    console.log(`Error hitting ${url}: ${e.message}`);
                }
            }
        }

    } catch (error) {
        console.error("Payment Init Failed!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testPaymentInit();
