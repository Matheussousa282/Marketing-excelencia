const { neon } = require('@neondatabase/serverless');

function getDb() {
  return neon(process.env.DATABASE_URL);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 3e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { beneficioIndex, base64, mimeType } = await readBody(req);
  if (!beneficioIndex || !base64 || !mimeType) return res.status(400).json({ error: 'Dados incompletos' });

  const allowed = ['image/png','image/jpeg','image/jpg','image/gif','image/svg+xml','image/x-icon','image/webp'];
  if (!allowed.includes(mimeType)) return res.status(400).json({ error: 'Tipo não suportado' });

  const dataUrl = `data:${mimeType};base64,${base64}`;
  const chave = `beneficio_${beneficioIndex}_imagem`;
  const chaveIcone = `beneficio_${beneficioIndex}_icone`;

  try {
    const sql = getDb();
    await sql`INSERT INTO configuracoes (chave, valor) VALUES (${chave}, ${dataUrl}) ON CONFLICT (chave) DO UPDATE SET valor = ${dataUrl}, atualizado_em = NOW()`;
    await sql`INSERT INTO configuracoes (chave, valor) VALUES (${chaveIcone}, '') ON CONFLICT (chave) DO UPDATE SET valor = '', atualizado_em = NOW()`;
    return res.status(200).json({ success: true, dataUrl });
  } catch {
    return res.status(500).json({ error: 'Erro ao salvar ícone' });
  }
};
