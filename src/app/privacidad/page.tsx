"use client"

import * as React from "react"
import { Shield, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PrivacyPage() {
  const router = useRouter()
  const [isES, setIsES] = React.useState(false)
  React.useEffect(() => {
    setIsES(navigator.language.toLowerCase().startsWith("es"))
  }, [])

  const content = isES ? {
    title: "Política de Privacidad y Cookies",
    updated: `Última actualización: ${new Date().toLocaleDateString("es-ES")}`,
    sections: [
      {
        heading: "1. Responsable del tratamiento",
        body: "StatsHub es responsable del tratamiento de los datos personales recogidos a través de esta plataforma. Para cualquier consulta relacionada con la privacidad, contáctenos a través de la plataforma."
      },
      {
        heading: "2. Datos que recopilamos",
        body: "Recopilamos: (a) datos de autenticación necesarios para acceder a la plataforma; (b) los handles o URLs de redes sociales que tú introduces voluntariamente; (c) estadísticas públicas obtenidas de APIs de terceros (número de seguidores, visualizaciones, engagement) de las cuentas que añades; (d) datos de uso de la plataforma para mejorar el servicio."
      },
      {
        heading: "3. Finalidad del tratamiento",
        body: "Tus datos se utilizan para: proveer el servicio de analítica de redes sociales, mostrarte estadísticas de las cuentas que gestionas, mejorar la plataforma y, con tu consentimiento expreso, para análisis agregados de mercado. Nunca vendemos datos personales identificables sin tu consentimiento explícito."
      },
      {
        heading: "4. Base legal (RGPD)",
        body: "El tratamiento se basa en: (a) ejecución del contrato (Art. 6.1.b RGPD) para proveer el servicio; (b) interés legítimo (Art. 6.1.f RGPD) para análisis de uso; (c) consentimiento (Art. 6.1.a RGPD) para comunicaciones comerciales o cesión de datos a terceros."
      },
      {
        heading: "5. Cesión de datos a terceros",
        body: "Los datos estadísticos agregados y anonimizados (sin identificación personal) pueden compartirse con terceros para análisis de mercado. Nunca se ceden datos personales identificables sin consentimiento explícito. Utilizamos proveedores de APIs (RapidAPI) sujetos a sus propias políticas de privacidad."
      },
      {
        heading: "6. Retención de datos",
        body: "Conservamos tus datos mientras mantengas una cuenta activa. Puedes solicitar la eliminación de tus datos en cualquier momento. Los datos de uso anonimizados pueden conservarse indefinidamente."
      },
      {
        heading: "7. Tus derechos",
        body: "Bajo el RGPD tienes derecho a: acceso, rectificación, supresión ('derecho al olvido'), portabilidad, limitación del tratamiento y oposición. Para ejercer estos derechos contacta con nosotros a través de la plataforma."
      },
      {
        heading: "8. Cookies",
        body: "Usamos cookies estrictamente necesarias para el funcionamiento de la plataforma (autenticación, preferencias de idioma). No utilizamos cookies de rastreo de terceros ni publicidad. Puedes gestionar las cookies desde la configuración de tu navegador."
      },
      {
        heading: "9. Seguridad",
        body: "Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado en tránsito (HTTPS), autenticación segura y acceso restringido a datos de producción."
      },
    ]
  } : {
    title: "Privacy Policy & Cookies",
    updated: `Last updated: ${new Date().toLocaleDateString("en-US")}`,
    sections: [
      {
        heading: "1. Data Controller",
        body: "StatsHub is the data controller for personal data collected through this platform. For any privacy-related queries, contact us through the platform."
      },
      {
        heading: "2. Data We Collect",
        body: "We collect: (a) authentication data necessary to access the platform; (b) social media handles or URLs you voluntarily enter; (c) public statistics retrieved from third-party APIs (follower counts, views, engagement) of the accounts you add; (d) platform usage data to improve our service."
      },
      {
        heading: "3. Purpose of Processing",
        body: "Your data is used to: provide the social media analytics service, show you statistics for accounts you manage, improve the platform, and with your explicit consent, for aggregated market analysis. We never sell personally identifiable data without your explicit consent."
      },
      {
        heading: "4. Legal Basis (GDPR)",
        body: "Processing is based on: (a) contract performance (Art. 6.1.b GDPR) to provide the service; (b) legitimate interest (Art. 6.1.f GDPR) for usage analytics; (c) consent (Art. 6.1.a GDPR) for commercial communications or data sharing with third parties."
      },
      {
        heading: "5. Data Sharing",
        body: "Aggregated and anonymized statistical data (without personal identification) may be shared with third parties for market analysis. Personally identifiable data is never shared without explicit consent. We use API providers (RapidAPI) subject to their own privacy policies."
      },
      {
        heading: "6. Data Retention",
        body: "We retain your data while you maintain an active account. You may request deletion of your data at any time. Anonymized usage data may be retained indefinitely."
      },
      {
        heading: "7. Your Rights",
        body: "Under GDPR you have the right to: access, rectification, erasure ('right to be forgotten'), portability, restriction of processing, and objection. To exercise these rights contact us through the platform."
      },
      {
        heading: "8. Cookies",
        body: "We use strictly necessary cookies for platform functionality (authentication, language preferences). We do not use third-party tracking or advertising cookies. You can manage cookies through your browser settings."
      },
      {
        heading: "9. Security",
        body: "We apply technical and organizational measures to protect your data: in-transit encryption (HTTPS), secure authentication, and restricted access to production data."
      },
    ]
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-3" /> Back
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
          <Shield className="size-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: "var(--font-syne)" }}>
            {content.title}
          </h1>
          <p className="text-sm text-muted-foreground/50">{content.updated}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {content.sections.map((s, i) => (
          <div key={i} className="glass border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-sm font-black text-white mb-3" style={{ fontFamily: "var(--font-syne)" }}>
              {s.heading}
            </h2>
            <p className="text-sm text-muted-foreground/70 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
