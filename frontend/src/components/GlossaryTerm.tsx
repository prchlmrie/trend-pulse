import type { ReactNode } from 'react';
import './GlossaryTerm.css';

const GLOSSARY: Record<string, string> = {
  ROI: 'Money you get back',
  Margin: 'Profit per sale',
  Wholesale: 'What you pay suppliers',
  Retail: 'What buyers pay you',
  Velocity: 'How fast it sells',
  Capital: 'Cash you can spend',
};

type Props = {
  term: keyof typeof GLOSSARY | string;
  children?: ReactNode;
};

export function GlossaryTerm({ term, children }: Props) {
  const tip = GLOSSARY[term] ?? term;
  return (
    <abbr className="glossary-term" title={`${term}: ${tip}`}>
      {children ?? term}
    </abbr>
  );
}
