import { neon } from '@neondatabase/serverless';

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

export async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS candidatos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      telefone VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      estado VARCHAR(100) NOT NULL,
      cidade VARCHAR(150) NOT NULL,
      conheceu_evento BOOLEAN DEFAULT FALSE,
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
}
