import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Card, Badge, SectionHeader } from '../../components/UIElements';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';
import { FALLBACK_RESOURCES, REGIONS, RESOURCE_TYPE_LABELS } from '../../constants/resources';
import { fetchSupportResources } from '../../services/aiService';

export default function SupportScreen() {
  const { settings } = useApp();
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(settings?.selectedRegion || 'US');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    loadResources(selectedRegion);
  }, [selectedRegion]);

  const loadResources = async (region) => {
    // First load fallback instantly
    setResources(FALLBACK_RESOURCES[region] || FALLBACK_RESOURCES.US);
    setAiLoaded(false);
    setLoading(true);

    try {
      const aiResources = await fetchSupportResources(region);
      if (aiResources && aiResources.length > 0) {
        setResources(aiResources);
        setAiLoaded(true);
      }
    } catch {
      // Keep fallback
    } finally {
      setLoading(false);
    }
  };

  const currentRegion = REGIONS.find(r => r.code === selectedRegion);
  const filteredResources = selectedFilter === 'all'
    ? resources
    : resources?.filter(r => r.type === selectedFilter);

  const allTypes = ['all', ...new Set(resources?.map(r => r.type) || [])];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1]} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Support</Text>
          <Text style={styles.headerSubtitle}>Verified resources for your region</Text>
        </View>
        {loading && (
          <View style={styles.aiLoading}>
            <ActivityIndicator color={COLORS.primary} size="small" />
            <Text style={styles.aiLoadingText}>AI</Text>
          </View>
        )}
        {aiLoaded && (
          <View style={styles.aiTag}>
            <Text style={styles.aiTagText}>✨ AI-enhanced</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Emergency header */}
        <View style={styles.emergencyBanner}>
          <Text style={styles.emergencyTitle}>🚨 Immediate danger?</Text>
          <Text style={styles.emergencyText}>Call your local emergency services directly.</Text>
          <View style={styles.emergencyRow}>
            {[{ label: 'USA: 911', num: '911' }, { label: 'EU: 112', num: '112' }, { label: 'UK: 999', num: '999' }].map(e => (
              <TouchableOpacity
                key={e.num}
                style={styles.emergencyBtn}
                onPress={() => Linking.openURL(`tel:${e.num}`)}
                accessibilityLabel={`Call ${e.label}`}
              >
                <Text style={styles.emergencyBtnText}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Region selector */}
        <SectionHeader title="Select Region" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionRow}>
          {REGIONS.map(r => (
            <TouchableOpacity
              key={r.code}
              style={[styles.regionChip, selectedRegion === r.code && styles.regionChipActive]}
              onPress={() => setSelectedRegion(r.code)}
              accessibilityLabel={`Select ${r.label} region`}
            >
              <Text style={styles.regionFlag}>{r.flag}</Text>
              <Text style={[styles.regionLabel, selectedRegion === r.code && styles.regionLabelActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {allTypes.map(type => {
            const info = RESOURCE_TYPE_LABELS[type];
            const isActive = selectedFilter === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: (info?.color || COLORS.primary) + '22', borderColor: info?.color || COLORS.primary }
                ]}
                onPress={() => setSelectedFilter(type)}
                accessibilityLabel={`Filter by ${type}`}
              >
                <Text style={[styles.filterText, isActive && { color: info?.color || COLORS.primary }]}>
                  {type === 'all' ? 'All' : info?.label || type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Resources list */}
        <SectionHeader
          title={`${currentRegion?.flag} ${currentRegion?.label}`}
          subtitle={`${filteredResources?.length || 0} resources available`}
        />

        {filteredResources?.map((resource, idx) => (
          <ResourceCard key={idx} resource={resource} />
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️  Resource information is provided as a guide only. Always verify contact details independently. In immediate danger, call emergency services.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ResourceCard({ resource }) {
  const typeInfo = RESOURCE_TYPE_LABELS[resource.type] || { label: resource.type, color: COLORS.primary };

  const handleCall = () => {
    const phone = resource.phone.replace(/[^0-9+]/g, '');
    if (phone.length > 4) {
      Linking.openURL(`tel:${phone}`).catch(() =>
        Alert.alert('Cannot call', `Please dial ${resource.phone} manually.`)
      );
    }
  };

  return (
    <Card style={styles.resourceCard}>
      <View style={styles.resourceHeader}>
        <Text style={styles.resourceName}>{resource.name}</Text>
        <Badge label={typeInfo.label} color={typeInfo.color} />
      </View>
      <Text style={styles.resourceDesc}>{resource.description}</Text>
      <TouchableOpacity style={styles.phoneBtn} onPress={handleCall} accessibilityLabel={`Call ${resource.name}: ${resource.phone}`}>
        <Text style={styles.phoneIcon}>📞</Text>
        <Text style={styles.phoneNumber}>{resource.phone}</Text>
      </TouchableOpacity>
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
  headerTitle: { fontSize: TYPOGRAPHY.size.xxl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text },
  headerSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, marginTop: 2 },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiLoadingText: { color: COLORS.primary, fontSize: TYPOGRAPHY.size.xs },
  aiTag: {
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  aiTagText: { color: COLORS.primaryLight, fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.semibold },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
  emergencyBanner: {
    backgroundColor: COLORS.dangerDim,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.danger + '44',
  },
  emergencyTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.dangerLight, marginBottom: 4 },
  emergencyText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },
  emergencyRow: { flexDirection: 'row', gap: SPACING.sm },
  emergencyBtn: {
    flex: 1, backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md, padding: SPACING.sm,
    alignItems: 'center',
  },
  emergencyBtnText: { color: COLORS.white, fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold },
  regionRow: { marginBottom: SPACING.base },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  regionChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  regionFlag: { fontSize: 18 },
  regionLabel: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.weight.medium },
  regionLabelActive: { color: COLORS.primaryLight },
  filterRow: { marginBottom: SPACING.base },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium },
  resourceCard: { marginBottom: SPACING.md },
  resourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  resourceName: { flex: 1, fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text, marginRight: SPACING.sm },
  resourceDesc: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  phoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  phoneIcon: { fontSize: 16 },
  phoneNumber: { fontSize: TYPOGRAPHY.size.base, color: COLORS.primaryLight, fontWeight: TYPOGRAPHY.weight.semibold },
  disclaimer: {
    backgroundColor: COLORS.bg3,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    marginTop: SPACING.lg,
  },
  disclaimerText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.size.xs, lineHeight: 18, textAlign: 'center' },
});
