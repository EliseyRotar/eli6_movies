import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEBUG_ERRORS_ENDPOINT } from './config';

export type LogLevel = 'error' | 'warn' | 'info';
export type LogSource = 'console' | 'react' | 'api' | 'unhandled' | 'manual';

export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  source: LogSource;
  screen?: string;
  message: string;
  stack?: string;
  extra?: Record<string, unknown>;
}

const STORAGE_KEY = 'eli6_debug_logs';
const MAX_ENTRIES = 200;

let buffer: LogEntry[] = [];
let installed = false;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;
let subscribed = 0;

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function stringifyError(err: unknown): string {
  if (err == null) return String(err);
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || err.name || 'Error';
  try {
    return JSON.stringify(err);
  } catch {
    return Object.prototype.toString.call(err);
  }
}

async function loadBuffer(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) buffer = JSON.parse(raw) as LogEntry[];
  } catch {
    buffer = [];
  }
}

async function persistBuffer(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-MAX_ENTRIES)));
  } catch {
    /* ignore */
  }
}

async function send(endpoint: string, entries: LogEntry[]): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: entries, device: { platform: 'android-tv' } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function flushPending(): Promise<boolean> {
  if (flushing) return false;
  flushing = true;
  try {
    if (!DEBUG_ERRORS_ENDPOINT || buffer.length === 0) return false;
    const unsent = buffer.filter(e => !e.extra?.sent);
    if (unsent.length === 0) return false;
    const ok = await send(DEBUG_ERRORS_ENDPOINT, unsent);
    if (ok) {
      const now = Date.now();
      buffer = buffer.map(e => {
        if (e.extra?.sent) return e;
        return { ...e, extra: { ...(e.extra ?? {}), sent: true, sentAt: now } };
      });
      await persistBuffer();
      return true;
    }
    return false;
  } finally {
    flushing = false;
  }
}

function startFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushPending().catch(() => {});
  }, 15_000);
}

function stopFlushTimer(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export async function initErrorReporter(): Promise<void> {
  if (installed) return;
  installed = true;
  await loadBuffer();
  startFlushTimer();
  if (DEBUG_ERRORS_ENDPOINT) flushPending().catch(() => {});
}

export function report(
  level: LogLevel,
  source: LogSource,
  message: string,
  opts: { screen?: string; stack?: string; extra?: Record<string, unknown> } = {},
): void {
  const entry: LogEntry = {
    id: genId(),
    ts: Date.now(),
    level,
    source,
    screen: opts.screen,
    message,
    stack: opts.stack,
    extra: opts.extra,
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer = buffer.slice(-MAX_ENTRIES);
  // fire and forget
  persistBuffer().catch(() => {});
  if (level === 'error') flushPending().catch(() => {});
}

export function getBuffer(): LogEntry[] {
  return [...buffer];
}

export async function clearBuffer(): Promise<void> {
  buffer = [];
  await persistBuffer();
}

export async function flushNow(): Promise<boolean> {
  return flushPending();
}

export function getEndpoint(): string {
  return DEBUG_ERRORS_ENDPOINT;
}

export function subscribe(listener: (entries: LogEntry[]) => void): () => void {
  subscribed += 1;
  listener(getBuffer());
  return () => {
    subscribed = Math.max(0, subscribed - 1);
    if (subscribed === 0) stopFlushTimer();
  };
}

// Wrap console.error/warn, install global error & unhandledrejection listeners.
export function installErrorLogging(): void {
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    origError('[app:error]', ...args);
    const first = args[0];
    if (first instanceof Error) {
      report('error', 'console', stringifyError(first), { stack: first.stack });
    } else {
      report('error', 'console', args.map(stringifyError).join(' '));
    }
  };

  console.warn = (...args: unknown[]) => {
    origWarn('[app:warn]', ...args);
    report('warn', 'console', args.map(stringifyError).join(' '));
  };

  const g = globalThis as unknown as {
    addEventListener?: (event: string, cb: (e: unknown) => void) => void;
    process?: { on?: (event: string, cb: (e: unknown) => void) => void };
  };

  if (typeof g.addEventListener === 'function') {
    g.addEventListener('unhandledrejection', event => {
      const reason = (event as { reason?: unknown })?.reason;
      origError('[app:unhandledrejection]', reason);
      const err = reason instanceof Error ? reason : undefined;
      report('error', 'unhandled', stringifyError(reason), { stack: err?.stack });
    });
    g.addEventListener('error', event => {
      const err = (event as { error?: unknown; message?: string })?.error ?? event;
      origError('[app:uncaught]', err);
      if (err instanceof Error) {
        report('error', 'unhandled', err.message, { stack: err.stack });
      } else {
        report('error', 'unhandled', stringifyError(err));
      }
    });
  } else if (g.process?.on) {
    g.process.on('unhandledRejection', (event: unknown) => {
      const reason = (event as { reason?: unknown })?.reason ?? event;
      origError('[app:unhandledrejection]', reason);
      const err = reason instanceof Error ? reason : undefined;
      report('error', 'unhandled', stringifyError(reason), { stack: err?.stack });
    });
    g.process.on('uncaughtException', (event: unknown) => {
      origError('[app:uncaught]', event);
      const err = event instanceof Error ? event : undefined;
      report('error', 'unhandled', err?.message ?? stringifyError(event), { stack: err?.stack });
    });
  }
}

// React error boundary hook — wrap your top-level component with this class.
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from './theme';

interface ErrorBoundaryProps {
  children: ReactNode;
  screen?: string;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[app:react-error] screen=${this.props.screen ?? 'unknown'}`, error, info.componentStack);
    report('error', 'react', error.message, {
      screen: this.props.screen,
      stack: `${error.stack ?? ''}\n${info.componentStack ?? ''}`,
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>{error.message}</Text>
      <ScrollView style={styles.stackScroll}>
        <Text style={styles.stack}>{error.stack}</Text>
      </ScrollView>
      <Text style={styles.hint} onPress={reset}>
        Press to retry
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xxl,
    justifyContent: 'center',
  },
  title: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textHi,
    fontSize: 18,
    marginBottom: spacing.lg,
  },
  stackScroll: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  stack: {
    color: '#FFB4B4',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  hint: {
    color: colors.textHi,
    fontSize: 18,
    fontWeight: '700',
    padding: spacing.lg,
    textAlign: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 8,
  },
});