import type { Metadata } from 'next'
import { LegalDocument, LegalSection } from '@/components/public/LegalDocument'

export const metadata: Metadata = { title: 'Privacy Policy | Coffee Bunn Café', description: 'Coffee Bunn Café privacy policy.' }

export default function PrivacyPolicyPageEn() {
  return <LegalDocument lang="en" eyebrow="Legal information" title="Privacy policy" updatedAt="Last updated: October 6, 2026">
    <p>At Coffee Bunn Café, we respect your privacy. This policy explains how we handle personal data when you request a quote, place an order, contact us, or browse our website.</p>
    <LegalSection title="Controller and contact"><p>Coffee Bunn Café is responsible for personal data collected through this site. For privacy questions or requests, email <a className="text-cbc-yellow hover:underline" href="mailto:contact@coffeebunncafe.com">contact@coffeebunncafe.com</a>.</p></LegalSection>
    <LegalSection title="Data we may collect"><p>Depending on your interaction, we may collect your name, company, email, phone or WhatsApp number, delivery and billing information you provide, and quote or order details. Payments are processed by external payment platforms; we do not store complete card data.</p></LegalSection>
    <LegalSection title="How we use data"><p>We use data to prepare quotes, confirm orders, process payments, coordinate deliveries, provide support, issue invoices when requested, and improve the security and operation of our site.</p></LegalSection>
    <LegalSection title="Service providers"><p>We may share the minimum necessary data with providers that process payments, send email, host the site, issue invoices, or deliver orders. Payment platforms also apply their own privacy notices.</p></LegalSection>
    <LegalSection title="Your choices"><p>You may request access, correction, cancellation, objection, or withdrawal of consent where applicable by emailing us with your name, requested right, and the information needed to locate your request. We may request reasonable information to verify your identity.</p></LegalSection>
    <LegalSection title="Updates"><p>We may update this policy for operational, legal, or security reasons. The current version and its update date will appear on this page.</p></LegalSection>
  </LegalDocument>
}
