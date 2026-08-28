import { LanguageSwitcher } from './LanguageSwitcher'
import { t } from '@/lib/i18n'

interface PublicFooterProps {
  lang?: 'es' | 'en'
}

export function PublicFooter({ lang = 'es' }: PublicFooterProps) {
  const tr = (path: string) => t(lang, path)

  return (
    <footer className="border-t border-gray-800 bg-[#1a1a1a] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="text-cbc-yellow font-bold mb-3">Coffee Bunn Café</h4>
            <p className="text-gray-500 text-sm">
              {tr('public.tagline')}
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">{tr('public.contact')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={lang === 'es' ? '/cotizar' : '/en/cotizar'}
                  className="text-gray-500 hover:text-cbc-yellow transition-colors">
                  {tr('public.quote')}
                </a>
              </li>
              <li>
                <a href={lang === 'es' ? '/tracking' : '/en/tracking'}
                  className="text-gray-500 hover:text-cbc-yellow transition-colors">
                  {tr('public.tracking')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">{tr('public.company')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={lang === 'es' ? '/' : '/en/'}
                  className="text-gray-500 hover:text-cbc-yellow transition-colors">
                  {tr('public.home')}
                </a>
              </li>
              <li>
                <a href="/login"
                  className="text-gray-500 hover:text-cbc-yellow transition-colors">
                  {tr('public.admin')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Coffee Bunn Café. {tr('public.rights')}</p>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  )
}
