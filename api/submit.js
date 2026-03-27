const { neon } = require('@neondatabase/serverless');

function getDb() {
  return neon(process.env.DATABASE_URL);
}

async function initDb(sql) {
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

  // Garante que a constraint de duplicata existe
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_candidato_email_telefone_minuto'
      ) THEN
        ALTER TABLE candidatos
          ADD CONSTRAINT uq_candidato_email_telefone_minuto
          UNIQUE (email, telefone, date_trunc('minute', criado_em));
      END IF;
    END
    $$
  `;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { nome, telefone, email, estado, cidade, conheceu_evento } = await readBody(req);

  if (!nome || !telefone || !email || !estado || !cidade)
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });

  try {
    const sql = getDb();
    await initDb(sql);

    // Verifica se já existe cadastro com mesmo email nos últimos 2 minutos
    const existente = await sql`
      SELECT id FROM candidatos
      WHERE email = ${email}
        AND criado_em > NOW() - INTERVAL '2 minutes'
      LIMIT 1
    `;

    if (existente.length > 0) {
      // Retorna sucesso silencioso para não confundir o usuário,
      // mas não duplica o registro
      return res.status(200).json({ success: true, message: 'Cadastro realizado com sucesso!' });
    }

    await sql`
      INSERT INTO candidatos (nome, telefone, email, estado, cidade, conheceu_evento)
      VALUES (${nome}, ${telefone}, ${email}, ${estado}, ${cidade}, ${conheceu_evento === 'sim'})
    `;

    return res.status(200).json({ success: true, message: 'Cadastro realizado com sucesso!' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno ao salvar cadastro' });
  }
};
