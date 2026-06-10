import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Zap,
  HardHat, Home, Wrench, Compass, Ruler,
  Building2, Factory, Briefcase, Activity, Truck,
} from 'lucide-react';
import { DEMO_TRANSCRIPT } from '../data/demo.js';

const FIGHTERS = [
  { industry: 'Commercial Construction',   name: 'THE CONTRACTOR',  Icon: HardHat   },
  { industry: 'Residential Construction',  name: 'THE BUILDER',     Icon: Home      },
  { industry: 'Specialty Contracting',     name: 'THE SPECIALIST',  Icon: Wrench    },
  { industry: 'Civil Engineering',         name: 'THE ENGINEER',    Icon: Compass   },
  { industry: 'Architecture & Design',     name: 'THE ARCHITECT',   Icon: Ruler     },
  { industry: 'Real Estate Development',   name: 'THE DEVELOPER',   Icon: Building2 },
  { industry: 'Manufacturing',             name: 'THE FABRICATOR',  Icon: Factory   },
  { industry: 'Professional Services',     name: 'THE CONSULTANT',  Icon: Briefcase },
  { industry: 'Healthcare Operations',     name: 'THE MEDIC',       Icon: Activity  },
  { industry: 'Logistics & Distribution',  name: 'THE DISPATCHER',  Icon: Truck     },
];

const STAGES = [
  'Parsing transcript structure',
  'Identifying departments & workflows',
  'Mapping pain points & bottlenecks',
  'Calculating time & cost leakage',
  'Generating automation recommendations',
  'Building workflow visualization',
  'Finalizing audit deliverable',
];

function LightningSVG({ flip = false }) {
  return (
    <svg
      width="20"
      height="44"
      viewBox="0 0 20 44"
      fill="none"
      style={{ transform: flip ? 'scaleX(-1)' : 'none', opacity: 0.75, flexShrink: 0 }}
    >
      <path d="M14 0L2 24H10L6 44L20 18H12L14 0Z" fill="#D4A017" />
    </svg>
  );
}

function FighterSelectScreen({ form, setForm, canEnterArena, onEnter }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px 48px',
        position: 'relative',
      }}
    >
      <div className="scanlines" />

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <LightningSVG />
          <div style={{
            fontFamily: 'Bebas Neue',
            fontSize: 'clamp(52px, 9vw, 100px)',
            background: 'linear-gradient(180deg, #D4A017 0%, #C8001A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.06em',
            lineHeight: 1,
          }}>
            AUDIT KOMBAT
          </div>
          <LightningSVG flip />
        </div>
        <div style={{
          fontFamily: 'Space Mono',
          fontSize: 10,
          color: '#6B5B4E',
          letterSpacing: '0.15em',
          marginTop: 8,
        }}>
          by ELIGEO — OPERATIONS INTELLIGENCE
        </div>
      </div>

      {/* Choose your fighter label */}
      <div style={{
        fontFamily: 'Bebas Neue',
        fontSize: 13,
        color: '#D4A017',
        letterSpacing: '0.22em',
        margin: '28px 0 16px',
      }}>
        — CHOOSE YOUR FIGHTER —
      </div>

      {/* Fighter grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
        width: '100%',
        maxWidth: 820,
        marginBottom: 28,
      }}>
        {FIGHTERS.map((fighter) => {
          const isSelected = form.industry === fighter.industry;
          return (
            <motion.button
              key={fighter.industry}
              onClick={() => setForm(f => ({ ...f, industry: fighter.industry }))}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              style={{
                position: 'relative',
                background: isSelected ? 'rgba(200,0,26,0.12)' : 'rgba(18,0,16,0.85)',
                border: `2px solid ${isSelected ? '#C8001A' : '#2A1A10'}`,
                borderRadius: 0,
                padding: '14px 8px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 7,
                boxShadow: isSelected
                  ? '0 0 14px rgba(200,0,26,0.5), 0 0 28px rgba(200,0,26,0.2)'
                  : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: '#C8001A',
                  color: '#F0E6D3',
                  fontFamily: 'Space Mono',
                  fontSize: 7,
                  padding: '1px 5px',
                  letterSpacing: '0.04em',
                  lineHeight: 1.6,
                }}>
                  P1 ▶
                </div>
              )}
              <fighter.Icon
                size={26}
                color={isSelected ? '#C8001A' : '#6B5B4E'}
                strokeWidth={1.5}
              />
              <div style={{
                fontFamily: 'Bebas Neue',
                fontSize: 10,
                color: isSelected ? '#F0E6D3' : '#6B5B4E',
                letterSpacing: '0.07em',
                textAlign: 'center',
                lineHeight: 1.25,
              }}>
                {fighter.name}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Fighter stat inputs */}
      <div style={{ width: '100%', maxWidth: 820, marginBottom: 24 }}>
        <div style={{
          fontFamily: 'Bebas Neue',
          fontSize: 11,
          color: '#D4A017',
          letterSpacing: '0.2em',
          marginBottom: 12,
          textAlign: 'center',
        }}>
          — ENTER FIGHTER STATS —
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label className="arcade-label">FIGHTER ALIAS</label>
            <input
              className="arcade-input"
              value={form.clientName}
              onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              placeholder="Meridian Construction Co."
            />
          </div>
          <div>
            <label className="arcade-label">CREW SIZE</label>
            <div style={{ position: 'relative' }}>
              <input
                className="arcade-input"
                type="number"
                value={form.teamSize}
                onChange={e => setForm(f => ({ ...f, teamSize: e.target.value }))}
                placeholder="38"
                style={{ paddingRight: 38 }}
              />
              <span className="arcade-input-suffix">PPL</span>
            </div>
          </div>
          <div>
            <label className="arcade-label">LOADED RATE</label>
            <div style={{ position: 'relative' }}>
              <span className="arcade-input-prefix">$</span>
              <input
                className="arcade-input"
                type="number"
                value={form.hourlyRate}
                onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                placeholder="92"
                style={{ paddingLeft: 22, paddingRight: 38 }}
              />
              <span className="arcade-input-suffix">/HR</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <motion.button
        onClick={onEnter}
        disabled={!canEnterArena}
        whileHover={canEnterArena ? { scale: 1.01 } : {}}
        whileTap={canEnterArena ? { scale: 0.98 } : {}}
        className={canEnterArena ? 'arcade-btn-primary' : 'arcade-btn-disabled'}
        style={{ width: '100%', maxWidth: 820 }}
      >
        ▶ ENTER THE ARENA ▶
      </motion.button>
    </motion.div>
  );
}

