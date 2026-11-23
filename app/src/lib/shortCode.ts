import crypto from "crypto";

// Alfabeto sin caracteres ambiguos (0, O, 1, l, I)
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function generateShortCode(length = 6): string {
    const bytes = crypto.randomBytes(length);
    let code = "";
    for (let i = 0; i < length; i++) {
        code += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return code;
}