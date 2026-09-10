# Waveform analysis in Allure 3 — pytest example

This example shows the full, working flow for the **native waveform analysis page**
in the Allure 3 Awesome report:

**pytest → `waveform` JSON attachment → `allure generate` → interactive waveform page
at the bottom of the test detail.**

Unlike the old approach (embedding a prebuilt HTML viewer as an attachment, which
Allure sanitizes and sandboxes so its scripts never run and it shows a black box),
the page here is part of the report itself. It renders three synchronized charts
(three‑phase voltage / current / motor) with box‑zoom, pan, A/B cursors, per‑window
statistics, channel toggles and fullscreen.

> 中文说明见下文《中文使用说明》。

---

## What you get

For every test that attaches a JSON attachment **named `waveform`**, the report shows
a "波形分析 / Waveform Analysis" panel at the bottom of that test's detail page. Tests
without such an attachment show no panel.

The integration contract is intentionally tiny: **attach a JSON attachment named
`waveform`**. Everything else (charts, cursors, stats, fullscreen) is handled by the
report.

## Layout

```
examples/waveform-pytest/
├── README.md
├── requirements.txt          # pytest, allure-pytest, numpy
├── allurerc.mjs              # Allure 3 report config (Awesome plugin)
├── conftest.py               # `attach_waveform` fixture + sys.path wiring
├── waveform_report/
│   ├── __init__.py
│   ├── stats.py              # build_waveform_document(...) + statistics
│   ├── mock_drive.py         # mock 50 Hz PWM traces (replace with real DAQ)
│   └── allure_attach.py      # attach_waveform(doc) -> allure JSON attachment
└── tests/
    └── test_inverter_drive_cycle.py
```

## Prerequisites

- Python 3.10+
- Node.js 18+ to run the Allure 3 CLI (`allure`), installed either from npm
  (`npm i -D allure`) or, inside this monorepo, via the workspace `allure` package.

## Run it

From this directory (`examples/waveform-pytest`):

```bash
# 1. Python deps (isolated venv recommended)
python3 -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Run the tests and write Allure results
pytest tests/ --alluredir=allure-results

# 3. Generate the Allure 3 report (Awesome)
#    - portable (after `npm i -D allure`):
npx allure generate allure-results --config ./allurerc.mjs --output ./allure-report
#    - inside this monorepo instead:
#    yarn allure generate allure-results --config ./allurerc.mjs --output ./allure-report

# 4. Open it in the browser
npx allure open ./allure-report      # or: yarn allure open ./allure-report
```

In the report, open **稳态 PWM 驱动…** (the passing inverter test) and scroll to the
bottom: the native waveform page is there. Open **采集中断…** to see the yellow
length‑warning banner, and **普通断言用例…** to confirm a test with no waveform shows
no panel.

You can also point Allure straight at the results without generating first:

```bash
npx allure open allure-results
```

## The `waveform` JSON contract

`build_waveform_document(...)` produces this shape (you can also hand‑craft it):

```jsonc
{
  "sampleCount": 10000,                 // required, integer >= 1
  "samplingRate": 10000,                // required, Hz, > 0
  "timeline": { "t0": 0, "dt": 0.0001, "unit": "s" },  // or a per-sample seconds array
  "units": { "voltage": "V", "current": "A", "speed": "rpm", "load": "%" },
  "channels": [                         // channel -> group + optional pairing/unit
    { "id": "Va", "group": "voltage", "pairId": "phase-A", "unit": "V" },
    { "id": "speed", "group": "motor", "pairId": null, "unit": "rpm" }
    // ...
  ],
  "warnings": [                         // filled automatically for short channels
    { "channel": "Vc", "expected": 10000, "actual": 5000, "message": "Vc length 5000 < 10000" }
  ],
  "stats": { "full": { /* per-channel stats + voltageImbalance/currentImbalance */ } },

  // one object per group; keys are channel ids, values are equal-length number arrays
  "voltage": { "Va": [/* ... */], "Vb": [/* ... */], "Vc": [/* ... */] },
  "current": { "Ia": [/* ... */], "Ib": [/* ... */], "Ic": [/* ... */] },
  "motor":   { "speed": [/* ... */], "load": [/* ... */] }
}
```

Notes:

- `voltage`, `current`, `motor` are the built‑in groups shown in the embedded view.
  Additional groups are allowed and appear in fullscreen.
- Channels sharing a `pairId` toggle together (e.g. the three voltage phases).
- Short channels are **not** padded with zeros: the report pads the tail with `NaN`
  (drawn as gaps) and shows a warning banner. `build_waveform_document` records the
  warning for you.
- `stats.full` written here is the full‑record statistic shown until you place A/B
  cursors; once both cursors are set the browser computes the window statistics.

## Integrate into your own suite

Minimal pattern — build the document from your acquired arrays and attach it:

```python
import allure
from waveform_report import build_waveform_document, attach_waveform

def test_my_case():
    groups = {
        "voltage": {"Va": va, "Vb": vb, "Vc": vc},   # equal-length lists of floats
        "current": {"Ia": ia, "Ib": ib, "Ic": ic},
        "motor":   {"speed": speed, "load": load},
    }
    doc = build_waveform_document(sample_count=len(va), sampling_rate=10_000.0, groups=groups)
    attach_waveform(doc)     # attaches a JSON attachment named "waveform"
    # ... your assertions ...
```

`attach_waveform(doc)` is just:

```python
allure.attach(json.dumps(doc), name="waveform", attachment_type=allure.attachment_type.JSON)
```

so any equivalent call works. You may attach it in the test body, inside a step, or in
a fixture — the report finds the `waveform`‑named JSON attachment on the test result and
renders the page.

## Page features

- **框选 / 平移 / 游标**: box‑zoom, pan, and A/B cursors (mutually exclusive tools).
- **Ctrl + wheel**: zoom around the pointer. **回退 / 复位**: undo / reset the view.
- **Y随窗**: auto‑scale Y to the visible window.
- **A/B cursors**: place two cursors to read per‑channel values and switch the footer
  statistics from full‑record to the A–B window.
- **通道**: show/hide channel pairs. **全屏**: fullscreen with the channel panel, A/B
  cursor table, and full statistics tables. The page follows the report's light/dark theme.

The report‑side implementation lives in
`packages/web-awesome/src/components/Waveform/`.

---

## 中文使用说明

本示例演示 Allure 3 报告中「原生波形分析页」的完整链路：**pytest 产生名为 `waveform`
的 JSON 附件 → `allure generate` 生成报告 → 在该用例详情底部渲染可交互的波形分析页**。

对接契约只有一条：**给用例登记一个名为 `waveform` 的 JSON 附件**；三张同步图表、框选/
平移/游标、A/B 窗口统计、全屏等都由报告端负责。

运行步骤（在本目录下）：

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
pytest tests/ --alluredir=allure-results
npx allure generate allure-results --config ./allurerc.mjs --output ./allure-report
npx allure open ./allure-report
```

在报告里打开「稳态 PWM 驱动…」用例并滚动到底部即可看到波形分析页；「采集中断…」用例
会在波形页顶部显示黄色长度告警；「普通断言用例…」没有波形附件，因此详情底部不显示波形页。

把它接入你自己的用例，只需用真实采集数据构造 `groups`，调用
`build_waveform_document(...)` 生成文档，再 `attach_waveform(doc)` 即可（等价于
`allure.attach(json, name="waveform", attachment_type=JSON)`）。短通道无需补 0：报告端
会补 `NaN` 并显示告警条。
