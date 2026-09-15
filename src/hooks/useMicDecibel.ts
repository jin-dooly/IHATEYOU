import { useCallback, useEffect, useRef, useState } from "react";

// 실제 dB SPL 측정은 아니고, 마이크 입력의 RMS 진폭(dBFS)을 0~100 점수로
// 정규화한 "체감 크기" 값이다. 조용함(-100dBFS 근처) ~ 최대 입력(0dBFS)을
// 0~100 으로 매핑 — 육성으로 지르면 대략 60~100 사이가 나오도록 캘리브레이션.
const NOISE_FLOOR_DB = -50;
const MAX_DB = 0;

function rmsToScore(rms: number) {
  const db = rms > 0 ? 20 * Math.log10(rms) : NOISE_FLOOR_DB;
  const clamped = Math.max(NOISE_FLOOR_DB, Math.min(MAX_DB, db));
  return Math.round(
    ((clamped - NOISE_FLOOR_DB) / (MAX_DB - NOISE_FLOOR_DB)) * 100,
  );
}

export function useMicDecibel() {
  const [decibel, setDecibel] = useState(0);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // 진행 중인 측정을 즉시 중단(정리)한다 — 값은 버림. 모드 전환/언마운트용.
  const cancel = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  // durationMs 동안 마이크 입력을 실시간으로 측정하고(중간 값은 decibel 로
  // 노출), 그 구간의 최고치를 반환한다. 권한 거부/미지원이면 null.
  const measure = useCallback(
    (durationMs: number): Promise<number | null> => {
      cancel();
      return new Promise((resolve) => {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("이 브라우저는 마이크를 지원하지 않아요");
          resolve(null);
          return;
        }

        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            setError(null);
            const AudioCtx =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            const data = new Float32Array(analyser.fftSize);

            let peak = 0;
            let raf = 0;
            setListening(true);

            const tick = () => {
              analyser.getFloatTimeDomainData(data);
              let sumSq = 0;
              for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
              const rms = Math.sqrt(sumSq / data.length);
              const score = rmsToScore(rms);
              setDecibel(score);
              if (score > peak) peak = score;
              raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);

            const cleanup = () => {
              cancelAnimationFrame(raf);
              source.disconnect();
              stream.getTracks().forEach((t) => t.stop());
              void ctx.close();
              setListening(false);
              setDecibel(0);
            };
            stopRef.current = cleanup;

            window.setTimeout(() => {
              cleanup();
              stopRef.current = null;
              resolve(peak);
            }, durationMs);
          })
          .catch(() => {
            setError("마이크 권한이 필요해요");
            resolve(null);
          });
      });
    },
    [cancel],
  );

  return { decibel, listening, error, measure, cancel };
}
