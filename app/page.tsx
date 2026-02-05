"use client";

import React, { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type AnalysisResult = {
  top1: {
    name_ko: string;
    name_en: string;
    confidence: number;
    rationale_points: string[];
  };
  warnings: string[];
};

type Step = "HOME" | "LOADING" | "RESULT";

const CATEGORIES = ["식물", "곤충", "새", "기타"];

export default function CorriApp() {
  const [step, setStep] = useState<Step>("HOME");
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState<string>("기타");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    
    setStep("LOADING");
    setError(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("hint", hint);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "분석에 실패했습니다.";
        const responseClone = response.clone(); // 응답 복제
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } catch (e) {
          try {
            const text = await responseClone.text();
            errorMessage = text || errorMessage;
          } catch (textErr) {
            errorMessage = "서버 응답을 읽을 수 없습니다.";
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResult(data);
      setStep("RESULT");
    } catch (err: any) {
      setError(err.message);
      setStep("HOME");
    }
  };

  const reset = () => {
    setImage(null);
    setFile(null);
    setResult(null);
    setStep("HOME");
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="glass-card w-full max-w-md rounded-[40px] p-8 flex flex-col relative min-h-[500px]"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-[#163042] text-2xl font-bold">
              {step === "RESULT" ? "분석 결과" : "Corri"}
            </h1>
            <div className="flex items-center gap-2">
              <span className="bg-[#39C6A5] text-white text-xs font-bold px-3 py-1 rounded-full">
                {step === "HOME" ? "Ready" : step === "LOADING" ? "분석 중" : `${Math.round(result?.top1.confidence! * 100)}% match`}
              </span>
              <button onClick={reset} className="text-[#163042]/50 hover:text-[#163042]">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {step === "HOME" && (
              <>
                <div className="w-full aspect-square max-h-[240px] bg-white/40 rounded-3xl mb-6 flex items-center justify-center overflow-hidden border border-white/60">
                  {image ? (
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-[#2B4A60]/40">
                      <Camera size={48} strokeWidth={1.5} />
                      <p className="mt-2 text-sm">생물 사진을 올려주세요</p>
                    </div>
                  )}
                </div>
                
                <p className="text-[#2B4A60] mb-6 font-medium">
                  {image ? "이 생물을 분석할까요?" : "사진을 올리면 생물을 분석해요"}
                </p>

                <div className="flex gap-2 mb-8 flex-wrap justify-center">
                  {!image ? (
                    <>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="chip px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
                      >
                        <Camera size={18} /> 사진 찍기
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="chip px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
                      >
                        <Upload size={18} /> 업로드
                      </button>
                    </>
                  ) : (
                    CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setHint(cat)}
                        className={cn(
                          "chip px-4 py-2 rounded-full text-xs font-bold transition-all",
                          hint === cat ? "bg-[#3C86B8] text-white border-[#3C86B8]" : "opacity-60"
                        )}
                      >
                        {cat}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {step === "LOADING" && (
              <div className="flex flex-col items-center py-12">
                <div className="relative w-24 h-24 mb-8">
                  <Loader2 size={96} className="text-[#3C86B8] animate-spin opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Camera size={40} className="text-[#3C86B8]" />
                    </motion.div>
                  </div>
                </div>
                <p className="text-[#163042] text-xl font-bold mb-2">AI 분석 중...</p>
                <p className="text-[#2B4A60]/60 text-sm">잠시만 기다려주세요</p>
              </div>
            )}

            {step === "RESULT" && result && (
              <div className="w-full text-left">
                <div className="bg-white/50 rounded-3xl p-6 mb-6 border border-white/60">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[#163042] text-2xl font-black">{result.top1.name_ko}</h2>
                    <CheckCircle2 size={20} className="text-[#4BCB6A]" />
                  </div>
                  <p className="text-[#2B4A60]/60 font-medium mb-4 italic">{result.top1.name_en}</p>
                  
                  <div className="space-y-3">
                    {result.top1.rationale_points.map((point, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#39C6A5] mt-2 shrink-0" />
                        <p className="text-[#2B4A60] text-sm leading-relaxed">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div className="flex gap-2 items-start px-2 mb-6">
                    <AlertCircle size={16} className="text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-[#163042]/55 text-xs leading-tight">
                      {result.warnings.join(" ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="mt-auto pt-6">
            {step === "HOME" && (
              <button
                disabled={!image}
                onClick={startAnalysis}
                className={cn(
                  "primary-button w-full py-5 rounded-[28px] text-lg font-bold shadow-lg shadow-[#3C86B8]/20 transition-all",
                  !image && "opacity-30 grayscale cursor-not-allowed"
                )}
              >
                분석하기
              </button>
            )}
            {step === "LOADING" && (
              <button
                onClick={() => setStep("HOME")}
                className="w-full py-5 rounded-[28px] text-[#2B4A60]/40 text-sm font-bold"
              >
                취소하기
              </button>
            )}
            {step === "RESULT" && (
              <button
                onClick={reset}
                className="primary-button w-full py-5 rounded-[28px] text-lg font-bold shadow-lg shadow-[#3C86B8]/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} /> 다시 하기
              </button>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </motion.div>
      </AnimatePresence>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}
    </main>
  );
}
