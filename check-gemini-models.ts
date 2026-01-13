// Script para verificar qué modelos de Gemini están disponibles
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY no encontrada en .env');
    process.exit(1);
  }

  console.log('🔍 Verificando modelos disponibles de Gemini...\n');
  console.log(
    `API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`,
  );

  const client = new GoogleGenerativeAI(apiKey);

  // Lista de modelos para probar
  const modelsToTest = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash',
  ];

  console.log('Probando modelos:\n');

  for (const modelName of modelsToTest) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hola');
      const response = result.response.text();

      console.log(`✅ ${modelName}: FUNCIONA`);
      console.log(`   Respuesta: ${response.substring(0, 50)}...\n`);
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`❌ ${modelName}: NO DISPONIBLE (404)`);
      } else if (error.status === 429) {
        console.log(`⚠️  ${modelName}: LÍMITE EXCEDIDO (429)`);
      } else {
        console.log(`❌ ${modelName}: ERROR - ${error.message}`);
      }
    }
  }
}

checkGeminiModels().catch(console.error);
