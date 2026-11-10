// Comprehensive real-time opening and variation namer for chess moves

interface OpeningEntry {
  moves: string[];
  name: string;
  eco?: string;
  strategyAdvice?: string;
}

const OPENINGS_DB: OpeningEntry[] = [
  // 1. d4 lines (White)
  {
    moves: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+'],
    name: 'Gambito Englund: Trampa Letal de Dama b4+',
    eco: 'A40',
    strategyAdvice: '¡Alerta máxima! La dama rival da jaque y amenaza tu alfil en f4 y tu peón en b2. Juega 5. Bd2! sacrificando b2 para ganar tiempos de desarrollo.',
  },
  {
    moves: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7'],
    name: 'Gambito Englund: Ataque Doble sobre e5',
    eco: 'A40',
    strategyAdvice: 'El rival ataca tu peón de e5 con caballo y dama. No intentes aferrarte al peón con jugadas pasivas. Desarrolla Nc3 y prepárate para Bd2.',
  },
  {
    moves: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3'],
    name: 'Gambito Englund: Defensa con Caballo f3',
    eco: 'A40',
    strategyAdvice: 'Controla el centro. Si el rival saca la dama a e7, mantén la calma y prepara el desarrollo rápido del flanco de dama.',
  },
  {
    moves: ['d4', 'e5', 'dxe5', 'Nc6'],
    name: 'Gambito Englund: Presión sobre el Peón e5',
    eco: 'A40',
    strategyAdvice: 'El negro busca recuperar el peón inmediatamente. Defiende con 3. Nf3. Tu objetivo es enrocarte corto.',
  },
  {
    moves: ['d4', 'e5', 'dxe5'],
    name: 'Gambito Englund Aceptado',
    eco: 'A40',
    strategyAdvice: 'Has ganado un peón central. Tu ventaja se mantendrá si desarrollas piezas menores (Nf3, Nc3) y no te apresuras.',
  },
  {
    moves: ['d4', 'e5'],
    name: 'Gambito Englund (⚠️ Tu Mayor Fuga con Blancas)',
    eco: 'A40',
    strategyAdvice: 'El negro entrega un peón para acelerar el ataque contra tu rey y tu casilla b2. La jugada correcta es 2. dxe5! pero debes conocer las trampas tácticas.',
  },
  {
    moves: ['d4', 'd5', 'Nf3', 'Nc6'],
    name: 'Peón Dama: Defensa Chigorin',
    eco: 'D02',
    strategyAdvice: 'El rival bloquea su peón de c7 con el caballo. Aprovecha para golpear el centro con c4 o consolidar con e3 y Bf4.',
  },
  {
    moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
    name: 'Sistema Londres Clásico',
    eco: 'D02',
    strategyAdvice: 'Tu alfil de casillas oscuras está activo fuera de la cadena de peones. Juega e3, c3, Nbd2 y enrócate en corto con total seguridad.',
  },
  {
    moves: ['d4', 'd5', 'Nf3', 'Nf6'],
    name: 'Peón Dama: Desarrollo Simétrico',
    eco: 'D02',
    strategyAdvice: 'Posición muy sólida. Puedes jugar el Sistema Londres con 3. Bf4 o presionar el centro con 3. c4.',
  },
  {
    moves: ['d4', 'd5', 'c4'],
    name: 'Gambito de Dama',
    eco: 'D06',
    strategyAdvice: 'Ofreces el peón lateral de c para ganar el centro con e4 si el negro acepta.',
  },
  {
    moves: ['d4', 'd5'],
    name: 'Apertura Simétrica de Peón Dama',
    eco: 'D00',
    strategyAdvice: 'Ambos bandos reclaman el centro. Desarrolla 2. Nf3 o ataca con 2. c4.',
  },
  {
    moves: ['d4', 'Nf6', 'c4', 'g6'],
    name: 'Defensa India de Rey',
    eco: 'E60',
    strategyAdvice: 'El negro prepara Bg7 y 0-0 para luego contragolpear con e5. Domina el centro con Nc3 y e4.',
  },
  {
    moves: ['d4', 'Nf6'],
    name: 'Defensa India',
    eco: 'A45',
    strategyAdvice: 'El negro previene e4 y busca una batalla dinámica. Continúa con 2. Nf3 o 2. c4.',
  },
  {
    moves: ['d4', 'd6'],
    name: 'Defensa Wade / Pirc ante d4',
    eco: 'A41',
    strategyAdvice: 'El negro busca un desarrollo flexible. Puedes ocupar el centro con 2. c4 o 2. e4.',
  },
  {
    moves: ['d4', 'e6'],
    name: 'Defensa Horwitz (prep. Francesa/India)',
    eco: 'A40',
    strategyAdvice: 'El rival prepara d5 o f5. Puedes trasponer con 2. e4 (Francesa) o continuar con 2. Nf3/c4.',
  },
  {
    moves: ['d4'],
    name: 'Apertura de Peón de Dama',
    eco: 'D00',
    strategyAdvice: 'Tu jugada maestra con blancas. Controlas e5 y abres diagonales para dama y alfil.',
  },

  // 1. e4 c5 lines (Black Sicilian)
  {
    moves: ['e4', 'c5', 'c3', 'd5'],
    name: 'Siciliana Alapin: Contragolpe Central d5',
    eco: 'B22',
    strategyAdvice: '¡La mejor respuesta! Como el blanco tiene el peón en c3, su caballo no puede defender d4. Golpea el centro inmediatamente.',
  },
  {
    moves: ['e4', 'c5', 'c3'],
    name: 'Siciliana: Variante Alapin (⚠️ Tu Fuga con Negras)',
    eco: 'B22',
    strategyAdvice: 'El blanco quiere formar un centro perfecto con d4. No juegues pasivo: responde 2... d5! o 2... Nf6 atacando e4.',
  },
  {
    moves: ['e4', 'c5', 'Nc3', 'Nc6', 'f4'],
    name: 'Siciliana: Ataque Grand Prix',
    eco: 'B23',
    strategyAdvice: 'El blanco prepara un asalto violento al flanco de rey con f4-f5. Juega g6, Bg7, d6 y enrócate rápido.',
  },
  {
    moves: ['e4', 'c5', 'Nc3'],
    name: 'Siciliana Cerrada',
    eco: 'B23',
    strategyAdvice: 'El blanco evita abrir el centro. Desarrolla Nc6, g6, Bg7 y busca expansión en el flanco de dama con b5.',
  },
  {
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'],
    name: 'Siciliana Abierta: Centro Abierto',
    eco: 'B50',
    strategyAdvice: 'Tienes la columna c abierta para tus torres. Desarrolla Nf6, a6 (Najdorf) o g6 (Dragón) buscando enroque.',
  },
  {
    moves: ['e4', 'c5', 'Nf3', 'Nc6'],
    name: 'Siciliana: Variante Clásica / Vieja',
    eco: 'B30',
    strategyAdvice: 'Presionas d4 directamente con el caballo. Prepárate si el blanco juega 3. Bb5 (Rossolimo) o 3. d4.',
  },
  {
    moves: ['e4', 'c5', 'Nf3'],
    name: 'Defensa Siciliana: Variante Abierta',
    eco: 'B27',
    strategyAdvice: 'El blanco prepara d4. Tus opciones principales son 2... d6 (para Nf6/a6) o 2... Nc6.',
  },
  {
    moves: ['e4', 'c5', 'd4', 'cxd4'],
    name: 'Siciliana: Gambito Smith-Morra',
    eco: 'B21',
    strategyAdvice: 'El blanco entrega un peón con c3 para acelerar su desarrollo. Puedes aceptarlo con dxc3 o transponer con d5.',
  },
  {
    moves: ['e4', 'c5', 'Bc4'],
    name: 'Siciliana: Ataque Bowdler',
    eco: 'B20',
    strategyAdvice: 'El alfil blanco choca contra tu peón. Juega e6 para bloquearlo por completo y luego d5 ganando un tiempo.',
  },
  {
    moves: ['e4', 'c5'],
    name: 'Defensa Siciliana (Tu Elección de Combate)',
    eco: 'B20',
    strategyAdvice: 'Luchas asimétricamente por el centro desde el flanco. Buscas crear desequilibrio táctico para ganar.',
  },

  // 1. d4 Black responses
  {
    moves: ['d4', 'd6', 'Nf3', 'Nf6', 'g3', 'g6', 'Bg2', 'Bg7', 'O-O', 'O-O'],
    name: 'India de Rey Simétrica / Doble Fianchetto',
    eco: 'E60',
    strategyAdvice: '¡Objetivo cumplido! Has completado tu enroque rápido y seguro. Ahora prepara la ruptura central con e5 o c5.',
  },
  {
    moves: ['d4', 'd6', 'e4', 'Nf6', 'Nc3', 'g6'],
    name: 'Defensa Pirc Moderna',
    eco: 'B07',
    strategyAdvice: 'Transposición a la Pirc. Tu plan es Bg7, 0-0 y presionar el centro blanco con e5 o c5.',
  },
  {
    moves: ['d4', 'd6'],
    name: 'Defensa con d6 ante d4 (Setup Flanco Rey)',
    eco: 'A41',
    strategyAdvice: 'Preparas el desarrollo de tu alfil a g7 y enroque. Cuidado con conceder demasiado espacio central con e4 y c4.',
  },
];

