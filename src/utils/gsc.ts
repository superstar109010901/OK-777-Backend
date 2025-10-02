const crypto = require("crypto");


export function generateSign(operatorCode, requestTime, action, secretKey) {
    const str = operatorCode + requestTime + action + secretKey;
    return crypto.createHash("md5").update(str).digest("hex");
}

export function generateLaunchGameSign(operatorCode, requestTime, secretKey) {
    const str = requestTime + secretKey + "launchgame" + operatorCode;
    return crypto.createHash("md5").update(str).digest("hex");
}

export function verifyRequest(operatorCode, requestTime, action, secretKey, sign) {
    const expected = generateSign(operatorCode, requestTime, action, secretKey);
    return expected.toLowerCase() === sign.toLowerCase();
}
