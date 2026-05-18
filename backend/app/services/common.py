def competition_label(score: float | None) -> str:
    s = float(score or 0.0)
    if s < 0.34:
        return "LOW"
    if s < 0.67:
        return "MEDIUM"
    return "HIGH"
