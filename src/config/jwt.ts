import jwt from 'jsonwebtoken';
import { envs } from './envs';

export class JwtAdapter {
  static async generateToken(payload: any, duration: string = '2h'): Promise<string | null> {
    return new Promise((resolve) => {
      jwt.sign(payload, envs.JWT_SECRET, { expiresIn: duration as any }, (err, token) => {
        if (err || typeof token !== 'string') return resolve(null);
        resolve(token);
      });
    });
  }

  static validateToken<T>(token: string): Promise<T | null> {
    return new Promise((resolve) => {
      jwt.verify(token, envs.JWT_SECRET, (err, decoded) => {
        if (err) return resolve(null);
        resolve(decoded as T);
      });
    });
  }
}
