import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { HttpError } from "./storage.js";
export function isPublicAddress(address) {
    if (isIP(address) === 4) {
        const [a, b] = address.split(".").map(Number);
        return !(a === 0 ||
            a === 10 ||
            a === 127 ||
            a >= 224 ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && [0, 168].includes(b)) ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 198 && [18, 19, 51].includes(b)) ||
            (a === 203 && b === 0));
    }
    if (isIP(address) === 6) {
        const a = address.toLowerCase();
        return a.startsWith("2") || a.startsWith("3");
    }
    return false;
}
export async function publicHTML(input, redirects = 0) {
    let url;
    try {
        url = new URL(input);
    }
    catch {
        throw new HttpError(400, "Cole um endereço completo começando com https://.");
    }
    if (!["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        (url.port && !["80", "443"].includes(url.port)))
        throw new HttpError(400, "Use um endereço público de uma página web.");
    if (redirects > 4)
        throw new HttpError(400, "O endereço tem muitos redirecionamentos.");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(hostname)
        ? [{ address: hostname, family: isIP(hostname) }]
        : await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
        throw new HttpError(400, "Esse endereço não é uma página pública permitida.");
    const pinned = addresses[0];
    return new Promise((resolve, reject) => {
        const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
            headers: {
                "User-Agent": "LearnOS/1.0 (+personal-reading)",
                Accept: "text/html,application/xhtml+xml",
                "Accept-Encoding": "identity",
            },
            lookup: ((_hostname, options, callback) => options.all
                ? callback(null, [pinned])
                : callback(null, pinned.address, pinned.family)),
        }, (response) => {
            if (response.statusCode &&
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location) {
                response.resume();
                publicHTML(new URL(response.headers.location, url).href, redirects + 1).then(resolve, reject);
                return;
            }
            if (response.statusCode !== 200) {
                response.resume();
                reject(new HttpError(422, "Esta página não permitiu a leitura. Você pode colar um recorte manualmente."));
                return;
            }
            if (!String(response.headers["content-type"]).includes("html")) {
                response.resume();
                reject(new HttpError(422, "Esse link não é um artigo HTML. Baixe e importe o arquivo original."));
                return;
            }
            const chunks = [];
            let size = 0;
            response.on("data", (chunk) => {
                size += chunk.length;
                if (size > 2_000_000) {
                    response.destroy();
                    reject(new HttpError(413, "A página é muito grande. Cole um recorte para estudar."));
                }
                else
                    chunks.push(chunk);
            });
            response.on("end", () => resolve({
                html: Buffer.concat(chunks).toString("utf8"),
                url: url.href,
            }));
            response.on("error", reject);
        });
        request.setTimeout(12000, () => request.destroy(new HttpError(504, "A página demorou a responder. Tente novamente ou cole o texto.")));
        request.on("error", reject);
        request.end();
    });
}
