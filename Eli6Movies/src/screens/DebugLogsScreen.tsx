import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../theme';
import {
  clearBuffer,
  flushNow,
  getBuffer,
  getEndpoint,
  LogEntry,
  LogLevel,
} from '../logging';
import { FocusableCard } from '../components/FocusableCard';

type Filter = 'all' | LogLevel;

const LEVEL_COLOR: Record<LogLevel, string> = {
  error: colors.accent,
  warn: '#F5A623',
  info: '#5DADE2',
};

const SOURCE_LABEL: Record<string, string> = {
  console: 'CONSOLE',
  react: 'REACT',
  api: 'API',
  unhandled: 'UNHANDLED',
  manual: 'MANUAL',
};

export function DebugLogsScreen({ onBack }: { onBack?: () => void } = {}) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string>('');
  const endpoint = getEndpoint();

  const refresh = useCallback(() => {
    setEntries(getBuffer().slice().reverse());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFlush = async () => {
    if (!endpoint) {
      setStatus('No endpoint configured');
      return;
    }
    setStatus('Sending…');
    const ok = await flushNow();
    setStatus(ok ? `Sent at ${new Date().toLocaleTimeString()}` : 'Send failed');
    refresh();
  };

  const handleClear = async () => {
    await clearBuffer();
    setExpanded({});
    refresh();
  };

  const toggleExpanded = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.level === filter);
  const counts = {
    error: entries.filter(e => e.level === 'error').length,
    warn: entries.filter(e => e.level === 'warn').length,
    info: entries.filter(e => e.level === 'info').length,
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <FocusableCard
            onPress={onBack}
            scale={1.04}
            cornerRadius={radius.sm}
            raise={false}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </FocusableCard>
        )}
        <Text style={styles.title}>Debug Logs</Text>
        <Text style={styles.subtitle}>
          {entries.length === 0
            ? 'No errors yet'
            : `${entries.length} total · ${counts.error} err · ${counts.warn} warn`}
        </Text>
        <Text style={styles.endpoint}>
          {endpoint ? `→ ${endpoint}` : '⚠ No endpoint set (DEBUG_ERRORS_ENDPOINT)'}
        </Text>
      </View>

      <View style={styles.toolbar}>
        <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip
          label={`Errors (${counts.error})`}
          active={filter === 'error'}
          onPress={() => setFilter('error')}
          color={LEVEL_COLOR.error}
        />
        <FilterChip
          label={`Warnings (${counts.warn})`}
          active={filter === 'warn'}
          onPress={() => setFilter('warn')}
          color={LEVEL_COLOR.warn}
        />
        <View style={styles.spacer} />
        <FocusableCard
          onPress={handleFlush}
          scale={1.04}
          cornerRadius={radius.sm}
          raise={false}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>Flush</Text>
        </FocusableCard>
        <FocusableCard
          onPress={handleClear}
          scale={1.04}
          cornerRadius={radius.sm}
          raise={false}
          style={[styles.actionBtn, styles.actionBtnDanger]}
        >
          <Text style={styles.actionBtnText}>Clear</Text>
        </FocusableCard>
      </View>

      {status !== '' && <Text style={styles.status}>{status}</Text>}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No log entries match this filter.</Text>
        ) : (
          filtered.map(entry => (
            <LogRow
              key={entry.id}
              entry={entry}
              isExpanded={!!expanded[entry.id]}
              onToggle={() => toggleExpanded(entry.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <FocusableCard
      onPress={onPress}
      scale={1.04}
      cornerRadius={999}
      raise={false}
      style={[styles.chip, active && (color ? { borderColor: color, backgroundColor: `${color}33` } : styles.chipActive)]}
    >
      <Text
        style={[
          styles.chipText,
          active && color ? { color } : null,
          active && !color ? { color: colors.textHi } : null,
        ]}
      >
        {label}
      </Text>
    </FocusableCard>
  );
}

function LogRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const time = new Date(entry.ts).toLocaleTimeString();
  const sent = entry.extra?.sent === true;
  return (
    <FocusableCard
      onPress={onToggle}
      scale={1.01}
      cornerRadius={radius.sm}
      raise={false}
      style={styles.row}
    >
      <View style={styles.rowHeader}>
        <View style={[styles.levelDot, { backgroundColor: LEVEL_COLOR[entry.level] }]} />
        <Text style={styles.rowTime}>{time}</Text>
        <Text style={styles.rowSource}>[{SOURCE_LABEL[entry.source] ?? entry.source}]</Text>
        {entry.screen && <Text style={styles.rowScreen}>@{entry.screen}</Text>}
        {sent && <Text style={styles.sentBadge}>SENT</Text>}
      </View>
      <Text style={styles.rowMessage} numberOfLines={isExpanded ? undefined : 3}>
        {entry.message}
      </Text>
      {isExpanded && entry.stack && (
        <ScrollView style={styles.stackBox}>
          <Text style={styles.stackText}>{entry.stack}</Text>
        </ScrollView>
      )}
      {isExpanded && entry.extra && (
        <View style={styles.extraBox}>
          <Text style={styles.extraLabel}>EXTRA</Text>
          <Text style={styles.extraText}>{JSON.stringify(entry.extra, null, 2)}</Text>
        </View>
      )}
    </FocusableCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.textHi,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  backBtnText: {
    color: colors.textHi,
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMid,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  endpoint: {
    color: colors.textLo,
    fontSize: 13,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 999,
  },
  chipActive: {
    borderColor: colors.textHi,
    backgroundColor: colors.surface2,
  },
  chipText: {
    color: colors.textMid,
    fontSize: 14,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  actionBtnDanger: {
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderColor: colors.accent,
  },
  actionBtnText: {
    color: colors.textHi,
    fontSize: 15,
    fontWeight: '700',
  },
  status: {
    color: colors.textMid,
    fontSize: 14,
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  empty: {
    color: colors.textMid,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  row: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowTime: {
    color: colors.textMid,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  rowSource: {
    color: colors.textMid,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  rowScreen: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  sentBadge: {
    color: '#46D369',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#46D369',
    borderRadius: 4,
    marginLeft: 'auto',
  },
  rowMessage: {
    color: colors.textHi,
    fontSize: 15,
    lineHeight: 21,
  },
  stackBox: {
    marginTop: spacing.sm,
    backgroundColor: '#000',
    padding: spacing.sm,
    borderRadius: 4,
    maxHeight: 240,
  },
  stackText: {
    color: '#FFB4B4',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  extraBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
    borderRadius: 4,
  },
  extraLabel: {
    color: colors.textMid,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  extraText: {
    color: colors.textHi,
    fontFamily: 'monospace',
    fontSize: 11,
  },
});