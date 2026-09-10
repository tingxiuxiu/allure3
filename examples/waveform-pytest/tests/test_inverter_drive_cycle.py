"""Inverter bench-test scenario.

When these pass, ``allure generate`` produces a report where each test that
attached a ``waveform`` JSON shows the native waveform analysis page at the
bottom of its detail view (three synchronized charts, box-zoom, pan, A/B
cursors, per-window statistics, fullscreen).
"""

from __future__ import annotations

import pytest

allure = pytest.importorskip("allure")

from waveform_report import build_waveform_document
from waveform_report.mock_drive import mock_steady_drive

N = 10_000
FS = 10_000.0
DURATION_S = (N - 1) / FS


@allure.epic("电机台架试验")
@allure.feature("变频器稳态驱动")
@allure.story("50 Hz PWM 三相输出")
@allure.severity(allure.severity_level.CRITICAL)
@allure.tag("waveform", "inverter")
@allure.title("稳态 PWM 驱动：电压 RMS、不平衡度与转速在规格内")
@allure.description(
    "模拟 1 s / 10 kHz 台架采集：三相电压、三相电流、转速与负载。"
    "测试内把 waveform.json 作为名为 `waveform` 的 JSON 附件登记，"
    "Allure 报告会在该用例详情底部渲染原生波形分析页（可框选、平移、打 A/B 游标、全屏）。"
)
def test_inverter_steady_drive_meets_spec(attach_waveform):
    allure.dynamic.parameter("sampleCount", N)
    allure.dynamic.parameter("samplingRateHz", FS)

    with allure.step("台架按 50 Hz 指令进入稳态并采集三相电压/电流/电机状态"):
        groups = mock_steady_drive(n=N, fs=FS)
        doc = build_waveform_document(sample_count=N, sampling_rate=FS, groups=groups)
        assert not doc["warnings"], doc["warnings"]

    with allure.step("登记波形附件（原生波形分析页据此渲染）"):
        attach_waveform(doc)

    full = doc["stats"]["full"]
    va = full["Va"]
    speed = full["speed"]
    u_imb = full["voltageImbalance"]

    with allure.step("判定规格：Va RMS 210–230 V，电压不平衡 < 2%，转速 2800–3000 rpm"):
        summary = (
            f"Va RMS = {va['rms']:.2f} V  (规格 210–230)\n"
            f"电压不平衡 = {u_imb:.3f} %  (规格 < 2)\n"
            f"转速均值 = {speed['average']:.1f} rpm  (规格 2800–3000)\n"
            f"Va Peak = {va['peak']:.1f} V\n"
            f"采样 = {N} 点 · {FS:.0f} Hz\n"
        )
        allure.attach(summary, name="判定摘要", attachment_type=allure.attachment_type.TEXT)
        assert va["rms"] is not None and 210.0 <= va["rms"] <= 230.0
        assert u_imb is not None and u_imb < 2.0
        assert speed["average"] is not None and 2800.0 <= speed["average"] <= 3000.0


@allure.epic("电机台架试验")
@allure.feature("变频器稳态驱动")
@allure.story("采集完整性")
@allure.tag("waveform", "warning")
@allure.title("采集中断：短通道触发长度告警（波形页顶部黄条）")
@allure.description("Vc 只采到一半样本。build_waveform_document 会写出 warnings，前端波形页顶部显示黄色告警条，并对缺失样本补 NaN（不补 0）。")
def test_partial_capture_emits_warning(attach_waveform):
    with allure.step("模拟 Vc 通道中途掉线（长度为期望的一半）"):
        groups = mock_steady_drive(n=N, fs=FS)
        groups["voltage"]["Vc"] = groups["voltage"]["Vc"][: N // 2]
        doc = build_waveform_document(sample_count=N, sampling_rate=FS, groups=groups)

    with allure.step("登记波形附件"):
        attach_waveform(doc)

    assert any(w["channel"] == "Vc" for w in doc["warnings"]), doc["warnings"]


@allure.epic("电机台架试验")
@allure.feature("冒烟")
@allure.story("无波形用例")
@allure.title("普通断言用例：不产生波形（详情底部无波形页）")
@allure.description("该用例不登记 waveform 附件，用于对照：Allure 报告详情底部不会出现波形分析页。")
def test_sanity_no_waveform():
    with allure.step("常规断言"):
        assert 2 + 2 == 4
