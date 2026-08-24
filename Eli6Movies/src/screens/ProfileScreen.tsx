import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, isLoggedIn, user } from '../api';
import { UserProfile } from '../types';
import { colors, radius, spacing } from '../theme';
import { FocusableCard } from '../components/FocusableCard';

export function ProfileScreen({ onOpenDebug }: { onOpenDebug?: () => void } = {}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await isLoggedIn();
      setLoggedIn(ok);
      if (ok) {
        try {
          setProfile(await user.profile());
        } catch {
          setProfile(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const p =
        mode === 'login'
          ? await auth.login(email.trim(), password)
          : await auth.register(username.trim(), email.trim(), password);
      setProfile(p);
      setLoggedIn(true);
    } catch {
      setError('Authentication failed. Check your details.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await auth.logout();
    setProfile(null);
    setLoggedIn(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  if (loggedIn && profile) {
    return (
      <View style={styles.profile}>
        <Text style={styles.heading}>Profile</Text>
        <View style={styles.card}>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          {profile.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminText}>ADMIN</Text>
            </View>
          )}
        </View>
        <FocusableCard onPress={logout} scale={1.06}>
          <View style={[styles.btn, styles.btnSecondary]}>
            <Text style={[styles.btnText, styles.btnTextSecondary]}>Sign out</Text>
          </View>
        </FocusableCard>
        {profile.role === 'admin' && (
          <FocusableCard
            onPress={() => onOpenDebug?.()}
            scale={1.04}
          >
            <View style={[styles.btn, styles.btnDebug]}>
              <Text style={styles.btnText}>Debug Logs</Text>
            </View>
          </FocusableCard>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.formScroll} contentContainerStyle={styles.form}>
      <Text style={styles.heading}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
      {mode === 'register' && (
        <Field label="Username" value={username} onChange={setUsername} />
      )}
      <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" />
      <Field label="Password" value={password} onChange={setPassword} secure />
      {error && <Text style={styles.error}>{error}</Text>}
      <FocusableCard onPress={submit} scale={1.06}>
        <View style={[styles.btn, styles.btnPrimary]}>
          <Text style={[styles.btnText, styles.btnTextPrimary]}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Text>
        </View>
      </FocusableCard>
      <FocusableCard onPress={() => setMode(mode === 'login' ? 'register' : 'login')} scale={1.04}>
        <View style={styles.switchWrap}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'No account? Create one' : 'Already have an account? Sign in'}
          </Text>
        </View>
      </FocusableCard>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  secure = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={secure ? 'none' : 'sentences'}
        placeholderTextColor={colors.textLo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    color: colors.textMid,
    fontSize: 16,
  },
  heading: {
    color: colors.textHi,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  profile: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  username: {
    color: colors.textHi,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  email: {
    color: colors.textMid,
    fontSize: 16,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  adminText: {
    color: colors.textHi,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  formScroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  form: {
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
    maxWidth: 500,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textMid,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textHi,
    fontSize: 17,
  },
  error: {
    color: colors.red,
    fontSize: 14,
  },
  btn: {
    paddingHorizontal: spacing.xl + 4,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnSecondary: {
    backgroundColor: 'rgba(109,109,123,0.7)',
  },
  btnDebug: {
    backgroundColor: 'rgba(245,166,35,0.15)',
    borderWidth: 1.5,
    borderColor: '#F5A623',
  },
  btnText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnTextPrimary: {
    color: colors.textHi,
  },
  btnTextSecondary: {
    color: colors.textHi,
  },
  switchWrap: {
    paddingVertical: spacing.sm,
  },
  switchText: {
    color: colors.textMid,
    fontSize: 14,
    fontWeight: '600',
  },
});