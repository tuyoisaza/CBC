import type { Metadata } from 'next'
import { LegalDocument, LegalSection } from '@/components/public/LegalDocument'

export const metadata: Metadata = { title: 'Terms and Conditions | Coffee Bunn Café', description: 'Coffee Bunn Café website and purchase terms.' }

export default function TermsAndConditionsPageEn() {
  return <LegalDocument lang="en" eyebrow="Legal information" title="Terms and conditions" updatedAt="Last updated: October 6, 2026">
    <p>These terms govern the use of this website and purchases from Coffee Bunn Café. By requesting a quote, placing an order, or using the website, you accept these terms.</p>
    <LegalSection title="Quotes and orders"><p>Quotes are based on the information provided and remain subject to availability, specifications, quantities, personalization, production time, delivery cost, and our confirmation. An order is confirmed once its applicable conditions and, when required, payment or deposit are confirmed.</p></LegalSection>
    <LegalSection title="Prices and payments"><p>Prices, taxes, discounts, shipping costs, and payment terms are displayed or confirmed before an order is finalized. Payment approval is handled by external providers. A payment attempt or return from a payment platform does not by itself confirm an order until payment is verified.</p></LegalSection>
    <LegalSection title="Personalization and delivery"><p>Corporate products may include personalized elements. Customers must have the rights needed for logos, text, images, or materials they provide. Production and delivery dates are agreed per order and may change due to pending approvals, requested changes, availability, or circumstances outside our control.</p></LegalSection>
    <LegalSection title="Changes and returns"><p>Because products may be personalized or made to order, change, cancellation, and return requests are reviewed case by case according to the production stage and confirmed quote. Contact us promptly if an item is damaged in transit or materially differs from the confirmed order.</p></LegalSection>
    <LegalSection title="Use of the site"><p>Site content, including brands, text, photography, and design, belongs to Coffee Bunn Café or is used with permission. You may not copy, modify, or commercially use it without prior written permission.</p></LegalSection>
    <LegalSection title="Updates and applicable law"><p>We may update these terms and publish the current version on this page. Order relationships are governed by applicable Mexican law, without affecting rights that cannot be waived under applicable consumer law.</p></LegalSection>
  </LegalDocument>
}
