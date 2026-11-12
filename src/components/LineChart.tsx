import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  GestureResponderEvent,
  Dimensions,
} from 'react-native';
import Svg, {
  Path,
  Line,
  Rect,
  Text as SvgText,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useTransactions } from '../context/TransactionContext';
import { useTheme } from '../theme/ThemeContext';
import { Period } from '../types';
import { fmtYAxis, ymd, pad2 } from '../utils/formatters';

// ─── Date range helpers ───────────────────────────────────────────────────────

function bucketIndexToDates(
  idx: number,
  period: Period,
  now: Date
): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayYmd = ymd(now);

  if (period === 'day') {
    // Hour buckets → filter narrows to today only
    return { from: todayYmd, to: todayYmd };
  }

  if (period === 'week') {
    const start = new Date(y, m, now.getDate());
    const dow = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow);
    const d = new Date(start);
    d.setDate(d.getDate() + idx);
    const s = ymd(d);
    return { from: s, to: s };
  }

  if (period === 'month') {
    const startDay = idx * 7 + 1;
    const endDay = Math.min(startDay + 6, new Date(y, m + 1, 0).getDate());
    return {
      from: `${y}-${pad2(m + 1)}-${pad2(startDay)}`,
      to: `${y}-${pad2(m + 1)}-${pad2(endDay)}`,
    };
  }

  // year → month bucket
  const lastDay = new Date(y, idx + 1, 0).getDate();
  return {
    from: `${y}-${pad2(idx + 1)}-01`,
    to: `${y}-${pad2(idx + 1)}-${pad2(lastDay)}`,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const LineChart: React.FC = () => {
  const {
    period,
    setPeriod,
    periodData,
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    clearDates,
  } = useTransactions();
  const { theme } = useTheme();

  const [containerWidth, setContainerWidth] = useState(() =>
    Math.max(300, Math.floor(Dimensions.get('window').width - 32))
  );

  // Drag visual state (drives re-render for the overlay rect)
  const [selBox, setSelBox] = useState<{ x1: number; x2: number } | null>(null);

  // Mutable drag start X — only read/written in event handlers, never in render
  const dragStartXRef = useRef<number | null>(null);

  // Chart geometry — recomputed every render from latest containerWidth
  const chartHeight = 128;
  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const chartW = Math.max(10, containerWidth - padL - padR);
  const chartH = Math.max(10, chartHeight - padT - padB);

  const { buckets } = periodData;
  const nBuckets = buckets.length || 1;
  const maxVal = Math.max(1, ...buckets.map(b => Math.max(b.income, b.expense)));

  const xFor = (i: number) => padL + (chartW / nBuckets) * (i + 0.5);
  const yFor = (v: number) => padT + chartH * (1 - v / maxVal);

  const xToBucketIdx = useCallback(
    (px: number) => {
      const clamped = Math.max(padL, Math.min(containerWidth - padR, px));
      return Math.max(0, Math.min(nBuckets - 1, Math.floor(((clamped - padL) / chartW) * nBuckets)));
    },
    [padL, padR, chartW, nBuckets, containerWidth]
  );

  // ── Responder handlers (safe: .current only in handlers, never in render) ──

  const onGrant = useCallback((e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    dragStartXRef.current = x;
    setSelBox({ x1: x, x2: x });
  }, []);

  const onMove = useCallback((e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    setSelBox(prev => (prev ? { x1: prev.x1, x2: x } : { x1: x, x2: x }));
  }, []);

  const onRelease = useCallback(
    (e: GestureResponderEvent) => {
      const endX = e.nativeEvent.locationX;
      const startX = dragStartXRef.current ?? endX;
      dragStartXRef.current = null;

      const dragDist = Math.abs(endX - startX);

      if (dragDist <= 8) {
        // Short tap — clear the filter
        clearDates();
      } else {
        // Drag — apply date range
        const i0 = xToBucketIdx(Math.min(startX, endX));
        const i1 = xToBucketIdx(Math.max(startX, endX));
        const now = new Date();
        const r0 = bucketIndexToDates(i0, period, now);
        const r1 = bucketIndexToDates(i1, period, now);
        setFromDate(r0.from);
        setToDate(r1.to);
      }

      setSelBox(null);
    },
    [xToBucketIdx, period, setFromDate, setToDate, clearDates]
  );

  const onTerminate = useCallback(() => {
    dragStartXRef.current = null;
    setSelBox(null);
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && Math.abs(w - containerWidth) > 2) {
      setContainerWidth(w);
    }
  };

  // ── SVG paths ──────────────────────────────────────────────────────────────

  const buildPath = (values: number[]) => {
    if (!values.length) return '';
    return values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`)
      .join(' ');
  };

  const buildAreaPath = (values: number[]) => {
    if (!values.length) return '';
    const line = values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`)
      .join(' ');
    return `${line} L ${xFor(values.length - 1).toFixed(1)} ${(padT + chartH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;
  };

  const expenseValues = buckets.map(b => b.expense);
  const incomeValues = buckets.map(b => b.income);
  const expLinePath = buildPath(expenseValues);
  const expAreaPath = buildAreaPath(expenseValues);
  const incLinePath = buildPath(incomeValues);
  const incAreaPath = buildAreaPath(incomeValues);
  const dotR = nBuckets > 12 ? 1.8 : 2.5;

  const hasActiveFilter = !!(fromDate || toDate);

  // Compute persistent filter highlight region
  let filterHighlight: { rx: number; rw: number } | null = null;
  if (hasActiveFilter && !selBox) {
    const now = new Date();
    let first = -1;
    let last = -1;
    for (let i = 0; i < nBuckets; i++) {
      const r = bucketIndexToDates(i, period, now);
      if ((!fromDate || r.to >= fromDate) && (!toDate || r.from <= toDate)) {
        if (first === -1) first = i;
        last = i;
      }
    }
    if (first !== -1) {
      const rx = padL + (chartW / nBuckets) * first;
      const rw = (chartW / nBuckets) * (last - first + 1);
      filterHighlight = { rx, rw };
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      {/* Top row: period switcher + legend + clear filter */}
      <View style={styles.topRow}>
        <View style={[styles.segmented, { backgroundColor: theme.track }]}>
          {(['day', 'week', 'month', 'year'] as Period[]).map(p => {
            const active = period === p;
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.segBtn,
                  active && [styles.segBtnActive, { backgroundColor: theme.raised }],
                ]}
                onPress={() => {
                  setPeriod(p);
                  clearDates();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.segBtnText, { color: active ? theme.text : theme.muted }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Right side: legend dots */}
        <View style={styles.rightCluster}>
          <View style={styles.legendDots}>
            <View style={[styles.dot, { backgroundColor: theme.income }]} />
            <Text style={[styles.dotLabel, { color: theme.muted }]}>In</Text>
            <View style={[styles.dot, { backgroundColor: theme.expense }]} />
            <Text style={[styles.dotLabel, { color: theme.muted }]}>Out</Text>
          </View>
        </View>
      </View>

      {/* SVG chart — raw responder for drag filter */}
      <View
        onLayout={onLayout}
        style={styles.chartWrapper}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminate={onTerminate}
      >
        <Svg width={containerWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.income} stopOpacity="0.2" />
              <Stop offset="100%" stopColor={theme.income} stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.expense} stopOpacity="0.2" />
              <Stop offset="100%" stopColor={theme.expense} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Gridlines */}
          {[0.25, 0.5, 0.75].map((f, i) => (
            <Line
              key={`g${i}`}
              x1={padL} y1={Math.round(padT + chartH * f) + 0.5}
              x2={containerWidth - padR} y2={Math.round(padT + chartH * f) + 0.5}
              stroke={theme.line} strokeWidth={1}
            />
          ))}
          <Line x1={padL} y1={padT + chartH + 0.5} x2={containerWidth - padR} y2={padT + chartH + 0.5} stroke={theme.line} strokeWidth={1} />

          {/* Y labels */}
          <SvgText x={padL - 5} y={padT + 3} fill={theme.muted} fontSize={8.5} fontWeight="600" textAnchor="end">{fmtYAxis(maxVal)}</SvgText>
          <SvgText x={padL - 5} y={padT + chartH / 2 + 3} fill={theme.muted} fontSize={8.5} fontWeight="600" textAnchor="end">{fmtYAxis(maxVal / 2)}</SvgText>
          <SvgText x={padL - 5} y={padT + chartH - 1} fill={theme.muted} fontSize={8.5} fontWeight="600" textAnchor="end">0</SvgText>

          {/* Expense */}
          {expAreaPath ? <Path d={expAreaPath} fill="url(#expenseGrad)" /> : null}
          {expLinePath ? <Path d={expLinePath} stroke={theme.expense} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
          {expenseValues.map((v, i) => (
            <Circle key={`ed${i}`} cx={xFor(i)} cy={yFor(v)} r={dotR} fill={theme.card} stroke={theme.expense} strokeWidth={1.4} />
          ))}

          {/* Income */}
          {incAreaPath ? <Path d={incAreaPath} fill="url(#incomeGrad)" /> : null}
          {incLinePath ? <Path d={incLinePath} stroke={theme.income} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
          {incomeValues.map((v, i) => (
            <Circle key={`id${i}`} cx={xFor(i)} cy={yFor(v)} r={dotR} fill={theme.card} stroke={theme.income} strokeWidth={1.4} />
          ))}

          {/* X labels */}
          {buckets.map((b, i) =>
            b.label ? (
              <SvgText key={`xl${i}`} x={xFor(i)} y={padT + chartH + 16} fill={theme.muted} fontSize={9} fontWeight="600" textAnchor="middle">
                {b.label}
              </SvgText>
            ) : null
          )}

          {/* Active filter highlight (persistent) */}
          {filterHighlight && (
            <Rect
              x={filterHighlight.rx}
              y={padT}
              width={filterHighlight.rw}
              height={chartH}
              fill={theme.accent}
              fillOpacity={0.12}
              stroke={theme.accent}
              strokeOpacity={0.4}
              strokeWidth={1}
              rx={3}
            />
          )}

          {/* Live drag selection */}
          {selBox && selBox.x2 - selBox.x1 > 2 && (
            <Rect
              x={Math.min(selBox.x1, selBox.x2)}
              y={padT}
              width={Math.abs(selBox.x2 - selBox.x1)}
              height={chartH}
              fill={theme.accent}
              fillOpacity={0.18}
              rx={3}
            />
          )}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    paddingTop: 12,
    paddingHorizontal: 10,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  segmented: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 0,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  segBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  legendDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 0,
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginRight: 3,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrapper: {
    width: '100%',
  },
});
