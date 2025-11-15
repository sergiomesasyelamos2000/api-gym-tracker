// src/config/cloudinary.config.ts
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

// Cargar variables de entorno directamente
dotenv.config();

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Validar
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary credentials missing!');
  console.error('Cloud Name:', CLOUDINARY_CLOUD_NAME);
  console.error('API Key:', CLOUDINARY_API_KEY ? 'Present' : 'Missing');
  console.error('API Secret:', CLOUDINARY_API_SECRET ? 'Present' : 'Missing');
  throw new Error(
    'Cloudinary credentials are missing. Please check your .env file',
  );
}

// Configurar
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;
