import { StyleSheet } from 'react-native';

const PROTO = {
  primary:          '#1E5C2E',
  background:       '#F5F3EE',
  foreground:       '#1A2E1A',
  card:             '#ffffff',
  mutedFg:          '#6B7B6B',
  border:           'rgba(30, 92, 46, 0.12)',
  secondary:        '#EAF2EB',
};

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PROTO.background,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: PROTO.secondary,
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
        backgroundColor: PROTO.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        padding: 6,
    },
    headerBrandText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: PROTO.foreground,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: PROTO.foreground,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: PROTO.mutedFg,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 24,
        gap: 12,
    },
    otpInput: {
        width: 48,
        height: 56,
        backgroundColor: PROTO.card,
        borderWidth: 2,
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
    },
    otpInputActive: {
        borderColor: PROTO.primary,
        color: PROTO.primary,
    },
    otpInputInactive: {
        borderColor: PROTO.border,
        color: PROTO.foreground,
    },
    primaryButton: {
        borderRadius: 12,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonActive: {
        backgroundColor: PROTO.primary,
    },
    buttonDisabled: {
        backgroundColor: PROTO.primary,
        opacity: 0.5,
    },
    buttonVerified: {
        backgroundColor: '#10B981',
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    resendText: {
        fontSize: 14,
        color: PROTO.mutedFg,
    },
    resendLink: {
        fontSize: 14,
        fontWeight: '500',
        color: PROTO.primary,
        marginLeft: 4,
    },
});
