"""Build the ``waveform`` JSON document (and its statistics) that the native
Allure waveform page consumes.

The math here mirrors the report-side normalizer so ``stats.full`` written by
pytest matches what the browser computes for the full record.
"""

from __future__ import annotations

from typing import Any

import numpy as np

NAN_RATIO_LIMIT = 0.001
VOLTAGE_IDS = ("Va", "Vb", "Vc")
CURRENT_IDS = ("Ia", "Ib", "Ic")
META_KEYS = {"sampleCount", "samplingRate", "units", "channels", "warnings", "stats", "timeline"}


def valid(x: np.ndarray) -> np.ndarray:
    return x[np.isfinite(x)]


def channel_stats(values: list[float | None] | np.ndarray) -> dict[str, float | None]:
    arr = valid(np.asarray(values, dtype=float))
    empty = {
        "peak": None,
        "min": None,
        "peakPeak": None,
        "average": None,
        "rms": None,
        "crestFactor": None,
        "ripple": None,
        "thd": None,
    }
    if arr.size < 1:
        return empty
    peak = float(np.max(arr))
    mn = float(np.min(arr))
    avg = float(np.mean(arr))
    rms = float(np.sqrt(np.mean(arr * arr)))
    crest = None
    if rms > 0:
        crest = float(max(abs(peak), abs(mn)) / rms)
    ripple = None
    if abs(avg) > 0:
        ripple = float((peak - mn) / abs(avg) * 100.0)
    return {
        "peak": peak,
        "min": mn,
        "peakPeak": float(peak - mn),
        "average": avg,
        "rms": rms,
        "crestFactor": crest,
        "ripple": ripple,
        "thd": None,
    }


def imbalance_percent(rms_values: list[float | None]) -> float | None:
    vals = [v for v in rms_values if v is not None and np.isfinite(v)]
    if len(vals) != 3:
        return None
    mean = float(sum(vals) / 3.0)
    if mean == 0:
        return None
    return float(max(abs(v - mean) for v in vals) / mean * 100.0)


def nan_ratio(values: list[float | None] | np.ndarray, expected: int) -> float:
    arr = np.asarray(values, dtype=float)
    n = max(expected, arr.size)
    if n == 0:
        return 1.0
    invalid = n - int(np.isfinite(arr).sum())
    invalid += max(0, expected - arr.size)
    return invalid / n


def default_channels() -> list[dict[str, str | None]]:
    return [
        {"id": "Va", "group": "voltage", "pairId": "phase-A", "unit": "V"},
        {"id": "Vb", "group": "voltage", "pairId": "phase-B", "unit": "V"},
        {"id": "Vc", "group": "voltage", "pairId": "phase-C", "unit": "V"},
        {"id": "Ia", "group": "current", "pairId": "phase-A", "unit": "A"},
        {"id": "Ib", "group": "current", "pairId": "phase-B", "unit": "A"},
        {"id": "Ic", "group": "current", "pairId": "phase-C", "unit": "A"},
        {"id": "speed", "group": "motor", "pairId": None, "unit": "rpm"},
        {"id": "load", "group": "motor", "pairId": None, "unit": "%"},
    ]


def default_timeline(_sample_count: int, sampling_rate: float, t0: float = 0.0) -> dict[str, float | str]:
    dt = 1.0 / float(sampling_rate) if sampling_rate else 1.0
    return {"t0": float(t0), "dt": dt, "unit": "s"}


def iter_series(payload: dict[str, Any]) -> list[tuple[str, str, list]]:
    out: list[tuple[str, str, list]] = []
    for group in payload:
        if group in META_KEYS:
            continue
        block = payload.get(group)
        if not isinstance(block, dict):
            continue
        for ch_id, series in block.items():
            if isinstance(series, list):
                out.append((group, ch_id, series))
    return out


def build_waveform_document(
    *,
    sample_count: int,
    sampling_rate: float,
    groups: dict[str, dict[str, list]],
    units: dict[str, str] | None = None,
    channels: list[dict[str, str | None]] | None = None,
    timeline: list[float] | dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "sampleCount": int(sample_count),
        "samplingRate": float(sampling_rate),
        "timeline": timeline if timeline is not None else default_timeline(sample_count, sampling_rate),
        "units": units or {"voltage": "V", "current": "A", "speed": "rpm", "load": "%"},
        "channels": channels or default_channels(),
        "warnings": [],
        "stats": {"full": {}},
    }
    payload.update(groups)

    full: dict[str, Any] = {}
    voltage_rms: list[float | None] = []
    current_rms: list[float | None] = []

    for group, ch_id, series in iter_series(payload):
        actual = len(series)
        if actual != sample_count:
            payload["warnings"].append(
                {
                    "channel": ch_id,
                    "expected": sample_count,
                    "actual": actual,
                    "message": f"{ch_id} length {actual} < {sample_count}"
                    if actual < sample_count
                    else f"{ch_id} length {actual} > {sample_count}, truncated in view",
                }
            )
        sliced = series[:sample_count]
        st = channel_stats(sliced)
        full[ch_id] = st
        too_many_missing = nan_ratio(sliced, sample_count) > NAN_RATIO_LIMIT
        if group == "voltage" and ch_id in VOLTAGE_IDS:
            voltage_rms.append(None if too_many_missing else st["rms"])
        if group == "current" and ch_id in CURRENT_IDS:
            current_rms.append(None if too_many_missing else st["rms"])

    full["voltageImbalance"] = imbalance_percent(voltage_rms)
    full["currentImbalance"] = imbalance_percent(current_rms)
    payload["stats"]["full"] = full
    return payload
