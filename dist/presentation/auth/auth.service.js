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
// JWKS Client for Microsoft
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
        const isMatch = bcryptjs_1.default.compareSync(password, user.password) || user.password === password;
        if (!isMatch)
            throw new Error('Credenciales inválidas');
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
    // Local Register
    static async registerUser(registerDto) {
        const { username, password, email } = registerDto;
        if (!username || !password)
            throw new Error('Username y contraseña son requeridos');
        const existing = await data_1.dbPool.query('SELECT id_usuario FROM "control financiero".usuarios WHERE username = $1 OR (email = $2 AND email IS NOT NULL)', [username, email]);
        if (existing.rows.length > 0)
            throw new Error('El nombre de usuario o email ya está registrado');
        // 2. Get 'Pendiente' or 'Sin Rol' role ID - Fallback a ID 2 (Coordinador) para evitar errores de restricción
        let roleRes = await data_1.dbPool.query(`SELECT id_rol FROM "control financiero".roles 
             WHERE nombre_rol ILIKE '%Pendiente%' 
                OR nombre_rol ILIKE '%Sin Rol%' 
                OR nombre_rol ILIKE '%SinRol%'
             LIMIT 1`);
        // Si no encuentra el rol por nombre, usamos el ID 2 (Coordinador) que es un rol estándar aceptado
        let roleId = roleRes.rows[0]?.id_rol || 2;
        // 3. Fallback directo a ID 7 para carrera (Evitar error si falta columna nombre_carrera)
        const defaultCarreraId = 7;
        const passwordHash = bcryptjs_1.default.hashSync(password, 10);
        await data_1.dbPool.query(`INSERT INTO "control financiero".usuarios (username, password, email, id_rol, id_carrera, activo)
         VALUES ($1, $2, $3, $4, $5, $6)`, [username, passwordHash, email, roleId, defaultCarreraId, false]);
        return { message: 'Registro exitoso. Su cuenta debe ser activada por un administrador.' };
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
            const decoded = await new Promise((resolve, reject) => {
                jsonwebtoken_1.default.verify(idToken, getKey, {
                    audience: envs_1.envs.MICROSOFT_CLIENT_ID,
                    issuer: [`https://login.microsoftonline.com/${envs_1.envs.MICROSOFT_TENANT_ID}/v2.0`, `https://sts.windows.net/${envs_1.envs.MICROSOFT_TENANT_ID}/`],
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
                proveedor_sub: decoded.sub || decoded.oid,
                email: decoded.email || decoded.preferred_username,
                email_verificado: true,
                nombre: decoded.name,
                foto_url: null
            });
        }
        catch (error) {
            console.error('Microsoft Auth Error:', error);
            throw new Error('Microsoft Token inválido');
        }
    }
    static async loginOrRegisterProvider(data) {
        const identityRes = await data_1.dbPool.query(`SELECT ui.*, u.id_rol, u.id_carrera, u.username, u.activo, r.nombre_rol
         FROM "control financiero".usuarios_identidades ui
         JOIN "control financiero".usuarios u ON ui.id_usuario = u.id_usuario
         JOIN "control financiero".roles r ON u.id_rol = r.id_rol
         WHERE ui.proveedor = $1 AND ui.proveedor_sub = $2`, [data.proveedor, data.proveedor_sub]);
        let user = identityRes.rows[0];
        if (user) {
            if (!user.activo)
                throw new Error('Usuario pendiente de activación. Contacte al administrador.');
        }
        else {
            const client = await data_1.dbPool.connect();
            try {
                await client.query('BEGIN');
                // Find role ID (Pendiente or Sin Rol)
                const roleRes = await client.query(`SELECT id_rol FROM "control financiero".roles 
                 WHERE nombre_rol ILIKE '%Pendiente%' 
                    OR nombre_rol ILIKE '%Sin Rol%' 
                    OR nombre_rol ILIKE '%SinRol%'
                 LIMIT 1`);
                let roleId = roleRes.rows[0]?.id_rol || 6;
                // Fallback directo a ID 7 para carrera (Evitar error si falta columna nombre_carrera)
                const defaultCarreraId = 7;
                const insertUserRes = await client.query(`INSERT INTO "control financiero".usuarios (username, password, email, id_rol, id_carrera, activo)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id_usuario`, [data.email || `${data.proveedor}_${data.proveedor_sub}`, 'oauth_placeholder', data.email, roleId, defaultCarreraId, false]);
                const userId = insertUserRes.rows[0].id_usuario;
                await client.query(`INSERT INTO "control financiero".usuarios_identidades 
                 (id_usuario, proveedor, proveedor_sub, email, email_verificado, nombre, foto_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`, [userId, data.proveedor, data.proveedor_sub, data.email, data.email_verificado, data.nombre, data.foto_url]);
                await client.query('COMMIT');
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
