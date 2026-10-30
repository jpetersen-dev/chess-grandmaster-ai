import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Volume2, VolumeX, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey } from '../services/geminiCoach';
import { soundService } from '../services/soundService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(soundService.enabled);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey());
      setSoundEnabled(soundService.enabled);
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiApiKey(apiKey);
    soundService.enabled = soundEnabled;
    onClose();
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Por favor ingresa una clave antes de probar.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Probando conexión con Google Gemini...');

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Responde únicamente con la palabra: Conectado',
      });

      if (res.text) {
        setTestStatus('success');
        setTestMessage('¡Conexión exitosa con Gemini! Tu entrenador de IA está listo.');
        setGeminiApiKey(apiKey.trim());
      } else {
        throw new Error('Respuesta vacía.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Error de autenticación: ${err?.message || 'Clave no válida o sin acceso'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#18202c] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
            <Cpu size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Ajustes & Motores de IA</h2>
            <p className="text-xs text-slate-400">Configura tu clave de Gemini y opciones de simulación</p>
          </div>
        </div>

        {/* Gemini API Key Section */}
        <div className="space-y-4 mb-6">
          <label className="block text-sm font-semibold text-slate-300">
            <span className="flex items-center gap-2">
              <Key size={16} className="text-amber-400" />
              Google Gemini API Key
            </span>
          </label>
          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[#0f141c] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
            >
              Obtener clave gratuita en Google AI Studio
              <ExternalLink size={12} />
            </a>

            <button
              onClick={handleTestKey}
              disabled={testStatus === 'testing'}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-600 transition disabled:opacity-50"
            >
              {testStatus === 'testing' ? 'Probando...' : 'Probar Clave'}
            </button>
          </div>

          {testStatus === 'success' && (
            <div className="flex items-start gap-2 p-3 bg-emerald-950/60 border border-emerald-600/40 rounded-xl text-xs text-emerald-300">
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <span>{testMessage}</span>
            </div>
          )}

          {testStatus === 'error' && (
            <div className="flex items-start gap-2 p-3 bg-rose-950/60 border border-rose-600/40 rounded-xl text-xs text-rose-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{testMessage}</span>
            </div>
          )}
        </div>

        {/* Audio Toggle */}
        <div className="flex items-center justify-between p-4 bg-[#0f141c] rounded-xl border border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <Volume2 className="text-emerald-400" size={20} />
            ) : (
              <VolumeX className="text-slate-500" size={20} />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-200">Efectos de Sonido del Tablero</p>
              <p className="text-xs text-slate-400">Sonidos de jugada, capturas y resolución de puzzles</p>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                soundEnabled ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition"
          >
            Guardar Ajustes
          </button>
        </div>
      </div>
    </div>
  );
};
