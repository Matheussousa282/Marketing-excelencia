const { neon } = require('@neondatabase/serverless');

function getDb() {
  return neon(process.env.DATABASE_URL);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const candidatos = await sql`SELECT * FROM candidatos ORDER BY criado_em DESC`;
      return res.status(200).json(candidatos);
    } catch {
      return res.status(500).json({ error: 'Erro ao buscar dados' });
    }
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url, 'http://x').searchParams.get('id');
    try {
      await sql`DELETE FROM candidatos WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Erro ao deletar' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
