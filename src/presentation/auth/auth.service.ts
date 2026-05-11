import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { dbPool } from '../../data';
import { JwtAdapter } from '../../config/jwt';
import { envs } from '../../config/envs';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const googleClient = new OAuth2Client(envs.GOOGLE_CLIENT_ID);

// JWKS Client for Microsoft
const msJwksClient = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${envs.MICROSOFT_TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header: any, callback: any) {
  msJwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, null);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
}

export class AuthService {

  private static async getUserPermissions(idRol: number, idUsuario: number) {
    const permissionsRes = await dbPool.query(
      `SELECT DISTINCT p.clave
       FROM "control financiero".permisos p
       JOIN "control financiero".rol_permisos rp ON p.id_permiso = rp.id_permiso
       WHERE rp.id_rol = $1
       UNION
       SELECT p.clave
       FROM "control financiero".permisos p
       JOIN "control financiero".usuario_permisos up ON p.id_permiso = up.id_permiso
       WHERE up.id_usuario = $2 AND up.otorgado = true
       EXCEPT
       SELECT p.clave
       FROM "control financiero".permisos p
       JOIN "control financiero".usuario_permisos up ON p.id_permiso = up.id_permiso
       WHERE up.id_usuario = $2 AND up.otorgado = false`,
      [idRol, idUsuario]
    );

    return permissionsRes.rows.map((row: any) => row.clave);
  }

  private static formatAuthResponse(user: any, token: string, permissions: string[]) {
    return {
      user: {
        id: user.id_usuario,
        id_usuario: user.id_usuario,
        username: user.username,
        email: user.email ?? null,
        id_rol: user.id_rol,
        id_carrera: user.id_carrera,
        role: user.nombre_rol,
        activo: user.activo,
        permissions
      },
      token
    };
  }

  // Local Login
  static async loginUser(loginUserDto: any) {
    const { username, password } = loginUserDto;

    const userRes = await dbPool.query(
      `SELECT u.id_usuario, u.username, u.password, u.email, u.id_rol, u.id_carrera, r.nombre_rol, u.activo
       FROM "control financiero".usuarios u
       JOIN "control financiero".roles r ON u.id_rol = r.id_rol
       WHERE u.username = $1`,
      [username]
    );

    const user = userRes.rows[0];
    if (!user) throw new Error('Credenciales inválidas');
    if (!user.activo) throw new Error('Usuario inactivo. Contacte al administrador.');

    const isMatch = bcrypt.compareSync(password, user.password) || user.password === password;
    if (!isMatch) throw new Error('Credenciales inválidas');

    if (user.password === password && !bcrypt.compareSync(password, user.password)) {
        const hash = bcrypt.hashSync(password, 10);
        await dbPool.query(
            `UPDATE "control financiero".usuarios SET password = $1 WHERE id_usuario = $2`,
            [hash, user.id_usuario]
        );
    }

    const token = await JwtAdapter.generateToken({
      id: user.id_usuario,
      id_carrera: user.id_carrera,
      role: user.nombre_rol
    });

    if (!token) throw new Error('No se pudo generar el token de sesión');

    const permissions = await this.getUserPermissions(user.id_rol, user.id_usuario);

    return this.formatAuthResponse(user, token, permissions);
  }

