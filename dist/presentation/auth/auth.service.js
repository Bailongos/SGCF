"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const google_auth_library_1 = require("google-auth-library");
const data_1 = require("../../data");
const jwt_1 = require("../../config/jwt");
const envs_1 = require("../../config/envs");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const googleClient = new google_auth_library_1.OAuth2Client(envs_1.envs.GOOGLE_CLIENT_ID);
// JWKS Client for Microsoft (and potentially others)
const msJwksClient = (0, jwks_rsa_1.default)({
    jwksUri: `https://login.microsoftonline.com/${envs_1.envs.MICROSOFT_TENANT_ID}/discovery/v2.0/keys`
});
function getKey(header, callback) {
    msJwksClient.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err, null);
        }
        else {
            const signingKey = key?.getPublicKey();
            callback(null, signingKey);
        }
    });
}
class AuthService {
    // Local Login
    static async loginUser(loginUserDto) {
        const { username, password } = loginUserDto;
        const userRes = await data_1.dbPool.query(`SELECT u.id_usuario, u.username, u.password, u.id_rol, u.id_carrera, r.nombre_rol, u.activo
       FROM "control financiero".usuarios u
       JOIN "control financiero".roles r ON u.id_rol = r.id_rol
       WHERE u.username = $1`, [username]);
        const user = userRes.rows[0];
        if (!user)
            throw new Error('Credenciales inválidas');
        if (!user.activo)
            throw new Error('Usuario inactivo. Contacte al administrador.');
        // Check password (hash or plain text fallback for migration)
        const isMatch = bcryptjs_1.default.compareSync(password, user.password) || user.password === password;
        if (!isMatch)
            throw new Error('Credenciales inválidas');
        // If plain text matched, update to hash (migration on the fly)
        if (user.password === password && !bcryptjs_1.default.compareSync(password, user.password)) {
            const hash = bcryptjs_1.default.hashSync(password, 10);
            await data_1.dbPool.query(`UPDATE "control financiero".usuarios SET password = $1 WHERE id_usuario = $2`, [hash, user.id_usuario]);
        }
        const token = await jwt_1.JwtAdapter.generateToken({
            id: user.id_usuario,
            id_carrera: user.id_carrera,
            role: user.nombre_rol
        });
        return {
            user: {
                id: user.id_usuario,
                username: user.username,
                id_carrera: user.id_carrera,
                role: user.nombre_rol
            },
            token
        };
    }
    // Google Login
    static async loginGoogle(idToken) {
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: envs_1.envs.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload)
                throw new Error('Token inválido');
            return this.loginOrRegisterProvider({
                proveedor: 'GOOGLE',
                proveedor_sub: payload.sub,
                email: payload.email,
                email_verificado: payload.email_verified,
                nombre: payload.name,
                foto_url: payload.picture
            });
        }
        catch (error) {
            console.error('Google Auth Error:', error);
            throw new Error('Google Token inválido');
        }
    }
    // Microsoft Login
    static async loginMicrosoft(idToken) {
        try {
            // Verify Microsoft Token Signature & Claims manually or via library
            // Since we don't have a full MSAL backend setup for 'on-behalf-of' flow, 
            // validating the ID token from client is the standard way for SPA/Mobile + API.
            const decoded = await new Promise((resolve, reject) => {
                jsonwebtoken_1.default.verify(idToken, getKey, {
                    audience: envs_1.envs.MICROSOFT_CLIENT_ID,
                    issuer: [`https://login.microsoftonline.com/${envs_1.envs.MICROSOFT_TENANT_ID}/v2.0`, `https://sts.windows.net/${envs_1.envs.MICROSOFT_TENANT_ID}/`], // Handle v1/v2 endpoints
                    algorithms: ['RS256']
                }, (err, decoded) => {
                    if (err)
                        reject(err);
                    else
                        resolve(decoded);
                });
            });
            return this.loginOrRegisterProvider({
                proveedor: 'MICROSOFT',
                proveedor_sub: decoded.sub || decoded.oid, // oid is often simpler for object id in Azure AD
                email: decoded.email || decoded.preferred_username,
                email_verificado: true, // Azure AD verified usually
                nombre: decoded.name,
                foto_url: null // MS Graph API call needed for photo, skip for now
            });
        }
        catch (error) {
            console.error('Microsoft Auth Error:', error);
            throw new Error('Microsoft Token inválido');
        }
    }
    // Common Logic
    static async loginOrRegisterProvider(data) {
        // 1. Check if identity exists
        const identityRes = await data_1.dbPool.query(`SELECT ui.*, u.id_rol, u.id_carrera, u.username, u.activo, r.nombre_rol
         FROM "control financiero".usuarios_identidades ui
         JOIN "control financiero".usuarios u ON ui.id_usuario = u.id_usuario
         JOIN "control financiero".roles r ON u.id_rol = r.id_rol
         WHERE ui.proveedor = $1 AND ui.proveedor_sub = $2`, [data.proveedor, data.proveedor_sub]);
        let user = identityRes.rows[0];
        if (user) {
            // Update identity info if changed (optional)
            // Check active status
            if (!user.activo)
                throw new Error('Usuario pendiente de activación. Contacte al administrador.');
        }
        else {
            // Register new user
            // 1. Check if email exists in users table to link? (Optional, but good practice)
            // If not, create new user with role 'Pendiente' (or 'Coordinador' inactive)
            // Transaction
            const client = await data_1.dbPool.connect();
            try {
                await client.query('BEGIN');
                // Check by email first
                let userId;
                let roleName = 'Pendiente';
                // Find role ID
                const roleRes = await client.query('SELECT id_rol FROM "control financiero".roles WHERE nombre_rol = $1', [roleName]);
                let roleId = roleRes.rows[0]?.id_rol;
                if (!roleId) {
                    // Fallback to Coordinador inactive if Pendiente doesn't exist? Or create Pendiente?
                    // Let's assume Pendiente exists from migration.
                    throw new Error('Rol Pendiente no configurado');
                }
                // Create User
                // username defaults to email or provider_sub
                const insertUserRes = await client.query(`INSERT INTO "control financiero".usuarios (username, password, email, id_rol, activo)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id_usuario`, [data.email || `${data.proveedor}_${data.proveedor_sub}`, 'oauth_placeholder', data.email, roleId, false]);
                userId = insertUserRes.rows[0].id_usuario;
                // Create Identity
                await client.query(`INSERT INTO "control financiero".usuarios_identidades 
                 (id_usuario, proveedor, proveedor_sub, email, email_verificado, nombre, foto_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`, [userId, data.proveedor, data.proveedor_sub, data.email, data.email_verificado, data.nombre, data.foto_url]);
                await client.query('COMMIT');
                // Return basic info (inactive)
                throw new Error('Registro exitoso. Su cuenta está pendiente de aprobación por un administrador.');
            }
            catch (e) {
                await client.query('ROLLBACK');
                throw e;
            }
            finally {
                client.release();
            }
        }
        // Generate Token
        const token = await jwt_1.JwtAdapter.generateToken({
            id: user.id_usuario,
            id_carrera: user.id_carrera,
            role: user.nombre_rol
        });
        return {
            user: {
                id: user.id_usuario,
                username: user.username,
                id_carrera: user.id_carrera,
                role: user.nombre_rol
            },
            token
        };
    }
}
exports.AuthService = AuthService;
