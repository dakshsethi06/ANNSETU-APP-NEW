import { StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';

// Exact tokens from prototype theme.css
const PROTO = {
  primary: '#1E5C2E',
  background: '#F5F3EE',   // --background: warm beige
  foreground: '#1A2E1A',   // --foreground: title text
  card: '#ffffff',   // --card: input bg
  mutedFg: '#6B7B6B',   // --muted-foreground: subtitles, labels
  border: 'rgba(30, 92, 46, 0.12)', // --border
};

export default StyleSheet.create({
  // ── Full-screen wrapper ───────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: PROTO.primary,
  },

  // ── Top brand area ────────────────────────────────────────
  // Prototype: flex-1, pt-16, pb-8, px-6
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 32,
  },

  // Logo: w-20 h-20 rounded-3xl bg-white/15, mb-3
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 48,
    height: 48,
    tintColor: '#FFFFFF',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Brand text: text-3xl font-bold, mt-1 text-white/60
  brandName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.60)',
    textAlign: 'center',
    marginTop: 4,
  },

  // Lang toggle: bg-white/10 rounded-full p-1 mb-8
  langToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 999,
    padding: 4,
    marginTop: 32,
  },
  langButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  langButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  langText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.70)',
  },
  langTextActive: {
    color: PROTO.primary,
  },

  // ── Bottom form card ──────────────────────────────────────
  // Prototype: bg-background rounded-t-3xl px-6 pt-8 pb-10 (NO flex — wraps content)
  bottomSection: {
    backgroundColor: PROTO.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },

  // Title: text-xl font-bold text-foreground mb-1
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PROTO.foreground,
    marginBottom: 4,
  },
  // Subtitle: text-sm text-muted-foreground mb-6
  subtitle: {
    fontSize: 14,
    color: PROTO.mutedFg,
    marginBottom: 24,
  },
  // Label: text-xs font-semibold uppercase tracking-wider mb-2
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: PROTO.mutedFg,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  // Input row: border border-border rounded-xl px-4 py-3.5 bg-card mb-5
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PROTO.card,
    borderWidth: 1,
    borderColor: PROTO.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 20,
  },
  inputPrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: PROTO.foreground,
  },
  inputDivider: {
    width: 1,
    height: 20,
    backgroundColor: PROTO.border,
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: PROTO.foreground,
  },

  // Button: rounded-xl py-4 font-semibold, disabled:opacity-50
  primaryButton: {
    backgroundColor: PROTO.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonActive: {
    backgroundColor: PROTO.primary,
    opacity: 1,
  },
  primaryButtonDisabled: {
    opacity: 0.50,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Secure note: mt-5 mb-6
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  secureNoteText: {
    fontSize: 12,
    color: PROTO.mutedFg,
    marginLeft: 8,
  },

  // OR divider: no extra margins (the secureNote mb + createAccount mt handle spacing)
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PROTO.border,
  },
  dividerText: {
    fontSize: 12,
    color: PROTO.mutedFg,
    marginHorizontal: 8,
  },

  // Create account row: mt-5
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  createAccountText: {
    fontSize: 14,
    color: PROTO.mutedFg,
  },
  createAccountLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PROTO.primary,
    textDecorationLine: 'underline',
    marginLeft: 6,
  },

  // ── Stepper Header (Register / OTP screens) ─────────────
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 12,
    backgroundColor: PROTO.primary,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBrandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerBrandText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 24,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.70)',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
});