function IntelUploadScreen({ form, onTranscriptChange, selectedFighter, useDemo, dragOver, setDragOver, canFight, onDemo, onFile, onDrop, onFight, onBack }) {
  const [transcriptFocused, setTranscriptFocused] = useState(false);
  const fileInputRef = useRef(null);
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px 48px',
        position: 'relative',
      }}
    >
      <div className="scanlines" />

      {/* VS header */}
      <div style={{
        width: '100%',
        maxWidth: 820,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
        paddingBottom: 16,
        borderBottom: '1.5px solid #2A1A10',
      }}>
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#6B5B4E', marginBottom: 2, letterSpacing: '0.1em' }}>P1</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: '#C8001A', letterSpacing: '0.1em' }}>
            {selectedFighter?.name ?? 'THE CONTRACTOR'}
          </div>
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, color: '#D4A017', letterSpacing: '0.15em' }}>VS</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#6B5B4E', marginBottom: 2, letterSpacing: '0.1em' }}>SYSTEM</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: '#6B5B4E', letterSpacing: '0.1em' }}>
            OPS AUDIT v2.4
          </div>
        </div>
      </div>

      {/* Section title */}
      <div style={{
        width: '100%',
        maxWidth: 820,
        fontFamily: 'Bebas Neue',
        fontSize: 13,
        color: '#D4A017',
        letterSpacing: '0.22em',
        marginBottom: 14,
      }}>
        — UPLOAD BATTLE INTEL —
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload transcript file"
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        style={{
          width: '100%',
          maxWidth: 820,
          border: `1.5px dashed ${dragOver ? '#FF4500' : '#2A1A10'}`,
          padding: '10px 16px',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          background: dragOver ? 'rgba(255,69,0,0.07)' : 'rgba(18,0,16,0.6)',
          transition: 'all 0.15s',
        }}
      >
        <Upload size={14} color={dragOver ? '#FF4500' : '#6B5B4E'} />
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: dragOver ? '#FF4500' : '#F0E6D3' }}>
            DROP .TXT OR .MD INTEL FILE
          </div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: '#6B5B4E' }}>
            or click to browse, or paste below
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.doc"
          style={{ display: 'none' }}
          onChange={e => onFile(e.target.files[0])}
        />
      </div>

      {/* Textarea */}
      <textarea
        value={form.transcript}
        onChange={e => onTranscriptChange(e.target.value)}
        placeholder={`PASTE BATTLE TRANSCRIPT HERE...\n\nThe AI will extract:\n— Departments and workflow steps\n— Pain points and bottlenecks\n— Tools currently in use\n— Automation opportunities\n— Estimated time and cost waste`}
        style={{
          width: '100%',
          maxWidth: 820,
          height: 300,
          background: '#0A0008',
          border: `1.5px solid ${transcriptFocused ? '#D4A017' : '#2A1A10'}`,
          borderRadius: 0,
          padding: '12px 14px',
          color: '#F0E6D3',
          fontSize: 12,
          fontFamily: 'Space Mono',
          lineHeight: 1.65,
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={() => setTranscriptFocused(true)}
        onBlur={() => setTranscriptFocused(false)}
      />

      {form.transcript && (
        <div style={{
          width: '100%',
          maxWidth: 820,
          marginTop: 6,
          fontFamily: 'Space Mono',
          fontSize: 9,
          color: '#6B5B4E',
          display: 'flex',
          gap: 12,
          letterSpacing: '0.06em',
        }}>
          <span>INTEL UNITS: {form.transcript.split(' ').length.toLocaleString()}</span>
          <span>//</span>
          <span>{form.transcript.split('\n').filter(Boolean).length} LINES</span>
        </div>
      )}

      {/* Demo button + back */}
      <div style={{
        width: '100%',
        maxWidth: 820,
        marginTop: 14,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={onDemo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: '1.5px solid #2A1A10',
            borderRadius: 0,
            padding: '7px 14px',
            color: '#D4A017',
            fontSize: 11,
            fontFamily: 'Space Mono',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#D4A017'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#2A1A10'}
        >
          <Zap size={11} />
          LOAD MERIDIAN INTEL FILE
        </button>
        {useDemo && (
          <span style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#D4A017', letterSpacing: '0.12em' }}>
            ✓ INTEL LOADED
          </span>
        )}
        <button
          onClick={onBack}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: '#6B5B4E',
            fontFamily: 'Space Mono',
            fontSize: 9,
            cursor: 'pointer',
            letterSpacing: '0.1em',
          }}
        >
          ← BACK
        </button>
      </div>

      {/* FIGHT button */}
      <motion.button
        onClick={onFight}
        disabled={!canFight}
        whileTap={canFight ? { scale: 0.97 } : {}}
        className={canFight ? 'arcade-btn-fight' : 'arcade-btn-disabled'}
        style={{ width: '100%', maxWidth: 820 }}
      >
        ⚔ INITIATE AUDIT — FIGHT!
      </motion.button>
    </motion.div>
  );
}

function FightSequence({ phase, fighterName, analysisStage }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0008',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '0 24px',
    }}>
      <div className="scanlines" />
      <AnimatePresence mode="wait">

        {phase === 'vs' && (
          <motion.div
            key="vs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{
              fontFamily: 'Bebas Neue',
              fontSize: 'clamp(36px,6vw,72px)',
              background: 'linear-gradient(180deg, #D4A017 0%, #C8001A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.06em',
              marginBottom: 28,
            }}>
              AUDIT KOMBAT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 36, justifyContent: 'center' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: '#C8001A', letterSpacing: '0.1em' }}>
                {fighterName}
              </div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 44, color: '#D4A017', letterSpacing: '0.12em' }}>VS</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: '#6B5B4E', letterSpacing: '0.1em' }}>
                OPS AUDIT SYS
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ textAlign: 'center' }}
          >
            <div className="round-text" style={{
              fontFamily: 'Bebas Neue',
              fontSize: 'clamp(40px,7vw,80px)',
              letterSpacing: '0.1em',
              marginBottom: 8,
            }}>
              ROUND 1
            </div>
            <div style={{
              fontFamily: 'Bebas Neue',
              fontSize: 'clamp(64px,11vw,120px)',
              color: '#D4A017',
              letterSpacing: '0.1em',
              textShadow: '0 0 40px rgba(212,160,23,0.65)',
            }}>
              FIGHT!
            </div>
          </motion.div>
        )}

        {phase === 'fight' && (
          <motion.div
            key="fight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', maxWidth: 680 }}
          >
            {/* HP bar */}
            <div style={{ marginBottom: 32 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                fontFamily: 'Space Mono',
                fontSize: 9,
                color: '#6B5B4E',
                letterSpacing: '0.1em',
              }}>
                <span>OPERATIONS HEALTH</span>
                <span>{Math.round(((analysisStage + 1) / STAGES.length) * 100)}% AUDITED</span>
              </div>
              <div style={{
                height: 16,
                background: '#1A000F',
                border: '1.5px solid #2A1A10',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <motion.div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    height: '100%',
                    background: 'linear-gradient(90deg, #8B0000, #C8001A)',
                  }}
                  initial={{ width: '100%' }}
                  animate={{ width: `${100 - ((analysisStage + 1) / STAGES.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Fight log */}
            <div style={{ fontFamily: 'Space Mono', fontSize: 11 }}>
              {STAGES.slice(0, analysisStage + 1).map((stage, i) => (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 0',
                    borderBottom: '1px solid #2A1A10',
                    color: i === analysisStage ? '#FF4500' : '#D4A017',
                  }}
                >
                  <span style={{ flexShrink: 0 }}>
                    {i === analysisStage ? '▶' : '✓'}
                  </span>
                  <span style={{ letterSpacing: '0.04em' }}>
                    {i === analysisStage
                      ? `${stage.toUpperCase()}...`
                      : `${stage.toUpperCase()} — FLAWLESS!`}
                  </span>
                  {i === analysisStage && (
                    <span className="cursor-blink" style={{ color: '#FF4500' }}>_</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'victory' && (
          <motion.div
            key="victory"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{
              fontFamily: 'Bebas Neue',
              fontSize: 'clamp(64px,12vw,128px)',
              color: '#D4A017',
              letterSpacing: '0.1em',
              textShadow: '0 0 60px rgba(212,160,23,0.8), 0 0 120px rgba(212,160,23,0.4)',
            }}>
              VICTORY!
            </div>
            <div style={{
              fontFamily: 'Space Mono',
              fontSize: 10,
              color: '#6B5B4E',
              marginTop: 12,
              letterSpacing: '0.15em',
            }}>
              AUDIT COMPLETE — LOADING RESULTS...
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export function InputForm({ onAnalyze, isAnalyzing, analysisStage }) {
  const [screen, setScreen] = useState('fighter-select');
  const [analyzePhase, setAnalyzePhase] = useState('vs');
  const [form, setForm] = useState({
    clientName: '',
    industry: 'Commercial Construction',
    teamSize: '',
    hourlyRate: '',
    transcript: '',
  });
  const [useDemo, setUseDemo] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const analyzePhaseRef = useRef(analyzePhase);
  useEffect(() => { analyzePhaseRef.current = analyzePhase; }, [analyzePhase]);

  const selectedFighter = FIGHTERS.find(f => f.industry === form.industry);
  const canEnterArena = !!(form.clientName && Number(form.teamSize) > 0 && Number(form.hourlyRate) > 0);
  const canFight = !!(form.transcript || useDemo);

  useEffect(() => {
    if (!isAnalyzing) return;
    let cancelled = false;
    setAnalyzePhase('vs');
    const t1 = setTimeout(() => { if (!cancelled) setAnalyzePhase('countdown'); }, 800);
    const t2 = setTimeout(() => { if (!cancelled) setAnalyzePhase('fight'); }, 1800);
    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); };
  }, [isAnalyzing]);

  useEffect(() => {
    if (analysisStage === STAGES.length - 1 && analyzePhaseRef.current === 'fight') {
      const t = setTimeout(() => setAnalyzePhase('victory'), 600);
      return () => clearTimeout(t);
    }
  }, [analysisStage]);

  const handleDemo = () => {
    setUseDemo(true);
    setForm({
      clientName: 'Meridian Construction Group',
      industry: 'Commercial Construction',
      teamSize: '38',
      hourlyRate: '92',
      transcript: DEMO_TRANSCRIPT,
    });
  };

  const handleTranscriptChange = (value) => {
    setForm(f => ({ ...f, transcript: value }));
    if (useDemo) setUseDemo(false);
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setForm(f => ({ ...f, transcript: e.target.result }));
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  if (isAnalyzing) {
    return (
      <FightSequence
        phase={analyzePhase}
        fighterName={selectedFighter?.name ?? 'THE CONTRACTOR'}
        analysisStage={analysisStage}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0008', color: '#F0E6D3' }}>
      <AnimatePresence mode="wait">
        {screen === 'fighter-select' ? (
          <FighterSelectScreen
            key="fighter-select"
            form={form}
            setForm={setForm}
            canEnterArena={canEnterArena}
            onEnter={() => setScreen('intel-upload')}
          />
        ) : (
          <IntelUploadScreen
            key="intel-upload"
            form={form}
            onTranscriptChange={handleTranscriptChange}
            selectedFighter={selectedFighter}
            useDemo={useDemo}
            dragOver={dragOver}
            setDragOver={setDragOver}
            canFight={canFight}
            onDemo={handleDemo}
            onFile={handleFile}
            onDrop={handleDrop}
            onFight={() => onAnalyze(form)}
            onBack={() => setScreen('fighter-select')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
