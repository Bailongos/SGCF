import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { dbPool } from '../../data';
import { JwtAdapter } from '../../config/jwt';
import { envs } from '../../config/envs';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const googleClient = new OAuth2Client(envs.GOOGLE_CLIENT_ID);

// JWKS Client for Microsoft (and potentially others)
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

  // Local Login
  static async loginUser(loginUserDto: any) {
    const { username, password } = loginUserDto;

    const userRes = await dbPool.query(
      `SELECT u.id_usuario, u.username, u.password, u.id_rol, u.id_carrera, r.nombre_rol, u.activo
       FROM "control financiero".usuarios u
       JOIN "control financiero".roles r ON u.id_rol = r.id_rol
       WHERE u.username = $1`,
      [username]
    );

    const user = userRes.rows[0];
    if (!user) throw new Error('Credenciales inválidas');
    if (!user.activo) throw new Error('Usuario inactivo. Contacte al administrador.');

    // Check password (hash or plain text fallback for migration)
    const isMatch = bcrypt.compareSync(password, user.password) || user.password === password;
    if (!isMatch) throw new Error('Credenciales inválidas');

    // If plain text matched, update to hash (migration on the fly)
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
  static async registerUser(registerDto: any) {
    const { username, password, email } = registerDto;

    if (!username || !password) throw new Error('Username y contraseña son requeridos');

    // 1. Check if user exists
    const existing = await dbPool.query(
        'SELECT id_usuario FROM "control financiero".usuarios WHERE username = $1 OR (email = $2 AND email IS NOT NULL)',
        [username, email]
    );
    if (existing.rows.length > 0) throw new Error('El nombre de usuario o email ya está registrado');

    // 2. Get 'Pendiente' role ID
    const roleRes = await dbPool.query('SELECT id_rol FROM "control financiero".roles WHERE nombre_rol = $1', ['Pendiente']);
    const roleId = roleRes.rows[0]?.id_rol;
    if (!roleId) throw new Error('El sistema no está configurado correctamente (Rol Pendiente faltante)');

    // 3. Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // 4. Create inactive user
    await dbPool.query(
        `INSERT INTO "control financiero".usuarios (username, password, email, id_rol, activo)
         VALUES ($1, $2, $3, $4, $5)`,
        [username, passwordHash, email, roleId, false]
    );

    return { message: 'Registro exitoso. Su cuenta debe ser activada por un administrador.' };
  }

  // Google Login
  static async loginGoogle(idToken: string) {
    try {
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

    } catch (error) {
        console.error('Google Auth Error:', error);
        throw new Error('Google Token inválido');
    }
  }

  // Microsoft Login
  static async loginMicrosoft(idToken: string) {
    try {
        // Verify Microsoft Token Signature & Claims manually or via library
        // Since we don't have a full MSAL backend setup for 'on-behalf-of' flow, 
        // validating the ID token from client is the standard way for SPA/Mobile + API.
        
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(idToken, getKey, {
                audience: envs.MICROSOFT_CLIENT_ID,
                issuer: [`https://login.microsoftonline.com/${envs.MICROSOFT_TENANT_ID}/v2.0`, `https://sts.windows.net/${envs.MICROSOFT_TENANT_ID}/`], // Handle v1/v2 endpoints
                algorithms: ['RS256']
            }, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        }) as any;

        return this.loginOrRegisterProvider({
            proveedor: 'MICROSOFT',
            proveedor_sub: decoded.sub || decoded.oid, // oid is often simpler for object id in Azure AD
            email: decoded.email || decoded.preferred_username,
            email_verificado: true, // Azure AD verified usually
            nombre: decoded.name,
            foto_url: null // MS Graph API call needed for photo, skip for now
        });

    } catch (error) {
        console.error('Microsoft Auth Error:', error);
        throw new Error('Microsoft Token inválido');
    }
  }

  // Common Logic
  private static async loginOrRegisterProvider(data: {
    proveedor: 'GOOGLE' | 'MICROSOFT',
    proveedor_sub: string,
    email?: string,
    email_verificado?: boolean,
    nombre?: string,
    foto_url?: string | null
  }) {
    
    // 1. Check if identity exists
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
        // Update identity info if changed (optional)
        // Check active status
        if (!user.activo) throw new Error('Usuario pendiente de activación. Contacte al administrador.');
    } else {
        // Register new user
        // 1. Check if email exists in users table to link? (Optional, but good practice)
        // If not, create new user with role 'Pendiente' (or 'Coordinador' inactive)
        
        // Transaction
        const client = await dbPool.connect();
        try {
            await client.query('BEGIN');
            
            // Check by email first
            let userId: number;
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
            const insertUserRes = await client.query(
                `INSERT INTO "control financiero".usuarios (username, password, email, id_rol, activo)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id_usuario`,
                [data.email || `${data.proveedor}_${data.proveedor_sub}`, 'oauth_placeholder', data.email, roleId, false]
            );
            userId = insertUserRes.rows[0].id_usuario;

            // Create Identity
            await client.query(
                `INSERT INTO "control financiero".usuarios_identidades 
                 (id_usuario, proveedor, proveedor_sub, email, email_verificado, nombre, foto_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [userId, data.proveedor, data.proveedor_sub, data.email, data.email_verificado, data.nombre, data.foto_url]
            );

            await client.query('COMMIT');

            // Return basic info (inactive)
            throw new Error('Registro exitoso. Su cuenta está pendiente de aprobación por un administrador.');

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    // Generate Token
    const token = await JwtAdapter.generateToken({
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