export function identifyOpeningFromMoves(sans: string[]): {
  name: string;
  eco: string;
  advice: string;
} {
  if (!sans || sans.length === 0) {
    return { name: 'Posición Inicial', eco: '', advice: 'Inicia con 1. d4 con blancas o 1... c5 con negras.' };
  }

  // Find longest matching prefix
  for (const entry of OPENINGS_DB) {
    if (sans.length >= entry.moves.length) {
      const match = entry.moves.every((m, idx) => sans[idx] === m);
      if (match) {
        return {
          name: entry.name,
          eco: entry.eco || '',
          advice: entry.strategyAdvice || '',
        };
      }
    }
  }

  // Fallback heuristics
  if (sans[0] === 'd4') {
    if (sans[1] === 'e5') return { name: 'Gambito Englund', eco: 'A40', advice: 'Cuidado con las amenazas de dama a b4 y e7.' };
    if (sans[1] === 'd5') return { name: 'Apertura de Peón de Dama', eco: 'D00', advice: 'Juego posicional sólido.' };
    if (sans[1] === 'Nf6') return { name: 'Defensas Indias', eco: 'A45', advice: 'Juego dinámico por el centro.' };
    if (sans[1] === 'd6') return { name: 'Defensa Pirc / Flanco Rey', eco: 'A41', advice: 'Prepara Bg7 y enroque corto.' };
    return { name: `Apertura 1. d4 ${sans[1] || ''}`, eco: 'A40', advice: 'Desarrolla tus piezas hacia el centro.' };
  }

  if (sans[0] === 'e4') {
    if (sans[1] === 'c5') return { name: 'Defensa Siciliana', eco: 'B20', advice: 'Contrajuego asimétrico en el flanco de dama.' };
    if (sans[1] === 'e5') return { name: 'Apertura Abierta 1. e4 e5', eco: 'C20', advice: 'Lucha abierta por el centro.' };
    return { name: `Respuesta a 1. e4`, eco: 'B00', advice: 'Desarrollo coordinado.' };
  }

  return { name: 'Apertura sin clasificar', eco: '', advice: 'Busca el control del centro y enrocar rápido.' };
}
