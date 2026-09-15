import { useMemo } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import { BackButton } from "../components/common/BackButton";
import { CharacterFigure } from "../components/character/CharacterFigure";
import { MetricCard } from "../components/stats/MetricCard";
import { HitHistoryChart } from "../components/stats/HitHistoryChart";
import { StatMeterRow } from "../components/stats/StatMeterRow";
import { STAT_ICONS } from "../components/stats/statIcons";
import { hairRemainingPercent, type AttackType } from "../types/character";
import { getHairStyle } from "../constants/hairStyles";
import {
  computeStreakDays,
  countByAttackType,
  countHitsOn,
  lastNDaysHitCounts,
} from "../utils/hitStats";
import { daysSince, formatDate, formatRelativeTime } from "../utils/dateUtils";
import styles from "./CharacterStats.module.scss";

const ATTACK_LABELS: Record<AttackType, string> = {
  slingshot: "새총",
  hair: "머리카락 뽑기",
  mic: "소리지르기",
};

const ATTACK_COLORS: Record<AttackType, string> = {
  slingshot: "#ff5a5a",
  hair: "#b8895a",
  mic: "#7c6bd6",
};

const ATTACK_TYPES: AttackType[] = ["slingshot", "hair", "mic"];

export default function CharacterStats() {
  const { id } = useParams<{ id: string }>();
  const character = useCharacterStore((s) =>
    id ? s.characters[id] : undefined,
  );
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!character) return null;
    const now = new Date();
    const hitLog = character.hitLog;
    const byType = countByAttackType(hitLog);
    const totalHits = character.stats.totalHits;
    const typeEntries = ATTACK_TYPES.map((type) => ({
      type,
      count: byType[type],
      pct: totalHits > 0 ? Math.round((byType[type] / totalHits) * 100) : 0,
    }));
    const hairStrandCount = getHairStyle(character.config.hair.styleId).strands
      .length;
    return {
      hairPct: hairRemainingPercent(character, hairStrandCount),
      todayHits: countHitsOn(hitLog, now),
      streakDays: computeStreakDays(hitLog, now),
      daysTogether: daysSince(character.createdAt, now),
      daily: lastNDaysHitCounts(hitLog, 7, now),
      typeEntries,
    };
  }, [character]);

  if (!id || !character || !stats) return <Navigate to="/characters" replace />;

  const bubbles = [...character.speechBubbles].reverse();

  return (
    <div className={"page " + styles.statsPage}>
      <header className="header">
        <BackButton onClick={() => navigate(`/characters/${id}/room`)} />
        <h1>통계</h1>
      </header>

      <div className={styles.innerPage}>
        <div className={styles.intro}>
          <CharacterFigure {...character.config} size={88} />
          <span className={styles.name}>{character.name}</span>
          <span className={styles.since}>
            {formatDate(character.createdAt)}부터 괴롭힌 지 {stats.daysTogether}
            일째
          </span>
        </div>

        <div className={styles.summary}>
          <p>지금까지 총 타격한 횟수에요</p>
          <div>
            <span>{character.stats.totalHits}</span>
            <span>회</span>
          </div>
          {character.stats.totalHits !== 0 && (
            <>
              <div className={styles.breakdownBar}>
                {stats.typeEntries.map((e) => (
                  <div
                    key={e.type}
                    style={{
                      width: `${e.pct}%`,
                      background: ATTACK_COLORS[e.type],
                    }}
                  />
                ))}
              </div>
              <div className={styles.legend}>
                {stats.typeEntries.map((e) => (
                  <div key={e.type} className={styles.legendItem}>
                    <span
                      className={styles.dot}
                      style={{ background: ATTACK_COLORS[e.type] }}
                    />
                    {ATTACK_LABELS[e.type]} {e.count}회 ({e.pct}%)
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.metricGrid}>
          <MetricCard label="오늘 타격" value={`${stats.todayHits}회`} />
          <MetricCard label="연속 방문" value={`${stats.streakDays}일`} />
          <MetricCard
            label="마지막 타격"
            value={
              character.stats.lastHitAt
                ? formatRelativeTime(character.stats.lastHitAt)
                : "-"
            }
          />
        </div>
        <section className={styles.section}>
          <h2>현재 상태</h2>
          <div className={styles.statList}>
            <StatMeterRow
              icon={STAT_ICONS.heart}
              label="HP"
              value={Math.round(character.stats.currentHp)}
              color={ATTACK_COLORS.slingshot}
            />
            <StatMeterRow
              icon={STAT_ICONS.ear}
              label="청력"
              value={Math.round(character.stats.currentHearing)}
              color={ATTACK_COLORS.mic}
            />
            <StatMeterRow
              icon={STAT_ICONS.hair}
              label="머리카락"
              value={stats.hairPct}
              color={ATTACK_COLORS.hair}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2>최근 7일</h2>
          <HitHistoryChart data={stats.daily} />
        </section>

        <section className={styles.section}>
          <h2>그 사람이 했던 말</h2>
          {bubbles.length === 0 ? (
            <p className={styles.empty}>아직 등록한 말이 없어요</p>
          ) : (
            <div className={styles.quoteList}>
              {bubbles.map((b) => (
                <div key={b.id} className={styles.quoteRow}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9e9e9e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <div className={styles.quoteBody}>
                    <span className={styles.quoteText}>
                      &ldquo;{b.text}&rdquo;
                    </span>
                    <span className={styles.quoteTime}>
                      {formatRelativeTime(b.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
