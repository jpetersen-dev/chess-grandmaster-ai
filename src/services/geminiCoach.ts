import { GoogleGenAI } from '@google/genai';

export interface BlunderCoachContext {
  playerColor: 'Blanco' | 'Negro';
  fen: string;
  userMoveSan: string;
  bestMoveSan: string;
  evalDropCentipawns: number;
  timeSpentSeconds?: number;
  clockRemainingSeconds?: number;
  tacticTag: string;
  tacticSummary: string;
}

export function getGeminiApiKey(): string {
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey && localKey.trim().length > 0) {
    return localKey.trim();
  }
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return '';
}

export function setGeminiApiKey(key: string) {
  if (!key || key.trim() === '') {
    localStorage.removeItem('gemini_api_key');
  } else {
    localStorage.setItem('gemini_api_key', key.trim());
  }
}

export async function explainBlunderWithGemini(ctx: BlunderCoachContext): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    // Graceful fallback to algorithmic explanation if no key is entered
    return `${ctx.tacticSummary} (Configura tu clave de Gemini en Ajustes para obtener retroalimentación pedagógica y psicológica personalizada).`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Eres un Gran Maestro y Entrenador de Ajedrez de élite, pedagógico, directo y psicológicamente perspicaz.
El alumno jugaba con las piezas ${ctx.playerColor}.
Posición FEN: ${ctx.fen}
Jugada realizada por el alumno: ${ctx.userMoveSan}
Mejor jugada objetiva de máquina: ${ctx.bestMoveSan}
Pérdida de evaluación: ~${ctx.evalDropCentipawns} centipeones.
Diagnóstico táctico algorítmico: "${ctx.tacticSummary}" (etiqueta: ${ctx.tacticTag})
${ctx.timeSpentSeconds !== undefined ? `Tiempo empleado en la jugada: ${ctx.timeSpentSeconds} segundos.` : ''}
${ctx.clockRemainingSeconds !== undefined ? `Tiempo restante en su reloj: ${ctx.clockRemainingSeconds} segundos.` : ''}

INSTRUCCIONES CLAVE:
1. Explica en 2 o 3 frases claras, empáticas y muy directas por qué la jugada ${ctx.userMoveSan} fue un error y por qué ${ctx.bestMoveSan} era superior.
2. Identifica la trampa mental (por ejemplo: ilusión óptica de atacar algo, no advertir qué casilla dejó desprotegida, o apresuramiento del reloj).
3. Formula una "Regla de Oro" mental de 1 línea para no volver a cometer este fallo.
No uses notación algebraica abstracta extensa ni párrafos largos. Sé conciso y memorable.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || ctx.tacticSummary;
  } catch (error: any) {
    console.error('Gemini error:', error);
    return `${ctx.tacticSummary} (Nota de Gemini: ${error?.message || 'Error de conexión con la IA'}).`;
  }
}

export async function generateGameReportWithGemini(params: {
  username: string;
  opponent: string;
  result: string;
  blundersCount: number;
  mistakesCount: number;
  timeClass: string;
  opening: string;
  avgTimePerMove?: number;
}): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return `Partida completada. Errores graves: ${params.blundersCount}, Imprecisiones: ${params.mistakesCount}. Agrega tu API Key de Gemini en Ajustes para un análisis psicológico completo.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Eres un mentor de ajedrez. Resume el rendimiento de ${params.username} en su partida de ${params.timeClass} contra ${params.opponent}:
- Resultado: ${params.result}
- Apertura jugada: ${params.opening}
- Errores graves (Blunders): ${params.blundersCount}
- Imprecisiones tácticas: ${params.mistakesCount}
${params.avgTimePerMove ? `- Tiempo promedio por jugada: ${params.avgTimePerMove.toFixed(1)} segundos.` : ''}

Escribe un diagnóstico conciso de 3 viñetas:
1. Lo positivo: Un aspecto rescatable de la partida.
2. El talón de Aquiles: El punto donde se torció la posición o se desatendió el tiempo.
3. Tarea para el dojo: Un ejercicio mental concreto para la próxima partida.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || 'Análisis completado exitosamente.';
  } catch (err: any) {
    return `No se pudo generar el reporte con Gemini: ${err?.message || 'error desconocido'}`;
  }
}
