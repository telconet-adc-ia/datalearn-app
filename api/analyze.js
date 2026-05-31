export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pdfBase64, materiaName } = req.body;
  if (!pdfBase64) return res.status(400).json({ error: 'PDF requerido' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            { type: 'text', text: `Analiza este material de Ingeniería en Ciencia de Datos (materia: ${materiaName}). Responde SOLO JSON válido sin backticks:
{"semana":"Semana N","titulo":"Título corto","descripcion":"1-2 oraciones del contenido","temas":[{"id":"t1","n":"Nombre tema","e":"📊","q":"query youtube en español"}],"videos":[{"id":"v1","tt":"Título del video","ch":"Canal recomendado","du":"10:00","idioma":"es","q":"query exacta youtube","ti":"t1","lv":"Introductorio","em":"📈"}]}
Genera 4-6 temas y 10-12 videos (mezcla español e inglés). Niveles: Introductorio/Intermedio/Avanzado.` }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Error de API' });
    const text = data.content.filter(i => i.type === 'text').map(i => i.text).join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
