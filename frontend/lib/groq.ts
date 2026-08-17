export async function groqModels(): Promise<string[]> {
  try {
    const r = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    });
    const j = await r.json();
    return (j.data || []).map((m: any) => m.id as string);
  } catch {
    return [];
  }
}
