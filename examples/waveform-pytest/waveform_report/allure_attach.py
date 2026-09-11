"""Attach a waveform document to the current Allure test.

The native Allure waveform page looks for an attachment named ``waveform``
(JSON) on the test result and renders it at the bottom of the test's detail
page. That is the entire integration contract - no HTML, no iframe.
"""

from __future__ import annotations

import json
from typing import Any

WAVEFORM_ATTACHMENT_NAME = "waveform"


def attach_waveform(doc: dict[str, Any], *, name: str = WAVEFORM_ATTACHMENT_NAME) -> None:
    """Attach ``doc`` as a JSON attachment named ``waveform`` to the active test."""
    import allure

    allure.attach(
        json.dumps(doc, ensure_ascii=False),
        name=name,
        attachment_type=allure.attachment_type.JSON,
    )
