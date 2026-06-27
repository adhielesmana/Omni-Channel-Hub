declare module "bcryptjs" {
  export function hash(s: string, salt: number | string): Promise<string>;
  export function compare(s: string, hash: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
  export function hashSync(s: string, salt: number | string): string;
  export function compareSync(s: string, hash: string): boolean;
  export function genSaltSync(rounds?: number): string;
}

// Multer adds req.file to Express Request
declare global {
  namespace Express {
    interface Request {
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      };
    }
  }
}
