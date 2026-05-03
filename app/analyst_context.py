"""Shared dataclasses for AI analyst context (used by ai_analyst and repositories)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class TrendContext:
    """All live metrics for a single trend, pulled from persistence."""

    trend_id: int
    trend_name: str
    category: str
    strength: float
    lifecycle_stage: str
    velocity: float
    predicted_growth_14d: float
    trend_score: float
    frequency: int
    price_min: float
    price_max: float
    demand_score: float
    competition_score: float
    profit_score: float
    suggested_action: str
    risk_level: str
    entry_timing: str
    suggested_inventory: str
    reasoning: str
    alert_messages: list[str] = field(default_factory=list)

    @property
    def competition_label(self) -> str:
        s = self.competition_score
        if s < 0.34:
            return "LOW"
        if s < 0.67:
            return "MEDIUM"
        return "HIGH"

    def to_prompt_block(self) -> str:
        alerts_str = (
            "\n".join(f"  - {a}" for a in self.alert_messages)
            if self.alert_messages
            else "  None"
        )
        return f"""
=== TREND DATA: {self.trend_name} ===
Lifecycle stage   : {self.lifecycle_stage}
Trend score       : {self.trend_score:.2f}
Velocity          : {self.velocity:.2f}  (rate of growth; >0.7 = fast-moving)
Predicted growth  : +{self.predicted_growth_14d:.1f}% over 14 days
Signal frequency  : {self.frequency} mentions
Price range (PHP) : ₱{self.price_min:,.2f} – ₱{self.price_max:,.2f}
Demand score      : {self.demand_score:.2f}
Competition score : {self.competition_score:.2f} ({self.competition_label})
Profit score      : {self.profit_score:.2f}
Suggested action  : {self.suggested_action}
Risk level        : {self.risk_level}
Entry timing      : {self.entry_timing}
Inventory tip     : {self.suggested_inventory or 'N/A'}
System reasoning  : {self.reasoning or 'N/A'}
Active alerts     :
{alerts_str}
""".strip()


@dataclass
class UserContext:
    user_id: int
    name: str
    budget: float
    risk_tolerance: str
    experience_level: str
    preferred_categories: str

    def to_prompt_block(self) -> str:
        return f"""
=== USER PROFILE ===
Name               : {self.name}
Budget (PHP)       : ₱{self.budget:,.2f}
Risk tolerance     : {self.risk_tolerance}
Experience level   : {self.experience_level}
Preferred categories: {self.preferred_categories or 'any'}
""".strip()
