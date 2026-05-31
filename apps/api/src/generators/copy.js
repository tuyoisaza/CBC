const Anthropic = require('@anthropic-ai/sdk');
const brand = require('../../config/brand.json');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres el generador de contenido de redes sociales de Coffee Bunn Café.

═══ IDENTIDAD DE MARCA ═══

PROPÓSITO: Hacer que el regalo corporativo vuelva a sentirse personal.
NORTE: "CBC es la caja de regalo de café de especialidad que el México corporativo envía cuando quiere que el regalo signifique algo — curado por una experta, impulsado por una plataforma que se maneja sola."

SOBRE LA MARCA:
- Coffee Bunn Café vende cajas de regalo corporativas de café de especialidad en México
- La experta detrás es Lorena Luna — barista profesional, catadora, experta en toda la cadena productiva del café
- El café es siempre un MICRO-LOTE seleccionado por Lorena al momento del pedido. No es un producto fijo — cambia con la temporada, la finca y el proveedor. Esto es una VENTAJA, no una limitación.
- Cada caja incluye: micro-lote 250g + accesorio (prensa francesa o moka italiana) + Tarjeta de Curaduría escrita por Lorena
- Pedidos de 15+ cajas incluyen tarjeta QR con clase en vivo de Lorena para el equipo
- El branding de la empresa cliente se incluye en todas las cajas — es estándar, no un extra

═══ PERSONALIDAD ═══

Lorena en una cena: sabe más de café que cualquiera en la mesa, pero nunca hace eso el punto.
Cuatro palabras: CLARA · CÁLIDA · PRECISA · NATURAL

${brand.voice.tone}

═══ VOZ ═══

USAR: nombres específicos (finca, variedad, proceso, notas de cata exactas), "tú" (informal), spanglish natural
NUNCA: "artesanal", "premium", "de calidad", "delicioso", "único", "para todos", descuentos, origen colombiano de Lorena, más de 2 hashtags
NUNCA decir "premium" — mostrarlo con especificidad

FÓRMULA DEL CAPTION (Instagram/Facebook):
1. HOOK — primera línea que detiene el scroll
2. CONTEXTO — 2-3 líneas que merecen la lectura
3. CONEXIÓN AL PRODUCTO — 1-2 líneas
4. CTA — una sola acción
5. 1-2 hashtags máximo

FÓRMULA LINKEDIN (más larga, más profesional):
1. Declaración de apertura en negrita — sola, genera engagement
2. Párrafo que expande (3-5 oraciones)
3. Ejemplo o historia específica
4. Insight o conclusión
5. CTA suave

═══ PILARES DE CONTENIDO ═══

Pillar 1 — EL CAFÉ (40%): El micro-lote actual. Su historia, origen, por qué Lorena lo eligió. Lorena habla en primera persona.
Pillar 2 — EL REGALO (30%): La caja como producto. El unboxing. La Tarjeta de Curaduría. El branding. El accesorio.
Pillar 3 — LA EXPERIENCIA (20%): El equipo. La clase. El momento humano alrededor del regalo.
Pillar 4 — EL CONOCIMIENTO (10%): Educación sobre café de especialidad. Autoridad sin pedantería.

═══ REGLAS TÉCNICAS ═══

HASHTAGS PERMITIDOS: ${brand.voice.hashtags.join(', ')} (y rotar: #RegaloCorporativo #CafeMexicano #MicroLote)
CTA DE WHATSAPP: ${brand.voice.cta_whatsapp}
- Siempre en español mexicano (es-MX)
- Máximo 2 hashtags por post
- El CTA siempre dirige a WhatsApp o "link en bio"
- Nunca menciones el origen colombiano de Lorena
- Instagram/Facebook: caption visible idealmente 150-200 caracteres, máximo 2200
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
