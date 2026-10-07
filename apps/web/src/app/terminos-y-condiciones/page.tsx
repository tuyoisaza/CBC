import type { Metadata } from 'next'
import { LegalDocument, LegalSection } from '@/components/public/LegalDocument'

export const metadata: Metadata = {
  title: 'Términos y condiciones | Coffee Bunn Café',
  description: 'Términos y condiciones de uso y compra de Coffee Bunn Café.',
}

export default function TermsAndConditionsPage() {
  return (
    <LegalDocument lang="es" eyebrow="Información legal" title="Términos y condiciones" updatedAt="Última actualización: 6 de octubre de 2026">
      <p>Estos términos regulan el uso de este sitio y la contratación de productos y servicios de Coffee Bunn Café. Al solicitar una cotización, realizar un pedido o utilizar el sitio, aceptas estos términos.</p>

      <LegalSection title="Cotizaciones y pedidos">
        <p>Las cotizaciones se elaboran con base en la información proporcionada y están sujetas a disponibilidad, confirmación de especificaciones, cantidades, personalización, tiempos de producción y costo de entrega. Un pedido se considera confirmado cuando Coffee Bunn Café confirme las condiciones aplicables y, cuando corresponda, el pago o anticipo requerido.</p>
      </LegalSection>

      <LegalSection title="Precios, impuestos y pagos">
        <p>Los precios, impuestos, descuentos, costos de envío y condiciones de pago se muestran o confirman antes de formalizar el pedido. Los pagos se procesan por proveedores externos y la aprobación depende de dichos proveedores. Un intento de pago o un regreso desde la plataforma de pago no confirma por sí solo un pedido hasta que el pago sea verificado.</p>
      </LegalSection>

      <LegalSection title="Personalización, producción y entrega">
        <p>Los productos corporativos pueden incluir elementos personalizados. El cliente es responsable de contar con los derechos necesarios sobre los logotipos, textos, imágenes o materiales que nos proporcione. Los plazos de producción y entrega se acuerdan para cada pedido; pueden cambiar por aprobaciones pendientes, cambios solicitados, disponibilidad o circunstancias fuera de nuestro control.</p>
      </LegalSection>

      <LegalSection title="Cambios, cancelaciones y devoluciones">
        <p>Por tratarse de productos personalizados o preparados bajo pedido, las solicitudes de cambio, cancelación o devolución se revisan caso por caso y dependen de la etapa de producción y de las condiciones confirmadas en la cotización. Si recibes un producto con daño atribuible a la entrega o con una diferencia relevante respecto al pedido confirmado, contáctanos a la brevedad con los datos del pedido y evidencia razonable.</p>
      </LegalSection>

      <LegalSection title="Uso del sitio y propiedad intelectual">
        <p>El contenido del sitio, incluyendo marcas, textos, fotografías y diseño, pertenece a Coffee Bunn Café o se utiliza con autorización. No puedes copiarlo, modificarlo o usarlo comercialmente sin permiso previo por escrito. No debes usar el sitio de forma ilícita, interferir con su seguridad ni intentar acceder a información o sistemas sin autorización.</p>
      </LegalSection>

      <LegalSection title="Limitación de responsabilidad">
        <p>La información del sitio se proporciona para fines informativos y comerciales. En la medida permitida por la ley aplicable, Coffee Bunn Café no será responsable por daños indirectos derivados del uso del sitio, interrupciones técnicas o información proporcionada por terceros. Nada de estos términos limita derechos que la ley no permita limitar.</p>
      </LegalSection>

      <LegalSection title="Cambios y ley aplicable">
        <p>Podemos actualizar estos términos y publicaremos la versión vigente en esta página. Las relaciones derivadas de un pedido se regirán por las leyes aplicables en México, sin perjuicio de los derechos irrenunciables que correspondan a las personas consumidoras.</p>
      </LegalSection>
    </LegalDocument>
  )
}
