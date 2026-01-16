import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Settings, X, Plus, Trash2 } from 'lucide-react';

const ChitarraTrainer = () => {
  // --- STATO ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentChord, setCurrentChord] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chordSoundEnabled, setChordSoundEnabled] = useState(true);
  const [countInDone, setCountInDone] = useState(false);
  const [countInBeat, setCountInBeat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  // Dati Canzone
  const [songTitle, setSongTitle] = useState('Alzo gli occhi verso i monti');
  const [chordsInput, setChordsInput] = useState('SOL SIm DO RE SOL DO SOL RE DO SOL');
  
  // Pattern Ritmico
  const [customPattern, setCustomPattern] = useState([
    { direction: 'GIÙ', duration: 1, beat: '1' },
    { direction: 'GIÙ', duration: 1, beat: '2' },
    { direction: 'GIÙ', duration: 0.5, beat: '3' },
    { direction: 'SU', duration: 0.5, beat: '&' },
    { direction: 'GIÙ', duration: 0.5, beat: '4' },
    { direction: 'SU', duration: 0.5, beat: '&' }
  ]);
  
  // --- REFS (Il motore stabile) ---
  const audioContextRef = useRef(null);
  const timeoutRef = useRef(null);
  
  // Refs per accesso sincrono
  const isPlayingRef = useRef(false); 
  const beatIndexRef = useRef(0);
  const chordIndexRef = useRef(0);
  const songRef = useRef([]);      
  const patternRef = useRef([]);   
  const isCountingRef = useRef(false);
  
  // --- CALCOLO DATI ---
  const rawSong = chordsInput.trim().split(/\s+/).map(chord => ({ chord, bars: 1 }));
  const rawPattern = customPattern.map((p, i) => ({
    ...p,
    isDown: p.direction === 'GIÙ',
    isFirst: i === 0
  }));

  // Sync Refs
  useEffect(() => {
    songRef.current = rawSong;
    patternRef.current = rawPattern;
  }, [rawSong, rawPattern]);

  // --- MOTORE AUDIO ---
  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const noteFrequencies = {
    'DO': [130.81, 164.81, 196.00, 261.63, 329.63, 523.25],
    'DO7': [130.81, 164.81, 196.00, 233.08, 261.63, 329.63],
    'DOm': [130.81, 155.56, 196.00, 261.63, 311.13, 392.00],
    'RE': [146.83, 220.00, 293.66, 146.83, 220.00, 369.99],
    'REm': [146.83, 220.00, 293.66, 146.83, 174.61, 220.00],
    'RE7': [146.83, 220.00, 261.63, 146.83, 220.00, 293.66],
    'MI': [164.81, 246.94, 329.63, 164.81, 207.65, 329.63],
    'MIm': [164.81, 246.94, 329.63, 164.81, 196.00, 246.94],
    'MI7': [164.81, 246.94, 293.66, 164.81, 196.00, 246.94],
    'FA': [87.31, 174.61, 220.00, 261.63, 349.23, 174.61],
    'FAm': [87.31, 174.61, 207.65, 261.63, 349.23, 174.61],
    'FA#m': [92.50, 185.00, 220.00, 277.18, 369.99, 185.00],
    'FA#m7': [92.50, 185.00, 220.00, 164.81, 277.18, 185.00],
    'SOL': [196.00, 246.94, 293.66, 392.00, 493.88, 196.00],
    'SOLm': [196.00, 233.08, 293.66, 392.00, 466.16, 196.00],
    'SOL#m': [207.65, 246.94, 311.13, 415.30, 493.88, 207.65],
    'SOL7': [196.00, 246.94, 293.66, 174.61, 392.00, 196.00],
    'LA': [110.00, 220.00, 277.18, 329.63, 440.00, 220.00],
    'LAm': [110.00, 220.00, 261.63, 329.63, 440.00, 220.00],
    'LA7': [110.00, 220.00, 277.18, 196.00, 329.63, 220.00],
    'SI': [123.47, 246.94, 369.99, 493.88, 246.94, 123.47],
    'SIb': [116.54, 233.08, 349.23, 466.16, 233.08, 116.54],
    'SIm': [123.47, 246.94, 293.66, 369.99, 493.88, 246.94]
  };

  const playClick = (isAccent) => {
    if (!soundEnabled) return;
    const ctx = ensureAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = isAccent ? 1200 : 800;
    gainNode.gain.value = isAccent ? 0.3 : 0.15;
    oscillator.start(ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    oscillator.stop(ctx.currentTime + 0.05);
  };

  const playChord = (chordName, isDown) => {
    if (!chordSoundEnabled) return;
    const ctx = ensureAudioContext();
    const cleanName = chordName ? chordName.trim() : 'DO';
    const frequencies = noteFrequencies[cleanName] || noteFrequencies['DO'];
    const now = ctx.currentTime;
    const duration = 0.3;
    const baseVolume = 0.08;
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'triangle';
      const volume = isDown ? baseVolume * 1.2 : baseVolume * 0.9;
      gainNode.gain.value = volume;
      const delay = isDown ? index * 0.005 : (5 - index) * 0.005;
      oscillator.start(now + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
      oscillator.stop(now + delay + duration);
    });
  };

  // --- LOOP PRINCIPALE ---
  useEffect(() => {
    if (!isPlaying) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }
    const quarterNote = (60 / bpm) * 1000;

    // Logica Count-In
    if (!countInDone && !isCountingRef.current) {
      isCountingRef.current = true;
      let count = 0;
      const runCountIn = () => {
        if (!isPlayingRef.current) return;
        count++;
        if (count <= 4) {
          setCountInBeat(count);
          playClick(count === 1);
          timeoutRef.current = setTimeout(runCountIn, quarterNote);
        } else {
          isCountingRef.current = false;
          setCountInDone(true);
          setCountInBeat(0);
          runMainLoop();
        }
      };
      runCountIn();
      return;
    }

    if (countInDone && isPlaying) {
      runMainLoop();
    }

    function runMainLoop() {
        const scheduleNext = () => {
            if (!isPlayingRef.current) return;
            const livePattern = patternRef.current;
            const liveSong = songRef.current;
            
            // 1. Pattern
            const beatIndex = beatIndexRef.current % livePattern.length;
            const currentPatternStep = livePattern[beatIndex];

            // 2. Accordo
            let activeChordIndex = chordIndexRef.current;
            if (beatIndex === 0 && beatIndexRef.current > 0) {
                const nextChordIdx = (activeChordIndex + 1) % liveSong.length;
                chordIndexRef.current = nextChordIdx; 
                setCurrentChord(nextChordIdx);        
                activeChordIndex = nextChordIdx;      
            }
            
            // 3. Audio
            playClick(currentPatternStep.isFirst);
            if (liveSong[activeChordIndex]) {
                playChord(liveSong[activeChordIndex].chord, currentPatternStep.isDown);
            }
            
            // 4. UI
            setCurrentBeat(beatIndex);
            
            // Next step
            beatIndexRef.current++;
            const durationMultiplier = parseFloat(currentPatternStep.duration) || 1;
            const nextDuration = durationMultiplier * quarterNote;
            timeoutRef.current = setTimeout(scheduleNext, nextDuration);
        };

        if (!timeoutRef.current || countInDone) {
            scheduleNext();
        }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, countInDone, bpm]); 

  // --- CONTROLLI ---
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      isCountingRef.current = false;
    } else {
      ensureAudioContext();
      setCountInDone(false);
      beatIndexRef.current = 0; 
      setIsPlaying(true);
      isPlayingRef.current = true; 
    }
  };

  const reset = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    isCountingRef.current = false;
    setCurrentBeat(0);
    setCurrentChord(0);
    setCountInDone(false);
    setCountInBeat(0);
    beatIndexRef.current = 0;
    chordIndexRef.current = 0;
  };

  const adjustBpm = (change) => setBpm(prev => Math.max(40, Math.min(200, prev + change)));
  const addPatternStep = () => setCustomPattern([...customPattern, { direction: 'GIÙ', duration: 0.5, beat: '?' }]);
  const removePatternStep = (index) => { if (customPattern.length > 1) setCustomPattern(customPattern.filter((_, i) => i !== index)); };
  const updatePatternStep = (index, field, value) => {
    const newPattern = [...customPattern];
    newPattern[index][field] = value;
    setCustomPattern(newPattern);
  };
  const nextChordDisplayIndex = (currentChord + 1) % rawSong.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 flex items-center justify-center">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="max-w-4xl w-full bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-white">🎸 {songTitle}</h1>
            <button onClick={() => setShowSettings(!showSettings)} className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-all">
              <Settings size={24} />
            </button>
          </div>
          <p className="text-blue-200 text-lg">Metronomo Visivo Interattivo</p>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="mb-8 bg-white/10 rounded-xl p-6 max-h-96 overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-xl">⚙️ Impostazioni</h3>
              <button onClick={() => setShowSettings(false)} className="text-white/70 hover:text-white"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-white/70 text-sm block mb-2">Titolo Canzone</label>
                <input type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/20 focus:border-white/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-white/70 text-sm block mb-2">Progressione Accordi</label>
                <input type="text" value={chordsInput} onChange={(e) => { setChordsInput(e.target.value); chordIndexRef.current = 0; setCurrentChord(0); }} className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/20 focus:border-white/50 focus:outline-none" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-white/70 text-sm">Pattern Ritmo</label>
                  <button onClick={addPatternStep} className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-1 text-xs flex items-center gap-1"><Plus size={14} /> Aggiungi</button>
                </div>
                <div className="space-y-2">
                  {customPattern.map((step, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 flex items-center gap-2">
                      <div className="text-white/70 text-sm w-8">{index + 1}.</div>
                      <select value={step.direction} onChange={(e) => updatePatternStep(index, 'direction', e.target.value)} className="bg-white/10 text-white rounded px-2 py-1 text-sm border border-white/20 focus:outline-none"><option value="GIÙ">↓ GIÙ</option><option value="SU">↑ SU</option></select>
                      <select value={step.duration} onChange={(e) => updatePatternStep(index, 'duration', parseFloat(e.target.value))} className="bg-white/10 text-white rounded px-2 py-1 text-sm border border-white/20 focus:outline-none"><option value="2">2/4</option><option value="1">1/4</option><option value="0.5">1/8</option><option value="0.25">1/16</option></select>
                      <input type="text" value={step.beat} onChange={(e) => updatePatternStep(index, 'beat', e.target.value)} className="bg-white/10 text-white rounded px-2 py-1 text-sm w-12 border border-white/20 focus:outline-none text-center" />
                      {customPattern.length > 1 && <button onClick={() => removePatternStep(index)} className="bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded p-1"><Trash2 size={16} /></button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Count-in */}
        {isPlaying && !countInDone && (
          <div className="mb-8 text-center">
            <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl px-16 py-8 shadow-2xl animate-pulse">
              <div className="text-white/70 text-lg mb-2">PREPÀRATI</div>
              <div className="text-8xl font-black text-white">{countInBeat}</div>
            </div>
          </div>
        )}

        {/* Accordi Display */}
        {(!isPlaying || countInDone) && (
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl px-12 py-6 shadow-2xl transform transition-all duration-300">
              <div className="text-white/70 text-sm mb-1 text-center">ACCORDO CORRENTE</div>
              <div className="text-6xl font-black text-white text-center">{rawSong[currentChord] ? rawSong[currentChord].chord : '-'}</div>
            </div>
            <div className="text-white text-4xl">→</div>
            <div className="inline-block bg-white/20 rounded-2xl px-8 py-4 shadow-lg">
              <div className="text-white/60 text-xs mb-1 text-center">PROSSIMO</div>
              <div className="text-3xl font-bold text-white/80 text-center">{rawSong[nextChordDisplayIndex] ? rawSong[nextChordDisplayIndex].chord : '-'}</div>
            </div>
          </div>
        )}

        {/* Pattern Visivo - FIX: Pallino unico */}
        {(!isPlaying || countInDone) && (
          <div className="mb-8 overflow-x-auto overflow-y-hidden py-8 px-4 scrollbar-hide">
            <div className="flex gap-4 justify-center min-w-max mx-auto w-fit p-4">
              {rawPattern.map((move, index) => {
                const isActive = currentBeat === index && isPlaying;
                const isPast = currentBeat > index && isPlaying;
                return (
                  <div key={index} className={`relative rounded-2xl p-6 transition-all duration-150 flex-shrink-0 w-24 ${isActive ? 'bg-gradient-to-br from-green-400 to-emerald-500 scale-110 shadow-2xl shadow-green-500/50' : isPast ? 'bg-white/20' : 'bg-white/10'} ${move.isFirst ? 'ring-4 ring-yellow-400' : ''}`}>
                    
                    <div className={`absolute -top-3 -left-3 text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center z-10 ${move.isFirst ? 'bg-yellow-400 text-black' : 'bg-white/30 text-white'}`}>
                      {move.beat}
                    </div>

                    <div className="text-center">
                      <div className={`text-5xl transition-all duration-150 ${isActive ? 'text-white animate-bounce' : 'text-white/60'}`}>{move.isDown ? '↓' : '↑'}</div>
                      <div className={`text-xs font-bold mt-2 ${isActive ? 'text-white' : 'text-white/50'}`}>{move.direction}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progressione */}
        <div className="mb-8 bg-white/5 rounded-xl p-8 overflow-x-auto scrollbar-hide">
          <div className="text-white/70 text-sm mb-4 text-center">PROGRESSIONE</div>
          <div className="flex gap-3 justify-center min-w-max mx-auto w-fit">
            {rawSong.map((item, index) => (
              <div key={index} className={`px-4 py-2 rounded-lg font-bold transition-all duration-300 ${currentChord === index ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white scale-110 shadow-lg z-10' : index === nextChordDisplayIndex ? 'bg-white/30 text-white ring-2 ring-white/50' : 'bg-white/10 text-white/50'}`}>
                {item.chord}
              </div>
            ))}
          </div>
        </div>

        {/* Controlli & Modulazione Velocità - REINSERITO */}
        <div className="space-y-6">
          
          {/* Sezione BPM (Modulazione Velocità) */}
          <div className="bg-white/5 rounded-xl p-6">
            <div className="text-white/70 text-sm mb-3 text-center">VELOCITÀ (BPM)</div>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => adjustBpm(-5)} className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 font-bold transition-all">-5</button>
              <div className="text-4xl font-black text-white w-24 text-center">{bpm}</div>
              <button onClick={() => adjustBpm(5)} className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 font-bold transition-all">+5</button>
            </div>
          </div>

          {/* Pulsanti */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={togglePlay} className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl ${isPlaying ? 'bg-gradient-to-r from-red-500 to-pink-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'} text-white`}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} />} {isPlaying ? 'PAUSA' : 'PLAY'}
            </button>
            <button onClick={reset} className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg bg-white/10 hover:bg-white/20 text-white transition-all transform hover:scale-105 shadow-xl">
              <RotateCcw size={24} /> RESET
            </button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`flex items-center gap-2 px-6 py-4 rounded-xl font-bold text-sm transition-all transform hover:scale-105 shadow-xl ${soundEnabled ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white' : 'bg-white/10 text-white/50'}`}>
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />} <span className="hidden sm:inline">CLICK</span>
            </button>
            <button onClick={() => setChordSoundEnabled(!chordSoundEnabled)} className={`flex items-center gap-2 px-6 py-4 rounded-xl font-bold text-sm transition-all transform hover:scale-105 shadow-xl ${chordSoundEnabled ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' : 'bg-white/10 text-white/50'}`}>
              🎸 <span className="hidden sm:inline">ACCORDI</span>
            </button>
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-8 bg-white/5 rounded-xl p-4">
          <div className="text-white/70 text-sm mb-2 text-center font-bold">LEGENDA</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500"></div><span>Plettrata attiva</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full ring-2 ring-yellow-400"></div><span>Primo battere (accento)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-white/20"></div><span>Plettrata passata</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-white/70 font-bold">⚙️</div><span>Personalizza ritmo e accordi</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChitarraTrainer;
