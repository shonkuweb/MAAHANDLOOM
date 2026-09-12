import crypto from "crypto";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "d098e896b8f7dc0403ad3a16f592dfe6";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "chf-media";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "989af8ef35b94b6abf46b295af3c50d3";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "a8000cd7a60e056098ec04e0580328bbf21fff4f0da6126075cc3ed05f79ab95";
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "https://pub-ce8688bc6c654bcfb99716f7c9373bcd.r2.dev").replace(/\/+$/, "");

function hmacSha256(key, str) {
    return crypto.createHmac("sha256", key).update(str, "utf8").digest();
}

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = hmacSha256("AWS4" + key, dateStamp);
    const kRegion = hmacSha256(kDate, regionName);
    const kService = hmacSha256(kRegion, serviceName);
    const kSigning = hmacSha256(kService, "aws4_request");
    return kSigning;
}

/**
 * Upload binary or base64 file directly to Cloudflare R2 bucket using AWS S3 Signature v4
 */
export async function uploadToR2(fileData, mimeType = "image/jpeg", fileName = "") {
    let buffer;
    if (typeof fileData === "string") {
        if (fileData.startsWith("data:")) {
            const matches = fileData.match(/^data:([A-Za-z0-9\/\+\-]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mimeType = matches[1];
                buffer = Buffer.from(matches[2], "base64");
            } else {
                buffer = Buffer.from(fileData, "base64");
            }
        } else {
            buffer = Buffer.from(fileData, "base64");
        }
    } else {
        buffer = fileData;
    }

    const ext = mimeType.split("/")[1]?.replace("+xml", "") || "jpg";
    const uniqueKey = `billing/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const endpoint = `https://${host}/${R2_BUCKET_NAME}/${uniqueKey}`;
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);
    const region = "auto";
    const service = "s3";

    const payloadHash = sha256(buffer);
    const canonicalUri = `/${R2_BUCKET_NAME}/${uniqueKey}`;
    const canonicalQuerystring = "";
    
    const canonicalHeaders = 
        `content-type:${mimeType}\n` +
        `host:${host}\n` +
        `x-amz-content-sha256:${payloadHash}\n` +
        `x-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = 
        `PUT\n` +
        `${canonicalUri}\n` +
        `${canonicalQuerystring}\n` +
        `${canonicalHeaders}\n` +
        `${signedHeaders}\n` +
        `${payloadHash}`;

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = 
        `AWS4-HMAC-SHA256\n` +
        `${amzDate}\n` +
        `${credentialScope}\n` +
        `${sha256(canonicalRequest)}`;

    const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    try {
        const response = await fetch(endpoint, {
            method: "PUT",
            headers: {
                "Content-Type": mimeType,
                "x-amz-content-sha256": payloadHash,
                "x-amz-date": amzDate,
                "Authorization": authorizationHeader,
            },
            body: buffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("R2 Upload HTTP Error:", response.status, errorText);
            throw new Error(`R2 Upload failed: ${response.statusText} - ${errorText}`);
        }

        const publicUrl = `${R2_PUBLIC_URL}/${uniqueKey}`;
        console.log("R2 Upload Success:", publicUrl);
        return publicUrl;
    } catch (err) {
        console.error("Cloudflare R2 Upload Error:", err);
        throw err;
    }
}

export default {
    uploadToR2,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
};
