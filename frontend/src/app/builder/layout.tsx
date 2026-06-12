import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NeuralFlow | Builder Mode',
  description: 'Full architectural control. Build, wire, and fine-tune your DAG.',
};

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  );
}
