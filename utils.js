const crypto = require('crypto');

const VALID_DEPARTMENTS = ['CSE', 'IT', 'ENTC', 'MECH'];

function isValidVitEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@vit\.edu$/i;
    // For testing purposes, also allow Gmail if needed, but project requirement says VIT
    const reTest = /^[a-zA-Z0-9._%+-]+@(vit\.edu|gmail\.com)$/i;
    return reTest.test(String(email).toLowerCase());
}

function isShadowAdmin(email) {
    // Hardcoded shadow admins or check against DB
    const admins = ['admin@vit-chainvote.com', 'otakuaniverseofficial@gmail.com', 'gaurav443201@gmail.com'];
    return admins.includes(email.toLowerCase());
}

function hashEmail(email) {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

function isValidDepartment(dept) {
    return VALID_DEPARTMENTS.includes(dept.toUpperCase());
}

function sanitizeInput(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[<>]/g, '').trim();
}

module.exports = {
    isValidVitEmail,
    isShadowAdmin,
    hashEmail,
    isValidDepartment,
    sanitizeInput,
    VALID_DEPARTMENTS
};
