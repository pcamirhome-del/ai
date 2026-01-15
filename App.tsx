
import React, { useState, useEffect } from 'react';
import { WorkflowStep, Scene, StoryAnalysis } from './types';
import { analyzeStory, generateSceneVideo } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<WorkflowStep>(WorkflowStep.INPUT);
  const [story, setStory] = useState('');
  const [analysis, setAnalysis] = useState<StoryAnalysis | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(false);

  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      const active = await window.aistudio.hasSelectedApiKey();
      setHasKey(active);
    }
  };

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasKey(true); // نعتبر العملية ناجحة بعد فتح النافذة
    }
  };

  const handleStartWorkflow = async () => {
    if (!story.trim()) return;
    
    // التحقق من المفتاح قبل البدء
    // @ts-ignore
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await handleOpenKeySelector();
    }

    try {
      setStep(WorkflowStep.ANALYZING);
      setLoadingMsg('جاري تحليل القصة وتقسيم المشاهد...');
      const result = await analyzeStory(story);
      setAnalysis(result);
      setStep(WorkflowStep.REVIEW);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("entity was not found")) {
          setHasKey(false);
          setError('حدث خطأ في صلاحية المفتاح. يرجى إعادة اختيار مفتاح صالح من مشروع GCP مدفوع.');
      } else {
          setError('حدث خطأ أثناء تحليل القصة. يرجى المحاولة مرة أخرى.');
      }
      setStep(WorkflowStep.INPUT);
    }
  };

  const startGeneration = async () => {
    if (!analysis) return;
    setStep(WorkflowStep.GENERATING);
    
    const updatedScenes = [...analysis.scenes];
    
    for (let i = 0; i < updatedScenes.length; i++) {
      try {
        updatedScenes[i].status = 'generating';
        setAnalysis({ ...analysis, scenes: [...updatedScenes] });
        setLoadingMsg(`جاري توليد الفيديو للمشهد ${i + 1} من ${updatedScenes.length}...`);
        
        const videoUrl = await generateSceneVideo(updatedScenes[i].visualPrompt);
        
        updatedScenes[i].videoUrl = videoUrl;
        updatedScenes[i].status = 'completed';
        setAnalysis({ ...analysis, scenes: [...updatedScenes] });
      } catch (err: any) {
        console.error(err);
        updatedScenes[i].status = 'failed';
        setAnalysis({ ...analysis, scenes: [...updatedScenes] });
        
        if (err.message?.includes("entity was not found")) {
            setHasKey(false);
            setError('مشكلة في المفتاح المختار. يجب اختيار مفتاح من مشروع يدعم خدمات Veo.');
            break; 
        }
      }
    }
    setStep(WorkflowStep.FINISH);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-12 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            صانع فيديو الروايات
          </h1>
        </div>

        <div className="flex items-center gap-4">
            <button 
              onClick={handleOpenKeySelector}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                hasKey 
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/50 text-amber-400 animate-pulse'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {hasKey ? 'المفتاح نشط' : 'تنشيط مفتاح API'}
            </button>
            <button 
                onClick={() => window.location.reload()}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
                إعادة ضبط
            </button>
        </div>
      </header>

      <main className="w-full max-w-4xl">
        {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                    <p>{error}</p>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-xs underline mt-1 block">تأكد من تفعيل الفوترة في مشروعك</a>
                </div>
            </div>
        )}

        {step === WorkflowStep.INPUT && (
          <div className="glass p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-4">أدخل نص القصة</h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              توليد الفيديوهات باستخدام نماذج <b>Veo</b> يتطلب مفتاح API من مشروع GCP مدفوع. تأكد من إعداد المفتاح من الأعلى قبل البدء.
            </p>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              className="w-full h-64 bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none mb-6"
              placeholder="اكتب هنا.. مثال: في ليلة عاصفة فوق قمة الجبل، ظهر تنين ذهبي يحمي الكنز المفقود..."
            />
            <button
              onClick={handleStartWorkflow}
              disabled={!story.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              <span>تحليل القصة والبدء</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}

        {(step === WorkflowStep.ANALYZING || (step === WorkflowStep.GENERATING && !analysis?.scenes.some(s => s.videoUrl))) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold mb-2">{loadingMsg}</h2>
            <p className="text-slate-400">هذه العملية قد تستغرق بضع دقائق لتوليد فيديوهات عالية الجودة.</p>
          </div>
        )}

        {step === WorkflowStep.REVIEW && analysis && (
          <div className="animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold">{analysis.title}</h2>
                    <p className="text-slate-400 text-sm">تم استخراج {analysis.scenes.length} مشهد</p>
                </div>
                <button
                    onClick={startGeneration}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                    توليد الفيديوهات الآن
                </button>
            </div>

            <div className="space-y-4">
              {analysis.scenes.map((scene, idx) => (
                <div key={scene.id} className="glass p-6 rounded-2xl flex flex-col md:flex-row gap-6 hover:border-slate-500/50 transition-all">
                  <div className="w-12 h-12 shrink-0 bg-slate-800 rounded-full flex items-center justify-center font-bold text-indigo-400 border border-slate-700">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2 text-slate-100">{scene.description}</h3>
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Visual Prompt</span>
                        <p className="text-sm text-slate-300 italic">{scene.visualPrompt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(step === WorkflowStep.GENERATING || step === WorkflowStep.FINISH) && analysis && (
            <div className="animate-in fade-in duration-700">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">معاينة الفيلم النهائي</h2>
                    {step === WorkflowStep.FINISH && (
                        <button 
                            onClick={() => window.location.reload()}
                            className="text-sm bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-indigo-600/20"
                        >
                            رواية جديدة
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {analysis.scenes.map((scene, idx) => (
                        <div key={scene.id} className="glass rounded-3xl overflow-hidden group border-slate-800">
                            <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
                                {scene.status === 'generating' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-950/60 backdrop-blur-sm">
                                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                                        <p className="font-bold text-indigo-400">جاري الإخراج السينمائي...</p>
                                    </div>
                                )}
                                {scene.status === 'pending' && (
                                    <div className="text-slate-600 text-center">
                                        <svg className="w-16 h-16 mx-auto mb-2 opacity-10" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M7 4V20L17 12L7 4Z" />
                                        </svg>
                                        <p className="text-sm">في الانتظار</p>
                                    </div>
                                )}
                                {scene.status === 'completed' && scene.videoUrl && (
                                    <video 
                                        src={scene.videoUrl} 
                                        controls 
                                        autoPlay 
                                        loop 
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {scene.status === 'failed' && (
                                    <div className="text-red-400 text-center p-4">
                                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="font-bold">فشل توليد هذا المشهد</p>
                                        <p className="text-xs mt-1 opacity-70 italic">تحقق من رصيد الـ API الخاص بك</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-[10px] font-bold px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded uppercase tracking-wider">Scene {idx + 1}</span>
                                    <h3 className="font-bold text-lg text-slate-100">{scene.description}</h3>
                                </div>
                                <p className="text-sm text-slate-400 italic line-clamp-2 leading-relaxed">{scene.visualPrompt}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      <footer className="mt-20 py-10 border-t border-slate-900 w-full max-w-5xl flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs gap-6">
        <div className="text-center md:text-right">
            <p className="font-bold text-slate-400 mb-1 text-sm">صانع فيديو الروايات بالذكاء الاصطناعي</p>
            <p>© 2024 جميع الحقوق محفوظة - مدعوم بـ Google Gemini & Veo</p>
        </div>
        <div className="flex gap-8">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                إدارة الفوترة والأسعار
            </a>
            <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                نسخة V2.1
            </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
