import {
  Document, Page, Text, View, StyleSheet, Font
} from '@react-pdf/renderer'

// Brand colors
const C = {
  black:  '#262626',
  yellow: '#f7b84e',
  cream:  '#fffaf3',
  gray:   '#636363',
  border: '#e5e5e5',
}

const styles = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', backgroundColor: C.cream, padding: 48 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  brand:       { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.black },
  brandAccent: { color: C.yellow },
  quoteLabel:  { fontSize: 10, color: C.gray, marginBottom: 4 },
  quoteCode:   { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.black },
  section:     { marginBottom: 24 },
  label:       { fontSize: 8, color: C.gray, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
  value:       { fontSize: 11, color: C.black },
  divider:     { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 20 },
  table:       { borderWidth: 1, borderColor: C.border, borderRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: C.black, padding: 10 },
  tableHeaderText: { color: C.cream, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableRow:    { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  tableRowAlt: { backgroundColor: '#f9f9f6' },
  col1:        { flex: 3 },
  col2:        { flex: 1, textAlign: 'right' },
  col3:        { flex: 1, textAlign: 'right' },
  col4:        { flex: 1, textAlign: 'right' },
  totals:      { marginTop: 16, alignItems: 'flex-end' },
  totalRow:    { flexDirection: 'row', gap: 16, marginBottom: 4 },
  totalLabel:  { fontSize: 10, color: C.gray, width: 80, textAlign: 'right' },
  totalValue:  { fontSize: 10, color: C.black, width: 80, textAlign: 'right' },
  grandTotal:  { flexDirection: 'row', gap: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 1.5, borderTopColor: C.black },
  grandLabel:  { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.black, width: 80, textAlign: 'right' },
  grandValue:  { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.black, width: 80, textAlign: 'right' },
  footer:      { position: 'absolute', bottom: 40, left: 48, right: 48 },
  footerText:  { fontSize: 8, color: C.gray, textAlign: 'center' },
  badge:       { backgroundColor: C.yellow, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.black },
})

interface QuotePDFProps {
  quoteCode: string
  companyName: string
  contactName: string
  email: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  subtotal: number
  iva: number
  total: number
  validUntil: string
  notes?: string
}

export function QuotePDF(props: QuotePDFProps) {
  return (
    <Document
      title={`Cotización ${props.quoteCode} — Coffee Bunn Café`}
      author="Coffee Bunn Café"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              <Text style={styles.brandAccent}>Coffee</Text> Bunn Café
            </Text>
            <Text style={{ fontSize: 9, color: C.gray, marginTop: 4 }}>
              contact@coffeebunncafe.com · +52 55 72293512
            </Text>
            <Text style={{ fontSize: 9, color: C.gray }}>
              Av. José Martí 300, Escandón II, CDMX 11800
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>COTIZACIÓN</Text>
            </View>
            <Text style={{ ...styles.quoteCode, marginTop: 8 }}>{props.quoteCode}</Text>
            <Text style={{ ...styles.quoteLabel, marginTop: 4 }}>
              Válida hasta: {props.validUntil}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client info */}
        <View style={{ flexDirection: 'row', gap: 40, marginBottom: 32 }}>
          <View>
            <Text style={styles.label}>Para</Text>
            <Text style={{ ...styles.value, fontFamily: 'Helvetica-Bold' }}>{props.companyName}</Text>
            <Text style={styles.value}>{props.contactName}</Text>
            <Text style={{ ...styles.value, color: C.gray }}>{props.email}</Text>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderText, ...styles.col1 }}>Descripción</Text>
            <Text style={{ ...styles.tableHeaderText, ...styles.col2 }}>Cant.</Text>
            <Text style={{ ...styles.tableHeaderText, ...styles.col3 }}>Precio unit.</Text>
            <Text style={{ ...styles.tableHeaderText, ...styles.col4 }}>Subtotal</Text>
          </View>
          {props.items.map((item, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={{ ...styles.value, ...styles.col1, fontSize: 10 }}>{item.description}</Text>
              <Text style={{ ...styles.value, ...styles.col2, fontSize: 10 }}>{item.quantity}</Text>
              <Text style={{ ...styles.value, ...styles.col3, fontSize: 10 }}>
                ${item.unitPrice.toLocaleString('es-MX')}
              </Text>
              <Text style={{ ...styles.value, ...styles.col4, fontSize: 10 }}>
                ${item.subtotal.toLocaleString('es-MX')}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${props.subtotal.toLocaleString('es-MX')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA (16%)</Text>
            <Text style={styles.totalValue}>${props.iva.toLocaleString('es-MX')}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandLabel}>Total MXN</Text>
            <Text style={styles.grandValue}>${props.total.toLocaleString('es-MX')}</Text>
          </View>
        </View>

        {/* Notes */}
        {props.notes && (
          <View style={{ marginTop: 32, padding: 16, backgroundColor: '#f0efe9', borderRadius: 4 }}>
            <Text style={styles.label}>Notas</Text>
            <Text style={{ fontSize: 10, color: C.black, lineHeight: 1.5 }}>{props.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Para confirmar tu pedido, realiza el anticipo del 50% y envíanos tu logo en alta resolución.
          </Text>
          <Text style={{ ...styles.footerText, marginTop: 4 }}>
            Coffee Bunn Café · RFC: {process.env.CBC_RFC ?? ''} · Empresa legalmente constituida en México
          </Text>
        </View>
      </Page>
    </Document>
  )
}
