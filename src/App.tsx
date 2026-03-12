/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator as CalcIcon, 
  History, 
  Sparkles, 
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as math from 'mathjs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalculationHistory {
  expression: string;
  result: string;
  timestamp: number;
}

// ── BUILT-IN AI EXPLANATION ENGINE ──────────────────────────
function generateExplanation(expression: string, result: string): string {
  if (!expression) return "Please enter an expression first.";
  if (result === 'Error') return "⚠️ This expression has an error. Check for missing brackets or invalid operations.";

  const expr = expression.trim();
  const res = result.trim();
  const num = parseFloat(res);

  let explanation = '';

  // Trig functions
  if (expr.includes('sin(')) {
    const match = expr.match(/sin\(([^)]+)\)/);
    const angle = match ? match[1] : '?';
    explanation += `📐 sin(${angle}): The sine function gives the vertical component of a unit circle point at angle ${angle}. `;
    if (Math.abs(num) < 0.001) explanation += `sin(${angle}) ≈ 0 because this angle is close to 0° or 180°. `;
    else if (Math.abs(num - 1) < 0.001) explanation += `sin(${angle}) = 1 — maximum value, occurs at 90°. `;
  }
  if (expr.includes('cos(')) {
    const match = expr.match(/cos\(([^)]+)\)/);
    const angle = match ? match[1] : '?';
    explanation += `📐 cos(${angle}): The cosine function gives the horizontal component at angle ${angle}. `;
  }
  if (expr.includes('tan(')) {
    const match = expr.match(/tan\(([^)]+)\)/);
    const angle = match ? match[1] : '?';
    explanation += `📐 tan(${angle}): Tangent = sin÷cos. It represents the slope of the angle ${angle}. `;
  }

  // Logarithms
  if (expr.includes('log(')) {
    const match = expr.match(/log\(([^)]+)\)/);
    const val = match ? match[1] : '?';
    explanation += `📊 log(${val}): Logarithm base 10. Answers "10 to what power equals ${val}?" Answer: ${res}. `;
    explanation += `This means 10^${res} ≈ ${val}. `;
  }
  if (expr.includes('ln(')) {
    const match = expr.match(/ln\(([^)]+)\)/);
    const val = match ? match[1] : '?';
    explanation += `📊 ln(${val}): Natural logarithm (base e). Answers "e to what power equals ${val}?" Answer: ${res}. `;
  }

  // Square root
  if (expr.includes('sqrt(')) {
    const match = expr.match(/sqrt\(([^)]+)\)/);
    const val = match ? match[1] : '?';
    explanation += `🔢 √${val}: Square root of ${val} = ${res}. This means ${res} × ${res} = ${val}. `;
  }

  // Power
  if (expr.includes('^')) {
    const match = expr.match(/([0-9.]+)\^([0-9.]+)/);
    if (match) {
      explanation += `🔢 ${match[1]}^${match[2]}: ${match[1]} raised to the power of ${match[2]}. `;
      explanation += `This means multiplying ${match[1]} by itself ${match[2]} times = ${res}. `;
    }
  }

  // Factorial
  if (expr.includes('!')) {
    const match = expr.match(/([0-9]+)!/);
    if (match) {
      explanation += `🔢 ${match[1]}!: Factorial means multiplying all integers from 1 to ${match[1]}. `;
      explanation += `${match[1]}! = ${res}. Used in permutations and combinations. `;
    }
  }

  // Basic arithmetic
  if (expr.match(/[+\-*/]/) && !expr.includes('(')) {
    if (expr.includes('+')) explanation += `➕ Addition: Combining the numbers gives ${res}. `;
    else if (expr.includes('-')) explanation += `➖ Subtraction: The difference is ${res}. `;
    else if (expr.includes('*')) explanation += `✖️ Multiplication: The product is ${res}. `;
    else if (expr.includes('/')) {
      explanation += `➗ Division: The quotient is ${res}. `;
      if (num === 1) explanation += `Any number divided by itself equals 1. `;
    }
  }

  // Pi and e
  if (expr.includes('pi')) explanation += `🔵 π (pi) ≈ 3.14159: The ratio of a circle's circumference to its diameter. `;
  if (expr.includes(' e') || expr === 'e') explanation += `🔵 e ≈ 2.71828: Euler's number, the base of natural logarithm. `;

  // Result analysis
  if (!isNaN(num)) {
    if (Number.isInteger(num) && Math.abs(num) < 1000000) {
      explanation += `\n\n✅ Final Result: ${res} (whole number). `;
    } else {
      explanation += `\n\n✅ Final Result: ${res}. `;
    }
    if (num < 0) explanation += `The result is negative. `;
    if (num === 0) explanation += `The result is zero. `;
    if (Math.abs(num) > 1000000) explanation += `This is a very large number! `;
  }

  if (!explanation) {
    explanation = `📌 Expression: ${expr}\n✅ Result: ${res}\n\nThis expression was evaluated using mathematical rules. The final answer is ${res}.`;
  }

  return explanation.trim();
}

