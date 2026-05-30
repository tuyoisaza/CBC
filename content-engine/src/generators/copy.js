const Anthropic = require('@anthropic-ai/sdk');
const brand = require('../../config/brand.json');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres el generador de contenido de redes sociales de Coffee Bunn Café.

SOBRE LA MARCA:
- Coffee Bunn Café vende cajas de regalo corporativas de café de especialidad en México
- La experta detrás de la marca es Lorena Luna — barista, catadora, conocedora de toda la cadena productiva del café
- Cada caja incluye un micro-lote de especialidad seleccionado por Lorena, un accesorio de preparación (prensa francesa o moka), y una tarjeta de curaduría con la historia del café
- Pedidos de 15+ cajas incluyen una clase en vivo con Lorena para el equipo de la empresa
- El branding de la empresa cliente se incluye en todas las cajas

VOZ Y TONO:
${brand.voice.tone}

NO HACER:
${brand.voice.doNot}

HASHTAGS PERMITIDOS: ${brand.voice.hashtags.join(', ')}

CTA DE WHATSAPP: ${brand.voice.cta_whatsapp}

REGLAS:
- Siempre en español mexicano (es-MX)
- Máximo 2 hashtags por post
- El CTA siempre dirige a WhatsApp
- Nunca menciones el origen colombiano de Lorena
- El post de Instagram/Facebook tiene máximo 2200 caracteres pero idealmente 150-200 para el caption visible
- El post de LinkedIn puede ser más largo (300-500 palabras) y más profesional
`;

async function generateCaption(postType, data) {
  const prompts = {
    productPost: `Genera un caption para Instagram/Facebook mostrando las cajas de regalo de café CBC.
Contexto del producto: Cajas de regalo corporativas con café de especialidad micro-lote, prensa francesa o moka italiana, tarjeta de curaduría de Lorena. Desde 10 piezas, branding de la empresa incluido. Pedidos de 15+ incluyen clase en vivo.
Enfoque: el producto físico, la calidad, el detalle del regalo.
Termina con CTA a WhatsApp para cotizar.`,

    coffeeStory: `Genera un caption para Instagram/Facebook sobre el café actual en las cajas.
Café actual: ${JSON.stringify(data.coffee)}
Enfoque: contar la historia de ESTE café específico — su origen, qué lo hace especial, cómo huele y sabe. Lorena habla en primera persona como la persona que lo eligió.
Termina con CTA a WhatsApp para cotizar cajas.`,

    linkedinPost: `Genera un post para LinkedIn de Lorena Luna sobre Coffee Bunn Café y regalos corporativos de café de especialidad.
Rotate entre estos enfoques (elige el que se sienta más fresco):
1. Por qué los regalos corporativos de café de especialidad son mejores que los regalos genéricos
2. La historia detrás del micro-lote actual: ${JSON.stringify(data.coffee)}
3. Por qué el café que cambia es mejor que un producto fijo
4. El diferencial de la clase en vivo para equipos corporativos
Tono: profesional pero personal. Lorena como experta, no como marca. Termina con CTA suave a LinkedIn DM o WhatsApp.`,

    seasonal: `Genera contenido para la campaña de temporada: ${data.season.name}.
La temporada se acerca. Las empresas están buscando regalos para colaboradores y clientes.
Enfoque: urgencia de temporada + el diferencial de CBC (micro-lote curado, branding incluido, clase en vivo a 15+).
Plataforma: ${data.platform}. Tono según la plataforma (más casual en IG/FB, más profesional en LinkedIn).`
  };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompts[postType] }]
  });

  return response.content[0].text;
}

async function generateImagePrompt(postType, data) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: `Genera prompts para DALL-E 3 para Coffee Bunn Café.
Estilo visual de la marca: ${JSON.stringify(brand.imageStyle)}
El prompt debe producir imágenes de alta calidad, oscuras y elegantes, con fondo negro profundo, detalles en amarillo cálido, sin texto, fotorrealistas.
Responde SOLO con el prompt en inglés para DALL-E 3, sin explicaciones.`,
    messages: [{
      role: 'user',
      content: `Genera un prompt de imagen para un post tipo: ${postType}.
Datos del café actual: ${JSON.stringify(data.coffee || {})}.
El prompt debe especificar: composición, iluminación, props de café, colores de marca.`
    }]
  });

  return response.content[0].text;
}

async function parseCoffeeUpdate(message) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: `Extrae información de un mensaje de WhatsApp donde Lorena describe un nuevo café de especialidad para las cajas de regalo CBC.
Devuelve SOLO un objeto JSON válido con esta estructura exacta:
{
  "name": "nombre del café",
  "origin": { "country": "país", "region": "región", "farm": "nombre de la finca o cooperativa" },
  "variety": "variedad del grano",
  "process": "proceso (lavado, natural, honey, etc)",
  "roast": "nivel de tueste",
  "tastingNotes": ["nota1", "nota2", "nota3"],
  "brewingMethods": ["método1", "método2"],
  "story": "una frase que capture la esencia de este café"
}
Si algún campo no está en el mensaje, usa null. Devuelve solo el JSON, sin markdown ni explicaciones.`,
    messages: [{ role: 'user', content: message }]
  });

  return JSON.parse(response.content[0].text);
}

module.exports = { generateCaption, generateImagePrompt, parseCoffeeUpdate };
