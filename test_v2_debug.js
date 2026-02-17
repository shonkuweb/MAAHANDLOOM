import axios from 'axios';

// Credentials from .env
const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const PHONEPE_CLIENT_ID = "M23KE745L38NT_2602101916";
const PHONEPE_CLIENT_SECRET = "YjczYTZhMjgtN2ZjZi00ODFkLTkwMTctOWQ0OWQ2OTZmZDRh";
const PHONEPE_CLIENT_VERSION = 1;

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

async function testV2() {
    try {
        const token = await getPhonePeToken();
        const merchantOrderId = 'ORD-' + Date.now();

        console.log("Testing V2 with UPI_QR...");

        const payload = {
            merchantOrderId: merchantOrderId,
            merchantTransactionId: merchantOrderId,
            merchantUserId: "MUID-TEST-123",
            amount: 10000,
            mobileNumber: "9999999999",
            paymentInstrument: {
                type: "UPI_QR"
            }
        };

        const response = await axios.post(`${PHONEPE_HOST_URL}/checkout/v2/pay`, payload, {
            headers: {
                'Authorization': `O-Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Response:", JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error("Failed:", error.message);
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        }
    }
}

testV2();
