/**
 * @file ContactsScreen.js
 * @description State-of-the-art emergency contacts hub for Silent SOS.
 * Features comprehensive CRUD, debounced real-time search, relationship categorization,
 * field-level validation, SOS prioritization, and full offline persistence.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, Linking, KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useContacts, RELATIONSHIP_OPTIONS } from '../../hooks/useContacts';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import {
  Card, SectionHeader, Badge, Divider,
  SearchInput, Chip, EmptyState
} from '../../components/UIElements';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/theme';
import { formatPhoneDisplay, sanitizePhoneNumber } from '../../utils/contactValidation';

export default function ContactsScreen() {
  const {
    contacts,
    filteredContacts,
    sosContacts,
    otherContacts,
    stats,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    modalVisible,
    editingContact,
    formData,
    setFormData,
    formErrors,
    isSubmitting,
    openModal,
    closeModal,
    saveContact,
    deleteContact,
    toggleSOS,
    setPrimary,
  } = useContacts();

  // Quick direct call confirmation for safety
  const handleCall = (contact) => {
    const rawDigits = sanitizePhoneNumber(contact.phone);
    if (!rawDigits) {
      Alert.alert('Invalid Number', 'This contact does not have a dialable phone number.');
      return;
    }

    Alert.alert(
      'Place Phone Call',
      `Call ${contact.name} (${contact.phone})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => {
            Linking.openURL(`tel:${rawDigits}`).catch(() => {
              Alert.alert('Cannot Call', `Unable to open dialer for ${contact.phone}.`);
            });
          },
        },
      ]
    );
  };

  // Direct SMS action
  const handleSMS = (contact) => {
    const rawDigits = sanitizePhoneNumber(contact.phone);
    if (!rawDigits) return;
    Linking.openURL(`sms:${rawDigits}`).catch(() => {
      Alert.alert('Cannot Message', `Unable to open SMS app for ${contact.phone}.`);
    });
  };

  const handleToggleSOSWithHaptic = (contactId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleSOS(contactId);
  };

  // ─── Contact Card Subcomponent ─────────────────────────────
  const ContactCard = ({ contact }) => {
    const relOption = RELATIONSHIP_OPTIONS.find(r => r.id === contact.relationship) || RELATIONSHIP_OPTIONS[1];

    return (
      <View style={styles.contactCard}>
        {/* Avatar with initial & relationship badge */}
        <View style={styles.avatarContainer}>
          <View style={[
            styles.contactAvatar,
            contact.selectedForSOS && styles.contactAvatarArmed,
            contact.isPrimary && styles.contactAvatarPrimary,
          ]}>
            <Text style={styles.contactInitial}>
              {(contact.name || 'C').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.avatarRelBadge}>
            <Text style={styles.avatarRelText}>{relOption.icon}</Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.contactInfo}>
          <View style={styles.contactNameRow}>
            <Text style={styles.contactName} numberOfLines={1}>
              {contact.name}
            </Text>
            {contact.isPrimary && (
              <Badge label="Primary" color={COLORS.warning} icon="⭐" />
            )}
            {contact.selectedForSOS && !contact.isPrimary && (
              <Badge label="SOS" color={COLORS.safe} icon="🟢" />
            )}
          </View>

          <Text style={styles.contactPhone}>
            {formatPhoneDisplay(contact.phone)}
          </Text>

          {contact.email ? (
            <Text style={styles.contactEmail} numberOfLines={1}>
              ✉️ {contact.email}
            </Text>
          ) : null}

          {contact.notes ? (
            <Text style={styles.contactNotes} numberOfLines={1}>
              📝 {contact.notes}
            </Text>
          ) : null}
        </View>

        {/* Action Controls */}
        <View style={styles.contactActions}>
          <TouchableOpacity
            style={[styles.actionBtn, contact.selectedForSOS && styles.actionBtnActive]}
            onPress={() => handleToggleSOSWithHaptic(contact.id)}
            accessibilityLabel={`${contact.selectedForSOS ? 'Disarm' : 'Arm'} ${contact.name} for SOS`}
            accessibilityRole="switch"
            accessibilityState={{ checked: Boolean(contact.selectedForSOS) }}
          >
            <Text style={styles.actionIcon}>
              {contact.selectedForSOS ? '🛡️' : '⭕'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleCall(contact)}
            accessibilityLabel={`Call ${contact.name}`}
          >
            <Text style={styles.actionIcon}>📞</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(contact)}
            accessibilityLabel={`Edit ${contact.name}`}
          >
            <Text style={styles.actionIcon}>✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => deleteContact(contact)}
            accessibilityLabel={`Delete ${contact.name}`}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1, COLORS.bg2]} style={StyleSheet.absoluteFillObject} />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Trusted Circle</Text>
          <Text style={styles.headerSubtitle}>
            {stats.sosCount} of {stats.total} armed for emergency alerts
          </Text>
        </View>
        <Button
          title="+ Add"
          onPress={() => openModal()}
          size="sm"
          variant="primary"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Warning if no contacts are armed for SOS */}
        {stats.hasNoSosWarning && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>No Emergency Contacts Armed</Text>
              <Text style={styles.warningSubtitle}>
                In an emergency, no one will receive your alert. Tap ⭕ on any contact below to arm them.
              </Text>
            </View>
          </View>
        )}

        {/* Global Search Bar */}
        {contacts.length > 0 && (
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, phone, or relationship…"
          />
        )}

        {/* Relationship / SOS Filter Chips */}
        {contacts.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterRowContent}
          >
            <Chip
              label={`All (${contacts.length})`}
              active={selectedFilter === 'all'}
              onPress={() => setSelectedFilter('all')}
            />
            <Chip
              label={`Armed (${stats.sosCount})`}
              icon="🛡️"
              color={COLORS.safe}
              active={selectedFilter === 'sos'}
              onPress={() => setSelectedFilter('sos')}
            />
            {RELATIONSHIP_OPTIONS.map(opt => {
              const count = contacts.filter(c => (c.relationship || 'Friend') === opt.id).length;
              if (count === 0 && selectedFilter !== opt.id) return null;
              return (
                <Chip
                  key={opt.id}
                  label={`${opt.label} (${count})`}
                  icon={opt.icon}
                  active={selectedFilter === opt.id}
                  onPress={() => setSelectedFilter(selectedFilter === opt.id ? 'all' : opt.id)}
                />
              );
            })}
          </ScrollView>
        )}

        {/* Empty States */}
        {contacts.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Build Your Trusted Circle"
            message="Add people you trust who should receive silent alerts and your live GPS coordinates during an emergency."
            actionButton={
              <Button
                title="+ Add First Emergency Contact"
                onPress={() => openModal()}
                size="md"
              />
            }
          />
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No Matching Contacts"
            message={`No contacts match your query "${searchQuery}". Check the spelling or clear the filter.`}
            actionButton={
              <Button
                title="Clear Search Filter"
                onPress={() => { setSearchQuery(''); setSelectedFilter('all'); }}
                variant="secondary"
                size="sm"
              />
            }
          />
        ) : (
          <>
            {/* Armed SOS Contacts Section */}
            {sosContacts.length > 0 && (
              <>
                <SectionHeader
                  title="🚨 Armed Emergency Contacts"
                  subtitle="These trusted contacts will receive your alert & location immediately"
                />
                <Card style={{ padding: 0 }}>
                  {sosContacts.map((c, i) => (
                    <View key={c.id}>
                      <ContactCard contact={c} />
                      {i < sosContacts.length - 1 && (
                        <Divider style={{ marginHorizontal: SPACING.base }} />
                      )}
                    </View>
                  ))}
                </Card>
              </>
            )}

            {/* Other Contacts Section */}
            {otherContacts.length > 0 && (
              <>
                <SectionHeader
                  title="👥 Other Contacts"
                  subtitle="Tap the shield or circle icon to arm for emergency alerts"
                />
                <Card style={{ padding: 0 }}>
                  {otherContacts.map((c, i) => (
                    <View key={c.id}>
                      <ContactCard contact={c} />
                      {i < otherContacts.length - 1 && (
                        <Divider style={{ marginHorizontal: SPACING.base }} />
                      )}
                    </View>
                  ))}
                </Card>
              </>
            )}

            {/* Guidance Note */}
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>
                💡 <Text style={{ fontWeight: 'bold' }}>Safety Tip:</Text> Only contacts marked with the{' '}
                <Text style={{ color: COLORS.safeLight }}>SOS</Text> badge will receive emergency SMS broadcasts.
                You can designate a <Text style={{ color: COLORS.warningLight }}>Primary Contact</Text> who will be alerted first.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* ─── Add / Edit Contact Modal ───────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modal}
        >
          <LinearGradient colors={[COLORS.bg1, COLORS.bg2]} style={StyleSheet.absoluteFillObject} />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {editingContact ? 'Edit Contact' : 'New Emergency Contact'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {editingContact ? 'Update trusted person details' : 'Add someone you trust completely'}
              </Text>
            </View>
            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn} accessibilityLabel="Close modal">
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Full Name */}
            <Input
              label="Full Name *"
              placeholder="e.g. Alex Morgan"
              value={formData.name}
              onChangeText={v => {
                setFormData(p => ({ ...p, name: v }));
                if (formErrors.name) setFormErrors(p => ({ ...p, name: null }));
              }}
              error={formErrors.name}
            />

            {/* Phone Number */}
            <Input
              label="Phone Number (SMS & Calls) *"
              placeholder="+1 (555) 234-5678"
              value={formData.phone}
              onChangeText={v => {
                setFormData(p => ({ ...p, phone: v }));
                if (formErrors.phone) setFormErrors(p => ({ ...p, phone: null }));
              }}
              keyboardType="phone-pad"
              hint="Include country code (e.g. +1, +44, +91) for reliable dispatch"
              error={formErrors.phone}
            />

            {/* Relationship Category Selector */}
            <Text style={styles.formSectionLabel}>RELATIONSHIP CATEGORY</Text>
            <View style={styles.relationshipGrid}>
              {RELATIONSHIP_OPTIONS.map(opt => {
                const isSelected = formData.relationship === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.relOption, isSelected && styles.relOptionSelected]}
                    onPress={() => setFormData(p => ({ ...p, relationship: opt.id }))}
                  >
                    <Text style={styles.relIcon}>{opt.icon}</Text>
                    <Text style={[styles.relLabel, isSelected && styles.relLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Email (Optional) */}
            <Input
              label="Email Address (Optional)"
              placeholder="alex@example.com"
              value={formData.email}
              onChangeText={v => {
                setFormData(p => ({ ...p, email: v }));
                if (formErrors.email) setFormErrors(p => ({ ...p, email: null }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={formErrors.email}
            />

            {/* Discreet Notes */}
            <Input
              label="Discreet Notes / Context (Optional)"
              placeholder="e.g., Lives 5 mins away, has spare key to back door"
              value={formData.notes}
              onChangeText={v => setFormData(p => ({ ...p, notes: v }))}
              multiline
              numberOfLines={2}
            />

            {/* Switches: Arm for SOS & Primary Contact */}
            <Card style={styles.switchesCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchTitle}>Arm for Emergency SOS</Text>
                  <Text style={styles.switchSubtitle}>
                    Include this contact when emergency SOS triggers
                  </Text>
                </View>
                <Switch
                  value={formData.selectedForSOS}
                  onValueChange={v => setFormData(p => ({ ...p, selectedForSOS: v }))}
                  trackColor={{ false: COLORS.border, true: COLORS.safe }}
                  thumbColor={COLORS.white}
                />
              </View>

              <Divider style={{ marginVertical: SPACING.sm }} />

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchTitle}>⭐ Set as Primary Contact</Text>
                  <Text style={styles.switchSubtitle}>
                    Designate as first priority contact to call or alert
                  </Text>
                </View>
                <Switch
                  value={formData.isPrimary}
                  onValueChange={v => setFormData(p => ({
                    ...p,
                    isPrimary: v,
                    // If marked as primary, ensure they are also selected for SOS
                    selectedForSOS: v ? true : p.selectedForSOS,
                  }))}
                  trackColor={{ false: COLORS.border, true: COLORS.warning }}
                  thumbColor={COLORS.white}
                />
              </View>
            </Card>

            {/* Action Buttons */}
            <Button
              title={editingContact ? 'Save Changes' : 'Create Contact'}
              onPress={saveContact}
              size="lg"
              loading={isSubmitting}
              style={{ marginTop: SPACING.lg }}
            />

            {editingContact && (
              <Button
                title="Delete Contact"
                onPress={() => deleteContact(editingContact)}
                variant="danger"
                size="md"
                style={{ marginTop: SPACING.md }}
              />
            )}

            <Button
              title="Cancel"
              onPress={closeModal}
              variant="ghost"
              size="md"
              style={{ marginTop: SPACING.sm }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 48,
    paddingTop: SPACING.md,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningDim,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.warning + '66',
    marginBottom: SPACING.md,
  },
  warningIcon: {
    fontSize: 26,
    marginRight: SPACING.md,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.warningLight,
    marginBottom: 2,
  },
  warningSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  filterRow: {
    marginBottom: SPACING.base,
  },
  filterRowContent: {
    gap: SPACING.xs,
  },
  // Contact Card
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bg3,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarArmed: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.safe,
  },
  contactAvatarPrimary: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningDim,
  },
  contactInitial: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  avatarRelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarRelText: {
    fontSize: 11,
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  contactName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
  },
  contactPhone: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: TYPOGRAPHY.fontFamily.mono || 'System',
  },
  contactEmail: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  contactNotes: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.primaryLight,
    marginTop: 2,
    fontStyle: 'italic',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  actionBtnActive: {
    backgroundColor: COLORS.safeDim,
  },
  actionIcon: {
    fontSize: 18,
  },
  infoNote: {
    backgroundColor: COLORS.bg3,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoNoteText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    lineHeight: 20,
  },
  // Modal Styles
  modal: {
    flex: 1,
    backgroundColor: COLORS.bg1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  modalContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: 64,
  },
  formSectionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  relationshipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  relOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 6,
  },
  relOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  relIcon: {
    fontSize: 14,
  },
  relLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  relLabelSelected: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  switchesCard: {
    padding: SPACING.base,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchTextContainer: {
    flex: 1,
    marginRight: SPACING.base,
  },
  switchTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
  },
  switchSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
