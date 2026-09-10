"""Pytest wiring for the waveform demo.

- puts the example root on ``sys.path`` so ``import waveform_report`` works when
  pytest is invoked from anywhere;
- exposes an ``attach_waveform`` fixture returning a callable that attaches the
  waveform JSON (named ``waveform``) to the current test, which is what the
  native Allure waveform page reads.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pytest

from waveform_report import attach_waveform as _attach_waveform


@pytest.fixture
def attach_waveform() -> Callable[[dict[str, Any]], None]:
    """Return a helper: ``attach_waveform(doc)`` attaches it to the current test."""
    return _attach_waveform
