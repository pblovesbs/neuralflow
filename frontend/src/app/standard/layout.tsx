import { Metadata } from 'next';
import StandardHeader from './StandardHeader';

export const metadata: Metadata = {
  title: 'NeuralFlow | Standard Mode',
  description: 'Frictionless AI workflows. Select a task and get results.',
};

export default function StandardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <StandardHeader />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
