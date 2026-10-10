import type { Metadata } from 'next'
import { LegalDocument, LegalSection } from '@/components/public/LegalDocument'

export const metadata: Metadata = {
  title: 'Política de privacidad | Coffee Bunn Café',
  description: 'Aviso de privacidad de Coffee Bunn Café.',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument lang="es" eyebrow="Información legal" title="Política de privacidad" updatedAt="Última actualización: 10 de octubre de 2026">
      <p>En Coffee Bunn Café respetamos tu privacidad. Este aviso explica cómo tratamos los datos personales que compartes al solicitar una cotización, realizar un pedido, comunicarte con nosotros o navegar en nuestro sitio.</p>

      <LegalSection title="Responsable y contacto">
        <p>Coffee Bunn Café es responsable del tratamiento de los datos personales recabados a través de este sitio. Para consultas, solicitudes de privacidad o para ejercer tus derechos, escríbenos a <a className="text-cbc-yellow hover:underline" href="mailto:contact@coffeebunncafe.com">contact@coffeebunncafe.com</a>.</p>
      </LegalSection>

      <LegalSection title="Datos que podemos recabar">
        <p>Según la interacción que realices, podemos recabar nombre, empresa, correo electrónico, teléfono o WhatsApp, información de entrega, datos de facturación que nos proporciones y los detalles de tu cotización o pedido. Los pagos se procesan mediante plataformas de pago externas; Coffee Bunn Café no almacena los datos completos de tu tarjeta.</p>
      </LegalSection>

      <LegalSection title="Para qué usamos tus datos">
        <ul className="list-disc space-y-2 pl-5 marker:text-cbc-yellow">
          <li>Preparar cotizaciones, confirmar pedidos, procesar pagos y coordinar entregas.</li>
          <li>Atender consultas, solicitudes de servicio y comunicaciones relacionadas con tu compra.</li>
          <li>Emitir comprobantes fiscales cuando solicites facturación y proporciones la información necesaria.</li>
          <li>Mejorar el funcionamiento, seguridad y experiencia de nuestro sitio.</li>
        </ul>
        <p>No utilizamos tus datos para finalidades promocionales distintas de las anteriores sin informarte y, cuando corresponda, obtener tu consentimiento.</p>
      </LegalSection>

      <LegalSection title="Con quién podemos compartirlos">
        <p>Podemos compartir los datos estrictamente necesarios con proveedores que nos ayudan a procesar pagos, enviar correos, alojar el sitio, elaborar facturas o realizar entregas. Estos proveedores sólo deben utilizarlos para prestar el servicio solicitado. Las plataformas de pago aplican también sus propios avisos de privacidad.</p>
      </LegalSection>

      <LegalSection title="Derechos ARCO y revocación">
        <p>Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos, o revocar tu consentimiento cuando sea procedente. Envía un correo a <a className="text-cbc-yellow hover:underline" href="mailto:contact@coffeebunncafe.com?subject=Solicitud%20de%20privacidad">contact@coffeebunncafe.com</a> con tu nombre, el derecho que deseas ejercer y la información necesaria para localizar tu solicitud. Podremos pedirte información razonable para verificar tu identidad.</p>
      </LegalSection>

      <LegalSection title="Cookies y seguridad">
        <p>Si aceptas la medición opcional en el aviso de cookies, usamos Google Analytics 4 para medir visitas y Microsoft Clarity para analizar interacciones, mapas de calor y grabaciones de sesión. Google Analytics recibe la ruta consultada sin parámetros de URL. No medimos páginas de administración, inicio de sesión ni seguimiento de pedidos. Los campos de los formularios de contacto y cotización se enmascaran en Clarity; además, Clarity enmascara los campos de entrada por defecto.</p>
        <p>Estos proveedores reciben información técnica y de uso del navegador conforme a sus propios avisos: <a className="text-cbc-yellow hover:underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacidad de Google</a> y <a className="text-cbc-yellow hover:underline" href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noreferrer">Privacidad de Microsoft</a>. Los scripts de analítica no se cargan antes de que aceptes. Guardamos tu elección en el almacenamiento local de tu navegador; puedes rechazar o cambiarla en cualquier momento desde “Preferencias de cookies”. Si retiras tu consentimiento, actualizamos la señal para ambos proveedores y eliminamos las cookies de analítica que el navegador permita borrar. Google Analytics y Clarity pueden procesar señales limitadas sin cookies mientras esa página permanezca abierta, según sus modos de consentimiento; al volver a cargar la página respetamos tu elección y no cargamos los scripts.</p>
        <p>Aplicamos medidas administrativas y técnicas razonables para proteger los datos; sin embargo, ningún sistema de internet es completamente invulnerable.</p>
      </LegalSection>

      <LegalSection title="Cambios a este aviso">
        <p>Podemos actualizar este aviso para reflejar cambios operativos, legales o de seguridad. Publicaremos la versión vigente en esta página con su fecha de actualización.</p>
      </LegalSection>
    </LegalDocument>
  )
}
