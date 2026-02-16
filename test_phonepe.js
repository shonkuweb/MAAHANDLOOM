import axios from 'axios';

const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const PHONEPE_CLIENT_ID = "M23KE745L38NT_2602101916";
const PHONEPE_CLIENT_SECRET = "YjczYTZhMjgtN2ZjZi00ODFkLTkwMTctOWQ0OWQ2OTZmZDRh";
const PHONEPE_CLIENT_VERSION = 1;

async function testToken() {
    try {
        console.log("Testing PhonePe Token Fetch (Basic Auth)...");
        const auth = Buffer.from(`${PHONEPE_CLIENT_ID}:${PHONEPE_CLIENT_SECRET}`).toString('base64');
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', PHONEPE_CLIENT_ID);
        params.append('client_secret', PHONEPE_CLIENT_SECRET);
        params.append('client_version', PHONEPE_CLIENT_VERSION);

        const response = await axios.post(`${PHONEPE_HOST_URL}/v1/oauth/token`, params, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log("Success!");
        console.log(response.data);
    } catch (error) {
        console.error("Failed!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testToken();
