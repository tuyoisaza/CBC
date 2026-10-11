import Script from 'next/script'
import { ANALYTICS_EXCLUDED_PATHS } from '@/lib/analytics-paths'

type GoogleAnalyticsBootstrapProps = {
  measurementId: string
}

export function GoogleAnalyticsBootstrap({ measurementId }: GoogleAnalyticsBootstrapProps) {
  if (!measurementId) return null

  const safeMeasurementId = JSON.stringify(measurementId)
  const excludedPaths = JSON.stringify(ANALYTICS_EXCLUDED_PATHS)
  const bootstrap = `
(function () {
  var path = window.location.pathname || '/';
  var excludedPaths = ${excludedPaths};
  if (excludedPaths.some(function (prefix) { return path === prefix || path.indexOf(prefix + '/') === 0; })) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  window.gtag('js', new Date());
  window.gtag('config', ${safeMeasurementId}, { send_page_view: false });

  var script = document.createElement('script');
  script.id = 'cbc-google-analytics-script';
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(${safeMeasurementId});
  document.head.appendChild(script);
})();`

  return (
    <Script
      id="cbc-google-analytics-bootstrap"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: bootstrap }}
    />
  )
}