  // Local Register
  static async registerUser(registerDto: any) {
    const { username, password, email } = registerDto;

    if (!username || !password) throw new Error('Username y contraseña son requeridos');

    const existing = await dbPool.query(
        'SELECT id_usuario FROM "control financiero".usuarios WHERE username = $1 OR (email = $2 AND email IS NOT NULL)',
        [username, email]
    );
    if (existing.rows.length > 0) throw new Error('El nombre de usuario o email ya está registrado');

        // 2. Get role and career dynamically
        let roleRes = await dbPool.query(
            `SELECT id_rol FROM "control financiero".roles 
             WHERE nombre_rol ILIKE '%Pendiente%' 
             LIMIT 1`
        );
        let roleId = roleRes.rows[0]?.id_rol || 4;

        // 3. Check if any career exists, otherwise use NULL
        const careerRes = await dbPool.query('SELECT id_carrera FROM "control financiero".carreras LIMIT 1');
        const defaultCarreraId = careerRes.rows[0]?.id_carrera || null;

        // If we have a career, we can use Coordinador role instead
        if (defaultCarreraId) {
            const coordRes = await dbPool.query(
                `SELECT id_rol FROM "control financiero".roles WHERE nombre_rol ILIKE '%Coordinador%' LIMIT 1`
            );
            roleId = coordRes.rows[0]?.id_rol || roleId;
        }

    const passwordHash = bcrypt.hashSync(password, 10);

    await dbPool.query(
        `INSERT INTO "control financiero".usuarios (username, password, email, id_rol, id_carrera, activo)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [username, passwordHash, email, roleId, defaultCarreraId, false]
    );

    return { message: 'Registro exitoso. Su cuenta debe ser activada por un administrador.' };
  }

  // Google Login
  static async loginGoogle(idToken: string) {
    try {
      if (!envs.GOOGLE_CLIENT_ID) {
        console.error('[AuthService] Error: GOOGLE_CLIENT_ID NOT DEFINED in backend environment.');
        throw new Error('Configuración de Google incompleta en el servidor');
      }

      console.log(`[AuthService] Verifying Google token with Client ID: ${envs.GOOGLE_CLIENT_ID.substring(0, 10)}...`);

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: envs.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error('Token inválido');

      return this.loginOrRegisterProvider({
        proveedor: 'GOOGLE',
        proveedor_sub: payload.sub,
        email: payload.email,
        email_verificado: payload.email_verified,
        nombre: payload.name,
        foto_url: payload.picture
      });

    } catch (error: any) {
        const detail = error?.message || String(error);
        console.error('[AuthService] Google Auth Error Detail:', detail);
        console.error('[AuthService] Full error:', error);
        throw new Error(`Google Auth falló: ${detail}`);
    }
  }

  // Microsoft Login
  static async loginMicrosoft(idToken: string) {
    try {
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(idToken, getKey, {
                audience: envs.MICROSOFT_CLIENT_ID,
                issuer: [`https://login.microsoftonline.com/${envs.MICROSOFT_TENANT_ID}/v2.0`, `https://sts.windows.net/${envs.MICROSOFT_TENANT_ID}/`], 
                algorithms: ['RS256']
            }, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        }) as any;

        return this.loginOrRegisterProvider({
            proveedor: 'MICROSOFT',
            proveedor_sub: decoded.sub || decoded.oid,
            email: decoded.email || decoded.preferred_username,
            email_verificado: true, 
            nombre: decoded.name,
            foto_url: null 
        });

    } catch (error) {
        console.error('Microsoft Auth Error:', error);
        throw new Error('Microsoft Token inválido');
    }
  }

  private static async loginOrRegisterProvider(data: {
    proveedor: 'GOOGLE' | 'MICROSOFT',
    proveedor_sub: string,
    email?: string,
    email_verificado?: boolean,
    nombre?: string,
    foto_url?: string | null
  }) {
    
    // Domain validation for Microsoft
    if (data.proveedor === 'MICROSOFT' && data.email) {
      const email = data.email.toLowerCase();
      if (!email.endsWith('@uadec.mx') && !email.endsWith('@mail.uadec.mx')) {
        throw new Error('Solo se permiten cuentas institucionales de la UADEC (@uadec.mx).');
      }
    }

    const identityRes = await dbPool.query(
        `SELECT ui.*, u.id_rol, u.id_carrera, u.username, u.activo, r.nombre_rol
         FROM "control financiero".usuarios_identidades ui
         JOIN "control financiero".usuarios u ON ui.id_usuario = u.id_usuario
         JOIN "control financiero".roles r ON u.id_rol = r.id_rol
         WHERE ui.proveedor = $1 AND ui.proveedor_sub = $2`,
        [data.proveedor, data.proveedor_sub]
    );

    let user = identityRes.rows[0];

    if (user) {
        // Automatically activate if not active (User choice: "deje iniciar sesion")
        if (!user.activo) {
            await dbPool.query(
                'UPDATE "control financiero".usuarios SET activo = true WHERE id_usuario = $1',
                [user.id_usuario]
            );
            user.activo = true;
        }
    } else {
        const client = await dbPool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Find role ID
            // Default to 'Pendiente' (ID 4) if id_carrera is NULL to satisfy trigger
            const roleRes = await client.query(
                `SELECT id_rol FROM "control financiero".roles 
                 WHERE nombre_rol ILIKE '%Pendiente%' 
                 LIMIT 1`
            );
            let roleId = roleRes.rows[0]?.id_rol || 4; 

            // 2. Default Career ID
            // Check if any career exists, otherwise use NULL
            const careerRes = await client.query('SELECT id_carrera FROM "control financiero".carreras LIMIT 1');
            const defaultCarreraId = careerRes.rows[0]?.id_carrera || null;

            // If we have a career, we can use 'Coordinador' (ID 2)
            if (defaultCarreraId) {
                const coordRoleRes = await client.query(
                    `SELECT id_rol FROM "control financiero".roles 
                     WHERE nombre_rol ILIKE '%Coordinador%' 
                     LIMIT 1`
                );
                roleId = coordRoleRes.rows[0]?.id_rol || roleId;
            }

            // 3. Create user (activo = true per user request)
            const username = data.email || `${data.proveedor}_${data.proveedor_sub}`;
            const insertUserRes = await client.query(
                `INSERT INTO "control financiero".usuarios (username, password, email, id_rol, id_carrera, activo)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id_usuario`,
                [username, 'oauth_placeholder', data.email, roleId, defaultCarreraId, true]
            );
            const userId = insertUserRes.rows[0].id_usuario;

            // 4. Create identity
            await client.query(
                `INSERT INTO "control financiero".usuarios_identidades 
                 (id_usuario, proveedor, proveedor_sub, email, email_verificado, nombre, foto_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [userId, data.proveedor, data.proveedor_sub, data.email, data.email_verificado, data.nombre, data.foto_url]
            );

            // 5. Log activity
            await client.query(
                `INSERT INTO "control financiero".bitacora_auditoria (id_usuario, accion, detalle)
                 VALUES ($1, $2, $3)`,
                [userId, 'LOGIN_OAUTH_REGISTER', `Usuario registrado y activado vía ${data.proveedor}`]
            );

            await client.query('COMMIT');
            
            // Re-fetch to get role name and other details for token
            const freshUserRes = await dbPool.query(
                `SELECT u.id_usuario, u.username, u.email, u.id_rol, u.id_carrera, r.nombre_rol
                 FROM "control financiero".usuarios u
                 JOIN "control financiero".roles r ON u.id_rol = r.id_rol
                 WHERE u.id_usuario = $1`,
                [userId]
            );
            user = freshUserRes.rows[0];

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    const token = await JwtAdapter.generateToken({
      id: user.id_usuario,
      id_carrera: user.id_carrera,
      role: user.nombre_rol
    });

    if (!token) throw new Error('No se pudo generar el token de sesión');

    const permissions = await this.getUserPermissions(user.id_rol, user.id_usuario);

    return this.formatAuthResponse(user, token, permissions);
  }
}
