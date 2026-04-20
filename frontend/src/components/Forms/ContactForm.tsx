import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import apiClient from '../../services/apiClient';

interface ContactFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  contactId?: string;
  defaultAccountId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({
  open,
  mode,
  contactId,
  defaultAccountId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobilePhone: '',
    title: '',
    department: '',
    address: '',
    status: 'active' as 'active' | 'inactive' | 'prospect',
    accountId: defaultAccountId || '',
  });

  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAccounts();
      if (mode === 'edit' && contactId) {
        loadContact(contactId);
      } else if (mode === 'create') {
        resetForm();
      }
    }
  }, [open, mode, contactId]);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobilePhone: '',
      title: '',
      department: '',
      address: '',
      status: 'active',
      accountId: defaultAccountId || '',
    });
    setError('');
  };

  const loadAccounts = async () => {
    try {
      const response = await apiClient.getAccounts(100, 0);
      setAccounts(response.data || []);
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadContact = async (id: string) => {
    try {
      setFetchLoading(true);
      const contact = await apiClient.getContact(id);
      setFormData({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobilePhone: contact.mobilePhone || '',
        title: contact.title || '',
        department: contact.department || '',
        address: contact.address || '',
        status: contact.status || 'active',
        accountId: contact.accountId || '',
      });
      setError('');
    } catch (err: any) {
      setError(`Failed to load contact: ${err.message}`);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleAccountChange = (event: any, value: any) => {
    setFormData((prev) => ({
      ...prev,
      accountId: value?.id || '',
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.firstName.trim()) {
        setError('First name is required');
        return;
      }
      if (!formData.lastName.trim()) {
        setError('Last name is required');
        return;
      }
      if (!formData.accountId) {
        setError('Account is required');
        return;
      }

      setLoading(true);

      if (mode === 'create') {
        await apiClient.createContact(formData);
      } else {
        await apiClient.updateContact(contactId!, formData);
      }

      setError('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Contact form error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'create' ? 'New Contact' : 'Edit Contact';
  const selectedAccount = accounts.find((a) => a.id === formData.accountId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
            {error}
          </Alert>
        )}
        {fetchLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              fullWidth
              autoFocus
            />

            <TextField
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              fullWidth
            />

            <Autocomplete
              options={accounts}
              getOptionLabel={(option) => option.name}
              value={selectedAccount || null}
              onChange={handleAccountChange}
              renderInput={(params) => (
                <TextField {...params} label="Account" required />
              )}
              fullWidth
            />

            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Mobile Phone"
              name="mobilePhone"
              value={formData.mobilePhone}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Job Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              multiline
              rows={2}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="prospect">Prospect</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || fetchLoading}
        >
          {loading ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactForm;
