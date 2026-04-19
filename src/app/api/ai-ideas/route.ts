import { NextRequest, NextResponse } from "next/server"
import { getWhopUser } from "@/lib/whop"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const user = await getWhopUser(req.headers) ?? (process.env.NODE_ENV === 'development' ? { id: 'dev-local-user' } : null)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rateLimit = checkRateLimit(`ai:${user.id}`, 10, 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 })
    }

    const { handle, niche, engagement } = await req.json()

    const prompt = `You are an expert TikTok content strategist.
The user '${handle}' is in the '${niche || "general content"}' niche.
Their current engagement rate is ${engagement || "0"}%.
Generate EXACTLY 3 viral video ideas (e.g. "Top 3", "Fun fact", "Tutorial").
For each idea provide a TITLE (the hook) and a BRIEF SCRIPT of 1 sentence.
Strict format:
1. [Title]: [Script]
2. [Title]: [Script]
3. [Title]: [Script]`

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
    const nicheLabel = niche || "your niche"
    const mockIdeas = [
      {
        title: `The secret nobody tells you about ${nicheLabel}`,
        script: "Start with a mysterious hook and reveal an actionable tip in the first 3 seconds."
      },
      {
        title: `Why 90% fail at ${nicheLabel} (and how to avoid it)`,
        script: "List 3 common visual mistakes. Use large on-screen text and fast pacing."
      },
      {
        title: `Quick ${nicheLabel} tutorial: achieve [goal] in 60 seconds 🚀`,
        script: "Step-by-step format (Step 1, Step 2...) with green screen or direct voiceover."
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
    return { title: title?.trim() || clean, script: rest.join(':').trim() || 'Use a powerful visual hook in the first 3 seconds.' }
  })
}
