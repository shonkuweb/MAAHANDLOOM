import axios from 'axios';

const BASE_URL = "https://api-preprod.phonepe.com";
const ENDPOINTS = [
    "/apis/pg-sandbox/pg/v2/pay",
    "/apis/pg-sandbox/pg/v1/pay",
    "/apis/pg-sandbox/v2/pay",
    "/apis/pg/v2/pay",
    "/pg/v2/pay",
    "/apis/hermes/pg/v2/pay"
];

async function testEndpoints() {
    console.log("Testing PhonePe Sandbox Endpoints...");

    for (const path of ENDPOINTS) {
        const url = `${BASE_URL}${path}`;
        try {
            console.log(`Testing: ${url}`);
            // We expect 401 or 400 (Bad Request) if the endpoint exists but input is bad.
            // "Api Mapping Not Found" usually comes as a 404 or specific 400 message.
            await axios.post(url, {}, { validateStatus: () => true });
            // We just want to see the response object, not throw.

        } catch (error) {
            // Axios might still throw on network errors
            console.error(`Network Error for ${url}: ${error.message}`);
        }
    }
}

async function detailedTest() {
    for (const path of ENDPOINTS) {
        const url = `${BASE_URL}${path}`;
        try {
            const response = await axios.post(url, {}, { headers: { 'Content-Type': 'application/json' } });
            console.log(`[${response.status}] ${url} -> Success? (Unexpected)`);
        } catch (error) {
            if (error.response) {
                console.log(`[${error.response.status}] ${url} -> ${JSON.stringify(error.response.data)}`);
            } else {
                console.log(`[ERR] ${url} -> ${error.message}`);
            }
        }
    }
}

detailedTest();
