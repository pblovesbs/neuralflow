

export interface DemoStep {
  title: string;
  description: string;
  durationMs: number;
}

export interface DemoConfig {
  id: string;
  title: string;
  description: string;
  steps: DemoStep[];
  prefilledWizard: {
    useCase: string;
    modelTier: string;
  };
}

export const DEMO_CONFIGS: DemoConfig[] = [
  {
    id: 'summarize',
    title: 'Summarize a Document',
    description: 'Watch NeuralFlow distill a 20-page PDF into a crisp 3-point summary in seconds.',
    steps: [
      { title: '1. Select Source', description: 'User selects the AnnualReport.pdf file.', durationMs: 2500 },
      { title: '2. AI Processing', description: 'NeuralFlow routes the file through a Fast & Light model.', durationMs: 4000 },
      { title: '3. Save Output', description: 'The summary is saved directly to the Desktop.', durationMs: 2500 }
    ],
    prefilledWizard: { useCase: 'summarize_document', modelTier: 'speed' }
  },
  {
    id: 'sort_emails',
    title: 'Sort Emails',
    description: 'See the AI read an inbox and tag emails by topic: Urgent, Spam, or Review.',
    steps: [
      { title: '1. Connect Inbox', description: 'Securely connects to the IMAP server.', durationMs: 2500 },
      { title: '2. Categorize', description: 'The AI brain analyzes context and sorts each email.', durationMs: 4000 },
      { title: '3. Deliver', description: 'Results are compiled into a neat daily digest.', durationMs: 2500 }
    ],
    prefilledWizard: { useCase: 'sort_emails', modelTier: 'balanced' }
  },
  {
    id: 'extract_receipts',
    title: 'Extract Receipts',
    description: 'Drop in a folder of receipt images and get a clean CSV table of expenses.',
    steps: [
      { title: '1. Scan Folder', description: 'Reads all images in the /Receipts folder.', durationMs: 2500 },
      { title: '2. Data Extraction', description: 'Extracts Date, Vendor, and Amount.', durationMs: 4000 },
      { title: '3. CSV Generation', description: 'Outputs a perfectly formatted CSV file.', durationMs: 2500 }
    ],
    prefilledWizard: { useCase: 'extract_receipts', modelTier: 'balanced' }
  },
  {
    id: 'translate',
    title: 'Translate Document',
    description: 'Translate a complex technical manual from Spanish to English flawlessly.',
    steps: [
      { title: '1. Select Manual', description: 'User selects the Spanish PDF manual.', durationMs: 2500 },
      { title: '2. Translation', description: 'Deep Thinker model translates retaining formatting.', durationMs: 4500 },
      { title: '3. Save Document', description: 'English version saved alongside original.', durationMs: 2500 }
    ],
    prefilledWizard: { useCase: 'translate_document', modelTier: 'power' }
  },
  {
    id: 'code_review',
    title: 'Review My Code',
    description: 'Paste a messy script and let the AI find bugs and suggest optimizations.',
    steps: [
      { title: '1. Input Script', description: 'User uploads main.py.', durationMs: 2500 },
      { title: '2. Code Analysis', description: 'AI detects a memory leak and suggests a fix.', durationMs: 4000 },
      { title: '3. Review Report', description: 'A markdown review report is generated.', durationMs: 2500 }
    ],
    prefilledWizard: { useCase: 'code_review', modelTier: 'balanced' }
  },
  {
    id: 'chat_local',
    title: 'Chat with Local Data',
    description: 'Query your private financial logs entirely locally. Zero data leaves your machine.',
    steps: [
      { title: '1. Index Local Logs', description: 'Scans /Finance and builds a local vector database.', durationMs: 3500 },
      { title: '2. RAG Query', description: '"What were my total Q3 expenses?"', durationMs: 4000 },
      { title: '3. Secure Response', description: 'AI answers accurately without internet access.', durationMs: 3000 }
    ],
    prefilledWizard: { useCase: 'chat_local_data', modelTier: 'balanced' }
  }
];
