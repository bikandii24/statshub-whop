import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('sh_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rateLimit = checkRateLimit(`ai:${user.id}`, 10, 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 })
    }

    const { handle, niche, engagement } = await req.json()

    const prompt = `Actúa como un experto estratega de contenido de TikTok. 
El usuario '${handle}' está en el nicho de '${niche || "contenido general"}'. 
Su engagement actual es del ${engagement || "0"}%.
Genera EXACTAMENTE 3 ideas de vídeos virales tipo "Top 3", "Dato curioso" o "Tutorial".
Para cada idea da un TÍTULO (el gancho) y un BREVE GUION de 1 frase.
Formato estricto:
1. [Título]: [Guion]
2. [Título]: [Guion]
3. [Título]: [Guion]`

    // ── 1. Try Groq API (free, production-ready, runs Llama) ─────────────
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 400,
          }),
          signal: AbortSignal.timeout(15000),
        })

        if (groqRes.ok) {
          const groqData = await groqRes.json()
          const text = groqData.choices?.[0]?.message?.content
          if (text && text.trim().length > 10) {
            return NextResponse.json({ ideas: parseIdeas(text), source: "groq" })
          }
        }
      } catch (e) {
        console.log("Groq API error, trying local LLM:", e)
      }
    }

    // ── 2. Try Ollama local (dev only) ────────────────────────────────────
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const ollamaRes = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma:2b",
          prompt,
          stream: false,
          options: { temperature: 0.7, num_ctx: 512 }
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json()
        const text = ollamaData.response
        if (text && text.trim().length > 10) {
          return NextResponse.json({ ideas: parseIdeas(text), source: "ollama" })
        }
      }
    } catch {
      console.log("Local LLM not available, using fallback.")
    }

    // ── 3. Heuristic fallback ─────────────────────────────────────────────
    const nicheLabel = niche || "tu sector"
    const mockIdeas = [
      {
        title: `El secreto que nadie te cuenta de ${nicheLabel}`,
        script: "Comienza con un gancho misterioso y revela un tip accionable en los primeros 3 segundos."
      },
      {
        title: `Por qué el 90% falla en ${nicheLabel} (y cómo evitarlo)`,
        script: "Lista de 3 errores comunes visuales. Usa texto grande en pantalla y ritmo rápido."
      },
      {
        title: `Tutorial rápido de ${nicheLabel}: consigue [objetivo] en 60 segundos 🚀`,
        script: "Formato pasito a pasito (Step 1, Step 2...) con pantalla verde o voiceover directo."
      }
    ]

    return NextResponse.json({ ideas: mockIdeas, source: "fallback" })

  } catch (error) {
    console.error("AI Gen Error:", error)
    return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 })
  }
}

function parseIdeas(text: string) {
  const lines = text.split("\n").filter(l => l.trim().length > 0)
  const ideas: { title: string; script: string }[] = []

  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.*?):\s*(.+)/)
    if (match) {
      ideas.push({ title: match[1].trim().replace(/^\[|\]$/g, ''), script: match[2].trim().replace(/^\[|\]$/g, '') })
    }
  }

  if (ideas.length > 0) return ideas.slice(0, 3)

  // Fallback parser: just split by numbered lines
  const numbered = text.match(/\d+\.\s*[^\n]+/g) || []
  return numbered.slice(0, 3).map(l => {
    const clean = l.replace(/^\d+\.\s*/, '')
    const [title, ...rest] = clean.split(':')
    return { title: title?.trim() || clean, script: rest.join(':').trim() || 'Usa un gancho visual potente en los primeros 3 segundos.' }
  })
}
