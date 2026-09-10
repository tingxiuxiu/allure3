import { fetchReportJsonData, themeStore, toggleUserTheme } from "@allurereport/web-commons";
import type { FunctionalComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { ReportTestResult } from "types";

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

/**
 * A waveform attachment is a JSON blob (the pytest teardown attaches it as
 * `waveform`). Match by attachment name so the native page can render it
 * instead of the sandboxed HTML preview that strips scripts.
 */
export const findWaveformAttachment = (testResult?: ReportTestResult): ResolvedLink | undefined => {
  const attachments = testResult?.attachments ?? [];
  for (const { link } of attachments) {
    const resolved = link as WaveformLink;
    if (resolved?.id === undefined || resolved.id === null || resolved.missed) {
      continue;
    }
    const label = resolved.name ?? resolved.originalFileName ?? "";
    const ext = resolved.ext ?? "";
    const isJson = /\.json$/i.test(ext) || resolved.contentType === "application/json";
    if (WAVEFORM_NAME.test(label) && (isJson || /\.json$/i.test(resolved.originalFileName ?? ""))) {
      return { id: resolved.id, ext };
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
