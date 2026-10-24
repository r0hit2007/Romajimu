/**
 * @file SupportScreen.js
 * @description Crisis support & emergency resources directory for Silent SOS.
 * Features region switching, real-time search, multi-action dispatch (Call, SMS, Chat),
 * AI-assisted directory refreshes, persistent offline caching, skeleton loading,
 * and quick-disguise safety escape hatch.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { useSupportResources } from '../../hooks/useSupportResources';
import { Card, Badge, SectionHeader, SearchInput, Chip, SkeletonCard, EmptyState } from '../../components/UIElements';
import { Button } from '../../components/Button';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/theme';
import { REGIONS, RESOURCE_TYPE_LABELS } from '../../constants/resources';

export default function SupportScreen() {
  const navigation = useNavigation();
  const {
    selectedRegion,
    setSelectedRegion,
    selectedFilter,
    setSelectedFilter,
    searchQuery,
    setSearchQuery,
    filteredResources,
    availableTypes,
    currentRegionInfo,
    loading,
    isRefreshing,
    isAIGenerated,
    fromCache,
    error,
    refresh,
  } = useSupportResources();

  // Quick Disguise Escape Hatch for safety
  const handleQuickDisguise = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    try {
      navigation.navigate('Calculator');
    } catch {
      Alert.alert('Decoy Mode', 'Screen disguised. Safe to leave open.');
    }
  };

  const handleCallEmergency = (number) => {
    Alert.alert(
      'Emergency Services',
      `Directly call emergency services (${number})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${number}`).catch(() => {
              Alert.alert('Cannot Call', `Please dial ${number} manually.`);
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1, COLORS.bg2]} style={StyleSheet.absoluteFillObject} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Crisis Support</Text>
          <Text style={styles.headerSubtitle}>
            {isAIGenerated
              ? (fromCache ? '✨ AI-Enhanced Directory (Cached)' : '✨ AI-Enhanced Directory (Live)')
              : '🛡️ Verified Offline Database'}
          </Text>
        </View>

        {/* Quick Disguise Safety Escape Button */}
        <TouchableOpacity
          style={styles.disguiseBtn}
          onPress={handleQuickDisguise}
          accessibilityLabel="Quick disguise as calculator"
        >
          <Text style={styles.disguiseText}>🎭 Disguise</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Immediate Danger Urgent Header ─────────────────── */}
        <View style={styles.emergencyBanner}>
          <View style={styles.emergencyHeaderRow}>
            <Text style={styles.emergencyTitle}>🚨 In Immediate Danger?</Text>
            <Badge label="Priority" color={COLORS.danger} />
          </View>
          <Text style={styles.emergencyText}>
            If you are in danger right now, call emergency services immediately.
          </Text>

          <View style={styles.emergencyRow}>
            {/* Primary local emergency number based on region */}
            <TouchableOpacity
              style={[styles.emergencyBtn, styles.emergencyBtnPrimary]}
              onPress={() => handleCallEmergency(currentRegionInfo?.emergency || '911')}
              accessibilityLabel={`Call local emergency ${currentRegionInfo?.emergency || '911'}`}
            >
              <Text style={styles.emergencyBtnPrimaryText}>
                📞 {currentRegionInfo?.emergencyLabel || `Call ${currentRegionInfo?.emergency || '911'}`}
              </Text>
            </TouchableOpacity>

            {/* Quick alternate numbers */}
            {['112', '911', '999'].filter(n => n !== currentRegionInfo?.emergency).slice(0, 2).map(num => (
              <TouchableOpacity
                key={num}
                style={styles.emergencyBtnAlt}
                onPress={() => handleCallEmergency(num)}
                accessibilityLabel={`Call ${num}`}
              >
                <Text style={styles.emergencyBtnAltText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Region Selector ────────────────────────────────── */}
        <SectionHeader
          title="Select Region"
          rightElement={
            <TouchableOpacity
              onPress={refresh}
              disabled={loading || isRefreshing}
              style={styles.refreshBtn}
              accessibilityLabel="Refresh directory from AI"
            >
              <Text style={styles.refreshText}>
                {isRefreshing ? '↻ Refreshing…' : '↻ Refresh AI'}
              </Text>
            </TouchableOpacity>
          }
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.regionRow}
          contentContainerStyle={{ gap: SPACING.xs }}
        >
          {REGIONS.map(r => (
            <Chip
              key={r.code}
              label={r.label}
              icon={r.flag}
              active={selectedRegion === r.code}
              onPress={() => setSelectedRegion(r.code)}
            />
          ))}
        </ScrollView>

        {/* ─── Instant Search Input ───────────────────────────── */}
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search hotlines, shelters, legal aid, languages…"
        />

        {/* ─── Service Category Filter Chips ──────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ gap: SPACING.xs }}
        >
          {availableTypes.map(type => {
            const info = RESOURCE_TYPE_LABELS[type] || { label: type, icon: '🏷️', color: COLORS.primary };
            return (
              <Chip
                key={type}
                label={info.label}
                icon={info.icon}
                color={info.color}
                active={selectedFilter === type}
                onPress={() => setSelectedFilter(type)}
              />
            );
          })}
        </ScrollView>

        {/* Status / Error Toast if any */}
        {error && (
          <View style={styles.errorNotice}>
            <Text style={styles.errorNoticeText}>ℹ️ {error}</Text>
          </View>
        )}

        {/* Section Title with count */}
        <SectionHeader
          title={`${currentRegionInfo?.flag} ${currentRegionInfo?.label}`}
          subtitle={`${filteredResources?.length || 0} verified services available`}
        />

        {/* ─── Resource Cards or Loading Skeleton ─────────────── */}
        {loading && !isRefreshing ? (
          <>
            <SkeletonCard height={140} />
            <SkeletonCard height={140} />
            <SkeletonCard height={140} />
          </>
        ) : filteredResources.length === 0 ? (
          <EmptyState
            icon="🔎"
            title="No Resources Found"
            message={`No verified crisis services matched "${searchQuery}" in ${currentRegionInfo?.label}.`}
            actionButton={
              <Button
                title="Reset Search & Filters"
                onPress={() => { setSearchQuery(''); setSelectedFilter('all'); }}
                size="sm"
                variant="secondary"
              />
            }
          />
        ) : (
          filteredResources.map((resource, idx) => (
            <ResourceCard key={`${resource.name}-${idx}`} resource={resource} />
          ))
        )}

        {/* Safety Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerHeading}>🛡️ Browsing Safety Reminder</Text>
          <Text style={styles.disclaimerText}>
            If you are concerned about someone monitoring your phone, remember that your phone call history
            may retain dialed numbers. Consider using a safe phone or deleting recent calls from your dialer log.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Modern Resource Card with multiple dispatch actions.
 */
function ResourceCard({ resource }) {
  const typeInfo = RESOURCE_TYPE_LABELS[resource.type] || {
    label: resource.type,
    color: COLORS.primary,
    icon: '📞',
  };

  const handleCall = () => {
    const phoneDigits = (resource.phone || '').replace(/[^0-9+]/g, '');
    if (phoneDigits.length > 2) {
      Linking.openURL(`tel:${phoneDigits}`).catch(() => {
        Alert.alert('Cannot Call', `Please dial ${resource.phone} manually.`);
      });
    }
  };

  const handleSMS = () => {
    if (!resource.sms) return;
    const body = resource.smsKeyword ? `?body=${encodeURIComponent(resource.smsKeyword)}` : '';
    const url = Platform.OS === 'ios'
      ? `sms:${resource.sms}&body=${encodeURIComponent(resource.smsKeyword || '')}`
      : `sms:${resource.sms}${body}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Cannot Text', `Please text ${resource.smsKeyword || 'HELP'} to ${resource.sms}.`);
    });
  };

  const handleWebsite = () => {
    if (!resource.website) return;
    Alert.alert(
      'Open External Website',
      `You are navigating to ${resource.website}. Make sure your browsing is safe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Safely',
          onPress: () => Linking.openURL(resource.website),
        },
      ]
    );
  };

  return (
    <Card style={styles.resourceCard}>
      {/* Header Row */}
      <View style={styles.resourceHeader}>
        <View style={{ flex: 1, marginRight: SPACING.sm }}>
          <Text style={styles.resourceName}>{resource.name}</Text>
          <View style={styles.badgeRow}>
            <Badge label={typeInfo.label} color={typeInfo.color} icon={typeInfo.icon} />
            {resource.is24_7 && (
              <Badge label="24/7" color={COLORS.safe} icon="🕒" />
            )}
          </View>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.resourceDesc}>{resource.description}</Text>

      {/* Languages if provided */}
      {resource.languages && resource.languages.length > 0 && (
        <Text style={styles.languagesText}>
          🌐 {resource.languages.join(' • ')}
        </Text>
      )}

      {/* Action Buttons Row */}
      <View style={styles.resourceActionGrid}>
        {/* Call Button */}
        {resource.phone ? (
          <TouchableOpacity
            style={styles.actionCallBtn}
            onPress={handleCall}
            accessibilityLabel={`Call ${resource.name} at ${resource.phone}`}
          >
            <Text style={styles.actionCallIcon}>📞</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCallLabel}>Call Hotline</Text>
              <Text style={styles.actionCallNum} numberOfLines={1}>{resource.phone}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* SMS / Text Button */}
        {resource.sms ? (
          <TouchableOpacity
            style={styles.actionSmsBtn}
            onPress={handleSMS}
            accessibilityLabel={`Text ${resource.sms}`}
          >
            <Text style={styles.actionSmsIcon}>📱</Text>
            <Text style={styles.actionSmsLabel}>
              Text {resource.smsKeyword || resource.sms}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Website Button */}
        {resource.website ? (
          <TouchableOpacity
            style={styles.actionWebBtn}
            onPress={handleWebsite}
            accessibilityLabel={`Visit website for ${resource.name}`}
          >
            <Text style={styles.actionWebIcon}>🌐</Text>
            <Text style={styles.actionWebLabel}>Website</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.primaryLight,
    marginTop: 2,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  disguiseBtn: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disguiseText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  scroll: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 48,
    paddingTop: SPACING.sm,
  },
  // Emergency Banner
  emergencyBanner: {
    backgroundColor: COLORS.dangerDim,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.danger + '66',
    ...SHADOWS.md,
  },
  emergencyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  emergencyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.dangerLight,
  },
  emergencyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  emergencyRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  emergencyBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBtnPrimary: {
    flex: 2,
    backgroundColor: COLORS.danger,
  },
  emergencyBtnPrimaryText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  emergencyBtnAlt: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emergencyBtnAltText: {
    color: COLORS.dangerLight,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  regionRow: {
    marginBottom: SPACING.sm,
  },
  refreshBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  refreshText: {
    color: COLORS.primaryLight,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  filterRow: {
    marginBottom: SPACING.base,
  },
  errorNotice: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorNoticeText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.size.xs,
  },
  // Resource Card
  resourceCard: {
    marginBottom: SPACING.base,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  resourceHeader: {
    marginBottom: SPACING.sm,
  },
  resourceName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  resourceDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  languagesText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  resourceActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  actionCallBtn: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    gap: SPACING.sm,
  },
  actionCallIcon: {
    fontSize: 18,
  },
  actionCallLabel: {
    fontSize: 10,
    color: COLORS.primaryLight,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  actionCallNum: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  actionSmsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.safeDim,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.safe + '44',
    gap: SPACING.xs,
  },
  actionSmsIcon: {
    fontSize: 14,
  },
  actionSmsLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.safeLight,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  actionWebBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  actionWebIcon: {
    fontSize: 13,
  },
  actionWebLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  disclaimer: {
    backgroundColor: COLORS.bg3,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disclaimerHeading: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  disclaimerText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.size.xs,
    lineHeight: 18,
  },
});
