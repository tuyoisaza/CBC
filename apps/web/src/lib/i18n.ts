export const translations = {
  nav: {
    dashboard: { es: 'Dashboard', en: 'Dashboard' },
    sales: { es: 'Ventas', en: 'Sales' },
    products: { es: 'Productos', en: 'Products' },
    methods: { es: 'Métodos', en: 'Methods' },
    extras: { es: 'Extras', en: 'Extras' },
    shippingZones: { es: 'Zonas de envío', en: 'Shipping Zones' },
    discounts: { es: 'Descuentos', en: 'Discounts' },
    service: { es: 'Servicio', en: 'Service' },
    settings: { es: 'Config', en: 'Settings' },
    debug: { es: 'Debug', en: 'Debug' },
    system: { es: 'Sistema', en: 'System' },
    logout: { es: 'Salir', en: 'Logout' },
    lightMode: { es: 'Modo claro', en: 'Light mode' },
    darkMode: { es: 'Modo oscuro', en: 'Dark mode' },
  },
  dashboard: {
    revenue: { es: 'Revenue este mes', en: 'Revenue this month' },
    openLeads: { es: 'Leads abiertos', en: 'Open leads' },
    activeOrders: { es: 'Pedidos activos', en: 'Active orders' },
    unread: { es: 'Sin leer', en: 'Unread' },
    quickActions: { es: 'Acciones rápidas', en: 'Quick actions' },
    newLead: { es: 'Nuevo lead', en: 'New lead' },
    newLeadDesc: { es: 'Agregar manualmente', en: 'Add manually' },
    viewProducts: { es: 'Ver productos', en: 'View products' },
    viewMessages: { es: 'Ver mensajes', en: 'View messages' },
    viewRevenue: { es: 'Ver revenue', en: 'View revenue' },
  },
  settings: {
    title: { es: 'Configuración', en: 'Settings' },
    description: { es: 'API keys y configuración del sitio. Los valores se guardan en la base de datos encriptados.', en: 'API keys and site configuration. Values are stored encrypted in the database.' },
  },
  admin: {
    analyticsSettings: {
      title: { es: 'Medición del sitio', en: 'Website measurement' },
      description: { es: 'Conecta GA4 y Microsoft Clarity. Los IDs se guardan en la base de datos y sólo se publican para que los navegadores puedan cargar las etiquetas después del consentimiento.', en: 'Connect GA4 and Microsoft Clarity. IDs are stored in the database and exposed only so browsers can load the tags after consent.' },
      howTo: { es: 'Dónde encontrar los IDs', en: 'Where to find the IDs' },
      googleSteps: { es: 'Google Analytics: Administrar → Flujos de datos → abre el flujo web y copia el ID de medición (G-...).', en: 'Google Analytics: Admin → Data streams → open the web stream and copy the Measurement ID (G-...).' },
      claritySteps: { es: 'Microsoft Clarity: abre el proyecto → Settings → Overview y copia el Project ID.', en: 'Microsoft Clarity: open the project → Settings → Overview and copy the Project ID.' },
      providerSetup: { es: 'Antes de activar: desactiva Enhanced Measurement en el flujo web de GA4. En Clarity, ve a Settings → Setup y desactiva el guardado de cookies predeterminado para esperar el consentimiento.', en: 'Before enabling: turn off Enhanced Measurement in the GA4 web stream. In Clarity, go to Settings → Setup and turn off default cookie setting so it waits for consent.' },
      googleLabel: { es: 'Google Analytics 4 — Measurement ID', en: 'Google Analytics 4 — Measurement ID' },
      googleHelp: { es: 'Formato: G- seguido de letras o números. Déjalo vacío para desconectar GA4.', en: 'Format: G- followed by letters or numbers. Leave blank to disconnect GA4.' },
      clarityLabel: { es: 'Microsoft Clarity — Project ID', en: 'Microsoft Clarity — Project ID' },
      clarityHelp: { es: 'Copia el identificador del proyecto en Clarity. Déjalo vacío para desconectar Clarity.', en: 'Copy the project identifier from Clarity. Leave blank to disconnect Clarity.' },
      clearHelp: { es: 'Al guardar un campo vacío se elimina ese ID de la configuración.', en: 'Saving a blank field removes that ID from the configuration.' },
      save: { es: 'Guardar medición', en: 'Save measurement' },
      saving: { es: 'Guardando…', en: 'Saving…' },
      loading: { es: 'Cargando…', en: 'Loading…' },
      retry: { es: 'Reintentar', en: 'Retry' },
      loadError: { es: 'No se pudo cargar la configuración. Vuelve a intentar.', en: 'Could not load the configuration. Please retry.' },
      saveError: { es: 'No se pudo guardar la configuración. Revisa los IDs e intenta de nuevo.', en: 'Could not save the configuration. Check the IDs and try again.' },
      saved: { es: 'Configuración de medición guardada.', en: 'Measurement settings saved.' },
    },
  },
  service: {
    title: { es: 'Servicio al cliente', en: 'Customer Service' },
    unreadCount: { es: 'sin leer', en: 'unread' },
  },
  common: {
    search: { es: 'Buscar', en: 'Search' },
    save: { es: 'Guardar', en: 'Save' },
    cancel: { es: 'Cancelar', en: 'Cancel' },
    delete: { es: 'Eliminar', en: 'Delete' },
    edit: { es: 'Editar', en: 'Edit' },
    create: { es: 'Crear', en: 'Create' },
    loading: { es: 'Cargando', en: 'Loading' },
    error: { es: 'Error', en: 'Error' },
    success: { es: 'Éxito', en: 'Success' },
    noData: { es: 'No hay datos', en: 'No data' },
  },
  public: {
    quote: { es: 'Cotizar', en: 'Get a Quote' },
    track: { es: 'Rastrear Pedido', en: 'Track Order' },
    contact: { es: 'Contacto', en: 'Contact' },
    home: { es: 'Inicio', en: 'Home' },
    admin: { es: 'Admin Portal', en: 'Admin Portal' },
    tagline: { es: 'Regalos corporativos premium con café de especialidad mexicano.', en: 'Premium corporate gifts with Mexican specialty coffee.' },
    company: { es: 'Empresa', en: 'Company' },
    rights: { es: 'Todos los derechos reservados.', en: 'All rights reserved.' },
    tracking: { es: 'Rastrear Pedido', en: 'Track Order' },
    whatsapp: { es: 'WhatsApp', en: 'WhatsApp' },
    privacyPolicy: { es: 'Política de privacidad', en: 'Privacy Policy' },
    termsConditions: { es: 'Términos y condiciones', en: 'Terms and Conditions' },
    analyticsConsent: {
      title: { es: 'Medición opcional del sitio', en: 'Optional website analytics' },
      descriptionBoth: {
        es: 'Si aceptas, usaremos {providers} para medir visitas e interacciones y mejorar el sitio. Los campos de contacto y cotización se enmascaran en las grabaciones de Clarity.',
        en: 'If you accept, we will use {providers} to measure visits and interactions and improve the site. Contact and quote fields are masked in Clarity recordings.',
      },
      descriptionGoogle: {
        es: 'Si aceptas, usaremos {providers} para medir visitas y mejorar el sitio. No enviaremos parámetros de URL a Analytics.',
        en: 'If you accept, we will use {providers} to measure visits and improve the site. URL parameters are not sent to Analytics.',
      },
      descriptionClarity: {
        es: 'Si aceptas, usaremos {providers} para medir interacciones y mejorar el sitio. Los campos de contacto y cotización se enmascaran en las grabaciones.',
        en: 'If you accept, we will use {providers} to measure interactions and improve the site. Contact and quote fields are masked in recordings.',
      },
      accept: { es: 'Aceptar analítica', en: 'Accept analytics' },
      reject: { es: 'Rechazar analítica', en: 'Reject analytics' },
      preferences: { es: 'Preferencias de cookies', en: 'Cookie preferences' },
      close: { es: 'Cerrar', en: 'Close' },
      privacy: { es: 'Política de privacidad', en: 'Privacy policy' },
    },
  },
  home: {
    eyebrow: { es: 'B2B / Regalos Corporativos', en: 'B2B / Corporate Gifts' },
    titleStart: { es: 'Eleva la', en: 'Elevate Your' },
    titleHighlight: { es: 'Experiencia', en: 'Brand' },
    titleEnd: { es: 'de tu Marca', en: 'Experience' },
    heroDesc: {
      es: 'Regalos corporativos premium con café de especialidad mexicano. Diseñamos cajas personalizadas que tus clientes y equipo realmente recordarán.',
      en: 'Premium corporate gifts featuring Mexican specialty coffee. We design custom boxes that your clients and team will truly remember.',
    },
    getQuote: { es: 'Cotizar', en: 'Get a Quote' },
    viewCatalog: { es: 'Ver Catálogo B2B', en: 'View B2B Catalog' },
    talkToSales: { es: 'Hablar con Ventas', en: 'Talk to Sales' },
    ourBoxes: { es: 'Nuestras Cajas', en: 'Our Boxes' },
    ourBoxesDesc: {
      es: 'Elige la experiencia que mejor se adapte a tu equipo o clientes.',
      en: 'Choose the experience that best fits your team or clients.',
    },
    viewProduct: { es: 'Ver producto', en: 'View product' },
    noImage: { es: 'Sin imagen', en: 'No image' },
    more: { es: 'más', en: 'more' },
    specialtyCoffee: { es: 'Café de Especialidad', en: 'Specialty Coffee' },
    specialtyCoffeeDesc: {
      es: 'Seleccionamos los mejores granos de México, tostados bajo demanda para garantizar máxima frescura.',
      en: 'We source the best beans from Mexico, roasted on demand to guarantee peak freshness.',
    },
    customDesign: { es: 'Diseño Personalizado', en: 'Custom Design' },
    customDesignDesc: {
      es: 'Tu logo y branding integrados de forma elegante en cada elemento de la caja de regalo.',
      en: 'Your logo and branding elegantly integrated into every element of the gift box.',
    },
    logistics: { es: 'Logística Integral', en: 'End-to-End Logistics' },
    logisticsDesc: {
      es: 'Entregamos en volumen a tus oficinas o directamente a la puerta de cada uno de tus clientes.',
      en: 'We deliver in volume to your offices or directly to the doorstep of every client.',
    },
    video: { es: 'Video', en: 'Video' },
  },
  products: {
    slug: { es: 'productos', en: 'productos' },
  },
  contact: {
    title: { es: 'Contacto', en: 'Contact Us' },
    subtitle: {
      es: 'Déjanos tus datos y nos pondremos en contacto contigo.',
      en: 'Share your details and we will get back to you.',
    },
    company: { es: 'Empresa', en: 'Company' },
    name: { es: 'Nombre', en: 'Name' },
    email: { es: 'Email', en: 'Email' },
    whatsapp: { es: 'WhatsApp', en: 'WhatsApp' },
    message: { es: 'Mensaje', en: 'Message' },
    sending: { es: 'Enviando...', en: 'Sending...' },
    sendMessage: { es: 'Enviar mensaje', en: 'Send message' },
    successMsg: {
      es: '¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.',
      en: 'Message sent successfully! We will be in touch soon.',
    },
    errorMsg: {
      es: 'Ocurrió un error. Por favor intenta de nuevo.',
      en: 'An error occurred. Please try again.',
    },
  },
  cotizar: {
    title: { es: 'Cotiza tus Regalos', en: 'Get a Quote' },
    subtitle: {
      es: 'Configura tu pedido y recibe una cotización automática al instante.',
      en: 'Configure your order and get an instant automatic quote.',
    },
    backToProduct: { es: 'Volver al producto', en: 'Back to product' },
    backToHome: { es: 'Volver al inicio', en: 'Back to home' },
  },
} as const

type TranslationKey = typeof translations

export function t(lang: 'es' | 'en', path: string): string {
  const keys = path.split('.')
  let node: any = translations
  for (const key of keys) {
    node = node?.[key]
    if (!node) return path
  }
  return node?.[lang] ?? path
}

export function useTranslation(lang: 'es' | 'en') {
  return { t: (path: string) => t(lang, path) }
}
