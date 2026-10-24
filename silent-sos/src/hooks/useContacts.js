/**
 * @file useContacts.js
 * @description Custom React hook managing Contacts CRUD operations, instant search,
 * categorization filters, validation, and SOS prioritization.
 */

import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { validateContactForm, sanitizePhoneNumber } from '../utils/contactValidation';
import { useDebounce } from './useDebounce';

/**
 * Initial state for contact modal form.
 */
const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  relationship: 'Friend',
  notes: '',
  selectedForSOS: true,
  isPrimary: false,
};

export const RELATIONSHIP_OPTIONS = [
  { id: 'Family', label: 'Family', icon: '👨‍👩‍👧' },
  { id: 'Friend', label: 'Friend', icon: '🤝' },
  { id: 'Partner', label: 'Partner', icon: '❤️' },
  { id: 'Neighbor', label: 'Neighbor', icon: '🏡' },
  { id: 'Coworker', label: 'Work', icon: '💼' },
  { id: 'Other', label: 'Other', icon: '👤' },
];

export const useContacts = () => {
  const { settings, addContact: contextAdd, updateContact: contextUpdate, deleteContact: contextDelete, toggleContactSOS: contextToggle } = useApp();

  const contacts = useMemo(() => Array.isArray(settings?.contacts) ? settings.contacts : [], [settings?.contacts]);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'sos' | 'family' | 'friend' | etc.
  const debouncedSearch = useDebounce(searchQuery, 200);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Filtered Contacts Computation ─────────────────────────
  const filteredContacts = useMemo(() => {
    let list = contacts;

    // Apply Relationship/Category Filter
    if (selectedFilter === 'sos') {
      list = list.filter(c => c.selectedForSOS);
    } else if (selectedFilter !== 'all') {
      list = list.filter(c => (c.relationship || 'Friend').toLowerCase() === selectedFilter.toLowerCase());
    }

    // Apply Search Query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      const qDigits = q.replace(/[^0-9]/g, '');

      list = list.filter(c => {
        const nameMatch = c.name?.toLowerCase().includes(q);
        const emailMatch = c.email?.toLowerCase().includes(q);
        const relMatch = c.relationship?.toLowerCase().includes(q);

        let phoneMatch = false;
        if (qDigits && c.phone) {
          const cleanPhone = sanitizePhoneNumber(c.phone);
          phoneMatch = cleanPhone.includes(qDigits);
        } else if (c.phone) {
          phoneMatch = c.phone.toLowerCase().includes(q);
        }

        return nameMatch || emailMatch || phoneMatch || relMatch;
      });
    }

    // Sort: Primary contact first, then SOS-selected, then alphabetical
    return [...list].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      if (a.selectedForSOS && !b.selectedForSOS) return -1;
      if (!a.selectedForSOS && b.selectedForSOS) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [contacts, selectedFilter, debouncedSearch]);

  const sosContacts = useMemo(() => filteredContacts.filter(c => c.selectedForSOS), [filteredContacts]);
  const otherContacts = useMemo(() => filteredContacts.filter(c => !c.selectedForSOS), [filteredContacts]);

  // Statistics
  const stats = useMemo(() => {
    const total = contacts.length;
    const sosCount = contacts.filter(c => c.selectedForSOS).length;
    return {
      total,
      sosCount,
      hasNoSosWarning: total > 0 && sosCount === 0,
    };
  }, [contacts]);

  // ─── Modal Handlers ─────────────────────────────────────────

  const openModal = useCallback((contactToEdit = null) => {
    if (contactToEdit) {
      setEditingContact(contactToEdit);
      setFormData({
        name: contactToEdit.name || '',
        phone: contactToEdit.phone || '',
        email: contactToEdit.email || '',
        relationship: contactToEdit.relationship || 'Friend',
        notes: contactToEdit.notes || '',
        selectedForSOS: contactToEdit.selectedForSOS !== false,
        isPrimary: Boolean(contactToEdit.isPrimary),
      });
    } else {
      setEditingContact(null);
      setFormData({
        ...INITIAL_FORM,
        // If this is the first contact, automatically mark as primary
        isPrimary: contacts.length === 0,
      });
    }
    setFormErrors({});
    setModalVisible(true);
  }, [contacts.length]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingContact(null);
    setFormErrors({});
  }, []);

  // ─── CRUD Operations ─────────────────────────────────────────

  const saveContact = useCallback(async () => {
    const { isValid, errors, sanitized } = validateContactForm(
      formData,
      contacts,
      editingContact?.id || null
    );

    if (!isValid) {
      setFormErrors(errors);
      return false;
    }

    setIsSubmitting(true);
    try {
      const contactPayload = {
        ...sanitized,
        relationship: formData.relationship || 'Friend',
        notes: (formData.notes || '').trim(),
        selectedForSOS: Boolean(formData.selectedForSOS),
        isPrimary: Boolean(formData.isPrimary),
        updatedAt: Date.now(),
      };

      if (editingContact) {
        await contextUpdate(editingContact.id, contactPayload);
      } else {
        await contextAdd({
          ...contactPayload,
          createdAt: Date.now(),
        });
      }

      closeModal();
      return true;
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not save contact. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, contacts, editingContact, contextUpdate, contextAdd, closeModal]);

  const deleteContact = useCallback((contact) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove "${contact.name}" from your trusted contacts? They will no longer receive emergency SOS alerts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await contextDelete(contact.id);
            if (editingContact && editingContact.id === contact.id) {
              closeModal();
            }
          },
        },
      ]
    );
  }, [contextDelete, editingContact, closeModal]);

  const toggleSOS = useCallback(async (contactId) => {
    await contextToggle(contactId);
  }, [contextToggle]);

  const setPrimary = useCallback(async (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    // Toggle primary or set this one as primary and un-primary others
    const isAlreadyPrimary = Boolean(contact.isPrimary);
    for (const c of contacts) {
      if (c.id === contactId) {
        await contextUpdate(c.id, { isPrimary: !isAlreadyPrimary, selectedForSOS: true });
      } else if (c.isPrimary) {
        await contextUpdate(c.id, { isPrimary: false });
      }
    }
  }, [contacts, contextUpdate]);

  return {
    contacts,
    filteredContacts,
    sosContacts,
    otherContacts,
    stats,
    // Search & Filter
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    // Modal & Form
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
  };
};

export default useContacts;
