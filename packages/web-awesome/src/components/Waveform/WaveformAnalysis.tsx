import { fetchReportJsonData, themeStore, toggleUserTheme } from "@allurereport/web-commons";
import type { FunctionalComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { ReportTestResult, ReportTestStepResult } from "types";

import { WaveformPage } from "./layout/WaveformPage";
import { normalizeWaveform } from "./waveform/normalize";
import { useWaveformStore } from "./waveform/store";
import type { WaveformJson } from "./waveform/types";

import "./waveform.css";

type WaveformLink = {
  id?: string | null;
  ext?: string;
  name?: string;
  originalFileName?: string;
  contentType?: string;
  missed?: boolean;
};

type ResolvedLink = { id: string; ext: string };

const WAVEFORM_NAME = /waveform/i;

const isJsonLink = (link: WaveformLink): boolean =>
  /\.json$/i.test(link.ext ?? "") ||
  link.contentType === "application/json" ||
  /\.json$/i.test(link.originalFileName ?? "");

const matchWaveformLink = (link: WaveformLink | undefined): ResolvedLink | undefined => {
  if (!link || link.id === undefined || link.id === null || link.missed) {
    return undefined;
  }
  const label = link.name ?? link.originalFileName ?? "";
  if (!WAVEFORM_NAME.test(label) || !isJsonLink(link)) {
    return undefined;
  }
  return { id: link.id, ext: link.ext ?? "" };
};

/**
 * Recursively look for a matching waveform attachment across a step tree. Steps
 * come both from the flat body `attachments` list (all `type: "attachment"`) and
 * from setup/teardown fixtures, where an attachment may be nested inside steps.
 */
const findWaveformInSteps = (steps: readonly ReportTestStepResult[] | undefined): ResolvedLink | undefined => {
  for (const step of steps ?? []) {
    const found =
      step.type === "attachment" ? matchWaveformLink(step.link as WaveformLink) : findWaveformInSteps(step.steps);
    if (found) {
      return found;
    }
  }
  return undefined;
};

/**
 * A waveform attachment is a JSON blob named `waveform`. It may be registered in
 * the test body, or added late in a teardown (or setup) fixture — users often
 * only produce the data at the very end. Check the body first, then teardown
 * fixtures, then setup fixtures, so the native page renders in every case.
 */
export const findWaveformAttachment = (testResult?: ReportTestResult): ResolvedLink | undefined => {
  if (!testResult) {
    return undefined;
  }
  const fromBody = findWaveformInSteps(testResult.attachments);
  if (fromBody) {
    return fromBody;
  }
  for (const fixture of testResult.teardown ?? []) {
    const fromTeardown = findWaveformInSteps(fixture.steps);
    if (fromTeardown) {
      return fromTeardown;
    }
  }
  for (const fixture of testResult.setup ?? []) {
    const fromSetup = findWaveformInSteps(fixture.steps);
    if (fromSetup) {
      return fromSetup;
    }
  }
  return undefined;
};

const isWaveformJson = (value: unknown): value is WaveformJson =>
  typeof value === "object" && value !== null && typeof (value as WaveformJson).sampleCount === "number";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; json: WaveformJson };

export const WaveformAnalysis: FunctionalComponent<{ testResult?: ReportTestResult }> = ({ testResult }) => {
  const link = findWaveformAttachment(testResult);
  const src = link ? `data/attachments/${link.id}${link.ext ?? ""}` : undefined;
  const scheme = themeStore.value.current === "dark" ? "dark" : "light";
  const setScheme = useWaveformStore((s) => s.setScheme);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    setScheme(scheme);
  }, [scheme, setScheme]);

  useEffect(() => {
    if (!src) {
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    fetchReportJsonData<WaveformJson>(src)
      .then((json) => {
        if (cancelled) {
          return;
        }
        if (isWaveformJson(json)) {
          setState({ status: "ready", json });
        } else {
          setState({ status: "error", message: "附件不是有效的波形 JSON" });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const normalized = useMemo(() => (state.status === "ready" ? normalizeWaveform(state.json) : null), [state]);

  if (!src) {
    return null;
  }

  return (
    <div className="waveform-embed" data-theme={scheme}>
      {state.status === "loading" ? <div className="waveform-embed-status">正在准备波形…</div> : null}
      {state.status === "error" ? (
        <div className="waveform-embed-status waveform-embed-error">无法加载波形：{state.message}</div>
      ) : null}
      {normalized ? <WaveformPage data={normalized} onToggleTheme={toggleUserTheme} /> : null}
    </div>
  );
};
