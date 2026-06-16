interface PublicFooterProps {
  lang?: 'es' | 'en'
}

const content = {
  es: {
    rights: 'Todos los derechos reservados.',
    admin: 'Admin Portal',
    contact: 'Contacto',
    whatsapp: 'WhatsApp',
    tracking: 'Rastrear Pedido',
  },
  en: {
    rights: 'All rights reserved.',
    admin: 'Admin Portal',
    contact: 'Contact',
    whatsapp: 'WhatsApp',
    tracking: 'Track Order',
  },
}

export function PublicFooter({ lang = 'es' }: PublicFooterProps) {
  const t = content[lang]

  return (
    <footer className="border-t border-gray-800 bg-[#1a1a1a] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="text-cbc-yellow font-bold mb-3">Coffee Bunn Café</h4>
            <p className="text-gray-500 text-sm">
              {lang === 'es'
                ? 'Regalos corporativos premium con café de especialidad mexicano.'
                : 'Premium corporate gifts with Mexican specialty coffee.'}
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">{t.contact}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={lang === 'es' ? '/cotizar' : '/en/cotizar'}
                  className="text-gray-500 hover:text-cbc-yellow transition-colors">
                  {lang === 'es' ? 'Cotizar' : 'Get a Quote'}
                </a>
              </li>
              <li>
                <a href={lang === 'es' ? '/tracking' : '/en/tracking'}
                  className="text-gray-500 hover:text-cbc-yellow transition-colors">
                  {t.tracking}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">{lang === 'es' ? 'Empresa' : 'Company'}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={lang === 'es' ? '/' : '/en/'}
                  className="text-gray-500 hover:text-cbc-yellow transition-colors">
                  {lang === 'es' ? 'Inicio' : 'Home'}
                </a>
              </li>
              <li>
                <a href="/login"
                  className="text-gray-500 hover:text-cbc-yellow transition-colors">
                  {t.admin}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Coffee Bunn Café. {t.rights}</p>
        </div>
      </div>
    </footer>
  )
}
