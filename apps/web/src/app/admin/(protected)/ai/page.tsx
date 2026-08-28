import { AiAssistant } from '@/components/admin/ai/AiAssistant'

export const metadata = { title: 'Asistente IA' }

export default function AiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Asistente IA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Asistente de administración potenciado por Claude o GPT para redactar respuestas y textos de CBC.
        </p>
      </div>
      <AiAssistant />
    </div>
  )
}
