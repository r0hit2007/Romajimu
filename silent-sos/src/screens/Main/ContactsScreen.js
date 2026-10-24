import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card, SectionHeader, Badge, Divider } from '../../components/UIElements';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';

export default function ContactsScreen() {
  const { settings, addContact, updateContact, deleteContact, toggleContactSOS } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [formError, setFormError] = useState('');

  const openModal = (contact = null) => {
    setEditingContact(contact);
    setForm(contact ? { name: contact.name, phone: contact.phone, email: contact.email || '' } : { name: '', phone: '', email: '' });
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError('Name and phone number are required.');
      return;
    }
    if (editingContact) {
      await updateContact(editingContact.id, form);
    } else {
      await addContact({ ...form, selectedForSOS: true });
    }
    setModalVisible(false);
  };

  const handleDelete = (contact) => {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.name} from your trusted contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteContact(contact.id),
        },
      ]
    );
  };

  const sosContacts = settings.contacts.filter(c => c.selectedForSOS);
  const otherContacts = settings.contacts.filter(c => !c.selectedForSOS);

  const ContactCard = ({ contact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactAvatar}>
        <Text style={styles.contactInitial}>
          {contact.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.contactNameRow}>
          <Text style={styles.contactName}>{contact.name}</Text>
          {contact.selectedForSOS && <Badge label="SOS" color={COLORS.safe} />}
        </View>
        <Text style={styles.contactPhone}>{contact.phone}</Text>
        {contact.email ? <Text style={styles.contactEmail}>{contact.email}</Text> : null}
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => toggleContactSOS(contact.id)}
          accessibilityLabel={`${contact.selectedForSOS ? 'Remove from' : 'Add to'} SOS contacts`}
        >
          <Text style={styles.actionIcon}>{contact.selectedForSOS ? '🟢' : '⭕'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openModal(contact)}
          accessibilityLabel="Edit contact"
        >
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(contact)}
          accessibilityLabel="Delete contact"
        >
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1]} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Contacts</Text>
          <Text style={styles.headerSubtitle}>{sosContacts.length} active SOS contact{sosContacts.length !== 1 ? 's' : ''}</Text>
        </View>
        <Button title="+ Add" onPress={() => openModal()} size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {settings.contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No trusted contacts yet</Text>
            <Text style={styles.emptyDesc}>
              Add people who should receive your SOS alert. They'll get your message and location when you trigger an SOS.
            </Text>
            <Button title="Add First Contact" onPress={() => openModal()} size="md" style={{ marginTop: SPACING.xl }} />
          </View>
        ) : (
          <>
            {sosContacts.length > 0 && (
              <>
                <SectionHeader title="SOS Contacts" subtitle="These people will receive your alert" />
                <Card style={{ padding: 0 }}>
                  {sosContacts.map((c, i) => (
                    <View key={c.id}>
                      <ContactCard contact={c} />
                      {i < sosContacts.length - 1 && <Divider style={{ marginHorizontal: SPACING.base }} />}
                    </View>
                  ))}
                </Card>
              </>
            )}

            {otherContacts.length > 0 && (
              <>
                <SectionHeader title="Other Contacts" subtitle="Tap the circle to add to SOS" />
                <Card style={{ padding: 0 }}>
                  {otherContacts.map((c, i) => (
                    <View key={c.id}>
                      <ContactCard contact={c} />
                      {i < otherContacts.length - 1 && <Divider style={{ marginHorizontal: SPACING.base }} />}
                    </View>
                  ))}
                </Card>
              </>
            )}

            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>
                🟢 Tap the circle to toggle SOS status for a contact. Only contacts marked with the SOS badge will receive alerts.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <LinearGradient colors={[COLORS.bg1, COLORS.bg2]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingContact ? 'Edit Contact' : 'Add Trusted Contact'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {formError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️  {formError}</Text>
              </View>
            ) : null}

            <Input
              label="Full Name *"
              placeholder="Jane Smith"
              value={form.name}
              onChangeText={v => setForm(p => ({ ...p, name: v }))}
            />
            <Input
              label="Phone Number *"
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChangeText={v => setForm(p => ({ ...p, phone: v }))}
              keyboardType="phone-pad"
              hint="This number will receive your SOS text message"
            />
            <Input
              label="Email (optional)"
              placeholder="jane@example.com"
              value={form.email}
              onChangeText={v => setForm(p => ({ ...p, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Button title="Save Contact" onPress={handleSave} size="lg" style={{ marginTop: SPACING.base }} />
            <Button title="Cancel" onPress={() => setModalVisible(false)} variant="ghost" size="md" style={{ marginTop: SPACING.sm }} />
          </ScrollView>
        </View>
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
  headerTitle: { fontSize: TYPOGRAPHY.size.xxl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text },
  headerSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, marginTop: 2 },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1, borderColor: COLORS.primary + '44',
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  contactInitial: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primaryLight },
  contactInfo: { flex: 1 },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  contactName: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text },
  contactPhone: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, marginTop: 2 },
  contactEmail: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.textMuted, marginTop: 1 },
  contactActions: { flexDirection: 'row', gap: SPACING.xs },
  actionBtn: { padding: SPACING.sm },
  actionIcon: { fontSize: 18 },
  emptyState: { alignItems: 'center', paddingTop: SPACING.section },
  emptyIcon: { fontSize: 64, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text, marginBottom: SPACING.md },
  emptyDesc: { fontSize: TYPOGRAPHY.size.base, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  infoNote: {
    backgroundColor: COLORS.bg3,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    marginTop: SPACING.xl,
  },
  infoNoteText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.size.sm, lineHeight: 20 },
  // Modal
  modal: { flex: 1, backgroundColor: COLORS.bg1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text },
  modalClose: { fontSize: TYPOGRAPHY.size.xl, color: COLORS.textSecondary, padding: SPACING.sm },
  modalContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: 40 },
  errorBanner: {
    backgroundColor: COLORS.dangerDim,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.danger + '44',
  },
  errorText: { color: COLORS.dangerLight, fontSize: TYPOGRAPHY.size.sm },
});
