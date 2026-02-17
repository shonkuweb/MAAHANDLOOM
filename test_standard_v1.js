import axios from 'axios';
import crypto from 'crypto';

const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const MERCHANT_ID = "PGTESTPAYUAT";
const SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const SALT_INDEX = 1;
const APP_BE_URL = "https://indritafabrics.com";

async function runTest() {
    try {
        const orderId = 'ORD-' + Date.now();
        console.log(`Testing PAY_PAGE with Standard Sandbox (V1): ${MERCHANT_ID}`);

        const payload = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: orderId,
            merchantUserId: "MUID-TEST",
            amount: 10000,
            redirectUrl: `${APP_BE_URL}/api/payment/callback`,
            redirectMode: "POST",
            callbackUrl: `${APP_BE_URL}/webhook/phonepe`,
            mobileNumber: "9999999999",
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const stringToSign = base64Payload + "/pg/v1/pay" + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToSign).digest('hex');
        const checksum = sha256 + "###" + SALT_INDEX;

        const response = await axios.post(`${PHONEPE_HOST_URL}/pg/v1/pay`, { request: base64Payload }, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'accept': 'application/json'
            }
        });

        console.log("Response Status:", response.status);
        console.log("Response Body:", JSON.stringify(response.data, null, 2));

        const url = response.data.data?.instrumentResponse?.redirectInfo?.url;
        console.log("\nGenerated URL:", url);

    } catch (e) {
        console.log("Failed:", e.message);
        if (e.response) console.log(JSON.stringify(e.response.data, null, 2));
    }
}

runTest();
