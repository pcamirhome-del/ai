
export interface Scene {
  id: string;
  description: string;
  visualPrompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
}

export enum WorkflowStep {
  INPUT = 'INPUT',
  ANALYZING = 'ANALYZING',
  REVIEW = 'REVIEW',
  GENERATING = 'GENERATING',
  FINISH = 'FINISH'
}

export interface StoryAnalysis {
  title: string;
  scenes: Scene[];
}
