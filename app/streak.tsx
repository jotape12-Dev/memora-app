import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { useReviewStore } from "../stores/reviewStore";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function calcLongestStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (Math.round(diff) === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export default function StreakScreen() {
  const colors = useThemeColors();
  const { streak, activeDays, calculateStreak } = useReviewStore();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    calculateStreak();
  }, [calculateStreak]);

  const activeSet = new Set(activeDays);
  const todayStr = toDateString(now.getFullYear(), now.getMonth(), now.getDate());
  const longestStreak = calcLongestStreak(activeDays);
  const totalDays = activeDays.length;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstWeekday(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    const today = new Date();
    if (viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth >= today.getMonth())) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const isNextDisabled =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth >= now.getMonth());

  // Build grid cells: null for empty leading cells, number for day
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sequência</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Streak hero */}
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.flameIcon}>🔥</Text>
          <Text style={[styles.streakNumber, { color: colors.text }]}>{streak}</Text>
          <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
            {streak === 1 ? "dia seguido" : "dias seguidos"}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="trophy" size={20} color="#f59e0b" />
            <Text style={[styles.statNumber, { color: colors.text }]}>{longestStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>recorde</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalDays}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>dias totais</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Month navigation */}
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} hitSlop={8} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={8} style={styles.navBtn} disabled={isNextDisabled}>
              <Ionicons name="chevron-forward" size={20} color={isNextDisabled ? colors.border : colors.text} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={[styles.weekday, { color: colors.textSecondary }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.cell} />;
              }
              const dateStr = toDateString(viewYear, viewMonth, day);
              const isActive = activeSet.has(dateStr);
              const isToday = dateStr === todayStr;

              return (
                <View key={dateStr} style={styles.cell}>
                  <View
                    style={[
                      styles.dayCircle,
                      isActive && { backgroundColor: colors.primary },
                      isToday && !isActive && { borderWidth: 1.5, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isActive ? "#fff" : isToday ? colors.primary : colors.text },
                        isToday && { fontWeight: "700" },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Dia com revisão</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  hero: {
    alignItems: "center",
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4,
  },
  flameIcon: { fontSize: 48, lineHeight: 56 },
  streakNumber: { fontSize: 64, fontWeight: "800", lineHeight: 72 },
  streakLabel: { fontSize: 16 },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statNumber: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 16, fontWeight: "700" },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 13 },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    justifyContent: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: { fontSize: 12 },
});
