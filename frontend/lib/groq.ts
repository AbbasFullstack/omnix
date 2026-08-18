export async function groqModels(): Promise<string[]> {
  try {
    const r = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    });
    const j = await r.json();
    const ids = (j.data || []).map((m: any) => m.id as string);
    return ids.filter(
      (i: string) => /llama|gpt-oss/.test(i) && !/whisper|orpheus|tts|guard/i.test(i)
    );
  } catch {
    return [];
  }
}
