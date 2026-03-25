const { neon } = require('@neondatabase/serverless');

const DEFAULT_CONFIG = {
  logo_texto: 'Excelência®', logo_subtexto: 'Lingerie', logo_imagem: '',
  cor_primaria: '#C9A96E', cor_secundaria: '#A8854A', cor_destaque: '#E8D5B0',
  hero_titulo: 'Seja uma', hero_destaque: 'empreendedora\nde sucesso',
  hero_subtitulo: 'com a Excelência Lingerie!',
  beneficio_1_titulo: 'Variedade de produtos',       beneficio_1_icone: '📦', beneficio_1_imagem: '',
  beneficio_2_titulo: 'Flexibilidade de horários',   beneficio_2_icone: '🕐', beneficio_2_imagem: '',
  beneficio_3_titulo: 'Alta lucratividade',           beneficio_3_icone: '📈', beneficio_3_imagem: '',
  beneficio_4_titulo: 'Receba seus produtos em casa', beneficio_4_icone: '🚚', beneficio_4_imagem: '',
  beneficio_5_titulo: 'Marca consolidada',            beneficio_5_icone: '✅', beneficio_5_imagem: '',
  beneficio_6_titulo: 'Brindes exclusivos',           beneficio_6_icone: '🎁', beneficio_6_imagem: '',
};

function getDb() {
  return neon(process.env.DATABASE_URL);
}

async function initSettings(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave VARCHAR(100) PRIMARY KEY,
      valor TEXT NOT NULL,
      atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
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

  const sql = getDb();
  await initSettings(sql);

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT chave, valor FROM configuracoes`;
      const config = { ...DEFAULT_CONFIG };
      rows.forEach(r => { config[r.chave] = r.valor; });
      return res.status(200).json(config);
    } catch {
      return res.status(200).json(DEFAULT_CONFIG);
    }
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    try {
      for (const [chave, valor] of Object.entries(body)) {
        await sql`
          INSERT INTO configuracoes (chave, valor) VALUES (${chave}, ${valor})
          ON CONFLICT (chave) DO UPDATE SET valor = ${valor}, atualizado_em = NOW()
        `;
      }
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