export default function App() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isScientific, setIsScientific] = useState(true);
  
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollLeft = displayRef.current.scrollWidth;
    }
  }, [expression]);

  const handleButtonClick = (value: string) => {
    if (value === '=') {
      calculateResult();
    } else if (value === 'AC') {
      setExpression('');
      setResult('');
      setAiExplanation(null);
    } else if (value === 'DEL') {
      setExpression(prev => prev.slice(0, -1));
    } else {
      const functions = ['sin', 'cos', 'tan', 'log', 'sqrt', 'ln', 'asin', 'acos', 'atan'];
      if (functions.includes(value)) {
        setExpression(prev => prev + value + '(');
      } else {
        setExpression(prev => prev + value);
      }
    }
  };

  const calculateResult = () => {
    if (!expression) return;
    try {
      const evalResult = math.evaluate(expression);
      const formattedResult = typeof evalResult === 'number' 
        ? Number(evalResult.toFixed(8)).toString() 
        : evalResult.toString();
      
      setResult(formattedResult);
      setHistory(prev => [
        { expression, result: formattedResult, timestamp: Date.now() },
        ...prev.slice(0, 19)
      ]);
    } catch (error) {
      setResult('Error');
    }
  };

  const askAI = () => {
    if (!expression && !result) return;
    
    setAiLoading(true);
    setAiExplanation(null);
    
    // Simulate a small delay for better UX
    setTimeout(() => {
      const explanation = generateExplanation(expression, result);
      setAiExplanation(explanation);
      setAiLoading(false);
    }, 800);
  };

  const buttons = [
    { label: 'AC', type: 'func', value: 'AC' },
    { label: '(', type: 'func', value: '(' },
    { label: ')', type: 'func', value: ')' },
    { label: '÷', type: 'op', value: '/' },
    
    { label: '7', type: 'num', value: '7' },
    { label: '8', type: 'num', value: '8' },
    { label: '9', type: 'num', value: '9' },
    { label: '×', type: 'op', value: '*' },
    
    { label: '4', type: 'num', value: '4' },
    { label: '5', type: 'num', value: '5' },
    { label: '6', type: 'num', value: '6' },
    { label: '-', type: 'op', value: '-' },
    
    { label: '1', type: 'num', value: '1' },
    { label: '2', type: 'num', value: '2' },
    { label: '3', type: 'num', value: '3' },
    { label: '+', type: 'op', value: '+' },
    
    { label: '0', type: 'num', value: '0' },
    { label: '.', type: 'num', value: '.' },
    { label: 'DEL', type: 'func', value: 'DEL' },
    { label: '=', type: 'action', value: '=' },
  ];

  const scientificButtons = [
    { label: 'sin', value: 'sin' },
    { label: 'cos', value: 'cos' },
    { label: 'tan', value: 'tan' },
    { label: 'π', value: 'pi' },
    { label: 'log', value: 'log' },
    { label: 'ln', value: 'ln' },
    { label: '√', value: 'sqrt' },
    { label: '^', value: '^' },
    { label: 'e', value: 'e' },
    { label: '!', value: '!' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-7 flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 flex flex-col gap-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <CalcIcon size={20} />
                <span className="font-bold tracking-tight uppercase text-xs">Scientific AI</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-calc-muted"
                >
                  <History size={18} />
                </button>
                <button 
                  onClick={() => setIsScientific(!isScientific)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all",
                    isScientific ? "bg-blue-600 text-white" : "bg-white/5 text-calc-muted"
                  )}
                >
                  Scientific
                </button>
              </div>
            </div>

            <div className="bg-calc-display rounded-2xl p-6 flex flex-col items-end justify-center min-h-[160px] border border-white/5 shadow-inner">
              <div 
                ref={displayRef}
                className="w-full overflow-x-auto whitespace-nowrap text-right text-calc-muted text-lg font-mono mb-2 scrollbar-hide"
              >
                {expression || '0'}
              </div>
              <div className="text-4xl md:text-5xl font-bold font-mono text-white truncate w-full text-right">
                {result || (expression ? '' : '0')}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <AnimatePresence>
                {isScientific && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="col-span-4 grid grid-cols-5 gap-2 mb-2 overflow-hidden"
                  >
                    {scientificButtons.map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => handleButtonClick(btn.value)}
                        className="calc-button calc-button-func py-3"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {buttons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => handleButtonClick(btn.value)}
                  className={cn(
                    "calc-button h-14 md:h-16 text-xl",
                    btn.type === 'num' && "calc-button-num",
                    btn.type === 'op' && "calc-button-op",
                    btn.type === 'func' && "calc-button-func",
                    btn.type === 'action' && "calc-button-action"
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <button 
              onClick={askAI}
              disabled={aiLoading || (!expression && !result)}
              className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
            >
              {aiLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              {aiLoading ? 'Thinking...' : 'Explain with AI'}
            </button>
          </motion.div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {aiExplanation ? (
              <motion.div
                key="explanation"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-panel p-6 flex-1 flex flex-col gap-4 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Sparkles size={18} />
                    <span className="font-bold text-xs uppercase tracking-tight">AI Explanation</span>
                  </div>
                  <button 
                    onClick={() => setAiExplanation(null)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-calc-muted leading-relaxed text-sm">
                  <div className="prose prose-invert max-w-none">
                    {aiExplanation.split('\n').map((line, i) => (
                      <p key={i} className="mb-3">{line}</p>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : showHistory ? (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-panel p-6 flex-1 flex flex-col gap-4 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <History size={18} />
                    <span className="font-bold text-xs uppercase tracking-tight">History</span>
                  </div>
                  <button 
                    onClick={() => setHistory([])}
                    className="text-[10px] font-bold uppercase text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-calc-muted opacity-50 gap-2">
                      <History size={32} />
                      <p className="text-xs">No history yet</p>
                    </div>
                  ) : (
                    history.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setExpression(item.expression);
                          setResult(item.result);
                        }}
                        className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group"
                      >
                        <div className="text-xs text-calc-muted mb-1 truncate group-hover:text-white transition-colors">
                          {item.expression}
                        </div>
                        <div className="text-lg font-bold font-mono text-white">
                          = {item.result}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel p-8 flex-1 flex flex-col items-center justify-center text-center gap-6"
              >
                <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-400">
                  <Sparkles size={40} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">AI Math Assistant</h3>
                  <p className="text-sm text-calc-muted max-w-[240px] mx-auto">
                    Perform calculations and click "Explain with AI" to get step-by-step breakdowns.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-[240px]">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-calc-muted uppercase font-bold">
                    Try: sin(45) * sqrt(144)
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-calc-muted uppercase font-bold">
                    Try: log(100) + e^2
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
