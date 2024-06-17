export interface Message {
  role: 'user' | 'model';
  content: string;
  usage?: Usage;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
}
