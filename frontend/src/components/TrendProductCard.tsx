import { useState } from 'react';
import { formatPHP, trendHeroImage } from '../utils/formatters';
import { profitTier, difficultyRating } from '../utils/merchantFriendly';
import { unitEconomics, roiOnCapital, capitalRequired } from '../utils/resellerLedger';
import { GlossaryTerm } from './GlossaryTerm';
import { addToWatchlist, isWatchlisted, removeFromWatchlist } from '../utils/watchlist';
import './TrendProductCard.css';

export type TrendCardRow = {
  id: number;
  name: string;
  image_url?: string | null;
  profit_score: number;
  competition_level: string;
  risk_level: string;
  price_min: number;
  price_max: number;
};

type Props = {
  row: TrendCardRow;
  onSkip: () => void;
};

export function TrendProductCard({ row, onSkip }: Props) {
  const [showMath, setShowMath] = useState(false);
  const [saved, setSaved] = useState(() => isWatchlisted(row.id));
  const profit = profitTier(row.profit_score);
  const diff = difficultyRating(row.competition_level, row.risk_level);
  const ue = unitEconomics(row.price_min, row.price_max, row.profit_score);
  const invest = capitalRequired(10, ue.wholesale);
  const roi = roiOnCapital(invest, Math.round(10 * ue.profitPerUnit));

  const interested = () => {
    addToWatchlist(row.id);
    setSaved(true);
  };

  const skip = () => {
    if (saved) {
      removeFromWatchlist(row.id);
      setSaved(false);
    }
    onSkip();
  };

  return (
    <article className="tpc-card">
      <div className="tpc-visual">
        <img src={trendHeroImage(row)} alt="" className="tpc-img" />
        <span className={`tpc-profit tpc-profit--${profit.tone}`}>{profit.label}</span>
        <span className={`tpc-diff ${diff.easy ? 'tpc-diff--easy' : 'tpc-diff--hard'}`}>{diff.label}</span>
      </div>
      <div className="tpc-body">
        <h3 className="tpc-name">{row.name}</h3>
        <p className="tpc-tags">
          <span className={`tpc-profit-inline tpc-profit--${profit.tone}`}>{profit.label}</span>
          <span className="tpc-dot">·</span>
          <span>{diff.label} to sell</span>
        </p>
        <button type="button" className="tpc-math-toggle" onClick={() => setShowMath((s) => !s)}>
          {showMath ? 'Hide math' : 'See math'}
        </button>
        {showMath ? (
          <div className="tpc-math font-tabular">
            <p>
              <GlossaryTerm term="Wholesale" />: {formatPHP(ue.wholesale, false)} → <GlossaryTerm term="Retail" />:{' '}
              {formatPHP(ue.retail, false)}
            </p>
            <p>
              10-unit test: {formatPHP(invest, false)} · <GlossaryTerm term="ROI" />: {roi}%
            </p>
          </div>
        ) : null}
        <div className="tpc-actions">
          <button type="button" className="tpc-btn tpc-btn--primary" onClick={interested}>
            {saved ? 'On watchlist ✓' : 'Interested'}
          </button>
          <button type="button" className="tpc-btn tpc-btn--ghost" onClick={skip}>
            Skip
          </button>
        </div>
        </div>
    </article>
  );
}
